export type SubscriptionTier = "free" | "pro_monthly" | "pro_annual" | "lifetime" | "comped";

export const SUBSCRIPTION_PLANS = {
  free: { tier: "free", title: "Free", priceEgp: 0, durationDays: null, fullAccess: false, adFree: false },
  pro_monthly: { tier: "pro_monthly", title: "Pro Monthly", priceEgp: 150, durationDays: 30, fullAccess: true, adFree: true, savingsText: "" },
  pro_annual: { tier: "pro_annual", title: "Pro Annual", priceEgp: 1200, durationDays: 365, fullAccess: true, adFree: true, savingsText: "وفر 600 جنيه — 33%" },
  lifetime: { tier: "lifetime", title: "Lifetime", priceEgp: 3000, durationDays: null, fullAccess: true, adFree: true, savingsText: "الأكثر توفيرًا / Most Popular" },
  comped: { tier: "comped", title: "Complimentary Pro", priceEgp: 0, durationDays: null, fullAccess: true, adFree: true, savingsText: "وصول استثنائي" },
} as const;

export const PAYMENT_METHODS = {
  instapay: { label: "InstaPay", url: "https://ipn.eg/S/mosaudi/instapay/1P8VGl" },
  vodafone_cash: { label: "Vodafone Cash", url: "http://vf.eg/vfcash?id=mt&qrId=sZttJT" },
} as const;

export function isPaidTier(tier: SubscriptionTier) {
  return tier === "pro_monthly" || tier === "pro_annual" || tier === "lifetime" || tier === "comped";
}
