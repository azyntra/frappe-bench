import frappe
import json
from frappe import _
from datetime import datetime, timedelta, date


# ─────────────────────────────────────────────────────────────
#  1.  BULK CHECKIN INSERT  (existing, unchanged)
# ─────────────────────────────────────────────────────────────
@frappe.whitelist()
def bulk_insert_checkins(checkins):
    """
    Bulk insert Employee Checkin records in a single transaction.
    checkins: JSON list of {employee, log_type, time, device_id}
    Returns: {inserted, duplicates, errors, error_details}
    """
    if isinstance(checkins, str):
        checkins = json.loads(checkins)

    inserted      = 0
    duplicates    = 0
    errors        = 0
    error_details = []

    for rec in checkins:
        try:
            exists = frappe.db.exists('Employee Checkin', {
                'employee': rec['employee'],
                'time':     rec['time'],
                'log_type': rec['log_type']
            })
            if exists:
                duplicates += 1
                continue

            doc = frappe.get_doc({
                'doctype':   'Employee Checkin',
                'employee':  rec['employee'],
                'log_type':  rec['log_type'],
                'time':      rec['time'],
                'device_id': rec.get('device_id', 'Fingerprint_Upload')
            })
            doc.insert(ignore_permissions=True)
            inserted += 1

        except Exception as e:
            err_msg = str(e).lower()
            if 'duplicate' in err_msg or 'unique' in err_msg:
                duplicates += 1
            else:
                errors += 1
                error_details.append({
                    'employee': rec.get('employee'),
                    'time':     rec.get('time'),
                    'error':    str(e)[:100]
                })

    frappe.db.commit()
    return {
        'inserted':      inserted,
        'duplicates':    duplicates,
        'errors':        errors,
        'error_details': error_details[:20]
    }


# ─────────────────────────────────────────────────────────────
#  2.  PROCESS ATTENDANCE  (new)
# ─────────────────────────────────────────────────────────────
@frappe.whitelist()
def process_attendance_for_employees(employee_dates):
    """
    After checkins are imported, create / update Attendance records.

    employee_dates: JSON list of {"employee": "EMP-001", "date": "2025-01-15"}

    Strategy
    ────────
    For each (employee, date) pair:
      1.  Try ERPNext's own shift-based helper first
          (hrms.hr.doctype.shift_type.shift_type.process_attendance).
          This is the "official" path and respects all shift rules.
      2.  Fall back to our own lightweight logic when no shift is assigned
          or when the helper is unavailable.

    Returns: {created, updated, skipped, errors, error_details}
    """
    if isinstance(employee_dates, str):
        employee_dates = json.loads(employee_dates)

    created       = 0
    updated       = 0
    skipped       = 0
    errors        = 0
    error_details = []

    # Deduplicate
    seen    = set()
    unique  = []
    for ed in employee_dates:
        key = (ed['employee'], ed['date'])
        if key not in seen:
            seen.add(key)
            unique.append(ed)

    for ed in unique:
        employee   = ed['employee']
        work_date  = ed['date']          # "YYYY-MM-DD"

        try:
            result = _process_single(employee, work_date)
            if   result == 'created': created += 1
            elif result == 'updated': updated += 1
            elif result == 'skipped': skipped += 1

        except Exception as e:
            errors += 1
            error_details.append({
                'employee': employee,
                'date':     work_date,
                'error':    str(e)[:150]
            })

    frappe.db.commit()

    return {
        'created':       created,
        'updated':       updated,
        'skipped':       skipped,
        'errors':        errors,
        'error_details': error_details[:30]
    }


# ─────────────────────────────────────────────────────────────
#  Helper: process one (employee, date)
# ─────────────────────────────────────────────────────────────
def _process_single(employee, work_date):
    """
    Returns 'created' | 'updated' | 'skipped'.
    Raises on hard error.
    """
    # ── 1. Try shift-aware ERPNext path ──────────────────────
    shift_assignment = _get_shift_assignment(employee, work_date)

    if shift_assignment:
        return _process_with_shift(employee, work_date, shift_assignment)
    else:
        return _process_without_shift(employee, work_date)


# ─────────────────────────────────────────────────────────────
#  Shift lookup
# ─────────────────────────────────────────────────────────────
def _get_shift_assignment(employee, work_date):
    """
    Return the shift_type name for this employee on this date, or None.

    Fixes vs original:
    ─────────────────
    • Removed docstatus=1 filter — most ERPNext setups save Shift Assignments
      as Draft (docstatus=0). Filtering only submitted records silently
      returned nothing even when a shift WAS assigned.
    • Use raw SQL so we can express the NULL end_date condition correctly
      in a single query instead of fetching and checking in Python.
    • Exclude cancelled records (docstatus=2) only.
    """
    try:
        result = frappe.db.sql(
            """
            SELECT shift_type
            FROM   `tabShift Assignment`
            WHERE  employee   = %(employee)s
              AND  start_date <= %(work_date)s
              AND  docstatus  != 2
              AND  (end_date IS NULL OR end_date >= %(work_date)s)
            ORDER BY start_date DESC
            LIMIT 1
            """,
            {'employee': employee, 'work_date': work_date},
            as_dict=True
        )
        if result:
            return result[0]['shift_type']
        return None
    except Exception:
        return None


def _get_shift_details(shift_type_name):
    """Return shift_type doc fields we need, or None."""
    try:
        return frappe.db.get_value(
            'Shift Type',
            shift_type_name,
            ['name', 'start_time', 'end_time',
             'late_entry_grace_period', 'early_exit_grace_period',
             'working_hours_threshold_for_half_day',
             'working_hours_threshold_for_absent'],
            as_dict=True
        )
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────
#  Shift-aware attendance
# ─────────────────────────────────────────────────────────────
def _process_with_shift(employee, work_date, shift_type_name):
    shift = _get_shift_details(shift_type_name)
    if not shift:
        return _process_without_shift(employee, work_date)

    checkins = _get_checkins(employee, work_date)
    if not checkins:
        # No checkins for this date — mark Absent only if today is in the past
        if work_date < str(date.today()):
            return _upsert_attendance(
                employee, work_date, 'Absent', None, None,
                shift_type_name, 0
            )
        return 'skipped'

    in_time  = _first_in(checkins)
    out_time = _last_out(checkins)

    # Working hours (minutes)
    if in_time and out_time:
        mins = (out_time - in_time).total_seconds() / 60
    elif in_time:
        mins = 0
    else:
        mins = 0

    # Convert shift times to full datetimes
    work_dt = datetime.strptime(work_date, '%Y-%m-%d')
    shift_start = work_dt + timedelta(
        seconds=_td_seconds(shift.start_time)
    )
    shift_end   = work_dt + timedelta(
        seconds=_td_seconds(shift.end_time)
    )
    # Handle overnight shifts
    if shift_end < shift_start:
        shift_end += timedelta(days=1)

    # ── Determine status ─────────────────────────────────────
    half_day_hrs  = (shift.working_hours_threshold_for_half_day  or 0)
    absent_hrs    = (shift.working_hours_threshold_for_absent     or 0)
    actual_hrs    = mins / 60.0

    if absent_hrs and actual_hrs < absent_hrs:
        status = 'Absent'
    elif half_day_hrs and actual_hrs < half_day_hrs:
        status = 'Half Day'
    else:
        status = 'Present'

    # ── Late entry / Early exit flags ────────────────────────
    late_entry   = False
    early_exit   = False
    late_grace   = int(shift.late_entry_grace_period  or 0)
    early_grace  = int(shift.early_exit_grace_period   or 0)

    if in_time and in_time > (shift_start + timedelta(minutes=late_grace)):
        late_entry = True
    if out_time and out_time < (shift_end - timedelta(minutes=early_grace)):
        early_exit = True

    return _upsert_attendance(
        employee, work_date, status,
        in_time, out_time,
        shift_type_name, round(actual_hrs, 2),
        late_entry=late_entry, early_exit=early_exit
    )


# ─────────────────────────────────────────────────────────────
#  Fallback: no shift assigned
# ─────────────────────────────────────────────────────────────
def _process_without_shift(employee, work_date):
    checkins = _get_checkins(employee, work_date)
    if not checkins:
        return 'skipped'

    in_time  = _first_in(checkins)
    out_time = _last_out(checkins)

    if in_time and out_time:
        hrs = (out_time - in_time).total_seconds() / 3600
    else:
        hrs = 0

    # Simple rule: if there's at least one punch → Present
    status = 'Present'

    return _upsert_attendance(
        employee, work_date, status,
        in_time, out_time,
        None, round(hrs, 2)
    )


# ─────────────────────────────────────────────────────────────
#  Upsert Attendance record
# ─────────────────────────────────────────────────────────────
def _upsert_attendance(employee, work_date, status,
                       in_time, out_time, shift_type,
                       working_hours,
                       late_entry=False, early_exit=False):
    """Create or update an Attendance record. Returns 'created'|'updated'."""

    existing = frappe.db.get_value(
        'Attendance',
        {'employee': employee, 'attendance_date': work_date},
        'name'
    )

    if existing:
        doc = frappe.get_doc('Attendance', existing)
        # Don't overwrite manually-submitted records
        if doc.docstatus == 1:
            return 'skipped'
        doc.status         = status
        doc.in_time        = in_time
        doc.out_time       = out_time
        doc.shift          = shift_type
        doc.working_hours  = working_hours
        doc.late_entry     = 1 if late_entry  else 0
        doc.early_exit     = 1 if early_exit  else 0
        doc.save(ignore_permissions=True)
        # Auto-submit — skip auto leave hook (it runs after full batch)
        if doc.docstatus == 0:
            doc.flags.skip_auto_leave = True
            doc.submit()
        return 'updated'
    else:
        doc = frappe.get_doc({
            'doctype':        'Attendance',
            'employee':       employee,
            'attendance_date': work_date,
            'status':         status,
            'in_time':        in_time,
            'out_time':       out_time,
            'shift':          shift_type,
            'working_hours':  working_hours,
            'late_entry':     1 if late_entry  else 0,
            'early_exit':     1 if early_exit  else 0,
            'company':        _get_company(employee),
        })
        doc.insert(ignore_permissions=True)
        # Skip auto leave hook — it runs after full batch completes
        doc.flags.skip_auto_leave = True
        doc.submit()
        return 'created'


# ─────────────────────────────────────────────────────────────
#  Small utilities
# ─────────────────────────────────────────────────────────────
def _get_checkins(employee, work_date):
    """Fetch all checkin rows for this employee on this date, sorted by time."""
    rows = frappe.db.get_all(
        'Employee Checkin',
        filters={'employee': employee, 'time': ['between', [
            work_date + ' 00:00:00',
            work_date + ' 23:59:59'
        ]]},
        fields=['log_type', 'time'],
        order_by='time asc'
    )
    return rows


def _first_in(checkins):
    for c in checkins:
        if c.log_type == 'IN':
            return _to_dt(c.time)
    # If no IN record, treat first punch as IN
    if checkins:
        return _to_dt(checkins[0].time)
    return None


def _last_out(checkins):
    for c in reversed(checkins):
        if c.log_type == 'OUT':
            return _to_dt(c.time)
    # If only one punch, no out time
    if len(checkins) > 1:
        return _to_dt(checkins[-1].time)
    return None


def _to_dt(val):
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    if isinstance(val, str):
        for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S'):
            try:
                return datetime.strptime(val, fmt)
            except ValueError:
                continue
    return val


def _td_seconds(td):
    """timedelta or datetime.time → total seconds."""
    if td is None:
        return 0
    if isinstance(td, timedelta):
        return int(td.total_seconds())
    # datetime.time object
    try:
        return td.hour * 3600 + td.minute * 60 + td.second
    except Exception:
        return 0


def _get_company(employee):
    try:
        return frappe.db.get_value('Employee', employee, 'company')
    except Exception:
        return frappe.defaults.get_user_default('Company')


# ─────────────────────────────────────────────────────────────
#  3.  PREVIEW endpoint — returns shift info for table display
# ─────────────────────────────────────────────────────────────
@frappe.whitelist()
def get_employee_shift_info(employees, check_date=None):
    """
    employees: JSON list of employee IDs
    Returns: dict  {emp_id: {shift_type, shift_start, shift_end} | null}
    """
    if isinstance(employees, str):
        employees = json.loads(employees)

    # Use the actual CSV date rather than today — avoids false "no shift"
    # when the CSV is from a prior month and assignments have an end_date.
    lookup_date = check_date if check_date else str(date.today())

    result = {}
    for emp in employees:
        shift_name = _get_shift_assignment(emp, lookup_date)
        if shift_name:
            shift = _get_shift_details(shift_name)
            result[emp] = {
                'shift_type':  shift_name,
                'shift_start': str(shift.start_time) if shift else '—',
                'shift_end':   str(shift.end_time)   if shift else '—',
            }
        else:
            result[emp] = None

    return result


# ─────────────────────────────────────────────────────────────
#  4.  DEBUG endpoint — run from browser console to diagnose
# ─────────────────────────────────────────────────────────────
@frappe.whitelist()
def debug_shift_assignment(employee, check_date=None):
    """
    Diagnostic helper. Call from browser console to verify shift detection:

        frappe.call({
            method: 'hrms.hr.page.import_attendance.import_attendance.debug_shift_assignment',
            args: { employee: 'HR-EMP-00001', check_date: '2025-03-01' },
            callback: r => console.log(JSON.stringify(r.message, null, 2))
        });

    Returns a full picture of all shift assignments + what the fixed query finds.
    """
    lookup_date = check_date if check_date else str(date.today())

    # All shift assignments for this employee regardless of status
    all_rows = frappe.db.sql(
        """
        SELECT name, shift_type, start_date, end_date, docstatus
        FROM   `tabShift Assignment`
        WHERE  employee = %(employee)s
        ORDER BY start_date DESC
        LIMIT 10
        """,
        {'employee': employee},
        as_dict=True
    )

    # Convert dates to strings for JSON serialization
    for row in all_rows:
        if row.get('start_date'):
            row['start_date'] = str(row['start_date'])
        if row.get('end_date'):
            row['end_date'] = str(row['end_date'])

    shift_found = _get_shift_assignment(employee, lookup_date)

    return {
        'employee':        employee,
        'lookup_date':     lookup_date,
        'shift_found':     shift_found,
        'all_assignments': all_rows,
    }
