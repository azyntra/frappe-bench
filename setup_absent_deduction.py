"""
CHANRICH FRUITS PVT LTD — Full earnings + explicit Absent/LWP deduction
=======================================================================
Previously: Basic Salary was prorated by payment days, so an employee with
absences saw Basic shrink (or vanish entirely at 0 payment days) while the
allowances still paid in full — confusing and inconsistent.

New model (per client): show ALL earnings at their FULL value, and take the
cost of unpaid days as ONE explicit deduction line on the payslip.

    Gross      = Basic + all allowances (full) + Overtime
    Deduction  = (BS+FA+RHA+PA+WHA) / total_working_days * unpaid_days
    Net        = Gross - EPF - Absent/LWP Deduction

unpaid_days = absent_days + leave_without_pay. Paid leave (e.g. Casual Leave
assigned by the auto-leave app) is NOT deducted, which is correct.

The formula deliberately sums the FIXED components only — it does not
reference the Overtime abbr — so OT never inflates the per-day absence rate.
Every Salary Component abbr is pre-seeded to 0 by ERPNext's formula engine,
so structures missing an allowance evaluate it as 0 instead of erroring.

Run in bench console:

    cd /home/frappe/frappe-bench
    bench --site 79.72.76.67 console
    >>> exec(open('/home/frappe/frappe-bench/setup_absent_deduction.py').read(), globals())
    >>> audit()                                   # read-only: what will change
    >>> setup_absent_deduction(only='FT-EMP-00004-ASANKA')   # test ONE structure
    >>> preview_slip('EMP-00004', '2026-02-20', '2026-03-19')  # in-memory, writes nothing
    >>> setup_absent_deduction()                  # roll out to all FT- structures
=======================================================================
"""

import frappe

DEDUCTION      = "Absent and LWP Deduction"
DEDUCTION_ABBR = "ALD"

# Guarded against total_working_days == 0 (max() is not whitelisted in formulas).
FORMULA = (
    "((BS + FA + RHA + PA + WHA) * (absent_days + leave_without_pay) "
    "/ total_working_days) if total_working_days else 0"
)


def _log(msg):
    print(msg)


# ─────────────────────────────────────────────────────────────
#  Read-only audit — run this FIRST
# ─────────────────────────────────────────────────────────────
def audit():
    """Report what would change. Writes nothing."""
    _log("=" * 68)
    _log("AUDIT — Absent/LWP deduction rollout")
    _log("=" * 68)

    dep = frappe.db.get_value("Salary Component", "Basic Salary", "depends_on_payment_days")
    _log(f"  Basic Salary.depends_on_payment_days = {dep}  -> will become 0")

    # Safety: make sure Basic Salary is only used by FT- structures
    users = frappe.get_all(
        "Salary Detail",
        filters={"salary_component": "Basic Salary", "parenttype": "Salary Structure"},
        fields=["parent"],
    )
    non_ft = sorted({u.parent for u in users if not u.parent.startswith("FT-")})
    _log(f"  Structures using 'Basic Salary': {len({u.parent for u in users})} "
         f"({len(non_ft)} NON-FT-)")
    if non_ft:
        _log(f"  [WARN] non-FT structures affected by the Basic change: {non_ft}")

    structures = frappe.get_all("Salary Structure", filters={"name": ["like", "FT-%"]}, pluck="name")
    already = 0
    for s in structures:
        if frappe.db.exists("Salary Detail", {
            "parent": s, "parenttype": "Salary Structure",
            "parentfield": "deductions", "salary_component": DEDUCTION,
        }):
            already += 1
    _log(f"  FT- structures: {len(structures)} | already have '{DEDUCTION}': {already} "
         f"| to add: {len(structures) - already}")
    _log(f"  Component '{DEDUCTION}' exists: {bool(frappe.db.exists('Salary Component', DEDUCTION))}")
    _log("=" * 68)
    return {"ft_structures": len(structures), "already": already, "non_ft_basic": non_ft}


# ─────────────────────────────────────────────────────────────
#  1. Deduction component
# ─────────────────────────────────────────────────────────────
def create_deduction_component():
    if frappe.db.exists("Salary Component", DEDUCTION):
        frappe.db.set_value("Salary Component", DEDUCTION, {
            "amount_based_on_formula": 1,
            "formula": FORMULA,
            "depends_on_payment_days": 0,
        })
        frappe.db.commit()
        _log(f"  [SKIP] Component exists: {DEDUCTION} (formula re-synced)")
        return
    doc = frappe.get_doc({
        "doctype":                 "Salary Component",
        "salary_component":        DEDUCTION,
        "salary_component_abbr":   DEDUCTION_ABBR,
        "type":                    "Deduction",
        "amount_based_on_formula": 1,
        "formula":                 FORMULA,
        # must NOT be prorated itself, and must count in total deductions
        "depends_on_payment_days": 0,
        "statistical_component":   0,
        "do_not_include_in_total": 0,
        "remove_if_zero_valued":   1,     # hide the line when there are no unpaid days
    })
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    _log(f"  [OK] Component created: {DEDUCTION} ({DEDUCTION_ABBR}, Deduction, formula-based)")


# ─────────────────────────────────────────────────────────────
#  2. Stop prorating Basic Salary
# ─────────────────────────────────────────────────────────────
def stop_basic_proration():
    cur = frappe.db.get_value("Salary Component", "Basic Salary", "depends_on_payment_days")
    if cur == 0:
        _log("  [SKIP] Basic Salary already has depends_on_payment_days = 0")
        return
    frappe.db.set_value("Salary Component", "Basic Salary", "depends_on_payment_days", 0)
    frappe.db.commit()
    _log("  [OK] Basic Salary.depends_on_payment_days -> 0 (Basic now always full)")


# ─────────────────────────────────────────────────────────────
#  3. Attach the deduction to FT- salary structures
# ─────────────────────────────────────────────────────────────
def add_deduction_to_structures(only=None):
    """Append the deduction row to submitted FT- Salary Structures."""
    if only:
        structures = [only]
    else:
        structures = frappe.get_all(
            "Salary Structure", filters={"name": ["like", "FT-%"]}, pluck="name"
        )

    added = skipped = errors = 0
    for name in structures:
        try:
            doc = frappe.get_doc("Salary Structure", name)
            if any(d.salary_component == DEDUCTION for d in doc.deductions):
                skipped += 1
                continue

            doc.append("deductions", {
                "salary_component":        DEDUCTION,
                "abbr":                    DEDUCTION_ABBR,
                "amount_based_on_formula": 1,
                "formula":                 FORMULA,
                "amount":                  0,
                "depends_on_payment_days": 0,
                "statistical_component":   0,
                "do_not_include_in_total": 0,
            })
            # Salary Structures are submitted; permit the child-row addition.
            doc.flags.ignore_validate_update_after_submit = True
            doc.flags.ignore_permissions = True
            doc.save(ignore_permissions=True)
            frappe.db.commit()
            added += 1
        except Exception as e:
            errors += 1
            frappe.db.rollback()
            _log(f"  [ERROR] {name}: {e}")
            frappe.log_error(frappe.get_traceback(), f"Absent deduction add failed — {name}")

    _log(f"  [OK] structures: {added} added, {skipped} already had it, {errors} errors")
    return {"added": added, "skipped": skipped, "errors": errors}


# ─────────────────────────────────────────────────────────────
#  Verification — computes a slip IN MEMORY, saves nothing
# ─────────────────────────────────────────────────────────────
def preview_slip(employee, start_date, end_date):
    """Build a Salary Slip in memory and print the computed figures. No writes."""
    ss = frappe.new_doc("Salary Slip")
    ss.employee       = employee
    ss.start_date     = start_date
    ss.end_date       = end_date
    ss.posting_date   = end_date
    ss.payroll_frequency = "Monthly"
    ss.company        = frappe.db.get_value("Employee", employee, "company")
    ss.run_method("validate")

    _log("=" * 68)
    _log(f"PREVIEW (not saved) — {employee}  {start_date} .. {end_date}")
    _log(f"  total_working_days={ss.total_working_days}  payment_days={ss.payment_days}"
         f"  absent={ss.absent_days}  lwp={ss.leave_without_pay}")
    _log("  EARNINGS:")
    for r in ss.earnings:
        _log(f"    {r.salary_component:<32} {r.amount:>12,.2f}")
    _log("  DEDUCTIONS:")
    for r in ss.deductions:
        _log(f"    {r.salary_component:<32} {r.amount:>12,.2f}")
    _log(f"  GROSS = {ss.gross_pay:,.2f}   TOTAL DED = {ss.total_deduction:,.2f}   NET = {ss.net_pay:,.2f}")
    _log("=" * 68)
    return ss


# ─────────────────────────────────────────────────────────────
def setup_absent_deduction(only=None):
    _log("=" * 68)
    _log("CHANRICH FRUITS — Full earnings + Absent/LWP deduction")
    _log("=" * 68)
    create_deduction_component()
    stop_basic_proration()
    add_deduction_to_structures(only=only)
    _log("Done. Verify with preview_slip(employee, start, end) before running payroll.")
    _log("=" * 68)
