import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({
  name: "fixed_expense_notification_logs",
  comment: "정기 지출 예정 알림 발송 및 중복 방지 이력",
})
@Index(["transactionId", "occurrenceDate"], { unique: true })
export class FixedExpenseNotification {
  @PrimaryGeneratedColumn("uuid", { comment: "정기 지출 알림 식별자" })
  id!: string;

  @Column({ name: "workspace_id", type: "uuid", comment: "소속 가계 식별자" })
  workspaceId!: string;

  @Column({
    name: "transaction_id",
    type: "uuid",
    comment: "알림 대상 정기 지출 거래 식별자",
  })
  transactionId!: string;

  @Column({
    name: "occurrence_date",
    type: "date",
    comment: "알림 대상 정기 지출 예정일",
  })
  occurrenceDate!: string;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamptz",
    comment: "알림 발송 선점 일시",
  })
  createdAt!: Date;
}
