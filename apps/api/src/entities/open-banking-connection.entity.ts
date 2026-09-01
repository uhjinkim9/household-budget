import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { TimestampEntity } from "./base.entity";

@Entity({ name: "open_banking_connections" })
export class OpenBankingConnection extends TimestampEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "uuid", unique: true })
  userId!: string;

  @Column({ name: "user_seq_no", type: "varchar", length: 20 })
  userSeqNo!: string;

  @Column({ name: "access_token_encrypted", type: "text", select: false })
  accessTokenEncrypted!: string;

  @Column({
    name: "refresh_token_encrypted",
    type: "text",
    nullable: true,
    select: false,
  })
  refreshTokenEncrypted!: string | null;

  @Column({ type: "varchar", length: 100, default: "login inquiry" })
  scope!: string;

  @Column({ name: "token_expires_at", type: "timestamptz" })
  tokenExpiresAt!: Date;
}
