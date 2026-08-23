import { describe, expect, it } from "vitest";

import { canAddDailyManualTransaction, countDailyManualTransactions, FREE_DAILY_TRANSACTION_LIMIT, isRecordedOnDate, parsePositiveEgpAmount } from "../lib/daily-expense-rules";

describe("daily expense rules", () => {
  it("accepts valid EGP amounts written with Arabic or Latin digits", () => {
    expect(parsePositiveEgpAmount("١٬٢٣٤٫٥٠")).toBe(1234.5);
    expect(parsePositiveEgpAmount("125.75")).toBe(125.75);
  });

  it("rejects non-positive and invalid expense amounts", () => {
    expect(parsePositiveEgpAmount("0")).toBeNull();
    expect(parsePositiveEgpAmount("غير صحيح")).toBeNull();
  });

  it("keeps daily totals limited to entries recorded on the selected day", () => {
    const day = new Date("2026-08-19T12:00:00.000Z");
    expect(isRecordedOnDate("2026-08-19T08:00:00.000Z", day)).toBe(true);
    expect(isRecordedOnDate("2026-08-18T23:59:00.000Z", day)).toBe(false);
  });

  it("allows three manual daily transactions on Free and leaves SMS imports outside the user entry cap", () => {
    const today = new Date("2026-08-21T12:00:00.000Z");
    const entries = [
      { kind: "daily_expense", recordedAt: "2026-08-21T08:00:00.000Z", source: "manual" as const },
      { kind: "daily_expense", recordedAt: "2026-08-21T09:00:00.000Z", source: "manual" as const },
      { kind: "daily_expense", recordedAt: "2026-08-21T10:00:00.000Z", source: "manual" as const },
      { kind: "daily_expense", recordedAt: "2026-08-21T11:00:00.000Z", source: "sms" as const },
    ];
    expect(FREE_DAILY_TRANSACTION_LIMIT).toBe(3);
    expect(countDailyManualTransactions(entries, today)).toBe(3);
    expect(canAddDailyManualTransaction(entries, false, today)).toBe(false);
    expect(canAddDailyManualTransaction(entries, true, today)).toBe(true);
  });
});
