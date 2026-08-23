"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { Select } from "@/components/ui/Select";
import { api } from "@/lib/api";
import type { TransactionType } from "@/lib/types";
import { monthBounds, formatDate } from "@/lib/dateUtils";
import s from "./page.module.scss";
type Filter = "SPENDING" | "BALANCE" | "FIXED" | "VARIABLE";
const labels: Record<Filter, string> = {
    SPENDING: "전체 소비",
    BALANCE: "잔액",
    FIXED: "정기 지출",
    VARIABLE: "일시적 소비",
  },
  typeLabels: Record<TransactionType, string> = {
    BALANCE: "잔액",
    FIXED: "정기 지출",
    VARIABLE: "일시적 소비",
  };

export default function TransactionsPage() {
  const router = useRouter(),
    range = monthBounds(),
    [filter, setFilter] = useState<Filter>("SPENDING");
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("type");
    if (value && value in labels) setFilter(value as Filter);
  }, []);
  const { data: workspace, isLoading: workspaceLoading } = useQuery({
    queryKey: ["active-workspace"],
    queryFn: api.getOrCreateWorkspace,
  });
  const workspaceId = workspace?.id ?? "";
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["transactions", workspaceId, range.from, range.to],
    queryFn: () => api.transactions(workspaceId, range.from, range.to),
    enabled: Boolean(workspaceId),
  });
  const { data: methods = [] } = useQuery({
    queryKey: ["payment-methods", workspaceId],
    queryFn: () => api.paymentMethods(workspaceId),
    enabled: Boolean(workspaceId),
  });
  const visible = useMemo(
    () =>
      items.filter((item) =>
        filter === "SPENDING" ? item.type !== "BALANCE" : item.type === filter,
      ),
    [items, filter],
  );
  const total = visible.reduce((sum, item) => sum + Number(item.amount), 0);
  function change(next: Filter) {
    setFilter(next);
    router.replace(`/transactions?type=${next}`);
  }
  return (
    <div className={s.shell}>
      <Sidebar />
      <main>
        <header className={s.header}>
          <div>
            <Link href="/home">← 대시보드</Link>
            <h1>{labels[filter]} 목록</h1>
            <p>{range.label}에 등록된 내역을 확인하세요.</p>
          </div>
          <Select
            className={s.filter}
            options={[
              { value: "SPENDING", label: "전체 소비" },
              { value: "BALANCE", label: "잔액" },
              { value: "FIXED", label: "정기 지출" },
              { value: "VARIABLE", label: "일시적 소비" },
            ]}
            value={filter}
            onValueChange={(v) => change(v as Filter)}
            tone="light"
            aria-label="거래 목록 종류"
          />
        </header>
        <section className={s.summary}>
          <span>{labels[filter]} 합계</span>
          <strong>{total.toLocaleString("ko-KR")}원</strong>
          <small>총 {visible.length}건</small>
        </section>
        <section className={s.card}>
          {workspaceLoading || isLoading ? (
            <div className={s.empty}>내역을 불러오고 있어요…</div>
          ) : visible.length === 0 ? (
            <div className={s.empty}>
              <b>등록된 내역이 없습니다.</b>
              <p>대시보드 캘린더나 생성 버튼에서 새 내역을 추가해주세요.</p>
              <Link href="/home">대시보드로 돌아가기</Link>
            </div>
          ) : (
            <div className={s.table}>
              <div className={s.tableHead}>
                <span>날짜</span>
                <span>내역</span>
                <span>유형</span>
                <span>결제 수단</span>
                <span>금액</span>
              </div>
              {visible.map((item) => (
                <article key={item.id}>
                  <time>{formatDate(item.date)}</time>
                  <div>
                    <b>{item.title}</b>
                    <small>{item.category}</small>
                  </div>
                  <span className={`${s.badge} ${s[item.type.toLowerCase()]}`}>
                    {typeLabels[item.type]}
                  </span>
                  <span className={s.method}>
                    {methods.find((x) => x.id === item.paymentMethodId)?.name ??
                      "—"}
                  </span>
                  <strong>
                    {Number(item.amount).toLocaleString("ko-KR")}원
                  </strong>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
