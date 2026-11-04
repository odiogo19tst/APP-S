package com.shilapi.xcertplay

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.pm.ServiceInfo
import org.robolectric.Shadows.shadowOf

// CarLink: Config.NONE fixtures must explicitly describe capabilities the host includes.
internal fun declareAccessibilityService(context: Context, service: Class<out AccessibilityService>) {
    shadowOf(context.packageManager).addOrUpdateService(ServiceInfo().apply {
        name = service.name
        packageName = context.packageName
        applicationInfo = context.applicationInfo
        enabled = true
        permission = android.Manifest.permission.BIND_ACCESSIBILITY_SERVICE
    })
}

