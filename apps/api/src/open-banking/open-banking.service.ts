import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash, randomBytes } from "crypto";
import { LessThan, Repository } from "typeorm";
import { ApiKeyCryptoService } from "../api-keys/api-key-crypto.service";
import { OpenBankingAccount } from "../entities/open-banking-account.entity";
import { OpenBankingConnection } from "../entities/open-banking-connection.entity";
import { OpenBankingOauthState } from "../entities/open-banking-oauth-state.entity";

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number | string;
  scope?: string;
  user_seq_no?: string;
  error?: string;
  error_description?: string;
};

type UserAccount = {
  fintech_use_num: string;
  account_alias?: string;
  bank_code_std: string;
  bank_name: string;
  account_num_masked: string;
  account_holder_name?: string;
  account_type?: string;
};

type UserInfoResponse = {
  rsp_code?: string;
  rsp_message?: string;
  res_list?: UserAccount[];
};

type BalanceResponse = {
  rsp_code?: string;
  rsp_message?: string;
  balance_amt?: string;
  available_amt?: string;
  account_type?: string;
  product_name?: string;
};

@Injectable()
export class OpenBankingService {
  constructor(
    @InjectRepository(OpenBankingOauthState)
    private readonly states: Repository<OpenBankingOauthState>,
    @InjectRepository(OpenBankingConnection)
    private readonly connections: Repository<OpenBankingConnection>,
    @InjectRepository(OpenBankingAccount)
    private readonly accounts: Repository<OpenBankingAccount>,
    private readonly config: ConfigService,
    private readonly crypto: ApiKeyCryptoService,
  ) {}

  async createAuthorizationUrl(userId: string) {
    const clientId = this.required("OPEN_BANKING_CLIENT_ID");
    const redirectUri = this.required("OPEN_BANKING_REDIRECT_URI");
    await this.states.delete({ expiresAt: LessThan(new Date()) });
    const state = randomBytes(24).toString("base64url");
    await this.states.save(
      this.states.create({
        stateHash: this.hash(state),
        userId,
        expiresAt: new Date(Date.now() + 10 * 60_000),
      }),
    );
    const query = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: this.config.get("OPEN_BANKING_SCOPE", "login inquiry"),
      state,
      auth_type: "0",
    });
    return { authorizationUrl: `${this.baseUrl()}/oauth/2.0/authorize?${query}` };
  }

  async completeAuthorization(code: string, state: string) {
    const saved = await this.states.findOneBy({ stateHash: this.hash(state) });
    if (!saved || saved.expiresAt.getTime() < Date.now()) {
      if (saved) await this.states.delete(saved.stateHash);
      throw new BadRequestException("오픈뱅킹 인증 요청이 만료되었거나 유효하지 않습니다.");
    }
    await this.states.delete(saved.stateHash);
    const token = await this.requestToken({
      code,
      grant_type: "authorization_code",
      redirect_uri: this.required("OPEN_BANKING_REDIRECT_URI"),
    });
    if (!token.access_token || !token.user_seq_no) {
      throw new BadGatewayException("오픈뱅킹 토큰 응답에 필수 정보가 없습니다.");
    }
    let connection = await this.connections
      .createQueryBuilder("connection")
      .addSelect([
        "connection.accessTokenEncrypted",
        "connection.refreshTokenEncrypted",
      ])
      .where("connection.userId = :userId", { userId: saved.userId })
      .getOne();
    connection ??= this.connections.create({ userId: saved.userId });
    connection.userSeqNo = token.user_seq_no;
    connection.accessTokenEncrypted = this.crypto.encrypt(token.access_token);
    connection.refreshTokenEncrypted = token.refresh_token
      ? this.crypto.encrypt(token.refresh_token)
      : connection.refreshTokenEncrypted ?? null;
    connection.scope = token.scope ?? "login inquiry";
    connection.tokenExpiresAt = new Date(
      Date.now() + Number(token.expires_in ?? 0) * 1000,
    );
    connection = await this.connections.save(connection);
    await this.syncAccountList(connection, token.access_token);
    if (this.config.get("OPEN_BANKING_USE_ORG_CODE")) {
      try {
        await this.refreshBalances(saved.userId);
      } catch {
        // 계좌 연결은 성공으로 유지하고 잔액은 화면에서 다시 조회할 수 있게 합니다.
      }
    }
  }

  async getAccounts(userId: string) {
    const connected = await this.connections.exist({ where: { userId } });
    const accounts = connected
      ? await this.accounts.find({ where: { userId }, order: { createdAt: "ASC" } })
      : [];
    return {
      configured: Boolean(
        this.config.get("OPEN_BANKING_CLIENT_ID") &&
          this.config.get("OPEN_BANKING_CLIENT_SECRET") &&
          this.config.get("OPEN_BANKING_REDIRECT_URI"),
      ),
      connected,
      balanceEnabled: Boolean(this.config.get("OPEN_BANKING_USE_ORG_CODE")),
      accounts: accounts.map((account) => ({
        id: account.id,
        bankName: account.bankName,
        accountAlias: account.accountAlias,
        accountNumMasked: account.accountNumMasked,
        accountHolderName: account.accountHolderName,
        accountType: account.accountType,
        balanceAmt: account.balanceAmt,
        availableAmt: account.availableAmt,
        productName: account.productName,
        balanceSyncedAt: account.balanceSyncedAt,
      })),
    };
  }

  async refreshBalances(userId: string) {
    const connection = await this.connectionWithTokens(userId);
    const accessToken = await this.validAccessToken(connection);
    await this.syncAccountList(connection, accessToken);
    const useOrgCode = this.config.get<string>("OPEN_BANKING_USE_ORG_CODE");
    if (!useOrgCode) {
      throw new ServiceUnavailableException(
        "잔액조회를 위해 OPEN_BANKING_USE_ORG_CODE를 설정해주세요.",
      );
    }
    if (!/^[A-Za-z0-9]{10}$/.test(useOrgCode)) {
      throw new ServiceUnavailableException(
        "OPEN_BANKING_USE_ORG_CODE는 발급받은 10자리 이용기관 코드를 입력해야 합니다.",
      );
    }
    const accounts = await this.accounts.find({ where: { userId } });
    for (const account of accounts) {
      const query = new URLSearchParams({
        bank_tran_id: `${useOrgCode}U${randomBytes(6).toString("hex").slice(0, 9).toUpperCase()}`,
        fintech_use_num: account.fintechUseNum,
        tran_dtime: this.transactionDateTime(),
      });
      const balance = await this.getJson<BalanceResponse>(
        `/v2.0/account/balance/fin_num?${query}`,
        accessToken,
      );
      this.assertSuccess(balance);
      account.balanceAmt = balance.balance_amt ?? null;
      account.availableAmt = balance.available_amt ?? null;
      account.accountType = balance.account_type ?? account.accountType;
      account.productName = balance.product_name ?? account.productName;
      account.balanceSyncedAt = new Date();
      await this.accounts.save(account);
    }
    return this.getAccounts(userId);
  }

  private async syncAccountList(
    connection: OpenBankingConnection,
    accessToken: string,
  ) {
    const info = await this.getJson<UserInfoResponse>(
      `/v2.0/user/me?${new URLSearchParams({ user_seq_no: connection.userSeqNo })}`,
      accessToken,
    );
    this.assertSuccess(info);
    for (const item of info.res_list ?? []) {
      let account = await this.accounts.findOneBy({
        userId: connection.userId,
        fintechUseNum: item.fintech_use_num,
      });
      account ??= this.accounts.create({
        connectionId: connection.id,
        userId: connection.userId,
        fintechUseNum: item.fintech_use_num,
      });
      Object.assign(account, {
        connectionId: connection.id,
        bankCodeStd: item.bank_code_std,
        bankName: item.bank_name,
        accountAlias: item.account_alias ?? null,
        accountNumMasked: item.account_num_masked,
        accountHolderName: item.account_holder_name ?? null,
        accountType: item.account_type ?? null,
      });
      await this.accounts.save(account);
    }
  }

  private async validAccessToken(connection: OpenBankingConnection) {
    if (connection.tokenExpiresAt.getTime() > Date.now() + 60_000) {
      return this.crypto.decrypt(connection.accessTokenEncrypted);
    }
    if (!connection.refreshTokenEncrypted) {
      throw new BadRequestException("오픈뱅킹 연결이 만료되었습니다. 다시 연결해주세요.");
    }
    const token = await this.requestToken({
      refresh_token: this.crypto.decrypt(connection.refreshTokenEncrypted),
      grant_type: "refresh_token",
      scope: connection.scope,
    });
    if (!token.access_token) throw new BadGatewayException("토큰 갱신에 실패했습니다.");
    connection.accessTokenEncrypted = this.crypto.encrypt(token.access_token);
    if (token.refresh_token) {
      connection.refreshTokenEncrypted = this.crypto.encrypt(token.refresh_token);
    }
    connection.tokenExpiresAt = new Date(
      Date.now() + Number(token.expires_in ?? 0) * 1000,
    );
    await this.connections.save(connection);
    return token.access_token;
  }

  private async connectionWithTokens(userId: string) {
    const connection = await this.connections
      .createQueryBuilder("connection")
      .addSelect([
        "connection.accessTokenEncrypted",
        "connection.refreshTokenEncrypted",
      ])
      .where("connection.userId = :userId", { userId })
      .getOne();
    if (!connection) throw new BadRequestException("먼저 계좌를 연결해주세요.");
    return connection;
  }

  private async requestToken(extra: Record<string, string>) {
    const body = new URLSearchParams({
      client_id: this.required("OPEN_BANKING_CLIENT_ID"),
      client_secret: this.required("OPEN_BANKING_CLIENT_SECRET"),
      ...extra,
    });
    const response = await fetch(`${this.baseUrl()}/oauth/2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const payload = (await response.json().catch(() => ({}))) as TokenResponse;
    if (!response.ok || payload.error) {
      throw new BadGatewayException(
        payload.error_description ?? payload.error ?? "오픈뱅킹 토큰 발급에 실패했습니다.",
      );
    }
    return payload;
  }

  private async getJson<T>(path: string, accessToken: string) {
    const response = await fetch(`${this.baseUrl()}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payload = (await response.json().catch(() => ({}))) as T;
    if (!response.ok) throw new BadGatewayException("오픈뱅킹 API 호출에 실패했습니다.");
    return payload;
  }

  private assertSuccess(payload: { rsp_code?: string; rsp_message?: string }) {
    if (payload.rsp_code && payload.rsp_code !== "A0000") {
      throw new BadGatewayException(
        payload.rsp_message || `오픈뱅킹 오류 (${payload.rsp_code})`,
      );
    }
  }

  private required(key: string) {
    const value = this.config.get<string>(key);
    if (!value) throw new ServiceUnavailableException(`${key}가 설정되지 않았습니다.`);
    return value;
  }

  private baseUrl() {
    return this.config
      .get("OPEN_BANKING_BASE_URL", "https://testapi.openbanking.or.kr")
      .replace(/\/$/, "");
  }

  private hash(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }

  private transactionDateTime() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? "";
    return `${get("year")}${get("month")}${get("day")}${get("hour")}${get("minute")}${get("second")}`;
  }
}
