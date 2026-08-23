export const TASK_REMINDER_OPTIONS = [
  { id: "at_time", minutesBefore: 0, labelAr: "في وقت المهمة", labelEn: "At task time" },
  { id: "15m", minutesBefore: 15, labelAr: "قبل 15 دقيقة", labelEn: "15 minutes before" },
  { id: "1h", minutesBefore: 60, labelAr: "قبل ساعة", labelEn: "1 hour before" },
  { id: "2h", minutesBefore: 120, labelAr: "قبل ساعتين", labelEn: "2 hours before" },
  { id: "24h", minutesBefore: 1440, labelAr: "قبل 24 ساعة", labelEn: "24 hours before" },
] as const;

export type TaskReminderOffset = (typeof TASK_REMINDER_OPTIONS)[number]["id"];
export type HabitFrequency = "daily" | "weekly" | "monthly" | "yearly";

export const FREE_TASK_REMINDER_LIMIT = 2;

export function taskReminderLimit(isPremium: boolean) {
  return isPremium ? TASK_REMINDER_OPTIONS.length : FREE_TASK_REMINDER_LIMIT;
}

export function normalizeTaskReminderOffsets(offsets: TaskReminderOffset[], isPremium: boolean) {
  const known = TASK_REMINDER_OPTIONS.map((option) => option.id);
  const unique = Array.from(new Set(offsets)).filter((offset): offset is TaskReminderOffset => known.includes(offset));
  return unique.slice(0, taskReminderLimit(isPremium));
}

export function taskReminderDate(dueAt: Date, offset: TaskReminderOffset) {
  const option = TASK_REMINDER_OPTIONS.find((candidate) => candidate.id === offset);
  return new Date(dueAt.getTime() - (option?.minutesBefore ?? 0) * 60_000);
}

export function habitDailyTarget(reminderTimes: string[], isPremium: boolean) {
  return isPremium ? Math.max(1, reminderTimes.length) : 1;
}
