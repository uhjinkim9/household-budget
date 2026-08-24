import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
import { TimestampEntity } from "./base.entity";

@Entity({
  name: "discord_webhooks",
  comment: "가계 알림을 전송할 Discord 웹훅 설정",
})
@Index("UQ_discord_webhooks_workspace_active", ["workspaceId"], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class DiscordWebhook extends TimestampEntity {
  @PrimaryGeneratedColumn("uuid", { comment: "Discord 웹훅 설정 식별자" })
  id!: string;

  @Column({ name: "workspace_id", type: "uuid", comment: "소속 가계 식별자" })
  workspaceId!: string;

  @Column({ type: "varchar", length: 100, comment: "웹훅 표시 이름" })
  name!: string;

  @Column({
    name: "webhook_url_encrypted",
    type: "text",
    select: false,
    comment: "AES-256-GCM 방식으로 암호화한 Discord 웹훅 URL",
  })
  webhookUrlEncrypted!: string;

  @Column({ name: "is_active", default: true, comment: "알림 전송 활성 여부" })
  isActive!: boolean;

  @Column({ name: "created_by", type: "uuid", comment: "웹훅 등록자 식별자" })
  createdBy!: string;

  @Column({
    name: "last_sent_at",
    type: "timestamptz",
    nullable: true,
    comment: "마지막 알림 전송 성공 일시",
  })
  lastSentAt!: Date | null;

  @Column({
    name: "last_error",
    type: "varchar",
    length: 500,
    nullable: true,
    comment: "마지막 알림 전송 실패 사유",
  })
  lastError!: string | null;

  @DeleteDateColumn({
    name: "deleted_at",
    type: "timestamptz",
    nullable: true,
    comment: "웹훅 설정 소프트 삭제 일시",
  })
  deletedAt!: Date | null;
}
