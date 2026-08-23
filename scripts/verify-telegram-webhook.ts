import "dotenv/config";

import { getTelegramWebhookSecret } from "../server/supabase";

const webhookUrl = process.argv[2];

async function main() {
  if (!webhookUrl?.startsWith("https://")) {
    throw new Error("Provide the deployed HTTPS Telegram webhook URL.");
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Bot-Api-Secret-Token": getTelegramWebhookSecret(),
    },
    body: JSON.stringify({ update_id: 0 }),
  });

  if (!response.ok) throw new Error(`Signed Telegram webhook probe failed with HTTP ${response.status}.`);
  console.log("Signed Telegram webhook probe accepted.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
