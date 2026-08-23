import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const soundService = readFileSync(resolve(process.cwd(), "lib/notification-sound-service.ts"), "utf8");
const campaignService = readFileSync(resolve(process.cwd(), "server/notification-campaign-service.ts"), "utf8");

describe("short OMNI LIFE notification sound effects", () => {
  it("keeps every bundled sound effect within the requested one-to-three-second range", () => {
    expect(soundService).toContain("SHORT_NOTIFICATION_EFFECT_DURATION_SECONDS = 1.7");
    expect((soundService.match(/durationSeconds: SHORT_NOTIFICATION_EFFECT_DURATION_SECONDS/g) ?? []).length).toBe(6);
    expect(soundService).toContain("(SOUND_SIGNATURES[section].durationSeconds + 0.35) * 1_000");
  });

  it("uses the dedicated high-priority channel for brief campaign and system alert effects", () => {
    expect(soundService).toContain('OMNI_HIGH_PRIORITY_CHANNEL = "omni-life-high-priority"');
    expect(soundService).toContain('sound: useCustomSounds ? SOUND_SIGNATURES.admin.fileName : "default"');
    expect(campaignService).toContain('sound: "sound_admin.wav"');
  });

  it("keeps Sleep Mode on dedicated very-quiet audio assets and channels", () => {
    expect(soundService).toContain('quietFileName');
    expect(soundService).toContain('`${signature.channelId}-sleep`');
    expect(soundService).toContain('importance: Notifications.AndroidImportance.LOW');
    expect(soundService).toContain('enableVibrate: false');
  });
});
