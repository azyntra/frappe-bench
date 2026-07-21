"""
events/attendance_events.py
----------------------------
DocType event hooks for Attendance.
Handles both submit (auto leave assignment) and cancel (cleanup) events.
"""

import frappe

from auto_leave_assignment.core import assign_leave_for_attendance


def on_attendance_submit(doc, method=None):
    """
    Called automatically on Attendance submit (docstatus → 1).
    Delegates all logic to the core engine.
    called_from_scheduler=False so that Frappe manages the transaction.

    The skip_auto_leave flag is set by the bulk attendance import process
    to prevent the hook from firing during batch processing. The auto leave
    assignment is run explicitly after the full batch completes instead.
    """
    if getattr(doc.flags, "skip_auto_leave", False):
        return

    assign_leave_for_attendance(doc, called_from_scheduler=False)


def on_attendance_cancel(doc, method=None):
    """
    Called when an Attendance record is cancelled.

    A day may now be covered by MORE than one Leave Application (a 0.5/0.5
    split), so every application for the day has to be cancelled — and in
    reverse creation order, so the unpaid chunk (created last) goes first.

    Note we do NOT need to restore the Attendance row here: it is the record
    being cancelled. LeaveApplication.cancel_attendance() filters on
    `docstatus < 2` and Frappe persists docstatus=2 before running on_cancel,
    so it will not touch this row.
    """
    try:
        applications = _applications_for_attendance(doc)
        failures = []

        for idx, la_name in enumerate(applications):
            sp = f"ala_cx_{idx}"
            frappe.db.savepoint(sp)
            try:
                la = frappe.get_doc("Leave Application", la_name)
                if la.docstatus != 1:
                    continue
                la.flags.ignore_permissions = True
                la.cancel()
            except Exception:
                # isolate: one bad application must not poison the rest
                frappe.db.rollback(save_point=sp)
                failures.append(la_name)
                frappe.log_error(
                    message=frappe.get_traceback(),
                    title=f"Auto Leave Cancel — failed to cancel {la_name}",
                )

        _mark_logs_cancelled(doc, failures)

    except Exception:
        frappe.log_error(
            message=frappe.get_traceback(),
            title=f"Auto Leave Cancel cleanup failed for {doc.name}",
        )


def _applications_for_attendance(doc):
    """Leave Applications this app created for the attendance, newest chunk first.

    Two sources are unioned:
      1. Auto Leave Log rows (the normal path), ordered so the LAST chunk
         created — the unpaid one — is cancelled first.
      2. An orphan sweep by description marker, in case a log row was never
         written or was lost. Only applications carrying this app's marker are
         ever touched; manually created leave is left alone.
    """
    names = []

    for log in frappe.get_all(
        "Auto Leave Log",
        filters={"source_attendance": doc.name, "status": "Assigned"},
        fields=["leave_application", "chunk_index"],
        order_by="chunk_index desc, creation desc",
    ):
        if log.leave_application:
            names.append(log.leave_application)

    for name in frappe.get_all(
        "Leave Application",
        filters={
            "employee":    doc.employee,
            "docstatus":   1,
            "from_date":   ["<=", doc.attendance_date],
            "to_date":     [">=", doc.attendance_date],
            "description": ["like", f"%Source Attendance: {doc.name}%"],
        },
        pluck="name",
    ):
        names.append(name)

    # de-duplicate, preserving order
    return list(dict.fromkeys(names))


def _mark_logs_cancelled(doc, failures):
    """Clear the attendance link so the record can be cancelled/deleted, and
    record the outcome. `leave_application` is deliberately preserved for audit."""
    for log in frappe.get_all(
        "Auto Leave Log",
        filters={"source_attendance": doc.name},
        fields=["name", "leave_application", "remarks"],
    ):
        note = " | Attendance cancelled."
        if log.leave_application in failures:
            note = " | Attendance cancelled, but its Leave Application could NOT be cancelled — check Error Log."

        frappe.db.set_value(
            "Auto Leave Log", log.name,
            {
                "source_attendance": "",
                "status": "Cancelled",
                "remarks": (log.remarks or "") + note,
            },
            update_modified=False,
        )
