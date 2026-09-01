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
import type { DailyNote, Transaction, TransactionType } from "@/lib/types";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
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
  onDuplicateNote,
  onDelete,
  onDeleteNote,
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
  onDuplicateNote: (note: DailyNote, date: string) => void;
  onDelete: (transaction: Transaction) => void;
  onDeleteNote: (note: DailyNote) => void;
  notes: DailyNote[];
  onCreateNote: (date: string) => void;
  onSelectNote: (note: DailyNote) => void;
}) {
  const [mobileCreateDate, setMobileCreateDate] = useState<string | null>(null);
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
    if (payload.action === "create") {
      setMobileCreateDate(payload.date);
      return;
    }
    if (!payload.event) return;
    if (payload.event.calendarId === "NOTE") {
      const note = findNote(payload.event);
      if (!note) return;
      if (payload.action === "edit") onSelectNote(note);
      if (payload.action === "duplicate") onDuplicateNote(note, payload.date);
      if (payload.action === "delete") onDeleteNote(note);
      return;
    }
    const transaction = findTransaction(payload.event);
    if (!transaction) return;
    if (payload.action === "edit") onSelect(transaction);
    if (payload.action === "duplicate") onDuplicate(transaction, payload.date);
    if (payload.action === "delete") onDelete(transaction);
  }

  function findNote(event: CalendarEvent) {
    return notes.find((item) => `note:${item.id}` === event.id);
  }

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
      const note = findNote(event);
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
      <Modal
        open={Boolean(mobileCreateDate)}
        title="기록 유형 선택"
        onClose={() => setMobileCreateDate(null)}
      >
        <div className={s.mobileCreateOptions}>
          {(
            [
              ["BALANCE", "잔액", "현재 가진 금액을 기록해요"],
              ["FIXED", "정기 지출", "매월 반복되는 지출을 기록해요"],
              ["VARIABLE", "일시적 소비", "한 번 발생한 소비를 기록해요"],
            ] as [TransactionType, string, string][]
          ).map(([type, label, hint]) => (
            <Button
              type="button"
              variant="ghost"
              key={type}
              onClick={() => {
                onCreate(type, mobileCreateDate!);
                setMobileCreateDate(null);
              }}
            >
              <span>
                <b>{label}</b>
                <small>{hint}</small>
              </span>
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              const existing = notes.find(
                (note) => note.date === mobileCreateDate,
              );
              if (existing) onSelectNote(existing);
              else onCreateNote(mobileCreateDate!);
              setMobileCreateDate(null);
            }}
          >
            <span>
              <b>메모/일기</b>
              <small>그날의 소비 소회를 남겨요</small>
            </span>
          </Button>
        </div>
      </Modal>
    </section>
  );
}
