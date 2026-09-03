import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { createHash, randomBytes, randomInt } from "crypto";
import { DataSource, LessThan, Repository } from "typeorm";
import { EmailVerification } from "../entities/email-verification.entity";
import { RefreshSession } from "../entities/refresh-session.entity";
import { User } from "../entities/user.entity";
import { MailDispatcher } from "../mail/mail-dispatcher";

const EXPIRES_MINUTES = 5;
const RESEND_SECONDS = 60;
const MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(EmailVerification)
    private readonly verifications: Repository<EmailVerification>,
    @InjectRepository(RefreshSession)
    private readonly refreshSessions: Repository<RefreshSession>,
    private readonly jwt: JwtService,
    private readonly mail: MailDispatcher,
    private readonly db: DataSource,
    private readonly config: ConfigService,
  ) {}

  async requestRegistration(email: string, password: string, name: string) {
    email = email.trim().toLowerCase();
    if (await this.users.findOneBy({ email }))
      throw new ConflictException("이미 가입된 이메일입니다.");
    const previous = await this.verifications.findOneBy({ email });
    if (
      previous &&
      Date.now() - previous.lastSentAt.getTime() < RESEND_SECONDS * 1000
    ) {
      throw new HttpException(
        "인증번호는 60초 후 다시 요청할 수 있습니다.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const code = this.createCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + EXPIRES_MINUTES * 60_000);
    const entity = this.verifications.create({
      ...(previous ?? {}),
      email,
      name,
      passwordHash: await bcrypt.hash(password, 12),
      verificationCodeHash: await bcrypt.hash(code, 10),
      expiresAt,
      attemptCount: 0,
      sendCount: (previous?.sendCount ?? 0) + 1,
      lastSentAt: now,
      verifiedAt: null,
    });
    await this.verifications.save(entity);
    await this.mail.sendVerification({
      to: email,
      code,
      expiresInMinutes: EXPIRES_MINUTES,
    });
    return {
      email,
      expiresInSeconds: EXPIRES_MINUTES * 60,
      resendAfterSeconds: RESEND_SECONDS,
    };
  }

  async resendVerification(email: string) {
    email = email.trim().toLowerCase();
    const pending = await this.verifications
      .createQueryBuilder("v")
      .addSelect("v.verificationCodeHash")
      .where("v.email=:email", { email })
      .getOne();
    if (!pending)
      throw new BadRequestException("먼저 회원가입 정보를 입력해주세요.");
    if (Date.now() - pending.lastSentAt.getTime() < RESEND_SECONDS * 1000)
      throw new HttpException(
        "인증번호는 60초 후 다시 요청할 수 있습니다.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    const code = this.createCode();
    pending.verificationCodeHash = await bcrypt.hash(code, 10);
    pending.expiresAt = new Date(Date.now() + EXPIRES_MINUTES * 60_000);
    pending.lastSentAt = new Date();
    pending.attemptCount = 0;
    pending.sendCount++;
    await this.verifications.save(pending);
    await this.mail.sendVerification({
      to: email,
      code,
      expiresInMinutes: EXPIRES_MINUTES,
    });
    return {
      email,
      expiresInSeconds: EXPIRES_MINUTES * 60,
      resendAfterSeconds: RESEND_SECONDS,
    };
  }

  async verifyRegistration(email: string, code: string) {
    email = email.trim().toLowerCase();
    const pending = await this.verifications
      .createQueryBuilder("v")
      .addSelect(["v.passwordHash", "v.verificationCodeHash"])
      .where("v.email=:email", { email })
      .getOne();
    if (!pending)
      throw new BadRequestException("인증 요청을 찾을 수 없습니다.");
    if (pending.expiresAt.getTime() < Date.now())
      throw new BadRequestException(
        "인증번호가 만료되었습니다. 다시 발급해주세요.",
      );
    if (pending.attemptCount >= MAX_ATTEMPTS)
      throw new BadRequestException(
        "입력 횟수를 초과했습니다. 인증번호를 다시 발급해주세요.",
      );
    if (!(await bcrypt.compare(code, pending.verificationCodeHash))) {
      pending.attemptCount++;
      await this.verifications.save(pending);
      throw new BadRequestException(
        `인증번호가 올바르지 않습니다. (${MAX_ATTEMPTS - pending.attemptCount}회 남음)`,
      );
    }
    const user = await this.db.transaction(async (manager) => {
      if (await manager.findOneBy(User, { email }))
        throw new ConflictException("이미 가입된 이메일입니다.");
      const created = await manager.save(
        User,
        manager.create(User, {
          email,
          name: pending.name,
          passwordHash: pending.passwordHash,
        }),
      );
      await manager.delete(EmailVerification, { id: pending.id });
      return created;
    });
    return this.issue(user);
  }

  async login(email: string, password: string) {
    const user = await this.users
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .where("user.email = :email", { email: email.trim().toLowerCase() })
      .getOne();
    if (
      !user?.passwordHash ||
      !(await bcrypt.compare(password, user.passwordHash))
    )
      throw new UnauthorizedException("이메일 또는 비밀번호를 확인해주세요.");
    return this.issue(user);
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException("로그인이 필요합니다.");
    const session = await this.refreshSessions.findOneBy({
      tokenHash: this.hashToken(refreshToken),
    });
    if (!session || session.expiresAt.getTime() <= Date.now()) {
      if (session) await this.refreshSessions.delete(session.id);
      throw new UnauthorizedException("로그인 세션이 만료되었습니다.");
    }
    const user = await this.users.findOneBy({ id: session.userId });
    if (!user) {
      await this.refreshSessions.delete(session.id);
      throw new UnauthorizedException("사용자를 찾을 수 없습니다.");
    }
    return this.accessResponse(user);
  }

  async logout(refreshToken: string) {
    if (!refreshToken) return;
    await this.refreshSessions.delete({
      tokenHash: this.hashToken(refreshToken),
    });
  }

  async issueForUser(userId: string) {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new UnauthorizedException("사용자를 찾을 수 없습니다.");
    return this.issue(user);
  }

  private async issue(user: User) {
    const refreshToken = randomBytes(48).toString("base64url");
    const refreshDays = Number(this.config.get("JWT_REFRESH_DAYS", 30));
    await this.refreshSessions.delete({ expiresAt: LessThan(new Date()) });
    await this.refreshSessions.insert({
      userId: user.id,
      tokenHash: this.hashToken(refreshToken),
      expiresAt: new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000),
    });
    return { refreshToken, response: this.accessResponse(user) };
  }

  private accessResponse(user: User) {
    return {
      accessToken: this.jwt.sign({ sub: user.id, email: user.email }),
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private createCode() {
    return String(randomInt(0, 1_000_000)).padStart(6, "0");
  }
}
