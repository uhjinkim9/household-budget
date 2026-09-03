import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
  const callback = new URL(`${apiBase}/auth/oidc/callback`);
  request.nextUrl.searchParams.forEach((value, key) =>
    callback.searchParams.set(key, value),
  );
  return NextResponse.redirect(callback);
}
