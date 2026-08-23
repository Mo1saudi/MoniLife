import AsyncStorage from "@react-native-async-storage/async-storage";

export type HomeGuidanceTarget = "tasks" | "habits" | "finance" | "focus" | "ideas" | "advisor" | "notifications";

export type HomeGuidanceTip = {
  id: string;
  day: number;
  icon: string;
  title: { ar: string; en: string };
  body: { ar: string; en: string };
  action: { ar: string; en: string };
  target: HomeGuidanceTarget;
};

export type HomeGuidanceProgress = { startedAt: string; dismissedTipIds: string[]; enabled: boolean };

export const HOME_GUIDANCE_TIPS: HomeGuidanceTip[] = [
  { id: "day-1-priority", day: 1, icon: "task-alt", title: { ar: "ابدأ بمهمة واحدة", en: "Start with one task" }, body: { ar: "اختر أهم شيء تريد إنجازه اليوم وأضفه في أقل من دقيقة.", en: "Choose the most important thing for today and add it in under a minute." }, action: { ar: "فتح المهام", en: "Open tasks" }, target: "tasks" },
  { id: "day-2-habit", day: 2, icon: "local-fire-department", title: { ar: "ثبّت عادة صغيرة", en: "Build a small habit" }, body: { ar: "العادة البسيطة المتكررة أقوى من خطة كبيرة لا تبدأ.", en: "A small repeated habit is stronger than a big plan you never start." }, action: { ar: "فتح العادات", en: "Open habits" }, target: "habits" },
  { id: "day-3-finance", day: 3, icon: "account-balance-wallet", title: { ar: "سجّل مصروف اليوم", en: "Record today’s expense" }, body: { ar: "اكتب المبلغ أولًا بالجنيه المصري، ثم أضف التصنيف إن احتجت.", en: "Enter the EGP amount first, then add a category if you need one." }, action: { ar: "فتح المال", en: "Open Finance" }, target: "finance" },
  { id: "day-4-focus", day: 4, icon: "timer", title: { ar: "جرّب جلسة تركيز", en: "Try a focus session" }, body: { ar: "افتح مهمة ثم ابدأ بومودورو لتمنحها وقتًا هادئًا بلا تشتيت.", en: "Open a task, then start Pomodoro to give it calm, distraction-free time." }, action: { ar: "اختر مهمة للتركيز", en: "Choose a task" }, target: "focus" },
  { id: "day-5-idea", day: 5, icon: "lightbulb", title: { ar: "لا تترك الفكرة تضيع", en: "Capture the idea" }, body: { ar: "اكتب الفكرة في سطر واحد الآن، ويمكنك تحويلها لمهمة لاحقًا.", en: "Write the idea in one line now; you can turn it into a task later." }, action: { ar: "فتح الأفكار", en: "Open ideas" }, target: "ideas" },
  { id: "day-6-advisor", day: 6, icon: "psychology", title: { ar: "اطلب خطوة عملية", en: "Ask for a practical step" }, body: { ar: "استخدم المستشار عندما تتردد بين عدة مهام أو تحتاج بداية بسيطة.", en: "Use the advisor when you are stuck between tasks or need a simple starting point." }, action: { ar: "فتح المستشار", en: "Open advisor" }, target: "advisor" },
  { id: "day-7-alerts", day: 7, icon: "notifications-active", title: { ar: "اضبط تذكيراتك", en: "Set your reminders" }, body: { ar: "راجع التنبيهات كي تصل في الوقت الذي يساعدك، لا في وقت يزعجك.", en: "Review alerts so they arrive when they help, not when they interrupt." }, action: { ar: "فتح التنبيهات", en: "Open alerts" }, target: "notifications" },
];

function startOfDayMillis(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

export function createHomeGuidanceProgress(now = new Date()): HomeGuidanceProgress {
  return { startedAt: now.toISOString(), dismissedTipIds: [], enabled: true };
}

export function getHomeGuidanceDay(progress: HomeGuidanceProgress, now = new Date()) {
  const startedAt = new Date(progress.startedAt);
  if (Number.isNaN(startedAt.getTime())) return 1;
  return Math.max(1, Math.floor((startOfDayMillis(now) - startOfDayMillis(startedAt)) / 86_400_000) + 1);
}

export function getActiveHomeGuidanceTip(progress: HomeGuidanceProgress, now = new Date()) {
  if (!progress.enabled) return null;
  const day = getHomeGuidanceDay(progress, now);
  return HOME_GUIDANCE_TIPS.find((tip) => tip.day === day && !progress.dismissedTipIds.includes(tip.id)) ?? null;
}

export function dismissHomeGuidanceTip(progress: HomeGuidanceProgress, tipId: string): HomeGuidanceProgress {
  if (progress.dismissedTipIds.includes(tipId)) return progress;
  return { ...progress, dismissedTipIds: [...progress.dismissedTipIds, tipId] };
}

export function setHomeGuidanceEnabled(progress: HomeGuidanceProgress, enabled: boolean): HomeGuidanceProgress {
  return progress.enabled === enabled ? progress : { ...progress, enabled };
}

export function restartHomeGuidance(now = new Date()): HomeGuidanceProgress {
  return createHomeGuidanceProgress(now);
}

function storageKey(scope: string) {
  return `omni-life:home-guidance:v1:${scope.trim().toLowerCase()}`;
}

export async function loadHomeGuidanceProgress(scope: string, now = new Date()): Promise<HomeGuidanceProgress> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(scope));
    if (!raw) return createHomeGuidanceProgress(now);
    const parsed = JSON.parse(raw) as Partial<HomeGuidanceProgress>;
    if (typeof parsed.startedAt !== "string" || !Array.isArray(parsed.dismissedTipIds) || !parsed.dismissedTipIds.every((id) => typeof id === "string")) return createHomeGuidanceProgress(now);
    return { startedAt: parsed.startedAt, dismissedTipIds: parsed.dismissedTipIds, enabled: parsed.enabled !== false };
  } catch {
    return createHomeGuidanceProgress(now);
  }
}

export async function saveHomeGuidanceProgress(scope: string, progress: HomeGuidanceProgress) {
  await AsyncStorage.setItem(storageKey(scope), JSON.stringify(progress));
}
