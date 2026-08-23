import { describe, expect, it, vi } from "vitest";

describe("Gemini server service", () => {
  it("sends the API key only in the server request header and extracts model text", async () => {
    vi.stubEnv("GEMINI_API_KEY", "server-only-test-key");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "OMNI" }] } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { generateGeminiText } = await import("../server/gemini-service");
    await expect(generateGeminiText({ system: "system", prompt: "prompt" })).resolves.toBe("OMNI");
    const calls = fetchMock.mock.calls as unknown as Array<[RequestInfo | URL, RequestInit]>;
    expect(calls[0]?.[1]?.headers).toMatchObject({ "X-goog-api-key": "server-only-test-key" });
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("ignores Gemini thought parts before returning a JSON response body", async () => {
    vi.stubEnv("GEMINI_API_KEY", "server-only-test-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "internal reasoning", thought: true }, { text: "{\"steps\":[\"ready\"]}" }] } }] }), { status: 200 })));
    const { generateGeminiJson } = await import("../server/gemini-service");
    await expect(generateGeminiJson<{ steps: string[] }>({ system: "system", prompt: "prompt" })).resolves.toEqual({ steps: ["ready"] });
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("retries one temporary Gemini failure before returning model text", async () => {
    vi.stubEnv("GEMINI_API_KEY", "server-only-test-key");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Recovered" }] } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { generateGeminiText } = await import("../server/gemini-service");
    await expect(generateGeminiText({ system: "system", prompt: "prompt" })).resolves.toBe("Recovered");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("retries one transient network error before returning model text", async () => {
    vi.stubEnv("GEMINI_API_KEY", "server-only-test-key");
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error("network timeout"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Recovered after timeout" }] } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { generateGeminiText } = await import("../server/gemini-service");
    await expect(generateGeminiText({ system: "system", prompt: "prompt" })).resolves.toBe("Recovered after timeout");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
});

describe("Gemini JSON parsing", () => {
  it("accepts JSON wrapped in a code fence or surrounding text", async () => {
    const { parseGeminiJsonText } = await import("../server/gemini-service");
    expect(parseGeminiJsonText<{ steps: string[] }>("```json\n{\"steps\":[\"one\"]}\n``` ")).toEqual({ steps: ["one"] });
    expect(parseGeminiJsonText<{ steps: string[] }>("Here is the result: {\"steps\":[\"two\"]}")).toEqual({ steps: ["two"] });
  });
});
