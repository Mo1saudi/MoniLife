import { describe, expect, it } from "vitest";

import { formatPromotionReceivedAt, markPromotionInboxRead, mergePromotionInbox, removePromotionInboxItem } from "../lib/promotion-inbox";

describe("promotional notification inbox", () => {
  it("retains only the newest three promotional alerts", () => {
    let inbox = [] as ReturnType<typeof mergePromotionInbox>;
    for (const id of [1, 2, 3, 4]) inbox = mergePromotionInbox(inbox, { campaignId: id, title: `Offer ${id}`, body: "Details" });
    expect(inbox.map((item) => item.campaignId)).toEqual([4, 3, 2]);
  });

  it("refreshes a duplicate promotion and marks visible inbox items read without removing them", () => {
    const inbox = mergePromotionInbox([{ campaignId: 2, title: "Old", body: "Old", receivedAt: "2026-08-20T08:00:00.000Z", read: true }], { campaignId: 2, title: "New", body: "New" });
    expect(inbox).toEqual([expect.objectContaining({ campaignId: 2, title: "New", body: "New", read: false, receivedAt: expect.any(String) })]);
    expect(markPromotionInboxRead(inbox)[0]).toEqual(expect.objectContaining({ campaignId: 2, read: true }));
  });

  it("removes only the selected promotional alert so its unread contribution also disappears", () => {
    const inbox = [
      { campaignId: 3, title: "Newest", body: "", receivedAt: "2026-08-21T08:00:00.000Z", read: false },
      { campaignId: 2, title: "Keep", body: "", receivedAt: "2026-08-20T08:00:00.000Z", read: false },
      { campaignId: 1, title: "Read", body: "", receivedAt: "2026-08-19T08:00:00.000Z", read: true },
    ];
    expect(removePromotionInboxItem(inbox, 3)).toEqual([
      { campaignId: 2, title: "Keep", body: "", receivedAt: "2026-08-20T08:00:00.000Z", read: false },
      { campaignId: 1, title: "Read", body: "", receivedAt: "2026-08-19T08:00:00.000Z", read: true },
    ]);
  });

  it("formats the saved arrival timestamp as readable date and time metadata", () => {
    expect(mergePromotionInbox([], { campaignId: 8, title: "Timed", body: "", receivedAt: "2026-08-21T08:15:00.000Z" })[0]?.receivedAt).toBe("2026-08-21T08:15:00.000Z");
    expect(formatPromotionReceivedAt("2026-08-21T08:15:00.000Z", false)).toMatch(/21 Aug 2026/);
    expect(formatPromotionReceivedAt("not-a-date", true)).toBe("وقت الوصول غير متاح");
  });
});
