import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { restorePersistedTaskGeofences } from "@/lib/task-geofencing";
import { refreshAndroidTaskWidget } from "@/lib/task-widget";

export const OMNI_BACKGROUND_MAINTENANCE_TASK = "omni-life-background-maintenance";

if (Platform.OS === "android" && !TaskManager.isTaskDefined(OMNI_BACKGROUND_MAINTENANCE_TASK)) {
  TaskManager.defineTask(OMNI_BACKGROUND_MAINTENANCE_TASK, async () => {
    try {
      await Promise.allSettled([
        restorePersistedTaskGeofences(),
        refreshAndroidTaskWidget(),
      ]);
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

/** Registers an Android WorkManager job for non-urgent, consent-safe maintenance. */
export async function ensureAndroidBackgroundMaintenance(): Promise<boolean> {
  if (Platform.OS !== "android" || !(await TaskManager.isAvailableAsync())) return false;
  const registered = await TaskManager.isTaskRegisteredAsync(OMNI_BACKGROUND_MAINTENANCE_TASK);
  if (!registered) {
    await BackgroundTask.registerTaskAsync(OMNI_BACKGROUND_MAINTENANCE_TASK, { minimumInterval: 15 });
  }
  return true;
}
