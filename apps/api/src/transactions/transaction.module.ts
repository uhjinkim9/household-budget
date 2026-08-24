import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Transaction } from "../entities/transaction.entity";
import { TransactionService } from "./transaction.service";
import { TransactionController } from "./transaction.controller";
import { WorkspaceModule } from "../workspaces/workspace.module";
import { NotificationModule } from "../notifications/notification.module";
@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction]),
    WorkspaceModule,
    NotificationModule,
  ],
  providers: [TransactionService],
  controllers: [TransactionController],
})
export class TransactionModule {}
