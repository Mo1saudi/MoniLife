import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { NativeDateTimePicker } from "@/components/native-date-time-picker";
import { AdminAdvertisingPanel, type InAppAdvertisement } from "@/components/admin-advertising-panel";
import type { PomodoroDurations } from "@/lib/pomodoro-engine";
import { trpc } from "@/lib/trpc";
import { exportAccountData } from "@/lib/account-data-export";
import { canConfirmAppDataClear } from "@/lib/account-reset-focus-guards";
import { INFORMATION_PAGE_LABELS, type FAQItem, type InformationContent, type InformationPageKey } from "@/lib/information-content";
import { sleepModeMinutesToDate, type SleepModePreferences } from "@/lib/sleep-mode";

export type AdminTaskAction = "toggle" | "delete";
export type AdminHabitAction = "toggle" | "delete";
export type AdminBulkAction = "complete_all_tasks" | "reopen_all_tasks" | "complete_all_habits" | "reset_all_habits";

type AdminTask = { id: string; title: string; done: boolean };
type AdminHabit = { id: string; title: string; complete: boolean };
type AuditEntry = { id: number; action: string; targetType: string; targetId: string | null; details: string | null; createdAt: Date | string };
type CampaignCategory = "announcement" | "promotion" | "usage_tip" | "rating_reminder" | "habit_tip" | "task_tip";
type CampaignAudience = "all_opted_in" | "manual_users" | "oauth_users";
type CampaignDelivery = "send_now" | "schedule";
type Campaign = { id: number; title: string; body: string; destinationUrl: string | null; category: CampaignCategory; audience: CampaignAudience; status: string; scheduledAt: Date | string | null; sentAt: Date | string | null; createdAt: Date | string };

type SettingsViewProps = {
  isArabic: boolean;
  hapticsEnabled: boolean;
  homeGuidanceEnabled: boolean;
  dailyBriefingEnabled: boolean;
  eveningClosureEnabled: boolean;
  eveningClosureAt: Date;
  customNotificationSounds: boolean;
  sleepMode: SleepModePreferences;
  pomodoroDurations: PomodoroDurations;
  focusDndEnabled: boolean;
  backgroundReliability: { available: boolean; exactAlarmAllowed: boolean; batteryOptimizationIgnored: boolean };
  t: (ar: string, en: string) => string;
  onToggleLanguage: () => void;
  onToggleHaptics: (value: boolean) => void;
  onToggleHomeGuidance: (value: boolean) => void;
  onRestartHomeGuidance: () => void;
  onToggleDailyBriefing: (value: boolean) => void;
  onToggleEveningClosure: (value: boolean) => void;
  onChangeEveningClosureAt: (value: Date) => void;
  onOpenEveningClosure: () => void;
  onToggleCustomNotificationSounds: (value: boolean) => void;
  onToggleSleepMode: (value: boolean) => void;
  onChangeSleepModeStart: (minutes: number) => void;
  onChangeSleepModeEnd: (minutes: number) => void;
  onPreviewNotificationSound: (section: "tasks" | "habits" | "finance" | "persona" | "evening" | "admin") => void;
  onChangePomodoroDurations: (next: PomodoroDurations) => void;
  onToggleFocusDnd: (enabled: boolean) => void;
  onRequestFocusDndAccess: () => void;
  onRefreshBackgroundReliability: () => void;
  onOpenExactAlarmSettings: () => void;
  onOpenBatteryOptimizationSettings: () => void;
  onOpenNotifications: () => void;
  onOpenAdminDashboard: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  adminEmail: string | null;
  onSignIn: () => void;
  adminSummary: { activeTasks: number; habits: number; unreadAlerts: number };
  onLogout: () => void;
  canResetAccount: boolean;
  resetAccountBusy: boolean;
  onResetAccount: (pin: string) => void;
  adminBusy: boolean;
  adminTasks: AdminTask[];
  adminHabits: AdminHabit[];
  auditEntries: AuditEntry[];
  onAdminTaskAction: (id: string, action: AdminTaskAction) => void;
  onAdminHabitAction: (id: string, action: AdminHabitAction) => void;
  onAdminBulkAction: (action: AdminBulkAction) => void;
  campaigns: Campaign[];
  campaignBusy: boolean;
  onCreateCampaign: (input: { title: string; body: string; destinationUrl?: string; category: CampaignCategory; audience: CampaignAudience; delivery: CampaignDelivery; scheduledAt?: Date }) => void;
  inAppAds: InAppAdvertisement[];
  inAppAdsBusy: boolean;
  onCreateInAppAd: (input: { title: string; body: string; ctaLabel: string; placement: InAppAdvertisement["placement"]; destinationUrl?: string }) => void;
  onSetInAppAdActive: (id: number, active: boolean) => void;
  informationContent: InformationContent;
  onOpenInformationPage: (page: InformationPageKey) => void;
  onSaveInformationContent: (content: InformationContent) => void;
};

const colors = { canvas: "#07111F", card: "#101F33", cyan: "#38D8FF", emerald: "#4FE1A8", warning: "#FFC36B", ink: "#F2F7FC", muted: "#91A4B9", border: "#1C3B56" };

export function SettingsView({ isArabic, hapticsEnabled, homeGuidanceEnabled, dailyBriefingEnabled, eveningClosureEnabled, eveningClosureAt, customNotificationSounds, sleepMode, pomodoroDurations, focusDndEnabled, backgroundReliability, t, onToggleLanguage, onToggleHaptics, onToggleHomeGuidance, onRestartHomeGuidance, onToggleDailyBriefing, onToggleEveningClosure, onChangeEveningClosureAt, onOpenEveningClosure, onToggleCustomNotificationSounds, onToggleSleepMode, onChangeSleepModeStart, onChangeSleepModeEnd, onPreviewNotificationSound, onChangePomodoroDurations, onToggleFocusDnd, onRequestFocusDndAccess, onRefreshBackgroundReliability, onOpenExactAlarmSettings, onOpenBatteryOptimizationSettings, onOpenNotifications, onOpenAdminDashboard, isAuthenticated, isAdmin, adminEmail, onSignIn, adminSummary, onLogout, canResetAccount, resetAccountBusy, onResetAccount, adminBusy, adminTasks, adminHabits, auditEntries, onAdminTaskAction, onAdminHabitAction, onAdminBulkAction, campaigns, campaignBusy, onCreateCampaign, inAppAds, inAppAdsBusy, onCreateInAppAd, onSetInAppAdActive, informationContent, onOpenInformationPage, onSaveInformationContent }: SettingsViewProps) {
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPin, setResetPin] = useState("");
  const [resetPhrase, setResetPhrase] = useState("");
  const [editingInformation, setEditingInformation] = useState<InformationContent>(informationContent);
  useEffect(() => setEditingInformation(informationContent), [informationContent]);
  const resetConfirmed = canConfirmAppDataClear(resetPin, resetPhrase);
  const updateFaq = (id: string, patch: Partial<FAQItem>) => setEditingInformation((current) => ({ ...current, faq: current.faq.map((item) => item.id === id ? { ...item, ...patch } : item) }));
  const accountExportMutation = trpc.manualAuth.exportData.useMutation();
  const exportAccountBusy = accountExportMutation.isPending;
  const handleExportAccountData = async () => {
    if (!adminEmail || resetPin.length !== 6) return;
    try {
      const data = await accountExportMutation.mutateAsync({ email: adminEmail, pin: resetPin });
      await exportAccountData({ exportedAt: new Date().toISOString(), app: "OMNI LIFE", data });
    } catch {
      // The reset panel remains open so the user can correct the password without any deletion action.
    }
  };
  const submitReset = () => {
    if (!resetConfirmed) return;
    onResetAccount(resetPin);
    setResetPin("");
    setResetPhrase("");
    setResetOpen(false);
  };
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.hero}><View style={styles.heroIcon}><MaterialIcons name="settings" size={23} color={colors.cyan} /></View><View style={{ flex: 1 }}><Text style={styles.title}>{t("إعدادات OMNI LIFE", "OMNI LIFE settings")}</Text><Text style={styles.subtitle}>{t("خصص الإيقاع والتنبيهات وتجربة OMNI LIFE.", "Personalize your rhythm, alerts, and OMNI LIFE experience.")}</Text></View></View>

    <SectionTitle label={t("التجربة", "Experience")} />
    <SettingsRow icon="language" title={t("لغة التطبيق", "App language")} description={isArabic ? "العربية" : "English"} action={<Pressable onPress={onToggleLanguage} style={({ pressed }) => [styles.languageButton, pressed && styles.pressed]}><Text style={styles.languageText}>{isArabic ? "EN" : "ع"}</Text></Pressable>} />
    <SettingsRow icon="vibration" title={t("الاستجابة اللمسية", "Haptic feedback")} description={t("تأكيد خفيف عند إنجاز المهام والعادات.", "Light confirmation for task and habit completion.")} action={<Switch value={hapticsEnabled} onValueChange={onToggleHaptics} trackColor={{ false: colors.border, true: "#1F6B80" }} thumbColor={hapticsEnabled ? colors.cyan : colors.muted} />} />
    <SettingsRow icon="help-outline" title={t("التلميحات التفاعلية", "Interactive tips")} description={t("إرشاد قصير في الرئيسية خلال أول أسبوع؛ يمكنك إيقافه أو تشغيله متى شئت.", "Short Home guidance during the first week; turn it on or off anytime.")} action={<Switch value={homeGuidanceEnabled} onValueChange={onToggleHomeGuidance} trackColor={{ false: colors.border, true: "#1F6B80" }} thumbColor={homeGuidanceEnabled ? colors.cyan : colors.muted} />} />
    <Pressable onPress={onRestartHomeGuidance} style={({ pressed }) => [styles.openClosure, pressed && styles.pressed]}><MaterialIcons name="restart-alt" size={17} color="#07111F" /><Text style={styles.openClosureText}>{t("إعادة تشغيل تلميحات الأسبوع الأول", "Restart first-week tips")}</Text></Pressable>

    <SectionTitle label={t("التركيز والبومودورو", "Focus & Pomodoro")} />
    <PomodoroRhythmCard durations={pomodoroDurations} onChange={onChangePomodoroDurations} t={t} />
    <View style={styles.dndCard}><View style={styles.closureHead}><View style={[styles.rowIcon, { backgroundColor: "rgba(181,156,255,0.13)" }]}><MaterialIcons name="do-not-disturb-on" size={19} color="#B59CFF" /></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>{t("عدم الإزعاج أثناء التركيز", "Do Not Disturb during focus")}</Text><Text style={styles.rowDescription}>{t("اختياري: يفعّل وضع الأولوية أثناء جلسة التركيز ويستعيد إعدادك السابق عند الاستراحة.", "Optional: enables priority mode during focus and restores your prior setting for breaks.")}</Text></View><Switch value={focusDndEnabled} onValueChange={onToggleFocusDnd} trackColor={{ false: colors.border, true: "#5A4F91" }} thumbColor={focusDndEnabled ? "#B59CFF" : colors.muted} /></View>{focusDndEnabled ? <Pressable onPress={onRequestFocusDndAccess} style={({ pressed }) => [styles.dndAccess, pressed && styles.pressed]}><MaterialIcons name="settings" size={16} color={colors.canvas} /><Text style={styles.dndAccessText}>{t("منح إذن عدم الإزعاج في Android", "Grant Android Do Not Disturb access")}</Text></Pressable> : null}{focusDndEnabled ? <Text style={styles.dndNote}>{t("يتطلب نسخة Android مخصصة وموافقتك من إعدادات النظام. لا يتوفر في الويب أو iOS.", "Requires a custom Android build and your approval in system settings. Not available on web or iOS.")}</Text> : null}</View>

    <SectionTitle label={t("التنبيهات", "Notifications")} />
    <SettingsRow icon="notifications-active" title={t("ملخص اليوم", "Daily briefing")} description={t("ملخص أولوياتك في بداية اليوم.", "A summary of your priorities at the start of the day.")} action={<Switch value={dailyBriefingEnabled} onValueChange={onToggleDailyBriefing} trackColor={{ false: colors.border, true: "#1F6B80" }} thumbColor={dailyBriefingEnabled ? colors.cyan : colors.muted} />} />
    <View style={styles.closureCard}><View style={styles.closureHead}><View style={[styles.rowIcon, { backgroundColor: "rgba(181,156,255,0.12)" }]}><MaterialIcons name="nights-stay" size={19} color="#B59CFF" /></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>{t("تفريغ الذهن وإغلاق اليوم", "Evening brain dump")}</Text><Text style={styles.rowDescription}>{t("ذكّرني بتفريغ 3 أفكار وتحويلها لمهام الغد دون ضغط.", "A gentle prompt to empty three thoughts into tomorrow’s tasks.")}</Text></View><Switch value={eveningClosureEnabled} onValueChange={onToggleEveningClosure} trackColor={{ false: colors.border, true: "#5A4F91" }} thumbColor={eveningClosureEnabled ? "#B59CFF" : colors.muted} /></View>{eveningClosureEnabled ? <><NativeDateTimePicker label={t("موعد الجلسة", "Ritual time")} value={eveningClosureAt} mode="time" onChange={onChangeEveningClosureAt} isArabic={isArabic} /><Pressable onPress={onOpenEveningClosure} style={({ pressed }) => [styles.openClosure, pressed && styles.pressed]}><MaterialIcons name="edit-note" size={17} color="#07111F" /><Text style={styles.openClosureText}>{t("فتح جلسة تفريغ الذهن الآن", "Open the ritual now")}</Text></Pressable></> : null}</View>
    <SettingsRow icon="music-note" title={t("أصوات تنبيهات OMNI LIFE", "OMNI LIFE notification sounds")} description={t("استخدم نغمات الأقسام المميزة بدل الصوت الافتراضي للهاتف.", "Use distinctive section sounds instead of the phone default.")} action={<Switch value={customNotificationSounds} onValueChange={onToggleCustomNotificationSounds} trackColor={{ false: colors.border, true: "#1F6B80" }} thumbColor={customNotificationSounds ? colors.cyan : colors.muted} />} />
    <View style={styles.closureCard}><View style={styles.closureHead}><View style={[styles.rowIcon, { backgroundColor: "rgba(181,156,255,0.13)" }]}><MaterialIcons name="bedtime" size={19} color="#B59CFF" /></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>{t("وضع النوم · هادئ جدًا", "Sleep Mode · Very quiet")}</Text><Text style={styles.rowDescription}>{t("يستخدم مؤثرات هادئة جدًا تلقائيًا داخل الساعات التي تختارها. لا يغيّر صوت المطر في Pomodoro.", "Automatically uses very quiet alert effects in your chosen hours. It does not change Pomodoro rain.")}</Text></View><Switch value={sleepMode.enabled} onValueChange={onToggleSleepMode} trackColor={{ false: colors.border, true: "#5A4F91" }} thumbColor={sleepMode.enabled ? "#B59CFF" : colors.muted} /></View>{sleepMode.enabled ? <><NativeDateTimePicker label={t("يبدأ الهدوء", "Quiet hours start")} value={sleepModeMinutesToDate(sleepMode.startsAtMinutes)} mode="time" onChange={(value) => onChangeSleepModeStart(value.getHours() * 60 + value.getMinutes())} isArabic={isArabic} /><NativeDateTimePicker label={t("ينتهي الهدوء", "Quiet hours end")} value={sleepModeMinutesToDate(sleepMode.endsAtMinutes)} mode="time" onChange={(value) => onChangeSleepModeEnd(value.getHours() * 60 + value.getMinutes())} isArabic={isArabic} /><Text style={styles.dndNote}>{t("يبدأ افتراضيًا من 11:00 م حتى 7:00 ص. سيطبق على معاينات الصوت والتنبيهات المحلية الجديدة.", "Defaults to 11 PM–7 AM. Applies to sound previews and newly scheduled local alerts.")}</Text></> : null}</View>
    {customNotificationSounds ? <View style={styles.soundCard}>{([ ["tasks", "timer", t("المهام والتركيز", "Tasks & focus")], ["habits", "local-fire-department", t("العادات", "Habits")], ["finance", "payments", t("المالية", "Finance")], ["persona", "self-improvement", t("المرشد", "Advisor")], ["evening", "nights-stay", t("إغلاق اليوم", "Evening closure")], ["admin", "verified", t("الإدارة", "Administration")] ] as const).map(([section, icon, label]) => <View key={section} style={styles.soundRow}><MaterialIcons name={icon} size={16} color={colors.cyan} /><Text style={styles.soundLabel}>{label}</Text><Pressable onPress={() => onPreviewNotificationSound(section)} style={({ pressed }) => [styles.previewButton, pressed && styles.pressed]}><MaterialIcons name="play-arrow" size={17} color={colors.canvas} /><Text style={styles.previewText}>{t("استماع", "Preview")}</Text></Pressable></View>)}</View> : null}
    <SettingsRow icon="tune" title={t("إدارة التنبيهات", "Manage alerts")} description={t("إذن الإشعارات والتجارب الفورية والمجدولة.", "Permissions plus instant and scheduled notification tests.")} action={<Pressable onPress={onOpenNotifications} style={({ pressed }) => [styles.openButton, pressed && styles.pressed]}><MaterialIcons name="arrow-back" size={17} color={colors.cyan} /></Pressable>} />
    <View style={styles.backgroundCard}><View style={styles.closureHead}><View style={[styles.rowIcon, { backgroundColor: "rgba(79,225,168,0.12)" }]}><MaterialIcons name="battery-charging-full" size={19} color={colors.emerald} /></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>{t("موثوقية التنبيهات في الخلفية", "Background reminder reliability")}</Text><Text style={styles.rowDescription}>{backgroundReliability.available ? t("تُستعاد التنبيهات الفردية المحفوظة بعد إعادة تشغيل الهاتف. لا يلتف التطبيق حول حماية البطارية.", "Saved one-off reminders restore after a reboot. The app does not bypass battery protections.") : t("تتوفر هذه الضوابط في نسخة Android مخصصة فقط.", "These controls are available only in a custom Android build.")}</Text></View><Pressable onPress={onRefreshBackgroundReliability} style={({ pressed }) => [styles.refreshReliability, pressed && styles.pressed]}><MaterialIcons name="refresh" size={16} color={colors.emerald} /></Pressable></View>{backgroundReliability.available ? <><View style={styles.reliabilityStatus}><Text style={styles.reliabilityText}>{backgroundReliability.exactAlarmAllowed ? t("المواعيد الدقيقة: مفعلة", "Exact alarms: enabled") : t("المواعيد الدقيقة: تحتاج موافقة", "Exact alarms: approval needed")}</Text><Text style={styles.reliabilityText}>{backgroundReliability.batteryOptimizationIgnored ? t("تحسين البطارية: مستثنى باختيارك", "Battery optimization: user-exempt") : t("تحسين البطارية: مضبوط افتراضيًا", "Battery optimization: default")}</Text></View>{!backgroundReliability.exactAlarmAllowed ? <Pressable onPress={onOpenExactAlarmSettings} style={({ pressed }) => [styles.reliabilityAction, pressed && styles.pressed]}><MaterialIcons name="alarm" size={16} color={colors.canvas} /><Text style={styles.reliabilityActionText}>{t("فتح إذن المنبهات والتذكيرات", "Open Alarms & reminders access")}</Text></Pressable> : null}<Pressable onPress={onOpenBatteryOptimizationSettings} style={({ pressed }) => [styles.reliabilitySecondary, pressed && styles.pressed]}><MaterialIcons name="battery-alert" size={16} color={colors.warning} /><Text style={styles.reliabilitySecondaryText}>{t("مراجعة إعدادات تحسين البطارية", "Review battery optimization settings")}</Text></Pressable></> : null}</View>

    <SectionTitle label={t("تحكم التطبيق", "App control")} />
    {isAdmin ? <View style={styles.adminCard}>
      <View style={styles.adminHead}><View style={styles.adminIcon}><MaterialIcons name="admin-panel-settings" size={20} color={colors.emerald} /></View><View style={{ flex: 1 }}><Text style={styles.adminTitle}>{t("مركز تحكم OMNI LIFE", "OMNI LIFE control center")}</Text><Text style={styles.adminNote}>{t("إدارة المحتوى، الإعلانات، الإشعارات، الاشتراكات، والدعم من لوحة مستقلة للتطبيق.", "Manage content, ads, notifications, subscriptions, and support from an app-wide control dashboard.")}</Text></View><View style={styles.grantedBadge}><Text style={styles.grantedText}>{t("نشط", "Active")}</Text></View></View>
      <Pressable onPress={onOpenAdminDashboard} style={({ pressed }) => [styles.openAdminDashboard, pressed && styles.pressed]}><MaterialIcons name="dashboard" size={18} color="#062C3A" /><Text style={styles.openAdminDashboardText}>{t("فتح مركز تحكم التطبيق", "Open app control center")}</Text></Pressable>
    </View> : <View style={styles.lockedCard}><View style={styles.lockedIcon}><MaterialIcons name="lock-outline" size={20} color={colors.warning} /></View><View style={{ flex: 1 }}><Text style={styles.lockedTitle}>{t("مركز التحكم مقيد", "Control center is restricted")}</Text><Text style={styles.lockedText}>{isAuthenticated ? t("الحساب الحالي غير مخول للتحكم في التطبيق.", "The current account is not authorized to control the app.") : t("سجّل الدخول بالحساب المخول للوصول إلى مركز التحكم.", "Sign in with the authorized account to access the control center.")}</Text></View>{!isAuthenticated ? <Pressable onPress={onSignIn} style={({ pressed }) => [styles.signInButton, pressed && styles.pressed]}><Text style={styles.signInText}>{t("دخول", "Sign in")}</Text></Pressable> : null}</View>}

    <SectionTitle label={t("معلومات ومساعدة", "Information & help")} />
    <View style={styles.infoLinks}>{(Object.keys(INFORMATION_PAGE_LABELS) as InformationPageKey[]).map((key) => <Pressable key={key} onPress={() => onOpenInformationPage(key)} style={({ pressed }) => [styles.infoLink, pressed && styles.pressed]}><View style={styles.infoLinkIcon}><MaterialIcons name={key === "privacy" ? "privacy-tip" : key === "about" ? "favorite" : "menu-book"} size={17} color={colors.cyan} /></View><Text style={styles.infoLinkText}>{isArabic ? INFORMATION_PAGE_LABELS[key].ar : INFORMATION_PAGE_LABELS[key].en}</Text><MaterialIcons name="chevron-left" size={18} color={colors.muted} /></Pressable>)}</View>
    {isAdmin ? <View style={styles.infoEditor}><View style={styles.infoEditorHead}><MaterialIcons name="edit-document" size={19} color={colors.emerald} /><View style={{ flex: 1 }}><Text style={styles.infoEditorTitle}>{t("تعديل محتوى الصفحات والأسئلة", "Edit pages and FAQ")}</Text><Text style={styles.infoEditorHint}>{t("يظهر المحتوى المحدث لجميع المستخدمين على هذا الجهاز.", "Updated content appears to users on this device.")}</Text></View></View>{(["privacy", "about", "howTo"] as const).map((key) => <View key={key} style={styles.infoField}><Text style={styles.infoFieldLabel}>{isArabic ? INFORMATION_PAGE_LABELS[key].ar : INFORMATION_PAGE_LABELS[key].en}</Text><TextInput multiline value={editingInformation[key]} onChangeText={(value) => setEditingInformation((current) => ({ ...current, [key]: value }))} placeholder={t("اكتب المحتوى هنا…", "Write content here…")} placeholderTextColor={colors.muted} style={styles.infoInput} textAlign={isArabic ? "right" : "left"} /></View>)}<View style={styles.faqEditor}><Text style={styles.infoEditorTitle}>{t("تحرير الأسئلة الشائعة", "Edit frequently asked questions")}</Text>{editingInformation.faq.map((item, index) => <View key={item.id} style={styles.faqEditorItem}><Text style={styles.infoFieldLabel}>{t(`السؤال ${index + 1} بالعربية`, `Question ${index + 1} in Arabic`)}</Text><TextInput value={item.questionAr} onChangeText={(value) => updateFaq(item.id, { questionAr: value })} style={styles.infoInput} textAlign={isArabic ? "right" : "left"} placeholderTextColor={colors.muted} /><Text style={styles.infoFieldLabel}>{t("الإجابة بالعربية", "Answer in Arabic")}</Text><TextInput multiline value={item.answerAr} onChangeText={(value) => updateFaq(item.id, { answerAr: value })} style={styles.infoInput} textAlign={isArabic ? "right" : "left"} placeholderTextColor={colors.muted} /><Text style={styles.infoFieldLabel}>{t(`السؤال ${index + 1} بالإنجليزية`, `Question ${index + 1} in English`)}</Text><TextInput value={item.questionEn} onChangeText={(value) => updateFaq(item.id, { questionEn: value })} style={styles.infoInput} textAlign="left" placeholderTextColor={colors.muted} /><Text style={styles.infoFieldLabel}>{t("الإجابة بالإنجليزية", "Answer in English")}</Text><TextInput multiline value={item.answerEn} onChangeText={(value) => updateFaq(item.id, { answerEn: value })} style={styles.infoInput} textAlign="left" placeholderTextColor={colors.muted} /></View>)}</View><Pressable onPress={() => { onSaveInformationContent(editingInformation); }} style={({ pressed }) => [styles.saveInfoButton, pressed && styles.pressed]}><MaterialIcons name="save" size={17} color={colors.canvas} /><Text style={styles.saveInfoText}>{t("حفظ محتوى الصفحات والأسئلة", "Save pages and FAQ")}</Text></Pressable></View> : null}
    <SectionTitle label={t("حول التطبيق", "About")} />
    <View style={styles.aboutCard}><Text style={styles.aboutBrand}>OMNI LIFE</Text><Text style={styles.aboutText}>{t("منصة يومية هادئة للمهام والعادات والطاقة.", "A calm daily operating system for tasks, habits, and energy.")}</Text><Text style={styles.version}>v1.0.1</Text></View>
    {canResetAccount ? <View style={accountResetStyles.card}><View style={accountResetStyles.head}><MaterialIcons name="restart-alt" size={20} color="#FF7A76" /><View style={{ flex: 1 }}><Text style={accountResetStyles.title}>{t("مسح بيانات التطبيق", "Clear app data")}</Text><Text style={accountResetStyles.copy}>{t("امسح جميع بيانات التطبيق المحلية، مثل المهام والعادات والماليات، مع الإبقاء على حسابك مسجّلًا.", "Clear local app data such as tasks, habits, and Finance while keeping your account signed in.")}</Text></View></View>{resetOpen ? <View style={accountResetStyles.form}><TextInput value={resetPin} onChangeText={setResetPin} placeholder={t("كلمة السر المكوّنة من 6 أرقام", "6-digit password")} placeholderTextColor={colors.muted} secureTextEntry keyboardType="number-pad" maxLength={6} style={accountResetStyles.input} textAlign={isArabic ? "right" : "left"} /><TextInput value={resetPhrase} onChangeText={setResetPhrase} placeholder={t("اكتب CLEAR للتأكيد", "Type CLEAR to confirm")} placeholderTextColor={colors.muted} autoCapitalize="characters" maxLength={6} style={accountResetStyles.input} textAlign="left" /><Pressable disabled={exportAccountBusy || resetPin.length !== 6} onPress={() => { void handleExportAccountData(); }} style={({ pressed }) => [accountResetStyles.export, (pressed || exportAccountBusy || resetPin.length !== 6) && accountResetStyles.disabled]}><MaterialIcons name="file-download" size={16} color={colors.canvas} /><Text style={accountResetStyles.exportText}>{exportAccountBusy ? t("جارٍ التصدير…", "Exporting…") : t("تصدير بياناتي أولًا", "Export my data first")}</Text></Pressable><View style={accountResetStyles.actions}><Pressable disabled={resetAccountBusy} onPress={() => { setResetOpen(false); setResetPin(""); setResetPhrase(""); }} style={({ pressed }) => [accountResetStyles.cancel, pressed && styles.pressed]}><Text style={accountResetStyles.cancelText}>{t("إلغاء", "Cancel")}</Text></Pressable><Pressable disabled={resetAccountBusy || !resetConfirmed} onPress={submitReset} style={({ pressed }) => [accountResetStyles.confirm, (pressed || resetAccountBusy || !resetConfirmed) && accountResetStyles.disabled]}><Text style={accountResetStyles.confirmText}>{resetAccountBusy ? t("جارٍ المسح…", "Clearing…") : t("مسح البيانات", "Clear data")}</Text></Pressable></View></View> : <Pressable onPress={() => setResetOpen(true)} style={({ pressed }) => [accountResetStyles.open, pressed && styles.pressed]}><MaterialIcons name="warning-amber" size={17} color="#FF7A76" /><Text style={accountResetStyles.openText}>{t("فتح مسح بيانات التطبيق", "Open app data clearing")}</Text></Pressable>}</View> : null}
    {isAuthenticated ? <Pressable onPress={onLogout} style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}><MaterialIcons name="logout" size={19} color="#FFF4F4" /><Text style={styles.logoutText}>{t("تسجيل الخروج", "Sign out")}</Text></Pressable> : null}
  </ScrollView>;
}

function SectionTitle({ label }: { label: string }) { return <Text style={styles.sectionTitle}>{label}</Text>; }

function SettingsRow({ icon, title, description, action }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; description: string; action: React.ReactNode }) {
  return <View style={styles.row}><View style={styles.rowIcon}><MaterialIcons name={icon} size={19} color={colors.cyan} /></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowDescription}>{description}</Text></View>{action}</View>;
}

const accountResetStyles = StyleSheet.create({
  card: { gap: 10, padding: 13, borderRadius: 16, backgroundColor: "rgba(255,122,118,0.08)", borderWidth: 1, borderColor: "rgba(255,122,118,0.34)" }, head: { flexDirection: "row", alignItems: "flex-start", gap: 9 }, title: { color: "#FFB0AD", fontSize: 12, fontWeight: "900", textAlign: "right" }, copy: { color: colors.muted, fontSize: 9, lineHeight: 14, marginTop: 3, textAlign: "right" }, open: { minHeight: 38, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: "rgba(255,122,118,0.38)", backgroundColor: "rgba(255,122,118,0.07)" }, openText: { color: "#FFB0AD", fontSize: 10, fontWeight: "900" }, form: { gap: 8 }, input: { minHeight: 42, borderRadius: 10, paddingHorizontal: 10, color: colors.ink, fontSize: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.canvas }, export: { minHeight: 36, borderRadius: 9, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.cyan }, exportText: { color: colors.canvas, fontSize: 10, fontWeight: "900" }, actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 }, cancel: { minHeight: 34, paddingHorizontal: 11, borderRadius: 9, justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)" }, cancelText: { color: colors.muted, fontSize: 9, fontWeight: "900" }, confirm: { minHeight: 34, paddingHorizontal: 11, borderRadius: 9, justifyContent: "center", backgroundColor: "#D95856" }, confirmText: { color: "#FFF4F4", fontSize: 9, fontWeight: "900" }, disabled: { opacity: 0.45 },
});

function DurationStepper({ label, value, minimum, maximum, onChange, t }: { label: string; value: number; minimum: number; maximum: number; onChange: (next: number) => void; t: (ar: string, en: string) => string }) {
  return <View style={styles.durationRow}><Text style={styles.durationLabel}>{label}</Text><View style={styles.durationControls}><Pressable onPress={() => onChange(Math.max(minimum, value - 1))} style={({ pressed }) => [styles.durationButton, pressed && styles.pressed]}><MaterialIcons name="remove" size={16} color={colors.ink} /></Pressable><Text style={styles.durationValue}>{value} {t("د", "min")}</Text><Pressable onPress={() => onChange(Math.min(maximum, value + 1))} style={({ pressed }) => [styles.durationButton, pressed && styles.pressed]}><MaterialIcons name="add" size={16} color={colors.ink} /></Pressable></View></View>;
}

function PomodoroRhythmCard({ durations, onChange, t }: { durations: PomodoroDurations; onChange: (next: PomodoroDurations) => void; t: (ar: string, en: string) => string }) {
  const presets: Array<{ id: string; label: string; detail: string; value: PomodoroDurations }> = [
    { id: "gentle", label: t("هادئ", "Gentle"), detail: "15 · 5 · 10", value: { focusMinutes: 15, shortBreakMinutes: 5, longBreakMinutes: 10 } },
    { id: "balanced", label: t("متوازن", "Balanced"), detail: "25 · 5 · 15", value: { focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15 } },
    { id: "deep", label: t("عميق", "Deep"), detail: "50 · 10 · 25", value: { focusMinutes: 50, shortBreakMinutes: 10, longBreakMinutes: 25 } },
  ];
  const totalFocus = durations.focusMinutes * 4;
  const totalBreak = durations.shortBreakMinutes * 3 + durations.longBreakMinutes;
  const matches = (value: PomodoroDurations) => value.focusMinutes === durations.focusMinutes && value.shortBreakMinutes === durations.shortBreakMinutes && value.longBreakMinutes === durations.longBreakMinutes;
  return <View style={styles.rhythmCard}>
    <View style={styles.rhythmHead}><View style={styles.rhythmIcon}><MaterialIcons name="timer" size={20} color="#FF9D9A" /></View><View style={{ flex: 1 }}><Text style={styles.rhythmTitle}>{t("إيقاع جلسات التركيز", "Focus rhythm")}</Text><Text style={styles.rhythmHint}>{t("اختر نمطًا جاهزًا أو عدّل المدد حسب طاقتك.", "Choose a ready rhythm or tailor it to your energy.")}</Text></View></View>
    <View style={styles.rhythmSummary}><View style={styles.rhythmMetric}><Text style={styles.rhythmMetricValue}>{totalFocus} {t("د", "m")}</Text><Text style={styles.rhythmMetricLabel}>{t("تركيز في 4 جلسات", "Focus across 4 sessions")}</Text></View><View style={styles.rhythmDivider} /><View style={styles.rhythmMetric}><Text style={[styles.rhythmMetricValue, { color: colors.emerald }]}>{totalBreak} {t("د", "m")}</Text><Text style={styles.rhythmMetricLabel}>{t("استراحات الدورة", "Breaks per cycle")}</Text></View></View>
    <Text style={styles.rhythmSectionLabel}>{t("أنماط سريعة", "Quick rhythms")}</Text><View style={styles.presetRow}>{presets.map((preset) => <Pressable key={preset.id} onPress={() => onChange(preset.value)} style={({ pressed }) => [styles.presetButton, matches(preset.value) && styles.presetButtonActive, pressed && styles.pressed]}><Text style={[styles.presetLabel, matches(preset.value) && styles.presetLabelActive]}>{preset.label}</Text><Text style={[styles.presetDetail, matches(preset.value) && styles.presetDetailActive]}>{preset.detail}</Text></Pressable>)}</View>
    <Text style={styles.rhythmSectionLabel}>{t("تخصيص دقيق", "Fine tune")}</Text>
    <RhythmDurationRow icon="bolt" tone="#FF9D9A" label={t("جلسة التركيز", "Focus session")} value={durations.focusMinutes} minimum={5} maximum={90} step={5} onChange={(focusMinutes) => onChange({ ...durations, focusMinutes })} t={t} />
    <RhythmDurationRow icon="coffee" tone={colors.cyan} label={t("استراحة قصيرة", "Short break")} value={durations.shortBreakMinutes} minimum={1} maximum={30} step={1} onChange={(shortBreakMinutes) => onChange({ ...durations, shortBreakMinutes })} t={t} />
    <RhythmDurationRow icon="nightlight-round" tone={colors.emerald} label={t("استراحة طويلة", "Long break")} value={durations.longBreakMinutes} minimum={5} maximum={60} step={5} onChange={(longBreakMinutes) => onChange({ ...durations, longBreakMinutes })} t={t} />
  </View>;
}

function RhythmDurationRow({ icon, tone, label, value, minimum, maximum, step, onChange, t }: { icon: keyof typeof MaterialIcons.glyphMap; tone: string; label: string; value: number; minimum: number; maximum: number; step: number; onChange: (next: number) => void; t: (ar: string, en: string) => string }) {
  return <View style={styles.rhythmDurationRow}><View style={[styles.rhythmDurationIcon, { backgroundColor: `${tone}19` }]}><MaterialIcons name={icon} size={16} color={tone} /></View><Text style={styles.rhythmDurationLabel}>{label}</Text><View style={styles.rhythmControls}><Pressable disabled={value <= minimum} onPress={() => onChange(Math.max(minimum, value - step))} style={({ pressed }) => [styles.rhythmControl, value <= minimum && styles.disabledControl, pressed && styles.pressed]}><MaterialIcons name="remove" size={17} color={colors.ink} /></Pressable><Text style={styles.rhythmDurationValue}>{value} {t("د", "min")}</Text><Pressable disabled={value >= maximum} onPress={() => onChange(Math.min(maximum, value + step))} style={({ pressed }) => [styles.rhythmControl, value >= maximum && styles.disabledControl, pressed && styles.pressed]}><MaterialIcons name="add" size={17} color={colors.ink} /></Pressable></View></View>;
}

function AdminMetric({ label, value }: { label: string; value: number }) { return <View style={styles.adminMetric}><Text style={styles.adminValue}>{value}</Text><Text style={styles.adminLabel}>{label}</Text></View>; }

function AdminAction({ label, icon, disabled, onPress }: { label: string; icon: keyof typeof MaterialIcons.glyphMap; disabled: boolean; onPress: () => void }) { return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.adminAction, (pressed || disabled) && styles.pressed]}><MaterialIcons name={icon} size={17} color={colors.cyan} /><Text style={styles.adminActionText}>{label}</Text></Pressable>; }

function AdminItem({ title, status, primaryLabel, primaryIcon, onPrimary, onDelete, disabled }: { title: string; status: string; primaryLabel: string; primaryIcon: keyof typeof MaterialIcons.glyphMap; onPrimary: () => void; onDelete: () => void; disabled: boolean }) { return <View style={styles.itemRow}><View style={{ flex: 1 }}><Text style={styles.itemTitle}>{title}</Text><Text style={styles.itemStatus}>{status}</Text></View><Pressable disabled={disabled} onPress={onPrimary} style={({ pressed }) => [styles.itemAction, pressed && styles.pressed]}><MaterialIcons name={primaryIcon} size={16} color={colors.emerald} /><Text style={styles.itemActionText}>{primaryLabel}</Text></Pressable><Pressable disabled={disabled} onPress={onDelete} style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}><MaterialIcons name="delete-outline" size={17} color="#FF9D9A" /></Pressable></View>; }

function CampaignComposer({ isArabic, t, busy, onCreate }: { isArabic: boolean; t: (ar: string, en: string) => string; busy: boolean; onCreate: (input: { title: string; body: string; destinationUrl?: string; category: CampaignCategory; audience: CampaignAudience; delivery: CampaignDelivery; scheduledAt?: Date }) => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [category, setCategory] = useState<CampaignCategory>("announcement");
  const [audience, setAudience] = useState<CampaignAudience>("all_opted_in");
  const [delivery, setDelivery] = useState<CampaignDelivery>("send_now");
  const [scheduledAt, setScheduledAt] = useState(() => new Date(Date.now() + 60 * 60 * 1000));
  const submit = () => {
    if (title.trim().length < 3 || body.trim().length < 3 || busy) return;
    onCreate({ title: title.trim(), body: body.trim(), destinationUrl: destinationUrl.trim() || undefined, category, audience, delivery, scheduledAt: delivery === "schedule" ? scheduledAt : undefined });
    setTitle(""); setBody(""); setDestinationUrl("");
  };
  const option = <T extends string>(value: T, active: T, label: string, select: (next: T) => void) => <Pressable key={value} onPress={() => select(value)} style={({ pressed }) => [styles.choice, active === value && styles.choiceActive, pressed && styles.pressed]}><Text style={[styles.choiceText, active === value && styles.choiceTextActive]}>{label}</Text></Pressable>;
  return <View style={styles.composerCard}>
    <View style={styles.campaignHead}><View style={styles.campaignIcon}><MaterialIcons name="campaign" size={18} color={colors.cyan} /></View><View style={{ flex: 1 }}><Text style={styles.managerTitle}>{t("مركز حملات الإشعارات", "Push campaign center")}</Text><Text style={styles.auditMeta}>{t("يصل فقط للأجهزة التي وافقت على الإشعارات.", "Only reaches devices that opted in.")}</Text></View></View>
    <TextInput value={title} onChangeText={setTitle} maxLength={120} placeholder={t("عنوان الحملة", "Campaign title")} placeholderTextColor={colors.muted} textAlign="right" style={styles.campaignInput} />
    <TextInput value={body} onChangeText={setBody} maxLength={500} multiline placeholder={t("نص الإعلان أو التذكير", "Announcement or reminder message")} placeholderTextColor={colors.muted} textAlign="right" style={[styles.campaignInput, styles.campaignBody]} />
    <TextInput value={destinationUrl} onChangeText={setDestinationUrl} maxLength={1024} placeholder={t("رابط اختياري (https://...)", "Optional destination (https://...)")} placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="url" textAlign="left" style={styles.campaignInput} />
    <Text style={styles.choiceLabel}>{t("النوع", "Category")}</Text><View style={styles.choiceRow}>{option("announcement", category, t("إعلان", "Announcement"), setCategory)}{option("promotion", category, t("عرض", "Promotion"), setCategory)}{option("usage_tip", category, t("تلميح", "Usage tip"), setCategory)}{option("rating_reminder", category, t("تقييم", "Rating"), setCategory)}</View>
    <Text style={styles.choiceLabel}>{t("المستلمون", "Audience")}</Text><View style={styles.choiceRow}>{option("all_opted_in", audience, t("الجميع", "All opted in"), setAudience)}{option("manual_users", audience, t("الحسابات اليدوية", "Manual accounts"), setAudience)}{option("oauth_users", audience, t("OAuth", "OAuth"), setAudience)}</View>
    <Text style={styles.choiceLabel}>{t("الإرسال", "Delivery")}</Text><View style={styles.choiceRow}>{option("send_now", delivery, t("الآن", "Send now"), setDelivery)}{option("schedule", delivery, t("مجدول", "Schedule"), setDelivery)}</View>
    {delivery === "schedule" ? <><NativeDateTimePicker label={t("تاريخ الإرسال", "Delivery date")} value={scheduledAt} mode="date" minimumDate={new Date()} onChange={setScheduledAt} isArabic={isArabic} /><NativeDateTimePicker label={t("وقت الإرسال", "Delivery time")} value={scheduledAt} mode="time" onChange={setScheduledAt} isArabic={isArabic} /></> : null}
    <Pressable disabled={busy || title.trim().length < 3 || body.trim().length < 3} onPress={submit} style={({ pressed }) => [styles.sendCampaign, (busy || pressed) && styles.pressed]}><MaterialIcons name={delivery === "schedule" ? "schedule-send" : "send"} size={17} color="#062C3A" /><Text style={styles.sendCampaignText}>{busy ? t("جارٍ الحفظ…", "Saving…") : delivery === "schedule" ? t("جدولة الحملة", "Schedule campaign") : t("إرسال الحملة", "Send campaign")}</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 108, gap: 10 },
  hero: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: "rgba(56,216,255,0.30)" },
  heroIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(56,216,255,0.14)", alignItems: "center", justifyContent: "center" },
  title: { color: colors.ink, fontSize: 18, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  sectionTitle: { color: colors.muted, fontSize: 11, fontWeight: "900", letterSpacing: 0.4, marginTop: 8 },
  row: { minHeight: 70, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  rowIcon: { width: 37, height: 37, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(56,216,255,0.11)" },
  rowCopy: { flex: 1 },
  rowTitle: { color: colors.ink, fontSize: 12, fontWeight: "900" },
  rowDescription: { color: colors.muted, fontSize: 9, lineHeight: 14, marginTop: 2 },
  languageButton: { width: 38, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(56,216,255,0.12)", borderWidth: 1, borderColor: "rgba(56,216,255,0.42)" },
  languageText: { color: colors.cyan, fontSize: 11, fontWeight: "900" },
  pomodoroSettings: { gap: 9, padding: 12, borderRadius: 16, backgroundColor: "rgba(255,122,118,0.07)", borderWidth: 1, borderColor: "rgba(255,122,118,0.24)" }, pomodoroSettingsHead: { flexDirection: "row", alignItems: "center", gap: 10 }, durationRow: { minHeight: 38, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)", paddingTop: 8 }, durationLabel: { color: colors.ink, fontSize: 10, fontWeight: "800" }, durationControls: { flexDirection: "row", alignItems: "center", gap: 8 }, durationButton: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,122,118,0.18)" }, durationValue: { color: "#FFB3B0", minWidth: 46, textAlign: "center", fontSize: 10, fontWeight: "900" },
  rhythmCard: { gap: 10, padding: 14, borderRadius: 19, backgroundColor: "rgba(255,122,118,0.08)", borderWidth: 1, borderColor: "rgba(255,157,154,0.30)" }, rhythmHead: { flexDirection: "row", alignItems: "center", gap: 10 }, rhythmIcon: { width: 41, height: 41, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,122,118,0.14)" }, rhythmTitle: { color: colors.ink, fontSize: 13, fontWeight: "900", textAlign: "right" }, rhythmHint: { color: colors.muted, fontSize: 9, marginTop: 3, lineHeight: 14, textAlign: "right" }, rhythmSummary: { minHeight: 59, flexDirection: "row", alignItems: "center", borderRadius: 13, backgroundColor: "rgba(7,17,31,0.46)", paddingHorizontal: 10 }, rhythmMetric: { flex: 1, alignItems: "center", gap: 2 }, rhythmMetricValue: { color: "#FFB3B0", fontSize: 15, fontWeight: "900" }, rhythmMetricLabel: { color: colors.muted, fontSize: 8, fontWeight: "700", textAlign: "center" }, rhythmDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.10)" }, rhythmSectionLabel: { color: colors.muted, fontSize: 9, fontWeight: "900", textAlign: "right", marginTop: 1 }, presetRow: { flexDirection: "row", gap: 6 }, presetButton: { flex: 1, minHeight: 54, borderRadius: 12, alignItems: "center", justifyContent: "center", gap: 3, backgroundColor: "rgba(255,255,255,0.035)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }, presetButtonActive: { backgroundColor: "rgba(255,122,118,0.17)", borderColor: "rgba(255,157,154,0.72)" }, presetLabel: { color: colors.ink, fontSize: 10, fontWeight: "900" }, presetLabelActive: { color: "#FFB3B0" }, presetDetail: { color: colors.muted, fontSize: 8, fontWeight: "800" }, presetDetailActive: { color: "#FFD0CE" }, rhythmDurationRow: { minHeight: 47, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" }, rhythmDurationIcon: { width: 31, height: 31, borderRadius: 10, alignItems: "center", justifyContent: "center" }, rhythmDurationLabel: { flex: 1, color: colors.ink, fontSize: 10, fontWeight: "800", textAlign: "right" }, rhythmControls: { flexDirection: "row", alignItems: "center", gap: 7 }, rhythmControl: { width: 31, height: 31, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,122,118,0.16)" }, disabledControl: { opacity: 0.35 }, rhythmDurationValue: { minWidth: 47, color: "#FFCBC8", fontSize: 10, fontWeight: "900", textAlign: "center" },
  dndCard: { gap: 8, padding: 12, borderRadius: 16, backgroundColor: "rgba(181,156,255,0.08)", borderWidth: 1, borderColor: "rgba(181,156,255,0.26)" }, dndAccess: { minHeight: 38, borderRadius: 11, backgroundColor: "#B59CFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }, dndAccessText: { color: colors.canvas, fontSize: 10, fontWeight: "900" }, dndNote: { color: colors.muted, fontSize: 8, lineHeight: 13, textAlign: "right" },
  backgroundCard: { gap: 8, padding: 12, borderRadius: 16, backgroundColor: "rgba(79,225,168,0.07)", borderWidth: 1, borderColor: "rgba(79,225,168,0.25)" }, refreshReliability: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(79,225,168,0.12)" }, reliabilityStatus: { gap: 4 }, reliabilityText: { color: colors.muted, fontSize: 9, textAlign: "right" }, reliabilityAction: { minHeight: 38, borderRadius: 11, backgroundColor: colors.emerald, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }, reliabilityActionText: { color: colors.canvas, fontSize: 10, fontWeight: "900" }, reliabilitySecondary: { minHeight: 36, borderRadius: 11, borderWidth: 1, borderColor: "rgba(255,195,107,0.35)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }, reliabilitySecondaryText: { color: colors.warning, fontSize: 10, fontWeight: "900" },
  openButton: { width: 38, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(56,216,255,0.12)", borderWidth: 1, borderColor: "rgba(56,216,255,0.42)" },
  soundCard: { gap: 6, padding: 10, borderRadius: 15, backgroundColor: "rgba(56,216,255,0.06)", borderWidth: 1, borderColor: "rgba(56,216,255,0.18)" }, soundRow: { minHeight: 36, flexDirection: "row", alignItems: "center", gap: 8 }, soundLabel: { flex: 1, color: colors.ink, fontSize: 10, fontWeight: "800", textAlign: "right" }, previewButton: { minHeight: 29, paddingHorizontal: 9, borderRadius: 9, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.cyan }, previewText: { color: colors.canvas, fontSize: 9, fontWeight: "900" },
  closureCard: { padding: 12, gap: 10, borderRadius: 16, backgroundColor: "rgba(181,156,255,0.08)", borderWidth: 1, borderColor: "rgba(181,156,255,0.28)" }, closureHead: { minHeight: 45, flexDirection: "row", alignItems: "center", gap: 10 }, openClosure: { minHeight: 40, borderRadius: 11, backgroundColor: "#B59CFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }, openClosureText: { color: "#07111F", fontSize: 10, fontWeight: "900" },
  adminCard: { padding: 13, borderRadius: 17, backgroundColor: "#102A31", borderWidth: 1, borderColor: "rgba(79,225,168,0.38)", gap: 11 },
  adminHead: { flexDirection: "row", alignItems: "center", gap: 9 },
  adminIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(79,225,168,0.13)", alignItems: "center", justifyContent: "center" },
  adminTitle: { color: colors.ink, fontSize: 12, fontWeight: "900" },
  adminEmail: { color: colors.muted, fontSize: 9, marginTop: 2 },
  grantedBadge: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7, backgroundColor: "rgba(79,225,168,0.14)" },
  grantedText: { color: colors.emerald, fontSize: 9, fontWeight: "900" },
  adminGrid: { flexDirection: "row", gap: 7 },
  openAdminDashboard: { minHeight: 42, borderRadius: 11, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, backgroundColor: colors.emerald },
  openAdminDashboardText: { color: "#062C3A", fontSize: 10, fontWeight: "900" },
  adminMetric: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.045)" },
  adminValue: { color: colors.emerald, fontSize: 16, fontWeight: "900" },
  adminLabel: { color: colors.muted, fontSize: 8, marginTop: 2, fontWeight: "700" },
  adminNote: { color: "#B7CBD5", fontSize: 9, lineHeight: 14 },
  lockedCard: { minHeight: 74, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: "rgba(255,195,107,0.24)" },
  lockedIcon: { width: 37, height: 37, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,195,107,0.11)" },
  lockedTitle: { color: colors.ink, fontSize: 12, fontWeight: "900" },
  lockedText: { color: colors.muted, fontSize: 9, marginTop: 2, lineHeight: 14 },
  signInButton: { minHeight: 33, paddingHorizontal: 10, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(56,216,255,0.14)", borderWidth: 1, borderColor: "rgba(56,216,255,0.40)" },
  signInText: { color: colors.cyan, fontSize: 10, fontWeight: "900" },
  managerTitle: { color: colors.ink, fontSize: 11, fontWeight: "900", marginTop: 2 },
  controlGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  adminAction: { width: "48.5%", minHeight: 38, paddingHorizontal: 9, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "rgba(56,216,255,0.09)", borderWidth: 1, borderColor: "rgba(56,216,255,0.20)" },
  adminActionText: { color: colors.cyan, fontSize: 9, fontWeight: "900" },
  itemRow: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 6, padding: 9, borderRadius: 11, backgroundColor: "rgba(255,255,255,0.04)" },
  itemTitle: { color: colors.ink, fontSize: 10, fontWeight: "800" },
  itemStatus: { color: colors.muted, fontSize: 8, marginTop: 2 },
  itemAction: { minHeight: 29, paddingHorizontal: 7, flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 8, backgroundColor: "rgba(79,225,168,0.10)" },
  itemActionText: { color: colors.emerald, fontSize: 8, fontWeight: "900" },
  deleteButton: { width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: "rgba(255,122,118,0.10)" },
  auditRow: { flexDirection: "row", alignItems: "flex-start", gap: 7, padding: 9, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.035)" },
  auditAction: { color: colors.ink, fontSize: 9, fontWeight: "900" },
  auditMeta: { color: colors.muted, fontSize: 8, lineHeight: 13, marginTop: 2 },
  auditEmpty: { color: colors.muted, fontSize: 9, lineHeight: 14, paddingVertical: 5 },
  composerCard: { gap: 9, padding: 10, borderRadius: 12, backgroundColor: "rgba(56,216,255,0.05)", borderWidth: 1, borderColor: "rgba(56,216,255,0.22)" },
  campaignHead: { flexDirection: "row", alignItems: "center", gap: 7 },
  campaignIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(56,216,255,0.12)" },
  campaignInput: { minHeight: 42, borderRadius: 10, paddingHorizontal: 10, color: colors.ink, backgroundColor: "#0A1727", borderWidth: 1, borderColor: colors.border, fontSize: 10 },
  campaignBody: { minHeight: 68, paddingTop: 9, textAlignVertical: "top" },
  choiceLabel: { color: colors.muted, fontSize: 9, fontWeight: "900", textAlign: "right" },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  choice: { minHeight: 28, paddingHorizontal: 7, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" },
  choiceActive: { borderColor: "rgba(56,216,255,0.65)", backgroundColor: "rgba(56,216,255,0.13)" },
  choiceText: { color: colors.muted, fontSize: 8, fontWeight: "800" },
  choiceTextActive: { color: colors.cyan },
  sendCampaign: { minHeight: 40, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.cyan },
  sendCampaignText: { color: "#062C3A", fontSize: 10, fontWeight: "900" },
  campaignRow: { flexDirection: "row", alignItems: "center", gap: 7, padding: 9, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.035)" },
  logoutButton: { minHeight: 48, marginTop: 4, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: "#A84646", borderWidth: 1, borderColor: "rgba(255,190,190,0.45)" },
  logoutText: { color: "#FFF4F4", fontSize: 12, fontWeight: "900" },
  infoLinks: { gap: 7 },
  infoLink: { minHeight: 48, paddingHorizontal: 10, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  infoLinkIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(56,216,255,0.11)" },
  infoLinkText: { flex: 1, color: colors.ink, fontSize: 10, fontWeight: "900", textAlign: "right" },
  infoEditor: { gap: 9, padding: 12, borderRadius: 16, backgroundColor: "rgba(79,225,168,0.06)", borderWidth: 1, borderColor: "rgba(79,225,168,0.28)" },
  infoEditorHead: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  infoEditorTitle: { color: colors.ink, fontSize: 11, fontWeight: "900", textAlign: "right" },
  infoEditorHint: { color: colors.muted, fontSize: 8, lineHeight: 13, marginTop: 2, textAlign: "right" },
  infoField: { gap: 5 },
  infoFieldLabel: { color: colors.emerald, fontSize: 9, fontWeight: "900", textAlign: "right" },
  faqEditor: { gap: 12, marginTop: 8 },
  faqEditorItem: { gap: 9, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  infoInput: { minHeight: 82, padding: 10, color: colors.ink, backgroundColor: colors.canvas, borderRadius: 10, borderWidth: 1, borderColor: colors.border, fontSize: 10, lineHeight: 16, textAlignVertical: "top" },
  saveInfoButton: { minHeight: 40, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.emerald },
  saveInfoText: { color: colors.canvas, fontSize: 10, fontWeight: "900" },
  aboutCard: { padding: 14, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  aboutBrand: { color: colors.cyan, fontSize: 13, letterSpacing: 1.1, fontWeight: "900" },
  aboutText: { color: colors.muted, fontSize: 10, marginTop: 5, lineHeight: 15 },
  version: { color: colors.muted, fontSize: 9, marginTop: 10 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
