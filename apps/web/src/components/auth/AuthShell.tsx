import Link from "next/link";
import type { ReactNode } from "react";
import s from "./AuthShell.module.scss";
export function AuthShell({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className={s.page}>
      <section className={s.visual}>
        <Link href="/" className={s.brand}>
          <i>M</i>
          <span>Mercury Lab Household Budget Manager</span>
        </Link>
        <div className={s.copy}>
          <small>우리 집 돈의 흐름을 한눈에</small>
          <h1>
            함께 쓰고,
            <br />더 나은 내일을 계획해요.
          </h1>
          <p>
            정기 지출부터 카드 실적까지
            <br />
            가계 구성원과 편안하게 관리하세요.
          </p>
        </div>
        <div className={s.miniCard}>
          <span>이번 달 소비</span>
          <strong>1,284,700원</strong>
          <div>
            <i />
            <small>지난달보다 8% 절약했어요</small>
          </div>
        </div>
      </section>
      <section className={s.content}>
        <div className={s.formCard}>
          <header>
            <h2>{title}</h2>
            <p>{description}</p>
          </header>
          {children}
          <footer>{footer}</footer>
        </div>
      </section>
    </main>
  );
}
