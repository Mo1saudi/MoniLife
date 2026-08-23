import { scheduleHighPriorityNotification } from "./omni-notifications";
import * as Notifications from "expo-notifications";
import { buildRecurringFinanceReminderOccurrences, MAX_FINANCE_REMINDER_OCCURRENCES } from "./recurring-finance-rules";

type RecurringFinanceReminderFrequency = "daily" | "monthly" | "yearly";
export { MAX_FINANCE_REMINDER_OCCURRENCES } from "./recurring-finance-rules";

export async function scheduleRecurringFinanceReminder(input: {
  entryId: string;
  title: string;
  amount: number;
  reminderAt: Date;
  frequency: RecurringFinanceReminderFrequency;
  isArabic: boolean;
  endsAt?: Date | null;
  earlyReminderMinutes?: number;
}) {
  const occurrences = buildRecurringFinanceReminderOccurrences({ reminderAt: input.reminderAt, frequency: input.frequency, endsAt: input.endsAt, limit: MAX_FINANCE_REMINDER_OCCURRENCES });
  const identifiers = await Promise.all(occurrences.flatMap((dueAt) => {
    const notifications = [scheduleHighPriorityNotification(
      {
        title: input.isArabic ? `تذكير التزام: ${input.title}` : `Commitment reminder: ${input.title}`,
        body: input.isArabic ? `استحقاق بقيمة ${input.amount.toLocaleString("ar-EG")} ج.م.` : `An amount of ${input.amount.toLocaleString("en-US")} EGP is due.`,
        target: { kind: "finance", id: input.entryId },
      },
      dueAt,
    )];
    const earlyAt = new Date(dueAt.getTime() - Math.max(0, input.earlyReminderMinutes ?? 0) * 60_000);
    if ((input.earlyReminderMinutes ?? 0) > 0 && earlyAt.getTime() > Date.now()) notifications.push(scheduleHighPriorityNotification(
      {
        title: input.isArabic ? `تنبيه مبكر: ${input.title}` : `Early alert: ${input.title}`,
        body: input.isArabic ? `باقي ${input.earlyReminderMinutes} دقيقة على استحقاق ${input.amount.toLocaleString("ar-EG")} ج.م.` : `${input.earlyReminderMinutes} minutes remain before ${input.amount.toLocaleString("en-US")} EGP is due.`,
        target: { kind: "finance", id: input.entryId },
      },
      earlyAt,
    ));
    return notifications;
  }));
  return identifiers.filter((identifier): identifier is string => Boolean(identifier));
}

export async function cancelRecurringFinanceReminders(identifiers: string[] | undefined) {
  await Promise.all((identifiers ?? []).map((identifier) => Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined)));
}
