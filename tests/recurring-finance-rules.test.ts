import { describe, expect, it } from "vitest";

import { buildRecurringFinanceReminderOccurrences, canAddRecurringFinanceEntry, FREE_RECURRING_FINANCE_LIMIT, RECURRING_FINANCE_REMINDER_FREQUENCIES } from "../lib/recurring-finance-rules";

describe("recurring finance limits", () => {
  it("limits Free accounts to five recurring financial entries", () => {
    expect(FREE_RECURRING_FINANCE_LIMIT).toBe(5);
    expect(canAddRecurringFinanceEntry(4, false)).toBe(true);
    expect(canAddRecurringFinanceEntry(5, false)).toBe(false);
  });

  it("allows paid accounts to add recurring financial entries without the Free limit", () => {
    expect(canAddRecurringFinanceEntry(500, true)).toBe(true);
  });

  it("limits financial reminder cadence to daily, monthly, and yearly schedules", () => {
    const choices = ["daily", "monthly", "yearly"];
    expect(RECURRING_FINANCE_REMINDER_FREQUENCIES).toEqual(choices);
  });

  it("stops reminder occurrences at an optional commitment end date", () => {
    const occurrences = buildRecurringFinanceReminderOccurrences({
      reminderAt: new Date("2026-08-01T09:00:00.000Z"),
      frequency: "monthly",
      endsAt: new Date("2026-10-31T23:59:59.000Z"),
      from: new Date("2026-07-30T00:00:00.000Z"),
    });
    expect(occurrences.map((date) => date.toISOString().slice(0, 10))).toEqual(["2026-08-01", "2026-09-01", "2026-10-01"]);
  });
});
