import { StyleSheet } from "react-native";

export const compactShellStyles = StyleSheet.create({
  header: { minHeight: 58, paddingHorizontal: 10, paddingVertical: 8 },
  headerActions: { gap: 4 },
  xpPill: { paddingHorizontal: 5, gap: 2 },
  tabBar: { paddingHorizontal: 4, paddingTop: 5 },
  navItem: { minHeight: 45, borderRadius: 10, gap: 2 },
  navLabel: { fontSize: 8, maxWidth: 44 },
  toast: { left: 10, right: 10, bottom: 76, paddingHorizontal: 10 },
  modalBackdrop: { padding: 12 },
  composerCard: { borderRadius: 18, padding: 14 },
});
