frappe.query_reports["VIP Customer Intelligence"] = {
	filters: [
		{
			fieldname: "from_date",
			label: __("From Date"),
			fieldtype: "Date",
			default: frappe.datetime.add_months(frappe.datetime.get_today(), -12),
			reqd: 1,
		},
		{
			fieldname: "to_date",
			label: __("To Date"),
			fieldtype: "Date",
			default: frappe.datetime.get_today(),
			reqd: 1,
		},
		{
			fieldname: "branch",
			label: __("Primary Branch"),
			fieldtype: "Select",
			options: "\nNomad\nNeva\nSapphire\nMonarch",
		},
		{
			fieldname: "minimum_spend",
			label: __("Minimum Spend"),
			fieldtype: "Currency",
			default: 0,
		},
		{
			fieldname: "minimum_visits",
			label: __("Minimum Visits"),
			fieldtype: "Int",
			default: 0,
		},
	],
};
