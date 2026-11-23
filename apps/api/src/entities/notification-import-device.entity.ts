import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({
  name: "notification_import_devices",
  comment: "Android 금융 알림 수집 기기",
})
export class NotificationImportDevice {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId!: string;

  @Index()
  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ length: 100 })
  name!: string;

  @Index({ unique: true })
  @Column({ name: "token_hash", length: 64, select: false })
  tokenHash!: string;

  @Column({ name: "last_seen_at", type: "timestamptz", nullable: true })
  lastSeenAt!: Date | null;

  @Column({ name: "revoked_at", type: "timestamptz", nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
