app_name = "auto_leave_assignment"
app_title = "Auto Leave Assignment"
app_publisher = "Azyntra Technologies"
app_description = "Automatically assigns Casual Leave or LWP when employees are marked Absent"
app_email = "info@azyntra.com"
app_license = "MIT"
app_version = "1.0.0"

# ------------------------------------------------------------------
# DocType Events
# ------------------------------------------------------------------
doc_events = {
    "Attendance": {
        "on_submit": "auto_leave_assignment.events.attendance_events.on_attendance_submit"
    }
}

# ------------------------------------------------------------------
# Scheduled Jobs
# ------------------------------------------------------------------
scheduler_events = {
    "daily_long": [
        # Runs once daily — catches any attendance submitted during the day
        "auto_leave_assignment.scheduled_tasks.auto_leave_task.process_absent_attendance"
    ]
}

# ------------------------------------------------------------------
# Fixtures — export DocType configs with app
# ------------------------------------------------------------------
fixtures = [
    {
        "doctype": "Custom Field",
        "filters": [["module", "=", "Auto Leave Assignment"]]
    }
]

# ------------------------------------------------------------------
# Permissions
# ------------------------------------------------------------------
has_permission = {
    "Auto Leave Log": "auto_leave_assignment.auto_leave_assignment.doctype.auto_leave_log.auto_leave_log.has_permission"
}
