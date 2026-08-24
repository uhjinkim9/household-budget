import { Injectable, Logger } from "@nestjs/common";
import { Transaction, TransactionType } from "../entities/transaction.entity";
import { DiscordWebhookService } from "./discord-webhook.service";
import { NotificationPublisher } from "./notification-publisher";

@Injectable()
export class DirectNotificationPublisher implements NotificationPublisher {
  private readonly logger = new Logger(DirectNotificationPublisher.name);

  constructor(private readonly discord: DiscordWebhookService) {}

  async transactionCreated(transaction: Transaction) {
    if (transaction.type === TransactionType.BALANCE) return;
    const type =
      transaction.type === TransactionType.FIXED ? "정기 지출" : "일시적 소비";
    const memo = transaction.memo ? `\n> 메모: ${transaction.memo}` : "";
    const message =
      `💳 **${type}이 등록됐어요**\n` +
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
