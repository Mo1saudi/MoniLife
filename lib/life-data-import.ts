import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

import { parseOmniLifeDataSnapshot, type OmniLifeDataSnapshot } from "@/lib/life-data-storage";

export function parseImportedOmniLifeData(raw: string): OmniLifeDataSnapshot {
  const parsed = JSON.parse(raw) as { app?: unknown; data?: unknown } | null;
  if (!parsed || typeof parsed !== "object") throw new Error("الملف ليس نسخة JSON صالحة.");
  const candidate = typeof parsed.data === "object" && parsed.data ? parsed.data : parsed;
  const snapshot = parseOmniLifeDataSnapshot(JSON.stringify(candidate));
  if (!snapshot) throw new Error("صيغة النسخة غير مدعومة أو ينقصها قسم المهام والعادات.");
  if (snapshot.tasks.length > 1_000 || snapshot.habits.length > 500 || snapshot.ideas.length > 1_000 || snapshot.subscriptions.length > 1_000) throw new Error("النسخة أكبر من الحد الآمن للاستيراد.");
  return snapshot;
}

export async function pickOmniLifeImportFile() {
  const result = await DocumentPicker.getDocumentAsync({ type: ["application/json", "text/json", "text/plain"], copyToCacheDirectory: true, multiple: false });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const raw = Platform.OS === "web" && asset.file ? await asset.file.text() : await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
  return { name: asset.name, snapshot: parseImportedOmniLifeData(raw) };
}
