import { scheduleHabitReminderNotification, scheduleHighPriorityNotification, type HabitReminderRepeat } from "./omni-notifications";
import { taskReminderDate, type HabitFrequency, type TaskReminderOffset } from "./task-habit-rules";
import { pickNotificationVariation } from "./notification-rotation";
import { personalizeReminderBody } from "./personalized-notification-copy";

export { habitDailyTarget, normalizeTaskReminderOffsets, TASK_REMINDER_OPTIONS, taskReminderDate, taskReminderLimit, type HabitFrequency, type TaskReminderOffset } from "./task-habit-rules";

export async function scheduleTaskReminderOffsets(input: {
  taskId: string;
  title: string;
  detail: string;
  dueAt: Date;
  offsets: TaskReminderOffset[];
  userName?: string;
}) {
  const scheduled = await Promise.all(
    input.offsets
      .map((offset) => ({ offset, at: taskReminderDate(input.dueAt, offset) }))
      .filter(({ at }) => at.getTime() > Date.now())
      .map(async ({ offset, at }) => ({
        offset,
        identifier: await scheduleHighPriorityNotification(
          {
            title: pickNotificationVariation([input.title, `وقت بسيط لمهمتك: ${input.title}`, `نذكّرك بخطوتك التالية: ${input.title}`], `${input.taskId}:${at.toISOString()}:title`),
            body: personalizeReminderBody(true, input.userName ?? "", input.detail || pickNotificationVariation(["تذكير هادئ من OMNI LIFE؛ ابدأ بأصغر خطوة ممكنة.", "دقيقة واحدة قد تكفي لتبدأ المهمة الآن.", "افتح المهمة واختر الجزء الأسهل للانطلاق."], `${input.taskId}:${at.toISOString()}:body`)),
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
  userName?: string;
}) {
  const scheduled = await Promise.all(
    input.times.map((time) => scheduleHabitReminderNotification(
      {
        title: pickNotificationVariation([input.title, `موعد عادتك: ${input.title}`, `دفعة صغيرة لعادتك: ${input.title}`], `${input.habitId}:${time.toISOString()}:title`),
        body: personalizeReminderBody(true, input.userName ?? "", input.detail || pickNotificationVariation(["علامة صغيرة اليوم تحافظ على الاستمرارية.", "افعل أبسط نسخة من العادة الآن.", "الاستمرار أهم من الكمال؛ سجّل إنجازك عندما تنتهي."], `${input.habitId}:${time.toISOString()}:body`)),
        target: { kind: "habit", id: input.habitId },
      },
      time,
      input.frequency,
    )),
  );
  return scheduled;
}
