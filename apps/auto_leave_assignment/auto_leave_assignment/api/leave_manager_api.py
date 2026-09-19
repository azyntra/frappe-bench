"""
leave_manager_api.py
--------------------
Backend for the Employee Leave Manager desk page.

This module is deliberately THIN. Every write goes through the existing engine
in core.py, which already owns the five areas that must stay in sync when leave
changes (Leave Application, Leave Ledger Entry, the first-pass Attendance write,
the authoritative Attendance finalize, and the Auto Leave Log).

The one area nothing in HRMS handles is the sixth: a Salary Slip that was
already calculated. `Payroll Settings.payroll_based_on = "Attendance"` on this
site, so pay is derived from ONE Attendance row per date — change that row after
a slip is submitted and the slip silently disagrees with reality forever.

So this page does not block changes into a paid period (real backdated
corrections happen), it makes them visible: every mutation reports the payroll
state, and get_payroll_rebuild_queue() recomputes each submitted slip through
the real engine and reports which ones no longer match.
"""

import json
from contextlib import contextmanager

import frappe
from frappe import _
from frappe.utils import (
    add_days,
    add_months,
    cint,
    date_diff,
    flt,
    get_first_day,
    get_last_day,
    getdate,
    today,
)

from auto_leave_assignment import core

READ_ROLES = ["HR Manager", "HR User", "System Manager"]
WRITE_ROLES = ["HR Manager", "System Manager"]

# Beyond this many rows a bulk apply goes to a background worker instead of
# blocking the HTTP request until it times out.
BULK_SYNC_LIMIT = 20
BULK_MAX = 500
# _build_allocation_plan() calls the balance API per leave type, so previewing
# every row of a very long worklist is not free.
PREVIEW_CAP = 200


# ─────────────────────────────────────────────
#  Shared helpers
# ─────────────────────────────────────────────

def _eligible_ft_employees():
    """Active employees whose CURRENT salary structure starts with 'FT-'.

    core._is_leave_eligible() answers this one employee at a time by calling
    get_assigned_salary_structure(); doing that for 81 employees on every page
    load is the N+1 that makes this page feel broken. Same rule, one query.
    """
    rows = frappe.db.sql("""
        SELECT   ssa.employee, e.employee_name, e.department, e.date_of_joining,
                 ssa.salary_structure, ssa.from_date
        FROM     `tabSalary Structure Assignment` ssa
        JOIN     `tabEmployee` e ON e.name = ssa.employee
        WHERE    ssa.docstatus = 1
          AND    e.status = 'Active'
        ORDER BY ssa.employee, ssa.from_date
    """, as_dict=True)

    # last row per employee wins = the current structure
    current = {}
    for r in rows:
        current[r.employee] = r

    return {
        e: r for e, r in current.items()
        if str(r.salary_structure or "").startswith("FT-")
    }


def _ft_employee_names():
    return list(_eligible_ft_employees().keys())


def _structure_timeline(employees):
    """Every submitted SSA per employee, ascending by from_date.

    Eligibility is DATE-DEPENDENT and the difference is not academic: EMP-00088
    was on 'Day Team - Daily Rate' until 2026-06-21 and FT- afterwards, so their
    absences before that date must not be offered for leave. Resolving the
    timeline in memory keeps the worklist to one query instead of one per row.
    """
    if not employees:
        return {}
    rows = frappe.db.sql("""
        SELECT   employee, salary_structure, from_date
        FROM     `tabSalary Structure Assignment`
        WHERE    docstatus = 1 AND employee IN %(emps)s
        ORDER BY employee, from_date
    """, {"emps": tuple(employees)}, as_dict=True)
    tl = {}
    for r in rows:
        tl.setdefault(r.employee, []).append((getdate(r.from_date), r.salary_structure))
    return tl


def _ft_on(timeline, employee, date):
    """Mirrors get_assigned_salary_structure(): the structure in force is the one
    with the greatest from_date <= date, and None before the first assignment.

    A date with no structure at all is NOT eligible — core._is_leave_eligible()
    fails closed for the same reason, because an unknown pay model could mean
    granting paid leave to someone paid per day worked.
    """
    best = None
    for from_date, structure in timeline.get(employee, []):
        if from_date <= date:
            best = structure
        else:
            break
    return bool(best and str(best).startswith("FT-"))


def _payroll_state_for(from_date, to_date, employees=None):
    """Salary slips whose period OVERLAPS the range.

    Overlap, not containment. LeaveApplication.validate_salary_processed_days()
    only checks whether from_date or to_date lands inside a slip, so a range
    that straddles a whole slip slips through its guard entirely.
    """
    conds = ["ss.docstatus IN (0, 1)", "ss.start_date <= %(to)s", "ss.end_date >= %(from)s"]
    params = {"from": from_date, "to": to_date}
    if employees:
        conds.append("ss.employee IN %(emps)s")
        params["emps"] = tuple(employees)

    rows = frappe.db.sql("""
        SELECT ss.name, ss.employee, ss.start_date, ss.end_date, ss.docstatus
        FROM   `tabSalary Slip` ss
        WHERE  {}
    """.format(" AND ".join(conds)), params, as_dict=True)

    submitted = [r for r in rows if cint(r.docstatus) == 1]
    drafts = [r for r in rows if cint(r.docstatus) == 0]

    cycles = sorted({(str(r.start_date), str(r.end_date)) for r in submitted})
    return {
        "state": "paid" if submitted else ("draft" if drafts else "open"),
        "submitted_count": len(submitted),
        "draft_count": len(drafts),
        "locked_employees": sorted({r.employee for r in submitted}),
        "cycles": [{"from_date": a, "to_date": b} for a, b in cycles],
    }


def _slip_covering(employee, date):
    """The submitted slip covering this employee/date, if any."""
    return frappe.db.sql("""
        SELECT name, start_date, end_date
        FROM   `tabSalary Slip`
        WHERE  docstatus = 1 AND employee = %s
          AND  %s BETWEEN start_date AND end_date
        LIMIT  1
    """, (employee, date), as_dict=True)


@contextmanager
def _suppressed_leave_notifications():
    """HR Settings.send_leave_notification is on, so a 55-row bulk apply would
    send 55 emails. The cache lock matters: without it a single-row apply
    running concurrently elsewhere would silently lose its notification.
    """
    lock = frappe.cache().lock("elm_bulk_apply", timeout=900)
    acquired = False
    previous = None
    try:
        try:
            acquired = lock.acquire(blocking=True)
        except Exception:
            acquired = False
        previous = frappe.db.get_single_value("HR Settings", "send_leave_notification")
        if cint(previous):
            frappe.db.set_single_value("HR Settings", "send_leave_notification", 0)
        yield
    finally:
        try:
            if cint(previous):
                frappe.db.set_single_value("HR Settings", "send_leave_notification", 1)
        finally:
            if acquired:
                try:
                    lock.release()
                except Exception:
                    pass


def _map_exception(exc):
    """Structured {code, message} for the UI.

    The typed exceptions are catchable. Everything else in leave_application.py
    raises a BARE ValidationError, so the substring branches below are the only
    way to tell them apart — each names its source line so the match can be
    rechecked after an HRMS upgrade.
    """
    from hrms.hr.doctype.leave_application.leave_application import (
        AttendanceAlreadyMarkedError,
        InsufficientLeaveBalanceError,
        LeaveAcrossAllocationsError,
        LeaveDayBlockedError,
        OverlapError,
    )

    if isinstance(exc, InsufficientLeaveBalanceError):
        return {"code": "NO_BALANCE",
                "message": _("Not enough balance for that leave type.")}
    if isinstance(exc, OverlapError):
        return {"code": "OVERLAP",
                "message": _("A leave application already covers this date.")}
    if isinstance(exc, AttendanceAlreadyMarkedError):
        return {"code": "ATT_MARKED",
                "message": _("Attendance is already marked Present for this date.")}
    if isinstance(exc, LeaveAcrossAllocationsError):
        return {"code": "ACROSS_ALLOC",
                "message": _("This date spans two allocation periods.")}
    if isinstance(exc, LeaveDayBlockedError):
        return {"code": "BLOCKED",
                "message": _("This date is in the Leave Block List.")}
    if isinstance(exc, frappe.PermissionError):
        return {"code": "PERM", "message": _("You need the HR Manager role for this.")}

    text = str(exc or "")
    low = text.lower()
    # leave_application.py:543 — max_continuous_days_allowed
    if "consecutive" in low or "max_continuous" in low:
        return {"code": "MAX_CONTINUOUS", "message": text}
    # leave_application.py:420 — every day in the range is a holiday
    if "holiday" in low:
        return {"code": "HOLIDAY", "message": _("This date is a holiday — no leave needed.")}
    # leave_application.py:377 — salary already processed (LWP types only)
    if "salary already processed" in low:
        return {"code": "PAYROLL_LOCKED", "message": text}
    # leave_application.py:221 — no allocation covers the date (bare throw)
    if "allocation" in low:
        return {"code": "NO_ALLOCATION", "message": text}

    return {"code": "UNKNOWN", "message": text or _("Could not apply leave.")}


def _log_rows_for(employee, date):
    return frappe.get_all(
        "Auto Leave Log",
        filters={"split_group": core._split_group(employee, getdate(date))},
        fields=["name", "status", "leave_type", "leave_days", "chunk_index",
                "is_split", "leave_application", "remarks"],
        order_by="chunk_index asc, creation asc",
    )


# ─────────────────────────────────────────────
#  Period resolution
# ─────────────────────────────────────────────

@frappe.whitelist()
def resolve_period(mode="payroll", anchor=None):
    """Single source of truth for period maths — the JS never computes bounds.

    The pay cycle runs the 21st -> 20th, so "September 2026" as a PAYROLL period
    means 2026-08-21..2026-09-20. Getting this wrong means an operator fixes a
    day believing it lands in a different month's payroll than it does.
    """
    frappe.only_for(READ_ROLES)

    anchor = anchor or today()[:7]
    year, month = [cint(x) for x in str(anchor)[:7].split("-")]
    first = getdate(f"{year:04d}-{month:02d}-01")

    if mode == "calendar":
        from_date, to_date = get_first_day(first), get_last_day(first)
        label = from_date.strftime("%b %Y")
    else:
        mode = "payroll"
        to_date = getdate(f"{year:04d}-{month:02d}-20")
        from_date = add_days(getdate(f"{year:04d}-{month:02d}-01"), -1)
        from_date = getdate(f"{from_date.year:04d}-{from_date.month:02d}-21")
        label = "%s – %s" % (from_date.strftime("%d %b"), to_date.strftime("%d %b %Y"))

    prev_anchor = add_months(first, -1).strftime("%Y-%m")
    next_anchor = add_months(first, 1).strftime("%Y-%m")
    return {
        "mode": mode, "anchor": f"{year:04d}-{month:02d}",
        "from_date": str(from_date), "to_date": str(to_date), "label": label,
        "prev_anchor": prev_anchor, "next_anchor": next_anchor,
    }


# ─────────────────────────────────────────────
#  Read endpoints
# ─────────────────────────────────────────────

@frappe.whitelist()
def get_filter_options():
    frappe.only_for(READ_ROLES)

    emps = _eligible_ft_employees()
    employees = [
        {"name": e, "employee_name": r.employee_name, "department": r.department}
        for e, r in sorted(emps.items(), key=lambda kv: (kv[1].employee_name or kv[0]))
    ]
    departments = sorted({r["department"] for r in employees if r["department"]})
    leave_types = frappe.get_all(
        "Leave Type", fields=["name", "is_lwp", "max_leaves_allowed"], order_by="name")
    return {"employees": employees, "departments": departments,
            "leave_types": leave_types, "chain": core._leave_chain()}


@frappe.whitelist()
def get_leave_overview(from_date, to_date, department=None, leave_type=None,
                       employee=None, only_problems=0):
    """Balance grid + KPIs.

    Aggregate queries only. get_leave_details() is the canonical per-employee
    shape but it re-derives consumption from the ledger per leave type, so for
    57 employees it is ~114 round trips. The figures here are DISPLAY ONLY —
    every decision re-checks the exact consumable balance via core.
    """
    frappe.only_for(READ_ROLES)
    from_date, to_date = getdate(from_date), getdate(to_date)

    emps = _eligible_ft_employees()
    if employee:
        emps = {k: v for k, v in emps.items() if k == employee}
    if department:
        emps = {k: v for k, v in emps.items() if v.department == department}
    if not emps:
        return {"rows": [], "kpis": _empty_kpis(), "payroll": _payroll_state_for(from_date, to_date)}

    names = tuple(emps.keys())

    # allocated: ledger rows from allocations AND adjustments (matches
    # get_leave_allocation_records), excluding expired and LWP
    allocated = {}
    for r in frappe.db.sql("""
        SELECT employee, leave_type, SUM(leaves) amt
        FROM   `tabLeave Ledger Entry`
        WHERE  docstatus = 1 AND is_expired = 0 AND is_lwp = 0
          AND  transaction_type IN ('Leave Allocation', 'Leave Adjustment')
          AND  employee IN %(emps)s AND from_date <= %(to)s AND to_date >= %(from)s
        GROUP BY employee, leave_type
    """, {"emps": names, "from": from_date, "to": to_date}, as_dict=True):
        allocated[(r.employee, r.leave_type)] = flt(r.amt)

    # taken over the whole allocation window (drives Remaining)
    taken = {}
    for r in frappe.db.sql("""
        SELECT employee, leave_type, SUM(leaves) amt
        FROM   `tabLeave Ledger Entry`
        WHERE  docstatus = 1 AND transaction_type = 'Leave Application'
          AND  employee IN %(emps)s
        GROUP BY employee, leave_type
    """, {"emps": names}, as_dict=True):
        taken[(r.employee, r.leave_type)] = abs(flt(r.amt))

    # taken inside the selected period only (display column)
    taken_period = {}
    for r in frappe.db.sql("""
        SELECT employee, leave_type, SUM(total_leave_days) d
        FROM   `tabLeave Application`
        WHERE  docstatus = 1 AND status = 'Approved'
          AND  employee IN %(emps)s AND from_date <= %(to)s AND to_date >= %(from)s
        GROUP BY employee, leave_type
    """, {"emps": names, "from": from_date, "to": to_date}, as_dict=True):
        taken_period[(r.employee, r.leave_type)] = flt(r.d)

    pending = {}
    for r in frappe.db.sql("""
        SELECT employee, leave_type, SUM(total_leave_days) d
        FROM   `tabLeave Application`
        WHERE  docstatus = 0 AND status = 'Open' AND employee IN %(emps)s
        GROUP BY employee, leave_type
    """, {"emps": names}, as_dict=True):
        pending[(r.employee, r.leave_type)] = flt(r.d)

    # absent / LWP days in the period, counted the way the salary slip counts
    # them (calculate_lwp_ppl_and_absent_days_based_on_attendance)
    lwp_types = set(frappe.get_all("Leave Type", filters={"is_lwp": 1}, pluck="name"))
    att = {}
    for r in frappe.db.sql("""
        SELECT employee, status, leave_type, half_day_status, COUNT(*) n
        FROM   `tabAttendance`
        WHERE  docstatus = 1 AND employee IN %(emps)s
          AND  attendance_date BETWEEN %(from)s AND %(to)s
          AND  status IN ('Absent', 'Half Day', 'On Leave')
        GROUP BY employee, status, leave_type, half_day_status
    """, {"emps": names, "from": from_date, "to": to_date}, as_dict=True):
        cur = att.setdefault(r.employee, {"absent": 0.0, "lwp": 0.0})
        if r.status == "Absent":
            cur["absent"] += r.n
        elif r.status == "On Leave" and r.leave_type in lwp_types:
            cur["lwp"] += r.n
        elif r.status == "Half Day":
            if r.leave_type in lwp_types:
                cur["lwp"] += 0.5 * r.n
            if r.half_day_status == "Absent":
                cur["absent"] += 0.5 * r.n

    types = [t for t in core._leave_chain() if t not in lwp_types]
    if leave_type:
        types = [t for t in types if t == leave_type]

    rows = []
    for e, meta in emps.items():
        cells, has_alloc, exhausted = {}, False, False
        for t in types:
            a = flt(allocated.get((e, t), 0))
            tk = flt(taken.get((e, t), 0))
            pd = flt(pending.get((e, t), 0))
            if a:
                has_alloc = True
            remaining = a - tk - pd
            if a and remaining <= 0:
                exhausted = True
            cells[t] = {"allocated": a, "taken": tk,
                        "taken_period": flt(taken_period.get((e, t), 0)),
                        "pending": pd, "remaining": remaining}
        days = att.get(e, {"absent": 0.0, "lwp": 0.0})
        row = {
            "employee": e, "employee_name": meta.employee_name,
            "department": meta.department, "cells": cells,
            "absent_days": days["absent"], "lwp_days": days["lwp"],
            "no_allocation": not has_alloc, "exhausted": exhausted,
        }
        row["status"] = ("No Allocation" if not has_alloc
                         else "Exhausted" if exhausted
                         else "OK")
        rows.append(row)

    if cint(only_problems):
        rows = [r for r in rows
                if r["no_allocation"] or r["exhausted"] or r["absent_days"] or r["lwp_days"]]

    kpis = {
        "eligible": len(emps),
        "absent_days": sum(r["absent_days"] for r in rows),
        "lwp_days": sum(r["lwp_days"] for r in rows),
        "no_allocation": sum(1 for r in rows if r["no_allocation"]),
        "exhausted": sum(1 for r in rows if r["exhausted"]),
    }
    for t in types:
        kpis["remaining_" + frappe.scrub(t)] = sum(
            r["cells"].get(t, {}).get("remaining", 0) for r in rows)

    return {"rows": rows, "kpis": kpis, "types": types,
            "payroll": _payroll_state_for(from_date, to_date, list(emps.keys()))}


def _empty_kpis():
    return {"eligible": 0, "absent_days": 0, "lwp_days": 0,
            "no_allocation": 0, "exhausted": 0}


@frappe.whitelist()
def get_employee_balance_exact(employee, date):
    """The authoritative per-employee shape, straight from HRMS."""
    frappe.only_for(READ_ROLES)
    from hrms.hr.doctype.leave_application.leave_application import get_leave_details
    return get_leave_details(employee, getdate(date))


@frappe.whitelist()
def get_missing_leave_worklist(from_date, to_date, employee=None, department=None,
                               with_preview=1):
    """Submitted Absent/Half Day Attendance with no leave covering it.

    Restricted to FT- staff: applying paid leave to day-team staff would pay
    them for a day they did not work.
    """
    frappe.only_for(READ_ROLES)
    from_date, to_date = getdate(from_date), getdate(to_date)

    emps = _eligible_ft_employees()
    if employee:
        emps = {k: v for k, v in emps.items() if k == employee}
    if department:
        emps = {k: v for k, v in emps.items() if v.department == department}
    if not emps:
        return {"rows": [], "total": 0, "locked": 0}

    rows = frappe.db.sql("""
        SELECT a.name, a.employee, a.attendance_date, a.status, a.half_day_status
        FROM   `tabAttendance` a
        WHERE  a.docstatus = 1
          AND  a.status IN ('Absent', 'Half Day')
          AND  a.employee IN %(emps)s
          AND  a.attendance_date BETWEEN %(from)s AND %(to)s
          AND  NOT EXISTS (
                 SELECT 1 FROM `tabLeave Application` la
                 WHERE la.docstatus = 1 AND la.status = 'Approved'
                   AND la.employee = a.employee
                   AND a.attendance_date BETWEEN la.from_date AND la.to_date)
        ORDER BY a.attendance_date DESC, a.employee ASC
    """, {"emps": tuple(emps.keys()), "from": from_date, "to": to_date}, as_dict=True)

    # Eligibility on the ATTENDANCE DATE, not today. Without this the list
    # offers days the employee was on the day-team roster for, which then fail
    # at apply time — a row you can click that always errors.
    tl = _structure_timeline(list(emps.keys()))
    rows = [r for r in rows if _ft_on(tl, r.employee, getdate(r.attendance_date))]

    # a day the engine already handled and whose application is still live
    rows = [r for r in rows if not core._already_logged(r.employee, r.attendance_date)]

    state = _payroll_state_for(from_date, to_date, list(emps.keys()))
    locked_emps = set(state["locked_employees"])

    out, locked = [], 0
    for i, r in enumerate(rows):
        meta = emps[r.employee]
        slip = _slip_covering(r.employee, r.attendance_date) if r.employee in locked_emps else []
        is_locked = bool(slip)
        if is_locked:
            locked += 1

        preview, is_holiday = None, False
        if cint(with_preview) and i < PREVIEW_CAP:
            try:
                is_holiday = core._is_holiday(r.employee, r.attendance_date)
                if not is_holiday:
                    # half-units outstanding: a full Absent day needs 2, an
                    # uncovered Half Day needs 1
                    plan = core._build_allocation_plan(
                        r.employee, getdate(r.attendance_date),
                        2 if r.status == "Absent" else 1)
                    preview = [{"leave_type": lt, "days": d,
                                "is_lwp": core._is_lwp_type(lt)} for lt, d in plan]
            except Exception:
                preview = None

        # What applying this row would actually achieve.
        #
        #   paid_leave  - the chain has paid leave available, so an unpaid day
        #                 becomes a paid one. Real money.
        #   lwp_only    - the chain can only reach Leave Without Pay. Payroll
        #                 subtracts BOTH lwp and absent from payment_days
        #                 (salary_slip.py:524-527), so moving Absent -> LWP
        #                 changes the record and not the pay.
        #   blocked_lwp - lwp_only inside an already-processed payroll period.
        #                 validate_salary_processed_days() (leave_application.py:362)
        #                 refuses LWP there, so applying can only ever fail.
        has_paid = any(not c["is_lwp"] for c in (preview or []))
        if preview is None:
            effect = "unknown"
        elif has_paid:
            effect = "paid_leave"
        elif is_locked:
            effect = "blocked_lwp"
        else:
            effect = "lwp_only"

        out.append({
            "attendance": r.name, "employee": r.employee,
            "employee_name": meta.employee_name, "department": meta.department,
            "attendance_date": str(r.attendance_date), "status": r.status,
            "half_day_status": r.half_day_status,
            "plan_preview": preview, "is_holiday": is_holiday,
            "payroll_locked": is_locked,
            "payroll_slip": slip[0].name if slip else None,
            "effect": effect,
        })

    return {"rows": out, "total": len(out), "locked": locked,
            "actionable": sum(1 for r in out if r["effect"] in ("paid_leave", "lwp_only")),
            "blocked": sum(1 for r in out if r["effect"] == "blocked_lwp"),
            "pay_changing": sum(1 for r in out if r["effect"] == "paid_leave"),
            "preview_capped": len(out) > PREVIEW_CAP}


@frappe.whitelist()
def get_payroll_state(from_date, to_date):
    frappe.only_for(READ_ROLES)
    return _payroll_state_for(getdate(from_date), getdate(to_date), _ft_employee_names())


@frappe.whitelist()
def get_attendance_coverage(from_date, to_date):
    """Feeds the 'this period is barely imported' banner.

    consider_unmarked_attendance_as = 'Absent', so a period with no attendance
    does not fail loudly — it pays everyone nothing.
    """
    frappe.only_for(READ_ROLES)
    from_date, to_date = getdate(from_date), getdate(to_date)
    emps = _ft_employee_names()
    if not emps:
        return {"eligible": 0, "with_attendance": 0, "pct": 0, "marked_days": 0}

    row = frappe.db.sql("""
        SELECT COUNT(DISTINCT employee) n, COUNT(*) rows_n
        FROM   `tabAttendance`
        WHERE  docstatus = 1 AND employee IN %(emps)s
          AND  attendance_date BETWEEN %(from)s AND %(to)s
    """, {"emps": tuple(emps), "from": from_date, "to": to_date}, as_dict=True)[0]

    pct = (flt(row.n) / len(emps) * 100.0) if emps else 0
    return {"eligible": len(emps), "with_attendance": cint(row.n),
            "marked_days": cint(row.rows_n), "pct": round(pct, 1)}


@frappe.whitelist()
def get_unallocated_employees(as_of_date=None):
    """FT- staff with no leave allocation covering the date.

    Every absence these employees take falls straight through the chain to
    Leave Without Pay. This is the largest live money issue the page surfaces.
    """
    frappe.only_for(READ_ROLES)
    as_of_date = getdate(as_of_date or today())
    emps = _eligible_ft_employees()
    if not emps:
        return []

    lwp_types = set(frappe.get_all("Leave Type", filters={"is_lwp": 1}, pluck="name"))
    wanted = [t for t in core._leave_chain() if t not in lwp_types]

    held = {}
    for r in frappe.db.sql("""
        SELECT employee, leave_type FROM `tabLeave Allocation`
        WHERE docstatus = 1 AND employee IN %(emps)s
          AND from_date <= %(d)s AND to_date >= %(d)s
        GROUP BY employee, leave_type
    """, {"emps": tuple(emps.keys()), "d": as_of_date}, as_dict=True):
        held.setdefault(r.employee, set()).add(r.leave_type)

    out = []
    for e, meta in emps.items():
        missing = [t for t in wanted if t not in held.get(e, set())]
        if not missing:
            continue
        absences = frappe.db.sql("""
            SELECT COUNT(*) n FROM `tabAttendance`
            WHERE docstatus = 1 AND employee = %s AND status IN ('Absent', 'Half Day')
              AND YEAR(attendance_date) = %s
        """, (e, as_of_date.year), as_dict=True)[0].n
        out.append({
            "employee": e, "employee_name": meta.employee_name,
            "department": meta.department,
            "date_of_joining": str(meta.date_of_joining) if meta.date_of_joining else None,
            "missing_types": missing, "absences_ytd": cint(absences),
        })
    return sorted(out, key=lambda r: -r["absences_ytd"])


@frappe.whitelist()
def get_payroll_rebuild_queue(cycles=None):
    """Submitted slips whose figures no longer match a fresh recompute.

    Recomputing by hand-counting Attendance rows does NOT work — it ignores
    unmarked days, which this site treats as Absent, and produces a false
    positive on essentially every slip. So we build a real Salary Slip in
    memory and let HRMS compute it. The doc is never inserted.

    Expensive (one doc build per slip), so this is on-demand only.
    """
    frappe.only_for(READ_ROLES)

    if isinstance(cycles, str):
        cycles = json.loads(cycles)
    if not cycles:
        cycles = [
            {"from_date": str(r.start_date), "to_date": str(r.end_date)}
            for r in frappe.db.sql("""
                SELECT start_date, end_date FROM `tabSalary Slip`
                WHERE docstatus = 1 GROUP BY start_date, end_date
                ORDER BY start_date DESC LIMIT 12
            """, as_dict=True)
        ]

    out = []
    for c in cycles:
        lo, hi = getdate(c["from_date"]), getdate(c["to_date"])
        slips = frappe.db.sql("""
            SELECT name, employee, company, leave_without_pay, absent_days,
                   payment_days, total_working_days, net_pay
            FROM   `tabSalary Slip`
            WHERE  docstatus = 1 AND start_date = %s AND end_date = %s
        """, (lo, hi), as_dict=True)

        stale, errors = [], 0
        for s in slips:
            try:
                fresh = frappe.new_doc("Salary Slip")
                fresh.employee = s.employee
                fresh.start_date, fresh.end_date = lo, hi
                fresh.posting_date = hi
                fresh.company = s.company
                fresh.payroll_frequency = "Monthly"
                fresh.get_emp_and_working_day_details()
            except Exception:
                errors += 1
                continue

            d_lwp = flt(fresh.leave_without_pay) - flt(s.leave_without_pay)
            d_abs = flt(fresh.absent_days) - flt(s.absent_days)
            d_pay = flt(fresh.payment_days) - flt(s.payment_days)
            if abs(d_lwp) > 0.01 or abs(d_abs) > 0.01 or abs(d_pay) > 0.01:
                stale.append({
                    "slip": s.name, "employee": s.employee,
                    "employee_name": frappe.db.get_value("Employee", s.employee, "employee_name"),
                    "stored": {"lwp": flt(s.leave_without_pay), "absent": flt(s.absent_days),
                               "payment_days": flt(s.payment_days)},
                    "recomputed": {"lwp": flt(fresh.leave_without_pay),
                                   "absent": flt(fresh.absent_days),
                                   "payment_days": flt(fresh.payment_days)},
                    "delta_payment_days": d_pay,
                })

        out.append({"from_date": str(lo), "to_date": str(hi), "slips": len(slips),
                    "stale": stale, "stale_count": len(stale), "errors": errors})
    return {"cycles": out, "total_stale": sum(c["stale_count"] for c in out)}


# ─────────────────────────────────────────────
#  Mutations
# ─────────────────────────────────────────────

def _apply_one(attendance_name, note=None):
    """Apply the auto chain to one Attendance. Returns a structured result.

    Never raises: the bulk caller needs to aggregate per-row outcomes rather
    than lose the whole batch to one bad day.
    """
    try:
        att = frappe.get_doc("Attendance", attendance_name)
    except frappe.DoesNotExistError:
        return {"ok": False, "code": "NOT_FOUND", "message": _("Attendance not found.")}

    if cint(att.docstatus) != 1:
        return {"ok": False, "code": "NOT_SUBMITTED",
                "message": _("Attendance is not submitted.")}
    if att.status not in ("Absent", "Half Day"):
        return {"ok": False, "code": "NOT_ABSENT",
                "message": _("Attendance is {0}, not Absent or Half Day.").format(att.status)}
    if not core._is_leave_eligible(att.employee, getdate(att.attendance_date)):
        return {"ok": False, "code": "NOT_ELIGIBLE",
                "message": _("Not a monthly (FT-) employee — leave does not apply.")}

    slip = _slip_covering(att.employee, att.attendance_date)

    sp = "elm_" + str(abs(hash((attendance_name, "apply"))))[:12]
    frappe.db.savepoint(sp)
    try:
        # called_from_scheduler=True: an HTTP request is not inside an
        # Attendance submit transaction, so the engine owns its commit.
        core.assign_leave_for_attendance(att, called_from_scheduler=True)
    except Exception as e:
        frappe.db.rollback(save_point=sp)
        mapped = _map_exception(e)
        return {"ok": False, "code": mapped["code"], "message": mapped["message"]}

    logs = _log_rows_for(att.employee, att.attendance_date)
    applied = [l for l in logs if l.status == "Assigned"]
    if not applied:
        skipped = [l for l in logs if l.status in ("Skipped", "Error")]
        remark = skipped[-1].remarks if skipped else _("No leave was assigned.")
        return {"ok": False, "code": "SKIPPED", "message": remark}

    if slip:
        for l in applied:
            _annotate_log(l.name, "[PAYROLL] applied inside a period already paid by %s%s"
                          % (slip[0].name, (" — " + note) if note else ""))

    return {
        "ok": True, "code": "APPLIED",
        "applied": [{"leave_type": l.leave_type, "days": flt(l.leave_days),
                     "leave_application": l.leave_application} for l in applied],
        "payroll_locked": bool(slip),
        "payroll_slip": slip[0].name if slip else None,
    }


def _annotate_log(log_name, text):
    try:
        cur = frappe.db.get_value("Auto Leave Log", log_name, "remarks") or ""
        frappe.db.set_value("Auto Leave Log", log_name, "remarks",
                            (cur + " | " + text).strip(" |"), update_modified=False)
    except Exception:
        pass


@frappe.whitelist()
def apply_leave_for_attendance(attendance_name, note=None):
    """One-click apply using the automatic Casual -> Annual -> LWP chain."""
    frappe.only_for(WRITE_ROLES)
    res = _apply_one(attendance_name, note=note)
    frappe.db.commit()
    return res


@frappe.whitelist()
def apply_leave_with_type(attendance_name, leave_type, note=None):
    """Manual override: force a specific leave type for this day.

    Reuses the engine's own tail (_submit_application -> _finalize_attendance ->
    _log_group) so the Attendance end-state contract and the audit log are
    identical to an automatic assignment. No new leave logic lives here.
    """
    frappe.only_for(WRITE_ROLES)

    att = frappe.get_doc("Attendance", attendance_name)
    if cint(att.docstatus) != 1 or att.status not in ("Absent", "Half Day"):
        return {"ok": False, "code": "NOT_ABSENT",
                "message": _("Attendance must be a submitted Absent or Half Day row.")}
    if not core._is_leave_eligible(att.employee, getdate(att.attendance_date)):
        return {"ok": False, "code": "NOT_ELIGIBLE",
                "message": _("Not a monthly (FT-) employee — leave does not apply.")}
    if not frappe.db.exists("Leave Type", leave_type):
        return {"ok": False, "code": "BAD_TYPE", "message": _("Unknown leave type.")}

    att_date = getdate(att.attendance_date)
    required = 0.5 if att.status == "Half Day" else 1.0
    covered = core._covered_days(att.employee, att_date)
    if covered >= required:
        return {"ok": False, "code": "OVERLAP",
                "message": _("This date is already covered by a leave application.")}

    days = required - covered
    if not core._is_lwp_type(leave_type):
        if not core._has_allocation(att.employee, leave_type, att_date):
            return {"ok": False, "code": "NO_ALLOCATION",
                    "message": _("{0} has no {1} allocation covering this date.").format(
                        att.employee, leave_type)}
        if core._consumable_balance(att.employee, leave_type, att_date) < days:
            return {"ok": False, "code": "NO_BALANCE",
                    "message": _("Not enough {0} balance for {1} day(s).").format(leave_type, days)}
    if core._leave_days_for(att.employee, leave_type, att_date, half_day=(days == 0.5)) <= 0:
        return {"ok": False, "code": "HOLIDAY",
                "message": _("This date is a holiday for {0}.").format(leave_type)}

    slip = _slip_covering(att.employee, att_date)
    original_status = att.status
    original_half = att.get("half_day_status")

    mark = core._suppress_begin()
    sp = "elmt_" + str(abs(hash((attendance_name, leave_type))))[:12]
    frappe.db.savepoint(sp)
    try:
        applied = [core._submit_application(att, leave_type, days, att_date, 1, 1)]
        core._finalize_attendance(att, applied, original_status, original_half)
        core._log_group(att.employee, att_date, applied, att.name,
                        original_status, original_half)
        frappe.db.commit()
    except Exception as e:
        frappe.db.rollback(save_point=sp)
        frappe.log_error(message=frappe.get_traceback(),
                         title=f"Leave Manager manual apply failed — {att.employee} {att_date}")
        mapped = _map_exception(e)
        return {"ok": False, "code": mapped["code"], "message": mapped["message"]}
    finally:
        core._suppress_end(mark)

    if slip:
        for l in _log_rows_for(att.employee, att_date):
            if l.status == "Assigned":
                _annotate_log(l.name, "[PAYROLL] applied inside a period already paid by %s%s"
                              % (slip[0].name, (" — " + note) if note else ""))
        frappe.db.commit()

    return {"ok": True, "code": "APPLIED",
            "applied": [{"leave_type": a["leave_type"], "days": a["days"],
                         "leave_application": a["name"]} for a in applied],
            "payroll_locked": bool(slip),
            "payroll_slip": slip[0].name if slip else None}


def _run_bulk(attendance_names, note=None, publish=False):
    results = []
    total = len(attendance_names)
    with _suppressed_leave_notifications():
        for i, name in enumerate(attendance_names, start=1):
            meta = frappe.db.get_value(
                "Attendance", name, ["employee", "attendance_date"], as_dict=True) or {}
            res = _apply_one(name, note=note)
            res.update({
                "attendance": name,
                "employee": meta.get("employee"),
                "employee_name": frappe.db.get_value(
                    "Employee", meta.get("employee"), "employee_name") if meta.get("employee") else None,
                "attendance_date": str(meta.get("attendance_date") or ""),
            })
            results.append(res)
            frappe.db.commit()
            if publish:
                frappe.publish_realtime("elm_bulk_progress",
                                        {"done": i, "total": total, "last": res},
                                        user=frappe.session.user)

    summary = {
        "total": total,
        "applied": sum(1 for r in results if r.get("ok")),
        "failed": sum(1 for r in results if not r.get("ok")),
        "into_paid_period": sum(1 for r in results if r.get("payroll_locked")),
    }
    if publish:
        frappe.publish_realtime("elm_bulk_done", {"results": results, "summary": summary},
                                user=frappe.session.user)
    return {"results": results, "summary": summary}


@frappe.whitelist()
def bulk_apply_leave(attendance_names, note=None):
    """Apply many days. Each row runs in its own savepoint and commits on its
    own — one employee's rejection must never roll back the other 54."""
    frappe.only_for(WRITE_ROLES)

    if isinstance(attendance_names, str):
        attendance_names = json.loads(attendance_names)
    attendance_names = list(dict.fromkeys(attendance_names or []))
    if not attendance_names:
        return {"queued": False, "results": [], "summary": {"total": 0, "applied": 0, "failed": 0}}
    if len(attendance_names) > BULK_MAX:
        frappe.throw(_("Select at most {0} rows at a time.").format(BULK_MAX))

    if len(attendance_names) > BULK_SYNC_LIMIT:
        frappe.enqueue(
            "auto_leave_assignment.api.leave_manager_api._run_bulk",
            queue="long", timeout=3600, attendance_names=attendance_names,
            note=note, publish=True,
        )
        return {"queued": True, "total": len(attendance_names)}

    out = _run_bulk(attendance_names, note=note, publish=False)
    out["queued"] = False
    return out


@frappe.whitelist()
def undo_leave_for_day(employee, attendance_date):
    """Reverse an auto-assigned day.

    Delegates to the existing cancel_auto_leave, which is split-group aware
    (cancels the unpaid chunk first) and restores the Attendance row afterwards
    — LeaveApplication.cancel_attendance() sets it to docstatus=2 otherwise.
    """
    frappe.only_for(WRITE_ROLES)

    logs = frappe.get_all(
        "Auto Leave Log",
        filters={"split_group": core._split_group(employee, getdate(attendance_date)),
                 "status": "Assigned"},
        fields=["name"], order_by="creation desc", limit=1)
    if not logs:
        return {"success": False, "message": _("No auto-assigned leave found for this day.")}

    slip = _slip_covering(employee, getdate(attendance_date))

    from auto_leave_assignment.api.dashboard_api import cancel_auto_leave
    res = cancel_auto_leave(logs[0].name)
    res["payroll_locked"] = bool(slip)
    res["payroll_slip"] = slip[0].name if slip else None
    return res


@frappe.whitelist()
def create_leave_allocation(employee, leave_type, from_date, to_date, new_leaves_allocated):
    """Grant a missing entitlement.

    A real Leave Allocation, not a Leave Adjustment: an adjustment is a method
    on an EXISTING allocation, and these employees have none. Note this does
    not retroactively re-chain past absences — days already booked as LWP stay
    LWP until deliberately reworked.
    """
    frappe.only_for(WRITE_ROLES)

    if not core._is_leave_eligible(employee, getdate(to_date)):
        return {"ok": False, "message": _("{0} is not a monthly (FT-) employee.").format(employee)}
    if core._is_lwp_type(leave_type):
        return {"ok": False, "message": _("Leave Without Pay is not allocated.")}
    if frappe.db.exists("Leave Allocation", {
            "employee": employee, "leave_type": leave_type, "docstatus": 1,
            "from_date": ["<=", to_date], "to_date": [">=", from_date]}):
        return {"ok": False, "message": _("An allocation already covers that period.")}

    cap = flt(frappe.db.get_value("Leave Type", leave_type, "max_leaves_allowed"))
    if cap and flt(new_leaves_allocated) > cap:
        return {"ok": False,
                "message": _("{0} allows at most {1} days.").format(leave_type, cap)}

    try:
        doc = frappe.get_doc({
            "doctype": "Leave Allocation",
            "employee": employee,
            "leave_type": leave_type,
            "from_date": getdate(from_date),
            "to_date": getdate(to_date),
            "new_leaves_allocated": flt(new_leaves_allocated),
            "carry_forward": 0,
            "description": "Created from the Employee Leave Manager page.",
        })
        doc.flags.ignore_permissions = True
        doc.insert()
        doc.submit()
        frappe.db.commit()
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(message=frappe.get_traceback(),
                         title=f"Leave Manager allocation failed — {employee} {leave_type}")
        return {"ok": False, "message": _map_exception(e)["message"]}

    return {"ok": True, "allocation": doc.name,
            "message": _("Allocated {0} day(s) of {1}.").format(
                flt(new_leaves_allocated), leave_type)}


# ─────────────────────────────────────────────
#  Simple per-employee view (search -> open -> act)
# ─────────────────────────────────────────────

def _year_bounds(year=None):
    y = cint(year) or getdate(today()).year
    return getdate(f"{y}-01-01"), getdate(f"{y}-12-31"), y


def _paid_periods(employee):
    """Cycles already paid for this employee, so the UI can warn per date."""
    return frappe.db.sql("""
        SELECT name, start_date, end_date FROM `tabSalary Slip`
        WHERE docstatus = 1 AND employee = %s ORDER BY start_date
    """, employee, as_dict=True)


def _balances_for(employee, on_date):
    """Allocated / taken / pending / left per paid leave type, plus the
    allocation each one hangs off so the UI can offer a Change button."""
    lwp = set(frappe.get_all("Leave Type", filters={"is_lwp": 1}, pluck="name"))
    out = []
    for lt in [t for t in core._leave_chain() if t not in lwp]:
        alloc = frappe.db.sql("""
            SELECT name, total_leaves_allocated, new_leaves_allocated, from_date, to_date
            FROM   `tabLeave Allocation`
            WHERE  docstatus = 1 AND employee = %s AND leave_type = %s
              AND  from_date <= %s AND to_date >= %s
            ORDER BY from_date DESC LIMIT 1
        """, (employee, lt, on_date, on_date), as_dict=True)
        a = alloc[0] if alloc else None
        taken = flt(frappe.db.sql("""
            SELECT SUM(total_leave_days) d FROM `tabLeave Application`
            WHERE docstatus = 1 AND status = 'Approved' AND employee = %s AND leave_type = %s
              AND from_date >= %s AND to_date <= %s
        """, (employee, lt, a.from_date if a else on_date, a.to_date if a else on_date),
            as_dict=True)[0].d)
        pending = flt(frappe.db.sql("""
            SELECT SUM(total_leave_days) d FROM `tabLeave Application`
            WHERE docstatus = 0 AND status = 'Open' AND employee = %s AND leave_type = %s
        """, (employee, lt), as_dict=True)[0].d)
        allocated = flt(a.total_leaves_allocated) if a else 0.0
        out.append({
            "leave_type": lt,
            "allocated": allocated,
            "taken": taken,
            "pending": pending,
            "left": max(allocated - taken - pending, 0) if a else 0.0,
            "has_allocation": bool(a),
            "allocation": a.name if a else None,
            "allocation_from": str(a.from_date) if a else None,
            "allocation_to": str(a.to_date) if a else None,
            "max_allowed": flt(frappe.db.get_value("Leave Type", lt, "max_leaves_allowed")),
        })
    return out


@frappe.whitelist()
def search_employees(query="", limit=200):
    """Employee directory for the search box, with a one-line balance summary."""
    frappe.only_for(READ_ROLES)

    emps = _eligible_ft_employees()
    q = (query or "").strip().lower()
    if q:
        emps = {k: v for k, v in emps.items()
                if q in k.lower() or q in (v.employee_name or "").lower()
                or q in (v.department or "").lower()}

    on_date = today()
    names = list(emps.keys())[:cint(limit)]
    if not names:
        return {"employees": [], "total": 0}

    lwp = set(frappe.get_all("Leave Type", filters={"is_lwp": 1}, pluck="name"))
    types = [t for t in core._leave_chain() if t not in lwp]

    alloc, taken = {}, {}
    for r in frappe.db.sql("""
        SELECT employee, leave_type, SUM(total_leaves_allocated) a
        FROM `tabLeave Allocation`
        WHERE docstatus = 1 AND employee IN %(e)s AND from_date <= %(d)s AND to_date >= %(d)s
        GROUP BY employee, leave_type
    """, {"e": tuple(names), "d": on_date}, as_dict=True):
        alloc[(r.employee, r.leave_type)] = flt(r.a)
    for r in frappe.db.sql("""
        SELECT employee, leave_type, SUM(total_leave_days) d
        FROM `tabLeave Application`
        WHERE docstatus = 1 AND status = 'Approved' AND employee IN %(e)s
          AND YEAR(from_date) = YEAR(%(d)s)
        GROUP BY employee, leave_type
    """, {"e": tuple(names), "d": on_date}, as_dict=True):
        taken[(r.employee, r.leave_type)] = flt(r.d)

    absent = {}
    for r in frappe.db.sql("""
        SELECT employee, COUNT(*) n FROM `tabAttendance`
        WHERE docstatus = 1 AND status IN ('Absent','Half Day') AND employee IN %(e)s
          AND YEAR(attendance_date) = YEAR(%(d)s)
        GROUP BY employee
    """, {"e": tuple(names), "d": on_date}, as_dict=True):
        absent[r.employee] = cint(r.n)

    out = []
    for e in names:
        meta = emps[e]
        bal = []
        missing_setup = False
        for t in types:
            a = alloc.get((e, t), 0.0)
            if not a:
                missing_setup = True
            bal.append({"leave_type": t, "allocated": a,
                        "left": max(a - taken.get((e, t), 0.0), 0)})
        out.append({
            "employee": e, "employee_name": meta.employee_name,
            "department": meta.department, "balances": bal,
            "absent_days": absent.get(e, 0), "needs_setup": missing_setup,
        })
    out.sort(key=lambda r: (not r["needs_setup"], r["employee_name"] or r["employee"]))
    return {"employees": out, "total": len(out), "types": types}


@frappe.whitelist()
def get_employee_leave(employee, year=None):
    """Everything the employee popup shows, in one call."""
    frappe.only_for(READ_ROLES)
    y_from, y_to, y = _year_bounds(year)

    emp = frappe.db.get_value("Employee", employee,
        ["name", "employee_name", "department", "date_of_joining", "status"], as_dict=True)
    if not emp:
        frappe.throw(_("Employee not found."))

    eligible = core._is_leave_eligible(employee, y_to)
    paid = _paid_periods(employee)

    def is_paid(d):
        d = getdate(d)
        for p in paid:
            if getdate(p.start_date) <= d <= getdate(p.end_date):
                return p.name
        return None

    history = []
    for r in frappe.db.sql("""
        SELECT name, leave_type, from_date, to_date, total_leave_days, half_day,
               status, docstatus, description
        FROM   `tabLeave Application`
        WHERE  employee = %s AND docstatus < 2 AND from_date >= %s AND from_date <= %s
        ORDER BY from_date DESC
    """, (employee, y_from, y_to), as_dict=True):
        history.append({
            "name": r.name, "leave_type": r.leave_type,
            "from_date": str(r.from_date), "to_date": str(r.to_date),
            "days": flt(r.total_leave_days), "half_day": cint(r.half_day),
            "status": r.status, "submitted": cint(r.docstatus) == 1,
            "is_unpaid": core._is_lwp_type(r.leave_type),
            "auto": "Auto-assigned" in (r.description or ""),
            "paid_period": is_paid(r.from_date),
        })

    absents = []
    for r in frappe.db.sql("""
        SELECT a.name, a.attendance_date, a.status
        FROM   `tabAttendance` a
        WHERE  a.docstatus = 1 AND a.employee = %s AND a.status IN ('Absent','Half Day')
          AND  a.attendance_date BETWEEN %s AND %s
          AND  NOT EXISTS (SELECT 1 FROM `tabLeave Application` la
                 WHERE la.docstatus = 1 AND la.status = 'Approved' AND la.employee = a.employee
                   AND a.attendance_date BETWEEN la.from_date AND la.to_date)
        ORDER BY a.attendance_date DESC
    """, (employee, y_from, y_to), as_dict=True):
        absents.append({
            "attendance": r.name, "date": str(r.attendance_date), "status": r.status,
            "paid_period": is_paid(r.attendance_date),
        })

    return {
        "employee": emp.name, "employee_name": emp.employee_name,
        "department": emp.department,
        "date_of_joining": str(emp.date_of_joining) if emp.date_of_joining else None,
        "eligible": eligible, "year": y,
        "balances": _balances_for(employee, y_to),
        "history": history, "absents": absents,
        "paid_periods": [{"name": p.name, "from_date": str(p.start_date),
                          "to_date": str(p.end_date)} for p in paid],
        "leave_types": [t["leave_type"] for t in _balances_for(employee, y_to)]
                       + [core._lwp_type()],
    }


@frappe.whitelist()
def set_allocation(employee, leave_type, days, from_date=None, to_date=None):
    """Create or change an entitlement.

    An existing submitted allocation can have new_leaves_allocated edited in
    place (LeaveAllocation.on_update_after_submit posts the delta to the
    ledger), which is far safer than cancel-and-recreate: cancelling an
    allocation with leave already taken against it is refused outright.
    """
    frappe.only_for(WRITE_ROLES)
    days = flt(days)
    y_from, y_to, _y = _year_bounds(getdate(to_date).year if to_date else None)
    from_date = getdate(from_date) if from_date else y_from
    to_date = getdate(to_date) if to_date else y_to

    if core._is_lwp_type(leave_type):
        return {"ok": False, "message": _("Unpaid leave is not allocated — it has no limit.")}
    cap = flt(frappe.db.get_value("Leave Type", leave_type, "max_leaves_allowed"))
    if cap and days > cap:
        return {"ok": False, "message": _("{0} allows at most {1} days per year.").format(leave_type, cap)}

    existing = frappe.db.sql("""
        SELECT name FROM `tabLeave Allocation`
        WHERE docstatus = 1 AND employee = %s AND leave_type = %s
          AND from_date <= %s AND to_date >= %s LIMIT 1
    """, (employee, leave_type, to_date, from_date), as_dict=True)

    try:
        if existing:
            doc = frappe.get_doc("Leave Allocation", existing[0].name)
            taken = flt(frappe.db.sql("""
                SELECT SUM(total_leave_days) d FROM `tabLeave Application`
                WHERE docstatus = 1 AND status = 'Approved' AND employee = %s
                  AND leave_type = %s AND from_date >= %s AND to_date <= %s
            """, (employee, leave_type, doc.from_date, doc.to_date), as_dict=True)[0].d)
            if days < taken:
                return {"ok": False, "message": _(
                    "{0} has already taken {1} day(s). You cannot set the entitlement below that."
                ).format(frappe.db.get_value("Employee", employee, "employee_name"), taken)}
            doc.flags.ignore_permissions = True
            doc.new_leaves_allocated = days
            doc.save()
            frappe.db.commit()
            return {"ok": True, "allocation": doc.name,
                    "message": _("Entitlement updated to {0} day(s).").format(days)}

        doc = frappe.get_doc({
            "doctype": "Leave Allocation", "employee": employee, "leave_type": leave_type,
            "from_date": from_date, "to_date": to_date,
            "new_leaves_allocated": days, "carry_forward": 0,
            "description": "Set from the Employee Leave page.",
        })
        doc.flags.ignore_permissions = True
        doc.insert()
        doc.submit()
        frappe.db.commit()
        return {"ok": True, "allocation": doc.name,
                "message": _("Allocated {0} day(s) of {1}.").format(days, leave_type)}
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(message=frappe.get_traceback(),
                         title=f"Leave allocation failed — {employee} {leave_type}")
        return {"ok": False, "message": _map_exception(e)["message"]}


@frappe.whitelist()
def apply_leave_direct(employee, leave_type, from_date, to_date=None,
                       half_day=0, reason=None):
    """Apply leave for a date or range, whether or not attendance exists.

    Submitting the Leave Application is what makes payroll see it: HRMS's
    update_attendance() writes (or creates) the Attendance row for each date,
    and payroll reads that row. We additionally log each date with its ORIGINAL
    attendance status, because cancelling a Leave Application cancels those
    Attendance rows outright (leave_application.py:351) and the original is the
    only way to put them back.
    """
    frappe.only_for(WRITE_ROLES)
    from_date = getdate(from_date)
    to_date = getdate(to_date) if to_date else from_date
    half_day = cint(half_day)

    if to_date < from_date:
        return {"ok": False, "message": _("The end date is before the start date.")}
    if half_day and from_date != to_date:
        return {"ok": False, "message": _("A half day applies to a single date.")}
    if not frappe.db.exists("Leave Type", leave_type):
        return {"ok": False, "message": _("Unknown leave type.")}
    if not core._is_leave_eligible(employee, from_date):
        return {"ok": False, "message": _(
            "This employee is paid per day worked, so leave does not apply to them.")}

    # capture what attendance looked like first — needed to undo cleanly
    originals = {}
    for r in frappe.db.sql("""
        SELECT name, attendance_date, status, half_day_status FROM `tabAttendance`
        WHERE docstatus = 1 AND employee = %s AND attendance_date BETWEEN %s AND %s
    """, (employee, from_date, to_date), as_dict=True):
        originals[str(r.attendance_date)] = r

    paid = [p for p in _paid_periods(employee)
            if getdate(p.start_date) <= to_date and getdate(p.end_date) >= from_date]

    mark = core._suppress_begin()
    sp = "elmd_" + str(abs(hash((employee, str(from_date), leave_type))))[:12]
    frappe.db.savepoint(sp)
    try:
        la = frappe.get_doc({
            "doctype": "Leave Application", "employee": employee,
            "leave_type": leave_type, "from_date": from_date, "to_date": to_date,
            "half_day": 1 if half_day else 0,
            "half_day_date": from_date if half_day else None,
            "status": "Approved", "posting_date": from_date,
            "leave_approver": core._get_leave_approver(employee),
            "description": ("Applied from the Employee Leave page."
                            + (f" Reason: {reason}" if reason else "")),
        })
        la.flags.ignore_permissions = True
        la.insert()
        la.submit()

        days = flt(la.total_leave_days)
        for i in range(date_diff(to_date, from_date) + 1):
            d = add_days(from_date, i)
            orig = originals.get(str(d))
            att = frappe.db.get_value(
                "Attendance", {"employee": employee, "attendance_date": d, "docstatus": 1}, "name")
            core._write_log(
                employee=employee, attendance_date=d, status="Assigned",
                leave_type=leave_type, leave_days=(0.5 if half_day else 1.0),
                half_day=1 if half_day else 0, is_split=0, chunk_index=1,
                split_group=core._split_group(employee, d),
                source_attendance=att, leave_application=la.name,
                original_attendance_status=(orig.status if orig else None),
                original_half_day_status=(orig.half_day_status if orig else None),
                remarks=("Applied manually from the Employee Leave page."
                         + (f" Reason: {reason}" if reason else "")
                         + (f" | [PAYROLL] inside an already-paid period ({paid[0].name})" if paid else "")),
            )
        frappe.db.commit()
    except Exception as e:
        frappe.db.rollback(save_point=sp)
        mapped = _map_exception(e)
        return {"ok": False, "code": mapped["code"], "message": mapped["message"]}
    finally:
        core._suppress_end(mark)

    return {"ok": True, "leave_application": la.name, "days": days,
            "leave_type": leave_type,
            "paid_period": paid[0].name if paid else None,
            "message": _("{0} day(s) of {1} applied.").format(days, leave_type)}


@frappe.whitelist()
def cancel_leave_application(leave_application):
    """Cancel a leave and put the attendance back.

    LeaveApplication.on_cancel -> cancel_attendance() sets every On Leave /
    Half Day row in the range to docstatus=2 (leave_application.py:351-360).
    Left alone that silently deletes the attendance record, so payroll would
    then treat the day as unmarked -- which this site counts as Absent anyway,
    but the row itself would be gone. We restore each row to what it was before
    the leave was applied, using the Auto Leave Log original where we have one.
    """
    frappe.only_for(WRITE_ROLES)

    la = frappe.db.get_value("Leave Application", leave_application,
        ["name", "employee", "leave_type", "from_date", "to_date", "docstatus"], as_dict=True)
    if not la:
        return {"ok": False, "message": _("Leave application not found.")}
    if cint(la.docstatus) == 2:
        return {"ok": False, "message": _("This leave is already cancelled.")}

    before = {}
    for r in frappe.db.sql("""
        SELECT name, attendance_date, status, half_day_status, docstatus
        FROM `tabAttendance`
        WHERE employee = %s AND attendance_date BETWEEN %s AND %s AND docstatus < 2
    """, (la.employee, la.from_date, la.to_date), as_dict=True):
        before[r.name] = r

    logged = {}
    for r in frappe.db.sql("""
        SELECT attendance_date, original_attendance_status, original_half_day_status
        FROM `tabAuto Leave Log`
        WHERE leave_application = %s AND status = 'Assigned'
    """, leave_application, as_dict=True):
        logged[str(r.attendance_date)] = r

    try:
        doc = frappe.get_doc("Leave Application", leave_application)
        doc.flags.ignore_permissions = True
        if cint(doc.docstatus) == 0:
            frappe.delete_doc("Leave Application", leave_application,
                              ignore_permissions=True, force=True)
        else:
            doc.cancel()
        frappe.db.commit()
    except Exception as e:
        frappe.db.rollback()
        return {"ok": False, "message": _map_exception(e)["message"]}

    restored = 0
    for name, prev in before.items():
        now = frappe.db.get_value("Attendance", name, "docstatus")
        if cint(now) != 2:
            continue
        log = logged.get(str(prev.attendance_date))
        # a day that had leave and no longer does is an absence
        status = (log.original_attendance_status if log and log.original_attendance_status
                  else "Absent")
        half = (log.original_half_day_status if log else None)
        frappe.db.set_value("Attendance", name, {
            "docstatus": 1, "status": status, "half_day_status": half,
            "modify_half_day_status": 0, "leave_type": None, "leave_application": None,
        }, update_modified=False)
        restored += 1

    frappe.db.sql("""
        UPDATE `tabAuto Leave Log` SET status = 'Cancelled',
               remarks = CONCAT(IFNULL(remarks,''), ' | Cancelled from the Employee Leave page.')
        WHERE leave_application = %s AND status = 'Assigned'
    """, leave_application)
    frappe.db.commit()

    return {"ok": True, "restored": restored,
            "message": _("Leave cancelled.") + (
                _(" {0} attendance day(s) restored.").format(restored) if restored else "")}
