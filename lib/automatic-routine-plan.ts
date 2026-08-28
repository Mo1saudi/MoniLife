import { DEFAULT_NOTIFICATION_DENSITY_PREFERENCES, getSectionNotificationDensity, type NotificationDensityPreferences } from "./notification-density";
import { pickNotificationVariation } from "./notification-rotation";
import { buildMorningSummaryCopy, type DailyNotificationSummary } from "./personalized-notification-copy";

export const AUTOMATIC_ROUTINE_DAYS = 12;

export type AutomaticRoutineReminder = { id: string; at: Date; repeat: "daily" | "weekly"; section: "tasks" | "habits" | "finance" | "persona"; title: string; body: string };

export function buildAutomaticRoutineSlots(now: Date, days = AUTOMATIC_ROUTINE_DAYS) {
  const slots: Array<{ offset: number; at: Date }> = [];
  for (let offset = 0; offset < days; offset += 1) {
    const at = new Date(now);
    at.setDate(now.getDate() + offset);
    at.setHours(9, 0, 0, 0);
    if (at.getTime() > now.getTime()) slots.push({ offset, at });
  }
  return slots;
}

export function buildAutomaticRoutineDigest(isArabic: boolean, userName = "", summary: DailyNotificationSummary = {}, key = "daily-omni-digest") {
  return buildMorningSummaryCopy(isArabic, userName, summary, key);
}

function nextOccurrence(now: Date, weekday: number | null, hour: number, minute: number) {
  const at = new Date(now);
  at.setSeconds(0, 0);
  if (weekday === null) {
    at.setHours(hour, minute, 0, 0);
    if (at.getTime() <= now.getTime()) at.setDate(at.getDate() + 1);
    return at;
  }
  const offset = (weekday - at.getDay() + 7) % 7;
  at.setDate(at.getDate() + offset);
  at.setHours(hour, minute, 0, 0);
  if (at.getTime() <= now.getTime()) at.setDate(at.getDate() + 7);
  return at;
}

function rotateRoutineCopy(section: AutomaticRoutineReminder["section"], fallback: { title: string; body: string }, isArabic: boolean, key: string) {
  const options = isArabic
    ? {
      tasks: [fallback, { title: "خطوة واحدة تكفي", body: "افتح مهامك واختر أقرب خطوة قابلة للتنفيذ الآن، ثم ابدأ لخمس دقائق." }, { title: "خفّف قائمة اليوم", body: "رتّب مهمة واحدة أو أنجز جزءًا صغيرًا منها؛ التقدم الهادئ يراكم فرقًا." }],
      habits: [fallback, { title: "علامة صغيرة في سلسلة عاداتك", body: "سجّل عادة واحدة اليوم لتبقى السلسلة حيّة من دون ضغط." }, { title: "موعد بسيط لعادتك", body: "اختر أقل نسخة من عادتك وافعلها الآن؛ الاستمرار أهم من الكمال." }],
      finance: [fallback, { title: "لمحة سريعة على الماليات", body: "راجع آخر عملية أو التزامًا قريبًا لتبقى ميزانيتك تحت السيطرة." }, { title: "قرار مالي صغير اليوم", body: "افتح الماليات وحدد خطوة واحدة: تصنيف عملية، مراجعة حد، أو تأجيل مصروف." }],
      persona: [fallback, { title: "دقيقة لنفسك", body: "افتح OMNI LIFE واختر شيئًا واحدًا يستحق انتباهك اليوم." }, { title: "مساحة لترتيب الاتجاه", body: "راجع فكرة أو علاقة أو أولوية واحدة، ثم خذ قرارًا بسيطًا ومناسبًا." }],
    }
    : {
      tasks: [fallback, { title: "One step is enough", body: "Open Tasks, choose the nearest actionable step, and start for five minutes." }, { title: "Lighten today’s list", body: "Arrange one task or finish a small part of it; calm progress compounds." }],
      habits: [fallback, { title: "A small mark on your habit streak", body: "Log one habit today to keep your streak alive without pressure." }, { title: "A simple moment for your habit", body: "Choose the smallest version of your habit and do it now; consistency beats perfection." }],
      finance: [fallback, { title: "A quick look at your money", body: "Review a recent transaction or upcoming commitment to keep your budget in view." }, { title: "One small money decision", body: "Open Finance and take one action: categorize, review a limit, or postpone an expense." }],
      persona: [fallback, { title: "One minute for you", body: "Open OMNI LIFE and choose one thing that deserves your attention today." }, { title: "Space to set your direction", body: "Review one idea, relationship, or priority, then take a small appropriate decision." }],
    };
  return pickNotificationVariation(options[section], key);
}

/** A compact recurring cadence: one daily app check-in plus focused weekly prompts, with rotating wording. */
export function buildRecurringRoutineReminders(now: Date, isArabic: boolean, userName = "", densityPreferences: NotificationDensityPreferences = DEFAULT_NOTIFICATION_DENSITY_PREFERENCES, summary: DailyNotificationSummary = {}): AutomaticRoutineReminder[] {
  const daily = buildAutomaticRoutineDigest(isArabic, userName, summary, `daily-omni-digest:${now.toISOString().slice(0, 10)}`);
  const templates = isArabic ? [
    { id: "daily-omni-digest", weekday: null, hour: 9, minute: 0, section: "persona" as const, level: "calm" as const, title: daily.title, body: daily.body },
    { id: "weekly-tasks", weekday: 1, hour: 10, minute: 0, section: "tasks" as const, level: "balanced" as const, title: "ابدأ بالأهم", body: "افتح المهام، واختر خطوة واحدة ذات قيمة، وابدأ بها لخمس دقائق فقط." },
    { id: "weekly-tasks-followup", weekday: 5, hour: 18, minute: 0, section: "tasks" as const, level: "focused" as const, title: "عودة سريعة لمهامك", body: "افتح المهام وأنهِ أو رتّب خطوة واحدة قبل نهاية الأسبوع." },
    { id: "weekly-habits", weekday: 3, hour: 18, minute: 0, section: "habits" as const, level: "balanced" as const, title: "متابعة خفيفة لعاداتك", body: "افتح العادات وحدد إنجازًا واحدًا يحافظ على استمراريتك." },
    { id: "weekly-habits-followup", weekday: 6, hour: 10, minute: 0, section: "habits" as const, level: "focused" as const, title: "دفعة صغيرة لعاداتك", body: "اختر عادة واحدة سهلة الآن لتبدأ بقية يومك بإيقاع جيد." },
    { id: "weekly-finance", weekday: 5, hour: 15, minute: 0, section: "finance" as const, level: "balanced" as const, title: "مراجعة مالية سريعة", body: "افتح الماليات وراجع إنفاقك قبل أن ينتهي الأسبوع دون انتباه." },
    { id: "weekly-finance-followup", weekday: 0, hour: 17, minute: 0, section: "finance" as const, level: "focused" as const, title: "دقيقة لترتيب مالك", body: "راجع آخر مصروف أو حدك اليومي واتخذ قرارًا صغيرًا مناسبًا." },
    { id: "weekly-life-review", weekday: 6, hour: 17, minute: 0, section: "persona" as const, level: "balanced" as const, title: "مساحة لما يهمك", body: "افتح OMNI LIFE وراجع فكرة أو علاقة أو خطوتك التالية في الحياة." },
    { id: "weekly-life-review-followup", weekday: 2, hour: 17, minute: 0, section: "persona" as const, level: "focused" as const, title: "توقف قصير لنفسك", body: "دقيقة في OMNI LIFE تكفي لاختيار اتجاه يومك التالي." },
  ] : [
    { id: "daily-omni-digest", weekday: null, hour: 9, minute: 0, section: "persona" as const, level: "calm" as const, title: daily.title, body: daily.body },
    { id: "weekly-tasks", weekday: 1, hour: 10, minute: 0, section: "tasks" as const, level: "balanced" as const, title: "Start with one priority", body: "Open Tasks, choose one meaningful step, and begin for just five minutes." },
    { id: "weekly-tasks-followup", weekday: 5, hour: 18, minute: 0, section: "tasks" as const, level: "focused" as const, title: "A quick task return", body: "Open Tasks and complete or arrange one step before the week ends." },
    { id: "weekly-habits", weekday: 3, hour: 18, minute: 0, section: "habits" as const, level: "balanced" as const, title: "A small habit check-in", body: "Open Habits and mark one action that keeps your streak moving." },
    { id: "weekly-habits-followup", weekday: 6, hour: 10, minute: 0, section: "habits" as const, level: "focused" as const, title: "A small habits boost", body: "Choose one easy habit now to start the rest of your day well." },
    { id: "weekly-finance", weekday: 5, hour: 15, minute: 0, section: "finance" as const, level: "balanced" as const, title: "A quick money check", body: "Open Finance and review spending before the week gets away from you." },
    { id: "weekly-finance-followup", weekday: 0, hour: 17, minute: 0, section: "finance" as const, level: "focused" as const, title: "One minute for your money", body: "Review a recent expense or daily limit and make one helpful decision." },
    { id: "weekly-life-review", weekday: 6, hour: 17, minute: 0, section: "persona" as const, level: "balanced" as const, title: "Make space for what matters", body: "Open OMNI LIFE to revisit an idea, relationship, or your next life step." },
    { id: "weekly-life-review-followup", weekday: 2, hour: 17, minute: 0, section: "persona" as const, level: "focused" as const, title: "A short pause for you", body: "A minute in OMNI LIFE is enough to choose the direction of your next step." },
  ];
  const rank = { calm: 1, balanced: 2, focused: 3 } as const;
  return templates.flatMap((template) => {
    const density = getSectionNotificationDensity(densityPreferences, template.section);
    if (density === "off" || rank[density] < rank[template.level]) return [];
    const at = nextOccurrence(now, template.weekday, template.hour, template.minute);
    const copy = rotateRoutineCopy(template.section, { title: template.title, body: template.body }, isArabic, `${template.id}:${at.toISOString().slice(0, 10)}`);
    return [{ id: template.id, at, repeat: template.weekday === null ? "daily" : "weekly", section: template.section, title: copy.title, body: copy.body }];
  });
}
