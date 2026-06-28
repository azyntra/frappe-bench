import frappe
from frappe.model.document import Document


class AutoLeaveLog(Document):
    def validate(self):
        if self.employee:
            self.employee_name = frappe.db.get_value(
                "Employee", self.employee, "employee_name"
            )


def has_permission(doc, ptype, user):
    """HR Managers, HR Users, and System Managers can read."""
    if user == "Administrator":
        return True
    roles = frappe.get_roles(user)
    return bool(set(roles) & {"HR Manager", "HR User", "System Manager"})
