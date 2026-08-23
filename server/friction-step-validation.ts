function normalize(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/[«»“”"'`،,.;:!?()[\]{}\-_/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contextWords(value: string) {
  return [...new Set(normalize(value).split(" ").filter((word) => word.length >= 4))].slice(0, 10);
}

export function areTaskSpecificFrictionSteps(steps: string[], title: string, detail = "") {
  const normalizedTitle = normalize(title);
  if (!normalizedTitle || steps.length !== 3) return false;

  const normalizedSteps = steps.map(normalize);
  if (new Set(normalizedSteps).size !== 3) return false;

  const detailWords = contextWords(detail);
  if (detailWords.length > 0) return normalizedSteps.filter((step) => detailWords.some((word) => step.includes(word))).length >= 2;
  const titleWords = contextWords(title);
  return normalizedSteps.filter((step) => titleWords.some((word) => step.includes(word))).length >= 2;
}
