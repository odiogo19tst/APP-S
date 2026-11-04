"""Check the final merged manifest of a Jarvis test APK, including library components."""
import argparse
from pathlib import Path
import xml.etree.ElementTree as ET

ANDROID = "{http://schemas.android.com/apk/res/android}"
TOOLS = "{http://schemas.android.com/tools}"
PACKAGES = {
    "headunit": "io.github.odiogo19tst.carlink.jarvis.hudtest",
    "phone": "io.github.odiogo19tst.jarvis.phone",
}
FORBIDDEN_PERMISSIONS = {
    "android.permission.READ_SMS", "android.permission.RECEIVE_SMS",
    "android.permission.SEND_SMS", "android.permission.READ_CALL_LOG",
    "android.permission.WRITE_CALL_LOG", "android.permission.QUERY_ALL_PACKAGES",
    "android.permission.REQUEST_INSTALL_PACKAGES",
    "android.permission.BIND_ACCESSIBILITY_SERVICE",
    "android.permission.BIND_NOTIFICATION_LISTENER_SERVICE",
}
FORBIDDEN_BINDINGS = {
    "android.permission.BIND_ACCESSIBILITY_SERVICE",
    "android.permission.BIND_NOTIFICATION_LISTENER_SERVICE",
}
FORBIDDEN_ACTIONS = {
    "android.accessibilityservice.AccessibilityService",
    "android.service.notification.NotificationListenerService",
}
PHONE_PERMISSIONS = {
    "android.permission.BLUETOOTH", "android.permission.BLUETOOTH_CONNECT",
}

def violations(root, target):
    errors = []
    if root.get("package") != PACKAGES[target]:
        errors.append("Unexpected package identity for " + target)
    for node in root.iter():
        if any(name.startswith(TOOLS) for name in node.attrib):
            errors.append("Expected a merged manifest, found manifest-merger instructions")
        name = node.get(ANDROID + "name", "")
        if node.tag.startswith("uses-permission"):
            if name in FORBIDDEN_PERMISSIONS:
                errors.append("Forbidden permission: " + name)
            if target == "phone" and name not in PHONE_PERMISSIONS:
                errors.append("Unexpected phone permission: " + name)
        if node.get(ANDROID + "permission") in FORBIDDEN_BINDINGS:
            errors.append("Sensitive bound component: " + name)
        if node.tag == "action" and name in FORBIDDEN_ACTIONS:
            errors.append("Sensitive service action: " + name)
        if node.tag == "meta-data" and name == "android.accessibilityservice":
            errors.append("Accessibility metadata remains")
        if target == "phone" and node.tag in {"service", "receiver", "provider", "activity-alias"}:
            errors.append("Unexpected phone component: " + name)
        if target == "phone" and node.tag == "activity" and name != PACKAGES[target] + ".PhoneActivity":
            errors.append("Unexpected phone activity: " + name)
    return sorted(set(errors))

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target", choices=PACKAGES, required=True)
    parser.add_argument("--manifest", type=Path)
    args = parser.parse_args()
    manifest = args.manifest
    if manifest is None:
        module = "app" if args.target == "headunit" else "jarvis-phone"
        candidates = list(Path(module, "build", "intermediates", "merged_manifests").glob("debug/*/AndroidManifest.xml"))
        if len(candidates) != 1:
            parser.error("Expected exactly one final merged debug manifest; use --manifest to select it")
        manifest = candidates[0]
    errors = violations(ET.parse(manifest).getroot(), args.target)
    if errors:
        raise SystemExit("\n".join(errors))
    print("Merged manifest permission contract passed: " + args.target)

if __name__ == "__main__":
    main()
