import { describe, expect, it } from "vitest";

import { createHomeGuidanceProgress, dismissHomeGuidanceTip, getActiveHomeGuidanceTip, getHomeGuidanceDay, restartHomeGuidance, setHomeGuidanceEnabled } from "../lib/home-guidance";

describe("seven-day home guidance", () => {
  const start = new Date("2026-08-01T10:00:00.000Z");

  it("selects one contextual tip for each day of the first week", () => {
    const progress = createHomeGuidanceProgress(start);
    expect(getHomeGuidanceDay(progress, new Date("2026-08-01T22:00:00.000Z"))).toBe(1);
    expect(getActiveHomeGuidanceTip(progress, new Date("2026-08-04T12:00:00.000Z"))?.id).toBe("day-4-focus");
    expect(getActiveHomeGuidanceTip(progress, new Date("2026-08-08T12:00:00.000Z"))).toBeNull();
  });

  it("keeps a dismissed tip from returning", () => {
    const progress = createHomeGuidanceProgress(start);
    const dismissed = dismissHomeGuidanceTip(progress, "day-1-priority");
    expect(getActiveHomeGuidanceTip(dismissed, new Date("2026-08-01T22:00:00.000Z"))).toBeNull();
    expect(dismissHomeGuidanceTip(dismissed, "day-1-priority")).toEqual(dismissed);
  });

  it("can be disabled and restarted from Settings", () => {
    const progress = createHomeGuidanceProgress(start);
    expect(getActiveHomeGuidanceTip(setHomeGuidanceEnabled(progress, false), new Date("2026-08-01T22:00:00.000Z"))).toBeNull();
    expect(restartHomeGuidance(new Date("2026-08-10T09:00:00.000Z"))).toEqual({ startedAt: "2026-08-10T09:00:00.000Z", dismissedTipIds: [], enabled: true });
  });
});
