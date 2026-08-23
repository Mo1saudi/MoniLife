import { describe, expect, it } from "vitest";

import { parseBirthDateInput } from "../shared/telegram-recovery-input";

describe("Telegram birth-date input", () => {
  it("accepts canonical YYYY-MM-DD dates", () => {
    expect(parseBirthDateInput("1995-06-14")).toBe("1995-06-14");
  });

  it("normalizes Arabic-Indic digits, Unicode dashes, and surrounding whitespace", () => {
    expect(parseBirthDateInput(" ١٩٩٥–٠٦–١٤ ")).toBe("1995-06-14");
  });

  it("rejects impossible, future, and noncanonical calendar dates", () => {
    expect(parseBirthDateInput("1995-02-31")).toBeNull();
    expect(parseBirthDateInput("2099-01-01")).toBeNull();
    expect(parseBirthDateInput("14-06-1995")).toBeNull();
  });
});
