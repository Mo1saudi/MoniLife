export type DailyExpenseSample = { amount: number; occurredAt: string; kind?: "expense" | "income" };
export type OverspendingAssessment = { shouldAlert: boolean; reason: "daily_limit" | "rapid_withdrawals" | null; total: number; rapidCount: number };

export const DEFAULT_DAILY_SPENDING_LIMIT_EGP = 1000;
const RAPID_WINDOW_MS = 30 * 60 * 1000;
const RAPID_MINIMUM_OPERATIONS = 3;

function sameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

export function assessOverspending(samples: DailyExpenseSample[], dailyLimit = DEFAULT_DAILY_SPENDING_LIMIT_EGP, now = new Date()): OverspendingAssessment {
  const expenses = samples.filter((sample) => (sample.kind ?? "expense") === "expense" && sameDay(new Date(sample.occurredAt), now) && Number.isFinite(sample.amount) && sample.amount > 0);
  const total = expenses.reduce((sum, sample) => sum + sample.amount, 0);
  const rapidCount = expenses.filter((sample) => now.getTime() - new Date(sample.occurredAt).getTime() <= RAPID_WINDOW_MS).length;
  if (total > dailyLimit) return { shouldAlert: true, reason: "daily_limit", total, rapidCount };
  if (rapidCount >= RAPID_MINIMUM_OPERATIONS) return { shouldAlert: true, reason: "rapid_withdrawals", total, rapidCount };
  return { shouldAlert: false, reason: null, total, rapidCount };
}
