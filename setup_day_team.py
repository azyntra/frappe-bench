"""
CHANRICH FRUITS PVT LTD — Day / Target team payroll setup
=======================================================================
Source: "NEW SALARY SHEET (2) (1).xlsx", sheet DAY.

The day team is paid `daily rate x days actually worked`, not a monthly
gross. ERPNext already counts days worked as `payment_days`, so:

    Day Salary = base (the daily rate) * payment_days

Consequences, all deliberate:
  * NO "Absent and LWP Deduction" component. Absence is already priced in —
    18 days worked simply pays 18 x rate. Adding the deduction would charge
    for the same absence twice.
  * The leave chain is blocked for them in core.py::_is_leave_eligible.
    Granting Casual/Annual would mark an absent day PAID, i.e. pay them for
    a day they did not work.
  * `depends_on_payment_days` MUST stay 0 on Day Salary. The formula already
    multiplies by payment_days; leaving the flag on prorates a second time
    (an 18-day month would pay ~14 days' worth).

Overtime is the shared "Overtime" component at 160/hr via the normal
Overtime Slip flow. Their OT rule (before shift start AND after shift end,
per that date's rostered shift) lives in import_attendance.py::_overtime_hours.

Run in bench console (DRY RUN first):

    >>> exec(open('/home/frappe/frappe-bench/setup_day_team.py').read(), globals())
    >>> setup_day_team(dry_run=True)
    >>> setup_day_team(dry_run=False)
=======================================================================
"""

import frappe
from frappe.utils import flt

COMPANY    = "CHAN RICH FRUITS (PVT) LTD"
CURRENCY   = "LKR"
FROM_DATE  = "2026-01-01"
STRUCTURE  = "Day Team - Daily Rate"   # must match DAY_STRUCTURE_PREFIX
DAY_SALARY = "Day Salary"
OVERTIME   = "Overtime"
EPF        = "EPF Employee"

# employee -> (sheet name, daily rate, EPF)
# Ambiguities resolved with the client:
#   * "DANANJANA" appears in BOTH lists. Female @1550 = EMP-00087 (70 attendance
#     days); male @2000 = EMP-00174. EMP-00187 is a duplicate empty record of
#     EMP-00087 (same name, same joining date, no attendance, no fingerprint)
#     and is NOT used — it should be retired.
#   * "KAVINDA" @2000 is EMP-00173, recorded Female in ERPNext but confirmed
#     male by the client; the gender on that record is corrected below.
#   * "PRASANGA" is EMP-00196 PRESANGA ANURUDDA (spelling variant).
DAY_TEAM = {
    # ── girls ──
    "EMP-00116": ("KAVISHANI",      1800, 0),
    "EMP-00180": ("RUKSHIKA",       1800, 0),
    "EMP-00134": ("E.M.THARUSHI",   1700, 0),
    "EMP-00135": ("E.M. NIMESHA",   1700, 0),
    "EMP-00183": ("D.T. DILRUKSHI", 1700, 2400),
    "EMP-00115": ("MAHESHIKA",      1700, 2400),
    "EMP-00087": ("DANANJANA (f)",  1550, 0),
    "EMP-00006": ("THEJANI",        1650, 0),
    "EMP-00181": ("KANCHANA",       1700, 0),
    "EMP-00117": ("SANDUNI",        1700, 0),
    "EMP-00073": ("AA ARIYAWATHI",  1550, 2400),
    "EMP-00088": ("WASANTHI",       1700, 0),
    "EMP-00163": ("INDRA MALANI",   1650, 0),
    # ── boys (all 2000) ──
    "EMP-00188": ("NAVOTH",         2000, 0),
    "EMP-00173": ("KAVINDA",        2000, 2400),
    "EMP-00206": ("DILAN",          2000, 0),
    "EMP-00174": ("DANANJANA (m)",  2000, 0),
    "EMP-00197": ("MC SANDUN",      2000, 0),
    "EMP-00196": ("PRASANGA",       2000, 0),
    "EMP-00145": ("LASINDU",        2000, 0),
}

# recorded gender that the client has corrected
GENDER_FIXES = {"EMP-00173": "Male"}

# Sheet names with no confident match, and working staff absent from the sheet.
# Deliberately NOT guessed — a wrong match pays someone the wrong daily rate.
UNRESOLVED_SHEET_NAMES = ["IRESHA (girls, 1700)", "WA HASHAN MADU (boys, 2000)"]
UNRESOLVED_EMPLOYEES = {
    "EMP-00086": "NIROSHA (80 attendance days — highest of anyone unassigned)",
    "EMP-00175": "MADUSHANKA MADUSHANKA (63 days)",
    "EMP-00048": "SHASHIKA (43 days — was 1750 on the OLD day-team list)",
}


def _log(m):
    print(m)


def _ensure_account(component):
    """Copy the GL account from Basic Salary. Without an account for the
    company, Payroll Entry refuses to submit ('Please set account in Salary
    Component ...') because it cannot build the accrual Journal Entry."""
    src = frappe.get_all("Salary Component Account",
                         filters={"parent": "Basic Salary"},
                         fields=["company", "account"], limit=1)
    if not src:
        _log(f"  [WARN] no account on 'Basic Salary' to copy to {component}")
        return
    if frappe.db.exists("Salary Component Account",
                        {"parent": component, "company": src[0].company}):
        return
    doc = frappe.get_doc("Salary Component", component)
    doc.append("accounts", {"company": src[0].company, "account": src[0].account})
    doc.flags.ignore_permissions = True
    doc.save()
    frappe.db.commit()
    _log(f"  [OK] {component} account set to {src[0].account}")


def _create_day_salary_component(dry_run):
    if frappe.db.exists("Salary Component", DAY_SALARY):
        _log(f"  [SKIP] component exists: {DAY_SALARY}")
        if not dry_run:
            _ensure_account(DAY_SALARY)
        return
    if dry_run:
        _log(f"  [DRY] would create component {DAY_SALARY} (base * payment_days)")
        return
    frappe.get_doc({
        "doctype": "Salary Component",
        "salary_component": DAY_SALARY,
        "salary_component_abbr": "DS",
        "type": "Earning",
        "amount_based_on_formula": 1,
        "formula": "base * payment_days",
        # the formula already carries the day count — prorating again would
        # pay roughly (days/total_days)^2 of the intended amount
        "depends_on_payment_days": 0,
        "statistical_component": 0,
        "do_not_include_in_total": 0,
        "is_tax_applicable": 0,
        "remove_if_zero_valued": 1,
    }).insert(ignore_permissions=True)
    frappe.db.commit()
    _log(f"  [OK] created component {DAY_SALARY}")
    _ensure_account(DAY_SALARY)


def _structure_name(with_epf):
    return f"{STRUCTURE} (EPF)" if with_epf else STRUCTURE


def _create_structure(with_epf, dry_run):
    """Two variants: with and without the fixed 2400 EPF deduction."""
    name = _structure_name(with_epf)
    if frappe.db.exists("Salary Structure", name):
        _log(f"  [SKIP] structure exists: {name}")
        return name
    if dry_run:
        _log(f"  [DRY] would create structure {name}")
        return name
    deductions = [{"salary_component": EPF, "amount": 2400}] if with_epf else []
    doc = frappe.get_doc({
        "doctype": "Salary Structure", "name": name, "company": COMPANY,
        "payroll_frequency": "Monthly", "currency": CURRENCY, "is_active": "Yes",
        "earnings": [
            # amount comes from the formula; Overtime is filled by Additional
            # Salary from the Overtime Slip, so it starts at 0
            {"salary_component": DAY_SALARY, "amount_based_on_formula": 1,
             "formula": "base * payment_days", "amount": 0},
            {"salary_component": OVERTIME, "amount": 0},
        ],
        "deductions": deductions,
    })
    doc.insert(ignore_permissions=True)
    doc.submit()
    frappe.db.commit()
    _log(f"  [OK] created structure {name}")
    return name


def setup_day_team(dry_run=True):
    _log("=" * 76)
    _log(f"DAY TEAM SETUP   effective {FROM_DATE}   dry_run={dry_run}")
    _log("=" * 76)

    _log("\n1. COMPONENT")
    _create_day_salary_component(dry_run)

    _log("\n2. STRUCTURES")
    _create_structure(False, dry_run)
    _create_structure(True, dry_run)

    _log("\n3. GENDER CORRECTIONS")
    for emp, gender in GENDER_FIXES.items():
        cur = frappe.db.get_value("Employee", emp, "gender")
        if cur == gender:
            _log(f"  [SKIP] {emp} already {gender}")
        elif dry_run:
            _log(f"  [DRY] {emp} gender {cur} -> {gender}")
        else:
            frappe.db.set_value("Employee", emp, "gender", gender)
            frappe.db.commit()
            _log(f"  [OK] {emp} gender {cur} -> {gender}")

    _log("\n4. ASSIGNMENTS")
    created = skipped = errors = 0
    for emp, (label, rate, epf) in sorted(DAY_TEAM.items()):
        if not frappe.db.exists("Employee", emp):
            _log(f"  [MISSING] {emp} ({label}) does not exist")
            errors += 1
            continue
        if frappe.db.exists("Salary Structure Assignment",
                            {"employee": emp, "docstatus": 1}):
            _log(f"  [SKIP] {emp} {label} already has a salary structure")
            skipped += 1
            continue

        name = _structure_name(bool(epf))
        if dry_run:
            _log(f"  [DRY] {emp} {label:<16} rate={rate:<5} epf={epf:<5} -> {name}")
            created += 1
            continue
        try:
            a = frappe.get_doc({
                "doctype": "Salary Structure Assignment", "employee": emp,
                "salary_structure": name, "company": COMPANY,
                "from_date": FROM_DATE,
                "base": flt(rate),           # <- the daily rate drives the formula
                "currency": CURRENCY,
            })
            a.insert(ignore_permissions=True)
            a.submit()
            frappe.db.commit()
            _log(f"  [OK] {emp} {label:<16} rate={rate} -> {name}")
            created += 1
        except Exception as e:
            errors += 1
            _log(f"  [ERROR] {emp} {label}: {str(e)[:160]}")
            frappe.log_error(frappe.get_traceback(), f"Day team setup — {emp}")

    if not dry_run:
        # profiles are memoised per worker; drop them so the new structures
        # are picked up without a restart
        try:
            from hrms.hr.page.import_attendance.import_attendance import (
                clear_pay_profile_cache,
            )
            clear_pay_profile_cache()
        except Exception:
            pass
        frappe.clear_cache()

    _log("=" * 76)
    _log(f"  assignments created : {created}")
    _log(f"  already had one     : {skipped}")
    _log(f"  errors              : {errors}")
    _log("\n  STILL UNRESOLVED — not set up, needs the client:")
    for n in UNRESOLVED_SHEET_NAMES:
        _log(f"    sheet name with no match : {n}")
    for emp, why in UNRESOLVED_EMPLOYEES.items():
        _log(f"    working but not in sheet : {emp} {why}")
    if dry_run:
        _log("\n  (DRY RUN — nothing written.)")
    _log("=" * 76)
    return {"created": created, "skipped": skipped, "errors": errors}
