import { describe, expect, it } from "vitest";

import { buildEnergyMatrix, chooseTunnelTask, createMicroGoalTitle, getMissedTaskIds } from "../lib/behavioral-recovery";

describe("behavioral recovery engine", () => {
  it("creates a compassionate Arabic micro-goal title without treating the lapse as failure", () => {
    expect(createMicroGoalTitle("المشي المسائي", true)).toContain("نسخة مرنة 50%");
  });

  it("detects only unfinished tasks scheduled before today", () => {
    const now = new Date("2026-08-19T12:00:00.000Z");
    const result = getMissedTaskIds([
      { id: "missed", title: "A", done: false, priority: "medium", reschedules: 0, scheduledAt: "2026-08-18T18:00:00.000Z" },
      { id: "future", title: "B", done: false, priority: "high", reschedules: 0, scheduledAt: "2026-08-20T18:00:00.000Z" },
      { id: "done", title: "C", done: true, priority: "high", reschedules: 0, scheduledAt: "2026-08-18T18:00:00.000Z" },
    ], now);
    expect(result).toEqual(["missed"]);
  });

  it("selects the highest-priority pending task for Tunnel Vision", () => {
    const task = chooseTunnelTask([
      { id: "later", title: "Later", done: false, priority: "medium" as const, reschedules: 0 },
      { id: "focus", title: "Focus", done: false, priority: "high" as const, reschedules: 0 },
      { id: "complete", title: "Complete", done: true, priority: "high" as const, reschedules: 0 },
    ]);
    expect(task?.id).toBe("focus");
  });

  it("summarizes recharging, balanced, and draining task impact", () => {
    expect(buildEnergyMatrix([{ energyImpact: "recharge" }, { energyImpact: "recharge" }, { energyImpact: "drain" }, {}])).toMatchObject({ recharge: 2, balanced: 0, drain: 1, total: 3, rechargeRate: 67, drainRate: 33 });
  });
});
