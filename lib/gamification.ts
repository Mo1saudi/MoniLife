export type GamificationState = { xp: number; level: number; badges: string[]; completedTasks: number; habitDays: number; financeDays: number };
export const XP_PER_LEVEL = 500;
export const ACHIEVEMENTS = { consistency: "سيد الالتزام", superAchiever: "المنجز الخارق", moneyMaster: "السيطرة المالية" } as const;
export type GamificationAction = "task" | "high_priority_task" | "habit" | "expense" | "idea" | "pomodoro";
const XP: Record<GamificationAction, number> = { task: 10, high_priority_task: 25, habit: 15, expense: 5, idea: 5, pomodoro: 20 };

export function awardGamification(state: GamificationState, action: GamificationAction): GamificationState & { gained: number; leveledUp: boolean; newBadges: string[] } {
  const gained = XP[action];
  const xp = state.xp + gained;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const next = { ...state, xp, level, completedTasks: state.completedTasks + (action === "task" || action === "high_priority_task" ? 1 : 0), habitDays: state.habitDays + (action === "habit" ? 1 : 0), financeDays: state.financeDays + (action === "expense" ? 1 : 0) };
  const badges = new Set(next.badges);
  if (next.habitDays >= 7) badges.add(ACHIEVEMENTS.consistency);
  if (next.completedTasks >= 50) badges.add(ACHIEVEMENTS.superAchiever);
  if (next.financeDays >= 7) badges.add(ACHIEVEMENTS.moneyMaster);
  const newBadges = [...badges].filter((badge) => !state.badges.includes(badge));
  return { ...next, badges: [...badges], gained, leveledUp: level > state.level, newBadges };
}
