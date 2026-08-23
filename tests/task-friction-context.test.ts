import { describe, expect, it } from "vitest";

import { buildFrictionSteps } from "../lib/omni-life-center-utils";

describe("task-contextual friction steps", () => {
  it("references the task title and its detail in generic task micro-steps", () => {
    const steps = buildFrictionSteps({ id: "task-1", title: "تجهيز عرض العميل", detail: "استخدم أرقام مبيعات الربع الحالي" }, true);
    expect(steps).toHaveLength(3);
    expect(steps.every((step) => step.title.includes("تجهيز عرض العميل"))).toBe(true);
    expect(steps.some((step) => step.title.includes("أرقام مبيعات الربع الحالي"))).toBe(true);
  });

  it("uses an immediate call action when the task is a call", () => {
    const steps = buildFrictionSteps({ id: "task-2", title: "اتصل بالمدير", detail: "لتأكيد موعد الاجتماع" }, true);
    expect(steps[0].title).toContain("جهة الاتصال");
    expect(steps[2].title).toContain("اضغط اتصال");
    expect(steps[2].title).toContain("اتصل بالمدير");
  });

  it("uses a draft-first action when the task is writing", () => {
    const steps = buildFrictionSteps({ id: "task-3", title: "اكتب رسالة متابعة", detail: "اذكر سعر العرض الجديد" }, true);
    expect(steps[0].title).toContain("مسودة");
    expect(steps[1].title).toContain("اكتب عنوانًا");
    expect(steps[2].title).toContain("سعر العرض الجديد");
  });
});
