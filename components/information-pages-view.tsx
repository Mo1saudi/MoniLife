import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { INFORMATION_PAGE_LABELS, type InformationContent, type InformationPageKey } from "@/lib/information-content";

const colors = { canvas: "#07111F", card: "#101F33", cyan: "#38D8FF", ink: "#F2F7FC", muted: "#91A4B9", border: "#1C3B56" };

type Props = {
  isArabic: boolean;
  page: InformationPageKey;
  content: InformationContent;
  onPageChange: (page: InformationPageKey) => void;
  onBack: () => void;
};

export function InformationPagesView({ isArabic, page, content, onPageChange, onBack }: Props) {
  const [activePage, setActivePage] = useState(page);
  const [openFaqId, setOpenFaqId] = useState(content.faq[0]?.id ?? "");
  useEffect(() => setActivePage(page), [page]);
  const selectPage = (next: InformationPageKey) => {
    setActivePage(next);
    onPageChange(next);
  };
  const label = INFORMATION_PAGE_LABELS[activePage];
  const isFaq = activePage === "faq";
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={({ pressed }) => [styles.back, pressed && styles.pressed]} accessibilityLabel={isArabic ? "رجوع" : "Back"}>
          <MaterialIcons name="arrow-forward" size={20} color={colors.ink} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>{isArabic ? "مركز المعرفة" : "Knowledge center"}</Text>
          <Text style={styles.title}>{isArabic ? label.ar : label.en}</Text>
        </View>
      </View>
      <View style={styles.tabs}>
        {(Object.keys(INFORMATION_PAGE_LABELS) as InformationPageKey[]).map((key) => {
          const item = INFORMATION_PAGE_LABELS[key];
          const selected = key === activePage;
          return <Pressable key={key} onPress={() => selectPage(key)} style={({ pressed }) => [styles.tab, selected && styles.tabActive, pressed && styles.pressed]}><Text style={[styles.tabText, selected && styles.tabTextActive]}>{isArabic ? item.ar : item.en}</Text></Pressable>;
        })}
      </View>
      {isFaq ? <View style={styles.faqList}>
        <View style={styles.faqIntro}><View style={styles.cardIcon}><MaterialIcons name="quiz" size={23} color={colors.cyan} /></View><Text style={styles.cardTitle}>{isArabic ? "إجابات سريعة لتبدأ بثقة" : "Quick answers to get started"}</Text><Text style={styles.paragraph}>{isArabic ? "اختر السؤال الأقرب لما تريد معرفته. يمكنك فتح أكثر من إجابة أثناء التعرف على التطبيق." : "Choose the question closest to what you need. You can open answers as you learn the app."}</Text></View>
        {content.faq.map((item) => {
          const open = item.id === openFaqId;
          return <Pressable key={item.id} onPress={() => setOpenFaqId(open ? "" : item.id)} style={({ pressed }) => [styles.faqItem, open && styles.faqItemOpen, pressed && styles.pressed]} accessibilityRole="button" accessibilityState={{ expanded: open }}><View style={styles.faqQuestionRow}><Text style={styles.faqQuestion}>{isArabic ? item.questionAr : item.questionEn}</Text><MaterialIcons name={open ? "expand-less" : "expand-more"} size={22} color={open ? colors.cyan : colors.muted} /></View>{open ? <Text style={styles.faqAnswer}>{isArabic ? item.answerAr : item.answerEn}</Text> : null}</Pressable>;
        })}
      </View> : <View style={styles.card}>
        <View style={styles.cardIcon}><MaterialIcons name={activePage === "privacy" ? "privacy-tip" : activePage === "about" ? "favorite" : "menu-book"} size={23} color={colors.cyan} /></View>
        <Text style={styles.cardTitle}>{isArabic ? label.ar : label.en}</Text>
        {content[activePage].split(/\n\s*\n/).map((paragraph, index) => <Text key={`${activePage}-${index}`} style={styles.paragraph}>{paragraph}</Text>)}
      </View>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48, gap: 18 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  back: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.cyan, fontSize: 12, fontWeight: "800", textAlign: "right" },
  title: { color: colors.ink, fontSize: 25, fontWeight: "900", textAlign: "right", marginTop: 3 },
  tabs: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" },
  tab: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: "rgba(56,216,255,0.16)", borderColor: colors.cyan },
  tabText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  tabTextActive: { color: colors.cyan },
  card: { backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 22, gap: 14 },
  cardIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(56,216,255,0.13)", alignSelf: "flex-end" },
  cardTitle: { color: colors.ink, fontSize: 20, fontWeight: "900", textAlign: "right" },
  paragraph: { color: "#D0DCE8", fontSize: 16, lineHeight: 29, textAlign: "right" },
  faqList: { gap: 12 },
  faqIntro: { backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 22, gap: 14 },
  faqItem: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 17, gap: 12 },
  faqItemOpen: { borderColor: colors.cyan, backgroundColor: "#122943" },
  faqQuestionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  faqQuestion: { flex: 1, color: colors.ink, fontSize: 15, lineHeight: 23, fontWeight: "800", textAlign: "right" },
  faqAnswer: { color: "#D0DCE8", fontSize: 14, lineHeight: 25, textAlign: "right" },
  pressed: { opacity: 0.72 },
});
