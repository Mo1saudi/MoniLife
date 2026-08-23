import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";

type PickerMode = "date" | "time";

type Props = {
  label: string;
  value: Date | null;
  mode: PickerMode;
  isArabic?: boolean;
  onChange: (value: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  placeholder?: string;
};

const colors = { canvas: "#07111F", card: "#101F33", ink: "#F2F7FC", muted: "#91A4B9", cyan: "#38D8FF", border: "#1C3B56" };

function formatValue(value: Date | null, mode: PickerMode, isArabic: boolean, placeholder?: string) {
  if (!value) return placeholder ?? (isArabic ? "اختر" : "Select");
  if (mode === "time") return value.toLocaleTimeString(isArabic ? "ar-EG" : "en-GB", { hour: "2-digit", minute: "2-digit" });
  return value.toLocaleDateString(isArabic ? "ar-EG" : "en-CA", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function mergeValue(current: Date, selected: Date, mode: PickerMode) {
  const next = new Date(current);
  if (mode === "date") next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
  else next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
  return next;
}

export function NativeDateTimePicker({ label, value, mode, onChange, minimumDate, maximumDate, placeholder, isArabic = true }: Props) {
  const [iosVisible, setIosVisible] = useState(false);
  const icon = mode === "date" ? "calendar-month" : "schedule";
  const pickerValue = value ?? maximumDate ?? minimumDate ?? new Date();
  const open = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: pickerValue,
        mode,
        display: mode === "date" ? "calendar" : "clock",
        minimumDate,
        maximumDate,
        onChange: (_event: DateTimePickerEvent, selected?: Date) => {
          if (selected) onChange(mergeValue(pickerValue, selected, mode));
        },
      });
      return;
    }
    setIosVisible(true);
  };

  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={open} style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}>
      <MaterialIcons name={icon} size={19} color={colors.cyan} />
      <Text style={[styles.value, !value && styles.placeholder]}>{formatValue(value, mode, isArabic, placeholder)}</Text>
      <MaterialIcons name="expand-more" size={20} color={colors.muted} />
    </Pressable>
    {Platform.OS !== "android" ? <Modal transparent visible={iosVisible} animationType="slide" onRequestClose={() => setIosVisible(false)}>
      <Pressable style={styles.backdrop} onPress={() => setIosVisible(false)}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.sheetHead}><Text style={styles.sheetTitle}>{label}</Text><Pressable onPress={() => setIosVisible(false)} style={styles.done}><Text style={styles.doneText}>تم</Text></Pressable></View>
          <DateTimePicker value={pickerValue} mode={mode} display={mode === "date" ? "inline" : "spinner"} minimumDate={minimumDate} maximumDate={maximumDate} onChange={(_event, selected) => { if (selected) onChange(mergeValue(pickerValue, selected, mode)); }} themeVariant="dark" locale={isArabic ? "ar" : "en"} />
        </Pressable>
      </Pressable>
    </Modal> : null}
  </View>;
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { color: colors.ink, fontSize: 11, fontWeight: "800", textAlign: "right" },
  trigger: { minHeight: 48, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: "#0A1727", flexDirection: "row", alignItems: "center", gap: 9 },
  value: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: "700", textAlign: "right" },
  placeholder: { color: colors.muted, fontWeight: "500" },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.58)" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 30, backgroundColor: colors.card },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sheetTitle: { color: colors.ink, fontSize: 16, fontWeight: "900" },
  done: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "rgba(56,216,255,0.12)" },
  doneText: { color: colors.cyan, fontWeight: "900" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
