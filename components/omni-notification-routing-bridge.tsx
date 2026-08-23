import { useEffect } from "react";
import { Platform } from "react-native";

import { getPresentedOmniPromotionNotifications, handleLastOmniNotificationResponse, observeOmniNotificationResponses, observeOmniPromotionNotifications } from "@/lib/omni-notifications";
import type { CampaignLinkClick, OmniNotificationTarget, PromotionBadgeData } from "@/lib/notification-routing";

export function OmniNotificationRoutingBridge({ onTarget, onCampaignLinkClick, onPromotionBadge }: { onTarget: (target: OmniNotificationTarget) => void; onCampaignLinkClick?: (click: CampaignLinkClick) => void; onPromotionBadge?: (promotion: PromotionBadgeData) => void }) {
  useEffect(() => {
    if (Platform.OS === "web") return;
    void handleLastOmniNotificationResponse(onTarget, onCampaignLinkClick, onPromotionBadge);
    if (onPromotionBadge) {
      void getPresentedOmniPromotionNotifications().then((promotions) => promotions.forEach(onPromotionBadge)).catch(() => undefined);
    }
    const responseSubscription = observeOmniNotificationResponses(onTarget, onCampaignLinkClick, onPromotionBadge);
    const receiptSubscription = onPromotionBadge ? observeOmniPromotionNotifications(onPromotionBadge) : () => undefined;
    return () => {
      responseSubscription();
      receiptSubscription();
    };
  }, [onCampaignLinkClick, onPromotionBadge, onTarget]);

  return null;
}
