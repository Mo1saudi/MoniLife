export type WeeklyFinanceEntry = {
  amount: number;
  recordedAt?: string;
  transactionDirection?: "income" | "expense";
};

export type WeeklySpendingPoint = {
  dateKey: string;
  spent: number;
  limit: number;
  exceeded: boolean;
};

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildWeeklySpendingReport(entries: WeeklyFinanceEntry[], dailyLimit: number, now = new Date()): WeeklySpendingPoint[] {
  const normalizedLimit = Number.isFinite(dailyLimit) && dailyLimit > 0 ? dailyLimit : 0;
  const byDay = new Map<string, number>();
  for (const entry of entries) {
    if (entry.transactionDirection === "income" || !entry.recordedAt || !Number.isFinite(entry.amount)) continue;
    const date = new Date(entry.recordedAt);
    if (Number.isNaN(date.getTime())) continue;
    const key = localDateKey(date);
    byDay.set(key, (byDay.get(key) ?? 0) + entry.amount);
  }

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setHours(12, 0, 0, 0);
    date.setDate(now.getDate() - 6 + index);
    const dateKey = localDateKey(date);
    const spent = byDay.get(dateKey) ?? 0;
    return { dateKey, spent, limit: normalizedLimit, exceeded: normalizedLimit > 0 && spent > normalizedLimit };
  });
}
