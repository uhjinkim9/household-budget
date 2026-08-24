import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, Not, Repository } from "typeorm";
import { CardPaymentNotification } from "../entities/card-payment-notification.entity";
import {
  PaymentMethod,
  PaymentMethodType,
} from "../entities/payment-method.entity";
import {
  ApprovalStatus,
  Transaction,
  TransactionType,
} from "../entities/transaction.entity";
import { KoreanBusinessDayService } from "../holidays/korean-business-day.service";
import { DiscordWebhookService } from "./discord-webhook.service";

@Injectable()
export class CardPaymentReminderScheduler {
  private readonly logger = new Logger(CardPaymentReminderScheduler.name);

  constructor(
    @InjectRepository(PaymentMethod)
    private readonly paymentMethods: Repository<PaymentMethod>,
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
    @InjectRepository(CardPaymentNotification)
    private readonly logs: Repository<CardPaymentNotification>,
    private readonly businessDays: KoreanBusinessDayService,
    private readonly discord: DiscordWebhookService,
  ) {}

  @Cron("0 0 9 * * *", {
    name: "credit-card-payment-reminder",
    timeZone: "Asia/Seoul",
    waitForCompletion: true,
  })
  async notifyToday() {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .reduce<Record<string, string>>((result, part) => {
        result[part.type] = part.value;
        return result;
      }, {});
    const today = `${parts.year}-${parts.month}-${parts.day}`;
    const cards = await this.paymentMethods.findBy({
      type: PaymentMethodType.CREDIT_CARD,
    });

    for (const card of cards) {
      if (!card.billingDay) continue;
      const usageRange = await this.usageRangeDueToday(card, today);
      if (!usageRange) continue;
      const amount = await this.billedAmount(
        card.id,
        usageRange.from,
        usageRange.to,
      );
      if (amount <= 0) continue;
      if (!(await this.claim(card, today, amount))) continue;

      const result = await this.discord.sendToWorkspace(
        card.workspaceId,
        `💳 **오늘 ${card.name} 결제일입니다!**\n출금 예정 금액: **${amount.toLocaleString("ko-KR")}원**\n통장 잔액을 확인해주세요.`,
      );
      if (!result.delivered) {
        await this.logs.delete({
          paymentMethodId: card.id,
          paymentDate: today,
        });
        if (result.configured)
          this.logger.warn(
            `${card.name} 결제일 Discord 알림 전송에 실패했습니다.`,
          );
      }
    }
  }

  private async usageRangeDueToday(card: PaymentMethod, today: string) {
    const [year, month] = today.split("-").map(Number);
    const currentIndex = year * 12 + month - 1;
    for (const paymentIndex of [currentIndex - 1, currentIndex]) {
      const paymentYear = Math.floor(paymentIndex / 12);
      const paymentMonth = (paymentIndex % 12) + 1;
      const scheduled = this.dateWithClampedDay(
        paymentYear,
        paymentMonth,
        card.billingDay!,
      );
      if ((await this.businessDays.nextBusinessDay(scheduled)) !== today)
        continue;
      return this.monthBounds(paymentIndex - 1);
    }
    return null;
  }

  private async billedAmount(cardId: string, from: string, to: string) {
    const rows = await this.transactions.find({
      where: {
        paymentMethodId: cardId,
        date: LessThanOrEqual(to),
        approvalStatus: Not(ApprovalStatus.CANCELLED),
        type: Not(TransactionType.BALANCE),
      },
    });
    return rows.reduce((sum, row) => {
      const included =
        row.recurrenceRule === "MONTHLY"
          ? this.hasMonthlyOccurrence(row.date, from, to)
          : row.date >= from && row.date <= to;
      return included ? sum + Number(row.amount) : sum;
    }, 0);
  }

  private async claim(
    card: PaymentMethod,
    paymentDate: string,
    amount: number,
  ) {
    try {
      await this.logs.insert({
        workspaceId: card.workspaceId,
        paymentMethodId: card.id,
        paymentDate,
        amount: String(amount),
      });
      return true;
    } catch (error) {
      const code = (error as { driverError?: { code?: string } }).driverError
        ?.code;
      if (code === "23505") return false;
      throw error;
    }
  }

  private monthBounds(index: number) {
    const year = Math.floor(index / 12);
    const month = (index % 12) + 1;
    return {
      from: this.dateWithClampedDay(year, month, 1),
      to: this.dateWithClampedDay(year, month, 31),
    };
  }

  private hasMonthlyOccurrence(masterDate: string, from: string, to: string) {
    const [, , masterDay] = masterDate.split("-").map(Number);
    const [year, month] = from.split("-").map(Number);
    const occurrence = this.dateWithClampedDay(year, month, masterDay);
    return occurrence >= masterDate && occurrence >= from && occurrence <= to;
  }

  private dateWithClampedDay(year: number, month: number, day: number) {
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
  }
}
