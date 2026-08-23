import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

export type InAppAdvertisement = {
  id: number;
  title: string;
  body: string;
  ctaLabel: string;
  placement: "home" | "tasks" | "habits" | "finance";
  destinationUrl: string | null;
  active: boolean;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
};

type Props = {
  isArabic: boolean;
  busy: boolean;
  ads: InAppAdvertisement[];
  onCreate: (input: { title: string; body: string; ctaLabel: string; placement: InAppAdvertisement["placement"]; destinationUrl?: string }) => void;
  onSetActive: (id: number, active: boolean) => void;
};

const colors = { card: "#10233A", canvas: "#07111F", cyan: "#38D8FF", emerald: "#4FE1A8", ink: "#F2F7FC", muted: "#91A4B9", border: "#1C3B56" };

export function AdminAdvertisingPanel({ isArabic, busy, ads, onCreate, onSetActive }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState(isArabic ? "اعرف المزيد" : "Learn more");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [placement, setPlacement] = useState<InAppAdvertisement["placement"]>("home");
  const t = (ar: string, en: string) => isArabic ? ar : en;
  const submit = () => {
    if (busy || title.trim().length < 3 || body.trim().length < 3 || ctaLabel.trim().length < 2) return;
    onCreate({ title: title.trim(), body: body.trim(), ctaLabel: ctaLabel.trim(), placement, destinationUrl: destinationUrl.trim() || undefined });
    setTitle(""); setBody(""); setDestinationUrl("");
  };
  const label = (value: InAppAdvertisement["placement"]) => value === "home" ? t("الرئيسية", "Home") : value === "tasks" ? t("المهام", "Tasks") : value === "habits" ? t("العادات", "Habits") : t("المال", "Finance");
  return <View style={styles.card}>
    <View style={styles.head}><View style={styles.icon}><MaterialIcons name="ads-click" size={18} color={colors.cyan} /></View><View style={{ flex: 1 }}><Text style={styles.title}>{t("إعلانات داخل التطبيق", "In-app advertisements")}</Text><Text style={styles.sub}>{t("تظهر لحسابات Free فقط؛ الحسابات المدفوعة لا ترى الإعلانات.", "Shown only to Free accounts; paid accounts remain ad-free.")}</Text></View></View>
    <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder={t("عنوان الإعلان", "Ad title")} placeholderTextColor={colors.muted} textAlign={isArabic ? "right" : "left"} maxLength={120} />
    <TextInput value={body} onChangeText={setBody} style={[styles.input, styles.body]} placeholder={t("نص الإعلان", "Ad copy")} placeholderTextColor={colors.muted} textAlign={isArabic ? "right" : "left"} textAlignVertical="top" multiline maxLength={500} />
    <TextInput value={ctaLabel} onChangeText={setCtaLabel} style={styles.input} placeholder={t("نص الزر", "Button label")} placeholderTextColor={colors.muted} textAlign={isArabic ? "right" : "left"} maxLength={80} />
    <TextInput value={destinationUrl} onChangeText={setDestinationUrl} style={styles.input} placeholder={t("رابط اختياري https://", "Optional https:// destination")} placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="url" textAlign="left" maxLength={1024} />
    <Text style={styles.label}>{t("موضع الظهور", "Placement")}</Text><View style={styles.choices}>{(["home", "tasks", "habits", "finance"] as const).map((item) => <Pressable key={item} onPress={() => setPlacement(item)} style={({ pressed }) => [styles.choice, placement === item && styles.choiceActive, pressed && styles.pressed]}><Text style={[styles.choiceText, placement === item && styles.choiceTextActive]}>{label(item)}</Text></Pressable>)}</View>
    <Pressable disabled={busy || title.trim().length < 3 || body.trim().length < 3 || ctaLabel.trim().length < 2} onPress={submit} style={({ pressed }) => [styles.publish, (busy || pressed) && styles.pressed]}><MaterialIcons name="publish" size={17} color={colors.canvas} /><Text style={styles.publishText}>{busy ? t("جارٍ النشر…", "Publishing…") : t("نشر إعلان داخل التطبيق", "Publish in-app ad")}</Text></Pressable>
    <Text style={styles.listTitle}>{t("الإعلانات الحالية", "Current in-app ads")}</Text>
    {ads.length === 0 ? <Text style={styles.empty}>{t("لا توجد إعلانات داخل التطبيق بعد.", "No in-app advertisements yet.")}</Text> : ads.slice(0, 8).map((ad) => <View key={ad.id} style={styles.row}><View style={{ flex: 1 }}><Text style={styles.rowTitle}>{ad.title}</Text><Text style={styles.rowSub}>{label(ad.placement)} · {ad.active ? t("نشط", "Active") : t("متوقف", "Paused")}</Text></View><Switch value={ad.active} onValueChange={(value) => onSetActive(ad.id, value)} disabled={busy} trackColor={{ false: colors.border, true: "#1F6B80" }} thumbColor={ad.active ? colors.emerald : colors.muted} /></View>)}
  </View>;
}

const styles = StyleSheet.create({
  card: { gap: 8, padding: 10, borderRadius: 12, backgroundColor: "rgba(79,225,168,0.045)", borderWidth: 1, borderColor: "rgba(79,225,168,0.28)" }, head: { flexDirection: "row", gap: 7, alignItems: "center" }, icon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(56,216,255,0.12)" }, title: { color: colors.ink, fontSize: 11, fontWeight: "900" }, sub: { color: colors.muted, fontSize: 8, lineHeight: 12, marginTop: 2 }, input: { minHeight: 40, color: colors.ink, fontSize: 10, paddingHorizontal: 9, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }, body: { minHeight: 64, paddingTop: 8 }, label: { color: colors.muted, fontSize: 9, fontWeight: "900", textAlign: "right" }, choices: { flexDirection: "row", flexWrap: "wrap", gap: 5 }, choice: { paddingHorizontal: 8, minHeight: 28, borderRadius: 8, justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" }, choiceActive: { backgroundColor: "rgba(56,216,255,0.13)", borderColor: "rgba(56,216,255,0.62)" }, choiceText: { color: colors.muted, fontSize: 8, fontWeight: "800" }, choiceTextActive: { color: colors.cyan }, publish: { minHeight: 38, borderRadius: 10, backgroundColor: colors.emerald, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5 }, publishText: { color: colors.canvas, fontWeight: "900", fontSize: 10 }, listTitle: { color: colors.ink, fontSize: 10, fontWeight: "900", marginTop: 3 }, empty: { color: colors.muted, fontSize: 9, paddingVertical: 4 }, row: { minHeight: 48, paddingHorizontal: 9, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.04)", flexDirection: "row", alignItems: "center", gap: 7 }, rowTitle: { color: colors.ink, fontSize: 9, fontWeight: "800" }, rowSub: { color: colors.muted, fontSize: 8, marginTop: 2 }, pressed: { opacity: 0.7 },
});
