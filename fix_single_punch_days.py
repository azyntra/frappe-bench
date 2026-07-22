"""
CHANRICH FRUITS PVT LTD — Correct historical single-punch days
=======================================================================
A day where the employee clocked IN but never OUT produced 0 working hours,
fell under the shift's absent threshold, and was marked Absent/Half Day. The
leave engine then consumed Casual/Annual on it and, once balance ran out,
booked it as LWP — so staff who were demonstrably on site lost both their
leave entitlement and their pay.

Of 228 such days only 42 were Present: 66 became Half Day + LWP, 61 burned
Casual Leave, 40 burned Annual Leave, 12 On Leave + LWP, 7 Absent.

This corrects them: cancel the leave that was wrongly applied (which returns
the balance), then set the attendance to Present with the scheduled shift
credited.

ORDER MATTERS. Cancelling a Leave Application also cancels its Attendance
(LeaveApplication.cancel_attendance sets docstatus=2 so its own link check
can pass), so the attendance is repaired AFTER the cancels, not before.

Run in bench console (DRY RUN first):

    >>> exec(open('/home/frappe/frappe-bench/fix_single_punch_days.py').read(), globals())
    >>> fix_single_punch(dry_run=True)
    >>> fix_single_punch(dry_run=False)
=======================================================================
"""

import frappe
from frappe.utils import flt, getdate

APP_MARKER = "Auto-assigned by Auto Leave Assignment app"


def _log(m):
    print(m)


def _single_punch_days():
    """(employee, date) pairs whose check-ins for the day number exactly one."""
    return frappe.db.sql("""
        SELECT employee, DATE(time) AS d
        FROM   `tabEmployee Checkin`
        GROUP BY employee, DATE(time)
        HAVING COUNT(*) = 1
        ORDER BY employee, d
    """, as_dict=True)


def _shift_hours(employee, day):
    """Scheduled shift length for the employee on that date, in hours."""
    from hrms.hr.page.import_attendance.import_attendance import (
        _get_shift_assignment, _get_shift_details, _td_seconds,
    )
    name = _get_shift_assignment(employee, str(day))
    if not name:
        return None
    shift = _get_shift_details(name)
    if not shift:
        return None
    secs = _td_seconds(shift.end_time) - _td_seconds(shift.start_time)
    if secs < 0:
        secs += 24 * 3600
    return round(secs / 3600.0, 2)


def fix_single_punch(dry_run=True):
    pairs = _single_punch_days()
    _log("=" * 72)
    _log(f"FIX SINGLE-PUNCH DAYS   dry_run={dry_run}   candidates={len(pairs)}")
    _log("=" * 72)

    stats = {"already_present": 0, "fixed": 0, "leave_cancelled": 0,
             "no_attendance": 0, "no_shift": 0, "errors": 0}
    per_emp = {}

    for p in pairs:
        emp, day = p.employee, getdate(p.d)
        att = frappe.db.get_value(
            "Attendance",
            {"employee": emp, "attendance_date": day, "docstatus": ["!=", 2]},
            ["name", "status", "leave_type", "working_hours"], as_dict=True,
        )
        if not att:
            stats["no_attendance"] += 1
            continue
        if att.status == "Present" and not att.leave_type:
            stats["already_present"] += 1
            continue

        hours = _shift_hours(emp, day)
        if hours is None:
            stats["no_shift"] += 1
            continue

        # leave this app created for that date — cancelling returns the balance
        leave = frappe.get_all("Leave Application", filters={
            "employee":  emp,
            "docstatus": 1,
            "from_date": ["<=", day],
            "to_date":   [">=", day],
            "description": ["like", f"%{APP_MARKER}%"],
        }, pluck="name")

        per_emp.setdefault(emp, {"days": 0, "leave": 0})
        per_emp[emp]["days"] += 1
        per_emp[emp]["leave"] += len(leave)

        if dry_run:
            stats["fixed"] += 1
            stats["leave_cancelled"] += len(leave)
            continue

        sp = "sp_" + str(abs(hash((emp, str(day)))))[:10]
        frappe.db.savepoint(sp)
        try:
            for la_name in leave:
                la = frappe.get_doc("Leave Application", la_name)
                if la.docstatus == 1:
                    la.flags.ignore_permissions = True
                    la.cancel()          # also cancels the attendance row
                    stats["leave_cancelled"] += 1

            # repair AFTER the cancels — they set the attendance to docstatus 2
            frappe.db.set_value("Attendance", att.name, {
                "docstatus":        1,
                "status":           "Present",
                "working_hours":    hours,
                "leave_type":       None,
                "leave_application": None,
                "half_day_status":  None,
                "modify_half_day_status": 0,
            }, update_modified=False)

            frappe.db.sql("""
                UPDATE `tabAuto Leave Log`
                SET    status = 'Cancelled',
                       remarks = CONCAT(IFNULL(remarks,''),
                                 ' | Reversed: single IN punch credited as a full day.')
                WHERE  employee = %(e)s AND attendance_date = %(d)s
            """, {"e": emp, "d": day})

            frappe.db.commit()
            stats["fixed"] += 1
        except Exception as e:
            frappe.db.rollback(save_point=sp)
            stats["errors"] += 1
            _log(f"  [ERROR] {emp} {day}: {str(e)[:150]}")
            frappe.log_error(frappe.get_traceback(), f"Single-punch fix failed — {emp} {day}")

    _log("  most affected employees:")
    for emp, v in sorted(per_emp.items(), key=lambda kv: -kv[1]["days"])[:8]:
        name = frappe.db.get_value("Employee", emp, "employee_name")
        _log(f"    {emp:<14} {name:<24} days={v['days']:<3} leave_apps={v['leave']}")

    _log("=" * 72)
    for k, v in stats.items():
        _log(f"  {k:<16}: {v}")
    if dry_run:
        _log("  (DRY RUN — nothing written.)")
    _log("=" * 72)
    return stats
