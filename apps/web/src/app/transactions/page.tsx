"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TransactionModal } from "@/components/dashboard/TransactionModal";
import { Sidebar } from "@/components/layout/Sidebar";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { api } from "@/lib/api";
import { workspaceSettingsApi } from "@/lib/workspace-settings-api";
import {
  dayBounds,
  formatDate,
  monthBounds,
  parseLocalDate,
  toLocalDateString,
  weekBounds,
  yearBounds,
} from "@/lib/date-parser";
import type { Transaction, TransactionType } from "@/lib/types";
import s from "./page.module.scss";

type Filter = "SPENDING" | "BALANCE" | "FIXED" | "VARIABLE";
type RangeMode = "DAY" | "WEEK" | "MONTH" | "YEAR" | "CUSTOM";

const labels: Record<Filter, string> = {
  SPENDING: "전체 소비",
  BALANCE: "잔액",
  FIXED: "정기 지출",
  VARIABLE: "일시적 소비",
};

const typeLabels: Record<TransactionType, string> = {
  BALANCE: "잔액",
  FIXED: "정기 지출",
  VARIABLE: "일시적 소비",
};

const rangeOptions = [
  { value: "DAY", label: "일간" },
  { value: "WEEK", label: "주간" },
  { value: "MONTH", label: "월간" },
  { value: "YEAR", label: "연간" },
  { value: "CUSTOM", label: "직접 기간" },
];

export default function TransactionsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const today = toLocalDateString();
  const initialMonth = monthBounds();
  const [filter, setFilter] = useState<Filter>("SPENDING");
  const [rangeMode, setRangeMode] = useState<RangeMode>("MONTH");
  const [referenceDate, setReferenceDate] = useState(today);
  const [customFrom, setCustomFrom] = useState(initialMonth.from);
  const [customTo, setCustomTo] = useState(initialMonth.to);
  const [selected, setSelected] = useState<Transaction | null>(null);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("type");
    if (value && value in labels) setFilter(value as Filter);
  }, []);

  const range = useMemo(() => {
    const reference = parseLocalDate(referenceDate);
    if (rangeMode === "DAY") return dayBounds(reference);
    if (rangeMode === "WEEK") return weekBounds(reference);
    if (rangeMode === "YEAR") return yearBounds(reference);
    if (rangeMode === "CUSTOM")
      return {
        from: customFrom,
        to: customTo,
        label: `${customFrom} ~ ${customTo}`,
      };
    return monthBounds(reference);
  }, [rangeMode, referenceDate, customFrom, customTo]);

  const validRange = Boolean(range.from && range.to && range.from <= range.to);

  const { data: workspace, isLoading: workspaceLoading } = useQuery({
    queryKey: ["active-workspace"],
    queryFn: api.getOrCreateWorkspace,
  });
  const workspaceId = workspace?.id ?? "";
  useEffect(() => {
    if (workspace?.role === "VIEWER" && filter === "BALANCE")
      changeFilter("SPENDING");
  }, [workspace?.role, filter]);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["transactions", workspaceId, range.from, range.to],
    queryFn: () => api.transactions(workspaceId, range.from, range.to),
    enabled: Boolean(workspaceId && validRange),
  });

  const { data: methods = [] } = useQuery({
    queryKey: ["payment-methods", workspaceId],
    queryFn: () => api.paymentMethods(workspaceId),
    enabled: Boolean(workspaceId),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["workspace-categories", workspaceId],
    queryFn: () => workspaceSettingsApi.categories(workspaceId),
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

  function changeFilter(next: Filter) {
    setFilter(next);
    const params = new URLSearchParams(window.location.search);
    params.set("type", next);
    router.replace(`/transactions?${params.toString()}`);
  }

  async function save(value: Omit<Transaction, "id" | "workspaceId">) {
    if (!selected || !workspaceId) return;
    await api.updateTransaction(selected.id, {
      ...value,
      workspaceId,
      recurrenceRule:
        value.type === "FIXED" ||
        (value.type === "BALANCE" && value.balanceMode === "MONTHLY_RESET")
          ? "MONTHLY"
          : undefined,
    });
    await queryClient.invalidateQueries({
      queryKey: ["transactions", workspaceId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["dashboard-balance", workspaceId],
    });
  }

  async function remove() {
    if (!selected || !workspaceId) return;
    await api.deleteTransaction(selected.id, workspaceId);
    await queryClient.invalidateQueries({
      queryKey: ["transactions", workspaceId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["dashboard-balance", workspaceId],
    });
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
              ...(workspace?.role === "VIEWER"
                ? []
                : [{ value: "BALANCE", label: "잔액" }]),
              { value: "FIXED", label: "정기 지출" },
              { value: "VARIABLE", label: "일시적 소비" },
            ]}
            value={filter}
            onValueChange={(value) => changeFilter(value as Filter)}
            tone="light"
            aria-label="거래 목록 종류"
          />
        </header>

        <section className={s.rangePanel}>
          <Select
            options={rangeOptions}
            value={rangeMode}
            onValueChange={(value) => setRangeMode(value as RangeMode)}
            tone="light"
            width={150}
            aria-label="조회 기간 단위"
          />
          <div className={s.rangeInputs}>
            {rangeMode === "DAY" && (
              <Input
                type="date"
                value={referenceDate}
                onChange={(event) => setReferenceDate(event.target.value)}
                aria-label="조회 날짜"
              />
            )}
            {rangeMode === "WEEK" && (
              <Input
                type="date"
                value={referenceDate}
                onChange={(event) => setReferenceDate(event.target.value)}
                aria-label="조회 주의 기준일"
              />
            )}
            {rangeMode === "MONTH" && (
              <Input
                type="month"
                value={referenceDate.slice(0, 7)}
                onChange={(event) =>
                  setReferenceDate(`${event.target.value}-01`)
                }
                aria-label="조회 월"
              />
            )}
            {rangeMode === "YEAR" && (
              <Input
                className={s.yearInput}
                type="number"
                min={1900}
                max={2100}
                defaultValue={referenceDate.slice(0, 4)}
                onChange={(event) => {
                  const year = event.target.value;
                  if (/^\d{4}$/.test(year)) setReferenceDate(`${year}-01-01`);
                }}
                aria-label="조회 연도"
              />
            )}
            {rangeMode === "CUSTOM" && (
              <>
                <Input
                  type="date"
                  value={customFrom}
                  max={customTo}
                  onChange={(event) => setCustomFrom(event.target.value)}
                  aria-label="조회 시작일"
                />
                <span>부터</span>
                <Input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  onChange={(event) => setCustomTo(event.target.value)}
                  aria-label="조회 종료일"
                />
                <span>까지</span>
              </>
            )}
          </div>
          <strong>{range.label}</strong>
          {!validRange && <small>종료일은 시작일보다 빠를 수 없습니다.</small>}
        </section>

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
                <article
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ")
                      setSelected(item);
                  }}
                  aria-label={`${item.title} 상세 조회`}
                >
                  <time>{formatDate(item.date)}</time>
                  <div>
                    <b>{item.title}</b>
                    <small>{item.category}</small>
                  </div>
                  <span className={`${s.badge} ${s[item.type.toLowerCase()]}`}>
                    {typeLabels[item.type]}
                  </span>
                  <span className={s.method}>
                    {methods.find(
                      (method) => method.id === item.paymentMethodId,
                    )?.name ?? "—"}
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

      <TransactionModal
        key={selected?.id ?? "closed"}
        type={null}
        date={selected?.date ?? today}
        transaction={selected}
        methods={methods}
        categories={categories}
        onClose={() => setSelected(null)}
        onSubmit={save}
        onDelete={selected ? remove : undefined}
        readOnly={workspace?.role === "VIEWER"}
      />
    </div>
  );
}
