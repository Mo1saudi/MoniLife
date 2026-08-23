import { describe, expect, it } from "vitest";

import { SMALL_PHONE_MAX_WIDTH, isSmallPhoneViewport } from "../lib/responsive-layout";

describe("small-phone responsive layout threshold", () => {
  it("enables compact layout at 360px and below", () => {
    expect(isSmallPhoneViewport(320)).toBe(true);
    expect(isSmallPhoneViewport(SMALL_PHONE_MAX_WIDTH)).toBe(true);
  });

  it("keeps standard layout above the compact threshold and rejects invalid widths", () => {
    expect(isSmallPhoneViewport(361)).toBe(false);
    expect(isSmallPhoneViewport(0)).toBe(false);
    expect(isSmallPhoneViewport(Number.NaN)).toBe(false);
  });
});
