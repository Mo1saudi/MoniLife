import { describe, expect, it } from "vitest";

import { canAccessPremiumFeature, hasPremiumAccess } from "../lib/subscription-guard";
import { SUBSCRIPTION_PLANS } from "../shared/subscription-plans";

describe("OMNI LIFE subscription plans", () => {
  it("uses the approved EGP prices and annual saving", () => {
    expect(SUBSCRIPTION_PLANS.free.priceEgp).toBe(0);
    expect(SUBSCRIPTION_PLANS.pro_monthly.priceEgp).toBe(150);
    expect(SUBSCRIPTION_PLANS.pro_annual.priceEgp).toBe(1200);
    expect(SUBSCRIPTION_PLANS.lifetime.priceEgp).toBe(3000);
    expect(SUBSCRIPTION_PLANS.pro_annual.savingsText).toContain("600");
  });

  it("blocks Free access but allows paid and complimentary access", () => {
    expect(hasPremiumAccess({ tier: "free", isCompedFree: false, expiresAt: null })).toBe(false);
    expect(hasPremiumAccess({ tier: "pro_monthly", isCompedFree: false, expiresAt: "2030-01-01T00:00:00.000Z" })).toBe(true);
    expect(hasPremiumAccess({ tier: "lifetime", isCompedFree: false, expiresAt: null })).toBe(true);
    expect(hasPremiumAccess({ tier: "free", isCompedFree: true, expiresAt: null })).toBe(true);
  });

  it("opens the paywall callback only for non-entitled accounts", () => {
    let blocked = 0;
    expect(canAccessPremiumFeature({ tier: "free", isCompedFree: false, expiresAt: null }, () => { blocked += 1; })).toBe(false);
    expect(blocked).toBe(1);
    expect(canAccessPremiumFeature({ tier: "comped", isCompedFree: true, expiresAt: null }, () => { blocked += 1; })).toBe(true);
    expect(blocked).toBe(1);
  });
});
