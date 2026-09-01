import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ApiKeyModule } from "../api-keys/api-key.module";
import { OpenBankingAccount } from "../entities/open-banking-account.entity";
import { OpenBankingConnection } from "../entities/open-banking-connection.entity";
import { OpenBankingOauthState } from "../entities/open-banking-oauth-state.entity";
import { OpenBankingController } from "./open-banking.controller";
import { OpenBankingService } from "./open-banking.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OpenBankingAccount,
      OpenBankingConnection,
      OpenBankingOauthState,
    ]),
    ApiKeyModule,
  ],
  controllers: [OpenBankingController],
  providers: [OpenBankingService],
})
export class OpenBankingModule {}
