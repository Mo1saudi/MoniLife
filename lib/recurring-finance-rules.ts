export const FREE_RECURRING_FINANCE_LIMIT = 5;
export const RECURRING_FINANCE_REMINDER_FREQUENCIES = ["daily", "monthly", "yearly"] as const;
export type RecurringFinanceReminderFrequency = (typeof RECURRING_FINANCE_REMINDER_FREQUENCIES)[number];
export const MAX_FINANCE_REMINDER_OCCURRENCES = 180;

export function canAddRecurringFinanceEntry(currentCount: number, hasPremiumAccess: boolean) {
  return hasPremiumAccess || currentCount < FREE_RECURRING_FINANCE_LIMIT;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function addOccurrence(anchor: Date, frequency: RecurringFinanceReminderFrequency, index: number): Date {
  const next = new Date(anchor);
  if (frequency === "daily") next.setDate(anchor.getDate() + index);
  if (frequency === "monthly") {
    const month = anchor.getMonth() + index;
    const year = anchor.getFullYear() + Math.floor(month / 12);
    const normalizedMonth = ((month % 12) + 12) % 12;
    next.setFullYear(year, normalizedMonth, Math.min(anchor.getDate(), daysInMonth(year, normalizedMonth)));
  }
  if (frequency === "yearly") {
    const year = anchor.getFullYear() + index;
    next.setFullYear(year, anchor.getMonth(), Math.min(anchor.getDate(), daysInMonth(year, anchor.getMonth())));
  }
  return next;
}

export function buildRecurringFinanceReminderOccurrences(input: {
  reminderAt: Date;
  frequency: RecurringFinanceReminderFrequency;
  endsAt?: Date | null;
  from?: Date;
  limit?: number;
}): Date[] {
  const from = input.from ?? new Date();
  const end = input.endsAt ?? null;
  const occurrences: Date[] = [];
  for (let index = 0; index < (input.limit ?? MAX_FINANCE_REMINDER_OCCURRENCES); index += 1) {
    const occurrence = addOccurrence(input.reminderAt, input.frequency, index);
    if (end && occurrence.getTime() > end.getTime()) break;
    if (occurrence.getTime() > from.getTime()) occurrences.push(occurrence);
  }
  return occurrences;
}
