import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";

@Injectable()
export class OidcTokenCryptoService {
  private readonly key: Buffer | null;

  constructor(config: ConfigService) {
    const secret = config.get<string>("SESSION_SECRET", "");
    this.key =
      secret.length >= 32 ? createHash("sha256").update(secret).digest() : null;
  }

  encrypt(value: string) {
    if (!this.key)
      throw new Error("SESSION_SECRET은 32자 이상으로 설정해야 합니다.");
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(value, "utf8"),
      cipher.final(),
    ]);
    return [iv, cipher.getAuthTag(), encrypted]
      .map((part) => part.toString("base64url"))
      .join(".");
  }

  decrypt(value: string) {
    if (!this.key)
      throw new Error("SESSION_SECRET은 32자 이상으로 설정해야 합니다.");
    const [iv, tag, encrypted] = value
      .split(".")
      .map((part) => Buffer.from(part, "base64url"));
    if (!iv || !tag || !encrypted)
      throw new Error("잘못된 세션 토큰 형식입니다.");
    const decipher = createDecipheriv("aes-256-gcm", this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString("utf8");
  }
}
