import * as db from "./db";
import { buildWeeklyReport, type WeeklySnapshot } from "../lib/weekly-analytics";
import { formatPhoneNotification } from "../lib/phone-notification-style";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

async function sendWeeklyReportPush(email: string) {
  const devices = await db.listActiveNotificationDevicesForManualEmail(email);
  if (!devices.length) return 0;
  const presentation = formatPhoneNotification("persona", { title: "تقريرك الأسبوعي جاهز", body: "اكتشف ملخص إنجازاتك وخطوتك التالية داخل OMNI LIFE." });
  await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(devices.map((device) => ({ to: device.expoPushToken, title: presentation.title, body: presentation.body, sound: "sound_persona.wav", priority: "high", channelId: "omni-life-high-priority", data: { screen: "weekly-report", type: "weekly-retrospective" } }))),
    signal: AbortSignal.timeout(25_000),
  });
  return devices.length;
}

function readSnapshot(payload: string): WeeklySnapshot {
  const parsed = JSON.parse(payload) as Partial<WeeklySnapshot>;
  return {
    completedTasks: Number(parsed.completedTasks ?? 0),
    delayedTasks: Number(parsed.delayedTasks ?? 0),
    habitsCompleted: Number(parsed.habitsCompleted ?? 0),
    habitsPlanned: Number(parsed.habitsPlanned ?? 0),
    expensesEgp: Number(parsed.expensesEgp ?? 0),
    budgetOverages: Number(parsed.budgetOverages ?? 0),
    xpEarned: Number(parsed.xpEarned ?? 0),
  };
}

export async function generateWeeklyRetrospectives(now = new Date()) {
  const snapshots = await db.listWeeklyAnalyticsSnapshots();
  const weekEnd = new Date(now);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  const generated: Array<{ email: string; reportId: number; recipients: number }> = [];
  for (const snapshot of snapshots) {
    try {
      const report = buildWeeklyReport(readSnapshot(snapshot.payload), snapshot.persona);
      const row = await db.createWeeklyReport({ email: snapshot.email, weekStart, weekEnd, persona: snapshot.persona, score: report.score, summary: report.summary, metrics: JSON.stringify(report) });
      const recipients = await sendWeeklyReportPush(snapshot.email);
      generated.push({ email: snapshot.email, reportId: row.id, recipients });
    } catch (error) {
      console.warn("[WeeklyRetrospective] Failed for", snapshot.email, error);
    }
  }
  return generated;
}
