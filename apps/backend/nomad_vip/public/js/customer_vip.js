frappe.ui.form.on("Customer", {
	refresh(frm) {
		if (frm.is_new() || !frm.fields_dict.custom_vip_detail_dashboard) return;
		const wrapper = frm.fields_dict.custom_vip_detail_dashboard.$wrapper;
		wrapper.html(`<div class="text-muted">${__("Loading VIP customer detail...")}</div>`);
		frappe.call({
			method: "nomad_vip.api.customer.get_customer_detail",
			args: { customer: frm.doc.name },
			callback: (response) => render_vip_customer_detail(wrapper, response.message || {}),
		});
	},
});

function render_vip_customer_detail(wrapper, detail) {
	const esc = (value) => frappe.utils.escape_html(String(value ?? ""));
	const money = (value) => format_currency(value || 0, frappe.defaults.get_default("currency") || "MNT");
	const customer = detail.customer || {};
	const cards = [
		[__("Visit Count"), esc(customer.visit_count || 0)],
		[__("Bill Count"), esc(customer.bill_count || 0)],
		[__("Total Spend"), money(customer.total_spend)],
		[__("Average Bill"), money(customer.average_bill)],
		[__("Last Visit"), esc(customer.last_visit || "-")],
	];
	const cardHtml = cards.map(([label, value]) => `<div class="vip-card"><div class="text-muted small">${label}</div><div class="vip-value">${value}</div></div>`).join("");
	const branchProfiles = (detail.branch_profiles || []).map((row) => {
		const rankClass = { Bronze: "orange", Silver: "gray", Gold: "yellow", Diamond: "blue" }[row.membership_rank] || "gray";
		const route = `/app/vip-customer-branch-profile/${encodeURIComponent(row.name)}`;
		return `<tr><td><a href="${route}">${esc(row.branch)}</a></td><td><span class="indicator-pill ${rankClass}">${esc(__(row.membership_rank || "Unassigned"))}</span></td><td>${row.visit_count || 0}</td><td>${row.bill_count || 0}</td><td>${money(row.total_spend)}</td><td>${esc(row.last_visit || "-")}</td></tr>`;
	}).join("") || `<tr><td colspan="6" class="text-muted">${__("No branch profiles")}</td></tr>`;
	const dancers = (detail.dancers || []).map((row) => `<tr><td>${esc(row.name)}</td><td>${esc(row.nickname || "-")}</td><td>${row.bill_count}</td><td>${row.service_count}</td><td>${money(row.service_spend)}</td><td>${esc(row.last_visit || "-")}</td></tr>`).join("") || `<tr><td colspan="6" class="text-muted">${__("No entertainer history")}</td></tr>`;
	const services = (detail.services || []).slice(0, 20).map((row) => `<tr><td>${esc(row.name)}</td><td>${row.bill_count}</td><td>${row.quantity}</td><td>${money(row.total_spend)}</td></tr>`).join("") || `<tr><td colspan="4" class="text-muted">${__("No service history")}</td></tr>`;
	const bills = (detail.recent_bills || []).map((row) => `<tr><td>${esc(row.posting_date)}</td><td>${esc(row.bill_code)}</td><td>${esc(row.store_name)}</td><td>${money((row.bill_type === 2 ? -1 : 1) * row.total_amount)}</td></tr>`).join("") || `<tr><td colspan="4" class="text-muted">${__("No bill history")}</td></tr>`;
	wrapper.html(`
		<style>.vip-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:12px 0}.vip-card{border:1px solid var(--border-color);border-radius:10px;padding:12px;background:var(--card-bg)}.vip-value{font-size:18px;font-weight:600;margin-top:4px}.vip-section{margin-top:18px}.vip-table{width:100%;font-size:13px}.vip-table th,.vip-table td{padding:8px;border-bottom:1px solid var(--border-color);text-align:left}.vip-scroll{overflow-x:auto}</style>
		<div class="vip-grid">${cardHtml}</div>
		<div class="vip-section"><h5>${__("VIP Rank by Branch")}</h5><div class="vip-scroll"><table class="vip-table"><thead><tr><th>${__("Branch")}</th><th>${__("VIP Membership Rank")}</th><th>${__("Visit Count")}</th><th>${__("Bill Count")}</th><th>${__("Total Spend")}</th><th>${__("Last Visit")}</th></tr></thead><tbody>${branchProfiles}</tbody></table></div></div>
		<div class="vip-section"><h5>${__("Entertainer History")}</h5><div class="vip-scroll"><table class="vip-table"><thead><tr><th>${__("Entertainer")}</th><th>${__("Nickname")}</th><th>${__("Bill Count")}</th><th>${__("Service Count")}</th><th>${__("Attributed Spend")}</th><th>${__("Last Visit")}</th></tr></thead><tbody>${dancers}</tbody></table></div></div>
		<div class="vip-section"><h5>${__("Service Preferences")}</h5><div class="vip-scroll"><table class="vip-table"><thead><tr><th>${__("Service")}</th><th>${__("Bill Count")}</th><th>${__("Quantity")}</th><th>${__("Total Spend")}</th></tr></thead><tbody>${services}</tbody></table></div></div>
		<div class="vip-section"><h5>${__("Recent Bills")}</h5><div class="vip-scroll"><table class="vip-table"><thead><tr><th>${__("Date")}</th><th>${__("Bill Code")}</th><th>${__("Branch")}</th><th>${__("Amount")}</th></tr></thead><tbody>${bills}</tbody></table></div></div>
	`);
}
