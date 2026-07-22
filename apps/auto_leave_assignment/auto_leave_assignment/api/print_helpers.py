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
from frappe.utils import add_days, flt, formatdate, getdate


def _is_holiday(employee, date):
    """Same resolver the rest of the app uses (Holiday List Assignment)."""
    try:
        from hrms.utils.holiday_list import get_holiday_dates_between_range
        return bool(get_holiday_dates_between_range(
            employee, date, date, raise_exception_for_holiday_list=False
        ))
    except Exception:
        return False


def _holiday_set(employee, start_date, end_date):
    """All holiday dates in the range, as a set of date objects."""
    try:
        from hrms.utils.holiday_list import get_holiday_dates_between_range
        return {
            getdate(d) for d in get_holiday_dates_between_range(
                employee, start_date, end_date, raise_exception_for_holiday_list=False
            ) or []
        }
    except Exception:
        return set()


def _fmt_day(date):
    """'26 Feb (Thu)' — the exact day, which is what people check first."""
    d = getdate(date)
    return f"{formatdate(d, 'dd MMM')} ({formatdate(d, 'EEE')})"


def _unmarked_dates(doc):
    """Working days in the period with NO Attendance record at all.

    Payroll charges these as absent (Payroll Settings:
    consider_unmarked_attendance_as = "Absent") but there is no document to
    point at, so the exact dates have to be derived: every day in the period,
    minus holidays, minus days that do have attendance, minus any day outside
    the employment window.
    """
    holidays = _holiday_set(doc.employee, doc.start_date, doc.end_date)
    marked = {
        getdate(d) for d in frappe.get_all(
            "Attendance",
            filters={
                "employee":        doc.employee,
                "docstatus":       ["!=", 2],
                "attendance_date": ["between", [doc.start_date, doc.end_date]],
            },
            pluck="attendance_date",
        )
    }

    joining, relieving = frappe.db.get_value(
        "Employee", doc.employee, ["date_of_joining", "relieving_date"]
    ) or (None, None)

    out = []
    day = getdate(doc.start_date)
    last = getdate(doc.end_date)
    while day <= last:
        outside_employment = (
            (joining and day < getdate(joining))
            or (relieving and day > getdate(relieving))
        )
        if day not in holidays and day not in marked and not outside_employment:
            out.append(day)
        day = add_days(day, 1)
    return out


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
                "day":        formatdate(d.date, "EEE"),
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

    dates, accounted = [], 0.0
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
            label, weight = "Absent", 1.0
        elif a.leave_type and frappe.db.get_value("Leave Type", a.leave_type, "is_lwp"):
            if a.status == "On Leave":
                label, weight = "LWP", 1.0
            else:
                label, weight = "LWP ½", 0.5
        else:
            continue
        accounted += weight
        dates.append({
            "date":  _fmt_day(a.attendance_date),
            "label": label,
            "sort":  getdate(a.attendance_date),
        })

    # Days with NO attendance record at all are still charged as absent
    # (Payroll Settings: consider_unmarked_attendance_as = "Absent"), so they
    # never appear above. Derive the exact dates so every charged day is named.
    unmarked = round(unpaid - accounted, 2)
    if unmarked > 0:
        for d in _unmarked_dates(doc):
            dates.append({
                "date":  _fmt_day(d),
                "label": "No attendance",
                "sort":  d,
            })

    dates.sort(key=lambda x: x["sort"])

    return {
        "amount":       flt(row.amount),
        "fixed_gross":  fixed_gross,
        "working_days": working_days,
        "daily_rate":   daily,
        "absent_days":  absent,
        "lwp_days":     lwp,
        "unpaid_days":  unpaid,
        "dates":        dates,
        "unmarked_days": unmarked if unmarked > 0 else 0,
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


def _leave_days_detail(doc):
    """Every non-worked day in the period, dated, with the leave type applied.

    One unified list so an employee can see exactly which dates were charged
    to Casual / Annual / LWP, and which were not covered by leave at all.
    Leave Applications are expanded date by date (they may span days) and
    clipped to the payroll period.
    """
    holidays = _holiday_set(doc.employee, doc.start_date, doc.end_date)
    period_start, period_end = getdate(doc.start_date), getdate(doc.end_date)
    entries, seen = [], set()

    for la in frappe.get_all(
        "Leave Application",
        filters={
            "employee":  doc.employee,
            "docstatus": 1,
            "status":    "Approved",
            "from_date": ["<=", doc.end_date],
            "to_date":   [">=", doc.start_date],
        },
        fields=["leave_type", "from_date", "to_date", "half_day", "half_day_date"],
        order_by="from_date asc",
    ):
        is_lwp = bool(frappe.db.get_value("Leave Type", la.leave_type, "is_lwp"))
        include_holiday = bool(frappe.db.get_value("Leave Type", la.leave_type, "include_holiday"))

        day = max(getdate(la.from_date), period_start)
        stop = min(getdate(la.to_date), period_end)
        while day <= stop:
            # a holiday inside a leave range is not consumed unless the type says so
            if day in holidays and not include_holiday:
                day = add_days(day, 1)
                continue
            half = bool(la.half_day) and la.half_day_date and getdate(la.half_day_date) == day
            key = (day, la.leave_type)
            if key not in seen:
                seen.add(key)
                entries.append({
                    "sort":  day,
                    "date":  _fmt_day(day),
                    "type":  la.leave_type,
                    "days":  0.5 if half else 1.0,
                    "paid":  not is_lwp,
                })
            day = add_days(day, 1)

    # Absent days that no leave covered at all
    for a in frappe.get_all(
        "Attendance",
        filters={
            "employee":        doc.employee,
            "docstatus":       1,
            "status":          "Absent",
            "attendance_date": ["between", [doc.start_date, doc.end_date]],
        },
        fields=["attendance_date"],
    ):
        d = getdate(a.attendance_date)
        if not any(e["sort"] == d for e in entries):
            entries.append({"sort": d, "date": _fmt_day(d), "type": "Absent (no leave)",
                            "days": 1.0, "paid": False})

    # working days with no attendance record at all
    for d in _unmarked_dates(doc):
        if not any(e["sort"] == d for e in entries):
            entries.append({"sort": d, "date": _fmt_day(d), "type": "No attendance",
                            "days": 1.0, "paid": False})

    entries.sort(key=lambda e: e["sort"])
    return entries or None


def get_slip_breakdown(doc):
    """Entry point used by the Salary Slip print format."""
    try:
        return {
            "overtime":   _overtime_breakdown(doc),
            "absence":    _absence_breakdown(doc),
            "paid_leave": _paid_leave_summary(doc),
            "leave_days": _leave_days_detail(doc),
        }
    except Exception:
        # a print format must never hard-fail
        frappe.log_error(
            message=frappe.get_traceback(),
            title=f"Salary slip breakdown failed — {getattr(doc, 'name', '?')}",
        )
        return {"overtime": None, "absence": None, "paid_leave": None, "leave_days": None}
