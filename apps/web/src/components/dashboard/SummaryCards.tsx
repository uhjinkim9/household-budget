import Link from "next/link";
import s from "./SummaryCards.module.scss";

const money = (value: number) =>
  `${value.toLocaleString("ko-KR")}원`;

export function SummaryCards({
  balance,
  projectedBalance,
  spent,
  fixed,
  variable,
}: {
  balance: number;
  projectedBalance: number;
  spent: number;
  fixed: number;
  variable: number;
}) {
  const data = [
    {
      label: "현재 잔액",
      value: money(balance),
      hint: "오늘까지의 체크카드 소비 반영",
      tone: "balance",
      type: "BALANCE",
      projected: money(projectedBalance),
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
      {data.map((item) => (
        <Link
          href={`/transactions?type=${item.type}`}
          key={item.label}
          className={s.card}
        >
          <div>
            <span>{item.label}</span>
            <i className={s[item.tone]} />
          </div>
          <strong>{item.value}</strong>
          {item.projected && (
            <div className={s.projected}>
              <span>말일 예상 잔액</span>
              <b>{item.projected}</b>
            </div>
          )}
          <small>{item.hint}</small>
          <em>목록 보기 →</em>
        </Link>
      ))}
    </section>
  );
}

