import { describe, expect, it } from "vitest";

import { awardGamification } from "../lib/gamification";
import { LONG_BREAK_MINUTES, SHORT_BREAK_MINUTES, addPomodoroSession, createPomodoroState, finishPomodoroPhase, normalizePomodoroDurations } from "../lib/pomodoro-engine";

describe("OMNI LIFE multi-session Pomodoro engine", () => {
  it("moves a completed focus session into a short break and then the next focus session", () => {
    const initial = createPomodoroState(3, 0);
    const afterFocus = finishPomodoroPhase(initial);
    expect(afterFocus).toMatchObject({ phase: "short_break", completed: 1, estimated: 3, secondsRemaining: SHORT_BREAK_MINUTES * 60 });
    expect(finishPomodoroPhase(afterFocus)).toMatchObject({ phase: "focus", completed: 1, secondsRemaining: 25 * 60 });
  });

  it("uses a long break after every fourth completed session when more work remains", () => {
    const afterFourth = finishPomodoroPhase(createPomodoroState(5, 3));
    expect(afterFourth).toMatchObject({ phase: "long_break", completed: 4, secondsRemaining: LONG_BREAK_MINUTES * 60 });
  });

  it("waits for a completion decision after the estimated session count and can extend", () => {
    const completed = finishPomodoroPhase(createPomodoroState(1, 0));
    expect(completed.phase).toBe("complete");
    expect(addPomodoroSession(completed)).toMatchObject({ phase: "focus", estimated: 2, completed: 1, secondsRemaining: 25 * 60 });
  });

  it("awards exactly 20 XP for a completed focus session", () => {
    const next = awardGamification({ xp: 0, level: 1, badges: [], completedTasks: 0, habitDays: 0, financeDays: 0 }, "pomodoro");
    expect(next.gained).toBe(20);
    expect(next.xp).toBe(20);
  });

  it("uses the user-selected focus, short-break, and long-break durations", () => {
    const durations = { focusMinutes: 40, shortBreakMinutes: 7, longBreakMinutes: 20 };
    expect(createPomodoroState(5, 0, durations).secondsRemaining).toBe(40 * 60);
    expect(finishPomodoroPhase(createPomodoroState(5, 0, durations), durations)).toMatchObject({ phase: "short_break", secondsRemaining: 7 * 60 });
    expect(finishPomodoroPhase(createPomodoroState(5, 3, durations), durations)).toMatchObject({ phase: "long_break", secondsRemaining: 20 * 60 });
    expect(addPomodoroSession(createPomodoroState(1, 1, durations), durations)).toMatchObject({ phase: "focus", secondsRemaining: 40 * 60 });
  });

  it("normalizes duration preferences to safe user-facing bounds", () => {
    expect(normalizePomodoroDurations({ focusMinutes: 2, shortBreakMinutes: 90, longBreakMinutes: 2 })).toEqual({ focusMinutes: 5, shortBreakMinutes: 30, longBreakMinutes: 5 });
  });
});
