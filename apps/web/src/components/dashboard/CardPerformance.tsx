import Link from "next/link";
import type { PaymentMethod, Transaction } from "@/lib/types";
import s from "./CardPerformance.module.scss";
export function CardPerformance({
  cards,
  items,
}: {
  cards: PaymentMethod[];
  items: Transaction[];
}) {
  return (
    <section className={s.panel}>
      <header>
        <div>
          <h2>카드 실적</h2>
          <p>이번 달 목표 달성 현황이에요</p>
        </div>
          <Link href="/payment-methods">결제 수단 관리</Link>
      </header>
      <div className={s.list}>
        {cards.map((card) => {
          const used = items
              .filter(
                (x) => x.paymentMethodId === card.id && x.type !== "BALANCE",
              )
              .reduce((a, b) => a + Number(b.amount), 0),
            target = Number(card.targetPerformance ?? 0),
            progress = Math.min(100, target ? (used / target) * 100 : 0);
          return (
            <article key={card.id}>
              <div className={s.cardIcon}>▰</div>
              <div className={s.info}>
                <div>
                  <b>{card.name}</b>
                  <span>
                    {card.billingDay
                      ? `매월 ${card.billingDay}일 결제`
                      : "체크카드"}
                  </span>
                </div>
                <div className={s.track}>
                  <i style={{ width: `${progress}%` }} />
                </div>
                <small>
                  <em>{used.toLocaleString("ko-KR")}원</em> /{" "}
                  {target.toLocaleString("ko-KR")}원
                </small>
              </div>
              <strong>{Math.round(progress)}%</strong>
            </article>
          );
        })}
      </div>
    </section>
  );
}
