import { describe, expect, it } from "vitest";

import { isOmniAppDataStorageKey } from "../lib/omni-app-data-keys";

describe("OMNI LIFE resettable storage keys", () => {
  it("selects app data while preserving manual session and welcome keys", () => {
    expect(isOmniAppDataStorageKey("omni-life:tasks:v1")).toBe(true);
    expect(isOmniAppDataStorageKey("omni-life:promotion-inbox:v1")).toBe(true);
    expect(isOmniAppDataStorageKey("omni-life.manual-profile")).toBe(false);
    expect(isOmniAppDataStorageKey("omni-life.welcome-seen")).toBe(false);
    expect(isOmniAppDataStorageKey("another-app:data")).toBe(false);
  });
});
