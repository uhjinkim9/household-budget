import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { TimestampEntity } from "./base.entity";

@Entity({ name: "daily_notes", comment: "가계 캘린더 날짜별 메모와 소비 일기" })
@Index(["workspaceId", "date"], { unique: true })
export class DailyNote extends TimestampEntity {
  @PrimaryGeneratedColumn("uuid", { comment: "날짜 메모 식별자" })
  id!: string;

  @Column({ name: "workspace_id", type: "uuid", comment: "소속 가계 식별자" })
  workspaceId!: string;

  @Column({ type: "date", comment: "메모를 표시할 캘린더 날짜" })
  date!: string;

  @Column({
    type: "varchar",
    length: 500,
    comment: "날짜별 소비 소회 또는 메모 내용",
  })
  content!: string;

  @Column({ name: "created_by", type: "uuid", comment: "메모 작성자 식별자" })
  createdBy!: string;
}
