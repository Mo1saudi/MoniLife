import { useEffect, useRef, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";

import type { IfThenPlan } from "@/lib/behavioral-recovery";
import { addPomodoroSession, createPomodoroState, finishPomodoroPhase, type PomodoroDurations, type PomodoroState } from "@/lib/pomodoro-engine";
import { cancelScheduledOmniNotification, scheduleHighPriorityNotification } from "@/lib/omni-notifications";
import { startAmbientFocusAudio, stopAmbientFocusAudio } from "@/lib/ambient-audio-service";
import { FOCUS_SOUNDSCAPES, getFocusSoundscape, type FocusSoundscapeId } from "@/lib/focus-soundscapes";

type TunnelTask = { id: string; title: string; detail: string; isMicroGoal?: boolean; ifThenPlan?: IfThenPlan; estimatedPomodoros?: number; completedPomodoros?: number; project?: string; tags?: string[] };

type Props = {
  isArabic: boolean;
  task: TunnelTask | null;
  durations: PomodoroDurations;
  focusDndEnabled: boolean;
  onFocusDndChange: (active: boolean) => void;
  remaining: number;
  onComplete: (id: string) => void;
  onPomodoroComplete: (id: string, sessionIndex: number) => void;
  onExtend: (id: string) => void;
  onDefer: (id: string) => void;
  onExit: () => void;
};

const colors = { canvas: "#07111F", cyan: "#38D8FF", emerald: "#4FE1A8", amber: "#FFC36B", ink: "#F2F7FC", muted: "#91A4B9", coral: "#FF7A76", purple: "#B59CFF" };

export function TunnelVisionScreen({ isArabic, task, durations, focusDndEnabled, onFocusDndChange, remaining, onComplete, onPomodoroComplete, onExtend, onDefer, onExit }: Props) {
  const t = (ar: string, en: string) => isArabic ? ar : en;
  const [pomodoro, setPomodoro] = useState<PomodoroState>(() => createPomodoroState(task?.estimatedPomodoros, task?.completedPomodoros, durations));
  const [ambientEnabled, setAmbientEnabled] = useState(true);
  const [soundscapeId, setSoundscapeId] = useState<FocusSoundscapeId>("rain-thunder");
  const [completionNotice, setCompletionNotice] = useState<"focus" | "break" | null>(null);
  const scheduledNotificationId = useRef<string | null>(null);
  const soundscape = getFocusSoundscape(soundscapeId);

  useEffect(() => { setPomodoro(createPomodoroState(task?.estimatedPomodoros, task?.completedPomodoros, durations)); }, [durations, task?.completedPomodoros, task?.estimatedPomodoros, task?.id]);
  useEffect(() => {
    if (!task || pomodoro.phase === "complete" || pomodoro.secondsRemaining <= 0) return;
    const timer = setInterval(() => setPomodoro((current) => current.secondsRemaining > 0 ? { ...current, secondsRemaining: current.secondsRemaining - 1 } : current), 1000);
    return () => clearInterval(timer);
  }, [pomodoro.phase, pomodoro.secondsRemaining, task]);

  useEffect(() => {
    if (!task || pomodoro.phase !== "focus" || !ambientEnabled) { stopAmbientFocusAudio(); return; }
    void startAmbientFocusAudio(soundscapeId);
    return () => stopAmbientFocusAudio();
  }, [ambientEnabled, pomodoro.phase, soundscapeId, task]);

  useEffect(() => {
    if (!focusDndEnabled) return;
    onFocusDndChange(Boolean(task && pomodoro.phase === "focus"));
    return () => onFocusDndChange(false);
  }, [focusDndEnabled, onFocusDndChange, pomodoro.phase, task]);

  useEffect(() => {
    if (!task || pomodoro.phase === "complete") return;
    const endAt = new Date(Date.now() + pomodoro.secondsRemaining * 1000);
    const isFocus = pomodoro.phase === "focus";
    void scheduleHighPriorityNotification({
      title: isFocus ? t("🍅 انتهت جلسة التركيز", "🍅 Focus session complete") : t("⚡ انتهت الاستراحة", "⚡ Break complete"),
      body: isFocus ? t(`أحسنت! أنهيت الجلسة ${pomodoro.completed + 1} من ${pomodoro.estimated}. استرح قليلًا.`, `Great work! You completed session ${pomodoro.completed + 1} of ${pomodoro.estimated}. Take a short break.`) : t(`لنبدأ الجلسة ${pomodoro.completed + 1} من ${pomodoro.estimated} للمهمة: ${task.title}`, `Start session ${pomodoro.completed + 1} of ${pomodoro.estimated}: ${task.title}`),
      target: { kind: "task", id: task.id }, section: "tasks",
    }, endAt).then((id) => { scheduledNotificationId.current = id; }).catch(() => undefined);
    return () => { if (scheduledNotificationId.current) { void cancelScheduledOmniNotification(scheduledNotificationId.current); scheduledNotificationId.current = null; } };
  }, [isArabic, pomodoro.completed, pomodoro.estimated, pomodoro.phase, task, t]);

  useEffect(() => {
    if (!task || pomodoro.secondsRemaining !== 0 || pomodoro.phase === "complete") return;
    const completedFocus = pomodoro.phase === "focus";
    setCompletionNotice(completedFocus ? "focus" : "break");
    if (Platform.OS !== "web") void Haptics.notificationAsync(completedFocus ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    const noticeTimer = setTimeout(() => setCompletionNotice(null), 5200);
    if (completedFocus) onPomodoroComplete(task.id, pomodoro.completed + 1);
    setPomodoro((current) => finishPomodoroPhase(current, durations));
    return () => clearTimeout(noticeTimer);
  }, [durations, onPomodoroComplete, pomodoro.phase, pomodoro.secondsRemaining, task]);

  const time = `${String(Math.floor(pomodoro.secondsRemaining / 60)).padStart(2, "0")}:${String(pomodoro.secondsRemaining % 60).padStart(2, "0")}`;
  const phaseCopy = pomodoro.phase === "focus" ? t("تركيز عميق", "Deep focus") : pomodoro.phase === "short_break" ? t("استراحة قصيرة", "Short break") : pomodoro.phase === "long_break" ? t("استراحة طويلة", "Long break") : t("الجلسات المقدّرة اكتملت", "Estimated sessions complete");
  const phaseColor = pomodoro.phase === "focus" ? colors.cyan : pomodoro.phase === "complete" ? colors.emerald : colors.purple;

  if (!task) return <View style={styles.empty}><View style={styles.emptyIcon}><MaterialIcons name="task-alt" size={30} color={colors.emerald} /></View><Text style={styles.emptyTitle}>{t("لا توجد مهام معلّقة الآن", "No pending tasks right now")}</Text><Text style={styles.emptyCopy}>{t("أنجزت ما يحتاج انتباهك. خذ لحظة هادئة أو أضف مهمة عند الحاجة.", "You cleared what needs your attention. Take a calm moment or add a task when needed.")}</Text><Pressable onPress={onExit} style={styles.exitButton}><Text style={styles.exitText}>{t("العودة للمهام", "Back to tasks")}</Text></Pressable></View>;

  const extend = () => { setPomodoro((current) => addPomodoroSession(current, durations)); onExtend(task.id); };
  return <View style={styles.screen}>
    <View style={styles.top}><Pressable onPress={onExit} style={styles.back}><MaterialIcons name="close" size={21} color={colors.muted} /></Pressable><View style={styles.modePill}><MaterialIcons name="center-focus-strong" size={15} color={colors.cyan} /><Text style={styles.modeText}>{t("وضع الرؤية النفقية", "Tunnel Vision")}</Text></View><Text style={styles.remaining}>{remaining} {t("متبقية", "left")}</Text></View>
    <View style={styles.center}>
      <View style={[styles.sessionPill, { borderColor: phaseColor }]}><Text style={[styles.sessionLabel, { color: phaseColor }]}>{phaseCopy}</Text><Text style={styles.sessionIndex}>{t(`الجلسة ${Math.min(pomodoro.completed + 1, pomodoro.estimated)} من ${pomodoro.estimated}`, `Session ${Math.min(pomodoro.completed + 1, pomodoro.estimated)} of ${pomodoro.estimated}`)}</Text><Text style={styles.ambientCaption}>{pomodoro.phase === "focus" ? t(`${durations.focusMinutes} دقيقة تركيز مع ${soundscape.label.ar}`, `${durations.focusMinutes}-minute focus with ${soundscape.label.en}`) : pomodoro.phase === "short_break" ? t(`${durations.shortBreakMinutes} دقائق استراحة قصيرة`, `${durations.shortBreakMinutes}-minute short break`) : pomodoro.phase === "long_break" ? t(`${durations.longBreakMinutes} دقيقة استراحة طويلة`, `${durations.longBreakMinutes}-minute long break`) : null}</Text>{pomodoro.phase === "focus" ? <><Text style={styles.soundscapeDetail}>{isArabic ? soundscape.detail.ar : soundscape.detail.en}</Text>{soundscape.attribution ? <Pressable accessibilityRole="link" accessibilityLabel={isArabic ? soundscape.attribution.label.ar : soundscape.attribution.label.en} onPress={() => { void Linking.openURL(soundscape.attribution!.url); }} style={({ pressed }) => [styles.attributionLink, pressed && styles.pressed]}><MaterialIcons name="open-in-new" size={12} color={colors.muted} /><Text style={styles.attributionText}>{isArabic ? soundscape.attribution.label.ar : soundscape.attribution.label.en}</Text></Pressable> : null}<Pressable onPress={() => setAmbientEnabled((enabled) => !enabled)} style={({ pressed }) => [styles.ambientToggle, pressed && styles.pressed]}><MaterialIcons name={ambientEnabled ? "volume-up" : "volume-off"} size={14} color={colors.cyan} /><Text style={styles.ambientToggleText}>{ambientEnabled ? t("إيقاف الصوت", "Mute ambience") : t("تشغيل الصوت", "Play ambience")}</Text></Pressable></> : null}</View>
      <View style={[styles.timerOuter, { borderColor: phaseColor }]}><View style={styles.timerInner}><Text style={styles.timer}>{time}</Text><Text style={styles.timerCaption}>{pomodoro.phase === "focus" ? t("جلسة واحدة. خطوة واحدة.", "One session. One step.") : t("استرح؛ ثم عُد إلى المهمة بهدوء.", "Rest, then return gently.")}</Text></View></View>
      {completionNotice ? <View style={[styles.completionNotice, completionNotice === "focus" ? styles.focusNotice : styles.breakNotice]}><MaterialIcons name={completionNotice === "focus" ? "celebration" : "bolt"} size={18} color={completionNotice === "focus" ? colors.emerald : colors.purple} /><View style={{ flex: 1 }}><Text style={[styles.completionNoticeTitle, { color: completionNotice === "focus" ? colors.emerald : colors.purple }]}>{completionNotice === "focus" ? t("انتهت جلسة التركيز", "Focus session complete") : t("انتهت الاستراحة", "Break complete")}</Text><Text style={styles.completionNoticeCopy}>{completionNotice === "focus" ? t("وصل التنبيه الصوتي، وخذ استراحة قصيرة بارتياح.", "A sound alert was sent. Take a short, well-earned break.") : t("وقت العودة بهدوء إلى مهمتك التالية.", "It is time to return calmly to your next focus block.")}</Text></View></View> : null}
      {task.isMicroGoal ? <View style={styles.microBadge}><MaterialIcons name="spa" size={14} color={colors.emerald} /><Text style={styles.microText}>{t("هدف مرن 50%", "Flexible 50% goal")}</Text></View> : null}
      <View style={styles.pomodoroBadge}><Text style={styles.pomodoroText}>🍅 {pomodoro.completed}/{pomodoro.estimated} {t("مكتمل", "complete")}</Text></View>
      <Text style={styles.title}>{task.title}</Text><Text style={styles.detail}>{task.detail}</Text>
      {task.project || task.tags?.length ? <View style={styles.focusMeta}><Text style={styles.focusMetaText}>{task.project ? `▣ ${task.project}` : ""}{task.project && task.tags?.length ? "  ·  " : ""}{task.tags?.map((tag) => `#${tag}`).join(" · ")}</Text></View> : null}
      {task.ifThenPlan ? <View style={styles.planCard}><MaterialIcons name="shield" size={18} color={colors.amber} /><View style={{ flex: 1 }}><Text style={styles.planEyebrow}>{t("خطة طوارئك", "Your fallback plan")}</Text><Text style={styles.planText}>{t(`إذا ${task.ifThenPlan.ifCondition}، ${task.ifThenPlan.thenAction}`, `If ${task.ifThenPlan.ifCondition}, ${task.ifThenPlan.thenAction}`)}</Text></View></View> : null}
    </View>
    <View style={styles.actions}>
      {pomodoro.phase === "complete" ? <><Text style={styles.completePrompt}>{t("أنهيت الجلسات المقدرة. كيف تريد المتابعة؟", "You finished the estimated sessions. How would you like to continue?")}</Text><Pressable onPress={() => onComplete(task.id)} style={({ pressed }) => [styles.complete, pressed && styles.pressed]}><MaterialIcons name="task-alt" size={21} color={colors.canvas} /><Text style={styles.completeText}>{t("إغلاق المهمة كمكتملة", "Mark task complete")}</Text></Pressable><Pressable onPress={extend} style={({ pressed }) => [styles.extend, pressed && styles.pressed]}><MaterialIcons name="add-circle-outline" size={18} color={colors.cyan} /><Text style={styles.extendText}>{t("إضافة جلسة إضافية", "Add another session")}</Text></Pressable></> : <><View style={styles.cycleNote}><MaterialIcons name={pomodoro.phase === "focus" ? "timer" : "self-improvement"} size={16} color={phaseColor} /><Text style={styles.cycleNoteText}>{pomodoro.phase === "focus" ? t("عند انتهاء الجلسة ستبدأ استراحة تلقائيًا.", "A break will start automatically after this session.") : t("عند انتهاء الاستراحة ستبدأ الجلسة التالية تلقائيًا.", "The next session starts automatically when this break ends.")}</Text></View><Pressable onPress={extend} style={({ pressed }) => [styles.extend, pressed && styles.pressed]}><MaterialIcons name="add-circle-outline" size={18} color={colors.cyan} /><Text style={styles.extendText}>{t("إضافة جلسة إضافية", "Add another session")}</Text></Pressable><Pressable onPress={() => onDefer(task.id)} style={({ pressed }) => [styles.defer, pressed && styles.pressed]}><MaterialIcons name="schedule" size={18} color={colors.amber} /><Text style={styles.deferText}>{t("تأجيل للغد", "Defer to tomorrow")}</Text></Pressable></>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas, padding: 20, justifyContent: "space-between" }, top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, back: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.05)" }, modePill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 11, borderWidth: 1, borderColor: "rgba(56,216,255,0.35)", backgroundColor: "rgba(56,216,255,0.08)" }, modeText: { color: colors.cyan, fontSize: 10, fontWeight: "900" }, remaining: { color: colors.muted, fontSize: 10, fontWeight: "800" },
  center: { alignItems: "center", gap: 12 }, sessionPill: { alignItems: "center", borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "rgba(255,255,255,0.035)" }, sessionLabel: { fontSize: 10, fontWeight: "900" }, sessionIndex: { color: colors.ink, fontSize: 12, fontWeight: "900", marginTop: 2 }, ambientCaption: { color: colors.muted, fontSize: 8, marginTop: 3 }, soundscapeChoices: { marginTop: 7, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 5 }, soundscapeChoice: { minHeight: 27, paddingHorizontal: 7, borderRadius: 9, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(56,216,255,0.08)", borderWidth: 1, borderColor: "rgba(56,216,255,0.24)" }, soundscapeChoiceActive: { backgroundColor: colors.cyan, borderColor: colors.cyan }, soundscapeChoiceText: { color: colors.cyan, fontSize: 8, fontWeight: "900" }, soundscapeChoiceTextActive: { color: colors.canvas }, soundscapeDetail: { color: colors.muted, fontSize: 8, marginTop: 4, textAlign: "center" }, attributionLink: { marginTop: 4, flexDirection: "row", alignItems: "center", gap: 3 }, attributionText: { color: colors.muted, fontSize: 7, textDecorationLine: "underline" }, ambientToggle: { marginTop: 6, minHeight: 28, paddingHorizontal: 8, borderRadius: 9, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(56,216,255,0.10)", borderWidth: 1, borderColor: "rgba(56,216,255,0.25)" }, ambientToggleText: { color: colors.cyan, fontSize: 8, fontWeight: "900" }, timerOuter: { width: 212, height: 212, borderRadius: 106, padding: 7, borderWidth: 3, backgroundColor: "rgba(56,216,255,0.08)", shadowColor: colors.cyan, shadowOpacity: 0.22, shadowRadius: 20, elevation: 6 }, timerInner: { flex: 1, borderRadius: 96, alignItems: "center", justifyContent: "center", backgroundColor: "#0A192B" }, timer: { color: colors.ink, fontSize: 42, lineHeight: 50, fontWeight: "900" }, timerCaption: { color: colors.muted, fontSize: 10, marginTop: 3, textAlign: "center", paddingHorizontal: 20 },
  microBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9, backgroundColor: "rgba(79,225,168,0.10)" }, microText: { color: colors.emerald, fontSize: 10, fontWeight: "900" }, pomodoroBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, backgroundColor: "rgba(255,122,118,0.12)" }, pomodoroText: { color: colors.coral, fontWeight: "900", fontSize: 11 }, title: { color: colors.ink, fontSize: 23, lineHeight: 31, fontWeight: "900", textAlign: "center" }, detail: { color: colors.muted, fontSize: 12, lineHeight: 19, textAlign: "center", paddingHorizontal: 10 }, focusMeta: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9, backgroundColor: "rgba(181,156,255,0.10)" }, focusMetaText: { color: colors.purple, fontSize: 9, fontWeight: "800", textAlign: "center" },
  planCard: { width: "100%", flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 14, backgroundColor: "rgba(255,195,107,0.08)", borderWidth: 1, borderColor: "rgba(255,195,107,0.28)" }, planEyebrow: { color: colors.amber, fontSize: 10, fontWeight: "900" }, planText: { color: colors.ink, fontSize: 11, lineHeight: 17, marginTop: 3, textAlign: "right" },
  completionNotice: { width: "100%", flexDirection: "row", alignItems: "center", gap: 9, padding: 11, borderRadius: 14, borderWidth: 1 }, focusNotice: { backgroundColor: "rgba(79,225,168,0.12)", borderColor: "rgba(79,225,168,0.36)" }, breakNotice: { backgroundColor: "rgba(181,156,255,0.12)", borderColor: "rgba(181,156,255,0.36)" }, completionNoticeTitle: { fontSize: 11, fontWeight: "900", textAlign: "right" }, completionNoticeCopy: { color: colors.ink, fontSize: 9, lineHeight: 14, textAlign: "right", marginTop: 2 }, actions: { gap: 9 }, cycleNote: { flexDirection: "row", alignItems: "center", gap: 7, padding: 10, borderRadius: 12, backgroundColor: "rgba(181,156,255,0.08)" }, cycleNoteText: { flex: 1, color: colors.muted, fontSize: 10, textAlign: "right" }, completePrompt: { color: colors.ink, fontSize: 12, textAlign: "center", fontWeight: "800" }, complete: { minHeight: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, backgroundColor: colors.emerald }, completeText: { color: colors.canvas, fontSize: 14, fontWeight: "900" }, extend: { minHeight: 45, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, borderWidth: 1, borderColor: "rgba(56,216,255,0.42)", backgroundColor: "rgba(56,216,255,0.07)" }, extendText: { color: colors.cyan, fontSize: 12, fontWeight: "900" }, defer: { minHeight: 45, borderRadius: 15, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, borderWidth: 1, borderColor: "rgba(255,195,107,0.42)", backgroundColor: "rgba(255,195,107,0.07)" }, deferText: { color: colors.amber, fontSize: 12, fontWeight: "900" }, pressed: { opacity: 0.74, transform: [{ scale: 0.98 }] },
  empty: { flex: 1, backgroundColor: colors.canvas, padding: 26, alignItems: "center", justifyContent: "center", gap: 10 }, emptyIcon: { width: 70, height: 70, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(79,225,168,0.12)" }, emptyTitle: { color: colors.ink, fontSize: 19, fontWeight: "900", textAlign: "center" }, emptyCopy: { color: colors.muted, fontSize: 12, lineHeight: 19, textAlign: "center" }, exitButton: { marginTop: 8, paddingHorizontal: 16, minHeight: 42, alignItems: "center", justifyContent: "center", borderRadius: 13, borderWidth: 1, borderColor: "rgba(56,216,255,0.38)" }, exitText: { color: colors.cyan, fontSize: 11, fontWeight: "900" },
});
