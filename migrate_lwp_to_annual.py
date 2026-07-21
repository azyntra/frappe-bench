"""
CHANRICH FRUITS PVT LTD — Convert historical LWP days to Annual Leave
=======================================================================
Before the leave chain became Casual -> Annual -> LWP, absences fell straight
to Leave Without Pay once the 7-day Casual allowance ran out. 487 unpaid days
were booked that way while every employee's 14-day Annual Leave entitlement
sat completely unused.

This converts those LWP days to Annual Leave, up to each employee's available
Annual balance, earliest dates first.

WHY A FIELD REWRITE AND NOT cancel-and-recreate
-----------------------------------------------
Cancelling a Leave Application also CANCELS its Attendance record
(LeaveApplication.cancel_attendance sets Attendance.docstatus = 2 so its own
link check can pass). Doing that 487 times would destroy 487 attendance rows,
and the replacement application would then create BRAND NEW attendance rows,
orphaning every Auto Leave Log link. So instead we rewrite three fields:

    Leave Application . leave_type
    Leave Ledger Entry . leave_type, is_lwp     <- this is what moves the balance
    Attendance . leave_type

This is balance-correct because consumption is read from ledger rows filtered
by employee + leave_type with NO is_lwp filter (get_leave_entries,
leave_application.py:1265), so re-pointing the ledger row immediately and
correctly decrements Annual Leave.

The trade-off is that we bypass Leave Application validation, so every check
that matters is re-implemented in _check_convertible() below.

Run in bench console (audit -> dry run -> canary -> full -> verify):

    cd /home/frappe/frappe-bench
    bench --site 79.72.76.67 console
    >>> exec(open('/home/frappe/frappe-bench/migrate_lwp_to_annual.py').read(), globals())
    >>> audit()
    >>> migrate_lwp_to_annual(dry_run=True)
    >>> migrate_lwp_to_annual(dry_run=False, only_employee="EMP-00021")   # canary
    >>> migrate_lwp_to_annual(dry_run=False)
    >>> verify()

MUST be run BEFORE January salary slips are submitted: once a submitted slip
covers a date, validate_salary_processed_days() blocks creating LWP for that
date, which would make any rollback impossible.
=======================================================================
"""

import frappe
from frappe.utils import flt, getdate, now_datetime

TARGET      = "Annual Leave"
SOURCE      = "Leave Without Pay"
FROM_DATE   = "2026-01-01"
TO_DATE     = "2026-01-31"
APP_MARKER  = "Auto-assigned by Auto Leave Assignment app"
DONE_MARKER = "[LWP2AL]"


def _log(m):
    print(m)


def _core():
    """Reuse the app's balance/allocation helpers so this script and the live
    engine can never disagree about what is consumable."""
    from auto_leave_assignment.core import (
        _consumable_balance, _has_allocation, _leave_days_for,
    )
    return _consumable_balance, _has_allocation, _leave_days_for


# ─────────────────────────────────────────────────────────────
#  Candidate selection
# ─────────────────────────────────────────────────────────────
def _candidates(from_date, to_date, only_employee=None, only_app_created=True):
    conditions = ""
    params = {"src": SOURCE, "start": from_date, "end": to_date,
              "marker": f"%{APP_MARKER}%", "done": f"%{DONE_MARKER}%"}
    if only_employee:
        conditions += " AND employee = %(emp)s"
        params["emp"] = only_employee
    if only_app_created:
        conditions += " AND description LIKE %(marker)s"

    return frappe.db.sql(f"""
        SELECT name, employee, from_date, to_date, half_day, half_day_date,
               total_leave_days, description
        FROM   `tabLeave Application`
        WHERE  leave_type = %(src)s
          AND  docstatus = 1
          AND  status = 'Approved'
          AND  from_date BETWEEN %(start)s AND %(end)s
          AND  IFNULL(description, '') NOT LIKE %(done)s      -- idempotency
          {conditions}
        ORDER BY employee ASC, from_date ASC, name ASC        -- earliest days convert first
    """, params, as_dict=True)


def _check_convertible(la, consumable, has_allocation, leave_days_for, budget):
    """Stand-in for LeaveApplication.validate(), since we bypass the doc layer.
    Returns (ok: bool, reason: str)."""
    if getdate(la.from_date) != getdate(la.to_date):
        return False, "multi-day application"
    if not has_allocation(la.employee, TARGET, la.from_date):
        return False, f"no {TARGET} allocation covering the date"
    # holiday check for the TARGET type (include_holiday differs between types)
    if leave_days_for(la.employee, TARGET, la.from_date,
                      half_day=bool(la.half_day)) <= 0:
        return False, f"date is a holiday for {TARGET}"
    if flt(budget) < flt(la.total_leave_days):
        return False, f"annual balance exhausted (needs {la.total_leave_days}, has {budget})"
    return True, ""


# ─────────────────────────────────────────────────────────────
#  Read-only audit
# ─────────────────────────────────────────────────────────────
def audit(from_date=FROM_DATE, to_date=TO_DATE):
    """Report what the migration would face. Writes nothing."""
    consumable, has_allocation, _ = _core()

    _log("=" * 72)
    _log(f"AUDIT  {from_date} .. {to_date}   {SOURCE} -> {TARGET}")
    _log("=" * 72)

    blocking = frappe.db.count("Salary Slip", {
        "docstatus": 1, "start_date": ["<=", to_date], "end_date": [">=", from_date],
    })
    _log(f"  submitted Salary Slips overlapping the window : {blocking}"
         f"{'   <-- BLOCKER' if blocking else '   (clear)'}")

    lt = frappe.db.get_value("Leave Type", TARGET,
                             ["is_lwp", "is_ppl", "include_holiday",
                              "max_continuous_days_allowed", "allow_negative"], as_dict=True)
    src_holiday = frappe.db.get_value("Leave Type", SOURCE, "include_holiday")
    _log(f"  {TARGET}: {lt}")
    _log(f"  include_holiday parity: {SOURCE}={src_holiday} vs {TARGET}={lt.include_holiday}"
         f"{'   (differ - holiday dates must be excluded)' if src_holiday != lt.include_holiday else ''}")

    cands = _candidates(from_date, to_date)
    employees = sorted({c.employee for c in cands})
    _log(f"  candidate applications: {len(cands)} across {len(employees)} employees")

    no_alloc = [e for e in employees if not has_allocation(e, TARGET, from_date)]
    _log(f"  employees WITHOUT an {TARGET} allocation: {len(no_alloc)} {no_alloc}")

    total_budget = sum(consumable(e, TARGET, from_date) for e in employees)
    _log(f"  total {TARGET} consumable across them: {total_budget}")
    _log(f"  total LWP days requested:               {sum(flt(c.total_leave_days) for c in cands)}")
    _log("=" * 72)
    return {"candidates": len(cands), "employees": len(employees),
            "no_allocation": no_alloc, "blocking_slips": blocking}


# ─────────────────────────────────────────────────────────────
#  Migration
# ─────────────────────────────────────────────────────────────
def migrate_lwp_to_annual(from_date=FROM_DATE, to_date=TO_DATE,
                          dry_run=True, only_employee=None):
    consumable, has_allocation, leave_days_for = _core()
    run_id = "LWP2AL-" + now_datetime().strftime("%Y%m%d%H%M%S")

    blocking = frappe.db.count("Salary Slip", {
        "docstatus": 1, "start_date": ["<=", to_date], "end_date": [">=", from_date],
    })
    if blocking:
        _log(f"[ABORT] {blocking} submitted Salary Slip(s) overlap {from_date}..{to_date}. "
             f"Converting under a submitted slip desynchronises payroll.")
        return {"aborted": True}

    cands = _candidates(from_date, to_date, only_employee=only_employee)
    by_emp = {}
    for c in cands:
        by_emp.setdefault(c.employee, []).append(c)

    _log("=" * 72)
    _log(f"MIGRATE {SOURCE} -> {TARGET}   {from_date}..{to_date}   "
         f"dry_run={dry_run}  run_id={run_id}")
    _log(f"  {len(cands)} candidate applications, {len(by_emp)} employees")
    _log("=" * 72)

    stats = {"converted": 0, "skipped": 0, "errors": 0, "days": 0.0, "run_id": run_id}

    for employee, las in by_emp.items():
        budget = consumable(employee, TARGET, las[0].from_date)
        conv, skip = [], []

        for la in las:
            if not dry_run:
                budget = consumable(employee, TARGET, la.from_date)   # DB is authoritative

            ok, reason = _check_convertible(la, consumable, has_allocation,
                                            leave_days_for, budget)
            if not ok:
                skip.append((la.from_date, reason))
                stats["skipped"] += 1
                continue

            if dry_run:
                conv.append(la.from_date)
                budget -= flt(la.total_leave_days)
                stats["converted"] += 1
                stats["days"] += flt(la.total_leave_days)
                continue

            sp = "lwp2al_" + str(abs(hash(la.name)))[:12]
            frappe.db.savepoint(sp)
            try:
                _convert(la, run_id)
                frappe.db.commit()
                conv.append(la.from_date)
                stats["converted"] += 1
                stats["days"] += flt(la.total_leave_days)
            except Exception as e:
                frappe.db.rollback(save_point=sp)
                stats["errors"] += 1
                _log(f"    [ERROR] {la.name} {la.employee} {la.from_date}: {str(e)[:160]}")
                frappe.log_error(frappe.get_traceback(), f"LWP2AL failed — {la.name}")

        _log(f"  {employee:<14} convert={len(conv):<3} skip={len(skip):<3} "
             f"budget_start={consumable(employee, TARGET, las[0].from_date) if dry_run else 'live'}")
        for d, r in skip[:3]:
            _log(f"      skipped {d}: {r}")

    _log("=" * 72)
    _log(f"  converted : {stats['converted']} applications ({stats['days']} days)")
    _log(f"  skipped   : {stats['skipped']}")
    _log(f"  errors    : {stats['errors']}")
    if dry_run:
        _log("  (DRY RUN — nothing written. Re-run with dry_run=False to apply.)")
    _log("=" * 72)
    return stats


def _convert(la, run_id):
    """The three field rewrites, plus the audit-log update."""
    stamp = f"\n{DONE_MARKER} converted from {SOURCE} by {run_id}"

    frappe.db.sql("""
        UPDATE `tabLeave Application`
        SET    leave_type = %(target)s,
               description = CONCAT(IFNULL(description, ''), %(stamp)s)
        WHERE  name = %(la)s AND docstatus = 1 AND leave_type = %(src)s
    """, {"target": TARGET, "src": SOURCE, "la": la.name, "stamp": stamp})

    # the ledger row is what actually moves the balance
    frappe.db.sql("""
        UPDATE `tabLeave Ledger Entry`
        SET    leave_type = %(target)s, is_lwp = 0
        WHERE  transaction_type = 'Leave Application'
          AND  transaction_name = %(la)s
          AND  docstatus = 1
    """, {"target": TARGET, "la": la.name})

    # payroll reads leave_type off the Attendance row
    frappe.db.sql("""
        UPDATE `tabAttendance`
        SET    leave_type = %(target)s
        WHERE  leave_application = %(la)s AND docstatus = 1
    """, {"target": TARGET, "la": la.name})

    frappe.db.sql("""
        UPDATE `tabAuto Leave Log`
        SET    leave_type = %(target)s,
               remarks = CONCAT(IFNULL(remarks, ''), %(stamp)s)
        WHERE  leave_application = %(la)s
    """, {"target": TARGET, "la": la.name, "stamp": stamp})


# ─────────────────────────────────────────────────────────────
#  Verification
# ─────────────────────────────────────────────────────────────
def verify(from_date=FROM_DATE, to_date=TO_DATE):
    """Read-only post-run checks."""
    consumable, _, _ = _core()
    _log("=" * 72)
    _log("VERIFY")
    _log("=" * 72)

    rows = frappe.db.sql("""
        SELECT leave_type, COUNT(*) AS apps, SUM(total_leave_days) AS days
        FROM   `tabLeave Application`
        WHERE  docstatus = 1 AND from_date BETWEEN %(s)s AND %(e)s
        GROUP BY leave_type
    """, {"s": from_date, "e": to_date}, as_dict=True)
    for r in rows:
        _log(f"  {r.leave_type:<22} {r.apps:>4} apps  {r.days} days")

    ledger = frappe.db.sql("""
        SELECT leave_type,
               ROUND(SUM(CASE WHEN leaves > 0 THEN leaves ELSE 0 END), 1) AS allocated,
               ROUND(SUM(CASE WHEN leaves < 0 THEN -leaves ELSE 0 END), 1) AS consumed,
               ROUND(SUM(leaves), 1) AS remaining
        FROM   `tabLeave Ledger Entry` WHERE docstatus = 1 GROUP BY leave_type
    """, as_dict=True)
    for r in ledger:
        _log(f"  ledger {r.leave_type:<20} alloc={r.allocated} used={r.consumed} left={r.remaining}")

    orphan = frappe.db.sql("""
        SELECT COUNT(*) AS n FROM `tabAttendance`
        WHERE docstatus = 1 AND attendance_date BETWEEN %(s)s AND %(e)s
          AND IFNULL(leave_application, '') <> '' AND IFNULL(leave_type, '') = ''
    """, {"s": from_date, "e": to_date}, as_dict=True)[0]["n"]
    _log(f"  attendance rows with a leave link but BLANK leave_type: {orphan}"
         f"{'   <-- would be paid in full, investigate' if orphan else '   (none)'}")

    cancelled = frappe.db.sql("""
        SELECT COUNT(*) AS n FROM `tabAttendance`
        WHERE docstatus = 2 AND attendance_date BETWEEN %(s)s AND %(e)s
    """, {"s": from_date, "e": to_date}, as_dict=True)[0]["n"]
    _log(f"  cancelled attendance rows in window: {cancelled} (field rewrite should not create any)")
    _log("=" * 72)
    return {"orphan_blank_leave_type": orphan, "cancelled_attendance": cancelled}
