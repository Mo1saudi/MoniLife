import { describe, expect, it } from "vitest";

import { selectOmniAiRoutineCopy } from "../lib/ai-routine-copy";

describe("AI routine notification copy", () => {
  it("cycles through Gemini-authored category options", () => {
    expect(selectOmniAiRoutineCopy({ task: ["الأولى", "الثانية", "الثالثة"] }, "task", 4, "احتياطي")).toBe("الثانية");
  });

  it("falls back to local copy when Gemini text is missing or blank", () => {
    expect(selectOmniAiRoutineCopy({ ideas: ["  "] }, "ideas", 0, "نسخة محلية")).toBe("نسخة محلية");
  });
});
