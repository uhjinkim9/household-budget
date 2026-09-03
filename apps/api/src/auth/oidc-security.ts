import { createHash } from "crypto";

export function createPkceChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function safeAppReturnUrl(value?: string) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/home";
}

export function hasAudience(
  tokenAudience: string | string[] | undefined,
  expected: string,
) {
  const audiences = Array.isArray(tokenAudience)
    ? tokenAudience
    : [tokenAudience];
  return audiences.includes(expected);
}
