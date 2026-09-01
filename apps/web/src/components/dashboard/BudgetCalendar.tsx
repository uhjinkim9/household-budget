"use client";

import { useState } from "react";
import {
  KoreanCalendar,
  type CalendarEvent,
  type CalendarView,
  type CellClickPayload,
  type DropdownActionPayload,
} from "calendar-mercury-lab";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/date-parser";
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
  onDuplicate,
  notes,
  onCreateNote,
  onSelectNote,
}: {
  items: Transaction[];
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onCreate: (type: TransactionType, date: string) => void;
  onSelect: (transaction: Transaction) => void;
  onDuplicate: (transaction: Transaction, date: string) => void;
  notes: DailyNote[];
  onCreateNote: (date: string) => void;
  onSelectNote: (note: DailyNote) => void;
}) {
  const [dayPanel, setDayPanel] = useState<CellClickPayload | null>(null);

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

  function findTransaction(event: CalendarEvent) {
    const originalId = event.id.split("_")[0];
    return items.find((item) => item.id === originalId);
  }

  function dropdownAction(payload: DropdownActionPayload) {
    if (payload.action !== "duplicate" || !payload.event) return;
    const transaction = findTransaction(payload.event);
    if (transaction) onDuplicate(transaction, payload.date);
  }

  function menu(payload: CellClickPayload, close: () => void) {
    // defer to avoid setState-during-render warning
    queueMicrotask(() => setDayPanel(payload));
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
        {payload.events
          .filter((event) => event.calendarId !== "NOTE")
          .map((event) => (
            <button
              key={`duplicate:${event.id}`}
              onClick={() => {
                dropdownAction({
                  action: "duplicate",
                  date: payload.date,
                  event,
                });
                close();
              }}
            >
              <i className={s.duplicate} />
              <span>
                <b>{event.title} 복제</b>
                <small>같은 내용으로 새 지출 등록</small>
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
    const transaction = findTransaction(event);
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
        onDropdownAction={dropdownAction}
        renderDropdown={menu}
        fetchHolidays={api.holidays}
      />
      {dayPanel && (
        <div className={s.dayPanel}>
          <div className={s.dayPanelHead}>
            <strong>{formatDate(dayPanel.date)}</strong>
            <button onClick={() => setDayPanel(null)} aria-label="닫기">×</button>
          </div>
          {dayPanel.events.length > 0 && (
            <ul className={s.dayPanelList}>
              {dayPanel.events.map((event) => (
                <li key={event.id}>
                  <i style={{ background: event.color }} />
                  <button onClick={() => { selectEvent(event); setDayPanel(null); }}>
                    {event.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className={s.dayPanelActions}>
            {(
              [
                ["BALANCE", "잔액", colors.BALANCE],
                ["FIXED", "정기 지출", "#607cb2"],
                ["VARIABLE", "일시적 소비", colors.VARIABLE],
              ] as [TransactionType, string, string][]
            ).map(([type, label, color]) => (
              <button
                key={type}
                style={{ background: color }}
                onClick={() => { onCreate(type, dayPanel.date); setDayPanel(null); }}
              >
                {label}
              </button>
            ))}
            <button
              style={{ background: "#e0bb4e", color: "#594a22" }}
              onClick={() => {
                const existing = notes.find((note) => note.date === dayPanel.date);
                if (existing) onSelectNote(existing);
                else onCreateNote(dayPanel.date);
                setDayPanel(null);
              }}
            >
              메모
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
