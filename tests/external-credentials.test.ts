import { describe, expect, it } from "vitest";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;

async function fetchTelegramBotIdentity(token: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
        signal: AbortSignal.timeout(15_000),
      });
      const body = await response.json() as { ok?: boolean };
      if (response.ok && body.ok) return { response, body };
      throw new Error("Telegram rejected the configured bot token.");
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  throw lastError;
}

describe("external integration credentials", () => {
  it("accepts the configured Supabase service credential", async () => {
    expect(supabaseUrl).toBeTruthy();
    expect(supabaseServiceRoleKey).toBeTruthy();
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabaseServiceRoleKey! },
    });
    expect(response.ok).toBe(true);
  }, 15_000);

  it("accepts the configured Telegram bot credential", async () => {
    expect(telegramBotToken).toBeTruthy();
    const { response, body } = await fetchTelegramBotIdentity(telegramBotToken!);
    expect(response.ok).toBe(true);
    expect(body.ok).toBe(true);
  }, 50_000);
});
