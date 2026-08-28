import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { isOmniAppDataStorageKey } from "@/lib/omni-app-data-keys";

export type ManualProfileSession = {
  id: string;
  fullName: string;
  birthDate: string | Date;
  email: string;
  phone: string;
  secondaryContact: string | null;
  telegramLinked?: boolean;
  /** Signed server session used for authenticated manual-account API calls such as push registration. */
  manualSessionToken?: string;
  /** Legacy field kept so older installed builds continue sending their administrator token. */
  manualAdminToken?: string;
};

const SESSION_KEY = "omni-life.manual-profile";
const WELCOME_KEY = "omni-life.welcome-seen";
const WELCOME_COMPLETED_AT_KEY = "omni-life.welcome-completed-at";

async function setValue(key: string, value: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getValue(key: string) {
  if (Platform.OS === "web") {
    const persistent = localStorage.getItem(key);
    if (persistent) return persistent;
    const legacy = sessionStorage.getItem(key);
    if (legacy) {
      localStorage.setItem(key, legacy);
      sessionStorage.removeItem(key);
    }
    return legacy;
  }
  return SecureStore.getItemAsync(key);
}

async function removeValue(key: string) {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function loadManualProfile() {
  const raw = await getValue(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ManualProfileSession;
  } catch {
    await removeValue(SESSION_KEY);
    return null;
  }
}

export async function saveManualProfile(profile: ManualProfileSession) {
  await setValue(SESSION_KEY, JSON.stringify(profile));
}

export async function clearManualProfile() {
  await removeValue(SESSION_KEY);
}

export async function loadWelcomeSeen() {
  if (Platform.OS === "web") return localStorage.getItem(WELCOME_KEY) === "true";
  return (await SecureStore.getItemAsync(WELCOME_KEY)) === "true";
}

export async function loadWelcomeCompletedAt() {
  const value = Platform.OS === "web" ? localStorage.getItem(WELCOME_COMPLETED_AT_KEY) : await SecureStore.getItemAsync(WELCOME_COMPLETED_AT_KEY);
  return value && !Number.isNaN(new Date(value).getTime()) ? value : null;
}

export async function markWelcomeSeen(completedAt = new Date().toISOString()) {
  if (Platform.OS === "web") {
    localStorage.setItem(WELCOME_KEY, "true");
    localStorage.setItem(WELCOME_COMPLETED_AT_KEY, completedAt);
    return completedAt;
  }
  await Promise.all([SecureStore.setItemAsync(WELCOME_KEY, "true"), SecureStore.setItemAsync(WELCOME_COMPLETED_AT_KEY, completedAt)]);
  return completedAt;
}

/** Clears app data while deliberately preserving the signed-in profile and welcome state. */
export async function clearOmniAppData() {
  if (Platform.OS === "web") {
    [localStorage, sessionStorage].forEach((storage) => {
      Array.from({ length: storage.length }, (_, index) => storage.key(index))
        .filter((key): key is string => isOmniAppDataStorageKey(key))
        .forEach((key) => storage.removeItem(key));
    });
    return;
  }
  const keys = await AsyncStorage.getAllKeys();
  const omniKeys = keys.filter(isOmniAppDataStorageKey);
  if (omniKeys.length) await AsyncStorage.multiRemove(omniKeys);
}

/** Clears every OMNI LIFE local value, including the signed-in manual profile. */
export async function clearOmniLocalData() {
  await clearOmniAppData();
  await Promise.all([removeValue(SESSION_KEY), removeValue(WELCOME_KEY), removeValue(WELCOME_COMPLETED_AT_KEY)]);
}
