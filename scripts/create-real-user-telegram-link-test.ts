import "dotenv/config";

import { createTelegramLinkChallenge } from "../server/supabase";

async function main() {
  const email = process.env.OMNI_TEST_ACCOUNT_EMAIL ?? "mohamedseo2002@gmail.com";
  const password = process.env.OMNI_ADMIN_PASSWORD;
  if (!password) throw new Error("The configured test-account password is unavailable.");

  const challenge = await createTelegramLinkChallenge(email, password);
  console.log(JSON.stringify({
    email,
    botUsername: challenge.botUsername,
    code: challenge.code,
    link: `https://t.me/${challenge.botUsername}?start=link_${challenge.code}`,
    expiresAt: challenge.expiresAt,
  }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
