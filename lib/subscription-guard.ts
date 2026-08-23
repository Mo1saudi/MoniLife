import { isPaidTier, type SubscriptionTier } from "../shared/subscription-plans";

export type SubscriptionEntitlement = { tier: SubscriptionTier; isCompedFree: boolean; expiresAt: string | null };

export function hasPremiumAccess(entitlement: SubscriptionEntitlement | null | undefined) {
  return Boolean(entitlement && (entitlement.isCompedFree || isPaidTier(entitlement.tier)));
}

export function canAccessPremiumFeature(entitlement: SubscriptionEntitlement | null | undefined, onBlocked: () => void) {
  if (hasPremiumAccess(entitlement)) return true;
  onBlocked();
  return false;
}
