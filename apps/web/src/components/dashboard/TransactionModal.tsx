"use client";

import { useState, type FormEvent } from "react";
import type { PaymentMethod, Transaction, TransactionType } from "@/lib/types";
import type { WorkspaceCategory } from "@/lib/workspace-settings-api";
import { Button } from "../ui/Button";
import { Checkbox } from "../ui/Checkbox";
import { ConfirmModal } from "../ui/ConfirmModal";
import { FormField } from "../ui/FormField";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { MoneyInput } from "../ui/MoneyInput";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";
import s from "./TransactionModal.module.scss";

const labels: Record<TransactionType, string> = {
  BALANCE: "잔액",
  FIXED: "정기 지출",
  VARIABLE: "일시적 소비",
};

export interface TransactionFormValue {
  type: TransactionType;
  title: string;
  amount: number;
  category: string;
  memo?: string;
  date: string;
  paymentMethodId?: string;
  balanceMode?: "CUMULATIVE" | "MONTHLY_RESET";
}

export function TransactionModal({
  type,
  date,
  transaction,
  methods,
  categories,
  onClose,
  onSubmit,
  onDelete,
  readOnly = false,
}: {
  type: TransactionType | null;
  date: string;
  transaction?: Transaction | null;
  methods: PaymentMethod[];
  categories: WorkspaceCategory[];
  onClose: () => void;
  onSubmit: (value: TransactionFormValue) => Promise<void>;
  onDelete?: () => Promise<void>;
  readOnly?: boolean;
}) {
  const activeType = transaction?.type ?? type;
  const editing = Boolean(transaction);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const categoryOptions =
    activeType === "BALANCE"
      ? ["잔액"]
      : categories.map((category) => category.name);
  if (
    transaction?.category &&
    activeType !== "BALANCE" &&
    !categoryOptions.includes(transaction.category)
  ) {
    categoryOptions.unshift(transaction.category);
  }

  if (!activeType) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await onSubmit({
        type: activeType!,
        title: String(form.get("title")),
        amount: Number(form.get("amount")),
        category: String(form.get("category")),
        memo: String(form.get("memo") || "").trim() || undefined,
        date: String(form.get("date")),
        paymentMethodId: String(form.get("paymentMethodId") || "") || undefined,
        balanceMode:
          activeType === "BALANCE"
            ? form.get("monthlyReset")
              ? "MONTHLY_RESET"
              : "CUMULATIVE"
            : undefined,
      });
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "저장하지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!onDelete) return;
    setLoading(true);
    setError("");
    try {
      await onDelete();
      setConfirmDelete(false);
      onClose();
    } catch (caught) {
      setConfirmDelete(false);
      setError(
        caught instanceof Error ? caught.message : "삭제하지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Modal
        open
        title={`${labels[activeType]} ${editing ? "상세/수정" : "등록"}`}
        onClose={onClose}
      >
        <form className={s.form} onSubmit={submit}>
          <FormField label="내역 이름">
            <Input
              name="title"
              required
              defaultValue={transaction?.title ?? ""}
              placeholder={
                activeType === "BALANCE" ? "통장 잔액" : "무엇에 사용했나요?"
              }
              autoFocus
              disabled={readOnly}
            />
          </FormField>

          <div className={s.row}>
            <FormField label="금액">
              <MoneyInput
                name="amount"
                required
                defaultValue={transaction?.amount}
                placeholder="0"
                disabled={readOnly}
              />
            </FormField>
            <FormField label="날짜">
              <Input
                name="date"
                type="date"
                defaultValue={transaction?.date ?? date}
                required
                disabled={readOnly}
              />
            </FormField>
          </div>

          <FormField label="카테고리">
            <Select
              name="category"
              required
              defaultValue={
                transaction?.category ??
                (activeType === "BALANCE" ? "잔액" : categoryOptions[0])
              }
              disabled={readOnly}
            >
              {categoryOptions.length === 0 && (
                <option value="">환경설정에서 카테고리를 추가해주세요</option>
              )}
              {categoryOptions.map((category) => (
                <option value={category} key={category}>
                  {category}
                </option>
              ))}
            </Select>
          </FormField>

          {activeType !== "BALANCE" && (
            <FormField label="결제 수단">
              <Select
                name="paymentMethodId"
                defaultValue={transaction?.paymentMethodId ?? ""}
                disabled={readOnly}
              >
                <option value="">선택 안 함</option>
                {methods.map((method) => (
                  <option value={method.id} key={method.id}>
                    {method.name}
                  </option>
                ))}
              </Select>
            </FormField>
          )}

          {activeType === "BALANCE" && (
            <div className={s.balanceOption}>
              <Checkbox
                name="monthlyReset"
                defaultChecked={transaction?.balanceMode === "MONTHLY_RESET"}
                disabled={readOnly}
              >
                매월 이 날짜에 잔액 초기화
                <small>
                  선택하면 매월 등록일에 입력한 금액으로 다시 시작해요. 선택하지
                  않으면 잔액과 체크카드 소비를 계속 누적해요.
                </small>
              </Checkbox>
            </div>
          )}

          {activeType === "FIXED" && (
            <p className={s.notice}>
              수정하거나 삭제하면 매월 표시되는 정기 지출 전체에 적용됩니다.
            </p>
          )}

          {activeType !== "BALANCE" && (
            <FormField
              label="메모 (선택)"
              hint="구매처나 기억해둘 내용을 간단히 남겨보세요."
            >
              <Textarea
                name="memo"
                maxLength={500}
                rows={3}
                defaultValue={transaction?.memo ?? ""}
                placeholder="예: 쿠팡에서 생필품 구매"
                disabled={readOnly}
              />
            </FormField>
          )}

          {error && <p className={s.error}>{error}</p>}

          <div className={s.actions}>
            {!readOnly && editing && onDelete && (
              <Button
                className={s.delete}
                type="button"
                variant="danger"
                onClick={() => setConfirmDelete(true)}
                disabled={loading}
              >
                삭제
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
            >
              {readOnly ? "닫기" : "취소"}
            </Button>
            {!readOnly && (
              <Button disabled={loading}>
                {loading ? "처리 중…" : editing ? "수정하기" : "등록하기"}
              </Button>
            )}
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={confirmDelete}
        title="소비 내역 삭제"
        description={`정말 '${transaction?.title ?? ""}' 내역을 삭제하시겠어요?`}
        confirmLabel="삭제"
        danger
        loading={loading}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </>
  );
}
