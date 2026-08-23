import { Platform } from "react-native";

type NativeBackgroundModule = {
  isAvailableAsync: () => Promise<boolean>;
  schedulePersistentReminderAsync: (id: string, title: string, body: string, atMillis: number, route: string, channelId: string, repeat: string) => Promise<boolean>;
  cancelPersistentReminderAsync: (id: string) => Promise<boolean>;
  getBackgroundReliabilityStatusAsync: () => Promise<{ available: boolean; exactAlarmAllowed: boolean; batteryOptimizationIgnored: boolean }>;
  openExactAlarmSettingsAsync: () => Promise<boolean>;
  openBatteryOptimizationSettingsAsync: () => Promise<boolean>;
};

function nativeModule(): NativeBackgroundModule | null {
  if (Platform.OS !== "android") return null;
  try { return require("../modules/expo-focus-dnd").default as NativeBackgroundModule; } catch { return null; }
}

export type BackgroundReliabilityStatus = { available: boolean; exactAlarmAllowed: boolean; batteryOptimizationIgnored: boolean };

export async function getAndroidBackgroundReliabilityStatus(): Promise<BackgroundReliabilityStatus> {
  const module = nativeModule();
  if (!module || !(await module.isAvailableAsync())) return { available: false, exactAlarmAllowed: false, batteryOptimizationIgnored: false };
  return module.getBackgroundReliabilityStatusAsync();
}

export async function scheduleAndroidPersistentReminder(input: { id: string; title: string; body: string; at: Date; route: string; channelId: string; repeat?: "once" | "daily" | "weekly" | "monthly" | "yearly" }) {
  const module = nativeModule();
  if (!module || !(await module.isAvailableAsync()) || input.at.getTime() <= Date.now()) return null;
  return (await module.schedulePersistentReminderAsync(input.id, input.title, input.body, input.at.getTime(), input.route, input.channelId, input.repeat ?? "once")) ? input.id : null;
}

export async function cancelAndroidPersistentReminder(id?: string | null) {
  if (!id) return false;
  const module = nativeModule();
  if (!module || !(await module.isAvailableAsync())) return false;
  return module.cancelPersistentReminderAsync(id);
}

export async function openAndroidExactAlarmSettings() {
  const module = nativeModule();
  return module && await module.isAvailableAsync() ? module.openExactAlarmSettingsAsync() : false;
}

export async function openAndroidBatteryOptimizationSettings() {
  const module = nativeModule();
  return module && await module.isAvailableAsync() ? module.openBatteryOptimizationSettingsAsync() : false;
}
