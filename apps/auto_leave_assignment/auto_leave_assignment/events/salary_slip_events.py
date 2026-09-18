import frappe
from frappe.utils import flt

# Extra pay that sits ON TOP of the monthly package. These components must stay
# inside `gross_pay`, because ERPNext derives net_pay from it
# (net_pay = gross_pay - total_deduction); excluding them there would silently
# stop paying them. The client reports "Gross Salary" BEFORE overtime, so that
# figure is stored separately instead.
EXTRA_PAY_COMPONENTS = ("Overtime", "Sunday Pay")


def set_gross_before_ot(doc, method=None):
    """Populate custom_gross_before_ot = package earnings, excluding extra pay."""
    if not doc.meta.has_field("custom_gross_before_ot"):
        return

    total = 0.0
    for row in (doc.earnings or []):
        if row.salary_component in EXTRA_PAY_COMPONENTS:
            continue
        total += flt(row.amount)

    doc.custom_gross_before_ot = flt(total, doc.precision("gross_pay"))
