/**
 * Auto Leave Dashboard — auto_leave_dashboard.js
 * Azyntra Technologies
 */

frappe.pages["auto-leave-dashboard"].on_page_load = function (wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: "Auto Leave Dashboard",
        single_column: true,
    });

    // ── Inject CSS ──────────────────────────────────────
    frappe.dom.set_style(`
        .ala-dashboard {
            padding: 20px;
            font-family: var(--font-stack);
        }

        /* ── Filter Bar ── */
        .ala-filter-bar {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            align-items: flex-end;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 16px 20px;
            margin-bottom: 20px;
        }
        .ala-filter-group { display: flex; flex-direction: column; gap: 4px; }
        .ala-filter-group label { font-size: 11px; font-weight: 600;
            color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .ala-filter-group input,
        .ala-filter-group select {
            height: 32px; border: 1px solid var(--border-color);
            border-radius: 4px; padding: 0 10px;
            font-size: 13px; color: var(--text-color);
            background: var(--control-bg);
            min-width: 140px;
        }
        .ala-btn {
            height: 32px; padding: 0 16px; border-radius: 4px;
            border: none; cursor: pointer; font-size: 13px; font-weight: 500;
            display: flex; align-items: center; gap: 6px; transition: opacity .2s;
        }
        .ala-btn:hover { opacity: 0.85; }
        .ala-btn-primary { background: var(--primary); color: white; }
        .ala-btn-success { background: #2e7d32; color: white; }
        .ala-btn-warning { background: #e65100; color: white; }

        /* ── KPI Cards ── */
        .ala-cards {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 14px;
            margin-bottom: 20px;
        }
        .ala-card {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 18px 16px;
            border-left: 4px solid var(--primary);
            cursor: pointer;
            transition: box-shadow .2s;
        }
        .ala-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,.12); }
        .ala-card.green  { border-left-color: #2e7d32; }
        .ala-card.orange { border-left-color: #e65100; }
        .ala-card.red    { border-left-color: #c62828; }
        .ala-card.blue   { border-left-color: #1565c0; }
        .ala-card.purple { border-left-color: #6a1b9a; }
        .ala-card-value  { font-size: 32px; font-weight: 700;
            color: var(--heading-color); line-height: 1; }
        .ala-card-label  { font-size: 12px; color: var(--text-muted);
            margin-top: 6px; font-weight: 500; }

        /* ── Table ── */
        .ala-table-wrap {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            overflow: hidden;
        }
        .ala-table-header {
            display: flex; justify-content: space-between; align-items: center;
            padding: 14px 18px;
            border-bottom: 1px solid var(--border-color);
        }
        .ala-table-title { font-weight: 600; font-size: 14px; color: var(--heading-color); }
        .ala-table-count { font-size: 12px; color: var(--text-muted); }
        table.ala-table {
            width: 100%; border-collapse: collapse; font-size: 13px;
        }
        table.ala-table th {
            background: var(--subtle-fg); padding: 10px 14px;
            text-align: left; font-size: 11px; font-weight: 600;
            color: var(--text-muted); text-transform: uppercase;
            border-bottom: 1px solid var(--border-color);
        }
        table.ala-table td {
            padding: 10px 14px; border-bottom: 1px solid var(--border-color);
            color: var(--text-color); vertical-align: middle;
        }
        table.ala-table tr:last-child td { border-bottom: none; }
        table.ala-table tr:hover td { background: var(--subtle-fg); }

        .ala-badge {
            display: inline-block; padding: 2px 10px; border-radius: 12px;
            font-size: 11px; font-weight: 600;
        }
        .ala-badge.Assigned  { background: #e8f5e9; color: #2e7d32; }
        .ala-badge.Skipped   { background: #fff3e0; color: #e65100; }
        .ala-badge.Error     { background: #ffebee; color: #c62828; }
        .ala-badge.Cancelled { background: #f5f5f5; color: #757575; }
        .ala-badge.cl { background: #e3f2fd; color: #1565c0; }
        .ala-badge.lwp{ background: #fce4ec; color: #880e4f; }
        .ala-badge.hd { background: #f3e5f5; color: #6a1b9a; }

        .ala-action-btn {
            font-size: 11px; padding: 3px 10px; border-radius: 4px;
            border: 1px solid var(--border-color); background: transparent;
            cursor: pointer; color: var(--text-color); margin-right: 4px;
        }
        .ala-action-btn.danger { border-color: #c62828; color: #c62828; }
        .ala-action-btn:hover { opacity: .75; }

        /* ── Pagination ── */
        .ala-pagination {
            display: flex; justify-content: flex-end; align-items: center;
            gap: 8px; padding: 12px 18px;
            border-top: 1px solid var(--border-color);
            font-size: 13px; color: var(--text-muted);
        }
        .ala-page-btn {
            height: 28px; padding: 0 10px; border-radius: 4px;
            border: 1px solid var(--border-color); background: transparent;
            cursor: pointer; font-size: 12px;
        }
        .ala-page-btn:disabled { opacity: .4; cursor: default; }

        /* ── Empty / Loading ── */
        .ala-empty {
            text-align: center; padding: 40px 20px; color: var(--text-muted);
        }
        .ala-empty-icon { font-size: 40px; margin-bottom: 10px; }
        .ala-loading { text-align: center; padding: 30px; color: var(--text-muted); }
        .ala-run-banner {
            background: #e8f5e9; border: 1px solid #a5d6a7;
            border-radius: 6px; padding: 10px 16px; margin-bottom: 16px;
            font-size: 13px; color: #2e7d32; display: none;
        }
    `);

    // ── State ────────────────────────────────────────────
    let state = {
        from_date:  frappe.datetime.get_today(),
        to_date:    frappe.datetime.get_today(),
        status:     "",
        leave_type: "",
        employee:   "",
        page:       1,
        page_size:  20,
        loading:    false,
    };

    // ── Build HTML ───────────────────────────────────────
    $(wrapper).find(".page-content").html(`
        <div class="ala-dashboard">

            <!-- Run Banner -->
            <div class="ala-run-banner" id="ala-run-banner"></div>

            <!-- Filter Bar -->
            <div class="ala-filter-bar">
                <div class="ala-filter-group">
                    <label>From Date</label>
                    <input type="date" id="ala-from-date" value="${state.from_date}" />
                </div>
                <div class="ala-filter-group">
                    <label>To Date</label>
                    <input type="date" id="ala-to-date" value="${state.to_date}" />
                </div>
                <div class="ala-filter-group">
                    <label>Status</label>
                    <select id="ala-status">
                        <option value="">All</option>
                        <option value="Assigned">Assigned</option>
                        <option value="Skipped">Skipped</option>
                        <option value="Error">Error</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                </div>
                <div class="ala-filter-group">
                    <label>Leave Type</label>
                    <select id="ala-leave-type">
                        <option value="">All</option>
                        <option value="Casual Leave">Casual Leave</option>
                        <option value="Leave Without Pay">Leave Without Pay</option>
                    </select>
                </div>
                <div class="ala-filter-group">
                    <label>Employee</label>
                    <select id="ala-employee">
                        <option value="">All Employees</option>
                    </select>
                </div>
                <button class="ala-btn ala-btn-primary" id="ala-search-btn">
                    🔍 Search
                </button>
                <button class="ala-btn ala-btn-success" id="ala-run-btn">
                    ▶ Run Now
                </button>
            </div>

            <!-- KPI Cards -->
            <div class="ala-cards" id="ala-cards">
                <div class="ala-card" data-filter="">
                    <div class="ala-card-value" id="kpi-total">—</div>
                    <div class="ala-card-label">Total Processed</div>
                </div>
                <div class="ala-card green" data-filter="Casual Leave">
                    <div class="ala-card-value" id="kpi-casual">—</div>
                    <div class="ala-card-label">Casual Leave</div>
                </div>
                <div class="ala-card orange" data-filter="Leave Without Pay">
                    <div class="ala-card-value" id="kpi-lwp">—</div>
                    <div class="ala-card-label">Leave Without Pay</div>
                </div>
                <div class="ala-card purple" data-filter="">
                    <div class="ala-card-value" id="kpi-halfday">—</div>
                    <div class="ala-card-label">Half Days</div>
                </div>
                <div class="ala-card blue" data-filter="Skipped">
                    <div class="ala-card-value" id="kpi-skipped">—</div>
                    <div class="ala-card-label">Skipped</div>
                </div>
                <div class="ala-card red" data-filter="Error">
                    <div class="ala-card-value" id="kpi-errors">—</div>
                    <div class="ala-card-label">Errors</div>
                </div>
            </div>

            <!-- Table -->
            <div class="ala-table-wrap">
                <div class="ala-table-header">
                    <span class="ala-table-title">Auto Leave Log</span>
                    <span class="ala-table-count" id="ala-record-count">Loading…</span>
                </div>
                <div id="ala-table-body">
                    <div class="ala-loading">Loading records…</div>
                </div>
                <div class="ala-pagination" id="ala-pagination" style="display:none">
                    <span id="ala-page-info"></span>
                    <button class="ala-page-btn" id="ala-prev-btn">◀ Prev</button>
                    <button class="ala-page-btn" id="ala-next-btn">Next ▶</button>
                </div>
            </div>
        </div>
    `);

    // ── Load employees dropdown ──────────────────────────
    frappe.call({
        method: "auto_leave_assignment.api.dashboard_api.get_employees_for_filter",
        callback: (r) => {
            if (!r.exc && r.message) {
                const sel = document.getElementById("ala-employee");
                r.message.forEach(e => {
                    const opt = document.createElement("option");
                    opt.value = e.name;
                    opt.textContent = `${e.employee_name} (${e.name})`;
                    sel.appendChild(opt);
                });
            }
        }
    });

    // ── Event: Search ────────────────────────────────────
    document.getElementById("ala-search-btn").addEventListener("click", () => {
        state.from_date  = document.getElementById("ala-from-date").value;
        state.to_date    = document.getElementById("ala-to-date").value;
        state.status     = document.getElementById("ala-status").value;
        state.leave_type = document.getElementById("ala-leave-type").value;
        state.employee   = document.getElementById("ala-employee").value;
        state.page       = 1;
        loadAll();
    });

    // ── Event: Run Now ───────────────────────────────────
    document.getElementById("ala-run-btn").addEventListener("click", () => {
        const fd = document.getElementById("ala-from-date").value;
        const td = document.getElementById("ala-to-date").value;

        frappe.confirm(
            `Run auto leave assignment for <strong>${fd}</strong> to <strong>${td}</strong>?<br>
            This will create Leave Applications for all absent employees.`,
            () => {
                const btn = document.getElementById("ala-run-btn");
                btn.textContent = "⏳ Running…";
                btn.disabled = true;

                frappe.call({
                    method: "auto_leave_assignment.api.dashboard_api.run_manual_processing",
                    args: { from_date: fd, to_date: td },
                    callback: (r) => {
                        btn.textContent = "▶ Run Now";
                        btn.disabled = false;
                        if (!r.exc && r.message) {
                            const res = r.message;
                            const banner = document.getElementById("ala-run-banner");
                            banner.style.display = "block";
                            banner.textContent = `✅ ${res.assigned} assigned, ${res.skipped} skipped, ${res.errors} errors`;
                            setTimeout(() => banner.style.display = "none", 8000);
                            loadAll();
                        }
                    }
                });
            }
        );
    });

    // ── Event: Card filters ──────────────────────────────
    document.querySelectorAll(".ala-card").forEach(card => {
        card.addEventListener("click", () => {
            const f = card.dataset.filter;
            if (f === "Casual Leave" || f === "Leave Without Pay") {
                document.getElementById("ala-leave-type").value = f;
                document.getElementById("ala-status").value = "Assigned";
            } else if (f === "Skipped" || f === "Error") {
                document.getElementById("ala-status").value = f;
                document.getElementById("ala-leave-type").value = "";
            } else {
                document.getElementById("ala-status").value = "";
                document.getElementById("ala-leave-type").value = "";
            }
            state.status     = document.getElementById("ala-status").value;
            state.leave_type = document.getElementById("ala-leave-type").value;
            state.page = 1;
            loadTable();
        });
    });

    // ── Pagination ───────────────────────────────────────
    document.getElementById("ala-prev-btn").addEventListener("click", () => {
        if (state.page > 1) { state.page--; loadTable(); }
    });
    document.getElementById("ala-next-btn").addEventListener("click", () => {
        state.page++;
        loadTable();
    });

    // ── Load Functions ───────────────────────────────────
    function loadAll() {
        loadSummary();
        loadTable();
    }

    function loadSummary() {
        ["total","casual","lwp","halfday","skipped","errors"].forEach(k => {
            document.getElementById(`kpi-${k}`).textContent = "…";
        });

        frappe.call({
            method: "auto_leave_assignment.api.dashboard_api.get_dashboard_summary",
            args: { from_date: state.from_date, to_date: state.to_date },
            callback: (r) => {
                if (!r.exc && r.message) {
                    const d = r.message;
                    document.getElementById("kpi-total").textContent   = d.total;
                    document.getElementById("kpi-casual").textContent  = d.casual_leave;
                    document.getElementById("kpi-lwp").textContent     = d.lwp;
                    document.getElementById("kpi-halfday").textContent = d.half_days;
                    document.getElementById("kpi-skipped").textContent = d.skipped;
                    document.getElementById("kpi-errors").textContent  = d.errors;
                }
            }
        });
    }

    function loadTable() {
        document.getElementById("ala-table-body").innerHTML =
            `<div class="ala-loading">⏳ Loading…</div>`;
        document.getElementById("ala-record-count").textContent = "Loading…";

        frappe.call({
            method: "auto_leave_assignment.api.dashboard_api.get_leave_log_list",
            args: {
                from_date:  state.from_date,
                to_date:    state.to_date,
                status:     state.status,
                leave_type: state.leave_type,
                employee:   state.employee,
                page:       state.page,
                page_size:  state.page_size,
            },
            callback: (r) => {
                if (r.exc || !r.message) {
                    document.getElementById("ala-table-body").innerHTML =
                        `<div class="ala-empty"><div class="ala-empty-icon">⚠️</div>Error loading data.</div>`;
                    return;
                }
                renderTable(r.message);
            }
        });
    }

    function renderTable(data) {
        const { records, total, page, page_size, total_pages } = data;

        document.getElementById("ala-record-count").textContent =
            `${total} record${total !== 1 ? "s" : ""}`;

        if (!records.length) {
            document.getElementById("ala-table-body").innerHTML = `
                <div class="ala-empty">
                    <div class="ala-empty-icon">📋</div>
                    No records found for the selected filters.
                </div>`;
            document.getElementById("ala-pagination").style.display = "none";
            return;
        }

        let rows = records.map(rec => {
            const statusBadge = `<span class="ala-badge ${rec.status}">${rec.status}</span>`;
            const ltBadge = rec.leave_type
                ? `<span class="ala-badge ${rec.leave_type === "Casual Leave" ? "cl" : "lwp"}">
                    ${rec.leave_type === "Casual Leave" ? "Casual" : "LWP"}</span>`
                : "—";
            const hdBadge = rec.half_day
                ? `<span class="ala-badge hd">Half</span>` : "";
            const laLink = rec.leave_application
                ? `<a href="/app/leave-application/${rec.leave_application}" target="_blank">${rec.leave_application}</a>`
                : "—";
            const attLink = rec.source_attendance
                ? `<a href="/app/attendance/${rec.source_attendance}" target="_blank">${rec.source_attendance}</a>`
                : "—";

            const cancelBtn = rec.status === "Assigned" && rec.leave_application
                ? `<button class="ala-action-btn danger" onclick="cancelLeave('${rec.name}')">✕ Cancel</button>`
                : "";

            return `<tr>
                <td>${rec.attendance_date}</td>
                <td>
                    <strong>${rec.employee_name}</strong><br>
                    <small style="color:var(--text-muted)">${rec.employee}</small>
                </td>
                <td>${ltBadge} ${hdBadge}</td>
                <td>${statusBadge}</td>
                <td>${laLink}</td>
                <td>${attLink}</td>
                <td style="max-width:200px;font-size:11px;color:var(--text-muted)">
                    ${rec.remarks ? rec.remarks.substring(0, 80) + (rec.remarks.length > 80 ? "…" : "") : ""}
                </td>
                <td>${cancelBtn}</td>
            </tr>`;
        }).join("");

        document.getElementById("ala-table-body").innerHTML = `
            <table class="ala-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Employee</th>
                        <th>Leave Type</th>
                        <th>Status</th>
                        <th>Leave Application</th>
                        <th>Attendance</th>
                        <th>Remarks</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>`;

        // Pagination
        const pg = document.getElementById("ala-pagination");
        pg.style.display = total > page_size ? "flex" : "none";
        document.getElementById("ala-page-info").textContent =
            `Page ${page} of ${total_pages}`;
        document.getElementById("ala-prev-btn").disabled = page <= 1;
        document.getElementById("ala-next-btn").disabled = page >= total_pages;
    }

    // ── Global cancel handler (called from table button) ─
    window.cancelLeave = function(logName) {
        frappe.confirm(
            "Cancel this auto-assigned Leave Application? This cannot be undone easily.",
            () => {
                frappe.call({
                    method: "auto_leave_assignment.api.dashboard_api.cancel_auto_leave",
                    args: { log_name: logName },
                    callback: (r) => {
                        if (!r.exc && r.message?.success) {
                            frappe.show_alert({ message: r.message.message, indicator: "green" });
                            loadAll();
                        } else {
                            frappe.show_alert({ message: r.message?.message || "Error", indicator: "red" });
                        }
                    }
                });
            }
        );
    };

    // ── Initial Load ─────────────────────────────────────
    loadAll();
};
