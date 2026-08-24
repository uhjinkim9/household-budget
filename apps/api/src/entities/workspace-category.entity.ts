import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({
  name: "workspace_categories",
  comment: "가계별 소비 분류 카테고리",
})
@Index(["workspaceId", "name"], { unique: true })
export class WorkspaceCategory {
  @PrimaryGeneratedColumn("uuid", { comment: "카테고리 식별자" })
  id!: string;

  @Column({ name: "workspace_id", type: "uuid", comment: "소속 가계 식별자" })
  workspaceId!: string;

  @Column({ type: "varchar", length: 50, comment: "카테고리 이름" })
  name!: string;

  @Column({
    type: "varchar",
    length: 20,
    default: "#43836a",
    comment: "카테고리 표시 색상",
  })
  color!: string;

  @Column({
    name: "sort_order",
    type: "int",
    default: 0,
    comment: "카테고리 표시 순서",
  })
  sortOrder!: number;

  @Column({
    name: "is_active",
    type: "boolean",
    default: true,
    comment: "카테고리 사용 여부",
  })
  isActive!: boolean;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamptz",
    comment: "카테고리 생성 일시",
  })
  createdAt!: Date;
}

