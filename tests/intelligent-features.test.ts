import { describe, expect, it } from "vitest";
import { awardGamification } from "../lib/gamification";
import { parseVoiceQuickIntent } from "../lib/voice-intent";
import { buildWeeklyReport } from "../lib/weekly-analytics";

describe("intelligent OMNI LIFE feature rules", () => {
  it("routes Arabic spoken spending to a categorized expense", () => {
    expect(parseVoiceQuickIntent("اشتريت قهوة بـ ١٢٥ جنيه")).toMatchObject({ kind: "expense", amount: 125, category: "طعام ومشروبات" });
  });
  it("creates a next-day task from a spoken tomorrow reminder", () => {
    expect(parseVoiceQuickIntent("عندي اجتماع بكرة").kind).toBe("task");
  });
  it("changes retrospective language by coaching persona", () => {
    expect(buildWeeklyReport({ completedTasks: 4, delayedTasks: 2, habitsCompleted: 5, habitsPlanned: 7, expensesEgp: 900, budgetOverages: 1, xpEarned: 80 }, "strict").summary).toContain("مؤجلة");
  });
  it("awards XP and unlocks the consistency badge", () => {
    const result = awardGamification({ xp: 490, level: 1, badges: [], completedTasks: 0, habitDays: 6, financeDays: 0 }, "habit");
    expect(result).toMatchObject({ xp: 505, level: 2, leveledUp: true });
    expect(result.newBadges).toContain("سيد الالتزام");
  });
});
