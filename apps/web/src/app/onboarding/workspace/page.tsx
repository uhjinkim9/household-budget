"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import s from "./page.module.scss";
export default function WorkspaceOnboarding() {
  const router = useRouter(),
    qc = useQueryClient(),
    [mode, setMode] = useState<"create" | "join">("create"),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const data = new FormData(e.currentTarget);
    try {
      const workspace =
        mode === "create"
          ? await api.createWorkspace(String(data.get("name")))
          : await api.joinWorkspace(
              String(data.get("code")).trim().toUpperCase(),
            );
      api.setActiveWorkspace(workspace.id);
      qc.setQueryData(["active-workspace"], workspace);
      await qc.invalidateQueries({ queryKey: ["workspaces"] });
      router.replace("/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "가계를 준비하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className={s.page}>
      <section className={s.card}>
        <img src="/icon.svg" alt="Mercury Lab" />
        <small>WELCOME TO MERCURY LAB</small>
        <h1>첫 가계를 만들어볼까요?</h1>
        <p>
          가계는 함께 수입과 지출을 관리하는 공간이에요.
          <br />
          직접 만들거나 전달받은 초대 코드로 참여할 수 있어요.
        </p>
        <div className={s.tabs}>
          <button
            className={mode === "create" ? s.active : ""}
            onClick={() => setMode("create")}
          >
            새 가계 만들기
          </button>
          <button
            className={mode === "join" ? s.active : ""}
            onClick={() => setMode("join")}
          >
            초대 코드로 참여
          </button>
        </div>
        <form onSubmit={submit}>
          {error && <p className={s.error}>{error}</p>}
          {mode === "create" ? (
            <FormField
              label="가계 이름"
              hint="나중에 가계 관리에서 변경할 수 있어요."
            >
              <Input
                name="name"
                minLength={2}
                maxLength={100}
                placeholder="예: 우리 집 가계부"
                required
                autoFocus
              />
            </FormField>
          ) : (
            <FormField label="초대 코드">
              <Input
                name="code"
                minLength={4}
                maxLength={20}
                placeholder="전달받은 초대 코드를 입력하세요"
                required
                autoFocus
              />
            </FormField>
          )}
          <Button block disabled={loading}>
            {loading
              ? "준비하는 중…"
              : mode === "create"
                ? "가계 만들고 시작하기"
                : "가계에 참여하기"}
          </Button>
        </form>
      </section>
    </main>
  );
}
