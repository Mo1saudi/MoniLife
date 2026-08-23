const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

export function normalizeContactPhone(value: string | undefined | null) {
  if (!value) return "";
  const westernized = value.replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit))).replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)));
  const hasPlus = westernized.trim().startsWith("+");
  const digits = westernized.replace(/\D/g, "");
  return digits ? `${hasPlus ? "+" : ""}${digits}` : "";
}

export function pickPreferredPhone(numbers: Array<{ number?: string | null; digits?: string | null; isPrimary?: boolean | null }> | null | undefined) {
  const preferred = numbers?.find((phone) => phone.isPrimary && normalizeContactPhone(phone.number ?? phone.digits)) ?? numbers?.find((phone) => normalizeContactPhone(phone.number ?? phone.digits));
  return normalizeContactPhone(preferred?.number ?? preferred?.digits);
}
