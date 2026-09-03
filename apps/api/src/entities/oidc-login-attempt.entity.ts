import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({
  name: "oidc_login_attempts",
  comment: "OIDC state, nonce 및 PKCE 검증용 일회성 로그인 시도",
})
export class OidcLoginAttempt {
  @PrimaryGeneratedColumn("uuid", { comment: "OIDC 로그인 시도 식별자" })
  id!: string;
  @Index({ unique: true })
  @Column({
    name: "state_hash",
    type: "char",
    length: 64,
    comment: "SHA-256 해시한 OIDC state",
  })
  stateHash!: string;
  @Column({ type: "varchar", length: 128, comment: "ID Token 검증용 nonce" })
  nonce!: string;
  @Column({
    name: "code_verifier",
    type: "varchar",
    length: 128,
    comment: "PKCE S256 code verifier",
  })
  codeVerifier!: string;
  @Column({
    name: "return_url",
    type: "varchar",
    length: 500,
    default: "/home",
    comment: "로그인 완료 후 앱 내부 이동 경로",
  })
  returnUrl!: string;
  @Index()
  @Column({
    name: "expires_at",
    type: "timestamptz",
    comment: "로그인 시도 만료 일시",
  })
  expiresAt!: Date;
  @CreateDateColumn({ name: "created_at", comment: "로그인 시도 생성 일시" })
  createdAt!: Date;
}
