import { NativeModule, requireOptionalNativeModule } from 'expo';

declare class OmniFocusDndModule extends NativeModule {
  isAvailableAsync(): Promise<boolean>;
  hasPolicyAccessAsync(): Promise<boolean>;
  requestPolicyAccessAsync(): Promise<boolean>;
  setFocusDndAsync(enabled: boolean): Promise<boolean>;
  schedulePersistentReminderAsync(id: string, title: string, body: string, atMillis: number, route: string, channelId: string, repeat: string): Promise<boolean>;
  cancelPersistentReminderAsync(id: string): Promise<boolean>;
  getBackgroundReliabilityStatusAsync(): Promise<{ available: boolean; exactAlarmAllowed: boolean; batteryOptimizationIgnored: boolean }>;
  openExactAlarmSettingsAsync(): Promise<boolean>;
  openBatteryOptimizationSettingsAsync(): Promise<boolean>;
}

// Some managed Android builds do not include this optional custom bridge.
// Returning null lets the app use its existing unavailable/fallback behavior
// instead of terminating during startup.
export default requireOptionalNativeModule<OmniFocusDndModule>('OmniFocusDnd');
