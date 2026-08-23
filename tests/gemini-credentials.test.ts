import { describe, expect, it } from "vitest";

const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest";

describe("Gemini server credentials", () => {
  it("accepts the configured server-only API key", async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch(endpoint, {
      headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey! },
      signal: AbortSignal.timeout(10_000),
    });

    expect(response.ok).toBe(true);
    const payload = await response.json() as Record<string, unknown>;
    expect(payload).toBeTypeOf("object");
  }, 20_000);
});
