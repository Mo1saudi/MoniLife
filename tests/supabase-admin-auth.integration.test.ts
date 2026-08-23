import { describe, expect, it } from "vitest";

import { getSupabaseManualUserEmail, loginSupabaseManualProfile } from "../server/supabase";

const shouldRun = process.env.RUN_EXTERNAL_INTEGRATION_TESTS === "1";

describe.skipIf(!shouldRun)("Supabase administrator authentication", () => {
  it("accepts the configured administrator account", async () => {
    const profile = await loginSupabaseManualProfile(
      "mohamedseo2002@gmail.com",
      process.env.OMNI_ADMIN_PASSWORD ?? "",
    );

    expect(profile.email).toBe("mohamedseo2002@gmail.com");
    expect(profile.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(profile.manualAdminToken).toBeTruthy();
    expect(await getSupabaseManualUserEmail(profile.manualAdminToken)).toBe("mohamedseo2002@gmail.com");
  }, 20_000);
});
