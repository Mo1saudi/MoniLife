import "dotenv/config";

import { configureTelegramWebhook, getTelegramWebhookInfo } from "../server/supabase";

const action = process.argv[2];

async function main() {
  if (action === "inspect") {
    const info = await getTelegramWebhookInfo();
    console.log(JSON.stringify({ url: info.url ?? "", pendingUpdateCount: info.pending_update_count ?? 0 }));
    return;
  }

  if (action === "configure") {
    const webhookUrl = process.argv[3];
    if (!webhookUrl) throw new Error("Provide the deployed HTTPS webhook URL.");
    await configureTelegramWebhook(webhookUrl);
    console.log("Telegram webhook configured.");
    return;
  }

  throw new Error("Usage: tsx scripts/manage-telegram-webhook.ts inspect | configure <https-url>");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
