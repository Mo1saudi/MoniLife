import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NativeDateTimePicker } from "@/components/native-date-time-picker";
import type { ManualProfileSession } from "@/lib/manual-session";
import { ONBOARDING_TOUR, type OnboardingTourSlide } from "@/lib/onboarding-tour";
import { trpc } from "@/lib/trpc";

type Mode = "welcome" | "access" | "register" | "login" | "forgot" | "reset" | "linkTelegram";
type Props = { welcomeSeen: boolean; onWelcomeSeen: () => void; onAuthenticated: (profile: ManualProfileSession) => void };

const palette = { canvas: "#07111F", card: "#101F33", cyan: "#38D8FF", emerald: "#4FE1A8", ink: "#F2F7FC", muted: "#91A4B9", border: "#1C3B56", error: "#FF8F8B" };

function toBirthDateValue(value: string) {
  return value ? new Date(`${value}T12:00:00`) : null;
}

function formatBirthDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ManualAccessGate({ welcomeSeen, onWelcomeSeen, onAuthenticated }: Props) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>(welcomeSeen ? "access" : "welcome");
  const [welcomeIndex, setWelcomeIndex] = useState(0);
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [secondaryContact, setSecondaryContact] = useState("");
  const [pin, setPin] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [telegramLink, setTelegramLink] = useState<{ code: string; botUsername: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const register = trpc.manualAuth.register.useMutation();
  const login = trpc.manualAuth.login.useMutation();
  const requestReset = trpc.manualAuth.requestTelegramPasswordReset.useMutation();
  const confirmReset = trpc.manualAuth.confirmTelegramPasswordReset.useMutation();
  const beginTelegramLink = trpc.manualAuth.beginTelegramLink.useMutation();
  const busy = register.isPending || login.isPending || requestReset.isPending || confirmReset.isPending || beginTelegramLink.isPending;

  const enterAccess = () => { onWelcomeSeen(); setMode("access"); };
  const complete = (profile: ManualProfileSession) => { onWelcomeSeen(); onAuthenticated(profile); };
  const submitRegister = async () => {
    setError("");
    try {
      const profile = await register.mutateAsync({ fullName, birthDate, email, phone, secondaryContact: secondaryContact || undefined, pin, passwordConfirmation });
      complete(profile);
    } catch (err) {
      setError(err instanceof Error ? "تحقق من البيانات؛ قد يكون البريد مسجلًا مسبقًا." : "تعذر إنشاء الحساب الآن.");
    }
  };
  const submitLogin = async () => {
    setError("");
    try {
      const profile = await login.mutateAsync({ email, pin });
      complete(profile);
    } catch {
      setError("البريد الإلكتروني أو كلمة السر غير صحيحة.");
    }
  };
  const submitResetRequest = async () => {
    setError("");
    try {
      await requestReset.mutateAsync({ email });
      setMode("reset");
    } catch {
      setError("تحقق من البريد الإلكتروني وحاول مرة أخرى.");
    }
  };
  const submitResetConfirmation = async () => {
    setError("");
    try {
      const profile = await confirmReset.mutateAsync({ email, code: recoveryCode, pin, passwordConfirmation });
      complete(profile);
    } catch {
      setError("رمز الاسترداد غير صحيح أو انتهت صلاحيته.");
    }
  };
  const submitTelegramLink = async () => {
    setError("");
    try {
      const link = await beginTelegramLink.mutateAsync({ email, pin });
      setTelegramLink(link);
    } catch {
      setError("تعذر بدء ربط Telegram. تحقق من بيانات الدخول.");
    }
  };
  const openTelegramLink = async () => {
    if (!telegramLink) return;
    await Linking.openURL(`https://t.me/${telegramLink.botUsername}?start=link_${telegramLink.code}`);
  };

  return <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 28) }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Image source={require("@/assets/images/icon.png")} style={styles.logo} contentFit="contain" />
      {mode === "welcome" ? <Welcome slide={ONBOARDING_TOUR[welcomeIndex]} index={welcomeIndex} count={ONBOARDING_TOUR.length} onNext={() => welcomeIndex === ONBOARDING_TOUR.length - 1 ? enterAccess() : setWelcomeIndex((index) => index + 1)} onSkip={enterAccess} /> : null}
      {mode === "access" ? <View style={styles.accessCard}><Text style={styles.title}>جاهز لبدء يومك؟</Text><Text style={styles.copy}>أنشئ ملفك مرة واحدة ثم عد إليه بسهولة في كل مرة تفتح فيها OMNI LIFE.</Text><Primary label="إنشاء حساب جديد" icon="person-add-alt-1" onPress={() => setMode("register")} /><Secondary label="لدي حساب — تسجيل الدخول" onPress={() => setMode("login")} /><Secondary label="ربط حساب Telegram" onPress={() => setMode("linkTelegram")} /></View> : null}
      {mode === "register" ? <View style={styles.formCard}><FormHeading title="إنشاء ملفك الشخصي" onBack={() => setMode("access")} /><FormInput label="الاسم الكامل" value={fullName} onChangeText={setFullName} autoCapitalize="words" /><NativeDateTimePicker label="تاريخ الميلاد" value={toBirthDateValue(birthDate)} mode="date" maximumDate={new Date()} placeholder="اختر تاريخ الميلاد" onChange={(date) => setBirthDate(formatBirthDate(date))} /><FormInput label="البريد الإلكتروني" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" /><FormInput label="رقم الهاتف" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+20 100 000 0000" /><FormInput label="وسيلة تواصل أخرى — اختياري" value={secondaryContact} onChangeText={setSecondaryContact} placeholder="واتساب أو حساب تواصل" /><FormInput label="كلمة السر من 6 أرقام" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry={!showPassword} onTogglePassword={() => setShowPassword((value) => !value)} passwordVisible={showPassword} maxLength={6} placeholder="••••••" /><FormInput label="تأكيد كلمة السر" value={passwordConfirmation} onChangeText={setPasswordConfirmation} keyboardType="number-pad" secureTextEntry={!showPassword} onTogglePassword={() => setShowPassword((value) => !value)} passwordVisible={showPassword} maxLength={6} placeholder="••••••" />{error ? <Text style={styles.error}>{error}</Text> : null}<Primary label={busy ? "جارٍ إنشاء الحساب…" : "إنشاء الحساب"} icon="arrow-back" onPress={submitRegister} disabled={busy} /></View> : null}
      {mode === "login" ? <View style={styles.formCard}><FormHeading title="تسجيل الدخول" onBack={() => setMode("access")} /><FormInput label="البريد الإلكتروني" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" /><FormInput label="كلمة السر من 6 أرقام" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry={!showPassword} onTogglePassword={() => setShowPassword((value) => !value)} passwordVisible={showPassword} maxLength={6} placeholder="••••••" />{error ? <Text style={styles.error}>{error}</Text> : null}<Primary label={busy ? "جارٍ الدخول…" : "تسجيل الدخول"} icon="login" onPress={submitLogin} disabled={busy} /><Secondary label="نسيت كلمة السر؟" onPress={() => { setError(""); setMode("forgot"); }} /><Secondary label="ربط حساب Telegram" onPress={() => { setError(""); setMode("linkTelegram"); }} /><Secondary label="إنشاء حساب جديد" onPress={() => setMode("register")} /></View> : null}
      {mode === "forgot" ? <View style={styles.formCard}><FormHeading title="استعادة كلمة السر" onBack={() => setMode("login")} /><Text style={styles.copy}>سنرسل رمزًا لمرة واحدة إلى Telegram المرتبط بحسابك. لن تظهر أي كلمة سر سابقة.</Text><FormInput label="البريد الإلكتروني" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />{error ? <Text style={styles.error}>{error}</Text> : null}<Primary label={busy ? "جارٍ إرسال الرمز…" : "أرسل رمز الاسترداد عبر Telegram"} icon="send" onPress={submitResetRequest} disabled={busy} /><Secondary label="العودة لتسجيل الدخول" onPress={() => setMode("login")} /></View> : null}
      {mode === "reset" ? <View style={styles.formCard}><FormHeading title="تعيين كلمة سر جديدة" onBack={() => setMode("forgot")} /><Text style={styles.copy}>أدخل الرمز الذي وصلك على Telegram، ثم اختر كلمة سر جديدة من 6 أرقام.</Text><FormInput label="البريد الإلكتروني" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" /><FormInput label="رمز الاسترداد" value={recoveryCode} onChangeText={setRecoveryCode} keyboardType="number-pad" maxLength={6} placeholder="••••••" /><FormInput label="كلمة السر الجديدة" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry={!showPassword} onTogglePassword={() => setShowPassword((value) => !value)} passwordVisible={showPassword} maxLength={6} placeholder="••••••" /><FormInput label="تأكيد كلمة السر الجديدة" value={passwordConfirmation} onChangeText={setPasswordConfirmation} keyboardType="number-pad" secureTextEntry={!showPassword} onTogglePassword={() => setShowPassword((value) => !value)} passwordVisible={showPassword} maxLength={6} placeholder="••••••" />{error ? <Text style={styles.error}>{error}</Text> : null}<Primary label={busy ? "جارٍ التحديث…" : "تحديث كلمة السر"} icon="lock-reset" onPress={submitResetConfirmation} disabled={busy} /></View> : null}
      {mode === "linkTelegram" ? <View style={styles.formCard}><FormHeading title="ربط حساب Telegram" onBack={() => { setTelegramLink(null); setMode("access"); }} />{telegramLink ? <><Text style={styles.copy}>افتح Telegram لإكمال الربط. رمز الربط صالح لمدة 10 دقائق.</Text><View style={styles.codeBox}><Text style={styles.codeText}>{telegramLink.code}</Text></View><Primary label="فتح Telegram وربط الحساب" icon="telegram" onPress={openTelegramLink} /><Secondary label="إلغاء" onPress={() => { setTelegramLink(null); setMode("access"); }} /></> : <><Text style={styles.copy}>سجل دخولك مرة واحدة لربط محادثة Telegram بحسابك. بعدها يمكنك استعادة كلمة السر بأمان من خلال البوت.</Text><FormInput label="البريد الإلكتروني" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" /><FormInput label="كلمة السر من 6 أرقام" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry={!showPassword} onTogglePassword={() => setShowPassword((value) => !value)} passwordVisible={showPassword} maxLength={6} placeholder="••••••" />{error ? <Text style={styles.error}>{error}</Text> : null}<Primary label={busy ? "جارٍ إنشاء رابط الربط…" : "إنشاء رابط ربط Telegram"} icon="link" onPress={submitTelegramLink} disabled={busy} /></>}</View> : null}
    </ScrollView>
  </KeyboardAvoidingView>;
}

function Welcome({ slide, index, count, onNext, onSkip }: { slide: OnboardingTourSlide; index: number; count: number; onNext: () => void; onSkip: () => void }) { return <View style={styles.welcomeCard} accessibilityLabel={`جولة تعريفية، الخطوة ${index + 1} من ${count}`}><View style={styles.welcomeIcon}><MaterialIcons name={slide.icon as keyof typeof MaterialIcons.glyphMap} size={34} color={palette.cyan} /></View><Text style={styles.stepLabel}>{`الخطوة ${index + 1} من ${count}`}</Text><Text style={styles.title}>{slide.title}</Text><Text style={styles.copy}>{slide.text}</Text><View style={styles.highlights}>{slide.highlights.map((item) => <View key={item} style={styles.highlight}><Text style={styles.highlightText}>{item}</Text><MaterialIcons name="check-circle" size={13} color={palette.emerald} /></View>)}</View><View style={styles.dots}>{Array.from({ length: count }, (_, item) => <View key={item} style={[styles.dot, item === index && styles.dotActive]} />)}</View><Primary label={index === count - 1 ? "إنشاء حساب والبدء" : "التالي"} icon="arrow-back" onPress={onNext} /><Secondary label="تخطي الجولة" onPress={onSkip} /></View>; }
function FormHeading({ title, onBack }: { title: string; onBack: () => void }) { return <View style={styles.formHead}><Pressable onPress={onBack} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><MaterialIcons name="arrow-forward" size={20} color={palette.cyan} /></Pressable><Text style={styles.formTitle}>{title}</Text></View>; }
function FormInput({ label, hint, onTogglePassword, passwordVisible, ...props }: { label: string; hint?: string; onTogglePassword?: () => void; passwordVisible?: boolean } & React.ComponentProps<typeof TextInput>) { return <View style={styles.field}><Text style={styles.label}>{label}{hint ? <Text style={styles.hint}> · {hint}</Text> : null}</Text><View style={styles.inputWrap}><TextInput {...props} style={[styles.input, onTogglePassword && styles.passwordInput]} placeholderTextColor="#6F8399" textAlign="right" returnKeyType="next" />{onTogglePassword ? <Pressable onPress={onTogglePassword} style={({ pressed }) => [styles.visibilityButton, pressed && styles.pressed]}><MaterialIcons name={passwordVisible ? "visibility-off" : "visibility"} size={19} color={palette.cyan} /></Pressable> : null}</View></View>; }
function Primary({ label, icon, onPress, disabled = false }: { label: string; icon: keyof typeof MaterialIcons.glyphMap; onPress: () => void; disabled?: boolean }) { return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.primary, (pressed || disabled) && styles.pressed]}><Text style={styles.primaryText}>{label}</Text><MaterialIcons name={icon} size={19} color={palette.canvas} /></Pressable>; }
function Secondary({ label, onPress }: { label: string; onPress: () => void }) { return <Pressable onPress={onPress} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}><Text style={styles.secondaryText}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas }, content: { flexGrow: 1, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", gap: 18 }, logo: { width: 106, height: 106, borderRadius: 28, backgroundColor: "#FFF" }, welcomeCard: { width: "100%", padding: 22, alignItems: "center", borderRadius: 24, backgroundColor: palette.card, borderWidth: 1, borderColor: "rgba(56,216,255,0.28)" }, welcomeIcon: { width: 76, height: 76, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(56,216,255,0.12)", marginBottom: 12 }, stepLabel: { color: palette.cyan, fontSize: 11, fontWeight: "900", marginBottom: 7 }, title: { color: palette.ink, fontSize: 21, lineHeight: 29, fontWeight: "900", textAlign: "center" }, copy: { color: palette.muted, fontSize: 12, lineHeight: 20, marginTop: 9, marginBottom: 14, textAlign: "center" }, highlights: { width: "100%", gap: 7, marginBottom: 18 }, highlight: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 11, backgroundColor: "rgba(79,225,168,0.08)" }, highlightText: { color: palette.ink, fontSize: 11, fontWeight: "800", textAlign: "right" }, dots: { flexDirection: "row", gap: 6, marginBottom: 20 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#2A4159" }, dotActive: { width: 22, backgroundColor: palette.cyan }, accessCard: { width: "100%", alignItems: "center", padding: 22, borderRadius: 24, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border }, formCard: { width: "100%", padding: 18, borderRadius: 22, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, gap: 12 }, formHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 3 }, formTitle: { color: palette.ink, fontSize: 18, fontWeight: "900", flex: 1, textAlign: "right" }, back: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(56,216,255,0.10)" }, field: { gap: 6 }, label: { color: palette.ink, fontSize: 11, fontWeight: "800", textAlign: "right" }, hint: { color: palette.muted, fontWeight: "600" }, inputWrap: { position: "relative", justifyContent: "center" }, input: { minHeight: 46, borderRadius: 12, paddingHorizontal: 12, color: palette.ink, backgroundColor: "#0A1727", borderWidth: 1, borderColor: palette.border, fontSize: 12 }, passwordInput: { paddingLeft: 46 }, visibilityButton: { position: "absolute", left: 8, width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" }, primary: { width: "100%", minHeight: 48, marginTop: 4, paddingHorizontal: 15, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: palette.cyan }, primaryText: { color: palette.canvas, fontSize: 12, fontWeight: "900" }, secondary: { minHeight: 40, justifyContent: "center", alignItems: "center", marginTop: 4 }, secondaryText: { color: palette.cyan, fontSize: 11, fontWeight: "900" }, error: { color: palette.error, fontSize: 10, lineHeight: 15, textAlign: "right" }, codeBox: { minHeight: 54, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(56,216,255,0.10)", borderWidth: 1, borderColor: "rgba(56,216,255,0.30)" }, codeText: { color: palette.cyan, letterSpacing: 3, fontSize: 18, fontWeight: "900" }, pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
