import AsyncStorage from "@react-native-async-storage/async-storage";

export type LifeRecordKind = "task" | "habit" | "idea" | "expense" | "goal" | "person" | "note" | "archive";
export type LifeRecord = { id: string; kind: LifeRecordKind; title: string; detail?: string | null; done?: boolean; createdAt?: string | Date | null; scheduledAt?: string | Date | null; tags?: string[] };
export type PinnedItem = { id: string; kind: LifeRecordKind; title: string; position: number; pinnedAt: string };
export type QuickCaptureType = "task" | "expense" | "habit" | "goal" | "idea";
export type QuickCapturePreview = { type: QuickCaptureType; title: string; amount?: number; dateHint?: "today" | "tomorrow" | "this_week" | null; confidence: "high" | "medium" };
export type SyncSnapshot = { status: "offline" | "synced" | "syncing" | "issue"; lastSyncedAt: string | null; pendingChanges: number; errorMessage: string | null };

const pinnedKey = (scope: string) => `omni-life:pinned:${encodeURIComponent(scope.trim().toLowerCase() || "local")}`;
const syncKey = (scope: string) => `omni-life:sync:${encodeURIComponent(scope.trim().toLowerCase() || "local")}`;

export function normalizeSearchText(value: unknown) {
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/\s+/g, " ").trim();
}

export function classifyQuickCapture(input: string): QuickCapturePreview | null {
  const text = input.trim().replace(/\s+/g, " ");
  if (text.length < 2) return null;
  const normalized = normalizeSearchText(text);
  const amountMatch = normalized.match(/(?:دفع(?:ت)?|مصروف|expense|spent|paid)\s*(?:جنيه|ج\.م|egp)?\s*([0-9٠-٩]+(?:[.,][0-9٠-٩]+)?)/i) ?? normalized.match(/([0-9٠-٩]+(?:[.,][0-9٠-٩]+)?)\s*(?:جنيه|ج\.م|egp)/i);
  const amount = amountMatch ? Number(String(amountMatch[1]).replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(",", ".")) : undefined;
  if (amount !== undefined && Number.isFinite(amount)) {
    const cleaned = text.replace(amountMatch?.[0] ?? "", "").replace(/^(دفعت|دفع|مصروف|expense|spent|paid)\s*/i, "").trim();
    return { type: "expense", title: cleaned || "مصروف سريع", amount, confidence: "high" };
  }
  const dateHint = /بكره|غدا|غدًا|tomorrow/i.test(normalized) ? "tomorrow" : /اليوم|today/i.test(normalized) ? "today" : /الاسبوع|هذا الاسبوع|this week/i.test(normalized) ? "this_week" : null;
  const cleaned = text.replace(/(بكره|غدا|غدًا|اليوم|today|tomorrow|this week)/gi, "").replace(/\s+/g, " ").trim();
  if (["عادة", "habit", "كل يوم", "يوميا", "يوميًا"].some((keyword) => normalized.includes(keyword))) return { type: "habit", title: cleaned.replace(/^(عادة|habit)\s*/i, "").trim() || text, dateHint, confidence: "medium" };
  if (["هدف", "اهدافي", "اريد تعلم", "goal", "learn"].some((keyword) => normalized.includes(keyword))) return { type: "goal", title: cleaned.replace(/^(هدف|goal)\s*/i, "").trim() || text, dateHint, confidence: "medium" };
  if (["فكرة", "idea", "ملاحظة", "note"].some((keyword) => normalized.includes(keyword))) return { type: "idea", title: cleaned.replace(/^(فكرة|idea|ملاحظة|note)\s*/i, "").trim() || text, dateHint, confidence: "medium" };
  return { type: "task", title: cleaned || text, dateHint, confidence: dateHint ? "high" : "medium" };
}

export function buildSearchResults(query: string, records: LifeRecord[], kind: LifeRecordKind | "all" = "all") {
  const needle = normalizeSearchText(query);
  if (!needle) return [];
  return records.filter((record) => (kind === "all" || record.kind === kind) && normalizeSearchText(`${record.title} ${record.detail ?? ""} ${(record.tags ?? []).join(" ")}`).includes(needle)).slice(0, 50);
}

export async function loadPinnedItems(scope: string): Promise<PinnedItem[]> {
  try {
    const raw = await AsyncStorage.getItem(pinnedKey(scope));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is PinnedItem => Boolean(item && typeof item.id === "string" && typeof item.title === "string" && typeof item.kind === "string")).sort((a, b) => a.position - b.position) : [];
  } catch { return []; }
}

export async function savePinnedItems(scope: string, items: PinnedItem[]) {
  await AsyncStorage.setItem(pinnedKey(scope), JSON.stringify(items.map((item, index) => ({ ...item, position: index }))));
}

export function togglePinnedItem(items: PinnedItem[], record: LifeRecord): PinnedItem[] {
  const exists = items.some((item) => item.id === record.id && item.kind === record.kind);
  if (exists) return items.filter((item) => !(item.id === record.id && item.kind === record.kind)).map((item, index) => ({ ...item, position: index }));
  return [...items, { id: record.id, kind: record.kind, title: record.title, position: items.length, pinnedAt: new Date().toISOString() }];
}

export function movePinnedItem(items: PinnedItem[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next.map((item, itemIndex) => ({ ...item, position: itemIndex }));
}

export function buildReviewSummary(records: LifeRecord[], now = new Date()) {
  const start = new Date(now); start.setDate(now.getDate() - 6); start.setHours(0, 0, 0, 0);
  const scoped = records.filter((record) => { const date = record.createdAt ? new Date(record.createdAt) : null; return !date || Number.isNaN(date.getTime()) || date >= start; });
  const tasks = scoped.filter((record) => record.kind === "task");
  const habits = scoped.filter((record) => record.kind === "habit");
  return { tasksCompleted: tasks.filter((record) => record.done).length, tasksRemaining: tasks.filter((record) => !record.done).length, habitConsistency: habits.length ? Math.round((habits.filter((record) => record.done).length / habits.length) * 100) : null, recordsConsidered: scoped.length };
}

export function buildMonthlyReviewSummary(records: LifeRecord[], now = new Date()) {
  const start = new Date(now); start.setDate(now.getDate() - 29); start.setHours(0, 0, 0, 0);
  const scoped = records.filter((record) => { const date = record.createdAt ? new Date(record.createdAt) : null; return !date || Number.isNaN(date.getTime()) || date >= start; });
  return { ...buildReviewSummary(scoped, now), ideasCaptured: scoped.filter((record) => record.kind === "idea").length, expensesTracked: scoped.filter((record) => record.kind === "expense").length, peopleTouched: scoped.filter((record) => record.kind === "person").length };
}

export function getGoalHealth(record: LifeRecord, now = new Date()) {
  if (record.done) return { status: "completed" as const, reason: "Completed", action: "Celebrate the completed milestone." };
  const due = record.scheduledAt ? new Date(record.scheduledAt) : null;
  if (due && !Number.isNaN(due.getTime()) && due < now) return { status: "at_risk" as const, reason: "The linked item is past its scheduled date.", action: "Review the next smallest action." };
  return { status: "active" as const, reason: due ? "The scheduled date has not passed." : "No deadline is available, so it is not marked late.", action: "Choose one small next step." };
}

export const SMART_HELP_ARTICLES = [
  { id: "task", keywords: ["task", "مهمه", "مهمة", "اضيف", "أضيف"], titleAr: "إضافة Task", titleEn: "Add a task", stepsAr: ["افتح Home أو Tasks.", "اضغط إضافة مهمة.", "اكتب العنوان واحفظه."], stepsEn: ["Open Home or Tasks.", "Tap Add task.", "Write the title and save."] },
  { id: "telegram", keywords: ["telegram", "تليجرام", "بوت", "يربط"], titleAr: "ربط Telegram", titleEn: "Connect Telegram", stepsAr: ["افتح Settings ثم Profile.", "اضغط إنشاء رمز Telegram وانسخه.", "افتح البوت وأرسل /start ثم الرمز."], stepsEn: ["Open Settings then Profile.", "Create and copy the Telegram code.", "Open the bot and send /start followed by the code."] },
  { id: "password", keywords: ["password", "كلمه السر", "كلمة السر", "pin", "رمز"], titleAr: "تغيير PIN", titleEn: "Change PIN", stepsAr: ["افتح Settings ثم Profile.", "اختر تغيير PIN.", "أدخل PIN الحالي والجديد ثم احفظ."], stepsEn: ["Open Settings then Profile.", "Choose Change PIN.", "Enter the current and new PIN, then save."] },
  { id: "finance", keywords: ["budget", "ميزانيه", "ميزانية", "مصروف", "finance"], titleAr: "الميزانية والماليات", titleEn: "Budget and finance", stepsAr: ["افتح قسم Finance.", "أضف المصروف أو الالتزام الدوري.", "راجع الملخص قبل اعتماد أي تغيير."], stepsEn: ["Open Finance.", "Add an expense or recurring commitment.", "Review the summary before confirming changes."] },
  { id: "pomodoro", keywords: ["pomodoro", "تركيز", "focus", "بومودورو"], titleAr: "استخدام Pomodoro", titleEn: "Use Pomodoro", stepsAr: ["افتح Tasks لجلسة مرتبطة بمهمة.", "استخدم جلسة العادات المستقلة عندما لا تريد ربطها بمهمة.", "أوقف الجلسة أو أكملها من عناصر التحكم المتاحة."], stepsEn: ["Open Tasks for a task-linked session.", "Use the independent habits session when no task link is wanted.", "Pause or complete the session from the available controls."] },
];

export function findSmartHelp(query: string, currentKind?: LifeRecordKind) {
  const normalized = normalizeSearchText(query);
  const contextual = currentKind ? SMART_HELP_ARTICLES.find((article) => article.id === currentKind) : undefined;
  return contextual ?? SMART_HELP_ARTICLES.find((article) => article.keywords.some((keyword) => normalized.includes(normalizeSearchText(keyword)))) ?? null;
}

export async function loadSyncSnapshot(scope: string): Promise<SyncSnapshot> {
  try { const raw = await AsyncStorage.getItem(syncKey(scope)); const parsed = raw ? JSON.parse(raw) : null; if (parsed && typeof parsed.status === "string") return parsed as SyncSnapshot; } catch { /* use safe default */ }
  return { status: "synced", lastSyncedAt: null, pendingChanges: 0, errorMessage: null };
}

export async function saveSyncSnapshot(scope: string, snapshot: SyncSnapshot) { await AsyncStorage.setItem(syncKey(scope), JSON.stringify(snapshot)); }
