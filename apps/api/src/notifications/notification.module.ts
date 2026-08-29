import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ApiKeyModule } from "../api-keys/api-key.module";
import { DiscordWebhook } from "../entities/discord-webhook.entity";
import { CardPaymentNotification } from "../entities/card-payment-notification.entity";
import { FixedExpenseNotification } from "../entities/fixed-expense-notification.entity";
import { FoodExpirationNotification } from "../entities/food-expiration-notification.entity";
import { PaymentMethod } from "../entities/payment-method.entity";
import { Transaction } from "../entities/transaction.entity";
import { TransactionFoodItem } from "../entities/transaction-food-item.entity";
import { HolidayModule } from "../holidays/holiday.module";
import { WorkspaceModule } from "../workspaces/workspace.module";
import { DirectNotificationPublisher } from "./direct-notification.publisher";
import { DiscordWebhookController } from "./discord-webhook.controller";
import { DiscordWebhookService } from "./discord-webhook.service";
import { NotificationPublisher } from "./notification-publisher";
import { CardPaymentReminderScheduler } from "./card-payment-reminder.scheduler";
import { FixedExpenseReminderScheduler } from "./fixed-expense-reminder.scheduler";
import { FoodExpirationReminderScheduler } from "./food-expiration-reminder.scheduler";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DiscordWebhook,
      CardPaymentNotification,
      FixedExpenseNotification,
      FoodExpirationNotification,
      PaymentMethod,
      Transaction,
      TransactionFoodItem,
    ]),
    ApiKeyModule,
    WorkspaceModule,
    HolidayModule,
  ],
  controllers: [DiscordWebhookController],
  providers: [
    DiscordWebhookService,
    CardPaymentReminderScheduler,
    FixedExpenseReminderScheduler,
    FoodExpirationReminderScheduler,
    DirectNotificationPublisher,
    {
      provide: NotificationPublisher,
      useExisting: DirectNotificationPublisher,
    },
  ],
  exports: [NotificationPublisher],
})
export class NotificationModule {}
