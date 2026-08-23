import { describe, expect, it } from "vitest";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";
import { OMNI_ADMIN_EMAIL } from "../shared/admin-access";

function createContext(email: string | null): TrpcContext {
  return {
    user: { id: 1, openId: "test-admin", email, name: "Test user", loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

describe("OMNI LIFE audit routes", () => {
  it("rejects administration access unless the authenticated email is approved", async () => {
    const caller = appRouter.createCaller(createContext("member@example.com"));
    await expect(caller.admin.audit.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows the approved administrator to read audit history", async () => {
    const caller = appRouter.createCaller(createContext(OMNI_ADMIN_EMAIL));
    await expect(caller.admin.audit.list()).resolves.toEqual(expect.any(Array));
  });
});
