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
        # Even if a leave app exists, ensure the Attendance record is linked to it
        _sync_attendance_with_existing_leave(attendance_doc, emp, att_date)
        _log(emp, att_date, "Skipped", None,
             "Leave Application already exists", attendance_doc.name)
        if called_from_scheduler:
            frappe.db.commit()
        return

    # ── Guard: already processed by this app
    if _already_logged(emp, att_date):
        return

    # ── Determine leave type
    leave_type, balance_available = _resolve_leave_type(emp, att_date, half_day)

    # ── Create and submit Leave Application
    initial_log_length = len(frappe.local.message_log) if hasattr(frappe.local, 'message_log') else 0

    def _try_create_leave(lt, description_suffix):
        """Attempt to create a Leave Application of given type. Returns doc or raises."""
        la = frappe.get_doc({
            "doctype":     "Leave Application",
            "employee":    emp,
            "leave_type":  lt,
            "from_date":   att_date,
            "to_date":     att_date,
            "half_day":    1 if half_day else 0,
            "half_day_date": att_date if half_day else None,
            "status":      "Approved",
            "leave_approver": _get_leave_approver(emp),
            "description": (
                f"Auto-assigned by Auto Leave Assignment app. "
                f"Source Attendance: {attendance_doc.name}. "
                f"{description_suffix}"
            ),
        })
        la.flags.ignore_permissions = True
        la.insert()
        la.submit()
        return la

    try:
        leave_app = None

        # First attempt: try the resolved leave type
        try:
            leave_app = _try_create_leave(
                leave_type,
                "Casual Leave balance available." if balance_available else "No Casual Leave balance — LWP applied."
            )
        except Exception as first_err:
            # If Casual Leave failed (e.g. insufficient balance race condition),
            # retry with Leave Without Pay
            err_str = str(first_err).lower()
            if leave_type == "Casual Leave" and ("insufficient" in err_str or "balance" in err_str):
                # Suppress any messages from the failed attempt
                if hasattr(frappe.local, 'message_log'):
                    frappe.local.message_log = frappe.local.message_log[:initial_log_length]
                # Clear _server_messages to prevent the red popup
                if hasattr(frappe.local, '_server_messages'):
                    frappe.local._server_messages = []

                if called_from_scheduler:
                    frappe.db.rollback()

                leave_type = "Leave Without Pay"
                balance_available = False
                leave_app = _try_create_leave(
                    "Leave Without Pay",
                    "Casual Leave failed (insufficient balance) — LWP applied as fallback."
                )
            else:
                raise  # Re-raise non-balance errors

        if called_from_scheduler:
            frappe.db.commit()

        # ── CRITICAL: Update the Attendance record so payroll sees the leave ──
        _update_attendance_with_leave(attendance_doc, leave_type, leave_app.name, half_day)

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

    # Always suppress accumulated popups from leave creation
    if hasattr(frappe.local, 'message_log'):
        frappe.local.message_log = frappe.local.message_log[:initial_log_length]


# ─────────────────────────────────────────────
#  Attendance ↔ Leave Application Sync
# ─────────────────────────────────────────────

def _update_attendance_with_leave(attendance_doc, leave_type, leave_app_name, half_day):
    """
    Update the Attendance record to link it with the Leave Application.
    This is CRITICAL for payroll — salary_slip reads leave_type from
    the Attendance record to calculate LWP deductions properly.

    For submitted docs (docstatus=1), we use direct SQL updates to avoid
    re-triggering validate/submit hooks.
    """
    att_name = attendance_doc.name

    if half_day:
        # For Half Day: keep status as "Half Day", just set leave_type + leave_application
        frappe.db.sql("""
            UPDATE `tabAttendance`
            SET    leave_type = %(leave_type)s,
                   leave_application = %(leave_app)s
            WHERE  name = %(att_name)s
        """, {
            "leave_type": leave_type,
            "leave_app":  leave_app_name,
            "att_name":   att_name,
        })
    else:
        # For full-day Absent: change status to "On Leave" so payroll sees it correctly
        frappe.db.sql("""
            UPDATE `tabAttendance`
            SET    status = 'On Leave',
                   leave_type = %(leave_type)s,
                   leave_application = %(leave_app)s
            WHERE  name = %(att_name)s
        """, {
            "leave_type": leave_type,
            "leave_app":  leave_app_name,
            "att_name":   att_name,
        })


def _sync_attendance_with_existing_leave(attendance_doc, employee, att_date):
    """
    If a Leave Application already exists for this date but the Attendance
    record is not linked to it, update the Attendance to link them.
    This handles cases where attendance was imported before leave was applied.
    """
    att_name = attendance_doc.name

    # Check if the Attendance already has leave_type set
    current_leave_type = frappe.db.get_value("Attendance", att_name, "leave_type")
    if current_leave_type:
        return  # Already linked, nothing to do

    # Find the matching Leave Application
    leave_app = frappe.db.get_value(
        "Leave Application",
        {
            "employee":  employee,
            "from_date": ["<=", att_date],
            "to_date":   [">=", att_date],
            "docstatus": 1,
            "status":    "Approved",
        },
        ["name", "leave_type", "half_day", "half_day_date"],
        as_dict=True,
    )

    if not leave_app:
        return

    is_half_day = leave_app.half_day and (leave_app.half_day_date == att_date)

    if is_half_day:
        frappe.db.sql("""
            UPDATE `tabAttendance`
            SET    leave_type = %(leave_type)s,
                   leave_application = %(leave_app)s,
                   status = 'Half Day'
            WHERE  name = %(att_name)s
        """, {
            "leave_type": leave_app.leave_type,
            "leave_app":  leave_app.name,
            "att_name":   att_name,
        })
    else:
        frappe.db.sql("""
            UPDATE `tabAttendance`
            SET    leave_type = %(leave_type)s,
                   leave_application = %(leave_app)s,
                   status = 'On Leave'
            WHERE  name = %(att_name)s
        """, {
            "leave_type": leave_app.leave_type,
            "leave_app":  leave_app.name,
            "att_name":   att_name,
        })


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


def _resolve_leave_type(employee, date, half_day=False):
    """
    Returns (leave_type, balance_available).
    Priority: Casual Leave (if balance >= required) → Leave Without Pay.

    Uses Frappe's get_leave_balance_on if available (HRMS app).
    """
    required_balance = 0.5 if half_day else 1.0

    try:
        from hrms.hr.doctype.leave_application.leave_application import (
            get_leave_balance_on,
        )
        balance = get_leave_balance_on(employee, "Casual Leave", date)
        if balance is not None and balance >= required_balance:
            return "Casual Leave", True
        else:
            return "Leave Without Pay", False

    except Exception as e:
        frappe.log_error(title="Auto Leave Balance Check Failed", message=str(e))
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

