import { pickNotificationVariation } from "./notification-rotation";

export type DailyNotificationSummary = { taskTitles?: string[]; habitTitles?: string[]; completedTasks?: number; completedHabits?: number; tasksPlanned?: number; habitsPlanned?: number };

export function notificationDisplayName(userName = "") {
  return userName.trim().split(/\s+/).filter(Boolean).slice(0, 2).join(" ");
}

function greetingPrefix(isArabic: boolean, userName: string, time: "morning" | "evening") {
  const name = notificationDisplayName(userName);
  if (!name) return isArabic ? (time === "morning" ? "صباح الخير" : "مساء الخير") : (time === "morning" ? "Good morning" : "Good evening");
  return isArabic ? `${time === "morning" ? "صباح الخير" : "مساء الخير"} يا ${name}` : `${time === "morning" ? "Good morning" : "Good evening"}, ${name}`;
}

function listed(items: string[] | undefined, isArabic: boolean) {
  const values = (items ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 2);
  if (!values.length) return "";
  return values.join(isArabic ? " و" : " and ");
}

export function buildWelcomeNotificationCopy(isArabic: boolean, userName: string) {
  const name = notificationDisplayName(userName);
  return isArabic
    ? { title: name ? `نورتنا يا ${name}` : "نورتنا في OMNI LIFE", body: name ? `${name}، رتّب يومك على مهل: مهمة واحدة وعادة صغيرة كبداية كافيتان.` : "رتّب يومك على مهل: مهمة واحدة وعادة صغيرة كبداية كافيتان." }
    : { title: name ? `Welcome, ${name}` : "Welcome to OMNI LIFE", body: name ? `${name}, start gently: one task and one small habit are enough for today.` : "Start gently: one task and one small habit are enough for today." };
}

export function buildMorningSummaryCopy(isArabic: boolean, userName: string, summary: DailyNotificationSummary = {}, key = "morning") {
  const taskList = listed(summary.taskTitles, isArabic);
  const habitList = listed(summary.habitTitles, isArabic);
  const title = greetingPrefix(isArabic, userName, "morning");
  const arabicOptions = [
    `عندك اليوم ${taskList ? `مهام مثل ${taskList}` : `${summary.tasksPlanned ?? 0} مهام`}، و${habitList ? `عادات مثل ${habitList}` : `${summary.habitsPlanned ?? 0} عادات`}. ابدأ بخطوة صغيرة.`,
    `اليوم ينتظرك ${taskList || `${summary.tasksPlanned ?? 0} مهام`} و${habitList || `${summary.habitsPlanned ?? 0} عادات`}. اختر الأسهل للانطلاق.`,
    `خطتك اليوم: ${taskList || `${summary.tasksPlanned ?? 0} مهام`} مع ${habitList || `${summary.habitsPlanned ?? 0} عادات`}. البداية الهادئة تصنع فرقًا.`,
  ];
  const englishOptions = [
    `Today you have ${taskList ? `tasks such as ${taskList}` : `${summary.tasksPlanned ?? 0} tasks`} and ${habitList ? `habits such as ${habitList}` : `${summary.habitsPlanned ?? 0} habits`}. Start with one small step.`,
    `Your day includes ${taskList || `${summary.tasksPlanned ?? 0} tasks`} and ${habitList || `${summary.habitsPlanned ?? 0} habits`}. Choose the easiest way in.`,
    `Today’s plan: ${taskList || `${summary.tasksPlanned ?? 0} tasks`} with ${habitList || `${summary.habitsPlanned ?? 0} habits`}. A calm start makes a difference.`,
  ];
  return { title, body: pickNotificationVariation(isArabic ? arabicOptions : englishOptions, key) };
}

export function buildEveningSummaryCopy(isArabic: boolean, userName: string, summary: DailyNotificationSummary = {}, key = "evening") {
  const title = greetingPrefix(isArabic, userName, "evening");
  const arabicOptions = [
    `أنجزت اليوم ${summary.completedTasks ?? 0} من ${summary.tasksPlanned ?? 0} مهام و${summary.completedHabits ?? 0} من ${summary.habitsPlanned ?? 0} عادات. اكتب ما تريد تركه للغد ثم ارتح.`,
    `حصيلة اليوم: ${summary.completedTasks ?? 0} مهام مكتملة و${summary.completedHabits ?? 0} عادات مكتملة. رتّب خطوة الغد بهدوء.`,
    `قبل أن ينتهي اليوم: تقدمت في ${summary.completedTasks ?? 0} مهام و${summary.completedHabits ?? 0} عادات. يكفي الآن أن تفرغ ذهنك للغد.`,
  ];
  const englishOptions = [
    `Today you completed ${summary.completedTasks ?? 0} of ${summary.tasksPlanned ?? 0} tasks and ${summary.completedHabits ?? 0} of ${summary.habitsPlanned ?? 0} habits. Note what belongs to tomorrow, then rest.`,
    `Today’s result: ${summary.completedTasks ?? 0} completed tasks and ${summary.completedHabits ?? 0} completed habits. Set up one calm step for tomorrow.`,
    `Before the day ends: you moved ${summary.completedTasks ?? 0} tasks and ${summary.completedHabits ?? 0} habits forward. A quick brain dump is enough for tomorrow.`,
  ];
  return { title, body: pickNotificationVariation(isArabic ? arabicOptions : englishOptions, key) };
}

export function personalizeReminderBody(isArabic: boolean, userName: string, body: string) {
  const name = notificationDisplayName(userName);
  if (!name) return body;
  return isArabic ? `${name}، ${body}` : `${name}, ${body}`;
}
