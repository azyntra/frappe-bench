import json

import frappe
from frappe import _


def get_context(context):
    pass


# Shifts the day-team pages are allowed to write. Anything else (e.g. the
# fixed staff's long-range "Normal Workday") must never be touched from here.
ALLOWED_SHIFT_PREFIXES = ("Target-Shift", "Day-Shift")


@frappe.whitelist()
def bulk_assign(changes):
    """Replace day-team shift assignments in one request.

    ``changes`` is a JSON list of ``{employee, date, shift_type}`` where a null
    ``shift_type`` means "remove the shift for that day". Both planner pages
    used to do this client-side with 3-4 API calls per cell; a month-fill for
    the whole team was ~1,500 requests. This does the same work server-side.

    Safety rules, deliberate:
      * only single-day assignments are ever cancelled/deleted — a record
        spanning more than one day (a fixed-staff style baseline) makes that
        cell FAIL loudly instead of silently destroying a year of roster
      * only shifts matching ALLOWED_SHIFT_PREFIXES may be written
      * per-cell savepoints: one bad cell doesn't roll back the rest
    """
    if isinstance(changes, str):
        changes = json.loads(changes)
    if not isinstance(changes, list):
        frappe.throw(_("changes must be a list"))
    if len(changes) > 1000:
        frappe.throw(_("Too many changes in one request (max 1000)"))

    for ptype in ("create", "delete"):
        if not frappe.has_permission("Shift Assignment", ptype):
            frappe.throw(_("Not permitted to modify Shift Assignments"), frappe.PermissionError)

    results = {"saved": 0, "failed": []}
    for ch in changes:
        emp = (ch.get("employee") or "").strip()
        ds = (ch.get("date") or "").strip()
        shift = (ch.get("shift_type") or "").strip() or None
        try:
            if not emp or not ds:
                frappe.throw(_("employee and date are required"))
            if shift and not shift.startswith(ALLOWED_SHIFT_PREFIXES):
                frappe.throw(_("Shift {0} cannot be assigned from this page").format(shift))
            frappe.db.savepoint("dtp_cell")
            _replace_day(emp, ds, shift)
            results["saved"] += 1
        except Exception as e:
            frappe.db.rollback(save_point="dtp_cell")
            results["failed"].append({"employee": emp, "date": ds, "error": str(e)[:140]})
    return results


def _replace_day(emp, ds, shift):
    overlapping = frappe.db.sql(
        """
        SELECT name, docstatus, start_date, end_date, shift_type
        FROM `tabShift Assignment`
        WHERE employee = %(emp)s AND docstatus < 2
          AND start_date <= %(ds)s
          AND IFNULL(end_date, '2999-12-31') >= %(ds)s
        """,
        {"emp": emp, "ds": ds},
        as_dict=True,
    )

    for rec in overlapping:
        # never touch a multi-day record from a per-day planner
        if not rec.end_date or str(rec.start_date) != str(rec.end_date):
            frappe.throw(
                _("{0} is covered by long-range assignment {1} ({2}, {3} to {4}). Resolve it manually.").format(
                    ds, rec.name, rec.shift_type, rec.start_date, rec.end_date or "open"
                )
            )

    for rec in overlapping:
        # Employee Checkin can hold a link to the assignment; clear it or the
        # delete below fails the link check
        if frappe.db.has_column("Employee Checkin", "shift_assignment"):
            frappe.db.sql(
                "UPDATE `tabEmployee Checkin` SET shift_assignment = NULL WHERE shift_assignment = %s",
                rec.name,
            )
        doc = frappe.get_doc("Shift Assignment", rec.name)
        if doc.docstatus == 1:
            doc.cancel()
        frappe.delete_doc("Shift Assignment", rec.name)

    if shift:
        doc = frappe.get_doc(
            {
                "doctype": "Shift Assignment",
                "employee": emp,
                "company": frappe.db.get_value("Employee", emp, "company"),
                "shift_type": shift,
                "start_date": ds,
                "end_date": ds,
                "status": "Active",
            }
        )
        doc.insert()
        doc.submit()


@frappe.whitelist()
def set_sunday_worker(employee, enabled):
    """Persist the planner's ☀ Sunday-worker toggle on the Employee record."""
    if not frappe.has_permission("Employee", "write", doc=employee):
        frappe.throw(_("Not permitted"), frappe.PermissionError)
    frappe.db.set_value("Employee", employee, "custom_sunday_worker", 1 if frappe.utils.cint(enabled) else 0)
    return {"employee": employee, "custom_sunday_worker": frappe.utils.cint(enabled) and 1 or 0}
