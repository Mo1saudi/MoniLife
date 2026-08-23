import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { NativeDateTimePicker } from "@/components/native-date-time-picker";
import { CONTACT_REMINDER_CADENCES, contactReminderCadenceLabel, type ContactRelationshipReminder } from "@/lib/contact-reminder-rules";

export type ContactReminderDraft = Pick<ContactRelationshipReminder, "purpose" | "cadence" | "at">;

export function ContactReminderEditor({ visible, isArabic, contactName, initialReminder, onClose, onSave }: { visible: boolean; isArabic: boolean; contactName: string; initialReminder?: ContactRelationshipReminder; onClose: () => void; onSave: (draft: ContactReminderDraft) => void }) {
  const t = (ar: string, en: string) => isArabic ? ar : en;
  const [purpose, setPurpose] = useState("");
  const [cadence, setCadence] = useState<ContactReminderDraft["cadence"]>("weekly");
  const [at, setAt] = useState(() => {
    const next = new Date();
    next.setHours(18, 0, 0, 0);
    return next;
  });

  useEffect(() => {
    if (!visible) return;
    if (initialReminder) {
      setPurpose(initialReminder.purpose);
      setCadence(initialReminder.cadence);
      const restored = new Date(initialReminder.at);
      if (!Number.isNaN(restored.getTime())) setAt(restored);
      return;
    }
    const next = new Date();
    next.setHours(18, 0, 0, 0);
    setPurpose("");
    setCadence("weekly");
    setAt(next);
  }, [initialReminder, visible]);

  const canSave = purpose.trim().length >= 2 && !Number.isNaN(at.getTime());
  const dateLabel = cadence === "weekly" ? t("يوم التواصل الأسبوعي", "Weekly reminder day") : t("يوم التواصل الشهري", "Monthly reminder day");
  const save = () => { if (canSave) onSave({ purpose: purpose.trim(), cadence, at: at.toISOString() }); };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.overlay}><View style={styles.sheet}><View style={styles.handle} /><View style={styles.head}><View style={styles.icon}><MaterialIcons name="notifications-active" size={20} color="#07111F" /></View><View style={{ flex: 1 }}><Text style={styles.title}>{initialReminder ? t("تعديل تذكير التواصل", "Edit connection reminder") : t("تذكير تواصل جديد", "New connection reminder")}</Text><Text style={styles.subtitle}>{t(`ذكّرني بالتواصل مع ${contactName} بطريقة تناسب هذه العلاقة.`, `Set a meaningful reminder to stay in touch with ${contactName}.`)}</Text></View><Pressable onPress={onClose} style={styles.close}><MaterialIcons name="close" size={20} color="#91A4B9" /></Pressable></View><Text style={styles.label}>{t("سبب التواصل", "Connection purpose")}</Text><TextInput value={purpose} onChangeText={setPurpose} maxLength={160} style={[styles.input, styles.purpose]} placeholder={t("مثل: الاطمئنان على العمل أو متابعة الدراسة", "e.g. check in about work or studies")} placeholderTextColor="#91A4B9" textAlign={isArabic ? "right" : "left"} multiline /><Text style={styles.label}>{t("كم مرة تريد التذكير؟", "How often should we remind you?")}</Text><View style={styles.cadenceRow}>{CONTACT_REMINDER_CADENCES.map((item) => <Pressable key={item} onPress={() => setCadence(item)} style={({ pressed }) => [styles.cadence, cadence === item && styles.active, pressed && styles.pressed]}><Text style={[styles.cadenceText, cadence === item && styles.cadenceTextActive]}>{contactReminderCadenceLabel(item, isArabic)}</Text></Pressable>)}</View>{cadence !== "daily" ? <NativeDateTimePicker label={dateLabel} value={at} mode="date" onChange={setAt} isArabic={isArabic} /> : null}<NativeDateTimePicker label={t("وقت التذكير", "Reminder time")} value={at} mode="time" onChange={setAt} isArabic={isArabic} /><View style={styles.note}><MaterialIcons name="info-outline" size={16} color="#38D8FF" /><Text style={styles.noteText}>{t("سيصلك تنبيه على الهاتف، ويمكنك تعديله أو إيقافه من بطاقة جهة الاتصال لاحقًا.", "You will receive a phone alert and can edit or pause it from this contact's card later.")}</Text></View><Pressable onPress={save} disabled={!canSave} style={({ pressed }) => [styles.save, (pressed || !canSave) && styles.disabled]}><MaterialIcons name="schedule" size={19} color="#07111F" /><Text style={styles.saveText}>{initialReminder ? t("حفظ وإعادة الجدولة", "Save and reschedule") : t("ضبط التذكير", "Set reminder")}</Text></Pressable></View></View></Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(2,8,15,0.72)" },
  sheet: { gap: 11, padding: 17, paddingBottom: 28, borderTopLeftRadius: 25, borderTopRightRadius: 25, backgroundColor: "#10233A", borderWidth: 1, borderColor: "rgba(56,216,255,0.32)" },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 4, backgroundColor: "#2A4960", marginBottom: 3 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#4FE1A8" },
  close: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#0A1727" },
  title: { color: "#F2F7FC", fontSize: 14, fontWeight: "900", textAlign: "right" },
  subtitle: { color: "#91A4B9", fontSize: 9, lineHeight: 14, textAlign: "right", marginTop: 3 },
  label: { color: "#91A4B9", fontSize: 9, fontWeight: "900", textAlign: "right" },
  input: { minHeight: 44, paddingHorizontal: 11, color: "#F2F7FC", backgroundColor: "#0A1727", borderWidth: 1, borderColor: "#1C3B56", borderRadius: 11, fontSize: 11 },
  purpose: { minHeight: 70, paddingTop: 11, textAlignVertical: "top" },
  cadenceRow: { flexDirection: "row", gap: 6 },
  cadence: { flex: 1, minHeight: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#1C3B56", backgroundColor: "#0A1727" },
  active: { borderColor: "rgba(56,216,255,0.68)", backgroundColor: "rgba(56,216,255,0.10)" },
  cadenceText: { color: "#91A4B9", fontSize: 9, fontWeight: "800" },
  cadenceTextActive: { color: "#38D8FF" },
  note: { flexDirection: "row", alignItems: "flex-start", gap: 6, padding: 10, borderRadius: 10, backgroundColor: "rgba(56,216,255,0.08)" },
  noteText: { flex: 1, color: "#91A4B9", fontSize: 9, lineHeight: 14, textAlign: "right" },
  save: { minHeight: 44, borderRadius: 11, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", backgroundColor: "#4FE1A8" },
  saveText: { color: "#07111F", fontSize: 11, fontWeight: "900" },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.42 },
});
