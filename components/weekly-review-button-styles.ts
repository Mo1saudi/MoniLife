import { StyleSheet } from "react-native";

export const weeklyReviewButtonStyles = StyleSheet.create({
  button: {
    width: 44,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(181,156,255,0.20)",
    borderWidth: 1,
    borderColor: "rgba(181,156,255,0.72)",
    shadowColor: "#B59CFF",
    shadowOpacity: 0.32,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  dot: {
    position: "absolute",
    top: 5,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#DCCFFF",
    borderWidth: 1,
    borderColor: "#322A52",
  },
});
