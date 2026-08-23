import { describe, expect, it } from "vitest";
import { canConfirmAppDataClear, selectTaskForPomodoro } from "../lib/account-reset-focus-guards";

describe("protected app-data clearing and task-linked focus guards", () => {
  it("requires a six-digit password and the exact app-data clear confirmation", () => {
    expect(canConfirmAppDataClear("130420", "CLEAR")).toBe(true);
    expect(canConfirmAppDataClear("13042", "CLEAR")).toBe(false);
    expect(canConfirmAppDataClear("130420", "clear now")).toBe(false);
  });

  it("only selects unfinished tasks for a Pomodoro session", () => {
    expect(selectTaskForPomodoro("task-12", false)).toBe("task-12");
    expect(selectTaskForPomodoro("task-12", true)).toBeNull();
  });
});
