/**
 * Extracts the canonical Telegram link code from a deep-link command or direct user input.
 * Telegram may deliver the deep link as `/start link_CODE`; users may also paste CODE or link_CODE.
 */
export function extractTelegramLinkCode(text: string) {
  const normalized = text.normalize("NFKC").replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
  const deepLinkMatch = normalized.match(/^\/start(?:@\w+)?\s+link[_-]?([A-F0-9]{10})$/i);
  if (deepLinkMatch) return deepLinkMatch[1].toUpperCase();
  const directInput = normalized.replace(/\s+/g, "");
  const directMatch = directInput.match(/^(?:link[_-]?)?([A-F0-9]{10})$/i);
  return directMatch?.[1]?.toUpperCase() ?? null;
}

export function isTelegramLinkCode(value: string) {
  return /^[A-F0-9]{10}$/.test(value);
}
