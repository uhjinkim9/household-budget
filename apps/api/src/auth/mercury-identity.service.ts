import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class MercuryIdentityService {
  private readonly baseUrl: string;
  private readonly linkPath: string;
  private readonly issuer: string;
  private readonly serviceClientId: string;
  private readonly serviceClientSecret: string;
  private serviceToken?: { value: string; expiresAt: number };

  constructor(config: ConfigService) {
    this.baseUrl = config
      .get<string>("MERCURY_IDENTITY_API_URL", "")
      .replace(/\/$/, "");
    this.linkPath = config.get<string>(
      "MERCURY_IDENTITY_ACCOUNT_LINK_PATH",
      "",
    );
    this.issuer = config.get<string>("OIDC_ISSUER", "").replace(/\/$/, "");
    this.serviceClientId = config.get<string>(
      "MERCURY_IDENTITY_CLIENT_ID",
      "",
    );
    this.serviceClientSecret = config.get<string>(
      "MERCURY_IDENTITY_CLIENT_SECRET",
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
    mercurySubject: string,
    localUserId: string,
    idempotencyKey: string,
  ) {
    if (!this.linkPath)
      throw new ServiceUnavailableException(
        "Mercury Identity 계정 연결 API 경로가 설정되지 않았습니다.",
      );
    const serviceToken = await this.getServiceToken();
    await this.call(
      this.linkPath,
      serviceToken,
      {
        userId: mercurySubject,
        serviceCode: "household-budget",
        legacyUserId: localUserId,
      },
      idempotencyKey,
    );
  }

  private async getServiceToken() {
    if (this.serviceToken && this.serviceToken.expiresAt > Date.now() + 30_000)
      return this.serviceToken.value;
    if (!this.issuer || !this.serviceClientId || !this.serviceClientSecret)
      throw new ServiceUnavailableException(
        "Mercury Identity 내부 연결용 서비스 계정이 설정되지 않았습니다.",
      );

    let response: Response;
    try {
      response = await fetch(
        `${this.issuer}/protocol/openid-connect/token`,
        {
          method: "POST",
          signal: AbortSignal.timeout(10_000),
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "client_credentials",
            client_id: this.serviceClientId,
            client_secret: this.serviceClientSecret,
          }),
        },
      );
    } catch {
      throw new ServiceUnavailableException(
        "Mercury Identity 서비스 계정 인증에 연결할 수 없습니다.",
      );
    }
    if (!response.ok)
      throw new ServiceUnavailableException(
        `Mercury Identity 서비스 계정 인증 실패 (${response.status})`,
      );
    const token = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!token.access_token)
      throw new ServiceUnavailableException(
        "Mercury Identity 서비스 계정 토큰이 없습니다.",
      );
    this.serviceToken = {
      value: token.access_token,
      expiresAt: Date.now() + (token.expires_in ?? 60) * 1000,
    };
    return token.access_token;
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
        idempotencyKey
          ? `Mercury Identity 계정 연결 실패 (${response.status})`
          : `Mercury Identity API 동기화 실패 (${response.status})`,
      );
  }
}
