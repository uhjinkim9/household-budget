"use client";

import { useEffect, useRef } from "react";
import {
  publicPost,
  removeStoredSession,
  storeSession,
  type AuthResponse,
} from "@/lib/http";
import s from "../../../route-loading.module.scss";

function safeReturnUrl(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/home";
  }
  return value;
}

export default function OidcCompletePage() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const params = new URLSearchParams(window.location.search);
    const returnUrl = safeReturnUrl(params.get("returnUrl"));

    publicPost<AuthResponse>("/auth/refresh")
      .then((session) => {
        storeSession(session);
        window.location.replace(returnUrl);
      })
      .catch(() => {
        removeStoredSession();
        const message = encodeURIComponent(
          "통합 로그인 세션을 생성하지 못했습니다. 다시 로그인해주세요.",
        );
        window.location.replace(`/login?oidcError=${message}`);
      });
  }, []);

  return (
    <main className={s.loading}>로그인 정보를 확인하고 있어요…</main>
  );
}
