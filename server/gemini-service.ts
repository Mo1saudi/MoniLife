type GeminiPart = { text?: string; thought?: boolean };
type GeminiPayload = { candidates?: Array<{ content?: { parts?: GeminiPart[] } }> };

const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function apiKey() {
  const value = process.env.GEMINI_API_KEY?.trim();
  if (!value) throw new Error("Gemini is not configured on the server.");
  return value;
}

function extractText(payload: GeminiPayload) {
  const text = payload.candidates?.[0]?.content?.parts?.filter((part) => !part.thought).map((part) => part.text ?? "").join("\n").trim();
  if (!text) throw new Error("Gemini returned no usable text.");
  return text;
}

export async function generateGeminiText({ system, prompt, maxOutputTokens = 500, responseMimeType }: { system: string; prompt: string; maxOutputTokens?: number; responseMimeType?: "application/json" }) {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.55, maxOutputTokens, thinkingConfig: { thinkingBudget: 0 }, ...(responseMimeType ? { responseMimeType } : {}) },
  });
  let lastStatus: number | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(GEMINI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey() },
        signal: AbortSignal.timeout(15_000),
        body,
      });
      if (response.ok) return extractText(await response.json() as GeminiPayload);
      lastStatus = response.status;
      if (attempt === 0 && (response.status === 429 || response.status >= 500)) {
        await new Promise((resolve) => setTimeout(resolve, 450));
        continue;
      }
      break;
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 450));
        continue;
      }
      break;
    }
  }
  if (lastError) throw lastError;
  throw new Error(`Gemini request failed (${lastStatus ?? "network"}).`);
}

export function parseGeminiJsonText<T>(text: string) {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const candidates = [trimmed];
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  for (const candidate of candidates) {
    try { return JSON.parse(candidate) as T; } catch { /* Try the next JSON-shaped candidate. */ }
  }
  throw new Error("Gemini returned invalid JSON.");
}

export async function generateGeminiJson<T>(input: Omit<Parameters<typeof generateGeminiText>[0], "responseMimeType">) {
  const text = await generateGeminiText({ ...input, responseMimeType: "application/json" });
  return parseGeminiJsonText<T>(text);
}
