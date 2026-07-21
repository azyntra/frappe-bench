"""
api/dashboard_api.py
---------------------
Whitelisted API methods consumed by the Auto Leave Dashboard page.
"""

import frappe
from frappe.utils import flt, today
from auto_leave_assignment.scheduled_tasks.auto_leave_task import (
    process_absent_attendance,
    process_date_range,
)


@frappe.whitelist()
def get_dashboard_summary(from_date=None, to_date=None):
    """
    Returns KPI summary counts for the dashboard header cards.
    """
    from_date = from_date or today()
    to_date   = to_date   or today()

    # A split day writes ONE ROW PER CHUNK, so counting rows would double-count
    # it. Days are counted as distinct split_groups; leave figures are summed
    # as DAYS (leave_days), not rows.
    params = {"from_date": from_date, "to_date": to_date}

    def _days(extra_where="", extra_params=None):
        row = frappe.db.sql(f"""
            SELECT COUNT(DISTINCT split_group) AS n
            FROM   `tabAuto Leave Log`
            WHERE  attendance_date BETWEEN %(from_date)s AND %(to_date)s
            {extra_where}
        """, {**params, **(extra_params or {})}, as_dict=True)
        return (row[0]["n"] if row else 0) or 0

    def _leave_days(leave_type):
        row = frappe.db.sql("""
            SELECT SUM(leave_days) AS d
            FROM   `tabAuto Leave Log`
            WHERE  attendance_date BETWEEN %(from_date)s AND %(to_date)s
              AND  status = 'Assigned' AND leave_type = %(lt)s
        """, {**params, "lt": leave_type}, as_dict=True)
        return flt((row[0]["d"] if row else 0) or 0, 2)

    half_days = frappe.db.count("Auto Leave Log", {
        "attendance_date": ["between", [from_date, to_date]],
        "status":          "Assigned",
        "half_day":        1,
    })

    return {
        "total":        _days(),
        "casual_leave": _leave_days("Casual Leave"),
        "annual_leave": _leave_days("Annual Leave"),
        "lwp":          _leave_days("Leave Without Pay"),
        "skipped":      _days("AND status = 'Skipped'"),
        "errors":       _days("AND status = 'Error'"),
        "split_days":   _days("AND is_split = 1"),
        "half_days":    half_days,
    }


@frappe.whitelist()
def get_leave_log_list(from_date=None, to_date=None, status=None,
                       leave_type=None, employee=None, page=1, page_size=20):
    """
    Returns paginated list of Auto Leave Log records for the dashboard table.
    """
    from_date = from_date or today()
    to_date   = to_date   or today()
    page      = int(page)
    page_size = int(page_size)

    filters = {
        "attendance_date": ["between", [from_date, to_date]],
    }
    if status:
        filters["status"] = status
    if leave_type:
        filters["leave_type"] = leave_type
    if employee:
        filters["employee"] = employee

    total_count = frappe.db.count("Auto Leave Log", filters)

    records = frappe.get_all(
        "Auto Leave Log",
        filters=filters,
        fields=[
            "name", "employee", "employee_name", "attendance_date",
            "leave_type", "status", "half_day", "leave_days",
            "is_split", "chunk_index", "split_group",
            "source_attendance", "leave_application", "remarks", "creation"
        ],
        order_by="attendance_date desc, employee asc",
        limit_start=(page - 1) * page_size,
        limit_page_length=page_size,
    )

    return {
        "records":     records,
        "total":       total_count,
        "page":        page,
        "page_size":   page_size,
        "total_pages": -(-total_count // page_size),  # ceiling division
    }


@frappe.whitelist()
def run_manual_processing(from_date=None, to_date=None):
    """
    Triggered from the dashboard 'Run Now' button or after attendance import.
    Processes a date range manually.

    Returns structured counts: {assigned, skipped, errors, ...}
    """
    frappe.only_for(["HR Manager", "System Manager"])

    from_date = from_date or today()
    to_date   = to_date   or today()

    # Suppress any msgprint popups generated during processing
    # (e.g. "Employee X is on Leave" from check_leave_record, balance warnings)
    initial_log_length = len(frappe.local.message_log) if hasattr(frappe.local, 'message_log') else 0

    if from_date == to_date:
        result = process_absent_attendance(from_date)
    else:
        result = process_date_range(from_date, to_date)

    # Clear accumulated messages to prevent popup flood
    if hasattr(frappe.local, 'message_log'):
        frappe.local.message_log = frappe.local.message_log[:initial_log_length]

    return result


@frappe.whitelist()
def cancel_auto_leave(log_name):
    """
    Cancel the auto-assigned leave for a whole DAY and restore its Attendance.

    Two things this must get right:

    1. A day may be covered by TWO Leave Applications (a 0.5/0.5 split).
       Cancelling only one would leave the other half live and the Attendance
       in an inconsistent state, so the entire `split_group` is cancelled.

    2. Cancelling a Leave Application also CANCELS the Attendance record —
       LeaveApplication.cancel_attendance() sets Attendance.docstatus = 2 so
       that its own link check can pass. An HR user pressing "Cancel" does not
       expect to lose the attendance record, so it is restored afterwards from
       the original status captured on the log.
    """
    frappe.only_for(["HR Manager", "System Manager"])

    log = frappe.get_doc("Auto Leave Log", log_name)
    group = log.split_group or f"{log.employee}|{log.attendance_date}"

    siblings = frappe.get_all(
        "Auto Leave Log",
        filters={"split_group": group, "status": "Assigned"},
        fields=["name", "leave_application", "source_attendance",
                "original_attendance_status", "original_half_day_status", "remarks"],
        order_by="chunk_index desc, creation desc",   # unpaid chunk first
    )
    if not siblings:
        return {"success": False, "message": "No active auto-assigned leave found for this day."}

    attendance = next((s.source_attendance for s in siblings if s.source_attendance), None)
    original_status = next((s.original_attendance_status for s in siblings
                            if s.original_attendance_status), None)
    original_half_day_status = next((s.original_half_day_status for s in siblings
                                     if s.original_half_day_status), None)

    cancelled, failed = [], []
    for idx, s in enumerate(siblings):
        if not s.leave_application:
            continue
        sp = f"ala_dash_{idx}"
        frappe.db.savepoint(sp)
        try:
            la = frappe.get_doc("Leave Application", s.leave_application)
            if la.docstatus == 1:
                la.flags.ignore_permissions = True
                la.cancel()
                cancelled.append(s.leave_application)
        except Exception:
            frappe.db.rollback(save_point=sp)
            failed.append(s.leave_application)
            frappe.log_error(
                message=frappe.get_traceback(),
                title=f"Auto Leave dashboard cancel failed — {s.leave_application}",
            )

    # restore the attendance the cancels just took down (only after ALL cancels,
    # because each cancel's link check needs the row at docstatus = 2)
    restored = False
    if attendance and not failed and original_status:
        restored = _restore_attendance(attendance, original_status, original_half_day_status)

    for s in siblings:
        frappe.db.set_value(
            "Auto Leave Log", s.name,
            {
                "status": "Cancelled",
                "remarks": (s.remarks or "") + " | Manually cancelled via dashboard.",
            },
            update_modified=False,
        )
    frappe.db.commit()

    if failed:
        return {"success": False,
                "message": f"{len(cancelled)} cancelled, {len(failed)} failed — check Error Log."}

    msg = f"{len(cancelled)} leave application(s) cancelled."
    if restored:
        msg += " Attendance restored."
    return {"success": True, "message": msg}


def _restore_attendance(attendance_name, original_status, original_half_day_status):
    """Bring an Attendance row back after its Leave Application was cancelled."""
    try:
        frappe.db.set_value(
            "Attendance", attendance_name,
            {
                "docstatus": 1,
                "status": original_status,
                "half_day_status": original_half_day_status,
                "modify_half_day_status": 0,
                "leave_type": None,
                "leave_application": None,
            },
            update_modified=False,
        )
        return True
    except Exception:
        frappe.log_error(
            message=frappe.get_traceback(),
            title=f"Auto Leave — failed to restore Attendance {attendance_name}",
        )
        return False


@frappe.whitelist()
def get_employees_for_filter():
    """Returns employee list for the dashboard filter dropdown."""
    return frappe.get_all(
        "Employee",
        filters={"status": "Active"},
        fields=["name", "employee_name"],
        order_by="employee_name asc",
        limit=500,
    )
