import { COOKIE_NAME } from "../shared/const.js";
import { isAuthorizedOmniAdmin, OMNI_ADMIN_EMAIL } from "../shared/admin-access.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { parse as parseCookie } from "cookie";
import { createHeartbeatJob, listHeartbeatJobs } from "./_core/heartbeat";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { scryptSync, timingSafeEqual } from "crypto";
import * as db from "./db";
import { dispatchNotificationCampaign, sendSubscriptionStatusPush } from "./notification-campaign-service";
import { storageGetSignedUrl, storagePut } from "./storage";
import { generateGeminiJson, generateGeminiText } from "./gemini-service";
import { transcribeAudio } from "./_core/voiceTranscription";
import { manualLoginSchema, manualRegistrationSchema, telegramPasswordResetConfirmationSchema, telegramPasswordResetRequestSchema } from "../shared/manual-profile-validation.js";
import * as supabase from "./supabase";
import { parseVoiceQuickIntent } from "../lib/voice-intent";
import { generateWeeklyRetrospectives } from "./weekly-retrospective-service";
import { areTaskSpecificFrictionSteps } from "./friction-step-validation";
import { isSupportedSupportLinkUrl, normalizeSupportLinkUrl } from "../lib/support-link-url";

const omniAdminProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!isAuthorizedOmniAdmin(ctx.user?.email ?? ctx.manualUserEmail)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Administrator access is restricted." });
  }
  return next();
});

const campaignInputSchema = z.object({
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(3).max(500),
  destinationUrl: z.string().trim().url().max(1024).refine((value) => /^https?:\/\//i.test(value), "Only HTTP(S) links are supported.").optional(),
  category: z.enum(["announcement", "promotion", "usage_tip", "rating_reminder", "habit_tip", "task_tip"]),
  audience: z.enum(["all_opted_in", "manual_users", "oauth_users"]),
  delivery: z.enum(["send_now", "schedule"]),
  scheduledAt: z.date().optional(),
});

const inAppAdInputSchema = z.object({
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(3).max(500),
  ctaLabel: z.string().trim().min(2).max(80),
  placement: z.enum(["home", "tasks", "habits", "finance"]),
  destinationUrl: z.string().url().max(1024).optional(),
  startsAt: z.date().optional(),
  endsAt: z.date().optional(),
});

function campaignCron(scheduledAt: Date) {
  return `0 ${scheduledAt.getUTCMinutes()} ${scheduledAt.getUTCHours()} ${scheduledAt.getUTCDate()} ${scheduledAt.getUTCMonth() + 1} *`;
}

const feedbackInputSchema = z.object({ userName: z.string().trim().min(2).max(160), type: z.enum(["suggestion", "question"]), message: z.string().trim().min(5).max(2000) });
const supportLinkFieldsSchema = z.object({ label: z.string().trim().min(2).max(120), url: z.string().trim().min(3).max(1024), type: z.enum(["support", "faq"]) });
const normalizeSupportLinkInput = <T extends { url: string }>(input: T) => ({ ...input, url: normalizeSupportLinkUrl(input.url) });
const supportLinkInputSchema = supportLinkFieldsSchema.transform(normalizeSupportLinkInput).refine((input) => isSupportedSupportLinkUrl(input.url), { message: "A valid HTTP(S) support link is required.", path: ["url"] });
const supportLinkUpdateSchema = supportLinkFieldsSchema.extend({ id: z.number().int().positive() }).transform(normalizeSupportLinkInput).refine((input) => isSupportedSupportLinkUrl(input.url), { message: "A valid HTTP(S) support link is required.", path: ["url"] });
const subscriptionInputSchema = z.object({ userName: z.string().trim().min(2).max(160), plan: z.enum(["pro_monthly", "pro_annual", "lifetime"]), amountEgp: z.number().int().positive().max(10_000), paymentMethod: z.enum(["instapay", "vodafone_cash"]), senderPhone: z.string().trim().min(7).max(32), receiptBase64: z.string().min(64).max(7_000_000), receiptContentType: z.enum(["image/jpeg", "image/png", "image/webp"]) });
const manualAccountDeletionSchema = manualLoginSchema.extend({ confirmation: z.literal("DELETE") });

function requireSignedInIdentity(ctx: { user?: { id: number; email: string | null; name: string | null } | null; manualUserId?: number | null; manualUserEmail?: string | null }) {
  const email = ctx.manualUserEmail ?? ctx.user?.email;
  if (!email) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in before submitting this request." });
  return { userId: ctx.user?.id ?? ctx.manualUserId ?? null, email: email.toLowerCase() };
}

function receiptExtension(contentType: "image/jpeg" | "image/png" | "image/webp") { return contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg"; }

function matchesLegacyManualPassword(pin: string, pinSalt: string, pinHash: string) {
  const expected = Buffer.from(pinHash, "hex");
  const actual = Buffer.from(scryptSync(pin, pinSalt, 64).toString("hex"), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function migrateVerifiedLegacyManualProfile(email: string, pin: string) {
  const legacy = await db.getManualProfileByEmail(email.toLowerCase());
  if (!legacy || !matchesLegacyManualPassword(pin, legacy.pinSalt, legacy.pinHash)) return null;
  return supabase.registerSupabaseManualProfile({
    fullName: legacy.fullName,
    birthDate: legacy.birthDate.toISOString().slice(0, 10),
    email: legacy.email,
    phone: legacy.phone,
    secondaryContact: legacy.secondaryContact ?? undefined,
    pin,
  });
}

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  voiceQuickCapture: router({
    process: publicProcedure
      .input(z.object({ audioBase64: z.string().min(64).max(16_000_000), contentType: z.enum(["audio/m4a", "audio/mp4", "audio/webm", "audio/wav", "audio/ogg"]) }))
      .mutation(async ({ ctx, input }) => {
        requireSignedInIdentity(ctx);
        const transcription = await transcribeAudio({
          audioUrl: `data:${input.contentType};base64,${input.audioBase64}`,
          language: "ar",
          prompt: "Arabic OMNI LIFE voice capture. Preserve amounts, dates, task titles, and merchant names exactly.",
        });
        if ("error" in transcription) throw new TRPCError({ code: "BAD_REQUEST", message: transcription.error });
        const text = transcription.text.trim();
        if (!text) throw new TRPCError({ code: "BAD_REQUEST", message: "No speech was detected." });
        return { text, intent: parseVoiceQuickIntent(text) };
      }),
  }),
  weeklyRetrospective: router({
    syncSnapshot: publicProcedure
      .input(z.object({ persona: z.enum(["gentle", "strict"]), completedTasks: z.number().int().min(0), delayedTasks: z.number().int().min(0), habitsCompleted: z.number().int().min(0), habitsPlanned: z.number().int().min(0), expensesEgp: z.number().min(0), budgetOverages: z.number().int().min(0), xpEarned: z.number().int().min(0), energyRecharge: z.number().int().min(0).default(0), energyBalanced: z.number().int().min(0).default(0), energyDrain: z.number().int().min(0).default(0) }))
      .mutation(async ({ ctx, input }) => {
        const identity = requireSignedInIdentity(ctx);
        await db.upsertWeeklyAnalyticsSnapshot({ email: identity.email, persona: input.persona, payload: JSON.stringify(input) });
        return { ok: true };
      }),
    latest: publicProcedure.query(async ({ ctx }) => {
      const identity = requireSignedInIdentity(ctx);
      return db.getLatestWeeklyReport(identity.email);
    }),
    enableFridaySchedule: omniAdminProcedure.mutation(async ({ ctx }) => {
      const session = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      const existing = await listHeartbeatJobs(session, { pageSize: 100 });
      const job = existing.jobs.find((item) => item.name === "omni-weekly-retrospective");
      if (job) return { taskUid: job.taskUid, reused: true, nextExecutionAt: job.nextExecutionAt ?? null };
      const created = await createHeartbeatJob({ name: "omni-weekly-retrospective", cron: "0 0 18 * * 5", path: "/api/scheduled/weekly-retrospective", description: "OMNI LIFE Friday 21:00 GMT+3 weekly retrospective" }, session);
      return { ...created, reused: false };
    }),
    runNowForAdmin: omniAdminProcedure.mutation(async () => ({ generated: await generateWeeklyRetrospectives() })),
  }),
  gamification: router({
    current: publicProcedure.query(async ({ ctx }) => {
      const identity = requireSignedInIdentity(ctx);
      return db.getGamification(identity.email);
    }),
    save: publicProcedure
      .input(z.object({ xp: z.number().int().min(0), level: z.number().int().min(1), completedTasks: z.number().int().min(0), habitDays: z.number().int().min(0), financeDays: z.number().int().min(0), badges: z.array(z.string().min(1).max(80)).max(10) }))
      .mutation(async ({ ctx, input }) => {
        const identity = requireSignedInIdentity(ctx);
        await db.upsertGamification({ email: identity.email, xpPoints: input.xp, level: input.level, completedTasks: input.completedTasks, habitDays: input.habitDays, financeDays: input.financeDays, badges: input.badges });
        return { ok: true };
      }),
  }),
  behavioralState: router({
    current: publicProcedure.query(async ({ ctx }) => db.getBehavioralState(requireSignedInIdentity(ctx).email)),
    focusTimeSummary: publicProcedure.query(async ({ ctx }) => db.getFocusTimeSummary(requireSignedInIdentity(ctx).email)),
    save: publicProcedure
      .input(z.object({
        tasks: z.array(z.object({ id: z.string().min(1).max(128), title: z.string().trim().min(1).max(160), detail: z.string().max(1000), energy: z.enum(["high", "medium", "low"]), priority: z.enum(["high", "medium"]), done: z.boolean(), reschedules: z.number().int().min(0), scheduledAt: z.string().datetime().optional(), ifThenPlan: z.object({ ifCondition: z.string().trim().min(1).max(180), thenAction: z.string().trim().min(1).max(220) }).optional(), energyImpact: z.enum(["recharge", "balanced", "drain"]).optional(), isMicroGoal: z.boolean().optional(), estimatedPomodoros: z.number().int().min(1).max(99).optional(), completedPomodoros: z.number().int().min(0).max(999).optional(), project: z.string().trim().min(1).max(120).optional(), tags: z.array(z.string().trim().min(1).max(40)).max(10).optional() })).max(200),
        habits: z.array(z.object({ id: z.string().min(1).max(128), title: z.string().trim().min(1).max(160), detail: z.string().max(1000), frequency: z.enum(["daily", "weekly", "monthly", "yearly"]), reminderTimes: z.array(z.string().datetime()).max(8), streak: z.number().int().min(0), ifThenPlan: z.object({ ifCondition: z.string().trim().min(1).max(180), thenAction: z.string().trim().min(1).max(220) }).optional(), isMicroGoal: z.boolean().optional() })).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        const identity = requireSignedInIdentity(ctx);
        await db.upsertBehavioralState({ email: identity.email, ...input });
        return { ok: true };
      }),
    recordFocusSession: publicProcedure.input(z.object({ taskId: z.string().min(1).max(128), sessionIndex: z.number().int().min(1).max(999), durationMinutes: z.number().int().min(1).max(120).default(25), project: z.string().trim().min(1).max(120).optional(), tags: z.array(z.string().trim().min(1).max(40)).max(10).optional() })).mutation(async ({ ctx, input }) => {
      const identity = requireSignedInIdentity(ctx);
      await db.recordFocusSession({ email: identity.email, ...input });
      return { ok: true };
    }),
  }),
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  productivityCoach: router({
    advise: publicProcedure.input(z.object({
      message: z.string().trim().min(1).max(800),
      isArabic: z.boolean(),
      energy: z.enum(["high", "low"]),
      mood: z.enum(["good", "low"]),
      tasks: z.array(z.object({ title: z.string().max(160), detail: z.string().max(500), energy: z.enum(["high", "medium", "low"]), priority: z.enum(["high", "medium"]), done: z.boolean() })).max(12),
    })).mutation(async ({ input }) => {
      const message = await generateGeminiText({
        system: `You are OMNI LIFE's calm productivity coach. Reply only in ${input.isArabic ? "Arabic" : "English"}. Give practical, brief, non-medical advice. Help the user choose one immediate next action, reduce procrastination, and respect reported energy and mood. Never diagnose mental health or claim certainty. Begin with a 5–15 minute action, then add at most two short numbered steps.`,
        prompt: JSON.stringify({ userMessage: input.message, energy: input.energy, mood: input.mood, openTasks: input.tasks.filter((task) => !task.done) }),
        maxOutputTokens: 420,
      });
      return { message };
    }),
  }),
  aiAssistance: router({
    frictionSteps: publicProcedure.input(z.object({ title: z.string().trim().min(1).max(160), detail: z.string().trim().max(500).optional(), isArabic: z.boolean() })).mutation(async ({ input }) => {
      const title = input.title.trim();
      const detail = input.detail?.trim() ?? "";
      const system = `You create three very small, concrete anti-procrastination actions. Reply only as JSON: {"steps":["string","string","string"]}. Use only ${input.isArabic ? "Arabic" : "English"}. The three actions must be different and immediately practical. If task detail exists, at least two actions must use a concrete word or constraint from it. Do not repeat the task title; the app adds it automatically. Do not use generic actions that could fit another task. Do not add medical advice, explanations, markdown, or more than three actions.`;
      const readSteps = (payload: { steps?: string[] }) => (payload.steps ?? []).map((step) => step.trim()).filter((step) => step.length >= 3 && step.length <= 180).slice(0, 3);
      const generate = (correction = "") => generateGeminiJson<{ steps?: string[] }>({ system, prompt: JSON.stringify({ taskTitle: title, taskDetail: detail, correction }), maxOutputTokens: 900 });
      let steps = readSteps(await generate());
      if (!areTaskSpecificFrictionSteps(steps, title, detail)) {
        steps = readSteps(await generate("The previous answer was too generic or repeated. Return three different short actions, and use task-detail words in at least two actions."));
      }
      if (!areTaskSpecificFrictionSteps(steps, title, detail)) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Gemini did not return task-specific steps." });
      return { steps: steps.map((step) => `«${title}»: ${step}`) };
    }),
    notificationCopy: publicProcedure.input(z.object({ userName: z.string().trim().min(1).max(80).optional(), isArabic: z.boolean(), taskTitles: z.array(z.string().trim().min(1).max(160)).max(8), habitTitles: z.array(z.string().trim().min(1).max(160)).max(8), staleIdeaTitles: z.array(z.string().trim().min(1).max(160)).max(6).default([]) })).mutation(async ({ input }) => {
      const payload = await generateGeminiJson<{ morning?: string[]; task?: string[]; finance?: string[]; ideas?: string[]; evening?: string[]; habit?: string[] }>({
        system: `Create short, practical OMNI LIFE local-notification bodies. Reply only as JSON with six arrays named morning, task, finance, ideas, evening, habit. Each array must have exactly three distinct strings in ${input.isArabic ? "Arabic" : "English"}, each 25–150 characters. Be encouraging, non-medical, and avoid urgency or guilt. If a user name is supplied, include it naturally in every morning and evening option. Refer to supplied task, habit, or stale-idea names only when useful.`,
        prompt: JSON.stringify({ userName: input.userName ?? "", openTaskTitles: input.taskTitles, habitTitles: input.habitTitles, staleIdeaTitles: input.staleIdeaTitles }),
        maxOutputTokens: 700,
      });
      const normalize = (items: string[] | undefined) => (items ?? []).map((item) => item.trim()).filter((item) => item.length >= 8 && item.length <= 180).slice(0, 3);
      const copy = { morning: normalize(payload.morning), task: normalize(payload.task), finance: normalize(payload.finance), ideas: normalize(payload.ideas), evening: normalize(payload.evening), habit: normalize(payload.habit) };
      if (Object.values(copy).some((items) => items.length !== 3)) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Gemini did not return usable notification copy." });
      return copy;
    }),
    contextualAlert: publicProcedure.input(z.object({ kind: z.enum(["spending", "relationship", "stale_idea"]), isArabic: z.boolean(), userName: z.string().trim().min(1).max(80).optional(), context: z.object({ contactName: z.string().trim().max(160).optional(), purpose: z.string().trim().max(300).optional(), ideaTitle: z.string().trim().max(160).optional(), expenseTotalEgp: z.number().nonnegative().max(1_000_000).optional(), dailyLimitEgp: z.number().positive().max(1_000_000).optional(), reason: z.enum(["daily_limit", "rapid_withdrawals"]).optional() }) })).mutation(async ({ input }) => {
      const promptByKind = input.kind === "spending"
        ? "Write one playful but respectful spending warning. Mention the EGP amount and that the user can pause before the next expense. Never shame, diagnose, or encourage risky financial actions."
        : input.kind === "relationship"
          ? "Write one warm reminder to contact the named person about the stated purpose. Include both the name and purpose."
          : "Write one gentle decision prompt for the named old idea: turn it into a task or archive/delete it without guilt. Include the idea title.";
      const message = await generateGeminiText({
        system: `You write one local OMNI LIFE phone-notification body in ${input.isArabic ? "Arabic" : "English"}, 25–180 characters. ${promptByKind} Use the user name naturally if supplied. Return body text only, with no title, markdown, or emoji spam.`,
        prompt: JSON.stringify({ userName: input.userName ?? "", ...input.context }),
        maxOutputTokens: 180,
      });
      return { message: message.replace(/\s+/g, " ").trim().slice(0, 180) };
    }),
  }),
  manualAuth: router({
    register: publicProcedure.input(manualRegistrationSchema).mutation(async ({ input }) => {
      try {
        return await supabase.registerSupabaseManualProfile(input);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to create the account.";
        const isConflict = /already exists|already registered|duplicate|email_exists/i.test(message);
        const isInfrastructure = /supabase server credentials|unable to create the supabase account|unable to retrieve the supabase profile|database|connection|connect|timeout|fetch failed|network/i.test(message);
        throw new TRPCError({ code: isConflict ? "CONFLICT" : isInfrastructure ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST", message });
      }
    }),
    login: publicProcedure.input(manualLoginSchema).mutation(async ({ input }) => {
      try {
        return await supabase.loginSupabaseManualProfile(input.email, input.pin);
      } catch {
        try {
          const migrated = await migrateVerifiedLegacyManualProfile(input.email, input.pin);
          if (migrated) return migrated;
        } catch (migrationError) {
          console.error("[ManualAuth] Legacy profile migration failed", migrationError);
        }
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
      }
    }),
    deleteAccount: publicProcedure.input(manualAccountDeletionSchema).mutation(async ({ input }) => {
      try {
        const result = await supabase.deleteSupabaseManualAccount(input.email, input.pin);
        await db.deleteManualAccountData(result.email);
        return { deleted: true } as const;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to reset the account.";
        throw new TRPCError({ code: message.includes("administrator") ? "FORBIDDEN" : "UNAUTHORIZED", message });
      }
    }),
    exportData: publicProcedure.input(manualLoginSchema).mutation(async ({ input }) => {
      try {
        const profile = await supabase.loginSupabaseManualProfile(input.email, input.pin);
        if (profile.email === OMNI_ADMIN_EMAIL) throw new Error("The administrator account cannot be exported here.");
        return await db.getManualAccountDataExport(profile.email);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to export the account.";
        throw new TRPCError({ code: message.includes("administrator") ? "FORBIDDEN" : "UNAUTHORIZED", message });
      }
    }),
    beginTelegramLink: publicProcedure.input(manualLoginSchema).mutation(async ({ input }) => {
      try {
        return await supabase.createTelegramLinkChallenge(input.email, input.pin);
      } catch {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Unable to start Telegram linking." });
      }
    }),
    requestTelegramPasswordReset: publicProcedure.input(telegramPasswordResetRequestSchema).mutation(async ({ input }) => {
      try {
        await supabase.requestTelegramPasswordResetByEmail(input.email);
      } catch (error) {
        console.error("[ManualAuth] Telegram reset request failed", error);
      }
      return { accepted: true } as const;
    }),
    confirmTelegramPasswordReset: publicProcedure.input(telegramPasswordResetConfirmationSchema).mutation(async ({ input }) => {
      try {
        return await supabase.confirmTelegramPasswordReset(input);
      } catch {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "The recovery code is invalid or expired." });
      }
    }),
  }),
  notifications: router({
    registerDevice: publicProcedure.input(z.object({
      expoPushToken: z.string().regex(/^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/, "Invalid Expo push token."),
      platform: z.enum(["ios", "android"]),
      optedIn: z.boolean(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id && !ctx.manualUserEmail) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in before registering this device." });
      return db.upsertNotificationDevice({
        userId: ctx.user?.id ?? ctx.manualUserId ?? null,
        manualEmail: ctx.manualUserEmail ?? ctx.user?.email ?? null,
        expoPushToken: input.expoPushToken,
        platform: input.platform,
        optedIn: input.optedIn,
        active: input.optedIn,
      });
    }),
    setDeviceOptIn: publicProcedure.input(z.object({ expoPushToken: z.string().min(20), optedIn: z.boolean() })).mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id && !ctx.manualUserEmail) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in before updating notification preferences." });
      await db.setNotificationDeviceOptIn(input.expoPushToken, input.optedIn);
      return { success: true } as const;
    }),
    recordCampaignLinkClick: publicProcedure.input(z.object({ campaignId: z.number().int().positive(), linkClickToken: z.string().uuid() })).mutation(({ input }) => db.recordNotificationCampaignLinkClick(input.campaignId, input.linkClickToken)),
  }),
  feedback: router({
    listSupportLinks: publicProcedure.query(() => db.listActiveSupportLinks()),
    submit: publicProcedure.input(feedbackInputSchema).mutation(async ({ ctx, input }) => {
      const identity = requireSignedInIdentity(ctx);
      const submission = await db.createFeedbackSubmission({ userId: identity.userId, manualEmail: identity.email, userName: input.userName, type: input.type, message: input.message });
      await db.recordFeatureUsage({ userId: identity.userId, manualEmail: identity.email, feature: "feedback" });
      return submission;
    }),
  }),
  advertisements: router({
    active: publicProcedure.input(z.object({ placement: z.enum(["home", "tasks", "habits", "finance"]) })).query(({ input }) => db.listActiveInAppAdvertisements(input.placement)),
  }),
  subscriptions: router({
    mine: publicProcedure.query(async ({ ctx }) => db.listSubscriptionsForEmail(requireSignedInIdentity(ctx).email)),
    entitlement: publicProcedure.query(async ({ ctx }) => {
      const identity = requireSignedInIdentity(ctx);
      const [comped, subscription] = await Promise.all([
        supabase.getManualProfileCompedAccess(identity.email).catch(() => false),
        db.getEffectiveSubscriptionForEmail(identity.email),
      ]);
      return comped ? { tier: "comped" as const, isCompedFree: true, expiresAt: null } : { tier: subscription.tier, isCompedFree: false, expiresAt: subscription.expiresAt };
    }),
    submit: publicProcedure.input(subscriptionInputSchema).mutation(async ({ ctx, input }) => {
      const identity = requireSignedInIdentity(ctx);
      const expectedAmount = input.plan === "pro_monthly" ? 150 : input.plan === "pro_annual" ? 1200 : 3000;
      if (input.amountEgp !== expectedAmount) throw new TRPCError({ code: "BAD_REQUEST", message: "The entered amount does not match the selected plan." });
      const imageBytes = Buffer.from(input.receiptBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, ""), "base64");
      if (imageBytes.length < 512 || imageBytes.length > 5 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Receipt image must be between 512 bytes and 5 MB." });
      const receipt = await storagePut(`subscription-receipts/${identity.email.replace(/[^a-z0-9]/gi, "_")}/${Date.now()}.${receiptExtension(input.receiptContentType)}`, imageBytes, input.receiptContentType);
      const request = await db.createSubscriptionRequest({ userId: identity.userId, manualEmail: identity.email, userName: input.userName, plan: input.plan, amountEgp: input.amountEgp, paymentMethod: input.paymentMethod, senderPhone: input.senderPhone, receiptKey: receipt.key, receiptUrl: receipt.url });
      await db.recordFeatureUsage({ userId: identity.userId, manualEmail: identity.email, feature: "subscription_request" });
      try { await supabase.notifyTelegramAdministratorOfSubscription({ id: request.id, userName: request.userName, email: request.manualEmail, plan: request.plan, amountEgp: request.amountEgp, paymentMethod: request.paymentMethod, senderPhone: request.senderPhone, receiptUrl: await storageGetSignedUrl(receipt.key) }); } catch (error) { console.error("[Subscription] Telegram review notification deferred", error); }
      return request;
    }),
  }),
  admin: router({
    audit: router({
      list: omniAdminProcedure.input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional()).query(({ input }) => db.listAdminAuditLogs(input?.limit ?? 30)),
      record: omniAdminProcedure.input(z.object({ action: z.string().min(1).max(120), targetType: z.string().min(1).max(64), targetId: z.string().max(128).optional(), details: z.string().max(2000).optional() })).mutation(({ ctx, input }) => {
        const actorUserId = ctx.user?.id ?? ctx.manualUserId;
        if (!actorUserId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Administrator audit identity is unavailable." });
        return db.createAdminAuditLog({ actorUserId, ...input });
      }),
    }),
    campaigns: router({
      list: omniAdminProcedure.input(z.object({ limit: z.number().int().min(1).max(50).optional() }).optional()).query(({ input }) => db.listNotificationCampaigns(input?.limit ?? 20)),
      create: omniAdminProcedure.input(campaignInputSchema).mutation(async ({ ctx, input }) => {
        const actorUserId = ctx.user?.id ?? ctx.manualUserId;
        if (!actorUserId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Administrator campaign identity is unavailable." });
        if (input.delivery === "schedule" && (!input.scheduledAt || input.scheduledAt.getTime() <= Date.now())) throw new TRPCError({ code: "BAD_REQUEST", message: "A future schedule time is required." });
        const campaign = await db.createNotificationCampaign({
          createdByUserId: actorUserId,
          title: input.title,
          body: input.body,
          destinationUrl: input.destinationUrl,
          category: input.category,
          audience: input.audience,
          status: input.delivery === "schedule" ? "scheduled" : "draft",
          scheduledAt: input.delivery === "schedule" ? input.scheduledAt! : null,
        });
        if (input.delivery === "schedule") {
          const session = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
          const job = await createHeartbeatJob({ name: `omni-campaign-${campaign.id}`, cron: campaignCron(input.scheduledAt!), path: "/api/scheduled/notification-campaign", payload: { campaignId: campaign.id }, description: `OMNI LIFE campaign ${campaign.id}` }, session);
          await db.updateNotificationCampaign(campaign.id, { scheduleCronTaskUid: job.taskUid });
          await db.createAdminAuditLog({ actorUserId, action: "schedule_notification_campaign", targetType: "campaign", targetId: String(campaign.id), details: `${input.category}:${input.audience}` });
          return { ...campaign, scheduleCronTaskUid: job.taskUid };
        }
        const delivery = await dispatchNotificationCampaign(campaign.id);
        await db.createAdminAuditLog({ actorUserId, action: "send_notification_campaign", targetType: "campaign", targetId: String(campaign.id), details: `${input.category}:${input.audience}:${delivery.accepted}` });
        return { ...campaign, delivery };
      }),
    }),
    advertisements: router({
      list: omniAdminProcedure.input(z.object({ limit: z.number().int().min(1).max(50).optional() }).optional()).query(({ input }) => db.listInAppAdvertisements(input?.limit ?? 30)),
      create: omniAdminProcedure.input(inAppAdInputSchema).mutation(async ({ ctx, input }) => {
        const actorUserId = ctx.user?.id ?? ctx.manualUserId;
        if (!actorUserId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Administrator identity is unavailable." });
        if (input.endsAt && input.startsAt && input.endsAt.getTime() <= input.startsAt.getTime()) throw new TRPCError({ code: "BAD_REQUEST", message: "Advertisement end time must be later than its start time." });
        const ad = await db.createInAppAdvertisement({ ...input, destinationUrl: input.destinationUrl ?? null, startsAt: input.startsAt ?? null, endsAt: input.endsAt ?? null, active: true, createdByUserId: actorUserId });
        await db.createAdminAuditLog({ actorUserId, action: "create_in_app_ad", targetType: "advertisement", targetId: String(ad.id), details: `${input.placement}:${input.destinationUrl ?? "no-link"}` });
        return ad;
      }),
      setActive: omniAdminProcedure.input(z.object({ id: z.number().int().positive(), active: z.boolean() })).mutation(async ({ ctx, input }) => {
        const actorUserId = ctx.user?.id ?? ctx.manualUserId;
        if (!actorUserId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Administrator identity is unavailable." });
        await db.setInAppAdvertisementActive(input.id, input.active);
        await db.createAdminAuditLog({ actorUserId, action: input.active ? "activate_in_app_ad" : "deactivate_in_app_ad", targetType: "advertisement", targetId: String(input.id), details: input.active ? "active" : "inactive" });
        return { success: true } as const;
      }),
    }),
    dashboard: router({
      metrics: omniAdminProcedure.query(() => db.getAdministratorDashboardMetrics()),
      feedback: omniAdminProcedure.query(() => db.listFeedbackSubmissions()),
      setFeedbackStatus: omniAdminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["new", "read", "resolved"]) })).mutation(async ({ ctx, input }) => {
        await db.updateFeedbackStatus(input.id, input.status);
        const actorUserId = ctx.user?.id ?? ctx.manualUserId;
        if (actorUserId) await db.createAdminAuditLog({ actorUserId, action: "review_feedback", targetType: "feedback", targetId: String(input.id), details: input.status });
        return { success: true } as const;
      }),
      supportLinks: omniAdminProcedure.query(() => db.listSupportLinksForAdmin()),
      addSupportLink: omniAdminProcedure.input(supportLinkInputSchema).mutation(async ({ ctx, input }) => {
        const actorUserId = ctx.user?.id ?? ctx.manualUserId;
        if (!actorUserId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Administrator identity is unavailable." });
        const link = await db.createSupportLink({ ...input, createdByUserId: actorUserId });
        await db.createAdminAuditLog({ actorUserId, action: "add_support_link", targetType: "support_link", targetId: String(link.id), details: input.type });
        return link;
      }),
      updateSupportLink: omniAdminProcedure.input(supportLinkUpdateSchema).mutation(async ({ ctx, input }) => {
        const actorUserId = ctx.user?.id ?? ctx.manualUserId;
        if (!actorUserId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Administrator identity is unavailable." });
        const link = await db.updateSupportLink(input.id, { label: input.label, url: input.url, type: input.type });
        await db.createAdminAuditLog({ actorUserId, action: "update_support_link", targetType: "support_link", targetId: String(link.id), details: input.type });
        return link;
      }),
      deleteSupportLink: omniAdminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        const actorUserId = ctx.user?.id ?? ctx.manualUserId;
        if (!actorUserId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Administrator identity is unavailable." });
        const link = await db.deleteSupportLink(input.id);
        await db.createAdminAuditLog({ actorUserId, action: "delete_support_link", targetType: "support_link", targetId: String(link.id), details: link.type });
        return { success: true } as const;
      }),
      subscriptions: omniAdminProcedure.query(() => db.listSubscriptionRequests()),
      reviewSubscription: omniAdminProcedure.input(z.object({ id: z.number().int().positive(), decision: z.enum(["approved", "rejected"]), note: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => {
        const actorUserId = ctx.user?.id ?? ctx.manualUserId;
        if (!actorUserId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Administrator identity is unavailable." });
        const request = await db.reviewSubscriptionRequest(input.id, input.decision, actorUserId, input.note);
        await db.createAdminAuditLog({ actorUserId, action: `${input.decision}_subscription`, targetType: "subscription", targetId: String(input.id), details: `${request.plan}:${request.manualEmail}` });
        try { await sendSubscriptionStatusPush({ email: request.manualEmail, plan: request.plan, decision: input.decision }); } catch (error) { console.error("[Subscription] User push notification deferred", error); }
        if (input.decision === "approved") {
          try { await supabase.notifyTelegramSubscriptionApproved(request.userName); } catch (error) { console.error("[Subscription] Telegram approval notification deferred", error); }
        }
        return request;
      }),
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
