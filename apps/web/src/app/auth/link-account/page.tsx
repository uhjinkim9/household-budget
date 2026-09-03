"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import s from "@/components/auth/AuthForm.module.scss";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { publicPost, storeSession, type AuthResponse } from "@/lib/http";

export default function LinkAccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      const session = await publicPost<AuthResponse>(
        "/auth/oidc/link-account",
        { password: String(form.get("password")) },
      );
      storeSession(session);
      router.replace("/home");
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
      description="같은 이메일의 기존 계정이 있습니다. 자동 병합하지 않고 비밀번호로 소유권을 확인합니다."
      footer="연결이 완료되면 기존 가계와 거래내역을 그대로 사용할 수 있어요."
    >
      <form className={s.form} onSubmit={submit}>
        {error && <p className={s.error}>{error}</p>}
        <FormField label="기존 가계부 비밀번호">
          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={8}
            required
            autoFocus
          />
        </FormField>
        <Button className={s.submit} block disabled={loading}>
          {loading ? "계정 연결 중…" : "확인 후 계정 연결"}
        </Button>
      </form>
    </AuthShell>
  );
}
