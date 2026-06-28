"""
ERPNext Salary Structure Setup — Chan Rich Fruits (PVT) Ltd — DAY TEAM
=======================================================================
Run this script using bench execute:

    cd /home/frappe/frappe-bench
    bench --site <your-site-name> execute create_day_team_salary_structures.create_all

What this script does:
  1. Creates Salary Components: Day Salary, OT Allowance (if not existing)
  2. Creates a single Salary Structure "Day Team - Daily Rate" (applicable to all day workers)
  3. Creates Salary Structure Assignments for each employee using their individual day rate

ASSUMPTIONS:
  - Employees are already created in ERPNext with names matching those listed below.
    If the full name doesn't match exactly, update the EMPLOYEE_MAP to use Employee IDs.
  - OT rate is 160/- per hour for all day team employees (as per the pay sheet).
  - Day salary is paid based on number of days worked — this is handled via
    "Payment Days" in the payroll entry, with the component formula: day_rate * payment_days
  - Company name must match what's configured in your ERPNext instance.
  - Currency is LKR.

HOW DAY RATE WORKS IN ERPNext:
  - The "Day Salary" component uses formula: day_rate (a custom salary attribute field)
    multiplied by payment_days (built-in ERPNext variable for actual working days).
  - Each employee's Salary Structure Assignment stores their specific `day_rate`.
  - OT is entered manually as an additional component during payroll processing,
    or you can create a separate OT entry each month.
"""

import frappe
from frappe.utils import today

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION — Update these values to match your ERPNext setup
# ─────────────────────────────────────────────────────────────────────────────

COMPANY = "Chan Rich Fruits PVT Ltd"   # Must match exactly in ERPNext
CURRENCY = "LKR"
PAYROLL_FREQUENCY = "Monthly"
FROM_DATE = "2025-01-01"               # Effective from date for salary assignments

# OT rate per hour (same for all day team employees per the pay sheet)
OT_RATE_PER_HOUR = 160

# ─────────────────────────────────────────────────────────────────────────────
# DAY TEAM EMPLOYEES
# Format: { "Employee Name in ERPNext": day_rate_per_day }
# Girls and Boys are separated for clarity but treated the same structurally.
# ─────────────────────────────────────────────────────────────────────────────

DAY_TEAM_EMPLOYEES = {
    # --- GIRLS ---
    "A SHASHIKA":       1750,
    "KAVISHANI":        1700,
    "RUKSHIKA":         1700,
    "E.M.THARUSHI":     1700,
    "E.M. NIMESHA":     1700,
    "D.T. DILRUKSHI":   1700,
    "MAHESHIKA":        1700,
    "DANANJANA":        1550,   # Girls group (there is also a DANANJANA in Boys — see below)
    "THEJANI":          1650,
    "KANCHANA":         1700,
    "SANDUNI":          1700,
    "AA ARIYAWATHI":    1550,
    "WASANTHI":         1700,
    "IRESHA":           1700,
    "INDRA MALANI":     1650,
    # --- BOYS ---
    "NAVOTH":           2000,
    "KAVINDA":          2000,
    "DILAN":            2000,
    "DANANJANA (BOYS)": 2000,   # Renamed to avoid conflict — update to actual ERPNext name
    "MC SANDUN":        2000,
    "PRASANGA":         2000,
    "LASINDU":          2000,
    "WA HASHAN MADU":   2000,
}


# ─────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

def log(msg):
    print(f"  → {msg}")


def create_salary_component(component_name, component_type, description, is_formula=False, formula="", amount=0):
    """Create a salary component if it does not already exist."""
    if frappe.db.exists("Salary Component", component_name):
        log(f"Salary Component already exists: '{component_name}' — skipping.")
        return

    doc = frappe.new_doc("Salary Component")
    doc.salary_component = component_name
    doc.salary_component_abbr = component_name[:4].upper().replace(" ", "")
    doc.type = component_type          # "Earning" or "Deduction"
    doc.description = description
    doc.depends_on_payment_days = 1    # Pro-rate based on working days

    if is_formula:
        doc.amount_based_on_formula = 1
        doc.formula = formula
    else:
        doc.amount_based_on_formula = 0
        doc.amount = amount

    # Append the company-specific account mapping
    doc.append("accounts", {
        "company": COMPANY,
    })

    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    log(f"Created Salary Component: '{component_name}'")


def create_salary_structure():
    """Create the Day Team salary structure if it does not exist."""
    structure_name = "Day Team - Daily Rate"

    if frappe.db.exists("Salary Structure", structure_name):
        log(f"Salary Structure already exists: '{structure_name}' — skipping.")
        return structure_name

    doc = frappe.new_doc("Salary Structure")
    doc.name = structure_name
    doc.company = COMPANY
    doc.currency = CURRENCY
    doc.payroll_frequency = PAYROLL_FREQUENCY
    doc.is_active = "Yes"
    doc.salary_slip_based_on_timesheet = 0

    # ── Earnings ──────────────────────────────────────────────────────────────
    # Day Salary: day_rate is a custom field on Salary Structure Assignment.
    # ERPNext exposes `base` (which maps to the assignment's base pay) and
    # `payment_days` (actual days worked in the payroll period).
    # We store day_rate as the "base" in the assignment and compute:
    #   Day Salary = base * (payment_days / total_working_days) * total_working_days
    # Simplest approach: use formula  =  base  (ERPNext multiplies by payment_days
    # automatically when depends_on_payment_days = 1 on the component).
    doc.append("earnings", {
        "salary_component": "Day Salary",
        "abbr": "DAYS",
        "formula": "base",                  # base = daily rate stored in assignment
        "amount_based_on_formula": 1,
        "depends_on_payment_days": 1,       # Auto pro-rate by actual working days
    })

    # OT Allowance: entered as actual hours each month; rate is fixed at 160/hr.
    # Since OT hours vary monthly, this component uses a fixed hourly rate.
    # The actual hours are entered per-employee in the Salary Slip.
    doc.append("earnings", {
        "salary_component": "OT Allowance",
        "abbr": "OTA",
        "formula": f"ot_hours * {OT_RATE_PER_HOUR}",   # ot_hours = additional salary slip field
        "amount_based_on_formula": 1,
        "depends_on_payment_days": 0,       # OT is not pro-rated, it's actual hours worked
    })

    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    log(f"Created Salary Structure: '{structure_name}'")
    return structure_name


def assign_salary_structure(employee_name, day_rate, structure_name):
    """
    Create a Salary Structure Assignment for the employee.
    `base` is used as the daily rate; ERPNext will multiply by payment_days
    via the Day Salary component formula.
    """

    # Resolve employee name to employee ID
    employee_id = frappe.db.get_value("Employee", {"employee_name": employee_name}, "name")
    if not employee_id:
        print(f"  ⚠  WARNING: Employee not found — '{employee_name}'. Skipping assignment.")
        print(f"     → Check the exact name in ERPNext HR > Employee list and update DAY_TEAM_EMPLOYEES dict.")
        return False

    # Check if an active assignment already exists
    existing = frappe.db.exists("Salary Structure Assignment", {
        "employee": employee_id,
        "salary_structure": structure_name,
        "docstatus": 1,
    })
    if existing:
        log(f"Assignment already exists for '{employee_name}' ({employee_id}) — skipping.")
        return True

    doc = frappe.new_doc("Salary Structure Assignment")
    doc.employee = employee_id
    doc.salary_structure = structure_name
    doc.from_date = FROM_DATE
    doc.base = day_rate           # Stores the daily rate; used as `base` in the formula
    doc.variable = 0
    doc.company = COMPANY
    doc.currency = CURRENCY

    doc.insert(ignore_permissions=True)
    doc.submit()
    frappe.db.commit()
    log(f"Assigned '{structure_name}' to '{employee_name}' ({employee_id}) @ LKR {day_rate}/day")
    return True


# ─────────────────────────────────────────────────────────────────────────────
# MAIN ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

def create_all():
    """
    Main function — run via:
        bench --site <site> execute create_day_team_salary_structures.create_all
    """
    print("\n" + "="*65)
    print("  Chan Rich Fruits — Day Team Salary Structure Setup")
    print("="*65)

    # ── Step 1: Create Salary Components ──────────────────────────────────────
    print("\n[1/3] Creating Salary Components...")

    create_salary_component(
        component_name="Day Salary",
        component_type="Earning",
        description="Daily wage — calculated as daily rate × actual working days",
        is_formula=True,
        formula="base",
    )

    create_salary_component(
        component_name="OT Allowance",
        component_type="Earning",
        description=f"Overtime allowance at LKR {OT_RATE_PER_HOUR}/hour. Enter OT hours manually in salary slip.",
        is_formula=True,
        formula=f"ot_hours * {OT_RATE_PER_HOUR}",
    )

    # ── Step 2: Create Salary Structure ───────────────────────────────────────
    print("\n[2/3] Creating Salary Structure...")
    structure_name = create_salary_structure()

    # ── Step 3: Assign to Employees ───────────────────────────────────────────
    print(f"\n[3/3] Assigning Salary Structure to {len(DAY_TEAM_EMPLOYEES)} employees...")

    success_count = 0
    fail_count = 0
    for emp_name, day_rate in DAY_TEAM_EMPLOYEES.items():
        result = assign_salary_structure(emp_name, day_rate, structure_name)
        if result:
            success_count += 1
        else:
            fail_count += 1

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n" + "="*65)
    print(f"  ✅ Completed: {success_count} assigned, {fail_count} skipped/failed")
    if fail_count > 0:
        print(f"  ⚠  {fail_count} employees were not found in ERPNext.")
        print("     Update the DAY_TEAM_EMPLOYEES names to match ERPNext exactly,")
        print("     or use Employee ID keys instead of names.")
    print("="*65 + "\n")


# ─────────────────────────────────────────────────────────────────────────────
# OT HOURS NOTE
# ─────────────────────────────────────────────────────────────────────────────
# The OT Allowance formula uses `ot_hours`. ERPNext does not have a built-in
# `ot_hours` variable. You have two options:
#
# OPTION A (Recommended) — Use "Additional Salary" for OT each month:
#   Go to Payroll > Additional Salary > New
#   Component: OT Allowance
#   Amount: (OT hours × 160)
#   This keeps the main salary structure clean.
#
# OPTION B — Add a custom field `ot_hours` to the Salary Slip DocType via
#   Customize Form, then use it in the formula. This requires customization
#   but allows OT to be entered directly on the salary slip.
#
# Whichever option you choose, update the OT Allowance component formula
# accordingly before running payroll.
# ─────────────────────────────────────────────────────────────────────────────
