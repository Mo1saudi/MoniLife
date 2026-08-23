package expo.modules.omnifocusdnd

import android.Manifest
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

class OmniReminderReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
    val id = intent.getStringExtra("id") ?: return
    val route = intent.getStringExtra("route") ?: ""
    val openIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
      data = Uri.parse(route)
      flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
    }
    val contentIntent = openIntent?.let { PendingIntent.getActivity(context, id.hashCode() and 0x7fffffff, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE) }
    val notification = NotificationCompat.Builder(context, intent.getStringExtra("channelId") ?: "omni-life-high-priority")
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle(intent.getStringExtra("title") ?: "OMNI LIFE")
      .setContentText(intent.getStringExtra("body") ?: "")
      .setStyle(NotificationCompat.BigTextStyle().bigText(intent.getStringExtra("body") ?: ""))
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_REMINDER)
      .setAutoCancel(true)
      .setContentIntent(contentIntent)
      .build()
    (context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager)?.notify(id.hashCode() and 0x7fffffff, notification)
    OmniReminderStore.markDelivered(context, id)
  }
}
