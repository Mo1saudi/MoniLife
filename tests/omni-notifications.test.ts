import { describe, expect, it } from "vitest";

import { buildOmniNotificationRoute, parseOmniNotificationTarget, supportsNativeNotifications } from "../lib/notification-routing";

describe("OMNI LIFE notification routing", () => {
  it("creates a target route for a task reminder", () => {
    expect(buildOmniNotificationRoute({ kind: "task", id: "task 7" })).toBe("/?screen=tasks&targetId=task+7");
  });

  it("accepts supported task, habit, and automatic routine notification payloads", () => {
    expect(parseOmniNotificationTarget({ target: { kind: "habit", id: "habit-2" } })).toEqual({ kind: "habit", id: "habit-2" });
    expect(parseOmniNotificationTarget({ target: { kind: "finance", id: "item-1" } })).toEqual({ kind: "finance", id: "item-1" });
    expect(parseOmniNotificationTarget({ target: { kind: "relationships", id: "contact-7" } })).toEqual({ kind: "relationships", id: "contact-7" });
    expect(parseOmniNotificationTarget({ target: { kind: "task", id: "" } })).toBeNull();
  });

  it("does not enable native notification APIs in the web preview", () => {
    expect(supportsNativeNotifications("web")).toBe(false);
    expect(supportsNativeNotifications("android")).toBe(true);
    expect(supportsNativeNotifications("ios")).toBe(true);
  });
});
