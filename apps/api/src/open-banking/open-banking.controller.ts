import { Controller, Get, Post, Query, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthGuard } from "@nestjs/passport";
import type { Response } from "express";
import { AuthUser } from "../auth/auth-user.decorator";
import { OpenBankingService } from "./open-banking.service";

@Controller("integrations/open-banking")
export class OpenBankingController {
  constructor(
    private readonly openBanking: OpenBankingService,
    private readonly config: ConfigService,
  ) {}

  @UseGuards(AuthGuard("jwt"))
  @Post("connect")
  connect(@AuthUser() user: { id: string }) {
    return this.openBanking.createAuthorizationUrl(user.id);
  }

  @Get("oauth/callback")
  async callback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Query("error") error: string | undefined,
    @Res() response: Response,
  ) {
    const webUrl = this.config.get("WEB_URL", "http://localhost:3000");
    try {
      if (error) throw new Error(`오픈뱅킹 인증이 취소되었습니다. (${error})`);
      if (!code || !state) throw new Error("인가코드 또는 상태값이 없습니다.");
      await this.openBanking.completeAuthorization(code, state);
      return response.redirect(`${webUrl}/settings?openBanking=connected`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "계좌 연결에 실패했습니다.";
      return response.redirect(
        `${webUrl}/settings?openBanking=error&message=${encodeURIComponent(message)}`,
      );
    }
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("accounts")
  accounts(@AuthUser() user: { id: string }) {
    return this.openBanking.getAccounts(user.id);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("accounts/refresh")
  refresh(@AuthUser() user: { id: string }) {
    return this.openBanking.refreshBalances(user.id);
  }
}
