import "dotenv/config";

import { configureTelegramBotCommands } from "../server/supabase";

configureTelegramBotCommands()
  .then(() => console.log("Telegram bot commands configured."))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
