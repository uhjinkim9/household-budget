"use client";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CalendarView } from "calendar-mercury-lab";
import { Sidebar } from "@/components/layout/Sidebar";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { CardPerformance } from "@/components/dashboard/CardPerformance";
import { BudgetCalendar } from "@/components/dashboard/BudgetCalendar";
import { CreateMenu } from "@/components/dashboard/CreateMenu";
import { TransactionModal } from "@/components/dashboard/TransactionModal";
import { api } from "@/lib/api";
import type { Transaction, TransactionType } from "@/lib/types";
import { toLocalDateString, yearBounds } from "@/lib/dateUtils";
import s from "./page.module.scss";
export default function Dashboard() {
  const range = yearBounds(),
    qc = useQueryClient();
  const {
    data: workspace,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["active-workspace"],
    queryFn: api.getOrCreateWorkspace,
  });
  const workspaceId = workspace?.id ?? "";
  const { data: items = [] } = useQuery({
    queryKey: ["transactions", workspaceId, range],
    queryFn: () => api.transactions(workspaceId, range.from, range.to),
    enabled: Boolean(workspaceId),
  });
  const { data: methods = [] } = useQuery({
    queryKey: ["payment-methods", workspaceId],
    queryFn: () => api.paymentMethods(workspaceId),
    enabled: Boolean(workspaceId),
  });
  const [view, setView] = useState<CalendarView>("month"),
    [type, setType] = useState<TransactionType | null>(null),
    [date, setDate] = useState(() => toLocalDateString());
  const summary = useMemo(
    () => ({
      balance: items
        .filter((x) => x.type === "BALANCE")
        .reduce((a, b) => a + Number(b.amount), 0),
      fixed: items
        .filter((x) => x.type === "FIXED")
        .reduce((a, b) => a + Number(b.amount), 0),
      variable: items
        .filter((x) => x.type === "VARIABLE")
        .reduce((a, b) => a + Number(b.amount), 0),
    }),
    [items],
  );
  function start(t: TransactionType, d = date) {
    setType(t);
    setDate(d);
  }
  async function add(v: Omit<Transaction, "id" | "workspaceId">) {
    if (!workspaceId) return;
    await api.createTransaction({
      ...v,
      workspaceId,
      recurrenceRule: v.type === "FIXED" ? "MONTHLY" : undefined,
    });
    await qc.invalidateQueries({ queryKey: ["transactions", workspaceId] });
  }
  if (isLoading)
    return <main className={s.state}>가계를 준비하고 있어요…</main>;
  if (error || !workspace)
    return (
      <main className={s.state}>
        가계를 불러오지 못했습니다. 서버 연결을 확인해주세요.
      </main>
    );
  return (
    <div className={s.shell}>
      <Sidebar />
      <main>
        <header className={s.top}>
          <div>
            <p>우리 가계의 오늘</p>
            <h1>{workspace.name}</h1>
          </div>
          <div className={s.topActions}>
            <CreateMenu onSelect={start} />
          </div>
        </header>
        <SummaryCards
          balance={summary.balance}
          spent={summary.fixed + summary.variable}
          fixed={summary.fixed}
          variable={summary.variable}
        />
        <div className={s.sectionTitle}>
          <div>
            <h2>가계 캘린더</h2>
            <p>지출과 잔액 흐름을 날짜별로 확인하세요</p>
          </div>
          <span>캘린더의 날짜를 눌러 바로 기록할 수 있어요</span>
        </div>
        <div className={s.content}>
          <BudgetCalendar
            items={items}
            view={view}
            onViewChange={setView}
            onCreate={start}
          />
          <aside>
            <CardPerformance
              cards={methods.filter((x) => x.type.includes("CARD"))}
              items={items}
            />
            <section className={s.tip}>
              <b>이번 달 한 줄 요약</b>
              <p>식비 비중을 조금만 줄이면 다음 달 저축 여유가 더 생겨요.</p>
            </section>
          </aside>
        </div>
      </main>
      <TransactionModal
        type={type}
        date={date}
        methods={methods}
        onClose={() => setType(null)}
        onSubmit={add}
      />
    </div>
  );
}
