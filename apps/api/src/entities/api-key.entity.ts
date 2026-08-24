import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "api_keys", comment: "외부 서비스 연동용 API 키" })
export class ApiKey {
  @PrimaryColumn({
    type: "varchar",
    length: 50,
    comment: "API 키 용도를 구분하는 고유 식별자",
  })
  id!: string;

  @Column({ type: "varchar", length: 100, comment: "API 키 표시 이름" })
  name!: string;

  @Column({
    name: "key_value_encrypted",
    type: "text",
    select: false,
    nullable: true,
    comment: "AES-256-GCM 방식으로 암호화한 API 키 값",
  })
  keyValueEncrypted!: string | null;

  @Column({
    name: "key_value",
    type: "text",
    select: false,
    nullable: true,
    comment: "개발 단계에서 사용하는 평문 API 키 값",
  })
  keyValue!: string | null;

  @Column({
    type: "varchar",
    length: 100,
    comment: "API 키를 발급한 기관 또는 서비스",
  })
  issuer!: string;

  @Column({
    type: "jsonb",
    nullable: true,
    comment: "API 키 관련 부가 설정 및 메타데이터",
  })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamptz",
    comment: "API 키 레코드 생성 일시",
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: "updated_at",
    type: "timestamptz",
    comment: "API 키 레코드 최종 수정 일시",
  })
  updatedAt!: Date;

  @DeleteDateColumn({
    name: "deleted_at",
    type: "timestamptz",
    nullable: true,
    comment: "API 키 소프트 삭제 일시",
  })
  deletedAt!: Date | null;
}

