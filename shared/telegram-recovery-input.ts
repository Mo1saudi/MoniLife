const arabicIndicDigits = "٠١٢٣٤٥٦٧٨٩";
const easternArabicIndicDigits = "۰۱۲۳۴۵۶۷۸۹";

function toAsciiDigit(character: string) {
  const arabicIndex = arabicIndicDigits.indexOf(character);
  if (arabicIndex >= 0) return String(arabicIndex);
  const easternIndex = easternArabicIndicDigits.indexOf(character);
  if (easternIndex >= 0) return String(easternIndex);
  return character;
}

/** Converts common Telegram text variations into the canonical YYYY-MM-DD birth-date format. */
export function normalizeBirthDateInput(value: string) {
  return Array.from(value.normalize("NFKC"), toAsciiDigit)
    .join("")
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/\s+/g, "")
    .trim();
}

/** Returns the canonical date only when it is a real past calendar date. */
export function parseBirthDateInput(value: string) {
  const normalized = normalizeBirthDateInput(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed >= new Date()) return null;
  if (parsed.toISOString().slice(0, 10) !== normalized) return null;
  return normalized;
}
