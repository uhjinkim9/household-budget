"use client";

import { useEffect, useRef, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import {
  openBankingApi,
  type OpenBankingStatus,
} from "@/lib/open-banking-api";
import s from "./page.module.scss";

export default function OpenBankingSettingsPage() {
  const [banking, setBanking] = useState<OpenBankingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const popupRef = useRef<Window | null>(null);
  const popupPollRef = useRef<number | null>(null);

  useEffect(() => {
    openBankingApi
      .status()
      .then(setBanking)
      .catch((e) => setError(e.message));
    const params = new URLSearchParams(window.location.search);
    if (params.get("openBanking") === "connected") {
      setMessage("오픈뱅킹 계좌를 연결했습니다.");
      window.history.replaceState({}, "", "/settings/open-banking");
    } else if (params.get("openBanking") === "error") {
      setError(params.get("message") || "오픈뱅킹 계좌 연결에 실패했습니다.");
      window.history.replaceState({}, "", "/settings/open-banking");
    }
  }, []);

  useEffect(() => {
    const receiveOauthResult = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.data?.type !== "open-banking:complete"
      ) {
        return;
      }
      if (popupPollRef.current !== null) {
        window.clearInterval(popupPollRef.current);
        popupPollRef.current = null;
      }
      popupRef.current?.close();
      popupRef.current = null;
      if (event.data.status === "connected") {
        setMessage("오픈뱅킹 계좌를 연결했습니다.");
        setError("");
        setLoading(true);
        openBankingApi
          .status()
          .then(setBanking)
          .catch((e) => setError(e.message))
          .finally(() => setLoading(false));
      } else {
        setError(event.data.message || "오픈뱅킹 계좌 연결에 실패했습니다.");
        setLoading(false);
      }
    };
    window.addEventListener("message", receiveOauthResult);
    return () => {
      window.removeEventListener("message", receiveOauthResult);
      if (popupPollRef.current !== null) {
        window.clearInterval(popupPollRef.current);
      }
      popupRef.current?.close();
    };
  }, []);

  async function connect() {
    setError("");
    setMessage("");
    const popup = window.open(
      "",
      "open-banking-oauth",
      "popup=yes,width=520,height=760,resizable=yes,scrollbars=yes",
    );
    if (!popup) {
      setError("팝업이 차단되었습니다. 브라우저에서 팝업을 허용해주세요.");
      return;
    }
    popupRef.current = popup;
    let checkingConnection = false;
    popupPollRef.current = window.setInterval(async () => {
      if (!popup.closed && !checkingConnection) {
        checkingConnection = true;
        try {
          const status = await openBankingApi.status();
          if (status.connected) {
            setBanking(status);
            setMessage("오픈뱅킹 계좌를 연결했습니다.");
            setLoading(false);
            popup.close();
          }
        } catch {
          // 팝업의 postMessage가 차단된 경우를 위한 보조 폴링입니다.
        } finally {
          checkingConnection = false;
        }
      }
      if (!popup.closed) return;
      if (popupPollRef.current !== null) {
        window.clearInterval(popupPollRef.current);
        popupPollRef.current = null;
      }
      if (popupRef.current === popup) {
        popupRef.current = null;
        setLoading(false);
      }
    }, 1_000);
    popup.document.title = "오픈뱅킹 연결";
    setLoading(true);
    try {
      const { authorizationUrl } = await openBankingApi.connect();
      popup.location.replace(authorizationUrl);
    } catch (e) {
      popup.close();
      popupRef.current = null;
      if (popupPollRef.current !== null) {
        window.clearInterval(popupPollRef.current);
        popupPollRef.current = null;
      }
      setError(e instanceof Error ? e.message : "계좌 연결을 시작하지 못했습니다.");
      setLoading(false);
    }
  }

  async function refresh() {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      setBanking(await openBankingApi.refresh());
      setMessage("연결된 계좌 잔액을 갱신했습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "잔액을 갱신하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={s.shell}>
      <Sidebar />
      <main>
        <header>
          <p>환경설정</p>
          <h1>계좌 연결</h1>
          <span>금융결제원 오픈뱅킹에서 계좌와 잔액을 불러옵니다.</span>
        </header>
        {error && <p className={s.error}>{error}</p>}
        {message && <p className={s.success}>{message}</p>}
        <section className={s.card}>
          <div className={s.integrationHeader}>
            <div>
              <h2>오픈뱅킹 계좌</h2>
              <p>연결 과정은 금융결제원 인증 화면에서 진행됩니다.</p>
            </div>
            <Button
              type="button"
              variant={banking?.connected ? "secondary" : "primary"}
              disabled={loading || banking?.configured === false}
              onClick={banking?.connected ? refresh : connect}
            >
              {loading
                ? "처리 중…"
                : banking?.connected
                  ? "잔액 새로고침"
                  : "계좌 연결"}
            </Button>
          </div>
          {banking?.configured === false && (
            <p className={s.notice}>
              서버에 오픈뱅킹 Client ID와 Client Secret을 설정해주세요.
            </p>
          )}
          {banking?.connected && !banking.balanceEnabled && (
            <p className={s.notice}>
              계좌 연결은 완료됐습니다. 잔액조회에는 이용기관 코드 설정이 필요합니다.
            </p>
          )}
          {banking?.connected && banking.accounts.length === 0 && (
            <p className={s.empty}>등록된 계좌를 불러오고 있어요.</p>
          )}
          {banking?.accounts.map((account) => (
            <article className={s.account} key={account.id}>
              <div>
                <b>{account.bankName}</b>
                <span>
                  {account.accountAlias || account.productName || "연결 계좌"} ·{" "}
                  {account.accountNumMasked}
                </span>
              </div>
              <div className={s.balance}>
                <b>
                  {account.balanceAmt === null
                    ? "잔액 조회 전"
                    : `${Number(account.balanceAmt).toLocaleString("ko-KR")}원`}
                </b>
                {account.balanceSyncedAt && (
                  <span>
                    {new Date(account.balanceSyncedAt).toLocaleString("ko-KR")} 기준
                  </span>
                )}
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
