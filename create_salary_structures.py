"""
CHANRICH FRUITS PVT LTD — Complete Salary Structure & Assignment Script
=======================================================================
Naming format: FT-EMP-XXXXX-EMPLOYEE NAME

Run in bench console:
    cd /home/frappe/frappe-bench
    bench --site 79.72.76.67 console

    exec(open('/home/frappe/frappe-bench/create_all_salary.py').read(), globals())
    create_all()
=======================================================================
"""

import frappe

COMPANY   = "CHAN RICH FRUITS (PVT) LTD"
CURRENCY  = "LKR"
FREQUENCY = "Monthly"

COMP_BASIC   = "Basic Salary"
COMP_FOOD    = "Food Allowance"
COMP_RISK    = "Risk Hazard Allowance"
COMP_PROD    = "Production Allowance"
COMP_WEATHER = "Weather Hardship Allowance"
COMP_EPF     = "EPF Employee"

# ── COMPLETE EMPLOYEE LIST ────────────────────────────────────────────────────
# Format:
# (ERPNext Employee Name, EMP-ID, From Date, Basic, Food, Risk, Prod, Weather, EPF)
#
# From Date = employee joining date (to avoid "before joining date" error)
# ─────────────────────────────────────────────────────────────────────────────
EMPLOYEES = [
    # ERPNext Name               EMP-ID        FROM_DATE     Basic   Food   Risk   Prod    Weather  EPF
    ("JAYATHUNGA JAYATHUNGA",   "EMP-00015",  "2025-01-01", 30000,  7500,  10000, 7500,   5000,   2400),
    ("CHAMINDA HERATH",         "EMP-00005",  "2025-01-01", 30000,  7500,  13500, 22500,  5000,   2400),
    ("SUGATH NIMALWEERA",       "EMP-00016",  "2025-01-01", 30000,  7500,  10000, 10000,  5000,   2400),
    ("NIHAL",                   "EMP-00018",  "2025-01-01", 30000,  7500,  7000,  8000,   5000,   2400),
    ("ASANKA",                  "EMP-00004",  "2025-01-01", 30000,  7500,  17500, 40000,  5000,   2400),
    ("MALINDA SAYURANGA",       "EMP-00033",  "2025-01-01", 30000,  7500,  7500,  10000,  5000,   2400),
    ("ANISHKA DILSHAN",         "EMP-00027",  "2025-01-01", 30000,  7500,  7500,  10000,  5000,   2400),
    ("MALSHA HIRUSHAN",         "EMP-00026",  "2025-01-01", 30000,  7500,  7500,  15000,  5000,   2400),
    ("NAVINDA PRIYADARSHANA",   "EMP-00046",  "2025-01-01", 30000,  7500,  7500,  10000,  5000,   2400),
    ("DINUSHA",                 "EMP-00083",  "2025-01-01", 30000,  7500,  7500,  10000,  5000,   2400),
    ("EDIRISINGHE EDIRISINGHE", "EMP-00085",  "2025-01-01", 30000,  15000, 10000, 7500,   5000,   2400),
    ("VIJITHA KUMARA",          "EMP-00105",  "2025-01-01", 30000,  7500,  7500,  10000,  5000,   2400),
    ("ANURA ANURA",             "EMP-00012",  "2025-01-01", 30000,  7500,  5000,  5000,   5000,   2400),
    ("SUNIL",                   "EMP-00153",  "2025-01-01", 30000,  7500,  3000,  2500,   5000,   2400),
    ("RUWAN KUMARA",            "EMP-00147",  "2025-01-01", 30000,  7500,  10000, 7500,   5000,   2400),
    ("CHANAKA DILSHAN",         "EMP-00141",  "2025-01-01", 30000,  7500,  9000,  5000,   5000,   2400),
    ("DISANAYAKA",              "EMP-00127",  "2025-01-01", 30000,  7500,  10000, 7500,   5000,   2400),
    ("SUJITH SUJITH",           "EMP-00156",  "2025-01-01", 30000,  7500,  7500,  5000,   5000,   2400),
    ("LASANTHI JAYAMINI",       "EMP-00003",  "2025-01-01", 30000,  7500,  5000,  7500,   5000,   2400),
    ("RUPIKA DAMAYANTHI",       "EMP-00008",  "2025-01-01", 30000,  7500,  4000,  2000,   4000,   2400),
    ("PATHMINI PATHMINI",       "EMP-00010",  "2025-01-01", 30000,  7500,  4000,  2000,   4000,   2400),
    ("THIWANKA SANDAMALI",      "EMP-00131",  "2025-01-01", 30000,  7500,  3000,  1000,   1000,   2400),
    ("JAYANI VINDYA",           "EMP-00106",  "2025-01-01", 30000,  7500,  12500, 20000,  15000,  2400),
    ("RASHMI DIWYANJALI",       "EMP-00107",  "2025-01-01", 30000,  7500,  3000,  1000,   1000,   2400),
    ("JAYANTHI JAYANTHI",       "EMP-00022",  "2025-01-01", 30000,  7500,  3500,  2000,   2000,   2400),
    ("HASHINI KAUSHALYA",       "EMP-00155",  "2025-01-01", 30000,  7500,  0,     0,      0,      2400),
    ("SANDALI PRABODANII",      "EMP-00138",  "2025-01-01", 30000,  7500,  6000,  8000,   8500,   0),
    ("MANEESHA SANKALPA",       "EMP-00167",  "2025-01-20", 30000,  7500,  5000,  5000,   5000,   0),
    ("RAVEEN KAVISHWARA",       "EMP-00165",  "2025-03-05", 30000,  7500,  5000,  5000,   5000,   0),
    ("HELIKA HELIKA",           "EMP-00191",  "2025-11-03", 30000,  7500,  4000,  3500,   5000,   0),
    ("KELUM DILHAN",            "EMP-00172",  "2025-09-12", 30000,  7500,  9500,  8000,   5000,   0),
    ("JAGATH KIMARA",           "EMP-00194",  "2025-05-12", 30000,  7500,  5000,  5000,   5000,   2400),
    ("SHAMIKA MADUSHAN",        "EMP-00164",  "2025-01-10", 30000,  7500,  5000,  5000,   5000,   2400),
    ("DEESHAN LAKMAL",          "EMP-00176",  "2025-05-22", 30000,  7500,  5000,  4500,   5000,   0),
    ("THEJA SHAYAMALI",         "EMP-00161",  "2025-02-16", 30000,  7500,  2000,  1000,   1000,   2400),
    ("DARSHIKA",                "EMP-00160",  "2025-02-02", 30000,  7500,  2000,  1000,   1000,   2400),

    # ── Add these manually after verifying their names in ERPNext ─────────────
    # R. MANI        → find EMP ID and add here
    # GAYAN DULHARA  → find EMP ID and add here
    # CHANDRASENA    → find EMP ID and add here
    # Nuwan          → find EMP ID and add here
    # CHATHURA       → find EMP ID and add here
    # RANJITH        → find EMP ID and add here (Basic=50000)
    # EG KUMARA      → find EMP ID and add here
    # HM SAMANTHA KU → find EMP ID and add here
    # MA SAMANTHA    → find EMP ID and add here
]

# ── HELPERS ───────────────────────────────────────────────────────────────────

def log(msg):
    print(msg)

def structure_exists(name):
    return frappe.db.exists("Salary Structure", name)

def assignment_exists(emp_id, structure_name):
    return frappe.db.exists("Salary Structure Assignment", {
        "employee": emp_id,
        "salary_structure": structure_name,
        "docstatus": ["!=", 2]
    })

def create_structure(structure_name, basic, food, risk, prod, weather, epf):
    """Create and submit one salary structure."""
    if structure_exists(structure_name):
        log(f"  [SKIP] Structure already exists: {structure_name}")
        return True

    earnings = []
    for comp, amt in [
        (COMP_BASIC,   basic),
        (COMP_FOOD,    food),
        (COMP_RISK,    risk),
        (COMP_PROD,    prod),
        (COMP_WEATHER, weather),
    ]:
        if amt > 0:
            earnings.append({
                "doctype": "Salary Detail",
                "salary_component": comp,
                "amount": amt,
                "parentfield": "earnings",
            })

    deductions = []
    if epf > 0:
        deductions.append({
            "doctype": "Salary Detail",
            "salary_component": COMP_EPF,
            "amount": epf,
            "parentfield": "deductions",
        })

    try:
        doc = frappe.get_doc({
            "doctype": "Salary Structure",
            "name": structure_name,
            "company": COMPANY,
            "payroll_frequency": FREQUENCY,
            "currency": CURRENCY,
            "is_active": "Yes",
            "earnings": earnings,
            "deductions": deductions,
        })
        doc.insert(ignore_permissions=True)
        doc.submit()
        frappe.db.commit()
        gross = basic + food + risk + prod + weather
        net   = gross - epf
        log(f"  [OK] Structure created | Gross={gross:,} | Net={net:,}")
        return True
    except Exception as e:
        log(f"  [ERROR] Structure failed: {e}")
        frappe.db.rollback()
        return False

def create_assignment(emp_name, emp_id, structure_name, from_date, basic):
    """Create and submit one salary structure assignment."""
    if assignment_exists(emp_id, structure_name):
        log(f"  [SKIP] Assignment already exists")
        return

    try:
        doc = frappe.get_doc({
            "doctype": "Salary Structure Assignment",
            "employee": emp_id,
            "salary_structure": structure_name,
            "company": COMPANY,
            "from_date": from_date,
            "base": basic,
            "currency": CURRENCY,
        })
        doc.insert(ignore_permissions=True)
        doc.submit()
        frappe.db.commit()
        log(f"  [OK] Assignment submitted | From: {from_date}")
    except Exception as e:
        log(f"  [ERROR] Assignment failed: {e}")
        frappe.db.rollback()

# ── MAIN ──────────────────────────────────────────────────────────────────────

def create_all():
    log("=" * 65)
    log("CHANRICH FRUITS — Salary Structure Setup")
    log(f"Company   : {COMPANY}")
    log(f"Total     : {len(EMPLOYEES)} employees")
    log(f"Format    : FT-EMP-XXXXX-NAME")
    log("=" * 65)

    success = []
    errors  = []

    for row in EMPLOYEES:
        emp_name, emp_id, from_date, basic, food, risk, prod, weather, epf = row

        # Build structure name in new format: FT-EMP-00015-JAYATHUNGA JAYATHUNGA
        structure_name = f"FT-{emp_id}-{emp_name}"

        log(f"\n[{emp_id}] {emp_name}")
        log(f"  Structure : {structure_name}")
        log(f"  From Date : {from_date}")

        # Step 1 — create salary structure
        ok = create_structure(structure_name, basic, food, risk, prod, weather, epf)
        if not ok:
            errors.append(emp_name)
            continue

        # Step 2 — create assignment
        create_assignment(emp_name, emp_id, structure_name, from_date, basic)
        success.append(emp_name)

    # Summary
    log("\n" + "=" * 65)
    log("SUMMARY")
    log("=" * 65)
    log(f"  Completed : {len(success)}")
    log(f"  Errors    : {len(errors)}")
    if errors:
        log("\n  Failed employees:")
        for n in errors:
            log(f"    - {n}")
    log("\nDone!")
    log("=" * 65)
