export type TaskWidgetSource = { id: string; title: string; done?: boolean };
export type TaskWidgetSnapshot = { id: string; title: string };

/** Returns only short, open task titles suitable for a private Android widget snapshot. */
export function buildTaskWidgetSnapshot(tasks: TaskWidgetSource[]): TaskWidgetSnapshot[] {
  return tasks
    .filter((task) => !task.done && task.title.trim())
    .slice(0, 3)
    .map((task) => ({ id: task.id, title: task.title.trim().slice(0, 120) }));
}
