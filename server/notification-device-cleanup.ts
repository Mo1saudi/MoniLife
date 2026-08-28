export type NotificationDeviceCleanupRecord = {
  id: number;
  manualEmail?: string | null;
  userId?: number | null;
  lastSeenAt?: Date | string | null;
};

function accountKey(device: NotificationDeviceCleanupRecord) {
  if (device.manualEmail) return `manual:${device.manualEmail.trim().toLowerCase()}`;
  if (device.userId) return `oauth:${device.userId}`;
  // A device without an account identity must never be grouped with another device.
  return `unassigned:${device.id}`;
}

function lastSeenTimestamp(device: NotificationDeviceCleanupRecord) {
  const timestamp = device.lastSeenAt ? new Date(device.lastSeenAt).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

/** Keeps one most-recent device per account and returns only older active devices to disable. */
export function planNotificationDeviceCleanup(devices: NotificationDeviceCleanupRecord[]) {
  const byAccount = new Map<string, NotificationDeviceCleanupRecord[]>();
  for (const device of devices) {
    const key = accountKey(device);
    byAccount.set(key, [...(byAccount.get(key) ?? []), device]);
  }

  const preservedDeviceIds: number[] = [];
  const disableDeviceIds: number[] = [];
  for (const group of byAccount.values()) {
    const newestFirst = [...group].sort((left, right) => {
      const seenDifference = lastSeenTimestamp(right) - lastSeenTimestamp(left);
      return seenDifference || right.id - left.id;
    });
    const [newest, ...older] = newestFirst;
    if (newest) preservedDeviceIds.push(newest.id);
    disableDeviceIds.push(...older.map((device) => device.id));
  }

  return {
    activeDeviceCount: devices.length,
    accountCount: byAccount.size,
    preservedDeviceIds,
    disableDeviceIds,
  };
}
