import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { requestOmniNotificationPermissions } from "@/lib/omni-notifications";

export type RemotePushRegistration = { expoPushToken: string; platform: "ios" | "android"; optedIn: boolean };
export type RemotePushRegistrationFailureReason = "web" | "physical-device-required" | "permission-denied" | "permission-error" | "missing-project-id" | "token-error" | "server-error";
export type RemotePushRegistrationResult =
  | { registered: true; expoPushToken: string }
  | { registered: false; reason: RemotePushRegistrationFailureReason; detail?: string };

function safeDetail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").trim().slice(0, 220) || "Unknown push-registration error.";
}

/** Obtains a remote Expo push token only on a real, opted-in iOS or Android device. */
export async function registerOmniRemotePushDevice(save: (registration: RemotePushRegistration) => Promise<unknown>): Promise<RemotePushRegistrationResult> {
  if (Platform.OS === "web") return { registered: false, reason: "web" };
  if (!Device.isDevice) return { registered: false, reason: "physical-device-required" };

  let permission: Awaited<ReturnType<typeof requestOmniNotificationPermissions>>;
  try {
    permission = await requestOmniNotificationPermissions();
  } catch (error) {
    return { registered: false, reason: "permission-error", detail: safeDetail(error) };
  }
  if (permission !== "granted") return { registered: false, reason: "permission-denied" };

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (typeof projectId !== "string" || !projectId) return { registered: false, reason: "missing-project-id" };

  let expoPushToken: string;
  try {
    expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (error) {
    return { registered: false, reason: "token-error", detail: safeDetail(error) };
  }

  try {
    const platform = Platform.OS === "ios" ? "ios" : "android";
    await save({ expoPushToken, platform, optedIn: true });
  } catch (error) {
    return { registered: false, reason: "server-error", detail: safeDetail(error) };
  }
  return { registered: true, expoPushToken };
}
