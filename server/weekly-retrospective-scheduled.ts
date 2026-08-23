import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { generateWeeklyRetrospectives } from "./weekly-retrospective-service";

export function registerWeeklyRetrospectiveScheduledRoute(app: Express) {
  app.post("/api/scheduled/weekly-retrospective", async (req: Request, res: Response) => {
    try {
      const actor = await sdk.authenticateRequest(req);
      if (!actor.isCron) return res.status(403).json({ error: "cron-only" });
      const generated = await generateWeeklyRetrospectives();
      return res.json({ ok: true, generated: generated.length });
    } catch (error) {
      console.error("[WeeklyRetrospective] Scheduled execution failed", error);
      return res.status(500).json({ error: "weekly-retrospective-failed" });
    }
  });
}
