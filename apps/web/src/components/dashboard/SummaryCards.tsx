import Link from "next/link";
import s from "./SummaryCards.module.scss";

const money = (value: number) => `${value.toLocaleString("ko-KR")}원`;

export function SummaryCards({
  balance,
  spent,
  fixed,
  variable,
  onBalanceClick,
}: {
  balance: number;
  spent: number;
  fixed: number;
  variable: number;
  onBalanceClick?: () => void;
}) {
  const data = [
    {
      label: "현재 예산",
      value: money(balance),
      hint: "오늘까지의 체크카드 소비 반영",
      tone: "balance",
      type: "BALANCE",
    },
    {
      label: "이번 달 소비",
      value: money(spent),
      hint: "정기 + 일시적 소비",
      tone: "spent",
      type: "SPENDING",
    },
    {
      label: "정기 지출",
      value: money(fixed),
      hint: "매월 반복되는 지출",
      tone: "fixed",
      type: "FIXED",
    },
    {
      label: "일시적 소비",
      value: money(variable),
      hint: "이번 달 변동 지출",
      tone: "variable",
      type: "VARIABLE",
    },
  ];

  return (
    <section className={s.grid}>
      {data.map((item) => {
        const content = (
          <>
          <div>
            <span>{item.label}</span>
            <i className={s[item.tone]} />
          </div>
          <strong>{item.value}</strong>
          <small>{item.hint}</small>
          <em>{item.type === "BALANCE" ? "계산 상세 보기 →" : "목록 보기 →"}</em>
          </>
        );
        if (item.type === "BALANCE")
          return (
            <button
              type="button"
              key={item.label}
              className={`${s.card} ${s.buttonCard}`}
              onClick={onBalanceClick}
            >
              {content}
            </button>
          );
        return (
          <Link
            href={`/transactions?type=${item.type}`}
            key={item.label}
            className={s.card}
          >
            {content}
          </Link>
        );
      })}
    </section>
  );
}
