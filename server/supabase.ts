import { createClient } from "@supabase/supabase-js";
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";

import { OMNI_ADMIN_EMAIL } from "../shared/admin-access";
import { parseBirthDateInput } from "../shared/telegram-recovery-input";

type ProfileRow = {
  id: string;
  auth_user_id: string | null;
  name: string | null;
  birth_date: string | null;
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
  state: "awaiting_name" | "awaiting_birth_date" | "awaiting_email";
  full_name: string | null;
  birth_date: string | null;
  attempts: number;
  expires_at: string;
};

export type PublicSupabaseProfile = {
  id: string;
  fullName: string;
  birthDate: string;
  email: string;
  phone: string;
  secondaryContact: string | null;
  telegramLinked: boolean;
  isCompedFree: boolean;
  manualAdminToken?: string;
};

export type ManualRegistrationInput = {
  fullName: string;
  birthDate: string;
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

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Supabase server credentials are required.");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  global: { headers: { Authorization: `Bearer ${supabaseServiceRoleKey}` } },
});

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
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

function toPublicProfile(row: ProfileRow): PublicSupabaseProfile {
  if (!row.email || !row.name || !row.auth_user_id) {
    throw new Error("Supabase profile is incomplete.");
  }
  return {
    id: row.auth_user_id,
    fullName: row.name,
    birthDate: row.birth_date ?? "",
    email: row.email,
    phone: row.phone ?? "",
    secondaryContact: row.secondary_contact,
    telegramLinked: row.telegram_chat_id !== null,
    isCompedFree: Boolean(row.is_comped_free),
  };
}

async function findProfileByAuthUserId(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, auth_user_id, name, birth_date, email, phone, secondary_contact, telegram_chat_id, is_comped_free")
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Unable to retrieve the Supabase profile.");
  return data as ProfileRow | null;
}

async function findProfileByEmail(email: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, auth_user_id, name, birth_date, email, phone, secondary_contact, telegram_chat_id, is_comped_free")
    .eq("email", normalizeEmail(email))
    .maybeSingle();
  if (error) throw new Error("Unable to retrieve the Supabase profile.");
  return data as ProfileRow | null;
}

async function createProfile(userId: string, input: ManualRegistrationInput) {
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      auth_user_id: userId,
      name: input.fullName.trim(),
      birth_date: input.birthDate || null,
      email: normalizeEmail(input.email),
      phone: input.phone.trim() || null,
      secondary_contact: input.secondaryContact?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .select("id, auth_user_id, name, birth_date, email, phone, secondary_contact, telegram_chat_id, is_comped_free")
    .single();
  if (error || !data) throw new Error("Unable to store the profile in Supabase.");
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
  const email = normalizeEmail(input.email);
  if (email === OMNI_ADMIN_EMAIL) {
    throw new Error("The administrator account is configured separately.");
  }
  if (await findProfileByEmail(email)) throw new Error("A profile already exists for this email.");
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: input.pin,
    email_confirm: true,
    user_metadata: { full_name: input.fullName.trim(), birth_date: input.birthDate },
  });
  if (error || !data.user) throw new Error("Unable to create the Supabase account.");
  try {
    return toPublicProfile(await createProfile(data.user.id, input));
  } catch (error) {
    await supabase.auth.admin.deleteUser(data.user.id).catch(() => undefined);
    throw error;
  }
}

export async function loginSupabaseManualProfile(emailInput: string, pin: string) {
  const email = normalizeEmail(emailInput);
  if (email === OMNI_ADMIN_EMAIL) await ensureOmniAdminAccount();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: pin });
  if (error || !data.user) throw new Error("Invalid email or password.");
  const profile = await findProfileByAuthUserId(data.user.id);
  if (!profile) throw new Error("The profile is not available.");
  return {
    ...toPublicProfile(profile),
    ...(email === OMNI_ADMIN_EMAIL && data.session?.access_token
      ? { manualAdminToken: data.session.access_token }
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

export async function getSupabaseManualUserEmail(accessToken: string | undefined) {
  if (!accessToken) return null;
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user?.email) return null;
  return data.user.email.toLowerCase();
}

export async function getManualProfileCompedAccess(email: string) {
  const profile = await findProfileByEmail(email);
  return Boolean(profile?.is_comped_free);
}

function createSixDigitCode() {
  return randomInt(100000, 1000000).toString();
}

function createTelegramLinkCode() {
  return randomBytes(5).toString("hex").toUpperCase();
}

async function getTelegramBotUsername() {
  if (!telegramBotToken) throw new Error("Telegram bot configuration is unavailable.");
  const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/getMe`);
  const body = await response.json() as { ok?: boolean; result?: { username?: string } };
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
  const body = await response.json() as { ok?: boolean };
  if (!response.ok || !body.ok) throw new Error("Unable to deliver the Telegram message.");
}

async function sendTelegramPhoto(chatId: string | number, photoUrl: string, caption: string) {
  if (!telegramBotToken) throw new Error("Telegram bot configuration is unavailable.");
  const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption }),
  });
  const body = await response.json() as { ok?: boolean };
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
  "استعادة كلمة السر: أرسل /reset_password. سيطلب منك البوت الاسم الكامل، ثم تاريخ الميلاد بصيغة YYYY-MM-DD، ثم البريد الإلكتروني.",
  "",
  "بعد التحقق سيرسل لك البوت رمزًا مؤقتًا صالحًا لمدة 10 دقائق لتعيين كلمة سر جديدة. لا يمكن للبوت عرض كلمة السر القديمة أو إرسالها.",
  "",
  "للإلغاء في أي وقت أرسل /cancel.",
].join("\n");

async function clearTelegramRecoveryConversation(chatId: string | number) {
  await supabase.from("telegram_recovery_sessions").delete().eq("chat_id", chatId);
}

async function startTelegramRecoveryConversation(chatId: string | number) {
  const { error } = await supabase.from("telegram_recovery_sessions").upsert({
    chat_id: chatId,
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
    .eq("chat_id", chatId)
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
  await supabase.from("telegram_recovery_sessions").update({
    attempts,
    state: "awaiting_name",
    full_name: null,
    birth_date: null,
    updated_at: new Date().toISOString(),
  }).eq("chat_id", session.chat_id);
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
    await supabase.from("telegram_recovery_sessions").update({
      state: "awaiting_birth_date",
      full_name: fullName,
      updated_at: new Date().toISOString(),
    }).eq("chat_id", chatId);
    await sendTelegramMessage(chatId, "2/3 اكتب تاريخ ميلادك بصيغة YYYY-MM-DD، مثال: 1995-06-14.");
    return true;
  }

  if (session.state === "awaiting_birth_date") {
    const birthDate = parseBirthDateInput(text);
    if (!birthDate) {
      await sendTelegramMessage(chatId, "تاريخ الميلاد غير صالح. اكتب تاريخًا حقيقيًا بصيغة YYYY-MM-DD، مثال: 1995-06-14. نقبل الأرقام العربية أيضًا مثل ١٩٩٥-٠٦-١٤.");
      return true;
    }
    await supabase.from("telegram_recovery_sessions").update({
      state: "awaiting_email",
      birth_date: birthDate,
      updated_at: new Date().toISOString(),
    }).eq("chat_id", chatId);
    await sendTelegramMessage(chatId, "3/3 اكتب البريد الإلكتروني المسجل في OMNI LIFE.");
    return true;
  }

  const email = normalizeEmail(text);
  if (!isValidEmail(email) || !session.full_name || !session.birth_date) {
    await recordTelegramRecoveryFailure(session);
    return true;
  }
  const profile = await findProfileByEmail(email);
  const identityMatches = Boolean(
    profile?.auth_user_id
    && profile.name
    && profile.birth_date
    && normalizeName(profile.name) === normalizeName(session.full_name)
    && profile.birth_date === session.birth_date,
  );
  if (!identityMatches || !profile?.auth_user_id) {
    await recordTelegramRecoveryFailure(session);
    return true;
  }
  const { error: linkError } = await supabase
    .from("profiles")
    .update({ telegram_chat_id: chatId, updated_at: new Date().toISOString() })
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
  const { error: consumeError } = await supabase
    .from("telegram_link_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", challenge.id)
    .is("consumed_at", null);
  if (consumeError) return false;
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ telegram_chat_id: chatId, updated_at: new Date().toISOString() })
    .eq("auth_user_id", challenge.user_id);
  return !profileError;
}

export async function handleTelegramUpdate(update: unknown) {
  const message = (update as { message?: { chat?: { id?: number }; text?: string } })?.message;
  const chatId = message?.chat?.id;
  const text = message?.text?.trim() ?? "";
  if (!chatId || !text) return;
  const startMatch = text.match(/^\/start(?:@\w+)?\s+link_([A-F0-9]{10})$/i);
  if (startMatch) {
    const linked = await consumeTelegramLinkChallenge(startMatch[1].toUpperCase(), chatId);
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
  const body = await response.json() as { ok?: boolean; result?: { url?: string; pending_update_count?: number } };
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
  const body = await response.json() as { ok?: boolean; description?: string };
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
  const body = await response.json() as { ok?: boolean; description?: string };
  if (!response.ok || !body.ok) throw new Error(body.description || "Unable to configure Telegram bot commands.");
}
