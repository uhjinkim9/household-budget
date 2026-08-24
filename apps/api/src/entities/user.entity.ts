import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { TimestampEntity } from "./base.entity";

export enum AuthProvider {
  LOCAL = "LOCAL",
  GOOGLE = "GOOGLE",
  KAKAO = "KAKAO",
}

@Entity({ name: "users", comment: "서비스 사용자 계정" })
export class User extends TimestampEntity {
  @PrimaryGeneratedColumn("uuid", { comment: "사용자 식별자" })
  id!: string;

  @Column({ length: 255, unique: true, comment: "로그인 및 이메일 인증에 사용하는 이메일 주소" })
  email!: string;

  @Column({
    name: "password_hash",
    type: "varchar",
    length: 255,
    nullable: true,
    select: false,
    comment: "단방향 해시 처리된 로그인 비밀번호",
  })
  passwordHash!: string | null;

  @Column({ length: 100, comment: "사용자 표시 이름" })
  name!: string;

  @Column({
    name: "profile_image_url",
    type: "text",
    nullable: true,
    comment: "사용자 프로필 이미지 URL",
  })
  profileImageUrl!: string | null;

  @Column({
    type: "enum",
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
    comment: "계정 인증 제공자",
  })
  provider!: AuthProvider;
}

