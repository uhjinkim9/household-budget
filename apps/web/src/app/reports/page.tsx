"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PieChart } from "react-minimal-pie-chart";
import { Sidebar } from "@/components/layout/Sidebar";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import {
  monthBounds,
  parseLocalDate,
  toLocalDateString,
} from "@/lib/date-parser";
import s from "./page.module.scss";

const palette = [
  "#28634a",
  "#e49758",
  "#607cb2",
  "#d6a32f",
  "#9b6fb0",
  "#4f9ca5",
  "#c96f6f",
  "#7f9561",
];

const formatMoney = (value: number) => `${value.toLocaleString("ko-KR")}원`;

export default function ReportsPage() {
  const router = useRouter();
  const [month, setMonth] = useState(toLocalDateString().slice(0, 7));
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const { data: workspace, isLoading: workspaceLoading } = useQuery({
    queryKey: ["active-workspace"],
    queryFn: api.getOrCreateWorkspace,
  });
  const range = useMemo(
    () => monthBounds(parseLocalDate(`${month}-01`)),
    [month],
  );
  const { data, isLoading, isError } = useQuery({
    queryKey: ["category-report", workspace?.id, range.from, range.to],
    queryFn: () => api.categoryReport(workspace!.id, range.from, range.to),
    enabled: Boolean(workspace && workspace.role !== "VIEWER"),
  });

  useEffect(() => {
    if (workspace?.role === "VIEWER")
      router.replace("/transactions?type=SPENDING");
  }, [router, workspace?.role]);

  const categories = data?.categories ?? [];
  const chartData = categories.map((item, index) => ({
    title: item.category || "미분류",
    value: item.amount,
    color: palette[index % palette.length],
  }));
  const top = categories[0];

  function moveMonth(offset: number) {
    const date = parseLocalDate(`${month}-01`);
    date.setMonth(date.getMonth() + offset);
    setMonth(toLocalDateString(date).slice(0, 7));
    setFocusedIndex(null);
  }

  return (
    <div className={s.shell}>
      <Sidebar />
      <main>
        <header className={s.header}>
          <div>
            <p>소비 분석</p>
            <h1>지출 리포트</h1>
            <span>카테고리별 소비 비중을 한눈에 확인하세요.</span>
          </div>
          <div className={s.monthControl}>
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              aria-label="이전 달"
            >
              ‹
            </button>
            <Input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              aria-label="조회 월"
            />
            <button
              type="button"
              onClick={() => moveMonth(1)}
              aria-label="다음 달"
            >
              ›
            </button>
          </div>
        </header>

        <section className={s.summary}>
          <article>
            <span>이번 달 총지출</span>
            <strong>{formatMoney(data?.total ?? 0)}</strong>
            <small>{range.label} 기준</small>
          </article>
          <article>
            <span>가장 큰 지출</span>
            <strong>{top?.category || "—"}</strong>
            <small>
              {top
                ? `${top.percentage.toFixed(1)}% · ${formatMoney(top.amount)}`
                : "지출 없음"}
            </small>
          </article>
          <article>
            <span>소비 카테고리</span>
            <strong>{categories.length}개</strong>
            <small>지출이 발생한 카테고리</small>
          </article>
        </section>

        {workspaceLoading || isLoading ? (
          <section className={s.empty}>리포트를 만들고 있어요…</section>
        ) : isError ? (
          <section className={s.empty}>
            지출 리포트를 불러오지 못했습니다.
          </section>
        ) : categories.length === 0 ? (
          <section className={s.empty}>
            <i>◔</i>
            <b>{range.label}에는 등록된 지출이 없습니다.</b>
            <p>소비를 등록하면 카테고리별 리포트가 자동으로 생성돼요.</p>
          </section>
        ) : (
          <section className={s.reportCard}>
            <div className={s.chartArea}>
              <div className={s.chart}>
                <PieChart
                  data={chartData}
                  lineWidth={38}
                  paddingAngle={2}
                  rounded
                  animate
                  startAngle={-90}
                  segmentsShift={(index) => (focusedIndex === index ? 2 : 0)}
                  onMouseOver={(_, index) => setFocusedIndex(index)}
                  onMouseOut={() => setFocusedIndex(null)}
                />
                <div className={s.chartCenter}>
                  <span>
                    {focusedIndex === null
                      ? "총지출"
                      : chartData[focusedIndex].title}
                  </span>
                  <strong>
                    {formatMoney(
                      focusedIndex === null
                        ? (data?.total ?? 0)
                        : chartData[focusedIndex].value,
                    )}
                  </strong>
                </div>
              </div>
              <p>차트에 마우스를 올리면 카테고리 금액을 볼 수 있어요.</p>
            </div>

            <div className={s.categoryList}>
              <div className={s.listHeader}>
                <h2>카테고리별 지출</h2>
                <span>총 {categories.length}개</span>
              </div>
              {categories.map((item, index) => (
                <article
                  key={item.category}
                  className={focusedIndex === index ? s.focused : ""}
                  onMouseEnter={() => setFocusedIndex(index)}
                  onMouseLeave={() => setFocusedIndex(null)}
                >
                  <i
                    style={{ backgroundColor: palette[index % palette.length] }}
                  />
                  <div>
                    <div className={s.categoryHead}>
                      <b>{item.category || "미분류"}</b>
                      <strong>{item.percentage.toFixed(1)}%</strong>
                    </div>
                    <div className={s.track}>
                      <span
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: palette[index % palette.length],
                        }}
                      />
                    </div>
                    <small>{formatMoney(item.amount)}</small>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
