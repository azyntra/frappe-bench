# Chan Rich Fruits — HR & Payroll System

This system runs attendance, leave and payroll for Chan Rich Fruits (Pvt) Ltd.

It is built to look after itself. Almost everything that used to need a person
each year now happens on its own, and anything it cannot decide alone it will
tell you about rather than fail quietly. This document explains the little that
is left for a person to do, and what to do if something looks wrong.

---

# Part 1 — For the HR team

## What you do every month

**1. Import the attendance file.**
Go to **HR Dashboard → Import Attendance**, drop in the fingerprint CSV, and
press Run once. It does five things in order and shows you each one:

| | |
|---|---|
| 1 | Reads the check-ins from the file |
| 2 | Turns them into attendance |
| 3 | Fills in the days nobody clocked in |
| 4 | Uses up leave for absent days (Casual → Annual → unpaid) |
| 5 | Pays for any Sunday worked |

If a step shows a red number, open the log underneath — it says which employee
and which date.

**2. Run the payroll.**
**HR Dashboard → New Payroll Entry**. The dates must be the **21st to the 20th**.
If you pick anything else the system will stop you and tell you the right dates,
so you cannot run a wrong payroll by accident.

That is the whole monthly routine.

## Managing someone's leave

**HR Dashboard → Employee Leave.** Search for the person, click their name, and
everything is in one window:

- how many days they have left
- **Change** — give them more or fewer days for the year
- **Apply Leave** — book leave for any dates
- **Leave Taken** — everything they have taken, with a Cancel button
- **Absent Days** — days they were away with no leave, with a "Give leave" button

Two things it will tell you, because they matter:

> **"Salary for this month has already been paid."**
> You can still make the change, but it will not change money that has already
> been paid out. Tell whoever runs payroll if it needs correcting.

> **"Not set up"** on someone's leave.
> That person has no leave allowance, so every day they are absent is unpaid.
> Press **Set up now** to fix it.

## Once a year — the only annual task

Around **November**, the system creates next year's holiday list and gives
everyone their new leave allowance automatically. You will get a message saying:

> *The 2027 holiday list has its Sundays but no Poya or public holidays yet.*

Every Sunday is already in there. What you need to add are the **Poya days and
public holidays**, because those dates change every year and are announced by the
government.

**Go to:** Holiday List → open **"Sundays & Poya days 2027"** → add each Poya and
public holiday → Save.

This matters. If a Poya day is missing, anyone absent that day is wrongly docked,
and people who work it are not paid the extra.

The system will keep reminding you until it is done.

## If something looks wrong

The system checks itself every day and sends a message when it finds a problem.
If you see one, it will say plainly what is wrong. The most common are:

| Message | What it means |
|---|---|
| "no Poya or public holidays yet" | The yearly task above |
| "have no salary structure and cannot be paid" | Someone was added but never given a salary — they will be left out of payroll |
| "No leave entitlement exists" | Nobody can take paid leave; contact support |
| "The background scheduler is not running" | Automatic jobs have stopped; contact support |

## Things to be careful with

- **Do not cancel leave from the Leave Application list.** Use the Cancel button
  on the **Employee Leave** page instead. The list view also deletes that day's
  attendance record, which changes the person's pay.
- **Salaries that are already paid do not change.** Editing leave for a month
  that has been paid updates the records, not the money.
- **Day-team staff do not appear on the Employee Leave page.** They are paid for
  each day they work, so a day off already costs them that day — leave does not
  apply to them. This is deliberate.

---

# Part 2 — For whoever maintains this

## Shape of it

One GitHub mono-repo (`azyntra/frappe-bench`) containing the whole bench. Deploy
is: commit → push → on the server `git merge --ff-only origin/main` →
`bench --site <site> migrate` → `clear-cache` → restart web + workers.
**Take a backup first** — this is live payroll.

ERPNext v16 / HRMS 16.4.5, plus a custom app `auto_leave_assignment` and several
custom pages inside the forked `hrms` app.

## The one rule that explains most of the code

`Payroll Settings.payroll_based_on = "Attendance"`.

Pay is derived from **one Attendance row per date** and nothing else. The leave
ledger never affects pay. A leave application matters only because submitting it
rewrites that attendance row. And `consider_unmarked_attendance_as = "Absent"`,
so a date with *no* row is unpaid too.

Two consequences worth holding on to:

- On a split day the attendance row must end as `status="Half Day"`,
  `leave_type=<the unpaid chunk>`, `half_day_status="Present"`. If `leave_type`
  ends up the *paid* type, or blank, **the day is paid in full and nothing
  errors.** `core._finalize_attendance()` sets this explicitly for that reason.
- Nothing recomputes a salary slip after it is submitted. The Employee Leave
  page's rebuild check (`get_payroll_rebuild_queue`) rebuilds each submitted slip
  in memory and reports the ones that no longer match.

## What runs by itself

| Job | When | What it does |
|---|---|---|
| `auto_leave_task.process_absent_attendance` | daily | Covers absences from leave balance |
| `yearly_rollover.run_yearly_rollover` | daily | From November, builds next year's holiday list + entitlement; health-checks daily and notifies HR |
| `bench --site all backup --with-files` | every 6h | Database and files |

`yearly_rollover.prepare_year(year)` can be called for any year on demand.
`system_health_check()` is whitelisted and returns the problem list.

## Things that will bite you

- **Salary Structure amounts are not date-effective.** Only the assignment's
  `base` is. Rebuilding an already-paid cycle makes it re-read *today's*
  structure, silently dragging a later salary revision backwards. Detect it by
  diffing the rebuilt slips against the last **cancelled** generation
  (`docstatus=2`, latest `creation` per employee) — cancelled slips are the
  record of what was actually paid.
- **Leave eligibility is date-dependent.** `core._is_leave_eligible` resolves the
  salary structure *as of that date*. Someone can be day-team in May and monthly
  in July. A date-blind check over-counts.
- **`validate_salary_processed_days` only blocks unpaid leave.** Paid leave
  backdated into a closed payroll month succeeds silently — it burns balance and
  changes no money.
- **Cancelling a Leave Application cancels its Attendance row**
  (`leave_application.py:351`). Anything that cancels leave must restore the row,
  or delete it if the leave created it.
- **The salary slip print format lives in the database**, not the repo. The file
  under `print_format/` is a copy. Change both.

## Known open items

- **No off-site backup.** Backups run every 6 hours but live on the same server.
  If that VM is lost, the backups go with it. Configure S3 or Google Drive in
  Backup Settings — this needs the client's own cloud account.
- **The site is served over plain HTTP.** Payroll data crosses the network
  unencrypted. It should have TLS.
- **Three active employees have no salary structure** and cannot be paid:
  SHASHIKA (EMP-00048), NIROSHA (EMP-00086), MADUSHANKA (EMP-00175). SHASHIKA was
  still clocking in in July, so that one is probably real.
- **Accrual journal entries** are not posted for any cycle. Whether payroll
  should post to the GL at all is an accounting decision nobody has made.
