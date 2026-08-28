import { scheduleHighPriorityNotification } from "./omni-notifications";
import * as Notifications from "expo-notifications";
import { buildRecurringFinanceReminderOccurrences, MAX_FINANCE_REMINDER_OCCURRENCES } from "./recurring-finance-rules";
import { pickNotificationVariation } from "./notification-rotation";
import { personalizeReminderBody } from "./personalized-notification-copy";

type RecurringFinanceReminderFrequency = "daily" | "monthly" | "yearly";
export { MAX_FINANCE_REMINDER_OCCURRENCES } from "./recurring-finance-rules";

export async function scheduleRecurringFinanceReminder(input: {
  entryId: string;
  title: string;
  amount: number;
  reminderAt: Date;
  frequency: RecurringFinanceReminderFrequency;
  isArabic: boolean;
  userName?: string;
  endsAt?: Date | null;
  earlyReminderMinutes?: number;
}) {
  const occurrences = buildRecurringFinanceReminderOccurrences({ reminderAt: input.reminderAt, frequency: input.frequency, endsAt: input.endsAt, limit: MAX_FINANCE_REMINDER_OCCURRENCES });
  const identifiers = await Promise.all(occurrences.flatMap((dueAt) => {
    const amount = input.amount.toLocaleString(input.isArabic ? "ar-EG" : "en-US");
    const key = `${input.entryId}:${dueAt.toISOString()}`;
    const notifications = [scheduleHighPriorityNotification(
      {
        title: input.isArabic ? pickNotificationVariation([`تذكير التزام: ${input.title}`, `استحقاق قريب: ${input.title}`, `راجع التزامك: ${input.title}`], `${key}:title`) : pickNotificationVariation([`Commitment reminder: ${input.title}`, `Upcoming commitment: ${input.title}`, `Review your commitment: ${input.title}`], `${key}:title`),
        body: personalizeReminderBody(input.isArabic, input.userName ?? "", input.isArabic ? pickNotificationVariation([`استحقاق بقيمة ${amount} ج.م.`, `تذكير مالي بسيط: ${amount} ج.م مستحقة.`, `جهّز ${amount} ج.م لهذا الالتزام.`], `${key}:body`) : pickNotificationVariation([`An amount of ${amount} EGP is due.`, `A quick money reminder: ${amount} EGP is due.`, `Set aside ${amount} EGP for this commitment.`], `${key}:body`)),
        target: { kind: "finance", id: input.entryId },
      },
      dueAt,
    )];
    const earlyAt = new Date(dueAt.getTime() - Math.max(0, input.earlyReminderMinutes ?? 0) * 60_000);
    if ((input.earlyReminderMinutes ?? 0) > 0 && earlyAt.getTime() > Date.now()) notifications.push(scheduleHighPriorityNotification(
      {
        title: input.isArabic ? pickNotificationVariation([`تنبيه مبكر: ${input.title}`, `استحقاق قريب: ${input.title}`, `جهّز التزامك: ${input.title}`], `${key}:early-title`) : pickNotificationVariation([`Early alert: ${input.title}`, `Due soon: ${input.title}`, `Prepare this commitment: ${input.title}`], `${key}:early-title`),
        body: personalizeReminderBody(input.isArabic, input.userName ?? "", input.isArabic ? pickNotificationVariation([`باقي ${input.earlyReminderMinutes} دقيقة على استحقاق ${amount} ج.م.`, `بعد ${input.earlyReminderMinutes} دقيقة يحين استحقاق ${amount} ج.م.`, `تذكير مبكر: ${amount} ج.م مستحقة خلال ${input.earlyReminderMinutes} دقيقة.`], `${key}:early-body`) : pickNotificationVariation([`${input.earlyReminderMinutes} minutes remain before ${amount} EGP is due.`, `${amount} EGP is due in ${input.earlyReminderMinutes} minutes.`, `Early reminder: ${amount} EGP is due in ${input.earlyReminderMinutes} minutes.`], `${key}:early-body`)),
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
