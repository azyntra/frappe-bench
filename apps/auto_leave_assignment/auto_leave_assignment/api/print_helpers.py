"""
api/print_helpers.py
---------------------
Data for the "Calculation Breakdown" section of the Salary Slip print format.

Exposed to Jinja via the `jinja` hook in hooks.py, so the print format can do:

    {% set bd = get_slip_breakdown(doc) %}

Keeping this in Python rather than in the template means the queries are
testable and the template stays readable.
"""

import frappe
from frappe.utils import flt, formatdate, getdate


def _is_holiday(employee, date):
    """Same resolver the rest of the app uses (Holiday List Assignment)."""
    try:
        from hrms.utils.holiday_list import get_holiday_dates_between_range
        return bool(get_holiday_dates_between_range(
            employee, date, date, raise_exception_for_holiday_list=False
        ))
    except Exception:
        return False


def _overtime_breakdown(doc):
    """How the Overtime earning was arrived at.

    The amount lives on the slip as an Additional Salary earning; the per-day
    hours live on the Overtime Slip that produced it.
    """
    row = next((e for e in doc.earnings if e.salary_component == "Overtime"), None)
    if not row or not flt(row.amount):
        return None

    slips = frappe.get_all(
        "Overtime Slip",
        filters={
            "employee":   doc.employee,
            "docstatus":  1,
            "start_date": ["<=", doc.end_date],
            "end_date":   [">=", doc.start_date],
        },
        pluck="name",
    )

    details, normal_h, holiday_h = [], 0.0, 0.0
    for slip in slips:
        for d in frappe.get_all(
            "Overtime Details",
            filters={"parent": slip},
            fields=["date", "overtime_duration"],
            order_by="date asc",
        ):
            if not d.date or getdate(d.date) < getdate(doc.start_date) \
                    or getdate(d.date) > getdate(doc.end_date):
                continue
            hrs = flt(d.overtime_duration)
            if hrs <= 0:
                continue
            holiday = _is_holiday(doc.employee, d.date)
            if holiday:
                holiday_h += hrs
            else:
                normal_h += hrs
            details.append({
                "date":       formatdate(d.date, "dd MMM"),
                "hours":      hrs,
                "is_holiday": holiday,
            })

    total_h = normal_h + holiday_h
    rate = flt(frappe.db.get_value("Overtime Type", "Staff OT", "hourly_rate")) or 0.0
    # fall back to a derived rate if the master ever changes
    if total_h and not rate:
        rate = flt(row.amount) / total_h

    return {
        "amount":       flt(row.amount),
        "total_hours":  total_h,
        "normal_hours": normal_h,
        "holiday_hours": holiday_h,
        "rate":         rate,
        "days":         details,
    }


def _absence_breakdown(doc):
    """How the Absent and LWP Deduction was arrived at.

    Mirrors the component formula:
        (fixed earnings) / total_working_days * (absent_days + leave_without_pay)
    'Fixed earnings' = structure components only; Additional Salary rows such
    as Overtime are excluded, which is why OT never inflates the daily rate.
    """
    row = next((d for d in doc.deductions
                if d.salary_component == "Absent and LWP Deduction"), None)
    if not row or not flt(row.amount):
        return None

    fixed_gross = sum(flt(e.amount) for e in doc.earnings
                      if not e.get("additional_salary"))
    working_days = flt(doc.total_working_days)
    absent = flt(doc.absent_days)
    lwp    = flt(doc.leave_without_pay)
    unpaid = absent + lwp
    daily  = (fixed_gross / working_days) if working_days else 0.0

    dates = []
    for a in frappe.get_all(
        "Attendance",
        filters={
            "employee":        doc.employee,
            "docstatus":       1,
            "attendance_date": ["between", [doc.start_date, doc.end_date]],
            "status":          ["in", ["Absent", "Half Day", "On Leave"]],
        },
        fields=["attendance_date", "status", "leave_type"],
        order_by="attendance_date asc",
    ):
        # only unpaid days belong in this list
        if a.status == "Absent":
            label = "Absent"
        elif a.leave_type and frappe.db.get_value("Leave Type", a.leave_type, "is_lwp"):
            label = "LWP" if a.status == "On Leave" else "LWP ½"
        else:
            continue
        dates.append({"date": formatdate(a.attendance_date, "dd MMM"), "label": label})

    return {
        "amount":       flt(row.amount),
        "fixed_gross":  fixed_gross,
        "working_days": working_days,
        "daily_rate":   daily,
        "absent_days":  absent,
        "lwp_days":     lwp,
        "unpaid_days":  unpaid,
        "dates":        dates,
    }


def _paid_leave_summary(doc):
    """Paid leave consumed in the period — explains why absences did NOT
    reduce pay, which is otherwise invisible on the slip."""
    out = {}
    for la in frappe.get_all(
        "Leave Application",
        filters={
            "employee":  doc.employee,
            "docstatus": 1,
            "status":    "Approved",
            "from_date": ["<=", doc.end_date],
            "to_date":   [">=", doc.start_date],
        },
        fields=["leave_type", "total_leave_days"],
    ):
        if frappe.db.get_value("Leave Type", la.leave_type, "is_lwp"):
            continue
        out[la.leave_type] = out.get(la.leave_type, 0.0) + flt(la.total_leave_days)
    return out or None


def get_slip_breakdown(doc):
    """Entry point used by the Salary Slip print format."""
    try:
        return {
            "overtime":   _overtime_breakdown(doc),
            "absence":    _absence_breakdown(doc),
            "paid_leave": _paid_leave_summary(doc),
        }
    except Exception:
        # a print format must never hard-fail
        frappe.log_error(
            message=frappe.get_traceback(),
            title=f"Salary slip breakdown failed — {getattr(doc, 'name', '?')}",
        )
        return {"overtime": None, "absence": None, "paid_leave": None}
