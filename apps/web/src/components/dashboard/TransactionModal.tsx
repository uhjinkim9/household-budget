"use client";

import { useState, type FormEvent } from "react";
import type {
  PaymentMethod,
  Transaction,
  TransactionFoodItem,
  TransactionType,
} from "@/lib/types";
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
  foodItems?: TransactionFoodItem[];
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
  initialCopyMode = false,
}: {
  type: TransactionType | null;
  date: string;
  transaction?: Transaction | null;
  methods: PaymentMethod[];
  categories: WorkspaceCategory[];
  onClose: () => void;
  onSubmit: (
    value: TransactionFormValue,
    options?: { copy: boolean },
  ) => Promise<void>;
  onDelete?: () => Promise<void>;
  readOnly?: boolean;
  initialCopyMode?: boolean;
}) {
  const activeType = transaction?.type ?? type;
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copying, setCopying] = useState(initialCopyMode);
  const [error, setError] = useState("");
  const [category, setCategory] = useState(
    transaction?.category ??
      (activeType === "BALANCE" ? "잔액" : (categories[0]?.name ?? "")),
  );
  const [foodItems, setFoodItems] = useState<TransactionFoodItem[]>(() =>
    (transaction?.foodItems ?? []).map((item) => ({ ...item })),
  );
  const editing = Boolean(transaction) && !copying;
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
      await onSubmit(
        {
          type: activeType!,
          title: String(form.get("title")),
          amount: Number(form.get("amount")),
          category: String(form.get("category")),
          memo: String(form.get("memo") || "").trim() || undefined,
          date: String(form.get("date")),
          paymentMethodId:
            String(form.get("paymentMethodId") || "") || undefined,
          balanceMode:
            activeType === "BALANCE"
              ? form.get("monthlyReset")
                ? "MONTHLY_RESET"
                : "CUMULATIVE"
              : undefined,
          foodItems:
            activeType !== "BALANCE" && category === "식비"
              ? foodItems
                  .filter((item) => item.name.trim())
                  .map((item) => ({
                    name: item.name.trim(),
                    unitPrice: Number(item.unitPrice),
                    quantity: Math.trunc(Number(item.quantity)),
                    expirationDate: item.expirationDate || undefined,
                  }))
              : [],
        },
        { copy: copying },
      );
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
        title={`${labels[activeType]} ${copying ? "복사 등록" : editing ? "상세/수정" : "등록"}`}
        onClose={onClose}
        size={category === "식비" ? "wide" : "default"}
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
              value={category || categoryOptions[0] || ""}
              onChange={(event) => setCategory(event.target.value)}
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

          {activeType !== "BALANCE" && category === "식비" && (
            <section className={s.foodItems}>
              <div className={s.foodItemsHeader}>
                <div>
                  <b>식재료 정보</b>
                  <small>구매한 식재료와 유통기한을 기록해보세요.</small>
                </div>
                {!readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setFoodItems((current) => [
                        ...current,
                        {
                          name: "",
                          unitPrice: 0,
                          quantity: 1,
                          expirationDate: "",
                        },
                      ])
                    }
                  >
                    + 식재료 정보 추가
                  </Button>
                )}
              </div>
              {foodItems.map((item, index) => (
                <div className={s.foodItemRow} key={item.id ?? index}>
                  <Input
                    value={item.name}
                    onChange={(event) =>
                      updateFoodItem(index, { name: event.target.value })
                    }
                    placeholder="식재료명"
                    aria-label="식재료명"
                    required
                    disabled={readOnly}
                  />
                  <MoneyInput
                    name={`foodItemUnitPrice-${index}`}
                    value={Number(item.unitPrice)}
                    onValueChange={(value) =>
                      updateFoodItem(index, { unitPrice: value ?? 0 })
                    }
                    placeholder="단가"
                    aria-label="단가"
                    required
                    disabled={readOnly}
                  />
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantity}
                    onChange={(event) =>
                      updateFoodItem(index, {
                        quantity: Math.trunc(Number(event.target.value)),
                      })
                    }
                    placeholder="수량"
                    aria-label="수량"
                    required
                    disabled={readOnly}
                  />
                  <Input
                    type="date"
                    value={item.expirationDate ?? ""}
                    onChange={(event) =>
                      updateFoodItem(index, {
                        expirationDate: event.target.value,
                      })
                    }
                    aria-label="유통기한"
                    disabled={readOnly}
                  />
                  {!readOnly && (
                    <button
                      className={s.removeFoodItem}
                      type="button"
                      aria-label={`${item.name || "식재료"} 삭제`}
                      onClick={() =>
                        setFoodItems((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {foodItems.length === 0 && (
                <p className={s.emptyFoodItems}>
                  추가 버튼을 눌러 식재료를 입력할 수 있어요.
                </p>
              )}
            </section>
          )}

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
              {copying
                ? "날짜를 확인한 뒤 새로운 정기 지출로 등록해주세요."
                : "수정하거나 삭제하면 매월 표시되는 정기 지출 전체에 적용됩니다."}
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
            {!readOnly && editing && (
              <div className={s.leftActions}>
                {onDelete && (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => setConfirmDelete(true)}
                    disabled={loading}
                  >
                    삭제
                  </Button>
                )}
                {activeType !== "BALANCE" && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setCopying(true);
                      setError("");
                    }}
                    disabled={loading}
                  >
                    복사
                  </Button>
                )}
              </div>
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
                {loading
                  ? "처리 중…"
                  : copying
                    ? "복사 등록하기"
                    : editing
                      ? "수정하기"
                      : "등록하기"}
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

  function updateFoodItem(index: number, patch: Partial<TransactionFoodItem>) {
    setFoodItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }
}
