import frappe
from frappe import _

@frappe.whitelist()
def bulk_insert_checkins(checkins):
    """
    Bulk insert Employee Checkin records in a single transaction.
    checkins: JSON list of {employee, log_type, time, device_id}
    Returns: {inserted, duplicates, errors, error_details}
    """
    import json

    if isinstance(checkins, str):
        checkins = json.loads(checkins)

    inserted   = 0
    duplicates = 0
    errors     = 0
    error_details = []

    for rec in checkins:
        try:
            # Check for duplicate first (faster than catching exception)
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

    # Commit once after all inserts
    frappe.db.commit()

    return {
        'inserted':     inserted,
        'duplicates':   duplicates,
        'errors':       errors,
        'error_details': error_details[:20]  # cap at 20 for response size
    }
