import { describe, expect, it } from "vitest";
import { appRouter } from "../server/routers";

describe("OMNI LIFE administrator manual login", () => {
  it("accepts the configured administrator password through the manual-auth route", async () => {
    const configuredPassword = process.env.OMNI_ADMIN_PASSWORD;
    expect(configuredPassword).toMatch(/^\d{6}$/);
    const caller = appRouter.createCaller({
      user: null,
      manualUserId: null,
      manualUserEmail: null,
      req: { headers: {}, protocol: "https" },
      res: { clearCookie: () => undefined },
    } as never);
    const profile = await caller.manualAuth.login({
      email: "mohamedseo2002@gmail.com",
      pin: configuredPassword!,
    });
    expect(profile.email).toBe("mohamedseo2002@gmail.com");
    expect(profile.manualAdminToken).toEqual(expect.any(String));
  }, 20_000);
});
