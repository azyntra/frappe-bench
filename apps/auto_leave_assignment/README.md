# Auto Leave Assignment — Frappe/ERPNext Custom App
**Developed by Azyntra Technologies**

Automatically assigns **Casual Leave** or **Leave Without Pay (LWP)** when
employees are marked Absent or Half-Day in attendance — no manual leave
application required. The payslip then reflects the correct deduction
automatically.

---

## Features

| Feature | Details |
|---|---|
| ⚡ Real-time trigger | Fires on every Attendance submit |
| 🌙 Nightly safety net | Scheduler catches any missed records |
| 🗓️ Holiday awareness | Skips public & company holidays |
| 🌓 Half-day support | Handles Half-Day attendance correctly |
| 🔁 Smart fallback | Casual Leave first → LWP if balance exhausted |
| 📋 Audit log | Every action logged in Auto Leave Log DocType |
| 🖥️ HR Dashboard | Full review UI with filters, KPIs, cancel action |
| 🔒 Duplicate guard | Never creates duplicate leave applications |

---

## How It Works

```
Attendance Submitted (Absent / Half Day)
          │
          ▼
    Is it a Holiday? ──Yes──▶ Log as Skipped
          │ No
          ▼
    Leave App exists? ──Yes──▶ Log as Skipped
          │ No
          ▼
    Casual Leave Balance > 0?
      Yes ──▶ Assign Casual Leave (Auto-Approved)
      No  ──▶ Assign Leave Without Pay (LWP)
          │
          ▼
    Log in Auto Leave Log
          │
          ▼
    Payslip auto-deducts via LWP field
```

---

## Installation

### Prerequisites
- ERPNext v14 or v15
- Python 3.10+
- bench CLI access

### Steps

```bash
# 1. Get the app
cd /home/frappe/frappe-bench
bench get-app /path/to/auto_leave_assignment
# OR from git:
# bench get-app https://github.com/azyntra/auto_leave_assignment

# 2. Install on your site
bench --site your-site.com install-app auto_leave_assignment

# 3. Run migrations (creates Auto Leave Log DocType)
bench --site your-site.com migrate

# 4. Restart bench
bench restart
```

---

## Configuration Checklist

After installation, verify these ERPNext settings:

### 1. Leave Type — Casual Leave
- Go to **HR → Leaves → Leave Type → Casual Leave**
- ✅ Allow Negative Balance: **OFF**
- ✅ Is Carry Forward: as per your policy

### 2. Leave Without Pay
- Go to **HR → Leaves → Leave Type → Leave Without Pay**
- ✅ Is Leave Without Pay: **ON**

### 3. Payroll Settings
- Go to **Payroll → Settings → Payroll Settings**
- ✅ **Leave without Pay impacts Salary**: **ON**

### 4. Salary Structure
Add a deduction component to your Salary Structure:
```
Component Name : LWP Deduction
Type           : Deduction
Formula        : (base / working_days) * lwp
```
ERPNext auto-fills `lwp` from leave records when generating payslips.

### 5. Holiday List
- Assign a Holiday List to each employee (or set a Company default)
- The app uses this to skip holidays automatically

### 6. Leave Allocation
- Allocate Casual Leave to employees via **Leave Policy** or manually
- The app checks real-time balance before deciding leave type

---

## Using the HR Dashboard

Navigate to **HR → Auto Leave Dashboard** (or search "Auto Leave Dashboard")

### Dashboard Sections

**Filter Bar**
- Filter by date range, status, leave type, or specific employee
- **Run Now** button: manually trigger processing for any date range

**KPI Cards** (clickable — auto-filters the table)
| Card | Meaning |
|---|---|
| Total Processed | All records in selected period |
| Casual Leave | Auto-assigned Casual Leaves |
| Leave Without Pay | Auto-assigned LWPs |
| Half Days | Half-day assignments |
| Skipped | Skipped (holiday / duplicate) |
| Errors | Failed assignments (check Error Log) |

**Auto Leave Log Table**
- Full audit trail of every processed record
- Links to source Attendance and Leave Application
- **Cancel** button: cancels the Leave Application if needed

---

## Auto Leave Log — Statuses

| Status | Meaning |
|---|---|
| `Assigned` | Leave Application created and submitted successfully |
| `Skipped` | Skipped (holiday, duplicate, or existing leave found) |
| `Error` | Processing failed — check Frappe Error Log |

---

## Troubleshooting

**Q: Leave not being assigned for some employees**
- Check if employee has a Holiday List assigned
- Check if Casual Leave allocation exists for the leave period
- Check Auto Leave Log for "Skipped" status and read the Remarks

**Q: Payslip not deducting LWP**
- Ensure "Leave without Pay impacts Salary" is ON in Payroll Settings
- Ensure your Salary Structure has the LWP deduction component with `lwp` variable

**Q: Duplicate leave applications being created**
- The app has a duplicate guard — check if the guard query is matching correctly
- Check Auto Leave Log — if status is "Skipped", it's working correctly

**Q: Errors in Auto Leave Log**
- Go to **Settings → Error Log** and search for "Auto Leave Assignment Error"
- Common causes: leave allocation not found, overlapping leave applications

---

## File Structure

```
auto_leave_assignment/
├── setup.py
├── requirements.txt
└── auto_leave_assignment/
    ├── hooks.py                    # App registration, events, scheduler
    ├── auto_leave_assignment/
    │   ├── core.py                 # Core engine (shared logic)
    │   ├── events/
    │   │   └── attendance_events.py  # Real-time Attendance trigger
    │   ├── scheduled_tasks/
    │   │   └── auto_leave_task.py    # Nightly scheduler job
    │   ├── api/
    │   │   └── dashboard_api.py      # Dashboard API endpoints
    │   ├── doctype/
    │   │   └── auto_leave_log/       # Audit log DocType
    │   └── page/
    │       └── auto_leave_dashboard/ # HR Review Dashboard
    └── config/
        └── desktop.py              # ERPNext sidebar entry
```

---

## Developer Notes

- All logic lives in `core.py` — easy to extend or modify
- To add more leave types to the priority chain, edit `_resolve_leave_type()` in `core.py`
- To change the scheduler frequency, update `hooks.py` → `scheduler_events`
- The dashboard JS uses Frappe's built-in `frappe.call()` — no external dependencies

---

## License
MIT — Azyntra Technologies
