"""
CHANRICH FRUITS PVT LTD — Full transaction reset (START FRESH)
=======================================================================
Wipes all attendance-derived transaction data so attendance can be
re-imported from scratch.

DELETES
    Employee Checkin, Attendance, Auto Leave Log,
    Leave Application  (+ their Leave Ledger Entry rows -> balances restored),
    Overtime Slip + Overtime Details, Additional Salary,
    Salary Slip + its child rows, Payroll Entry + child rows,
    Journal Entry + child rows + their GL Entry rows

KEEPS (masters / configuration — nothing here is transaction data)
    Employee, Leave Allocation (+ its ledger rows = the 2026 entitlements),
    Salary Structure & Salary Structure Assignment, Leave Type,
    Shift Type / Shift Assignment, Holiday List, Overtime Type,
    Salary Component, Payroll Settings

TWO LANDMINES THIS SCRIPT AVOIDS
--------------------------------
1. `tabSalary Detail` is shared by Salary Slip AND Salary Structure. Every
   delete here is filtered on parenttype='Salary Slip'. Deleting it
   unfiltered would destroy all 40 salary structures' earnings/deductions.
2. `tabLeave Ledger Entry` holds BOTH allocations (the entitlement) and
   applications (the consumption). Only transaction_type='Leave Application'
   rows are removed, which restores each employee's balance to their full
   allocation. Removing allocation rows would wipe the entitlements.

Run in bench console — DRY RUN FIRST:

    cd /home/frappe/frappe-bench
    bench --site 79.72.76.67 console
    >>> exec(open('/home/frappe/frappe-bench/reset_transactions.py').read(), globals())
    >>> reset_transactions(dry_run=True)
    >>> reset_transactions(dry_run=False, confirm="YES-WIPE-TRANSACTIONS")
    >>> verify_reset()

TAKE A BACKUP FIRST. This is not reversible without one.
=======================================================================
"""

import frappe

CONFIRM_TOKEN = "YES-WIPE-TRANSACTIONS"

# (label, table, where-clause)  — ordered children-before-parents
PLAN = [
    ("GL Entry (journal)",        "tabGL Entry",               "voucher_type = 'Journal Entry'"),
    ("Journal Entry Account",     "tabJournal Entry Account",  "1=1"),
    ("Tax Withholding Entry",     "tabTax Withholding Entry",  "1=1"),
    ("Journal Entry",             "tabJournal Entry",          "1=1"),

    # NOTE parenttype filter — Salary Detail is shared with Salary Structure
    ("Salary Detail (slips only)", "tabSalary Detail",         "parenttype = 'Salary Slip'"),
    ("Employee Benefit Detail",   "tabEmployee Benefit Detail", "parenttype = 'Salary Slip'"),
    ("Salary Slip Leave",         "tabSalary Slip Leave",      "1=1"),
    ("Salary Slip Timesheet",     "tabSalary Slip Timesheet",  "1=1"),
    ("Salary Slip",               "tabSalary Slip",            "1=1"),

    ("Payroll Employee Detail",   "tabPayroll Employee Detail", "1=1"),
    ("Payroll Entry",             "tabPayroll Entry",          "1=1"),

    ("Additional Salary",         "tabAdditional Salary",      "1=1"),
    ("Overtime Details",          "tabOvertime Details",       "1=1"),
    ("Overtime Slip",             "tabOvertime Slip",          "1=1"),

    # only the CONSUMPTION rows — allocation rows are the entitlement
    ("Leave Ledger (applications)", "tabLeave Ledger Entry",   "transaction_type = 'Leave Application'"),
    ("Leave Application",         "tabLeave Application",      "1=1"),

    ("Auto Leave Log",            "tabAuto Leave Log",         "1=1"),
    ("Attendance",                "tabAttendance",             "1=1"),
    ("Employee Checkin",          "tabEmployee Checkin",       "1=1"),
]

KEEP = [
    ("Employee",                   "tabEmployee",                "1=1"),
    ("Leave Allocation",           "tabLeave Allocation",        "1=1"),
    ("Leave Ledger (allocations)", "tabLeave Ledger Entry",      "transaction_type = 'Leave Allocation'"),
    ("Salary Structure",           "tabSalary Structure",        "1=1"),
    ("Salary Detail (structures)", "tabSalary Detail",           "parenttype = 'Salary Structure'"),
    ("Salary Structure Assignment", "tabSalary Structure Assignment", "1=1"),
    ("Shift Assignment",           "tabShift Assignment",        "1=1"),
    ("Overtime Type",              "tabOvertime Type",           "1=1"),
]


def _log(m):
    print(m)


def _count(table, where):
    if not frappe.db.table_exists(table.replace("tab", "", 1)):
        return None
    try:
        return frappe.db.sql(f"SELECT COUNT(*) AS n FROM `{table}` WHERE {where}",
                             as_dict=True)[0]["n"]
    except Exception as e:
        _log(f"    [WARN] cannot count {table}: {str(e)[:120]}")
        return None


def reset_transactions(dry_run=True, confirm=None):
    _log("=" * 72)
    _log(f"TRANSACTION RESET   dry_run={dry_run}")
    _log("=" * 72)

    if not dry_run and confirm != CONFIRM_TOKEN:
        _log(f"[ABORT] pass confirm=\"{CONFIRM_TOKEN}\" to actually delete.")
        return {"aborted": True}

    _log("\n  WILL DELETE")
    total = 0
    for label, table, where in PLAN:
        n = _count(table, where)
        if n is None:
            _log(f"    {label:<30} (table missing — skipped)")
            continue
        total += n
        _log(f"    {label:<30} {n:>7}")
    _log(f"    {'TOTAL ROWS':<30} {total:>7}")

    _log("\n  WILL KEEP")
    for label, table, where in KEEP:
        n = _count(table, where)
        _log(f"    {label:<30} {n if n is not None else '-':>7}")

    if dry_run:
        _log("\n  (DRY RUN — nothing deleted.)")
        _log("=" * 72)
        return {"would_delete": total}

    _log("\n  DELETING…")
    deleted = {}
    for label, table, where in PLAN:
        if _count(table, where) is None:
            continue
        try:
            frappe.db.sql(f"DELETE FROM `{table}` WHERE {where}")
            frappe.db.commit()
            deleted[label] = "ok"
            _log(f"    [OK] {label}")
        except Exception as e:
            frappe.db.rollback()
            deleted[label] = f"ERROR: {str(e)[:160]}"
            _log(f"    [ERROR] {label}: {str(e)[:160]}")
            frappe.log_error(frappe.get_traceback(), f"Reset failed — {table}")

    frappe.db.commit()
    frappe.clear_cache()
    _log("\n  Done. Re-import attendance to start fresh.")
    _log("=" * 72)
    return deleted


def verify_reset():
    """Confirm the wipe is complete and leave balances are back to full."""
    _log("=" * 72)
    _log("VERIFY RESET")
    _log("=" * 72)

    _log("  should all be ZERO:")
    for label, table, where in PLAN:
        n = _count(table, where)
        if n is None:
            continue
        flag = "" if n == 0 else "   <-- NOT EMPTY"
        _log(f"    {label:<30} {n:>7}{flag}")

    _log("\n  masters that must survive:")
    for label, table, where in KEEP:
        n = _count(table, where)
        _log(f"    {label:<30} {n if n is not None else '-':>7}")

    _log("\n  leave balances (consumed should now be 0):")
    rows = frappe.db.sql("""
        SELECT leave_type,
               ROUND(SUM(CASE WHEN leaves > 0 THEN leaves ELSE 0 END), 1) AS allocated,
               ROUND(SUM(CASE WHEN leaves < 0 THEN -leaves ELSE 0 END), 1) AS consumed,
               ROUND(SUM(leaves), 1) AS remaining
        FROM   `tabLeave Ledger Entry` WHERE docstatus = 1 GROUP BY leave_type
    """, as_dict=True)
    for r in rows:
        _log(f"    {r.leave_type:<24} alloc={r.allocated}  consumed={r.consumed}  left={r.remaining}")
    _log("=" * 72)
    return rows
