import type { Express, Request, Response } from "express";

import * as db from "./db";
import { dispatchNotificationCampaign } from "./notification-campaign-service";
import { sdk } from "./_core/sdk";

/** Registers the authenticated platform cron callback for scheduled campaign delivery. */
export function registerNotificationCampaignScheduledRoute(app: Express) {
  app.post("/api/scheduled/notification-campaign", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
      const campaign = await db.getNotificationCampaignByTaskUid(user.taskUid);
      if (!campaign) return res.json({ ok: true, skipped: "orphan" });
      const result = await dispatchNotificationCampaign(campaign.id);
      return res.json({ ok: true, campaignId: campaign.id, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[NotificationCampaign] Scheduled delivery failed", error);
      return res.status(500).json({ error: message, context: { path: req.path }, timestamp: new Date().toISOString() });
    }
  });
}
