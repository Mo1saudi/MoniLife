import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appShell = readFileSync("components/omni-life-center.tsx", "utf8");

describe("Android responsiveness safeguards", () => {
  it("defers nonessential startup work and prevents persistence writes before hydration", () => {
    expect(appShell).toContain("if (!pomodoroHydrated) return;");
    expect(appShell).toContain("if (!focusDndHydrated) return;");
    expect(appShell).toContain("if (!smsSettingsHydrated) return;");
    expect(appShell).toContain("if (!categoryBudgetsHydrated) return;");
    expect(appShell).toContain("}, 700);");
  });

  it("loads expensive reports only on the screen that needs them", () => {
    expect(appShell).toContain('screen === "weeklyReport"');
    expect(appShell).toContain('screen === "dashboard"');
    expect(appShell).toContain("isAdminDataScreen");
  });
});
