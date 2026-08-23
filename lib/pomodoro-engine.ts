export type PomodoroPhase = "focus" | "short_break" | "long_break" | "complete";

export const FOCUS_MINUTES = 25;
export const SHORT_BREAK_MINUTES = 5;
export const LONG_BREAK_MINUTES = 15;

export type PomodoroDurations = { focusMinutes: number; shortBreakMinutes: number; longBreakMinutes: number };
export const DEFAULT_POMODORO_DURATIONS: PomodoroDurations = { focusMinutes: FOCUS_MINUTES, shortBreakMinutes: SHORT_BREAK_MINUTES, longBreakMinutes: LONG_BREAK_MINUTES };

export type PomodoroState = { phase: PomodoroPhase; estimated: number; completed: number; secondsRemaining: number };

export function normalizePomodoroDurations(input: Partial<PomodoroDurations> = {}): PomodoroDurations {
  const integer = (value: number | undefined, fallback: number, min: number, max: number) => Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value as number))) : fallback;
  return { focusMinutes: integer(input.focusMinutes, FOCUS_MINUTES, 5, 90), shortBreakMinutes: integer(input.shortBreakMinutes, SHORT_BREAK_MINUTES, 1, 30), longBreakMinutes: integer(input.longBreakMinutes, LONG_BREAK_MINUTES, 5, 60) };
}

export function createPomodoroState(estimated = 1, completed = 0, durations: PomodoroDurations = DEFAULT_POMODORO_DURATIONS): PomodoroState {
  const normalized = normalizePomodoroDurations(durations);
  return { phase: completed >= estimated ? "complete" : "focus", estimated: Math.max(1, estimated), completed: Math.max(0, completed), secondsRemaining: normalized.focusMinutes * 60 };
}

export function finishPomodoroPhase(state: PomodoroState, durations: PomodoroDurations = DEFAULT_POMODORO_DURATIONS): PomodoroState {
  const normalized = normalizePomodoroDurations(durations);
  if (state.phase === "focus") {
    const completed = state.completed + 1;
    if (completed >= state.estimated) return { ...state, completed, phase: "complete", secondsRemaining: 0 };
    const longBreak = completed % 4 === 0;
    return { ...state, completed, phase: longBreak ? "long_break" : "short_break", secondsRemaining: (longBreak ? normalized.longBreakMinutes : normalized.shortBreakMinutes) * 60 };
  }
  if (state.phase === "short_break" || state.phase === "long_break") return { ...state, phase: "focus", secondsRemaining: normalized.focusMinutes * 60 };
  return state;
}

export function addPomodoroSession(state: PomodoroState, durations: PomodoroDurations = DEFAULT_POMODORO_DURATIONS): PomodoroState {
  const normalized = normalizePomodoroDurations(durations);
  const estimated = state.estimated + 1;
  return state.phase === "complete" ? { ...state, estimated, phase: "focus", secondsRemaining: normalized.focusMinutes * 60 } : { ...state, estimated };
}

export function pomodoroProgressLabel(state: Pick<PomodoroState, "completed" | "estimated">) {
  return `${Math.min(state.completed, state.estimated)}/${state.estimated}`;
}
