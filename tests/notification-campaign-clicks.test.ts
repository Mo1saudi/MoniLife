import { describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  recordNotificationCampaignLinkClick: vi.fn(),
}));

vi.mock("../server/db", () => dbMock);

import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

function createContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

describe("campaign link click analytics", () => {
  it("records a valid opaque delivery token without requiring a new login flow", async () => {
    dbMock.recordNotificationCampaignLinkClick.mockResolvedValue({ recorded: true });
    const caller = appRouter.createCaller(createContext());

    await expect(caller.notifications.recordCampaignLinkClick({ campaignId: 7, linkClickToken: "550e8400-e29b-41d4-a716-446655440000" })).resolves.toEqual({ recorded: true });
    expect(dbMock.recordNotificationCampaignLinkClick).toHaveBeenCalledWith(7, "550e8400-e29b-41d4-a716-446655440000");
  });

  it("rejects malformed tracking tokens before any database write", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.notifications.recordCampaignLinkClick({ campaignId: 7, linkClickToken: "invalid-token" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
