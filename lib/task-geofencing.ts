import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { getSoundChannel } from "./notification-sound-service";
import { formatPhoneNotification } from "./phone-notification-style";

export type TaskLocation = { latitude: number; longitude: number; radius: number; label: string };
export type GeofencedTask = { id: string; title: string; location?: TaskLocation };

const TASK_NAME = "omni-life-task-geofence";
const TASK_MAP_KEY = "omni-life-geofenced-task-map";
const TASK_REGIONS_KEY = "omni-life-geofenced-task-regions";

if (Platform.OS !== "web" && !TaskManager.isTaskDefined(TASK_NAME)) {
  TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
    if (error || !data) return;
    const event = data as { eventType: Location.GeofencingEventType; region: { identifier: string } };
    if (event.eventType !== Location.GeofencingEventType.Enter) return;
    const tasks = JSON.parse(await AsyncStorage.getItem(TASK_MAP_KEY) ?? "{}") as Record<string, { title: string; label: string }>;
    const task = tasks[event.region.identifier];
    if (!task) return;
    const presentation = formatPhoneNotification("tasks", { title: "تذكير مرتبط بالمكان", body: `وصلت إلى ${task.label}. حان وقت: ${task.title}` });
    await Notifications.scheduleNotificationAsync({ content: { ...presentation, sound: "sound_tasks.wav", data: { target: "task", taskId: event.region.identifier } }, trigger: { channelId: getSoundChannel("tasks") } });
  });
}

export async function captureCurrentTaskLocation(label = "الموقع الحالي"): Promise<TaskLocation | null> {
  if (Platform.OS === "web") return null;
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== "granted") return null;
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { latitude: position.coords.latitude, longitude: position.coords.longitude, radius: 150, label };
}

export async function registerTaskGeofences(tasks: GeofencedTask[]): Promise<{ enabled: boolean; reason?: "permission" | "unsupported" }> {
  if (Platform.OS === "web" || !TaskManager.isAvailableAsync) return { enabled: false, reason: "unsupported" };
  const regions = tasks.filter((task) => task.location).slice(0, 20).map((task) => ({ identifier: task.id, latitude: task.location!.latitude, longitude: task.location!.longitude, radius: task.location!.radius, notifyOnEnter: true, notifyOnExit: false }));
  await AsyncStorage.setItem(TASK_REGIONS_KEY, JSON.stringify(tasks.filter((task) => task.location).slice(0, 20)));
  if (!regions.length) {
    if (await Location.hasStartedGeofencingAsync(TASK_NAME)) await Location.stopGeofencingAsync(TASK_NAME);
    await AsyncStorage.removeItem(TASK_MAP_KEY);
    return { enabled: true };
  }
  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== "granted") return { enabled: false, reason: "permission" };
  await AsyncStorage.setItem(TASK_MAP_KEY, JSON.stringify(Object.fromEntries(tasks.filter((task) => task.location).map((task) => [task.id, { title: task.title, label: task.location!.label }]))));
  const active = await Location.hasStartedGeofencingAsync(TASK_NAME);
  if (active) await Location.stopGeofencingAsync(TASK_NAME);
  await Location.startGeofencingAsync(TASK_NAME, regions);
  return { enabled: true };
}

/** Re-registers saved geofences after an app restart without requesting new permissions. */
export async function restoreTaskGeofences(tasks: GeofencedTask[]): Promise<boolean> {
  if (Platform.OS === "web" || !TaskManager.isAvailableAsync) return false;
  const regions = tasks.filter((task) => task.location).slice(0, 20).map((task) => ({ identifier: task.id, latitude: task.location!.latitude, longitude: task.location!.longitude, radius: task.location!.radius, notifyOnEnter: true, notifyOnExit: false }));
  if (!regions.length) return true;
  const permission = await Location.getBackgroundPermissionsAsync();
  if (permission.status !== "granted") return false;
  await AsyncStorage.setItem(TASK_MAP_KEY, JSON.stringify(Object.fromEntries(tasks.filter((task) => task.location).map((task) => [task.id, { title: task.title, label: task.location!.label }]))));
  if (await Location.hasStartedGeofencingAsync(TASK_NAME)) await Location.stopGeofencingAsync(TASK_NAME);
  await Location.startGeofencingAsync(TASK_NAME, regions);
  return true;
}

/** Restores explicitly saved regions without requesting location permission again. */
export async function restorePersistedTaskGeofences(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(TASK_REGIONS_KEY);
    const tasks = raw ? JSON.parse(raw) : [];
    return Array.isArray(tasks) ? restoreTaskGeofences(tasks as GeofencedTask[]) : false;
  } catch {
    return false;
  }
}
