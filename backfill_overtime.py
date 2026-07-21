"""
CHANRICH FRUITS PVT LTD — Overtime Backfill for PAST months
=======================================================================
The Import Attendance page only stamps overtime on records it creates.
Attendance already submitted BEFORE the OT feature went live has no
overtime data. This script recomputes OT for those historical records
using the SAME rule as the live import:

    OT = time worked past the assigned Shift Type's scheduled end time,
         rounded to nearest 0.5 hr, only for "FT-" (fixed) staff,
         only for submitted + Present attendance.

It writes overtime_type / actual_overtime_duration / standard_working_hours
directly onto the submitted Attendance rows (these are read as-is by the
HRMS Overtime Slip), so no cancel/amend is needed.

Run in bench console (DRY RUN first!):

    cd /home/frappe/frappe-bench
    bench --site 79.72.76.67 console
    >>> exec(open('/home/frappe/frappe-bench/backfill_overtime.py').read(), globals())
    >>> backfill_overtime("2025-01-01", "2025-06-30", dry_run=True)   # preview
    >>> backfill_overtime("2025-01-01", "2025-06-30", dry_run=False)  # apply

After applying, generate Overtime Slips for those months via Payroll Entry
(or per-employee) so the amounts flow into the payslips.
=======================================================================
"""

import frappe
from datetime import datetime, timedelta

# Reuse the EXACT same logic the live import page uses — single source of truth.
from hrms.hr.page.import_attendance.import_attendance import (
    OT_TYPE_NAME,
    _is_fixed_ot_employee,
    _overtime_after_shift_end,
    _get_shift_assignment,
    _get_shift_details,
    _td_seconds,
    _to_dt,
)


def _shift_bounds(shift, work_date):
    """Return (shift_start_dt, shift_end_dt) for a date, handling overnight shifts."""
    work_dt = datetime.strptime(str(work_date), "%Y-%m-%d")
    shift_start = work_dt + timedelta(seconds=_td_seconds(shift.start_time))
    shift_end   = work_dt + timedelta(seconds=_td_seconds(shift.end_time))
    if shift_end < shift_start:            # overnight shift
        shift_end += timedelta(days=1)
    return shift_start, shift_end


def backfill_overtime(from_date, to_date, dry_run=True):
    """
    Recompute + stamp OT on submitted Present attendance for FT- staff
    between from_date and to_date (inclusive).

    Returns: {scanned, eligible, updated, no_shift, no_out, zero_ot, errors}
    """
    records = frappe.get_all(
        "Attendance",
        filters={
            "docstatus":       1,
            "status":          "Present",
            "attendance_date": ["between", [from_date, to_date]],
        },
        fields=["name", "employee", "attendance_date", "in_time", "out_time", "shift"],
        order_by="attendance_date asc",
    )

    stats = {
        "scanned":  len(records),
        "eligible": 0,
        "updated":  0,
        "no_shift": 0,
        "no_out":   0,
        "zero_ot":  0,
        "errors":   0,
    }

    print(f"[Backfill OT] {from_date} → {to_date} | dry_run={dry_run} | scanning {len(records)} Present records")

    for rec in records:
        try:
            if not _is_fixed_ot_employee(rec.employee, rec.attendance_date):
                continue
            stats["eligible"] += 1

            out_time = _to_dt(rec.out_time)
            if not out_time:
                stats["no_out"] += 1
                continue

            shift_name = rec.shift or _get_shift_assignment(rec.employee, str(rec.attendance_date))
            if not shift_name:
                stats["no_shift"] += 1
                continue

            shift = _get_shift_details(shift_name)
            if not shift:
                stats["no_shift"] += 1
                continue

            shift_start, shift_end = _shift_bounds(shift, rec.attendance_date)
            ot_hours = _overtime_after_shift_end(out_time, shift_end)

            if ot_hours <= 0:
                stats["zero_ot"] += 1
                continue

            std_hours = round((shift_end - shift_start).total_seconds() / 3600.0, 2)

            print(f"  {rec.attendance_date}  {rec.employee:<14} shift={shift_name:<16} "
                  f"out={out_time.strftime('%H:%M')}  end={shift_end.strftime('%H:%M')}  OT={ot_hours}h")

            if not dry_run:
                frappe.db.set_value(
                    "Attendance", rec.name,
                    {
                        "overtime_type":            OT_TYPE_NAME,
                        "actual_overtime_duration": ot_hours,
                        "standard_working_hours":   std_hours,
                    },
                    update_modified=False,
                )
            stats["updated"] += 1

            if not dry_run and stats["updated"] % 200 == 0:
                frappe.db.commit()

        except Exception:
            stats["errors"] += 1
            frappe.log_error(
                message=frappe.get_traceback(),
                title=f"OT Backfill error — {rec.employee} on {rec.attendance_date}",
            )

    if not dry_run:
        frappe.db.commit()

    print("\n[Backfill OT] Summary")
    for k, v in stats.items():
        print(f"    {k:<9}: {v}")
    if dry_run:
        print("    (DRY RUN — nothing written. Re-run with dry_run=False to apply.)")
    return stats
