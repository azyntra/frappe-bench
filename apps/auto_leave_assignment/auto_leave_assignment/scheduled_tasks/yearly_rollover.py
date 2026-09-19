"""
yearly_rollover.py
------------------
Keeps the system working across a year boundary without anyone touching it.

Two things in this site expire on 31 December and take payroll down with them:

1. **The holiday list.** It runs 1 Jan – 31 Dec. Once it lapses, Sundays stop
   being holidays, so `total_working_days` jumps from ~25 to ~31, the daily rate
   silently drops by a fifth, absence deductions shrink to match, and leave can
   be booked on a Sunday. Measured on this site: Jan–Feb 2027 computed 31
   working days against 25 for a covered cycle.

2. **Leave entitlement.** Allocations are per calendar year. With none, every
   absence falls straight through the chain to unpaid leave.

This module creates both ahead of time and reports anything it cannot decide.
It is idempotent: it only ever fills a gap, and never edits what already exists.

Poya days are lunar and published annually, so they cannot be generated. The
rollover creates the Sundays (the large, systematic part) and keeps warning HR
until the Poya dates are added — a missing Poya is one wrong day, a missing
Sunday is every Sunday.
"""

import frappe
from frappe.utils import add_days, cint, flt, getdate, today

HOLIDAY_LIST_PREFIX = "Sundays & Poya days"
WEEKLY_OFF = "Sunday"
# from this month onward the job prepares the following year
PREPARE_FROM_MONTH = 11


def _company():
    return (frappe.db.get_single_value("Global Defaults", "default_company")
            or frappe.db.get_value("Company", {}, "name"))


def _holiday_list_name(year):
    return "%s %s" % (HOLIDAY_LIST_PREFIX, year)


# ─────────────────────────────────────────────
#  Holiday list
# ─────────────────────────────────────────────

def ensure_holiday_list(year, submit_assignment=True):
    """Create next year's holiday list and point the company at it.

    ERPNext generates the weekly offs itself from `weekly_off`, so the 52
    Sundays are its own arithmetic rather than ours. The company assignment is
    what makes it take effect: get_assigned_holiday_list() picks the assignment
    with the greatest from_date <= the date being asked about, so a new
    assignment dated 1 Jan takes over cleanly while older dates keep resolving
    to the old list. A cycle that straddles both (21 Dec – 20 Jan) is handled by
    get_holiday_dates_between_range(), which splits at the changeover.
    """
    year = cint(year)
    name = _holiday_list_name(year)
    created_list = False

    if not frappe.db.exists("Holiday List", name):
        doc = frappe.get_doc({
            "doctype": "Holiday List",
            "holiday_list_name": name,
            "from_date": getdate("%s-01-01" % year),
            "to_date": getdate("%s-12-31" % year),
            "weekly_off": WEEKLY_OFF,
        })
        doc.flags.ignore_permissions = True
        doc.insert()
        doc.get_weekly_off_dates()      # ERPNext fills in every Sunday
        doc.save()
        created_list = True

    sundays = frappe.db.count("Holiday", {"parent": name, "weekly_off": 1})
    others = frappe.db.count("Holiday", {"parent": name, "weekly_off": 0})

    company = _company()
    created_assignment = False
    existing = frappe.db.exists("Holiday List Assignment", {
        "assigned_to": company, "holiday_list": name, "docstatus": 1})
    if not existing and submit_assignment:
        a = frappe.get_doc({
            "doctype": "Holiday List Assignment",
            "applicable_for": "Company",
            "assigned_to": company,
            "holiday_list": name,
            "from_date": getdate("%s-01-01" % year),
        })
        a.flags.ignore_permissions = True
        a.insert()
        a.submit()
        created_assignment = True

    return {"year": year, "holiday_list": name, "created_list": created_list,
            "created_assignment": created_assignment,
            "sundays": sundays, "other_holidays": others}


# ─────────────────────────────────────────────
#  Leave entitlement
# ─────────────────────────────────────────────

def _leave_eligible_employees(on_date):
    """Active employees whose salary structure on that date starts with FT-.

    Mirrors core._is_leave_eligible: day-team staff are paid per day worked, so
    granting them leave would pay them for a day they did not work.
    """
    rows = frappe.db.sql("""
        SELECT   ssa.employee, ssa.salary_structure, ssa.from_date
        FROM     `tabSalary Structure Assignment` ssa
        JOIN     `tabEmployee` e ON e.name = ssa.employee
        WHERE    ssa.docstatus = 1 AND e.status = 'Active' AND ssa.from_date <= %s
        ORDER BY ssa.employee, ssa.from_date
    """, on_date, as_dict=True)
    current = {}
    for r in rows:
        current[r.employee] = r.salary_structure
    return [e for e, s in current.items() if str(s or "").startswith("FT-")]


def ensure_leave_allocations(year, dry_run=False):
    """Give every eligible employee the same entitlement they had last year.

    Someone with no allocation last year (a new joiner, or one of the people who
    were never set up) gets the leave type's standard maximum. Anything that
    already exists is left completely alone.
    """
    year = cint(year)
    y_from, y_to = getdate("%s-01-01" % year), getdate("%s-12-31" % year)
    prev_from, prev_to = getdate("%s-01-01" % (year - 1)), getdate("%s-12-31" % (year - 1))

    types = frappe.get_all("Leave Type", filters={"is_lwp": 0},
                           fields=["name", "max_leaves_allowed"])
    standard = {t.name: flt(t.max_leaves_allowed) for t in types
                if flt(t.max_leaves_allowed) > 0}
    if not standard:
        return {"year": year, "created": 0, "skipped": 0,
                "problems": ["No leave type has a yearly maximum set."]}

    previous = {}
    for r in frappe.db.sql("""
        SELECT employee, leave_type, SUM(new_leaves_allocated) d, MAX(carry_forward) cf
        FROM   `tabLeave Allocation`
        WHERE  docstatus = 1 AND from_date >= %s AND to_date <= %s
        GROUP BY employee, leave_type
    """, (prev_from, prev_to), as_dict=True):
        previous[(r.employee, r.leave_type)] = (flt(r.d), cint(r.cf))

    created = skipped = 0
    problems = []
    plan = []
    for emp in _leave_eligible_employees(y_to):
        for lt, std in standard.items():
            if frappe.db.exists("Leave Allocation", {
                    "employee": emp, "leave_type": lt, "docstatus": 1,
                    "from_date": ["<=", y_to], "to_date": [">=", y_from]}):
                skipped += 1
                continue
            days, cf = previous.get((emp, lt), (std, 0))
            if days <= 0:
                days = std
            plan.append({"employee": emp, "leave_type": lt, "days": days, "carry_forward": cf})

    if dry_run:
        return {"year": year, "would_create": len(plan), "skipped": skipped,
                "plan": plan[:40], "problems": problems}

    for p in plan:
        try:
            doc = frappe.get_doc({
                "doctype": "Leave Allocation", "employee": p["employee"],
                "leave_type": p["leave_type"], "from_date": y_from, "to_date": y_to,
                "new_leaves_allocated": p["days"], "carry_forward": p["carry_forward"],
                "description": "Created automatically by the yearly rollover.",
            })
            doc.flags.ignore_permissions = True
            doc.insert()
            doc.submit()
            created += 1
        except Exception as e:
            problems.append("%s / %s: %s" % (p["employee"], p["leave_type"], str(e)[:120]))
    frappe.db.commit()
    return {"year": year, "created": created, "skipped": skipped, "problems": problems}


# ─────────────────────────────────────────────
#  Health check
# ─────────────────────────────────────────────

@frappe.whitelist()
def system_health_check():
    """Everything that would quietly break payroll, as a list of warnings."""
    problems, ok = [], []
    now = getdate(today())
    company = _company()

    # 1. is a holiday list in force for the next 90 days?
    from hrms.utils.holiday_list import get_assigned_holiday_list
    for offset, label in ((0, "today"), (90, "in 90 days"), (400, "next year")):
        d = add_days(now, offset)
        hl = get_assigned_holiday_list(company, d)
        covered = hl and frappe.db.exists("Holiday", {"parent": hl, "holiday_date": ["between",
                         [add_days(d, -7), add_days(d, 7)]]})
        if not hl:
            problems.append("No holiday list is assigned for %s (%s). Sundays would be "
                            "treated as working days and salaries calculated wrongly." % (label, d))
        elif not covered:
            problems.append("The holiday list '%s' has no dates around %s (%s). Sundays would "
                            "be treated as working days." % (hl, label, d))
        else:
            ok.append("Holiday list in force %s: %s" % (label, hl))

    # 2. does next year's list have its Poya / public holidays yet?
    nxt = _holiday_list_name(now.year + 1)
    if frappe.db.exists("Holiday List", nxt):
        others = frappe.db.count("Holiday", {"parent": nxt, "weekly_off": 0})
        if not others:
            problems.append("The %s holiday list has its Sundays but no Poya or public "
                            "holidays yet. Please add them." % (now.year + 1))
        else:
            ok.append("%s holiday list has %s Poya/public holidays" % (now.year + 1, others))

    # 3. leave entitlement for this year and next
    for y in (now.year, now.year + 1):
        n = frappe.db.count("Leave Allocation", {
            "docstatus": 1, "from_date": ["<=", getdate("%s-12-31" % y)],
            "to_date": [">=", getdate("%s-01-01" % y)]})
        eligible = len(_leave_eligible_employees(getdate("%s-12-31" % y)))
        if y == now.year and n == 0:
            problems.append("No leave entitlement exists for %s. Every absence would be unpaid." % y)
        elif y > now.year and now.month >= PREPARE_FROM_MONTH and n == 0:
            problems.append("Leave entitlement for %s has not been created yet." % y)
        else:
            ok.append("%s: %s leave allocations for %s eligible employees" % (y, n, eligible))

    # 4. is the scheduler alive?
    try:
        from frappe.utils.scheduler import is_scheduler_inactive
        if is_scheduler_inactive():
            problems.append("The background scheduler is not running, so automatic leave "
                            "assignment and this check itself will not run.")
        else:
            ok.append("Background scheduler is running")
    except Exception:
        pass

    # 5. employees who cannot be paid at all
    no_structure = frappe.db.sql("""
        SELECT e.name, e.employee_name FROM `tabEmployee` e
        WHERE e.status = 'Active' AND NOT EXISTS (
            SELECT 1 FROM `tabSalary Structure Assignment` ssa
            WHERE ssa.employee = e.name AND ssa.docstatus = 1)
    """, as_dict=True)
    if no_structure:
        problems.append("%s active employee(s) have no salary structure and cannot be paid: %s"
                        % (len(no_structure),
                           ", ".join("%s (%s)" % (r.employee_name, r.name) for r in no_structure[:6])))

    # 6. draft payroll entries that do not match the 21st->20th cycle
    bad = []
    for r in frappe.db.sql("""SELECT name, start_date, end_date FROM `tabPayroll Entry`
                              WHERE docstatus = 0""", as_dict=True):
        if getdate(r.start_date).day != 21 or getdate(r.end_date).day != 20:
            bad.append("%s (%s to %s)" % (r.name, r.start_date, r.end_date))
    if bad:
        problems.append("Draft payroll entries with the wrong pay period — the cycle runs the "
                        "21st to the 20th: %s" % ", ".join(bad))

    return {"ok": not problems, "problems": problems, "healthy": ok,
            "checked_on": str(now)}


def _notify(problems):
    """Put the warnings in front of HR rather than only in a log."""
    users = set()
    for role in ("HR Manager", "System Manager"):
        users |= set(frappe.get_all("Has Role", filters={"role": role, "parenttype": "User"},
                                    pluck="parent"))
    users = [u for u in users if u not in ("Administrator", "Guest")
             and frappe.db.get_value("User", u, "enabled")]
    body = "<p>The HR system needs attention:</p><ul>%s</ul>" % "".join(
        "<li>%s</li>" % frappe.utils.escape_html(p) for p in problems)
    for u in users:
        try:
            frappe.get_doc({
                "doctype": "Notification Log", "for_user": u, "type": "Alert",
                "subject": "HR system check — %d item(s) need attention" % len(problems),
                "email_content": body,
            }).insert(ignore_permissions=True)
        except Exception:
            frappe.log_error(frappe.get_traceback(), "Yearly rollover notification failed")


# ─────────────────────────────────────────────
#  The daily job
# ─────────────────────────────────────────────

def run_yearly_rollover():
    """Daily. From November, make sure the coming year is ready; always check health."""
    now = getdate(today())
    result = {"prepared": None}

    if now.month >= PREPARE_FROM_MONTH:
        year = now.year + 1
        try:
            result["prepared"] = {
                "holiday": ensure_holiday_list(year),
                "leave": ensure_leave_allocations(year),
            }
            frappe.db.commit()
        except Exception:
            frappe.db.rollback()
            frappe.log_error(frappe.get_traceback(),
                             "Yearly rollover failed for %s" % (now.year + 1))

    health = system_health_check()
    result["health"] = health
    if health["problems"]:
        # once a week is enough to stay visible without becoming noise
        if now.weekday() == 0 or now.month >= PREPARE_FROM_MONTH:
            _notify(health["problems"])
        frappe.log_error("\n".join(health["problems"]), "HR system check — items need attention")
    return result


@frappe.whitelist()
def prepare_year(year, dry_run=0):
    """Run the rollover for a specific year on demand (also fixes the current one)."""
    frappe.only_for(["HR Manager", "System Manager"])
    dry_run = cint(dry_run)
    return {
        "holiday": ensure_holiday_list(year, submit_assignment=not dry_run) if not dry_run
                   else {"year": cint(year), "dry_run": True,
                         "exists": frappe.db.exists("Holiday List", _holiday_list_name(year))},
        "leave": ensure_leave_allocations(year, dry_run=dry_run),
    }
