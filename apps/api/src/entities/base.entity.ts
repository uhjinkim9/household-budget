import { CreateDateColumn, UpdateDateColumn } from "typeorm";

export abstract class TimestampEntity {
  @CreateDateColumn({
    name: "created_at",
    type: "timestamptz",
    comment: "레코드 생성 일시",
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: "updated_at",
    type: "timestamptz",
    comment: "레코드 최종 수정 일시",
  })
  updatedAt!: Date;
}

