import { describe, expect, it } from "vitest";

import { habitDailyTarget, normalizeTaskReminderOffsets, taskReminderDate, taskReminderLimit } from "../lib/task-habit-rules";

describe("task and habit planning rules", () => {
  it("limits Free accounts to two unique task reminder offsets", () => {
    expect(taskReminderLimit(false)).toBe(2);
    expect(normalizeTaskReminderOffsets(["at_time", "15m", "1h", "15m"], false)).toEqual(["at_time", "15m"]);
  });

  it("keeps all selected offsets for paid accounts and calculates due-time offsets accurately", () => {
    const dueAt = new Date("2026-08-19T12:00:00.000Z");
    expect(normalizeTaskReminderOffsets(["at_time", "15m", "1h", "2h", "24h"], true)).toHaveLength(5);
    expect(taskReminderDate(dueAt, "2h").toISOString()).toBe("2026-08-19T10:00:00.000Z");
    expect(taskReminderDate(dueAt, "24h").toISOString()).toBe("2026-08-18T12:00:00.000Z");
  });

  it("requires multiple daily habit completions only for paid plans", () => {
    expect(habitDailyTarget(["2026-08-19T08:00:00.000Z", "2026-08-19T20:00:00.000Z"], false)).toBe(1);
    expect(habitDailyTarget(["2026-08-19T08:00:00.000Z", "2026-08-19T20:00:00.000Z"], true)).toBe(2);
  });
});
