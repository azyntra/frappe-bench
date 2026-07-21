import frappe


def execute():
    """Backfill split-tracking fields on Auto Leave Log rows written before
    split support existed.

    Every pre-existing row represents exactly ONE leave type covering the
    whole absence, so it is chunk 1 of 1 and is_split = 0.

    `original_attendance_status` cannot be recovered from the data — a row
    with half_day set must have come from a Half Day attendance, anything
    else from an Absent one. That inference is recorded in remarks so nobody
    later mistakes it for a captured value.
    """
    if not frappe.db.table_exists("Auto Leave Log"):
        return

    frappe.db.sql("""
        UPDATE `tabAuto Leave Log`
        SET    leave_days  = CASE WHEN IFNULL(half_day, 0) = 1 THEN 0.5 ELSE 1.0 END,
               is_split    = 0,
               chunk_index = 1,
               split_group = CONCAT(employee, '|', attendance_date),
               original_attendance_status =
                   CASE WHEN IFNULL(half_day, 0) = 1 THEN 'Half Day' ELSE 'Absent' END,
               remarks = CONCAT(IFNULL(remarks, ''),
                                ' | [patch] original attendance status inferred, not captured')
        WHERE  IFNULL(split_group, '') = ''
    """)

    frappe.db.commit()
