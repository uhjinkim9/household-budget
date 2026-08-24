import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Transaction } from "../entities/transaction.entity";
import { PaymentMethod } from "../entities/payment-method.entity";
import { DashboardController } from "./dashboard.controller";
import { WorkspaceModule } from "../workspaces/workspace.module";
import { HolidayModule } from "../holidays/holiday.module";
@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, PaymentMethod]),
    WorkspaceModule,
    HolidayModule,
  ],
  controllers: [DashboardController],
})
export class DashboardModule {}
