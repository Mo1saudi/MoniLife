import { randomUUID } from "crypto";
import * as db from "./db";
import { createCampaignLinkToken } from "./campaign-link-token";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";
const OMNI_CAMPAIGN_CHANNEL = "omni-life-high-priority";

type ExpoTicket = { status: "ok" | "error"; id?: string; message?: string; details?: { error?: string } };
type ExpoReceipt = { status: "ok" | "error"; message?: string; details?: { error?: string } };
type ExpoResponse = { data?: ExpoTicket[]; errors?: Array<{ message?: string }> };
type ExpoReceiptsResponse = { data?: Record<string, ExpoReceipt>; errors?: Array<{ message?: string }> };

export function formatAdministratorRemoteNotification(input: { title: string; body: string }) {
  return {
    title: input.title.replace(/\s+/g, " ").trim().slice(0, 120),
    body: input.body.replace(/\s+/g, " ").trim().slice(0, 4000),
  };
}

function safeDispatchError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/timeout|abort/i.test(message)) return "Timed out while contacting the push service. Please retry.";
  return message.replace(/\s+/g, " ").trim().slice(0, 240) || "The push service rejected the request.";
}

function chunks<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

function receiptError(receipt?: ExpoReceipt) {
  return receipt?.details?.error ?? receipt?.message ?? "Expo receipt rejected the notification";
}

function expoResponseError(body: ExpoResponse, status: number) {
  return body.errors?.[0]?.message ?? `Expo Push request failed (${status})`;
}

async function sendExpoPayload(payload: Array<Record<string, unknown>>) {
  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25_000),
  });
  const body = await response.json().catch(() => ({})) as ExpoResponse;
  if (!response.ok) throw new Error(expoResponseError(body, response.status));
  if (!Array.isArray(body.data)) throw new Error(expoResponseError(body, response.status));
  if (body.data.length !== payload.length) throw new Error(`Expo returned ${body.data.length} tickets for ${payload.length} notifications.`);
  return body.data;
}

async function getExpoReceipts(ticketIds: string[]) {
  const receipts = new Map<string, ExpoReceipt>();
  if (!ticketIds.length) return receipts;
  // Expo may need a short moment to create receipts after returning tickets.
  if (process.env.NODE_ENV !== "test") await new Promise((resolve) => setTimeout(resolve, 1500));
  const response = await fetch(EXPO_RECEIPTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ ids: ticketIds }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => ({})) as ExpoReceiptsResponse;
  // Keep a successful send usable if a legacy/mock endpoint returns the ticket shape;
  // real Expo receipts always use an object keyed by ticket ID.
  if (!response.ok || !body.data) {
    throw new Error(body.errors?.[0]?.message ?? `Expo receipt request failed (${response.status})`);
  }
  if (Array.isArray(body.data)) return receipts;
  for (const ticketId of ticketIds) {
    const receipt = body.data[ticketId];
    if (receipt) receipts.set(ticketId, receipt);
  }
  return receipts;
}

/** Sends a campaign only to active, opted-in devices and records Expo acceptance tickets per device. */
export async function dispatchNotificationCampaign(campaignId: number) {
  const campaign = await db.getNotificationCampaign(campaignId);
  if (!campaign) throw new Error("Campaign not found");
  if (campaign.status === "sent" || campaign.status === "cancelled" || campaign.status === "sending") return { skipped: campaign.status, accepted: 0, failed: 0 };

  await db.updateNotificationCampaign(campaign.id, { status: "sending" });
  const devices = await db.listActiveNotificationDevices(campaign.audience, campaign.recipientEmails);
  if (devices.length === 0) {
    await db.updateNotificationCampaign(campaign.id, { status: "sent", sentAt: new Date() });
    return { accepted: 0, failed: 0, recipients: 0, warning: "No active opted-in devices match the selected audience." };
  }
  let accepted = 0;
  let failed = 0;
  const ticketIds: string[] = [];
  const ticketRecipients = new Map<string, { device: typeof devices[number]; linkClickToken: string | null }>();
  try {
    // Stored devices can include builds from older Expo projects. One token per request
    // prevents Expo from rejecting a mixed-project batch and still records every result.
    for (const batch of chunks(devices, 1)) {
      const outbound = batch.map((device) => ({ device, linkClickToken: createCampaignLinkToken(Boolean(campaign.destinationUrl)) }));
      const presentation = formatAdministratorRemoteNotification({ title: campaign.title, body: campaign.body });
      const payload = outbound.map(({ device, linkClickToken }) => ({
        to: device.expoPushToken,
        title: presentation.title,
        body: presentation.body,
        sound: "sound_admin.wav",
        priority: "high",
        channelId: OMNI_CAMPAIGN_CHANNEL,
        badge: 1,
        data: {
          campaignId: campaign.id,
          category: campaign.category,
          ...(campaign.destinationUrl ? { externalUrl: campaign.destinationUrl, linkClickToken } : {}),
        },
      }));
      const tickets = await sendExpoPayload(payload);

      await Promise.all(outbound.map(async ({ device, linkClickToken }, index) => {
        const ticket = tickets[index];
        if (ticket?.status === "ok") {
          accepted += 1;
          if (ticket.id) {
            ticketIds.push(ticket.id);
            ticketRecipients.set(ticket.id, { device, linkClickToken });
          }
          return db.createNotificationCampaignDelivery({ campaignId: campaign.id, deviceId: device.id, expoTicketId: ticket.id ?? null, linkClickToken, status: "accepted" });
        }
        failed += 1;
        const error = ticket?.details?.error ?? ticket?.message ?? "Expo rejected the notification";
        if (error === "DeviceNotRegistered") await db.deactivateNotificationDevice(device.id);
        return db.createNotificationCampaignDelivery({ campaignId: campaign.id, deviceId: device.id, linkClickToken, status: error === "DeviceNotRegistered" ? "invalid_token" : "failed", error });
      }));
    }
    const receipts = await getExpoReceipts(ticketIds);
    for (const [ticketId, receipt] of receipts) {
      if (receipt.status !== "error") continue;
      const target = ticketRecipients.get(ticketId);
      if (!target) continue;
      accepted = Math.max(0, accepted - 1);
      failed += 1;
      const error = receiptError(receipt);
      if (error === "DeviceNotRegistered") await db.deactivateNotificationDevice(target.device.id);
      await db.createNotificationCampaignDelivery({ campaignId: campaign.id, deviceId: target.device.id, expoTicketId: ticketId, linkClickToken: target.linkClickToken, status: error === "DeviceNotRegistered" ? "invalid_token" : "failed", error });
    }
    const finalStatus = failed > 0 && accepted === 0 ? "failed" : "sent";
    await db.updateNotificationCampaign(campaign.id, finalStatus === "sent" ? { status: finalStatus, sentAt: new Date() } : { status: finalStatus });
    return { accepted, failed, recipients: devices.length };
  } catch (error) {
    await db.updateNotificationCampaign(campaign.id, { status: "failed" });
    return { accepted, failed, recipients: devices.length, error: safeDispatchError(error) };
  }
}

/** Sends a draft notification only to the active, opted-in devices of the authenticated administrator. */
export async function sendAdministratorPushTest(input: { adminEmail: string; title: string; body: string }) {
  const registeredDevices = await db.listActiveNotificationDevicesForManualEmail(input.adminEmail);
  if (registeredDevices.length === 0) {
    return { accepted: 0, failed: 0, recipients: 0, warning: "No active opted-in device is registered for this administrator account." };
  }

  // A test is intentionally sent only to the most recently active administrator device.
  // Older installs can retain stale Expo tokens and should not make a one-device test fail.
  const newestDevice = registeredDevices.reduce((latest, candidate) => {
    const latestSeenAt = latest.lastSeenAt ? new Date(latest.lastSeenAt).getTime() : 0;
    const candidateSeenAt = candidate.lastSeenAt ? new Date(candidate.lastSeenAt).getTime() : 0;
    return candidateSeenAt > latestSeenAt ? candidate : latest;
  });
  const devices = [newestDevice];

  let accepted = 0;
  let failed = 0;
  let firstFailureError: string | undefined;
  const ticketIds: string[] = [];
  const ticketDevices = new Map<string, typeof devices[number]>();
  try {
    // The administrator may have old and current builds installed on different devices.
    // Do not put their opaque Expo tokens into one request.
    for (const batch of chunks(devices, 1)) {
      const tickets = await sendExpoPayload(batch.map((device) => {
        const presentation = formatAdministratorRemoteNotification(input);
        return {
          to: device.expoPushToken,
          title: presentation.title,
          body: presentation.body,
          sound: "sound_admin.wav",
          priority: "high",
          channelId: OMNI_CAMPAIGN_CHANNEL,
          badge: 1,
          data: { type: "administrator_push_test", isTest: true },
        };
      }));

      await Promise.all(batch.map(async (device, index) => {
        const ticket = tickets[index];
        if (ticket?.status === "ok") {
          accepted += 1;
          if (ticket.id) {
            ticketIds.push(ticket.id);
            ticketDevices.set(ticket.id, device);
          }
          return;
        }
        failed += 1;
        const error = ticket?.details?.error ?? ticket?.message ?? "Expo rejected the notification";
        firstFailureError ??= error;
        if (error === "DeviceNotRegistered") await db.deactivateNotificationDevice(device.id);
      }));
    }
    const receipts = await getExpoReceipts(ticketIds);
    for (const [ticketId, receipt] of receipts) {
      if (receipt.status !== "error") continue;
      const device = ticketDevices.get(ticketId);
      if (!device) continue;
      accepted = Math.max(0, accepted - 1);
      failed += 1;
      const error = receiptError(receipt);
      firstFailureError ??= error;
      if (error === "DeviceNotRegistered") await db.deactivateNotificationDevice(device.id);
    }
    return { accepted, failed, recipients: devices.length, ...(firstFailureError ? { error: firstFailureError } : {}) };
  } catch (error) {
    return { accepted, failed, recipients: devices.length, error: safeDispatchError(error) };
  }
}

/** Delivers an immediate subscription-status notice only to the applicant’s opted-in devices. */
export async function sendSubscriptionStatusPush(input: { email: string; plan: "pro" | "pro_monthly" | "pro_annual" | "lifetime"; decision: "approved" | "rejected" }) {
  const devices = await db.listActiveNotificationDevicesForManualEmail(input.email);
  if (devices.length === 0) return { recipients: 0 };
  const planLabel = input.plan === "lifetime" ? "Lifetime" : input.plan === "pro_annual" ? "Pro Annual" : "Pro Monthly";
  const title = input.decision === "approved" ? "تم اعتماد اشتراكك" : "تمت مراجعة طلب اشتراكك";
  const body = input.decision === "approved" ? `تم تفعيل خطة ${planLabel} في OMNI LIFE.` : "لم تتم الموافقة على الطلب. راجع الحالة داخل التطبيق.";
  const presentation = formatAdministratorRemoteNotification({ title, body });
  for (const batch of chunks(devices, 1)) {
    await fetch(EXPO_PUSH_URL, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(batch.map((device) => ({ to: device.expoPushToken, title: presentation.title, body: presentation.body, sound: "sound_admin.wav", priority: "high", channelId: OMNI_CAMPAIGN_CHANNEL, badge: 1, data: { target: { kind: "dashboard", id: "subscription" }, screen: "community", type: "subscription" } }))), signal: AbortSignal.timeout(25_000) });
  }
  return { recipients: devices.length };
}
