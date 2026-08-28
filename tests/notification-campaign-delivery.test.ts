import { afterEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  getNotificationCampaign: vi.fn(),
  updateNotificationCampaign: vi.fn(),
  listActiveNotificationDevices: vi.fn(),
  createNotificationCampaignDelivery: vi.fn(),
  deactivateNotificationDevice: vi.fn(),
}));

vi.mock("../server/db", () => dbMock);

import { dispatchNotificationCampaign } from "../server/notification-campaign-service";

const campaign = {
  id: 14,
  title: "تذكير OMNI LIFE",
  body: "أكمل عادتك اليوم.",
  destinationUrl: "https://omnilife.example.com/learn-more",
  category: "habit_tip" as const,
  audience: "all_opted_in" as const,
  status: "draft" as const,
};

describe("remote notification campaign delivery", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends only opted-in device records supplied by the database and records Expo acceptance", async () => {
    dbMock.getNotificationCampaign.mockResolvedValue(campaign);
    dbMock.listActiveNotificationDevices.mockResolvedValue([{ id: 7, expoPushToken: "ExponentPushToken[accepted-device]" }]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [{ status: "ok", id: "ticket-1" }] }) }));

    await expect(dispatchNotificationCampaign(14)).resolves.toEqual({ accepted: 1, failed: 0, recipients: 1 });
    expect(dbMock.listActiveNotificationDevices).toHaveBeenCalledWith("all_opted_in", undefined);
    expect(dbMock.createNotificationCampaignDelivery).toHaveBeenCalledWith(expect.objectContaining({ campaignId: 14, deviceId: 7, expoTicketId: "ticket-1", status: "accepted" }));
    expect(dbMock.updateNotificationCampaign).toHaveBeenLastCalledWith(14, expect.objectContaining({ status: "sent" }));
    const request = vi.mocked(fetch).mock.calls[0]?.[1];
    const payload = JSON.parse(String(request?.body));
    expect(payload).toEqual([expect.objectContaining({ title: campaign.title, body: campaign.body, priority: "high", channelId: "omni-life-high-priority", badge: 1, data: expect.objectContaining({ campaignId: 14, category: "habit_tip", externalUrl: "https://omnilife.example.com/learn-more", linkClickToken: expect.any(String) }) })]);
    expect(payload[0].data.target).toBeUndefined();
    expect(dbMock.createNotificationCampaignDelivery).toHaveBeenCalledWith(expect.objectContaining({ linkClickToken: payload[0].data.linkClickToken }));
  });

  it("deactivates an unregistered Expo device instead of continuing to target it", async () => {
    dbMock.getNotificationCampaign.mockResolvedValue({ ...campaign, id: 15 });
    dbMock.listActiveNotificationDevices.mockResolvedValue([{ id: 8, expoPushToken: "ExponentPushToken[removed-device]" }]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [{ status: "error", details: { error: "DeviceNotRegistered" } }] }) }));

    await expect(dispatchNotificationCampaign(15)).resolves.toEqual({ accepted: 0, failed: 1, recipients: 1 });
    expect(dbMock.deactivateNotificationDevice).toHaveBeenCalledWith(8);
    expect(dbMock.createNotificationCampaignDelivery).toHaveBeenCalledWith(expect.objectContaining({ status: "invalid_token" }));
  });

  it("sends promotions using the administrator title and body without an application screen target", async () => {
    dbMock.getNotificationCampaign.mockResolvedValue({ ...campaign, id: 16, category: "promotion" });
    dbMock.listActiveNotificationDevices.mockResolvedValue([{ id: 9, expoPushToken: "ExponentPushToken[promotion-device]" }]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [{ status: "ok", id: "ticket-promotion" }] }) }));

    await dispatchNotificationCampaign(16);
    const request = vi.mocked(fetch).mock.calls[0]?.[1];
    const payload = JSON.parse(String(request?.body));
    expect(payload[0]).toEqual(expect.objectContaining({ title: campaign.title, body: campaign.body, priority: "high", channelId: "omni-life-high-priority", data: expect.objectContaining({ category: "promotion" }) }));
    expect(payload[0].data.target).toBeUndefined();
  });
});
