"use client";
import { useState, type FormEvent } from "react";
import { Modal } from "../ui/Modal";
import { FormField } from "../ui/FormField";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { MoneyInput } from "../ui/MoneyInput";
import type { PaymentMethod, TransactionType } from "@/lib/types";
import s from "./TransactionModal.module.scss";
const labels: { [K in TransactionType]: string } = {
  BALANCE: "잔액",
  FIXED: "정기 지출",
  VARIABLE: "일시적 소비",
};
export function TransactionModal({
  type,
  date,
  methods,
  onClose,
  onSubmit,
}: {
  type: TransactionType | null;
  date: string;
  methods: PaymentMethod[];
  onClose: () => void;
  onSubmit: (v: {
    type: TransactionType;
    title: string;
    amount: number;
    category: string;
    date: string;
    paymentMethodId?: string;
  }) => void;
}) {
  const [loading, setLoading] = useState(false);
  if (!type) return null;
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const f = new FormData(e.currentTarget);
    onSubmit({
      type: type!,
      title: String(f.get("title")),
      amount: Number(f.get("amount")),
      category: String(f.get("category")),
      date: String(f.get("date")),
      paymentMethodId: String(f.get("paymentMethodId") || "") || undefined,
    });
    setLoading(false);
    onClose();
  }
  return (
    <Modal open title={`${labels[type]} 등록`} onClose={onClose}>
      <form className={s.form} onSubmit={submit}>
        <FormField label="내역 이름">
          <Input
            name="title"
            required
            placeholder={
              type === "BALANCE" ? "통장 잔액" : "무엇에 사용했나요?"
            }
            autoFocus
          />
        </FormField>
        <div className={s.row}>
          <FormField label="금액">
            <MoneyInput
              name="amount"
              required
              placeholder="0"
            />
          </FormField>
          <FormField label="날짜">
            <Input name="date" type="date" defaultValue={date} required />
          </FormField>
        </div>
        <FormField label="카테고리">
          <Select
            name="category"
            defaultValue={type === "BALANCE" ? "잔액" : "식비"}
          >
            <option>잔액</option>
            <option>식비</option>
            <option>교통</option>
            <option>주거</option>
            <option>생활</option>
            <option>구독</option>
            <option>기타</option>
          </Select>
        </FormField>
        {type !== "BALANCE" && (
          <FormField label="결제 수단">
            <Select name="paymentMethodId">
              <option value="">선택 안 함</option>
              {methods.map((x) => (
                <option value={x.id} key={x.id}>
                  {x.name}
                </option>
              ))}
            </Select>
          </FormField>
        )}
        {type === "FIXED" && (
          <p className={s.notice}>
            이 내역은 매월 반복되는 정기 지출로 저장됩니다.
          </p>
        )}
        <div className={s.actions}>
          <Button type="button" variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button disabled={loading}>등록하기</Button>
        </div>
      </form>
    </Modal>
  );
}
