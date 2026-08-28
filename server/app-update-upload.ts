import { createHash } from "node:crypto";
import express, { type Express } from "express";

import { isAuthorizedOmniAdmin } from "../shared/admin-access";
import * as db from "./db";
import { getSupabaseManualUserEmail } from "./supabase";
import { storagePut } from "./storage";

const MAX_APK_BYTES = 100 * 1024 * 1024;
const APK_CONTENT_TYPES = new Set(["application/vnd.android.package-archive", "application/octet-stream"]);

function headerValue(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function safeFileName(input: string) {
  const normalized = input.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
  return normalized.toLowerCase().endsWith(".apk") ? normalized : `${normalized || "omni-life-update"}.apk`;
}

export function registerAppUpdateUploadRoute(app: Express) {
  app.post(
    "/api/admin/app-updates/upload",
    express.raw({ type: Array.from(APK_CONTENT_TYPES), limit: "100mb" }),
    async (req, res) => {
      try {
        const token = headerValue(req.headers["x-omni-manual-token"]);
        const adminEmail = await getSupabaseManualUserEmail(token);
        if (!isAuthorizedOmniAdmin(adminEmail)) {
          res.status(403).json({ error: "Administrator access is restricted." });
          return;
        }
        const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
        if (body.length < 4 || body.length > MAX_APK_BYTES || body[0] !== 0x50 || body[1] !== 0x4b) {
          res.status(400).json({ error: "The uploaded file must be a valid APK under 100 MB." });
          return;
        }
        const versionName = headerValue(req.headers["x-omni-app-version"]);
        const versionCode = Number(headerValue(req.headers["x-omni-app-version-code"]));
        const fileName = safeFileName(headerValue(req.headers["x-omni-app-filename"]));
        const notes = headerValue(req.headers["x-omni-app-notes"]).slice(0, 4000);
        const mandatory = ["1", "true", "yes"].includes(headerValue(req.headers["x-omni-app-mandatory"]).toLowerCase());
        if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(versionName) || !Number.isSafeInteger(versionCode) || versionCode <= 0) {
          res.status(400).json({ error: "Enter a valid version name and positive Android version code." });
          return;
        }
        const actorUserId = adminEmail ? (await db.getUserByOpenId(`supabase:${adminEmail}`))?.id : undefined;
        if (!actorUserId) {
          res.status(503).json({ error: "Administrator database identity is unavailable." });
          return;
        }
        const digest = createHash("sha256").update(body).digest("hex");
        const stored = await storagePut(`app-releases/${versionCode}-${fileName}`, body, "application/vnd.android.package-archive");
        const release = await db.createAppRelease({
          versionName,
          versionCode,
          fileName,
          fileKey: stored.key,
          fileUrl: stored.url,
          fileSizeBytes: body.length,
          sha256: digest,
          notes: notes || null,
          mandatory,
          active: true,
          createdByUserId: actorUserId,
        });
        await db.createAdminAuditLog({ actorUserId, action: "publish_app_release", targetType: "app_release", targetId: String(release.id), details: `${versionName}:${versionCode}:${mandatory ? "mandatory" : "optional"}` });
        res.status(201).json({ release });
      } catch (error) {
        console.error("[AppUpdates] APK upload failed", error instanceof Error ? error.message : "unknown error");
        res.status(500).json({ error: "The APK update could not be published. Check server storage and database configuration." });
      }
    },
  );
}
