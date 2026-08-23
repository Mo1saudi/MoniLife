export const OMNI_APP_DATA_PREFIX = "omni-life:";

/** Returns true only for resettable OMNI LIFE app-data keys, never account/session keys. */
export function isOmniAppDataStorageKey(key: string | null | undefined) {
  return Boolean(key?.startsWith(OMNI_APP_DATA_PREFIX));
}
