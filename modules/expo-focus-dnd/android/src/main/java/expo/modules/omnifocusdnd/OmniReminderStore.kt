package expo.modules.omnifocusdnd

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import java.util.Calendar
import org.json.JSONArray
import org.json.JSONObject

data class OmniReminder(val id: String, val title: String, val body: String, val atMillis: Long, val route: String, val channelId: String, val repeat: String = "once")

object OmniReminderStore {
  private const val PREFS = "omni_background_reminders"
  private const val KEY_ITEMS = "items"

  private fun requestCode(id: String) = id.hashCode() and 0x7fffffff

  private fun alarmIntent(context: Context, reminder: OmniReminder): PendingIntent {
    val intent = Intent(context, OmniReminderReceiver::class.java).apply {
      action = "expo.modules.omnifocusdnd.REMINDER.${reminder.id}"
      putExtra("id", reminder.id)
      putExtra("title", reminder.title)
      putExtra("body", reminder.body)
      putExtra("route", reminder.route)
      putExtra("channelId", reminder.channelId)
    }
    return PendingIntent.getBroadcast(context, requestCode(reminder.id), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  private fun read(context: Context): MutableList<OmniReminder> {
    val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_ITEMS, "[]") ?: "[]"
    return try {
      val items = JSONArray(raw)
      MutableList(items.length()) { index ->
        val item = items.getJSONObject(index)
        OmniReminder(item.getString("id"), item.getString("title"), item.getString("body"), item.getLong("atMillis"), item.optString("route"), item.getString("channelId"), item.optString("repeat", "once"))
      }
    } catch (_: Exception) { mutableListOf() }
  }

  private fun write(context: Context, reminders: List<OmniReminder>) {
    val array = JSONArray()
    reminders.forEach { reminder -> array.put(JSONObject().apply {
      put("id", reminder.id); put("title", reminder.title); put("body", reminder.body); put("atMillis", reminder.atMillis); put("route", reminder.route); put("channelId", reminder.channelId); put("repeat", reminder.repeat)
    }) }
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_ITEMS, array.toString()).apply()
  }

  fun schedule(context: Context, reminder: OmniReminder) {
    cancel(context, reminder.id, false)
    val manager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
    val pendingIntent = alarmIntent(context, reminder)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && manager.canScheduleExactAlarms()) {
      manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, reminder.atMillis, pendingIntent)
    } else {
      manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, reminder.atMillis, pendingIntent)
    }
    val next = read(context).filter { it.id != reminder.id && (it.atMillis > System.currentTimeMillis() || it.repeat != "once") }.toMutableList()
    next.add(reminder)
    write(context, next)
  }

  fun cancel(context: Context, id: String, remove: Boolean = true) {
    val manager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
    val placeholder = OmniReminder(id, "", "", 0L, "", "omni-life-high-priority")
    manager?.cancel(alarmIntent(context, placeholder))
    if (remove) write(context, read(context).filter { it.id != id })
  }

  fun markDelivered(context: Context, id: String) {
    val reminder = read(context).firstOrNull { it.id == id } ?: return
    if (reminder.repeat == "once") { write(context, read(context).filter { it.id != id }); return }
    schedule(context, nextOccurrence(reminder, true))
  }

  private fun nextOccurrence(reminder: OmniReminder, afterDelivery: Boolean): OmniReminder {
    val calendar = Calendar.getInstance().apply { timeInMillis = reminder.atMillis }
    fun advance() = when (reminder.repeat) {
      "daily" -> calendar.add(Calendar.DAY_OF_YEAR, 1)
      "weekly" -> calendar.add(Calendar.WEEK_OF_YEAR, 1)
      "monthly" -> calendar.add(Calendar.MONTH, 1)
      "yearly" -> calendar.add(Calendar.YEAR, 1)
      else -> Unit
    }
    if (afterDelivery) advance()
    while (calendar.timeInMillis <= System.currentTimeMillis()) advance()
    return reminder.copy(atMillis = calendar.timeInMillis)
  }

  fun rescheduleAfterBoot(context: Context) {
    val future = read(context).filter { it.atMillis > System.currentTimeMillis() || it.repeat != "once" }.map { reminder -> if (reminder.repeat == "once") reminder else nextOccurrence(reminder, false) }
    write(context, future)
    future.forEach { reminder ->
      val manager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return@forEach
      val pendingIntent = alarmIntent(context, reminder)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && manager.canScheduleExactAlarms()) manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, reminder.atMillis, pendingIntent)
      else manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, reminder.atMillis, pendingIntent)
    }
  }
}
