import AsyncStorage from "@react-native-async-storage/async-storage";

export type AiMemoryItem = { id: string; text: string; createdAt: string; source: "user" | "review" };

const memoryKey = (scope: string) => `omni-life:ai-memory:${encodeURIComponent(scope.trim().toLowerCase() || "local")}`;

export function sanitizeMemoryText(value: string) {
  return value.replace(/\u0000/g, "").replace(/(password|pin|token|secret|api[_ -]?key)\s*[:=]\s*[^\s,;]+/gi, "$1: [removed]").trim().slice(0, 500);
}

export async function loadAiMemory(scope: string): Promise<AiMemoryItem[]> {
  try { const raw = await AsyncStorage.getItem(memoryKey(scope)); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed.filter((item): item is AiMemoryItem => Boolean(item && typeof item.id === "string" && typeof item.text === "string" && typeof item.createdAt === "string")).slice(0, 30) : []; } catch { return []; }
}

export async function saveAiMemory(scope: string, items: AiMemoryItem[]) { await AsyncStorage.setItem(memoryKey(scope), JSON.stringify(items.slice(0, 30))); }

export function addAiMemory(items: AiMemoryItem[], text: string, source: AiMemoryItem["source"] = "user") {
  const clean = sanitizeMemoryText(text);
  if (clean.length < 2) return items;
  return [{ id: `memory-${Date.now()}`, text: clean, createdAt: new Date().toISOString(), source }, ...items].slice(0, 30);
}
