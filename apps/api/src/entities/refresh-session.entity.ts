import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({
  name: "refresh_sessions",
  comment: "로그인 유지를 위한 리프레시 토큰 세션",
})
export class RefreshSession {
  @PrimaryGeneratedColumn("uuid", { comment: "리프레시 세션 식별자" })
  id!: string;

  @Index()
  @Column({ name: "user_id", type: "uuid", comment: "사용자 식별자" })
  userId!: string;

  @Index({ unique: true })
  @Column({
    name: "token_hash",
    type: "char",
    length: 64,
    comment: "SHA-256으로 해시한 리프레시 토큰",
  })
  tokenHash!: string;

  @Index()
  @Column({
    name: "expires_at",
    type: "timestamptz",
    comment: "리프레시 토큰 만료 일시",
  })
  expiresAt!: Date;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamptz",
    comment: "리프레시 세션 생성 일시",
  })
  createdAt!: Date;
}
