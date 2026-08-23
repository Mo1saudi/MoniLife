import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appShell = readFileSync("components/omni-life-center.tsx", "utf8");

describe("SMS finance transaction visibility", () => {
  it("keeps daily SMS transactions in the Finance history and orders them by their recorded timestamp", () => {
    expect(appShell).toContain('entry.kind === "daily_expense").sort((left, right) => Date.parse(right.recordedAt ?? "") - Date.parse(left.recordedAt ?? ""))');
    expect(appShell).toContain("...dailyExpenses.map((entry) => ({ type: \"expense\" as const, entry }))");
  });

  it("labels SMS-derived income and expenses distinctly and shows their sign", () => {
    expect(appShell).toContain("إيراد تلقائي عبر SMS");
    expect(appShell).toContain("مصروف تلقائي عبر SMS");
    expect(appShell).toContain('{isIncome ? "+" : "−"}{money(item.entry.amount)}');
  });
});
