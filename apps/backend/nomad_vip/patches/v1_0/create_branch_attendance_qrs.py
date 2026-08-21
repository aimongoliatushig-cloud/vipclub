from __future__ import annotations

import frappe

from nomad_vip.api.attendance import VIP_BRANCHES, _ensure_config


def execute():
	for branch in VIP_BRANCHES:
		if frappe.db.exists("Branch", branch):
			_ensure_config(branch)
