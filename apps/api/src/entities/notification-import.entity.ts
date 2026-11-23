import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum NotificationImportStatus {
  PENDING = "PENDING",
  IMPORTED = "IMPORTED",
  IGNORED = "IGNORED",
}

export enum NotificationEventType {
  APPROVED = "APPROVED",
  CANCELLED = "CANCELLED",
  UNKNOWN = "UNKNOWN",
}

@Entity({
  name: "notification_imports",
  comment: "Android 금융 알림에서 추출한 거래 등록 후보",
})
@Index(["deviceId", "deduplicationKey"], { unique: true })
export class NotificationImport {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId!: string;

  @Column({ name: "device_id", type: "uuid" })
  deviceId!: string;

  @Column({ name: "deduplication_key", length: 64 })
  deduplicationKey!: string;

  @Column({ name: "source_package", length: 255 })
  sourcePackage!: string;

  @Column({ name: "source_app", length: 100, nullable: true })
  sourceApp!: string | null;

  @Column({ length: 255, nullable: true })
  merchant!: string | null;

  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  amount!: string | null;

  @Column({ name: "occurred_at", type: "timestamptz" })
  occurredAt!: Date;

  @Column({
    name: "event_type",
    type: "enum",
    enum: NotificationEventType,
    default: NotificationEventType.UNKNOWN,
  })
  eventType!: NotificationEventType;

  @Index()
  @Column({
    type: "enum",
    enum: NotificationImportStatus,
    default: NotificationImportStatus.PENDING,
  })
  status!: NotificationImportStatus;

  @Column({ name: "parser_confidence", type: "real", default: 0 })
  parserConfidence!: number;

  @Column({ name: "raw_data_encrypted", type: "text", select: false })
  rawDataEncrypted!: string;

  @Column({ name: "transaction_id", type: "uuid", nullable: true })
  transactionId!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
