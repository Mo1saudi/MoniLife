import "dotenv/config";

import { createTelegramLinkChallenge, registerSupabaseManualProfile } from "../server/supabase";

async function main() {
  const suffix = Date.now().toString();
  const email = `telegram.e2e.${suffix}@omnilife.example`;
  const fullName = "اختبار استرداد أومني";
  const birthDate = "1995-06-14";
  const pin = "123456";

  await registerSupabaseManualProfile({
    fullName,
    birthDate,
    email,
    phone: "+201000000000",
    pin,
  });
  const challenge = await createTelegramLinkChallenge(email, pin);
  console.log(JSON.stringify({
    link: `https://t.me/${challenge.botUsername}?start=link_${challenge.code}`,
    fullName,
    birthDate,
    email,
    expiresAt: challenge.expiresAt,
  }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
