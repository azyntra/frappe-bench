"""
CHANRICH FRUITS PVT LTD — Apply the NEW SALARY SHEET (FIXED tab), eff. 2026-01-01
=======================================================================
Source: "NEW SALARY SHEET (2) (1).xlsx", sheet FIXED.

Three things happen:
  1. create the one missing employee (CHANDRASENA -> EMP-00030)
  2. update salary amounts for everyone whose figures changed
  3. create structures + assignments for staff who had none

Amounts are written onto the EXISTING Salary Structures rather than creating
new ones. That is correct here because the change is effective 2026-01-01 and
the earliest payroll period is 2026-01-20, so no already-paid period is
affected — and every current salary slip is still Draft. Creating a second
structure per employee would double the structure count for no benefit.

RESOLVED AMBIGUITIES (confirmed with the client)
  * EM NO 21 = CHAMINDA HERATH = EMP-00021 ("DC HERATH" is the same person)
  * EM NO 47 "THIWANKA" does not exist -> EMP-00131 THIWANKA SANDAMALI.
    Every field matches that employee exactly except Food (7500 -> 11250),
    which is the same increase applied to everyone else, so 47 is a typo.
  * RANJITH / CHATHURA each appear twice with conflicting basics
    (50,000 vs 30,000). Client: 30,000 is correct — the 50,000 rows are dropped.
  * Rows with no EM NO resolved by name: Nuwan = EMP-00212,
    CHATHURA = EMP-00213, RANJITH = EMP-00198, plus HASHINI = EMP-00155 and
    DARSHIKA = EMP-00160 (both already had structures).
  * EMP-00027, EMP-00151, EMP-00165 are NOT in the sheet — left untouched.

Run in bench console (DRY RUN first):

    >>> exec(open('/home/frappe/frappe-bench/apply_salary_sheet_2026.py').read(), globals())
    >>> apply_sheet(dry_run=True)
    >>> apply_sheet(dry_run=False)
=======================================================================
"""

import frappe
from frappe.utils import flt

COMPANY   = "CHAN RICH FRUITS (PVT) LTD"
CURRENCY  = "LKR"
FROM_DATE = "2026-01-01"

COMP = {
    "basic":   "Basic Salary",
    "food":    "Food Allowance",
    "risk":    "Risk Hazard Allowance",
    "prod":    "Production Allowance",
    "weather": "Weather Hardship Allowance",
}
EPF = "EPF Employee"

# employee -> figures from the FIXED sheet
SHEET = {
    "EMP-00003": dict(basic=30000, food=10000, risk=7500,  prod=7500,  weather=5000,  epf=2400),
    "EMP-00004": dict(basic=30000, food=10500, risk=17500, prod=40000, weather=5000,  epf=2400),
    "EMP-00005": dict(basic=30000, food=7500,  risk=13500, prod=22500, weather=5000,  epf=2400),
    "EMP-00008": dict(basic=30000, food=8750,  risk=4000,  prod=2000,  weather=4000,  epf=2400),
    "EMP-00010": dict(basic=30000, food=8750,  risk=4000,  prod=2000,  weather=4000,  epf=2400),
    "EMP-00012": dict(basic=30000, food=10000, risk=5000,  prod=5000,  weather=5000,  epf=2400),
    "EMP-00014": dict(basic=30000, food=12500, risk=7500,  prod=5000,  weather=5000,  epf=2400),
    "EMP-00015": dict(basic=30000, food=12500, risk=10000, prod=7500,  weather=5000,  epf=2400),
    "EMP-00016": dict(basic=30000, food=10000, risk=10000, prod=10000, weather=5000,  epf=2400),
    "EMP-00018": dict(basic=30000, food=10000, risk=7000,  prod=8000,  weather=5000,  epf=2400),
    "EMP-00021": dict(basic=30000, food=12500, risk=5000,  prod=5000,  weather=5000,  epf=2400),
    "EMP-00022": dict(basic=30000, food=8750,  risk=3500,  prod=2000,  weather=2000,  epf=2400),
    "EMP-00026": dict(basic=30000, food=10000, risk=7500,  prod=15000, weather=5000,  epf=2400),
    "EMP-00028": dict(basic=30000, food=7500,  risk=20000, prod=7500,  weather=5000,  epf=2400),
    "EMP-00030": dict(basic=30000, food=0,     risk=5000,  prod=0,     weather=0,     epf=0),
    "EMP-00033": dict(basic=30000, food=10000, risk=7500,  prod=10000, weather=5000,  epf=2400),
    "EMP-00046": dict(basic=30000, food=10000, risk=7500,  prod=10000, weather=5000,  epf=2400),
    "EMP-00072": dict(basic=30000, food=7500,  risk=15000, prod=8000,  weather=5000,  epf=2400),
    "EMP-00082": dict(basic=30000, food=10000, risk=7500,  prod=10000, weather=5000,  epf=2400),
    "EMP-00083": dict(basic=30000, food=10000, risk=7500,  prod=10000, weather=5000,  epf=2400),
    "EMP-00085": dict(basic=30000, food=15000, risk=10000, prod=7500,  weather=5000,  epf=2400),
    "EMP-00105": dict(basic=30000, food=10000, risk=7500,  prod=10000, weather=5000,  epf=2400),
    "EMP-00106": dict(basic=30000, food=10500, risk=12500, prod=20000, weather=15000, epf=2400),
    "EMP-00107": dict(basic=30000, food=11250, risk=3000,  prod=1000,  weather=1000,  epf=2400),
    "EMP-00127": dict(basic=30000, food=10000, risk=10000, prod=7500,  weather=5000,  epf=2400),
    "EMP-00131": dict(basic=30000, food=11250, risk=3000,  prod=1000,  weather=1000,  epf=2400),  # sheet "EM NO 47"
    "EMP-00138": dict(basic=30000, food=10500, risk=8000,  prod=8000,  weather=8500,  epf=0),
    "EMP-00141": dict(basic=30000, food=11000, risk=9000,  prod=5000,  weather=5000,  epf=2400),
    "EMP-00143": dict(basic=30000, food=15000, risk=13000, prod=7000,  weather=5000,  epf=2400),
    "EMP-00147": dict(basic=30000, food=10000, risk=10000, prod=7500,  weather=5000,  epf=2400),
    "EMP-00153": dict(basic=30000, food=9500,  risk=3000,  prod=2500,  weather=5000,  epf=2400),
    "EMP-00155": dict(basic=30000, food=12500, risk=0,     prod=0,     weather=0,     epf=2400),
    "EMP-00156": dict(basic=30000, food=11250, risk=11250, prod=5000,  weather=5000,  epf=2400),
    "EMP-00160": dict(basic=30000, food=9000,  risk=4000,  prod=1000,  weather=1000,  epf=2400),
    "EMP-00161": dict(basic=30000, food=11000, risk=2000,  prod=1000,  weather=1000,  epf=2400),
    "EMP-00164": dict(basic=30000, food=11250, risk=11250, prod=5000,  weather=5000,  epf=2400),
    "EMP-00167": dict(basic=30000, food=12500, risk=5000,  prod=5000,  weather=5000,  epf=0),
    "EMP-00172": dict(basic=30000, food=7500,  risk=9500,  prod=8000,  weather=5000,  epf=0),
    "EMP-00176": dict(basic=30000, food=11000, risk=7000,  prod=4500,  weather=5000,  epf=0),
    "EMP-00191": dict(basic=30000, food=10000, risk=4000,  prod=3500,  weather=5000,  epf=0),
    "EMP-00194": dict(basic=30000, food=11250, risk=11250, prod=5000,  weather=5000,  epf=2400),
    "EMP-00198": dict(basic=30000, food=0,     risk=22500, prod=0,     weather=0,     epf=0),
    "EMP-00212": dict(basic=30000, food=0,     risk=25000, prod=0,     weather=0,     epf=0),
    "EMP-00213": dict(basic=30000, food=0,     risk=22500, prod=0,     weather=0,     epf=0),
}

# fingerprint IDs the sheet confirms (these were unset, so punches were dropped)
FINGERPRINTS = {"EMP-00030": 30, "EMP-00072": 72, "EMP-00082": 82}

NEW_EMPLOYEE = dict(
    target_name="EMP-00030",
    first_name="CHANDRASENA",
    gender="Male",
    date_of_birth="1965-12-25",
    date_of_joining="2021-08-20",
    national_id_number="653604939V",
    marital_status="Married",
    cell_number="717638650",
    emergency_phone_number="701116567",
    current_address="NO.122 PASALA ASALA, KOGGALLA, AMBALANTOTA",
)


def _log(m):
    print(m)


# ─────────────────────────────────────────────────────────────
def _create_employee(dry_run):
    target = NEW_EMPLOYEE["target_name"]
    if frappe.db.exists("Employee", target):
        _log(f"  [SKIP] {target} already exists")
        return target
    if dry_run:
        _log(f"  [DRY] would create {target} — {NEW_EMPLOYEE['first_name']}")
        return target

    doc = frappe.new_doc("Employee")
    doc.first_name       = NEW_EMPLOYEE["first_name"]
    doc.company          = COMPANY
    doc.status           = "Active"
    doc.gender           = NEW_EMPLOYEE["gender"]
    doc.date_of_birth    = NEW_EMPLOYEE["date_of_birth"]
    doc.date_of_joining  = NEW_EMPLOYEE["date_of_joining"]
    doc.marital_status   = NEW_EMPLOYEE["marital_status"]
    doc.cell_number      = NEW_EMPLOYEE["cell_number"]
    doc.current_address  = NEW_EMPLOYEE["current_address"]
    for f in ("national_id_number", "emergency_phone_number"):
        if doc.meta.has_field(f):
            doc.set(f, NEW_EMPLOYEE[f])
    doc.insert(ignore_permissions=True)
    frappe.db.commit()

    # Employee uses a naming series, so the new record lands on the next number.
    # Rename to keep the EMP-000NN convention that the fingerprint IDs rely on.
    if doc.name != target:
        frappe.rename_doc("Employee", doc.name, target, force=True)
        frappe.db.commit()
    _log(f"  [OK] created {target}")
    return target


def _set_fingerprints(dry_run):
    for emp, fp in FINGERPRINTS.items():
        if not frappe.db.exists("Employee", emp):
            continue
        cur = frappe.db.get_value("Employee", emp, "custom_fingerprint_id") or 0
        if int(cur) == fp:
            continue
        if dry_run:
            _log(f"  [DRY] fingerprint {emp}: {cur} -> {fp}")
            continue
        vals = {"custom_fingerprint_id": fp}
        if frappe.get_meta("Employee").has_field("attendance_device_id"):
            vals["attendance_device_id"] = str(fp)
        frappe.db.set_value("Employee", emp, vals)
        _log(f"  [OK] fingerprint {emp}: {cur} -> {fp}")
    if not dry_run:
        frappe.db.commit()


def _structure_name(employee):
    nm = frappe.db.get_value("Employee", employee, "employee_name") or employee
    return f"FT-{employee}-{nm}"


def _apply_amounts(employee, want, dry_run):
    """Write sheet amounts onto the employee's existing structure."""
    struct = frappe.db.get_value(
        "Salary Structure Assignment",
        {"employee": employee, "docstatus": 1}, "salary_structure",
    )
    if not struct:
        return None

    changes = []
    for key, comp in COMP.items():
        row = frappe.db.get_value("Salary Detail", {
            "parent": struct, "parenttype": "Salary Structure",
            "parentfield": "earnings", "salary_component": comp,
        }, ["name", "amount"], as_dict=True)
        target = flt(want[key])
        cur = flt(row.amount) if row else 0.0
        if cur == target:
            continue
        changes.append((comp, cur, target, row.name if row else None))

    epf_row = frappe.db.get_value("Salary Detail", {
        "parent": struct, "parenttype": "Salary Structure",
        "parentfield": "deductions", "salary_component": EPF,
    }, ["name", "amount"], as_dict=True)
    if flt(epf_row.amount if epf_row else 0) != flt(want["epf"]):
        changes.append((EPF, flt(epf_row.amount if epf_row else 0),
                        flt(want["epf"]), epf_row.name if epf_row else None))

    if not changes or dry_run:
        return changes

    for comp, _cur, target, row_name in changes:
        if row_name:
            frappe.db.set_value("Salary Detail", row_name, "amount", target,
                                update_modified=False)
        elif target:
            # component missing from the structure — add it
            doc = frappe.get_doc("Salary Structure", struct)
            field = "deductions" if comp == EPF else "earnings"
            doc.append(field, {"salary_component": comp, "amount": target})
            doc.flags.ignore_validate_update_after_submit = True
            doc.flags.ignore_permissions = True
            doc.save(ignore_permissions=True)
    frappe.clear_document_cache("Salary Structure", struct)
    frappe.db.commit()
    return changes


def _create_structure(employee, want, dry_run):
    name = _structure_name(employee)
    if dry_run:
        _log(f"  [DRY] would create structure + assignment for {employee}: {name}")
        return
    if not frappe.db.exists("Salary Structure", name):
        earnings = [{"salary_component": COMP[k], "amount": flt(want[k])}
                    for k in COMP if flt(want[k]) > 0]
        deductions = ([{"salary_component": EPF, "amount": flt(want["epf"])}]
                      if flt(want["epf"]) > 0 else [])
        # the absence deduction every FT- structure carries
        deductions.append({
            "salary_component": "Absent and LWP Deduction",
            "amount_based_on_formula": 1,
            "formula": frappe.db.get_value("Salary Component",
                                           "Absent and LWP Deduction", "formula"),
            "amount": 0,
        })
        doc = frappe.get_doc({
            "doctype": "Salary Structure", "name": name, "company": COMPANY,
            "payroll_frequency": "Monthly", "currency": CURRENCY, "is_active": "Yes",
            "earnings": earnings, "deductions": deductions,
        })
        doc.insert(ignore_permissions=True)
        doc.submit()
        frappe.db.commit()

    if not frappe.db.exists("Salary Structure Assignment",
                            {"employee": employee, "docstatus": 1}):
        a = frappe.get_doc({
            "doctype": "Salary Structure Assignment", "employee": employee,
            "salary_structure": name, "company": COMPANY,
            "from_date": FROM_DATE, "base": flt(want["basic"]), "currency": CURRENCY,
        })
        a.insert(ignore_permissions=True)
        a.submit()
        frappe.db.commit()
    _log(f"  [OK] structure + assignment created for {employee}")


# ─────────────────────────────────────────────────────────────
def apply_sheet(dry_run=True):
    _log("=" * 76)
    _log(f"APPLY SALARY SHEET (FIXED)  effective {FROM_DATE}  dry_run={dry_run}")
    _log("=" * 76)

    _log("\n1. NEW EMPLOYEE")
    _create_employee(dry_run)

    _log("\n2. FINGERPRINT IDs")
    _set_fingerprints(dry_run)

    _log("\n3. AMOUNT CHANGES")
    updated, created, missing = 0, 0, []
    for emp in sorted(SHEET, key=lambda x: int(x.split("-")[1])):
        if not frappe.db.exists("Employee", emp):
            missing.append(emp)
            continue
        has = frappe.db.exists("Salary Structure Assignment",
                               {"employee": emp, "docstatus": 1})
        if has:
            ch = _apply_amounts(emp, SHEET[emp], dry_run) or []
            if ch:
                updated += 1
                nm = frappe.db.get_value("Employee", emp, "employee_name")
                _log(f"  {emp} {nm}")
                for comp, cur, target, _ in ch:
                    _log(f"      {comp:<28} {cur:>9,.0f} -> {target:>9,.0f}")
        else:
            created += 1
            _log(f"  [NEW] {emp} {frappe.db.get_value('Employee', emp, 'employee_name')}")
            _create_structure(emp, SHEET[emp], dry_run)

    _log("=" * 76)
    _log(f"  employees with amount changes : {updated}")
    _log(f"  structures newly created      : {created}")
    if missing:
        _log(f"  employees NOT FOUND           : {missing}")
    if dry_run:
        _log("  (DRY RUN — nothing written.)")
    _log("=" * 76)
    return {"updated": updated, "created": created, "missing": missing}
