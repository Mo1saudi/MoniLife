import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { NativeDateTimePicker } from "@/components/native-date-time-picker";
import { TASK_REMINDER_OPTIONS, habitDailyTarget, normalizeTaskReminderOffsets, taskReminderLimit, type HabitFrequency, type TaskReminderOffset } from "@/lib/task-habit-planning";
import type { TaskLocation } from "@/lib/task-geofencing";
import type { IfThenPlan } from "@/lib/behavioral-recovery";

export type PlannerMode = "task" | "habit" | null;

export type TaskDraftInput = {
  title: string;
  detail: string;
  dueAt: string;
  reminderOffsets: TaskReminderOffset[];
  location?: TaskLocation;
  ifThenPlan?: IfThenPlan;
  estimatedPomodoros: number;
  project?: string;
  tags: string[];
};

export type HabitDraftInput = {
  title: string;
  detail: string;
  frequency: HabitFrequency;
  reminderTimes: string[];
  ifThenPlan?: IfThenPlan;
};

type TaskPreset = "hour" | "evening" | "tomorrow";
type HabitPreset = "morning" | "evening";

type Props = {
  mode: PlannerMode;
  isArabic: boolean;
  isPremium: boolean;
  onClose: () => void;
  onCreateTask: (input: TaskDraftInput) => void;
  onCreateHabit: (input: HabitDraftInput) => void;
  onCaptureTaskLocation: () => Promise<TaskLocation | null>;
};

const colors = { canvas: "#07111F", card: "#10233A", cyan: "#38D8FF", emerald: "#4FE1A8", warning: "#FFC36B", ink: "#F2F7FC", muted: "#91A4B9", border: "#1C3B56", coral: "#FF7A76" };

function nextTaskPreset(preset: TaskPreset) {
  const next = new Date();
  if (preset === "hour") next.setTime(Date.now() + 60 * 60 * 1000);
  if (preset === "evening") {
    next.setHours(20, 0, 0, 0);
    if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
  }
  if (preset === "tomorrow") {
    next.setDate(next.getDate() + 1);
    next.setHours(9, 0, 0, 0);
  }
  return next;
}

function nextHabitPreset(preset: HabitPreset) {
  const next = new Date();
  next.setHours(preset === "morning" ? 8 : 20, 0, 0, 0);
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
  return next;
}

export function TaskHabitEditor({ mode, isArabic, isPremium, onClose, onCreateTask, onCreateHabit, onCaptureTaskLocation }: Props) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [taskPreset, setTaskPreset] = useState<TaskPreset>("hour");
  const [habitPreset, setHabitPreset] = useState<HabitPreset>("morning");
  const [dueAt, setDueAt] = useState(() => nextTaskPreset("hour"));
  const [offsets, setOffsets] = useState<TaskReminderOffset[]>(["at_time"]);
  const [frequency, setFrequency] = useState<HabitFrequency>("daily");
  const [reminderTimes, setReminderTimes] = useState<Date[]>([nextHabitPreset("morning")]);
  const [message, setMessage] = useState("");
  const [taskLocation, setTaskLocation] = useState<TaskLocation | undefined>();
  const [ifThenCondition, setIfThenCondition] = useState("");
  const [ifThenAction, setIfThenAction] = useState("");
  const [estimatedPomodoros, setEstimatedPomodoros] = useState(1);
  const [project, setProject] = useState("");
  const [tagsText, setTagsText] = useState("");
  const t = (ar: string, en: string) => isArabic ? ar : en;
  const isTask = mode === "task";

  useEffect(() => {
    if (!mode) return;
    setTitle(""); setDetail(""); setShowDetails(false); setShowAdvanced(false); setTaskPreset("hour"); setHabitPreset("morning");
    setDueAt(nextTaskPreset("hour")); setOffsets(["at_time"]); setFrequency("daily"); setReminderTimes([nextHabitPreset("morning")]);
    setMessage(""); setTaskLocation(undefined); setIfThenCondition(""); setIfThenAction(""); setEstimatedPomodoros(1); setProject(""); setTagsText("");
  }, [mode]);

  const chooseTaskPreset = (preset: TaskPreset) => { setTaskPreset(preset); setDueAt(nextTaskPreset(preset)); };
  const chooseHabitPreset = (preset: HabitPreset) => { setHabitPreset(preset); setReminderTimes([nextHabitPreset(preset)]); };
  const toggleOffset = (offset: TaskReminderOffset) => {
    if (offsets.includes(offset)) { setOffsets((current) => current.filter((item) => item !== offset)); return; }
    if (offsets.length >= taskReminderLimit(isPremium)) { setMessage(t("الخطة المجانية تسمح بتذكيرين فقط. يمكنك الاكتفاء بالتذكير في الموعد أو ترقية الخطة للمزيد.", "Free includes two reminders per task. Keep the due-time reminder or upgrade for more.")); return; }
    setOffsets((current) => [...current, offset]);
  };
  const addHabitTime = () => {
    if (!isPremium) { setMessage(t("تكرار العادة أكثر من مرة يوميًا متاح في Pro وLifetime.", "Multiple daily habit reminders are available in Pro and Lifetime.")); return; }
    setReminderTimes((current) => [...current, new Date(current[current.length - 1].getTime() + 60 * 60 * 1000)]);
  };
  const submit = () => {
    if (title.trim().length < 2) { setMessage(t("اكتب اسمًا قصيرًا وواضحًا أولًا.", "Enter a short, clear name first.")); return; }
    if ((ifThenCondition.trim() || ifThenAction.trim()) && (!ifThenCondition.trim() || !ifThenAction.trim())) { setMessage(t("أكمل العائق والإجراء البديل، أو اترك الحقلين فارغين.", "Complete both fallback fields, or leave both blank.")); return; }
    const ifThenPlan = ifThenCondition.trim() && ifThenAction.trim() ? { ifCondition: ifThenCondition.trim(), thenAction: ifThenAction.trim() } : undefined;
    if (isTask) {
      if (dueAt.getTime() <= Date.now()) { setMessage(t("اختر موعدًا مستقبليًا للمهمة.", "Choose a future due time.")); return; }
      const tags = [...new Set(tagsText.split(/[,،]/).map((tag) => tag.trim()).filter(Boolean))].slice(0, 10);
      if (tags.some((tag) => tag.length > 40)) { setMessage(t("اجعل كل وسم 40 حرفًا أو أقل.", "Keep every tag to 40 characters or fewer.")); return; }
      onCreateTask({ title: title.trim(), detail: detail.trim(), dueAt: dueAt.toISOString(), reminderOffsets: normalizeTaskReminderOffsets(offsets, isPremium), location: taskLocation, ifThenPlan, estimatedPomodoros, project: project.trim() || undefined, tags });
    } else onCreateHabit({ title: title.trim(), detail: detail.trim(), frequency, reminderTimes: reminderTimes.map((time) => time.toISOString()), ifThenPlan });
    onClose();
  };

  const habitTarget = habitDailyTarget(reminderTimes.map((time) => time.toISOString()), isPremium);
  const taskPresets: Array<{ id: TaskPreset; ar: string; en: string; icon: keyof typeof MaterialIcons.glyphMap }> = [{ id: "hour", ar: "بعد ساعة", en: "In 1 hour", icon: "schedule" }, { id: "evening", ar: "مساءً", en: "This evening", icon: "nights-stay" }, { id: "tomorrow", ar: "غدًا", en: "Tomorrow", icon: "wb-sunny" }];

  return <Modal visible={mode !== null} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.backdrop}><View style={styles.sheet}>
      <View style={styles.head}><View style={styles.icon}><MaterialIcons name={isTask ? "task-alt" : "local-fire-department"} size={22} color={colors.cyan} /></View><View style={{ flex: 1 }}><Text style={styles.title}>{isTask ? t("أضف مهمة بسرعة", "Add a task quickly") : t("ابدأ عادة جديدة", "Start a new habit")}</Text><Text style={styles.subtitle}>{isTask ? t("اكتب الاسم واختر وقتًا سريعًا. الباقي اختياري.", "Name it and choose a quick time. Everything else is optional.") : t("اكتب الاسم واختر الإيقاع. يمكنك التخصيص لاحقًا.", "Name it and choose a rhythm. Customize later if needed.")}</Text></View><Pressable onPress={onClose} style={styles.close}><MaterialIcons name="close" size={20} color={colors.muted} /></Pressable></View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput value={title} onChangeText={setTitle} maxLength={120} autoFocus placeholder={isTask ? t("مثال: اتصال بأحمد", "e.g. Call Ahmed") : t("مثال: مشي 20 دقيقة", "e.g. Walk for 20 minutes")} placeholderTextColor={colors.muted} style={styles.titleInput} textAlign={isArabic ? "right" : "left"} returnKeyType="done" onSubmitEditing={submit} />
        <Pressable onPress={() => setShowDetails((value) => !value)} style={({ pressed }) => [styles.optionalToggle, pressed && styles.pressed]}><MaterialIcons name={showDetails ? "expand-less" : "notes"} size={17} color={colors.muted} /><Text style={styles.optionalToggleText}>{showDetails ? t("إخفاء التفاصيل", "Hide details") : t("إضافة تفاصيل اختيارية", "Add optional details")}</Text></Pressable>
        {showDetails ? <TextInput value={detail} onChangeText={setDetail} maxLength={500} multiline placeholder={t("خطوة أو ملاحظة تساعدك على التنفيذ", "A note or next step that helps you act")} placeholderTextColor={colors.muted} style={[styles.titleInput, styles.details]} textAlign={isArabic ? "right" : "left"} textAlignVertical="top" /> : null}

        {isTask ? <><SectionLabel text={t("متى تريد تذكيرك؟", "When should we remind you?")} /><View style={styles.quickGrid}>{taskPresets.map((preset) => <QuickChoice key={preset.id} selected={taskPreset === preset.id} label={isArabic ? preset.ar : preset.en} icon={preset.icon} onPress={() => chooseTaskPreset(preset.id)} />)}</View><Text style={styles.quickHint}>{t("سيُضبط تذكير واحد في الوقت الذي اخترته.", "One reminder will be set at the time you choose.")}</Text></> : <><SectionLabel text={t("تكرار العادة", "Habit rhythm")} /><View style={styles.quickGrid}>{(["daily", "weekly", "monthly", "yearly"] as HabitFrequency[]).map((option) => <QuickChoice key={option} selected={frequency === option} label={option === "daily" ? t("يومي", "Daily") : option === "weekly" ? t("أسبوعي", "Weekly") : option === "monthly" ? t("شهري", "Monthly") : t("سنوي", "Yearly")} icon={option === "daily" ? "today" : option === "weekly" ? "date-range" : option === "monthly" ? "calendar-month" : "event"} onPress={() => setFrequency(option)} />)}</View><SectionLabel text={t("موعد بسيط", "Simple reminder time")} /><View style={styles.quickGrid}><QuickChoice selected={habitPreset === "morning"} label={t("صباحًا 8", "8 AM")} icon="wb-sunny" onPress={() => chooseHabitPreset("morning")} /><QuickChoice selected={habitPreset === "evening"} label={t("مساءً 8", "8 PM")} icon="nights-stay" onPress={() => chooseHabitPreset("evening")} /></View></>}

        <Pressable onPress={() => setShowAdvanced((value) => !value)} style={({ pressed }) => [styles.advancedToggle, pressed && styles.pressed]}><MaterialIcons name={showAdvanced ? "keyboard-arrow-up" : "tune"} size={18} color={colors.cyan} /><View style={{ flex: 1 }}><Text style={styles.advancedTitle}>{showAdvanced ? t("إخفاء الإعدادات المتقدمة", "Hide advanced options") : t("تخصيص أكثر عند الحاجة", "Customize only if needed")}</Text><Text style={styles.advancedSub}>{showAdvanced ? t("ستبقى اختياراتك السريعة كما هي.", "Your quick choices remain unchanged.") : isTask ? t("تاريخ دقيق، تذكيرات إضافية، موقع، ومشروع.", "Exact date, more reminders, location, and project.") : t("وقت دقيق، عدة تذكيرات، وخطة بديلة.", "Exact time, multiple reminders, and a fallback plan.")}</Text></View></Pressable>

        {showAdvanced ? <View style={styles.advancedCard}>{isTask ? <><SectionLabel text={t("الموعد الدقيق", "Exact schedule")} /><NativeDateTimePicker label={t("التاريخ", "Date")} value={dueAt} mode="date" onChange={setDueAt} minimumDate={new Date()} isArabic={isArabic} /><NativeDateTimePicker label={t("الوقت", "Time")} value={dueAt} mode="time" onChange={setDueAt} isArabic={isArabic} /><View style={styles.labelRow}><SectionLabel text={t("تذكيرات إضافية", "Extra reminders")} /><Text style={styles.limit}>{offsets.length}/{taskReminderLimit(isPremium)}</Text></View><View style={styles.optionGrid}>{TASK_REMINDER_OPTIONS.map((option) => <Choice key={option.id} selected={offsets.includes(option.id)} label={isArabic ? option.labelAr : option.labelEn} onPress={() => toggleOffset(option.id)} />)}</View><View style={styles.compactCard}><Text style={styles.compactTitle}>{t("جلسات التركيز المقدّرة", "Estimated focus sessions")}</Text><View style={styles.counter}><Pressable onPress={() => setEstimatedPomodoros((current) => Math.max(1, current - 1))} style={styles.counterButton}><MaterialIcons name="remove" size={18} color={colors.ink} /></Pressable><Text style={styles.counterValue}>{estimatedPomodoros}</Text><Pressable onPress={() => setEstimatedPomodoros((current) => Math.min(99, current + 1))} style={styles.counterButton}><MaterialIcons name="add" size={18} color={colors.ink} /></Pressable></View></View><TextInput value={project} onChangeText={setProject} maxLength={120} placeholder={t("مشروع اختياري", "Optional project")} placeholderTextColor={colors.muted} style={styles.smallInput} textAlign={isArabic ? "right" : "left"} /><TextInput value={tagsText} onChangeText={setTagsText} maxLength={420} placeholder={t("وسوم اختيارية: عمل، مهم", "Optional tags: work, important")} placeholderTextColor={colors.muted} style={styles.smallInput} textAlign={isArabic ? "right" : "left"} /><Pressable onPress={() => { void onCaptureTaskLocation().then((location) => { if (location) { setTaskLocation(location); setMessage(t(`تم ربط المهمة بـ ${location.label}.`, `Task linked to ${location.label}.`)); } else setMessage(t("تعذر الحصول على الموقع. تحقق من الإذن ثم حاول مرة أخرى.", "Could not get location. Check permission and try again.")); }); }} style={[styles.locationButton, taskLocation && styles.locationSelected]}><MaterialIcons name={taskLocation ? "location-on" : "add-location-alt"} size={17} color={taskLocation ? colors.emerald : colors.cyan} /><Text style={[styles.locationText, taskLocation && { color: colors.emerald }]}>{taskLocation ? t("تم ربط الموقع", "Location linked") : t("ربط بالموقع الحالي", "Link current location")}</Text></Pressable>{!isPremium ? <PremiumHint text={t("في الخطة المجانية يمكنك اختيار تذكيرين كحد أقصى.", "Free accounts can choose up to two reminders.")} /> : null}</> : <><SectionLabel text={t("الوقت الدقيق", "Exact reminder time")} />{reminderTimes.map((time, index) => <View key={`${time.getTime()}-${index}`} style={styles.timeRow}><View style={{ flex: 1 }}><NativeDateTimePicker label={index === 0 ? t("الموعد", "Reminder time") : t(`الموعد ${index + 1}`, `Time ${index + 1}`)} value={time} mode="time" onChange={(next) => setReminderTimes((current) => current.map((item, itemIndex) => itemIndex === index ? next : item))} isArabic={isArabic} /></View>{index > 0 ? <Pressable onPress={() => setReminderTimes((current) => current.filter((_, itemIndex) => itemIndex !== index))} style={styles.remove}><MaterialIcons name="remove-circle-outline" size={21} color={colors.coral} /></Pressable> : null}</View>)}<Text style={styles.quickHint}>{habitTarget}× {t("هدف الإكمال اليومي", "daily completion target")}</Text><Pressable onPress={addHabitTime} style={styles.locationButton}><MaterialIcons name="add-alarm" size={17} color={isPremium ? colors.cyan : colors.warning} /><Text style={[styles.locationText, { color: isPremium ? colors.cyan : colors.warning }]}>{isPremium ? t("إضافة موعد آخر", "Add another time") : t("عدة مواعيد متاحة في Pro", "Multiple times in Pro")}</Text></Pressable></>}<View style={styles.fallbackCard}><Text style={styles.compactTitle}>{t("خطة بديلة اختيارية", "Optional fallback plan")}</Text><TextInput value={ifThenCondition} onChangeText={setIfThenCondition} maxLength={180} placeholder={t("إذا ظهر عائق…", "If an obstacle appears…")} placeholderTextColor={colors.muted} style={styles.smallInput} textAlign={isArabic ? "right" : "left"} /><TextInput value={ifThenAction} onChangeText={setIfThenAction} maxLength={220} placeholder={t("فسأفعل بدلًا منه…", "Then I will instead…")} placeholderTextColor={colors.muted} style={styles.smallInput} textAlign={isArabic ? "right" : "left"} /></View></View> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <Pressable onPress={submit} style={({ pressed }) => [styles.submit, pressed && styles.pressed]}><MaterialIcons name={isTask ? "add-task" : "done"} size={19} color={colors.canvas} /><Text style={styles.submitText}>{isTask ? t("إضافة المهمة", "Add task") : t("بدء العادة", "Start habit")}</Text></Pressable>
      </ScrollView>
    </View></View>
  </Modal>;
}

function SectionLabel({ text }: { text: string }) { return <Text style={styles.sectionLabel}>{text}</Text>; }
function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, pressed && styles.pressed]}><MaterialIcons name={selected ? "check-circle" : "radio-button-unchecked"} size={16} color={selected ? colors.cyan : colors.muted} /><Text style={[styles.choiceText, selected && { color: colors.cyan }]}>{label}</Text></Pressable>; }
function QuickChoice({ label, selected, icon, onPress }: { label: string; selected: boolean; icon: keyof typeof MaterialIcons.glyphMap; onPress: () => void }) { return <Pressable onPress={onPress} style={({ pressed }) => [styles.quickChoice, selected && styles.quickChoiceSelected, pressed && styles.pressed]}><MaterialIcons name={icon} size={18} color={selected ? colors.cyan : colors.muted} /><Text style={[styles.quickChoiceText, selected && { color: colors.cyan }]}>{label}</Text></Pressable>; }
function PremiumHint({ text }: { text: string }) { return <View style={styles.hint}><MaterialIcons name="workspace-premium" size={16} color={colors.warning} /><Text style={styles.hintText}>{text}</Text></View>; }

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "flex-end" },
  sheet: { maxHeight: "92%", backgroundColor: colors.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  head: { flexDirection: "row", gap: 10, alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" }, icon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(56,216,255,0.13)" }, title: { color: colors.ink, fontWeight: "900", fontSize: 15, textAlign: "right" }, subtitle: { color: colors.muted, fontSize: 10, marginTop: 3, textAlign: "right", lineHeight: 15 }, close: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: "rgba(255,255,255,0.05)" },
  content: { padding: 16, gap: 10, paddingBottom: 30 }, titleInput: { minHeight: 48, color: colors.ink, borderWidth: 1, borderColor: colors.border, borderRadius: 13, paddingHorizontal: 12, backgroundColor: colors.canvas, fontSize: 13 }, details: { minHeight: 76, paddingTop: 10 }, optionalToggle: { minHeight: 34, alignSelf: "flex-end", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 6 }, optionalToggleText: { color: colors.muted, fontSize: 10, fontWeight: "800" },
  sectionLabel: { color: colors.ink, fontSize: 11, fontWeight: "900", marginTop: 4, textAlign: "right" }, quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, quickChoice: { flexGrow: 1, minWidth: "30%", minHeight: 56, paddingHorizontal: 9, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", borderRadius: 12, alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.025)" }, quickChoiceSelected: { backgroundColor: "rgba(56,216,255,0.11)", borderColor: "rgba(56,216,255,0.66)" }, quickChoiceText: { color: colors.muted, fontSize: 9, fontWeight: "900", textAlign: "center" }, quickHint: { color: colors.muted, fontSize: 9, lineHeight: 14, textAlign: "right" },
  advancedToggle: { minHeight: 56, padding: 10, borderRadius: 13, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(56,216,255,0.055)", borderWidth: 1, borderColor: "rgba(56,216,255,0.20)" }, advancedTitle: { color: colors.cyan, fontSize: 10, fontWeight: "900", textAlign: "right" }, advancedSub: { color: colors.muted, fontSize: 8, marginTop: 2, textAlign: "right" }, advancedCard: { gap: 9, padding: 10, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.025)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 3 }, limit: { color: colors.cyan, fontSize: 10, fontWeight: "900" }, optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, choice: { minHeight: 34, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", borderRadius: 9 }, choiceSelected: { backgroundColor: "rgba(56,216,255,0.12)", borderColor: "rgba(56,216,255,0.65)" }, choiceText: { color: colors.muted, fontSize: 9, fontWeight: "800" },
  compactCard: { minHeight: 48, padding: 9, flexDirection: "row", alignItems: "center", gap: 9, borderRadius: 11, backgroundColor: "rgba(255,122,118,0.08)", borderWidth: 1, borderColor: "rgba(255,122,118,0.24)" }, compactTitle: { flex: 1, color: colors.ink, fontSize: 10, fontWeight: "900", textAlign: "right" }, counter: { flexDirection: "row", alignItems: "center", gap: 7 }, counterButton: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,122,118,0.18)" }, counterValue: { minWidth: 22, color: colors.coral, textAlign: "center", fontSize: 12, fontWeight: "900" }, smallInput: { minHeight: 40, color: colors.ink, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", borderRadius: 10, paddingHorizontal: 10, backgroundColor: colors.canvas, fontSize: 10 }, locationButton: { minHeight: 39, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10, borderWidth: 1, borderColor: "rgba(56,216,255,0.32)", backgroundColor: "rgba(56,216,255,0.07)" }, locationSelected: { borderColor: "rgba(79,225,168,0.42)", backgroundColor: "rgba(79,225,168,0.08)" }, locationText: { color: colors.cyan, fontWeight: "900", fontSize: 10 },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 7 }, remove: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,122,118,0.09)" }, fallbackCard: { gap: 7, padding: 9, borderRadius: 11, backgroundColor: "rgba(255,195,107,0.055)", borderWidth: 1, borderColor: "rgba(255,195,107,0.18)" }, hint: { flexDirection: "row", alignItems: "center", gap: 6, padding: 9, backgroundColor: "rgba(255,195,107,0.08)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,195,107,0.22)" }, hintText: { color: colors.warning, flex: 1, fontSize: 9, lineHeight: 14, textAlign: "right" }, message: { color: colors.warning, backgroundColor: "rgba(255,195,107,0.08)", borderRadius: 9, padding: 9, fontSize: 10, lineHeight: 14, textAlign: "right" }, submit: { minHeight: 50, marginTop: 3, borderRadius: 13, backgroundColor: colors.emerald, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }, submitText: { color: colors.canvas, fontSize: 12, fontWeight: "900" }, pressed: { opacity: 0.72 },
});
