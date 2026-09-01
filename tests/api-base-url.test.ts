import { describe, expect, it } from "vitest";
import { NATIVE_API_BASE_URL, resolveApiBaseUrl } from "../lib/api-base-url";

describe("API base URL resolution", () => {
  it("uses the Manus production host for native builds without an override", () => {
    expect(resolveApiBaseUrl({ platform: "android" })).toBe(NATIVE_API_BASE_URL);
    expect(NATIVE_API_BASE_URL).toBe("https://omnilife-lya7kxbz.manus.space");
  });

  it("trims an explicit API override", () => {
    expect(resolveApiBaseUrl({ apiBaseUrl: "https://example.test/", platform: "android" })).toBe("https://example.test");
  });

  it("derives the web API host from the Metro hostname", () => {
    expect(resolveApiBaseUrl({ platform: "web", browserOrigin: { protocol: "https:", hostname: "8081-demo.us.manus.computer" } })).toBe("https://3000-demo.us.manus.computer");
  });
});
