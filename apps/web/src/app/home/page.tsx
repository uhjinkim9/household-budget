"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CalendarView } from "calendar-mercury-lab";
import { Sidebar } from "@/components/layout/Sidebar";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { CardPerformance } from "@/components/dashboard/CardPerformance";
import { BudgetCalendar } from "@/components/dashboard/BudgetCalendar";
import { CreateMenu } from "@/components/dashboard/CreateMenu";
import { TransactionModal } from "@/components/dashboard/TransactionModal";
import { DailyNoteModal } from "@/components/dashboard/DailyNoteModal";
import { api } from "@/lib/api";
import { workspaceSettingsApi } from "@/lib/workspace-settings-api";
import type { DailyNote, Transaction, TransactionType } from "@/lib/types";
import { formatDate, toLocalDateString, yearBounds } from "@/lib/date-parser";
import s from "./page.module.scss";
export default function Dashboard() {
  const router = useRouter();
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
  const balanceAsOf = toLocalDateString();
  const { data: items = [] } = useQuery({
    queryKey: ["transactions", workspaceId, range],
    queryFn: () => api.transactions(workspaceId, range.from, range.to),
    enabled: Boolean(workspaceId),
  });
  const { data: notes = [] } = useQuery({
    queryKey: ["daily-notes", workspaceId, range.from, range.to],
    queryFn: () => api.dailyNotes(workspaceId, range.from, range.to),
    enabled: Boolean(workspaceId && workspace?.role !== "VIEWER"),
  });
  const { data: methods = [] } = useQuery({
    queryKey: ["payment-methods", workspaceId],
    queryFn: () => api.paymentMethods(workspaceId),
    enabled: Boolean(workspaceId && workspace?.role !== "VIEWER"),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["workspace-categories", workspaceId],
    queryFn: () => workspaceSettingsApi.categories(workspaceId),
    enabled: Boolean(workspaceId && workspace?.role !== "VIEWER"),
  });
  const { data: balanceData } = useQuery({
    queryKey: ["dashboard-balance", workspaceId, "current", balanceAsOf],
    queryFn: () => api.dashboardBalance(workspaceId, balanceAsOf),
    enabled: Boolean(workspaceId && workspace?.role !== "VIEWER"),
  });
  const { data: nextCardPaymentBalance } = useQuery({
    queryKey: ["next-card-payment-balance", workspaceId, balanceAsOf],
    queryFn: () => api.nextCardPaymentBalance(workspaceId, balanceAsOf),
    enabled: Boolean(workspaceId && workspace?.role !== "VIEWER"),
  });
  useEffect(() => {
    if (workspace?.role === "VIEWER")
      router.replace("/transactions?type=SPENDING");
  }, [workspace?.role, router]);
  const [view, setView] = useState<CalendarView>("month"),
    [type, setType] = useState<TransactionType | null>(null),
    [date, setDate] = useState(() => toLocalDateString()),
    [selected, setSelected] = useState<Transaction | null>(null),
    [copyMode, setCopyMode] = useState(false),
    [noteDate, setNoteDate] = useState<string | null>(null),
    [selectedNote, setSelectedNote] = useState<DailyNote | null>(null);
  const summary = useMemo(
    () => ({
      balance: balanceData?.balance ?? 0,
      fixed: items
        .filter((x) => x.type === "FIXED")
        .reduce((a, b) => a + Number(b.amount), 0),
      variable: items
        .filter((x) => x.type === "VARIABLE")
        .reduce((a, b) => a + Number(b.amount), 0),
    }),
    [items, balanceData],
  );
  function start(t: TransactionType, d = date) {
    setNoteDate(null);
    setSelectedNote(null);
    setSelected(null);
    setCopyMode(false);
    setType(t);
    setDate(d);
  }
  function startNote(nextDate: string, note: DailyNote | null = null) {
    setType(null);
    setSelected(null);
    setCopyMode(false);
    setNoteDate(nextDate);
    setSelectedNote(note);
  }
  function closeModal() {
    setType(null);
    setSelected(null);
    setCopyMode(false);
  }
  async function save(
    v: Omit<Transaction, "id" | "workspaceId">,
    options?: { copy: boolean },
  ) {
    if (!workspaceId) return;
    const body = {
      ...v,
      workspaceId,
      recurrenceRule:
        v.type === "FIXED" ||
        (v.type === "BALANCE" && v.balanceMode === "MONTHLY_RESET")
          ? "MONTHLY"
          : undefined,
    };
    if (selected && !options?.copy)
      await api.updateTransaction(selected.id, body);
    else await api.createTransaction(body);
    await qc.invalidateQueries({ queryKey: ["transactions", workspaceId] });
    await qc.invalidateQueries({
      queryKey: ["dashboard-balance", workspaceId],
    });
    await qc.invalidateQueries({
      queryKey: ["next-card-payment-balance", workspaceId],
    });
  }
  async function remove() {
    if (!workspaceId || !selected) return;
    await api.deleteTransaction(selected.id, workspaceId);
    await qc.invalidateQueries({ queryKey: ["transactions", workspaceId] });
    await qc.invalidateQueries({
      queryKey: ["dashboard-balance", workspaceId],
    });
    await qc.invalidateQueries({
      queryKey: ["next-card-payment-balance", workspaceId],
    });
  }
  async function saveNote(value: { date: string; content: string }) {
    if (!workspaceId) return;
    const body = { workspaceId, ...value };
    if (selectedNote) await api.updateDailyNote(selectedNote.id, body);
    else await api.createDailyNote(body);
    await qc.invalidateQueries({ queryKey: ["daily-notes", workspaceId] });
  }
  async function removeNote() {
    if (!workspaceId || !selectedNote) return;
    await api.deleteDailyNote(selectedNote.id, workspaceId);
    await qc.invalidateQueries({ queryKey: ["daily-notes", workspaceId] });
  }
  if (isLoading)
    return <main className={s.state}>가계를 준비하고 있어요…</main>;
  if (error || !workspace)
    return (
      <main className={s.state}>
        가계를 불러오지 못했습니다. 서버 연결을 확인해주세요.
      </main>
    );
  if (workspace.role === "VIEWER")
    return <main className={s.state}>거래 내역으로 이동하고 있어요…</main>;
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
          projectedBalance={nextCardPaymentBalance?.balance}
          projectedLabel={
            nextCardPaymentBalance
              ? `${formatDate(nextCardPaymentBalance.paymentDate)} 결제 후 예상`
              : undefined
          }
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
            onSelect={(transaction) => {
              setSelected(transaction);
              setCopyMode(false);
              setType(null);
            }}
            onDuplicate={(transaction, duplicateDate) => {
              setNoteDate(null);
              setSelectedNote(null);
              setType(null);
              setDate(duplicateDate);
              setSelected({ ...transaction, date: duplicateDate });
              setCopyMode(true);
            }}
            notes={notes}
            onCreateNote={(nextDate) => startNote(nextDate)}
            onSelectNote={(note) => startNote(note.date, note)}
          />
          <aside>
            <CardPerformance
              cards={methods.filter((x) => x.type.includes("CARD"))}
              items={items}
            />
          </aside>
        </div>
      </main>
      <TransactionModal
        key={`${selected?.id ?? `${type}-${date}`}-${copyMode ? "copy" : "edit"}`}
        type={type}
        date={date}
        transaction={selected}
        methods={methods}
        categories={categories}
        onClose={closeModal}
        onSubmit={save}
        onDelete={selected ? remove : undefined}
        initialCopyMode={copyMode}
      />
      <DailyNoteModal
        key={selectedNote?.id ?? noteDate ?? "note-closed"}
        date={noteDate}
        note={selectedNote}
        onClose={() => {
          setNoteDate(null);
          setSelectedNote(null);
        }}
        onSave={saveNote}
        onDelete={removeNote}
      />
    </div>
  );
}
