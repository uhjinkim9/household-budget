import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({
  name: "food_expiration_notification_logs",
  comment: "식재료 유통기한 Discord 알림 발송 및 중복 방지 이력",
})
@Index(["foodItemId", "expirationDate", "daysBefore"], { unique: true })
export class FoodExpirationNotification {
  @PrimaryGeneratedColumn("uuid", { comment: "유통기한 알림 이력 식별자" })
  id!: string;

  @Column({ name: "workspace_id", type: "uuid", comment: "소속 가계 식별자" })
  workspaceId!: string;

  @Column({
    name: "food_item_id",
    type: "uuid",
    comment: "알림 대상 식재료 품목 식별자",
  })
  foodItemId!: string;

  @Column({
    name: "expiration_date",
    type: "date",
    comment: "알림 대상 식재료 유통기한",
  })
  expirationDate!: string;

  @Column({
    name: "days_before",
    type: "smallint",
    comment: "유통기한까지 남은 알림 일수",
  })
  daysBefore!: number;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamptz",
    comment: "알림 발송 선점 일시",
  })
  createdAt!: Date;
}
