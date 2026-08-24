import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { TimestampEntity } from "./base.entity";
import { User } from "./user.entity";

@Entity({ name: "workspaces", comment: "사용자가 함께 관리하는 가계 공간" })
export class Workspace extends TimestampEntity {
  @PrimaryGeneratedColumn("uuid", { comment: "가계 식별자" })
  id!: string;

  @Column({ length: 100, comment: "가계 이름" })
  name!: string;

  @Column({ name: "created_by", type: "uuid", comment: "가계 생성자 식별자" })
  createdBy!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "created_by" })
  creator!: User;
}

export enum WorkspaceRole {
  OWNER = "OWNER",
  MEMBER = "MEMBER",
  VIEWER = "VIEWER",
}

@Entity({ name: "workspace_members", comment: "가계에 소속된 사용자와 권한" })
@Index(["workspaceId", "userId"], { unique: true })
export class WorkspaceMember {
  @PrimaryGeneratedColumn("uuid", { comment: "가계 구성원 레코드 식별자" })
  id!: string;

  @Column({ name: "workspace_id", type: "uuid", comment: "소속 가계 식별자" })
  workspaceId!: string;

  @Column({ name: "user_id", type: "uuid", comment: "소속 사용자 식별자" })
  userId!: string;

  @Column({
    type: "enum",
    enum: WorkspaceRole,
    default: WorkspaceRole.MEMBER,
    comment: "가계 내 사용자 권한",
  })
  role!: WorkspaceRole;

  @Column({
    name: "joined_at",
    type: "timestamptz",
    default: () => "NOW()",
    comment: "가계 참여 일시",
  })
  joinedAt!: Date;
}

@Entity({ name: "workspace_invites", comment: "가계 참여용 초대 코드" })
export class WorkspaceInvite {
  @PrimaryGeneratedColumn("uuid", { comment: "초대 레코드 식별자" })
  id!: string;

  @Column({ name: "workspace_id", type: "uuid", comment: "초대 대상 가계 식별자" })
  workspaceId!: string;

  @Column({
    name: "invite_code",
    length: 20,
    unique: true,
    comment: "가계 참여에 사용하는 고유 초대 코드",
  })
  inviteCode!: string;

  @Column({ name: "created_by", type: "uuid", comment: "초대 생성자 식별자" })
  createdBy!: string;

  @Column({
    name: "expires_at",
    type: "timestamptz",
    nullable: true,
    comment: "초대 코드 만료 일시, NULL이면 만료 제한 없음",
  })
  expiresAt!: Date | null;

  @Column({
    name: "max_uses",
    type: "int",
    nullable: true,
    comment: "초대 코드 최대 사용 횟수, NULL이면 제한 없음",
  })
  maxUses!: number | null;

  @Column({
    name: "used_count",
    type: "int",
    default: 0,
    comment: "초대 코드 누적 사용 횟수",
  })
  usedCount!: number;

  @Column({ name: "is_active", default: true, comment: "초대 코드 활성 여부" })
  isActive!: boolean;

  @Column({
    name: "created_at",
    type: "timestamptz",
    default: () => "NOW()",
    comment: "초대 코드 생성 일시",
  })
  createdAt!: Date;
}

