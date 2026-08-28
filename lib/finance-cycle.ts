export type FinancialCycle = { startDay: number };
export type SpendingWarningTone = "gentle" | "balanced" | "direct" | "playful";
import { pickNotificationVariation } from "./notification-rotation";

export const DEFAULT_FINANCIAL_CYCLE: FinancialCycle = { startDay: 1 };

export function normalizeFinancialCycle(input?: Partial<FinancialCycle>): FinancialCycle {
  const candidate = Number(input?.startDay);
  return { startDay: Number.isInteger(candidate) && candidate >= 1 && candidate <= 28 ? candidate : DEFAULT_FINANCIAL_CYCLE.startDay };
}

export function financialCycleBounds(now: Date, cycle: FinancialCycle) {
  const normalized = normalizeFinancialCycle(cycle);
  const currentStart = new Date(now.getFullYear(), now.getMonth(), normalized.startDay, 0, 0, 0, 0);
  const start = now.getTime() >= currentStart.getTime() ? currentStart : new Date(now.getFullYear(), now.getMonth() - 1, normalized.startDay, 0, 0, 0, 0);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, normalized.startDay, 0, 0, 0, 0);
  return { start, end };
}

export function isInsideFinancialCycle(value: string | undefined, now: Date, cycle: FinancialCycle) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const { start, end } = financialCycleBounds(now, cycle);
  return date.getTime() >= start.getTime() && date.getTime() < end.getTime();
}

export function financeWarningCopy(input: { isArabic: boolean; reason: "daily_limit" | "large_transaction"; amount: number; limit?: number; tone?: SpendingWarningTone; variationKey?: string | number | Date }) {
  const tone = input.tone ?? "balanced";
  const variationKey = input.variationKey ?? `${input.reason}:${input.amount}:${input.limit ?? ""}:${new Date().toISOString().slice(0, 10)}`;
  if (input.isArabic) {
    if (input.reason === "large_transaction") {
      const amount = input.amount.toLocaleString("ar-EG");
      const copy = tone === "gentle" ? [`خد بالك بس: عملية ${amount} ج.م كبيرة شوية. راجعها بهدوء وخليك مطمّن.`, `مراجعة لطيفة: عملية ${amount} ج.م أكبر من المعتاد. تأكد منها وقت ما تكون مرتاح.`, `لحظة هادئة للماليات: ${amount} ج.م مبلغ كبير نسبيًا، راجعه قبل أي قرار جديد.`]
        : tone === "direct" ? [`تنبيه مهم: عملية ${amount} ج.م كبيرة. راجعها دلوقتي قبل ما تكمل أي مصروف جديد.`, `قف دقيقة: تم تسجيل ${amount} ج.م كعملية كبيرة. تأكد من تفاصيلها الآن.`, `مراجعة مطلوبة: ${amount} ج.م خرجت في معاملة واحدة. راجعها قبل الخطوة التالية.`]
        : tone === "playful" ? [`الميزانية بتبص لك باستغراب: عملية ${amount} ج.م كبيرة! راجعها قبل ما المحفظة تطلب إجازة.`, `المحفظة رفعت حاجبها: ${amount} ج.م في عملية واحدة. بص عليها قبل ما تعمل دراما.`, `جرس الميزانية رنّ: ${amount} ج.م دفعة واحدة. خلّينا نراجعها قبل ما الكارت يطلب إجازة.`]
        : [`يا صديقي، عملية ${amount} ج.م كبيرة شوية. راجعها قبل ما الميزانية تدخل في الحيط.`, `تنبيه متوازن: ${amount} ج.م مبلغ ملحوظ. راجع العملية قبل أي مصروف تالٍ.`, `عملية كبيرة في الطريق: ${amount} ج.م. نظرة سريعة عليها تساعدك تظل مسيطرًا.`];
      return pickNotificationVariation(copy, variationKey);
    }
    const amount = input.amount.toLocaleString("ar-EG");
    const limit = input.limit?.toLocaleString("ar-EG") ?? "المحدد";
    const copy = tone === "gentle" ? [`فكّرك بلطف: صرفك النهارده وصل ${amount} ج.م، أعلى من حدك ${limit} ج.م. راجع الباقي على مهلك.`, `تذكير هادئ: مجموع اليوم ${amount} ج.م وتجاوز الحد ${limit} ج.م. خفّف الخطوة القادمة إن أمكن.`, `خذ نفسًا صغيرًا: إنفاق اليوم ${amount} ج.م أعلى من ${limit} ج.م. راجع أولوياتك بهدوء.`]
      : tone === "direct" ? [`وقف لحظة: صرفك النهارده ${amount} ج.م وتجاوز حدك ${limit} ج.م. أجّل أي مصروف غير ضروري.`, `تنبيه واضح: وصلت إلى ${amount} ج.م فوق حد ${limit} ج.م. لا تضف مصروفًا جديدًا قبل مراجعة اليوم.`, `الحد تم تجاوزه: ${amount} ج.م مقابل ${limit} ج.م. راجع القائمة الآن واختَر ما يمكن تأجيله.`]
      : tone === "playful" ? [`المحفظة بتقول يا ساتر: صرفك النهارده ${amount} ج.م وعدّى حدك ${limit} ج.م. خُد بريك من الشراء قبل ما تعمل بلوك للكارت.`, `الميزانية بتلوّح بعلم أبيض: ${amount} ج.م أعلى من ${limit} ج.م. خلّينا نهدّي الشراء شوية.`, `الكارت محتاج استراحة شاي: صرف اليوم ${amount} ج.م والحد ${limit} ج.م. نأجل الجولة الجاية؟`]
      : [`جرس الإنفاق رن: صرفك النهارده وصل ${amount} ج.م وعدّى حدك ${limit} ج.م. اهدي دقيقة قبل المصروف اللي جاي.`, `تنبيه متوازن: إنفاق اليوم ${amount} ج.م وتجاوز ${limit} ج.م. راجع القرار القادم قبل الدفع.`, `الميزانية تحتاج نظرة: ${amount} ج.م اليوم فوق حد ${limit} ج.م. رتّب الباقي بوعي.`];
    return pickNotificationVariation(copy, variationKey);
  }
  const amount = input.amount.toLocaleString("en-US");
  const limit = input.limit?.toLocaleString("en-US") ?? "set";
  return input.reason === "large_transaction"
    ? pickNotificationVariation([`Friendly but firm alert: ${amount} EGP is a large transaction. Give it a second look before the budget becomes a short story.`, `A quick money check: ${amount} EGP is a notable transaction. Review it before the next purchase.`, `Large transaction logged: ${amount} EGP. A quick review now keeps the budget clear.`], variationKey)
    : pickNotificationVariation([`Spending alarm: you reached ${amount} EGP today, above your ${limit} EGP limit. Pause before the next transaction.`, `Today’s spending is ${amount} EGP, above the ${limit} EGP limit. Take a short review break.`, `Budget check: ${amount} EGP today exceeds your ${limit} EGP limit. Choose the next expense carefully.`], variationKey);
}
