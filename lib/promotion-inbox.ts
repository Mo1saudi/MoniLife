export type PromotionInboxItem = {
  campaignId: number;
  title: string;
  body: string;
  receivedAt: string;
  read: boolean;
};

export type PromotionInboxInput = Omit<PromotionInboxItem, "read" | "receivedAt"> & { receivedAt?: string };

/** Adds or refreshes a promotion while retaining only the three most recent inbox items. */
export function mergePromotionInbox(current: PromotionInboxItem[], incoming: PromotionInboxInput): PromotionInboxItem[] {
  const retained = current.filter((item) => item.campaignId !== incoming.campaignId);
  return [{ ...incoming, receivedAt: incoming.receivedAt ?? new Date().toISOString(), read: false }, ...retained].slice(0, 3);
}

export function markPromotionInboxRead(items: PromotionInboxItem[]) {
  return items.map((item) => ({ ...item, read: true }));
}

/** Removes one promotional alert from the local notification inbox without affecting other alerts. */
export function removePromotionInboxItem(items: PromotionInboxItem[], campaignId: number) {
  return items.filter((item) => item.campaignId !== campaignId);
}

export function formatPromotionReceivedAt(receivedAt: string, isArabic: boolean) {
  const date = new Date(receivedAt);
  if (Number.isNaN(date.getTime())) return isArabic ? "وقت الوصول غير متاح" : "Arrival time unavailable";
  return new Intl.DateTimeFormat(isArabic ? "ar-EG" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
