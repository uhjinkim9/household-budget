import { Body, Controller, Post, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IsEmail, IsString, Length, MinLength } from "class-validator";
import type { CookieOptions, Request, Response } from "express";
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
    private readonly config: ConfigService,
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
    this.setRefreshCookie(response, session.refreshToken);
    return session.response;
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
    this.setRefreshCookie(response, session.refreshToken);
    return session.response;
  }

  @Post("refresh")
  async refresh(@Req() request: Request) {
    return this.auth.refresh(this.readRefreshCookie(request));
  }

  @Post("logout")
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(this.readRefreshCookie(request));
    response.clearCookie("budget-refresh-token", this.cookieOptions());
    return { success: true };
  }

  private readRefreshCookie(request: Request) {
    const cookies = request.headers.cookie?.split(";") ?? [];
    const entry = cookies.find(
      (cookie) => cookie.trim().split("=")[0] === "budget-refresh-token",
    );
    return entry
      ? decodeURIComponent(entry.trim().slice(entry.indexOf("=") + 1))
      : "";
  }

  private setRefreshCookie(response: Response, token: string) {
    response.cookie("budget-refresh-token", token, this.cookieOptions());
  }

  private cookieOptions(): CookieOptions {
    const days = this.config.get<number>("JWT_REFRESH_DAYS", 30);
    return {
      httpOnly: true,
      secure: this.config.get("NODE_ENV") === "production",
      sameSite: "lax",
      path: "/api/auth",
      maxAge: days * 24 * 60 * 60 * 1000,
    };
  }
}
