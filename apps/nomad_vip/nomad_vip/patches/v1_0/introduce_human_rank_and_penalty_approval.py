import frappe


def execute():
	# Хуучин автоматаар идэвхжсэн суутгалыг өмнөх баталгаажсан төлөв гэж хадгална.
	frappe.db.sql(
		"""
		update `tabVIP Attendance Penalty`
		set status='Approved',
			decided_by=coalesce(decided_by, owner),
			decided_at=coalesce(decided_at, created_at),
			decision_reason=coalesce(nullif(decision_reason, ''), 'Legacy approved deduction')
		where status='Active'
		"""
	)
	# Баталгаажсан зэрэглэлгүй бодит болон demo бүх профайлыг Gold-оос эхлүүлнэ.
	frappe.db.sql(
		"""
		update `tabVIP Entertainer Profile`
		set current_rank='Gold'
		where coalesce(current_rank, '')=''
		"""
	)
