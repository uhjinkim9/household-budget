import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => readCookie(request, "budget-access-token"),
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get("JWT_SECRET") ?? "dev-only-secret",
    });
  }

  validate(payload: { sub: string; email: string }) {
    return { id: payload.sub, email: payload.email };
  }
}

function readCookie(request: Request, name: string) {
  for (const cookie of request.headers.cookie?.split(";") ?? []) {
    const trimmed = cookie.trim();
    const separator = trimmed.indexOf("=");

    if (separator < 0) continue;
    if (trimmed.slice(0, separator) !== name) continue;

    return decodeURIComponent(trimmed.slice(separator + 1));
  }

  return null;
}
