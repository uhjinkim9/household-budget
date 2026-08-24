import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ApiKeyModule } from "../api-keys/api-key.module";
import { DiscordWebhook } from "../entities/discord-webhook.entity";
import { WorkspaceModule } from "../workspaces/workspace.module";
import { DirectNotificationPublisher } from "./direct-notification.publisher";
import { DiscordWebhookController } from "./discord-webhook.controller";
import { DiscordWebhookService } from "./discord-webhook.service";
import { NotificationPublisher } from "./notification-publisher";

@Module({
  imports: [
    TypeOrmModule.forFeature([DiscordWebhook]),
    ApiKeyModule,
    WorkspaceModule,
  ],
  controllers: [DiscordWebhookController],
  providers: [
    DiscordWebhookService,
    DirectNotificationPublisher,
    {
      provide: NotificationPublisher,
      useExisting: DirectNotificationPublisher,
    },
  ],
  exports: [NotificationPublisher],
})
export class NotificationModule {}
