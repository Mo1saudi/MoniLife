import { describe, expect, it } from "vitest";

import { isSupportedSupportLinkUrl, normalizeSupportLinkUrl } from "../lib/support-link-url";

describe("support-link URL handling", () => {
  it("adds HTTPS for a protocol-free support domain", () => {
    expect(normalizeSupportLinkUrl(" help.omnilife.example/support ")).toBe("https://help.omnilife.example/support");
  });

  it("accepts only valid HTTP(S) links after normalization", () => {
    expect(isSupportedSupportLinkUrl(normalizeSupportLinkUrl("faq.omnilife.example"))).toBe(true);
    expect(isSupportedSupportLinkUrl(normalizeSupportLinkUrl("javascript:alert(1)"))).toBe(false);
    expect(isSupportedSupportLinkUrl(normalizeSupportLinkUrl("https://"))).toBe(false);
  });
});
