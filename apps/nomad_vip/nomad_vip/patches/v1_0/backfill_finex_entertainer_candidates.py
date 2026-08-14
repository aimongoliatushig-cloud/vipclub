import frappe


def execute():
	from nomad_vip.api.entertainer_roster import reconcile_finex_entertainer_candidates

	reconcile_finex_entertainer_candidates()
