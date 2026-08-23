# Android Focus Do Not Disturb Reference

OMNI LIFE’s Android-only focus Do Not Disturb bridge checks `NotificationManager.isNotificationPolicyAccessGranted()`, sends the user to `Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS` for explicit approval, then uses the priority interruption filter during the active focus phase and restores the saved prior filter for breaks or exit. The feature is deliberately unavailable on web and iOS, and it requires a rebuilt custom Android binary after native module changes.

Source: [Android `NotificationManager` API reference](https://developer.android.com/reference/android/app/NotificationManager), retrieved 2026-08-19. The reference documents `isNotificationPolicyAccessGranted()`, `setInterruptionFilter(int)`, `ACTION_NOTIFICATION_POLICY_ACCESS_GRANTED_CHANGED`, and interruption-filter constants including `INTERRUPTION_FILTER_PRIORITY` and `INTERRUPTION_FILTER_ALL`.
