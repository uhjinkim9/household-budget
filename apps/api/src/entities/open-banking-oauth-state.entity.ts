import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "open_banking_oauth_states" })
export class OpenBankingOauthState {
  @PrimaryColumn({ name: "state_hash", type: "varchar", length: 64 })
  stateHash!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
