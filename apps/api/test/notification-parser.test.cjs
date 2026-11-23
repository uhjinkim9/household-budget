const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parseFinancialNotification,
} = require("../dist/notification-imports/notification-parser");

test("카드 승인 알림에서 거래 정보를 추출한다", () => {
  const result = parseFinancialNotification(
    "신한카드 승인",
    "11/23 12:30 테스트카페 1,500원 승인",
    new Date("2026-11-23T03:31:00Z"),
  );
  assert.equal(result.merchant, "테스트카페");
  assert.equal(result.amount, 1500);
  assert.equal(result.eventType, "APPROVED");
  assert.equal(result.occurredAt.toISOString(), "2026-11-23T03:30:00.000Z");
});

test("승인 취소를 일반 승인보다 우선해서 판별한다", () => {
  const result = parseFinancialNotification(
    "카드 승인취소",
    "11/23 13:00 테스트카페 1,500원 승인취소",
    new Date("2026-11-23T04:01:00Z"),
  );
  assert.equal(result.eventType, "CANCELLED");
});
