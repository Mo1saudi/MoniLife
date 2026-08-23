import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform, Share } from "react-native";

export type AccountExportPayload = Record<string, unknown>;

export async function exportAccountData(payload: AccountExportPayload) {
  const content = JSON.stringify(payload, null, 2);
  const filename = `omni-life-data-${new Date().toISOString().slice(0, 10)}.json`;
  if (Platform.OS === "web") {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    return filename;
  }
  const uri = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: "OMNI LIFE data export" });
  } else {
    await Share.share({ title: "OMNI LIFE data export", message: content });
  }
  return filename;
}
