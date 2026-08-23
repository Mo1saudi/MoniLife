import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { DEFAULT_SLEEP_MODE_PREFERENCES, isSleepModeActive, normalizeSleepModePreferences, type SleepModePreferences } from "./sleep-mode";

export type NotificationSoundSection = "tasks" | "habits" | "finance" | "persona" | "evening" | "admin";
export type SoundPreferences = { useCustomSounds: boolean; sleepMode: SleepModePreferences };
export const OMNI_HIGH_PRIORITY_CHANNEL = "omni-life-high-priority";
export const SHORT_NOTIFICATION_EFFECT_DURATION_SECONDS = 1.7;

export const SOUND_PREFERENCES_STORAGE_KEY = "omni-life:notification-sounds:v1";
export const DEFAULT_SOUND_PREFERENCES: SoundPreferences = { useCustomSounds: true, sleepMode: DEFAULT_SLEEP_MODE_PREFERENCES };

const SOUND_SIGNATURES: Record<NotificationSoundSection, { channelId: string; channelName: string; fileName: string; quietFileName: string; vibration: number[]; durationSeconds: number; asset: number; quietAsset: number }> = {
  tasks: { channelId: "omni-life-tasks", channelName: "OMNI LIFE · Tasks & focus", fileName: "sound_tasks.wav", quietFileName: "sound_tasks_sleep.wav", vibration: [0, 90, 70, 90], durationSeconds: SHORT_NOTIFICATION_EFFECT_DURATION_SECONDS, asset: require("@/assets/audio/sound_tasks.wav"), quietAsset: require("@/assets/audio/sound_tasks_sleep.wav") },
  habits: { channelId: "omni-life-habits", channelName: "OMNI LIFE · Habits", fileName: "sound_habits.wav", quietFileName: "sound_habits_sleep.wav", vibration: [0, 80, 90, 120], durationSeconds: SHORT_NOTIFICATION_EFFECT_DURATION_SECONDS, asset: require("@/assets/audio/sound_habits.wav"), quietAsset: require("@/assets/audio/sound_habits_sleep.wav") },
  finance: { channelId: "omni-life-finance", channelName: "OMNI LIFE · Finance", fileName: "sound_finance.wav", quietFileName: "sound_finance_sleep.wav", vibration: [0, 60, 70, 60], durationSeconds: SHORT_NOTIFICATION_EFFECT_DURATION_SECONDS, asset: require("@/assets/audio/sound_finance.wav"), quietAsset: require("@/assets/audio/sound_finance_sleep.wav") },
  persona: { channelId: "omni-life-persona", channelName: "OMNI LIFE · Advisor", fileName: "sound_persona.wav", quietFileName: "sound_persona_sleep.wav", vibration: [0, 70, 130], durationSeconds: SHORT_NOTIFICATION_EFFECT_DURATION_SECONDS, asset: require("@/assets/audio/sound_persona.wav"), quietAsset: require("@/assets/audio/sound_persona_sleep.wav") },
  evening: { channelId: "omni-life-evening", channelName: "OMNI LIFE · Evening closure", fileName: "sound_evening.wav", quietFileName: "sound_evening_sleep.wav", vibration: [0, 55, 180], durationSeconds: SHORT_NOTIFICATION_EFFECT_DURATION_SECONDS, asset: require("@/assets/audio/sound_evening.wav"), quietAsset: require("@/assets/audio/sound_evening_sleep.wav") },
  admin: { channelId: "omni-life-admin", channelName: "OMNI LIFE · Administration", fileName: "sound_admin.wav", quietFileName: "sound_admin_sleep.wav", vibration: [0, 110, 90, 110], durationSeconds: SHORT_NOTIFICATION_EFFECT_DURATION_SECONDS, asset: require("@/assets/audio/sound_admin.wav"), quietAsset: require("@/assets/audio/sound_admin_sleep.wav") },
};

let activePreferences: SoundPreferences = DEFAULT_SOUND_PREFERENCES;

export function getNotificationSoundSection(section?: NotificationSoundSection): NotificationSoundSection { return section ?? "tasks"; }
export function isVeryQuietSleepMode(at: Date = new Date()) { return isSleepModeActive(activePreferences.sleepMode, at); }
export function getSoundFile(section: NotificationSoundSection, at: Date = new Date()) { const signature = SOUND_SIGNATURES[section]; return activePreferences.useCustomSounds ? (isVeryQuietSleepMode(at) ? signature.quietFileName : signature.fileName) : "default"; }
export function getSoundChannel(section: NotificationSoundSection, at: Date = new Date()) { return `${SOUND_SIGNATURES[section].channelId}-${activePreferences.useCustomSounds ? (isVeryQuietSleepMode(at) ? "sleep" : "custom") : "system"}`; }

export async function loadSoundPreferences(): Promise<SoundPreferences> {
  const stored = await AsyncStorage.getItem(SOUND_PREFERENCES_STORAGE_KEY);
  try { const parsed = stored ? JSON.parse(stored) as Partial<SoundPreferences> : {}; activePreferences = { ...DEFAULT_SOUND_PREFERENCES, ...parsed, sleepMode: normalizeSleepModePreferences(parsed.sleepMode) }; } catch { activePreferences = DEFAULT_SOUND_PREFERENCES; }
  await configureNotificationSoundChannels(activePreferences.useCustomSounds);
  return activePreferences;
}

export async function saveSoundPreferences(next: SoundPreferences) {
  activePreferences = { ...next, sleepMode: normalizeSleepModePreferences(next.sleepMode) };
  await AsyncStorage.setItem(SOUND_PREFERENCES_STORAGE_KEY, JSON.stringify(activePreferences));
  await configureNotificationSoundChannels(next.useCustomSounds);
}

export async function configureNotificationSoundChannels(useCustomSounds = activePreferences.useCustomSounds) {
  activePreferences = { ...activePreferences, useCustomSounds };
  if (Platform.OS !== "android") return;
  const channels = Object.values(SOUND_SIGNATURES).flatMap((signature) => [Notifications.setNotificationChannelAsync(`${signature.channelId}-${useCustomSounds ? "custom" : "system"}`, {
    name: signature.channelName,
    description: "Section-specific OMNI LIFE notification channel",
    importance: Notifications.AndroidImportance.MAX,
    sound: useCustomSounds ? signature.fileName : "default",
    enableVibrate: true,
    vibrationPattern: signature.vibration,
    enableLights: true,
    lightColor: "#38D8FF",
    showBadge: true,
  }), Notifications.setNotificationChannelAsync(`${signature.channelId}-sleep`, {
    name: `${signature.channelName} · Sleep Mode`,
    description: "Very quiet OMNI LIFE notification channel",
    importance: Notifications.AndroidImportance.LOW,
    sound: useCustomSounds ? signature.quietFileName : "default",
    enableVibrate: false,
    enableLights: false,
    showBadge: true,
  })]);
  await Promise.all([...channels, Notifications.setNotificationChannelAsync(OMNI_HIGH_PRIORITY_CHANNEL, {
    name: "OMNI LIFE · Instant alerts",
    description: "Brief high-priority OMNI LIFE sound effects",
    importance: Notifications.AndroidImportance.MAX,
    sound: useCustomSounds ? SOUND_SIGNATURES.admin.fileName : "default",
    enableVibrate: true,
    vibrationPattern: [0, 90, 70, 90],
    enableLights: true,
    lightColor: "#38D8FF",
    showBadge: true,
  })]);
}

export async function previewNotificationSound(section: NotificationSoundSection) {
  await setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  const signature = SOUND_SIGNATURES[section];
  const player = createAudioPlayer(isVeryQuietSleepMode() ? signature.quietAsset : signature.asset);
  player.seekTo(0);
  player.play();
  setTimeout(() => player.remove(), (SOUND_SIGNATURES[section].durationSeconds + 0.35) * 1_000);
}

export const SECTION_SOUND_SIGNATURES = SOUND_SIGNATURES;
