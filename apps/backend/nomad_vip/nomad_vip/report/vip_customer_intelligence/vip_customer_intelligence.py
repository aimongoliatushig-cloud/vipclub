import frappe
from frappe import _
from frappe.utils import flt, getdate, nowdate


def _require_report_access():
	roles = set(frappe.get_roles())
	if frappe.session.user == "Administrator" or roles.intersection({"System Manager", "CEO"}):
		return
	frappe.throw(_("Энэ тайланг харах эрхгүй байна."), frappe.PermissionError)


def execute(filters=None):
	_require_report_access()
	filters = frappe._dict(filters or {})
	from_date = getdate(filters.get("from_date"))
	to_date = getdate(filters.get("to_date"))
	if from_date > to_date:
		frappe.throw(_("From Date cannot be after To Date"))

	conditions = ["b.posting_date between %(from_date)s and %(to_date)s", "b.customer is not null"]
	params = {"from_date": from_date, "to_date": to_date}
	if filters.get("branch"):
		conditions.append("b.store_name like %(branch_pattern)s")
		params["branch_pattern"] = f"%{filters.branch}%"

	rows = frappe.db.sql(
		f"""
		select
			b.customer,
			c.customer_name,
			c.custom_finex_phone phone,
			c.custom_primary_branch primary_branch,
			c.custom_visited_branches visited_branches,
			count(distinct concat(b.posting_date, ':', b.store_id)) visit_count,
			count(*) bill_count,
			sum(case when b.is_paid = 1 and b.bill_type = 2 then -b.total_amount
			         when b.is_paid = 1 then b.total_amount else 0 end) total_spend,
			avg(case when b.is_paid = 1 then b.total_amount end) average_bill,
			min(b.posting_date) first_visit,
			max(b.posting_date) last_visit,
			datediff(%(today)s, max(b.posting_date)) days_since_last_visit
		from `tabVIP POS Bill` b
		join `tabCustomer` c on c.name = b.customer
		where {' and '.join(conditions)}
		group by b.customer, c.customer_name, c.custom_finex_phone,
		         c.custom_primary_branch, c.custom_visited_branches
		having total_spend >= %(minimum_spend)s and visit_count >= %(minimum_visits)s
		order by total_spend desc, last_visit desc
		""",
		{
			**params,
			"today": getdate(nowdate()),
			"minimum_spend": flt(filters.get("minimum_spend")),
			"minimum_visits": int(filters.get("minimum_visits") or 0),
		},
		as_dict=True,
	)

	columns = [
		{"label": _("Customer"), "fieldname": "customer", "fieldtype": "Data", "width": 150},
		{"label": _("Customer Name"), "fieldname": "customer_name", "fieldtype": "Data", "width": 170},
		{"label": _("Phone"), "fieldname": "phone", "fieldtype": "Data", "width": 115},
		{"label": _("Primary Branch"), "fieldname": "primary_branch", "fieldtype": "Data", "width": 110},
		{"label": _("Visited Branches"), "fieldname": "visited_branches", "fieldtype": "Data", "width": 160},
		{"label": _("Visit Count"), "fieldname": "visit_count", "fieldtype": "Int", "width": 95},
		{"label": _("Bill Count"), "fieldname": "bill_count", "fieldtype": "Int", "width": 90},
		{"label": _("Total Spend"), "fieldname": "total_spend", "fieldtype": "Currency", "width": 130},
		{"label": _("Average Bill"), "fieldname": "average_bill", "fieldtype": "Currency", "width": 120},
		{"label": _("First Visit"), "fieldname": "first_visit", "fieldtype": "Date", "width": 105},
		{"label": _("Last Visit"), "fieldname": "last_visit", "fieldtype": "Date", "width": 105},
		{"label": _("Days Since Last Visit"), "fieldname": "days_since_last_visit", "fieldtype": "Int", "width": 130},
	]

	total_revenue = sum(flt(row.total_spend) for row in rows)
	active_30_days = sum(1 for row in rows if row.days_since_last_visit is not None and row.days_since_last_visit <= 30)
	report_summary = [
		{"value": len(rows), "label": _("Customers"), "datatype": "Int", "indicator": "Blue"},
		{"value": total_revenue, "label": _("Total Spend"), "datatype": "Currency", "indicator": "Green"},
		{"value": active_30_days, "label": _("Active in Last 30 Days"), "datatype": "Int", "indicator": "Green"},
		{"value": total_revenue / len(rows) if rows else 0, "label": _("Average Spend per Customer"), "datatype": "Currency", "indicator": "Orange"},
	]
	chart_rows = rows[:10]
	chart = {
		"data": {
			"labels": [row.customer_name or row.customer for row in chart_rows],
			"datasets": [{"name": _("Total Spend"), "values": [flt(row.total_spend) for row in chart_rows]}],
		},
		"type": "bar",
		"colors": ["#b6904b"],
	}
	return columns, rows, None, chart, report_summary
