import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenContainer } from "@/components/screen-container";
import { FixedBackControl } from "@/components/fixed-back-control";
import { compactShellStyles } from "@/components/compact-shell-styles";
import { frictionLoadingStyles } from "@/components/friction-loading-styles";
import { NativeDateTimePicker } from "@/components/native-date-time-picker";
import { InAppAdSlot } from "@/components/in-app-ad-slot";
import { ContactReminderEditor, type ContactReminderDraft } from "@/components/contact-reminder-editor";
import { RecurringFinanceEditor, type RecurringFinanceDraft, type RecurringFinanceKind } from "@/components/recurring-finance-editor";
import { TaskHabitEditor, type HabitDraftInput, type PlannerMode, type TaskDraftInput } from "@/components/task-habit-editor";
import { FocusedDashboard } from "@/components/home/focused-dashboard";
import { CommunityView } from "@/components/community-view";
import { AdminDashboardView, type AdminRecentAddition } from "@/components/admin-dashboard-view";
import { SubscriptionPaywall } from "@/components/premium/subscription-paywall";
import { ManualAccessGate } from "@/components/manual-access-gate";
import { NotificationControlPanel } from "@/components/notification-control-panel";
import { OmniNotificationRoutingBridge } from "@/components/omni-notification-routing-bridge";
import { promotionInboxStyles } from "@/components/promotion-inbox-styles";
import { SettingsView } from "@/components/settings-view";
import { InformationPagesView } from "@/components/information-pages-view";
import type { AdminBulkAction, AdminHabitAction, AdminTaskAction } from "@/components/settings-view";
import { TunnelVisionScreen } from "@/components/tunnel-vision-screen";
import { EveningBrainDumpModal } from "@/components/evening-brain-dump-modal";
import { EnergyImpactFeedback } from "@/components/energy-impact-feedback";
import { ZeroGuiltRecoveryModal } from "@/components/zero-guilt-recovery-modal";
import { useAuth } from "@/hooks/use-auth";
import { isAuthorizedOmniAdmin } from "@/lib/admin-access";
import { clearManualProfile, clearOmniAppData, loadManualProfile, loadWelcomeCompletedAt, loadWelcomeSeen, markWelcomeSeen, saveManualProfile, type ManualProfileSession } from "@/lib/manual-session";
import { exportAccountData } from "@/lib/account-data-export";
import { selectTaskForPomodoro } from "@/lib/account-reset-focus-guards";
import { buildFrictionSteps, filterLifeTasks, getAdvisorResponse } from "@/lib/omni-life-center-utils";
import { cancelEveningBrainDumpReminder, configureOmniNotificationChannel, scheduleAutomaticOmniRoutineNotifications, scheduleEveningBrainDumpReminder, sendInstantHighPriorityNotification } from "@/lib/omni-notifications";
import { registerOmniRemotePushDevice } from "@/lib/omni-remote-push";
import { importSingleDeviceContact } from "@/lib/contact-import";
import { cancelContactRelationshipReminder, scheduleContactRelationshipReminder } from "@/lib/contact-reminder-service";
import { type ContactRelationshipReminder } from "@/lib/contact-reminder-rules";
import { prioritizeTasksForToday, type DailyEnergyLevel, type DailyMood } from "@/lib/daily-home-guidance";
import { canAddRecurringFinanceEntry, FREE_RECURRING_FINANCE_LIMIT, type RecurringFinanceReminderFrequency } from "@/lib/recurring-finance-rules";
import { canAddDailyManualTransaction, FREE_DAILY_TRANSACTION_LIMIT, isRecordedOnDate, parsePositiveEgpAmount } from "@/lib/daily-expense-rules";
import { cancelRecurringFinanceReminders, scheduleRecurringFinanceReminder } from "@/lib/recurring-finance-reminders";
import { scanRecentBankSms } from "@/lib/bank-sms-tracker";
import { getBankSmsCategoryLabel } from "@/lib/bank-sms-parser";
import { isSmallPhoneViewport } from "@/lib/responsive-layout";
import { assessOverspending, DEFAULT_DAILY_SPENDING_LIMIT_EGP } from "@/lib/overspending-rules";
import { buildMonthlyCategoryReport } from "@/lib/finance-category-report";
import { buildWeeklyReport, type WeeklyPersona } from "@/lib/weekly-analytics";
import { awardGamification, XP_PER_LEVEL, type GamificationAction, type GamificationState } from "@/lib/gamification";
import { buildCategoryBudgetAlertKey, buildCategoryBudgetStatuses } from "@/lib/finance-category-budgets";
import { captureCurrentTaskLocation, registerTaskGeofences, type TaskLocation } from "@/lib/task-geofencing";
import { buildEnergyMatrix, chooseTunnelTask, createMicroGoalTitle, getMissedTaskIds, tomorrowAt, type EnergyImpact, type IfThenPlan } from "@/lib/behavioral-recovery";
import { DEFAULT_SOUND_PREFERENCES, loadSoundPreferences, previewNotificationSound, saveSoundPreferences, type NotificationSoundSection, type SoundPreferences } from "@/lib/notification-sound-service";
import { DEFAULT_POMODORO_DURATIONS, normalizePomodoroDurations, type PomodoroDurations } from "@/lib/pomodoro-engine";
import { requestFocusDndAccess, setFocusDoNotDisturb } from "@/lib/focus-do-not-disturb";
import { getAndroidBackgroundReliabilityStatus, openAndroidBatteryOptimizationSettings, openAndroidExactAlarmSettings } from "@/lib/android-background-reliability";
import { canAccessPremiumFeature, hasPremiumAccess } from "@/lib/subscription-guard";
import { habitDailyTarget, scheduleHabitReminderTimes, scheduleTaskReminderOffsets, TASK_REMINDER_OPTIONS, type HabitFrequency, type TaskReminderOffset } from "@/lib/task-habit-planning";
import type { CampaignLinkClick, OmniNotificationTarget, PromotionBadgeData } from "@/lib/notification-routing";
import { formatPromotionReceivedAt, markPromotionInboxRead, mergePromotionInbox, removePromotionInboxItem, type PromotionInboxItem } from "@/lib/promotion-inbox";
import { weeklyReviewButtonStyles } from "@/components/weekly-review-button-styles";
import { startOAuthLogin } from "@/constants/oauth";
import { DEFAULT_INFORMATION_CONTENT, loadInformationContent, saveInformationContent, type InformationContent, type InformationPageKey } from "@/lib/information-content";
import { createHomeGuidanceProgress, dismissHomeGuidanceTip, getActiveHomeGuidanceTip, loadHomeGuidanceProgress, restartHomeGuidance, saveHomeGuidanceProgress, setHomeGuidanceEnabled, type HomeGuidanceProgress, type HomeGuidanceTarget } from "@/lib/home-guidance";
import { trpc } from "@/lib/trpc";

type Screen = "dashboard" | "tasks" | "habits" | "finance" | "ideas" | "relationships" | "advisor" | "community" | "settings" | "notifications" | "admin" | "weeklyReport" | "tunnel" | "information";
type Energy = "high" | "medium" | "low";
type ComposerType = "task" | "habit" | "idea" | "contact" | "expense" | "category" | null;

type Task = {
  id: string;
  title: string;
  detail: string;
  energy: Energy;
  priority: "high" | "medium";
  done: boolean;
  reschedules: number;
  scheduledAt?: string;
  reminderOffsets?: TaskReminderOffset[];
  reminderNotificationIds?: string[];
  location?: TaskLocation;
  ifThenPlan?: IfThenPlan;
  energyImpact?: EnergyImpact;
  isMicroGoal?: boolean;
  estimatedPomodoros?: number;
  completedPomodoros?: number;
  project?: string;
  tags?: string[];
  steps?: { id: string; title: string; done: boolean }[];
  createdAt?: string;
};

type Habit = { id: string; title: string; category: string; detail: string; frequency: HabitFrequency; reminderTimes: string[]; reminderNotificationIds?: string[]; streak: number; emergency: boolean; ifThenPlan?: IfThenPlan; isMicroGoal?: boolean; lastCompletedAt?: string; createdAt?: string };
type Idea = { id: string; title: string; detail: string; old: boolean; archived: boolean; createdAt?: string };
type Subscription = { id: string; title: string; amount: number; category: string; wasteful: boolean; kind?: "installment" | "savings_circle" | "subscription" | "daily_expense"; recordedAt?: string; reminderFrequency?: RecurringFinanceReminderFrequency; reminderAt?: string; reminderNotificationIds?: string[]; reminderEnabled?: boolean; endsAt?: string; earlyReminderMinutes?: number; source?: "manual" | "sms"; smsFingerprint?: string; transactionDirection?: "expense" | "income" };
type Contact = { id: string; name: string; phone: string; relation: string; note: string; reminder?: ContactRelationshipReminder };
type ChatMessage = { id: string; from: "ai" | "user"; text: string };

const CATEGORY_BUDGETS_STORAGE_KEY = "omni-life:category-budgets:v1";
const CATEGORY_BUDGET_ALERTS_STORAGE_KEY = "omni-life:category-budget-alerts:v1";
const GAMIFICATION_STORAGE_KEY = "omni-life:gamification:v1";
const EVENING_CLOSURE_STORAGE_KEY = "omni-life:evening-closure:v1";
const POMODORO_DURATIONS_STORAGE_KEY = "omni-life:pomodoro-durations:v1";
const FOCUS_DND_STORAGE_KEY = "omni-life:focus-dnd:v1";
const CONTACTS_STORAGE_KEY = "omni-life:relationships:v1";
const AI_ROUTINE_COPY_STORAGE_PREFIX = "omni-life:ai-routine-copy:v1";

const palette = {
  canvas: "#07111F",
  card: "#101F33",
  raised: "#172A42",
  cyan: "#38D8FF",
  emerald: "#4FE1A8",
  amber: "#FFC36B",
  coral: "#FF7A76",
  purple: "#B59CFF",
  ink: "#F2F7FC",
  muted: "#91A4B9",
  border: "rgba(56,216,255,0.22)",
  track: "#233851",
};

const initialTasks: Task[] = [
  { id: "t1", title: "مراجعة خطة الربع القادم", detail: "ساعة تركيز بلا اجتماعات", energy: "high", priority: "high", done: false, reschedules: 0, reminderOffsets: ["at_time"] },
  { id: "t2", title: "ترتيب مكتب العمل", detail: "تهيئة بيئة هادئة لجلسة Zen", energy: "low", priority: "medium", done: false, reschedules: 1, reminderOffsets: ["at_time", "15m"] },
  { id: "t3", title: "إرسال متابعة إلى فريق التصميم", detail: "تلخيص ثلاث نقاط فقط", energy: "medium", priority: "high", done: true, reschedules: 0, reminderOffsets: ["at_time"] },
];

const initialHabits: Habit[] = [
  { id: "h1", title: "مشي الصباح", category: "صحة وحركة", detail: "20 دقيقة قبل بدء اليوم", frequency: "daily", reminderTimes: [], streak: 14, emergency: false },
  { id: "h2", title: "قراءة 20 دقيقة", category: "تطور شخصي", detail: "صفحات قليلة بثبات", frequency: "daily", reminderTimes: [], streak: 9, emergency: false },
  { id: "h3", title: "إيقاف الشاشات قبل النوم", category: "تعافٍ ونوم", detail: "قبل موعد النوم بساعة", frequency: "daily", reminderTimes: [], streak: 6, emergency: true },
];

const initialIdeas: Idea[] = [
  { id: "i1", title: "نشرة أسبوعية لرحلة التعافي", detail: "محتوى قصير يُبنى من طقوس المساء", old: false, archived: false },
  { id: "i2", title: "مشروع دورة تنظيم الطاقة", detail: "فكرة قديمة تستحق قرارًا: تنفيذ أو أرشفة.", old: true, archived: false },
];

const initialSubs: Subscription[] = [
  { id: "s1", title: "منصة تدريب", amount: 29, category: "تطوير", wasteful: false, kind: "subscription" },
  { id: "s2", title: "خدمة بث غير مستخدمة", amount: 14, category: "ترفيه", wasteful: true, kind: "subscription" },
];

const initialContacts: Contact[] = [
  { id: "c1", name: "سارة أحمد", phone: "+20 10 1234 5678", relation: "صديقة", note: "متابعة رحلة الدراسة يوم الخميس" },
  { id: "c2", name: "كريم منصور", phone: "+20 11 4455 8800", relation: "عمل", note: "إرسال ملخص المشروع" },
];

const seedNotifications = [
  { id: "n1", title: "نافذة تركيز عالية", body: "طاقتك اليوم مثالية للمهمة الاستراتيجية. ابدأ بمدة 25 دقيقة.", read: false, icon: "bolt" },
  { id: "n2", title: "تذكير بالترطيب", body: "بقي 900 مل للوصول إلى هدف الماء اليومي.", read: false, icon: "water-drop" },
  { id: "n3", title: "سلسلة القراءة", body: "أنهيت 9 أيام متتالية. لا تدع الزخم يتوقف.", read: true, icon: "local-fire-department" },
];

function Icon({ name, size = 20, color = palette.ink }: { name: any; size?: number; color?: string }) {
  return <MaterialIcons name={name} size={size} color={color} />;
}

function ProgressBar({ value, color = palette.cyan }: { value: number; color?: string }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.max(4, Math.min(100, value))}%`, backgroundColor: color }]} />
    </View>
  );
}

function Tag({ label, color = palette.cyan }: { label: string; color?: string }) {
  return (
    <View style={[styles.tag, { borderColor: `${color}66`, backgroundColor: `${color}20` }]}>
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  );
}

function ActionButton({ label, icon, onPress, tone = "cyan", compact = false }: { label: string; icon: any; onPress: () => void; tone?: "cyan" | "emerald" | "coral" | "ghost"; compact?: boolean }) {
  const colors = tone === "emerald" ? [palette.emerald, "#062D26"] : tone === "coral" ? [palette.coral, "#401E2A"] : tone === "ghost" ? [palette.muted, palette.raised] : [palette.cyan, "#062C3A"];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionButton, compact && styles.actionButtonCompact, { backgroundColor: colors[1], borderColor: `${colors[0]}AA` }, pressed && styles.pressed]}>
      <Icon name={icon} size={compact ? 16 : 18} color={colors[0]} />
      <Text style={[styles.actionLabel, compact && styles.actionLabelCompact, { color: colors[0] }]}>{label}</Text>
    </Pressable>
  );
}

function MetricCard({ icon, value, label, color, progress }: { icon: any; value: string; label: string; color: string; progress: number }) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: `${color}20` }]}><Icon name={icon} size={17} color={color} /></View>
        <Text style={[styles.metricPercent, { color }]}>{progress}%</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <ProgressBar value={progress} color={color} />
    </View>
  );
}

function ScreenTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <View style={styles.titleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.screenTitle}>{title}</Text>
        {subtitle ? <Text style={styles.screenSubtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function OmniLifeCenter() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWebDesktop = Platform.OS === "web" && width >= 960;
  const isSmallPhone = isSmallPhoneViewport(width);
  const { user, isAuthenticated, logout } = useAuth();
  const [manualProfile, setManualProfile] = useState<ManualProfileSession | null>(null);
  const [manualReady, setManualReady] = useState(false);
  const [welcomeSeen, setWelcomeSeen] = useState(false);
  const [welcomeCompletedAt, setWelcomeCompletedAt] = useState<string | null>(null);
  const [homeGuidanceProgress, setHomeGuidanceProgress] = useState<HomeGuidanceProgress | null>(null);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [informationPage, setInformationPage] = useState<InformationPageKey>("privacy");
  const [informationContent, setInformationContent] = useState<InformationContent>(DEFAULT_INFORMATION_CONTENT);
  const [informationHydrated, setInformationHydrated] = useState(false);
  const [isArabic, setIsArabic] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [dailyBriefingEnabled, setDailyBriefingEnabled] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isResettingAppData, setIsResettingAppData] = useState(false);
  const water = 2100;
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [habits, setHabits] = useState<Habit[]>(initialHabits);
  const [dailyEnergy, setDailyEnergy] = useState<DailyEnergyLevel>("high");
  const [dailyMood, setDailyMood] = useState<DailyMood>("good");
  const [habitCompletionCounts, setHabitCompletionCounts] = useState<Record<string, number>>({});
  const [ideas, setIdeas] = useState<Idea[]>(initialIdeas);
  const [subs, setSubs] = useState<Subscription[]>(initialSubs);
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [contactReminderEditorId, setContactReminderEditorId] = useState<string | null>(null);
  const [contactsHydrated, setContactsHydrated] = useState(false);
  const [isImportingContact, setIsImportingContact] = useState(false);
  const [recurringFinanceEditorVisible, setRecurringFinanceEditorVisible] = useState(false);
  const [editingRecurringEntryId, setEditingRecurringEntryId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState(seedNotifications);
  const [promotionInbox, setPromotionInbox] = useState<PromotionInboxItem[]>([]);
  const [taskFilter, setTaskFilter] = useState("all");
  const [habitSection, setHabitSection] = useState<"streaks" | "wheel" | "zen">("streaks");
  const [financeTab, setFinanceTab] = useState<"cashflow" | "ideas" | "contacts">("cashflow");
  const [wheel, setWheel] = useState<Record<string, number>>({ الصحة: 86, العمل: 74, المال: 68, العلاقات: 81, التطور: 78, الروح: 72 });
  const [zenRunning, setZenRunning] = useState(false);
  const [zenSeconds, setZenSeconds] = useState(25 * 60);
  const [composer, setComposer] = useState<ComposerType>(null);
  const [plannerMode, setPlannerMode] = useState<PlannerMode>(null);
  const [draft, setDraft] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [categoryTargetId, setCategoryTargetId] = useState<string | null>(null);
  const [smsTrackerEnabled, setSmsTrackerEnabled] = useState(false);
  const [smsDailyLimit, setSmsDailyLimit] = useState(DEFAULT_DAILY_SPENDING_LIMIT_EGP);
  const [isSmsScanRunning, setIsSmsScanRunning] = useState(false);
  const [isGeneratingFrictionTaskId, setIsGeneratingFrictionTaskId] = useState<string | null>(null);
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>({});
  const [budgetAlertKeys, setBudgetAlertKeys] = useState<Record<string, true>>({});
  const [taskToSchedule, setTaskToSchedule] = useState<string | null>(null);
  const [selectedFocusTaskId, setSelectedFocusTaskId] = useState<string | null>(null);
  const [taskScheduledAt, setTaskScheduledAt] = useState(() => new Date(Date.now() + 60 * 60 * 1000));
  const [toast, setToast] = useState("");
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<"pro_monthly" | "pro_annual" | "lifetime">("pro_monthly");
  const [chatInput, setChatInput] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([
    { id: "a1", from: "ai", text: "مرحبًا بك في Omni Life Center. أستطيع مساعدتك في كسر التسويف، تنظيم الطاقة، أو مراجعة توازن يومك." },
  ]);
  const [weeklyPersona, setWeeklyPersona] = useState<WeeklyPersona>("gentle");
  const [gamification, setGamification] = useState<GamificationState>({ xp: 0, level: 1, badges: [], completedTasks: 0, habitDays: 0, financeDays: 0 });
  const [gamificationHydrated, setGamificationHydrated] = useState(false);
  const [recoveryTaskId, setRecoveryTaskId] = useState<string | null>(null);
  const [recoveryHabitId, setRecoveryHabitId] = useState<string | null>(null);
  const [brainDumpVisible, setBrainDumpVisible] = useState(false);
  const [energyFeedbackTaskId, setEnergyFeedbackTaskId] = useState<string | null>(null);
  const [eveningClosureEnabled, setEveningClosureEnabled] = useState(true);
  const [eveningClosureAt, setEveningClosureAt] = useState(() => { const date = new Date(); date.setHours(23, 0, 0, 0); return date; });
  const [eveningClosureHydrated, setEveningClosureHydrated] = useState(false);
  const [soundPreferences, setSoundPreferences] = useState<SoundPreferences>(DEFAULT_SOUND_PREFERENCES);
  const [pomodoroDurations, setPomodoroDurations] = useState<PomodoroDurations>(DEFAULT_POMODORO_DURATIONS);
  const [pomodoroHydrated, setPomodoroHydrated] = useState(false);
  const [focusDndEnabled, setFocusDndEnabled] = useState(false);
  const [focusDndHydrated, setFocusDndHydrated] = useState(false);
  const [backgroundReliability, setBackgroundReliability] = useState({ available: false, exactAlarmAllowed: false, batteryOptimizationIgnored: false });
  const [smsSettingsHydrated, setSmsSettingsHydrated] = useState(false);
  const [categoryBudgetsHydrated, setCategoryBudgetsHydrated] = useState(false);
  const eveningClosureNotificationId = useRef<string | null>(null);
  const behavioralStateApplied = useRef(false);

  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const updateSoundPreferences = (next: SoundPreferences) => {
    setSoundPreferences(next);
    void saveSoundPreferences(next);
  };
  const homeGuidanceScope = manualProfile?.email ?? user?.email ?? null;
  const handleFocusDndChange = useCallback((active: boolean) => {
    if (!focusDndEnabled) return;
    void setFocusDoNotDisturb(active).then((applied) => {
      if (active && !applied) setToast(t("لم يتوفر إذن عدم الإزعاج بعد. امنحه من الإعدادات أو واصل التركيز دون تفعيله.", "Do Not Disturb access is not ready. Grant it in Settings or continue focusing without it."));
    }).catch(() => undefined);
  }, [focusDndEnabled, isArabic]);
  const openFocusDndAccess = () => {
    void requestFocusDndAccess().then((result) => {
      if (result === "unavailable") setToast(t("عدم الإزعاج التلقائي يتوفر في نسخة Android مخصصة فقط.", "Automatic Do Not Disturb is available only in a custom Android build."));
      else setToast(t("افتح إعدادات Android وامنح OMNI LIFE إذن عدم الإزعاج، ثم ارجع للتطبيق.", "Open Android Settings, grant OMNI LIFE Do Not Disturb access, then return to the app."));
    });
  };
  const refreshBackgroundReliability = useCallback(() => {
    void getAndroidBackgroundReliabilityStatus().then(setBackgroundReliability).catch(() => setBackgroundReliability({ available: false, exactAlarmAllowed: false, batteryOptimizationIgnored: false }));
  }, []);
  const openExactAlarmAccess = () => {
    void openAndroidExactAlarmSettings().then((opened) => {
      if (!opened) setToast(t("إذن التنبيهات الدقيقة متاح في نسخة Android مخصصة فقط.", "Exact-alarm access is available only in a custom Android build."));
    }).finally(() => setTimeout(refreshBackgroundReliability, 600));
  };
  const openBatteryOptimizationAccess = () => {
    void openAndroidBatteryOptimizationSettings().then((opened) => {
      if (!opened) setToast(t("إعدادات البطارية متاحة في نسخة Android مخصصة فقط.", "Battery settings are available only in a custom Android build."));
    }).finally(() => setTimeout(refreshBackgroundReliability, 600));
  };
  useEffect(() => {
    void loadSoundPreferences().then(setSoundPreferences);
    void loadInformationContent().then((content) => { setInformationContent(content); setInformationHydrated(true); });
  }, []);
  useEffect(() => {
    if (informationHydrated) void saveInformationContent(informationContent);
  }, [informationContent, informationHydrated]);
  useEffect(() => {
    void AsyncStorage.getItem(POMODORO_DURATIONS_STORAGE_KEY).then((stored) => {
      if (!stored) return;
      try { setPomodoroDurations(normalizePomodoroDurations(JSON.parse(stored) as Partial<PomodoroDurations>)); } catch { setPomodoroDurations(DEFAULT_POMODORO_DURATIONS); }
    }).finally(() => setPomodoroHydrated(true));
  }, []);
  useEffect(() => {
    if (!pomodoroHydrated) return;
    void AsyncStorage.setItem(POMODORO_DURATIONS_STORAGE_KEY, JSON.stringify(pomodoroDurations));
  }, [pomodoroDurations, pomodoroHydrated]);
  useEffect(() => {
    void AsyncStorage.getItem(FOCUS_DND_STORAGE_KEY).then((stored) => setFocusDndEnabled(stored === "true")).finally(() => setFocusDndHydrated(true));
  }, []);
  useEffect(() => {
    if (!focusDndHydrated) return;
    void AsyncStorage.setItem(FOCUS_DND_STORAGE_KEY, String(focusDndEnabled));
  }, [focusDndEnabled, focusDndHydrated]);
  useEffect(() => { refreshBackgroundReliability(); }, [refreshBackgroundReliability]);
  const unreadCount = notifications.filter((item) => !item.read).length + promotionInbox.filter((item) => !item.read).length;
  const adminEmail = user?.email ?? manualProfile?.email ?? null;
  const isAdmin = isAuthorizedOmniAdmin(adminEmail);
  const hasReadyIdentity = manualReady && Boolean(manualProfile?.email ?? user?.email);
  const isAdminDataScreen = isAdmin && (screen === "settings" || screen === "admin");
  const wheelAverage = Math.round(Object.values(wheel).reduce((sum, value) => sum + value, 0) / Object.keys(wheel).length);
  const auditQuery = trpc.admin.audit.list.useQuery(undefined, { enabled: isAdminDataScreen, staleTime: 60_000 });
  const recordAuditMutation = trpc.admin.audit.record.useMutation({ onSuccess: () => { void auditQuery.refetch(); } });
  const registerRemoteDeviceMutation = trpc.notifications.registerDevice.useMutation();
  const recordCampaignLinkClick = trpc.notifications.recordCampaignLinkClick.useMutation().mutateAsync;
  const campaignQuery = trpc.admin.campaigns.list.useQuery(undefined, { enabled: isAdminDataScreen, staleTime: 60_000 });
  const createCampaignMutation = trpc.admin.campaigns.create.useMutation({ onSuccess: () => { void campaignQuery.refetch(); void auditQuery.refetch(); } });
  const inAppAdsQuery = trpc.admin.advertisements.list.useQuery(undefined, { enabled: isAdminDataScreen, staleTime: 60_000 });
  const createInAppAdMutation = trpc.admin.advertisements.create.useMutation({ onSuccess: () => { void inAppAdsQuery.refetch(); void auditQuery.refetch(); } });
  const setInAppAdActiveMutation = trpc.admin.advertisements.setActive.useMutation({ onSuccess: () => { void inAppAdsQuery.refetch(); void auditQuery.refetch(); } });
  const entitlementQuery = trpc.subscriptions.entitlement.useQuery(undefined, { enabled: hasReadyIdentity, staleTime: 60_000 });
  const productivityCoachMutation = trpc.productivityCoach.advise.useMutation();
  const aiFrictionMutation = trpc.aiAssistance.frictionSteps.useMutation();
  const aiRoutineCopyMutation = trpc.aiAssistance.notificationCopy.useMutation();
  const aiContextualAlertMutation = trpc.aiAssistance.contextualAlert.useMutation();
  const weeklySnapshotMutation = trpc.weeklyRetrospective.syncSnapshot.useMutation();
  const weeklyReportQuery = trpc.weeklyRetrospective.latest.useQuery(undefined, { enabled: hasReadyIdentity && screen === "weeklyReport", staleTime: 60_000 });
  const weeklyScheduleMutation = trpc.weeklyRetrospective.enableFridaySchedule.useMutation();
  const gamificationQuery = trpc.gamification.current.useQuery(undefined, { enabled: hasReadyIdentity && screen === "dashboard", staleTime: 60_000 });
  const saveGamificationMutation = trpc.gamification.save.useMutation();
  const behavioralStateQuery = trpc.behavioralState.current.useQuery(undefined, { enabled: hasReadyIdentity, staleTime: 60_000 });
  const focusTimeSummaryQuery = trpc.behavioralState.focusTimeSummary.useQuery(undefined, { enabled: hasReadyIdentity && screen === "dashboard", staleTime: 60_000 });
  const saveBehavioralStateMutation = trpc.behavioralState.save.useMutation();
  const recordFocusSessionMutation = trpc.behavioralState.recordFocusSession.useMutation();
  const verifyManualProfileMutation = trpc.manualAuth.login.useMutation();
  const exportManualAccountMutation = trpc.manualAuth.exportData.useMutation();
  const hasPlanningPremium = isAdmin || hasPremiumAccess(entitlementQuery.data);
  const showDailyTransactionLimitPaywall = () => {
    setCheckoutPlan("pro_monthly");
    setPaywallVisible(true);
    setToast(t(`الخطة المجانية تتيح ${FREE_DAILY_TRANSACTION_LIMIT} معاملات يدوية يوميًا. اشترك لإضافة معاملات بلا حد.`, `The Free plan allows ${FREE_DAILY_TRANSACTION_LIMIT} manual daily transactions. Subscribe for unlimited entries.`));
  };
  const openDailyExpenseComposer = () => {
    if (!canAddDailyManualTransaction(subs, hasPlanningPremium, new Date())) {
      showDailyTransactionLimitPaywall();
      return;
    }
    setDraft("");
    setExpenseAmount("");
    setExpenseCategory(t("مصروف يومي", "Daily expense"));
    setComposer("expense");
  };
  const prioritizedHomeTasks = useMemo(() => prioritizeTasksForToday(tasks, dailyEnergy, dailyMood), [dailyEnergy, dailyMood, tasks]);
  const completedHabitIds = useMemo(() => habits.filter((habit) => (habitCompletionCounts[habit.id] ?? 0) >= habitDailyTarget(habit.reminderTimes, hasPlanningPremium)).map((habit) => habit.id), [habitCompletionCounts, habits, hasPlanningPremium]);
  const completedTaskCount = useMemo(() => tasks.filter((task) => task.done).length, [tasks]);
  const dailyExpenseEgp = useMemo(() => {
    const today = new Date();
    return subs.reduce((total, entry) => isRecordedOnDate(entry.recordedAt, today) && entry.transactionDirection !== "income" ? total + entry.amount : total, 0);
  }, [subs]);
  const notificationUserName = (manualProfile?.fullName ?? user?.name ?? "").trim();
  const monthlyCategoryReport = useMemo(() => buildMonthlyCategoryReport(subs.filter((entry) => entry.kind === "daily_expense"), new Date()), [subs]);
  const categoryBudgetStatuses = useMemo(() => buildCategoryBudgetStatuses(monthlyCategoryReport, categoryBudgets), [categoryBudgets, monthlyCategoryReport]);
  const recentAdminItems = useMemo<AdminRecentAddition[]>(() => {
    const fallbackTime = new Date(0).toISOString();
    return [
      ...tasks.map((item) => ({ id: item.id, type: "task" as const, title: item.title, detail: item.detail, createdAt: item.createdAt ?? item.scheduledAt ?? fallbackTime })),
      ...habits.map((item) => ({ id: item.id, type: "habit" as const, title: item.title, detail: item.detail, createdAt: item.createdAt ?? fallbackTime })),
      ...ideas.map((item) => ({ id: item.id, type: "idea" as const, title: item.title, detail: item.detail, createdAt: item.createdAt ?? fallbackTime })),
      ...subs.filter((item) => item.kind === "daily_expense").map((item) => ({ id: item.id, type: "expense" as const, title: item.title, amountEgp: item.amount, category: item.category, createdAt: item.recordedAt ?? fallbackTime })),
    ].sort((left, right) => Date.parse(right.createdAt ?? fallbackTime) - Date.parse(left.createdAt ?? fallbackTime)).slice(0, 12);
  }, [habits, ideas, subs, tasks]);
  const energyMatrix = useMemo(() => buildEnergyMatrix(tasks), [tasks]);
  const tunnelTask = useMemo(() => {
    const selected = selectedFocusTaskId ? tasks.find((task) => task.id === selectedFocusTaskId && !task.done) : undefined;
    return selected ?? chooseTunnelTask(tasks);
  }, [selectedFocusTaskId, tasks]);
  const weeklyPreview = useMemo(() => buildWeeklyReport({ completedTasks: completedTaskCount, delayedTasks: tasks.filter((task) => !task.done && task.reschedules > 0).length, habitsCompleted: completedHabitIds.length, habitsPlanned: habits.length, expensesEgp: dailyExpenseEgp, budgetOverages: categoryBudgetStatuses.filter((status) => status.exceeded).length, xpEarned: gamification.xp, energyRecharge: energyMatrix.recharge, energyBalanced: energyMatrix.balanced, energyDrain: energyMatrix.drain }, weeklyPersona), [categoryBudgetStatuses, completedHabitIds.length, completedTaskCount, dailyExpenseEgp, energyMatrix.balanced, energyMatrix.drain, energyMatrix.recharge, gamification.xp, habits.length, tasks, weeklyPersona]);
  const editingRecurringDraft = useMemo<RecurringFinanceDraft | null>(() => {
    const entry = editingRecurringEntryId ? subs.find((item) => item.id === editingRecurringEntryId) : undefined;
    if (!entry || entry.kind === "daily_expense") return null;
    const kind: RecurringFinanceKind = entry.kind === "installment" || entry.kind === "savings_circle" || entry.kind === "subscription" ? entry.kind : "subscription";
    return { title: entry.title, amount: entry.amount, kind, reminderFrequency: entry.reminderFrequency ?? "monthly", reminderAt: entry.reminderAt ?? new Date().toISOString(), endsAt: entry.endsAt, earlyReminderMinutes: entry.earlyReminderMinutes ?? 0 };
  }, [editingRecurringEntryId, subs]);
  const reminderEditorContact = useMemo(() => contactReminderEditorId ? contacts.find((contact) => contact.id === contactReminderEditorId) ?? null : null, [contactReminderEditorId, contacts]);

  const openPremiumScreen = (target: Screen) => {
    if (isAdmin || canAccessPremiumFeature(entitlementQuery.data, () => setPaywallVisible(true))) setScreen(target);
  };

  const dismissActiveHomeGuidance = () => {
    const activeTip = homeGuidanceProgress ? getActiveHomeGuidanceTip(homeGuidanceProgress) : null;
    if (!activeTip || !homeGuidanceScope || !homeGuidanceProgress) return;
    const next = dismissHomeGuidanceTip(homeGuidanceProgress, activeTip.id);
    setHomeGuidanceProgress(next);
    void saveHomeGuidanceProgress(homeGuidanceScope, next);
  };

  const toggleHomeGuidance = (enabled: boolean) => {
    if (!homeGuidanceScope || !welcomeCompletedAt) return;
    const baseline = homeGuidanceProgress ?? createHomeGuidanceProgress(new Date(welcomeCompletedAt));
    const next = setHomeGuidanceEnabled(baseline, enabled);
    setHomeGuidanceProgress(next);
    void saveHomeGuidanceProgress(homeGuidanceScope, next);
  };

  const restartInteractiveGuidance = () => {
    if (!homeGuidanceScope || !welcomeCompletedAt) return;
    const next = restartHomeGuidance();
    setHomeGuidanceProgress(next);
    void saveHomeGuidanceProgress(homeGuidanceScope, next);
    setToast(t("أُعيد تشغيل تلميحات الأسبوع الأول من اليوم.", "First-week tips restarted from today."));
  };

  const handleHomeGuidanceAction = (target: HomeGuidanceTarget) => {
    dismissActiveHomeGuidance();
    if (target === "tasks" || target === "focus") setScreen("tasks");
    else if (target === "habits") setScreen("habits");
    else if (target === "finance") setScreen("finance");
    else if (target === "ideas") setScreen("ideas");
    else if (target === "advisor") openPremiumScreen("advisor");
    else setScreen("notifications");
  };

  const updateCategoryBudget = (category: string, value: number) => {
    setCategoryBudgets((current) => ({ ...current, [category]: value }));
  };

  const recordAdminAction = async (action: string, targetType: string, targetId: string | undefined, details: string) => {
    if (!isAdmin) return false;
    try {
      await recordAuditMutation.mutateAsync({ action, targetType, targetId, details });
      return true;
    } catch {
      setToast(t("تعذر حفظ الإجراء الإداري. تحقق من صلاحية الحساب.", "The administrative action could not be saved. Verify account authorization."));
      return false;
    }
  };

  const handleAdminTaskAction = async (id: string, action: AdminTaskAction) => {
    const task = tasks.find((item) => item.id === id);
    if (!task || !(await recordAdminAction(action === "delete" ? "delete_task" : task.done ? "reopen_task" : "complete_task", "task", id, task.title))) return;
    if (action === "delete") setTasks((current) => current.filter((item) => item.id !== id));
    else setTasks((current) => current.map((item) => item.id === id ? { ...item, done: !item.done } : item));
    setToast(t("تم تنفيذ الإجراء الإداري على المهمة.", "Administrative task action completed."));
  };

  const handleAdminHabitAction = async (id: string, action: AdminHabitAction) => {
    const habit = habits.find((item) => item.id === id);
    if (!habit || !(await recordAdminAction(action === "delete" ? "delete_habit" : completedHabitIds.includes(id) ? "reset_habit" : "complete_habit", "habit", id, habit.title))) return;
    if (action === "delete") {
      setHabits((current) => current.filter((item) => item.id !== id));
      setHabitCompletionCounts((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    } else {
      setHabitCompletionCounts((current) => ({
        ...current,
        [id]: completedHabitIds.includes(id) ? 0 : habitDailyTarget(habit.reminderTimes, hasPlanningPremium),
      }));
    }
    setToast(t("تم تنفيذ الإجراء الإداري على العادة.", "Administrative habit action completed."));
  };

  const handleAdminQuickEdit = (item: AdminRecentAddition) => {
    if (!isAdmin) return;
    if (item.type === "task") setTasks((current) => current.map((entry) => entry.id === item.id ? { ...entry, title: item.title, detail: item.detail ?? entry.detail } : entry));
    if (item.type === "habit") setHabits((current) => current.map((entry) => entry.id === item.id ? { ...entry, title: item.title, detail: item.detail ?? entry.detail } : entry));
    if (item.type === "idea") setIdeas((current) => current.map((entry) => entry.id === item.id ? { ...entry, title: item.title, detail: item.detail ?? entry.detail } : entry));
    if (item.type === "expense") setSubs((current) => current.map((entry) => entry.id === item.id ? { ...entry, title: item.title, amount: item.amountEgp ?? entry.amount, category: item.category ?? entry.category } : entry));
    void recordAdminAction("quick_edit_recent_addition", item.type, item.id, item.title);
  };

  const handleAdminBulkAction = async (action: AdminBulkAction) => {
    const labels: Record<AdminBulkAction, string> = { complete_all_tasks: "complete_all_tasks", reopen_all_tasks: "reopen_all_tasks", complete_all_habits: "complete_all_habits", reset_all_habits: "reset_all_habits" };
    if (!(await recordAdminAction(labels[action], action.includes("task") ? "task" : "habit", undefined, action))) return;
    if (action === "complete_all_tasks") setTasks((current) => current.map((task) => ({ ...task, done: true })));
    if (action === "reopen_all_tasks") setTasks((current) => current.map((task) => ({ ...task, done: false })));
    if (action === "complete_all_habits") setHabitCompletionCounts(Object.fromEntries(habits.map((habit) => [habit.id, habitDailyTarget(habit.reminderTimes, hasPlanningPremium)])));
    if (action === "reset_all_habits") setHabitCompletionCounts({});
    setToast(t("تم تنفيذ الإجراء الجماعي وتسجيله.", "Bulk action completed and recorded."));
  };

  const handleCreateCampaign = async (input: { title: string; body: string; destinationUrl?: string; category: "announcement" | "promotion" | "usage_tip" | "rating_reminder" | "habit_tip" | "task_tip"; audience: "all_opted_in" | "manual_users" | "oauth_users"; delivery: "send_now" | "schedule"; scheduledAt?: Date }) => {
    if (!isAdmin) return;
    try {
      const result = await createCampaignMutation.mutateAsync(input);
      const scheduled = input.delivery === "schedule";
      setToast(scheduled ? t("تمت جدولة الحملة للأجهزة المشتركة في الإشعارات.", "Campaign scheduled for opted-in devices.") : t("تم إرسال الحملة للأجهزة المسجّلة والموافقة على الإشعارات.", "Campaign submitted to registered, opted-in devices."));
    } catch (error) {
      setToast(t("تعذر إنشاء الحملة. تحقق من إعدادات الإشعارات والموعد.", "The campaign could not be created. Verify push setup and the schedule."));
      console.warn("[Campaign] Create failed", error);
    }
  };

  const handleCreateInAppAd = async (input: { title: string; body: string; ctaLabel: string; placement: "home" | "tasks" | "habits" | "finance"; destinationUrl?: string }) => {
    if (!isAdmin) return;
    try {
      await createInAppAdMutation.mutateAsync(input);
      setToast(t("تم نشر الإعلان داخل التطبيق لحسابات Free.", "The in-app ad is now published for Free accounts."));
    } catch {
      setToast(t("تعذر نشر الإعلان. تأكد من الرابط الاختياري ثم حاول مجددًا.", "The ad could not be published. Check the optional link and try again."));
    }
  };

  const handleSetInAppAdActive = async (id: number, active: boolean) => {
    if (!isAdmin) return;
    try {
      await setInAppAdActiveMutation.mutateAsync({ id, active });
      setToast(active ? t("تم تفعيل الإعلان.", "Advertisement activated.") : t("تم إيقاف الإعلان.", "Advertisement paused."));
    } catch {
      setToast(t("تعذر تحديث حالة الإعلان.", "The advertisement status could not be updated."));
    }
  };

  const handleLogout = async () => {
    await clearManualProfile();
    setManualProfile(null);
    await logout();
    setScreen("dashboard");
    setToast(t("تم تسجيل الخروج بنجاح.", "You have been signed out."));
  };

  const handleAccountReset = async (_pin: string) => {
    if (!manualProfile?.email || isAdmin || isResettingAppData) return;
    setIsResettingAppData(true);
    try {
      await verifyManualProfileMutation.mutateAsync({ email: manualProfile.email, pin: _pin });
      await Promise.all([
        Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined),
        Notifications.dismissAllNotificationsAsync().catch(() => undefined),
        clearOmniAppData(),
      ]);
      setTasks([]); setHabits([]); setIdeas([]); setSubs([]); setContacts([]); setNotifications([]); setPromotionInbox([]); setHabitCompletionCounts({}); setCategoryBudgets({}); setBudgetAlertKeys({}); setGamification({ xp: 0, level: 1, badges: [], completedTasks: 0, habitDays: 0, financeDays: 0 }); setSelectedContactId(null); setTaskToSchedule(null); setSelectedFocusTaskId(null); setRecoveryTaskId(null); setRecoveryHabitId(null); setEnergyFeedbackTaskId(null); setRecurringFinanceEditorVisible(false); setEditingRecurringEntryId(null); setComposer(null); setPlannerMode(null); setDraft(""); setExpenseAmount(""); setExpenseCategory(""); setCategoryTargetId(null); setChatInput(""); setChat([{ id: "a1", from: "ai", text: "مرحبًا بك في Omni Life Center. أستطيع مساعدتك في كسر التسويف، تنظيم الطاقة، أو مراجعة توازن يومك." }]); setScreen("dashboard");
      setToast(t("تم مسح بيانات التطبيق. حسابك لا يزال مسجّلًا.", "App data cleared. Your account is still signed in."));
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setToast(message.toLowerCase().includes("password") || message.toLowerCase().includes("invalid")
        ? t("كلمة السر غير صحيحة. لم تُمسح أي بيانات.", "The password is incorrect. No data was cleared.")
        : t("تعذر مسح بيانات التطبيق الآن. حسابك وجلسة الدخول لم يتأثرا.", "App data could not be cleared. Your account and signed-in session were not affected."));
    } finally {
      setIsResettingAppData(false);
    }
  };

  const startTaskPomodoro = (id: string) => {
    const task = tasks.find((item) => item.id === id);
    const selectedId = task ? selectTaskForPomodoro(task.id, task.done) : null;
    if (!selectedId) return;
    setSelectedFocusTaskId(selectedId);
    setScreen("tunnel");
  };

  const handleManualProfile = async (profile: ManualProfileSession) => {
    await saveManualProfile(profile);
    setManualProfile(profile);
  };

  const handleWelcomeSeen = () => {
    const completedAt = new Date().toISOString();
    void markWelcomeSeen(completedAt);
    setWelcomeSeen(true);
    setWelcomeCompletedAt(completedAt);
  };

  const openInformationPage = (page: InformationPageKey) => {
    setInformationPage(page);
    setScreen("information");
  };

  const saveEditableInformation = (next: InformationContent) => {
    setInformationContent(next);
    setToast(t("تم حفظ محتوى الصفحات.", "Page content saved."));
  };

  const routeFromNotification = useCallback((target: OmniNotificationTarget) => {
    if (target.id === "evening-brain-dump") {
      setScreen("dashboard");
      setBrainDumpVisible(true);
      return;
    }
    if (target.kind === "relationships") {
      setSelectedContactId(target.id);
      setScreen("relationships");
      setToast(isArabic ? "تم فتح جهة الاتصال المرتبطة بالتذكير." : "Opened the contact connected to this reminder.");
      return;
    }
    const destination: Screen = target.kind === "task" ? "tasks" : target.kind === "habit" ? "habits" : target.kind;
    setScreen(destination);
    setToast(isArabic ? "تم فتح القسم المرتبط بالتنبيه." : "Opened the section connected to this alert.");
  }, [isArabic]);

  const trackCampaignLinkClick = useCallback((click: CampaignLinkClick) => {
    void recordCampaignLinkClick(click).catch((error) => console.warn("[Campaign] Link click tracking failed", error));
  }, [recordCampaignLinkClick]);

  const markPromotionBadge = useCallback((promotion: PromotionBadgeData) => {
    setPromotionInbox((current) => mergePromotionInbox(current, promotion));
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
    let cancelled = false;
    const timer = setTimeout(() => { void (async () => {
      try {
        const stored = await AsyncStorage.getItem("omni-life-automatic-routine-ids");
        const previousIds = stored ? JSON.parse(stored) as string[] : [];
        const routineDate = new Date().toISOString().slice(0, 10);
        const copyKey = `${AI_ROUTINE_COPY_STORAGE_PREFIX}:${routineDate}:${isArabic ? "ar" : "en"}:${notificationUserName || "guest"}`;
        const cachedCopy = await AsyncStorage.getItem(copyKey);
        let aiCopy = cachedCopy ? JSON.parse(cachedCopy) : null;
        if (!aiCopy) {
          try {
            aiCopy = await aiRoutineCopyMutation.mutateAsync({
              userName: notificationUserName || undefined,
              isArabic,
              taskTitles: tasks.filter((task) => !task.done).slice(0, 8).map((task) => task.title),
              habitTitles: habits.slice(0, 8).map((habit) => habit.title),
              staleIdeaTitles: ideas.filter((idea) => idea.old && !idea.archived).slice(0, 6).map((idea) => idea.title),
            });
            await AsyncStorage.setItem(copyKey, JSON.stringify(aiCopy));
          } catch (error) {
            console.warn("[AI] Using local notification copy after Gemini request failed", error);
          }
        }
        const result = await scheduleAutomaticOmniRoutineNotifications(isArabic, previousIds, { completedTasks: completedTaskCount, expenseEgp: dailyExpenseEgp }, aiCopy ?? undefined, notificationUserName);
        if (!cancelled && result.ids.length > 0) await AsyncStorage.setItem("omni-life-automatic-routine-ids", JSON.stringify(result.ids));
      } catch (error) {
        console.warn("[Notifications] Automatic routine scheduling failed:", error);
      }
    })(); }, 700);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [completedTaskCount, dailyExpenseEgp, habits, ideas, isArabic, notificationUserName, tasks]);

  useEffect(() => {
    void configureOmniNotificationChannel();
  }, []);

  useEffect(() => {
    void Promise.all([loadManualProfile(), loadWelcomeSeen(), loadWelcomeCompletedAt()]).then(([profile, hasSeenWelcome, completedAt]) => {
      setManualProfile(profile);
      setWelcomeSeen(hasSeenWelcome);
      setWelcomeCompletedAt(completedAt);
      setManualReady(true);
    });
  }, []);

  useEffect(() => {
    if (!homeGuidanceScope || !welcomeCompletedAt) {
      setHomeGuidanceProgress(null);
      return;
    }
    let cancelled = false;
    void loadHomeGuidanceProgress(homeGuidanceScope, new Date(welcomeCompletedAt)).then((progress) => {
      if (!cancelled) setHomeGuidanceProgress(progress);
    });
    return () => { cancelled = true; };
  }, [homeGuidanceScope, welcomeCompletedAt]);

  useEffect(() => {
    void AsyncStorage.getItem("omni-life-bank-sms-settings").then((stored) => {
      if (!stored) return;
      try {
        const parsed = JSON.parse(stored) as { enabled?: boolean; dailyLimit?: number };
        setSmsTrackerEnabled(Boolean(parsed.enabled));
        if (Number.isFinite(parsed.dailyLimit) && (parsed.dailyLimit ?? 0) > 0) setSmsDailyLimit(parsed.dailyLimit as number);
      } catch { /* Keep safe defaults. */ }
    }).finally(() => setSmsSettingsHydrated(true));
  }, []);

  useEffect(() => {
    if (!smsSettingsHydrated) return;
    void AsyncStorage.setItem("omni-life-bank-sms-settings", JSON.stringify({ enabled: smsTrackerEnabled, dailyLimit: smsDailyLimit }));
  }, [smsDailyLimit, smsSettingsHydrated, smsTrackerEnabled]);

  useEffect(() => {
    void AsyncStorage.getItem(CONTACTS_STORAGE_KEY).then((stored) => {
      if (!stored) return;
      try {
        const parsed = JSON.parse(stored) as unknown;
        if (Array.isArray(parsed)) {
          setContacts(parsed.filter((item): item is Contact => Boolean(item && typeof item === "object" && typeof (item as Contact).id === "string" && typeof (item as Contact).name === "string" && typeof (item as Contact).phone === "string" && typeof (item as Contact).relation === "string" && typeof (item as Contact).note === "string")));
        }
      } catch { /* Keep bundled relationship entries when storage is invalid. */ }
    }).finally(() => setContactsHydrated(true));
  }, []);

  useEffect(() => {
    if (!contactsHydrated) return;
    void AsyncStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
  }, [contacts, contactsHydrated]);

  useEffect(() => {
    void Promise.all([
      AsyncStorage.getItem(CATEGORY_BUDGETS_STORAGE_KEY),
      AsyncStorage.getItem(CATEGORY_BUDGET_ALERTS_STORAGE_KEY),
    ]).then(([storedBudgets, storedAlerts]) => {
      try { if (storedBudgets) setCategoryBudgets(JSON.parse(storedBudgets) as Record<string, number>); } catch { /* Keep empty budgets. */ }
      try { if (storedAlerts) setBudgetAlertKeys(JSON.parse(storedAlerts) as Record<string, true>); } catch { /* Keep empty alert history. */ }
    }).finally(() => setCategoryBudgetsHydrated(true));
  }, []);

  useEffect(() => {
    if (!categoryBudgetsHydrated) return;
    void AsyncStorage.setItem(CATEGORY_BUDGETS_STORAGE_KEY, JSON.stringify(categoryBudgets));
  }, [categoryBudgets, categoryBudgetsHydrated]);

  useEffect(() => {
    void AsyncStorage.getItem(GAMIFICATION_STORAGE_KEY).then((stored) => {
      if (!stored) return;
      try { setGamification(JSON.parse(stored) as GamificationState); } catch { /* Start with a safe gamification profile. */ }
    }).finally(() => setGamificationHydrated(true));
  }, []);

  useEffect(() => {
    if (gamificationHydrated) void AsyncStorage.setItem(GAMIFICATION_STORAGE_KEY, JSON.stringify(gamification));
  }, [gamification, gamificationHydrated]);

  useEffect(() => {
    void AsyncStorage.getItem(EVENING_CLOSURE_STORAGE_KEY).then((stored) => {
      if (!stored) return;
      try {
        const parsed = JSON.parse(stored) as { enabled?: boolean; at?: string; notificationId?: string | null };
        if (typeof parsed.enabled === "boolean") setEveningClosureEnabled(parsed.enabled);
        if (parsed.at) {
          const restored = new Date(parsed.at);
          if (!Number.isNaN(restored.getTime())) setEveningClosureAt(restored);
        }
        eveningClosureNotificationId.current = parsed.notificationId ?? null;
      } catch { /* Keep the default 11 PM closure ritual. */ }
    }).finally(() => setEveningClosureHydrated(true));
  }, []);

  useEffect(() => {
    if (!eveningClosureHydrated) return;
    const persist = (notificationId: string | null) => AsyncStorage.setItem(EVENING_CLOSURE_STORAGE_KEY, JSON.stringify({ enabled: eveningClosureEnabled, at: eveningClosureAt.toISOString(), notificationId }));
    if (Platform.OS === "web") {
      void persist(null);
      return;
    }
    if (!eveningClosureEnabled) {
      void cancelEveningBrainDumpReminder(eveningClosureNotificationId.current).then(() => {
        eveningClosureNotificationId.current = null;
        return persist(null);
      });
      return;
    }
    void scheduleEveningBrainDumpReminder(isArabic, eveningClosureAt, eveningClosureNotificationId.current).then((identifier) => {
      eveningClosureNotificationId.current = identifier;
      return persist(identifier);
    }).catch(() => setToast(t("تعذر ضبط تذكير تفريغ الذهن. تحقق من إذن الإشعارات.", "Could not schedule the brain-dump reminder. Check notification permission.")));
  }, [eveningClosureAt, eveningClosureEnabled, eveningClosureHydrated, isArabic]);

  useEffect(() => {
    if (!manualReady || recoveryTaskId || recoveryHabitId) return;
    const missed = getMissedTaskIds(tasks);
    if (missed.length) { setRecoveryTaskId(missed[0]); return; }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const missedHabit = habits.find((habit) => habit.lastCompletedAt && new Date(habit.lastCompletedAt).getTime() < today.getTime());
    if (missedHabit) setRecoveryHabitId(missedHabit.id);
  }, [habits, manualReady, recoveryHabitId, recoveryTaskId, tasks]);

  useEffect(() => {
    const remote = gamificationQuery.data;
    if (!gamificationHydrated || !remote) return;
    const remoteState: GamificationState = { xp: remote.xpPoints, level: remote.level, completedTasks: remote.completedTasks, habitDays: remote.habitDays, financeDays: remote.financeDays, badges: remote.badges };
    setGamification((current) => remoteState.xp > current.xp ? remoteState : current);
  }, [gamificationHydrated, gamificationQuery.data]);

  useEffect(() => {
    const remote = behavioralStateQuery.data;
    if (!remote || behavioralStateApplied.current) return;
    const parsePlan = (value: string | null) => { try { const parsed = value ? JSON.parse(value) as IfThenPlan : undefined; return parsed?.ifCondition && parsed?.thenAction ? parsed : undefined; } catch { return undefined; } };
    const parseTags = (value: string | null) => { try { const parsed = value ? JSON.parse(value) : []; return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === "string") : []; } catch { return []; } };
    if (remote.tasks.length) setTasks(remote.tasks.map((task) => ({ id: task.id, title: task.title, detail: task.detail ?? "", energy: task.energy, priority: task.priority, done: task.done, reschedules: task.reschedules, scheduledAt: task.scheduledAt?.toISOString(), ifThenPlan: parsePlan(task.ifThenPlan), energyImpact: task.energyImpact ?? undefined, isMicroGoal: task.isMicroGoal, estimatedPomodoros: task.estimatedPomodoros, completedPomodoros: task.completedPomodoros, project: task.project ?? undefined, tags: parseTags(task.tags) })));
    if (remote.habits.length) setHabits(remote.habits.map((habit) => ({ id: habit.id, title: habit.title, category: t("عادة مخصصة", "Custom habit"), detail: habit.detail ?? "", frequency: habit.frequency, reminderTimes: (() => { try { return JSON.parse(habit.reminderTimes) as string[]; } catch { return []; } })(), streak: habit.streak, emergency: false, ifThenPlan: parsePlan(habit.ifThenPlan), isMicroGoal: habit.isMicroGoal })));
    behavioralStateApplied.current = true;
  }, [behavioralStateQuery.data, t]);

  useEffect(() => {
    if (!manualReady || (!manualProfile && !isAuthenticated) || behavioralStateQuery.isLoading || !behavioralStateApplied.current) return;
    const timer = setTimeout(() => {
      void saveBehavioralStateMutation.mutateAsync({ tasks: tasks.map(({ id, title, detail, energy, priority, done, reschedules, scheduledAt, ifThenPlan, energyImpact, isMicroGoal, estimatedPomodoros, completedPomodoros, project, tags }) => ({ id, title, detail, energy, priority, done, reschedules, scheduledAt, ifThenPlan, energyImpact, isMicroGoal, estimatedPomodoros, completedPomodoros, project, tags })), habits: habits.map(({ id, title, detail, frequency, reminderTimes, streak, ifThenPlan, isMicroGoal }) => ({ id, title, detail, frequency, reminderTimes, streak, ifThenPlan, isMicroGoal })) }).catch(() => undefined);
    }, 350);
    return () => clearTimeout(timer);
  }, [behavioralStateQuery.isLoading, habits, isAuthenticated, manualProfile, manualReady, saveBehavioralStateMutation, tasks]);

  useEffect(() => {
    if (!gamificationHydrated || !manualReady || (!manualProfile && !isAuthenticated)) return;
    const timer = setTimeout(() => { void saveGamificationMutation.mutateAsync(gamification).catch(() => undefined); }, 350);
    return () => clearTimeout(timer);
  }, [gamification, gamificationHydrated, isAuthenticated, manualProfile, manualReady, saveGamificationMutation]);

  useEffect(() => {
    if (!manualReady || (!manualProfile && !isAuthenticated)) return;
    const timer = setTimeout(() => {
      void weeklySnapshotMutation.mutateAsync({ persona: weeklyPersona, completedTasks: weeklyPreview.completedTasks, delayedTasks: weeklyPreview.delayedTasks, habitsCompleted: weeklyPreview.habitsCompleted, habitsPlanned: weeklyPreview.habitsPlanned, expensesEgp: weeklyPreview.expensesEgp, budgetOverages: weeklyPreview.budgetOverages, xpEarned: weeklyPreview.xpEarned, energyRecharge: weeklyPreview.energyRecharge ?? 0, energyBalanced: weeklyPreview.energyBalanced ?? 0, energyDrain: weeklyPreview.energyDrain ?? 0 }).catch(() => undefined);
    }, 1_000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, manualProfile, manualReady, weeklyPersona, weeklyPreview, weeklySnapshotMutation]);

  useEffect(() => {
    if (!isAdmin || weeklyScheduleMutation.isPending) return;
    void weeklyScheduleMutation.mutateAsync().catch(() => undefined);
  }, [isAdmin]);

  useEffect(() => {
    const exceeded = categoryBudgetStatuses.filter((status) => status.exceeded);
    const fresh = exceeded.filter((status) => !budgetAlertKeys[buildCategoryBudgetAlertKey(new Date(), status.category)]);
    if (!fresh.length) return;
    const nextKeys = { ...budgetAlertKeys, ...Object.fromEntries(fresh.map((status) => [buildCategoryBudgetAlertKey(new Date(), status.category), true as const])) };
    setBudgetAlertKeys(nextKeys);
    void AsyncStorage.setItem(CATEGORY_BUDGET_ALERTS_STORAGE_KEY, JSON.stringify(nextKeys));
    fresh.forEach((status) => {
      void sendInstantHighPriorityNotification({
        title: isArabic ? "⚠️ تجاوزت ميزانية التصنيف" : "⚠️ Category budget exceeded",
        body: isArabic ? `تجاوزت مصروفات ${status.category} الحد الشهري بمقدار ${Math.abs(status.remaining).toLocaleString("ar-EG")} ج.م.` : `${status.category} is over its monthly budget by ${Math.abs(status.remaining).toLocaleString("en-US")} EGP.`,
        target: { kind: "finance", id: "category-budget" },
      }).catch(() => undefined);
    });
  }, [budgetAlertKeys, categoryBudgetStatuses, isArabic]);

  useEffect(() => {
    if (!manualReady || (!manualProfile && !isAuthenticated)) return;
    void registerOmniRemotePushDevice((registration) => registerRemoteDeviceMutation.mutateAsync(registration)).catch((error) => {
      console.warn("[RemotePush] Device registration deferred", error);
    });
  }, [isAuthenticated, manualProfile, manualReady, registerRemoteDeviceMutation]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!zenRunning || zenSeconds === 0) return;
    const timer = setInterval(() => setZenSeconds((seconds) => seconds - 1), 1000);
    return () => clearInterval(timer);
  }, [zenRunning, zenSeconds]);

  useEffect(() => {
    if (zenSeconds === 0) {
      setZenRunning(false);
      setToast(isArabic ? "أحسنت، اكتملت جلسة التركيز." : "Focus session complete.");
    }
  }, [isArabic, zenSeconds]);

  const addQuickTask = (title: string) => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) return;
    setTasks((current) => [{ id: `quick-${Date.now()}`, title: normalizedTitle, detail: t("مهمة اليوم الجديدة", "Your new task for today"), energy: "medium", priority: "medium", done: false, reschedules: 0, estimatedPomodoros: 1, completedPomodoros: 0, createdAt: new Date().toISOString() }, ...current]);
    setToast(t("أُضيفت المهمة إلى أولويات اليوم.", "Task added to today’s priorities."));
  };

  const awardXp = (action: GamificationAction) => {
    setGamification((current) => {
      const next = awardGamification(current, action);
      if (next.leveledUp) setToast(t(`🎉 وصلت إلى المستوى ${next.level}!`, `🎉 You reached level ${next.level}!`));
      else if (next.newBadges.length) setToast(t(`🏅 حصلت على وسام ${next.newBadges[0]}`, `🏅 Badge unlocked: ${next.newBadges[0]}`));
      return next;
    });
  };

  const applyFlexibleRecovery = () => {
    const source = tasks.find((task) => task.id === recoveryTaskId);
    const habit = habits.find((item) => item.id === recoveryHabitId);
    if (!source && !habit) { setRecoveryTaskId(null); setRecoveryHabitId(null); return; }
    const scheduledAt = tomorrowAt(9, 0).toISOString();
    const microGoal: Task = {
      id: `micro-${Date.now()}`,
      title: createMicroGoalTitle(source?.title ?? habit!.title, isArabic),
      detail: source ? t("نسخة أخف لليوم التالي. يكفي أن تبدأ، لا أن تكون مثاليًا.", "A lighter version for tomorrow. Starting matters more than perfect execution.") : t("نسخة لطيفة من عادتك للغد: خطوة صغيرة تحمي الإيقاع.", "A gentle version of your habit for tomorrow: one small step protects the rhythm."),
      energy: source?.energy ?? "low",
      priority: source?.priority ?? "medium",
      location: source?.location,
      ifThenPlan: source?.ifThenPlan ?? habit?.ifThenPlan,
      done: false,
      reschedules: (source?.reschedules ?? 0) + 1,
      scheduledAt,
      reminderOffsets: ["at_time"],
      reminderNotificationIds: [],
      isMicroGoal: true,
    };
    setTasks((current) => [microGoal, ...current]);
    setRecoveryTaskId(null);
    setRecoveryHabitId(null);
    setToast(t("تمت إعادة الضبط بمرونة: أضفنا نسخة 50% للغد دون إلغاء تقدمك.", "Flexible reset applied: a 50% version was added for tomorrow without erasing progress."));
    void scheduleTaskReminderOffsets({ taskId: microGoal.id, title: microGoal.title, detail: microGoal.detail, dueAt: new Date(scheduledAt), offsets: ["at_time"] }).then((scheduled) => {
      setTasks((current) => current.map((task) => task.id === microGoal.id ? { ...task, reminderNotificationIds: scheduled.map((item) => item.identifier).filter((identifier): identifier is string => Boolean(identifier)) } : task));
    }).catch(() => undefined);
  };

  const recordEnergyImpact = (impact: EnergyImpact) => {
    if (!energyFeedbackTaskId) return;
    setTasks((current) => current.map((task) => task.id === energyFeedbackTaskId ? { ...task, energyImpact: impact } : task));
    setEnergyFeedbackTaskId(null);
  };

  const deferTunnelTask = (id: string) => {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    const original = task.scheduledAt ? new Date(task.scheduledAt) : new Date();
    const next = tomorrowAt(original.getHours(), original.getMinutes());
    setTasks((current) => current.map((item) => item.id === id ? { ...item, scheduledAt: next.toISOString(), reschedules: item.reschedules + 1 } : item));
    setToast(t("تم تأجيل المهمة للغد دون إلغاءها. المهمة التالية جاهزة الآن.", "The task moved to tomorrow without being discarded. The next task is ready now."));
  };

  const completePomodoroSession = (id: string, sessionIndex: number) => {
    const task = tasks.find((item) => item.id === id);
    setTasks((current) => current.map((task) => task.id === id ? { ...task, completedPomodoros: Math.max(task.completedPomodoros ?? 0, sessionIndex) } : task));
    awardXp("pomodoro");
    setToast(t(`🍅 اكتملت جلسة التركيز ${sessionIndex}. ربحت 20 XP.`, `🍅 Focus session ${sessionIndex} complete. You earned 20 XP.`));
    void recordFocusSessionMutation.mutateAsync({ taskId: id, sessionIndex, durationMinutes: pomodoroDurations.focusMinutes, project: task?.project, tags: task?.tags }).catch(() => undefined);
  };

  const extendPomodoroTask = (id: string) => {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, estimatedPomodoros: (task.estimatedPomodoros ?? 1) + 1 } : task));
  };

  const saveBrainDump = (entries: string[]) => {
    const created = entries.map((title, index): Task => {
      const scheduledAt = tomorrowAt(9, index * 15).toISOString();
      return { id: `brain-dump-${Date.now()}-${index}`, title, detail: t("من جلسة تفريغ الذهن المسائية", "From the evening brain-dump ritual"), energy: "low", priority: "medium", done: false, reschedules: 0, scheduledAt, reminderOffsets: ["at_time"], isMicroGoal: true };
    });
    setTasks((current) => [...created, ...current]);
    created.forEach((task) => {
      void scheduleTaskReminderOffsets({ taskId: task.id, title: task.title, detail: task.detail, dueAt: new Date(task.scheduledAt!), offsets: ["at_time"] }).then((scheduled) => {
        setTasks((current) => current.map((item) => item.id === task.id ? { ...item, reminderNotificationIds: scheduled.map((entry) => entry.identifier).filter((identifier): identifier is string => Boolean(identifier)) } : item));
      }).catch(() => undefined);
    });
  };

  const triggerSync = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setToast(t("تمت مزامنة المؤشرات وحساب طاقة اليوم.", "Vitals synchronized and energy updated."));
    }, 1100);
  };

  const breakFriction = (id: string) => {
    if (isGeneratingFrictionTaskId === id) return;
    const source = tasks.find((task) => task.id === id);
    if (!source) return;
    setIsGeneratingFrictionTaskId(id);
    setTasks((current) => current.map((task) => task.id === id ? {
      ...task,
      steps: buildFrictionSteps({ id: task.id, title: task.title, detail: task.detail }, isArabic),
    } : task));
    setToast(t("جاري تخصيص خطوات فكّ التسويف لهذه المهمة…", "Personalizing anti-procrastination steps…"));
    void aiFrictionMutation.mutateAsync({ title: source.title, detail: source.detail, isArabic }).then(({ steps }) => {
      setTasks((current) => current.map((task) => task.id === id ? { ...task, steps: steps.map((title, index) => ({ id: `${task.id}-ai-${index + 1}`, title, done: false })) } : task));
      setToast(t("تمت صياغة خطوات ذكية مرتبطة بمهمتك.", "AI tailored the steps to your task."));
    }).catch(() => setToast(t("استُخدمت الخطوات المحلية المرتبطة بالمهمة الآن.", "Task-specific local steps are ready."))).finally(() => setIsGeneratingFrictionTaskId((current) => current === id ? null : current));
  };

  const applyTaskFallback = (id: string) => {
    const task = tasks.find((item) => item.id === id);
    if (!task?.ifThenPlan) return;
    setTasks((current) => current.map((item) => item.id === id ? { ...item, detail: item.ifThenPlan!.thenAction, isMicroGoal: true } : item));
    setToast(t("تم تفعيل خطتك البديلة. خطوة صغيرة تكفي الآن.", "Your fallback plan is active. A small step is enough right now."));
  };

  const toggleTask = (id: string) => {
    if (hapticsEnabled && Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const completingTask = tasks.find((task) => task.id === id && !task.done);
    setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task));
    if (completingTask) {
      awardXp(completingTask.priority === "high" ? "high_priority_task" : "task");
      if (completingTask.priority === "high") setEnergyFeedbackTaskId(id);
    }
    setToast(t("تم تحديث حالة المهمة.", "Task status updated."));
  };

  const toggleStep = (taskId: string, stepId: string) => {
    setTasks((current) => current.map((task) => task.id !== taskId ? task : {
      ...task,
      steps: task.steps?.map((step) => step.id === stepId ? { ...step, done: !step.done } : step),
    }));
  };

  const completeHabit = (id: string) => {
    const habit = habits.find((item) => item.id === id);
    if (!habit) return;
    const target = habitDailyTarget(habit.reminderTimes, hasPlanningPremium);
    const currentCount = habitCompletionCounts[id] ?? 0;
    if (currentCount >= target) return;
    if (hapticsEnabled && Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const nextCount = currentCount + 1;
    setHabitCompletionCounts((current) => ({ ...current, [id]: nextCount }));
    if (nextCount >= target) {
      setHabits((current) => current.map((item) => item.id === id ? { ...item, streak: item.streak + 1, emergency: false, lastCompletedAt: new Date().toISOString() } : item));
      awardXp("habit");
      setToast(t("رائع، اكتمل هدف العادة اليوم.", "Great work — today’s habit goal is complete."));
    } else setToast(t(`أحسنت، بقي ${target - nextCount} لإكمال هدف اليوم.`, `${target - nextCount} remaining to complete today’s goal.`));
  };

  const createPlannedTask = (input: TaskDraftInput) => {
    const id = `task-${Date.now()}`;
    const task: Task = { id, title: input.title, detail: input.detail || t("مهمة مجدولة جديدة", "New scheduled task"), energy: "medium", priority: "medium", done: false, reschedules: 0, scheduledAt: input.dueAt, reminderOffsets: input.reminderOffsets, location: input.location, ifThenPlan: input.ifThenPlan, estimatedPomodoros: input.estimatedPomodoros, completedPomodoros: 0, project: input.project, tags: input.tags, createdAt: new Date().toISOString() };
    setTasks((current) => [task, ...current]);
    setToast(t("تمت إضافة المهمة وجدولة تذكيراتها.", "Task and its reminders were scheduled."));
    void scheduleTaskReminderOffsets({ taskId: id, title: task.title, detail: task.detail, dueAt: new Date(input.dueAt), offsets: input.reminderOffsets }).then((scheduled) => {
      setTasks((current) => current.map((item) => item.id === id ? { ...item, reminderNotificationIds: scheduled.map((entry) => entry.identifier).filter((identifier): identifier is string => Boolean(identifier)) } : item));
    }).catch(() => setToast(t("أُضيفت المهمة، لكن تعذر جدولة بعض التذكيرات. تحقق من إذن الإشعارات.", "Task added, but some reminders could not be scheduled. Check notification permission.")));
    if (task.location) Alert.alert(
      t("تفعيل تذكير الوصول؟", "Enable arrival reminder?"),
      t("سيطلب OMNI LIFE إذن الموقع بالخلفية لتذكيرك بهذه المهمة عند وصولك للمكان المحدد. يمكنك متابعة المهمة بدون تفعيل هذا الإذن.", "OMNI LIFE will request background location access to remind you when you arrive at this place. You can continue without enabling it."),
      [
        { text: t("لاحقًا", "Not now"), style: "cancel" },
        { text: t("تفعيل التذكير", "Enable reminder"), onPress: () => { void registerTaskGeofences([...tasks, task]).then((result) => { if (!result.enabled) setToast(t("تم حفظ موقع المهمة، لكن يلزم السماح بالموقع بالخلفية لتفعيل تنبيه الوصول.", "Task location saved, but allow background location to enable arrival alerts.")); }); } },
      ],
    );
  };

  const captureTaskLocation = async () => {
    const location = await captureCurrentTaskLocation(t("موقعي الحالي", "Current location"));
    return location;
  };

  const createPlannedHabit = (input: HabitDraftInput) => {
    const id = `habit-${Date.now()}`;
    const habit: Habit = { id, title: input.title, detail: input.detail || t("عادة جديدة", "New habit"), category: t("عادة مخصصة", "Custom habit"), frequency: input.frequency, reminderTimes: hasPlanningPremium ? input.reminderTimes : input.reminderTimes.slice(0, 1), streak: 0, emergency: false, ifThenPlan: input.ifThenPlan, createdAt: new Date().toISOString() };
    setHabits((current) => [habit, ...current]);
    setToast(t("تمت إضافة العادة وضبط تكرارها.", "Habit added with its recurrence."));
    void scheduleHabitReminderTimes({ habitId: id, title: habit.title, detail: habit.detail, frequency: habit.frequency, times: habit.reminderTimes.map((time) => new Date(time)) }).then((identifiers) => {
      setHabits((current) => current.map((item) => item.id === id ? { ...item, reminderNotificationIds: identifiers.filter((identifier): identifier is string => Boolean(identifier)) } : item));
    }).catch(() => setToast(t("أُضيفت العادة، لكن تعذر جدولة بعض التذكيرات. تحقق من إذن الإشعارات.", "Habit added, but some reminders could not be scheduled. Check notification permission.")));
  };

  const confirmHabitDeletion = (id: string) => {
    const habit = habits.find((item) => item.id === id);
    if (!habit) return;
    Alert.alert(t("حذف العادة؟", "Delete habit?"), t(`سيتم حذف «${habit.title}» من عاداتك.`, `“${habit.title}” will be removed from your habits.`), [
      { text: t("إلغاء", "Cancel"), style: "cancel" },
      { text: t("حذف العادة", "Delete habit"), style: "destructive", onPress: () => { setHabits((current) => current.filter((item) => item.id !== id)); setHabitCompletionCounts((current) => { const next = { ...current }; delete next[id]; return next; }); setToast(t("تم حذف العادة.", "Habit deleted.")); } },
    ]);
  };

  const confirmRecurringFinanceDeletion = (id: string) => {
    const entry = subs.find((item) => item.id === id);
    if (!entry) return;
    const isDailyExpense = entry.kind === "daily_expense";
    Alert.alert(isDailyExpense ? t("حذف المصروف اليومي؟", "Delete daily expense?") : t("حذف الالتزام المالي؟", "Delete recurring entry?"), isDailyExpense ? t(`سيتم حذف «${entry.title}» من مصروفات اليوم.`, `“${entry.title}” will be removed from today’s expenses.`) : t(`سيتم حذف «${entry.title}» من التزاماتك الدورية.`, `“${entry.title}” will be removed from recurring finances.`), [
      { text: t("إلغاء", "Cancel"), style: "cancel" },
      { text: t("حذف", "Delete"), style: "destructive", onPress: () => { void cancelRecurringFinanceReminders(entry.reminderNotificationIds); setSubs((current) => current.filter((item) => item.id !== id)); setToast(isDailyExpense ? t("تم حذف المصروف اليومي.", "Daily expense deleted.") : t("تم حذف الالتزام المالي.", "Recurring entry deleted.")); } },
    ]);
  };

  const openRecurringFinanceEditor = () => {
    if (!canAddRecurringFinanceEntry(subs.length, hasPlanningPremium)) {
      setToast(t(`الخطة المجانية تسمح بإضافة ${FREE_RECURRING_FINANCE_LIMIT} التزامات دورية فقط.`, `Free accounts can add up to ${FREE_RECURRING_FINANCE_LIMIT} recurring entries.`));
      setPaywallVisible(true);
      return;
    }
    setEditingRecurringEntryId(null);
    setRecurringFinanceEditorVisible(true);
  };

  const scheduleRecurringEntry = (entry: Subscription) => {
    if (!entry.reminderFrequency || !entry.reminderAt || entry.reminderEnabled === false) return;
    void scheduleRecurringFinanceReminder({ entryId: entry.id, title: entry.title, amount: entry.amount, reminderAt: new Date(entry.reminderAt), frequency: entry.reminderFrequency, isArabic, endsAt: entry.endsAt ? new Date(entry.endsAt) : null, earlyReminderMinutes: entry.earlyReminderMinutes ?? 0 }).then((identifiers) => {
      if (identifiers.length === 0) {
        setToast(t("تم حفظ الالتزام، وفعّل إذن الإشعارات لتشغيل التذكير.", "Commitment saved. Enable notifications to activate its reminder."));
        return;
      }
      setSubs((current) => current.map((item) => item.id === entry.id ? { ...item, reminderNotificationIds: identifiers } : item));
    }).catch(() => setToast(t("تم حفظ الالتزام، لكن تعذر ضبط تذكيره. تحقق من إذن الإشعارات.", "Commitment saved, but its reminder could not be scheduled. Check notification permission.")));
  };

  const createRecurringFinance = (draft: RecurringFinanceDraft) => {
    const existing = editingRecurringEntryId ? subs.find((item) => item.id === editingRecurringEntryId) : undefined;
    const id = existing?.id ?? `recurring-${Date.now()}`;
    const entry: Subscription = { id, title: draft.title, amount: draft.amount, category: draft.kind === "installment" ? t("قسط", "Installment") : draft.kind === "savings_circle" ? t("جمعية", "Savings circle") : t("اشتراك", "Subscription"), wasteful: existing?.wasteful ?? false, kind: draft.kind, recordedAt: existing?.recordedAt ?? new Date().toISOString(), reminderFrequency: draft.reminderFrequency, reminderAt: draft.reminderAt, endsAt: draft.endsAt, earlyReminderMinutes: draft.earlyReminderMinutes, reminderEnabled: existing?.reminderEnabled ?? true, reminderNotificationIds: [] };
    if (existing) {
      void cancelRecurringFinanceReminders(existing.reminderNotificationIds);
      setSubs((current) => current.map((item) => item.id === id ? entry : item));
      setToast(t("تم تعديل الالتزام وإعادة ضبط تذكيره.", "Commitment and reminder updated."));
    } else {
      setSubs((current) => [entry, ...current]);
      setToast(t("تمت إضافة الالتزام وضبط تذكيره بالجنيه المصري.", "Recurring commitment and reminder added in EGP."));
    }
    setEditingRecurringEntryId(null);
    setRecurringFinanceEditorVisible(false);
    scheduleRecurringEntry(entry);
  };

  const editRecurringFinance = (id: string) => {
    setEditingRecurringEntryId(id);
    setRecurringFinanceEditorVisible(true);
  };

  const toggleRecurringFinanceReminder = (id: string) => {
    const entry = subs.find((item) => item.id === id);
    if (!entry || entry.kind === "daily_expense") return;
    if (entry.reminderEnabled !== false) {
      void cancelRecurringFinanceReminders(entry.reminderNotificationIds);
      setSubs((current) => current.map((item) => item.id === id ? { ...item, reminderEnabled: false, reminderNotificationIds: [] } : item));
      setToast(t("تم إيقاف تذكير الالتزام مؤقتًا.", "Commitment reminder paused."));
      return;
    }
    if (entry.endsAt && new Date(entry.endsAt).getTime() < Date.now()) {
      setToast(t("انتهى تاريخ هذا الالتزام؛ عدّل تاريخ الانتهاء قبل إعادة التذكير.", "This commitment has ended. Update its end date before resuming reminders."));
      return;
    }
    const resumed = { ...entry, reminderEnabled: true, reminderNotificationIds: [] };
    setSubs((current) => current.map((item) => item.id === id ? resumed : item));
    setToast(t("تم تشغيل تذكير الالتزام مجددًا.", "Commitment reminder resumed."));
    scheduleRecurringEntry(resumed);
  };

  const importBankSmsTransactions = async () => {
    if (isSmsScanRunning) return;
    setIsSmsScanRunning(true);
    try {
      const result = await scanRecentBankSms();
      if (result.status === "unsupported" || result.status === "unavailable") {
        setSmsTrackerEnabled(false);
        setToast(t("تتبع الرسائل البنكية يعمل في نسخة Android مخصّصة فقط، وليس في الويب أو Expo Go.", "Bank SMS tracking works only in a custom Android build, not web or Expo Go."));
        return;
      }
      if (result.status === "denied") {
        setSmsTrackerEnabled(false);
        setToast(t("لم يتم منح إذن الرسائل. يمكنك تفعيله لاحقًا من إعدادات الهاتف لتسجيل المعاملات تلقائيًا.", "SMS permission was not granted. You can enable it later in phone settings for automatic transaction capture."));
        return;
      }
      if (result.status === "failed") {
        setToast(t("تعذر فحص الرسائل البنكية محليًا. تأكد من بناء Android المخصص ثم أعد المحاولة.", "Local bank-SMS scan failed. Verify the custom Android build, then try again."));
        return;
      }
      const existingFingerprints = new Set(subs.map((entry) => entry.smsFingerprint).filter((value): value is string => Boolean(value)));
      const newTransactions = result.transactions.filter((transaction) => !existingFingerprints.has(transaction.fingerprint));
      if (newTransactions.length === 0) {
        setToast(t("لا توجد معاملات بنكية جديدة قابلة للاستيراد.", "No new bank transactions were available to import."));
        return;
      }
      const importedExpenses: Subscription[] = newTransactions.map((transaction) => ({ id: `sms-${transaction.fingerprint}`, title: transaction.merchant, amount: transaction.amount, category: getBankSmsCategoryLabel(transaction.category, isArabic), wasteful: false, kind: "daily_expense", recordedAt: transaction.occurredAt, source: "sms", smsFingerprint: transaction.fingerprint, transactionDirection: transaction.direction }));
      setSubs((current) => [...importedExpenses, ...current]);
      setToast(t(`تمت إضافة ${importedExpenses.length} معاملة تلقائيًا من الرسائل البنكية.`, `${importedExpenses.length} bank transactions were added automatically.`));
      const now = new Date();
      const assessment = assessOverspending([
        ...subs.filter((entry) => entry.kind === "daily_expense").map((entry) => ({ amount: entry.amount, occurredAt: entry.recordedAt ?? now.toISOString(), kind: "expense" as const })),
        ...newTransactions.filter((transaction) => transaction.direction === "expense").map((transaction) => ({ amount: transaction.amount, occurredAt: transaction.occurredAt, kind: "expense" as const })),
      ], smsDailyLimit, now);
      const alertKey = `omni-life-overspending-alert-${now.toISOString().slice(0, 10)}`;
      if (assessment.shouldAlert && !(await AsyncStorage.getItem(alertKey))) {
        let body = t("لقد تجاوزت معدل المصروفات الطبيعي اليوم أو رُصدت عمليات متقاربة. خذ نفسًا قبل المصروف التالي.", "Today’s spending is above your limit or several transactions were recorded quickly. Pause before the next expense.");
        try {
          body = (await aiContextualAlertMutation.mutateAsync({ kind: "spending", isArabic, userName: notificationUserName || undefined, context: { expenseTotalEgp: assessment.total, dailyLimitEgp: smsDailyLimit, reason: assessment.reason ?? undefined } })).message;
        } catch (error) { console.warn("[AI] Spending alert fallback used", error); }
        await sendInstantHighPriorityNotification({ title: t("⚠️ تنبيه إنفاق ذكي", "⚠️ Smart spending nudge"), body, target: { kind: "finance", id: "overspending-alert" } });
        await AsyncStorage.setItem(alertKey, assessment.reason ?? "alerted");
      }
    } finally {
      setIsSmsScanRunning(false);
    }
  };

  const toggleBankSmsTracker = (enabled: boolean) => {
    if (!enabled) {
      setSmsTrackerEnabled(false);
      setToast(t("تم إيقاف تتبع الرسائل البنكية. لن يفحص التطبيق رسائل جديدة.", "Bank SMS tracking is paused. The app will not scan new messages."));
      return;
    }
    setSmsTrackerEnabled(true);
    void importBankSmsTransactions();
  };

  const handleImportContact = async () => {
    if (isImportingContact) return;
    setIsImportingContact(true);
    try {
      const result = await importSingleDeviceContact();
      if (result.status === "imported") {
        const duplicate = contacts.some((contact) => contact.phone.replace(/\D/g, "") === result.contact.phone.replace(/\D/g, ""));
        if (duplicate) setToast(t("جهة الاتصال موجودة بالفعل في العلاقات.", "This contact is already in Relationships."));
        else {
          const importedId = `contact-${Date.now()}`;
          setContacts((current) => [{ id: importedId, name: result.contact.name, phone: result.contact.phone, relation: t("جهة اتصال", "Contact"), note: t("تم استيرادها من الهاتف", "Imported from your phone") }, ...current]);
          setSelectedContactId(importedId);
          setToast(t("تم استيراد جهة الاتصال بنجاح.", "Contact imported successfully."));
        }
      } else if (result.status === "denied") setToast(t("اسمح بالوصول إلى جهات الاتصال من إعدادات الهاتف ثم أعد المحاولة.", "Allow Contacts access in phone settings, then try again."));
      else if (result.status === "missing_phone") setToast(t("جهة الاتصال المختارة لا تحتوي رقم هاتف.", "The selected contact does not have a phone number."));
      else if (result.status === "unsupported") setToast(t("استيراد جهات الاتصال متاح في نسخة Android أو iOS فقط.", "Contact import is available only in Android or iOS builds."));
      else if (result.status === "failed") setToast(t("تعذر فتح جهات الاتصال. أعد المحاولة بعد تحديث التطبيق.", "Contacts could not be opened. Try again after updating the app."));
    } finally {
      setIsImportingContact(false);
    }
  };

  const selectSavedContact = (id: string) => {
    const contact = contacts.find((item) => item.id === id);
    if (!contact) return;
    setSelectedContactId(id);
    setToast(t(`تم اختيار ${contact.name}.`, `${contact.name} selected.`));
  };

  const saveContactRelationshipReminder = async (contactId: string, reminder: Pick<ContactRelationshipReminder, "purpose" | "cadence" | "at">) => {
    const contact = contacts.find((item) => item.id === contactId);
    if (!contact) return;
    await cancelContactRelationshipReminder(contact.reminder?.notificationId);
    try {
      let body: string | undefined;
      try {
        body = (await aiContextualAlertMutation.mutateAsync({ kind: "relationship", isArabic, userName: notificationUserName || undefined, context: { contactName: contact.name, purpose: reminder.purpose } })).message;
      } catch (error) { console.warn("[AI] Relationship reminder fallback used", error); }
      const notificationId = await scheduleContactRelationshipReminder({ contactId, contactName: contact.name, reminder, isArabic, body });
      const nextReminder: ContactRelationshipReminder = { ...reminder, enabled: Boolean(notificationId), notificationId: notificationId ?? undefined };
      setContacts((current) => current.map((item) => item.id === contactId ? { ...item, reminder: nextReminder } : item));
      setToast(notificationId
        ? t(`تم ضبط تذكير التواصل مع ${contact.name}.`, `Reminder set to connect with ${contact.name}.`)
        : t("حُفظت إعدادات التذكير. اسمح بإشعارات التطبيق لتفعيله على الهاتف.", "Reminder settings were saved. Allow app notifications to activate it on your phone."));
    } catch {
      setToast(t("تعذر ضبط تذكير جهة الاتصال. تحقق من الموعد وإذن الإشعارات.", "The contact reminder could not be scheduled. Check the time and notification permission."));
    }
  };

  const toggleContactRelationshipReminder = async (contactId: string, enabled: boolean) => {
    const contact = contacts.find((item) => item.id === contactId);
    const reminder = contact?.reminder;
    if (!contact || !reminder) return;
    if (enabled) {
      await saveContactRelationshipReminder(contactId, reminder);
      return;
    }
    await cancelContactRelationshipReminder(reminder.notificationId);
    setContacts((current) => current.map((item) => item.id === contactId && item.reminder ? { ...item, reminder: { ...item.reminder, enabled: false, notificationId: undefined } } : item));
    setToast(t(`تم إيقاف تذكير ${contact.name} مؤقتًا.`, `${contact.name}'s reminder is paused.`));
  };

  const confirmContactDeletion = (id: string) => {
    const contact = contacts.find((item) => item.id === id);
    if (!contact) return;
    Alert.alert(
      t("حذف جهة الاتصال؟", "Delete contact?"),
      t(`سيتم حذف ${contact.name} من العلاقات داخل OMNI LIFE فقط. لن نحذفها من دفتر هاتفك.`, `${contact.name} will be removed from OMNI LIFE only, not from your phone contacts.`),
      [
        { text: t("إلغاء", "Cancel"), style: "cancel" },
        {
          text: t("حذف", "Delete"),
          style: "destructive",
          onPress: () => {
            void cancelContactRelationshipReminder(contact.reminder?.notificationId);
            setContacts((current) => current.filter((item) => item.id !== id));
            setSelectedContactId((current) => current === id ? null : current);
            setToast(t("تم حذف جهة الاتصال من العلاقات.", "Contact removed from Relationships."));
          },
        },
      ],
    );
  };

  const openTaskSchedule = (taskId: string) => {
    const existingSchedule = tasks.find((task) => task.id === taskId)?.scheduledAt;
    const existingDate = existingSchedule ? new Date(existingSchedule) : null;
    setTaskScheduledAt(existingDate && !Number.isNaN(existingDate.getTime()) ? existingDate : new Date(Date.now() + 60 * 60 * 1000));
    setTaskToSchedule(taskId);
  };

  const confirmTaskSchedule = () => {
    if (!taskToSchedule) return;
    if (taskScheduledAt.getTime() <= Date.now()) {
      setToast(t("اختر موعدًا مستقبليًا للمهمة.", "Choose a future time for the task."));
      return;
    }
    setTasks((current) => current.map((task) => task.id === taskToSchedule ? {
      ...task,
      scheduledAt: taskScheduledAt.toISOString(),
      reschedules: task.reschedules + 1,
    } : task));
    setTaskToSchedule(null);
    setToast(t("تم ضبط موعد المهمة بالتاريخ والوقت اللذين اخترتهما.", "The task is scheduled for your selected date and time."));
  };

  const submitComposer = () => {
    const enteredTitle = draft.trim();
    if (!composer || (!enteredTitle && composer !== "expense")) {
      setToast(t("اكتب عنوانًا أولًا.", "Enter a title first."));
      return;
    }
    const text = enteredTitle || expenseCategory || t("مصروف يومي", "Daily expense");
    const id = `${composer}-${Date.now()}`;
    if (composer === "category") {
      if (!categoryTargetId) return;
      setSubs((current) => current.map((entry) => entry.id === categoryTargetId ? { ...entry, category: text } : entry));
      setToast(t("تم تصحيح تصنيف المعاملة.", "Transaction category corrected."));
      setCategoryTargetId(null);
      setComposer(null);
      setDraft("");
      return;
    }
    if (composer === "task" || composer === "habit") {
      setComposer(null);
      setPlannerMode(composer);
      return;
    }
    if (composer === "idea") {
      setIdeas((current) => [{ id, title: text, detail: t("فكرة جديدة في بنك الأفكار", "A new spark in your idea bank"), old: false, archived: false, createdAt: new Date().toISOString() }, ...current]);
      awardXp("idea");
    }
    if (composer === "contact") setContacts((current) => [{ id, name: text, phone: "+20 10 0000 0000", relation: t("علاقة جديدة", "New connection"), note: t("إضافة محلية جديدة", "New local contact"), }, ...current]);
    if (composer === "expense") {
      if (!canAddDailyManualTransaction(subs, hasPlanningPremium, new Date())) {
        showDailyTransactionLimitPaywall();
        return;
      }
      const amount = parsePositiveEgpAmount(expenseAmount);
      if (amount === null) {
        setToast(t("أدخل مبلغًا صحيحًا أكبر من صفر بالجنيه المصري.", "Enter a valid EGP amount greater than zero."));
        return;
      }
      setSubs((current) => [{ id, title: text, amount, category: expenseCategory || t("مصروف يومي", "Daily expense"), wasteful: false, kind: "daily_expense", recordedAt: new Date().toISOString(), source: "manual", transactionDirection: "expense" }, ...current]);
      awardXp("expense");
      setToast(t("تم تسجيل المصروف اليومي وإضافته إلى إجمالي اليوم.", "Daily expense recorded and added to today’s total."));
      setComposer(null);
      setDraft("");
      setExpenseAmount("");
      setExpenseCategory("");
      return;
    }
    setToast(t("تمت الإضافة إلى مركز حياتك.", "Added to your life center."));
    setComposer(null);
    setDraft("");
  };

  const sendAdvice = async (raw?: string) => {
    const message = (raw ?? chatInput).trim();
    if (!message) return;
    const userMessage: ChatMessage = { id: `u-${Date.now()}`, from: "user", text: message };
    setChat((current) => [...current, userMessage]);
    setChatInput("");
    try {
      const response = await productivityCoachMutation.mutateAsync({
        message,
        isArabic,
        energy: dailyEnergy,
        mood: dailyMood,
        tasks: tasks.slice(0, 12).map((task) => ({ title: task.title, detail: task.detail, energy: task.energy, priority: task.priority, done: task.done })),
      });
      setChat((current) => [...current, { id: `a-${Date.now()}`, from: "ai", text: response.message }]);
    } catch {
      const response = getAdvisorResponse(message, isArabic, water);
      setChat((current) => [...current, { id: `a-${Date.now()}`, from: "ai", text: response }]);
      setToast(t("تعذر الاتصال بالمساعد الذكي الآن؛ هذه نصيحة محلية سريعة.", "The AI assistant is unavailable; here is a quick local suggestion."));
    }
  };

  const dashboard = (
    <FocusedDashboard
      isArabic={isArabic}
      isSyncing={isSyncing}
      onSync={triggerSync}
      tasks={prioritizedHomeTasks}
      habits={habits}
      completedHabitIds={completedHabitIds}
      onQuickAddTask={addQuickTask}
      onToggleTask={toggleTask}
      onBreakFriction={breakFriction}
      onCompleteHabit={completeHabit}
      onOpenTasks={() => setScreen("tasks")}
      onOpenHabits={() => setScreen("habits")}
      onOpenFinance={() => setScreen("finance")}
      onOpenIdeas={() => setScreen("ideas")}
      onOpenRelationships={() => setScreen("relationships")}
      onOpenAdvisor={() => openPremiumScreen("advisor")}
      onOpenCommunity={() => setScreen("community")}
      onOpenNotifications={() => setScreen("notifications")}
      onOpenSettings={() => setScreen("settings")}
      isAdmin={isAdmin}
      onOpenAppControl={() => setScreen("admin")}
      dailyEnergy={dailyEnergy}
      dailyMood={dailyMood}
      onDailyEnergyChange={setDailyEnergy}
      onDailyMoodChange={setDailyMood}
      gamification={gamification}
      focusTimeSummary={focusTimeSummaryQuery.data}
      homeGuidanceTip={homeGuidanceProgress ? getActiveHomeGuidanceTip(homeGuidanceProgress) : null}
      onHomeGuidanceAction={(target) => handleHomeGuidanceAction(target)}
      onDismissHomeGuidance={dismissActiveHomeGuidance}
    />
  );

  if (!manualReady) return <View style={[styles.app, styles.emptyState]}><Text style={styles.emptyTitle}>OMNI LIFE</Text></View>;
  if (!manualProfile && !isAuthenticated) return <ManualAccessGate welcomeSeen={welcomeSeen} onWelcomeSeen={handleWelcomeSeen} onAuthenticated={(profile) => { void handleManualProfile(profile); }} />;

  let content = screen === "dashboard" ? dashboard
    : screen === "tasks" ? <TasksView t={t} tasks={tasks} filter={taskFilter} setFilter={setTaskFilter} generatingTaskId={isGeneratingFrictionTaskId} onToggle={toggleTask} onBreak={breakFriction} onApplyFallback={applyTaskFallback} onToggleStep={toggleStep} onReschedule={openTaskSchedule} onDelete={(id) => setTasks((current) => current.filter((task) => task.id !== id))} onAdd={() => setPlannerMode("task")} onOpenTunnel={() => { setSelectedFocusTaskId(null); setScreen("tunnel"); }} onStartFocus={startTaskPomodoro} />
    : screen === "tunnel" ? <TunnelVisionScreen isArabic={isArabic} task={tunnelTask} durations={pomodoroDurations} focusDndEnabled={focusDndEnabled} onFocusDndChange={handleFocusDndChange} remaining={tasks.filter((task) => !task.done).length} onComplete={toggleTask} onPomodoroComplete={completePomodoroSession} onExtend={extendPomodoroTask} onDefer={deferTunnelTask} onExit={() => { setSelectedFocusTaskId(null); setScreen("tasks"); }} />
    : screen === "habits" ? <HabitsView t={t} section={habitSection} setSection={setHabitSection} habits={habits} completionCounts={habitCompletionCounts} isPremium={hasPlanningPremium} wheel={wheel} setWheel={setWheel} average={wheelAverage} zenRunning={zenRunning} zenSeconds={zenSeconds} onToggleZen={() => setZenRunning((running) => !running)} onResetZen={() => { setZenRunning(false); setZenSeconds(25 * 60); }} onComplete={completeHabit} onEmergency={(id) => setHabits((current) => current.map((habit) => habit.id === id ? { ...habit, emergency: !habit.emergency } : habit))} onDelete={confirmHabitDeletion} onAdd={() => setPlannerMode("habit")} />
    : screen === "finance" ? <FinanceView t={t} tab="cashflow" setTab={() => undefined} subs={subs} ideas={ideas} contacts={contacts} onOpenIdeas={() => setScreen("ideas")} onOpenRelationships={() => setScreen("relationships")} onImportContact={() => { void handleImportContact(); }} importingContact={isImportingContact} onToggleWaste={(id) => setSubs((current) => current.map((sub) => sub.id === id ? { ...sub, wasteful: !sub.wasteful } : sub))} onDelete={confirmRecurringFinanceDeletion} onAddRecurring={openRecurringFinanceEditor} onEditRecurring={editRecurringFinance} onToggleRecurringReminder={toggleRecurringFinanceReminder} onConvert={(idea) => { setTasks((current) => [{ id: `task-${Date.now()}`, title: idea.title, detail: idea.detail, energy: "medium", priority: "high", done: false, reschedules: 0 }, ...current]); setIdeas((current) => current.map((item) => item.id === idea.id ? { ...item, archived: true } : item)); setToast(t("تحولت الفكرة إلى مهمة في قائمة العمل.", "Idea converted to a task.")); }} onArchive={(id) => setIdeas((current) => current.map((idea) => idea.id === id ? { ...idea, archived: true } : idea))} onAdd={openDailyExpenseComposer} smsTracker={{ enabled: smsTrackerEnabled, dailyLimit: smsDailyLimit, scanning: isSmsScanRunning, onToggle: toggleBankSmsTracker, onDailyLimitChange: setSmsDailyLimit, onScan: () => { void importBankSmsTransactions(); } }} />
    : screen === "ideas" ? <FinanceView t={t} tab="ideas" setTab={() => undefined} subs={subs} ideas={ideas} contacts={contacts} onOpenIdeas={() => undefined} onOpenRelationships={() => setScreen("relationships")} onImportContact={() => { void handleImportContact(); }} importingContact={isImportingContact} onToggleWaste={(id) => setSubs((current) => current.map((sub) => sub.id === id ? { ...sub, wasteful: !sub.wasteful } : sub))} onDelete={confirmRecurringFinanceDeletion} onAddRecurring={openRecurringFinanceEditor} onConvert={(idea) => { setTasks((current) => [{ id: `task-${Date.now()}`, title: idea.title, detail: idea.detail, energy: "medium", priority: "high", done: false, reschedules: 0 }, ...current]); setIdeas((current) => current.map((item) => item.id === idea.id ? { ...item, archived: true } : item)); setToast(t("تحولت الفكرة إلى مهمة في قائمة العمل.", "Idea converted to a task.")); }} onArchive={(id) => setIdeas((current) => current.map((idea) => idea.id === id ? { ...idea, archived: true } : idea))} onAdd={() => setComposer("idea")} />
    : screen === "relationships" ? <FinanceView t={t} tab="contacts" setTab={() => undefined} subs={subs} ideas={ideas} contacts={contacts} selectedContactId={selectedContactId} onSelectContact={selectSavedContact} onDeleteContact={confirmContactDeletion} onOpenContactReminder={(id) => setContactReminderEditorId(id)} onToggleContactReminder={(id, enabled) => { void toggleContactRelationshipReminder(id, enabled); }} onOpenIdeas={() => setScreen("ideas")} onOpenRelationships={() => undefined} onImportContact={() => { void handleImportContact(); }} importingContact={isImportingContact} onToggleWaste={(id) => setSubs((current) => current.map((sub) => sub.id === id ? { ...sub, wasteful: !sub.wasteful } : sub))} onDelete={confirmRecurringFinanceDeletion} onAddRecurring={openRecurringFinanceEditor} onConvert={(idea) => { setTasks((current) => [{ id: `task-${Date.now()}`, title: idea.title, detail: idea.detail, energy: "medium", priority: "high", done: false, reschedules: 0 }, ...current]); setIdeas((current) => current.map((item) => item.id === idea.id ? { ...item, archived: true } : item)); setToast(t("تحولت الفكرة إلى مهمة في قائمة العمل.", "Idea converted to a task.")); }} onArchive={(id) => setIdeas((current) => current.map((idea) => idea.id === id ? { ...idea, archived: true } : idea))} onAdd={() => setComposer("contact")} />
    : screen === "advisor" ? <AdvisorView t={t} messages={chat} input={chatInput} setInput={setChatInput} onSend={() => { void sendAdvice(); }} onPrompt={(prompt) => { void sendAdvice(prompt); }} isLoading={productivityCoachMutation.isPending} />
    : screen === "community" ? <CommunityView userName={manualProfile?.fullName ?? user?.name ?? "OMNI LIFE user"} email={manualProfile?.email ?? user?.email ?? ""} isArabic={isArabic} initialPlan={checkoutPlan} onToast={setToast} />
    : screen === "weeklyReport" ? <WeeklyReportView t={t} report={weeklyReportQuery.data ?? null} preview={weeklyPreview} persona={weeklyPersona} onPersonaChange={setWeeklyPersona} loading={weeklyReportQuery.isLoading} />
    : screen === "admin" ? (isAdmin ? <AdminDashboardView isArabic={isArabic} onToast={setToast} recentItems={recentAdminItems} onQuickEdit={handleAdminQuickEdit} /> : <View style={styles.emptyState}><Text style={styles.emptyTitle}>{t("هذه الصفحة مخصصة للمدير.", "This screen is restricted to the administrator.")}</Text></View>)
    : screen === "information" ? <InformationPagesView isArabic={isArabic} page={informationPage} content={informationContent} onPageChange={setInformationPage} onBack={() => setScreen("settings")} />
    : screen === "settings" ? <SettingsView isArabic={isArabic} hapticsEnabled={hapticsEnabled} homeGuidanceEnabled={homeGuidanceProgress?.enabled ?? Boolean(welcomeCompletedAt)} dailyBriefingEnabled={dailyBriefingEnabled} eveningClosureEnabled={eveningClosureEnabled} eveningClosureAt={eveningClosureAt} customNotificationSounds={soundPreferences.useCustomSounds} sleepMode={soundPreferences.sleepMode} pomodoroDurations={pomodoroDurations} focusDndEnabled={focusDndEnabled} backgroundReliability={backgroundReliability} t={t} onToggleLanguage={() => setIsArabic((value) => !value)} onToggleHaptics={setHapticsEnabled} onToggleHomeGuidance={toggleHomeGuidance} onRestartHomeGuidance={restartInteractiveGuidance} onToggleDailyBriefing={setDailyBriefingEnabled} onToggleEveningClosure={setEveningClosureEnabled} onChangeEveningClosureAt={setEveningClosureAt} onOpenEveningClosure={() => setBrainDumpVisible(true)} onToggleCustomNotificationSounds={(value) => updateSoundPreferences({ ...soundPreferences, useCustomSounds: value })} onToggleSleepMode={(enabled) => updateSoundPreferences({ ...soundPreferences, sleepMode: { ...soundPreferences.sleepMode, enabled } })} onChangeSleepModeStart={(startsAtMinutes) => updateSoundPreferences({ ...soundPreferences, sleepMode: { ...soundPreferences.sleepMode, startsAtMinutes } })} onChangeSleepModeEnd={(endsAtMinutes) => updateSoundPreferences({ ...soundPreferences, sleepMode: { ...soundPreferences.sleepMode, endsAtMinutes } })} onPreviewNotificationSound={(section: NotificationSoundSection) => { void previewNotificationSound(section); }} onChangePomodoroDurations={(next) => setPomodoroDurations(normalizePomodoroDurations(next))} onToggleFocusDnd={setFocusDndEnabled} onRequestFocusDndAccess={openFocusDndAccess} onRefreshBackgroundReliability={refreshBackgroundReliability} onOpenExactAlarmSettings={openExactAlarmAccess} onOpenBatteryOptimizationSettings={openBatteryOptimizationAccess} onOpenNotifications={() => setScreen("notifications")} onOpenAdminDashboard={() => setScreen("admin")} isAuthenticated={isAuthenticated || Boolean(manualProfile)} isAdmin={isAdmin} adminEmail={adminEmail} onSignIn={() => { void startOAuthLogin(); }} onLogout={() => { void handleLogout(); }} canResetAccount={Boolean(manualProfile) && !isAdmin} resetAccountBusy={isResettingAppData} onResetAccount={(pin) => { void handleAccountReset(pin); }} adminBusy={recordAuditMutation.isPending} adminTasks={tasks.map((task) => ({ id: task.id, title: task.title, done: task.done }))} adminHabits={habits.map((habit) => ({ id: habit.id, title: habit.title, complete: completedHabitIds.includes(habit.id) }))} auditEntries={auditQuery.data ?? []} campaigns={campaignQuery.data ?? []} campaignBusy={createCampaignMutation.isPending} onCreateCampaign={(input) => { void handleCreateCampaign(input); }} inAppAds={inAppAdsQuery.data ?? []} inAppAdsBusy={createInAppAdMutation.isPending || setInAppAdActiveMutation.isPending} onCreateInAppAd={(input) => { void handleCreateInAppAd(input); }} onSetInAppAdActive={(id, active) => { void handleSetInAppAdActive(id, active); }} onAdminTaskAction={(id, action) => { void handleAdminTaskAction(id, action); }} onAdminHabitAction={(id, action) => { void handleAdminHabitAction(id, action); }} onAdminBulkAction={(action) => { void handleAdminBulkAction(action); }} informationContent={informationContent} onOpenInformationPage={openInformationPage} onSaveInformationContent={saveEditableInformation} adminSummary={{ activeTasks: tasks.filter((task) => !task.done).length, habits: habits.length, unreadAlerts: unreadCount }} />
    : <NotificationsView t={t} isArabic={isArabic} notifications={notifications} promotions={promotionInbox} onBack={() => setScreen("dashboard")} onMarkAll={() => { setNotifications((current) => current.map((item) => ({ ...item, read: true }))); setPromotionInbox((current) => markPromotionInboxRead(current)); setToast(t("تم تعليم الإشعارات كمقروءة.", "Notifications marked as read.")); }} onToggle={(id) => setNotifications((current) => current.map((item) => item.id === id ? { ...item, read: !item.read } : item))} onRemovePromotion={(campaignId) => { setPromotionInbox((current) => removePromotionInboxItem(current, campaignId)); setToast(t("تم حذف الإشعار الترويجي.", "Promotional alert deleted.")); }} />;

  if (screen === "finance") content = <FinanceCashflowV2
    t={t}
    subs={subs}
    onDelete={confirmRecurringFinanceDeletion}
    onAddExpense={openDailyExpenseComposer}
    onAddRecurring={openRecurringFinanceEditor}
    onEditRecurring={editRecurringFinance}
    onToggleRecurringReminder={toggleRecurringFinanceReminder}
    onEditCategory={(id) => {
      const entry = subs.find((item) => item.id === id);
      if (!entry) return;
      setCategoryTargetId(id);
      setDraft(entry.category);
      setComposer("category");
    }}
    budgets={categoryBudgets}
    onBudgetChange={updateCategoryBudget}
    smsTracker={{ enabled: smsTrackerEnabled, dailyLimit: smsDailyLimit, scanning: isSmsScanRunning, onToggle: toggleBankSmsTracker, onDailyLimitChange: setSmsDailyLimit, onScan: () => { void importBankSmsTransactions(); } }}
  />;

  const navItems: { key: Exclude<Screen, "notifications" | "admin" | "tunnel">; label: string; icon: any }[] = [
    { key: "tasks", label: t("المهام", "Tasks"), icon: "task-alt" },
    { key: "habits", label: t("العادات", "Habits"), icon: "local-fire-department" },
    { key: "dashboard", label: t("الرئيسية", "Home"), icon: "dashboard" },
    { key: "finance", label: t("المال", "Money"), icon: "account-balance-wallet" },
    { key: "community", label: t("مجتمع", "Community"), icon: "forum" },
    { key: "settings", label: t("إعدادات", "Settings"), icon: "settings" },
  ];
  const tabBottomInset = Math.max(insets.bottom, 14);

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background" safeAreaClassName="bg-background">
      <OmniNotificationRoutingBridge onTarget={routeFromNotification} onCampaignLinkClick={trackCampaignLinkClick} onPromotionBadge={markPromotionBadge} />
      <View style={[styles.app, isWebDesktop && websiteStyles.app]}>
        <View style={[styles.header, isSmallPhone && compactShellStyles.header, isWebDesktop && websiteStyles.header]}>
          <Pressable onPress={() => setScreen("dashboard")} style={({ pressed }) => [styles.brand, pressed && styles.pressed]}>
            <Image source={require("@/assets/images/icon.png")} style={styles.avatar} resizeMode="cover" />
            <View>
              <Text style={styles.brandTitle}>OMNI LIFE</Text>
              {!isSmallPhone ? <Text style={styles.brandSub}>CENTER · LIFE OS</Text> : null}
            </View>
          </Pressable>
          <View style={[styles.headerActions, isSmallPhone && compactShellStyles.headerActions]}>
            <View style={[gamificationStyles.xpPill, isSmallPhone && compactShellStyles.xpPill]}><Icon name="military-tech" size={15} color={palette.amber} /><Text style={gamificationStyles.xpText}>{isSmallPhone ? `Lv.${gamification.level}` : `Lv.${gamification.level} · ${gamification.xp % XP_PER_LEVEL}/${XP_PER_LEVEL}`}</Text></View>
            <Pressable onPress={() => setIsArabic((value) => !value)} style={({ pressed }) => [styles.languageButton, pressed && styles.pressed]}><Text style={styles.languageText}>{isArabic ? "EN" : "ع"}</Text></Pressable>
            <Pressable onPress={() => { setPromotionInbox((current) => markPromotionInboxRead(current)); setScreen("notifications"); }} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
              <Icon name="notifications-none" size={21} color={palette.ink} />
              {unreadCount > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View> : null}
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t("المراجعة الأسبوعية", "Weekly review")} accessibilityHint={t("افتح ملخص إنجازاتك الأسبوعي", "Open your weekly progress summary")} onPress={() => setScreen("weeklyReport")} style={({ pressed }) => [styles.iconButton, weeklyReviewButtonStyles.button, pressed && styles.pressed]}><Icon name="insights" size={24} color="#E2DAFF" /><View pointerEvents="none" style={weeklyReviewButtonStyles.dot} /></Pressable>
          </View>
        </View>

        <View style={[websiteStyles.content, isWebDesktop && websiteStyles.contentDesktop]}>
          {isWebDesktop ? <View style={websiteStyles.sidebar}><Text style={websiteStyles.sidebarLabel}>{t("مساحة الحياة", "Life workspace")}</Text>{(isArabic ? [...navItems].reverse() : navItems).map((item) => { const active = screen === item.key; return <Pressable key={item.key} onPress={() => setScreen(item.key)} style={({ pressed }) => [websiteStyles.sidebarItem, active && websiteStyles.sidebarItemActive, pressed && styles.pressed]}><Icon name={item.icon} size={19} color={active ? palette.cyan : palette.muted} /><Text style={[websiteStyles.sidebarText, active && websiteStyles.sidebarTextActive]}>{item.label}</Text></Pressable>; })}<View style={websiteStyles.sidebarNote}><Icon name="desktop-windows" size={16} color={palette.purple} /><Text style={websiteStyles.sidebarNoteText}>{t("نسخة الويب المتجاوبة", "Responsive web version")}</Text></View></View> : null}
          <View style={[styles.main, isWebDesktop && websiteStyles.main]}>
            {content}
            {!entitlementQuery.isLoading && !hasPlanningPremium && (screen === "dashboard" || screen === "tasks" || screen === "habits" || screen === "finance") ? <InAppAdSlot placement={screen === "dashboard" ? "home" : screen} isArabic={isArabic} /> : null}
          </View>
        </View>

        {screen !== "dashboard" ? <FixedBackControl isArabic={isArabic} showAboveTabs={screen !== "notifications"} label={t("رجوع", "Back")} onPress={() => setScreen("dashboard")} /> : null}

        {!isWebDesktop && screen !== "notifications" ? <View style={[styles.tabBar, isSmallPhone && compactShellStyles.tabBar, { paddingBottom: tabBottomInset, minHeight: 59 + tabBottomInset }]}>
          {(isArabic ? [...navItems].reverse() : navItems).map((item) => {
            const active = screen === item.key;
            return <Pressable key={item.key} onPress={() => setScreen(item.key)} style={({ pressed }) => [styles.navItem, isSmallPhone && compactShellStyles.navItem, active && styles.navItemActive, pressed && styles.pressed]}>
              <Icon name={item.icon} size={isSmallPhone ? 18 : 20} color={active ? palette.cyan : palette.muted} />
              <Text numberOfLines={1} style={[styles.navLabel, isSmallPhone && compactShellStyles.navLabel, active && { color: palette.cyan }]}>{item.label}</Text>
            </Pressable>;
          })}
        </View> : null}

        <SubscriptionPaywall visible={paywallVisible} isArabic={isArabic} onClose={() => setPaywallVisible(false)} onCheckout={(tier) => { setCheckoutPlan(tier); setPaywallVisible(false); setScreen("community"); }} />
        <TaskHabitEditor mode={plannerMode} isArabic={isArabic} isPremium={hasPlanningPremium} onClose={() => setPlannerMode(null)} onCreateTask={createPlannedTask} onCreateHabit={createPlannedHabit} onCaptureTaskLocation={captureTaskLocation} />
        <RecurringFinanceEditor visible={recurringFinanceEditorVisible} isArabic={isArabic} initialDraft={editingRecurringDraft} onClose={() => { setRecurringFinanceEditorVisible(false); setEditingRecurringEntryId(null); }} onSave={createRecurringFinance} />
        <ContactReminderEditor visible={reminderEditorContact !== null} isArabic={isArabic} contactName={reminderEditorContact?.name ?? ""} initialReminder={reminderEditorContact?.reminder} onClose={() => setContactReminderEditorId(null)} onSave={(draft: ContactReminderDraft) => { if (reminderEditorContact) { void saveContactRelationshipReminder(reminderEditorContact.id, draft); setContactReminderEditorId(null); } }} />
        <EveningBrainDumpModal visible={brainDumpVisible} isArabic={isArabic} onClose={() => setBrainDumpVisible(false)} onSave={saveBrainDump} />
        <EnergyImpactFeedback visible={energyFeedbackTaskId !== null} isArabic={isArabic} onSelect={recordEnergyImpact} onDismiss={() => setEnergyFeedbackTaskId(null)} />
        <ZeroGuiltRecoveryModal visible={recoveryTaskId !== null || recoveryHabitId !== null} isArabic={isArabic} taskTitle={tasks.find((task) => task.id === recoveryTaskId)?.title ?? habits.find((habit) => habit.id === recoveryHabitId)?.title ?? ""} onRecover={applyFlexibleRecovery} onDismiss={() => { setRecoveryTaskId(null); setRecoveryHabitId(null); }} />
        {toast ? <View style={[styles.toast, isSmallPhone && compactShellStyles.toast]}><Icon name="check-circle" size={17} color={palette.emerald} /><Text style={styles.toastText}>{toast}</Text></View> : null}

        <Modal transparent visible={composer !== null} animationType="fade" onRequestClose={() => setComposer(null)}>
          <Pressable style={[styles.modalBackdrop, isSmallPhone && compactShellStyles.modalBackdrop]} onPress={() => setComposer(null)}>
            <Pressable style={[styles.composerCard, isSmallPhone && compactShellStyles.composerCard]} onPress={() => undefined}>
              <View style={styles.composerGlyph}><Icon name={composer === "task" ? "task-alt" : composer === "habit" ? "local-fire-department" : composer === "idea" ? "lightbulb" : composer === "contact" ? "person-add" : composer === "category" ? "sell" : "receipt-long"} size={23} color={palette.cyan} /></View>
              <Text style={styles.composerTitle}>{composer === "task" ? t("مهمة جديدة", "New task") : composer === "habit" ? t("عادة جديدة", "New habit") : composer === "idea" ? t("فكرة جديدة", "New idea") : composer === "contact" ? t("جهة اتصال جديدة", "New contact") : composer === "category" ? t("تصحيح تصنيف المعاملة", "Correct transaction category") : t("مصروف يومي جديد", "New daily expense")}</Text>
              <Text style={styles.composerSub}>{composer === "expense" ? t("ابدأ بالمبلغ فقط. اسم المصروف اختياري ويمكن اختياره لاحقًا.", "Start with the amount only. The expense name is optional and can be refined later.") : composer === "category" ? t("اكتب التصنيف المناسب، مثل طعام ومشروبات أو مواصلات أو فواتير.", "Enter a suitable category, such as Food & drinks, Transport, or Bills.") : t("اكتب الفكرة كما خطرت لك؛ التفاصيل دائمًا اختيارية.", "Write the idea as it arrives; details are always optional.")}</Text>
              {composer === "expense" ? <TextInput value={expenseAmount} onChangeText={setExpenseAmount} autoFocus placeholder={t("المبلغ بالجنيه المصري", "Amount in EGP")} placeholderTextColor={palette.muted} style={styles.composerInput} keyboardType="decimal-pad" textAlign={isArabic ? "right" : "left"} returnKeyType="done" onSubmitEditing={submitComposer} /> : null}
              <TextInput value={draft} onChangeText={setDraft} autoFocus={composer !== "expense"} placeholder={composer === "category" ? t("التصنيف", "Category") : composer === "expense" ? t("اسم المصروف اختياري: قهوة، مواصلات…", "Optional name: coffee, transport…") : t("اكتب هنا…", "Type here…")} placeholderTextColor={palette.muted} style={styles.composerInput} textAlign={isArabic ? "right" : "left"} returnKeyType="done" onSubmitEditing={submitComposer} />
              {composer === "expense" ? <View style={expenseComposerStyles.categories}>{(isArabic ? ["مصروف يومي", "طعام", "مواصلات", "فواتير", "تسوق"] : ["Daily expense", "Food", "Transport", "Bills", "Shopping"]).map((category) => <Pressable key={category} onPress={() => setExpenseCategory(category)} style={({ pressed }) => [expenseComposerStyles.category, expenseCategory === category && expenseComposerStyles.categoryActive, pressed && styles.pressed]}><Text style={[expenseComposerStyles.categoryText, expenseCategory === category && expenseComposerStyles.categoryTextActive]}>{category}</Text></Pressable>)}</View> : null}
              <View style={styles.composerActions}>
                <ActionButton label={t("إلغاء", "Cancel")} icon="close" tone="ghost" onPress={() => setComposer(null)} compact />
                <ActionButton label={composer === "category" ? t("حفظ التصنيف", "Save category") : composer === "expense" ? t("حفظ المصروف", "Save expense") : t("حفظ سريع", "Quick save")} icon={composer === "category" ? "check" : composer === "expense" ? "receipt-long" : "add"} tone="emerald" onPress={submitComposer} compact />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
        <Modal transparent visible={taskToSchedule !== null} animationType="fade" onRequestClose={() => setTaskToSchedule(null)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setTaskToSchedule(null)}>
            <Pressable style={taskScheduleStyles.card} onPress={() => undefined}>
              <View style={styles.composerGlyph}><Icon name="event" size={23} color={palette.cyan} /></View>
              <Text style={styles.composerTitle}>{t("تحديد موعد المهمة", "Schedule task")}</Text>
              <Text style={styles.composerSub}>{t("اختر التاريخ من التقويم والوقت من قرص الساعة.", "Choose the date from the calendar and time from the clock.")}</Text>
              <NativeDateTimePicker label={t("التاريخ", "Date")} value={taskScheduledAt} mode="date" onChange={setTaskScheduledAt} minimumDate={new Date()} isArabic={isArabic} />
              <NativeDateTimePicker label={t("الوقت", "Time")} value={taskScheduledAt} mode="time" onChange={setTaskScheduledAt} isArabic={isArabic} />
              <View style={styles.composerActions}>
                <ActionButton label={t("إلغاء", "Cancel")} icon="close" tone="ghost" onPress={() => setTaskToSchedule(null)} compact />
                <ActionButton label={t("حفظ الموعد", "Save schedule")} icon="event-available" tone="emerald" onPress={confirmTaskSchedule} compact />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </ScreenContainer>
  );
}

function WeeklyReportView({ t, report, preview, persona, onPersonaChange, loading }: { t: (ar: string, en: string) => string; report: { score: number; summary: string; metrics: string; persona: "gentle" | "strict" } | null; preview: ReturnType<typeof buildWeeklyReport>; persona: WeeklyPersona; onPersonaChange: (persona: WeeklyPersona) => void; loading: boolean }) {
  const metrics = report ? (() => { try { return JSON.parse(report.metrics) as ReturnType<typeof buildWeeklyReport>; } catch { return preview; } })() : preview;
  const summary = report?.summary ?? preview.summary;
  const score = report?.score ?? preview.score;
  const recharge = metrics.energyRecharge ?? 0;
  const balanced = metrics.energyBalanced ?? 0;
  const drain = metrics.energyDrain ?? 0;
  const energyTotal = recharge + balanced + drain;
  const energyRows = [
    { key: "recharge", icon: "bolt", label: t("شحنت طاقتي", "Recharged"), value: recharge, color: palette.emerald },
    { key: "balanced", icon: "self-improvement", label: t("متوازن", "Balanced"), value: balanced, color: palette.cyan },
    { key: "drain", icon: "coffee", label: t("استنزفت طاقتي", "Drained"), value: drain, color: palette.coral },
  ];
  return <ScrollView contentContainerStyle={styles.listContent}>
    <ScreenTitle title={t("مراجعتك الأسبوعية", "Weekly retrospective")} subtitle={t("ملخص هادئ وواضح لما أنجزته وما يحتاج انتباهك.", "A calm, clear summary of progress and what needs attention.")} />
    <View style={weeklyReportStyles.hero}><View><Text style={weeklyReportStyles.eyebrow}>{t("درجة الأسبوع", "Weekly score")}</Text><Text style={weeklyReportStyles.score}>{score}<Text style={weeklyReportStyles.scoreSuffix}>/100</Text></Text></View><View style={weeklyReportStyles.scoreRing}><Icon name="auto-awesome" size={25} color={palette.purple} /></View></View>
    <View style={weeklyReportStyles.personaRow}>{(["gentle", "strict"] as const).map((item) => <Pressable key={item} onPress={() => onPersonaChange(item)} style={({ pressed }) => [weeklyReportStyles.persona, persona === item && weeklyReportStyles.personaActive, pressed && styles.pressed]}><Icon name={item === "gentle" ? "self-improvement" : "bolt"} size={16} color={persona === item ? palette.canvas : palette.purple} /><Text style={[weeklyReportStyles.personaText, persona === item && { color: palette.canvas }]}>{item === "gentle" ? t("مرشد رحيم", "Gentle coach") : t("مرشد صارم", "Strict coach")}</Text></Pressable>)}</View>
    <View style={weeklyReportStyles.summary}><Icon name="psychology" size={21} color={palette.cyan} /><Text style={weeklyReportStyles.summaryText}>{loading ? t("جارٍ تحميل تقريرك…", "Loading your report…") : summary}</Text></View>
    <View style={weeklyReportStyles.metricGrid}>{[["task-alt", t("المهام المنجزة", "Tasks done"), metrics.completedTasks], ["local-fire-department", t("الالتزام بالعادات", "Habit consistency"), `${metrics.habitRate}%`], ["account-balance-wallet", t("مصروفات الأسبوع", "Weekly spending"), t(`${Number(metrics.expensesEgp ?? 0).toLocaleString("ar-EG")} ج.م`, `${Number(metrics.expensesEgp ?? 0).toLocaleString("en-US")} EGP`)], ["star", t("نقاط الخبرة", "Total XP"), `${metrics.xpEarned}`]].map(([icon, label, value]) => <View key={String(label)} style={weeklyReportStyles.metric}><Icon name={String(icon)} size={18} color={palette.emerald} /><Text style={weeklyReportStyles.metricValue}>{String(value)}</Text><Text style={weeklyReportStyles.metricLabel}>{String(label)}</Text></View>)}</View>
    <View style={energyMatrixStyles.card}><View style={energyMatrixStyles.head}><View style={energyMatrixStyles.icon}><Icon name="battery-charging-full" size={19} color={palette.amber} /></View><View style={{ flex: 1 }}><Text style={energyMatrixStyles.title}>{t("مصفوفة الطاقة", "Energy matrix")}</Text><Text style={energyMatrixStyles.subtitle}>{t("كيف أثّرت المهام الكبيرة على طاقتك هذا الأسبوع.", "How major tasks affected your energy this week.")}</Text></View></View>{energyRows.map((row) => <View key={row.key} style={energyMatrixStyles.row}><View style={energyMatrixStyles.labelRow}><View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><Icon name={row.icon} size={14} color={row.color} /><Text style={energyMatrixStyles.label}>{row.label}</Text></View><Text style={[energyMatrixStyles.value, { color: row.color }]}>{row.value}</Text></View><View style={energyMatrixStyles.track}><View style={[energyMatrixStyles.fill, { backgroundColor: row.color, width: `${energyTotal ? Math.max(4, Math.round((row.value / energyTotal) * 100)) : 4}%` }]} /></View></View>)}</View>
    <Text style={weeklyReportStyles.footnote}>{t("يُنشأ التقرير تلقائيًا كل ليلة جمعة الساعة 9:00 مساءً ويصل تنبيه عند جاهزيته.", "The report is generated every Friday at 9:00 PM, with a notification when it is ready.")}</Text>
  </ScrollView>;
}

export function DashboardView({ t, water, isSyncing, onSync, onWater, onOpenTasks, onOpenAdvisor, onToast }: { t: (ar: string, en: string) => string; water: number; isSyncing: boolean; onSync: () => void; onWater: () => void; onOpenTasks: () => void; onOpenAdvisor: () => void; onToast: (message: string) => void }) {
  return <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
    <View style={styles.greetingRow}>
      <View><Text style={styles.eyebrow}>{t("الثلاثاء، 18 أغسطس", "Tuesday, August 18")}</Text><Text style={styles.heroTitle}>{t("صباحك متوازن، محمد", "Your day is in balance")}</Text></View>
      <View style={styles.avatar}><Text style={styles.avatarText}>م</Text></View>
    </View>

    <View style={[styles.engineCard, { borderColor: palette.emerald + "88" }]}>
      <View style={styles.engineTop}>
        <View style={styles.engineIdentity}><View style={[styles.engineBolt, { backgroundColor: palette.emerald + "24" }]}><Icon name="bolt" size={21} color={palette.emerald} /></View><View><Text style={styles.cardHeading}>{t("محرك الطاقة والحيوية", "Health & Energy Engine")}</Text><Text style={[styles.cardCaption, { color: palette.emerald }]}>{t("ذروة الإنتاجية الذهنية", "Peak focus zone")}</Text></View></View>
        <ActionButton label={isSyncing ? t("مزامنة…", "Syncing…") : t("مزامنة", "Sync")} icon="sync" tone="emerald" compact onPress={onSync} />
      </View>
      <View style={styles.engineStats}>
        <TinyStat label={t("طاقة", "Energy")} value="88%" color={palette.cyan} />
        <TinyStat label={t("خطوات", "Steps")} value="8,450" color={palette.emerald} />
        <TinyStat label={t("نبض", "Rest HR")} value="62" color={palette.coral} />
        <TinyStat label={t("نوم", "Sleep")} value="7س 45د" color={palette.amber} />
      </View>
      <Text style={styles.engineHint}>{t("طاقتك ممتازة لإنجاز مهمة استراتيجية. ابدأ بجلسة تركيز قصيرة.", "Your energy is excellent for a strategic task. Start a focused sprint.")}</Text>
    </View>

    <View style={styles.vitalityCard}>
      <View style={{ flex: 1 }}><Tag label={t("سلسلة التزام: 14 يومًا", "14-day streak")} color={palette.emerald} /><Text style={[styles.cardHeading, { marginTop: 11 }]}>{t("مؤشر حيوية OmniLife", "OmniLife Vitality Index")}</Text><Text style={styles.cardCaption}>{t("أداؤك الصحي اليومي في أعلى مستوياته.", "Your daily health performance is optimal.")}</Text></View>
      <View style={styles.scoreRing}><Text style={styles.scoreNumber}>88%</Text><Text style={styles.scoreLabel}>{t("العام", "overall")}</Text></View>
    </View>

    <View style={styles.alertBanner}><View style={styles.alertIcon}><Icon name="bolt" size={18} color={palette.cyan} /></View><View style={{ flex: 1 }}><Text style={styles.alertTitle}>{t("نافذة تركيز عالية", "High focus window")}</Text><Text style={styles.alertCopy}>{t("رتّب مهمة واحدة عميقة قبل وصول تنبيهات الظهيرة.", "Schedule one deep task before midday interruptions.")}</Text></View><Icon name="chevron-left" size={20} color={palette.cyan} /></View>

    <View style={styles.sectionRow}><Text style={styles.sectionTitle}>{t("المؤشرات الحيوية", "Vital metrics")}</Text><Pressable onPress={() => onToast(t("يمكنك تحديث المؤشرات في المزامنة التالية.", "Your vitals will update on the next sync."))}><Text style={styles.linkText}>{t("تحديث", "Update")}</Text></Pressable></View>
    <View style={styles.metricGrid}>
      <MetricCard icon="directions-walk" value="8,450" label={t("خطوات من 10 آلاف", "Steps of 10k")} color={palette.emerald} progress={85} />
      <MetricCard icon="favorite" value="72 BPM" label={t("معدل النبض", "Heart rate")} color={palette.coral} progress={64} />
      <MetricCard icon="bedtime" value="7س 45د" label={t("جودة النوم", "Sleep quality")} color={palette.purple} progress={88} />
      <MetricCard icon="water-drop" value={`${water} مل`} label={t("هدف الترطيب", "Hydration goal")} color={palette.cyan} progress={Math.round(water / 30)} />
    </View>

    <Text style={styles.sectionTitle}>{t("المتابعة اليومية", "Daily rhythm")}</Text>
    <View style={styles.twoCol}>
      <View style={styles.lifestyleCard}><View style={styles.lifestyleTop}><Icon name="water-drop" color={palette.cyan} size={21} /><Text style={[styles.lifestyleValue, { color: palette.cyan }]}>{water} / 3000</Text></View><Text style={styles.lifestyleTitle}>{t("الترطيب والماء", "Hydration")}</Text><ProgressBar value={water / 30} color={palette.cyan} /><ActionButton label="+250 مل" icon="add" onPress={onWater} compact /></View>
      <View style={styles.lifestyleCard}><View style={styles.lifestyleTop}><Icon name="local-fire-department" color={palette.amber} size={21} /><Text style={[styles.lifestyleValue, { color: palette.amber }]}>420 kcal</Text></View><Text style={styles.lifestyleTitle}>{t("حرق السعرات", "Calories burned")}</Text><ProgressBar value={70} color={palette.amber} /><Text style={styles.cardCaption}>{t("المستهلك: 1,780 سعرة", "In: 1,780 kcal")}</Text></View>
    </View>

    <View style={styles.quickCard}><Text style={styles.cardHeading}>{t("إجراء سريع", "Quick action")}</Text><Text style={styles.cardCaption}>{t("اجعل الخطوة التالية أصغر من أن تقاومها.", "Make the next step too small to resist.")}</Text><View style={styles.quickActions}><ActionButton label={t("مهمة", "Task")} icon="task-alt" onPress={onOpenTasks} compact /><ActionButton label={t("تركيز", "Focus")} icon="self-improvement" onPress={onOpenTasks} compact /><ActionButton label={t("استشارة", "Ask AI")} icon="psychology" onPress={onOpenAdvisor} compact /></View></View>
  </ScrollView>;
}

function TinyStat({ label, value, color }: { label: string; value: string; color: string }) {
  return <View style={styles.tinyStat}><Text style={styles.tinyLabel}>{label}</Text><Text style={[styles.tinyValue, { color }]}>{value}</Text></View>;
}

function TasksView({ t, tasks, filter, setFilter, generatingTaskId, onToggle, onBreak, onApplyFallback, onToggleStep, onReschedule, onDelete, onAdd, onOpenTunnel, onStartFocus }: { t: (ar: string, en: string) => string; tasks: Task[]; filter: string; setFilter: (filter: string) => void; generatingTaskId: string | null; onToggle: (id: string) => void; onBreak: (id: string) => void; onApplyFallback: (id: string) => void; onToggleStep: (taskId: string, stepId: string) => void; onReschedule: (id: string) => void; onDelete: (id: string) => void; onAdd: () => void; onOpenTunnel: () => void; onStartFocus: (id: string) => void }) {
  const filtered = useMemo(() => filterLifeTasks(tasks, filter), [tasks, filter]);
  const pending = tasks.filter((task) => !task.done).length;
  const filters = [["all", t("الكل", "All")], ["pending", t("قيد التنفيذ", "Pending")], ["high", t("طاقة عالية", "High energy")], ["low", t("طاقة خفيفة", "Low energy")], ["done", t("المكتملة", "Done")]];
  return <FlatList data={filtered} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} ListHeaderComponent={<>
    <ScreenTitle title={t("المهام ومفكك التسويف", "Tasks & friction breaker")} subtitle={t(`${pending} مهام متبقية · ${tasks.length - pending} منجزة`, `${pending} pending · ${tasks.length - pending} complete`)} action={<Pressable onPress={onAdd} style={({ pressed }) => [styles.fab, pressed && styles.pressed]}><Icon name="add" size={23} color={palette.canvas} /></Pressable>} />
    <Pressable onPress={onOpenTunnel} style={({ pressed }) => [behaviorStyles.tunnelEntry, pressed && styles.pressed]}><View style={behaviorStyles.tunnelEntryIcon}><Icon name="center-focus-strong" size={20} color={palette.cyan} /></View><View style={{ flex: 1 }}><Text style={behaviorStyles.tunnelEntryTitle}>{t("وضع الرؤية النفقية", "Tunnel Vision mode")}</Text><Text style={behaviorStyles.tunnelEntryCopy}>{t("مهمة واحدة فقط، بلا قائمة ولا تشتيت.", "One task only, with no list and no distraction.")}</Text></View><Icon name="arrow-back" size={18} color={palette.cyan} /></Pressable>
    <View style={styles.schedulerCard}><View style={styles.schedulerHead}><Icon name="bolt" color={palette.emerald} size={20} /><Text style={styles.schedulerTitle}>{t("مجدول الطاقة الحيوية", "Energy-aware task balancer")}</Text><Switch value onValueChange={() => undefined} trackColor={{ false: palette.track, true: "#235E51" }} thumbColor={palette.emerald} /></View><Text style={styles.cardCaption}>{t("طاقة عالية: المهمة الاستراتيجية تظهر أولًا، والمهام الخفيفة تنتظر الوقت الأقل نشاطًا.", "High energy: strategic work rises first, light tasks wait for a lower-energy window.")}</Text></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>{filters.map(([key, label]) => <Pressable key={key} onPress={() => setFilter(key)} style={({ pressed }) => [styles.filterChip, filter === key && styles.filterChipActive, pressed && styles.pressed]}><Text style={[styles.filterText, filter === key && styles.filterTextActive]}>{label}</Text></Pressable>)}</ScrollView>
  </>} renderItem={({ item }) => <TaskCard task={item} t={t} isGenerating={generatingTaskId === item.id} onToggle={onToggle} onBreak={onBreak} onApplyFallback={onApplyFallback} onToggleStep={onToggleStep} onReschedule={onReschedule} onDelete={onDelete} onStartFocus={onStartFocus} />} ListEmptyComponent={<View style={styles.emptyState}><Icon name="task-alt" size={40} color={palette.muted} /><Text style={styles.emptyTitle}>{t("لا توجد مهام هنا", "No tasks here")}</Text><Text style={styles.cardCaption}>{t("جرّب فلترًا مختلفًا أو أضف مهمة جديدة.", "Try another filter or add a task.")}</Text></View>} />;
}

function TaskCard({ task, t, isGenerating, onToggle, onBreak, onApplyFallback, onToggleStep, onReschedule, onDelete, onStartFocus }: { task: Task; t: (ar: string, en: string) => string; isGenerating: boolean; onToggle: (id: string) => void; onBreak: (id: string) => void; onApplyFallback: (id: string) => void; onToggleStep: (taskId: string, stepId: string) => void; onReschedule: (id: string) => void; onDelete: (id: string) => void; onStartFocus: (id: string) => void }) {
  const energyColor = task.energy === "high" ? palette.coral : task.energy === "low" ? palette.cyan : palette.amber;
  const energyLabel = task.energy === "high" ? t("طاقة عالية", "High energy") : task.energy === "low" ? t("طاقة خفيفة", "Low energy") : t("طاقة متوسطة", "Medium energy");
  const scheduledLabel = task.scheduledAt ? new Date(task.scheduledAt).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" }) : null;
  const reminderLabel = task.reminderOffsets?.length ? task.reminderOffsets.map((offset) => TASK_REMINDER_OPTIONS.find((option) => option.id === offset)?.labelAr).filter(Boolean).join(" · ") : null;
  return <View style={[styles.taskCard, task.done && styles.taskDone]}><View style={styles.taskTop}><Pressable onPress={() => onToggle(task.id)} style={({ pressed }) => [styles.checkBox, task.done && styles.checkBoxDone, pressed && styles.pressed]}><Icon name={task.done ? "check" : ""} size={17} color={palette.canvas} /></Pressable><View style={styles.taskBody}><Text style={[styles.taskTitle, task.done && styles.strike]}>{task.title}</Text><Text style={styles.taskDetail}>{task.detail}</Text>{task.project ? <Text style={[styles.taskDetail, { color: palette.purple, fontWeight: "800" }]}>▣ {task.project}</Text> : null}{task.tags?.length ? <Text style={[styles.taskDetail, { color: palette.cyan }]}>{task.tags.map((tag) => `#${tag}`).join(" · ")}</Text> : null}{scheduledLabel ? <Text style={styles.taskDetail}>{t(`الموعد: ${scheduledLabel}`, `Scheduled: ${scheduledLabel}`)}</Text> : null}{reminderLabel ? <Text style={[styles.taskDetail, { color: palette.cyan }]}>{t(`تذكير: ${reminderLabel}`, `Reminders: ${reminderLabel}`)}</Text> : null}<Text style={[styles.taskDetail, { color: palette.coral, fontWeight: "900" }]}>🍅 {Math.min(task.completedPomodoros ?? 0, task.estimatedPomodoros ?? 1)}/{task.estimatedPomodoros ?? 1} {t("جلسات مكتملة", "sessions complete")}</Text></View><Tag label={energyLabel} color={energyColor} /></View>
    {task.ifThenPlan && !task.done ? <View style={behaviorStyles.fallbackCard}><Icon name="shield" size={15} color={palette.amber} /><Text style={behaviorStyles.fallbackCopy}>{t(`إذا ${task.ifThenPlan.ifCondition}، ${task.ifThenPlan.thenAction}`, `If ${task.ifThenPlan.ifCondition}, ${task.ifThenPlan.thenAction}`)}</Text></View> : null}
    {task.steps && !task.done ? <View style={styles.microCard}><View style={styles.microHead}><Icon name="bolt" size={16} color={palette.cyan} /><Text style={styles.microTitle}>{t("خطوات كسر التسويف", "Friction-breaker steps")}</Text></View>{isGenerating ? <View style={frictionLoadingStyles.container}><ActivityIndicator size="small" color={palette.cyan} /><Text style={frictionLoadingStyles.text}>{t("الذكاء الاصطناعي يخصص الخطوات لهذه المهمة…", "AI is tailoring these steps to this task…")}</Text></View> : null}{task.steps.map((step) => <Pressable key={step.id} onPress={() => onToggleStep(task.id, step.id)} style={({ pressed }) => [styles.microStep, pressed && styles.pressed]}><Icon name={step.done ? "check-circle" : "radio-button-unchecked"} size={17} color={step.done ? palette.emerald : palette.muted} /><Text style={[styles.microCopy, step.done && styles.strike]}>{step.title}</Text></Pressable>)}</View> : null}
    <View style={styles.taskActions}>{!task.done ? <ActionButton label={t("ابدأ بومودورو", "Start Pomodoro")} icon="timer" tone="cyan" onPress={() => onStartFocus(task.id)} compact /> : <View />}{!task.done && !task.steps ? <ActionButton label={t("فكّك التسويف", "Break friction")} icon="auto-awesome" onPress={() => onBreak(task.id)} compact /> : null}{task.ifThenPlan && !task.done ? <ActionButton label={t("نفّذ البديل", "Use fallback")} icon="shield" tone="emerald" onPress={() => onApplyFallback(task.id)} compact /> : null}{task.reschedules ? <Tag label={t(`مؤجلة ${task.reschedules}×`, `rescheduled ${task.reschedules}×`)} color={palette.amber} /> : null}<View style={styles.taskIcons}><Pressable onPress={() => onReschedule(task.id)} style={({ pressed }) => [styles.smallIcon, pressed && styles.pressed]}><Icon name="update" size={18} color={palette.amber} /></Pressable><Pressable onPress={() => onDelete(task.id)} style={({ pressed }) => [styles.smallIcon, pressed && styles.pressed]}><Icon name="delete-outline" size={18} color={palette.coral} /></Pressable></View></View>
  </View>;
}

function HabitsView({ t, section, setSection, habits, completionCounts, isPremium, wheel, setWheel, average, zenRunning, zenSeconds, onToggleZen, onResetZen, onComplete, onEmergency, onDelete, onAdd }: { t: (ar: string, en: string) => string; section: "streaks" | "wheel" | "zen"; setSection: (section: "streaks" | "wheel" | "zen") => void; habits: Habit[]; completionCounts: Record<string, number>; isPremium: boolean; wheel: Record<string, number>; setWheel: (value: Record<string, number>) => void; average: number; zenRunning: boolean; zenSeconds: number; onToggleZen: () => void; onResetZen: () => void; onComplete: (id: string) => void; onEmergency: (id: string) => void; onDelete: (id: string) => void; onAdd: () => void }) {
  const labels = { streaks: t("السلاسل", "Streaks"), wheel: t("عجلة الحياة", "Life wheel"), zen: t("وضع Zen", "Zen mode") };
  const time = `${String(Math.floor(zenSeconds / 60)).padStart(2, "0")}:${String(zenSeconds % 60).padStart(2, "0")}`;
  if (section === "wheel") return <FlatList data={Object.entries(wheel)} keyExtractor={([key]) => key} contentContainerStyle={styles.listContent} ListHeaderComponent={<><ScreenTitle title={t("عجلة الحياة المتوازنة", "Wheel of life")} subtitle={t("اضبط البوصلة عبر ستة أبعاد أساسية.", "Tune the compass across six essential dimensions.")} /><View style={styles.wheelHero}><View><Text style={styles.cardHeading}>{t("مؤشر التوازن الشامل", "Whole-life balance")}</Text><Text style={styles.cardCaption}>{t("التقييم المحلي لمعادلة أيامك.", "A local check-in for your days.")}</Text></View><View style={styles.wheelScore}><Text style={styles.scoreNumber}>{average}%</Text></View></View></>} renderItem={({ item: [key, value] }) => <View style={styles.wheelRow}><View style={styles.wheelLabelRow}><Text style={styles.taskTitle}>{key}</Text><Text style={[styles.wheelValue, { color: palette.cyan }]}>{value}/100</Text></View><View style={styles.wheelControl}><Pressable onPress={() => setWheel({ ...wheel, [key]: Math.max(0, value - 5) })} style={styles.wheelButton}><Icon name="remove" size={17} color={palette.muted} /></Pressable><View style={{ flex: 1 }}><ProgressBar value={value} color={palette.cyan} /></View><Pressable onPress={() => setWheel({ ...wheel, [key]: Math.min(100, value + 5) })} style={styles.wheelButton}><Icon name="add" size={17} color={palette.cyan} /></Pressable></View></View>} ListFooterComponent={<HabitSectionTabs labels={labels} section={section} setSection={setSection} />} />;
  if (section === "zen") return <ScrollView contentContainerStyle={styles.scrollContent}><HabitSectionTabs labels={labels} section={section} setSection={setSection} /><View style={styles.zenCard}><Tag label={t("مساحة بلا مقاطعات", "Distraction-free space")} color={palette.purple} /><Text style={[styles.screenTitle, { textAlign: "center", marginTop: 14 }]}>{t("جلسة تركيز عميق", "Deep focus session")}</Text><Text style={[styles.cardCaption, { textAlign: "center" }]}>{t("اختر مهمة واحدة واترك الباقي لوقت لاحق.", "Choose one task and release the rest for later.")}</Text><View style={[styles.zenRing, zenRunning && { borderColor: palette.cyan }]}><Text style={[styles.zenTime, zenRunning && { color: palette.cyan }]}>{time}</Text><Text style={styles.cardCaption}>{zenRunning ? t("جلسة نشطة", "Session active") : t("جاهز للانطلاق", "Ready when you are")}</Text></View><View style={styles.zenActions}><ActionButton label={zenRunning ? t("إيقاف مؤقت", "Pause") : t("بدء 25 دقيقة", "Start 25 min")} icon={zenRunning ? "pause" : "play-arrow"} onPress={onToggleZen} tone={zenRunning ? "coral" : "cyan"} /><Pressable onPress={onResetZen} style={({ pressed }) => [styles.zenReset, pressed && styles.pressed]}><Icon name="restart-alt" size={20} color={palette.muted} /></Pressable></View><Text style={styles.ambientText}>{t("الصوت المحيط: أمطار خفيفة", "Ambient: light rain")}</Text></View></ScrollView>;
  return <FlatList data={habits} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} ListHeaderComponent={<><ScreenTitle title={t("العادات وسلاسل الالتزام", "Habits & streaks")} subtitle={t("يوم الطوارئ يحمي سلسلتك عند الحاجة.", "Emergency Pass protects a streak when needed.")} action={<Pressable onPress={onAdd} style={({ pressed }) => [styles.fab, pressed && styles.pressed]}><Icon name="add" size={23} color={palette.canvas} /></Pressable>} /><HabitSectionTabs labels={labels} section={section} setSection={setSection} /></>} renderItem={({ item }) => { const target = habitDailyTarget(item.reminderTimes, isPremium); const completed = completionCounts[item.id] ?? 0; const recurrence = item.frequency === "daily" ? t("يومي", "Daily") : item.frequency === "weekly" ? t("أسبوعي", "Weekly") : item.frequency === "monthly" ? t("شهري", "Monthly") : t("سنوي", "Yearly"); return <View style={styles.habitCard}><View style={styles.habitHead}><View style={{ flex: 1 }}><Text style={styles.taskTitle}>{item.title}</Text><Text style={styles.taskDetail}>{item.detail}</Text><Text style={[styles.taskDetail, { color: palette.cyan }]}>{recurrence} · {completed}/{target} {t("اليوم", "today")}</Text></View><View style={styles.streakPill}><Icon name="local-fire-department" size={17} color={palette.amber} /><Text style={styles.streakText}>{item.streak} {t("يومًا", "days")}</Text></View></View><View style={styles.habitActions}><Pressable onPress={() => onEmergency(item.id)} style={({ pressed }) => [styles.passButton, item.emergency && styles.passButtonActive, pressed && styles.pressed]}><Icon name="shield" size={16} color={item.emergency ? palette.purple : palette.muted} /><Text style={[styles.passText, item.emergency && { color: palette.purple }]}>{item.emergency ? t("يوم طوارئ مُفعّل", "Pass active") : t("تفعيل يوم طوارئ", "Use emergency pass")}</Text></Pressable><ActionButton label={completed >= target ? t("اكتملت", "Complete") : t("تسجيل مرة", "Log once")} icon="check" tone="emerald" compact onPress={() => onComplete(item.id)} /><Pressable onPress={() => onDelete(item.id)} style={({ pressed }) => [styles.smallIcon, pressed && styles.pressed]}><Icon name="delete-outline" size={18} color={palette.coral} /></Pressable></View></View>; }} />;
}

function HabitSectionTabs({ labels, section, setSection }: { labels: Record<"streaks" | "wheel" | "zen", string>; section: "streaks" | "wheel" | "zen"; setSection: (section: "streaks" | "wheel" | "zen") => void }) {
  return <View style={styles.segmented}>{(["streaks", "wheel", "zen"] as const).map((key) => <Pressable key={key} onPress={() => setSection(key)} style={({ pressed }) => [styles.segment, section === key && styles.segmentActive, pressed && styles.pressed]}><Text style={[styles.segmentText, section === key && styles.segmentTextActive]}>{labels[key]}</Text></Pressable>)}</View>;
}

function BankSmsTrackerPanel({ t, enabled, dailyLimit, scanning, onToggle, onDailyLimitChange, onScan }: { t: (ar: string, en: string) => string; enabled: boolean; dailyLimit: number; scanning: boolean; onToggle: (value: boolean) => void; onDailyLimitChange: (value: number) => void; onScan: () => void }) {
  return <View style={financeStyles.smsCard}><View style={financeStyles.smsHead}><View style={financeStyles.smsIcon}><Icon name="sms" size={19} color={palette.cyan} /></View><View style={{ flex: 1 }}><Text style={styles.taskTitle}>{t("تتبع المصروفات التلقائي عبر الرسائل البنكية", "Automatic bank SMS expense tracker")}</Text><Text style={styles.taskDetail}>{t("تحليل محلي للرسائل البنكية فقط، دون إرسال أو حذف رسائل.", "Local parsing of bank messages only; no messages are sent or deleted.")}</Text></View><Switch value={enabled} onValueChange={onToggle} trackColor={{ false: palette.track, true: "#2B9FBA" }} thumbColor={enabled ? palette.cyan : palette.muted} /></View>{enabled ? <><View style={financeStyles.smsControls}><View style={{ flex: 1 }}><Text style={styles.cardCaption}>{t("حد الإنفاق اليومي", "Daily spending limit")}</Text><TextInput value={String(dailyLimit)} onChangeText={(value) => { const amount = parsePositiveEgpAmount(value); if (amount !== null) onDailyLimitChange(amount); }} keyboardType="number-pad" style={financeStyles.smsLimitInput} placeholder="1000" placeholderTextColor={palette.muted} textAlign="right" /></View><ActionButton label={scanning ? t("جارٍ الفحص…", "Scanning…") : t("فحص الآن", "Scan now")} icon={scanning ? "hourglass-top" : "sync"} tone="cyan" compact onPress={onScan} /></View><Text style={financeStyles.smsPrivacy}>{t("يتطلب نسخة Android مخصّصة وموافقة صريحة على إذن قراءة الرسائل.", "Requires a custom Android build and explicit SMS-read permission.")}</Text></> : <Text style={financeStyles.smsPrivacy}>{t("فعّل الميزة لطلب إذن Android وبدء فحص محلي للرسائل البنكية الحديثة.", "Turn this on to request Android permission and locally scan recent bank messages.")}</Text>}</View>;
}

function FinanceCashflow({ t, subs, onDelete, onAddExpense, onAddRecurring, onEditRecurring, onToggleRecurringReminder, smsTracker }: { t: (ar: string, en: string) => string; subs: Subscription[]; onDelete: (id: string) => void; onAddExpense: () => void; onAddRecurring: () => void; onEditRecurring: (id: string) => void; onToggleRecurringReminder: (id: string) => void; smsTracker?: { enabled: boolean; dailyLimit: number; scanning: boolean; onToggle: (value: boolean) => void; onDailyLimitChange: (value: number) => void; onScan: () => void } }) {
  const today = new Date();
  const money = (amount: number) => t(`${amount.toLocaleString("ar-EG")} ج.م`, `${amount.toLocaleString("en-US")} EGP`);
  const dailyExpenses = subs.filter((entry) => entry.kind === "daily_expense" && isRecordedOnDate(entry.recordedAt, today));
  const recurringEntries = subs.filter((entry) => entry.kind !== "daily_expense");
  const reminderText = (entry: Subscription) => {
    if (!entry.reminderFrequency || !entry.reminderAt) return t("بدون تذكير", "No reminder");
    const date = new Date(entry.reminderAt);
    const time = date.toLocaleTimeString(t("ar-EG", "en-GB"), { hour: "2-digit", minute: "2-digit" });
    if (entry.reminderFrequency === "daily") return t(`يوميًا · ${time}`, `Daily · ${time}`);
    if (entry.reminderFrequency === "monthly") return t(`شهريًا يوم ${date.getDate()} · ${time}`, `Monthly on day ${date.getDate()} · ${time}`);
    return t(`سنويًا ${date.getDate()}/${date.getMonth() + 1} · ${time}`, `Yearly ${date.getDate()}/${date.getMonth() + 1} · ${time}`);
  };
  const lifecycleText = (entry: Subscription) => {
    const labels = [];
    if (entry.earlyReminderMinutes) labels.push(t(`تنبيه مبكر ${entry.earlyReminderMinutes} د`, `Early ${entry.earlyReminderMinutes}m`));
    if (entry.endsAt) labels.push(t(`ينتهي ${new Date(entry.endsAt).toLocaleDateString("ar-EG")}`, `Ends ${new Date(entry.endsAt).toLocaleDateString("en-CA")}`));
    if (entry.reminderEnabled === false) labels.push(t("التذكير متوقف", "Reminder paused"));
    return labels.join(" · ");
  };
  const todayTotal = dailyExpenses.filter((entry) => entry.transactionDirection !== "income").reduce((total, entry) => total + entry.amount, 0);
  const data: ({ type: "expense"; entry: Subscription } | { type: "recurring"; entry: Subscription })[] = [
    ...dailyExpenses.map((entry) => ({ type: "expense" as const, entry })),
    ...recurringEntries.map((entry) => ({ type: "recurring" as const, entry })),
  ];
  const activeRecurringEntries = recurringEntries.filter((entry) => !entry.endsAt || new Date(entry.endsAt).getTime() >= today.getTime());
  const monthlyUpcomingTotal = activeRecurringEntries.reduce((total, entry) => total + entry.amount, 0);

  return <FlatList data={data} keyExtractor={(item) => `${item.type}-${item.entry.id}`} contentContainerStyle={styles.listContent} ListHeaderComponent={<><ScreenTitle title={t("المال", "Finance")} subtitle={t("سجّل مصروفاتك اليومية أولًا، ثم تابع التزاماتك الدورية.", "Record daily expenses first, then track recurring commitments.")} />{smsTracker ? <BankSmsTrackerPanel t={t} enabled={smsTracker.enabled} dailyLimit={smsTracker.dailyLimit} scanning={smsTracker.scanning} onToggle={smsTracker.onToggle} onDailyLimitChange={smsTracker.onDailyLimitChange} onScan={smsTracker.onScan} /> : null}<View style={financeStyles.todayCard}><View style={financeStyles.todayHead}><View style={financeStyles.todayIcon}><Icon name="receipt-long" size={20} color={palette.coral} /></View><View style={{ flex: 1 }}><Text style={styles.cardCaption}>{t("إجمالي مصروفات اليوم", "Today’s expenses")}</Text><Text style={financeStyles.todayTotal}>{money(todayTotal)}</Text></View></View><ActionButton label={t("إضافة مصروف يومي", "Add daily expense")} icon="add" tone="coral" onPress={onAddExpense} /></View><View style={financeStyles.monthlyCard}><View><Text style={styles.cardCaption}>{t("الالتزامات النشطة هذا الشهر", "Active commitments this month")}</Text><Text style={financeStyles.monthlyTotal}>{money(monthlyUpcomingTotal)}</Text></View><View style={financeStyles.monthlyCount}><Text style={financeStyles.monthlyCountText}>{t(`${activeRecurringEntries.length} التزامات`, `${activeRecurringEntries.length} active`)}</Text></View></View><View style={financeStyles.sectionHead}><Icon name="receipt" size={18} color={palette.coral} /><Text style={styles.sectionTitle}>{t("معاملات اليوم", "Today’s transactions")}</Text><View style={{ flex: 1 }} /><Text style={financeStyles.countLabel}>{t(`${dailyExpenses.length} عملية`, `${dailyExpenses.length} entries`)}</Text></View></>} ListEmptyComponent={<Empty text={t("لا توجد مصروفات يومية أو التزامات مسجّلة بعد.", "No daily expenses or recurring commitments recorded yet.")} />} ListFooterComponent={<View style={financeStyles.recurringFooter}><View style={financeStyles.sectionHead}><Icon name="autorenew" size={18} color={palette.amber} /><Text style={styles.sectionTitle}>{t("الالتزامات الدورية", "Recurring commitments")}</Text></View><Text style={styles.cardCaption}>{t("أضف الأقساط والجمعيات والاشتراكات بشكل مستقل عن مصروفاتك اليومية.", "Keep installments, savings circles, and subscriptions separate from daily expenses.")}</Text><ActionButton label={t("إضافة التزام دوري", "Add recurring entry")} icon="add-card" tone="ghost" compact onPress={onAddRecurring} /></View>} renderItem={({ item }) => item.type === "expense" ? <View style={financeStyles.expenseRow}><View style={financeStyles.expenseIcon}><Icon name={item.entry.transactionDirection === "income" ? "south-west" : "shopping-bag"} size={17} color={item.entry.transactionDirection === "income" ? palette.emerald : palette.coral} /></View><View style={{ flex: 1 }}><Text style={styles.taskTitle}>{item.entry.title}</Text><Text style={styles.taskDetail}>{item.entry.source === "sms" ? t(item.entry.transactionDirection === "income" ? "دخل تلقائي عبر SMS" : "مصروف تلقائي عبر SMS", item.entry.transactionDirection === "income" ? "Automatic SMS income" : "Automatic SMS expense") : t("مصروف يومي", "Daily expense")}</Text></View><Text style={[styles.subAmount, { color: item.entry.transactionDirection === "income" ? palette.emerald : palette.coral }]}>{money(item.entry.amount)}</Text><Pressable onPress={() => onDelete(item.entry.id)} style={({ pressed }) => [styles.smallIcon, pressed && styles.pressed]}><Icon name="delete-outline" size={17} color={palette.coral} /></Pressable></View> : <View style={financeStyles.recurringRow}><View style={{ flex: 1 }}><Text style={styles.taskTitle}>{item.entry.title}</Text><Text style={styles.taskDetail}>{item.entry.category} · {reminderText(item.entry)}</Text>{lifecycleText(item.entry) ? <Text style={[styles.taskDetail, { color: item.entry.reminderEnabled === false ? palette.amber : palette.cyan }]}>{lifecycleText(item.entry)}</Text> : null}</View><View style={financeStyles.recurringActions}><Text style={[styles.subAmount, { color: palette.amber }]}>{money(item.entry.amount)}</Text><View style={financeStyles.recurringActionRow}>{item.entry.endsAt && new Date(item.entry.endsAt).getTime() < today.getTime() ? <Pressable onPress={() => onEditRecurring(item.entry.id)} style={({ pressed }) => [styles.smallIcon, pressed && styles.pressed]}><Icon name="restart-alt" size={16} color={palette.amber} /></Pressable> : null}<Pressable onPress={() => onEditRecurring(item.entry.id)} style={({ pressed }) => [styles.smallIcon, pressed && styles.pressed]}><Icon name="edit" size={16} color={palette.cyan} /></Pressable><Pressable onPress={() => onToggleRecurringReminder(item.entry.id)} style={({ pressed }) => [styles.smallIcon, pressed && styles.pressed]}><Icon name={item.entry.reminderEnabled === false ? "notifications-off" : "notifications-active"} size={16} color={item.entry.reminderEnabled === false ? palette.amber : palette.emerald} /></Pressable><Pressable onPress={() => onDelete(item.entry.id)} style={({ pressed }) => [styles.smallIcon, pressed && styles.pressed]}><Icon name="delete-outline" size={16} color={palette.coral} /></Pressable></View></View></View>} />;
}

function MonthlyCategoryReport({ t, report, money }: { t: (ar: string, en: string) => string; report: ReturnType<typeof buildMonthlyCategoryReport>; money: (amount: number) => string }) {
  return <View style={financeStyles.reportCard}><View style={financeStyles.reportHead}><View style={{ flex: 1 }}><Text style={styles.cardHeading}>{t("تقرير مصروفات الشهر", "Monthly spending by category")}</Text><Text style={styles.cardCaption}>{t("المصروفات المسجلة في الشهر الحالي فقط.", "Only expenses recorded in the current month.")}</Text></View><Icon name="pie-chart-outline" size={22} color={palette.purple} /></View>{report.length ? report.map((item) => <View key={item.category} style={financeStyles.reportRow}><View style={{ flex: 1 }}><View style={financeStyles.reportLabelRow}><Text style={financeStyles.reportLabel}>{item.category}</Text><Text style={financeStyles.reportShare}>{item.share}%</Text></View><ProgressBar value={item.share} color={palette.purple} /></View><Text style={financeStyles.reportAmount}>{money(item.amount)}</Text></View>) : <Text style={styles.taskDetail}>{t("لا توجد مصروفات مسجلة لهذا الشهر بعد.", "No recorded expenses for this month yet.")}</Text>}</View>;
}

function FinanceBudgetPanel({ t, report, budgets, money, onChange }: { t: (ar: string, en: string) => string; report: ReturnType<typeof buildMonthlyCategoryReport>; budgets: Record<string, number>; money: (amount: number) => string; onChange: (category: string, amount: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const defaultCategories = [t("طعام ومشروبات", "Food & drinks"), t("مواصلات", "Transport"), t("فواتير وخدمات", "Bills & utilities"), t("تسوق", "Shopping"), t("صحة", "Health"), t("تعليم", "Education"), t("ترفيه", "Entertainment"), t("سحب نقدي", "Cash withdrawal"), t("تحويلات", "Transfers"), t("أخرى", "Other")];
  const categories = [...new Set([...defaultCategories, ...report.map((item) => item.category), ...Object.keys(budgets)])];
  const statusByCategory = new Map(buildCategoryBudgetStatuses(report, budgets).map((status) => [status.category, status]));
  return <View style={financeStyles.budgetPanel}><Pressable onPress={() => setExpanded((value) => !value)} accessibilityRole="button" accessibilityState={{ expanded }} style={({ pressed }) => [financeStyles.budgetHead, pressed && styles.pressed]}><View style={{ flex: 1 }}><Text style={styles.cardHeading}>{t("ميزانيات التصنيفات", "Category budgets")}</Text><Text style={styles.cardCaption}>{expanded ? t("اضغط مرة أخرى لإخفاء قائمة الميزانيات.", "Tap again to hide category budgets.") : t("اضغط لعرض ميزانية كل تصنيف وتعديلها.", "Tap to view and edit each category budget.")}</Text></View><View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Icon name="account-balance-wallet" size={22} color={palette.cyan} /><Icon name={expanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={20} color={palette.muted} /></View></Pressable>{expanded ? <View style={financeStyles.budgetGrid}>{categories.map((category) => { const status = statusByCategory.get(category); const exceeded = Boolean(status?.exceeded); return <View key={category} style={[financeStyles.budgetItem, exceeded && financeStyles.budgetItemExceeded]}><Text style={financeStyles.budgetCategory}>{category}</Text><TextInput value={budgets[category] ? String(budgets[category]) : ""} onChangeText={(value) => { const parsed = parsePositiveEgpAmount(value); onChange(category, value.trim() ? parsed ?? 0 : 0); }} placeholder={t("حد ج.م", "EGP limit")} placeholderTextColor={palette.muted} keyboardType="decimal-pad" style={financeStyles.budgetInput} textAlign="right" />{status?.budget ? <Text style={[financeStyles.budgetStatus, exceeded && { color: palette.coral }]}>{exceeded ? t(`تجاوزت بـ ${money(Math.abs(status.remaining))}`, `Over by ${money(Math.abs(status.remaining))}`) : t(`المتبقي ${money(status.remaining)}`, `${money(status.remaining)} left`)}</Text> : <Text style={financeStyles.budgetStatus}>{t("بدون حد", "No limit")}</Text>}</View>; })}</View> : null}</View>;
}

function FinanceCashflowV2({ t, subs, onDelete, onAddExpense, onAddRecurring, onEditRecurring, onToggleRecurringReminder, onEditCategory, budgets, onBudgetChange, smsTracker }: { t: (ar: string, en: string) => string; subs: Subscription[]; onDelete: (id: string) => void; onAddExpense: () => void; onAddRecurring: () => void; onEditRecurring: (id: string) => void; onToggleRecurringReminder: (id: string) => void; onEditCategory: (id: string) => void; budgets: Record<string, number>; onBudgetChange: (category: string, amount: number) => void; smsTracker?: { enabled: boolean; dailyLimit: number; scanning: boolean; onToggle: (value: boolean) => void; onDailyLimitChange: (value: number) => void; onScan: () => void } }) {
  const today = new Date();
  const money = (amount: number) => t(`${amount.toLocaleString("ar-EG")} ج.م`, `${amount.toLocaleString("en-US")} EGP`);
  const dailyExpenses = subs.filter((entry) => entry.kind === "daily_expense").sort((left, right) => Date.parse(right.recordedAt ?? "") - Date.parse(left.recordedAt ?? ""));
  const recurringEntries = subs.filter((entry) => entry.kind !== "daily_expense");
  const monthlyReport = buildMonthlyCategoryReport(subs.filter((entry) => entry.kind === "daily_expense"), today);
  const todayTotal = dailyExpenses.filter((entry) => isRecordedOnDate(entry.recordedAt, today) && entry.transactionDirection !== "income").reduce((total, entry) => total + entry.amount, 0);
  const activeRecurringEntries = recurringEntries.filter((entry) => !entry.endsAt || new Date(entry.endsAt).getTime() >= today.getTime());
  const monthlyUpcomingTotal = activeRecurringEntries.reduce((total, entry) => total + entry.amount, 0);
  const data: ({ type: "expense"; entry: Subscription } | { type: "recurring"; entry: Subscription })[] = [...dailyExpenses.map((entry) => ({ type: "expense" as const, entry })), ...recurringEntries.map((entry) => ({ type: "recurring" as const, entry }))];
  return <FlatList data={data} keyExtractor={(item) => `${item.type}-${item.entry.id}`} contentContainerStyle={styles.listContent}
    ListHeaderComponent={<><ScreenTitle title={t("المال", "Finance")} subtitle={t("سجّل مصروفاتك اليومية ثم صحّح تصنيفها وراجع ملخص الشهر.", "Record daily expenses, correct their categories, and review the month.")} />{smsTracker ? <BankSmsTrackerPanel t={t} enabled={smsTracker.enabled} dailyLimit={smsTracker.dailyLimit} scanning={smsTracker.scanning} onToggle={smsTracker.onToggle} onDailyLimitChange={smsTracker.onDailyLimitChange} onScan={smsTracker.onScan} /> : null}<View style={financeStyles.todayCard}><View style={financeStyles.todayHead}><View style={financeStyles.todayIcon}><Icon name="receipt-long" size={20} color={palette.coral} /></View><View style={{ flex: 1 }}><Text style={styles.cardCaption}>{t("إجمالي مصروفات اليوم", "Today’s expenses")}</Text><Text style={financeStyles.todayTotal}>{money(todayTotal)}</Text></View></View><ActionButton label={t("إضافة مصروف يومي", "Add daily expense")} icon="add" tone="coral" onPress={onAddExpense} /></View><MonthlyCategoryReport t={t} report={monthlyReport} money={money} /><FinanceBudgetPanel t={t} report={monthlyReport} budgets={budgets} money={money} onChange={onBudgetChange} /><View style={financeStyles.monthlyCard}><View><Text style={styles.cardCaption}>{t("الالتزامات النشطة هذا الشهر", "Active commitments this month")}</Text><Text style={financeStyles.monthlyTotal}>{money(monthlyUpcomingTotal)}</Text></View><View style={financeStyles.monthlyCount}><Text style={financeStyles.monthlyCountText}>{t(`${activeRecurringEntries.length} التزامات`, `${activeRecurringEntries.length} active`)}</Text></View></View><View style={financeStyles.sectionHead}><Icon name="receipt" size={18} color={palette.coral} /><Text style={styles.sectionTitle}>{t("معاملات اليوم", "Today’s transactions")}</Text><View style={{ flex: 1 }} /><Text style={financeStyles.countLabel}>{t(`${dailyExpenses.length} عملية`, `${dailyExpenses.length} entries`)}</Text></View></>}
    ListEmptyComponent={<Empty text={t("لا توجد مصروفات يومية أو التزامات مسجّلة بعد.", "No daily expenses or recurring commitments recorded yet.")} />}
    ListFooterComponent={<View style={financeStyles.recurringFooter}><View style={financeStyles.sectionHead}><Icon name="autorenew" size={18} color={palette.amber} /><Text style={styles.sectionTitle}>{t("الالتزامات الدورية", "Recurring commitments")}</Text></View><Text style={styles.cardCaption}>{t("أضف الأقساط والجمعيات والاشتراكات بشكل مستقل عن مصروفاتك اليومية.", "Keep installments, savings circles, and subscriptions separate from daily expenses.")}</Text><ActionButton label={t("إضافة التزام دوري", "Add recurring entry")} icon="add-card" tone="ghost" compact onPress={onAddRecurring} /></View>}
    renderItem={({ item }) => {
      if (item.type === "expense") {
        const isIncome = item.entry.transactionDirection === "income";
        const sourceLabel = item.entry.source === "sms"
          ? t(isIncome ? "إيراد تلقائي عبر SMS" : "مصروف تلقائي عبر SMS", isIncome ? "Automatic SMS income" : "Automatic SMS expense")
          : t(isIncome ? "إيراد مسجل" : "مصروف يومي", isIncome ? "Recorded income" : "Daily expense");
        const recordedLabel = item.entry.recordedAt ? new Date(item.entry.recordedAt).toLocaleDateString(t("ar-EG", "en-CA")) : null;
        return <View style={financeStyles.expenseRow}><View style={financeStyles.expenseIcon}><Icon name={isIncome ? "south-west" : "shopping-bag"} size={17} color={isIncome ? palette.emerald : palette.coral} /></View><View style={{ flex: 1 }}><Text style={styles.taskTitle}>{item.entry.title}</Text><Text style={styles.taskDetail}>{item.entry.category || t("أخرى", "Other")}</Text><Text style={[styles.taskDetail, { color: isIncome ? palette.emerald : item.entry.source === "sms" ? palette.cyan : palette.muted }]}>{sourceLabel}{recordedLabel ? ` · ${recordedLabel}` : ""}</Text></View><View style={financeStyles.expenseActions}><Text style={[styles.subAmount, { color: isIncome ? palette.emerald : palette.coral }]}>{isIncome ? "+" : "−"}{money(item.entry.amount)}</Text><View style={financeStyles.recurringActionRow}><Pressable onPress={() => onEditCategory(item.entry.id)} style={({ pressed }) => [styles.smallIcon, pressed && styles.pressed]}><Icon name="edit" size={16} color={palette.cyan} /></Pressable><Pressable onPress={() => onDelete(item.entry.id)} style={({ pressed }) => [styles.smallIcon, pressed && styles.pressed]}><Icon name="delete-outline" size={16} color={palette.coral} /></Pressable></View></View></View>;
      }
      return <View style={financeStyles.recurringRow}><View style={{ flex: 1 }}><Text style={styles.taskTitle}>{item.entry.title}</Text><Text style={styles.taskDetail}>{item.entry.category}</Text></View><View style={financeStyles.recurringActions}><Text style={[styles.subAmount, { color: palette.amber }]}>{money(item.entry.amount)}</Text><View style={financeStyles.recurringActionRow}><Pressable onPress={() => onEditRecurring(item.entry.id)} style={({ pressed }) => [styles.smallIcon, pressed && styles.pressed]}><Icon name="edit" size={16} color={palette.cyan} /></Pressable><Pressable onPress={() => onToggleRecurringReminder(item.entry.id)} style={({ pressed }) => [styles.smallIcon, pressed && styles.pressed]}><Icon name={item.entry.reminderEnabled === false ? "notifications-off" : "notifications-active"} size={16} color={item.entry.reminderEnabled === false ? palette.amber : palette.emerald} /></Pressable><Pressable onPress={() => onDelete(item.entry.id)} style={({ pressed }) => [styles.smallIcon, pressed && styles.pressed]}><Icon name="delete-outline" size={16} color={palette.coral} /></Pressable></View></View></View>;
    }}
  />;
}

function FinanceView({ t, tab, setTab, subs, ideas, contacts, selectedContactId = null, onSelectContact, onDeleteContact, onOpenContactReminder, onToggleContactReminder, onOpenIdeas, onOpenRelationships, onImportContact, importingContact, onToggleWaste, onDelete, onAddRecurring, onEditRecurring, onToggleRecurringReminder, onConvert, onArchive, onAdd, smsTracker }: { t: (ar: string, en: string) => string; tab: "cashflow" | "ideas" | "contacts"; setTab: (tab: "cashflow" | "ideas" | "contacts") => void; subs: Subscription[]; ideas: Idea[]; contacts: Contact[]; selectedContactId?: string | null; onSelectContact?: (id: string) => void; onDeleteContact?: (id: string) => void; onOpenContactReminder?: (id: string) => void; onToggleContactReminder?: (id: string, enabled: boolean) => void; onOpenIdeas: () => void; onOpenRelationships: () => void; onImportContact: () => void; importingContact: boolean; onToggleWaste: (id: string) => void; onDelete: (id: string) => void; onAddRecurring: () => void; onEditRecurring?: (id: string) => void; onToggleRecurringReminder?: (id: string) => void; onConvert: (idea: Idea) => void; onArchive: (id: string) => void; onAdd: () => void; smsTracker?: { enabled: boolean; dailyLimit: number; scanning: boolean; onToggle: (value: boolean) => void; onDailyLimitChange: (value: number) => void; onScan: () => void } }) {
  if (tab === "cashflow") return <FinanceCashflow t={t} subs={subs} onDelete={onDelete} onAddExpense={onAdd} onAddRecurring={onAddRecurring} onEditRecurring={onEditRecurring ?? (() => undefined)} onToggleRecurringReminder={onToggleRecurringReminder ?? (() => undefined)} smsTracker={smsTracker} />;
  const income = 2250; const expenses = subs.reduce((sum, sub) => sum + sub.amount, 0) + 840; const cashflow = income - expenses;
  const money = (amount: number) => t(`${amount.toLocaleString("ar-EG")} ج.م`, `${amount.toLocaleString("en-US")} EGP`);
  const remainingTab = tab as "cashflow" | "ideas" | "contacts";
  const title = remainingTab === "cashflow" ? t("المال", "Finance") : remainingTab === "ideas" ? t("الأفكار", "Ideas") : t("العلاقات", "Relationships");
  const subtitle = remainingTab === "cashflow" ? t("التدفق والالتزامات الدورية بالجنيه المصري.", "Cashflow and recurring obligations in EGP.") : remainingTab === "ideas" ? t("مساحة مستقلة للأفكار وتحويلها إلى مهام.", "A dedicated space for ideas and execution.") : t("جهات الاتصال والعلاقات المهمة في مكان مستقل.", "Important contacts and relationships in a dedicated place.");
  const header = <ScreenTitle title={title} subtitle={subtitle} action={<Pressable onPress={remainingTab === "cashflow" ? onAddRecurring : onAdd} style={({ pressed }) => [styles.fab, pressed && styles.pressed]}><Icon name="add" size={23} color={palette.canvas} /></Pressable>} />;
  if (tab === "ideas") return <FlatList data={ideas.filter((item) => !item.archived)} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} ListHeaderComponent={header} renderItem={({ item }) => <View style={[styles.ideaCard, item.old && { borderColor: palette.amber + "88" }]}><View style={styles.ideaHead}><Text style={styles.taskTitle}>{item.title}</Text>{item.old ? <Tag label={t("رادار 90+ يوم", "90+ day radar")} color={palette.amber} /> : null}</View><Text style={styles.taskDetail}>{item.detail}</Text><View style={styles.ideaActions}><ActionButton label={t("تحويل لمهمة", "Execute")} icon="play-arrow" compact onPress={() => onConvert(item)} /><Pressable onPress={() => onArchive(item.id)} style={({ pressed }) => [styles.smallIcon, pressed && styles.pressed]}><Icon name="archive" size={18} color={palette.muted} /></Pressable></View></View>} ListEmptyComponent={<Empty text={t("كل الأفكار مرتبة الآن.", "Your idea bank is clear.")} />} />;
  if (tab === "contacts") return (
    <FlatList
      data={contacts}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={<>
        {header}
        <View style={[styles.contactCard, { backgroundColor: "rgba(56,216,255,0.08)", borderColor: "rgba(56,216,255,0.32)" }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.taskTitle}>{t("اختيار من جهات اتصال الهاتف", "Pick from phone contacts")}</Text>
            <Text style={styles.taskDetail}>{t("اختر شخصًا واحدًا فقط؛ لا ننسخ دفتر الهاتف كاملًا.", "Pick one person only; OMNI LIFE never copies your whole address book.")}</Text>
          </View>
          <ActionButton label={importingContact ? t("جارٍ الفتح…", "Opening…") : t("اختيار", "Pick")} icon="contacts" tone="cyan" compact onPress={onImportContact} />
        </View>
      </>}
      renderItem={({ item }) => {
        const selected = selectedContactId === item.id;
        return (
          <View style={[styles.contactCard, selected && { borderColor: palette.cyan, backgroundColor: "rgba(56,216,255,0.08)" }]}>
            <View style={[styles.contactAvatar, selected && { backgroundColor: "rgba(56,216,255,0.26)" }]}><Text style={styles.contactInitial}>{item.name.slice(0, 1)}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.taskTitle}>{item.name}</Text>
              <Text style={[styles.cardCaption, { color: palette.cyan }]}>{item.phone} · {item.relation}</Text>
              <Text style={styles.taskDetail}>{item.note}</Text>
              {selected ? <View style={relationshipReminderStyles.summary}><View style={relationshipReminderStyles.copy}><Icon name={item.reminder?.enabled ? "notifications-active" : "notifications-none"} size={15} color={item.reminder?.enabled ? palette.emerald : palette.muted} /><View style={{ flex: 1 }}><Text style={relationshipReminderStyles.title}>{item.reminder ? (item.reminder.enabled ? t("تذكير التواصل مفعّل", "Connection reminder active") : t("تذكير التواصل متوقف", "Connection reminder paused")) : t("لا يوجد تذكير للتواصل", "No connection reminder")}</Text><Text style={relationshipReminderStyles.detail}>{item.reminder ? `${item.reminder.purpose} · ${item.reminder.cadence === "daily" ? t("يوميًا", "Daily") : item.reminder.cadence === "weekly" ? t("أسبوعيًا", "Weekly") : t("شهريًا", "Monthly")}` : t("أضف سبب التواصل وموعدًا مناسبًا.", "Add a purpose and a suitable time.")}</Text></View></View><View style={relationshipReminderStyles.actions}><Pressable onPress={() => onOpenContactReminder?.(item.id)} style={({ pressed }) => [relationshipReminderStyles.button, pressed && styles.pressed]}><Icon name={item.reminder ? "edit-notifications" : "add-alert"} size={16} color={palette.cyan} /><Text style={relationshipReminderStyles.buttonText}>{item.reminder ? t("تعديل", "Edit") : t("ضبط", "Set")}</Text></Pressable>{item.reminder ? <Pressable onPress={() => onToggleContactReminder?.(item.id, !item.reminder?.enabled)} style={({ pressed }) => [relationshipReminderStyles.button, pressed && styles.pressed]}><Icon name={item.reminder.enabled ? "pause-circle-outline" : "play-circle-outline"} size={16} color={item.reminder.enabled ? palette.amber : palette.emerald} /><Text style={[relationshipReminderStyles.buttonText, { color: item.reminder.enabled ? palette.amber : palette.emerald }]}>{item.reminder.enabled ? t("إيقاف", "Pause") : t("تشغيل", "Resume")}</Text></Pressable> : null}</View></View> : null}
            </View>
            <View style={{ alignItems: "flex-end", gap: 6 }}>
              <ActionButton label={selected ? t("مُختار", "Selected") : t("اختيار", "Select")} icon={selected ? "check" : "person"} tone={selected ? "emerald" : "ghost"} compact onPress={() => onSelectContact?.(item.id)} />
              <Pressable accessibilityLabel={t("حذف جهة الاتصال", "Delete contact")} onPress={() => onDeleteContact?.(item.id)} style={({ pressed }) => [styles.smallIcon, pressed && styles.pressed]}><Icon name="delete-outline" size={18} color={palette.coral} /></Pressable>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={<Empty text={t("أضف أو اختر جهة اتصال لتظهر هنا.", "Add or pick a contact to see it here.")} />}
    />
  );
  return <FlatList data={subs} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} ListHeaderComponent={<>{header}<View style={styles.cashflowCard}><Text style={styles.cardCaption}>{t("صافي التدفق الشهري", "Net monthly cashflow")}</Text><Text style={[styles.cashflowNumber, { color: cashflow >= 0 ? palette.emerald : palette.coral }]}>{money(cashflow)}</Text><View style={styles.cashflowSplit}><TinyStat label={t("الدخل", "Income")} value={money(income)} color={palette.emerald} /><TinyStat label={t("المصروفات", "Expenses")} value={money(expenses)} color={palette.coral} /></View></View><View style={styles.radarHeading}><Icon name="radar" size={19} color={palette.amber} /><Text style={styles.sectionTitle}>{t("الالتزامات الدورية", "Recurring finances")}</Text></View></>} renderItem={({ item }) => <View style={[styles.subscriptionCard, item.wasteful && { borderColor: palette.coral + "88" }]}><View style={{ flex: 1 }}><Text style={styles.taskTitle}>{item.title}</Text><Text style={styles.taskDetail}>{item.category} · {t("شهري", "monthly")}</Text></View><View style={{ alignItems: "flex-end", gap: 7 }}><Text style={[styles.subAmount, { color: palette.amber }]}>{money(item.amount)}</Text><View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Pressable onPress={() => onToggleWaste(item.id)} style={({ pressed }) => [styles.wasteChip, item.wasteful && styles.wasteChipActive, pressed && styles.pressed]}><Text style={[styles.wasteText, item.wasteful && { color: palette.coral }]}>{item.wasteful ? t("مهدر", "Wasteful") : t("مفيد", "Useful")}</Text></Pressable><Pressable onPress={() => onDelete(item.id)} style={({ pressed }) => [styles.smallIcon, pressed && styles.pressed]}><Icon name="delete-outline" size={17} color={palette.coral} /></Pressable></View></View></View>} />;
}

const relationshipReminderStyles = StyleSheet.create({
  summary: { marginTop: 9, gap: 7, padding: 9, borderRadius: 10, backgroundColor: "rgba(56,216,255,0.07)", borderWidth: 1, borderColor: "rgba(56,216,255,0.18)" },
  copy: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  title: { color: palette.ink, fontSize: 9, fontWeight: "900", textAlign: "right" },
  detail: { color: palette.muted, fontSize: 8, lineHeight: 12, marginTop: 2, textAlign: "right" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 6 },
  button: { minHeight: 29, paddingHorizontal: 7, borderRadius: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, backgroundColor: "rgba(7,17,31,0.56)", borderWidth: 1, borderColor: "rgba(56,216,255,0.20)" },
  buttonText: { color: palette.cyan, fontSize: 8, fontWeight: "900" },
});

function AdvisorView({ t, messages, input, setInput, onSend, onPrompt, isLoading }: { t: (ar: string, en: string) => string; messages: ChatMessage[]; input: string; setInput: (value: string) => void; onSend: () => void; onPrompt: (text: string) => void; isLoading: boolean }) {
  const prompts = [t("ساعدني على كسر التسويف", "Help me break procrastination"), t("كيف أرتب طاقتي اليوم؟", "How should I manage my energy?"), t("راجع رادار المال", "Review my money radar")];
  return <View style={{ flex: 1 }}><FlatList data={messages} keyExtractor={(item) => item.id} contentContainerStyle={styles.chatContent} showsVerticalScrollIndicator={false} ListHeaderComponent={<><ScreenTitle title={t("المستشار الذكي", "AI advisor")} subtitle={t("نصيحة عملية قصيرة لخطوتك التالية.", "A short, practical next-step insight.")} /><View style={styles.advisorHero}><View style={styles.advisorOrb}><Icon name="psychology" size={27} color={palette.cyan} /></View><View style={{ flex: 1 }}><Text style={styles.cardHeading}>{t("مرحبًا، أنا Omni Advisor", "Welcome, I’m Omni Advisor")}</Text><Text style={styles.cardCaption}>{t("أقرأ سياقك الحالي وأساعدك على اختيار أقل خطوة مقاومة.", "I read your context and help you choose the least-resistant next step.")}</Text></View></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promptRow}>{prompts.map((prompt) => <Pressable key={prompt} disabled={isLoading} onPress={() => onPrompt(prompt)} style={({ pressed }) => [styles.promptChip, isLoading && { opacity: 0.5 }, pressed && styles.pressed]}><Text style={styles.promptText}>{prompt}</Text></Pressable>)}</ScrollView></>} renderItem={({ item }) => <View style={[styles.messageRow, item.from === "user" && styles.messageRowUser]}><View style={[styles.messageBubble, item.from === "user" ? styles.userBubble : styles.aiBubble]}>{item.from === "ai" ? <Icon name="auto-awesome" size={15} color={palette.cyan} /> : null}<Text style={[styles.messageText, item.from === "user" && { color: palette.canvas }]}>{item.text}</Text></View></View>} />
    <View style={styles.chatComposer}><TextInput editable={!isLoading} style={styles.chatInput} value={input} onChangeText={setInput} placeholder={isLoading ? t("المساعد يفكر…", "The assistant is thinking…") : t("اكتب سؤالك…", "Ask your question…")} placeholderTextColor={palette.muted} textAlign="right" onSubmitEditing={onSend} returnKeyType="send" /><Pressable disabled={isLoading} onPress={onSend} style={({ pressed }) => [styles.sendButton, isLoading && { opacity: 0.55 }, pressed && styles.pressed]}><Icon name={isLoading ? "hourglass-top" : "arrow-upward"} size={20} color={palette.canvas} /></Pressable></View>
  </View>;
}

function NotificationsView({ t, isArabic, notifications, promotions, onBack, onMarkAll, onToggle, onRemovePromotion }: { t: (ar: string, en: string) => string; isArabic: boolean; notifications: typeof seedNotifications; promotions: PromotionInboxItem[]; onBack: () => void; onMarkAll: () => void; onToggle: (id: string) => void; onRemovePromotion: (campaignId: number) => void }) {
  const [notificationStatus, setNotificationStatus] = useState("");
  return <FlatList data={notifications} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} ListHeaderComponent={<><View style={styles.notificationHeader}><Pressable onPress={onBack} style={({ pressed }) => [styles.smallIcon, pressed && styles.pressed]}><Icon name="arrow-forward" size={21} color={palette.ink} /></Pressable><View style={{ flex: 1 }}><Text style={styles.screenTitle}>{t("الإشعارات الذكية", "Smart alerts")}</Text><Text style={styles.screenSubtitle}>{t("رسائل تحافظ على إيقاع يومك.", "Messages that protect your rhythm.")}</Text></View><ActionButton label={t("قراءة الكل", "Read all")} icon="done-all" compact onPress={onMarkAll} /></View><NotificationControlPanel t={t} onStatus={setNotificationStatus} />{notificationStatus ? <Text style={styles.cardCaption}>{notificationStatus}</Text> : null}<View style={styles.pulseCard}><Icon name="notifications-active" size={22} color={palette.cyan} /><View style={{ flex: 1 }}><Text style={styles.cardHeading}>{t("نبضات الانتباه اليومية", "Daily engagement pulses")}</Text><Text style={styles.cardCaption}>{t("تنبيهات التركيز والترطيب مفعّلة محليًا.", "Focus and hydration alerts are locally enabled.")}</Text></View></View>{promotions.length > 0 ? <View style={promotionInboxStyles.section}><View style={promotionInboxStyles.heading}><Icon name="campaign" size={19} color={palette.amber} /><View style={{ flex: 1 }}><Text style={styles.cardHeading}>{t("العروض والتنبيهات الترويجية", "Promotional alerts")}</Text><Text style={styles.cardCaption}>{t("أحدث 3 عروض فقط، دون فتح أي صفحة.", "Only the latest 3 offers, with no screen navigation.")}</Text></View></View>{promotions.map((promotion) => <View key={promotion.campaignId} style={[styles.notificationCard, promotionInboxStyles.card, !promotion.read && styles.notificationUnread]}><View style={[styles.notificationIcon, { backgroundColor: palette.amber + "22" }]}><Icon name="campaign" size={20} color={palette.amber} /></View><View style={{ flex: 1 }}><Text style={[styles.taskTitle, promotion.read && { color: palette.muted }]}>{promotion.title}</Text>{promotion.body ? <Text style={styles.taskDetail}>{promotion.body}</Text> : null}<Text style={styles.notificationTime}>{`${t("وصل", "Received")} · ${formatPromotionReceivedAt(promotion.receivedAt, isArabic)}`}</Text></View><View style={promotionInboxStyles.actions}>{!promotion.read ? <View style={[styles.unreadDot, { backgroundColor: palette.amber }]} /> : null}<Pressable accessibilityRole="button" accessibilityLabel={t("حذف الإشعار الترويجي", "Delete promotional alert")} onPress={() => onRemovePromotion(promotion.campaignId)} style={({ pressed }) => [promotionInboxStyles.deleteButton, pressed && styles.pressed]}><Icon name="close" size={17} color={palette.coral} /></Pressable></View></View>)}</View> : null}</>} renderItem={({ item }) => <Pressable onPress={() => onToggle(item.id)} style={({ pressed }) => [styles.notificationCard, !item.read && styles.notificationUnread, pressed && styles.pressed]}><View style={[styles.notificationIcon, { backgroundColor: item.read ? palette.raised : palette.cyan + "22" }]}><Icon name={item.icon} size={20} color={item.read ? palette.muted : palette.cyan} /></View><View style={{ flex: 1 }}><Text style={[styles.taskTitle, item.read && { color: palette.muted }]}>{item.title}</Text><Text style={styles.taskDetail}>{item.body}</Text><Text style={styles.notificationTime}>{item.read ? t("تمت القراءة", "Read") : t("اضغط للتعليم كمقروء", "Tap to mark read")}</Text></View>{!item.read ? <View style={styles.unreadDot} /> : null}</Pressable>} />;
}

function Empty({ text }: { text: string }) { return <View style={styles.emptyState}><Icon name="check-circle-outline" size={40} color={palette.muted} /><Text style={styles.emptyTitle}>{text}</Text></View>; }

const taskScheduleStyles = StyleSheet.create({
  card: { width: "100%", maxWidth: 410, gap: 13, backgroundColor: "#10233A", borderRadius: 22, borderWidth: 1, borderColor: palette.border, padding: 18, alignItems: "center" },
});

const financeShortcutStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, marginBottom: 2 },
});

const financeStyles = StyleSheet.create({
  todayCard: { backgroundColor: "rgba(255,122,118,0.09)", borderWidth: 1, borderColor: "rgba(255,122,118,0.40)", borderRadius: 18, padding: 14, gap: 12, marginTop: 2 },
  todayHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  todayIcon: { width: 39, height: 39, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,122,118,0.16)" },
  todayTotal: { color: palette.coral, fontSize: 25, lineHeight: 31, fontWeight: "900", marginTop: 2 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 },
  countLabel: { color: palette.muted, fontSize: 9, fontWeight: "800" },
  expenseRow: { backgroundColor: palette.card, borderWidth: 1, borderColor: "rgba(255,122,118,0.24)", borderRadius: 16, padding: 12, flexDirection: "row", alignItems: "center", gap: 9 },
  expenseIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,122,118,0.13)" },
  recurringRow: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: 16, padding: 12, flexDirection: "row", alignItems: "center", gap: 9 },
  recurringActions: { alignItems: "flex-end", gap: 7 },
  recurringActionRow: { flexDirection: "row", gap: 3 },
  recurringFooter: { marginTop: 4, gap: 8, backgroundColor: "rgba(255,195,107,0.06)", borderWidth: 1, borderColor: "rgba(255,195,107,0.22)", borderRadius: 16, padding: 12 },
  monthlyCard: { backgroundColor: "rgba(79,225,168,0.08)", borderWidth: 1, borderColor: "rgba(79,225,168,0.30)", borderRadius: 16, padding: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  monthlyTotal: { color: palette.emerald, fontSize: 20, lineHeight: 26, fontWeight: "900", marginTop: 2 },
  monthlyCount: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 9, backgroundColor: "rgba(79,225,168,0.14)" },
  monthlyCountText: { color: palette.emerald, fontSize: 9, fontWeight: "900" },
  reportCard: { backgroundColor: "rgba(181,156,255,0.08)", borderWidth: 1, borderColor: "rgba(181,156,255,0.34)", borderRadius: 16, padding: 13, gap: 10 },
  reportHead: { flexDirection: "row", alignItems: "center", gap: 9 },
  reportRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  reportLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 5 },
  reportLabel: { color: palette.ink, fontSize: 10, fontWeight: "800" },
  reportShare: { color: palette.purple, fontSize: 9, fontWeight: "900" },
  reportAmount: { color: palette.ink, fontSize: 11, fontWeight: "900" },
  expenseActions: { alignItems: "flex-end", gap: 5 },
  smsCard: { backgroundColor: "rgba(56,216,255,0.07)", borderWidth: 1, borderColor: "rgba(56,216,255,0.34)", borderRadius: 16, padding: 12, gap: 9 },
  smsHead: { flexDirection: "row", alignItems: "center", gap: 9 },
  smsIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(56,216,255,0.13)" },
  smsControls: { flexDirection: "row", alignItems: "flex-end", gap: 9 },
  smsLimitInput: { minHeight: 36, marginTop: 4, borderRadius: 9, paddingHorizontal: 9, color: palette.ink, fontSize: 11, backgroundColor: palette.canvas, borderWidth: 1, borderColor: palette.border },
  smsPrivacy: { color: palette.muted, fontSize: 9, lineHeight: 14 },
  budgetPanel: { backgroundColor: "rgba(56,216,255,0.07)", borderWidth: 1, borderColor: "rgba(56,216,255,0.30)", borderRadius: 16, padding: 12, gap: 10 },
  budgetHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  budgetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  budgetItem: { width: "48.5%", flexGrow: 1, backgroundColor: palette.canvas, borderWidth: 1, borderColor: palette.border, borderRadius: 11, padding: 9, gap: 5 },
  budgetItemExceeded: { borderColor: "rgba(255,122,118,0.72)", backgroundColor: "rgba(255,122,118,0.08)" },
  budgetCategory: { color: palette.ink, fontSize: 9, fontWeight: "800" },
  budgetInput: { minHeight: 33, color: palette.ink, fontSize: 11, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", borderRadius: 8, paddingHorizontal: 8, backgroundColor: palette.card },
  budgetStatus: { color: palette.emerald, fontSize: 8, fontWeight: "800", lineHeight: 12 },
});

const expenseComposerStyles = StyleSheet.create({
  categories: { width: "100%", flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 10 },
  category: { minHeight: 30, paddingHorizontal: 9, borderRadius: 9, justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.03)" },
  categoryActive: { borderColor: "rgba(56,216,255,0.65)", backgroundColor: "rgba(56,216,255,0.14)" },
  categoryText: { color: palette.muted, fontSize: 9, fontWeight: "800" },
  categoryTextActive: { color: palette.cyan },
});

const gamificationStyles = StyleSheet.create({
  xpPill: { minHeight: 32, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,195,107,0.38)", backgroundColor: "rgba(255,195,107,0.10)", flexDirection: "row", alignItems: "center", gap: 4 },
  xpText: { color: palette.amber, fontSize: 9, fontWeight: "900" },
});

const behaviorStyles = StyleSheet.create({
  tunnelEntry: { minHeight: 69, marginTop: 10, marginBottom: 2, padding: 11, gap: 9, borderRadius: 16, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(56,216,255,0.08)", borderWidth: 1, borderColor: "rgba(56,216,255,0.31)" },
  tunnelEntryIcon: { width: 37, height: 37, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(56,216,255,0.13)" },
  tunnelEntryTitle: { color: palette.ink, fontSize: 12, fontWeight: "900", textAlign: "right" },
  tunnelEntryCopy: { color: palette.muted, fontSize: 9, marginTop: 2, textAlign: "right" },
  fallbackCard: { marginTop: 9, padding: 9, gap: 6, flexDirection: "row", alignItems: "flex-start", borderRadius: 11, backgroundColor: "rgba(255,195,107,0.07)", borderWidth: 1, borderColor: "rgba(255,195,107,0.22)" },
  fallbackCopy: { flex: 1, color: palette.ink, fontSize: 9, lineHeight: 14, textAlign: "right" },
});

const energyMatrixStyles = StyleSheet.create({
  card: { padding: 13, gap: 10, borderRadius: 18, backgroundColor: "rgba(255,195,107,0.07)", borderWidth: 1, borderColor: "rgba(255,195,107,0.30)" },
  head: { flexDirection: "row", alignItems: "center", gap: 9 },
  icon: { width: 37, height: 37, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,195,107,0.13)" },
  title: { color: palette.ink, fontSize: 12, fontWeight: "900", textAlign: "right" },
  subtitle: { color: palette.muted, fontSize: 9, marginTop: 2, textAlign: "right" },
  row: { gap: 5 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { color: palette.ink, fontSize: 10, fontWeight: "800" },
  value: { fontSize: 11, fontWeight: "900" },
  track: { height: 7, borderRadius: 7, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.08)" },
  fill: { height: "100%", borderRadius: 7 },
});

const weeklyReportStyles = StyleSheet.create({
  hero: { backgroundColor: "rgba(181,156,255,0.14)", borderWidth: 1, borderColor: "rgba(181,156,255,0.45)", borderRadius: 20, padding: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { color: palette.muted, fontSize: 11, fontWeight: "800" },
  score: { color: palette.ink, fontSize: 42, lineHeight: 50, fontWeight: "900" },
  scoreSuffix: { color: palette.muted, fontSize: 14 },
  scoreRing: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(181,156,255,0.18)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(181,156,255,0.55)" },
  personaRow: { flexDirection: "row", gap: 8 },
  persona: { flex: 1, minHeight: 42, borderRadius: 12, paddingHorizontal: 10, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "rgba(181,156,255,0.34)", backgroundColor: "rgba(255,255,255,0.03)" },
  personaActive: { backgroundColor: palette.purple, borderColor: palette.purple },
  personaText: { color: palette.purple, fontSize: 10, fontWeight: "900" },
  summary: { backgroundColor: "rgba(56,216,255,0.08)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(56,216,255,0.25)", padding: 14, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  summaryText: { flex: 1, color: palette.ink, fontSize: 12, lineHeight: 20, textAlign: "right" },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  metric: { width: "48.5%", minHeight: 90, backgroundColor: "rgba(255,255,255,0.035)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", borderRadius: 15, padding: 12, gap: 5 },
  metricValue: { color: palette.ink, fontSize: 16, fontWeight: "900" },
  metricLabel: { color: palette.muted, fontSize: 9, fontWeight: "700" },
  footnote: { color: palette.muted, fontSize: 10, lineHeight: 16, textAlign: "center", paddingHorizontal: 10 },
});

const websiteStyles = StyleSheet.create({
  app: { width: "100%", maxWidth: 1440, alignSelf: "center", backgroundColor: palette.canvas, borderLeftWidth: 1, borderRightWidth: 1, borderColor: "rgba(56,216,255,0.08)" },
  header: { paddingHorizontal: 28, minHeight: 76 },
  content: { flex: 1, minHeight: 0 },
  contentDesktop: { flexDirection: "row", paddingHorizontal: 18, paddingBottom: 18, gap: 16 },
  sidebar: { width: 220, flexShrink: 0, backgroundColor: "#0A1727", borderWidth: 1, borderColor: "rgba(56,216,255,0.14)", borderRadius: 20, padding: 12, gap: 6, alignSelf: "stretch" },
  sidebarLabel: { color: palette.muted, fontSize: 10, fontWeight: "900", letterSpacing: 0.8, paddingHorizontal: 8, paddingVertical: 8, textAlign: "right" },
  sidebarItem: { minHeight: 44, borderRadius: 12, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 10 },
  sidebarItemActive: { backgroundColor: "rgba(56,216,255,0.12)", borderWidth: 1, borderColor: "rgba(56,216,255,0.16)" },
  sidebarText: { color: palette.muted, fontSize: 12, fontWeight: "800", textAlign: "right", flex: 1 },
  sidebarTextActive: { color: palette.cyan },
  sidebarNote: { marginTop: "auto", borderRadius: 12, padding: 10, backgroundColor: "rgba(181,156,255,0.1)", flexDirection: "row", alignItems: "center", gap: 7 },
  sidebarNoteText: { flex: 1, color: "#D4C7FF", fontSize: 9, fontWeight: "800", textAlign: "right" },
  main: { flex: 1, minWidth: 0, borderRadius: 20, overflow: "hidden", backgroundColor: palette.canvas, borderWidth: 1, borderColor: "rgba(255,255,255,0.04)" },
});

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: palette.canvas }, main: { flex: 1 }, header: { minHeight: 66, paddingHorizontal: 18, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: palette.canvas, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" }, brand: { flexDirection: "row", alignItems: "center", gap: 9 }, brandMark: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: palette.cyan }, brandMarkText: { color: palette.canvas, fontSize: 22, lineHeight: 26, fontWeight: "900" }, brandTitle: { color: palette.ink, fontSize: 12, letterSpacing: 1.25, fontWeight: "900" }, brandSub: { color: palette.muted, fontSize: 8, letterSpacing: 1.1, marginTop: 1 }, headerActions: { flexDirection: "row", alignItems: "center", gap: 8 }, languageButton: { width: 35, height: 33, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.card }, languageText: { color: palette.cyan, fontWeight: "800", fontSize: 12 }, iconButton: { width: 37, height: 35, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border }, badge: { position: "absolute", right: 4, top: 3, minWidth: 15, height: 15, paddingHorizontal: 3, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: palette.coral }, badgeText: { color: palette.canvas, fontSize: 9, fontWeight: "900" }, tabBar: { minHeight: 68, paddingHorizontal: 9, paddingTop: 7, paddingBottom: 9, flexDirection: "row", backgroundColor: "#0A1727", borderTopWidth: 1, borderTopColor: "rgba(56,216,255,0.12)", justifyContent: "space-between" }, navItem: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 12, minHeight: 49, gap: 3 }, navItemActive: { backgroundColor: "rgba(56,216,255,0.10)" }, navLabel: { color: palette.muted, fontSize: 10, fontWeight: "700" }, pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] }, scrollContent: { padding: 16, paddingBottom: 22, gap: 14 }, listContent: { padding: 16, paddingBottom: 22, gap: 11 }, greetingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }, eyebrow: { color: palette.muted, fontSize: 12, fontWeight: "600" }, heroTitle: { color: palette.ink, fontSize: 24, fontWeight: "800", marginTop: 5, lineHeight: 30 }, avatar: { width: 42, height: 42, borderRadius: 15, backgroundColor: palette.raised, borderWidth: 1, borderColor: palette.border, alignItems: "center", justifyContent: "center" }, avatarText: { color: palette.cyan, fontWeight: "800", fontSize: 17 }, engineCard: { backgroundColor: palette.card, padding: 15, borderRadius: 20, borderWidth: 1, gap: 13 }, engineTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, engineIdentity: { flexDirection: "row", alignItems: "center", gap: 9, flex: 1 }, engineBolt: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" }, cardHeading: { color: palette.ink, fontWeight: "800", fontSize: 14, lineHeight: 19 }, cardCaption: { color: palette.muted, fontSize: 11, lineHeight: 16, marginTop: 3 }, engineStats: { flexDirection: "row", gap: 7 }, tinyStat: { flex: 1, backgroundColor: "rgba(255,255,255,0.035)", paddingVertical: 9, paddingHorizontal: 6, alignItems: "center", borderRadius: 11 }, tinyLabel: { color: palette.muted, fontSize: 9, fontWeight: "700" }, tinyValue: { fontSize: 13, fontWeight: "900", marginTop: 3 }, engineHint: { color: "#D8E6F2", fontSize: 11, lineHeight: 17 }, actionButton: { minHeight: 37, paddingHorizontal: 11, borderWidth: 1, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }, actionButtonCompact: { minHeight: 31, paddingHorizontal: 8, borderRadius: 9 }, actionLabel: { fontSize: 11, fontWeight: "800" }, actionLabelCompact: { fontSize: 10 }, vitalityCard: { backgroundColor: "#11283A", borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "rgba(79,225,168,0.35)" }, tag: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4 }, tagText: { fontSize: 9, fontWeight: "800" }, scoreRing: { width: 78, height: 78, borderRadius: 39, borderWidth: 6, borderColor: palette.emerald, alignItems: "center", justifyContent: "center", backgroundColor: palette.canvas }, scoreNumber: { color: palette.ink, fontSize: 18, fontWeight: "900" }, scoreLabel: { color: palette.muted, fontSize: 9, fontWeight: "700" }, alertBanner: { backgroundColor: "rgba(56,216,255,0.10)", borderWidth: 1, borderColor: "rgba(56,216,255,0.30)", padding: 13, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 10 }, alertIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(56,216,255,0.14)" }, alertTitle: { color: palette.ink, fontWeight: "800", fontSize: 12 }, alertCopy: { color: palette.muted, fontSize: 10, lineHeight: 15, marginTop: 2 }, sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 }, sectionTitle: { color: palette.ink, fontSize: 15, fontWeight: "800" }, linkText: { color: palette.cyan, fontSize: 11, fontWeight: "800" }, metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 }, metricCard: { width: "48.5%", flexGrow: 1, backgroundColor: palette.card, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", borderRadius: 16, padding: 12, gap: 4 }, metricHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, metricIcon: { width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: 9 }, metricPercent: { fontSize: 10, fontWeight: "900" }, metricValue: { color: palette.ink, fontSize: 16, fontWeight: "900", marginTop: 4 }, metricLabel: { color: palette.muted, fontSize: 9, minHeight: 15 }, progressTrack: { width: "100%", height: 5, overflow: "hidden", borderRadius: 4, backgroundColor: palette.track, marginTop: 6 }, progressFill: { height: "100%", borderRadius: 4 }, twoCol: { flexDirection: "row", gap: 10 }, lifestyleCard: { flex: 1, backgroundColor: palette.card, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", padding: 12, gap: 8 }, lifestyleTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, lifestyleValue: { fontSize: 10, fontWeight: "800" }, lifestyleTitle: { color: palette.ink, fontWeight: "800", fontSize: 12 }, quickCard: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: 18, padding: 14 }, quickActions: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 }, titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2, gap: 9 }, screenTitle: { color: palette.ink, fontSize: 21, lineHeight: 27, fontWeight: "900" }, screenSubtitle: { color: palette.muted, fontSize: 11, marginTop: 3, lineHeight: 16 }, fab: { width: 42, height: 42, borderRadius: 14, backgroundColor: palette.cyan, alignItems: "center", justifyContent: "center" }, schedulerCard: { backgroundColor: palette.card, borderWidth: 1, borderColor: "rgba(79,225,168,0.42)", padding: 13, borderRadius: 16 }, schedulerHead: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 5 }, schedulerTitle: { flex: 1, color: palette.ink, fontSize: 12, fontWeight: "800" }, filterRow: { gap: 7, paddingVertical: 2 }, filterChip: { paddingHorizontal: 11, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", backgroundColor: palette.card, borderRadius: 10 }, filterChipActive: { borderColor: palette.cyan, backgroundColor: "rgba(56,216,255,0.13)" }, filterText: { color: palette.muted, fontSize: 10, fontWeight: "700" }, filterTextActive: { color: palette.cyan }, taskCard: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: 17, padding: 13, gap: 11 }, taskDone: { borderColor: "rgba(255,255,255,0.07)", opacity: 0.78 }, taskTop: { flexDirection: "row", alignItems: "flex-start", gap: 9 }, checkBox: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: palette.cyan, alignItems: "center", justifyContent: "center", backgroundColor: palette.canvas }, checkBoxDone: { backgroundColor: palette.emerald, borderColor: palette.emerald }, taskBody: { flex: 1, gap: 2 }, taskTitle: { color: palette.ink, fontSize: 13, fontWeight: "800", lineHeight: 19 }, taskDetail: { color: palette.muted, fontSize: 10, lineHeight: 15, marginTop: 2 }, strike: { textDecorationLine: "line-through", color: palette.muted }, microCard: { backgroundColor: "#0A192B", padding: 10, borderRadius: 12, gap: 7 }, microHead: { flexDirection: "row", alignItems: "center", gap: 6 }, microTitle: { color: palette.cyan, fontSize: 10, fontWeight: "800" }, microStep: { flexDirection: "row", alignItems: "center", gap: 7 }, microCopy: { color: palette.ink, fontSize: 10, flex: 1 }, taskActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingTop: 1 }, taskIcons: { flexDirection: "row", gap: 3, marginLeft: "auto" }, smallIcon: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "rgba(255,255,255,0.04)" }, emptyState: { alignItems: "center", paddingVertical: 55, gap: 8 }, emptyTitle: { color: palette.ink, fontSize: 14, fontWeight: "800" }, segmented: { flexDirection: "row", padding: 4, gap: 4, backgroundColor: palette.card, borderRadius: 14, borderWidth: 1, borderColor: palette.border, marginBottom: 2 }, segment: { flex: 1, minHeight: 35, alignItems: "center", justifyContent: "center", borderRadius: 10, paddingHorizontal: 5 }, segmentActive: { backgroundColor: "rgba(56,216,255,0.14)" }, segmentText: { color: palette.muted, fontSize: 10, fontWeight: "700" }, segmentTextActive: { color: palette.cyan, fontWeight: "900" }, habitCard: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: 17, padding: 14, gap: 13 }, habitHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }, streakPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,195,107,0.13)", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9 }, streakText: { color: palette.amber, fontSize: 10, fontWeight: "900" }, habitActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }, passButton: { flex: 1, minHeight: 31, paddingHorizontal: 7, borderRadius: 9, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }, passButtonActive: { backgroundColor: "rgba(181,156,255,0.12)", borderColor: "rgba(181,156,255,0.44)" }, passText: { color: palette.muted, fontSize: 9, fontWeight: "800" }, wheelHero: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, padding: 15, borderRadius: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 }, wheelScore: { width: 61, height: 61, borderRadius: 31, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: palette.cyan }, wheelRow: { backgroundColor: palette.card, borderRadius: 15, padding: 13, gap: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" }, wheelLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, wheelValue: { fontSize: 11, fontWeight: "900" }, wheelControl: { flexDirection: "row", alignItems: "center", gap: 9 }, wheelButton: { width: 27, height: 27, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: palette.raised }, zenCard: { backgroundColor: palette.card, borderRadius: 22, borderWidth: 1, borderColor: palette.border, padding: 20, alignItems: "center", minHeight: 470 }, zenRing: { width: 176, height: 176, borderRadius: 88, borderWidth: 4, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "#0B192A", alignItems: "center", justifyContent: "center", marginVertical: 26 }, zenTime: { color: palette.ink, fontSize: 36, lineHeight: 43, fontWeight: "900" }, zenActions: { flexDirection: "row", alignItems: "center", gap: 9 }, zenReset: { width: 43, height: 39, borderRadius: 11, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" }, ambientText: { color: palette.muted, fontSize: 10, marginTop: 18 }, cashflowCard: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: 19, padding: 16, marginTop: 2 }, cashflowNumber: { fontSize: 29, fontWeight: "900", marginVertical: 6 }, cashflowSplit: { flexDirection: "row", gap: 8, marginTop: 7 }, radarHeading: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 }, subscriptionCard: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: 16, padding: 13, flexDirection: "row", alignItems: "center", gap: 9 }, subAmount: { fontSize: 15, fontWeight: "900" }, wasteChip: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: palette.raised, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }, wasteChipActive: { backgroundColor: "rgba(255,122,118,0.12)", borderColor: "rgba(255,122,118,0.45)" }, wasteText: { color: palette.muted, fontSize: 9, fontWeight: "800" }, ideaCard: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, padding: 14, borderRadius: 17, gap: 8 }, ideaHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }, ideaActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 3 }, contactCard: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, padding: 12, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 10 }, contactAvatar: { width: 39, height: 39, borderRadius: 13, backgroundColor: "rgba(56,216,255,0.14)", alignItems: "center", justifyContent: "center" }, contactInitial: { color: palette.cyan, fontSize: 15, fontWeight: "900" }, chatContent: { padding: 16, paddingBottom: 88, gap: 10 }, advisorHero: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: 17, padding: 13, flexDirection: "row", gap: 10, alignItems: "center" }, advisorOrb: { width: 47, height: 47, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(56,216,255,0.13)" }, promptRow: { paddingVertical: 2, gap: 7 }, promptChip: { backgroundColor: palette.card, borderRadius: 10, borderWidth: 1, borderColor: palette.border, paddingHorizontal: 10, paddingVertical: 8 }, promptText: { color: palette.cyan, fontSize: 10, fontWeight: "700" }, messageRow: { flexDirection: "row", marginTop: 1 }, messageRowUser: { justifyContent: "flex-end" }, messageBubble: { maxWidth: "86%", borderRadius: 15, padding: 11, flexDirection: "row", alignItems: "flex-start", gap: 6 }, aiBubble: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border }, userBubble: { backgroundColor: palette.cyan }, messageText: { color: palette.ink, fontSize: 12, lineHeight: 18, flexShrink: 1 }, chatComposer: { position: "absolute", left: 12, right: 12, bottom: 10, flexDirection: "row", alignItems: "center", gap: 8, padding: 7, borderRadius: 16, backgroundColor: "#11233A", borderWidth: 1, borderColor: palette.border }, chatInput: { flex: 1, color: palette.ink, fontSize: 12, minHeight: 38, paddingHorizontal: 8 }, sendButton: { width: 39, height: 39, borderRadius: 12, backgroundColor: palette.cyan, alignItems: "center", justifyContent: "center" }, notificationHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }, pulseCard: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: 16, padding: 13, flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }, notificationCard: { backgroundColor: palette.card, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", borderRadius: 16, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }, notificationUnread: { borderColor: "rgba(56,216,255,0.40)", backgroundColor: "#10263B" }, notificationIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" }, notificationTime: { color: palette.cyan, fontSize: 9, fontWeight: "700", marginTop: 5 }, unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.cyan }, toast: { position: "absolute", left: 18, right: 18, bottom: 82, zIndex: 10, backgroundColor: "#122C30", borderWidth: 1, borderColor: "rgba(79,225,168,0.48)", paddingHorizontal: 12, paddingVertical: 11, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 8, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 }, toastText: { color: palette.ink, fontSize: 11, fontWeight: "700", flex: 1 }, modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.70)", alignItems: "center", justifyContent: "center", padding: 24 }, composerCard: { width: "100%", maxWidth: 410, backgroundColor: "#10233A", borderRadius: 22, borderWidth: 1, borderColor: palette.border, padding: 18, alignItems: "center" }, composerGlyph: { width: 45, height: 45, borderRadius: 15, backgroundColor: "rgba(56,216,255,0.14)", alignItems: "center", justifyContent: "center" }, composerTitle: { color: palette.ink, fontSize: 18, fontWeight: "900", marginTop: 10 }, composerSub: { color: palette.muted, fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: 5 }, composerInput: { color: palette.ink, width: "100%", minHeight: 46, borderRadius: 12, paddingHorizontal: 12, marginTop: 15, backgroundColor: palette.canvas, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }, composerActions: { marginTop: 13, flexDirection: "row", justifyContent: "space-between", width: "100%" },
});
