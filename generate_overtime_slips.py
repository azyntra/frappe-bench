"""
CHANRICH FRUITS PVT LTD — Generate Overtime Slips for a pay period
=======================================================================
Creates + submits one Overtime Slip per employee who has OT-stamped
Attendance in the period. On submit, each slip posts a submitted
Additional Salary ("Overtime" = hours x 160), which the Salary Slip for
that period then picks up automatically.

Normally you do NOT need this: with Payroll Settings ->
"Create Overtime Slip For Eligible Employee(s)" enabled, the Payroll
Entry itself offers Create/Submit Overtime Slips buttons. This script is
for catching up a period whose payroll is being rebuilt, or for running
the step headlessly.

Dates must match the pay cycle (this client runs 20th -> 19th).

Run in bench console (DRY RUN first!):

    cd /home/frappe/frappe-bench
    bench --site 79.72.76.67 console
    >>> exec(open('/home/frappe/frappe-bench/generate_overtime_slips.py').read(), globals())
    >>> generate_overtime_slips('2026-02-20', '2026-03-19', dry_run=True)
    >>> generate_overtime_slips('2026-02-20', '2026-03-19', dry_run=False)
=======================================================================
"""

import frappe

COMPANY = "CHAN RICH FRUITS (PVT) LTD"


def _log(m):
    print(m)


def generate_overtime_slips(start_date, end_date, dry_run=True):
    """One Overtime Slip per employee with OT-stamped attendance in the period."""

    rows = frappe.db.sql("""
        SELECT   employee,
                 SUM(actual_overtime_duration) AS ot_hours,
                 COUNT(*)                      AS ot_days
        FROM     `tabAttendance`
        WHERE    docstatus = 1
          AND    status = 'Present'
          AND    IFNULL(overtime_type,'') <> ''
          AND    actual_overtime_duration > 0
          AND    attendance_date BETWEEN %(start)s AND %(end)s
        GROUP BY employee
        ORDER BY employee
    """, {"start": start_date, "end": end_date}, as_dict=True)

    _log("=" * 68)
    _log(f"OVERTIME SLIPS  {start_date} .. {end_date}   dry_run={dry_run}")
    _log(f"  employees with OT: {len(rows)}")
    _log("=" * 68)

    created = skipped = errors = 0
    total_hours = 0.0

    for r in rows:
        # don't double-create for a period already covered
        existing = frappe.db.exists("Overtime Slip", {
            "employee":   r.employee,
            "docstatus":  ["!=", 2],
            "start_date": ["<=", end_date],
            "end_date":   [">=", start_date],
        })
        if existing:
            _log(f"  [SKIP] {r.employee}: slip already exists ({existing})")
            skipped += 1
            continue

        total_hours += float(r.ot_hours or 0)

        if dry_run:
            _log(f"  [DRY] {r.employee:<14} {r.ot_days:>3} days  {r.ot_hours:>6.1f} h  "
                 f"-> {float(r.ot_hours)*160:>10,.2f} LKR")
            created += 1
            continue

        try:
            slip = frappe.new_doc("Overtime Slip")
            slip.employee     = r.employee
            slip.company      = COMPANY
            slip.posting_date = end_date
            slip.start_date   = start_date      # set BOTH so the doc does not
            slip.end_date     = end_date        # re-derive a standard month
            slip.get_emp_and_overtime_details()  # pulls attendance rows + saves

            slip.reload()
            if not slip.overtime_details:
                _log(f"  [SKIP] {r.employee}: no overtime detail rows resolved")
                skipped += 1
                continue

            slip.submit()                        # -> creates Additional Salary
            frappe.db.commit()
            _log(f"  [OK] {r.employee:<14} {slip.name}  {slip.total_overtime_duration:>6.1f} h")
            created += 1

        except Exception as e:
            errors += 1
            frappe.db.rollback()
            _log(f"  [ERROR] {r.employee}: {str(e)[:180]}")
            frappe.log_error(frappe.get_traceback(),
                             f"Overtime Slip generation failed — {r.employee}")

    _log("=" * 68)
    _log(f"  created: {created} | skipped: {skipped} | errors: {errors}")
    _log(f"  total OT hours: {total_hours:.1f}  ->  {total_hours*160:,.2f} LKR")
    if dry_run:
        _log("  (DRY RUN — nothing written.)")
    _log("=" * 68)
    return {"created": created, "skipped": skipped, "errors": errors,
            "total_hours": total_hours}
