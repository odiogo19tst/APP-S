package com.shilapi.xcertplay

import android.accessibilityservice.AccessibilityService
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Settings

// CarLink: optional services must exist in the host manifest before offering or granting them.
/** Host apps may deliberately omit optional services from their merged manifest. */
internal object AccessibilityServiceAvailability {
    fun isAvailable(context: Context, service: Class<out AccessibilityService>): Boolean = runCatching {
        val component = ComponentName(context, service)
        val manager = context.packageManager
        val info = manager.getServiceInfo(component, PackageManager.MATCH_DISABLED_COMPONENTS)
        val enabled = when (manager.getComponentEnabledSetting(component)) {
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED -> true
            PackageManager.COMPONENT_ENABLED_STATE_DEFAULT -> info.enabled
            else -> false
        }
        enabled && info.applicationInfo.enabled &&
            info.permission == android.Manifest.permission.BIND_ACCESSIBILITY_SERVICE
    }.getOrDefault(false)

    private val screens = listOf(
        ComponentName("com.byd.systemsettings", "com.byd.systemsettings.accessibility.AccessibilityMainActivity"),
        ComponentName("com.android.settings", "com.android.settings.Settings\$AccessibilitySettingsActivity"),
    )

    fun openSettings(context: Context, service: Class<out AccessibilityService>): Boolean {
        if (!isAvailable(context, service)) return false
        return (listOf(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) + screens.map { Intent().setComponent(it) })
            .any { intent ->
                runCatching {
                    context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                    true
                }.getOrDefault(false)
            }
    }
}
