"""
CHANRICH FRUITS PVT LTD — Day-team roster automation setup
=======================================================================
Companion to the punch-pattern auto-classification in import_attendance.py
and the Day Team Attendance page.

Creates `Shift Assignment.custom_auto_assigned` (Check). Assignments the
importer infers from punches carry 1; anything HR rosters by hand stays 0.
The distinction matters twice:
  * the Day Team Attendance page badges auto vs manual days
  * reprocess_range may REPLACE auto rows when punches change, but must
    never touch a manual roster decision

Run in bench console (DRY RUN first):

    >>> exec(open('/home/frappe/frappe-bench/setup_day_team_automation.py').read(), globals())
    >>> day_team_automation_setup(dry_run=True)
    >>> day_team_automation_setup(dry_run=False)
=======================================================================
"""

import frappe


def _log(m):
    print(m)


def day_team_automation_setup(dry_run=True):
    _log("=" * 76)
    _log(f"DAY TEAM AUTOMATION SETUP   dry_run={dry_run}")
    _log("=" * 76)

    _log("\n1. CUSTOM FIELD Shift Assignment.custom_auto_assigned")
    if frappe.db.exists("Custom Field", {"dt": "Shift Assignment", "fieldname": "custom_auto_assigned"}):
        _log("  [SKIP] field exists")
    elif dry_run:
        _log("  [DRY] would create Check field 'Auto Assigned (from punches)'")
    else:
        from frappe.custom.doctype.custom_field.custom_field import create_custom_field
        create_custom_field("Shift Assignment", {
            "fieldname": "custom_auto_assigned",
            "label": "Auto Assigned (from punches)",
            "fieldtype": "Check",
            "insert_after": "status",
            "default": "0",
            "read_only": 1,
            "in_list_view": 1,
        })
        _log("  [OK] created custom_auto_assigned")

    if not dry_run:
        frappe.db.commit()
        frappe.clear_cache()
    _log("=" * 76)
    _log("  (DRY RUN — nothing written.)" if dry_run else "  Done.")
    _log("=" * 76)
