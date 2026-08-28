const ANDROID_HEX_COLOR = /^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/;

/**
 * Android/Expo accepts opaque RGB or ARGB hex values for notification colors.
 * Keep this boundary strict: CSS names, rgba(), shorthand hex, and undefined
 * must never reach native notification APIs.
 */
export function normalizeAndroidNotificationColor(value: unknown, fallback?: string): string | undefined {
  const candidate = typeof value === "string" ? value.trim() : "";
  if (ANDROID_HEX_COLOR.test(candidate)) return candidate;
  const safeFallback = typeof fallback === "string" ? fallback.trim() : "";
  return ANDROID_HEX_COLOR.test(safeFallback) ? safeFallback : undefined;
}

export function isAndroidNotificationColor(value: unknown): value is string {
  return normalizeAndroidNotificationColor(value) !== undefined;
}
