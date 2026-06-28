"""
core.py
--------
Core engine for automatic leave assignment.
Used by both the Attendance DocEvent and the nightly scheduler.
"""

import frappe
from frappe.utils import getdate


# ─────────────────────────────────────────────
#  Main Entry Point
# ─────────────────────────────────────────────

def assign_leave_for_attendance(attendance_doc, called_from_scheduler=False):
    """
    Given a submitted Attendance record, auto-assign Casual Leave or LWP.
    Skips if:
      - Status is not Absent / Half Day
      - Date is a holiday for the employee's holiday list
      - A leave application already exists for that date
      - Already logged in Auto Leave Log

    Args:
        attendance_doc: The Attendance document
        called_from_scheduler: If True, commits after each record (scheduler context).
                               If False, lets Frappe's transaction management handle it (doc event context).
    """
    emp      = attendance_doc.employee
    att_date = getdate(attendance_doc.attendance_date)
    status   = attendance_doc.status          # "Absent" | "Half Day"
    half_day = (status == "Half Day")

    # ── Guard: only process Absent or Half Day
    if status not in ("Absent", "Half Day"):
        return

    # ── Guard: skip holidays
    if _is_holiday(emp, att_date):
        _log(emp, att_date, "Skipped", None,
             "Date is a holiday — no leave assigned", attendance_doc.name)
        if called_from_scheduler:
            frappe.db.commit()
        return

    # ── Guard: leave application already exists for this date
    if _leave_application_exists(emp, att_date):
        _log(emp, att_date, "Skipped", None,
             "Leave Application already exists", attendance_doc.name)
        if called_from_scheduler:
            frappe.db.commit()
        return

    # ── Guard: already processed by this app
    if _already_logged(emp, att_date):
        return

    # ── Determine leave type
    leave_type, balance_available = _resolve_leave_type(emp, att_date)

    # ── Create and submit Leave Application
    try:
        leave_app = frappe.get_doc({
            "doctype":     "Leave Application",
            "employee":    emp,
            "leave_type":  leave_type,
            "from_date":   att_date,
            "to_date":     att_date,
            "half_day":    1 if half_day else 0,
            "half_day_date": att_date if half_day else None,
            "status":      "Approved",
            "leave_approver": _get_leave_approver(emp),
            "description": (
                f"Auto-assigned by Auto Leave Assignment app. "
                f"Source Attendance: {attendance_doc.name}. "
                f"{'Casual Leave balance available.' if balance_available else 'No Casual Leave balance — LWP applied.'}"
            ),
        })
        leave_app.flags.ignore_permissions = True
        leave_app.insert()
        leave_app.submit()

        if called_from_scheduler:
            frappe.db.commit()

        _log(emp, att_date, "Assigned", leave_type,
             f"Leave Application {leave_app.name} created automatically",
             attendance_doc.name, leave_app.name, half_day)

        if called_from_scheduler:
            frappe.db.commit()

    except Exception as e:
        if called_from_scheduler:
            frappe.db.rollback()
        _log(emp, att_date, "Error", leave_type, str(e), attendance_doc.name)
        frappe.log_error(
            message=frappe.get_traceback(),
            title=f"Auto Leave Assignment Error — {emp} on {att_date}"
        )
        if called_from_scheduler:
            frappe.db.commit()


# ─────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────

def _is_holiday(employee, date):
    """Return True if `date` falls on a holiday in the employee's holiday list."""
    holiday_list = frappe.db.get_value(
        "Employee", employee, "holiday_list"
    )
    if not holiday_list:
        # Fall back to company holiday list
        company = frappe.db.get_value("Employee", employee, "company")
        holiday_list = frappe.db.get_value("Company", company, "default_holiday_list")

    if not holiday_list:
        return False

    return frappe.db.exists("Holiday", {
        "parent":       holiday_list,
        "holiday_date": date,
    })


def _leave_application_exists(employee, date):
    """Return True if a non-cancelled Leave Application overlaps this date."""
    return frappe.db.exists("Leave Application", {
        "employee":  employee,
        "from_date": ["<=", date],
        "to_date":   [">=", date],
        "docstatus": ["!=", 2],   # not cancelled
    })


def _already_logged(employee, date):
    """Return True if Auto Leave Log already has an Assigned record for this date."""
    return frappe.db.exists("Auto Leave Log", {
        "employee":        employee,
        "attendance_date": date,
        "status":          "Assigned",
    })


def _get_leave_approver(employee):
    """Get the leave approver for the employee, fallback to None."""
    leave_approver = frappe.db.get_value("Employee", employee, "leave_approver")
    if not leave_approver:
        department = frappe.db.get_value("Employee", employee, "department")
        if department:
            leave_approver = frappe.db.get_value(
                "Department Approver",
                {"parent": department, "parentfield": "leave_approvers"},
                "approver",
            )
    return leave_approver


def _resolve_leave_type(employee, date):
    """
    Returns (leave_type, balance_available).
    Priority: Casual Leave (if balance > 0) → Leave Without Pay.

    Uses Frappe's get_leave_balance_on if available (HRMS app),
    otherwise falls back to raw SQL on Leave Allocation.
    """
    try:
        # Try the HRMS API first (accurate, handles carry-forward, encashment etc.)
        from hrms.hr.doctype.leave_application.leave_application import (
            get_leave_balance_on,
        )
        balance = get_leave_balance_on(employee, "Casual Leave", date)
        if balance and balance > 0:
            return "Casual Leave", True
    except (ImportError, ModuleNotFoundError):
        # HRMS app not installed — fall back to raw allocation query
        pass
    except Exception:
        # Any other error from get_leave_balance_on — fall back
        pass

    # Fallback: direct allocation query
    allocation = frappe.db.sql("""
        SELECT
            total_leaves_allocated,
            total_leaves_taken
        FROM `tabLeave Allocation`
        WHERE
            employee      = %(employee)s
            AND leave_type = 'Casual Leave'
            AND docstatus  = 1
            AND from_date  <= %(date)s
            AND to_date    >= %(date)s
        ORDER BY to_date DESC
        LIMIT 1
    """, {"employee": employee, "date": date}, as_dict=True)

    if allocation:
        remaining = (allocation[0].total_leaves_allocated or 0) - (allocation[0].total_leaves_taken or 0)
        if remaining > 0:
            return "Casual Leave", True

    return "Leave Without Pay", False


def _log(employee, date, status, leave_type, remarks,
         attendance_name, leave_application=None, half_day=False):
    """Insert a record into Auto Leave Log for audit trail."""
    try:
        log = frappe.get_doc({
            "doctype":           "Auto Leave Log",
            "employee":          employee,
            "attendance_date":   date,
            "status":            status,
            "leave_type":        leave_type or "",
            "half_day":          1 if half_day else 0,
            "remarks":           remarks,
            "source_attendance": attendance_name,
            "leave_application": leave_application or "",
        })
        log.flags.ignore_permissions = True
        log.insert()
    except Exception:
        # Never let logging break the main flow, but do log the error
        frappe.log_error(
            message=frappe.get_traceback(),
            title=f"Auto Leave Log insert failed — {employee} on {date}"
        )
