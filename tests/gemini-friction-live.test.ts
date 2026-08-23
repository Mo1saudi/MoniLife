import { describe, expect, it } from "vitest";

import { appRouter } from "../server/routers";

const caller = appRouter.createCaller({ user: null, manualUserEmail: null, manualUserId: null } as never);

describe.skipIf(process.env.RUN_GEMINI_LIVE_TEST !== "true")("Gemini live friction-breaker responses", () => {
  it("returns distinct, title-specific steps for different task contexts", async () => {
    expect(process.env.GEMINI_API_KEY).toBeTruthy();

    const callTask = await caller.aiAssistance.frictionSteps({
      title: "الاتصال بسارة لمراجعة عقد الإيجار",
      detail: "اسأل عن بند التأمين وموعد توقيع النسخة النهائية غدًا",
      isArabic: true,
    });
    const writingTask = await caller.aiAssistance.frictionSteps({
      title: "إرسال ملخص اجتماع فريق التصميم",
      detail: "اكتب ثلاث قرارات وأرسلها إلى الفريق قبل الظهر",
      isArabic: true,
    });

    expect(callTask.steps).toHaveLength(3);
    expect(writingTask.steps).toHaveLength(3);
    expect(callTask.steps.every((step) => step.includes("الاتصال بسارة لمراجعة عقد الإيجار"))).toBe(true);
    expect(writingTask.steps.every((step) => step.includes("إرسال ملخص اجتماع فريق التصميم"))).toBe(true);
    expect(callTask.steps.join(" ")).not.toBe(writingTask.steps.join(" "));
  }, 60_000);
});
