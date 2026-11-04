import importlib.util
from pathlib import Path
import unittest
import xml.etree.ElementTree as ET

script = Path(__file__).resolve().parents[1] / "jarvis_manifest_contract.py"
spec = importlib.util.spec_from_file_location("manifest_contract", script)
contract = importlib.util.module_from_spec(spec)
spec.loader.exec_module(contract)

class ManifestContractTest(unittest.TestCase):
    def manifest(self, body="", target="headunit"):
        return ET.fromstring('<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="' + contract.PACKAGES[target] + '">' + body + '</manifest>')

    def test_transitive_sensitive_services_are_rejected(self):
        for permission, action in zip(sorted(contract.FORBIDDEN_BINDINGS), sorted(contract.FORBIDDEN_ACTIONS)):
            body = '<application><service android:name="library.Service" android:permission="' + permission + '"><intent-filter><action android:name="' + action + '" /></intent-filter></service></application>'
            self.assertTrue(contract.violations(self.manifest(body), "headunit"))

    def test_transitive_install_permission_is_rejected(self):
        body = '<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />'
        self.assertTrue(contract.violations(self.manifest(body), "headunit"))

    def test_phone_does_not_inherit_central_privileges_or_components(self):
        for body in ['<uses-permission android:name="android.permission.RECORD_AUDIO" />',
                     '<application><service android:name="library.Service" /></application>']:
            self.assertTrue(contract.violations(self.manifest(body, "phone"), "phone"))

    def test_expected_phone_bluetooth_and_launcher_are_accepted(self):
        body = '<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" /><application><activity android:name="io.github.odiogo19tst.jarvis.phone.PhoneActivity" android:exported="true" /></application>'
        self.assertEqual([], contract.violations(self.manifest(body, "phone"), "phone"))

    def test_source_removal_markers_cannot_pass_as_merged_evidence(self):
        root = ET.fromstring('<manifest xmlns:tools="http://schemas.android.com/tools" package="' + contract.PACKAGES["headunit"] + '"><service tools:node="remove" /></manifest>')
        self.assertTrue(contract.violations(root, "headunit"))

    def test_wrong_apk_identity_is_rejected(self):
        self.assertTrue(contract.violations(self.manifest(target="phone"), "headunit"))

if __name__ == "__main__":
    unittest.main()
