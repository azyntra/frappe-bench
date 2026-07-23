"""
CHANRICH FRUITS PVT LTD — Day Team Planner data fixes
=======================================================================
Companion to the day-team-planner / day-shift-assignment page updates.

1. DEPARTMENT — the planner pages list employees by
   department = 'Day Team - CHAN RICH'. Five day-team members (they hold a
   "Day Team - Daily Rate" structure) have no department, so HR cannot see
   or roster them on either page.

2. SHIFT TYPE — the day team sometimes works the normal 8AM-5PM day. A
   dedicated "Day-Shift(8am-5pm)" keeps their rostering separate from the
   fixed staff's long-range "Normal Workday" (same hours, different usage).

3. CUSTOM FIELD — Employee.custom_sunday_worker persists the planner's
   ☀ Sunday-worker toggle (it was in-memory only and reset every reload).

4. LONG-RANGE ASSIGNMENT — PRESANGA (EMP-00196) carries a year-long
   "Normal Workday" assignment (2026-01-01→2026-12-31). The per-day planner
   must never coexist with it: end-date it at yesterday so history keeps its
   shift resolution and future days are rostered per-day like the rest of
   the team. (The new bulk_assign endpoint additionally REFUSES to delete
   multi-day records, so nothing like it can be destroyed by a misclick.)

Run in bench console (DRY RUN first):

    >>> exec(open('/home/frappe/frappe-bench/setup_day_planner_fixes.py').read(), globals())
    >>> day_planner_fixes(dry_run=True)
    >>> day_planner_fixes(dry_run=False)
=======================================================================
"""

import frappe

DEPT = "Day Team - CHAN RICH"
NEW_SHIFT = "Day-Shift(8am-5pm)"
CUTOFF = "2026-07-22"  # yesterday — long-range records keep history up to here

# day-team members (hold a Day Team structure) with no department set
MISSING_DEPT = ["EMP-00006", "EMP-00087", "EMP-00196", "EMP-00197", "EMP-00206"]

# every current day-team member — used to sweep for long-range assignments
DAY_TEAM = [
    "EMP-00006", "EMP-00073", "EMP-00087", "EMP-00088", "EMP-00115",
    "EMP-00116", "EMP-00117", "EMP-00134", "EMP-00135", "EMP-00145",
    "EMP-00163", "EMP-00173", "EMP-00174", "EMP-00180", "EMP-00181",
    "EMP-00183", "EMP-00188", "EMP-00196", "EMP-00197", "EMP-00206",
]


def _log(m):
    print(m)


def day_planner_fixes(dry_run=True):
    _log("=" * 76)
    _log(f"DAY PLANNER FIXES   dry_run={dry_run}")
    _log("=" * 76)

    _log("\n1. DEPARTMENT")
    for emp in MISSING_DEPT:
        cur = frappe.db.get_value("Employee", emp, ["department", "employee_name"], as_dict=True)
        if not cur:
            _log(f"  [MISSING] {emp} does not exist")
            continue
        if cur.department == DEPT:
            _log(f"  [SKIP] {emp} {cur.employee_name} already in {DEPT}")
            continue
        if dry_run:
            _log(f"  [DRY] {emp} {cur.employee_name}: {cur.department} -> {DEPT}")
        else:
            frappe.db.set_value("Employee", emp, "department", DEPT)
            _log(f"  [OK] {emp} {cur.employee_name} -> {DEPT}")

    _log("\n2. SHIFT TYPE")
    if frappe.db.exists("Shift Type", NEW_SHIFT):
        _log(f"  [SKIP] {NEW_SHIFT} exists")
    elif dry_run:
        _log(f"  [DRY] would create {NEW_SHIFT} 08:00-17:00 (begin-checkin 60, checkout-after 60)")
    else:
        frappe.get_doc({
            "doctype": "Shift Type",
            "name": NEW_SHIFT,
            "__newname": NEW_SHIFT,
            "start_time": "08:00:00",
            "end_time": "17:00:00",
            # match the Target-Shift settings; auto attendance stays off —
            # attendance comes from the import page, not from check-in sync
            "enable_auto_attendance": 0,
            "begin_check_in_before_shift_start_time": 60,
            "allow_check_out_after_shift_end_time": 60,
        }).insert(ignore_permissions=True)
        _log(f"  [OK] created {NEW_SHIFT}")

    _log("\n3. CUSTOM FIELD Employee.custom_sunday_worker")
    if frappe.db.exists("Custom Field", {"dt": "Employee", "fieldname": "custom_sunday_worker"}):
        _log("  [SKIP] field exists")
    elif dry_run:
        _log("  [DRY] would create Check field 'Sunday Worker (Day Team)' after department")
    else:
        from frappe.custom.doctype.custom_field.custom_field import create_custom_field
        create_custom_field("Employee", {
            "fieldname": "custom_sunday_worker",
            "label": "Sunday Worker (Day Team)",
            "fieldtype": "Check",
            "insert_after": "department",
            "default": "0",
        })
        _log("  [OK] created custom_sunday_worker")

    _log(f"\n4. LONG-RANGE ASSIGNMENTS ON DAY-TEAM MEMBERS (end-date to {CUTOFF})")
    rows = frappe.db.sql(
        """
        SELECT name, employee, shift_type, start_date, end_date
        FROM `tabShift Assignment`
        WHERE docstatus = 1
          AND employee IN %(emps)s
          AND (end_date IS NULL OR end_date != start_date)
          AND IFNULL(end_date, '2999-12-31') > %(cutoff)s
        """,
        {"emps": DAY_TEAM, "cutoff": CUTOFF},
        as_dict=True,
    )
    if not rows:
        _log("  [OK] none found")
    for r in rows:
        if str(r.start_date) > CUTOFF:
            # starts in the future — end-dating makes no sense; needs a human
            _log(f"  [WARN] {r.name} {r.employee} {r.shift_type} starts {r.start_date} (future) — review manually")
            continue
        if dry_run:
            _log(f"  [DRY] {r.name} {r.employee} {r.shift_type} {r.start_date}->{r.end_date or 'open'}: set end_date={CUTOFF}")
        else:
            # end_date is allow_on_submit — safe to set on a submitted record
            frappe.db.set_value("Shift Assignment", r.name, "end_date", CUTOFF)
            _log(f"  [OK] {r.name} {r.employee} end_date -> {CUTOFF}")

    if not dry_run:
        frappe.db.commit()
        frappe.clear_cache()
    _log("=" * 76)
    _log("  (DRY RUN — nothing written.)" if dry_run else "  Done.")
    _log("=" * 76)
