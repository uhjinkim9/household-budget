import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum IdentityLinkStatus {
  PENDING = "PENDING",
  LINKING = "LINKING",
  LINKED = "LINKED",
  FAILED = "FAILED",
}

export enum IdentityMigrationStatus {
  NOT_STARTED = "NOT_STARTED",
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

@Entity({
  name: "user_identity_links",
  comment: "Mercury 중앙 회원과 기존 공유가계부 회원의 명시적 연결",
})
export class UserIdentityLink {
  @PrimaryGeneratedColumn("uuid", { comment: "회원 연결 식별자" })
  id!: string;

  @Index({ unique: true })
  @Column({
    name: "mercury_subject",
    type: "varchar",
    length: 255,
    comment: "Keycloak 토큰의 변경 불가능한 sub 사용자 식별자",
  })
  mercurySubject!: string;

  @Index({ unique: true })
  @Column({
    name: "user_id",
    type: "uuid",
    nullable: true,
    comment: "연결할 기존 공유가계부 사용자 식별자",
  })
  userId!: string | null;

  @Column({
    name: "observed_email",
    type: "varchar",
    length: 255,
    nullable: true,
    comment: "OIDC 로그인 시 확인한 표시 및 연락용 이메일",
  })
  observedEmail!: string | null;

  @Column({
    type: "varchar",
    length: 20,
    default: IdentityLinkStatus.PENDING,
    comment: "중앙 계정과 로컬 계정의 연결 상태",
  })
  status!: IdentityLinkStatus;

  @Column({
    name: "migration_status",
    type: "varchar",
    length: 20,
    default: IdentityMigrationStatus.NOT_STARTED,
    comment: "기존 가계부 데이터 이전 처리 상태",
  })
  migrationStatus!: IdentityMigrationStatus;

  @Column({
    name: "linked_at",
    type: "timestamptz",
    nullable: true,
    comment: "소유권 검증 후 계정 연결이 완료된 일시",
  })
  linkedAt!: Date | null;

  @Column({
    name: "migrated_at",
    type: "timestamptz",
    nullable: true,
    comment: "기존 데이터 이전이 완료된 일시",
  })
  migratedAt!: Date | null;

  @Column({
    name: "last_error",
    type: "varchar",
    length: 500,
    nullable: true,
    comment: "최근 연결 또는 이전 실패 사유",
  })
  lastError!: string | null;

  @CreateDateColumn({ name: "created_at", comment: "연결 레코드 생성 일시" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", comment: "연결 레코드 수정 일시" })
  updatedAt!: Date;
}
