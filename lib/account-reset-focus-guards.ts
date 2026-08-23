export function canConfirmAppDataClear(pin: string, phrase: string) {
  return /^\d{6}$/.test(pin) && phrase.trim().toUpperCase() === "CLEAR";
}

export function selectTaskForPomodoro(taskId: string, isCompleted: boolean) {
  return isCompleted ? null : taskId;
}
