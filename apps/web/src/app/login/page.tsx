"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { authenticate, hasSession, saveSession } from "@/lib/auth";
import { openBankingApi } from "@/lib/open-banking-api";
import s from "@/components/auth/AuthForm.module.scss";
export default function LoginPage() {
  const router = useRouter(),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    if (hasSession()) router.replace("/home");
  }, [router]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const d = new FormData(e.currentTarget);
    try {
      saveSession(
        await authenticate("login", {
          email: String(d.get("email")),
          password: String(d.get("password")),
        }),
      );
      // 운영 빌드에서만 연결된 계좌의 잔액을 로그인 직후 갱신합니다.
      // 계좌 미연결이나 금융결제원 일시 오류가 로그인을 막지는 않습니다.
      void openBankingApi.refreshAfterLogin().catch(() => null);
      router.replace("/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <AuthShell
      title="만나서 반가워요"
      description="가계부를 관리하려면 로그인해주세요."
      footer={
        <>
          아직 계정이 없나요?<Link href="/signup">회원가입</Link>
        </>
      }
    >
      <form className={s.form} onSubmit={submit}>
        {error && <p className={s.error}>{error}</p>}
        <FormField label="이메일">
          <Input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            required
            autoFocus
          />
        </FormField>
        <FormField label="비밀번호">
          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="비밀번호를 입력해주세요"
            required
          />
        </FormField>
        <div className={s.options}>
          <label>
            <input type="checkbox" defaultChecked /> 로그인 상태 유지
          </label>
          <button type="button">비밀번호 찾기</button>
        </div>
        <Button className={s.submit} block disabled={loading}>
          {loading ? "로그인 중…" : "로그인"}
        </Button>
      </form>
    </AuthShell>
  );
}
