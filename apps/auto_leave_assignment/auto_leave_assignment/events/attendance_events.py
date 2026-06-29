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
    Cleans up linked Auto Leave Logs and cancels the auto-created
    Leave Application (if any) to prevent the
    'Cannot delete or cancel because linked' error.
    """
    try:
        # Find all Auto Leave Logs linked to this Attendance
        logs = frappe.get_all(
            "Auto Leave Log",
            filters={"source_attendance": doc.name},
            fields=["name", "leave_application", "status"],
        )

        for log in logs:
            # If a Leave Application was auto-created, cancel it
            if log.leave_application and log.status == "Assigned":
                try:
                    la = frappe.get_doc("Leave Application", log.leave_application)
                    if la.docstatus == 1:
                        la.flags.ignore_permissions = True
                        la.cancel()
                except Exception:
                    frappe.log_error(
                        message=frappe.get_traceback(),
                        title=f"Auto Leave Cancel — failed to cancel Leave Application {log.leave_application}",
                    )

            # Clear the link to the attendance so it can be cancelled/deleted
            frappe.db.set_value(
                "Auto Leave Log", log.name, {
                    "source_attendance": "",
                    "status": "Cancelled",
                    "remarks": (
                        frappe.db.get_value("Auto Leave Log", log.name, "remarks") or ""
                    ) + " | Attendance cancelled.",
                },
                update_modified=False,
            )

    except Exception:
        frappe.log_error(
            message=frappe.get_traceback(),
            title=f"Auto Leave Cancel cleanup failed for {doc.name}",
        )

