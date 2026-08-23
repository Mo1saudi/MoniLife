import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { trpc } from "@/lib/trpc";

export type InAppAdPlacement = "home" | "tasks" | "habits" | "finance";

export function InAppAdSlot({ placement, isArabic }: { placement: InAppAdPlacement; isArabic: boolean }) {
  const ads = trpc.advertisements.active.useQuery({ placement }, { staleTime: 60_000 });
  const ad = ads.data?.[0];
  if (!ad) return null;

  const open = async () => {
    if (!ad.destinationUrl) return;
    try {
      await Linking.openURL(ad.destinationUrl);
    } catch {
      // The banner remains visible and does not interrupt the user's primary workflow when a link cannot open.
    }
  };

  return <View style={styles.card} accessibilityRole="summary">
    <View style={styles.head}><View style={styles.mark}><MaterialIcons name="campaign" size={15} color="#38D8FF" /></View><Text style={styles.sponsored}>{isArabic ? "محتوى ترويجي" : "Sponsored"}</Text></View>
    <Text style={styles.title}>{ad.title}</Text>
    <Text style={styles.body}>{ad.body}</Text>
    {ad.destinationUrl ? <Pressable onPress={() => { void open(); }} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}><Text style={styles.ctaText}>{ad.ctaLabel}</Text><MaterialIcons name={isArabic ? "arrow-back" : "arrow-forward"} size={15} color="#07111F" /></Pressable> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 10, padding: 12, borderRadius: 16, backgroundColor: "#102A31", borderWidth: 1, borderColor: "rgba(79,225,168,0.32)", gap: 5 },
  head: { flexDirection: "row", alignItems: "center", gap: 6 }, mark: { width: 25, height: 25, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(56,216,255,0.12)" },
  sponsored: { color: "#91A4B9", fontSize: 8, fontWeight: "900" }, title: { color: "#F2F7FC", fontSize: 12, fontWeight: "900" }, body: { color: "#B7CBD5", fontSize: 10, lineHeight: 15 },
  cta: { alignSelf: "flex-start", minHeight: 30, marginTop: 2, paddingHorizontal: 9, borderRadius: 9, backgroundColor: "#4FE1A8", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }, ctaText: { color: "#07111F", fontSize: 9, fontWeight: "900" }, pressed: { opacity: 0.75 },
});
