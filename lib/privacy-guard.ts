import AsyncStorage from "@react-native-async-storage/async-storage";

const PRIVACY_PREFERENCES_KEY = "omni-life:privacy-preferences:v1";

export type PrivacyPreferences = {
  appLockEnabled: boolean;
  hideSensitivePreviews: boolean;
  lockAfterBackgroundMs: number;
};

export const DEFAULT_PRIVACY_PREFERENCES: PrivacyPreferences = {
  appLockEnabled: false,
  hideSensitivePreviews: false,
  lockAfterBackgroundMs: 15_000,
};

let cachedPreferences = DEFAULT_PRIVACY_PREFERENCES;

export function normalizePrivacyPreferences(value: Partial<PrivacyPreferences> | null | undefined): PrivacyPreferences {
  return {
    appLockEnabled: Boolean(value?.appLockEnabled),
    hideSensitivePreviews: Boolean(value?.hideSensitivePreviews),
    lockAfterBackgroundMs: Math.max(5_000, Math.min(300_000, Number(value?.lockAfterBackgroundMs) || DEFAULT_PRIVACY_PREFERENCES.lockAfterBackgroundMs)),
  };
}

export function shouldLockAfterBackground(preferences: PrivacyPreferences, elapsedMs: number) {
  return preferences.appLockEnabled && elapsedMs >= preferences.lockAfterBackgroundMs;
}

export function hideSensitiveNotificationContent() {
  return cachedPreferences.hideSensitivePreviews;
}

export async function loadPrivacyPreferences() {
  try {
    const raw = await AsyncStorage.getItem(PRIVACY_PREFERENCES_KEY);
    cachedPreferences = normalizePrivacyPreferences(raw ? JSON.parse(raw) as Partial<PrivacyPreferences> : null);
  } catch {
    cachedPreferences = DEFAULT_PRIVACY_PREFERENCES;
  }
  return cachedPreferences;
}

export async function savePrivacyPreferences(value: PrivacyPreferences) {
  cachedPreferences = normalizePrivacyPreferences(value);
  await AsyncStorage.setItem(PRIVACY_PREFERENCES_KEY, JSON.stringify(cachedPreferences));
  return cachedPreferences;
}
