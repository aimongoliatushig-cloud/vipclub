from __future__ import annotations

import unittest

from nomad_vip.provisioning import (
	BootstrapPasswordError,
	bootstrap_user_fields,
	password_environment_name,
)


class TestBootstrapCredentials(unittest.TestCase):
	def test_environment_name_is_account_specific(self):
		self.assertEqual(
			password_environment_name("manager.sapphire@vipclub.local"),
			"NOMAD_VIP_BOOTSTRAP_PASSWORD_MANAGER_SAPPHIRE_VIPCLUB_LOCAL",
		)

	def test_missing_secret_creates_disabled_account(self):
		fields = bootstrap_user_fields("manager.sapphire@vipclub.local", environment={})
		self.assertEqual(fields, {"enabled": 0, "send_welcome_email": 0})

	def test_required_secret_fails_closed(self):
		with self.assertRaises(BootstrapPasswordError):
			bootstrap_user_fields("demo.anu@vipclub.local", environment={}, required=True)

	def test_weak_secret_is_rejected(self):
		name = password_environment_name("admin@vipclub.local")
		with self.assertRaises(BootstrapPasswordError):
			bootstrap_user_fields("admin@vipclub.local", environment={name: "weak"})

	def test_valid_secret_is_forwarded_without_a_default(self):
		name = password_environment_name("admin@vipclub.local")
		fields = bootstrap_user_fields(
			"admin@vipclub.local",
			environment={name: "Unique-Admin-Secret-2026!"},
		)
		self.assertEqual(fields["enabled"], 1)
		self.assertEqual(fields["new_password"], "Unique-Admin-Secret-2026!")


if __name__ == "__main__":
	unittest.main()
