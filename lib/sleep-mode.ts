export type SleepModePreferences = {
  enabled: boolean;
  startsAtMinutes: number;
  endsAtMinutes: number;
};

export const DEFAULT_SLEEP_MODE_PREFERENCES: SleepModePreferences = {
  enabled: false,
  startsAtMinutes: 23 * 60,
  endsAtMinutes: 7 * 60,
};

export function normalizeMinutesAfterMidnight(value: number, fallback: number) {
  return Number.isFinite(value) && value >= 0 && value < 24 * 60 ? Math.round(value) : fallback;
}

export function normalizeSleepModePreferences(value?: Partial<SleepModePreferences>): SleepModePreferences {
  return {
    enabled: Boolean(value?.enabled),
    startsAtMinutes: normalizeMinutesAfterMidnight(value?.startsAtMinutes ?? DEFAULT_SLEEP_MODE_PREFERENCES.startsAtMinutes, DEFAULT_SLEEP_MODE_PREFERENCES.startsAtMinutes),
    endsAtMinutes: normalizeMinutesAfterMidnight(value?.endsAtMinutes ?? DEFAULT_SLEEP_MODE_PREFERENCES.endsAtMinutes, DEFAULT_SLEEP_MODE_PREFERENCES.endsAtMinutes),
  };
}

/** Returns whether a moment sits in a quiet window, including a window that crosses midnight. */
export function isSleepModeActive(preferences: SleepModePreferences, at: Date = new Date()) {
  if (!preferences.enabled || preferences.startsAtMinutes === preferences.endsAtMinutes) return false;
  const minute = at.getHours() * 60 + at.getMinutes();
  if (preferences.startsAtMinutes < preferences.endsAtMinutes) {
    return minute >= preferences.startsAtMinutes && minute < preferences.endsAtMinutes;
  }
  return minute >= preferences.startsAtMinutes || minute < preferences.endsAtMinutes;
}

export function sleepModeMinutesToDate(minutes: number, reference: Date = new Date()) {
  const value = normalizeMinutesAfterMidnight(minutes, 0);
  const next = new Date(reference);
  next.setHours(Math.floor(value / 60), value % 60, 0, 0);
  return next;
}
