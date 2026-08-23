import { boolean, date, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const tasks = mysqlTable("tasks", {
  id: varchar("id", { length: 128 }).primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  detail: text("detail"),
  energy: mysqlEnum("energy", ["high", "medium", "low"]).default("medium").notNull(),
  priority: mysqlEnum("priority", ["high", "medium"]).default("medium").notNull(),
  done: boolean("done").default(false).notNull(),
  reschedules: int("reschedules").default(0).notNull(),
  scheduledAt: timestamp("scheduledAt"),
  ifThenPlan: text("ifThenPlan"),
  energyImpact: mysqlEnum("energyImpact", ["recharge", "balanced", "drain"]),
  isMicroGoal: boolean("isMicroGoal").default(false).notNull(),
  estimatedPomodoros: int("estimatedPomodoros").default(1).notNull(),
  completedPomodoros: int("completedPomodoros").default(0).notNull(),
  project: varchar("project", { length: 120 }),
  tags: text("tags"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("tasks_email_schedule_idx").on(table.email, table.scheduledAt)]);

export const habits = mysqlTable("habits", {
  id: varchar("id", { length: 128 }).primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  detail: text("detail"),
  frequency: mysqlEnum("frequency", ["daily", "weekly", "monthly", "yearly"]).default("daily").notNull(),
  reminderTimes: text("reminderTimes").notNull(),
  streak: int("streak").default(0).notNull(),
  ifThenPlan: text("ifThenPlan"),
  isMicroGoal: boolean("isMicroGoal").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("habits_email_updated_idx").on(table.email, table.updatedAt)]);

export const focusSessions = mysqlTable("focus_sessions", {
  id: int("id").autoincrement().primaryKey(),
  taskId: varchar("taskId", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  sessionIndex: int("sessionIndex").notNull(),
  durationMinutes: int("durationMinutes").notNull().default(25),
  project: varchar("project", { length: 120 }),
  tags: text("tags"),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
}, (table) => [index("focus_sessions_task_idx").on(table.taskId, table.completedAt), index("focus_sessions_email_idx").on(table.email, table.completedAt)]);

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;
export type Habit = typeof habits.$inferSelect;
export type InsertHabit = typeof habits.$inferInsert;
export type FocusSession = typeof focusSessions.$inferSelect;
export type InsertFocusSession = typeof focusSessions.$inferInsert;

export const adminAuditLogs = mysqlTable("admin_audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId").notNull(),
  action: varchar("action", { length: 120 }).notNull(),
  targetType: varchar("targetType", { length: 64 }).notNull(),
  targetId: varchar("targetId", { length: 128 }),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type InsertAdminAuditLog = typeof adminAuditLogs.$inferInsert;

export const manualProfiles = mysqlTable("manual_profiles", {
  id: int("id").autoincrement().primaryKey(),
  fullName: varchar("fullName", { length: 160 }).notNull(),
  birthDate: date("birthDate").notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  phone: varchar("phone", { length: 32 }).notNull(),
  secondaryContact: varchar("secondaryContact", { length: 255 }),
  isCompedFree: boolean("isCompedFree").default(false).notNull(),
  pinSalt: varchar("pinSalt", { length: 64 }).notNull(),
  pinHash: varchar("pinHash", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ManualProfile = typeof manualProfiles.$inferSelect;
export type InsertManualProfile = typeof manualProfiles.$inferInsert;

export const notificationDevices = mysqlTable("notification_devices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  manualEmail: varchar("manualEmail", { length: 320 }),
  expoPushToken: varchar("expoPushToken", { length: 255 }).notNull(),
  platform: varchar("platform", { length: 16 }).notNull(),
  optedIn: boolean("optedIn").default(true).notNull(),
  active: boolean("active").default(true).notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("notification_devices_token_unique").on(table.expoPushToken),
  index("notification_devices_active_idx").on(table.active, table.optedIn),
]);

export type NotificationDevice = typeof notificationDevices.$inferSelect;
export type InsertNotificationDevice = typeof notificationDevices.$inferInsert;

export const notificationCampaigns = mysqlTable("notification_campaigns", {
  id: int("id").autoincrement().primaryKey(),
  createdByUserId: int("createdByUserId").notNull(),
  title: varchar("title", { length: 120 }).notNull(),
  body: varchar("body", { length: 500 }).notNull(),
  destinationUrl: varchar("destinationUrl", { length: 1024 }),
  category: mysqlEnum("category", ["announcement", "promotion", "usage_tip", "rating_reminder", "habit_tip", "task_tip"]).notNull(),
  audience: mysqlEnum("audience", ["all_opted_in", "manual_users", "oauth_users"]).default("all_opted_in").notNull(),
  status: mysqlEnum("status", ["draft", "scheduled", "sending", "sent", "failed", "cancelled"]).default("draft").notNull(),
  scheduledAt: timestamp("scheduledAt"),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("notification_campaigns_task_uid_unique").on(table.scheduleCronTaskUid),
  index("notification_campaigns_status_idx").on(table.status, table.scheduledAt),
]);

export type NotificationCampaign = typeof notificationCampaigns.$inferSelect;
export type InsertNotificationCampaign = typeof notificationCampaigns.$inferInsert;

export const notificationCampaignDeliveries = mysqlTable("notification_campaign_deliveries", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  deviceId: int("deviceId").notNull(),
  expoTicketId: varchar("expoTicketId", { length: 80 }),
  linkClickToken: varchar("linkClickToken", { length: 36 }),
  linkClickedAt: timestamp("linkClickedAt"),
  status: mysqlEnum("status", ["queued", "accepted", "failed", "invalid_token"]).default("queued").notNull(),
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("notification_campaign_delivery_unique").on(table.campaignId, table.deviceId),
  uniqueIndex("notification_campaign_click_token_unique").on(table.linkClickToken),
  index("notification_campaign_deliveries_campaign_idx").on(table.campaignId, table.status),
]);

export type NotificationCampaignDelivery = typeof notificationCampaignDeliveries.$inferSelect;

export const inAppAdvertisements = mysqlTable("in_app_advertisements", {
  id: int("id").autoincrement().primaryKey(),
  createdByUserId: int("createdByUserId").notNull(),
  title: varchar("title", { length: 120 }).notNull(),
  body: varchar("body", { length: 500 }).notNull(),
  ctaLabel: varchar("ctaLabel", { length: 80 }).notNull(),
  placement: mysqlEnum("placement", ["home", "tasks", "habits", "finance"]).notNull(),
  destinationUrl: varchar("destinationUrl", { length: 1024 }),
  active: boolean("active").default(true).notNull(),
  startsAt: timestamp("startsAt"),
  endsAt: timestamp("endsAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("in_app_advertisements_active_idx").on(table.active, table.placement, table.startsAt),
]);

export type InAppAdvertisement = typeof inAppAdvertisements.$inferSelect;
export type InsertInAppAdvertisement = typeof inAppAdvertisements.$inferInsert;

export const feedbackSubmissions = mysqlTable("feedback_submissions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  manualEmail: varchar("manualEmail", { length: 320 }),
  userName: varchar("userName", { length: 160 }).notNull(),
  type: mysqlEnum("type", ["suggestion", "question"]).notNull(),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["new", "read", "resolved"]).default("new").notNull(),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("feedback_submissions_status_idx").on(table.status, table.createdAt),
]);

export type FeedbackSubmission = typeof feedbackSubmissions.$inferSelect;

export const supportLinks = mysqlTable("support_links", {
  id: int("id").autoincrement().primaryKey(),
  label: varchar("label", { length: 120 }).notNull(),
  url: varchar("url", { length: 1024 }).notNull(),
  type: mysqlEnum("type", ["support", "faq"]).notNull(),
  active: boolean("active").default(true).notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SupportLink = typeof supportLinks.$inferSelect;

export const featureUsageEvents = mysqlTable("feature_usage_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  manualEmail: varchar("manualEmail", { length: 320 }),
  feature: varchar("feature", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("feature_usage_events_feature_idx").on(table.feature, table.createdAt),
]);

export type FeatureUsageEvent = typeof featureUsageEvents.$inferSelect;

export const subscriptionRequests = mysqlTable("subscription_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  manualEmail: varchar("manualEmail", { length: 320 }).notNull(),
  userName: varchar("userName", { length: 160 }).notNull(),
  plan: mysqlEnum("plan", ["pro", "pro_monthly", "pro_annual", "lifetime"]).notNull(),
  amountEgp: int("amountEgp").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["instapay", "vodafone_cash"]).notNull(),
  senderPhone: varchar("senderPhone", { length: 32 }).notNull(),
  receiptKey: varchar("receiptKey", { length: 512 }).notNull(),
  receiptUrl: varchar("receiptUrl", { length: 1024 }).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  reviewedByUserId: int("reviewedByUserId"),
  reviewNote: varchar("reviewNote", { length: 500 }),
  reviewedAt: timestamp("reviewedAt"),
  activatedAt: timestamp("activatedAt"),
  entitlementExpiresAt: timestamp("entitlementExpiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("subscription_requests_status_idx").on(table.status, table.createdAt),
  index("subscription_requests_user_idx").on(table.manualEmail, table.status),
]);

export type SubscriptionRequest = typeof subscriptionRequests.$inferSelect;

export const weeklyAnalyticsSnapshots = mysqlTable("weekly_analytics_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  persona: mysqlEnum("persona", ["gentle", "strict"]).default("gentle").notNull(),
  payload: text("payload").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("weekly_analytics_snapshot_email_unique").on(table.email)]);

export const weeklyReports = mysqlTable("weekly_reports", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  weekStart: timestamp("weekStart").notNull(),
  weekEnd: timestamp("weekEnd").notNull(),
  persona: mysqlEnum("persona", ["gentle", "strict"]).notNull(),
  score: int("score").notNull(),
  summary: text("summary").notNull(),
  metrics: text("metrics").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("weekly_reports_email_created_idx").on(table.email, table.createdAt)]);

export const userGamification = mysqlTable("user_gamification", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  xpPoints: int("xpPoints").default(0).notNull(),
  level: int("level").default(1).notNull(),
  completedTasks: int("completedTasks").default(0).notNull(),
  habitDays: int("habitDays").default(0).notNull(),
  financeDays: int("financeDays").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("user_gamification_email_unique").on(table.email)]);

export const userBadges = mysqlTable("user_badges", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  badge: varchar("badge", { length: 120 }).notNull(),
  earnedAt: timestamp("earnedAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("user_badges_email_badge_unique").on(table.email, table.badge)]);
