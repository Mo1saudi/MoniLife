import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const focusBridge = readFileSync("modules/expo-focus-dnd/src/OmniFocusDndModule.ts", "utf8");

describe("optional Android focus DND bridge", () => {
  it("does not crash a managed build when the custom native module is absent", () => {
    expect(focusBridge).toContain("requireOptionalNativeModule<OmniFocusDndModule>('OmniFocusDnd')");
    expect(focusBridge).not.toContain("requireNativeModule<OmniFocusDndModule>('OmniFocusDnd')");
  });
});
