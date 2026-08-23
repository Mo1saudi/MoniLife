import { describe, expect, it } from "vitest";
import { isSleepModeActive, normalizeSleepModePreferences } from "../lib/sleep-mode";

describe("Sleep Mode quiet hours", () => {
  const enabled = normalizeSleepModePreferences({ enabled: true, startsAtMinutes: 23 * 60, endsAtMinutes: 7 * 60 });

  it("treats overnight hours as a very quiet window", () => {
    expect(isSleepModeActive(enabled, new Date(2026, 0, 1, 23, 0))).toBe(true);
    expect(isSleepModeActive(enabled, new Date(2026, 0, 2, 6, 59))).toBe(true);
    expect(isSleepModeActive(enabled, new Date(2026, 0, 2, 7, 0))).toBe(false);
    expect(isSleepModeActive(enabled, new Date(2026, 0, 1, 22, 59))).toBe(false);
  });

  it("normalizes invalid time preferences and leaves disabled mode inactive", () => {
    const normalized = normalizeSleepModePreferences({ enabled: false, startsAtMinutes: -1, endsAtMinutes: 1500 });
    expect(normalized).toMatchObject({ enabled: false, startsAtMinutes: 1380, endsAtMinutes: 420 });
    expect(isSleepModeActive(normalized, new Date(2026, 0, 1, 0, 0))).toBe(false);
  });
});
