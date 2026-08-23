import { cancelScheduledOmniNotification, scheduleHabitReminderNotification } from "@/lib/omni-notifications";
import type { ContactRelationshipReminder } from "@/lib/contact-reminder-rules";

export async function scheduleContactRelationshipReminder(input: {
  contactId: string;
  contactName: string;
  reminder: Pick<ContactRelationshipReminder, "purpose" | "cadence" | "at">;
  isArabic: boolean;
  body?: string;
}) {
  const purpose = input.reminder.purpose.trim();
  return scheduleHabitReminderNotification(
    {
      title: input.isArabic ? `تذكير للتواصل مع ${input.contactName}` : `Time to connect with ${input.contactName}`,
      body: input.body?.trim() || (purpose
        ? (input.isArabic ? `بخصوص: ${purpose}` : `Purpose: ${purpose}`)
        : (input.isArabic ? "خصص دقائق قصيرة للتواصل والاطمئنان." : "Set aside a few minutes to connect and check in.")),
      target: { kind: "relationships", id: input.contactId },
      section: "habits",
    },
    new Date(input.reminder.at),
    input.reminder.cadence,
  );
}

export async function cancelContactRelationshipReminder(identifier?: string | null) {
  await cancelScheduledOmniNotification(identifier);
}
