import { Platform } from "react-native";
import { buildTaskWidgetSnapshot, type TaskWidgetSource } from "@/lib/task-widget-snapshot";

type NativeTaskWidgetModule = {
  isAvailableAsync: () => Promise<boolean>;
  updateTaskWidgetAsync: (tasksJson: string) => Promise<boolean>;
  refreshTaskWidgetAsync: () => Promise<boolean>;
  consumeTaskWidgetActionAsync: () => Promise<string | null>;
};

function nativeModule(): NativeTaskWidgetModule | null {
  if (Platform.OS !== "android") return null;
  try {
    return require("../modules/expo-focus-dnd").default as NativeTaskWidgetModule;
  } catch {
    return null;
  }
}

/** Mirrors only the first three open task titles to Android's private widget storage. */
export async function updateAndroidTaskWidget(tasks: TaskWidgetSource[]) {
  const module = nativeModule();
  if (!module || !(await module.isAvailableAsync())) return false;
  const safeTasks = buildTaskWidgetSnapshot(tasks);
  return module.updateTaskWidgetAsync(JSON.stringify(safeTasks));
}

/** Refreshes existing Android widget instances from the already-sanitized private snapshot. */
export async function refreshAndroidTaskWidget() {
  const module = nativeModule();
  if (!module || !(await module.isAvailableAsync())) return false;
  return module.refreshTaskWidgetAsync();
}

/** Reads and clears an action that launched the app from the Android home-screen widget. */
export async function consumeAndroidTaskWidgetAction() {
  const module = nativeModule();
  if (!module || !(await module.isAvailableAsync())) return null;
  const action = await module.consumeTaskWidgetActionAsync();
  return action === "omni.widget.ADD_TASK" || action === "omni.widget.OPEN_TASKS" ? action : null;
}
