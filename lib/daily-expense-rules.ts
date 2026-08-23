export function parsePositiveEgpAmount(value: string): number | null {
  const normalized = value
    .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit).toString())
    .replace(/[٬,]/g, "")
    .replace(/[٫،]/g, ".")
    .trim();
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : null;
}

export function isRecordedOnDate(recordedAt: string | undefined, date: Date): boolean {
  return Boolean(recordedAt) && new Date(recordedAt!).toDateString() === date.toDateString();
}

export const FREE_DAILY_TRANSACTION_LIMIT = 3;

export type DailyTransactionRecord = {
  kind?: string;
  recordedAt?: string;
  source?: "manual" | "sms";
};

export function countDailyManualTransactions(entries: DailyTransactionRecord[], date: Date) {
  return entries.filter((entry) => entry.kind === "daily_expense" && entry.source !== "sms" && isRecordedOnDate(entry.recordedAt, date)).length;
}

export function canAddDailyManualTransaction(entries: DailyTransactionRecord[], hasPremiumAccess: boolean, date: Date) {
  return hasPremiumAccess || countDailyManualTransactions(entries, date) < FREE_DAILY_TRANSACTION_LIMIT;
}
