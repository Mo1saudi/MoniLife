import { describe, expect, it } from "vitest";

import { areTaskSpecificFrictionSteps } from "../server/friction-step-validation";

describe("Gemini friction-step validation", () => {
  it("accepts distinct actions that use concrete detail context", () => {
    const title = "إرسال متابعة إلى فريق التصميم";
    const detail = "تلخيص ثلاث نقاط فقط قبل الظهر";
    const steps = [
      "افتح البريد وحدد النقاط الثلاث.",
      "اكتب أول نقطة من تلخيص فريق التصميم.",
      "راجع ثلاث نقاط ثم اضغط إرسال قبل الظهر.",
    ];
    expect(areTaskSpecificFrictionSteps(steps, title, detail)).toBe(true);
  });

  it("rejects generic or repeated steps that could fit any task", () => {
    expect(areTaskSpecificFrictionSteps(["افتح الملف", "اكتب خطوة صغيرة", "ابدأ دقيقتين"], "إرسال متابعة إلى فريق التصميم", "تلخيص ثلاث نقاط")).toBe(false);
  });
});
