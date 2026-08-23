import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { NativeDateTimePicker } from "@/components/native-date-time-picker";
import { configureOmniNotificationChannel, requestOmniNotificationPermissions, scheduleHabitReminderNotification, sendInstantHighPriorityNotification, type HabitReminderRepeat } from "@/lib/omni-notifications";

type Props = { t: (ar: string, en: string) => string; onStatus: (message: string) => void };

const colors = { cyan: "#38D8FF", emerald: "#4FE1A8", muted: "#91A4B9", card: "#101F33", ink: "#F2F7FC" };

export function NotificationControlPanel({ t, onStatus }: Props) {
  const [busy, setBusy] = useState(false);
  const [habitReminderAt, setHabitReminderAt] = useState(() => new Date(Date.now() + 5 * 60 * 1000));
  const [repeat, setRepeat] = useState<HabitReminderRepeat>("once");

  const perform = async (action: () => Promise<string>) => {
    setBusy(true);
    try {
      onStatus(await action());
    } catch {
      onStatus(t("حدث خطأ أثناء إعداد التنبيه. تحقق من إعدادات الجهاز.", "An alert setup error occurred. Check device settings."));
    } finally {
      setBusy(false);
    }
  };

  const requestAccess = () => perform(async () => {
    await configureOmniNotificationChannel();
    const result = await requestOmniNotificationPermissions();
    return result === "granted" ? t("تم تفعيل إشعارات OMNI LIFE عالية الأولوية.", "OMNI LIFE high-priority alerts are enabled.") : result === "unsupported" ? t("اختبر الإشعارات على هاتف فعلي.", "Test notifications on a physical phone.") : t("لم يتم منح إذن الإشعارات. فعّله من إعدادات الهاتف.", "Notification permission was not granted. Enable it in phone settings.");
  });

  const sendTaskAlert = () => perform(async () => {
    const identifier = await sendInstantHighPriorityNotification({
      title: t("OMNI LIFE · مهمة ذات أولوية", "OMNI LIFE · Priority task"),
      body: t("ابدأ الآن: مراجعة خطة الربع القادم", "Start now: review the quarterly plan"),
      target: { kind: "task", id: "t1" },
    });
    return identifier ? t("أُرسل التنبيه عالي الأولوية للمهمة الآن.", "High-priority task alert sent now.") : t("فعّل الإذن أولًا لإرسال التنبيه.", "Enable permission before sending the alert.");
  });

  const scheduleHabitAlert = () => perform(async () => {
    if (repeat === "once" && habitReminderAt.getTime() <= Date.now()) {
      return t("اختر موعدًا مستقبليًا للتذكير.", "Choose a future time for the reminder.");
    }
    const identifier = await scheduleHabitReminderNotification({
      title: t("OMNI LIFE · تذكير عادة", "OMNI LIFE · Habit reminder"),
      body: repeat === "daily" ? t("تذكيرك اليومي: مشي الصباح", "Your daily reminder: morning walk") : repeat === "weekly" ? t("تذكيرك الأسبوعي: مشي الصباح", "Your weekly reminder: morning walk") : t("موعد العادة المحدد: مشي الصباح", "Your scheduled habit: morning walk"),
      target: { kind: "habit", id: "h1" },
    }, habitReminderAt, repeat);
    return identifier ? repeat === "daily" ? t("تمت جدولة تذكير يومي في الوقت الذي اخترته.", "A daily reminder is scheduled for your selected time.") : repeat === "weekly" ? t("تمت جدولة تذكير أسبوعي في اليوم والوقت اللذين اخترتهما.", "A weekly reminder is scheduled for your selected day and time.") : t("تمت جدولة تذكير العادة في الموعد الذي اخترته.", "Habit reminder scheduled for your selected time.") : t("فعّل الإذن أولًا لجدولة التذكير.", "Enable permission before scheduling the reminder.");
  });

  return <View style={styles.card}>
    <View style={styles.titleRow}><MaterialIcons name="notifications-active" size={21} color={colors.cyan} /><View style={{ flex: 1 }}><Text style={styles.title}>{t("محرك الأولوية الفورية", "Instant priority engine")}</Text><Text style={styles.caption}>{t("قناة MAX وصوت واهتزاز وشارة، مع توجيه عند الضغط.", "MAX channel, sound, vibration, badge, and tap routing.")}</Text></View></View>
    <View style={styles.actions}>
      <Control label={t("تفعيل الإذن", "Enable alerts")} icon="notifications-active" onPress={requestAccess} disabled={busy} />
      <Control label={t("مهمة الآن", "Task now")} icon="bolt" onPress={sendTaskAlert} disabled={busy} tone="emerald" />
    </View>
    <View style={styles.scheduleBox}>
      <Text style={styles.scheduleTitle}>{t("موعد تذكير العادة", "Habit reminder schedule")}</Text>
      <View style={styles.repeatRow}>
        {(["once", "daily", "weekly"] as HabitReminderRepeat[]).map((option) => <Pressable key={option} onPress={() => setRepeat(option)} style={({ pressed }) => [styles.repeatOption, repeat === option && styles.repeatOptionActive, pressed && styles.pressed]}><Text style={[styles.repeatText, repeat === option && styles.repeatTextActive]}>{option === "once" ? t("مرة واحدة", "Once") : option === "daily" ? t("يوميًا", "Daily") : t("أسبوعيًا", "Weekly")}</Text></Pressable>)}
      </View>
      <NativeDateTimePicker label={t("التاريخ", "Date")} value={habitReminderAt} mode="date" onChange={setHabitReminderAt} minimumDate={new Date()} isArabic />
      <NativeDateTimePicker label={t("الوقت", "Time")} value={habitReminderAt} mode="time" onChange={setHabitReminderAt} isArabic />
      <Text style={styles.scheduleHint}>{repeat === "weekly" ? t("يحدد التاريخ يوم الأسبوع، ويتكرر التذكير في اليوم والوقت نفسيهما.", "The date selects the weekday; the reminder repeats on that day and time.") : repeat === "daily" ? t("يتكرر التذكير يوميًا في الوقت المختار.", "The reminder repeats daily at your selected time.") : t("سيصل التذكير مرة واحدة في التاريخ والوقت المحددين.", "The reminder is delivered once at the selected date and time.")}</Text>
      <Control label={t("جدولة التذكير", "Schedule reminder")} icon="schedule" onPress={scheduleHabitAlert} disabled={busy} />
    </View>
  </View>;
}

function Control({ label, icon, onPress, disabled, tone = "cyan" }: { label: string; icon: keyof typeof MaterialIcons.glyphMap; onPress: () => void; disabled: boolean; tone?: "cyan" | "emerald" }) {
  const color = tone === "emerald" ? colors.emerald : colors.cyan;
  return <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.button, { borderColor: `${color}88`, backgroundColor: `${color}14` }, (pressed || disabled) && styles.pressed]}><MaterialIcons name={icon} size={15} color={color} /><Text style={[styles.buttonText, { color }]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: "rgba(56,216,255,0.28)", borderRadius: 16, padding: 13, gap: 11, marginTop: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  title: { color: colors.ink, fontSize: 13, fontWeight: "900" },
  caption: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 2 },
  actions: { flexDirection: "row", gap: 6 },
  scheduleBox: { gap: 10, padding: 10, borderRadius: 12, backgroundColor: "rgba(56,216,255,0.05)", borderWidth: 1, borderColor: "rgba(56,216,255,0.18)" },
  scheduleTitle: { color: colors.ink, fontSize: 11, fontWeight: "900", textAlign: "right" },
  repeatRow: { flexDirection: "row", gap: 6 },
  repeatOption: { flex: 1, minHeight: 34, borderRadius: 9, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.025)" },
  repeatOptionActive: { borderColor: "rgba(56,216,255,0.65)", backgroundColor: "rgba(56,216,255,0.13)" },
  repeatText: { color: colors.muted, fontSize: 10, fontWeight: "800" },
  repeatTextActive: { color: colors.cyan },
  scheduleHint: { color: colors.muted, fontSize: 10, lineHeight: 15, textAlign: "right" },
  button: { flex: 1, minHeight: 33, paddingHorizontal: 5, borderRadius: 9, borderWidth: 1, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 3 },
  buttonText: { fontSize: 9, fontWeight: "900" },
  pressed: { opacity: 0.65, transform: [{ scale: 0.98 }] },
});
