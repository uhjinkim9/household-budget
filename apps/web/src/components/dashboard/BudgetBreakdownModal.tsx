import type { DashboardBalance } from "@/lib/api";
import { formatDate } from "@/lib/date-parser";
import { Modal } from "../ui/Modal";
import s from "./BudgetBreakdownModal.module.scss";

const money = (value: number) => `${value.toLocaleString("ko-KR")}원`;
const signedMoney = (value: number) =>
  `${value >= 0 ? "+ " : "- "}${money(Math.abs(value))}`;

export function BudgetBreakdownModal({
  open,
  balance,
  asOf,
  onClose,
}: {
  open: boolean;
  balance?: DashboardBalance;
  asOf: string;
  onClose: () => void;
}) {
  if (!balance) return null;
  const { breakdown } = balance;

  return (
    <Modal open={open} title="현재 예산 계산 상세" onClose={onClose}>
      <div className={s.content}>
        <p className={s.description}>
          {formatDate(asOf)}까지 입력된 예산과 결제 내역을 기준으로 계산했어요.
        </p>

        <div className={s.formula}>
          <div>
            <span>사용자 입력 예산</span>
            <strong className={breakdown.budgetInput >= 0 ? s.positive : s.negative}>
              {signedMoney(breakdown.budgetInput)}
            </strong>
            {balance.mode === "MONTHLY_RESET" && breakdown.calculationFrom && (
              <small>
                {formatDate(breakdown.calculationFrom)} 초기 예산 {money(breakdown.resetBase)}
                {breakdown.budgetAdjustments !== 0
                  ? ` · 이후 증감 ${money(breakdown.budgetAdjustments)}`
                  : ""}
              </small>
            )}
          </div>
          <div>
            <span>체크카드 소비</span>
            <strong className={s.negative}>- {money(breakdown.checkCardSpent)}</strong>
            <small>소비일 기준 즉시 차감</small>
          </div>
          <div>
            <span>신용카드 결제</span>
            <strong className={s.negative}>- {money(breakdown.creditCardPaid)}</strong>
            <small>결제일이 도래한 청구액만 차감</small>
          </div>
        </div>

        <div className={s.total}>
          <span>현재 예산</span>
          <strong>{money(balance.balance)}</strong>
        </div>

        <p className={s.notice}>
          현금, 계좌 및 결제 수단을 선택하지 않은 소비는 현재 계산에서 차감되지 않아요.
        </p>
      </div>
    </Modal>
  );
}
