import { describe, expect, it } from "vitest";

import { ONBOARDING_TOUR } from "../lib/onboarding-tour";

describe("first-launch onboarding tour", () => {
  it("guides new Arabic users through the core OMNI LIFE workflows", () => {
    expect(ONBOARDING_TOUR).toHaveLength(4);
    expect(ONBOARDING_TOUR.map((slide) => slide.title)).toEqual(expect.arrayContaining([
      "مرحبًا بك في OMNI LIFE",
      "رتّب يومك في دقيقة",
      "افهم وقتك ومالك",
      "ابدأ بخطوة واحدة",
    ]));
    expect(ONBOARDING_TOUR.every((slide) => slide.highlights.length === 3)).toBe(true);
  });
});
