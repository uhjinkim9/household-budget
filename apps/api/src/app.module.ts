import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "./auth/auth.module";
import { WorkspaceModule } from "./workspaces/workspace.module";
import { TransactionModule } from "./transactions/transaction.module";
import { PaymentMethodModule } from "./payment-methods/payment-method.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { UsersModule } from "./users/users.module";
import { ApiKeyModule } from "./api-keys/api-key.module";
import { HolidayModule } from "./holidays/holiday.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        type: "postgres",
        url: c.getOrThrow<string>("DATABASE_URL"),
        autoLoadEntities: true,
        synchronize:
          c.get<string>("DB_SYNCHRONIZE", "true") === "true" &&
          c.get("NODE_ENV") !== "production",
        logging: c.get<string>("DB_LOGGING", "false") === "true",
      }),
    }),
    AuthModule,
    WorkspaceModule,
    TransactionModule,
    PaymentMethodModule,
    DashboardModule,
    UsersModule,
    ApiKeyModule,
    HolidayModule,
  ],
})
export class AppModule {}
