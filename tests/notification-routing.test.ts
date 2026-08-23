import { describe, expect, it } from "vitest";

import { buildOmniNotificationRoute, parseCampaignExternalUrl, parseCampaignLinkClick, parseOmniNotificationTarget, parsePromotionBadgeCampaign, parsePromotionBadgeData } from "../lib/notification-routing";

describe("automatic notification routing", () => {
  it("routes Finance, Ideas, and daily review reminders to their matching screens", () => {
    expect(buildOmniNotificationRoute({ kind: "finance", id: "daily-finance" })).toContain("screen=finance");
    expect(buildOmniNotificationRoute({ kind: "ideas", id: "daily-ideas" })).toContain("screen=ideas");
    expect(buildOmniNotificationRoute({ kind: "relationships", id: "contact-7" })).toContain("screen=relationships");
    expect(buildOmniNotificationRoute({ kind: "dashboard", id: "daily-review" })).toContain("screen=dashboard");
  });

  it("recognizes the extended automatic-routine target kinds", () => {
    expect(parseOmniNotificationTarget({ target: { kind: "finance", id: "daily-finance" } })).toEqual({ kind: "finance", id: "daily-finance" });
    expect(parseOmniNotificationTarget({ target: { kind: "relationships", id: "contact-7" } })).toEqual({ kind: "relationships", id: "contact-7" });
    expect(parseOmniNotificationTarget({ target: { kind: "dashboard", id: "daily-review" } })).toEqual({ kind: "dashboard", id: "daily-review" });
  });

  it("accepts only safe HTTP(S) external URLs attached to campaign payloads", () => {
    expect(parseCampaignExternalUrl({ externalUrl: "https://omnilife.example.com/offer" })).toBe("https://omnilife.example.com/offer");
    expect(parseCampaignExternalUrl({ externalUrl: "javascript:alert(1)" })).toBeNull();
    expect(parseCampaignExternalUrl({ externalUrl: "omnilife://offer" })).toBeNull();
  });

  it("extracts only a valid tracked campaign-link tap payload", () => {
    const payload = { campaignId: 7, externalUrl: "https://omnilife.example.com/offer", linkClickToken: "550e8400-e29b-41d4-a716-446655440000" };
    expect(parseCampaignLinkClick(payload)).toEqual({ campaignId: 7, linkClickToken: payload.linkClickToken });
    expect(parseCampaignLinkClick({ ...payload, linkClickToken: "not-a-token" })).toBeNull();
    expect(parseCampaignLinkClick({ ...payload, externalUrl: "javascript:alert(1)" })).toBeNull();
  });

  it("recognizes only explicit promotion badge payloads and does not give them a navigation target", () => {
    expect(parsePromotionBadgeCampaign({ campaignId: 9, category: "promotion", promotionBadgeOnly: true })).toBe(9);
    expect(parsePromotionBadgeCampaign({ campaignId: 9, category: "promotion" })).toBeNull();
    expect(parsePromotionBadgeCampaign({ campaignId: 9, category: "announcement", promotionBadgeOnly: true })).toBeNull();
  });

  it("extracts bounded-inbox display copy only from badge-only promotion payloads", () => {
    expect(parsePromotionBadgeData({ campaignId: 9, category: "promotion", promotionBadgeOnly: true, promotionTitle: "عرض خاص", promotionBody: "متاح لفترة محدودة" }))
      .toEqual({ campaignId: 9, title: "عرض خاص", body: "متاح لفترة محدودة" });
    expect(parsePromotionBadgeData({ campaignId: 9, category: "promotion", promotionTitle: "عرض خاص" })).toBeNull();
  });
});
