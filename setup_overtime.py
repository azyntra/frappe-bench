"""
CHANRICH FRUITS PVT LTD — Overtime Setup (fixed "FT-" staff, 160 LKR/hr)
=======================================================================
Creates the masters the native HRMS Overtime engine needs, idempotently:

  1. Salary Component  "Overtime"   (Earning)
  2. Overtime Type     "Staff OT"   (Fixed Hourly Rate = 160, multiplier 1)
  3. Enables Payroll Settings → "Create Overtime Slip For Eligible Employee(s)"

Run once (safe to re-run) in bench console:

    cd /home/frappe/frappe-bench
    bench --site 79.72.76.67 console
    >>> exec(open('/home/frappe/frappe-bench/setup_overtime.py').read(), globals())
    >>> setup_overtime()

How it pays out:
  Attendance (Present, FT- staff) gets overtime_type="Staff OT" +
  actual_overtime_duration set by the Import Attendance page. At payroll,
  Payroll Entry → Create/Submit Overtime Slips → an Additional Salary
  "Overtime" = hours × 160 is added to each Salary Slip automatically.
=======================================================================
"""

import frappe

OT_COMPONENT = "Overtime"
OT_TYPE      = "Staff OT"
OT_RATE      = 160.0


def _log(msg):
    print(msg)


def create_overtime_component():
    if frappe.db.exists("Salary Component", OT_COMPONENT):
        _log(f"  [SKIP] Salary Component already exists: {OT_COMPONENT}")
        return
    try:
        doc = frappe.get_doc({
            "doctype":                 "Salary Component",
            "salary_component":        OT_COMPONENT,
            "salary_component_abbr":   "OT",
            "type":                    "Earning",
            # OT amount comes from the Overtime Slip (Additional Salary),
            # so it must NOT be prorated by payment days or formula-based.
            "depends_on_payment_days": 0,
            "amount_based_on_formula": 0,
            "statistical_component":   0,
            "do_not_include_in_total": 0,
            "is_tax_applicable":       0,
            "remove_if_zero_valued":   1,
        })
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        _log(f"  [OK] Salary Component created: {OT_COMPONENT} (Earning)")
    except Exception as e:
        frappe.db.rollback()
        _log(f"  [ERROR] Salary Component failed: {e}")


def create_overtime_type():
    if frappe.db.exists("Overtime Type", OT_TYPE):
        # Keep the rate authoritative even on re-run
        frappe.db.set_value("Overtime Type", OT_TYPE, {
            "overtime_calculation_method": "Fixed Hourly Rate",
            "hourly_rate": OT_RATE,
            "overtime_salary_component": OT_COMPONENT,
        })
        frappe.db.commit()
        _log(f"  [SKIP] Overtime Type already exists: {OT_TYPE} (rate re-synced to {OT_RATE})")
        return
    try:
        doc = frappe.get_doc({
            "doctype":                       "Overtime Type",
            "name":                          OT_TYPE,          # autoname = Prompt
            "overtime_calculation_method":   "Fixed Hourly Rate",
            "hourly_rate":                   OT_RATE,
            "standard_multiplier":           1.0,
            "applicable_for_weekend":        0,
            "applicable_for_public_holiday": 0,
            "maximum_overtime_hours_allowed": 0,               # 0 = no daily cap
            "overtime_salary_component":     OT_COMPONENT,
        })
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        _log(f"  [OK] Overtime Type created: {OT_TYPE} @ {OT_RATE} LKR/hr (Fixed Hourly Rate)")
    except Exception as e:
        frappe.db.rollback()
        _log(f"  [ERROR] Overtime Type failed: {e}")


def enable_payroll_overtime():
    try:
        frappe.db.set_single_value("Payroll Settings", "create_overtime_slip", 1)
        frappe.db.commit()
        _log("  [OK] Payroll Settings → 'Create Overtime Slip For Eligible Employee(s)' = ON")
    except Exception as e:
        frappe.db.rollback()
        _log(f"  [ERROR] Could not enable payroll overtime setting: {e}")


def setup_overtime():
    _log("=" * 65)
    _log("CHANRICH FRUITS — Overtime Setup")
    _log("=" * 65)
    create_overtime_component()
    create_overtime_type()
    enable_payroll_overtime()
    _log("\nDone. Next: import attendance (OT is stamped automatically),")
    _log("then Payroll Entry → Create + Submit Overtime Slips → Salary Slips.")
    _log("=" * 65)
