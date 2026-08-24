import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
@Injectable()
export class ApiKeyCryptoService {
  constructor(private config: ConfigService) {}
  encrypt(value: string) {
    const key = this.key(),
      iv = randomBytes(12),
      cipher = createCipheriv("aes-256-gcm", key, iv),
      encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]),
      tag = cipher.getAuthTag();
    return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
  }
  decrypt(payload: string) {
    const [version, iv, tag, encrypted] = payload.split(":");
    if (version !== "v1" || !iv || !tag || !encrypted)
      throw new InternalServerErrorException(
        "API 키 암호문 형식이 올바르지 않습니다.",
      );
    try {
      const decipher = createDecipheriv(
        "aes-256-gcm",
        this.key(),
        Buffer.from(iv, "base64"),
      );
      decipher.setAuthTag(Buffer.from(tag, "base64"));
      return Buffer.concat([
        decipher.update(Buffer.from(encrypted, "base64")),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      throw new InternalServerErrorException("API 키를 복호화하지 못했습니다.");
    }
  }
  private key() {
    const secret = this.config.get<string>("API_KEY_ENCRYPTION_SECRET");
    if (!secret || secret.length < 32)
      throw new InternalServerErrorException(
        "API_KEY_ENCRYPTION_SECRET을 32자 이상으로 설정해주세요.",
      );
    return createHash("sha256").update(secret).digest();
  }
}
