import type { MonthlyCategoryTotal } from "./finance-category-report";

export type CategoryBudgetStatus = MonthlyCategoryTotal & { budget: number; remaining: number; exceeded: boolean };

export function buildCategoryBudgetStatuses(report: MonthlyCategoryTotal[], budgets: Record<string, number>): CategoryBudgetStatus[] {
  return report.map((entry) => {
    const candidate = budgets[entry.category];
    const budget = Number.isFinite(candidate) && candidate > 0 ? Math.round(candidate * 100) / 100 : 0;
    const remaining = budget ? Math.round((budget - entry.amount) * 100) / 100 : 0;
    return { ...entry, budget, remaining, exceeded: budget > 0 && entry.amount > budget };
  });
}

export function buildCategoryBudgetAlertKey(month: Date, category: string) {
  return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}:${category.trim().toLocaleLowerCase()}`;
}
