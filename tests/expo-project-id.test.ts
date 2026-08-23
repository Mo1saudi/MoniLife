import { describe, expect, it } from "vitest";

const expoProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

describe("Expo remote push project configuration", () => {
  it("contains a valid public Expo/EAS UUID project identifier", async () => {
    expect(expoProjectId).toBeTruthy();
    expect(expoProjectId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: "ExponentPushToken[validation-placeholder]" }),
      signal: AbortSignal.timeout(15_000),
    });
    expect(response.status).toBeLessThan(500);
  }, 20_000);
});
