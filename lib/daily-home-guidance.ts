export type DailyEnergyLevel = "high" | "low";
export type DailyMood = "good" | "low";

export type PrioritizableTask = {
  id: string;
  energy: "high" | "medium" | "low";
  priority: "high" | "medium";
  done: boolean;
};

const encouragements = [
  "خطوة واحدة هادئة اليوم يمكن أن تغيّر إيقاع أسبوعك كله.",
  "لا تحتاج إلى يوم مثالي؛ ابدأ بالشيء الصغير الذي يخدمك الآن.",
  "التركيز لا يعني فعل كل شيء، بل اختيار الشيء الأهم بلطف.",
  "التقدم الصغير المتكرر أقوى من الحماس القصير.",
  "امنح يومك بداية واضحة، وستصبح بقية الخطوات أسهل.",
  "حتى في الأيام الثقيلة، إنجاز بسيط هو انتصار حقيقي.",
  "رتّب طاقتك أولًا، ثم دع مهامك تتبعها.",
  "اليوم فرصة جديدة لبناء حياة متوازنة خطوة بعد خطوة.",
  "اختر أولوية واحدة؛ البساطة تفتح الطريق للإنجاز.",
  "التوقف القصير ليس تأخيرًا؛ إنه مساحة لاستعادة تركيزك.",
];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function hash(value: string) {
  return [...value].reduce((total, char) => ((total * 31) + char.charCodeAt(0)) >>> 0, 7);
}

export function getDailyEncouragement(date = new Date()) {
  return encouragements[hash(dateKey(date)) % encouragements.length];
}

export function prioritizeTasksForToday<T extends PrioritizableTask>(tasks: T[], energy: DailyEnergyLevel, mood: DailyMood) {
  const score = (task: T) => {
    if (task.done) return -100;
    let value = task.priority === "high" ? 30 : 16;
    value += energy === "high" ? task.energy === "high" ? 14 : task.energy === "medium" ? 7 : 2 : task.energy === "low" ? 14 : task.energy === "medium" ? 7 : 2;
    value += mood === "good" ? task.priority === "high" ? 6 : 2 : task.energy === "low" ? 7 : -2;
    return value;
  };
  return [...tasks].sort((left, right) => score(right) - score(left));
}

export function getDailyReviewCopy(isArabic: boolean) {
  return isArabic ? "راجع مهامك ومعاملاتك المالية وأفكارك قبل أن تنهي يومك." : "Review your tasks, financial activity, and ideas before closing your day.";
}

export function buildEveningReviewSummary({ completedTasks, expenseEgp, isArabic }: { completedTasks: number; expenseEgp: number; isArabic: boolean }) {
  const safeTasks = Math.max(0, Math.floor(completedTasks));
  const safeExpenses = Math.max(0, expenseEgp);
  if (isArabic) return `أنجزت ${safeTasks} مهمة اليوم، وإجمالي المصروفات المسجلة: ${safeExpenses.toLocaleString("ar-EG")} ج.م. ${getDailyReviewCopy(true)}`;
  return `You completed ${safeTasks} task${safeTasks === 1 ? "" : "s"} today, with ${safeExpenses.toLocaleString("en-US")} EGP in recorded expenses. ${getDailyReviewCopy(false)}`;
}
