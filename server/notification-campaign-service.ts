import { randomUUID } from "crypto";
import * as db from "./db";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const OMNI_CAMPAIGN_CHANNEL = "omni-life-high-priority";

type ExpoTicket = { status: "ok" | "error"; id?: string; message?: string; details?: { error?: string } };
type ExpoResponse = { data?: ExpoTicket[]; errors?: Array<{ message?: string }> };

function chunks<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

/** Sends a campaign only to active, opted-in devices and records Expo acceptance tickets per device. */
export async function dispatchNotificationCampaign(campaignId: number) {
  const campaign = await db.getNotificationCampaign(campaignId);
  if (!campaign) throw new Error("Campaign not found");
  if (campaign.status === "sent" || campaign.status === "cancelled" || campaign.status === "sending") return { skipped: campaign.status, accepted: 0, failed: 0 };

  await db.updateNotificationCampaign(campaign.id, { status: "sending" });
  const devices = await db.listActiveNotificationDevices(campaign.audience);
  let accepted = 0;
  let failed = 0;
  try {
    for (const batch of chunks(devices, 100)) {
      const outbound = batch.map((device) => ({ device, linkClickToken: campaign.destinationUrl ? randomUUID() : null }));
      const payload = outbound.map(({ device, linkClickToken }) => ({
        to: device.expoPushToken,
        title: campaign.title,
        body: campaign.body,
        sound: "sound_admin.wav",
        priority: "high",
        channelId: OMNI_CAMPAIGN_CHANNEL,
        badge: 1,
        data: {
          campaignId: campaign.id,
          category: campaign.category,
          ...(campaign.category === "promotion" ? { promotionBadgeOnly: true, promotionTitle: campaign.title, promotionBody: campaign.body } : { target: { kind: "dashboard", id: `campaign-${campaign.id}` } }),
          url: "/?screen=notifications",
          ...(campaign.destinationUrl ? { externalUrl: campaign.destinationUrl, linkClickToken } : {}),
        },
      }));
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(25_000),
      });
      const body = await response.json().catch(() => ({})) as ExpoResponse;
      if (!response.ok || !body.data) throw new Error(body.errors?.[0]?.message ?? `Expo Push request failed (${response.status})`);

      await Promise.all(outbound.map(async ({ device, linkClickToken }, index) => {
        const ticket = body.data?.[index];
        if (ticket?.status === "ok") {
          accepted += 1;
          return db.createNotificationCampaignDelivery({ campaignId: campaign.id, deviceId: device.id, expoTicketId: ticket.id ?? null, linkClickToken, status: "accepted" });
        }
        failed += 1;
        const error = ticket?.details?.error ?? ticket?.message ?? "Expo rejected the notification";
        if (error === "DeviceNotRegistered") await db.deactivateNotificationDevice(device.id);
        return db.createNotificationCampaignDelivery({ campaignId: campaign.id, deviceId: device.id, linkClickToken, status: error === "DeviceNotRegistered" ? "invalid_token" : "failed", error });
      }));
    }
    await db.updateNotificationCampaign(campaign.id, { status: "sent", sentAt: new Date() });
    return { accepted, failed, recipients: devices.length };
  } catch (error) {
    await db.updateNotificationCampaign(campaign.id, { status: "failed" });
    throw error;
  }
}

/** Delivers an immediate subscription-status notice only to the applicant’s opted-in devices. */
export async function sendSubscriptionStatusPush(input: { email: string; plan: "pro" | "pro_monthly" | "pro_annual" | "lifetime"; decision: "approved" | "rejected" }) {
  const devices = await db.listActiveNotificationDevicesForManualEmail(input.email);
  if (devices.length === 0) return { recipients: 0 };
  const planLabel = input.plan === "lifetime" ? "Lifetime" : input.plan === "pro_annual" ? "Pro Annual" : "Pro Monthly";
  const title = input.decision === "approved" ? "تم اعتماد اشتراكك" : "تمت مراجعة طلب اشتراكك";
  const body = input.decision === "approved" ? `تم تفعيل خطة ${planLabel} في OMNI LIFE.` : "لم تتم الموافقة على الطلب. راجع الحالة داخل التطبيق.";
  for (const batch of chunks(devices, 100)) {
    await fetch(EXPO_PUSH_URL, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(batch.map((device) => ({ to: device.expoPushToken, title, body, sound: "sound_admin.wav", priority: "high", channelId: OMNI_CAMPAIGN_CHANNEL, badge: 1, data: { target: { kind: "dashboard", id: "subscription" }, screen: "community", type: "subscription" } }))), signal: AbortSignal.timeout(25_000) });
  }
  return { recipients: devices.length };
}
