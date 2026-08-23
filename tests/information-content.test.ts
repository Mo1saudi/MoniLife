import { describe, expect, it } from "vitest";

import { DEFAULT_INFORMATION_CONTENT, INFORMATION_PAGE_LABELS } from "../lib/information-content";

describe("informational page content", () => {
  it("provides safe Arabic defaults for every user-facing page", () => {
    for (const key of ["privacy", "about", "howTo"] as const) {
      expect(INFORMATION_PAGE_LABELS[key].ar.length).toBeGreaterThan(0);
      expect(DEFAULT_INFORMATION_CONTENT[key].length).toBeGreaterThan(40);
    }
  });

  it("provides FAQ onboarding content in Arabic and English", () => {
    expect(INFORMATION_PAGE_LABELS.faq.ar).toBe("الأسئلة الشائعة");
    expect(DEFAULT_INFORMATION_CONTENT.faq.length).toBeGreaterThanOrEqual(5);
    expect(DEFAULT_INFORMATION_CONTENT.faq.every((item) => item.questionAr.length > 0 && item.answerAr.length > 0 && item.questionEn.length > 0 && item.answerEn.length > 0)).toBe(true);
  });
});
