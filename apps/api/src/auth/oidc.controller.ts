import { Body, Controller, Get, Post, Query, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IsString, MinLength } from "class-validator";
import type { Request, Response } from "express";
import { AuthCookieService } from "./auth-cookie.service";
import { AuthService } from "./auth.service";
import { OidcService } from "./oidc.service";

class LinkAccountDto {
  @IsString()
  @MinLength(8)
  password!: string;
}

@Controller("auth/oidc")
export class OidcController {
  private readonly webOrigin: string;

  constructor(
    config: ConfigService,
    private readonly oidc: OidcService,
    private readonly auth: AuthService,
    private readonly cookies: AuthCookieService,
  ) {
    const redirectUri = config.get<string>("OIDC_REDIRECT_URI");
    this.webOrigin = redirectUri
      ? new URL(redirectUri).origin
      : config.get<string>("WEB_URL", "http://localhost:3000");
  }

  @Get("login")
  async login(
    @Query("returnUrl") returnUrl: string | undefined,
    @Res() response: Response,
  ) {
    const login = await this.oidc.begin(returnUrl);
    this.cookies.setAttempt(response, login.attemptId);
    response.redirect(login.url);
  }

  @Get("callback")
  async callback(
    @Req() request: Request,
    @Res() response: Response,
    @Query("code") code?: string,
    @Query("state") state?: string,
    @Query("error") error?: string,
  ) {
    try {
      if (error || !code || !state)
        throw new Error(error || "authorization_code_missing");
      const result = await this.oidc.callback(
        this.cookies.read(request, "budget-oidc-attempt"),
        code,
        state,
      );
      this.cookies.clearAttempt(response);
      this.cookies.setOidcSession(
        response,
        result.oidcSessionId,
        result.kind === "link-required",
      );
      if (result.kind === "link-required") {
        response.redirect(`${this.webOrigin}/auth/link-account`);
        return;
      }
      const session = await this.auth.issueForUser(result.userId);
      this.cookies.setAppSession(
        response,
        session.response.accessToken,
        session.refreshToken,
      );
      response.redirect(`${this.webOrigin}${result.returnUrl}`);
    } catch (caught) {
      this.cookies.clearAttempt(response);
      const message =
        caught instanceof Error ? caught.message : "OIDC 로그인 실패";
      response.redirect(
        `${this.webOrigin}/login?oidcError=${encodeURIComponent(message)}`,
      );
    }
  }

  @Post("link-account")
  async linkAccount(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() dto: LinkAccountDto,
  ) {
    const oidcSessionId = this.cookies.read(request, "budget-oidc-pending");
    const linked = await this.oidc.linkExisting(oidcSessionId, dto.password);
    const session = await this.auth.issueForUser(linked.userId);
    this.cookies.clearPending(response);
    this.cookies.setOidcSession(response, oidcSessionId);
    this.cookies.setAppSession(
      response,
      session.response.accessToken,
      session.refreshToken,
    );
    return { user: session.response.user };
  }
}
