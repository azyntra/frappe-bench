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


def _release_checkin_shift(employee, work_date, shift_type):
    """HRMS Shift Assignment.on_cancel refuses to cancel while an Employee
    Checkin that day still carries the shift (fetch_shift stamps it at insert
    time). Null it so the roster change can proceed — the re-stamp that
    follows recomputes everything the field fed."""
    frappe.db.sql(
        """UPDATE `tabEmployee Checkin` SET shift = NULL
           WHERE employee = %s AND shift = %s AND DATE(time) = %s""",
        (employee, shift_type, work_date),
    )


def _replace_day(emp, ds, shift):
    # a paid day must stay exactly as paid
    if frappe.db.exists(
        "Salary Slip",
        {"employee": emp, "docstatus": 1, "start_date": ("<=", ds), "end_date": (">=", ds)},
    ):
        frappe.throw(_("{0} is covered by a submitted Salary Slip — cannot change the roster.").format(ds))

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

    # If the day was already imported, its Attendance references the old
    # shift; Shift Assignment.on_cancel blocks while ANY attendance (even a
    # cancelled one) or checkin carries the shift. Cancel the attendance,
    # release the references, and re-stamp the day at the end so status/OT
    # are recomputed against the new roster.
    removed_shifts = {rec.shift_type for rec in overlapping}
    had_attendance = False
    if removed_shifts:
        att = frappe.db.get_value(
            "Attendance",
            {"employee": emp, "attendance_date": ds, "docstatus": ("!=", 2),
             "shift": ("in", list(removed_shifts))},
            ["name", "docstatus"],
            as_dict=True,
        )
        if att:
            had_attendance = True
            att_doc = frappe.get_doc("Attendance", att.name)
            att_doc.flags.skip_auto_leave = True
            if att_doc.docstatus == 1:
                att_doc.cancel()          # on_cancel unlinks its checkins
                frappe.db.set_value("Attendance", att.name, "shift", None)
            else:
                frappe.delete_doc("Attendance", att.name, force=1)

    for rec in overlapping:
        _release_checkin_shift(emp, ds, rec.shift_type)
        # cancelled attendance rows from earlier replacements block too
        frappe.db.sql(
            """UPDATE `tabAttendance` SET shift = NULL
               WHERE employee = %s AND attendance_date = %s AND docstatus = 2 AND shift = %s""",
            (emp, ds, rec.shift_type),
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

    if had_attendance:
        # re-stamp the day against the new roster (or, with no shift left,
        # the importer's no-shift/auto-classification path)
        from hrms.hr.page.import_attendance.import_attendance import _process_single
        _process_single(emp, ds)


@frappe.whitelist()
def set_sunday_worker(employee, enabled):
    """Persist the planner's ☀ Sunday-worker toggle on the Employee record."""
    if not frappe.has_permission("Employee", "write", doc=employee):
        frappe.throw(_("Not permitted"), frappe.PermissionError)
    frappe.db.set_value("Employee", employee, "custom_sunday_worker", 1 if frappe.utils.cint(enabled) else 0)
    return {"employee": employee, "custom_sunday_worker": frappe.utils.cint(enabled) and 1 or 0}
