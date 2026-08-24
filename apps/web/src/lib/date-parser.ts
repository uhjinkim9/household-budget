/** Date를 브라우저의 로컬 시간대 기준 YYYY-MM-DD로 변환합니다. */
export function toLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function monthBounds(date = new Date()) {
  const year = date.getFullYear();
  const monthIndex = date.getMonth();
  const month = String(monthIndex + 1).padStart(2, '0');
  const lastDay = String(new Date(year, monthIndex + 1, 0).getDate()).padStart(2, '0');
  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${lastDay}`,
    label: `${year}년 ${monthIndex + 1}월`,
  };
}

export function parseLocalDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function dayBounds(date = new Date()) {
  const value = toLocalDateString(date);
  return {
    from: value,
    to: value,
    label: `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`,
  };
}

export function weekBounds(date = new Date()) {
  const fromDate = new Date(date);
  fromDate.setDate(date.getDate() - date.getDay());
  const toDate = new Date(fromDate);
  toDate.setDate(fromDate.getDate() + 6);
  return {
    from: toLocalDateString(fromDate),
    to: toLocalDateString(toDate),
    label: `${fromDate.getMonth() + 1}월 ${fromDate.getDate()}일 ~ ${toDate.getMonth() + 1}월 ${toDate.getDate()}일`,
  };
}

export function yearBounds(date = new Date()) {
  const year = date.getFullYear();
  return {
    from: `${year}-01-01`,
    to: `${year}-12-31`,
    label: `${year}년`,
  };
}

/** YYYY-MM-DD → M월 D일 */
export function formatDate(date: string) {
  const [, month, day] = date.slice(0, 10).split('-');
  return `${Number(month)}월 ${Number(day)}일`;
}
