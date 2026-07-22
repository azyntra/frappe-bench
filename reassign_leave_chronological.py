"""
CHANRICH FRUITS PVT LTD — Re-assign auto leave in DATE order
=======================================================================
Leave was allocated in PROCESSING order, not date order. Because the
catch-up runs covered different sub-ranges at different times, a later
absence could consume Casual Leave before an earlier absence was even
looked at — e.g. EMP-00004 got Annual Leave on 12 Mar while 25 Mar, 31 Mar
and 3 Apr had already taken Casual. 17 employees are affected.

Pay is unchanged in total (Casual and Annual are both paid); this only makes
WHICH day consumes WHICH bucket chronological and defensible.

Method: surgical field rewrite, exactly as migrate_lwp_to_annual.py —
    Leave Application . leave_type
    Leave Ledger Entry . leave_type, is_lwp   <- moves the balance
    Attendance . leave_type
NOT cancel-and-recreate: cancelling a Leave Application also cancels its
Attendance record, which would destroy hundreds of attendance rows.

Constraints respected while re-assigning:
  * per-type capacity = allocation minus anything consumed by leave this
    script does not own (manually entered leave is never touched)
  * Casual Leave max_continuous_days_allowed = 3 — assigning the earliest
    days to Casual could otherwise build an illegal 4-day consecutive run
  * days already covered are re-labelled only; none are created or removed

Run in bench console (DRY RUN first):

    >>> exec(open('/home/frappe/frappe-bench/reassign_leave_chronological.py').read(), globals())
    >>> reassign(dry_run=True)
    >>> reassign(dry_run=False)
=======================================================================
"""

import frappe
from frappe.utils import add_days, flt, getdate

CHAIN      = ["Casual Leave", "Annual Leave"]      # paid types, in priority order
APP_MARKER = "Auto-assigned by Auto Leave Assignment app"


def _log(m):
    print(m)


def _lwp_type():
    row = frappe.get_all("Leave Type", filters={"is_lwp": 1}, pluck="name", limit=1)
    return row[0] if row else "Leave Without Pay"


def _max_continuous(leave_type):
    return frappe.db.get_value("Leave Type", leave_type, "max_continuous_days_allowed") or 0


def _capacity(employee, leave_type, on_date, owned_names):
    """Days of `leave_type` available to redistribute.

    = total allocated  minus  anything consumed by leave we do NOT own
    (manual leave, other apps). Everything we own is being re-decided, so it
    must not count against the budget.
    """
    alloc = frappe.db.sql("""
        SELECT IFNULL(SUM(total_leaves_allocated), 0)
        FROM `tabLeave Allocation`
        WHERE employee=%(e)s AND leave_type=%(lt)s AND docstatus=1
          AND from_date <= %(d)s AND to_date >= %(d)s
    """, {"e": employee, "lt": leave_type, "d": on_date})[0][0]

    if not owned_names:
        owned_names = ["__none__"]
    used_by_others = frappe.db.sql("""
        SELECT IFNULL(SUM(total_leave_days), 0)
        FROM `tabLeave Application`
        WHERE employee=%(e)s AND leave_type=%(lt)s AND docstatus=1
          AND name NOT IN %(owned)s
    """, {"e": employee, "lt": leave_type, "owned": tuple(owned_names)})[0][0]

    return flt(alloc) - flt(used_by_others)


def _would_break_run(assigned, day, leave_type, qty):
    """True if giving `day` to leave_type creates a consecutive run longer
    than that type's max_continuous_days_allowed."""
    cap = _max_continuous(leave_type)
    if not cap:
        return False
    run = flt(qty)
    d = add_days(getdate(day), -1)
    while assigned.get(d) == leave_type:
        run += 1
        d = add_days(d, -1)
    d = add_days(getdate(day), 1)
    while assigned.get(d) == leave_type:
        run += 1
        d = add_days(d, 1)
    return run > cap


def reassign(dry_run=True):
    lwp = _lwp_type()
    rows = frappe.db.sql(f"""
        SELECT name, employee, from_date, leave_type, total_leave_days
        FROM   `tabLeave Application`
        WHERE  docstatus = 1 AND status = 'Approved'
          AND  description LIKE %(marker)s
        ORDER BY employee ASC, from_date ASC, name ASC
    """, {"marker": f"%{APP_MARKER}%"}, as_dict=True)

    by_emp = {}
    for r in rows:
        by_emp.setdefault(r.employee, []).append(r)

    _log("=" * 72)
    _log(f"RE-ASSIGN AUTO LEAVE IN DATE ORDER   dry_run={dry_run}")
    _log(f"  {len(rows)} owned leave applications across {len(by_emp)} employees")
    _log("=" * 72)

    changed_total, unchanged_total, errors = 0, 0, 0
    summary = []

    for employee, apps in by_emp.items():
        owned = [a.name for a in apps]
        first_date = min(getdate(a.from_date) for a in apps)
        budget = {lt: _capacity(employee, lt, first_date, owned) for lt in CHAIN}
        start_budget = dict(budget)

        assigned, plan = {}, []
        for a in apps:
            day = getdate(a.from_date)
            qty = flt(a.total_leave_days) or 1.0
            chosen = None
            for lt in CHAIN:
                if budget.get(lt, 0) >= qty and not _would_break_run(assigned, day, lt, qty):
                    chosen = lt
                    budget[lt] -= qty
                    break
            if not chosen:
                chosen = lwp
            assigned[day] = chosen
            plan.append((a, chosen))

        changed = [(a, new) for a, new in plan if a.leave_type != new]
        changed_total += len(changed)
        unchanged_total += len(plan) - len(changed)

        if changed:
            counts = {}
            for _, new in plan:
                counts[new] = counts.get(new, 0) + 1
            summary.append((employee, len(changed), start_budget, counts))

        if dry_run or not changed:
            continue

        for a, new in changed:
            sp = "reasg_" + str(abs(hash(a.name)))[:10]
            frappe.db.savepoint(sp)
            try:
                _rewrite(a.name, new, lwp)
                frappe.db.commit()
            except Exception as e:
                frappe.db.rollback(save_point=sp)
                errors += 1
                _log(f"  [ERROR] {a.name} -> {new}: {str(e)[:140]}")
                frappe.log_error(frappe.get_traceback(), f"Re-assign failed — {a.name}")

    for emp, n, sb, counts in summary[:15]:
        _log(f"  {emp:<14} changed={n:<3} budget CL={sb.get('Casual Leave')} "
             f"AL={sb.get('Annual Leave')}  -> {counts}")

    _log("=" * 72)
    _log(f"  applications re-labelled : {changed_total}")
    _log(f"  already correct          : {unchanged_total}")
    _log(f"  errors                   : {errors}")
    if dry_run:
        _log("  (DRY RUN — nothing written.)")
    _log("=" * 72)
    return {"changed": changed_total, "unchanged": unchanged_total, "errors": errors}


def _rewrite(la_name, new_type, lwp_type):
    """Move a leave application (and its ledger + attendance) to another type."""
    is_lwp = 1 if new_type == lwp_type else 0

    frappe.db.sql("""
        UPDATE `tabLeave Application`
        SET    leave_type = %(t)s
        WHERE  name = %(n)s AND docstatus = 1
    """, {"t": new_type, "n": la_name})

    frappe.db.sql("""
        UPDATE `tabLeave Ledger Entry`
        SET    leave_type = %(t)s, is_lwp = %(lwp)s
        WHERE  transaction_type = 'Leave Application'
          AND  transaction_name = %(n)s AND docstatus = 1
    """, {"t": new_type, "lwp": is_lwp, "n": la_name})

    frappe.db.sql("""
        UPDATE `tabAttendance`
        SET    leave_type = %(t)s
        WHERE  leave_application = %(n)s AND docstatus = 1
    """, {"t": new_type, "n": la_name})

    frappe.db.sql("""
        UPDATE `tabAuto Leave Log`
        SET    leave_type = %(t)s
        WHERE  leave_application = %(n)s
    """, {"t": new_type, "n": la_name})
