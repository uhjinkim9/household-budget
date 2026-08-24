"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { PaymentMethodModal } from "@/components/payment-methods/PaymentMethodModal";
import { api } from "@/lib/api";
import {
  paymentMethodApi,
  type PaymentMethodPayload,
} from "@/lib/payment-method-api";
import type { PaymentMethod } from "@/lib/types";
import s from "./page.module.scss";
const labels = {
  CASH: "현금",
  CHECK_CARD: "체크카드",
  CREDIT_CARD: "신용카드",
  BANK_ACCOUNT: "계좌",
};
export default function PaymentMethodsPage() {
  const qc = useQueryClient(),
    [open, setOpen] = useState(false),
    [selected, setSelected] = useState<PaymentMethod | null>(null),
    [error, setError] = useState("");
  const { data: workspace, isLoading: workspaceLoading } = useQuery({
      queryKey: ["active-workspace"],
      queryFn: api.getOrCreateWorkspace,
    }),
    workspaceId = workspace?.id ?? "";
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["payment-methods", workspaceId],
    queryFn: () => api.paymentMethods(workspaceId),
    enabled: Boolean(workspaceId),
  });
  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["payment-methods", workspaceId] });
    await qc.invalidateQueries({
      queryKey: ["next-card-payment-balance", workspaceId],
    });
  }
  async function save(value: PaymentMethodPayload) {
    if (selected) await paymentMethodApi.update(selected.id, value);
    else await paymentMethodApi.create(value);
    await refresh();
  }
  async function remove(item: PaymentMethod) {
    if (!confirm(`${item.name} 결제 수단을 삭제할까요?`)) return;
    try {
      await paymentMethodApi.remove(item.id, workspaceId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제하지 못했습니다.");
    }
  }
  function create() {
    setSelected(null);
    setOpen(true);
  }
  function edit(item: PaymentMethod) {
    setSelected(item);
    setOpen(true);
  }
  return (
    <div className={s.shell}>
      <Sidebar />
      <main>
        <header>
          <div>
            <p>자산 관리</p>
            <h1>결제 수단</h1>
            <span>
              {workspace?.name}에서 사용하는 현금과 카드를 관리하세요.
            </span>
          </div>
          <Button onClick={create}>＋ 결제 수단 추가</Button>
        </header>
        {error && <p className={s.error}>{error}</p>}
        {workspaceLoading || isLoading ? (
          <div className={s.empty}>결제 수단을 불러오고 있어요…</div>
        ) : items.length === 0 ? (
          <div className={s.empty}>
            <i>▣</i>
            <b>등록된 결제 수단이 없습니다.</b>
            <p>현금이나 자주 사용하는 카드를 추가해보세요.</p>
            <Button onClick={create}>첫 결제 수단 추가</Button>
          </div>
        ) : (
          <section className={s.grid}>
            {items.map((item) => (
              <article key={item.id} onClick={() => edit(item)}>
                <div className={`${s.icon} ${s[item.type.toLowerCase()]}`}>
                  {item.type === "CASH" ? "₩" : "▰"}
                </div>
                <div className={s.cardHead}>
                  <span>{labels[item.type]}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(item);
                    }}
                  >
                    삭제
                  </button>
                </div>
                <h2>{item.name}</h2>
                {item.type === "CASH" ? (
                  <p>현금 지출을 기록하는 결제 수단</p>
                ) : (
                  <dl>
                    <div>
                      <dt>카드사</dt>
                      <dd>{item.cardIssuer || "—"}</dd>
                    </div>
                    <div>
                      <dt>월 실적 목표</dt>
                      <dd>
                        {Number(item.targetPerformance ?? 0).toLocaleString()}원
                      </dd>
                    </div>
                    {item.type === "CREDIT_CARD" && (
                      <>
                        <div>
                          <dt>결제일</dt>
                          <dd>매월 {item.billingDay}일</dd>
                        </div>
                        <div>
                          <dt>연회비</dt>
                          <dd>
                            {Number(item.annualFee ?? 0).toLocaleString()}원
                          </dd>
                        </div>
                      </>
                    )}
                  </dl>
                )}
                <small>클릭하여 수정</small>
              </article>
            ))}
          </section>
        )}
        <PaymentMethodModal
          key={selected?.id ?? "new"}
          open={open}
          item={selected}
          workspaceId={workspaceId}
          onClose={() => setOpen(false)}
          onSave={save}
        />
      </main>
    </div>
  );
}
