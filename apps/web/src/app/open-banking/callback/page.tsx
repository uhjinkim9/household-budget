"use client";

import { useEffect, useState } from "react";
import s from "./page.module.scss";

export default function OpenBankingCallbackPage() {
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status") === "connected" ? "connected" : "error";
    const message = params.get("message") || undefined;
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        { type: "open-banking:complete", status, message },
        window.location.origin,
      );
      window.close();
      setCanClose(true);
      return;
    }
    const query = new URLSearchParams({ openBanking: status });
    if (message) query.set("message", message);
    window.location.replace(`/settings/open-banking?${query}`);
  }, []);

  return (
    <main className={s.page}>
      <div className={s.spinner} />
      <h1>계좌 연결을 마무리하고 있어요</h1>
      <p>{canClose ? "이 창을 닫아도 됩니다." : "잠시만 기다려주세요."}</p>
    </main>
  );
}
