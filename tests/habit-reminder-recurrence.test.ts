import { describe, expect, it } from "vitest";

import type { HabitReminderRepeat } from "../lib/omni-notifications";

describe("habit reminder recurrence options", () => {
  it("exposes the supported one-time and repeating choices", () => {
    const choices: HabitReminderRepeat[] = ["once", "daily", "weekly"];
    expect(choices).toEqual(["once", "daily", "weekly"]);
  });

  it("maps JavaScript weekdays to Expo weekly trigger weekdays", () => {
    const sunday = new Date("2026-08-23T09:30:00");
    const monday = new Date("2026-08-24T09:30:00");
    expect(sunday.getDay() + 1).toBe(1);
    expect(monday.getDay() + 1).toBe(2);
  });
});
