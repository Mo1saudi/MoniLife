package expo.modules.omnifocusdnd

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class OmniBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      Intent.ACTION_BOOT_COMPLETED,
      Intent.ACTION_LOCKED_BOOT_COMPLETED,
      Intent.ACTION_MY_PACKAGE_REPLACED -> OmniReminderStore.rescheduleAfterBoot(context)
    }
  }
}
