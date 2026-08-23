import * as IntentLauncher from "expo-intent-launcher";
import { Platform } from "react-native";

type FocusDndNativeModule = {
  isAvailableAsync: () => Promise<boolean>;
  hasPolicyAccessAsync: () => Promise<boolean>;
  requestPolicyAccessAsync: () => Promise<boolean>;
  setFocusDndAsync: (enabled: boolean) => Promise<boolean>;
};

function nativeModule(): FocusDndNativeModule | null {
  if (Platform.OS !== "android") return null;
  try {
    return require("../modules/expo-focus-dnd").default as FocusDndNativeModule;
  } catch {
    return null;
  }
}

export type FocusDndStatus = "active" | "ready" | "needs_access" | "unavailable";

export async function getFocusDndStatus(enabled: boolean): Promise<FocusDndStatus> {
  if (!enabled || Platform.OS !== "android") return "unavailable";
  const module = nativeModule();
  if (!module || !(await module.isAvailableAsync())) return "unavailable";
  return (await module.hasPolicyAccessAsync()) ? "ready" : "needs_access";
}

export async function requestFocusDndAccess(): Promise<"opened" | "unavailable"> {
  if (Platform.OS !== "android") return "unavailable";
  const module = nativeModule();
  if (module && await module.isAvailableAsync()) {
    await module.requestPolicyAccessAsync();
    return "opened";
  }
  try {
    await IntentLauncher.startActivityAsync("android.settings.NOTIFICATION_POLICY_ACCESS_SETTINGS");
    return "opened";
  } catch {
    return "unavailable";
  }
}

export async function setFocusDoNotDisturb(enabled: boolean): Promise<boolean> {
  const module = nativeModule();
  if (!module || !(await module.isAvailableAsync()) || !(await module.hasPolicyAccessAsync())) return false;
  return module.setFocusDndAsync(enabled);
}
