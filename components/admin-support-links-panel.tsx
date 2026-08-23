import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { isSupportedSupportLinkUrl, normalizeSupportLinkUrl } from "@/lib/support-link-url";

type LinkType = "support" | "faq";
type SupportLink = { id: number; label: string; url: string; type: LinkType; active: boolean };

export function AdminSupportLinksPanel({
  isArabic,
  links,
  isSaving,
  pendingLinkId,
  onAdd,
  onUpdate,
  onDelete,
}: {
  isArabic: boolean;
  links: SupportLink[];
  isSaving: boolean;
  pendingLinkId: number | null;
  onAdd: (input: { label: string; url: string; type: LinkType }) => Promise<boolean>;
  onUpdate: (input: { id: number; label: string; url: string; type: LinkType }) => Promise<boolean>;
  onDelete: (id: number) => Promise<boolean>;
}) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [linkType, setLinkType] = useState<LinkType>("support");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<SupportLink | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const t = (ar: string, en: string) => isArabic ? ar : en;
  const normalizedUrl = normalizeSupportLinkUrl(url);
  const hasUrl = url.trim().length > 0;
  const validUrl = hasUrl && isSupportedSupportLinkUrl(normalizedUrl);
  const isEditing = editingId !== null;
  const canSave = label.trim().length >= 2 && validUrl && !isSaving;
  const alignment = isArabic ? "right" : "left";
  const resetForm = () => { setLabel(""); setUrl(""); setLinkType("support"); setEditingId(null); };
  const beginEdit = (link: SupportLink) => { setEditingId(link.id); setLabel(link.label); setUrl(link.url); setLinkType(link.type); };
  const submit = async () => {
    if (!canSave) return;
    const saved = isEditing
      ? await onUpdate({ id: editingId, label: label.trim(), url: normalizedUrl, type: linkType })
      : await onAdd({ label: label.trim(), url: normalizedUrl, type: linkType });
    if (saved) resetForm();
  };
  const closeDeleteConfirmation = () => {
    if (!isConfirmingDelete) setDeleteCandidate(null);
  };
  const confirmDelete = async () => {
    if (!deleteCandidate || isConfirmingDelete) return;
    setIsConfirmingDelete(true);
    const deleted = await onDelete(deleteCandidate.id);
    setIsConfirmingDelete(false);
    if (deleted) setDeleteCandidate(null);
  };

  return <View style={styles.panel}>
    <View style={styles.intro}><View style={styles.introIcon}><MaterialIcons name="add-link" size={20} color={colors.cyan} /></View><View style={{ flex: 1 }}><Text style={[styles.title, { textAlign: alignment }]}>{t("روابط الدعم والأسئلة", "Support & FAQ links")}</Text><Text style={[styles.subtitle, { textAlign: alignment }]}>{t("أضف رابطًا واحدًا واضحًا؛ سيتم عرضه فورًا للمستخدمين بعد تأكيد الحفظ.", "Add one clear link. It appears for users immediately after the save is confirmed.")}</Text></View></View>

    <Text style={[styles.fieldLabel, { textAlign: alignment }]}>{t("1. اختر نوع الرابط", "1. Choose link type")}</Text>
    <View style={styles.typeRow}>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: linkType === "support" }} onPress={() => setLinkType("support")} style={({ pressed }) => [styles.typeCard, linkType === "support" && styles.typeCardActive, pressed && styles.pressed]}><MaterialIcons name="support-agent" size={19} color={linkType === "support" ? colors.cyan : colors.muted} /><Text style={[styles.typeTitle, linkType === "support" && styles.typeTitleActive]}>{t("دعم", "Support")}</Text><Text style={styles.typeHint}>{t("مساعدة مباشرة", "Get help")}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: linkType === "faq" }} onPress={() => setLinkType("faq")} style={({ pressed }) => [styles.typeCard, linkType === "faq" && styles.typeCardActive, pressed && styles.pressed]}><MaterialIcons name="help-outline" size={19} color={linkType === "faq" ? colors.cyan : colors.muted} /><Text style={[styles.typeTitle, linkType === "faq" && styles.typeTitleActive]}>FAQ</Text><Text style={styles.typeHint}>{t("إجابات سريعة", "Quick answers")}</Text></Pressable>
    </View>

    {isEditing ? <View style={styles.editingBanner}><MaterialIcons name="edit" size={16} color={colors.amber} /><Text style={[styles.editingText, { textAlign: alignment }]}>{t("أنت تعدّل رابطًا منشورًا. احفظ التغييرات عند الانتهاء.", "You are editing a published link. Save when finished.")}</Text><Pressable onPress={resetForm} style={styles.cancelEdit}><Text style={styles.cancelEditText}>{t("إلغاء", "Cancel")}</Text></Pressable></View> : null}
    <View style={styles.form}><Text style={[styles.fieldLabel, { textAlign: alignment }]}>{t("2. اسم واضح يظهر للمستخدم", "2. Label shown to users")}</Text><TextInput value={label} onChangeText={setLabel} placeholder={t("مثال: تواصل مع الدعم عبر واتساب", "Example: Contact support on WhatsApp")} placeholderTextColor={colors.muted} returnKeyType="next" style={[styles.input, { textAlign: alignment }]} />
      <Text style={[styles.fieldLabel, { textAlign: alignment }]}>{t("3. رابط الوجهة", "3. Destination link")}</Text><TextInput value={url} onChangeText={setUrl} placeholder={t("support.example.com أو https://…", "support.example.com or https://…")} placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} keyboardType="url" returnKeyType="done" onSubmitEditing={() => { void submit(); }} style={[styles.input, styles.urlInput]} textAlign="left" />
      {hasUrl ? <View style={[styles.urlStatus, validUrl ? styles.urlStatusValid : styles.urlStatusInvalid]}><MaterialIcons name={validUrl ? "verified" : "error-outline"} size={16} color={validUrl ? colors.emerald : colors.coral} /><Text numberOfLines={2} style={[styles.urlStatusText, { color: validUrl ? colors.emerald : colors.coral, textAlign: alignment }]}>{validUrl ? normalizedUrl : t("اكتب رابط HTTP أو HTTPS صالحًا.", "Enter a valid HTTP or HTTPS link.")}</Text></View> : <View style={styles.helper}><MaterialIcons name="auto-fix-high" size={15} color={colors.cyan} /><Text style={[styles.helperText, { textAlign: alignment }]}>{t("لا يلزم كتابة https://؛ سيُضاف تلقائيًا.", "You can omit https:// — it is added automatically.")}</Text></View>}
      <Pressable disabled={!canSave} accessibilityRole="button" accessibilityState={{ disabled: !canSave, busy: isSaving }} onPress={() => { void submit(); }} style={({ pressed }) => [styles.save, (!canSave || pressed) && styles.saveDisabled]}><MaterialIcons name={isSaving ? "hourglass-top" : isEditing ? "save" : "add-link"} size={18} color={colors.canvas} /><Text style={styles.saveText}>{isSaving ? t("جارٍ تأكيد الحفظ…", "Confirming save…") : isEditing ? t("حفظ التعديلات", "Save changes") : t(`إضافة رابط ${linkType === "support" ? "الدعم" : "الأسئلة"}`, `Add ${linkType === "support" ? "support" : "FAQ"} link`)}</Text></Pressable>
    </View>

    <View style={styles.savedHeader}><Text style={[styles.savedTitle, { textAlign: alignment }]}>{t("الروابط المنشورة", "Published links")}</Text><Text style={styles.count}>{links.length}</Text></View>
    {links.length ? links.map((link) => { const isPending = pendingLinkId === link.id; return <View key={link.id} style={styles.linkRow}><View style={[styles.linkIcon, { backgroundColor: link.type === "support" ? "rgba(56,216,255,0.12)" : "rgba(181,156,255,0.13)" }]}><MaterialIcons name={link.type === "support" ? "support-agent" : "help-outline"} size={17} color={link.type === "support" ? colors.cyan : colors.purple} /></View><View style={{ flex: 1 }}><Text numberOfLines={1} style={[styles.linkLabel, { textAlign: alignment }]}>{link.label}</Text><Text numberOfLines={1} style={[styles.linkUrl, { textAlign: "left" }]}>{link.url}</Text></View><View style={styles.linkActions}><View style={[styles.livePill, !link.active && styles.hiddenPill]}><Text style={[styles.liveText, !link.active && styles.hiddenText]}>{link.active ? t("ظاهر", "Live") : t("مخفي", "Hidden")}</Text></View><Pressable disabled={isPending} accessibilityLabel={t("تعديل الرابط", "Edit link")} onPress={() => beginEdit(link)} style={({ pressed }) => [styles.linkAction, pressed && styles.pressed, isPending && styles.actionDisabled]}><MaterialIcons name="edit" size={17} color={colors.cyan} /></Pressable><Pressable disabled={isPending} accessibilityLabel={t("حذف الرابط", "Delete link")} onPress={() => setDeleteCandidate(link)} style={({ pressed }) => [styles.linkAction, pressed && styles.pressed, isPending && styles.actionDisabled]}><MaterialIcons name={isPending ? "hourglass-top" : "delete-outline"} size={17} color={colors.coral} /></Pressable></View></View>; }) : <View style={styles.empty}><MaterialIcons name="link-off" size={17} color={colors.muted} /><Text style={[styles.emptyText, { textAlign: alignment }]}>{t("لا توجد روابط منشورة بعد.", "No published links yet.")}</Text></View>}

    <Modal transparent visible={deleteCandidate !== null} animationType="fade" onRequestClose={closeDeleteConfirmation}>
      <Pressable style={deleteDialogStyles.backdrop} onPress={closeDeleteConfirmation}>
        <Pressable accessibilityViewIsModal style={deleteDialogStyles.card} onPress={() => undefined}>
          <View style={deleteDialogStyles.icon}><MaterialIcons name="delete-outline" size={24} color={colors.coral} /></View>
          <Text style={[deleteDialogStyles.title, { textAlign: alignment }]}>{t("تأكيد حذف الرابط", "Confirm link deletion")}</Text>
          <Text style={[deleteDialogStyles.body, { textAlign: alignment }]}>{t(`سيُحذف رابط «${deleteCandidate?.label ?? ""}» نهائيًا ولن يظهر للمستخدمين.`, `“${deleteCandidate?.label ?? ""}” will be permanently removed and will no longer appear to users.`)}</Text>
          <View style={deleteDialogStyles.actions}>
            <Pressable disabled={isConfirmingDelete} onPress={closeDeleteConfirmation} style={({ pressed }) => [deleteDialogStyles.cancel, (pressed || isConfirmingDelete) && styles.actionDisabled]}><Text style={deleteDialogStyles.cancelText}>{t("إلغاء", "Cancel")}</Text></Pressable>
            <Pressable disabled={isConfirmingDelete} accessibilityRole="button" accessibilityState={{ busy: isConfirmingDelete }} onPress={() => { void confirmDelete(); }} style={({ pressed }) => [deleteDialogStyles.confirm, (pressed || isConfirmingDelete) && styles.actionDisabled]}><MaterialIcons name={isConfirmingDelete ? "hourglass-top" : "delete"} size={17} color={colors.canvas} /><Text style={deleteDialogStyles.confirmText}>{isConfirmingDelete ? t("جارٍ الحذف…", "Deleting…") : t("حذف نهائي", "Delete permanently")}</Text></Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  </View>;
}

const colors = { canvas: "#07111F", card: "#101F33", cyan: "#38D8FF", emerald: "#4FE1A8", ink: "#F2F7FC", muted: "#91A4B9", border: "#1C3B56", coral: "#FF7A76", amber: "#FFC36B", purple: "#B59CFF" };
const styles = StyleSheet.create({
  panel: { gap: 11, padding: 14, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: "rgba(56,216,255,0.25)" },
  intro: { flexDirection: "row", alignItems: "flex-start", gap: 10 }, introIcon: { width: 39, height: 39, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(56,216,255,0.11)" }, title: { color: colors.ink, fontSize: 14, fontWeight: "900" }, subtitle: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  fieldLabel: { color: colors.ink, fontSize: 10, fontWeight: "900", marginTop: 1 }, typeRow: { flexDirection: "row", gap: 8 }, typeCard: { flex: 1, minHeight: 78, gap: 3, padding: 10, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: "rgba(7,17,31,0.58)" }, typeCardActive: { borderColor: "rgba(56,216,255,0.70)", backgroundColor: "rgba(56,216,255,0.11)" }, typeTitle: { color: colors.ink, fontSize: 12, fontWeight: "900" }, typeTitleActive: { color: colors.cyan }, typeHint: { color: colors.muted, fontSize: 8, fontWeight: "700" },
  form: { gap: 7, paddingTop: 2 }, input: { minHeight: 46, paddingHorizontal: 11, borderRadius: 11, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.canvas, color: colors.ink, fontSize: 11 }, urlInput: { letterSpacing: 0.1 }, helper: { minHeight: 31, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 9, borderRadius: 9, backgroundColor: "rgba(56,216,255,0.07)" }, helperText: { color: colors.cyan, flex: 1, fontSize: 9, fontWeight: "700" }, urlStatus: { minHeight: 36, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 9, borderRadius: 9, borderWidth: 1 }, urlStatusValid: { borderColor: "rgba(79,225,168,0.27)", backgroundColor: "rgba(79,225,168,0.07)" }, urlStatusInvalid: { borderColor: "rgba(255,122,118,0.27)", backgroundColor: "rgba(255,122,118,0.07)" }, urlStatusText: { flex: 1, fontSize: 9, fontWeight: "700" },
  editingBanner: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 9, borderRadius: 10, backgroundColor: "rgba(255,195,107,0.10)", borderWidth: 1, borderColor: "rgba(255,195,107,0.28)" }, editingText: { color: colors.amber, flex: 1, fontSize: 9, fontWeight: "700", lineHeight: 14 }, cancelEdit: { minHeight: 30, paddingHorizontal: 8, borderRadius: 8, justifyContent: "center", backgroundColor: "rgba(255,255,255,0.07)" }, cancelEditText: { color: colors.ink, fontSize: 8, fontWeight: "900" },
  save: { minHeight: 48, marginTop: 3, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: colors.cyan }, saveDisabled: { opacity: 0.45 }, saveText: { color: colors.canvas, fontSize: 11, fontWeight: "900" },
  savedHeader: { flexDirection: "row", alignItems: "center", gap: 7, paddingTop: 5 }, savedTitle: { color: colors.ink, flex: 1, fontSize: 11, fontWeight: "900" }, count: { minWidth: 22, height: 20, paddingHorizontal: 6, borderRadius: 10, overflow: "hidden", color: colors.cyan, backgroundColor: "rgba(56,216,255,0.12)", fontSize: 10, fontWeight: "900", textAlign: "center", textAlignVertical: "center" }, linkRow: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 8, padding: 8, borderRadius: 11, backgroundColor: "rgba(255,255,255,0.035)" }, linkIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" }, linkLabel: { color: colors.ink, fontSize: 10, fontWeight: "900" }, linkUrl: { color: colors.muted, fontSize: 8, marginTop: 3 }, linkActions: { alignItems: "flex-end", gap: 4 }, livePill: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7, backgroundColor: "rgba(79,225,168,0.12)" }, hiddenPill: { backgroundColor: "rgba(145,164,185,0.12)" }, liveText: { color: colors.emerald, fontSize: 8, fontWeight: "900" }, hiddenText: { color: colors.muted }, linkAction: { width: 34, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)" }, actionDisabled: { opacity: 0.45 }, empty: { minHeight: 43, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 8, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.03)" }, emptyText: { color: colors.muted, flex: 1, fontSize: 9, fontWeight: "700" }, pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});

const deleteDialogStyles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "rgba(2,8,15,0.74)" },
  card: { width: "100%", maxWidth: 420, alignSelf: "center", gap: 10, padding: 18, borderRadius: 20, backgroundColor: "#10233A", borderWidth: 1, borderColor: "rgba(255,122,118,0.38)" },
  icon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,122,118,0.13)" },
  title: { color: colors.ink, fontSize: 16, lineHeight: 22, fontWeight: "900" },
  body: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  cancel: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: colors.border },
  cancelText: { color: colors.ink, fontSize: 11, fontWeight: "900" },
  confirm: { flex: 1.35, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 11, backgroundColor: colors.coral },
  confirmText: { color: colors.canvas, fontSize: 11, fontWeight: "900" },
});
