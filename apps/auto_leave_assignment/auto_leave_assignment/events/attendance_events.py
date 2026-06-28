"""
events/attendance_events.py
----------------------------
DocType event hook for Attendance.
Fires immediately when an Attendance record is submitted.
"""

import frappe
from auto_leave_assignment.core import assign_leave_for_attendance


def on_attendance_submit(doc, method=None):
    """
    Called automatically on Attendance submit (docstatus → 1).
    Delegates all logic to the core engine.
    called_from_scheduler=False so that Frappe manages the transaction.
    """
    assign_leave_for_attendance(doc, called_from_scheduler=False)
