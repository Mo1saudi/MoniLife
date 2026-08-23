export type OmniNotificationTarget = {
  kind: "task" | "habit" | "finance" | "ideas" | "relationships" | "dashboard";
  id: string;
};

export type CampaignLinkClick = { campaignId: number; linkClickToken: string };
export type PromotionBadgeData = { campaignId: number; title: string; body: string; receivedAt?: string };

/** Identifies a promotion that should remain a phone/banner and badge-only alert, not a screen route. */
export function parsePromotionBadgeCampaign(data: unknown): number | null {
  return parsePromotionBadgeData(data)?.campaignId ?? null;
}

/** Extracts safe display copy for a promotion that belongs only in the notification inbox. */
export function parsePromotionBadgeData(data: unknown): PromotionBadgeData | null {
  if (!data || typeof data !== "object") return null;
  const candidate = data as Record<string, unknown>;
  const campaignId = candidate.campaignId;
  const title = candidate.promotionTitle;
  const body = candidate.promotionBody;
  if (candidate.promotionBadgeOnly !== true || candidate.category !== "promotion" || typeof campaignId !== "number" || !Number.isInteger(campaignId) || campaignId <= 0) return null;
  return {
    campaignId,
    title: typeof title === "string" && title.trim() ? title.trim() : "OMNI LIFE",
    body: typeof body === "string" && body.trim() ? body.trim() : "",
  };
}

export function supportsNativeNotifications(platform: string) {
  return platform === "android" || platform === "ios";
}

export function buildOmniNotificationRoute(target: OmniNotificationTarget) {
  const screen = target.kind === "task" ? "tasks" : target.kind === "habit" ? "habits" : target.kind;
  const params = new URLSearchParams({ screen, targetId: target.id });
  return `/?${params.toString()}`;
}

export function parseOmniNotificationTarget(data: unknown): OmniNotificationTarget | null {
  if (!data || typeof data !== "object") return null;
  const candidate = (data as Record<string, unknown>).target;
  if (!candidate || typeof candidate !== "object") return null;

  const { kind, id } = candidate as Record<string, unknown>;
  if ((kind !== "task" && kind !== "habit" && kind !== "finance" && kind !== "ideas" && kind !== "relationships" && kind !== "dashboard") || typeof id !== "string" || !id.trim()) return null;
  return { kind, id };
}

/** Returns a safe HTTP(S) URL attached to an administrator campaign, if present. */
export function parseCampaignExternalUrl(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const externalUrl = (data as Record<string, unknown>).externalUrl;
  if (typeof externalUrl !== "string" || !externalUrl.trim()) return null;

  try {
    const parsed = new URL(externalUrl);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? externalUrl : null;
  } catch {
    return null;
  }
}

/** Extracts the opaque, one-time delivery token used to count a tapped campaign link. */
export function parseCampaignLinkClick(data: unknown): CampaignLinkClick | null {
  if (!parseCampaignExternalUrl(data) || !data || typeof data !== "object") return null;
  const candidate = data as Record<string, unknown>;
  const campaignId = candidate.campaignId;
  const linkClickToken = candidate.linkClickToken;
  if (typeof campaignId !== "number" || !Number.isInteger(campaignId) || campaignId <= 0 || typeof linkClickToken !== "string") return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(linkClickToken)) return null;
  return { campaignId, linkClickToken };
}
