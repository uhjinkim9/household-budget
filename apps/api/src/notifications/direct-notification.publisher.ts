import { Injectable, Logger } from "@nestjs/common";
import { Transaction, TransactionType } from "../entities/transaction.entity";
import { DiscordWebhookService } from "./discord-webhook.service";
import { NotificationPublisher } from "./notification-publisher";

@Injectable()
export class DirectNotificationPublisher implements NotificationPublisher {
  private readonly logger = new Logger(DirectNotificationPublisher.name);

  constructor(private readonly discord: DiscordWebhookService) {}

  async transactionCreated(transaction: Transaction) {
    const notification = {
      [TransactionType.BALANCE]: { type: "잔액", emoji: "💰" },
      [TransactionType.FIXED]: { type: "정기 지출", emoji: "🔁" },
      [TransactionType.VARIABLE]: { type: "일시적 소비", emoji: "💳" },
    }[transaction.type];
    const memo = transaction.memo ? `\n> 메모: ${transaction.memo}` : "";
    const message =
      `${notification.emoji} **${notification.type}이 등록됐어요**\n` +
      `**${transaction.title}** · ${Number(transaction.amount).toLocaleString("ko-KR")}원\n` +
      `${transaction.date} · ${transaction.category}${memo}`;
    try {
      await this.discord.sendToWorkspace(transaction.workspaceId, message);
    } catch (error) {
      this.logger.warn(
        `Discord 알림 발행 실패: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }
  }
}
