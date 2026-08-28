import { runAi, runAiJson, type AiFeature } from "./ai-engine";

export async function generateGeminiText({ system, prompt, maxOutputTokens = 500, responseMimeType, identity, feature = "advisor" }: { system: string; prompt: string; maxOutputTokens?: number; responseMimeType?: "application/json"; identity?: string | null; feature?: AiFeature }) {
  const result = await runAi({ provider: "legacy_gemini", feature, identity, system, prompt, maxOutputTokens, responseFormat: responseMimeType ? { type: "json_object" } : { type: "text" } });
  return result.text;
}

export function parseGeminiJsonText<T>(text: string) {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const candidates = [trimmed];
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  for (const candidate of candidates) { try { return JSON.parse(candidate) as T; } catch { /* Try the next JSON-shaped candidate. */ } }
  throw new Error("AI provider returned invalid JSON.");
}

export async function generateGeminiJson<T>(input: Omit<Parameters<typeof generateGeminiText>[0], "responseMimeType">) {
  return runAiJson<T>({ provider: "legacy_gemini", feature: input.feature ?? "smart_planning", identity: input.identity, system: input.system, prompt: input.prompt, maxOutputTokens: input.maxOutputTokens });
}
