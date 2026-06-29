"""
api/dashboard_api.py
---------------------
Whitelisted API methods consumed by the Auto Leave Dashboard page.
"""

import frappe
from frappe.utils import today
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

    total = frappe.db.count("Auto Leave Log", {
        "attendance_date": ["between", [from_date, to_date]],
    })

    assigned_casual = frappe.db.count("Auto Leave Log", {
        "attendance_date": ["between", [from_date, to_date]],
        "status":          "Assigned",
        "leave_type":      "Casual Leave",
    })

    assigned_lwp = frappe.db.count("Auto Leave Log", {
        "attendance_date": ["between", [from_date, to_date]],
        "status":          "Assigned",
        "leave_type":      "Leave Without Pay",
    })

    skipped = frappe.db.count("Auto Leave Log", {
        "attendance_date": ["between", [from_date, to_date]],
        "status":          "Skipped",
    })

    errors = frappe.db.count("Auto Leave Log", {
        "attendance_date": ["between", [from_date, to_date]],
        "status":          "Error",
    })

    half_days = frappe.db.count("Auto Leave Log", {
        "attendance_date": ["between", [from_date, to_date]],
        "status":          "Assigned",
        "half_day":        1,
    })

    return {
        "total":           total,
        "casual_leave":    assigned_casual,
        "lwp":             assigned_lwp,
        "skipped":         skipped,
        "errors":          errors,
        "half_days":       half_days,
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
            "leave_type", "status", "half_day",
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
    Cancel the Leave Application linked to an Auto Leave Log entry.
    Updates the log status to 'Cancelled'.
    """
    frappe.only_for(["HR Manager", "System Manager"])

    log = frappe.get_doc("Auto Leave Log", log_name)

    if log.leave_application:
        la = frappe.get_doc("Leave Application", log.leave_application)
        if la.docstatus == 1:
            la.flags.ignore_permissions = True
            la.cancel()
            frappe.db.set_value("Auto Leave Log", log_name, "status", "Cancelled")
            frappe.db.set_value("Auto Leave Log", log_name, "remarks",
                                (log.remarks or "") + " | Manually cancelled via dashboard.")
            frappe.db.commit()
            return {"success": True, "message": f"Leave Application {log.leave_application} cancelled."}

    return {"success": False, "message": "No active Leave Application found to cancel."}


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
