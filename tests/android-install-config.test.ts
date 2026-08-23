import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appConfig = readFileSync("app.config.ts", "utf8");

describe("Android installation replacement configuration", () => {
  it("uses a release version newer than the installed 1.0.9 / 10009 APK", () => {
    expect(appConfig).toContain('version: "1.0.10"');
    expect(appConfig).toContain("versionCode: 10010");
  });

  it("keeps the stable package and universal phone ABIs", () => {
    expect(appConfig).toContain('const rawBundleId = "com.app.omnilifecenter"');
    expect(appConfig).toContain('buildArchs: ["armeabi-v7a", "arm64-v8a"]');
  });
});
