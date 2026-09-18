import frappe
from frappe.utils import flt, rounded

# Extra pay that sits ON TOP of the monthly package. The client reports
# "Gross Salary" BEFORE overtime, and that same figure is the basis for both
# Sunday pay (gross / 25) and the no-pay deduction (gross / working days), so
# `gross_pay` must hold the package alone.
EXTRA_PAY_COMPONENTS = ("Overtime", "Sunday Pay")


def set_gross_before_ot(doc, method=None):
    """Report gross pay BEFORE overtime, without changing what is paid.

    Runs on validate, after the controller's own calculate_net_pay(), so
    doc.gross_pay/net_pay are already populated. ERPNext derives
    net_pay = gross_pay - (total_deduction + loans), so gross_pay at this point
    still includes the extra pay. We move the extras out of gross_pay and leave
    net_pay exactly as calculated — the employee is still paid the overtime, it
    is just presented after gross instead of inside it.

    Marking the components `do_not_include_in_total` would NOT work:
    get_component_totals() skips those rows outright, which would drop the
    overtime from net_pay as well and stop paying it.
    """
    extra = 0.0
    for row in (doc.earnings or []):
        if row.salary_component in EXTRA_PAY_COMPONENTS:
            extra += flt(row.amount)

    package = flt(doc.gross_pay) - extra
    precision = doc.precision("gross_pay")

    if doc.meta.has_field("custom_gross_before_ot"):
        doc.custom_gross_before_ot = flt(package, precision)

    if not extra:
        return

    # net_pay is deliberately left untouched; only the reported gross moves.
    doc.gross_pay = flt(package, precision)
    doc.base_gross_pay = flt(
        flt(doc.gross_pay) * flt(doc.exchange_rate), doc.precision("base_gross_pay")
    )
    doc.rounded_total = rounded(doc.net_pay)
