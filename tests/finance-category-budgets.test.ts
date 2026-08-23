import { describe, expect, it } from "vitest";
import { buildCategoryBudgetAlertKey, buildCategoryBudgetStatuses } from "../lib/finance-category-budgets";

describe("Finance category budgets", () => {
  it("calculates remaining budget and identifies only configured budget exceedances", () => {
    const statuses = buildCategoryBudgetStatuses([
      { category: "طعام ومشروبات", amount: 650, share: 65 },
      { category: "مواصلات", amount: 350, share: 35 },
    ], { "طعام ومشروبات": 500, "مواصلات": 500 });
    expect(statuses).toEqual([
      { category: "طعام ومشروبات", amount: 650, share: 65, budget: 500, remaining: -150, exceeded: true },
      { category: "مواصلات", amount: 350, share: 35, budget: 500, remaining: 150, exceeded: false },
    ]);
  });

  it("creates a stable, month-scoped alert key for each category", () => {
    expect(buildCategoryBudgetAlertKey(new Date("2026-08-20T12:00:00Z"), "طعام ومشروبات")).toBe("2026-08:طعام ومشروبات");
  });
});
