from __future__ import annotations

import os
import re
from collections.abc import Mapping


PASSWORD_ENV_PREFIX = "NOMAD_VIP_BOOTSTRAP_PASSWORD_"
MIN_PASSWORD_LENGTH = 16


class BootstrapPasswordError(ValueError):
	"""Raised when a bootstrap credential is missing or does not meet policy."""


def password_environment_name(email: str) -> str:
	"""Return the account-specific environment variable used during provisioning."""
	account_key = re.sub(r"[^A-Z0-9]+", "_", email.upper()).strip("_")
	return f"{PASSWORD_ENV_PREFIX}{account_key}"


def get_bootstrap_password(
	email: str,
	*,
	environment: Mapping[str, str] | None = None,
	required: bool = False,
) -> str | None:
	"""Read and validate a one-time bootstrap password without logging its value."""
	environment = environment or os.environ
	environment_name = password_environment_name(email)
	password = environment.get(environment_name)
	if not password:
		if required:
			raise BootstrapPasswordError(
				f"Set {environment_name} to provision this account; no default password is available."
			)
		return None

	checks = (
		len(password) >= MIN_PASSWORD_LENGTH,
		any(character.islower() for character in password),
		any(character.isupper() for character in password),
		any(character.isdigit() for character in password),
		any(not character.isalnum() for character in password),
	)
	if not all(checks):
		raise BootstrapPasswordError(
			f"{environment_name} must be at least {MIN_PASSWORD_LENGTH} characters and include "
			"upper-case, lower-case, numeric, and symbol characters."
		)
	return password


def bootstrap_user_fields(
	email: str,
	*,
	environment: Mapping[str, str] | None = None,
	required: bool = False,
) -> dict[str, object]:
	"""Build fail-closed fields for first-time User provisioning."""
	password = get_bootstrap_password(email, environment=environment, required=required)
	if not password:
		return {"enabled": 0, "send_welcome_email": 0}
	return {
		"enabled": 1,
		"send_welcome_email": 0,
		"new_password": password,
	}
