import { describe, expect, it } from "vitest";
import easConfig from "../eas.json";

describe("Google Play AAB profile", () => {
  it("uses store distribution and app-bundle output", () => {
    expect(easConfig.build.production.distribution).toBe("store");
    expect(easConfig.build.production.android.buildType).toBe("app-bundle");
  });
});

