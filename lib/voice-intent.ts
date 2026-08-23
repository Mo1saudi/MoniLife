import { parsePositiveEgpAmount } from "./daily-expense-rules";

export type VoiceIntent =
  | { kind: "expense"; amount: number; title: string; category: string }
  | { kind: "task"; title: string; scheduledAt?: string }
  | { kind: "idea"; title: string };

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const normalize = (text: string) => text.replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit))).replace(/[٬،]/g, ",").replace(/[٫]/g, ".").replace(/\s+/g, " ").trim();

export function parseVoiceQuickIntent(raw: string, now = new Date()): VoiceIntent {
  const text = normalize(raw);
  const lower = text.toLowerCase();
  const expense = /(اشتريت|صرفت|دفعت|دافع|مشتريات|فاتورة|جنيه|egp|paid|bought|spent|purchase)/.test(lower);
  const task = /(محتاج|عايز|عندي|اجتماع|تذكير|بكرة|غد|موعد|لازم|task|meeting|remind|tomorrow)/.test(lower);
  if (expense) {
    const amountMatch = lower.match(/(?:جنيه|egp|paid|spent|بمبلغ|بـ|for)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i);
    const amount = parsePositiveEgpAmount(amountMatch?.[1] ?? "") ?? 0;
    const category = /(مطعم|كافيه|قهوة|food|restaurant|coffee)/.test(lower) ? "طعام ومشروبات" : /(اوبر|مواصلات|بنزين|taxi|uber|transport)/.test(lower) ? "مواصلات" : /(فاتورة|كهرباء|مياه|انترنت|bill|internet)/.test(lower) ? "فواتير وخدمات" : "أخرى";
    return { kind: "expense", amount, title: text.replace(/(?:اشتريت|صرفت|دفعت|دافع|مبلغ|جنيه|egp|paid|bought|spent|purchase|[0-9,.]+)/gi, " ").replace(/\s+/g, " ").trim() || "مصروف صوتي", category };
  }
  if (task) {
    const scheduled = /(بكرة|غد|tomorrow)/.test(lower) ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0).toISOString() : undefined;
    return { kind: "task", title: text.replace(/^(عندي|محتاج|عايز|لازم|تذكير|remind me to|i need to)\s*/i, "").trim() || "مهمة صوتية", scheduledAt: scheduled };
  }
  return { kind: "idea", title: text || "فكرة صوتية" };
}
