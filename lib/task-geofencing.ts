import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

export type TaskLocation = { latitude: number; longitude: number; radius: number; label: string };
export type GeofencedTask = { id: string; title: string; location?: TaskLocation };

const TASK_NAME = "omni-life-task-geofence";
const TASK_MAP_KEY = "omni-life-geofenced-task-map";

if (Platform.OS !== "web" && !TaskManager.isTaskDefined(TASK_NAME)) {
  TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
    if (error || !data) return;
    const event = data as { eventType: Location.GeofencingEventType; region: { identifier: string } };
    if (event.eventType !== Location.GeofencingEventType.Enter) return;
    const tasks = JSON.parse(await AsyncStorage.getItem(TASK_MAP_KEY) ?? "{}") as Record<string, { title: string; label: string }>;
    const task = tasks[event.region.identifier];
    if (!task) return;
    await Notifications.scheduleNotificationAsync({ content: { title: "📍 تذكير مرتبط بالمكان", body: `وصلت إلى ${task.label}. حان وقت: ${task.title}`, sound: "sound_tasks.wav", data: { target: "task", taskId: event.region.identifier } }, trigger: null });
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
  if (!regions.length) return { enabled: true };
  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== "granted") return { enabled: false, reason: "permission" };
  await AsyncStorage.setItem(TASK_MAP_KEY, JSON.stringify(Object.fromEntries(tasks.filter((task) => task.location).map((task) => [task.id, { title: task.title, label: task.location!.label }]))));
  const active = await Location.hasStartedGeofencingAsync(TASK_NAME);
  if (active) await Location.stopGeofencingAsync(TASK_NAME);
  await Location.startGeofencingAsync(TASK_NAME, regions);
  return { enabled: true };
}
