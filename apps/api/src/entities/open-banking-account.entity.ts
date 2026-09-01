import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { TimestampEntity } from "./base.entity";

@Entity({ name: "open_banking_accounts" })
@Index(["userId", "fintechUseNum"], { unique: true })
export class OpenBankingAccount extends TimestampEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "connection_id", type: "uuid" })
  connectionId!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ name: "fintech_use_num", type: "varchar", length: 24 })
  fintechUseNum!: string;

  @Column({ name: "bank_code_std", type: "varchar", length: 3 })
  bankCodeStd!: string;

  @Column({ name: "bank_name", type: "varchar", length: 100 })
  bankName!: string;

  @Column({ name: "account_alias", type: "varchar", length: 100, nullable: true })
  accountAlias!: string | null;

  @Column({ name: "account_num_masked", type: "varchar", length: 30 })
  accountNumMasked!: string;

  @Column({ name: "account_holder_name", type: "varchar", length: 100, nullable: true })
  accountHolderName!: string | null;

  @Column({ name: "account_type", type: "varchar", length: 2, nullable: true })
  accountType!: string | null;

  @Column({ name: "balance_amt", type: "decimal", precision: 18, scale: 0, nullable: true })
  balanceAmt!: string | null;

  @Column({ name: "available_amt", type: "decimal", precision: 18, scale: 0, nullable: true })
  availableAmt!: string | null;

  @Column({ name: "product_name", type: "varchar", length: 100, nullable: true })
  productName!: string | null;

  @Column({ name: "balance_synced_at", type: "timestamptz", nullable: true })
  balanceSyncedAt!: Date | null;
}
