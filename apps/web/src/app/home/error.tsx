"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import s from "./error.module.scss";

export default function HomeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard render failed", error);
  }, [error]);

  return (
    <main className={s.page}>
      <section>
        <span>잠시 문제가 생겼어요</span>
        <h1>대시보드를 표시하지 못했습니다.</h1>
        <p>새로고침하거나 다시 시도하면 정상적으로 표시될 수 있어요.</p>
        <div>
          <Button onClick={reset}>다시 시도</Button>
          <Button
            variant="secondary"
            onClick={() => window.location.reload()}
          >
            새로고침
          </Button>
        </div>
      </section>
    </main>
  );
}
