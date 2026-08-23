import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type HomeTask = {
  id: string;
  title: string;
  detail: string;
  energy: "high" | "medium" | "low";
  priority: "high" | "medium";
  done: boolean;
  reschedules: number;
  steps?: { id: string; title: string; done: boolean }[];
};

type HomeTasksWidgetProps = {
  tasks: HomeTask[];
  isArabic: boolean;
  onAddTask: (title: string) => void;
  onToggleTask: (taskId: string) => void;
  onBreakFriction: (taskId: string) => void;
  onOpenTasks: () => void;
};

const colors = {
  obsidian: "#070C1B",
  glass: "#0F172A",
  cyan: "#38D8FF",
  emerald: "#4FE1A8",
  coral: "#FF7A76",
  amber: "#FFC36B",
  ink: "#F2F7FC",
  muted: "#91A4B9",
};

export function HomeTasksWidget({ tasks, isArabic, onAddTask, onToggleTask, onBreakFriction, onOpenTasks }: HomeTasksWidgetProps) {
  const [quickTitle, setQuickTitle] = useState("");
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const displayedTasks = useMemo(
    () => tasks.filter((task) => !task.done && task.energy !== "low").slice(0, 3),
    [tasks],
  );
  const completedCount = tasks.filter((task) => task.done).length;

  const submitQuickTask = () => {
    if (!quickTitle.trim()) return;
    onAddTask(quickTitle.trim());
    setQuickTitle("");
  };

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.title}>{t("مهام اليوم ⚡", "Today’s tasks ⚡")}</Text>
          <Text style={styles.subtitle}>{t(`${completedCount}/${tasks.length} منجزة حتى الآن`, `${completedCount}/${tasks.length} completed so far`)}</Text>
        </View>
        <Pressable onPress={onOpenTasks} style={({ pressed }) => [styles.allButton, pressed && styles.pressed]}>
          <Text style={styles.allButtonText}>{t("عرض الكل", "View all")}</Text>
          <MaterialIcons name="arrow-back" size={15} color={colors.cyan} />
        </Pressable>
      </View>

      <View style={styles.quickAdd}>
        <TextInput
          value={quickTitle}
          onChangeText={setQuickTitle}
          placeholder={t("أضف مهمة بكلمة واحدة…", "Add a task in one line…")}
          placeholderTextColor={colors.muted}
          style={styles.input}
          textAlign={isArabic ? "right" : "left"}
          onSubmitEditing={submitQuickTask}
          returnKeyType="done"
        />
        <Pressable onPress={submitQuickTask} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
          <MaterialIcons name="add" size={21} color={colors.obsidian} />
        </Pressable>
      </View>

      <View style={styles.list}>
        {displayedTasks.length ? displayedTasks.map((task) => {
          const energyColor = task.energy === "high" ? colors.coral : colors.amber;
          return (
            <View key={task.id} style={styles.taskRow}>
              <Pressable onPress={() => onToggleTask(task.id)} style={({ pressed }) => [styles.checkbox, pressed && styles.pressed]}>
                <MaterialIcons name="radio-button-unchecked" size={21} color={colors.cyan} />
              </Pressable>
              <View style={styles.taskCopy}>
                <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                <Text style={styles.taskDetail} numberOfLines={1}>{task.detail}</Text>
              </View>
              <View style={[styles.energyDot, { backgroundColor: energyColor }]} />
              {!task.steps ? <Pressable onPress={() => onBreakFriction(task.id)} style={({ pressed }) => [styles.frictionButton, pressed && styles.pressed]}>
                <MaterialIcons name="auto-awesome" size={15} color={colors.cyan} />
                <Text style={styles.frictionText}>{t("فكّك", "Break")}</Text>
              </Pressable> : <MaterialIcons name="checklist" size={18} color={colors.emerald} />}
            </View>
          );
        }) : <View style={styles.empty}><MaterialIcons name="task-alt" size={22} color={colors.emerald} /><Text style={styles.emptyText}>{t("كل المهام الحرجة تحت السيطرة.", "Your critical tasks are under control.")}</Text></View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.glass, borderRadius: 22, borderWidth: 1, borderColor: "rgba(56,216,255,0.20)", padding: 15, gap: 13 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { color: colors.ink, fontSize: 18, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 10, marginTop: 3 },
  allButton: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 7, paddingVertical: 6, borderRadius: 9, backgroundColor: "rgba(56,216,255,0.10)" },
  allButtonText: { color: colors.cyan, fontSize: 10, fontWeight: "800" },
  quickAdd: { flexDirection: "row", alignItems: "center", gap: 8, padding: 6, borderRadius: 14, backgroundColor: colors.obsidian, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" },
  input: { flex: 1, minHeight: 34, paddingHorizontal: 8, color: colors.ink, fontSize: 12 },
  addButton: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.cyan },
  list: { gap: 8 },
  taskRow: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 9, paddingVertical: 8, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.035)" },
  checkbox: { width: 25, height: 25, alignItems: "center", justifyContent: "center" },
  taskCopy: { flex: 1, minWidth: 0 },
  taskTitle: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  taskDetail: { color: colors.muted, fontSize: 9, marginTop: 2 },
  energyDot: { width: 6, height: 24, borderRadius: 5 },
  frictionButton: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "rgba(56,216,255,0.38)" },
  frictionText: { color: colors.cyan, fontSize: 9, fontWeight: "900" },
  empty: { minHeight: 62, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  emptyText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
