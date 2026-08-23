"use client";
import { useEffect, type ReactNode } from "react";
import s from "./Modal.module.scss";
export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", f);
    return () => document.removeEventListener("keydown", f);
  }, [onClose]);
  if (!open) return null;
  return (
    <div
      className={s.backdrop}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section className={s.modal} role="dialog" aria-modal="true">
        <header>
          <h2>{title}</h2>
          <button onClick={onClose} aria-label="닫기">
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
