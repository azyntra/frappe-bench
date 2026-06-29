"""
scheduled_tasks/auto_leave_task.py
------------------------------------
Nightly scheduler job.
Scans ALL submitted Absent/Half-Day Attendance records for today
and ensures every one has a corresponding leave application.
Acts as a safety net in case the real-time event was missed.
"""

import frappe
from frappe.utils import today, add_days
from auto_leave_assignment.core import (
    assign_leave_for_attendance,
    _already_logged,
    _leave_application_exists,
)


def process_absent_attendance(date=None):
    """
    Process all absent/half-day attendance for a given date (defaults to today).
    Can also be called manually from the HR Dashboard for any date range.

    Returns a dict with counts: {assigned, skipped, errors, date}
    """
    process_date = date or today()

    frappe.logger().info(
        f"[Auto Leave Assignment] Running job for {process_date}"
    )

    # Fetch all submitted Absent / Half Day attendance records for the date
    records = frappe.get_all(
        "Attendance",
        filters={
            "attendance_date": process_date,
            "status":          ["in", ["Absent", "Half Day"]],
            "docstatus":       1,
        },
        fields=["name", "employee", "attendance_date", "status"],
    )

    assigned = 0
    skipped  = 0
    errors   = 0

    for rec in records:
        try:
            # Skip if already handled (either by event trigger or previous run)
            if _already_logged(rec.employee, rec.attendance_date):
                skipped += 1
                continue

            if _leave_application_exists(rec.employee, rec.attendance_date):
                skipped += 1
                continue

            # Load full doc and call core engine
            att_doc = frappe.get_doc("Attendance", rec.name)
            assign_leave_for_attendance(att_doc, called_from_scheduler=True)
            assigned += 1

        except Exception:
            errors += 1
            frappe.log_error(
                message=frappe.get_traceback(),
                title=f"Nightly Auto Leave Error — {rec.employee} on {rec.attendance_date}",
            )

    summary = (
        f"[Auto Leave Assignment] Job complete for {process_date}: "
        f"{assigned} assigned, {skipped} skipped, {errors} errors."
    )
    frappe.logger().info(summary)

    return {
        "date":     str(process_date),
        "assigned": assigned,
        "skipped":  skipped,
        "errors":   errors,
    }


def process_date_range(from_date, to_date):
    """
    Utility: process a range of dates.
    Called from the HR Dashboard 'Reprocess' action.

    Returns aggregated counts: {assigned, skipped, errors, days_processed}
    """
    from frappe.utils import date_diff, getdate

    start = getdate(from_date)
    end   = getdate(to_date)
    days  = date_diff(end, start) + 1

    total_assigned = 0
    total_skipped  = 0
    total_errors   = 0

    for i in range(days):
        d = add_days(start, i)
        result = process_absent_attendance(str(d))
        total_assigned += result["assigned"]
        total_skipped  += result["skipped"]
        total_errors   += result["errors"]

    return {
        "assigned":       total_assigned,
        "skipped":        total_skipped,
        "errors":         total_errors,
        "days_processed": days,
    }

