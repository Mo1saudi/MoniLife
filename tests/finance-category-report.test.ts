import { describe, expect, it } from "vitest";
import { buildMonthlyCategoryReport } from "../lib/finance-category-report";

describe("monthly Finance category report", () => {
  it("groups only current-month expenses, excludes income, and returns descending shares", () => {
    const report = buildMonthlyCategoryReport([
      { amount: 300, category: "طعام ومشروبات", recordedAt: "2026-08-03T10:00:00.000Z", transactionDirection: "expense" },
      { amount: 200, category: "مواصلات", recordedAt: "2026-08-05T10:00:00.000Z", transactionDirection: "expense" },
      { amount: 5000, category: "دخل", recordedAt: "2026-08-06T10:00:00.000Z", transactionDirection: "income" },
      { amount: 1000, category: "تسوق", recordedAt: "2026-07-30T10:00:00.000Z", transactionDirection: "expense" },
    ], new Date("2026-08-20T12:00:00.000Z"));
    expect(report).toEqual([
      { category: "طعام ومشروبات", amount: 300, share: 60 },
      { category: "مواصلات", amount: 200, share: 40 },
    ]);
  });
});
