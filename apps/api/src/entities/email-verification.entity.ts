import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({
  name: "email_verifications",
  comment: "회원가입 이메일 인증 요청과 인증 상태",
})
export class EmailVerification {
  @PrimaryGeneratedColumn("uuid", { comment: "이메일 인증 요청 식별자" })
  id!: string;

  @Index({ unique: true })
  @Column({
    type: "varchar",
    length: 255,
    comment: "인증번호를 발송한 가입 이메일 주소",
  })
  email!: string;

  @Column({ type: "varchar", length: 100, comment: "가입 요청 사용자 이름" })
  name!: string;

  @Column({
    name: "password_hash",
    type: "varchar",
    length: 255,
    select: false,
    comment: "가입 완료 전 임시 보관하는 해시 비밀번호",
  })
  passwordHash!: string;

  @Column({
    name: "verification_code_hash",
    type: "varchar",
    length: 255,
    select: false,
    comment: "해시 처리된 이메일 인증번호",
  })
  verificationCodeHash!: string;

  @Column({
    name: "expires_at",
    type: "timestamptz",
    comment: "인증번호 만료 일시",
  })
  expiresAt!: Date;

  @Column({
    name: "attempt_count",
    type: "int",
    default: 0,
    comment: "인증번호 검증 실패 횟수",
  })
  attemptCount!: number;

  @Column({
    name: "send_count",
    type: "int",
    default: 1,
    comment: "인증번호 누적 발송 횟수",
  })
  sendCount!: number;

  @Column({
    name: "last_sent_at",
    type: "timestamptz",
    comment: "인증번호 마지막 발송 일시",
  })
  lastSentAt!: Date;

  @Column({
    name: "verified_at",
    type: "timestamptz",
    nullable: true,
    comment: "이메일 인증 완료 일시",
  })
  verifiedAt!: Date | null;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamptz",
    comment: "이메일 인증 요청 생성 일시",
  })
  createdAt!: Date;
}

