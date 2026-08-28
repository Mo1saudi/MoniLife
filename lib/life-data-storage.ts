import AsyncStorage from "@react-native-async-storage/async-storage";

import { OMNI_APP_DATA_PREFIX } from "./omni-app-data-keys";

export type OmniLifeDataSnapshot = {
  tasks: unknown[];
  habits: unknown[];
  ideas: unknown[];
  subscriptions: unknown[];
  goals?: unknown[];
  habitCompletionCounts: Record<string, number>;
  dailyEnergy: string;
  dailyMood: string;
};

export function omniLifeDataStorageKey(scope: string) {
  return `${OMNI_APP_DATA_PREFIX}user-data:${encodeURIComponent(scope.trim().toLowerCase() || "local")}`;
}

export function parseOmniLifeDataSnapshot(raw: string | null): OmniLifeDataSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<OmniLifeDataSnapshot>;
    if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.habits) || !Array.isArray(parsed.ideas) || !Array.isArray(parsed.subscriptions)) return null;
    return {
      tasks: parsed.tasks,
      habits: parsed.habits,
      ideas: parsed.ideas,
      subscriptions: parsed.subscriptions,
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      habitCompletionCounts: parsed.habitCompletionCounts && typeof parsed.habitCompletionCounts === "object" ? parsed.habitCompletionCounts : {},
      dailyEnergy: typeof parsed.dailyEnergy === "string" ? parsed.dailyEnergy : "high",
      dailyMood: typeof parsed.dailyMood === "string" ? parsed.dailyMood : "good",
    };
  } catch {
    return null;
  }
}

export async function loadOmniLifeData(scope: string) {
  return parseOmniLifeDataSnapshot(await AsyncStorage.getItem(omniLifeDataStorageKey(scope)));
}

export async function saveOmniLifeData(scope: string, snapshot: OmniLifeDataSnapshot) {
  await AsyncStorage.setItem(omniLifeDataStorageKey(scope), JSON.stringify(snapshot));
}
