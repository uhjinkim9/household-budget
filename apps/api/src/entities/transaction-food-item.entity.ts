import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { TimestampEntity } from "./base.entity";
import { Transaction } from "./transaction.entity";

@Entity({
  name: "transaction_food_items",
  comment: "식비 거래에서 구매한 식재료 상세 품목",
})
export class TransactionFoodItem extends TimestampEntity {
  @PrimaryGeneratedColumn("uuid", { comment: "식재료 품목 식별자" })
  id!: string;

  @Index()
  @Column({
    name: "transaction_id",
    type: "uuid",
    comment: "품목이 속한 거래 식별자",
  })
  transactionId!: string;

  @ManyToOne(() => Transaction, (transaction) => transaction.foodItems, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "transaction_id" })
  transaction!: Transaction;

  @Column({ length: 100, comment: "구매한 식재료명" })
  name!: string;

  @Column({
    name: "unit_price",
    type: "decimal",
    precision: 15,
    scale: 2,
    comment: "식재료 한 단위당 가격",
  })
  unitPrice!: string;

  @Column({
    type: "integer",
    comment: "정수 단위 구매 수량",
  })
  quantity!: number;

  @Index()
  @Column({
    name: "expiration_date",
    type: "date",
    nullable: true,
    comment: "식재료 유통기한",
  })
  expirationDate!: string | null;
}
