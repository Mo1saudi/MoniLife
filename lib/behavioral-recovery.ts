export type IfThenPlan = {
  ifCondition: string;
  thenAction: string;
};

export type EnergyImpact = "recharge" | "balanced" | "drain";

export type BehaviorTaskLike = {
  id: string;
  title: string;
  done: boolean;
  priority: "high" | "medium";
  scheduledAt?: string;
  reschedules: number;
  isMicroGoal?: boolean;
  energyImpact?: EnergyImpact;
};

export function createMicroGoalTitle(title: string, isArabic: boolean) {
  return isArabic ? `نسخة مرنة 50%: ${title}` : `Flexible 50% version: ${title}`;
}

export function getMissedTaskIds(tasks: BehaviorTaskLike[], now = new Date()) {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  return tasks
    .filter((task) => !task.done && task.scheduledAt && new Date(task.scheduledAt).getTime() < todayStart.getTime())
    .map((task) => task.id);
}

export function chooseTunnelTask<T extends BehaviorTaskLike>(tasks: T[]): T | null {
  return [...tasks]
    .filter((task) => !task.done)
    .sort((a, b) => {
      const priority = (b.priority === "high" ? 1 : 0) - (a.priority === "high" ? 1 : 0);
      if (priority) return priority;
      const aDate = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bDate = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
      return aDate - bDate;
    })[0] ?? null;
}

export function buildEnergyMatrix(tasks: Array<Pick<BehaviorTaskLike, "energyImpact">>) {
  const recharge = tasks.filter((task) => task.energyImpact === "recharge").length;
  const balanced = tasks.filter((task) => task.energyImpact === "balanced").length;
  const drain = tasks.filter((task) => task.energyImpact === "drain").length;
  const total = recharge + balanced + drain;
  return {
    recharge,
    balanced,
    drain,
    total,
    rechargeRate: total ? Math.round((recharge / total) * 100) : 0,
    drainRate: total ? Math.round((drain / total) * 100) : 0,
  };
}

export function tomorrowAt(hour: number, minute: number) {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hour, minute, 0, 0);
  return date;
}
