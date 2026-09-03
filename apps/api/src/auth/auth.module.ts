import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmailVerification } from "../entities/email-verification.entity";
import { RefreshSession } from "../entities/refresh-session.entity";
import { OidcLoginAttempt } from "../entities/oidc-login-attempt.entity";
import { OidcSession } from "../entities/oidc-session.entity";
import { UserIdentityLink } from "../entities/user-identity-link.entity";
import { User } from "../entities/user.entity";
import { MailModule } from "../mail/mail.module";
import { AuthController } from "./auth.controller";
import { OidcController } from "./oidc.controller";
import { AuthCookieService } from "./auth-cookie.service";
import { OidcService } from "./oidc.service";
import { OidcTokenCryptoService } from "./oidc-token-crypto.service";
import { MercuryIdentityService } from "./mercury-identity.service";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      EmailVerification,
      RefreshSession,
      OidcLoginAttempt,
      OidcSession,
      UserIdentityLink,
    ]),
    MailModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get("JWT_SECRET") ?? "dev-only-secret",
        signOptions: {
          expiresIn: config.get("JWT_ACCESS_EXPIRES_IN", "15m"),
        },
      }),
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    AuthCookieService,
    OidcService,
    OidcTokenCryptoService,
    MercuryIdentityService,
  ],
  controllers: [AuthController, OidcController],
  exports: [JwtModule],
})
export class AuthModule {}
