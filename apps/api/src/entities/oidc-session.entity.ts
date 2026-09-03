import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({
  name: "oidc_sessions",
  comment: "서버에 암호화 저장하는 Mercury OIDC 세션",
})
export class OidcSession {
  @PrimaryGeneratedColumn("uuid", { comment: "OIDC 서버 세션 식별자" })
  id!: string;
  @Index()
  @Column({
    name: "mercury_subject",
    type: "varchar",
    length: 255,
    comment: "Keycloak sub 사용자 식별자",
  })
  mercurySubject!: string;
  @Index()
  @Column({
    name: "user_id",
    type: "uuid",
    nullable: true,
    comment: "연결 완료된 공유가계부 사용자 식별자",
  })
  userId!: string | null;
  @Column({
    name: "access_token_encrypted",
    type: "text",
    comment: "서버 암호화 OIDC Access Token",
  })
  accessTokenEncrypted!: string;
  @Column({
    name: "refresh_token_encrypted",
    type: "text",
    nullable: true,
    comment: "서버 암호화 OIDC Refresh Token",
  })
  refreshTokenEncrypted!: string | null;
  @Column({
    name: "id_token_encrypted",
    type: "text",
    comment: "서버 암호화 OIDC ID Token",
  })
  idTokenEncrypted!: string;
  @Column({
    name: "expires_at",
    type: "timestamptz",
    comment: "OIDC Access Token 만료 일시",
  })
  expiresAt!: Date;
  @Column({
    name: "refresh_expires_at",
    type: "timestamptz",
    nullable: true,
    comment: "OIDC Refresh Token 예상 만료 일시",
  })
  refreshExpiresAt!: Date | null;
  @CreateDateColumn({ name: "created_at", comment: "OIDC 세션 생성 일시" })
  createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at", comment: "OIDC 세션 수정 일시" })
  updatedAt!: Date;
}
