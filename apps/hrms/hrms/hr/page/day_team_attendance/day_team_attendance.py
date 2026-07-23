"""Day Team Attendance & OT — server side.

Read-model + correction tool for the day/target team:

  * get_overview      — everything the page grid needs in one call
  * get_day_punches   — punch drill-down for one cell
  * reprocess_range   — re-run punch classification / attendance compute
                        after punches or the manual roster changed

The classification itself lives in import_attendance.py (the importer runs
it inline); this module reuses those helpers so the two can never disagree.
"""

import json
from datetime import date, datetime, timedelta

import frappe
from frappe import _
from frappe.utils import add_days, cint, flt, getdate

from hrms.hr.page.day_team_planner.day_team_planner import _release_checkin_shift
from hrms.hr.page.import_attendance.import_attendance import (
    AUTO_NORMAL_SHIFT,
    AUTO_TARGET_SHIFT,
    OT_TYPE_NAME,
    _first_in,
    _get_checkins,
    _get_shift_assignment,
    _get_shift_details,
    _infer_day_shift,
    _is_holiday_for,
    _last_out,
    _overtime_hours,
    _pay_profile,
    _process_single,
    _td_seconds,
)

DEPT = "Day Team - CHAN RICH"
MAX_RANGE_DAYS = 62


def get_context(context):
    pass


def _members():
    rows = frappe.get_all(
        "Employee",
        filters={"status": "Active", "department": DEPT},
        fields=["name", "employee_name", "designation"],
        order_by="employee_name asc",
    )
    for r in rows:
        r["structure"] = frappe.db.get_value(
            "Salary Structure Assignment",
            {"employee": r.name, "docstatus": 1},
            "salary_structure",
            order_by="from_date desc",
        )
    return rows


def _validate_range(from_date, to_date):
    start, end = getdate(from_date), getdate(to_date)
    if end < start:
        frappe.throw(_("to_date is before from_date"))
    if (end - start).days > MAX_RANGE_DAYS:
        frappe.throw(_("Range too large (max {0} days)").format(MAX_RANGE_DAYS))
    return start, end


def _ot_rate():
    return flt(frappe.db.get_value("Overtime Type", OT_TYPE_NAME, "hourly_rate")) or 160.0


def _is_target_shift(shift):
    return bool(shift) and shift.startswith("Target-Shift")


@frappe.whitelist()
def get_overview(from_date, to_date):
    frappe.has_permission("Attendance", "read", throw=True)
    start, end = _validate_range(from_date, to_date)
    members = _members()
    emp_ids = [m.name for m in members]
    if not emp_ids:
        return {"members": [], "days": [], "cells": {}, "totals": {}, "warnings": []}

    # holidays — the whole team shares one list, resolve once via any member
    holidays = set()
    try:
        from hrms.utils.holiday_list import get_holiday_dates_between_range
        holidays = {str(d) for d in (get_holiday_dates_between_range(
            emp_ids[0], start, end, raise_exception_for_holiday_list=False) or [])}
    except Exception:
        pass

    att = frappe.db.sql(
        """
        SELECT employee, attendance_date, status, shift, in_time, out_time,
               working_hours, actual_overtime_duration, docstatus
        FROM `tabAttendance`
        WHERE docstatus != 2 AND employee IN %(emps)s
          AND attendance_date BETWEEN %(s)s AND %(e)s
        """,
        {"emps": emp_ids, "s": start, "e": end},
        as_dict=True,
    )

    assignments = frappe.db.sql(
        """
        SELECT employee, start_date, shift_type, IFNULL(custom_auto_assigned, 0) AS auto
        FROM `tabShift Assignment`
        WHERE docstatus != 2 AND IFNULL(status,'Active') = 'Active'
          AND employee IN %(emps)s
          AND start_date BETWEEN %(s)s AND %(e)s
          AND end_date = start_date
        """,
        {"emps": emp_ids, "s": start, "e": end},
        as_dict=True,
    )
    assign_map = {(a.employee, str(a.start_date)): a for a in assignments}

    # days that have punches (to flag punches-without-attendance)
    punch_days = {
        (r[0], str(r[1]))
        for r in frappe.db.sql(
            """
            SELECT DISTINCT employee, DATE(time) FROM `tabEmployee Checkin`
            WHERE employee IN %(emps)s AND DATE(time) BETWEEN %(s)s AND %(e)s
            """,
            {"emps": emp_ids, "s": start, "e": end},
        )
    }

    cells = {}
    att_keys = set()
    for a in att:
        ds = str(a.attendance_date)
        att_keys.add((a.employee, ds))
        sa = assign_map.get((a.employee, ds))
        cells.setdefault(a.employee, {})[ds] = {
            "status": a.status,
            "shift": a.shift,
            "team": "T" if _is_target_shift(a.shift) else ("N" if a.shift else None),
            "auto": bool(sa and sa.auto) if sa else False,
            "manual": bool(sa and not sa.auto) if sa else False,
            "in": str(a.in_time)[11:16] if a.in_time else None,
            "out": str(a.out_time)[11:16] if a.out_time else None,
            "wh": flt(a.working_hours),
            "ot": flt(a.actual_overtime_duration),
            "holiday": ds in holidays,
        }

    rate = _ot_rate()
    day_list = []
    d = start
    while d <= end:
        day_list.append(str(d))
        d = add_days(d, 1)

    warnings = []
    for m in members:
        if not m.structure:
            warnings.append(f"{m.name} {m.employee_name}: no salary structure — excluded from automation and payroll")
    missing = sorted(k for k in punch_days if k not in att_keys)
    for emp, ds in missing[:30]:
        warnings.append(f"{emp} has punches on {ds} but no attendance — run Re-process")

    summary = {}
    for m in members:
        ec = cells.get(m.name, {})
        present = [c for c in ec.values() if c["status"] in ("Present", "Half Day")]
        summary[m.name] = {
            "present_days": len(present),
            "target_days": sum(1 for c in present if c["team"] == "T"),
            "normal_days": sum(1 for c in present if c["team"] == "N"),
            "absent_days": sum(1 for c in ec.values() if c["status"] == "Absent"),
            "ot_hours": round(sum(c["ot"] for c in ec.values()), 1),
            "ot_days": sum(1 for c in ec.values() if c["ot"] > 0),
            "auto_days": sum(1 for c in ec.values() if c["auto"]),
        }
        summary[m.name]["ot_amount"] = round(summary[m.name]["ot_hours"] * rate, 2)

    totals = {
        "members": len(members),
        "target_days": sum(s["target_days"] for s in summary.values()),
        "normal_days": sum(s["normal_days"] for s in summary.values()),
        "ot_hours": round(sum(s["ot_hours"] for s in summary.values()), 1),
        "ot_rate": rate,
        "ot_amount": round(sum(s["ot_amount"] for s in summary.values()), 2),
        "auto_days": sum(s["auto_days"] for s in summary.values()),
    }

    return {
        "members": members,
        "days": day_list,
        "holidays": sorted(holidays),
        "cells": cells,
        "summary": summary,
        "totals": totals,
        "warnings": warnings,
    }


@frappe.whitelist()
def get_day_punches(employee, work_date):
    frappe.has_permission("Employee Checkin", "read", throw=True)
    checkins = _get_checkins(employee, str(getdate(work_date)))
    resolved = _get_shift_assignment(employee, str(getdate(work_date)))
    inferred = _infer_day_shift(checkins) if checkins else None
    return {
        "punches": [{"time": str(c.time), "log_type": c.log_type} for c in checkins],
        "resolved_shift": resolved,
        "inferred_shift": inferred,
        "is_holiday": _is_holiday_for(employee, str(getdate(work_date))),
    }


def _expected_ot(emp, ds, checkins, final_shift, is_hol):
    """OT the punch data implies against final_shift, or None if it cannot be
    compared cheaply (single punch: credited-shift logic; no shift resolved)."""
    in_time, out_time = _first_in(checkins), _last_out(checkins)
    if not out_time:
        return None
    if is_hol:
        return _overtime_hours(in_time, out_time, None, True)
    if not final_shift:
        return None
    sh = _get_shift_details(final_shift)
    if not sh:
        return None
    work_dt = datetime.strptime(ds, "%Y-%m-%d")
    s = work_dt + timedelta(seconds=_td_seconds(sh.start_time))
    e = work_dt + timedelta(seconds=_td_seconds(sh.end_time))
    if e < s:
        e += timedelta(days=1)
    profile = _pay_profile(emp, ds) or "fixed"
    return _overtime_hours(in_time, out_time, e, False, shift_start=s, profile=profile)


# ─────────────────────────────────────────────────────────────
#  Re-process — correction tool
# ─────────────────────────────────────────────────────────────
@frappe.whitelist()
def reprocess_range(from_date, to_date, dry_run=1):
    """Re-run classification + attendance compute for the day team.

    Needed when punches were re-imported or HR changed the manual roster
    AFTER attendance was created: the importer's upsert skips submitted
    rows, so corrections require cancel + recreate. Per (employee, day):

      * no assignment, not holiday      -> create auto assignment
      * AUTO assignment, inference now
        differs (punches changed)       -> replace the auto assignment
      * MANUAL assignment               -> never touched
      * attendance shift differs from
        the resolved shift, or missing  -> cancel + recreate via the
                                           standard import path
      * any date already covered by a
        submitted Salary Slip           -> blocked (paid months stay put)
    """
    frappe.has_permission("Attendance", "write", throw=True)
    frappe.has_permission("Shift Assignment", "create", throw=True)
    dry_run = cint(dry_run)
    start, end = _validate_range(from_date, to_date)
    today_s = str(date.today())

    actions = []
    for m in _members():
        emp = m.name
        if _pay_profile(emp, str(end)) != "day" and _pay_profile(emp, str(start)) != "day":
            continue  # no structure (or not day-team) — automation excluded
        d = start
        while d <= end:
            ds = str(d)
            d = add_days(d, 1)
            if ds > today_s:
                continue
            checkins = _get_checkins(emp, ds)
            if not checkins:
                continue

            paid = frappe.db.exists(
                "Salary Slip",
                {"employee": emp, "docstatus": 1,
                 "start_date": ("<=", ds), "end_date": (">=", ds)},
            )
            if paid:
                actions.append({"employee": emp, "date": ds, "action": "blocked-paid"})
                continue

            is_hol = _is_holiday_for(emp, ds)
            inferred = None if is_hol else _infer_day_shift(checkins)
            sa = frappe.db.get_value(
                "Shift Assignment",
                {"employee": emp, "start_date": ds, "end_date": ds,
                 "docstatus": ("!=", 2), "status": "Active"},
                ["name", "shift_type", "custom_auto_assigned"],
                as_dict=True,
            )

            assignment_action = "keep"
            if sa and not cint(sa.custom_auto_assigned):
                assignment_action = "keep-manual"
            elif sa and inferred and sa.shift_type != inferred:
                assignment_action = "replace-auto"
            elif not sa and inferred:
                assignment_action = "create-auto"

            # what shift will attendance be measured against after this runs?
            final_shift = (
                sa.shift_type if assignment_action in ("keep", "keep-manual")
                else inferred
            ) if (sa or inferred) else _get_shift_assignment(emp, ds)

            att = frappe.db.get_value(
                "Attendance",
                {"employee": emp, "attendance_date": ds, "docstatus": ("!=", 2)},
                ["name", "shift", "status", "actual_overtime_duration", "docstatus"],
                as_dict=True,
            )
            exp_ot = _expected_ot(emp, ds, checkins, final_shift, is_hol)
            attendance_action = "unchanged"
            if not att:
                attendance_action = "create"
            elif (att.shift or None) != (final_shift or None) or assignment_action in ("replace-auto", "create-auto"):
                attendance_action = "recreate"
            elif exp_ot is not None and abs(flt(att.actual_overtime_duration) - exp_ot) >= 0.25:
                # same shift but punches changed since import — OT is stale
                attendance_action = "recreate"

            if assignment_action in ("keep", "keep-manual") and attendance_action == "unchanged":
                continue

            actions.append({
                "employee": emp, "employee_name": m.employee_name, "date": ds,
                "action": assignment_action,
                "shift_from": sa.shift_type if sa else (att.shift if att else None),
                "shift_to": final_shift,
                "attendance": attendance_action,
                "ot_before": flt(att.actual_overtime_duration) if att else 0,
                "ot_after": exp_ot,
            })

            if dry_run:
                continue

            try:
                frappe.db.savepoint("dta_cell")
                # attendance FIRST — Shift Assignment.on_cancel refuses while
                # any attendance row (even cancelled) still carries the shift
                if attendance_action == "recreate" and att and att.docstatus == 1:
                    att_doc = frappe.get_doc("Attendance", att.name)
                    att_doc.flags.skip_auto_leave = True
                    att_doc.cancel()          # on_cancel unlinks its checkins
                    frappe.db.set_value("Attendance", att.name, "shift", None)
                if assignment_action == "replace-auto":
                    _release_checkin_shift(emp, ds, sa.shift_type)
                    frappe.db.sql(
                        """UPDATE `tabAttendance` SET shift = NULL
                           WHERE employee = %s AND attendance_date = %s AND docstatus = 2 AND shift = %s""",
                        (emp, ds, sa.shift_type),
                    )
                    old = frappe.get_doc("Shift Assignment", sa.name)
                    if old.docstatus == 1:
                        old.cancel()
                    frappe.delete_doc("Shift Assignment", old.name)
                # create-auto happens inside _process_single via the importer hook
                _process_single(emp, ds)
                actions[-1]["result"] = "done"
            except Exception as e:
                frappe.db.rollback(save_point="dta_cell")
                actions[-1]["result"] = f"error: {str(e)[:120]}"
                frappe.log_error(frappe.get_traceback(), f"Day-team reprocess — {emp} {ds}")

    if not dry_run:
        frappe.db.commit()

    return {
        "dry_run": bool(dry_run),
        "total": len(actions),
        "blocked_paid": sum(1 for a in actions if a["action"] == "blocked-paid"),
        "actions": actions[:400],
    }
