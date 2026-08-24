import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ApiKey } from "../entities/api-key.entity";
import { ApiKeyCryptoService } from "./api-key-crypto.service";
import { ApiKeyService } from "./api-key.service";
@Module({
  imports: [TypeOrmModule.forFeature([ApiKey])],
  providers: [ApiKeyCryptoService, ApiKeyService],
  exports: [ApiKeyService],
})
export class ApiKeyModule {}
