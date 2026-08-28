import { invokeLLM, type Message, type OutputSchema } from "./_core/llm";
import * as db from "./db";

export type AiFeature = "advisor" | "friction_steps" | "notification_copy" | "contextual_alert" | "smart_planning" | "weekly_review" | "memory";
export type AiProvider = "managed" | "legacy_gemini" | "configured";
export type AiErrorCode = "not_configured" | "rate_limited" | "timeout" | "upstream" | "invalid_output";
export type AiRequest = { feature: AiFeature; identity?: string | null; system: string; prompt: string; maxOutputTokens?: number; outputSchema?: OutputSchema; responseFormat?: { type: "text" } | { type: "json_object" }; provider?: AiProvider };

const DEFAULT_MODEL = process.env.AI_MODEL?.trim() || undefined;
const DEFAULT_TIMEOUT_MS = 20_000;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_IDENTITY = 24;
const rateWindow = new Map<string, { startedAt: number; count: number }>();

export const AI_FEATURES: Record<AiFeature, { label: string; sensitive: boolean; defaultEnabled: boolean }> = {
  advisor: { label: "Productivity advisor", sensitive: false, defaultEnabled: true },
  friction_steps: { label: "Task friction steps", sensitive: false, defaultEnabled: true },
  notification_copy: { label: "Notification copy", sensitive: false, defaultEnabled: true },
  contextual_alert: { label: "Contextual alerts", sensitive: true, defaultEnabled: false },
  smart_planning: { label: "Smart planning", sensitive: false, defaultEnabled: true },
  weekly_review: { label: "Weekly review", sensitive: false, defaultEnabled: true },
  memory: { label: "AI memory", sensitive: true, defaultEnabled: false },
};

export function sanitizeAiText(value: string, max = 8_000) {
  return value.replace(/\u0000/g, "").replace(/(bearer\s+)[a-z0-9._-]+/gi, "$1[redacted]").replace(/(api[_ -]?key|token|password|pin|secret)\s*[:=]\s*[^\s,;]+/gi, "$1:[redacted]").slice(0, max);
}

function consumeRate(identity: string | null | undefined) {
  const key = identity?.trim().toLowerCase() || "anonymous";
  const now = Date.now();
  const current = rateWindow.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) { rateWindow.set(key, { startedAt: now, count: 1 }); return; }
  if (current.count >= MAX_REQUESTS_PER_IDENTITY) throw new AiEngineError("rate_limited", "AI request limit reached. Try again shortly.");
  current.count += 1;
}

export class AiEngineError extends Error {
  constructor(public readonly code: AiErrorCode, message: string, public readonly retryable = code === "rate_limited" || code === "timeout" || code === "upstream") { super(message); this.name = "AiEngineError"; }
}

function normalizeError(error: unknown): AiEngineError {
  if (error instanceof AiEngineError) return error;
  const message = error instanceof Error ? error.message : "AI provider failed";
  if (/configured|api.?key|credential/i.test(message)) return new AiEngineError("not_configured", "AI service is not configured.");
  if (/timeout|abort/i.test(message)) return new AiEngineError("timeout", "AI request timed out.");
  return new AiEngineError("upstream", "AI provider is temporarily unavailable.");
}

async function withTimeout<T>(promise: Promise<T>, ms = DEFAULT_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([promise, new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new AiEngineError("timeout", "AI request timed out.")), ms); })]); }
  finally { if (timer) clearTimeout(timer); }
}

async function runGeminiWithKey(request: AiRequest, key: string, model: string) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const responseMimeType = request.responseFormat?.type === "json_object" ? "application/json" : undefined;
  const body = JSON.stringify({ systemInstruction: { parts: [{ text: sanitizeAiText(request.system, 4_000) }] }, contents: [{ role: "user", parts: [{ text: sanitizeAiText(request.prompt, 12_000) }] }], generationConfig: { temperature: 0.55, maxOutputTokens: request.maxOutputTokens ?? 600, thinkingConfig: { thinkingBudget: 0 }, ...(responseMimeType ? { responseMimeType } : {}) } });
  let lastStatus: number | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", "X-goog-api-key": key }, signal: AbortSignal.timeout(15_000), body });
      if (response.ok) {
        const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }> };
        const text = payload.candidates?.[0]?.content?.parts?.filter((part) => !part.thought).map((part) => part.text ?? "").join("\n").trim();
        if (!text) throw new AiEngineError("invalid_output", "Gemini returned no usable text.", false);
        return { text, model, usage: null };
      }
      lastStatus = response.status;
      if (attempt === 0 && (response.status === 429 || response.status >= 500)) { await new Promise((resolve) => setTimeout(resolve, 450)); continue; }
      break;
    } catch (error) { lastError = error; if (attempt === 0) { await new Promise((resolve) => setTimeout(resolve, 450)); continue; } break; }
  }
  if (lastError) throw lastError;
  throw new AiEngineError(lastStatus === 429 ? "rate_limited" : "upstream", `Gemini request failed (${lastStatus ?? "network"}).`);
}

async function runLegacyGemini(request: AiRequest) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new AiEngineError("not_configured", "Gemini is not configured on the server.");
  return runGeminiWithKey(request, key, process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash");
}

async function runOpenAiCompatible(request: AiRequest, key: string, baseUrl: string, model: string) {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15_000), body: JSON.stringify({ model, messages: [{ role: "system", content: sanitizeAiText(request.system, 4_000) }, { role: "user", content: sanitizeAiText(request.prompt, 12_000) }], max_tokens: request.maxOutputTokens ?? 600, ...(request.responseFormat ? { response_format: request.responseFormat } : {}) }) });
  if (!response.ok) throw new AiEngineError(response.status === 429 ? "rate_limited" : "upstream", "Configured AI provider request failed.");
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>; model?: string; usage?: unknown };
  const content = payload.choices?.[0]?.message?.content;
  const text = typeof content === "string" ? content.trim() : Array.isArray(content) ? content.filter((part) => part.type === "text").map((part) => part.text ?? "").join("\n").trim() : "";
  if (!text) throw new AiEngineError("invalid_output", "AI provider returned no usable output.", false);
  return { text, model: payload.model || model, usage: payload.usage ?? null };
}

async function runSavedProvider(request: AiRequest) {
  const provider = await db.getPrimaryAiProviderSecret();
  if (!provider || provider.provider === "managed") return null;
  if (provider.provider === "gemini") return runGeminiWithKey(request, provider.apiKey, provider.model || "gemini-2.5-flash");
  return runOpenAiCompatible(request, provider.apiKey, provider.baseUrl || "https://api.openai.com/v1", provider.model || "gpt-4o-mini");
}

export async function runAi(request: AiRequest) {
  consumeRate(request.identity);
  if (request.provider === "legacy_gemini") return runLegacyGemini(request);
  if (!request.system.trim() || !request.prompt.trim()) throw new AiEngineError("invalid_output", "AI request is empty.", false);
  try {
    const savedProviderResult = await runSavedProvider(request);
    if (savedProviderResult) return savedProviderResult;
    const messages: Message[] = [
      { role: "system", content: sanitizeAiText(request.system, 4_000) },
      { role: "user", content: sanitizeAiText(request.prompt, 12_000) },
    ];
    const response = await withTimeout(invokeLLM({ model: DEFAULT_MODEL, messages, maxTokens: request.maxOutputTokens ?? 600, ...(request.outputSchema ? { outputSchema: request.outputSchema } : {}),         ...(request.responseFormat ? { responseFormat: request.responseFormat } : {}) }));
    const content = response.choices?.[0]?.message?.content;
    const text = typeof content === "string" ? content.trim() : Array.isArray(content) ? content.filter((part) => part.type === "text").map((part) => part.text).join("\n").trim() : "";
    if (!text) throw new AiEngineError("invalid_output", "AI provider returned no usable output.", false);
    return { text, model: response.model, usage: response.usage ?? null };
  } catch (error) { throw normalizeError(error); }
}

export async function runAiJson<T>(request: Omit<AiRequest, "responseFormat">) {
  const result = await runAi({ ...request, responseFormat: { type: "json_object" } });
  try { return JSON.parse(result.text) as T; } catch { throw new AiEngineError("invalid_output", "AI provider returned invalid JSON.", false); }
}

export async function testExternalAiProvider(input: { provider: "openai_compatible" | "gemini" | "managed"; baseUrl?: string | null; apiKey: string }) {
  if (input.provider === "managed") return { ok: true, status: 200 } as const;
  const key = input.apiKey.trim();
  if (key.length < 8) return { ok: false, status: 400, message: "API key is too short." } as const;
  try {
    if (input.provider === "gemini") {
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + encodeURIComponent(key), { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) return { ok: false, status: response.status, message: "Gemini provider rejected the credential." } as const;
      return { ok: true, status: response.status } as const;
    }
    const base = (input.baseUrl?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
    const response = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return { ok: false, status: response.status, message: "OpenAI-compatible provider rejected the credential." } as const;
    return { ok: true, status: response.status } as const;
  } catch (error) { return { ok: false, status: 0, message: /timeout|abort/i.test(error instanceof Error ? error.message : "") ? "Provider test timed out." : "Provider test failed." } as const; }
}

export function getAiProviderStatus() {
  return { provider: "managed" as AiProvider, configured: Boolean(process.env.BUILT_IN_FORGE_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY), modelConfigured: Boolean(DEFAULT_MODEL), features: AI_FEATURES };
}

export function resetAiRateLimiterForTests() { rateWindow.clear(); }
