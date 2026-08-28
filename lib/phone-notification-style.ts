import type { NotificationSoundSection } from "./notification-sound-service";
import { normalizeAndroidNotificationColor } from "./notification-color";

type PhoneNotificationCopy = { title: string; body: string };

const SECTION_PRESENTATION: Record<NotificationSoundSection, { label: string; color: string }> = {
  tasks: { label: "المهام والتركيز", color: "#38D8FF" },
  habits: { label: "العادات اليومية", color: "#4FE1A8" },
  finance: { label: "الماليات", color: "#FFC36B" },
  persona: { label: "مساعدك اليومي", color: "#B59CFF" },
  evening: { label: "إغلاق اليوم", color: "#7DD3FC" },
  admin: { label: "تحديث من OMNI LIFE", color: "#ff8dc7" },
};

function compact(value: string, limit: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= limit ? normalized : `${normalized.slice(0, limit - 1).trimEnd()}…`;
}

/** Gives native phone notifications a concise, consistent OMNI LIFE heading and readable two-line body. */
export function formatPhoneNotification(section: NotificationSoundSection, copy: PhoneNotificationCopy) {
  const presentation = SECTION_PRESENTATION[section];
  const heading = compact(copy.title, 72);
  const message = compact(copy.body, 160);
  const isAdministrator = section === "admin";
  return {
    title: isAdministrator ? "OMNI LIFE" : `OMNI LIFE · ${presentation.label}`,
    body: heading && message ? `${heading}\n${message}` : heading || message || (isAdministrator ? "لديك تحديث جديد." : "لديك تنبيه جديد داخل التطبيق."),
    color: normalizeAndroidNotificationColor(presentation.color, "#38D8FF") ?? "#38D8FF",
  };
}

export function phoneNotificationChannelDescription(section: NotificationSoundSection) {
  return `تنبيهات OMNI LIFE الخاصة بـ ${SECTION_PRESENTATION[section].label}.`;
}
