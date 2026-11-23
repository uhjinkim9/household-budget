import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ApiKeyModule } from "../api-keys/api-key.module";
import { NotificationImportDevice } from "../entities/notification-import-device.entity";
import { NotificationImport } from "../entities/notification-import.entity";
import { PaymentMethod } from "../entities/payment-method.entity";
import { TransactionModule } from "../transactions/transaction.module";
import { WorkspaceModule } from "../workspaces/workspace.module";
import { NotificationImportController } from "./notification-import.controller";
import { NotificationImportService } from "./notification-import.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationImportDevice,
      NotificationImport,
      PaymentMethod,
    ]),
    WorkspaceModule,
    TransactionModule,
    ApiKeyModule,
  ],
  controllers: [NotificationImportController],
  providers: [NotificationImportService],
})
export class NotificationImportModule {}
