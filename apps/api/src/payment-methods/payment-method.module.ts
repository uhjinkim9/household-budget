import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PaymentMethod } from "../entities/payment-method.entity";
import { PaymentMethodController } from "./payment-method.controller";
import { WorkspaceModule } from "../workspaces/workspace.module";
@Module({
  imports: [TypeOrmModule.forFeature([PaymentMethod]), WorkspaceModule],
  controllers: [PaymentMethodController],
})
export class PaymentMethodModule {}
