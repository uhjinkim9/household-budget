import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { CookieOptions, Request, Response } from "express";

@Injectable()
export class AuthCookieService {
  private readonly secure: boolean;
  constructor(private readonly config: ConfigService) {
    this.secure = config.get("NODE_ENV") === "production";
  }

  setAppSession(response: Response, accessToken: string, refreshToken: string) {
    response.cookie(
      "budget-access-token",
      accessToken,
      this.options("/api", 15 * 60_000),
    );
    response.cookie(
      "budget-refresh-token",
      refreshToken,
      this.options("/api/auth", this.refreshMaxAge),
    );
  }

  setAccessToken(response: Response, accessToken: string) {
    response.cookie(
      "budget-access-token",
      accessToken,
      this.options("/api", 15 * 60_000),
    );
  }

  setAttempt(response: Response, id: string) {
    response.cookie(
      "budget-oidc-attempt",
      id,
      this.options("/api/auth", 10 * 60_000),
    );
  }

  setOidcSession(response: Response, id: string, pending = false) {
    response.cookie(
      pending ? "budget-oidc-pending" : "budget-oidc-session",
      id,
      this.options("/api/auth", this.refreshMaxAge),
    );
  }

  read(request: Request, name: string) {
    const entry = (request.headers.cookie?.split(";") ?? []).find(
      (cookie) => cookie.trim().split("=")[0] === name,
    );
    return entry
      ? decodeURIComponent(entry.trim().slice(entry.indexOf("=") + 1))
      : "";
  }

  clearAll(response: Response) {
    for (const [name, path] of [
      ["budget-access-token", "/api"],
      ["budget-refresh-token", "/api/auth"],
      ["budget-oidc-session", "/api/auth"],
      ["budget-oidc-pending", "/api/auth"],
      ["budget-oidc-attempt", "/api/auth"],
    ] as const) {
      response.clearCookie(name, this.options(path));
    }
  }

  clearAttempt(response: Response) {
    response.clearCookie(
      "budget-oidc-attempt",
      this.options("/api/auth"),
    );
  }

  clearPending(response: Response) {
    response.clearCookie("budget-oidc-pending", this.options("/api/auth"));
  }

  private options(path: string, maxAge?: number): CookieOptions {
    return {
      httpOnly: true,
      secure: this.secure,
      sameSite: "lax",
      path,
      ...(maxAge ? { maxAge } : {}),
    };
  }

  private get refreshMaxAge() {
    return (
      Number(this.config.get("JWT_REFRESH_DAYS", 30)) * 24 * 60 * 60 * 1000
    );
  }
}
