import { cancelScheduledOmniNotification, scheduleHabitReminderNotification } from "@/lib/omni-notifications";
import type { ContactRelationshipReminder } from "@/lib/contact-reminder-rules";
import { pickNotificationVariation } from "@/lib/notification-rotation";
import { personalizeReminderBody } from "@/lib/personalized-notification-copy";

export async function scheduleContactRelationshipReminder(input: {
  contactId: string;
  contactName: string;
  reminder: Pick<ContactRelationshipReminder, "purpose" | "cadence" | "at">;
  isArabic: boolean;
  body?: string;
  userName?: string;
}) {
  const purpose = input.reminder.purpose.trim();
  const at = new Date(input.reminder.at);
  const key = `${input.contactId}:${at.toISOString()}`;
  const title = input.isArabic
    ? pickNotificationVariation([`تذكير للتواصل مع ${input.contactName}`, `وقت لطيف للاطمئنان على ${input.contactName}`, `لا تنسَ التواصل مع ${input.contactName}`], `${key}:title`)
    : pickNotificationVariation([`Time to connect with ${input.contactName}`, `A gentle check-in with ${input.contactName}`, `Remember to reach out to ${input.contactName}`], `${key}:title`);
  const body = input.body?.trim() || (purpose
    ? (input.isArabic ? pickNotificationVariation([`بخصوص: ${purpose}`, `سبب التواصل: ${purpose}`, `رتّب دقائق للحديث عن: ${purpose}`], `${key}:body`) : pickNotificationVariation([`Purpose: ${purpose}`, `A quick reason to connect: ${purpose}`, `Set aside time to discuss: ${purpose}`], `${key}:body`))
    : (input.isArabic ? pickNotificationVariation(["خصص دقائق قصيرة للتواصل والاطمئنان.", "رسالة بسيطة قد تصنع فرقًا اليوم.", "تواصل قصير يحافظ على العلاقة."], `${key}:body`) : pickNotificationVariation(["Set aside a few minutes to connect and check in.", "A simple message can make a difference today.", "A short check-in helps the relationship stay close."], `${key}:body`)));
  return scheduleHabitReminderNotification(
    {
      title,
      body: personalizeReminderBody(input.isArabic, input.userName ?? "", body),
      target: { kind: "relationships", id: input.contactId },
    },
    at,
    input.reminder.cadence,
  );
}

export async function cancelContactRelationshipReminder(identifier?: string | null) {
  await cancelScheduledOmniNotification(identifier);
}
