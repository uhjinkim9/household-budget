import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import {
  createHash,
  createPublicKey,
  randomBytes,
  timingSafeEqual,
  verify as verifySignature,
} from "crypto";
import type { JsonWebKey as CryptoJsonWebKey } from "crypto";
import { DataSource, LessThan, Repository } from "typeorm";
import { OidcLoginAttempt } from "../entities/oidc-login-attempt.entity";
import { OidcSession } from "../entities/oidc-session.entity";
import {
  IdentityLinkStatus,
  IdentityMigrationStatus,
  UserIdentityLink,
} from "../entities/user-identity-link.entity";
import { AuthProvider, User } from "../entities/user.entity";
import { MercuryIdentityService } from "./mercury-identity.service";
import { OidcTokenCryptoService } from "./oidc-token-crypto.service";
import {
  createPkceChallenge,
  hasAudience,
  safeAppReturnUrl,
} from "./oidc-security";

interface Discovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  end_session_endpoint?: string;
}

interface OidcClaims {
  sub: string;
  iss: string;
  aud: string | string[];
  exp: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  realm_access?: { roles?: string[] };
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token: string;
  expires_in: number;
  refresh_expires_in?: number;
}

type OidcJwk = CryptoJsonWebKey & { kid?: string };

@Injectable()
export class OidcService {
  private readonly issuer: string;
  private readonly clientId: string;
  private readonly redirectUri: string;
  private discoveryCache?: Discovery;
  private jwksCache?: { keys: OidcJwk[]; expiresAt: number };

  constructor(
    config: ConfigService,
    @InjectRepository(OidcLoginAttempt)
    private readonly attempts: Repository<OidcLoginAttempt>,
    @InjectRepository(OidcSession)
    private readonly sessions: Repository<OidcSession>,
    @InjectRepository(UserIdentityLink)
    private readonly links: Repository<UserIdentityLink>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly crypto: OidcTokenCryptoService,
    private readonly identity: MercuryIdentityService,
  ) {
    this.issuer = config.get<string>("OIDC_ISSUER", "").replace(/\/$/, "");
    this.clientId = config.get<string>(
      "OIDC_CLIENT_ID",
      "household-budget-web",
    );
    this.redirectUri = config.get<string>("OIDC_REDIRECT_URI", "");
  }

  async begin(returnUrl = "/home") {
    this.assertConfigured();
    await this.attempts.delete({ expiresAt: LessThan(new Date()) });
    const state = this.randomValue();
    const nonce = this.randomValue();
    const codeVerifier = this.randomValue(64);
    const attempt = await this.attempts.save(
      this.attempts.create({
        stateHash: this.hash(state),
        nonce,
        codeVerifier,
        returnUrl: safeAppReturnUrl(returnUrl),
        expiresAt: new Date(Date.now() + 10 * 60_000),
      }),
    );
    const discovery = await this.discovery();
    const url = new URL(discovery.authorization_endpoint);
    url.search = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: "openid profile email roles mercury-api-audience",
      state,
      nonce,
      code_challenge: createPkceChallenge(codeVerifier),
      code_challenge_method: "S256",
    }).toString();
    return { attemptId: attempt.id, url: url.toString() };
  }

  async callback(attemptId: string, code: string, state: string) {
    this.assertConfigured();
    const attempt = await this.attempts.findOneBy({ id: attemptId });
    if (
      !attempt ||
      attempt.expiresAt.getTime() <= Date.now() ||
      !this.timingSafeEqual(attempt.stateHash, this.hash(state))
    ) {
      if (attempt) await this.attempts.delete(attempt.id);
      throw new BadRequestException(
        "OIDC state가 유효하지 않거나 로그인 시도가 만료되었습니다.",
      );
    }

    const tokens = await this.exchangeCode(code, attempt.codeVerifier);
    const idClaims = await this.verifyJwt(tokens.id_token, this.clientId);
    if (idClaims.nonce !== attempt.nonce) {
      await this.attempts.delete(attempt.id);
      throw new BadRequestException("OIDC nonce가 일치하지 않습니다.");
    }
    const accessClaims = await this.verifyJwt(
      tokens.access_token,
      "mercury-api",
    );
    if (accessClaims.sub !== idClaims.sub)
      throw new UnauthorizedException(
        "OIDC 토큰 사용자 식별자가 일치하지 않습니다.",
      );
    const roles = accessClaims.realm_access?.roles ?? [];
    if (
      !roles.some((role) => role === "mercury-user" || role === "mercury-admin")
    )
      throw new UnauthorizedException("Mercury 플랫폼 접근 권한이 없습니다.");

    await this.identity.sync(tokens.access_token);
    await this.attempts.delete(attempt.id);

    let link = await this.links.findOneBy({ mercurySubject: idClaims.sub });
    if (link?.status === IdentityLinkStatus.LINKED && link.userId) {
      const oidcSession = await this.saveSession(
        tokens,
        idClaims.sub,
        link.userId,
      );
      return {
        kind: "authenticated" as const,
        userId: link.userId,
        oidcSessionId: oidcSession.id,
        returnUrl: attempt.returnUrl,
      };
    }

    const email = idClaims.email?.trim().toLowerCase() ?? null;
    const existing = email ? await this.users.findOneBy({ email }) : null;
    if (existing) {
      link ??= this.links.create({ mercurySubject: idClaims.sub });
      Object.assign(link, {
        userId: existing.id,
        observedEmail: email,
        status: IdentityLinkStatus.PENDING,
        migrationStatus: IdentityMigrationStatus.NOT_STARTED,
        lastError: null,
      });
      link = await this.links.save(link);
      const oidcSession = await this.saveSession(tokens, idClaims.sub, null);
      return {
        kind: "link-required" as const,
        oidcSessionId: oidcSession.id,
        returnUrl: attempt.returnUrl,
      };
    }

    if (!email || idClaims.email_verified !== true)
      throw new BadRequestException(
        "검증된 이메일이 없는 중앙 계정은 신규 가입할 수 없습니다.",
      );
    const userId = await this.dataSource.transaction(async (manager) => {
      const user = await manager.save(
        User,
        manager.create(User, {
          email,
          name: idClaims.name?.trim() || email.split("@")[0],
          passwordHash: null,
          provider: AuthProvider.MERCURY_OIDC,
        }),
      );
      await manager.save(
        UserIdentityLink,
        manager.create(UserIdentityLink, {
          mercurySubject: idClaims.sub,
          userId: user.id,
          observedEmail: email,
          status: IdentityLinkStatus.LINKED,
          migrationStatus: IdentityMigrationStatus.COMPLETED,
          linkedAt: new Date(),
          migratedAt: new Date(),
        }),
      );
      return user.id;
    });
    const oidcSession = await this.saveSession(tokens, idClaims.sub, userId);
    return {
      kind: "authenticated" as const,
      userId,
      oidcSessionId: oidcSession.id,
      returnUrl: attempt.returnUrl,
    };
  }

  async linkExisting(oidcSessionId: string, password: string) {
    const session = await this.sessions.findOneBy({ id: oidcSessionId });
    if (
      !session ||
      (session.refreshExpiresAt &&
        session.refreshExpiresAt.getTime() <= Date.now())
    )
      throw new UnauthorizedException("OIDC 연결 세션이 만료되었습니다.");
    const link = await this.links.findOneBy({
      mercurySubject: session.mercurySubject,
    });
    if (!link?.userId)
      throw new BadRequestException("연결할 기존 계정이 없습니다.");
    const occupied = await this.links.findOneBy({
      userId: link.userId,
      status: IdentityLinkStatus.LINKED,
    });
    if (occupied && occupied.mercurySubject !== link.mercurySubject)
      throw new ConflictException(
        "이미 다른 Mercury 계정에 연결된 회원입니다.",
      );
    const user = await this.users
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .where("user.id = :id", { id: link.userId })
      .getOne();
    if (
      !user?.passwordHash ||
      !(await bcrypt.compare(password, user.passwordHash))
    )
      throw new UnauthorizedException(
        "기존 계정 비밀번호가 올바르지 않습니다.",
      );

    link.status = IdentityLinkStatus.LINKING;
    link.migrationStatus = IdentityMigrationStatus.PENDING;
    link.lastError = null;
    await this.links.save(link);
    try {
      await this.identity.linkExistingAccount(
        this.crypto.decrypt(session.accessTokenEncrypted),
        user.id,
        link.id,
      );
      await this.dataSource.transaction(async (manager) => {
        await manager.update(UserIdentityLink, link.id, {
          status: IdentityLinkStatus.LINKED,
          migrationStatus: IdentityMigrationStatus.COMPLETED,
          linkedAt: new Date(),
          migratedAt: new Date(),
          lastError: null,
        });
        await manager.update(OidcSession, session.id, { userId: user.id });
      });
      return { userId: user.id };
    } catch (error) {
      await this.links.update(link.id, {
        status: IdentityLinkStatus.FAILED,
        migrationStatus: IdentityMigrationStatus.FAILED,
        lastError:
          error instanceof Error
            ? error.message.slice(0, 500)
            : "계정 연결 실패",
      });
      throw error;
    }
  }

  async logoutUrl(oidcSessionId: string, postLogoutRedirectUri: string) {
    const session = await this.sessions.findOneBy({ id: oidcSessionId });
    if (!session) return postLogoutRedirectUri;
    const idToken = this.crypto.decrypt(session.idTokenEncrypted);
    await this.sessions.delete(session.id);
    const endpoint = (await this.discovery()).end_session_endpoint;
    if (!endpoint) return postLogoutRedirectUri;
    const url = new URL(endpoint);
    url.search = new URLSearchParams({
      client_id: this.clientId,
      id_token_hint: idToken,
      post_logout_redirect_uri: postLogoutRedirectUri,
    }).toString();
    return url.toString();
  }

  async ensureActive(oidcSessionId: string) {
    if (!oidcSessionId) return;
    const session = await this.sessions.findOneBy({ id: oidcSessionId });
    if (!session)
      throw new UnauthorizedException(
        "Mercury 로그인 세션을 찾을 수 없습니다.",
      );
    if (session.expiresAt.getTime() > Date.now() + 30_000) return;
    if (
      !session.refreshTokenEncrypted ||
      (session.refreshExpiresAt &&
        session.refreshExpiresAt.getTime() <= Date.now())
    ) {
      await this.sessions.delete(session.id);
      throw new UnauthorizedException("Mercury 로그인 세션이 만료되었습니다.");
    }
    const response = await fetch((await this.discovery()).token_endpoint, {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: this.clientId,
        refresh_token: this.crypto.decrypt(session.refreshTokenEncrypted),
      }),
    });
    if (!response.ok) {
      await this.sessions.delete(session.id);
      throw new UnauthorizedException(
        "Mercury 계정이 만료되었거나 더 이상 사용할 수 없습니다.",
      );
    }
    const tokens = (await response.json()) as TokenResponse;
    const claims = await this.verifyJwt(tokens.access_token, "mercury-api");
    if (claims.sub !== session.mercurySubject)
      throw new UnauthorizedException(
        "Mercury 세션 사용자가 일치하지 않습니다.",
      );
    await this.identity.sync(tokens.access_token);
    session.accessTokenEncrypted = this.crypto.encrypt(tokens.access_token);
    if (tokens.refresh_token)
      session.refreshTokenEncrypted = this.crypto.encrypt(tokens.refresh_token);
    if (tokens.id_token)
      session.idTokenEncrypted = this.crypto.encrypt(tokens.id_token);
    session.expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    if (tokens.refresh_expires_in)
      session.refreshExpiresAt = new Date(
        Date.now() + tokens.refresh_expires_in * 1000,
      );
    await this.sessions.save(session);
  }

  private async saveSession(
    tokens: TokenResponse,
    subject: string,
    userId: string | null,
  ) {
    return this.sessions.save(
      this.sessions.create({
        mercurySubject: subject,
        userId,
        accessTokenEncrypted: this.crypto.encrypt(tokens.access_token),
        refreshTokenEncrypted: tokens.refresh_token
          ? this.crypto.encrypt(tokens.refresh_token)
          : null,
        idTokenEncrypted: this.crypto.encrypt(tokens.id_token),
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        refreshExpiresAt: tokens.refresh_expires_in
          ? new Date(Date.now() + tokens.refresh_expires_in * 1000)
          : null,
      }),
    );
  }

  private async exchangeCode(code: string, verifier: string) {
    const response = await fetch((await this.discovery()).token_endpoint, {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: this.clientId,
        redirect_uri: this.redirectUri,
        code,
        code_verifier: verifier,
      }),
    });
    if (!response.ok)
      throw new BadRequestException(
        "OIDC authorization code 교환에 실패했습니다.",
      );
    return (await response.json()) as TokenResponse;
  }

  private async verifyJwt(token: string, expectedAudience: string) {
    const parts = token.split(".");
    if (parts.length !== 3)
      throw new UnauthorizedException("잘못된 OIDC 토큰입니다.");
    const header = JSON.parse(
      Buffer.from(parts[0], "base64url").toString(),
    ) as { alg?: string; kid?: string };
    const claims = JSON.parse(
      Buffer.from(parts[1], "base64url").toString(),
    ) as OidcClaims;
    if (header.alg !== "RS256" || !header.kid)
      throw new UnauthorizedException("지원하지 않는 OIDC 서명 방식입니다.");
    const key = (await this.jwks()).find(
      (candidate) => candidate.kid === header.kid,
    );
    if (!key) {
      this.jwksCache = undefined;
      const refreshed = (await this.jwks()).find(
        (candidate) => candidate.kid === header.kid,
      );
      if (!refreshed)
        throw new UnauthorizedException("OIDC 서명 키를 찾을 수 없습니다.");
      return this.verifyJwtWithKey(parts, claims, expectedAudience, refreshed);
    }
    return this.verifyJwtWithKey(parts, claims, expectedAudience, key);
  }

  private verifyJwtWithKey(
    parts: string[],
    claims: OidcClaims,
    audience: string,
    jwk: OidcJwk,
  ) {
    const valid = verifySignature(
      "RSA-SHA256",
      Buffer.from(`${parts[0]}.${parts[1]}`),
      createPublicKey({ key: jwk, format: "jwk" }),
      Buffer.from(parts[2], "base64url"),
    );
    if (
      !valid ||
      claims.iss !== this.issuer ||
      !hasAudience(claims.aud, audience) ||
      claims.exp * 1000 <= Date.now() ||
      !claims.sub
    )
      throw new UnauthorizedException("OIDC 토큰 검증에 실패했습니다.");
    return claims;
  }

  private async discovery() {
    this.assertConfigured();
    if (this.discoveryCache) return this.discoveryCache;
    const response = await fetch(
      `${this.issuer}/.well-known/openid-configuration`,
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!response.ok)
      throw new BadGatewayException("OIDC discovery를 불러오지 못했습니다.");
    const discovery = (await response.json()) as Discovery;
    if (discovery.issuer !== this.issuer)
      throw new BadGatewayException("OIDC issuer가 설정과 일치하지 않습니다.");
    this.discoveryCache = discovery;
    return discovery;
  }

  private async jwks() {
    if (this.jwksCache && this.jwksCache.expiresAt > Date.now())
      return this.jwksCache.keys;
    const response = await fetch((await this.discovery()).jwks_uri, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok)
      throw new BadGatewayException("OIDC JWKS를 불러오지 못했습니다.");
    const { keys } = (await response.json()) as { keys: OidcJwk[] };
    this.jwksCache = { keys, expiresAt: Date.now() + 60 * 60_000 };
    return keys;
  }

  private randomValue(bytes = 32) {
    return randomBytes(bytes).toString("base64url");
  }
  private hash(value: string, encoding: "hex" | "base64url" = "hex") {
    return createHash("sha256").update(value).digest(encoding);
  }
  private timingSafeEqual(left: string, right: string) {
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private assertConfigured() {
    if (!this.issuer || !this.clientId || !this.redirectUri)
      throw new BadGatewayException(
        "Mercury OIDC 환경변수가 설정되지 않았습니다.",
      );
  }
}
