"""
payroll_entry_events.py
-----------------------
Stops a payroll being run for the wrong period.

This company pays on a 21st -> 20th cycle, but the Payroll Entry screen offers a
month picker that fills in the 1st to the 30th. A payroll run that way looks
completely normal — it produces slips, totals and a register — while paying
everybody for the wrong days. There is nothing in ERPNext that would notice.

A draft covering 1-30 September was already sitting in this system waiting to be
submitted, which is what prompted this guard.
"""

import frappe
from frappe import _
from frappe.utils import getdate

CYCLE_START_DAY = 21
CYCLE_END_DAY = 20


def validate_pay_period(doc, method=None):
    if not doc.start_date or not doc.end_date:
        return

    start, end = getdate(doc.start_date), getdate(doc.end_date)
    if start.day == CYCLE_START_DAY and end.day == CYCLE_END_DAY:
        return

    # what the cycle containing this start date should have been
    if start.day >= CYCLE_START_DAY:
        sug_start = start.replace(day=CYCLE_START_DAY)
        nxt_month = start.month + 1 if start.month < 12 else 1
        nxt_year = start.year if start.month < 12 else start.year + 1
        sug_end = getdate(f"{nxt_year}-{nxt_month:02d}-{CYCLE_END_DAY:02d}")
    else:
        sug_end = start.replace(day=CYCLE_END_DAY)
        prv_month = start.month - 1 if start.month > 1 else 12
        prv_year = start.year if start.month > 1 else start.year - 1
        sug_start = getdate(f"{prv_year}-{prv_month:02d}-{CYCLE_START_DAY:02d}")

    frappe.throw(
        _("Salaries here are paid from the <b>21st to the 20th</b>, but this payroll is set "
          "from <b>{0}</b> to <b>{1}</b>.<br><br>Running it this way would pay everyone for "
          "the wrong days.<br><br>Please set the dates to <b>{2}</b> to <b>{3}</b>.")
        .format(frappe.utils.formatdate(start), frappe.utils.formatdate(end),
                frappe.utils.formatdate(sug_start), frappe.utils.formatdate(sug_end)),
        title=_("Wrong pay period"),
    )
