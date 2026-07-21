"""
CHANRICH FRUITS PVT LTD — Payroll cleanup (Jan + orphaned Feb accruals)
=======================================================================
Removes a bad payroll state that predates the OT work:

  * HR-PRUN-2026-00009 (Jan 20 - Feb 19): 40 submitted salary slips where
    every employee had payment_days = 0, because January attendance was
    never imported. Accrued as ACC-JV-2026-00003 (1,073,000).

  * HR-PRUN-2026-00004 (Feb 19 - Mar 20) and HR-PRUN-2026-00006
    (Feb 20 - Mar 19): overlapping entries that BOTH posted accruals
    (ACC-JV-2026-00001 1,812,500 and ACC-JV-2026-00002 1,950,826.08)
    but whose salary slips were subsequently deleted -> orphaned,
    double-counted GL entries for the same month.

Cancel order matters: Journal Entries first (they reference the payroll),
then salary slips, then the payroll entries themselves.

No accounting period is closed and no Period Closing Voucher exists, so
these cancellations are clean. Cancelled docs remain in the system as
docstatus=2 records - nothing is deleted.

Run in bench console (DRY RUN first!):

    cd /home/frappe/frappe-bench
    bench --site 79.72.76.67 console
    >>> exec(open('/home/frappe/frappe-bench/payroll_cleanup.py').read(), globals())
    >>> payroll_cleanup(dry_run=True)    # preview
    >>> payroll_cleanup(dry_run=False)   # apply
=======================================================================
"""

import frappe

JOURNAL_ENTRIES = [
    "ACC-JV-2026-00003",   # Jan 20 - Feb 19 accrual, 1,073,000
    "ACC-JV-2026-00001",   # Feb 19 - Mar 20 accrual, 1,812,500  (orphaned)
    "ACC-JV-2026-00002",   # Feb 20 - Mar 19 accrual, 1,950,826.08 (orphaned)
]

PAYROLL_ENTRIES = [
    "HR-PRUN-2026-00009",  # Jan 20 - Feb 19 (has the 40 slips)
    "HR-PRUN-2026-00004",  # Feb 19 - Mar 20 (empty, overlapping)
    "HR-PRUN-2026-00006",  # Feb 20 - Mar 19 (empty)
]


def _log(m):
    print(m)


def _cancel(doctype, name, dry_run):
    """Cancel one submitted doc. Returns 'cancelled' | 'skipped' | 'error'."""
    try:
        docstatus = frappe.db.get_value(doctype, name, "docstatus")
        if docstatus is None:
            _log(f"    [MISSING] {doctype} {name} does not exist")
            return "skipped"
        if docstatus != 1:
            _log(f"    [SKIP] {doctype} {name} docstatus={docstatus} (not submitted)")
            return "skipped"
        if dry_run:
            _log(f"    [DRY] would cancel {doctype} {name}")
            return "cancelled"
        doc = frappe.get_doc(doctype, name)
        doc.flags.ignore_permissions = True
        doc.cancel()
        frappe.db.commit()
        _log(f"    [OK] cancelled {doctype} {name}")
        return "cancelled"
    except Exception as e:
        frappe.db.rollback()
        _log(f"    [ERROR] {doctype} {name}: {str(e)[:200]}")
        frappe.log_error(frappe.get_traceback(), f"Payroll cleanup failed — {doctype} {name}")
        return "error"


def payroll_cleanup(dry_run=True):
    _log("=" * 68)
    _log(f"PAYROLL CLEANUP   dry_run={dry_run}")
    _log("=" * 68)

    stats = {"je": 0, "slips": 0, "entries": 0, "errors": 0}

    # ── 1. Journal Entries (must go before the docs they reference) ──
    _log("\n  1. Accrual Journal Entries")
    for je in JOURNAL_ENTRIES:
        amt = frappe.db.get_value("Journal Entry", je, "total_debit")
        _log(f"  -> {je} (total_debit={amt})")
        r = _cancel("Journal Entry", je, dry_run)
        if r == "cancelled":
            stats["je"] += 1
        elif r == "error":
            stats["errors"] += 1

    # ── 2. Salary Slips belonging to those payroll entries ──
    _log("\n  2. Salary Slips")
    slips = frappe.get_all(
        "Salary Slip",
        filters={"payroll_entry": ["in", PAYROLL_ENTRIES], "docstatus": 1},
        fields=["name", "employee", "net_pay"],
        order_by="employee",
    )
    _log(f"     found {len(slips)} submitted slips")
    for s in slips:
        r = _cancel("Salary Slip", s.name, dry_run)
        if r == "cancelled":
            stats["slips"] += 1
        elif r == "error":
            stats["errors"] += 1

    # ── 3. Payroll Entries ──
    _log("\n  3. Payroll Entries")
    for pe in PAYROLL_ENTRIES:
        r = _cancel("Payroll Entry", pe, dry_run)
        if r == "cancelled":
            stats["entries"] += 1
        elif r == "error":
            stats["errors"] += 1

    _log("\n" + "=" * 68)
    _log(f"  Journal Entries cancelled : {stats['je']}")
    _log(f"  Salary Slips cancelled    : {stats['slips']}")
    _log(f"  Payroll Entries cancelled : {stats['entries']}")
    _log(f"  Errors                    : {stats['errors']}")
    if dry_run:
        _log("  (DRY RUN — nothing changed. Re-run with dry_run=False to apply.)")
    _log("=" * 68)
    return stats
