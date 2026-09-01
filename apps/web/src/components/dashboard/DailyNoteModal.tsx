"use client";
import { useState, type FormEvent } from "react";
import type { DailyNote } from "@/lib/types";
import { Button } from "../ui/Button";
import { ConfirmModal } from "../ui/ConfirmModal";
import { FormField } from "../ui/FormField";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Textarea } from "../ui/Textarea";
import s from "./DailyNoteModal.module.scss";

export function DailyNoteModal({
  date,
  note,
  onClose,
  onSave,
  onDelete,
  initialContent = "",
}: {
  date: string | null;
  note: DailyNote | null;
  onClose: () => void;
  onSave: (value: { date: string; content: string }) => Promise<void>;
  onDelete: () => Promise<void>;
  initialContent?: string;
}) {
  const [loading, setLoading] = useState(false),
    [confirmDelete, setConfirmDelete] = useState(false),
    [error, setError] = useState("");
  if (!date) return null;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError("");
    try {
      await onSave({
        date: String(form.get("date")),
        content: String(form.get("content")),
      });
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "메모를 저장하지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function remove() {
    setLoading(true);
    try {
      await onDelete();
      setConfirmDelete(false);
      onClose();
    } catch (caught) {
      setConfirmDelete(false);
      setError(
        caught instanceof Error
          ? caught.message
          : "메모를 삭제하지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <Modal
        open
        title={note ? "날짜 메모 수정" : "날짜 메모 남기기"}
        onClose={onClose}
      >
        <form className={s.form} onSubmit={submit}>
          <FormField label="날짜">
            <Input
              name="date"
              type="date"
              defaultValue={note?.date ?? date}
              required
            />
          </FormField>
          <FormField
            label="소비 메모"
            hint="그날의 소비 소회나 기억할 일을 간단히 남겨보세요."
          >
            <Textarea
              name="content"
              defaultValue={note?.content ?? initialContent}
              maxLength={500}
              placeholder="예: OO이 생일선물 구매"
              required
              autoFocus
            />
          </FormField>
          {error && <p className={s.error}>{error}</p>}
          <div className={s.actions}>
            {note && (
              <Button
                type="button"
                variant="danger"
                className={s.delete}
                onClick={() => setConfirmDelete(true)}
              >
                삭제
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={onClose}>
              취소
            </Button>
            <Button disabled={loading}>{loading ? "저장 중…" : "저장"}</Button>
          </div>
        </form>
      </Modal>
      <ConfirmModal
        open={confirmDelete}
        title="날짜 메모 삭제"
        description="이 날짜의 메모를 삭제하시겠어요?"
        confirmLabel="삭제"
        danger
        loading={loading}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </>
  );
}
