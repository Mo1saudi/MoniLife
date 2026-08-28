import { randomUUID } from "crypto";

/** Creates an opaque per-device token used only when a campaign includes a link. */
export function createCampaignLinkToken(hasDestinationUrl: boolean) {
  return hasDestinationUrl ? randomUUID() : null;
}
