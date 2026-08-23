import { scheduleHabitReminderNotification, scheduleHighPriorityNotification, type HabitReminderRepeat } from "./omni-notifications";
import { taskReminderDate, type HabitFrequency, type TaskReminderOffset } from "./task-habit-rules";

export { habitDailyTarget, normalizeTaskReminderOffsets, TASK_REMINDER_OPTIONS, taskReminderDate, taskReminderLimit, type HabitFrequency, type TaskReminderOffset } from "./task-habit-rules";

export async function scheduleTaskReminderOffsets(input: {
  taskId: string;
  title: string;
  detail: string;
  dueAt: Date;
  offsets: TaskReminderOffset[];
}) {
  const scheduled = await Promise.all(
    input.offsets
      .map((offset) => ({ offset, at: taskReminderDate(input.dueAt, offset) }))
      .filter(({ at }) => at.getTime() > Date.now())
      .map(async ({ offset, at }) => ({
        offset,
        identifier: await scheduleHighPriorityNotification(
          {
            title: input.title,
            body: input.detail || "تذكير من OMNI LIFE",
            target: { kind: "task", id: input.taskId },
          },
          at,
        ),
      })),
  );
  return scheduled;
}

export async function scheduleHabitReminderTimes(input: {
  habitId: string;
  title: string;
  detail: string;
  frequency: HabitFrequency;
  times: Date[];
}) {
  const scheduled = await Promise.all(
    input.times.map((time) => scheduleHabitReminderNotification(
      {
        title: input.title,
        body: input.detail || "تذكير عادة من OMNI LIFE",
        target: { kind: "habit", id: input.habitId },
      },
      time,
      input.frequency,
    )),
  );
  return scheduled;
}
