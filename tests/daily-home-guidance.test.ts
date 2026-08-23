import { describe, expect, it } from "vitest";

import { buildEveningReviewSummary, getDailyEncouragement, prioritizeTasksForToday } from "../lib/daily-home-guidance";

describe("daily home guidance", () => {
  it("returns a stable date-driven encouragement for the same day", () => {
    const day = new Date("2026-08-19T09:00:00.000Z");
    expect(getDailyEncouragement(day)).toBe(getDailyEncouragement(day));
  });

  it("prioritizes demanding tasks with high energy and lighter tasks with low energy", () => {
    const tasks = [
      { id: "high", energy: "high" as const, priority: "high" as const, done: false },
      { id: "low", energy: "low" as const, priority: "medium" as const, done: false },
    ];
    expect(prioritizeTasksForToday(tasks, "high", "good")[0]?.id).toBe("high");
    expect(prioritizeTasksForToday(tasks, "low", "low")[0]?.id).toBe("low");
  });

  it("includes the completed task count and recorded EGP expenses in the evening review", () => {
    const summary = buildEveningReviewSummary({ completedTasks: 3, expenseEgp: 245, isArabic: true });
    expect(summary).toContain("أنجزت 3 مهمة");
    expect(summary).toContain((245).toLocaleString("ar-EG"));
    expect(summary).toContain("ج.م");
  });
});
