import { describe, expect, it } from "vitest";

import { normalizeContactPhone, pickPreferredPhone } from "../lib/contact-normalization";

describe("contact import normalization", () => {
  it("normalizes Arabic and Persian digits while preserving an international plus prefix", () => {
    expect(normalizeContactPhone("+٢٠ ١٠ ١٢٣٤ ٥٦٧٨")).toBe("+201012345678");
    expect(normalizeContactPhone("۰۱۰-۱۲۳۴-۵۶۷۸")).toBe("01012345678");
  });

  it("uses a primary valid number before other contact phone numbers", () => {
    expect(pickPreferredPhone([{ number: "010 0000 0000" }, { number: "+20 11 4455 8800", isPrimary: true }])).toBe("+201144558800");
  });
});
