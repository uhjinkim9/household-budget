import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({
  name: "card_payment_notification_logs",
  comment: "신용카드 결제일 알림 발송 및 중복 방지 이력",
})
@Index(["paymentMethodId", "paymentDate"], { unique: true })
export class CardPaymentNotification {
  @PrimaryGeneratedColumn("uuid", { comment: "카드 결제일 알림 식별자" })
  id!: string;

  @Column({ name: "workspace_id", type: "uuid", comment: "소속 가계 식별자" })
  workspaceId!: string;

  @Column({
    name: "payment_method_id",
    type: "uuid",
    comment: "알림 대상 신용카드 결제 수단 식별자",
  })
  paymentMethodId!: string;

  @Column({
    name: "payment_date",
    type: "date",
    comment: "실제 출금 예정 영업일",
  })
  paymentDate!: string;

  @Column({
    type: "decimal",
    precision: 15,
    scale: 2,
    comment: "출금 예정 신용카드 청구 금액",
  })
  amount!: string;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamptz",
    comment: "알림 발송 선점 일시",
  })
  createdAt!: Date;
}
