import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddMercuryOidc1788382800000 implements MigrationInterface {
  name = "AddMercuryOidc1788382800000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `ALTER TYPE "public"."users_provider_enum" ADD VALUE IF NOT EXISTS 'MERCURY_OIDC'`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_identity_links" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "mercury_subject" varchar(255) NOT NULL,
        "user_id" uuid,
        "observed_email" varchar(255),
        "status" varchar(20) NOT NULL DEFAULT 'PENDING',
        "migration_status" varchar(20) NOT NULL DEFAULT 'NOT_STARTED',
        "linked_at" timestamptz,
        "migrated_at" timestamptz,
        "last_error" varchar(500),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_identity_links" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_identity_links_subject" UNIQUE ("mercury_subject"),
        CONSTRAINT "UQ_user_identity_links_user" UNIQUE ("user_id"),
        CONSTRAINT "FK_user_identity_links_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "oidc_login_attempts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "state_hash" char(64) NOT NULL,
        "nonce" varchar(128) NOT NULL,
        "code_verifier" varchar(128) NOT NULL,
        "return_url" varchar(500) NOT NULL DEFAULT '/home',
        "expires_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_oidc_login_attempts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_oidc_login_attempts_state" UNIQUE ("state_hash")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "oidc_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "mercury_subject" varchar(255) NOT NULL,
        "user_id" uuid,
        "access_token_encrypted" text NOT NULL,
        "refresh_token_encrypted" text,
        "id_token_encrypted" text NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "refresh_expires_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_oidc_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_oidc_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_oidc_login_attempts_expires" ON "oidc_login_attempts" ("expires_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_oidc_sessions_subject" ON "oidc_sessions" ("mercury_subject")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "oidc_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "oidc_login_attempts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_identity_links"`);
  }
}
