import "reflect-metadata";
import { config } from "dotenv";
import { DataSource } from "typeorm";

config({ path: "../../.env" });

export default new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: ["src/entities/*.entity.ts"],
  migrations: ["src/database/migrations/*.ts"],
  synchronize: false,
});
