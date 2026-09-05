"use client";

import { useState, type FormEvent } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import s from "@/components/auth/AuthForm.module.scss";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import {
  ACTIVE_WORKSPACE_KEY,
  request,
  storeSession,
  type AuthResponse,
} from "@/lib/http";

export default function LinkExistingAccountPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const session = await request<AuthResponse>(
        "/auth/oidc/relink-account",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: String(form.get("email")).trim().toLowerCase(),
            password: String(form.get("password")),
          }),
        },
      );
      storeSession(session);
      localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
      window.location.replace("/home");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "기존 계정을 연결하지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="기존 가계부 계정 연결"
      description="기존 계정의 소유권을 확인하면 가계와 거래내역을 그대로 이어서 사용할 수 있어요."
      footer="이메일만 같다는 이유로 계정을 자동 연결하지 않습니다."
    >
      <form className={s.form} onSubmit={submit}>
        {error && <p className={s.error}>{error}</p>}
        <FormField label="기존 가계부 이메일">
          <Input
            name="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
          />
        </FormField>
        <FormField label="기존 가계부 비밀번호">
          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={8}
            required
          />
        </FormField>
        <Button className={s.submit} block disabled={loading}>
          {loading ? "계정 연결 중…" : "확인 후 기존 계정 연결"}
        </Button>
      </form>
    </AuthShell>
  );
}
