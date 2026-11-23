import { NotificationEventType } from "../entities/notification-import.entity";

export interface ParsedFinancialNotification {
  merchant: string | null;
  amount: number | null;
  occurredAt: Date;
  eventType: NotificationEventType;
  confidence: number;
}

const NOISE = [
  /^(승인|결제|이용|일시불|체크|신용|국내|해외)$/i,
  /^누적\s*[\d,]+원$/,
  /^잔액\s*[\d,]+원$/,
  /^\*+$|^[\d*-]{4,}$/,
];

export function parseFinancialNotification(
  title: string,
  text: string,
  postedAt: Date,
): ParsedFinancialNotification {
  const source = `${title}\n${text}`.replace(/\u00a0/g, " ").trim();
  const amountMatches = [...source.matchAll(/(?:^|\s)([+-]?[\d,]+)\s*원/g)];
  const amount = amountMatches.length
    ? Number(amountMatches[0][1].replace(/,/g, ""))
    : null;
  const cancelled = /(승인\s*취소|결제\s*취소|이용\s*취소|취소완료)/.test(source);
  const approved = /(승인|결제|이용|출금)/.test(source);
  const dateMatch = source.match(
    /(?:^|\s)(\d{1,2})[./-](\d{1,2})(?:\s+|\([^)]*\)\s*)(\d{1,2}):(\d{2})(?:\s|$)/,
  );
  const occurredAt = dateMatch
    ? buildDate(postedAt, ...dateMatch.slice(1).map(Number) as [number, number, number, number])
    : postedAt;
  const merchant = findMerchant(source, amountMatches[0]?.[0] ?? "", dateMatch?.[0] ?? "");
  const confidence = Math.min(
    1,
    (amount !== null ? 0.45 : 0) +
      (merchant ? 0.25 : 0) +
      (dateMatch ? 0.15 : 0) +
      (cancelled || approved ? 0.15 : 0),
  );
  return {
    merchant,
    amount,
    occurredAt,
    eventType: cancelled
      ? NotificationEventType.CANCELLED
      : approved
        ? NotificationEventType.APPROVED
        : NotificationEventType.UNKNOWN,
    confidence,
  };
}

function buildDate(base: Date, month: number, day: number, hour: number, minute: number) {
  const year = Number(
    new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Seoul",
      year: "numeric",
    }).format(base),
  );
  let candidate = new Date(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+09:00`,
  );
  if (candidate.getTime() - base.getTime() > 31 * 24 * 60 * 60 * 1000)
    candidate = new Date(
      `${year - 1}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+09:00`,
    );
  return candidate;
}

function findMerchant(source: string, amountToken: string, dateToken: string) {
  const lines = source
    .split(/[\n|]/)
    .flatMap((line) => line.split(/\s{2,}/))
    .map((line) => line.trim())
    .filter(Boolean);
  const candidates = lines
    .map((line) =>
      line
        .replace(dateToken.trim(), "")
        .replace(amountToken.trim(), "")
        .replace(/(승인\s*취소|결제\s*취소|이용\s*취소|취소완료|승인|결제|이용|일시불|체크|신용|국내|해외)/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((line) => line.length >= 2 && line.length <= 80)
    .filter((line) => !NOISE.some((rule) => rule.test(line)));
  return candidates.at(-1) ?? null;
}
