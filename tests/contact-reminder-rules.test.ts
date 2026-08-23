import { describe, expect, it } from "vitest";

import { contactReminderCadenceLabel, isContactReminderCadence } from "../lib/contact-reminder-rules";

describe("contact relationship reminder rules", () => {
  it("accepts only supported reminder cadences", () => {
    expect(isContactReminderCadence("daily")).toBe(true);
    expect(isContactReminderCadence("weekly")).toBe(true);
    expect(isContactReminderCadence("monthly")).toBe(true);
    expect(isContactReminderCadence("yearly")).toBe(false);
  });

  it("provides clear localized cadence labels", () => {
    expect(contactReminderCadenceLabel("weekly", true)).toBe("أسبوعيًا");
    expect(contactReminderCadenceLabel("monthly", false)).toBe("Monthly");
  });
});
