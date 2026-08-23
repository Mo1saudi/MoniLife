import { StyleSheet } from "react-native";

export const promotionInboxStyles = StyleSheet.create({
  section: { gap: 8, marginTop: 2 },
  heading: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 2 },
  card: { borderColor: "rgba(255,195,107,0.38)" },
  actions: { alignItems: "center", gap: 8 },
  deleteButton: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,122,118,0.12)", borderWidth: 1, borderColor: "rgba(255,122,118,0.36)" },
});
