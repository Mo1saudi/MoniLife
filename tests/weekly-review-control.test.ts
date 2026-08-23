import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appShell = readFileSync(resolve(process.cwd(), "components/omni-life-center.tsx"), "utf8");
const weeklyStyle = readFileSync(resolve(process.cwd(), "components/weekly-review-button-styles.ts"), "utf8");

describe("weekly review header control", () => {
  it("uses a dedicated accessible weekly review button instead of the generic icon-only treatment", () => {
    expect(appShell).toContain('accessibilityLabel={t("المراجعة الأسبوعية", "Weekly review")}');
    expect(appShell).toContain("weeklyReviewButtonStyles.button");
    expect(appShell).toContain('setScreen("weeklyReport")');
  });

  it("gives the weekly review control a larger high-contrast purple treatment and a status dot", () => {
    expect(weeklyStyle).toContain("width: 44");
    expect(weeklyStyle).toContain('borderColor: "rgba(181,156,255,0.72)"');
    expect(weeklyStyle).toContain("backgroundColor: \"#DCCFFF\"");
  });
});
