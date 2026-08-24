import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export enum PaymentMethodType {
  CREDIT_CARD = "CREDIT_CARD",
  CHECK_CARD = "CHECK_CARD",
  BANK_ACCOUNT = "BANK_ACCOUNT",
  CASH = "CASH",
}

@Entity({ name: "payment_methods", comment: "가계에서 사용하는 결제 수단" })
export class PaymentMethod {
  @PrimaryGeneratedColumn("uuid", { comment: "결제 수단 식별자" })
  id!: string;

  @Column({ name: "workspace_id", type: "uuid", comment: "소속 가계 식별자" })
  workspaceId!: string;

  @Column({ length: 100, comment: "사용자가 지정한 결제 수단 이름" })
  name!: string;

  @Column({ type: "enum", enum: PaymentMethodType, comment: "결제 수단 유형" })
  type!: PaymentMethodType;

  @Column({
    name: "billing_day",
    type: "int",
    nullable: true,
    comment: "신용카드 대금 결제일",
  })
  billingDay!: number | null;

  @Column({
    name: "target_performance",
    type: "decimal",
    precision: 15,
    scale: 2,
    nullable: true,
    default: 0,
    comment: "카드 혜택을 위한 목표 전월 실적 금액",
  })
  targetPerformance!: string | null;

  @Column({
    name: "card_issuer",
    type: "varchar",
    length: 100,
    nullable: true,
    comment: "카드를 발급한 카드사",
  })
  cardIssuer!: string | null;

  @Column({
    name: "annual_fee",
    type: "decimal",
    precision: 15,
    scale: 2,
    nullable: true,
    default: 0,
    comment: "신용카드 연회비",
  })
  annualFee!: string | null;

  @Column({
    name: "external_account_id",
    type: "varchar",
    length: 255,
    nullable: true,
    comment: "외부 금융 서비스의 계좌 또는 카드 식별자",
  })
  externalAccountId!: string | null;

  @Column({
    name: "is_auto_synced",
    default: false,
    comment: "외부 금융 서비스 자동 동기화 여부",
  })
  isAutoSynced!: boolean;

  @Column({
    name: "created_at",
    type: "timestamptz",
    default: () => "NOW()",
    comment: "결제 수단 생성 일시",
  })
  createdAt!: Date;
}

