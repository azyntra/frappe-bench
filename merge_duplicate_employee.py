"""
CHANRICH FRUITS PVT LTD — Merge a duplicate Employee record
=======================================================================
Some employees were created twice (e.g. EMP-0026 "MALSHA" with a
malformed 4-digit ID alongside the real EMP-00026 "MALSHA HIRUSHAN").
Because the attendance importer maps punches by Fingerprint ID, the
duplicate silently absorbed all the attendance while the record that is
actually on payroll showed up as fully absent.

This moves Attendance + Employee Checkin from the duplicate to the
canonical employee, then retires the duplicate (clears its fingerprint
ID so it can never capture punches again, and sets it Inactive).

NOTE: after merging, re-run the OT backfill for the affected period —
the duplicate had no FT- salary structure, so its attendance was never
OT-stamped:

    exec(open('/home/frappe/frappe-bench/backfill_overtime.py').read(), globals())
    backfill_overtime('2026-02-20', '2026-03-19', dry_run=False)

Run in bench console (DRY RUN first!):

    >>> exec(open('/home/frappe/frappe-bench/merge_duplicate_employee.py').read(), globals())
    >>> merge_employee('EMP-0026', 'EMP-00026', dry_run=True)
    >>> merge_employee('EMP-0026', 'EMP-00026', dry_run=False)
=======================================================================
"""

import frappe


def _log(m):
    print(m)


def merge_employee(from_emp, to_emp, dry_run=True):
    """Move Attendance + Employee Checkin from `from_emp` to `to_emp`, retire `from_emp`."""

    for emp in (from_emp, to_emp):
        if not frappe.db.exists("Employee", emp):
            _log(f"  [ABORT] Employee {emp} does not exist")
            return

    to_name = frappe.db.get_value("Employee", to_emp, "employee_name")

    _log("=" * 68)
    _log(f"MERGE {from_emp} -> {to_emp}   dry_run={dry_run}")
    _log("=" * 68)

    # ── safety: overlapping attendance dates would violate the unique
    #    (employee, attendance_date) constraint on the target
    clash = frappe.db.sql("""
        SELECT a.attendance_date
        FROM   `tabAttendance` a
        WHERE  a.employee = %(frm)s AND a.docstatus != 2
          AND  EXISTS (SELECT 1 FROM `tabAttendance` b
                       WHERE b.employee = %(to)s AND b.docstatus != 2
                         AND b.attendance_date = a.attendance_date)
    """, {"frm": from_emp, "to": to_emp}, as_dict=True)

    if clash:
        _log(f"  [ABORT] {len(clash)} attendance dates exist on BOTH employees "
             f"(e.g. {clash[0]['attendance_date']}). Resolve manually first.")
        return

    att = frappe.get_all("Attendance", filters={"employee": from_emp}, pluck="name")
    chk = frappe.get_all("Employee Checkin", filters={"employee": from_emp}, pluck="name")
    _log(f"  Attendance to move      : {len(att)}")
    _log(f"  Employee Checkin to move: {len(chk)}")
    _log(f"  Then retire {from_emp}: clear fingerprint id + status=Inactive")

    if dry_run:
        _log("  (DRY RUN — nothing written.)")
        _log("=" * 68)
        return {"attendance": len(att), "checkins": len(chk), "applied": False}

    # ── move attendance
    frappe.db.sql("""
        UPDATE `tabAttendance`
        SET    employee = %(to)s, employee_name = %(to_name)s
        WHERE  employee = %(frm)s
    """, {"to": to_emp, "to_name": to_name, "frm": from_emp})

    # ── move checkins
    frappe.db.sql("""
        UPDATE `tabEmployee Checkin`
        SET    employee = %(to)s, employee_name = %(to_name)s
        WHERE  employee = %(frm)s
    """, {"to": to_emp, "to_name": to_name, "frm": from_emp})

    # ── retire the duplicate so it can never capture punches again
    frappe.db.set_value("Employee", from_emp, {
        "custom_fingerprint_id": "",
        "status": "Inactive",
    })

    frappe.db.commit()
    _log(f"  [OK] moved {len(att)} attendance + {len(chk)} checkins to {to_emp}")
    _log(f"  [OK] {from_emp} retired (fingerprint cleared, status=Inactive)")
    _log("  NEXT: re-run backfill_overtime for the period to OT-stamp the moved records.")
    _log("=" * 68)
    return {"attendance": len(att), "checkins": len(chk), "applied": True}
