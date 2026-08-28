/** Deterministic rotation keeps repeated reminders varied without relying on random device state. */
export function notificationRotationIndex(seed: string | number | Date, count: number) {
  if (count <= 1) return 0;
  const value = seed instanceof Date ? seed.toISOString() : String(seed);
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % count;
}

export function pickNotificationVariation<T>(items: readonly T[], seed: string | number | Date): T {
  if (!items.length) throw new Error("A notification variation needs at least one choice.");
  return items[notificationRotationIndex(seed, items.length)] as T;
}
