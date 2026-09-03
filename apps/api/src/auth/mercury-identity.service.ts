import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class MercuryIdentityService {
  private readonly baseUrl: string;
  private readonly linkPath: string;

  constructor(config: ConfigService) {
    this.baseUrl = config
      .get<string>("MERCURY_IDENTITY_API_URL", "")
      .replace(/\/$/, "");
    this.linkPath = config.get<string>(
      "MERCURY_IDENTITY_ACCOUNT_LINK_PATH",
      "",
    );
  }

  async sync(accessToken: string) {
    if (!this.baseUrl)
      throw new ServiceUnavailableException(
        "Mercury Identity API 주소가 설정되지 않았습니다.",
      );
    await this.call("/v1/users/me/sync", accessToken, {});
  }

  async linkExistingAccount(
    accessToken: string,
    localUserId: string,
    idempotencyKey: string,
  ) {
    if (!this.linkPath)
      throw new ServiceUnavailableException(
        "Mercury Identity 계정 연결 API 경로가 설정되지 않았습니다.",
      );
    await this.call(
      this.linkPath,
      accessToken,
      { application: "household-budget", localUserId },
      idempotencyKey,
    );
  }

  private async call(
    path: string,
    accessToken: string,
    body: object,
    idempotencyKey?: string,
  ) {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        signal: AbortSignal.timeout(10_000),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new ServiceUnavailableException(
        "Mercury Identity API에 연결할 수 없습니다.",
      );
    }
    if (!response.ok)
      throw new ServiceUnavailableException(
        `Mercury Identity API 동기화 실패 (${response.status})`,
      );
  }
}
