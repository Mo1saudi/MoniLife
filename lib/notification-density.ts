import AsyncStorage from "@react-native-async-storage/async-storage";

export type NotificationDensity = "calm" | "balanced" | "focused";
export type GlobalNotificationDensity = NotificationDensity | "off";
export type NotificationDensitySection = "tasks" | "habits" | "finance" | "persona";
export type SectionDensityOverride = "inherit" | "off" | NotificationDensity;
export type NotificationDensityPreferences = { global: GlobalNotificationDensity; sections: Record<NotificationDensitySection, SectionDensityOverride> };

export const DEFAULT_NOTIFICATION_DENSITY_PREFERENCES: NotificationDensityPreferences = {
  global: "balanced",
  sections: { tasks: "inherit", habits: "inherit", finance: "inherit", persona: "inherit" },
};

const DENSITIES: NotificationDensity[] = ["calm", "balanced", "focused"];
const GLOBAL_DENSITIES: GlobalNotificationDensity[] = ["off", ...DENSITIES];
const OVERRIDES: SectionDensityOverride[] = ["inherit", "off", ...DENSITIES];
const STORAGE_KEY = "omni-life:notification-density:v1";

export function normalizeNotificationDensityPreferences(value: unknown): NotificationDensityPreferences {
  const candidate = value && typeof value === "object" ? value as Partial<NotificationDensityPreferences> : {};
  const rawSections: Partial<Record<NotificationDensitySection, SectionDensityOverride>> = candidate.sections && typeof candidate.sections === "object" ? candidate.sections : {};
  return {
    global: GLOBAL_DENSITIES.includes(candidate.global as GlobalNotificationDensity) ? candidate.global as GlobalNotificationDensity : DEFAULT_NOTIFICATION_DENSITY_PREFERENCES.global,
    sections: {
      tasks: OVERRIDES.includes(rawSections.tasks as SectionDensityOverride) ? rawSections.tasks as SectionDensityOverride : "inherit",
      habits: OVERRIDES.includes(rawSections.habits as SectionDensityOverride) ? rawSections.habits as SectionDensityOverride : "inherit",
      finance: OVERRIDES.includes(rawSections.finance as SectionDensityOverride) ? rawSections.finance as SectionDensityOverride : "inherit",
      persona: OVERRIDES.includes(rawSections.persona as SectionDensityOverride) ? rawSections.persona as SectionDensityOverride : "inherit",
    },
  };
}

export function getSectionNotificationDensity(preferences: NotificationDensityPreferences, section: NotificationDensitySection): NotificationDensity | "off" {
  if (preferences.global === "off") return "off";
  const selected = preferences.sections[section];
  return selected === "inherit" ? preferences.global : selected;
}

export function notificationDensitySignature(preferences: NotificationDensityPreferences) {
  const normalized = normalizeNotificationDensityPreferences(preferences);
  return `${normalized.global}:${normalized.sections.tasks}:${normalized.sections.habits}:${normalized.sections.finance}:${normalized.sections.persona}`;
}

export async function loadNotificationDensityPreferences(): Promise<NotificationDensityPreferences> {
  try { return normalizeNotificationDensityPreferences(JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? "null")); }
  catch { return DEFAULT_NOTIFICATION_DENSITY_PREFERENCES; }
}

export async function saveNotificationDensityPreferences(next: NotificationDensityPreferences) {
  const normalized = normalizeNotificationDensityPreferences(next);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}
