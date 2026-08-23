import { Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { buildOmniNotificationRoute, parseCampaignExternalUrl, parseCampaignLinkClick, parseOmniNotificationTarget, parsePromotionBadgeData, supportsNativeNotifications, type CampaignLinkClick, type OmniNotificationTarget, type PromotionBadgeData } from "@/lib/notification-routing";
import { buildEveningReviewSummary, getDailyEncouragement } from "@/lib/daily-home-guidance";
import { configureNotificationSoundChannels, getSoundChannel, getSoundFile, OMNI_HIGH_PRIORITY_CHANNEL, type NotificationSoundSection } from "@/lib/notification-sound-service";
import { cancelAndroidPersistentReminder, scheduleAndroidPersistentReminder } from "@/lib/android-background-reliability";
import { selectOmniAiRoutineCopy, type OmniAiRoutineCopy } from "@/lib/ai-routine-copy";

export { OMNI_HIGH_PRIORITY_CHANNEL } from "@/lib/notification-sound-service";

export type OmniNotificationInput = {
  title: string;
  body: string;
  target: OmniNotificationTarget;
  section?: NotificationSoundSection;
  badge?: number;
};

export type OmniNotificationPermission = "granted" | "denied" | "unsupported";
export type HabitReminderRepeat = "once" | "daily" | "weekly" | "monthly" | "yearly";
export type OmniRoutineSchedule = { ids: string[]; scheduledDays: number };
export type { OmniAiRoutineCopy } from "@/lib/ai-routine-copy";

if (supportsNativeNotifications(Platform.OS)) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    }),
  });
}

export async function configureOmniNotificationChannel() {
  await configureNotificationSoundChannels();
  if (Platform.OS !== "android") return null;
  return Notifications.getNotificationChannelAsync(OMNI_HIGH_PRIORITY_CHANNEL);
}

export async function requestOmniNotificationPermissions(): Promise<OmniNotificationPermission> {
  if (Platform.OS === "web") return "unsupported";
  await configureOmniNotificationChannel();

  const existing = await Notifications.getPermissionsAsync();
  let permissions = existing;
  if (!existing.granted) {
    permissions = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
  }

  const iOSAuthorized = Platform.OS !== "ios" || permissions.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED || permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL || permissions.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL;
  return permissions.granted && iOSAuthorized ? "granted" : "denied";
}

function notificationSection(input: Pick<OmniNotificationInput, "target" | "section">): NotificationSoundSection {
  if (input.section) return input.section;
  if (input.target.id === "evening-brain-dump") return "evening";
  if (input.target.kind === "habit") return "habits";
  if (input.target.kind === "finance") return "finance";
  if (input.target.kind === "ideas") return "persona";
  return "tasks";
}

function sectionChannel(input: Pick<OmniNotificationInput, "target" | "section">, at?: Date) {
  return Platform.OS === "android" ? { channelId: getSoundChannel(notificationSection(input), at) } : {};
}

function notificationContent({ title, body, target, section, badge = 1 }: OmniNotificationInput, at?: Date): Notifications.NotificationContentInput {
  return {
    title,
    body,
    sound: getSoundFile(notificationSection({ target, section }), at),
    badge,
    color: "#38D8FF",
    priority: Notifications.AndroidNotificationPriority.MAX,
    interruptionLevel: "timeSensitive",
    data: {
      target,
      url: buildOmniNotificationRoute(target),
    },
  };
}

/** Central sound-aware dispatcher for section notifications and contextual focus alerts. */
export async function sendAppNotification(input: OmniNotificationInput) {
  return sendInstantHighPriorityNotification(input);
}

export async function sendInstantHighPriorityNotification(input: OmniNotificationInput) {
  const permission = await requestOmniNotificationPermissions();
  if (permission !== "granted") return null;

  return Notifications.scheduleNotificationAsync({
    content: notificationContent(input),
    trigger: Platform.OS === "android" ? sectionChannel(input) as Notifications.NotificationTriggerInput : null,
  });
}

export async function scheduleHighPriorityNotification(input: OmniNotificationInput, scheduledAt: Date) {
  const permission = await requestOmniNotificationPermissions();
  if (permission !== "granted") return null;
  if (scheduledAt.getTime() <= Date.now()) throw new Error("The notification time must be in the future.");
  if (Platform.OS === "android") {
    const identifier = `omni-bg-${input.target.kind}-${input.target.id}-${scheduledAt.getTime()}`;
    const persistent = await scheduleAndroidPersistentReminder({ id: identifier, title: input.title, body: input.body, at: scheduledAt, route: buildOmniNotificationRoute(input.target), channelId: getSoundChannel(notificationSection(input), scheduledAt) });
    if (persistent) return persistent;
  }

  return Notifications.scheduleNotificationAsync({
    content: notificationContent(input, scheduledAt),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: scheduledAt,
      ...sectionChannel(input, scheduledAt),
    },
  });
}

/** Schedules the user-selected evening closure ritual; a previous schedule is safely replaced. */
export async function scheduleEveningBrainDumpReminder(isArabic: boolean, at: Date, previousId?: string | null) {
  const permission = await requestOmniNotificationPermissions();
  if (permission !== "granted") return null;
  if (previousId) {
    await cancelAndroidPersistentReminder(previousId).catch(() => undefined);
    await Notifications.cancelScheduledNotificationAsync(previousId).catch(() => undefined);
  }
  const input: OmniNotificationInput = {
    title: isArabic ? "وقت إغلاق اليوم" : "Time to close the day",
    body: isArabic ? "اكتب ما يشغل بالك للغد، ثم اترك يومك ينتهي بهدوء." : "Write down what is on your mind for tomorrow, then let the day end calmly.",
    target: { kind: "dashboard", id: "evening-brain-dump" },
    section: "evening",
  };
  if (Platform.OS === "android") {
    const nativeId = "omni-bg-evening-brain-dump-daily";
    const persistent = await scheduleAndroidPersistentReminder({ id: nativeId, title: input.title, body: input.body, at, route: buildOmniNotificationRoute(input.target), channelId: getSoundChannel("evening", at), repeat: "daily" });
    if (persistent) return persistent;
  }
  return Notifications.scheduleNotificationAsync({
    content: notificationContent(input, at),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: at.getHours(),
      minute: at.getMinutes(),
      ...sectionChannel({ target: { kind: "dashboard", id: "evening-brain-dump" }, section: "evening" }, at),
    },
  });
}

export async function cancelEveningBrainDumpReminder(identifier?: string | null) {
  if (!identifier) return;
  await cancelAndroidPersistentReminder(identifier).catch(() => undefined);
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined);
}

/** Safely cancels a one-off OMNI LIFE scheduled alert, including a replaced Pomodoro cycle alert. */
export async function cancelScheduledOmniNotification(identifier?: string | null) {
  if (!identifier) return;
  await cancelAndroidPersistentReminder(identifier).catch(() => undefined);
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined);
}

/** Schedules a habit reminder once, every day at the selected time, or every week on the selected weekday and time. */
export async function scheduleHabitReminderNotification(input: OmniNotificationInput, scheduledAt: Date, repeat: HabitReminderRepeat) {
  const permission = await requestOmniNotificationPermissions();
  if (permission !== "granted") return null;
  if (repeat === "once" && scheduledAt.getTime() <= Date.now()) throw new Error("The notification time must be in the future.");

  const channel = sectionChannel(input, scheduledAt);
  if (Platform.OS === "android" && repeat !== "once") {
    const stamp = `${scheduledAt.getMonth() + 1}-${scheduledAt.getDate()}-${scheduledAt.getDay()}-${scheduledAt.getHours()}-${scheduledAt.getMinutes()}`;
    const identifier = `omni-bg-${input.target.kind}-${input.target.id}-${repeat}-${stamp}`;
    const persistent = await scheduleAndroidPersistentReminder({ id: identifier, title: input.title, body: input.body, at: scheduledAt, route: buildOmniNotificationRoute(input.target), channelId: getSoundChannel(notificationSection(input), scheduledAt), repeat });
    if (persistent) return persistent;
  }
  if (repeat === "daily") {
    return Notifications.scheduleNotificationAsync({
      content: notificationContent(input, scheduledAt),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: scheduledAt.getHours(),
        minute: scheduledAt.getMinutes(),
        ...channel,
      },
    });
  }
  if (repeat === "weekly") {
    return Notifications.scheduleNotificationAsync({
      content: notificationContent(input, scheduledAt),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: scheduledAt.getDay() + 1,
        hour: scheduledAt.getHours(),
        minute: scheduledAt.getMinutes(),
        ...channel,
      },
    });
  }
  if (repeat === "monthly") {
    return Notifications.scheduleNotificationAsync({
      content: notificationContent(input, scheduledAt),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: scheduledAt.getDate(),
        hour: scheduledAt.getHours(),
        minute: scheduledAt.getMinutes(),
        ...channel,
      },
    });
  }
  if (repeat === "yearly") {
    return Notifications.scheduleNotificationAsync({
      content: notificationContent(input, scheduledAt),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.YEARLY,
        month: scheduledAt.getMonth() + 1,
        day: scheduledAt.getDate(),
        hour: scheduledAt.getHours(),
        minute: scheduledAt.getMinutes(),
        ...channel,
      },
    });
  }
  return Notifications.scheduleNotificationAsync({
    content: notificationContent(input, scheduledAt),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: scheduledAt,
      ...channel,
    },
  });
}

/**
 * Schedules the next twelve days of automatic local OMNI LIFE routines. Date-based
 * triggers allow the morning encouragement to vary by date rather than repeating one phrase.
 */
export async function scheduleAutomaticOmniRoutineNotifications(isArabic: boolean, previousIds: string[] = [], dailyReview: { completedTasks: number; expenseEgp: number } = { completedTasks: 0, expenseEgp: 0 }, aiCopy: OmniAiRoutineCopy = {}, userName = ""): Promise<OmniRoutineSchedule> {
  const permission = await requestOmniNotificationPermissions();
  if (permission !== "granted") return { ids: [], scheduledDays: 0 };
  await Promise.all(previousIds.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));

  const ids: string[] = [];
  const schedule = async (date: Date, input: OmniNotificationInput) => {
    const id = await scheduleHighPriorityNotification(input, date);
    if (id) ids.push(id);
  };
  const now = new Date();
  for (let offset = 0; offset < 12; offset += 1) {
    const day = new Date(now);
    day.setDate(now.getDate() + offset);
    const at = (hour: number, minute: number) => { const date = new Date(day); date.setHours(hour, minute, 0, 0); return date; };
    const morning = at(8, 0);
    const greetingPrefix = userName.trim() ? (isArabic ? `${userName.trim()}، ` : `${userName.trim()}, `) : "";
    if (morning.getTime() > now.getTime()) await schedule(morning, { title: isArabic ? "صباح الخير من OMNI LIFE" : "Good morning from OMNI LIFE", body: selectOmniAiRoutineCopy(aiCopy, "morning", offset, `${greetingPrefix}${getDailyEncouragement(day)}`), target: { kind: "dashboard", id: "daily-greeting" }, section: "persona" });
    const taskPulse = at(12, 30);
    if (taskPulse.getTime() > now.getTime()) await schedule(taskPulse, { title: isArabic ? "لحظة إنجاز صغيرة" : "A small progress moment", body: selectOmniAiRoutineCopy(aiCopy, "task", offset, isArabic ? "راجع مهمة واحدة واختر خطوة لا تحتاج أكثر من عشر دقائق." : "Review one task and choose a step that needs no more than ten minutes."), target: { kind: "task", id: "daily-task-pulse" }, section: "tasks" });
    const habitPulse = at(15, 0);
    if (habitPulse.getTime() > now.getTime()) await schedule(habitPulse, { title: isArabic ? "عادة صغيرة، أثر كبير" : "A small habit, a real win", body: selectOmniAiRoutineCopy(aiCopy, "habit", offset, isArabic ? "اختر عادة واحدة وابدأ بدقيقتين فقط؛ السلسلة تحب البدايات الصغيرة." : "Choose one habit and begin with just two minutes; streaks love small starts."), target: { kind: "habit", id: "daily-habit-pulse" }, section: "habits" });
    const financePulse = at(17, 0);
    if (financePulse.getTime() > now.getTime()) await schedule(financePulse, { title: isArabic ? "نبضة المال" : "Money pulse", body: selectOmniAiRoutineCopy(aiCopy, "finance", offset, isArabic ? "راجع التزاماتك أو سجّل أي معاملة مالية قبل أن تنساها." : "Review recurring entries or record financial activity before you forget it."), target: { kind: "finance", id: "daily-finance-pulse" }, section: "finance" });
    const ideasPulse = at(19, 0);
    if (ideasPulse.getTime() > now.getTime()) await schedule(ideasPulse, { title: isArabic ? "فكرة تستحق دقيقة" : "An idea deserves a minute", body: selectOmniAiRoutineCopy(aiCopy, "ideas", offset, isArabic ? "دوّن فكرة سريعة أو حوّل فكرة موجودة إلى خطوة عملية." : "Capture a quick idea or turn an existing idea into one practical step."), target: { kind: "ideas", id: "daily-idea-pulse" }, section: "persona" });
    const review = at(21, 30);
    const eveningFallback = `${greetingPrefix}${buildEveningReviewSummary({ ...dailyReview, isArabic })}`;
    if (review.getTime() > now.getTime()) await schedule(review, { title: isArabic ? "مراجعة نهاية اليوم" : "End-of-day review", body: selectOmniAiRoutineCopy(aiCopy, "evening", offset, eveningFallback), target: { kind: "dashboard", id: "daily-review" }, section: "evening" });
  }
  return { ids, scheduledDays: 12 };
}

function withPromotionArrivalTime(promotion: PromotionBadgeData, receivedAt: number) {
  return { ...promotion, receivedAt: new Date(receivedAt).toISOString() };
}

async function handleOmniNotificationResponse(data: unknown, onTarget: (target: OmniNotificationTarget) => void, onCampaignLinkClick?: (click: CampaignLinkClick) => void, onPromotionBadge?: (promotion: PromotionBadgeData) => void, receivedAt?: number) {
  const promotion = parsePromotionBadgeData(data);
  if (promotion) {
    onPromotionBadge?.(receivedAt ? withPromotionArrivalTime(promotion, receivedAt) : promotion);
    return;
  }
  const externalUrl = parseCampaignExternalUrl(data);
  if (externalUrl) {
    const click = parseCampaignLinkClick(data);
    if (click) onCampaignLinkClick?.(click);
    try {
      await Linking.openURL(externalUrl);
    } catch (error) {
      console.warn("[Notifications] Unable to open campaign link", error);
    }
    return;
  }

  const target = parseOmniNotificationTarget(data);
  if (target) onTarget(target);
}

export function observeOmniNotificationResponses(onTarget: (target: OmniNotificationTarget) => void, onCampaignLinkClick?: (click: CampaignLinkClick) => void, onPromotionBadge?: (promotion: PromotionBadgeData) => void) {
  if (!supportsNativeNotifications(Platform.OS)) return () => undefined;
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    void handleOmniNotificationResponse(response.notification.request.content.data, onTarget, onCampaignLinkClick, onPromotionBadge, response.notification.date);
  });
  return () => subscription.remove();
}

/** Records promotional banners received while OMNI LIFE is open without sending the user to a screen. */
export function observeOmniPromotionNotifications(onPromotionBadge: (promotion: PromotionBadgeData) => void) {
  if (!supportsNativeNotifications(Platform.OS)) return () => undefined;
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    const promotion = parsePromotionBadgeData(notification.request.content.data);
    if (promotion) onPromotionBadge(withPromotionArrivalTime(promotion, notification.date));
  });
  return () => subscription.remove();
}

/** Restores the promotions still visible in the phone's notification tray when the app opens normally. */
export async function getPresentedOmniPromotionNotifications(): Promise<PromotionBadgeData[]> {
  if (!supportsNativeNotifications(Platform.OS)) return [];
  const presented = await Notifications.getPresentedNotificationsAsync();
  return presented.flatMap((notification) => {
      const promotion = parsePromotionBadgeData(notification.request.content.data);
      return promotion ? [withPromotionArrivalTime(promotion, notification.date)] : [];
    });
}

export async function handleLastOmniNotificationResponse(onTarget: (target: OmniNotificationTarget) => void, onCampaignLinkClick?: (click: CampaignLinkClick) => void, onPromotionBadge?: (promotion: PromotionBadgeData) => void) {
  if (!supportsNativeNotifications(Platform.OS)) return;
  const response = await Notifications.getLastNotificationResponseAsync();
  await handleOmniNotificationResponse(response?.notification.request.content.data, onTarget, onCampaignLinkClick, onPromotionBadge, response?.notification.date);
  if (response) await Notifications.clearLastNotificationResponseAsync();
}
