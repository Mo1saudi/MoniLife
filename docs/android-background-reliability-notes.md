# Android Background Reliability Decisions

OMNI LIFE must not attempt to bypass Android Doze, App Standby, or foreground-service restrictions. The reliability layer therefore uses exact alarms only for user-visible, user-scheduled reminders; restarts saved schedules on boot or package replacement; relies on existing high-priority user-visible push notifications for time-sensitive remote campaigns; and treats battery-optimization guidance as explicit, revocable user choice rather than an automatic exemption.

The Android `AlarmManager` guidance states that alarms can trigger outside the app process and that alarms are cancelled on device shutdown, requiring `RECEIVE_BOOT_COMPLETED` and a boot receiver for restoration. Exact alarms require a user-facing precise-timing use case and, on Android 12+, an applicable exact-alarm special access. Android’s Doze guidance explains that standard alarms, background jobs, syncs, and network access can be deferred; `setAndAllowWhileIdle()` / `setExactAndAllowWhileIdle()` are limited and should be reserved for critical user-visible timing. Android also restricts foreground-service starts from the background on Android 12+, and applies additional Android 14 rules to types requiring while-in-use permissions.

For this app, generic data sync does **not** start a persistent foreground service. Any future foreground service must be a user-initiated, visibly-notified task and comply with its declared type. The requested battery-optimization permission is retained only for a settings link to system optimization settings; OMNI LIFE does not automatically request direct exemption because Google Play policy limits that flow to narrowly justified core use cases.

Sources retrieved 2026-08-19:

1. [Android Developers — Schedule alarms](https://developer.android.com/develop/background-work/services/alarms)
2. [Android Developers — Restrictions on starting a foreground service from the background](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start)
3. [Android Developers — Optimize for Doze and App Standby](https://developer.android.com/training/monitoring-device-state/doze-standby)
