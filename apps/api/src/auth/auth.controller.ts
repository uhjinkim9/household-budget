import { Body, Controller, Post, Req, Res } from "@nestjs/common";
import { IsEmail, IsString, Length, MinLength } from "class-validator";
import type { Request, Response } from "express";
import { AuthCookieService } from "./auth-cookie.service";
import { OidcService } from "./oidc.service";
import { AuthService } from "./auth.service";

class RegisterDto {
  @IsEmail()
  email!: string;
  @IsString()
  @MinLength(8)
  password!: string;
  @IsString()
  @MinLength(2)
  name!: string;
}
class LoginDto {
  @IsEmail()
  email!: string;
  @IsString()
  password!: string;
}
class EmailDto {
  @IsEmail()
  email!: string;
}
class VerifyDto extends EmailDto {
  @IsString()
  @Length(6, 6)
  code!: string;
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: AuthCookieService,
    private readonly oidc: OidcService,
  ) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.auth.requestRegistration(dto.email, dto.password, dto.name);
  }

  @Post("verify-email")
  async verify(
    @Body() dto: VerifyDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.auth.verifyRegistration(dto.email, dto.code);
    this.cookies.setAppSession(
      response,
      session.response.accessToken,
      session.refreshToken,
    );
    return { user: session.response.user };
  }

  @Post("resend-verification")
  resend(@Body() dto: EmailDto) {
    return this.auth.resendVerification(dto.email);
  }

  @Post("login")
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.auth.login(dto.email, dto.password);
    this.cookies.setAppSession(
      response,
      session.response.accessToken,
      session.refreshToken,
    );
    return { user: session.response.user };
  }

  @Post("refresh")
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.oidc.ensureActive(
      this.cookies.read(request, "budget-oidc-session"),
    );
    const session = await this.auth.refresh(
      this.cookies.read(request, "budget-refresh-token"),
    );
    this.cookies.setAccessToken(response, session.accessToken);
    return { user: session.user };
  }

  @Post("logout")
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(this.cookies.read(request, "budget-refresh-token"));
    const logoutUrl = await this.oidc.logoutUrl(
      this.cookies.read(request, "budget-oidc-session"),
      process.env.OIDC_POST_LOGOUT_REDIRECT_URI ?? "http://localhost:3000/",
    );
    this.cookies.clearAll(response);
    return { success: true, logoutUrl };
  }
}
