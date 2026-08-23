package expo.modules.omnifocusdnd

import android.app.AlarmManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class OmniFocusDndModule : Module() {
  private fun manager(): NotificationManager? =
    appContext.reactContext?.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager

  private fun preferences() = appContext.reactContext?.getSharedPreferences("omni_focus_dnd", Context.MODE_PRIVATE)

  private fun context() = appContext.reactContext

  override fun definition() = ModuleDefinition {
    Name("OmniFocusDnd")

    AsyncFunction("isAvailableAsync") {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && manager() != null
    }

    AsyncFunction("hasPolicyAccessAsync") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) false else manager()?.isNotificationPolicyAccessGranted == true
    }

    AsyncFunction("requestPolicyAccessAsync") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return@AsyncFunction false
      val context = appContext.reactContext ?: return@AsyncFunction false
      context.startActivity(Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      true
    }

    AsyncFunction("setFocusDndAsync") { enabled: Boolean ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return@AsyncFunction false
      val notificationManager = manager() ?: return@AsyncFunction false
      if (!notificationManager.isNotificationPolicyAccessGranted) return@AsyncFunction false
      val preferences = preferences() ?: return@AsyncFunction false
      if (enabled) {
        if (!preferences.getBoolean("focus_active", false)) {
          preferences.edit().putInt("previous_filter", notificationManager.currentInterruptionFilter).putBoolean("focus_active", true).apply()
        }
        notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY)
      } else if (preferences.getBoolean("focus_active", false)) {
        notificationManager.setInterruptionFilter(preferences.getInt("previous_filter", NotificationManager.INTERRUPTION_FILTER_ALL))
        preferences.edit().remove("previous_filter").putBoolean("focus_active", false).apply()
      }
      true
    }

    AsyncFunction("schedulePersistentReminderAsync") { id: String, title: String, body: String, atMillis: Double, route: String, channelId: String, repeat: String ->
      val context = context() ?: return@AsyncFunction false
      if (atMillis.toLong() <= System.currentTimeMillis()) return@AsyncFunction false
      OmniReminderStore.schedule(context, OmniReminder(id, title, body, atMillis.toLong(), route, channelId, repeat))
      true
    }

    AsyncFunction("cancelPersistentReminderAsync") { id: String ->
      val context = context() ?: return@AsyncFunction false
      OmniReminderStore.cancel(context, id)
      true
    }

    AsyncFunction("getBackgroundReliabilityStatusAsync") {
      val context = context() ?: return@AsyncFunction mapOf("available" to false, "exactAlarmAllowed" to false, "batteryOptimizationIgnored" to false)
      val alarms = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
      val exactAllowed = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarms?.canScheduleExactAlarms() == true
      val power = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
      mapOf("available" to true, "exactAlarmAllowed" to exactAllowed, "batteryOptimizationIgnored" to (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && power?.isIgnoringBatteryOptimizations(context.packageName) == true))
    }

    AsyncFunction("openExactAlarmSettingsAsync") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@AsyncFunction false
      val context = context() ?: return@AsyncFunction false
      context.startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      true
    }

    AsyncFunction("openBatteryOptimizationSettingsAsync") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return@AsyncFunction false
      val context = context() ?: return@AsyncFunction false
      context.startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      true
    }
  }
}
