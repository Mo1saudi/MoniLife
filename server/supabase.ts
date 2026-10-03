import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";

import { OMNI_ADMIN_EMAIL } from "../shared/admin-access";
import { calculateAgeFromBirthDate, normalizeNumericInput, parseAgeInput, parseBirthDateInput } from "../shared/telegram-recovery-input";
import { extractTelegramLinkCode } from "../shared/telegram-link-code";
import * as db from "./db";

type ProfileRow = {
  id: string;
  auth_user_id: string | null;
  name: string | null;
  birth_date: string | null;
  age: number | null;
  email: string | null;
  phone: string | null;
  secondary_contact: string | null;
  telegram_chat_id: string | number | null;
  is_comped_free: boolean | null;
};

type RecoveryCodeRow = {
  id: string;
  user_id: string;
  code_hash: string;
  attempts: number;
  expires_at: string;
};

type TelegramLinkCodeRow = {
  id: string;
  user_id: string;
  code_hash: string;
  expires_at: string;
};

type TelegramRecoverySession = {
  chat_id: string | number;
  state: "awaiting_name" | "awaiting_age" | "awaiting_birth_date" | "awaiting_email";
  full_name: string | null;
  birth_date: string | null;
  attempts: number;
  expires_at: string;
};

export type PublicSupabaseProfile = {
  id: string;
  fullName: string;
  birthDate: string;
  age?: number;
  email: string;
  phone: string;
  secondaryContact: string | null;
  telegramLinked: boolean;
  isCompedFree: boolean;
  manualSessionToken?: string;
  manualAdminToken?: string;
};

export type AdministratorDirectoryProfile = Pick<PublicSupabaseProfile, "fullName" | "email" | "isCompedFree">;

export type ManualRegistrationInput = {
  fullName: string;
  birthDate?: string;
  age?: number;
  email: string;
  phone: string;
  secondaryContact?: string;
  pin: string;
};

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const codeTtlMs = 10 * 60 * 1000;
const telegramRecoverySessionTtlMs = 10 * 60 * 1000;
const manualAdminSessionTtlSeconds = 30 * 24 * 60 * 60;
const manualAdminSessionPurpose = "omni-manual-admin:v1";
const manualSessionPurpose = "omni-manual-session:v2";

const supabase = (supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${supabaseServiceRoleKey}` } },
    })
  : new Proxy({} as SupabaseClient, {
      get() {
        throw new Error("Supabase server credentials are required.");
      },
    })) as SupabaseClient;

function normalizeEmail(email: string) {
  return email.normalize("NFKC").trim().toLowerCase();
}

function normalizeManualRegistrationInput(input: ManualRegistrationInput): ManualRegistrationInput {
  const normalizedAge = input.age === undefined ? undefined : parseAgeInput(String(input.age));
  if (input.age !== undefined && normalizedAge === null) {
    throw new Error("Age must be between 13 and 120.");
  }
  const normalizedPin = normalizeNumericInput(input.pin);
  if (!/^\d{6}$/.test(normalizedPin)) throw new Error("PIN must contain exactly 6 digits.");

  let normalizedBirthDate: string | undefined;
  if (input.birthDate) {
    normalizedBirthDate = parseBirthDateInput(input.birthDate) ?? undefined;
    if (!normalizedBirthDate) throw new Error("Birth date must be a valid past date.");
  }

  return {
    ...input,
    fullName: input.fullName.normalize("NFKC").replace(/\s+/g, " ").trim(),
    email: normalizeEmail(input.email),
    phone: input.phone.normalize("NFKC").replace(/\s+/g, " ").trim(),
    secondaryContact: input.secondaryContact?.normalize("NFKC").replace(/\s+/g, " ").trim(),
    age: normalizedAge === null ? undefined : normalizedAge,
    birthDate: normalizedBirthDate,
    pin: normalizedPin,
  };
}

const profileSelectWithAge = "id, auth_user_id, name, birth_date, age, email, phone, secondary_contact, telegram_chat_id, is_comped_free";
const profileSelectLegacy = "id, auth_user_id, name, birth_date, email, phone, secondary_contact, telegram_chat_id, is_comped_free";
function shouldFallbackWithoutAge(error: { message?: string } | null) {
  return Boolean(error?.message && /age|column|schema cache/i.test(error.message));
}

function normalizeName(name: string) {
  return name
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function hashSensitiveValue(value: string) {
  const key = process.env.JWT_SECRET || supabaseServiceRoleKey;
  return createHmac("sha256", key).update(value).digest("hex");
}

function sameHash(expected: string, candidate: string) {
  const expectedBuffer = Buffer.from(expected, "hex");
  const candidateBuffer = Buffer.from(candidate, "hex");
  return expectedBuffer.length === candidateBuffer.length && timingSafeEqual(expectedBuffer, candidateBuffer);
}

type ManualSessionPayload = { purpose: string; email: string; exp: number };

function createManualSessionToken(email: string) {
  const payload: ManualSessionPayload = {
    purpose: manualSessionPurpose,
    email: normalizeEmail(email),
    exp: Math.floor(Date.now() / 1000) + manualAdminSessionTtlSeconds,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", process.env.JWT_SECRET || supabaseServiceRoleKey)
    .update(`${manualSessionPurpose}.${encodedPayload}`)
    .digest("hex");
  return `${encodedPayload}.${signature}`;
}

function createManualAdminSessionToken(email: string) {
  const payload: ManualSessionPayload = {
    purpose: manualAdminSessionPurpose,
    email: normalizeEmail(email),
    exp: Math.floor(Date.now() / 1000) + manualAdminSessionTtlSeconds,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", process.env.JWT_SECRET || supabaseServiceRoleKey)
    .update(`${manualAdminSessionPurpose}.${encodedPayload}`)
    .digest("hex");
  return `${encodedPayload}.${signature}`;
}

function getEmailFromManualAdminSessionToken(token: string) {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature || !/^[a-f0-9]{64}$/i.test(signature)) return null;
  const expectedSignature = createHmac("sha256", process.env.JWT_SECRET || supabaseServiceRoleKey)
    .update(`${manualAdminSessionPurpose}.${encodedPayload}`)
    .digest("hex");
  if (!sameHash(expectedSignature, signature)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as ManualSessionPayload;
    if (payload.purpose !== manualAdminSessionPurpose || payload.email !== OMNI_ADMIN_EMAIL || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload.email;
  } catch {
    return null;
  }
}

function getEmailFromManualSessionToken(token: string) {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature || !/^[a-f0-9]{64}$/i.test(signature)) return null;
  const expectedSignature = createHmac("sha256", process.env.JWT_SECRET || supabaseServiceRoleKey)
    .update(`${manualSessionPurpose}.${encodedPayload}`)
    .digest("hex");
  if (!sameHash(expectedSignature, signature)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as ManualSessionPayload;
    if (payload.purpose !== manualSessionPurpose || !isValidEmail(payload.email) || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return normalizeEmail(payload.email);
  } catch {
    return null;
  }
}

function toPublicProfile(row: ProfileRow): PublicSupabaseProfile {
  if (!row.email || !row.name || !row.auth_user_id) {
    throw new Error("Supabase profile is incomplete.");
  }
  return {
    id: row.auth_user_id,
    fullName: row.name,
    birthDate: row.birth_date ?? "",
    ...(row.age !== null && row.age !== undefined ? { age: row.age } : {}),
    email: row.email,
    phone: row.phone ?? "",
    secondaryContact: row.secondary_contact,
    telegramLinked: row.telegram_chat_id !== null,
    isCompedFree: Boolean(row.is_comped_free),
  };
}

async function findProfileByAuthUserId(userId: string) {
  let result = await supabase.from("profiles").select(profileSelectWithAge).eq("auth_user_id", userId).maybeSingle();
  if (result.error && shouldFallbackWithoutAge(result.error)) result = await supabase.from("profiles").select(profileSelectLegacy).eq("auth_user_id", userId).maybeSingle();
  if (result.error) throw new Error("Unable to retrieve the Supabase profile.");
  return result.data as ProfileRow | null;
}

function resolveManualAccountEmail(emailInput: string, sessionToken?: string) {
  const requestedEmail = normalizeEmail(emailInput);
  if (!sessionToken) return requestedEmail;
  const signedEmail = getEmailFromManualSessionToken(sessionToken);
  // A token can remain valid after the account email changes. The user-supplied
  // email plus the current PIN is the ownership proof for these manual-account
  // procedures, so a stale token must never force the previous email.
  return signedEmail === requestedEmail ? signedEmail : requestedEmail;
}

async function findProfileByEmail(email: string) {
  let result = await supabase.from("profiles").select(profileSelectWithAge).eq("email", normalizeEmail(email)).maybeSingle();
  if (result.error && shouldFallbackWithoutAge(result.error)) result = await supabase.from("profiles").select(profileSelectLegacy).eq("email", normalizeEmail(email)).maybeSingle();
  if (result.error) throw new Error("Unable to retrieve the Supabase profile.");
  return result.data as ProfileRow | null;
}

async function createProfile(userId: string, input: ManualRegistrationInput) {
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      auth_user_id: userId,
      name: input.fullName.trim(),
      birth_date: input.birthDate || null,
      age: input.age ?? null,
      email: normalizeEmail(input.email),
      phone: input.phone.trim() || null,
      secondary_contact: input.secondaryContact?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .select(profileSelectWithAge)
    .single();
  if (error || !data) {
    const providerMessage = error && typeof error.message === "string" ? error.message : "";
    if (/duplicate|already exists|unique.*email|profiles_email/i.test(providerMessage)) throw new Error("A profile already exists for this email.");
    throw new Error("Unable to store the profile in Supabase. Apply the age-column migration before creating age-based accounts.");
  }
  return data as ProfileRow;
}

async function getAuthUserByEmail(email: string) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error("Unable to verify the Supabase account.");
  return data.users.find((user) => user.email?.toLowerCase() === normalizeEmail(email)) ?? null;
}

async function ensureOmniAdminAccount() {
  const adminPassword = process.env.OMNI_ADMIN_PASSWORD;
  if (!adminPassword) throw new Error("Administrator password configuration is unavailable.");
  let user = await getAuthUserByEmail(OMNI_ADMIN_EMAIL);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: OMNI_ADMIN_EMAIL,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: "OMNI LIFE Administrator", role: "admin" },
    });
    if (error || !data.user) throw new Error("Unable to provision the administrator account.");
    user = data.user;
  } else {
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: "OMNI LIFE Administrator", role: "admin" },
    });
    if (error) throw new Error("Unable to update the administrator account.");
  }

  const existingProfile = await findProfileByAuthUserId(user.id);
  if (!existingProfile) {
    await createProfile(user.id, {
      fullName: "OMNI LIFE Administrator",
      birthDate: "",
      email: OMNI_ADMIN_EMAIL,
      phone: "",
      pin: adminPassword,
    });
  }
}

export async function registerSupabaseManualProfile(input: ManualRegistrationInput) {
  const normalizedInput = normalizeManualRegistrationInput(input);
  const email = normalizedInput.email;
  const birthDate = normalizedInput.birthDate ?? "";
  if (email === OMNI_ADMIN_EMAIL) {
    throw new Error("The administrator account is configured separately.");
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: normalizedInput.pin,
    email_confirm: true,
    user_metadata: { full_name: normalizedInput.fullName, ...(birthDate ? { birth_date: birthDate } : {}), ...(normalizedInput.age !== undefined ? { age: normalizedInput.age } : {}) },
  });
  if (error || !data.user) {
    const providerMessage = error && typeof error.message === "string" ? error.message : "";
    const providerCode = error && typeof error.code === "string" ? error.code : "";
    if (/already registered|already exists|duplicate|email_exists/i.test(`${providerCode} ${providerMessage}`)) throw new Error("A profile already exists for this email.");
    throw new Error("Unable to create the Supabase account.");
  }
  try {
      return { ...toPublicProfile(await createProfile(data.user.id, { ...normalizedInput, birthDate })), manualSessionToken: createManualSessionToken(email) };
  } catch (error) {
    await supabase.auth.admin.deleteUser(data.user.id).catch(() => undefined);
    throw error;
  }
}

export async function loginSupabaseManualProfile(emailInput: string, pin: string) {
  const email = normalizeEmail(emailInput);
  const configuredAdminPassword = process.env.OMNI_ADMIN_PASSWORD;
  if (email === OMNI_ADMIN_EMAIL && configuredAdminPassword && normalizeNumericInput(pin) === normalizeNumericInput(configuredAdminPassword)) {
    // The administrator must remain able to enter the control center even when
    // Supabase Auth is temporarily unreachable. The signed admin token is still
    // generated with the server-only JWT secret and is never exposed as a PIN.
    try {
      await ensureOmniAdminAccount();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pin });
      if (!error && data.user) {
        const profile = await findProfileByAuthUserId(data.user.id);
        if (profile) {
          return {
            ...toPublicProfile(profile),
            manualSessionToken: createManualSessionToken(email),
            manualAdminToken: createManualAdminSessionToken(email),
          };
        }
      }
    } catch (error) {
      console.warn("[ManualAuth] Supabase administrator sync unavailable; using signed admin fallback", error);
    }
    return {
      id: `admin:${email}`,
      fullName: "OMNI LIFE Administrator",
      birthDate: "",
      email: OMNI_ADMIN_EMAIL,
      phone: "",
      secondaryContact: null,
      telegramLinked: false,
      isCompedFree: true,
      manualSessionToken: createManualSessionToken(email),
      manualAdminToken: createManualAdminSessionToken(email),
    } satisfies PublicSupabaseProfile;
  }
  if (email === OMNI_ADMIN_EMAIL) await ensureOmniAdminAccount();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: pin });
  if (error || !data.user) throw new Error("Invalid email or password.");
  const profile = await findProfileByAuthUserId(data.user.id);
  if (!profile) throw new Error("The profile is not available.");
  const access = await db.getUserAccessControl(email);
  if (access.blocked && email !== OMNI_ADMIN_EMAIL) throw new Error("This account is currently restricted by the administrator.");
  return {
    ...toPublicProfile(profile),
    // Authenticated manual-account calls (including push-device registration) use this scoped token.
    manualSessionToken: createManualSessionToken(email),
    ...(email === OMNI_ADMIN_EMAIL
      ? { manualAdminToken: createManualAdminSessionToken(email) }
      : {}),
  };
}

/** Permanently removes a verified non-administrator manual account and Supabase records tied to it. */
export async function deleteSupabaseManualAccount(emailInput: string, pin: string) {
  const email = normalizeEmail(emailInput);
  if (email === OMNI_ADMIN_EMAIL) throw new Error("The administrator account cannot be reset here.");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: pin });
  if (error || !data.user) throw new Error("Invalid email or password.");
  const userId = data.user.id;
  const cleanupResults = await Promise.all([
    supabase.from("auth_recovery_codes").delete().eq("user_id", userId),
    supabase.from("telegram_link_codes").delete().eq("user_id", userId),
    supabase.from("profiles").delete().eq("auth_user_id", userId),
  ]);
  if (cleanupResults.some((result) => result.error)) throw new Error("Unable to clear the account profile data.");
  const { error: deleteError } = await supabase.auth.admin.deleteUser(userId, false);
  if (deleteError) throw new Error("Unable to remove the authentication account.");
  return { email };
}

export async function deleteSupabaseManualAccountByAdmin(emailInput: string) {
  const email = normalizeEmail(emailInput);
  if (!email || email === OMNI_ADMIN_EMAIL) throw new Error("The administrator account cannot be deleted.");
  const profile = await findProfileByEmail(email);
  if (!profile?.auth_user_id) throw new Error("The manual account was not found.");
  const cleanupResults = await Promise.all([
    supabase.from("auth_recovery_codes").delete().eq("user_id", profile.auth_user_id),
    supabase.from("telegram_link_codes").delete().eq("user_id", profile.auth_user_id),
    supabase.from("profiles").delete().eq("auth_user_id", profile.auth_user_id),
  ]);
  if (cleanupResults.some((result) => result.error)) throw new Error("Unable to clear the account profile data.");
  const { error } = await supabase.auth.admin.deleteUser(profile.auth_user_id, false);
  if (error) throw new Error("Unable to remove the authentication account.");
  return { email, deleted: true } as const;
}

export async function getSupabaseManualUserEmail(accessToken: string | undefined) {
  if (!accessToken) return null;
  const signedAdministratorEmail = getEmailFromManualAdminSessionToken(accessToken);
  if (signedAdministratorEmail) return signedAdministratorEmail;
  const signedManualEmail = getEmailFromManualSessionToken(accessToken);
  if (signedManualEmail) return signedManualEmail;
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user?.email) return null;
  return data.user.email.toLowerCase();
}

export async function getManualProfileCompedAccess(email: string) {
  const profile = await findProfileByEmail(email);
  return Boolean(profile?.is_comped_free);
}

export async function setManualProfileCompedAccess(emailInput: string, enabled: boolean) {
  const email = normalizeEmail(emailInput);
  if (email === OMNI_ADMIN_EMAIL) throw new Error("Administrator access cannot be changed here.");
  const profile = await findProfileByEmail(email);
  if (!profile) throw new Error("This user does not have a manual account eligible for exceptional access.");
  const { error } = await supabase.from("profiles").update({ is_comped_free: enabled, updated_at: new Date().toISOString() }).eq("id", profile.id);
  if (error) throw new Error("Unable to update exceptional access for this account.");
  return { email, isCompedFree: enabled };
}

export async function listManualProfilesForAdministrator(limit = 250): Promise<AdministratorDirectoryProfile[]> {
  const { data, error } = await supabase.from("profiles").select("name, email, is_comped_free").not("email", "is", null).order("updated_at", { ascending: false }).limit(limit);
  if (error) throw new Error("Unable to list account profiles for administration.");
  return (data ?? []).flatMap((row) => {
    const email = typeof row.email === "string" ? normalizeEmail(row.email) : "";
    if (!email || email === OMNI_ADMIN_EMAIL) return [];
    return [{ fullName: typeof row.name === "string" && row.name.trim() ? row.name.trim() : email, email, isCompedFree: Boolean(row.is_comped_free) }];
  });
}

export async function getManualProfileForAdministrator(emailInput: string): Promise<AdministratorDirectoryProfile | null> {
  const profile = await findProfileByEmail(emailInput);
  if (!profile?.email) return null;
  return { fullName: profile.name?.trim() || profile.email, email: normalizeEmail(profile.email), isCompedFree: Boolean(profile.is_comped_free) };
}

function createSixDigitCode() {
  return randomInt(100000, 1000000).toString();
}

function createTelegramLinkCode() {
  return randomBytes(5).toString("hex").toUpperCase();
}

async function readTelegramBody(response: Response) {
  const raw = await response.text();
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
}

async function getTelegramBotUsername() {
  if (!telegramBotToken) throw new Error("Telegram bot configuration is unavailable.");
  const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/getMe`);
  const body = await readTelegramBody(response) as { ok?: boolean; result?: { username?: string } };
  if (!response.ok || !body.ok || !body.result?.username) throw new Error("Unable to retrieve Telegram bot information.");
  return body.result.username;
}

const recoveryKeyboard = {
  keyboard: [[{ text: "🔐 Reset Password" }]],
  resize_keyboard: true,
  input_field_placeholder: "اختر Reset Password أو اكتب /reset_password",
};

async function sendTelegramMessage(chatId: string | number, text: string, options?: { showRecoveryButton?: boolean }) {
  if (!telegramBotToken) throw new Error("Telegram bot configuration is unavailable.");
  const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      ...(options?.showRecoveryButton ? { reply_markup: recoveryKeyboard } : {}),
    }),
  });
  const body = await readTelegramBody(response) as { ok?: boolean };
  if (!response.ok || !body.ok) throw new Error("Unable to deliver the Telegram message.");
}

async function sendTelegramPhoto(chatId: string | number, photoUrl: string, caption: string) {
  if (!telegramBotToken) throw new Error("Telegram bot configuration is unavailable.");
  const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption }),
  });
  const body = await readTelegramBody(response) as { ok?: boolean };
  if (!response.ok || !body.ok) throw new Error("Unable to deliver the Telegram receipt image.");
}

async function getAdministratorTelegramChatId() {
  const admin = await findProfileByEmail(OMNI_ADMIN_EMAIL);
  if (!admin?.telegram_chat_id) throw new Error("The administrator Telegram account is not linked.");
  return admin.telegram_chat_id;
}

export async function notifyTelegramAdministratorOfSubscription(input: { id: number; userName: string; email: string; plan: "pro" | "pro_monthly" | "pro_annual" | "lifetime"; amountEgp: number; paymentMethod: "instapay" | "vodafone_cash"; senderPhone: string; receiptUrl: string }) {
  const chatId = await getAdministratorTelegramChatId();
  const planLabel = input.plan === "lifetime" ? "Lifetime — 3000 جنيه / مدى الحياة" : input.plan === "pro_annual" ? "Pro Annual — 1200 جنيه / سنة" : "Pro Monthly — 150 جنيه / 30 يومًا";
  const methodLabel = input.paymentMethod === "instapay" ? "InstaPay" : "Vodafone Cash";
  const caption = ["طلب اشتراك جديد في OMNI LIFE", `رقم الطلب: ${input.id}`, `المستخدم: ${input.userName}`, `البريد: ${input.email}`, `الخطة: ${planLabel}`, `المبلغ: ${input.amountEgp} جنيه`, `التحويل من: ${input.senderPhone}`, `الطريقة: ${methodLabel}`, "راجع الإيصال ثم اعتمد أو ارفض من لوحة الإدارة."].join("\n");
  await sendTelegramPhoto(chatId, input.receiptUrl, caption.slice(0, 1024));
}

export async function notifyTelegramSubscriptionApproved(userName: string) {
  const chatId = await getAdministratorTelegramChatId();
  await sendTelegramMessage(chatId, `تم اعتماد اشتراك (${userName})`);
}

const botUsageGuide = [
  "مرحبًا بك في بوت OMNI LIFE.",
  "",
  "ربط الحساب: افتح رابط الربط الذي يظهر لك داخل التطبيق، ثم اضغط Start في Telegram.",
  "",
    "استعادة كلمة السر: أرسل /reset_password. سيطلب منك البوت الاسم الكامل، ثم العمر بالأرقام، ثم البريد الإلكتروني.",
  "",
    "اكتب العمر بالأرقام العربية أو الإنجليزية؛ يقبل البوت الصيغتين. بعد التحقق سيرسل لك رمزًا مؤقتًا صالحًا لمدة 10 دقائق لتعيين كلمة سر جديدة.",
  "",
  "للإلغاء في أي وقت أرسل /cancel.",
].join("\n");

async function clearTelegramRecoveryConversation(chatId: string | number) {
  const { error } = await supabase.from("telegram_recovery_sessions").delete().eq("chat_id", String(chatId));
  if (error) throw new Error("Unable to clear Telegram recovery state.");
}

async function startTelegramRecoveryConversation(chatId: string | number) {
  const { error } = await supabase.from("telegram_recovery_sessions").upsert({
    chat_id: String(chatId),
    state: "awaiting_name",
    full_name: null,
    birth_date: null,
    attempts: 0,
    expires_at: new Date(Date.now() + telegramRecoverySessionTtlMs).toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "chat_id" });
  if (error) throw new Error("Unable to start Telegram password recovery.");
  await sendTelegramMessage(chatId, "سنساعدك على استعادة كلمة السر بأمان.\n\n1/3 اكتب اسمك الكامل كما هو مسجل في OMNI LIFE.");
}

async function getTelegramRecoveryConversation(chatId: string | number) {
  const { data, error } = await supabase
    .from("telegram_recovery_sessions")
    .select("chat_id, state, full_name, birth_date, attempts, expires_at")
    .eq("chat_id", String(chatId))
    .maybeSingle();
  if (error) throw new Error("Unable to read Telegram password recovery.");
  return data as TelegramRecoverySession | null;
}

async function recordTelegramRecoveryFailure(session: TelegramRecoverySession) {
  const attempts = session.attempts + 1;
  if (attempts >= 5) {
    await clearTelegramRecoveryConversation(session.chat_id);
    await sendTelegramMessage(session.chat_id, "تعذر التحقق بعد عدة محاولات. ابدأ من جديد بإرسال /reset_password.");
    return;
  }
    const { error } = await supabase.from("telegram_recovery_sessions").update({
      attempts,
      state: "awaiting_name",
      full_name: null,
      birth_date: null,
      updated_at: new Date().toISOString(),
    }).eq("chat_id", session.chat_id);
    if (error) throw new Error("Unable to reset Telegram recovery state.");
    await sendTelegramMessage(session.chat_id, "لم نتمكن من التحقق من البيانات. حاول مرة أخرى.\n\n1/3 اكتب اسمك الكامل كما هو مسجل في OMNI LIFE.");
}

async function continueTelegramRecoveryConversation(chatId: string | number, text: string) {
  const session = await getTelegramRecoveryConversation(chatId);
  if (!session) return false;
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await clearTelegramRecoveryConversation(chatId);
    await sendTelegramMessage(chatId, "انتهت مهلة التحقق. أرسل /reset_password للبدء من جديد.");
    return true;
  }

  if (session.state === "awaiting_name") {
    const fullName = text.trim();
    if (fullName.length < 2 || fullName.length > 160) {
      await sendTelegramMessage(chatId, "اكتب الاسم الكامل كما هو مسجل في OMNI LIFE.");
      return true;
    }
    const { error } = await supabase.from("telegram_recovery_sessions").update({
      state: "awaiting_age",
      full_name: fullName,
      updated_at: new Date().toISOString(),
    }).eq("chat_id", String(chatId));
    if (error) throw new Error("Unable to advance Telegram recovery state.");
    await sendTelegramMessage(chatId, "2/3 اكتب عمرك بالأرقام، مثال: 31. نقبل الأرقام العربية ٣١ والإنجليزية 31.");
    return true;
  }

  if (session.state === "awaiting_age") {
    const age = parseAgeInput(text);
    if (age === null) {
      await sendTelegramMessage(chatId, "العمر غير صالح. اكتب رقمًا بين 13 و120، مثل 31 أو ٣١.");
      return true;
    }
    const { error } = await supabase.from("telegram_recovery_sessions").update({
      state: "awaiting_email",
      birth_date: String(age),
      updated_at: new Date().toISOString(),
    }).eq("chat_id", String(chatId));
    if (error) throw new Error("Unable to advance Telegram recovery state.");
    await sendTelegramMessage(chatId, "3/3 اكتب البريد الإلكتروني المسجل في OMNI LIFE.");
    return true;
  }

  // Keep old in-progress recovery sessions functional during the migration.
  if (session.state === "awaiting_birth_date") {
    const birthDate = parseBirthDateInput(text);
    if (!birthDate) {
      await sendTelegramMessage(chatId, "تاريخ الميلاد غير صالح. اكتب تاريخًا بصيغة YYYY-MM-DD، مثال: 1995-06-14.");
      return true;
    }
    const { error } = await supabase.from("telegram_recovery_sessions").update({ state: "awaiting_email", birth_date: birthDate, updated_at: new Date().toISOString() }).eq("chat_id", chatId);
    if (error) throw new Error("Unable to advance Telegram recovery state.");
    await sendTelegramMessage(chatId, "3/3 اكتب البريد الإلكتروني المسجل في OMNI LIFE.");
    return true;
  }

  const email = normalizeEmail(text);
  if (!isValidEmail(email) || !session.full_name || !session.birth_date) {
    await recordTelegramRecoveryFailure(session);
    return true;
  }
  const profile = await findProfileByEmail(email);
  const requestedAge = parseAgeInput(session.birth_date ?? "");
  const identityMatches = Boolean(
    profile?.auth_user_id
    && profile.name
    && (requestedAge !== null ? (profile.age ?? calculateAgeFromBirthDate(profile.birth_date)) === requestedAge : profile.birth_date === session.birth_date),
  );
  if (!identityMatches || !profile?.auth_user_id) {
    await recordTelegramRecoveryFailure(session);
    return true;
  }
  const { error: linkError } = await supabase
    .from("profiles")
    .update({ telegram_chat_id: String(chatId), updated_at: new Date().toISOString() })
    .eq("auth_user_id", profile.auth_user_id);
  if (linkError) {
    await recordTelegramRecoveryFailure(session);
    return true;
  }
  await clearTelegramRecoveryConversation(chatId);
  await issuePasswordRecoveryCode(profile.auth_user_id, chatId);
  return true;
}

async function issuePasswordRecoveryCode(userId: string, chatId: string | number) {
  const code = createSixDigitCode();
  const expiresAt = new Date(Date.now() + codeTtlMs).toISOString();
  const now = new Date().toISOString();
  const { error: invalidateError } = await supabase
    .from("auth_recovery_codes")
    .update({ consumed_at: now })
    .eq("user_id", userId)
    .eq("purpose", "telegram_password_reset")
    .is("consumed_at", null);
  if (invalidateError) throw new Error("Unable to prepare password recovery.");
  const { error } = await supabase.from("auth_recovery_codes").insert({
    user_id: userId,
    code_hash: hashSensitiveValue(code),
    purpose: "telegram_password_reset",
    expires_at: expiresAt,
  });
  if (error) throw new Error("Unable to create the recovery code.");
  await sendTelegramMessage(chatId, `رمز استعادة كلمة سر OMNI LIFE هو: ${code}\nصالح لمدة 10 دقائق. لا تشاركه مع أي شخص.`);
}

export async function requestTelegramPasswordResetByEmail(email: string) {
  const profile = await findProfileByEmail(email);
  if (!profile?.auth_user_id || profile.telegram_chat_id === null) return;
  await issuePasswordRecoveryCode(profile.auth_user_id, profile.telegram_chat_id);
}

export async function confirmTelegramPasswordReset(input: { email: string; code: string; pin: string }) {
  const profile = await findProfileByEmail(input.email);
  if (!profile?.auth_user_id) throw new Error("The recovery code is invalid or expired.");
  const { data, error } = await supabase
    .from("auth_recovery_codes")
    .select("id, user_id, code_hash, attempts, expires_at")
    .eq("user_id", profile.auth_user_id)
    .eq("purpose", "telegram_password_reset")
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) throw new Error("The recovery code is invalid or expired.");
  const recovery = data as RecoveryCodeRow;
  if (!sameHash(recovery.code_hash, hashSensitiveValue(input.code))) {
    const attempts = recovery.attempts + 1;
    await supabase.from("auth_recovery_codes").update({
      attempts,
      consumed_at: attempts >= 5 ? new Date().toISOString() : null,
    }).eq("id", recovery.id);
    throw new Error("The recovery code is invalid or expired.");
  }
  const { error: updateError } = await supabase.auth.admin.updateUserById(recovery.user_id, { password: input.pin });
  if (updateError) throw new Error("Unable to update the password.");
  const { error: consumeError } = await supabase.from("auth_recovery_codes").update({ consumed_at: new Date().toISOString() }).eq("id", recovery.id);
  if (consumeError) throw new Error("Unable to complete password recovery.");
  return toPublicProfile(profile);
}

export async function createTelegramLinkChallenge(email: string, pin: string) {
  const profile = await loginSupabaseManualProfile(email, pin);
  const expiresAt = new Date(Date.now() + codeTtlMs).toISOString();
  const code = createTelegramLinkCode();
  const { error: invalidateError } = await supabase
    .from("telegram_link_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("user_id", profile.id)
    .is("consumed_at", null);
  if (invalidateError) throw new Error("Unable to start Telegram linking.");
  const { error } = await supabase.from("telegram_link_codes").insert({
    user_id: profile.id,
    code_hash: hashSensitiveValue(code),
    expires_at: expiresAt,
  });
  if (error) {
    console.error("[Telegram] Unable to create link code", error);
    throw new Error(`Unable to create the Telegram link code: ${error.message}`);
  }
  const username = await getTelegramBotUsername();
  return { code, botUsername: username, expiresAt };
}

async function consumeTelegramLinkChallenge(code: string, chatId: string | number) {
  const { data, error } = await supabase
    .from("telegram_link_codes")
    .select("id, user_id, code_hash, expires_at")
    .eq("code_hash", hashSensitiveValue(code))
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error || !data) return false;
  const challenge = data as TelegramLinkCodeRow;
  const consumedAt = new Date().toISOString();
  const { data: consumed, error: consumeError } = await supabase
    .from("telegram_link_codes")
    .update({ consumed_at: consumedAt })
    .eq("id", challenge.id)
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();
  if (consumeError || !consumed) return false;
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ telegram_chat_id: String(chatId), updated_at: new Date().toISOString() })
    .eq("auth_user_id", challenge.user_id);
  if (!profileError) return true;
  const { error: rollbackError } = await supabase
    .from("telegram_link_codes")
    .update({ consumed_at: null })
    .eq("id", challenge.id)
    .eq("consumed_at", consumedAt);
  if (rollbackError) console.error("[Telegram] Unable to roll back consumed link challenge", rollbackError);
  return false;
}

export async function handleTelegramUpdate(update: unknown) {
  const message = (update as { message?: { chat?: { id?: number }; text?: string } })?.message;
  const chatId = message?.chat?.id;
  const text = message?.text?.trim() ?? "";
  if (!chatId || !text) return;
  const linkCode = extractTelegramLinkCode(text);
  if (linkCode) {
    const linked = await consumeTelegramLinkChallenge(linkCode, chatId);
    await sendTelegramMessage(chatId, linked
      ? "تم ربط Telegram بحساب OMNI LIFE. يمكنك الآن استعادة كلمة السر من هنا أو من التطبيق."
      : "رمز الربط غير صالح أو انتهت صلاحيته. أنشئ رمزًا جديدًا من تطبيق OMNI LIFE.", { showRecoveryButton: linked });
    return;
  }
  if (/^\/(?:start|help)(?:@\w+)?$/i.test(text)) {
    await sendTelegramMessage(chatId, botUsageGuide, { showRecoveryButton: true });
    return;
  }
  if (/^\/cancel(?:@\w+)?$/i.test(text)) {
    await clearTelegramRecoveryConversation(chatId);
    await sendTelegramMessage(chatId, "تم إلغاء عملية استعادة كلمة السر. أرسل /reset_password عندما تكون مستعدًا.");
    return;
  }
  if (/^(?:\/reset_password(?:@\w+)?|🔐?\s*reset password)$/i.test(text)) {
    await startTelegramRecoveryConversation(chatId);
    return;
  }
  if (await continueTelegramRecoveryConversation(chatId, text)) return;
  await sendTelegramMessage(chatId, botUsageGuide, { showRecoveryButton: true });
}

export function getTelegramWebhookSecret() {
  return createHmac("sha256", supabaseServiceRoleKey).update("omni-life-telegram-webhook").digest("base64url");
}

export async function getTelegramWebhookInfo() {
  if (!telegramBotToken) throw new Error("Telegram bot configuration is unavailable.");
  const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/getWebhookInfo`);
  const body = await readTelegramBody(response) as { ok?: boolean; result?: { url?: string; pending_update_count?: number } };
  if (!response.ok || !body.ok || !body.result) throw new Error("Unable to inspect Telegram webhook configuration.");
  return body.result;
}

export async function configureTelegramWebhook(webhookUrl: string) {
  if (!telegramBotToken) throw new Error("Telegram bot configuration is unavailable.");
  if (!webhookUrl.startsWith("https://")) throw new Error("Telegram webhooks require an HTTPS URL.");
  const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: getTelegramWebhookSecret(),
      allowed_updates: ["message"],
      drop_pending_updates: true,
    }),
  });
  const body = await readTelegramBody(response) as { ok?: boolean; description?: string };
  if (!response.ok || !body.ok) throw new Error(body.description || "Unable to configure the Telegram webhook.");
}

export async function configureTelegramBotCommands() {
  if (!telegramBotToken) throw new Error("Telegram bot configuration is unavailable.");
  const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/setMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commands: [
        { command: "start", description: "Start OMNI LIFE bot" },
        { command: "reset_password", description: "Reset your password" },
      ],
    }),
  });
  const body = await readTelegramBody(response) as { ok?: boolean; description?: string };
  if (!response.ok || !body.ok) throw new Error(body.description || "Unable to configure Telegram bot commands.");
}

export async function updateSupabaseManualProfile(input: { email: string; sessionToken?: string; pin: string; fullName?: string; newEmail?: string; phone?: string; secondaryContact?: string }) {
  const current = await loginSupabaseManualProfile(resolveManualAccountEmail(input.email, input.sessionToken), input.pin);
  if (current.email === OMNI_ADMIN_EMAIL) throw new Error("Administrator profile changes are restricted.");
  const nextEmail = input.newEmail ? normalizeEmail(input.newEmail) : current.email;
  if (nextEmail !== current.email && await findProfileByEmail(nextEmail)) throw new Error("A profile already exists for this email.");
  if (nextEmail !== current.email) {
    const { error } = await supabase.auth.admin.updateUserById(current.id, { email: nextEmail, email_confirm: false });
    if (error) throw new Error("Unable to update the email address.");
  }
  const patch = { ...(input.fullName !== undefined ? { name: input.fullName.trim() } : {}), ...(input.phone !== undefined ? { phone: input.phone.trim() } : {}), ...(input.secondaryContact !== undefined ? { secondary_contact: input.secondaryContact.trim() || null } : {}), ...(nextEmail !== current.email ? { email: nextEmail } : {}), updated_at: new Date().toISOString() };
  const { error } = await supabase.from("profiles").update(patch).eq("auth_user_id", current.id);
  if (error) throw new Error("Unable to update the profile.");
  const updated = await findProfileByAuthUserId(current.id);
  if (!updated) throw new Error("The profile is not available.");
  return { ...toPublicProfile(updated), manualSessionToken: createManualSessionToken(nextEmail), emailVerificationRequired: nextEmail !== current.email };
}

export async function changeSupabaseManualPassword(input: { email: string; sessionToken?: string; currentPin: string; newPin: string }) {
  const current = await loginSupabaseManualProfile(resolveManualAccountEmail(input.email, input.sessionToken), input.currentPin);
  if (current.email === OMNI_ADMIN_EMAIL) throw new Error("Administrator password changes are restricted.");
  const { error } = await supabase.auth.admin.updateUserById(current.id, { password: input.newPin });
  if (error) throw new Error("Unable to update the password.");
  return { changed: true } as const;
}

export async function disconnectSupabaseTelegram(input: { email: string; pin: string }) {
  const current = await loginSupabaseManualProfile(input.email, input.pin);
  const { error } = await supabase.from("profiles").update({ telegram_chat_id: null, updated_at: new Date().toISOString() }).eq("auth_user_id", current.id);
  if (error) throw new Error("Unable to disconnect Telegram.");
  const { error: invalidateError } = await supabase.from("telegram_link_codes").update({ consumed_at: new Date().toISOString() }).eq("user_id", current.id).is("consumed_at", null);
  if (invalidateError) throw new Error("Unable to invalidate Telegram link challenges.");
  return { disconnected: true } as const;
}

export async function testSupabaseTelegram(input: { email: string; pin: string }) {
  const current = await loginSupabaseManualProfile(input.email, input.pin);
  const profile = await findProfileByAuthUserId(current.id);
  if (!profile?.telegram_chat_id) throw new Error("Telegram is not connected.");
  await sendTelegramMessage(profile.telegram_chat_id, "Telegram متصل بنجاح مع LIFE OMNI.");
  return { sent: true } as const;
}

export async function getTelegramIntegrationDiagnostics() {
  const result: { botConfigured: boolean; botStatus: "healthy" | "unavailable" | "error"; botUsername: string | null; webhookStatus: "configured" | "missing" | "error"; webhookUrl: string | null; pendingUpdates: number | null; databaseReachable: boolean; connectionCount: number | null; lastError: string | null } = { botConfigured: Boolean(telegramBotToken), botStatus: "unavailable", botUsername: null, webhookStatus: "error", webhookUrl: null, pendingUpdates: null, databaseReachable: false, connectionCount: null, lastError: null };
  if (telegramBotToken) {
    try { result.botUsername = await getTelegramBotUsername(); result.botStatus = "healthy"; } catch { result.botStatus = "error"; result.lastError = "Telegram bot health check failed."; }
    try { const webhook = await getTelegramWebhookInfo(); result.webhookUrl = webhook.url ?? null; result.pendingUpdates = webhook.pending_update_count ?? 0; result.webhookStatus = webhook.url ? "configured" : "missing"; } catch { result.webhookStatus = "error"; result.lastError = result.lastError ?? "Telegram webhook health check failed."; }
  }
  const { count, error } = await supabase.from("profiles").select("id", { count: "exact", head: true }).not("telegram_chat_id", "is", null);
  result.databaseReachable = !error;
  result.connectionCount = error ? null : count ?? 0;
  return result;
}
