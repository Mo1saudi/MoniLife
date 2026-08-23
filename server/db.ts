import { and, count, desc, eq, gte, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { adminAuditLogs, featureUsageEvents, feedbackSubmissions, focusSessions, habits, inAppAdvertisements, manualProfiles, notificationCampaignDeliveries, notificationCampaigns, notificationDevices, subscriptionRequests, supportLinks, tasks, userBadges, userGamification, weeklyAnalyticsSnapshots, weeklyReports, type AdminAuditLog, type InAppAdvertisement, type InsertAdminAuditLog, type InsertInAppAdvertisement, type InsertManualProfile, type InsertNotificationCampaign, type InsertNotificationDevice, type ManualProfile, InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createAdminAuditLog(input: Omit<InsertAdminAuditLog, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for audit logging");
  const result = await db.insert(adminAuditLogs).values(input);
  return result[0].insertId;
}

export async function listAdminAuditLogs(limit = 30): Promise<AdminAuditLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(adminAuditLogs).orderBy(desc(adminAuditLogs.createdAt)).limit(limit);
}

export type PublicManualProfile = Pick<ManualProfile, "id" | "fullName" | "birthDate" | "email" | "phone" | "secondaryContact">;

export function toPublicManualProfile(profile: ManualProfile): PublicManualProfile {
  const { id, fullName, birthDate, email, phone, secondaryContact } = profile;
  return { id, fullName, birthDate, email, phone, secondaryContact };
}

export async function getManualProfileByEmail(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for manual profile access");
  const result = await db.select().from(manualProfiles).where(eq(manualProfiles.email, email.toLowerCase())).limit(1);
  return result[0];
}

export async function createManualProfile(input: InsertManualProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available for manual profile registration");
  const result = await db.insert(manualProfiles).values(input);
  const id = result[0].insertId;
  const created = await db.select().from(manualProfiles).where(eq(manualProfiles.id, Number(id))).limit(1);
  if (!created[0]) throw new Error("Manual profile was not created");
  return created[0];
}

export async function deleteManualProfileByEmail(email: string) {
  const database = await getDb();
  if (!database) throw new Error("Database not available for manual profile deletion");
  await database.delete(manualProfiles).where(eq(manualProfiles.email, email.toLowerCase()));
}

/** Deletes data directly owned by a manual email while retaining system-wide administrative audit records. */
export async function deleteManualAccountData(email: string) {
  const database = await getDb();
  if (!database) throw new Error("Database not available for account reset");
  const normalizedEmail = email.toLowerCase();
  await Promise.all([
    database.delete(tasks).where(eq(tasks.email, normalizedEmail)),
    database.delete(habits).where(eq(habits.email, normalizedEmail)),
    database.delete(focusSessions).where(eq(focusSessions.email, normalizedEmail)),
    database.delete(notificationDevices).where(eq(notificationDevices.manualEmail, normalizedEmail)),
    database.delete(feedbackSubmissions).where(eq(feedbackSubmissions.manualEmail, normalizedEmail)),
    database.delete(featureUsageEvents).where(eq(featureUsageEvents.manualEmail, normalizedEmail)),
    database.delete(subscriptionRequests).where(eq(subscriptionRequests.manualEmail, normalizedEmail)),
    database.delete(weeklyAnalyticsSnapshots).where(eq(weeklyAnalyticsSnapshots.email, normalizedEmail)),
    database.delete(weeklyReports).where(eq(weeklyReports.email, normalizedEmail)),
    database.delete(userGamification).where(eq(userGamification.email, normalizedEmail)),
    database.delete(userBadges).where(eq(userBadges.email, normalizedEmail)),
    database.delete(manualProfiles).where(eq(manualProfiles.email, normalizedEmail)),
  ]);
}

export async function getManualAccountDataExport(email: string) {
  const database = await getDb();
  if (!database) throw new Error("Database not available for account export");
  const normalizedEmail = email.toLowerCase();
  const [profile, userTasks, userHabits, sessions, feedback, usage, subscriptions, weeklySnapshots, reports, gamification, badges] = await Promise.all([
    database.select().from(manualProfiles).where(eq(manualProfiles.email, normalizedEmail)),
    database.select().from(tasks).where(eq(tasks.email, normalizedEmail)),
    database.select().from(habits).where(eq(habits.email, normalizedEmail)),
    database.select().from(focusSessions).where(eq(focusSessions.email, normalizedEmail)),
    database.select().from(feedbackSubmissions).where(eq(feedbackSubmissions.manualEmail, normalizedEmail)),
    database.select().from(featureUsageEvents).where(eq(featureUsageEvents.manualEmail, normalizedEmail)),
    database.select().from(subscriptionRequests).where(eq(subscriptionRequests.manualEmail, normalizedEmail)),
    database.select().from(weeklyAnalyticsSnapshots).where(eq(weeklyAnalyticsSnapshots.email, normalizedEmail)),
    database.select().from(weeklyReports).where(eq(weeklyReports.email, normalizedEmail)),
    database.select().from(userGamification).where(eq(userGamification.email, normalizedEmail)),
    database.select().from(userBadges).where(eq(userBadges.email, normalizedEmail)),
  ]);
  return { profile: profile.map(({ pinHash, pinSalt, ...safe }) => safe), tasks: userTasks, habits: userHabits, focusSessions: sessions, feedback, featureUsage: usage, subscriptions, weeklySnapshots, weeklyReports: reports, gamification, badges };
}

export type NotificationAudience = "all_opted_in" | "manual_users" | "oauth_users";
export type NotificationCampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "failed" | "cancelled";

export async function upsertNotificationDevice(input: Omit<InsertNotificationDevice, "id" | "createdAt" | "updatedAt" | "lastSeenAt">) {
  const database = await getDb();
  if (!database) throw new Error("Database not available for device registration");
  await database.insert(notificationDevices).values({ ...input, lastSeenAt: new Date() }).onDuplicateKeyUpdate({
    set: {
      userId: input.userId ?? null,
      manualEmail: input.manualEmail?.toLowerCase() ?? null,
      platform: input.platform,
      optedIn: input.optedIn,
      active: true,
      lastSeenAt: new Date(),
    },
  });
  const row = await database.select().from(notificationDevices).where(eq(notificationDevices.expoPushToken, input.expoPushToken)).limit(1);
  if (!row[0]) throw new Error("Device registration was not saved");
  return row[0];
}

export async function setNotificationDeviceOptIn(expoPushToken: string, optedIn: boolean) {
  const database = await getDb();
  if (!database) throw new Error("Database not available for device preferences");
  await database.update(notificationDevices).set({ optedIn, active: optedIn, lastSeenAt: new Date() }).where(eq(notificationDevices.expoPushToken, expoPushToken));
}

export async function listActiveNotificationDevices(audience: NotificationAudience) {
  const database = await getDb();
  if (!database) return [];
  const base = and(eq(notificationDevices.active, true), eq(notificationDevices.optedIn, true));
  const filter = audience === "manual_users" ? and(base, isNotNull(notificationDevices.manualEmail)) : audience === "oauth_users" ? and(base, isNotNull(notificationDevices.userId), isNull(notificationDevices.manualEmail)) : base;
  return database.select().from(notificationDevices).where(filter);
}

export async function listActiveNotificationDevicesForManualEmail(email: string) {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(notificationDevices).where(and(eq(notificationDevices.active, true), eq(notificationDevices.optedIn, true), eq(notificationDevices.manualEmail, email.toLowerCase())));
}

export async function deactivateNotificationDevice(id: number) {
  const database = await getDb();
  if (!database) return;
  await database.update(notificationDevices).set({ active: false }).where(eq(notificationDevices.id, id));
}

export async function createNotificationCampaign(input: Omit<InsertNotificationCampaign, "id" | "createdAt" | "updatedAt">) {
  const database = await getDb();
  if (!database) throw new Error("Database not available for notification campaigns");
  const result = await database.insert(notificationCampaigns).values(input);
  const rows = await database.select().from(notificationCampaigns).where(eq(notificationCampaigns.id, Number(result[0].insertId))).limit(1);
  if (!rows[0]) throw new Error("Campaign was not created");
  return rows[0];
}

export async function getNotificationCampaign(id: number) {
  const database = await getDb();
  if (!database) return undefined;
  const rows = await database.select().from(notificationCampaigns).where(eq(notificationCampaigns.id, id)).limit(1);
  return rows[0];
}

export async function getNotificationCampaignByTaskUid(taskUid: string) {
  const database = await getDb();
  if (!database) return undefined;
  const rows = await database.select().from(notificationCampaigns).where(eq(notificationCampaigns.scheduleCronTaskUid, taskUid)).limit(1);
  return rows[0];
}

export async function listNotificationCampaigns(limit = 20) {
  const database = await getDb();
  if (!database) return [];
  const deliveryStats = database.select({
    campaignId: notificationCampaignDeliveries.campaignId,
    recipients: sql<number>`sum(case when ${notificationCampaignDeliveries.status} = 'accepted' then 1 else 0 end)`,
    linkClicks: sql<number>`sum(case when ${notificationCampaignDeliveries.linkClickedAt} is not null then 1 else 0 end)`,
  }).from(notificationCampaignDeliveries).groupBy(notificationCampaignDeliveries.campaignId).as("campaign_delivery_stats");
  const rows = await database.select({
    id: notificationCampaigns.id,
    createdByUserId: notificationCampaigns.createdByUserId,
    title: notificationCampaigns.title,
    body: notificationCampaigns.body,
    destinationUrl: notificationCampaigns.destinationUrl,
    category: notificationCampaigns.category,
    audience: notificationCampaigns.audience,
    status: notificationCampaigns.status,
    scheduledAt: notificationCampaigns.scheduledAt,
    scheduleCronTaskUid: notificationCampaigns.scheduleCronTaskUid,
    sentAt: notificationCampaigns.sentAt,
    createdAt: notificationCampaigns.createdAt,
    updatedAt: notificationCampaigns.updatedAt,
    recipients: sql<number>`coalesce(${deliveryStats.recipients}, 0)`,
    linkClicks: sql<number>`coalesce(${deliveryStats.linkClicks}, 0)`,
  }).from(notificationCampaigns).leftJoin(deliveryStats, eq(deliveryStats.campaignId, notificationCampaigns.id)).orderBy(desc(notificationCampaigns.createdAt)).limit(limit);
  return rows.map((row) => ({ ...row, recipients: Number(row.recipients), linkClicks: Number(row.linkClicks) }));
}

export async function updateNotificationCampaign(id: number, values: Partial<Pick<InsertNotificationCampaign, "status" | "scheduledAt" | "scheduleCronTaskUid" | "sentAt">>) {
  const database = await getDb();
  if (!database) throw new Error("Database not available for notification campaigns");
  await database.update(notificationCampaigns).set(values).where(eq(notificationCampaigns.id, id));
}

export async function createNotificationCampaignDelivery(input: { campaignId: number; deviceId: number; expoTicketId?: string | null; linkClickToken?: string | null; status: "queued" | "accepted" | "failed" | "invalid_token"; error?: string | null }) {
  const database = await getDb();
  if (!database) throw new Error("Database not available for notification campaigns");
  await database.insert(notificationCampaignDeliveries).values(input).onDuplicateKeyUpdate({
    set: { expoTicketId: input.expoTicketId ?? null, linkClickToken: input.linkClickToken ?? null, status: input.status, error: input.error ?? null },
  });
}

/** Records one recipient’s campaign-link tap at most once, using the per-delivery opaque token. */
export async function recordNotificationCampaignLinkClick(campaignId: number, linkClickToken: string) {
  const database = await getDb();
  if (!database) throw new Error("Database not available for campaign click tracking");
  const result = await database.update(notificationCampaignDeliveries)
    .set({ linkClickedAt: new Date() })
    .where(and(
      eq(notificationCampaignDeliveries.campaignId, campaignId),
      eq(notificationCampaignDeliveries.linkClickToken, linkClickToken),
      eq(notificationCampaignDeliveries.status, "accepted"),
      isNull(notificationCampaignDeliveries.linkClickedAt),
    ));
  return { recorded: Number(result[0].affectedRows ?? 0) > 0 };
}

export type InAppAdPlacement = "home" | "tasks" | "habits" | "finance";

export async function createInAppAdvertisement(input: Omit<InsertInAppAdvertisement, "id" | "createdAt" | "updatedAt">) {
  const database = await getDb();
  if (!database) throw new Error("Database not available for in-app advertisements");
  const result = await database.insert(inAppAdvertisements).values(input);
  const rows = await database.select().from(inAppAdvertisements).where(eq(inAppAdvertisements.id, Number(result[0].insertId))).limit(1);
  if (!rows[0]) throw new Error("In-app advertisement was not created");
  return rows[0];
}

export async function listInAppAdvertisements(limit = 30): Promise<InAppAdvertisement[]> {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(inAppAdvertisements).orderBy(desc(inAppAdvertisements.createdAt)).limit(limit);
}

export async function listActiveInAppAdvertisements(placement: InAppAdPlacement): Promise<InAppAdvertisement[]> {
  const database = await getDb();
  if (!database) return [];
  const now = new Date();
  return database.select().from(inAppAdvertisements).where(and(
    eq(inAppAdvertisements.active, true),
    eq(inAppAdvertisements.placement, placement),
    or(isNull(inAppAdvertisements.startsAt), lte(inAppAdvertisements.startsAt, now)),
    or(isNull(inAppAdvertisements.endsAt), gte(inAppAdvertisements.endsAt, now)),
  )).orderBy(desc(inAppAdvertisements.createdAt)).limit(3);
}

export async function setInAppAdvertisementActive(id: number, active: boolean) {
  const database = await getDb();
  if (!database) throw new Error("Database not available for in-app advertisements");
  await database.update(inAppAdvertisements).set({ active }).where(eq(inAppAdvertisements.id, id));
}

export async function createFeedbackSubmission(input: { userId?: number | null; manualEmail?: string | null; userName: string; type: "suggestion" | "question"; message: string }) {
  const database = await getDb();
  if (!database) throw new Error("Database not available for feedback");
  const result = await database.insert(feedbackSubmissions).values({ ...input, manualEmail: input.manualEmail?.toLowerCase() ?? null });
  const rows = await database.select().from(feedbackSubmissions).where(eq(feedbackSubmissions.id, Number(result[0].insertId))).limit(1);
  if (!rows[0]) throw new Error("Feedback submission was not created");
  return rows[0];
}

export async function listFeedbackSubmissions(limit = 50) {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(feedbackSubmissions).orderBy(desc(feedbackSubmissions.createdAt)).limit(limit);
}

export async function updateFeedbackStatus(id: number, status: "new" | "read" | "resolved") {
  const database = await getDb();
  if (!database) throw new Error("Database not available for feedback");
  await database.update(feedbackSubmissions).set({ status, reviewedAt: status === "new" ? null : new Date() }).where(eq(feedbackSubmissions.id, id));
}

export async function createSupportLink(input: { label: string; url: string; type: "support" | "faq"; createdByUserId: number }) {
  const database = await getDb();
  if (!database) throw new Error("Database not available for support links");
  const result = await database.insert(supportLinks).values(input);
  const rows = await database.select().from(supportLinks).where(eq(supportLinks.id, Number(result[0].insertId))).limit(1);
  if (!rows[0]) throw new Error("Support link was not created");
  return rows[0];
}

export async function updateSupportLink(id: number, input: { label: string; url: string; type: "support" | "faq" }) {
  const database = await getDb();
  if (!database) throw new Error("Database not available for support links");
  await database.update(supportLinks).set({ ...input, updatedAt: new Date() }).where(eq(supportLinks.id, id));
  const rows = await database.select().from(supportLinks).where(eq(supportLinks.id, id)).limit(1);
  if (!rows[0]) throw new Error("Support link was not found");
  return rows[0];
}

export async function deleteSupportLink(id: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available for support links");
  const existing = await database.select().from(supportLinks).where(eq(supportLinks.id, id)).limit(1);
  if (!existing[0]) throw new Error("Support link was not found");
  await database.delete(supportLinks).where(eq(supportLinks.id, id));
  return existing[0];
}

export async function listActiveSupportLinks() {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(supportLinks).where(eq(supportLinks.active, true)).orderBy(desc(supportLinks.createdAt));
}

export async function listSupportLinksForAdmin() {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(supportLinks).orderBy(desc(supportLinks.createdAt));
}

export async function recordFeatureUsage(input: { userId?: number | null; manualEmail?: string | null; feature: string }) {
  const database = await getDb();
  if (!database) return;
  await database.insert(featureUsageEvents).values({ userId: input.userId ?? null, manualEmail: input.manualEmail?.toLowerCase() ?? null, feature: input.feature });
}

export async function createSubscriptionRequest(input: { userId?: number | null; manualEmail: string; userName: string; plan: "pro" | "pro_monthly" | "pro_annual" | "lifetime"; amountEgp: number; paymentMethod: "instapay" | "vodafone_cash"; senderPhone: string; receiptKey: string; receiptUrl: string }) {
  const database = await getDb();
  if (!database) throw new Error("Database not available for subscription requests");
  const result = await database.insert(subscriptionRequests).values({ ...input, manualEmail: input.manualEmail.toLowerCase() });
  const rows = await database.select().from(subscriptionRequests).where(eq(subscriptionRequests.id, Number(result[0].insertId))).limit(1);
  if (!rows[0]) throw new Error("Subscription request was not created");
  return rows[0];
}

export async function getSubscriptionRequest(id: number) {
  const database = await getDb();
  if (!database) return undefined;
  const rows = await database.select().from(subscriptionRequests).where(eq(subscriptionRequests.id, id)).limit(1);
  return rows[0];
}

export async function listSubscriptionRequests(limit = 50) {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(subscriptionRequests).orderBy(desc(subscriptionRequests.createdAt)).limit(limit);
}

export async function listSubscriptionsForEmail(email: string) {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(subscriptionRequests).where(eq(subscriptionRequests.manualEmail, email.toLowerCase())).orderBy(desc(subscriptionRequests.createdAt));
}

export async function getEffectiveSubscriptionForEmail(email: string) {
  const requests = await listSubscriptionsForEmail(email);
  const approved = requests.filter((request) => request.status === "approved");
  const lifetime = approved.find((request) => request.plan === "lifetime");
  if (lifetime) return { tier: "lifetime" as const, expiresAt: null, request: lifetime };
  const now = Date.now();
  const active = approved.find((request) => request.entitlementExpiresAt && request.entitlementExpiresAt.getTime() > now);
  if (!active) return { tier: "free" as const, expiresAt: null, request: null };
  return { tier: active.plan === "pro_annual" ? "pro_annual" as const : "pro_monthly" as const, expiresAt: active.entitlementExpiresAt?.toISOString() ?? null, request: active };
}

export async function reviewSubscriptionRequest(id: number, decision: "approved" | "rejected", reviewerId: number, reviewNote?: string) {
  const database = await getDb();
  if (!database) throw new Error("Database not available for subscription review");
  const request = await getSubscriptionRequest(id);
  if (!request || request.status !== "pending") throw new Error("Subscription request is unavailable for review");
  const now = new Date();
  const entitlementDays = request.plan === "pro_annual" ? 365 : request.plan === "pro" || request.plan === "pro_monthly" ? 30 : null;
  const entitlementExpiresAt = decision === "approved" && entitlementDays ? new Date(now.getTime() + entitlementDays * 24 * 60 * 60 * 1000) : null;
  await database.update(subscriptionRequests).set({ status: decision, reviewedByUserId: reviewerId, reviewNote: reviewNote?.trim() || null, reviewedAt: now, activatedAt: decision === "approved" ? now : null, entitlementExpiresAt }).where(eq(subscriptionRequests.id, id));
  return { ...request, status: decision, reviewedByUserId: reviewerId, reviewNote: reviewNote?.trim() || null, reviewedAt: now, activatedAt: decision === "approved" ? now : null, entitlementExpiresAt };
}

export async function getAdministratorDashboardMetrics() {
  const database = await getDb();
  if (!database) return { manualUsers: 0, oauthUsers: 0, pendingFeedback: 0, pendingSubscriptions: 0, topFeatures: [] as Array<{ feature: string; total: number }> };
  const [[manual], [oauth], [feedback], [subscriptions], features] = await Promise.all([
    database.select({ total: count() }).from(manualProfiles),
    database.select({ total: count() }).from(users),
    database.select({ total: count() }).from(feedbackSubmissions).where(eq(feedbackSubmissions.status, "new")),
    database.select({ total: count() }).from(subscriptionRequests).where(eq(subscriptionRequests.status, "pending")),
    database.select({ feature: featureUsageEvents.feature, total: sql<number>`count(*)` }).from(featureUsageEvents).groupBy(featureUsageEvents.feature).orderBy(desc(sql`count(*)`)).limit(6),
  ]);
  return { manualUsers: Number(manual?.total ?? 0), oauthUsers: Number(oauth?.total ?? 0), pendingFeedback: Number(feedback?.total ?? 0), pendingSubscriptions: Number(subscriptions?.total ?? 0), topFeatures: features.map((row) => ({ feature: row.feature, total: Number(row.total) })) };
}

export async function upsertWeeklyAnalyticsSnapshot(input: { email: string; persona: "gentle" | "strict"; payload: string }) {
  const database = await getDb();
  if (!database) throw new Error("Database not available for weekly analytics");
  const email = input.email.toLowerCase();
  await database.insert(weeklyAnalyticsSnapshots).values({ email, persona: input.persona, payload: input.payload }).onDuplicateKeyUpdate({ set: { persona: input.persona, payload: input.payload, updatedAt: new Date() } });
}

export async function listWeeklyAnalyticsSnapshots() {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(weeklyAnalyticsSnapshots);
}

export async function createWeeklyReport(input: { email: string; weekStart: Date; weekEnd: Date; persona: "gentle" | "strict"; score: number; summary: string; metrics: string }) {
  const database = await getDb();
  if (!database) throw new Error("Database not available for weekly reports");
  const result = await database.insert(weeklyReports).values({ ...input, email: input.email.toLowerCase() });
  const rows = await database.select().from(weeklyReports).where(eq(weeklyReports.id, Number(result[0].insertId))).limit(1);
  if (!rows[0]) throw new Error("Weekly report was not created");
  return rows[0];
}

export async function getLatestWeeklyReport(email: string) {
  const database = await getDb();
  if (!database) return undefined;
  const rows = await database.select().from(weeklyReports).where(eq(weeklyReports.email, email.toLowerCase())).orderBy(desc(weeklyReports.createdAt)).limit(1);
  return rows[0];
}

export async function upsertGamification(input: { email: string; xpPoints: number; level: number; completedTasks: number; habitDays: number; financeDays: number; badges: string[] }) {
  const database = await getDb();
  if (!database) throw new Error("Database not available for gamification");
  const email = input.email.toLowerCase();
  await database.insert(userGamification).values({ email, xpPoints: input.xpPoints, level: input.level, completedTasks: input.completedTasks, habitDays: input.habitDays, financeDays: input.financeDays }).onDuplicateKeyUpdate({ set: { xpPoints: input.xpPoints, level: input.level, completedTasks: input.completedTasks, habitDays: input.habitDays, financeDays: input.financeDays, updatedAt: new Date() } });
  for (const badge of input.badges) await database.insert(userBadges).values({ email, badge }).onDuplicateKeyUpdate({ set: { badge } });
}

export async function getGamification(email: string) {
  const database = await getDb();
  if (!database) return { xpPoints: 0, level: 1, completedTasks: 0, habitDays: 0, financeDays: 0, badges: [] as string[] };
  const [state] = await database.select().from(userGamification).where(eq(userGamification.email, email.toLowerCase())).limit(1);
  const badges = await database.select().from(userBadges).where(eq(userBadges.email, email.toLowerCase()));
  return { xpPoints: state?.xpPoints ?? 0, level: state?.level ?? 1, completedTasks: state?.completedTasks ?? 0, habitDays: state?.habitDays ?? 0, financeDays: state?.financeDays ?? 0, badges: badges.map((item) => item.badge) };
}

type BehavioralTaskInput = { id: string; title: string; detail: string; energy: "high" | "medium" | "low"; priority: "high" | "medium"; done: boolean; reschedules: number; scheduledAt?: string; ifThenPlan?: { ifCondition: string; thenAction: string }; energyImpact?: "recharge" | "balanced" | "drain"; isMicroGoal?: boolean; estimatedPomodoros?: number; completedPomodoros?: number; project?: string; tags?: string[] };
type BehavioralHabitInput = { id: string; title: string; detail: string; frequency: "daily" | "weekly" | "monthly" | "yearly"; reminderTimes: string[]; streak: number; ifThenPlan?: { ifCondition: string; thenAction: string }; isMicroGoal?: boolean };

export async function upsertBehavioralState(input: { email: string; tasks: BehavioralTaskInput[]; habits: BehavioralHabitInput[] }) {
  const database = await getDb();
  if (!database) throw new Error("Database not available for behavioral state");
  const email = input.email.toLowerCase();
  for (const task of input.tasks) {
    const values = { id: task.id, email, title: task.title, detail: task.detail || null, energy: task.energy, priority: task.priority, done: task.done, reschedules: task.reschedules, scheduledAt: task.scheduledAt ? new Date(task.scheduledAt) : null, ifThenPlan: task.ifThenPlan ? JSON.stringify(task.ifThenPlan) : null, energyImpact: task.energyImpact ?? null, isMicroGoal: Boolean(task.isMicroGoal), estimatedPomodoros: Math.max(1, task.estimatedPomodoros ?? 1), completedPomodoros: Math.max(0, task.completedPomodoros ?? 0), project: task.project?.trim() || null, tags: task.tags?.length ? JSON.stringify(task.tags) : null };
    await database.insert(tasks).values(values).onDuplicateKeyUpdate({ set: { ...values, updatedAt: new Date() } });
  }
  for (const habit of input.habits) {
    const values = { id: habit.id, email, title: habit.title, detail: habit.detail || null, frequency: habit.frequency, reminderTimes: JSON.stringify(habit.reminderTimes), streak: habit.streak, ifThenPlan: habit.ifThenPlan ? JSON.stringify(habit.ifThenPlan) : null, isMicroGoal: Boolean(habit.isMicroGoal) };
    await database.insert(habits).values(values).onDuplicateKeyUpdate({ set: { ...values, updatedAt: new Date() } });
  }
}

export async function getBehavioralState(email: string) {
  const database = await getDb();
  if (!database) return { tasks: [], habits: [] };
  const normalized = email.toLowerCase();
  const [storedTasks, storedHabits] = await Promise.all([
    database.select().from(tasks).where(eq(tasks.email, normalized)).orderBy(desc(tasks.updatedAt)),
    database.select().from(habits).where(eq(habits.email, normalized)).orderBy(desc(habits.updatedAt)),
  ]);
  return { tasks: storedTasks, habits: storedHabits };
}

export async function recordFocusSession(input: { email: string; taskId: string; sessionIndex: number; durationMinutes?: number; project?: string; tags?: string[] }) {
  const database = await getDb();
  if (!database) throw new Error("Database not available for focus sessions");
  await database.insert(focusSessions).values({ email: input.email.toLowerCase(), taskId: input.taskId, sessionIndex: input.sessionIndex, durationMinutes: input.durationMinutes ?? 25, project: input.project?.trim() || null, tags: input.tags?.length ? JSON.stringify(input.tags) : null });
}

export async function getFocusTimeSummary(email: string) {
  const database = await getDb();
  if (!database) return { totalMinutes: 0, projects: [] as Array<{ name: string; minutes: number; sessions: number }>, tags: [] as Array<{ name: string; minutes: number; sessions: number }> };
  const rows = await database.select({ project: focusSessions.project, tags: focusSessions.tags, durationMinutes: focusSessions.durationMinutes }).from(focusSessions).where(eq(focusSessions.email, email.toLowerCase())).orderBy(desc(focusSessions.completedAt)).limit(500);
  const projects = new Map<string, { minutes: number; sessions: number }>();
  const tags = new Map<string, { minutes: number; sessions: number }>();
  let totalMinutes = 0;
  rows.forEach((row) => {
    const minutes = Math.max(0, row.durationMinutes);
    totalMinutes += minutes;
    const project = row.project?.trim();
    if (project) {
      const current = projects.get(project) ?? { minutes: 0, sessions: 0 };
      projects.set(project, { minutes: current.minutes + minutes, sessions: current.sessions + 1 });
    }
    try {
      const parsed = row.tags ? JSON.parse(row.tags) : [];
      if (Array.isArray(parsed)) parsed.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0).forEach((tag) => {
        const name = tag.trim();
        const current = tags.get(name) ?? { minutes: 0, sessions: 0 };
        tags.set(name, { minutes: current.minutes + minutes, sessions: current.sessions + 1 });
      });
    } catch { /* Ignore malformed historical tag payloads. */ }
  });
  const toEntries = (source: Map<string, { minutes: number; sessions: number }>) => [...source.entries()].map(([name, value]) => ({ name, ...value })).sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name));
  return { totalMinutes, projects: toEntries(projects), tags: toEntries(tags) };
}
