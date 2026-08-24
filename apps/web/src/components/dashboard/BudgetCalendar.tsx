"use client";

import {
  KoreanCalendar,
  type CalendarEvent,
  type CalendarView,
  type CellClickPayload,
} from "calendar-mercury-lab";
import { api } from "@/lib/api";
import type { DailyNote, Transaction, TransactionType } from "@/lib/types";
import s from "./BudgetCalendar.module.scss";

const colors: Record<TransactionType, string> = {
  BALANCE: "#43836a",
  FIXED: "#607cb2",
  VARIABLE: "#e49758",
};

export function BudgetCalendar({
  items,
  view,
  onViewChange,
  onCreate,
  onSelect,
  notes,
  onCreateNote,
  onSelectNote,
}: {
  items: Transaction[];
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onCreate: (type: TransactionType, date: string) => void;
  onSelect: (transaction: Transaction) => void;
  notes: DailyNote[];
  onCreateNote: (date: string) => void;
  onSelectNote: (note: DailyNote) => void;
}) {
  const transactionEvents: CalendarEvent[] = items.map((item) => ({
    id: item.id,
    calendarId: item.type,
    title: `${item.title} · ${Number(item.amount).toLocaleString()}원`,
    start: item.date,
    end: item.date,
    allDay: true,
    color: colors[item.type],
    recurrence: item.recurrenceRule
      ? { freq: item.recurrenceRule as "MONTHLY" }
      : undefined,
  }));
  const noteEvents: CalendarEvent[] = notes.map((note) => ({
    id: `note:${note.id}`,
    calendarId: "NOTE",
    title: `📝 ${note.content}`,
    start: note.date,
    end: note.date,
    allDay: true,
    color: "#f4df9d",
  }));
  const events = [...noteEvents, ...transactionEvents];

  function menu(payload: CellClickPayload, close: () => void) {
    const actions: [TransactionType, string, string][] = [
      ["BALANCE", "잔액", "현재 자산을 기록해요"],
      ["FIXED", "정기 지출", "매월 반복되는 지출"],
      ["VARIABLE", "일시적 소비", "한 번 발생한 소비"],
    ];
    return (
      <div className={s.cellMenu}>
        {actions.map(([type, label, hint]) => (
          <button
            key={type}
            onClick={() => {
              onCreate(type, payload.date);
              close();
            }}
          >
            <i className={s[type.toLowerCase()]} />
            <span>
              <b>{label}</b>
              <small>{hint}</small>
            </span>
          </button>
        ))}
        <button
          onClick={() => {
            const existing = notes.find((note) => note.date === payload.date);
            if (existing) onSelectNote(existing);
            else onCreateNote(payload.date);
            close();
          }}
        >
          <i className={s.note} />
          <span>
            <b>메모/일기</b>
            <small>오늘의 소비 소회를 남겨요</small>
          </span>
        </button>
      </div>
    );
  }

  function selectEvent(event: CalendarEvent) {
    if (event.calendarId === "NOTE") {
      const note = notes.find((item) => `note:${item.id}` === event.id);
      if (note) onSelectNote(note);
      return;
    }
    const originalId = event.id.split("_")[0];
    const transaction = items.find((item) => item.id === originalId);
    if (transaction) onSelect(transaction);
  }

  return (
    <section className={s.panel}>
      <KoreanCalendar
        view={view}
        events={events}
        calendars={[
          { id: "BALANCE", name: "잔액", color: colors.BALANCE },
          { id: "FIXED", name: "정기 지출", color: colors.FIXED },
          { id: "VARIABLE", name: "일시적 소비", color: colors.VARIABLE },
          { id: "NOTE", name: "메모", color: "#f4df9d" },
        ]}
        onViewChange={onViewChange}
        onEventClick={selectEvent}
        renderDropdown={menu}
        fetchHolidays={api.holidays}
      />
    </section>
  );
}
