import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ApiKey } from "../entities/api-key.entity";
import { ApiKeyCryptoService } from "./api-key-crypto.service";
export interface SaveApiKey {
  id: string;
  name: string;
  keyValue: string;
  issuer: string;
  metadata?: Record<string, unknown> | null;
}
@Injectable()
export class ApiKeyService {
  constructor(
    @InjectRepository(ApiKey) private keys: Repository<ApiKey>,
    private crypto: ApiKeyCryptoService,
  ) {}
  async getValue(id: string) {
    const record = await this.keys
      .createQueryBuilder("key")
      .addSelect(["key.keyValueEncrypted", "key.keyValue"])
      .where("key.id=:id", { id })
      .andWhere("key.deleted_at IS NULL")
      .getOne();
    if (!record)
      throw new NotFoundException(`'${id}' API 키를 찾을 수 없습니다.`);
    if (record.keyValueEncrypted?.startsWith("v1:"))
      return this.crypto.decrypt(record.keyValueEncrypted);
    if (record.keyValue) return record.keyValue;
    // 개발 중 key_value_encrypted 컬럼에 직접 넣은 기존 평문도 임시 호환한다.
    if (record.keyValueEncrypted) return record.keyValueEncrypted;
    throw new NotFoundException(`'${id}' API 키 값이 비어 있습니다.`);
  }
  async save(input: SaveApiKey) {
    const existing = await this.keys.findOne({
      where: { id: input.id },
      withDeleted: true,
    });
    const { keyValue, ...fields } = input;
    const record = this.keys.create({
      ...existing,
      ...fields,
      keyValueEncrypted: this.crypto.encrypt(keyValue),
      keyValue: null,
      deletedAt: null,
    });
    return this.keys.save(record);
  }
  async remove(id: string) {
    const record = await this.keys.findOneBy({ id });
    if (!record) throw new NotFoundException();
    await this.keys.softRemove(record);
    return { id };
  }
}
