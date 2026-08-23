import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { HomeHabitsWidget } from "@/components/home/home-habits-widget";
import { HomeTasksWidget } from "@/components/home/home-tasks-widget";
import { getDailyEncouragement, type DailyEnergyLevel, type DailyMood } from "@/lib/daily-home-guidance";
import { XP_PER_LEVEL, type GamificationState } from "@/lib/gamification";
import type { HomeGuidanceTip } from "@/lib/home-guidance";
import { isSmallPhoneViewport } from "@/lib/responsive-layout";

type Task = {
  id: string;
  title: string;
  detail: string;
  energy: "high" | "medium" | "low";
  priority: "high" | "medium";
  done: boolean;
  reschedules: number;
  steps?: { id: string; title: string; done: boolean }[];
};

type Habit = { id: string; title: string; category: string; streak: number; emergency: boolean };
type FocusTimeSummary = { totalMinutes: number; projects: Array<{ name: string; minutes: number; sessions: number }>; tags: Array<{ name: string; minutes: number; sessions: number }> };

type Props = {
  isArabic: boolean;
  isSyncing: boolean;
  tasks: Task[];
  habits: Habit[];
  completedHabitIds: string[];
  onSync: () => void;
  onQuickAddTask: (title: string) => void;
  onToggleTask: (id: string) => void;
  onBreakFriction: (id: string) => void;
  onCompleteHabit: (id: string) => void;
  onOpenTasks: () => void;
  onOpenHabits: () => void;
  onOpenFinance: () => void;
  onOpenIdeas: () => void;
  onOpenRelationships: () => void;
  onOpenAdvisor: () => void;
  onOpenCommunity: () => void;
  onOpenNotifications: () => void;
  onOpenSettings: () => void;
  isAdmin: boolean;
  onOpenAppControl: () => void;
  dailyEnergy: DailyEnergyLevel;
  dailyMood: DailyMood;
  onDailyEnergyChange: (value: DailyEnergyLevel) => void;
  onDailyMoodChange: (value: DailyMood) => void;
  gamification: GamificationState;
  focusTimeSummary?: FocusTimeSummary;
  homeGuidanceTip: HomeGuidanceTip | null;
  onHomeGuidanceAction: (target: HomeGuidanceTip["target"]) => void;
  onDismissHomeGuidance: () => void;
};

const colors = { obsidian: "#070C1B", glass: "#0F172A", cyan: "#38D8FF", emerald: "#4FE1A8", amber: "#FFC36B", purple: "#B59CFF", ink: "#F2F7FC", muted: "#91A4B9" };

export function FocusedDashboard({ isArabic, isSyncing, tasks, habits, completedHabitIds, onSync, onQuickAddTask, onToggleTask, onBreakFriction, onCompleteHabit, onOpenTasks, onOpenHabits, onOpenFinance, onOpenIdeas, onOpenRelationships, onOpenAdvisor, onOpenCommunity, onOpenNotifications, onOpenSettings, isAdmin, onOpenAppControl, dailyEnergy, dailyMood, onDailyEnergyChange, onDailyMoodChange, gamification, focusTimeSummary, homeGuidanceTip, onHomeGuidanceAction, onDismissHomeGuidance }: Props) {
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const { width } = useWindowDimensions();
  const isCompact = isSmallPhoneViewport(width);
  const pending = tasks.filter((task) => !task.done).length;
  const encouragement = getDailyEncouragement();
  const today = new Date().toLocaleDateString(isArabic ? "ar-EG" : "en-US", { weekday: "long", day: "numeric", month: "long" });
  const levelProgress = (gamification.xp % XP_PER_LEVEL) / XP_PER_LEVEL;

  return (
    <ScrollView contentContainerStyle={[styles.content, isCompact && styles.contentCompact]} showsVerticalScrollIndicator={false}>
      <View style={styles.greetingRow}>
        <View>
          <Text style={styles.date}>{today}</Text>
          <Text style={[styles.greeting, isCompact && styles.greetingCompact]}>{t("صباح إنتاجي وهادئ", "A focused, calm morning")}</Text>
        </View>
        <View style={[styles.avatar, isCompact && styles.avatarCompact]}><Text style={styles.avatarText}>م</Text></View>
      </View>

      <View style={styles.energyCard}>
        <View style={styles.energyTop}>
          <View style={styles.energyIcon}><MaterialIcons name="bolt" size={20} color={colors.emerald} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.energyTitle}>{t("مؤشر طاقة اليوم", "Today’s energy")}</Text>
            <Text style={styles.energyHint}>{dailyEnergy === "high" ? t("طاقتك عالية: ابدأ بالأولوية الأصعب.", "High energy: start with the toughest priority.") : t("طاقتك منخفضة: ابدأ بمهمة خفيفة وواضحة.", "Low energy: start with a clear, lighter task.")}</Text>
          </View>
          <Pressable accessibilityLabel={t("تحديث لوحة اليوم", "Refresh daily dashboard")} onPress={onSync} style={({ pressed }) => [styles.syncButton, isCompact && styles.syncButtonCompact, pressed && styles.pressed]}>
            <MaterialIcons name={isSyncing ? "sync" : "refresh"} size={16} color={colors.emerald} />
            {!isCompact ? <Text style={styles.syncText}>{isSyncing ? t("مزامنة", "Syncing") : t("تحديث", "Refresh")}</Text> : null}
          </Pressable>
        </View>
        <View style={styles.energyBottom}>
          <Metric label={t("الطاقة", "Energy")} value={dailyEnergy === "high" ? t("عالية", "High") : t("منخفضة", "Low")} color={colors.cyan} />
          <Metric label={t("المزاج", "Mood")} value={dailyMood === "good" ? t("جيد", "Good") : t("منخفض", "Low")} color={dailyMood === "good" ? colors.emerald : colors.amber} />
          <Metric label={t("المهام", "Tasks")} value={`${pending}`} color={colors.amber} />
        </View>
      </View>

      <View style={styles.dailyQuoteCard}>
        <View style={styles.dailyQuoteHead}><View style={styles.dailyQuoteIcon}><MaterialIcons name="auto-awesome" size={20} color={colors.amber} /></View><Text style={styles.dailyQuoteLabel}>{t("حكمة اليوم", "Today’s encouragement")}</Text><View style={{ flex: 1 }} />{!isCompact ? <Text style={styles.dailyQuoteDate}>{today}</Text> : null}</View>
        <Text style={[styles.dailyQuoteText, isCompact && styles.dailyQuoteTextCompact]}>{encouragement}</Text>
        <Text style={styles.dailyQuoteFooter}>{t("خذ منها خطوة صغيرة الآن.", "Turn it into one small action now.")}</Text>
      </View>

      {homeGuidanceTip ? <HomeGuidanceCard tip={homeGuidanceTip} isArabic={isArabic} onAction={() => onHomeGuidanceAction(homeGuidanceTip.target)} onDismiss={onDismissHomeGuidance} /> : null}

      <View style={styles.gamificationCard}>
        <View style={styles.gamificationHead}><View style={styles.gamificationIcon}><MaterialIcons name="military-tech" size={20} color={colors.amber} /></View><View style={{ flex: 1 }}><Text style={styles.gamificationTitle}>{t("رحلة الإنجاز", "Achievement journey")}</Text><Text style={styles.gamificationHint}>{t(`${gamification.badges.length} أوسمة مفتوحة`, `${gamification.badges.length} badges unlocked`)}</Text></View><Text style={styles.levelText}>{t(`المستوى ${gamification.level}`, `Level ${gamification.level}`)}</Text></View>
        <View style={styles.xpProgressTrack}><View style={[styles.xpProgressFill, { width: `${Math.max(2, Math.round(levelProgress * 100))}%` }]} /></View>
        <Text style={styles.xpProgressText}>{t(`${gamification.xp % XP_PER_LEVEL} / ${XP_PER_LEVEL} نقطة للمستوى التالي`, `${gamification.xp % XP_PER_LEVEL} / ${XP_PER_LEVEL} XP to the next level`)}</Text>
        {gamification.badges.length ? <View style={styles.badgeRow}>{gamification.badges.map((badge) => <View key={badge} style={styles.badgeChip}><MaterialIcons name="workspace-premium" size={13} color={colors.amber} /><Text style={styles.badgeText}>{badge}</Text></View>)}</View> : null}
      </View>

      {focusTimeSummary?.totalMinutes ? <View style={styles.focusTimeCard}><View style={styles.gamificationHead}><View style={[styles.gamificationIcon, { backgroundColor: "rgba(181,156,255,0.14)" }]}><MaterialIcons name="timer" size={20} color={colors.purple} /></View><View style={{ flex: 1 }}><Text style={styles.gamificationTitle}>{t("وقت التركيز حسب المشاريع", "Focus time by project")}</Text><Text style={styles.gamificationHint}>{t(`${focusTimeSummary.totalMinutes} دقيقة تركيز مسجلة`, `${focusTimeSummary.totalMinutes} focus minutes recorded`)}</Text></View></View>{focusTimeSummary.projects.slice(0, 3).map((project) => <View key={project.name} style={styles.focusTimeRow}><Text style={styles.focusTimeName}>▣ {project.name}</Text><Text style={styles.focusTimeValue}>{t(`${project.minutes} د · ${project.sessions} جلسات`, `${project.minutes}m · ${project.sessions} sessions`)}</Text></View>)}{focusTimeSummary.tags.length ? <View style={styles.focusTagRow}>{focusTimeSummary.tags.slice(0, 5).map((tag) => <Text key={tag.name} style={styles.focusTag}>#{tag.name} · {tag.minutes}{t("د", "m")}</Text>)}</View> : null}</View> : null}

      <View style={styles.checkInCard}>
        <View style={styles.checkInHead}><MaterialIcons name="self-improvement" size={18} color={colors.purple} /><View style={{ flex: 1 }}><Text style={styles.checkInTitle}>{t("كيف تشعر اليوم؟", "How are you today?")}</Text><Text style={styles.checkInHint}>{t("سيُعاد ترتيب اقتراحات المهام بناءً على اختيارك.", "Task suggestions will be reordered from your choices.")}</Text></View></View>
        <Text style={styles.choiceLabel}>{t("الطاقة", "Energy")}</Text><View style={styles.choiceRow}><Choice label={t("عالية", "High")} icon="bolt" selected={dailyEnergy === "high"} color={colors.cyan} onPress={() => onDailyEnergyChange("high")} /><Choice label={t("منخفضة", "Low")} icon="battery-alert" selected={dailyEnergy === "low"} color={colors.amber} onPress={() => onDailyEnergyChange("low")} /></View>
        <Text style={styles.choiceLabel}>{t("المزاج", "Mood")}</Text><View style={styles.choiceRow}><Choice label={t("جيد", "Good")} icon="sentiment-satisfied-alt" selected={dailyMood === "good"} color={colors.emerald} onPress={() => onDailyMoodChange("good")} /><Choice label={t("سيء", "Low")} icon="sentiment-dissatisfied" selected={dailyMood === "low"} color={colors.amber} onPress={() => onDailyMoodChange("low")} /></View>
      </View>

      <HomeTasksWidget tasks={tasks} isArabic={isArabic} onAddTask={onQuickAddTask} onToggleTask={onToggleTask} onBreakFriction={onBreakFriction} onOpenTasks={onOpenTasks} />
      <HomeHabitsWidget habits={habits} completedIds={completedHabitIds} isArabic={isArabic} onCompleteHabit={onCompleteHabit} onOpenHabits={onOpenHabits} />

      <View style={styles.sectionCard}>
        <Text style={styles.quickTitle}>{t("كل أقسام OMNI LIFE", "All OMNI LIFE sections")}</Text>
        <Text style={styles.quickText}>{t("اختر أي قسم من البطاقات للوصول إليه مباشرة.", "Choose any card to open its section directly.")}</Text>
        <View style={styles.sectionGrid}>
          <SectionCard label={t("المهام", "Tasks")} hint={`${pending} ${t("متبقية", "pending")}`} icon="task-alt" color={colors.cyan} onPress={onOpenTasks} />
          <SectionCard label={t("العادات", "Habits")} hint={`${habits.length} ${t("عادة", "habits")}`} icon="local-fire-department" color={colors.amber} onPress={onOpenHabits} />
          <SectionCard label={t("المال", "Finance")} hint={t("التزاماتك", "Recurring entries")} icon="account-balance-wallet" color={colors.emerald} onPress={onOpenFinance} />
          <SectionCard label={t("الأفكار", "Ideas")} hint={t("حوّلها لمهام", "Turn into tasks")} icon="lightbulb" color={colors.amber} onPress={onOpenIdeas} />
          <SectionCard label={t("العلاقات", "Relationships")} hint={t("جهاتك المهمة", "Your key contacts")} icon="groups" color={colors.purple} onPress={onOpenRelationships} />
          <SectionCard label={t("المستشار", "Advisor")} hint={t("خطوة عملية", "Next practical step")} icon="psychology" color={colors.cyan} onPress={onOpenAdvisor} />
          <SectionCard label={t("المجتمع", "Community")} hint={t("دعم واشتراكات", "Support & plans")} icon="forum" color={colors.emerald} onPress={onOpenCommunity} />
          <SectionCard label={t("التنبيهات", "Alerts")} hint={t("تذكيراتك", "Your reminders")} icon="notifications-active" color={colors.cyan} onPress={onOpenNotifications} />
          <SectionCard label={t("الإعدادات", "Settings")} hint={t("التجربة", "Experience")} icon="settings" color={colors.muted} onPress={onOpenSettings} />
          {isAdmin ? <SectionCard label={t("تحكم التطبيق", "App control")} hint={t("إدارة المحتوى", "Manage app content")} icon="admin-panel-settings" color={colors.emerald} onPress={onOpenAppControl} /> : null}
        </View>
      </View>
    </ScrollView>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={[styles.metricValue, { color }]}>{value}</Text></View>;
}

function HomeGuidanceCard({ tip, isArabic, onAction, onDismiss }: { tip: HomeGuidanceTip; isArabic: boolean; onAction: () => void; onDismiss: () => void }) {
  const copy = isArabic ? { title: tip.title.ar, body: tip.body.ar, action: tip.action.ar, day: `تلميح اليوم ${tip.day} من 7`, dismiss: "فهمت، أخفِ التلميح" } : { title: tip.title.en, body: tip.body.en, action: tip.action.en, day: `Day ${tip.day} of 7`, dismiss: "Got it, hide tip" };
  return <View style={styles.guidanceCard} accessibilityLabel={copy.title}><View style={styles.guidanceHead}><View style={styles.guidanceIcon}><MaterialIcons name={tip.icon as keyof typeof MaterialIcons.glyphMap} size={19} color={colors.cyan} /></View><View style={{ flex: 1 }}><Text style={styles.guidanceEyebrow}>{copy.day}</Text><Text style={styles.guidanceTitle}>{copy.title}</Text></View><Pressable onPress={onDismiss} accessibilityLabel={copy.dismiss} style={({ pressed }) => [styles.guidanceDismiss, pressed && styles.pressed]}><MaterialIcons name="close" size={17} color={colors.muted} /></Pressable></View><Text style={styles.guidanceBody}>{copy.body}</Text><Pressable onPress={onAction} style={({ pressed }) => [styles.guidanceAction, pressed && styles.pressed]}><Text style={styles.guidanceActionText}>{copy.action}</Text><MaterialIcons name="arrow-back" size={16} color={colors.obsidian} /></Pressable></View>;
}

function SectionCard({ label, hint, icon, color, onPress }: { label: string; hint: string; icon: keyof typeof MaterialIcons.glyphMap; color: string; onPress: () => void }) {
  const { width } = useWindowDimensions();
  const isCompact = isSmallPhoneViewport(width);
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.sectionItem, isCompact && styles.sectionItemCompact, { borderColor: `${color}42` }, pressed && styles.pressed]}><View style={styles.sectionItemHead}><View style={[styles.sectionIcon, { backgroundColor: `${color}18` }]}><MaterialIcons name={icon} size={17} color={color} /></View><View style={[styles.sectionArrow, { backgroundColor: `${color}12` }]}><MaterialIcons name="arrow-back" size={13} color={color} /></View></View><Text style={styles.sectionLabel} numberOfLines={1}>{label}</Text><Text style={styles.sectionHint} numberOfLines={1}>{hint}</Text></Pressable>;
}

function Choice({ label, icon, selected, color, onPress }: { label: string; icon: keyof typeof MaterialIcons.glyphMap; selected: boolean; color: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.choice, selected && { borderColor: color, backgroundColor: `${color}16` }, pressed && styles.pressed]}><MaterialIcons name={icon} size={16} color={selected ? color : colors.muted} /><Text style={[styles.choiceText, selected && { color }]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24, gap: 14 }, contentCompact: { paddingHorizontal: 11, paddingTop: 12, paddingBottom: 19, gap: 11 },
  greetingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  date: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  greeting: { color: colors.ink, fontSize: 23, lineHeight: 29, fontWeight: "900", marginTop: 4 }, greetingCompact: { fontSize: 20, lineHeight: 25 },
  avatar: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#172A42", borderWidth: 1, borderColor: "rgba(56,216,255,0.28)" }, avatarCompact: { width: 37, height: 37, borderRadius: 13 },
  avatarText: { color: colors.cyan, fontSize: 17, fontWeight: "900" },
  energyCard: { borderRadius: 20, padding: 14, gap: 11, backgroundColor: colors.glass, borderWidth: 1, borderColor: "rgba(79,225,168,0.38)" },
  energyTop: { flexDirection: "row", alignItems: "center", gap: 9 },
  energyIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(79,225,168,0.13)" },
  energyTitle: { color: colors.ink, fontSize: 13, fontWeight: "900" },
  energyHint: { color: colors.emerald, fontSize: 10, marginTop: 2, fontWeight: "700" },
  syncButton: { minHeight: 31, paddingHorizontal: 8, borderRadius: 9, borderWidth: 1, borderColor: "rgba(79,225,168,0.45)", flexDirection: "row", alignItems: "center", gap: 4 }, syncButtonCompact: { width: 32, paddingHorizontal: 0, justifyContent: "center" },
  syncText: { color: colors.emerald, fontSize: 9, fontWeight: "900" },
  energyBottom: { flexDirection: "row", gap: 7 },
  metric: { flex: 1, backgroundColor: "rgba(255,255,255,0.035)", paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  metricLabel: { color: colors.muted, fontSize: 9, fontWeight: "700" },
  metricValue: { fontSize: 13, fontWeight: "900", marginTop: 3 },
  dailyQuoteCard: { borderRadius: 21, padding: 16, gap: 9, backgroundColor: "#142842", borderWidth: 1, borderColor: "rgba(255,195,107,0.42)", shadowColor: "#000", shadowOpacity: 0.17, shadowRadius: 12, elevation: 3 },
  dailyQuoteHead: { flexDirection: "row", alignItems: "center", gap: 7 },
  dailyQuoteIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,195,107,0.13)" },
  dailyQuoteLabel: { color: colors.amber, fontSize: 11, fontWeight: "900" },
  dailyQuoteDate: { color: colors.muted, fontSize: 8, fontWeight: "700" },
  dailyQuoteText: { color: colors.ink, fontSize: 17, lineHeight: 26, fontWeight: "900", textAlign: "right" }, dailyQuoteTextCompact: { fontSize: 15, lineHeight: 23 },
  dailyQuoteFooter: { color: "#D8E6F2", fontSize: 10, fontWeight: "700", textAlign: "right" },
  guidanceCard: { borderRadius: 20, padding: 14, gap: 10, backgroundColor: "#102941", borderWidth: 1, borderColor: "rgba(56,216,255,0.46)" },
  guidanceHead: { flexDirection: "row", alignItems: "center", gap: 9 },
  guidanceIcon: { width: 37, height: 37, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(56,216,255,0.14)" },
  guidanceEyebrow: { color: colors.cyan, fontSize: 8, fontWeight: "900", textAlign: "right" },
  guidanceTitle: { color: colors.ink, fontSize: 13, fontWeight: "900", marginTop: 2, textAlign: "right" },
  guidanceDismiss: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.05)" },
  guidanceBody: { color: "#D7E5F1", fontSize: 10, lineHeight: 16, textAlign: "right" },
  guidanceAction: { minHeight: 35, paddingHorizontal: 12, borderRadius: 11, alignSelf: "flex-end", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.cyan },
  guidanceActionText: { color: colors.obsidian, fontSize: 10, fontWeight: "900" },
  gamificationCard: { borderRadius: 18, padding: 13, gap: 8, backgroundColor: "rgba(255,195,107,0.08)", borderWidth: 1, borderColor: "rgba(255,195,107,0.34)" },
  focusTimeCard: { gap: 8, padding: 13, borderRadius: 18, backgroundColor: "rgba(181,156,255,0.08)", borderWidth: 1, borderColor: "rgba(181,156,255,0.26)" }, focusTimeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }, focusTimeName: { flex: 1, color: colors.ink, fontSize: 10, fontWeight: "800", textAlign: "right" }, focusTimeValue: { color: colors.purple, fontSize: 9, fontWeight: "900" }, focusTagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingTop: 2 }, focusTag: { color: colors.cyan, fontSize: 8, fontWeight: "800", paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, backgroundColor: "rgba(56,216,255,0.10)" },
  gamificationHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  gamificationIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,195,107,0.14)" },
  gamificationTitle: { color: colors.ink, fontSize: 12, fontWeight: "900", textAlign: "right" },
  gamificationHint: { color: colors.muted, fontSize: 9, fontWeight: "700", marginTop: 2, textAlign: "right" },
  levelText: { color: colors.amber, fontSize: 11, fontWeight: "900" },
  xpProgressTrack: { height: 7, borderRadius: 6, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.10)" },
  xpProgressFill: { height: "100%", borderRadius: 6, backgroundColor: colors.amber },
  xpProgressText: { color: colors.amber, fontSize: 9, fontWeight: "800", textAlign: "right" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  badgeChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 8, backgroundColor: "rgba(255,195,107,0.12)" },
  badgeText: { color: colors.ink, fontSize: 8, fontWeight: "800" },
  checkInCard: { borderRadius: 18, padding: 13, gap: 7, backgroundColor: colors.glass, borderWidth: 1, borderColor: "rgba(181,156,255,0.28)" },
  checkInHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkInTitle: { color: colors.ink, fontSize: 12, fontWeight: "900", textAlign: "right" },
  checkInHint: { color: colors.muted, fontSize: 9, marginTop: 2, textAlign: "right" },
  choiceLabel: { color: colors.muted, fontSize: 9, fontWeight: "900", textAlign: "right", marginTop: 2 },
  choiceRow: { flexDirection: "row", gap: 7 },
  choice: { flex: 1, minHeight: 34, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5 },
  choiceText: { color: colors.muted, fontSize: 9, fontWeight: "900" },
  sectionCard: { borderRadius: 20, padding: 13, gap: 6, backgroundColor: colors.glass, borderWidth: 1, borderColor: "rgba(56,216,255,0.20)" },
  quickTitle: { color: colors.ink, fontSize: 14, fontWeight: "900" },
  quickText: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  sectionGrid: { flexDirection: "row", flexWrap: "wrap", columnGap: 8, rowGap: 8, marginTop: 6, justifyContent: "space-between" },
  sectionItem: { width: "48.5%", minHeight: 88, borderRadius: 15, padding: 10, gap: 4, backgroundColor: "rgba(255,255,255,0.035)", borderWidth: 1, shadowColor: "#000", shadowOpacity: 0.10, shadowRadius: 6, elevation: 1 }, sectionItemCompact: { minHeight: 80, padding: 8 },
  sectionItemHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionIcon: { width: 31, height: 31, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sectionArrow: { width: 22, height: 22, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  sectionLabel: { color: colors.ink, fontSize: 11, lineHeight: 15, fontWeight: "900", textAlign: "right", marginTop: 1 },
  sectionHint: { color: colors.muted, fontSize: 8, lineHeight: 12, textAlign: "right" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
