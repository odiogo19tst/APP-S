package com.shilapi.xcertplay

import android.content.ComponentName
import android.content.pm.PackageManager
import android.provider.Settings
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.Switch
import android.widget.TextView
import com.shilapi.xcertplay.adb.LocalAdb
import com.shilapi.xcertplay.host.R
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

/** CarLink: omitting a capability must prevent all attempts to authorize or advertise it. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [29], manifest = Config.NONE, qualifiers = "en")
class AccessibilityServiceAvailabilityTest {
    private val context get() = RuntimeEnvironment.getApplication()

    @Before fun omitServicesFromHost() {
        // CarLink: AGP's binary test resources can include the library manifest even with
        // Config.NONE. Model the host's merged removals explicitly before testing absence.
        val manager = shadowOf(context.packageManager)
        manager.removeService(ComponentName(context, WheelKeyService::class.java))
        manager.removeService(ComponentName(context, UsbAutoConfirmService::class.java))
    }

    @Test fun declarationAndEnabledStateAreRequired() {
        assertFalse(WheelKeyService.isAvailable(context))
        declareAccessibilityService(context, WheelKeyService::class.java)
        assertTrue(WheelKeyService.isAvailable(context))
        context.packageManager.setComponentEnabledSetting(
            ComponentName(context, WheelKeyService::class.java),
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP,
        )
        assertFalse(WheelKeyService.isAvailable(context))
    }

    @Test fun absentWheelServiceDoesNotInvokeShellOrRestoreStaleAuthorization() {
        val other = "other.package/.Service"
        Settings.Secure.putString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
            "$other:${ComponentName(context, WheelKeyService::class.java).flattenToString()}")
        WheelZoomSettings.setEnabled(context, true)
        val original = Settings.Secure.getString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)
        var commands = 0
        assertFalse(WheelKeyService.applyServiceSettings(context, { commands++; "unexpected" }))
        assertEquals(0, commands)
        assertEquals(LocalAdb.Access.UNSUPPORTED, WheelKeyService.enableOverAdb(context))
        assertFalse(WheelKeyService.needsRestore(context))
        assertFalse(WheelKeyService.enabledInSettings(context))
        WheelKeyService.restoreIfNeeded(context)
        assertEquals(original, Settings.Secure.getString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES))
        assertFalse(WheelKeyService.openSettings(context))
        assertNull(shadowOf(context).nextStartedActivity)
    }

    @Test fun absentUsbServiceNeverCreatesAnAdbClientOrOpensSettings() {
        Settings.Secure.putString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
            ComponentName(context, UsbAutoConfirmService::class.java).flattenToString())
        var clients = 0
        val result = UsbPermissionSetup.Operation(context, {
            clients++
            error("An absent service must never create an ADB client")
        }).run()
        assertEquals(0, clients)
        assertEquals(LocalAdb.Access.UNSUPPORTED, result.access)
        assertFalse(result.complete)
        assertFalse(UsbAutoConfirmService.isEnabled(context))
        assertFalse(UsbAutoConfirmService.openSettings(context))
        assertNull(shadowOf(context).nextStartedActivity)
    }

    @Test fun availableUsbServiceKeepsExistingAuthorizationSemantics() {
        declareAccessibilityService(context, UsbAutoConfirmService::class.java)
        Settings.Secure.putString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
            ComponentName(context, UsbAutoConfirmService::class.java).flattenToString())
        Settings.Secure.putInt(context.contentResolver, Settings.Secure.ACCESSIBILITY_ENABLED, 1)
        assertTrue(UsbAutoConfirmService.isAvailable(context))
        assertTrue(UsbPermissionSetup.Permission.ACCESSIBILITY.granted(context))
    }

    @Test fun absentServicesHaveNoGrantButtonsWhileIndependentControllerRemains() {
        val activity = Robolectric.buildActivity(DiPlayActivity::class.java).get()
        activity.setTheme(android.R.style.Theme_Material_NoActionBar)
        for (method in listOf("usbAccessibilityControls", "navigationWheelControls", "wheelKeyServiceControls")) {
            val card = controls(activity, method)
            assertTrue(views(card).filterIsInstance<TextView>().any {
                it.text.toString() == activity.getString(R.string.carlink_accessibility_unavailable)
            })
            assertFalse(views(card).any { it is Button || it is Switch })
        }
        val wheelCard = controls(activity, "wheelKeysSettings")
        val switches = views(wheelCard).filterIsInstance<Switch>()
        assertEquals(1, switches.size)
        assertEquals(activity.getString(R.string.settings_external_controller), switches.single().contentDescription)
    }

    private fun controls(activity: DiPlayActivity, method: String): LinearLayout =
        LinearLayout(activity).also { card ->
            DiPlayActivity::class.java.getDeclaredMethod(method, LinearLayout::class.java)
                .apply { isAccessible = true }.invoke(activity, card)
        }

    private fun views(root: View): List<View> = listOf(root) +
        if (root is ViewGroup) (0 until root.childCount).flatMap { views(root.getChildAt(it)) } else emptyList()
}

