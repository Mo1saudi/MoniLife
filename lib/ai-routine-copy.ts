export type OmniAiRoutineCopy = Partial<Record<"morning" | "task" | "finance" | "ideas" | "evening" | "habit", string[]>>;

export function selectOmniAiRoutineCopy(aiCopy: OmniAiRoutineCopy, kind: keyof OmniAiRoutineCopy, offset: number, fallback: string) {
  const options = aiCopy[kind]?.filter((item) => item.trim().length > 0) ?? [];
  return options.length > 0 ? options[offset % options.length] : fallback;
}
