import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { requestOmniNotificationPermissions } from "@/lib/omni-notifications";

export type RemotePushRegistration = { expoPushToken: string; platform: "ios" | "android"; optedIn: boolean };

/** Obtains a remote Expo push token only on a real, opted-in iOS or Android device. */
export async function registerOmniRemotePushDevice(save: (registration: RemotePushRegistration) => Promise<unknown>) {
  if (Platform.OS === "web") return { registered: false, reason: "web" as const };
  if (!Device.isDevice) return { registered: false, reason: "physical-device-required" as const };

  const permission = await requestOmniNotificationPermissions();
  if (permission !== "granted") return { registered: false, reason: "permission-denied" as const };

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (typeof projectId !== "string" || !projectId) return { registered: false, reason: "missing-project-id" as const };

  const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const platform = Platform.OS === "ios" ? "ios" : "android";
  await save({ expoPushToken, platform, optedIn: true });
  return { registered: true, expoPushToken } as const;
}
