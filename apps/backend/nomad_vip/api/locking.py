from contextlib import contextmanager
from hashlib import sha256

import frappe
from frappe import _


@contextmanager
def database_lock(scope, *parts, timeout=10):
	"""Serialize a short business action across all web workers.

	MariaDB named locks are connection scoped, so they protect double taps and
	concurrent requests even when those requests land on different workers.
	"""
	raw_key = ":".join(str(part or "") for part in (scope, *parts))
	lock_key = f"nomad-vip:{sha256(raw_key.encode('utf-8')).hexdigest()[:48]}"
	row = frappe.db.sql("select get_lock(%s, %s)", (lock_key, int(timeout)))
	acquired = bool(row and int(row[0][0] or 0) == 1)
	if not acquired:
		frappe.throw(
			_("Өмнөх үйлдэл боловсруулагдаж байна. Түр хүлээгээд дахин оролдоно уу."),
			frappe.ValidationError,
		)
	try:
		yield
	finally:
		frappe.db.sql("select release_lock(%s)", (lock_key,))
