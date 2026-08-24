import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { TimestampEntity } from "./base.entity";

export enum TransactionType {
  FIXED = "FIXED",
  VARIABLE = "VARIABLE",
  BALANCE = "BALANCE",
}

export enum ApprovalStatus {
  APPROVED = "APPROVED",
  CANCELLED = "CANCELLED",
}

export enum BalanceMode {
  CUMULATIVE = "CUMULATIVE",
  MONTHLY_RESET = "MONTHLY_RESET",
}

@Entity({ name: "transactions", comment: "가계의 잔액 및 지출 거래 내역" })
export class Transaction extends TimestampEntity {
  @PrimaryGeneratedColumn("uuid", { comment: "거래 식별자" })
  id!: string;

  @Index()
  @Column({
    name: "workspace_id",
    type: "uuid",
    comment: "거래가 속한 가계 식별자",
  })
  workspaceId!: string;

  @Column({
    name: "payment_method_id",
    type: "uuid",
    nullable: true,
    comment: "거래에 사용한 결제 수단 식별자",
  })
  paymentMethodId!: string | null;

  @Column({ type: "enum", enum: TransactionType, comment: "거래 유형" })
  type!: TransactionType;

  @Column({
    type: "decimal",
    precision: 15,
    scale: 2,
    comment: "거래 금액",
  })
  amount!: string;

  @Column({ length: 255, comment: "거래 제목 또는 사용처" })
  title!: string;

  @Column({ length: 50, comment: "거래 소비 카테고리" })
  category!: string;

  @Column({
    type: "varchar",
    length: 500,
    nullable: true,
    comment: "거래별로 남기는 간단한 메모",
  })
  memo!: string | null;

  @Index()
  @Column({ type: "date", comment: "거래 발생일" })
  date!: string;

  @Column({
    name: "recurrence_rule",
    type: "varchar",
    length: 100,
    nullable: true,
    comment: "정기 거래 반복 규칙",
  })
  recurrenceRule!: string | null;

  @Column({
    name: "balance_mode",
    type: "enum",
    enum: BalanceMode,
    nullable: true,
    comment: "잔액 누적 또는 매월 등록일 초기화 계산 방식",
  })
  balanceMode!: BalanceMode | null;

  @Column({
    name: "is_performance_excluded",
    default: false,
    comment: "카드 실적 집계 제외 여부",
  })
  isPerformanceExcluded!: boolean;

  @Column({
    name: "external_transaction_id",
    type: "varchar",
    length: 255,
    nullable: true,
    unique: true,
    comment: "외부 금융 서비스의 거래 식별자",
  })
  externalTransactionId!: string | null;

  @Column({
    name: "approval_status",
    type: "enum",
    enum: ApprovalStatus,
    default: ApprovalStatus.APPROVED,
    comment: "거래 승인 상태",
  })
  approvalStatus!: ApprovalStatus;

  @Column({
    name: "raw_data",
    type: "jsonb",
    nullable: true,
    comment: "외부 연동에서 수신한 원본 거래 데이터",
  })
  rawData!: Record<string, unknown> | null;
}
