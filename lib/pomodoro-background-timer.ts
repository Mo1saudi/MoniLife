import { Platform } from "react-native";

import OmniFocusDndModule from "@/modules/expo-focus-dnd/src/OmniFocusDndModule";

export async function startPomodoroBackgroundTimer(input: { title: string; subtitle: string; endAt: Date; route: string }) {
  if (Platform.OS !== "android" || input.endAt.getTime() <= Date.now()) return false;
  try {
    return await OmniFocusDndModule?.startPomodoroCountdownAsync(input.title, input.subtitle, input.endAt.getTime(), input.route) === true;
  } catch {
    return false;
  }
}

export async function stopPomodoroBackgroundTimer() {
  if (Platform.OS !== "android") return false;
  try {
    return await OmniFocusDndModule?.stopPomodoroCountdownAsync() === true;
  } catch {
    return false;
  }
}
