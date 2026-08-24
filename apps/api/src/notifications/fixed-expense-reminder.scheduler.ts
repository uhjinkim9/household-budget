import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FixedExpenseNotification } from "../entities/fixed-expense-notification.entity";
import {
  ApprovalStatus,
  Transaction,
  TransactionType,
} from "../entities/transaction.entity";
import { DiscordWebhookService } from "./discord-webhook.service";

@Injectable()
export class FixedExpenseReminderScheduler {
  private readonly logger = new Logger(FixedExpenseReminderScheduler.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
    @InjectRepository(FixedExpenseNotification)
    private readonly logs: Repository<FixedExpenseNotification>,
    private readonly discord: DiscordWebhookService,
  ) {}

  @Cron("0 0 9 * * *", {
    name: "fixed-expense-reminder",
    timeZone: "Asia/Seoul",
    waitForCompletion: true,
  })
  async notifyUpcoming() {
    const today = this.todayInKorea();
    const items = await this.transactions.findBy({
      type: TransactionType.FIXED,
      recurrenceRule: "MONTHLY",
      approvalStatus: ApprovalStatus.APPROVED,
    });

    for (const item of items) {
      const occurrenceDate = this.nextOccurrence(item.date, today);
      const daysLeft = this.daysBetween(today, occurrenceDate);
      if (daysLeft < 1 || daysLeft > 3) continue;
      if (!(await this.claim(item, occurrenceDate))) continue;

      const result = await this.discord.sendToWorkspace(
        item.workspaceId,
        `⏰ **정기 지출 예정 알림 (D-${daysLeft})**\n` +
          `**${item.title}** 결제가 ${daysLeft}일 후 예정되어 있어요.\n` +
          `예정 금액: **${Number(item.amount).toLocaleString("ko-KR")}원**\n` +
          `결제 예정일: ${occurrenceDate}${item.memo ? `\n> 메모: ${item.memo}` : ""}`,
      );
      if (!result.delivered) {
        await this.logs.delete({ transactionId: item.id, occurrenceDate });
        if (result.configured)
          this.logger.warn(
            `${item.title} 정기 지출 Discord 알림 전송에 실패했습니다.`,
          );
      }
    }
  }

  private nextOccurrence(masterDate: string, today: string) {
    const [, , masterDay] = masterDate.split("-").map(Number);
    const [todayYear, todayMonth] = today.split("-").map(Number);
    let year = todayYear;
    let month = todayMonth;
    let occurrence = this.dateWithClampedDay(year, month, masterDay);
    if (occurrence <= today || occurrence < masterDate) {
      month += 1;
      if (month === 13) {
        year += 1;
        month = 1;
      }
      occurrence = this.dateWithClampedDay(year, month, masterDay);
    }
    return occurrence < masterDate ? masterDate : occurrence;
  }

  private async claim(item: Transaction, occurrenceDate: string) {
    try {
      await this.logs.insert({
        workspaceId: item.workspaceId,
        transactionId: item.id,
        occurrenceDate,
      });
      return true;
    } catch (error) {
      const code = (error as { driverError?: { code?: string } }).driverError
        ?.code;
      if (code === "23505") return false;
      throw error;
    }
  }

  private todayInKorea() {
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
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  private daysBetween(from: string, to: string) {
    const parse = (value: string) => {
      const [year, month, day] = value.split("-").map(Number);
      return Date.UTC(year, month - 1, day);
    };
    return Math.round((parse(to) - parse(from)) / 86_400_000);
  }

  private dateWithClampedDay(year: number, month: number, day: number) {
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
  }
}
