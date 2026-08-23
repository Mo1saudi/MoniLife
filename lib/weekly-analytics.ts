export type WeeklyPersona = "gentle" | "strict";
export type WeeklySnapshot = { completedTasks: number; delayedTasks: number; habitsCompleted: number; habitsPlanned: number; expensesEgp: number; budgetOverages: number; xpEarned: number; energyRecharge?: number; energyBalanced?: number; energyDrain?: number };
export type WeeklyReport = WeeklySnapshot & { habitRate: number; score: number; summary: string; persona: WeeklyPersona };

export function buildWeeklyReport(snapshot: WeeklySnapshot, persona: WeeklyPersona): WeeklyReport {
  const habitRate = snapshot.habitsPlanned > 0 ? Math.round((snapshot.habitsCompleted / snapshot.habitsPlanned) * 100) : 0;
  const score = Math.max(0, Math.min(100, Math.round(snapshot.completedTasks * 8 + habitRate * 0.55 - snapshot.delayedTasks * 5 - snapshot.budgetOverages * 4)));
  const energyNote = (snapshot.energyDrain ?? 0) > (snapshot.energyRecharge ?? 0)
    ? " راقب المهام المستنزفة، وخفّف واحدة منها أو انقلها إلى وقت طاقة أفضل."
    : " حافظ على هذا التوزيع المتوازن للطاقة في الأسبوع القادم.";
  const summary = persona === "gentle"
    ? `أنت أنجزت ${snapshot.completedTasks} مهامًا وحافظت على ${habitRate}% من عاداتك. خذ لحظة تقدير لجهدك، واختر خطوة صغيرة واحدة لتحسين أسبوعك القادم.${energyNote}`
    : `أنجزت ${snapshot.completedTasks} مهامًا مقابل ${snapshot.delayedTasks} مؤجلة، والتزامك بالعادات ${habitRate}%. الأسبوع القادم يحتاج قرارًا واضحًا: ابدأ بالأولوية الأعلى قبل أي مشتت.${energyNote}`;
  return { ...snapshot, habitRate, score, summary, persona };
}
