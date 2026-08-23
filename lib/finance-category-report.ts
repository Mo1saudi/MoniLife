export type CategorizedFinanceEntry = {
  amount: number;
  category: string;
  recordedAt?: string;
  transactionDirection?: "expense" | "income";
};

export type MonthlyCategoryTotal = { category: string; amount: number; share: number };

function isInMonth(value: string | undefined, target: Date) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getFullYear() === target.getFullYear() && date.getMonth() === target.getMonth();
}

/** Groups only recorded expense transactions in the selected month; income never inflates spending totals. */
export function buildMonthlyCategoryReport(entries: CategorizedFinanceEntry[], month = new Date()): MonthlyCategoryTotal[] {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    if (entry.transactionDirection === "income" || !isInMonth(entry.recordedAt, month) || !Number.isFinite(entry.amount) || entry.amount <= 0) continue;
    const category = entry.category.trim() || "أخرى";
    totals.set(category, (totals.get(category) ?? 0) + entry.amount);
  }
  const grandTotal = [...totals.values()].reduce((sum, amount) => sum + amount, 0);
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount, share: grandTotal ? Math.round((amount / grandTotal) * 100) : 0 }))
    .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category));
}
