import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import type { EnergyImpact } from "@/lib/behavioral-recovery";

type Props = { visible: boolean; isArabic: boolean; onSelect: (impact: EnergyImpact) => void; onDismiss: () => void };
const colors = { canvas: "#07111F", card: "#101F33", cyan: "#38D8FF", emerald: "#4FE1A8", amber: "#FFC36B", coral: "#FF7A76", ink: "#F2F7FC", muted: "#91A4B9" };

export function EnergyImpactFeedback({ visible, isArabic, onSelect, onDismiss }: Props) {
  const t = (ar: string, en: string) => isArabic ? ar : en;
  useEffect(() => { if (!visible) return; const timer = setTimeout(onDismiss, 3000); return () => clearTimeout(timer); }, [onDismiss, visible]);
  const choose = (impact: EnergyImpact) => { onSelect(impact); onDismiss(); };
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss}><View pointerEvents="box-none" style={styles.root}><View style={styles.card}><View style={styles.copy}><Text style={styles.title}>{t("كيف كان أثر الإنجاز؟", "How did that completion feel?")}</Text><Text style={styles.subtitle}>{t("لمساعدتك على توزيع طاقتك، اختَر إحساسك سريعًا.", "Choose a quick feeling to help balance your energy.")}</Text></View><View style={styles.options}><Option icon="bolt" label={t("شحنتني", "Recharged")} color={colors.emerald} onPress={() => choose("recharge")} /><Option icon="self-improvement" label={t("متوازن", "Balanced")} color={colors.cyan} onPress={() => choose("balanced")} /><Option icon="coffee" label={t("استنزفني", "Drained")} color={colors.coral} onPress={() => choose("drain")} /></View></View></View></Modal>;
}

function Option({ icon, label, color, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; color: string; onPress: () => void }) { return <Pressable onPress={onPress} style={({ pressed }) => [styles.option, { borderColor: `${color}55`, backgroundColor: `${color}14` }, pressed && styles.pressed]}><MaterialIcons name={icon} size={18} color={color} /><Text style={[styles.optionText, { color }]}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({ root: { flex: 1, justifyContent: "flex-end", padding: 16, paddingBottom: 86 }, card: { borderRadius: 18, padding: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: "rgba(56,216,255,0.26)", shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 }, copy: { alignItems: "stretch" }, title: { color: colors.ink, fontSize: 12, fontWeight: "900", textAlign: "right" }, subtitle: { color: colors.muted, fontSize: 9, lineHeight: 14, marginTop: 3, textAlign: "right" }, options: { flexDirection: "row", gap: 7, marginTop: 11 }, option: { flex: 1, minHeight: 49, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 3 }, optionText: { fontSize: 9, fontWeight: "900" }, pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] } });
