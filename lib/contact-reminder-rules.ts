export const CONTACT_REMINDER_CADENCES = ["daily", "weekly", "monthly"] as const;

export type ContactReminderCadence = (typeof CONTACT_REMINDER_CADENCES)[number];

export type ContactRelationshipReminder = {
  purpose: string;
  cadence: ContactReminderCadence;
  at: string;
  enabled: boolean;
  notificationId?: string;
};

export function isContactReminderCadence(value: unknown): value is ContactReminderCadence {
  return typeof value === "string" && (CONTACT_REMINDER_CADENCES as readonly string[]).includes(value);
}

export function contactReminderCadenceLabel(cadence: ContactReminderCadence, isArabic: boolean) {
  if (cadence === "daily") return isArabic ? "يوميًا" : "Daily";
  if (cadence === "weekly") return isArabic ? "أسبوعيًا" : "Weekly";
  return isArabic ? "شهريًا" : "Monthly";
}
