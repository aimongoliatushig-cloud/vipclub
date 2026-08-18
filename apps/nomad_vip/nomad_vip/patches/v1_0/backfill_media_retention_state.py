from __future__ import annotations

import json

import frappe
from frappe.utils import add_days, today

from nomad_vip.tasks.media_retention import media_retention_days


def execute():
	"""Hide non-consented media and queue retained references idempotently."""
	due_on = add_days(today(), media_retention_days())
	moved = 0
	queued = 0
	cancelled = 0
	conflicts = 0
	profiles = frappe.get_all(
		"VIP Entertainer Profile",
		filters={"media_consent_status": ["in", ["Denied", "Revoked"]]},
		fields=[
			"name",
			"profile_photo",
			"media_retention_file_url",
			"media_legal_hold",
			"media_retention_status",
			"media_retention_due_on",
		],
		limit_page_length=0,
	)
	for profile in profiles:
		values = {}
		retained_url = profile.media_retention_file_url
		if profile.profile_photo:
			if not retained_url:
				retained_url = profile.profile_photo
				values["media_retention_file_url"] = retained_url
				moved += 1
			elif retained_url != profile.profile_photo:
				# Preserve the older deletion reference; never expose the newer one.
				conflicts += 1
			values["profile_photo"] = None

		if not retained_url:
			if profile.media_retention_status != "Deleted":
				values.update(
					{
						"media_retention_status": "Not Queued",
						"media_retention_due_on": None,
						"media_retention_completed_at": None,
					}
				)
			if values:
				frappe.db.set_value(
					"VIP Entertainer Profile",
					profile.name,
					values,
					update_modified=False,
				)
			continue

		desired_status = "On Hold" if profile.media_legal_hold else "Queued"
		if profile.media_retention_status != desired_status:
			values["media_retention_status"] = desired_status
		if not profile.media_retention_due_on:
			values["media_retention_due_on"] = due_on
		if values:
			values["media_retention_completed_at"] = None
			frappe.db.set_value(
				"VIP Entertainer Profile",
				profile.name,
				values,
				update_modified=False,
			)
			queued += 1

	granted = frappe.get_all(
		"VIP Entertainer Profile",
		filters={"media_consent_status": "Granted"},
		fields=[
			"name",
			"media_retention_file_url",
			"media_legal_hold",
			"media_retention_status",
			"media_retention_due_on",
		],
		limit_page_length=0,
	)
	for profile in granted:
		values = {}
		if profile.media_retention_file_url:
			desired_status = "On Hold" if profile.media_legal_hold else "Queued"
			if profile.media_retention_status != desired_status:
				values["media_retention_status"] = desired_status
			if not profile.media_retention_due_on:
				values["media_retention_due_on"] = due_on
			if values:
				values["media_retention_completed_at"] = None
				queued += 1
		elif profile.media_retention_status in {"Queued", "On Hold"}:
			values = {
				"media_retention_status": "Not Queued",
				"media_retention_due_on": None,
				"media_retention_completed_at": None,
			}
			cancelled += 1
		if values:
			frappe.db.set_value(
				"VIP Entertainer Profile",
				profile.name,
				values,
				update_modified=False,
			)

	frappe.logger("nomad_vip.media_retention").info(
		json.dumps(
			{
				"event": "media_retention.backfill",
				"moved": moved,
				"queued": queued,
				"cancelled": cancelled,
				"conflicts": conflicts,
			},
			sort_keys=True,
		)
	)
