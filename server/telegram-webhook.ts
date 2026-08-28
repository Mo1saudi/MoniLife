import type { Express } from "express";
import { randomUUID } from "crypto";

import { getTelegramWebhookSecret, handleTelegramUpdate } from "./supabase";

function isValidWebhookSecret(value: string | undefined) {
  return Boolean(value) && value === getTelegramWebhookSecret();
}

export function registerTelegramWebhookRoutes(app: Express) {
  app.post("/api/telegram/webhook", async (req, res) => {
    const providedSecret = req.header("x-telegram-bot-api-secret-token");
    if (!isValidWebhookSecret(providedSecret)) {
      res.sendStatus(401);
      return;
    }
    try {
      await handleTelegramUpdate(req.body);
      res.sendStatus(200);
    } catch {
      const requestId = randomUUID();
      console.error(`[Telegram] webhook processing failed request=${requestId}`);
      res.status(500).json({ ok: false, code: "TELEGRAM_WEBHOOK_PROCESSING_FAILED", requestId });
    }
  });
}
