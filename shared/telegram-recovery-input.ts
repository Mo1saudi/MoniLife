const arabicIndicDigits = "٠١٢٣٤٥٦٧٨٩";
const easternArabicIndicDigits = "۰۱۲۳۴۵۶۷۸۹";

function toAsciiDigit(character: string) {
  const arabicIndex = arabicIndicDigits.indexOf(character);
  if (arabicIndex >= 0) return String(arabicIndex);
  const easternIndex = easternArabicIndicDigits.indexOf(character);
  if (easternIndex >= 0) return String(easternIndex);
  return character;
}

/** Converts Arabic, Eastern Arabic, and full-width digits to an ASCII numeric value. */
export function normalizeNumericInput(value: string) {
  return Array.from(value.normalize("NFKC"), toAsciiDigit)
    .join("")
    .replace(/\s+/g, "")
    .trim();
}

/** Converts common Telegram text variations into the canonical YYYY-MM-DD birth-date format. */
export function normalizeBirthDateInput(value: string) {
  return normalizeNumericInput(value)
    .replace(/[‐‑‒–—−]/g, "-")
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

/** Accepts Arabic, Eastern Arabic, full-width, and ASCII digits for a realistic user age. */
export function parseAgeInput(value: string) {
  const normalized = normalizeNumericInput(value);
  if (!/^\d{1,3}$/.test(normalized)) return null;
  const age = Number(normalized);
  return Number.isInteger(age) && age >= 13 && age <= 120 ? age : null;
}

/** Calculates the current age from the legacy exact birth date stored by older accounts. */
export function calculateAgeFromBirthDate(value: string | null | undefined, now = new Date()) {
  const birthDate = value ? parseBirthDateInput(value) : null;
  if (!birthDate) return null;
  const [year, month, day] = birthDate.split("-").map(Number);
  let age = now.getUTCFullYear() - year;
  const birthdayNotReached = now.getUTCMonth() + 1 < month || (now.getUTCMonth() + 1 === month && now.getUTCDate() < day);
  if (birthdayNotReached) age -= 1;
  return age >= 0 && age <= 120 ? age : null;
}
