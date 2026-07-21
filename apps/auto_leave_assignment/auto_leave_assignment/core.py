"""
core.py
--------
Core engine for automatic leave assignment.
Used by both the Attendance DocEvent and the nightly scheduler.

An Absent / Half Day Attendance is covered by consuming the employee's leave
balance in chain order — Casual Leave, then Annual Leave, then Leave Without
Pay. When a type has only half a day left, the day is SPLIT across two types
(0.5 + 0.5), which is the maximum ERPNext allows on one date.

Why the final Attendance row matters
------------------------------------
Payroll never reads our Leave Applications; it reads ONE Attendance row per
date (salary_slip.py::calculate_lwp_ppl_and_absent_days_based_on_attendance).
For a split day it must end up as:

    status="Half Day", leave_type=<the LWP chunk>, half_day_status="Present"

which yields exactly `lwp += 0.5` and `absent += 0`. Two silent failure modes
exist: if leave_type ends up as the PAID type, or blank, the day is paid in
full and nothing errors. Hence _finalize_attendance() sets the end state
explicitly rather than trusting whichever application submitted last.
"""

import math

import frappe
from frappe.utils import cint, flt, getdate

DEFAULT_CHAIN = ["Casual Leave", "Annual Leave", "Leave Without Pay"]


# ─────────────────────────────────────────────
#  Chain configuration
# ─────────────────────────────────────────────

def _leave_chain():
    """Ordered leave types to consume. Falls back to DEFAULT_CHAIN.

    Kept data-driven because the client has already changed this once
    (Casual -> Casual/Annual) and will change it again.
    """
    chain = None
    try:
        chain = frappe.get_hooks("auto_leave_chain") or None
    except Exception:
        chain = None
    chain = list(chain) if chain else list(DEFAULT_CHAIN)

    # only keep types that actually exist on this site
    chain = [lt for lt in chain if frappe.db.exists("Leave Type", lt)]

    # the chain MUST end in an LWP type, else a day can end up under-covered
    if not chain or not _is_lwp_type(chain[-1]):
        fallback = _lwp_type()
        if fallback and fallback not in chain:
            chain.append(fallback)
    return chain


def _is_lwp_type(leave_type):
    return bool(frappe.db.get_value("Leave Type", leave_type, "is_lwp"))


def _lwp_type():
    """Name of the site's Leave Without Pay type (not hardcoded)."""
    row = frappe.get_all("Leave Type", filters={"is_lwp": 1}, pluck="name", limit=1)
    return row[0] if row else "Leave Without Pay"


# ─────────────────────────────────────────────
#  Balance + planning
# ─────────────────────────────────────────────

def _precision():
    return cint(frappe.db.get_single_value("System Settings", "float_precision")) or 2


def _consumable_balance(employee, leave_type, date):
    """Balance the Leave Application validator will actually compare against.

    Must mirror LeaveApplication.validate_balance_leaves() EXACTLY. The old
    code called get_leave_balance_on() with none of these arguments, so the
    planner and the validator disagreed — which is the only reason the old
    "insufficient balance" string-matching retry had to exist.
    """
    try:
        from hrms.hr.doctype.leave_application.leave_application import (
            get_leave_balance_on,
        )
        bal = get_leave_balance_on(
            employee, leave_type, date, date,
            consider_all_leaves_in_the_allocation_period=True,
            for_consumption=True,
        )
        return flt(bal.get("leave_balance_for_consumption"), _precision())
    except Exception:
        frappe.log_error(
            message=frappe.get_traceback(),
            title=f"Auto Leave balance check failed — {employee} {leave_type} on {date}",
        )
        return 0.0


def _has_allocation(employee, leave_type, date):
    """Pre-empt validate_dates_across_allocation().

    When no allocation covers the date that validator raises a BARE
    ValidationError (leave_application.py:221), indistinguishable by type
    from a dozen other throws — so it must be checked up front, not caught.
    """
    return bool(frappe.db.exists("Leave Allocation", {
        "employee":  employee,
        "leave_type": leave_type,
        "docstatus": 1,
        "from_date": ["<=", date],
        "to_date":   [">=", date],
    }))


def _half_units(value):
    """Round like the validator, THEN floor to 0.5 steps -> integer half-days.

    Order matters: flt() first so 0.4999 becomes 0.5 exactly as the validator
    sees it, then floor, so we never plan a chunk the validator will reject.
    """
    v = flt(value, _precision())
    if v <= 0:
        return 0
    return int(math.floor(v * 2 + 1e-9))


def _build_allocation_plan(employee, date, required_units):
    """Ordered [(leave_type, days)] covering `required_units` half-days.

    Invariants (asserted): <= 2 chunks; each chunk 0.5 or 1.0; at most one
    LWP chunk and it is LAST; the plan sums to the requirement.
    """
    remaining = required_units
    taken = {}
    chain = _leave_chain()

    for leave_type in chain:
        if remaining <= 0:
            break

        # a chunk that would cover 0 days (holiday for THIS type) is useless
        if _leave_days_for(employee, leave_type, date, half_day=True) <= 0:
            continue

        if _is_lwp_type(leave_type):
            avail = remaining              # unbounded and terminal
        else:
            if not _has_allocation(employee, leave_type, date):
                continue
            avail = _half_units(_consumable_balance(employee, leave_type, date))

        take = min(remaining, avail)
        if take <= 0:
            continue
        taken[leave_type] = taken.get(leave_type, 0) + take
        remaining -= take

    plan = [(lt, taken[lt] * 0.5) for lt in chain if taken.get(lt)]
    _assert_plan(plan, required_units, remaining)
    return plan


def _assert_plan(plan, required_units, remaining):
    if remaining > 0:
        # under-covered: chain had no LWP fallback available
        frappe.log_error(
            message=f"plan={plan} required_units={required_units} remaining={remaining}",
            title="Auto Leave — allocation plan under-covers the day",
        )
    if len(plan) > 2:
        frappe.throw("Auto Leave: allocation plan exceeds the 2-application limit")
    lwp_positions = [i for i, (lt, _) in enumerate(plan) if _is_lwp_type(lt)]
    if len(lwp_positions) > 1 or (lwp_positions and lwp_positions[0] != len(plan) - 1):
        frappe.throw("Auto Leave: LWP chunk must be last and unique")


# ─────────────────────────────────────────────
#  Coverage guards
# ─────────────────────────────────────────────

def _covered_days(employee, date):
    """Half-days already covered by submitted, approved leave on this date."""
    total = 0.0
    for la in frappe.get_all(
        "Leave Application",
        filters={
            "employee":  employee,
            "docstatus": 1,
            "status":    "Approved",
            "from_date": ["<=", date],
            "to_date":   [">=", date],
        },
        fields=["name", "half_day", "half_day_date"],
    ):
        total += 0.5 if (la.half_day and getdate(la.half_day_date) == getdate(date)) else 1.0
    return total


def _draft_half_day_exists(employee, date):
    """A DRAFT half-day application still consumes one of the two overlap slots
    (get_total_leaves_on_half_day counts docstatus < 2), so it silently blocks
    the second chunk of a split."""
    return bool(frappe.db.exists("Leave Application", {
        "employee":  employee,
        "docstatus": 0,
        "half_day":  1,
        "from_date": ["<=", date],
        "to_date":   [">=", date],
    }))


def _leave_application_exists(employee, date):
    """Kept for the scheduler's cheap pre-filter: any non-cancelled LA on the date."""
    return bool(frappe.db.exists("Leave Application", {
        "employee":  employee,
        "from_date": ["<=", date],
        "to_date":   [">=", date],
        "docstatus": ["!=", 2],
    }))


def _already_logged(employee, date):
    """True if an Assigned log exists whose Leave Application is still live.

    The old version ignored the application's docstatus, so a day whose leave
    was later cancelled could never be reprocessed.
    """
    rows = frappe.db.sql("""
        SELECT 1
        FROM   `tabAuto Leave Log` log
        JOIN   `tabLeave Application` la ON la.name = log.leave_application
        WHERE  log.employee = %(emp)s
          AND  log.attendance_date = %(date)s
          AND  log.status = 'Assigned'
          AND  la.docstatus = 1
        LIMIT 1
    """, {"emp": employee, "date": date})
    return bool(rows)


# ─────────────────────────────────────────────
#  Main entry point
# ─────────────────────────────────────────────

def assign_leave_for_attendance(attendance_doc, called_from_scheduler=False):
    """Cover an Absent / Half Day Attendance from the employee's leave balance.

    The whole day is applied atomically inside a savepoint: a split that fails
    half way would otherwise leave the Attendance marked Half Day against the
    PAID type, silently under-deducting half a day with no error anywhere.
    """
    emp      = attendance_doc.employee
    att_date = getdate(attendance_doc.attendance_date)
    status   = attendance_doc.status
    if status not in ("Absent", "Half Day"):
        return

    original_status          = status
    original_half_day_status = attendance_doc.get("half_day_status")
    required = 0.5 if status == "Half Day" else 1.0

    if _is_holiday(emp, att_date):
        _log_skip(emp, att_date, "Date is a holiday — no leave assigned",
                  attendance_doc.name, original_status, original_half_day_status)
        _maybe_commit(called_from_scheduler)
        return

    covered = _covered_days(emp, att_date)
    if covered >= required:
        _sync_attendance_with_existing_leave(attendance_doc, emp, att_date)
        _log_skip(emp, att_date, "Already covered by an existing Leave Application",
                  attendance_doc.name, original_status, original_half_day_status)
        _maybe_commit(called_from_scheduler)
        return

    if _already_logged(emp, att_date):
        return

    if _draft_half_day_exists(emp, att_date):
        _log_skip(emp, att_date,
                  "A draft half-day Leave Application exists on this date and would "
                  "block the split — resolve it manually",
                  attendance_doc.name, original_status, original_half_day_status)
        _maybe_commit(called_from_scheduler)
        return

    required_units = int(round((required - covered) * 2))
    msg_mark = _suppress_begin()
    sp = "ala_" + str(abs(hash((attendance_doc.name, str(att_date)))))[:12]
    frappe.db.savepoint(sp)

    try:
        plan = _build_allocation_plan(emp, att_date, required_units)
        if not plan:
            raise Exception("no leave type in the chain could cover this day")

        applied = _create_applications(attendance_doc, plan, att_date)
        _finalize_attendance(attendance_doc, applied,
                             original_status, original_half_day_status)
        _log_group(emp, att_date, applied, attendance_doc.name,
                   original_status, original_half_day_status)
        _maybe_commit(called_from_scheduler)

    except Exception as e:
        frappe.db.rollback(save_point=sp)
        _log_error(emp, att_date, str(e), attendance_doc.name,
                   original_status, original_half_day_status)
        frappe.log_error(
            message=frappe.get_traceback(),
            title=f"Auto Leave Assignment Error — {emp} on {att_date}",
        )
        _maybe_commit(called_from_scheduler)
    finally:
        _suppress_end(msg_mark)


def _maybe_commit(called_from_scheduler):
    """Scheduler owns its transaction; the doc-event path must not commit
    (we are inside the Attendance submit transaction)."""
    if called_from_scheduler:
        frappe.db.commit()


# ─────────────────────────────────────────────
#  Application creation (with per-chunk demotion)
# ─────────────────────────────────────────────

def _create_applications(attendance_doc, plan, att_date):
    """Create + submit one Leave Application per chunk, in chain order.

    LWP is last in the chain, so it is submitted last and therefore wins the
    Attendance.leave_type field — which is exactly what payroll must see.

    If a chunk is rejected for a reason the planner cannot predict — most
    commonly Casual Leave's max_continuous_days_allowed=3, which produced 12
    of the 18 historical errors — the chunk is DEMOTED to the next type in
    the chain rather than failing the whole day. Replicating every ERPNext
    validator here would be fragile and would drift; attempting and demoting
    stays correct by construction.
    """
    chain = _leave_chain()
    applied = []

    for intended_type, days in plan:
        start = chain.index(intended_type) if intended_type in chain else 0
        placed = None

        for candidate in chain[start:]:
            # skip candidates that plainly cannot cover this chunk
            if not _is_lwp_type(candidate):
                if not _has_allocation(attendance_doc.employee, candidate, att_date):
                    continue
                if _consumable_balance(attendance_doc.employee, candidate, att_date) < days:
                    continue
            if _leave_days_for(attendance_doc.employee, candidate, att_date,
                               half_day=(days == 0.5)) <= 0:
                continue

            csp = "alc_" + str(abs(hash((attendance_doc.name, candidate, days))))[:12]
            frappe.db.savepoint(csp)
            try:
                placed = _submit_application(attendance_doc, candidate, days,
                                             att_date, len(applied) + 1, len(plan))
                break
            except Exception as e:
                frappe.db.rollback(save_point=csp)
                frappe.log_error(
                    message=frappe.get_traceback(),
                    title=(f"Auto Leave chunk demoted — {attendance_doc.employee} "
                           f"{candidate} {days}d on {att_date}: {str(e)[:120]}"),
                )
                continue

        if not placed:
            raise Exception(
                f"could not place a {days}-day chunk for {att_date} "
                f"starting from {intended_type}"
            )
        applied.append(placed)

    return applied


def _submit_application(attendance_doc, leave_type, days, att_date, idx, total):
    is_half = (days == 0.5)
    la = frappe.get_doc({
        "doctype":       "Leave Application",
        "employee":      attendance_doc.employee,
        "leave_type":    leave_type,
        "from_date":     att_date,
        "to_date":       att_date,
        "half_day":      1 if is_half else 0,
        # MUST be explicit: set_half_day_date() runs AFTER validate_leave_overlap(),
        # and getdate(None) returns TODAY, which mis-fires the overlap check.
        "half_day_date": att_date if is_half else None,
        "status":        "Approved",
        "posting_date":  att_date,
        "leave_approver": _get_leave_approver(attendance_doc.employee),
        "description": (
            f"Auto-assigned by Auto Leave Assignment app. "
            f"Source Attendance: {attendance_doc.name}. "
            f"Chunk {idx}/{total} — {days} day(s) {leave_type}."
        ),
    })
    la.flags.ignore_permissions = True
    la.insert()
    la.submit()
    return {"leave_type": leave_type, "days": days, "name": la.name}


# ─────────────────────────────────────────────
#  Attendance finalizer
# ─────────────────────────────────────────────

def _finalize_attendance(attendance_doc, applied, original_status, original_half_day_status):
    """Set the end state explicitly — never trust submission order.

    leave_type must be the UNPAID chunk when one exists, because payroll reads
    this single field. A paid type here (or a blank) means the day is paid in
    full with no error raised anywhere.
    """
    total = sum(a["days"] for a in applied)
    idx = next((i for i, a in enumerate(applied) if _is_lwp_type(a["leave_type"])),
               len(applied) - 1)
    payroll_type = applied[idx]["leave_type"]
    payroll_app  = applied[idx]["name"]

    if not payroll_type:
        raise Exception("refusing to finalize Attendance with a blank leave_type")

    if len(applied) == 1 and total >= 1.0:
        status, half_day_status = "On Leave", None
    else:
        status, half_day_status = "Half Day", "Present"

    frappe.db.set_value("Attendance", attendance_doc.name, {
        "status":            status,
        "leave_type":        payroll_type,
        "leave_application": payroll_app,
        "half_day_status":   half_day_status,
        # must be 0, else get_duplicate_attendance_record() stops treating this
        # row as a blocker and a second Attendance for the date becomes insertable
        "modify_half_day_status": 0,
    }, update_modified=False)


def _sync_attendance_with_existing_leave(attendance_doc, employee, att_date):
    """Link an Attendance to leave that already exists for the date.

    Aggregates ALL approved applications on the date (there may be two after a
    split) and picks the unpaid one for leave_type.

    Also sets half_day_status, which the previous version never did — an
    imported Half Day row kept half_day_status="Absent" and was charged TWICE:
    once via get_half_absent_days() and again via its LWP leave_type.
    """
    apps = frappe.get_all(
        "Leave Application",
        filters={
            "employee":  employee,
            "docstatus": 1,
            "status":    "Approved",
            "from_date": ["<=", att_date],
            "to_date":   [">=", att_date],
        },
        fields=["name", "leave_type", "half_day", "half_day_date"],
    )
    if not apps:
        return

    total = sum(
        0.5 if (a.half_day and getdate(a.half_day_date) == getdate(att_date)) else 1.0
        for a in apps
    )
    unpaid = next((a for a in apps if _is_lwp_type(a.leave_type)), apps[-1])

    if total >= 1.0 and len(apps) == 1:
        status, half_day_status = "On Leave", None
    else:
        status, half_day_status = "Half Day", "Present"

    frappe.db.set_value("Attendance", attendance_doc.name, {
        "status":            status,
        "leave_type":        unpaid.leave_type,
        "leave_application": unpaid.name,
        "half_day_status":   half_day_status,
        "modify_half_day_status": 0,
    }, update_modified=False)


# ─────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────

def _is_holiday(employee, date):
    """Return True if `date` is a holiday for this employee.

    MUST agree with Leave Application's own holiday arithmetic, otherwise we
    create an application that its validate() immediately rejects with
    "The day(s) on which you are applying for leave are holidays".

    ERPNext v16 resolves an employee's holiday list through the
    **Holiday List Assignment** doctype (hrms/utils/holiday_list.py, wired in
    via hrms/hooks.py `employee_holiday_list`). The legacy
    `Employee.holiday_list` / `Company.default_holiday_list` fields this
    function used to read are BOTH empty on this site, so it returned False
    for every date — the holiday guard never fired at all.
    """
    try:
        from hrms.utils.holiday_list import get_holiday_dates_between_range

        # raise_exception_for_holiday_list=False: a single employee with no
        # holiday assignment must not break the whole nightly batch.
        return bool(get_holiday_dates_between_range(
            employee, date, date, raise_exception_for_holiday_list=False
        ))
    except Exception:
        frappe.log_error(
            message=frappe.get_traceback(),
            title=f"Auto Leave holiday check failed — {employee} on {date}",
        )
        # Fall through as "not a holiday": _leave_days_for() below is the
        # authoritative, per-leave-type gate and will still skip the day.
        return False


def _leave_days_for(employee, leave_type, date, half_day=False):
    """Days a Leave Application of `leave_type` would actually cover on `date`.

    This is byte-identical to what LeaveApplication.validate_balance_leaves()
    computes, so a chunk we accept can never be rejected for being a holiday.
    Returns 0.0 when the date is a holiday *for that leave type* — note
    `include_holiday` is a per-Leave-Type flag, so a single global holiday
    check can never be exactly right.
    """
    try:
        from hrms.hr.doctype.leave_application.leave_application import (
            get_number_of_leave_days,
        )
        return flt(get_number_of_leave_days(
            employee, leave_type, date, date,
            1 if half_day else 0,
            date if half_day else None,
        ))
    except Exception:
        frappe.log_error(
            message=frappe.get_traceback(),
            title=f"Auto Leave day-count failed — {employee} {leave_type} on {date}",
        )
        return 0.0


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


def _suppress_begin():
    """Leave creation emits msgprints ("Employee X is on Leave", balance
    warnings). During bulk import these flood the UI, so they are trimmed."""
    return len(frappe.local.message_log) if hasattr(frappe.local, "message_log") else 0


def _suppress_end(mark):
    if hasattr(frappe.local, "message_log"):
        frappe.local.message_log = frappe.local.message_log[:mark]
    if hasattr(frappe.local, "_server_messages"):
        frappe.local._server_messages = []


# ─────────────────────────────────────────────
#  Audit log
# ─────────────────────────────────────────────

def _split_group(employee, date):
    return f"{employee}|{date}"


def _write_log(**kwargs):
    """Never let logging break the main flow."""
    try:
        doc = frappe.get_doc(dict(doctype="Auto Leave Log", **kwargs))
        doc.flags.ignore_permissions = True
        doc.insert()
    except Exception:
        frappe.log_error(
            message=frappe.get_traceback(),
            title=f"Auto Leave Log insert failed — {kwargs.get('employee')}",
        )


def _log_group(employee, date, applied, attendance_name,
               original_status, original_half_day_status):
    """One row per chunk — leave_type is a Link, so a composite value is impossible."""
    is_split = 1 if len(applied) > 1 else 0
    for i, a in enumerate(applied, start=1):
        _write_log(
            employee=employee,
            attendance_date=date,
            status="Assigned",
            leave_type=a["leave_type"],
            leave_days=a["days"],
            half_day=1 if a["days"] == 0.5 else 0,
            is_split=is_split,
            chunk_index=i,
            split_group=_split_group(employee, date),
            source_attendance=attendance_name,
            leave_application=a["name"],
            original_attendance_status=original_status,
            original_half_day_status=original_half_day_status,
            remarks=(f"Leave Application {a['name']} created automatically "
                     f"({a['days']} day {a['leave_type']}, chunk {i}/{len(applied)})"),
        )


def _log_skip(employee, date, remarks, attendance_name,
              original_status=None, original_half_day_status=None):
    _write_log(
        employee=employee, attendance_date=date, status="Skipped",
        leave_days=0, chunk_index=1, is_split=0,
        split_group=_split_group(employee, date),
        source_attendance=attendance_name, remarks=remarks,
        original_attendance_status=original_status,
        original_half_day_status=original_half_day_status,
    )


def _log_error(employee, date, remarks, attendance_name,
               original_status=None, original_half_day_status=None):
    _write_log(
        employee=employee, attendance_date=date, status="Error",
        leave_days=0, chunk_index=1, is_split=0,
        split_group=_split_group(employee, date),
        source_attendance=attendance_name, remarks=remarks,
        original_attendance_status=original_status,
        original_half_day_status=original_half_day_status,
    )
