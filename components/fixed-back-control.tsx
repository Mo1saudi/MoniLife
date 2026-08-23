import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FixedBackControlProps = {
  isArabic: boolean;
  showAboveTabs: boolean;
  label: string;
  onPress: () => void;
};

export function FixedBackControl({ isArabic, showAboveTabs, label, onPress }: FixedBackControlProps) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 14) + (showAboveTabs ? 72 : 14);

  return <Pressable onPress={onPress} style={({ pressed }) => [styles.button, { bottom }, isArabic ? styles.right : styles.left, pressed && styles.pressed]}>
    <MaterialIcons name="arrow-back" size={19} color="#07111F" />
    <Text style={styles.label}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { position: "absolute", zIndex: 30, minHeight: 42, paddingHorizontal: 13, borderRadius: 15, backgroundColor: "#38D8FF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  right: { right: 16 },
  left: { left: 16 },
  label: { color: "#07111F", fontSize: 11, fontWeight: "900" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
