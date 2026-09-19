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
        "on_submit": "auto_leave_assignment.events.attendance_events.on_attendance_submit",
        "on_cancel": "auto_leave_assignment.events.attendance_events.on_attendance_cancel",
    },
    "Salary Slip": {
        # Reports gross BEFORE overtime: it lowers gross_pay by the overtime and
        # deliberately leaves net_pay alone, so the overtime is still paid in
        # full, just shown after gross rather than inside it.
        "validate": "auto_leave_assignment.events.salary_slip_events.set_gross_before_ot",
    },
    # The month picker on Payroll Entry defaults to the 1st-30th. Running a
    # payroll that way pays everyone for the wrong days and looks entirely
    # normal — there is nothing in ERPNext that would notice.
    "Payroll Entry": {
        "validate": "auto_leave_assignment.events.payroll_entry_events.validate_pay_period",
    },
}

# ------------------------------------------------------------------
# Scheduled Jobs
# ------------------------------------------------------------------
scheduler_events = {
    "daily_long": [
        # Runs once daily — catches any attendance submitted during the day
        "auto_leave_assignment.scheduled_tasks.auto_leave_task.process_absent_attendance",
        # Creates next year's holiday list and leave entitlement before they are
        # needed, and warns HR about anything that would quietly break payroll.
        # Without this the system stops calculating salaries correctly on 1 Jan.
        "auto_leave_assignment.scheduled_tasks.yearly_rollover.run_yearly_rollover",
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
# Jinja — exposes get_slip_breakdown() to the Salary Slip print format
# ------------------------------------------------------------------
jinja = {
    "methods": [
        "auto_leave_assignment.api.print_helpers.get_slip_breakdown",
    ],
}

# ------------------------------------------------------------------
# Permissions
# ------------------------------------------------------------------
has_permission = {
    "Auto Leave Log": "auto_leave_assignment.auto_leave_assignment.doctype.auto_leave_log.auto_leave_log.has_permission"
}
