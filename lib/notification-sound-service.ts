import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { DEFAULT_SLEEP_MODE_PREFERENCES, isSleepModeActive, normalizeSleepModePreferences, type SleepModePreferences } from "./sleep-mode";
import { normalizeAndroidNotificationColor } from "./notification-color";

export type NotificationSoundSection = "tasks" | "habits" | "finance" | "persona" | "evening" | "admin";
export type NotificationSoundVariant = 0 | 1 | 2;
export type SoundPreferences = { useCustomSounds: boolean; sleepMode: SleepModePreferences };
export const OMNI_HIGH_PRIORITY_CHANNEL = "omni-life-high-priority";
export const SHORT_NOTIFICATION_EFFECT_DURATION_SECONDS = 1.7;

export const SOUND_PREFERENCES_STORAGE_KEY = "omni-life:notification-sounds:v1";
export const DEFAULT_SOUND_PREFERENCES: SoundPreferences = { useCustomSounds: true, sleepMode: DEFAULT_SLEEP_MODE_PREFERENCES };

const SOUND_SIGNATURES: Record<NotificationSoundSection, { channelId: string; channelName: string; description: string; lightColor: string; fileName: string; quietFileName: string; vibration: number[]; durationSeconds: number; asset: number; quietAsset: number }> = {
  tasks: { channelId: "omni-life-tasks", channelName: "OMNI LIFE · المهام والتركيز", description: "تذكيرات المهام وجلسات التركيز المهمة.", lightColor: "#38D8FF", fileName: "sound_tasks.wav", quietFileName: "sound_tasks_sleep.wav", vibration: [0, 90, 70, 90], durationSeconds: SHORT_NOTIFICATION_EFFECT_DURATION_SECONDS, asset: require("@/assets/audio/sound_tasks.wav"), quietAsset: require("@/assets/audio/sound_tasks_sleep.wav") },
  habits: { channelId: "omni-life-habits", channelName: "OMNI LIFE · العادات اليومية", description: "تذكيرات العادات والمتابعة اليومية.", lightColor: "#4FE1A8", fileName: "sound_habits.wav", quietFileName: "sound_habits_sleep.wav", vibration: [0, 80, 90, 120], durationSeconds: SHORT_NOTIFICATION_EFFECT_DURATION_SECONDS, asset: require("@/assets/audio/sound_habits.wav"), quietAsset: require("@/assets/audio/sound_habits_sleep.wav") },
  finance: { channelId: "omni-life-finance", channelName: "OMNI LIFE · الماليات", description: "تنبيهات الإنفاق والميزانية والالتزامات المالية.", lightColor: "#FFC36B", fileName: "sound_finance.wav", quietFileName: "sound_finance_sleep.wav", vibration: [0, 60, 70, 60], durationSeconds: SHORT_NOTIFICATION_EFFECT_DURATION_SECONDS, asset: require("@/assets/audio/sound_finance.wav"), quietAsset: require("@/assets/audio/sound_finance_sleep.wav") },
  persona: { channelId: "omni-life-persona", channelName: "OMNI LIFE · مساعدك اليومي", description: "الملخصات الذكية والمراجعات الأسبوعية.", lightColor: "#B59CFF", fileName: "sound_persona.wav", quietFileName: "sound_persona_sleep.wav", vibration: [0, 70, 130], durationSeconds: SHORT_NOTIFICATION_EFFECT_DURATION_SECONDS, asset: require("@/assets/audio/sound_persona.wav"), quietAsset: require("@/assets/audio/sound_persona_sleep.wav") },
  evening: { channelId: "omni-life-evening", channelName: "OMNI LIFE · إغلاق اليوم", description: "تنبيهات الهدوء والمراجعة المسائية.", lightColor: "#7DD3FC", fileName: "sound_evening.wav", quietFileName: "sound_evening_sleep.wav", vibration: [0, 55, 180], durationSeconds: SHORT_NOTIFICATION_EFFECT_DURATION_SECONDS, asset: require("@/assets/audio/sound_evening.wav"), quietAsset: require("@/assets/audio/sound_evening_sleep.wav") },
  admin: { channelId: "omni-life-admin", channelName: "OMNI LIFE · تحديثات الإدارة", description: "إعلانات وتحديثات الإدارة وحالة الاشتراك.", lightColor: "#ff8dc7", fileName: "sound_admin.wav", quietFileName: "sound_admin_sleep.wav", vibration: [0, 110, 90, 110], durationSeconds: SHORT_NOTIFICATION_EFFECT_DURATION_SECONDS, asset: require("@/assets/audio/sound_admin.wav"), quietAsset: require("@/assets/audio/sound_admin_sleep.wav") },
};

const SOUND_VARIANTS: Record<NotificationSoundSection, readonly [NotificationSoundSection, NotificationSoundSection, NotificationSoundSection]> = {
  tasks: ["tasks", "persona", "habits"], habits: ["habits", "evening", "tasks"], finance: ["finance", "admin", "persona"], persona: ["persona", "tasks", "evening"], evening: ["evening", "habits", "persona"], admin: ["admin", "finance", "tasks"],
};

let activePreferences: SoundPreferences = DEFAULT_SOUND_PREFERENCES;

export function getNotificationSoundSection(section?: NotificationSoundSection): NotificationSoundSection { return section ?? "tasks"; }
export function isVeryQuietSleepMode(at: Date = new Date()) { return isSleepModeActive(activePreferences.sleepMode, at); }
export function normalizeNotificationSoundVariant(value?: number): NotificationSoundVariant { return value === 1 || value === 2 ? value : 0; }
function soundSignatureForVariant(section: NotificationSoundSection, variant: NotificationSoundVariant) { return SOUND_SIGNATURES[SOUND_VARIANTS[section][variant]]; }
export function getSoundFile(section: NotificationSoundSection, at: Date = new Date(), variant: NotificationSoundVariant = 0) { const signature = soundSignatureForVariant(section, variant); return activePreferences.useCustomSounds ? (isVeryQuietSleepMode(at) ? signature.quietFileName : signature.fileName) : "default"; }
export function getSoundChannel(section: NotificationSoundSection, at: Date = new Date(), variant: NotificationSoundVariant = 0) { const mode = activePreferences.useCustomSounds ? (isVeryQuietSleepMode(at) ? "sleep" : "custom") : "system"; return `${SOUND_SIGNATURES[section].channelId}-${mode}-${normalizeNotificationSoundVariant(variant)}`; }

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
  const channels = Object.entries(SOUND_SIGNATURES).flatMap(([section, signature]) => ([0, 1, 2] as const).flatMap((variant) => {
    const sound = soundSignatureForVariant(section as NotificationSoundSection, variant);
    const mode = useCustomSounds ? "custom" : "system";
    return [
      Notifications.setNotificationChannelAsync(`${signature.channelId}-${mode}-${variant}`, { name: signature.channelName, description: signature.description, importance: Notifications.AndroidImportance.MAX, sound: useCustomSounds ? sound.fileName : "default", enableVibrate: true, vibrationPattern: signature.vibration, enableLights: true, lightColor: normalizeAndroidNotificationColor(signature.lightColor, "#38D8FF") ?? "#38D8FF", showBadge: true }),
      Notifications.setNotificationChannelAsync(`${signature.channelId}-sleep-${variant}`, { name: `${signature.channelName} · Sleep Mode`, description: `وضع نوم هادئ جدًا · ${signature.description}`, importance: Notifications.AndroidImportance.LOW, sound: useCustomSounds ? sound.quietFileName : "default", enableVibrate: false, enableLights: false, showBadge: true }),
    ];
  }));
  await Promise.all([...channels, Notifications.setNotificationChannelAsync(OMNI_HIGH_PRIORITY_CHANNEL, { name: "OMNI LIFE · Instant alerts", description: "Brief high-priority OMNI LIFE sound effects", importance: Notifications.AndroidImportance.MAX, sound: useCustomSounds ? SOUND_SIGNATURES.admin.fileName : "default", enableVibrate: true, vibrationPattern: [0, 90, 70, 90], enableLights: true, lightColor: normalizeAndroidNotificationColor("#38D8FF", "#38D8FF") ?? "#38D8FF", showBadge: true })]);
}

export async function previewNotificationSound(section: NotificationSoundSection, variant: NotificationSoundVariant = 0) {
  await setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  const signature = soundSignatureForVariant(section, variant);
  const player = createAudioPlayer(isVeryQuietSleepMode() ? signature.quietAsset : signature.asset);
  player.seekTo(0);
  player.play();
  setTimeout(() => player.remove(), (signature.durationSeconds + 0.35) * 1_000);
}

export const SECTION_SOUND_SIGNATURES = SOUND_SIGNATURES;
