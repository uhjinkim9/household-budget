import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { FoodExpirationNotification } from "../entities/food-expiration-notification.entity";
import { TransactionFoodItem } from "../entities/transaction-food-item.entity";
import { DiscordWebhookService } from "./discord-webhook.service";

@Injectable()
export class FoodExpirationReminderScheduler {
  private readonly logger = new Logger(FoodExpirationReminderScheduler.name);

  constructor(
    @InjectRepository(TransactionFoodItem)
    private readonly foodItems: Repository<TransactionFoodItem>,
    @InjectRepository(FoodExpirationNotification)
    private readonly logs: Repository<FoodExpirationNotification>,
    private readonly discord: DiscordWebhookService,
  ) {}

  @Cron("0 0 9 * * *", {
    name: "food-expiration-reminder",
    timeZone: "Asia/Seoul",
    waitForCompletion: true,
  })
  async notifyUpcoming() {
    const today = this.todayInKorea();
    const targetDates = new Map([
      [this.addDays(today, 3), 3],
      [this.addDays(today, 1), 1],
    ]);
    const items = await this.foodItems.find({
      where: { expirationDate: In([...targetDates.keys()]) },
      relations: { transaction: true },
    });

    for (const item of items) {
      if (!item.expirationDate || !item.transaction) continue;
      const daysBefore = targetDates.get(item.expirationDate);
      if (!daysBefore) continue;
      if (!(await this.claim(item, daysBefore))) continue;

      const result = await this.discord.sendToWorkspace(
        item.transaction.workspaceId,
        `🥬 **식재료 유통기한 임박 알림 (D-${daysBefore})**\n` +
          `'${item.transaction.title}'의 '${item.name}'의 유통기한이 ${daysBefore}일 남았어요.\n` +
          `유통기한: ${item.expirationDate}`,
      );
      if (!result.delivered) {
        await this.logs.delete({
          foodItemId: item.id,
          expirationDate: item.expirationDate,
          daysBefore,
        });
        if (result.configured) {
          this.logger.warn(
            `${item.name} 유통기한 Discord 알림 전송에 실패했습니다.`,
          );
        }
      }
    }
  }

  private async claim(item: TransactionFoodItem, daysBefore: number) {
    try {
      await this.logs.insert({
        workspaceId: item.transaction.workspaceId,
        foodItemId: item.id,
        expirationDate: item.expirationDate!,
        daysBefore,
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

  private addDays(value: string, days: number) {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + days));
    return date.toISOString().slice(0, 10);
  }
}
