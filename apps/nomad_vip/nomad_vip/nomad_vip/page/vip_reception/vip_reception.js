frappe.pages["vip-reception"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({ parent: wrapper, title: __("VIP Reception"), single_column: true });
	new VIPReception(page);
};

class VIPReception {
	constructor(page) {
		this.page = page;
		this.mount();
	}

	mount() {
		this.page.main.html(`
			<style>
			.vip-reception{max-width:980px;margin:24px auto;padding:0 16px}.vip-search-panel{background:var(--card-bg);border:1px solid var(--border-color);border-radius:16px;padding:28px;box-shadow:0 10px 30px rgba(0,0,0,.05)}.vip-search-title{font-size:24px;font-weight:700;margin:0 0 6px}.vip-search-subtitle{color:var(--text-muted);margin-bottom:20px}.vip-search-row{display:flex;gap:10px}.vip-phone{font-size:22px!important;letter-spacing:2px;height:48px!important}.vip-search-btn{height:48px;min-width:150px;font-weight:600}.vip-result{margin-top:20px}.vip-profile-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}.vip-name{font-size:26px;font-weight:700}.vip-phone-label{font-size:16px;color:var(--text-muted)}.vip-stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}.vip-stat{padding:14px;border:1px solid var(--border-color);border-radius:12px}.vip-stat strong{display:block;font-size:20px;margin-top:5px}.vip-rank-table{width:100%;margin-top:16px}.vip-rank-table th,.vip-rank-table td{padding:12px 10px;border-bottom:1px solid var(--border-color);text-align:left}.vip-register{max-width:520px}.vip-register .form-control{height:44px}.vip-actions{display:flex;gap:10px;margin-top:18px}@media(max-width:720px){.vip-search-row{flex-direction:column}.vip-search-btn{width:100%}.vip-stat-grid{grid-template-columns:repeat(2,1fr)}.vip-profile-head{flex-direction:column}.vip-reception{margin-top:12px;padding:0}.vip-search-panel{border-radius:12px;padding:18px}.vip-rank-table{font-size:12px}.vip-rank-table th,.vip-rank-table td{padding:9px 5px}}
			</style>
			<div class="vip-reception">
				<section class="vip-search-panel">
					<h2 class="vip-search-title">${__("Find VIP customer")}</h2>
					<div class="vip-search-subtitle">${__("Enter the customer's 8-digit phone number")}</div>
					<div class="vip-search-row"><input class="form-control vip-phone" inputmode="numeric" maxlength="12" placeholder="9911 2233"><button class="btn btn-primary vip-search-btn">${__("Search")}</button></div>
					<div class="vip-result"></div>
				</section>
			</div>`);
		this.$phone = this.page.main.find(".vip-phone");
		this.$result = this.page.main.find(".vip-result");
		this.page.main.find(".vip-search-btn").on("click", () => this.search());
		this.$phone.on("keydown", (event) => { if (event.key === "Enter") this.search(); });
		setTimeout(() => this.$phone.trigger("focus"), 100);
	}

	search() {
		const phone = this.$phone.val();
		if ((phone.match(/\d/g) || []).length < 8) return frappe.msgprint(__("Enter a valid 8-digit phone number"));
		this.$result.html(`<div class="text-muted">${__("Searching...")}</div>`);
		frappe.call({ method: "nomad_vip.api.customer.lookup_customer_by_phone", args: { phone }, freeze: true, callback: (r) => r.message?.found ? this.renderCustomer(r.message.detail) : this.renderRegistration(r.message?.phone || phone) });
	}

	renderCustomer(detail) {
		const c = detail.customer || {};
		const esc = (v) => frappe.utils.escape_html(String(v ?? ""));
		const money = (v) => format_currency(v || 0, "MNT");
		const ranks = (detail.branch_profiles || []).map((row) => `<tr><td><strong>${esc(row.branch)}</strong></td><td>${esc(__(row.membership_rank || "Unassigned"))}</td><td>${row.visit_count || 0}</td><td>${money(row.total_spend)}</td><td>${esc(row.last_visit || "-")}</td></tr>`).join("");
		const branchTitle = detail.scope_branch ? `${esc(detail.scope_branch)} — ${__("Branch customer information")}` : __("VIP Rank by Branch");
		this.$result.html(`<div class="vip-profile-head"><div><div class="vip-name">${esc(c.customer_name)}</div><div class="vip-phone-label">${esc(this.$phone.val())}</div></div><button class="btn btn-default vip-new-search">${__("New search")}</button></div><div class="vip-stat-grid"><div class="vip-stat"><span class="text-muted">${__("Visit Count")}</span><strong>${c.visit_count || 0}</strong></div><div class="vip-stat"><span class="text-muted">${__("Total Spend")}</span><strong>${money(c.total_spend)}</strong></div><div class="vip-stat"><span class="text-muted">${__("Average Bill")}</span><strong>${money(c.average_bill)}</strong></div><div class="vip-stat"><span class="text-muted">${__("Last Visit")}</span><strong>${esc(c.last_visit || "-")}</strong></div></div><h4>${branchTitle}</h4><div class="overflow-auto"><table class="vip-rank-table"><thead><tr><th>${__("Branch")}</th><th>${__("VIP Membership Rank")}</th><th>${__("Visit Count")}</th><th>${__("Total Spend")}</th><th>${__("Last Visit")}</th></tr></thead><tbody>${ranks}</tbody></table></div>`);
		this.$result.find(".vip-new-search").on("click", () => this.reset());
	}

	renderRegistration(phone) {
		this.$result.html(`<div class="vip-register"><h3>${__("Customer not found")}</h3><p class="text-muted">${__("Register the new customer below")}</p><div class="form-group"><label>${__("Customer Name")}</label><input class="form-control vip-new-name" autocomplete="off"></div><div class="form-group"><label>${__("Phone")}</label><input class="form-control vip-new-phone" value="${frappe.utils.escape_html(phone)}" inputmode="numeric"></div><div class="vip-actions"><button class="btn btn-primary vip-register-btn">${__("Register Customer")}</button><button class="btn btn-default vip-cancel-btn">${__("Cancel")}</button></div></div>`);
		this.$result.find(".vip-register-btn").on("click", () => this.register());
		this.$result.find(".vip-cancel-btn").on("click", () => this.reset());
		this.$result.find(".vip-new-name").trigger("focus");
	}

	register() {
		const customer_name = this.$result.find(".vip-new-name").val();
		const phone = this.$result.find(".vip-new-phone").val();
		if (!customer_name?.trim()) return frappe.msgprint(__("Customer name is required"));
		frappe.call({ method: "nomad_vip.api.customer.register_walk_in_customer", args: { customer_name, phone }, freeze: true, freeze_message: __("Registering customer..."), callback: (r) => { if (r.message?.detail) { this.$phone.val(phone); this.renderCustomer(r.message.detail); frappe.show_alert({ message: r.message.created ? __("Customer registered") : __("Customer already exists"), indicator: "green" }); } } });
	}

	reset() { this.$phone.val(""); this.$result.empty(); this.$phone.trigger("focus"); }
}
