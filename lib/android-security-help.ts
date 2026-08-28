import * as Application from "expo-application";
import * as IntentLauncher from "expo-intent-launcher";
import { Platform } from "react-native";

const FALLBACK_PACKAGE = "com.app.omnilifecenter";

function isAndroid() {
  return Platform.OS === "android";
}

export async function openOmniLifeAppSettings(): Promise<boolean> {
  if (!isAndroid()) return false;
  try {
    await IntentLauncher.startActivityAsync("android.settings.APPLICATION_DETAILS_SETTINGS", {
      data: `package:${Application.applicationId ?? FALLBACK_PACKAGE}`,
    });
    return true;
  } catch {
    return false;
  }
}

export async function openPlayProtectSettings(): Promise<boolean> {
  if (!isAndroid()) return false;
  try {
    await IntentLauncher.startActivityAsync("android.settings.PLAY_PROTECT_SETTINGS");
    return true;
  } catch {
    try {
      await IntentLauncher.startActivityAsync("android.settings.SECURITY_SETTINGS");
      return true;
    } catch {
      return false;
    }
  }
}
