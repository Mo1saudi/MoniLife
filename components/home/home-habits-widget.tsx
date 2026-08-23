import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type HomeHabit = { id: string; title: string; category: string; streak: number; emergency: boolean };

type HomeHabitsWidgetProps = {
  habits: HomeHabit[];
  completedIds: string[];
  isArabic: boolean;
  onCompleteHabit: (habitId: string) => void;
  onOpenHabits: () => void;
};

const colors = { glass: "#0F172A", cyan: "#38D8FF", emerald: "#4FE1A8", amber: "#FFC36B", ink: "#F2F7FC", muted: "#91A4B9" };

export function HomeHabitsWidget({ habits, completedIds, isArabic, onCompleteHabit, onOpenHabits }: HomeHabitsWidgetProps) {
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const maxStreak = Math.max(0, ...habits.map((habit) => habit.streak));
  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.title}>{t("عادات اليوم الهادئة 🔥", "Today’s gentle habits 🔥")}</Text>
          <Text style={styles.subtitle}>{t("لمسة واحدة تحافظ على إيقاعك.", "One tap protects your rhythm.")}</Text>
        </View>
        <Pressable onPress={onOpenHabits} style={({ pressed }) => [styles.streakBadge, pressed && styles.pressed]}>
          <MaterialIcons name="local-fire-department" size={16} color={colors.amber} />
          <Text style={styles.streakText}>{maxStreak} {t("يومًا", "days")}</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.habitRow}>
        {habits.map((habit) => {
          const completed = completedIds.includes(habit.id);
          return <Pressable key={habit.id} onPress={() => onCompleteHabit(habit.id)} style={({ pressed }) => [styles.habitCard, completed && styles.habitComplete, pressed && styles.pressed]}>
            <View style={[styles.habitIcon, completed && styles.habitIconComplete]}><MaterialIcons name={completed ? "check" : "self-improvement"} size={20} color={completed ? "#07111F" : colors.cyan} /></View>
            <Text style={[styles.habitTitle, completed && styles.habitTitleComplete]} numberOfLines={2}>{habit.title}</Text>
            <Text style={[styles.habitMeta, completed && styles.habitMetaComplete]}>{completed ? t("تم اليوم", "Done today") : `${habit.streak} ${t("يومًا", "days")}`}</Text>
          </Pressable>;
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.glass, borderRadius: 22, borderWidth: 1, borderColor: "rgba(56,216,255,0.20)", padding: 15, gap: 13 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { color: colors.ink, fontSize: 17, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 10, marginTop: 3 },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 10, backgroundColor: "rgba(255,195,107,0.14)" },
  streakText: { color: colors.amber, fontSize: 10, fontWeight: "900" },
  habitRow: { gap: 9, paddingRight: 1 },
  habitCard: { width: 120, minHeight: 120, padding: 12, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.035)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", justifyContent: "space-between" },
  habitComplete: { backgroundColor: "rgba(56,216,255,0.16)", borderColor: "rgba(56,216,255,0.62)" },
  habitIcon: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: "rgba(56,216,255,0.13)" },
  habitIconComplete: { backgroundColor: colors.cyan },
  habitTitle: { color: colors.ink, fontSize: 11, lineHeight: 16, fontWeight: "800" },
  habitTitleComplete: { color: colors.cyan },
  habitMeta: { color: colors.muted, fontSize: 9, fontWeight: "700" },
  habitMetaComplete: { color: "#BFEFFF" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
