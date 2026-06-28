frappe.pages['hr-dashboard'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'HR Dashboard',
        single_column: false
    });

    document.title = 'HR Dashboard';

    // ── Fonts ─────────────────────────────────────────────────
    if (!document.getElementById('hrd-font')) {
        const lnk = document.createElement('link');
        lnk.id = 'hrd-font'; lnk.rel = 'stylesheet';
        lnk.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap';
        document.head.appendChild(lnk);
    }

    // ── Toolbar Clock ────────────────────────────────────────
    $(wrapper).find('.hrd-toolbar-clock').remove();
    const clockEl = $(`<span class="hrd-toolbar-clock"
        style="font-family:'JetBrains Mono',monospace;font-size:12px;
               color:var(--text-muted);margin-right:12px;letter-spacing:.3px;"></span>`);
    $(wrapper).find('.page-actions').prepend(clockEl);

    page.set_secondary_action('Refresh', () => wrapper._hrdRefresh && wrapper._hrdRefresh(), 'refresh');

    // ── CSS ──────────────────────────────────────────────────
    $('#hrd-styles').remove();
    $('<style id="hrd-styles">').text(`
        /* ═══════════════════════════════════════════════════════
           DESIGN TOKENS
           ═══════════════════════════════════════════════════════ */
        .hrd {
            --primary:    #3B82F6;
            --success:    #22C55E;
            --warning:    #F59E0B;
            --danger:     #EF4444;

            --p-bg: rgba(59,130,246,.08);
            --s-bg: rgba(34,197,94,.08);
            --w-bg: rgba(245,158,11,.08);
            --d-bg: rgba(239,68,68,.08);

            --bg:   var(--bg-color, #f8fafc);
            --card: var(--card-bg, #ffffff);
            --bd:   var(--border-color, #e2e8f0);
            --tx:   var(--text-color, #0f172a);
            --tx2:  var(--text-muted, #475569);
            --tx3:  var(--text-light, #94a3b8);
            --ibg:  var(--control-bg, #f8fafc);
            --hov:  var(--fg-hover-color, #f1f5f9);

            --radius:  12px;
            --radius-s: 8px;
            --shadow:  0 1px 3px rgba(0,0,0,.04), 0 1px 2px rgba(0,0,0,.03);
            --shadow-md: 0 4px 16px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.04);
        }

        /* ═══════════════════════════════════════════════════════
           BASE
           ═══════════════════════════════════════════════════════ */
        .hrd * { box-sizing: border-box; }
        .hrd {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg);
            min-height: 100vh;
            padding: 24px 24px 80px;
            color: var(--tx);
            font-size: 14px;
            line-height: 1.55;
            -webkit-font-smoothing: antialiased;
        }

        /* ═══════════════════════════════════════════════════════
           SUB-HEADER
           ═══════════════════════════════════════════════════════ */
        .hrd-sub {
            display: flex; align-items: center;
            justify-content: space-between;
            margin-bottom: 24px; flex-wrap: wrap; gap: 8px;
        }
        .hrd-sub-left { display: flex; align-items: center; gap: 10px; }
        .hrd-company-dot {
            width: 9px; height: 9px; border-radius: 50%;
            background: var(--success); flex-shrink: 0;
            box-shadow: 0 0 0 3px rgba(34,197,94,.15);
            animation: hrd-pulse 2s ease-in-out infinite;
        }
        @keyframes hrd-pulse {
            0%, 100% { box-shadow: 0 0 0 3px rgba(34,197,94,.15); }
            50% { box-shadow: 0 0 0 6px rgba(34,197,94,.08); }
        }
        .hrd-sub p {
            font-size: 13px; color: var(--tx2); margin: 0;
            font-weight: 500; letter-spacing: .1px;
        }
        .hrd-date {
            font-size: 12px; color: var(--tx3);
            font-family: 'JetBrains Mono', monospace;
            white-space: nowrap; letter-spacing: .2px;
        }

        /* ═══════════════════════════════════════════════════════
           KPI STRIP
           ═══════════════════════════════════════════════════════ */
        .hkpi {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px; margin-bottom: 24px;
        }
        @media(min-width:520px) { .hkpi { grid-template-columns: repeat(3, 1fr); } }
        @media(min-width:900px) { .hkpi { grid-template-columns: repeat(5, 1fr); } }

        .kpi {
            background: var(--card);
            border: 1px solid var(--bd);
            border-radius: var(--radius);
            padding: 20px 18px 16px;
            position: relative; overflow: hidden;
            transition: box-shadow .2s, transform .2s, border-color .2s;
            box-shadow: var(--shadow);
        }
        .kpi:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
            border-color: transparent;
        }
        .kpi-accent {
            position: absolute; top: 0; left: 0; right: 0; height: 3px;
            border-radius: var(--radius) var(--radius) 0 0;
        }
        .kpi .klbl {
            font-size: 11px; font-weight: 700; letter-spacing: .8px;
            text-transform: uppercase; color: var(--tx3); margin-bottom: 10px;
        }
        .kpi .knum {
            font-size: 34px; font-weight: 700;
            font-family: 'JetBrains Mono', monospace;
            line-height: 1; letter-spacing: -1.5px; margin-bottom: 6px;
        }
        .kpi .ksub {
            font-size: 12px; color: var(--tx2); font-weight: 500;
        }
        a.kpi { text-decoration: none; display: block; cursor: pointer; }
        a.kpi[data-tip]::after {
            content: attr(data-tip);
            position: absolute; bottom: calc(100% + 8px);
            left: 50%; transform: translateX(-50%) translateY(4px);
            background: var(--tx); color: var(--card);
            font-size: 11px; padding: 5px 10px; border-radius: 6px;
            white-space: nowrap; pointer-events: none; opacity: 0;
            transition: opacity .15s, transform .15s; z-index: 999;
            font-family: 'Inter', sans-serif; font-weight: 500;
        }
        a.kpi[data-tip]:hover::after { opacity: 1; transform: translateX(-50%) translateY(0); }

        /* ═══════════════════════════════════════════════════════
           MAIN 2-COL LAYOUT
           ═══════════════════════════════════════════════════════ */
        .hmain {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px; margin-bottom: 20px;
        }
        @media(min-width:768px) { .hmain { grid-template-columns: 1fr 1fr; } }

        /* ═══════════════════════════════════════════════════════
           SECTION CARD (shared)
           ═══════════════════════════════════════════════════════ */
        .sc {
            background: var(--card);
            border: 1px solid var(--bd);
            border-radius: var(--radius);
            padding: 20px;
            box-shadow: var(--shadow);
        }
        .sch {
            display: flex; align-items: center;
            justify-content: space-between; margin-bottom: 16px;
        }
        .sch h2 {
            font-size: 14px; font-weight: 700; margin: 0;
            color: var(--tx); letter-spacing: -.2px;
        }
        .sclink {
            font-size: 12px; color: var(--primary); font-weight: 600;
            cursor: pointer; text-decoration: none; transition: all .15s;
            padding: 4px 10px; border-radius: 6px;
            background: var(--p-bg);
        }
        .sclink:hover { opacity: .75; }

        /* ═══════════════════════════════════════════════════════
           QUICK ACTIONS — Flat list
           ═══════════════════════════════════════════════════════ */
        .qa-featured {
            display: flex; align-items: center; gap: 12px;
            padding: 14px 16px; border-radius: var(--radius-s);
            cursor: pointer; text-decoration: none; transition: all .2s;
            background: linear-gradient(135deg, rgba(59,130,246,.06) 0%, rgba(59,130,246,.02) 100%);
            border: 1px solid rgba(59,130,246,.15);
            position: relative; overflow: hidden;
            margin-bottom: 16px;
        }
        .qa-featured::before {
            content: ''; position: absolute; top: 0; left: 0;
            width: 3px; height: 100%;
            background: var(--primary); border-radius: 0 2px 2px 0;
        }
        .qa-featured:hover {
            background: linear-gradient(135deg, rgba(59,130,246,.10) 0%, rgba(59,130,246,.04) 100%);
            border-color: var(--primary);
            box-shadow: 0 4px 12px rgba(59,130,246,.10);
            transform: translateY(-1px);
        }
        .qa-featured .qa-i {
            width: 36px; height: 36px; border-radius: var(--radius-s);
            background: var(--p-bg); color: var(--primary);
            font-size: 16px; flex-shrink: 0;
            display: flex; align-items: center; justify-content: center;
        }
        .qa-featured .qa-t h4 {
            color: var(--primary); font-size: 13px; font-weight: 700; margin: 0 0 2px;
        }
        .qa-featured .qa-t p { color: var(--tx2); font-size: 12px; margin: 0; }
        .qa-featured .qa-arr { color: var(--tx3); font-size: 18px; margin-left: auto; flex-shrink: 0; }
        .qa-featured-badge {
            font-size: 10px; font-weight: 700;
            background: var(--p-bg); color: var(--primary);
            padding: 3px 8px; border-radius: 99px; white-space: nowrap;
            border: 1px solid rgba(59,130,246,.12); flex-shrink: 0;
        }

        .qa-list { display: flex; flex-direction: column; gap: 6px; }

        .qa {
            display: flex; align-items: center; gap: 10px;
            padding: 10px 14px; border-radius: var(--radius-s);
            cursor: pointer; border: 1px solid var(--bd);
            background: var(--ibg); transition: all .15s;
            text-decoration: none;
        }
        .qa:hover {
            background: var(--hov); border-color: #cbd5e1;
            transform: translateX(2px);
        }
        .qa-i {
            width: 32px; height: 32px; border-radius: var(--radius-s);
            display: flex; align-items: center; justify-content: center;
            font-size: 14px; flex-shrink: 0;
        }
        .qa-t { flex: 1; min-width: 0; }
        .qa-t h4 { font-size: 13px; font-weight: 600; margin: 0; color: var(--tx); }
        .qa-t p { font-size: 11px; color: var(--tx3); margin: 2px 0 0; }
        .qa-arr { color: var(--tx3); font-size: 16px; flex-shrink: 0; transition: transform .15s; }
        .qa:hover .qa-arr { transform: translateX(3px); }

        .qa-divider {
            height: 1px; background: var(--bd); margin: 6px 0;
            opacity: .6;
        }

        /* ═══════════════════════════════════════════════════════
           TODAY'S PULSE — Tabs
           ═══════════════════════════════════════════════════════ */
        .pulse-tabs {
            display: flex; gap: 2px; margin-bottom: 14px;
            background: var(--ibg); border-radius: var(--radius-s);
            padding: 3px; border: 1px solid var(--bd);
        }
        .pulse-tab {
            flex: 1; padding: 7px 12px; border-radius: 6px;
            font-size: 12px; font-weight: 600; cursor: pointer;
            border: none; color: var(--tx3); background: transparent;
            font-family: 'Inter', sans-serif; transition: all .2s;
            text-align: center;
        }
        .pulse-tab:hover { color: var(--tx2); }
        .pulse-tab.on {
            background: var(--card); color: var(--tx);
            box-shadow: 0 1px 3px rgba(0,0,0,.08);
        }
        .pulse-panel { display: none; }
        .pulse-panel.on { display: block; }

        /* ═══════════════════════════════════════════════════════
           DATA ROWS (checkins, leaves, birthdays)
           ═══════════════════════════════════════════════════════ */
        .drow { display: flex; flex-direction: column; gap: 5px; }
        .dr {
            display: flex; align-items: center; gap: 10px;
            padding: 10px 12px; border-radius: var(--radius-s);
            background: var(--ibg); border: 1px solid var(--bd);
            transition: all .15s;
        }
        .dr:hover { background: var(--hov); border-color: #cbd5e1; }
        .dr-dot {
            width: 28px; height: 28px; border-radius: 7px;
            display: flex; align-items: center; justify-content: center;
            font-size: 10px; font-weight: 700; flex-shrink: 0;
        }
        .dr-main { flex: 1; min-width: 0; }
        .dn {
            font-size: 13px; font-weight: 600; color: var(--tx);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .ds { font-size: 11px; color: var(--tx3); margin-top: 1px; }
        .dr-val {
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px; font-weight: 600;
            white-space: nowrap; flex-shrink: 0;
        }
        a.dr { cursor: pointer; text-decoration: none; }

        /* ═══════════════════════════════════════════════════════
           2-COL GRID
           ═══════════════════════════════════════════════════════ */
        .g2 {
            display: grid; grid-template-columns: 1fr;
            gap: 16px; margin-bottom: 20px;
        }
        @media(min-width:768px) { .g2 { grid-template-columns: repeat(2, 1fr); } }

        /* ═══════════════════════════════════════════════════════
           THIS MONTH ATTENDANCE
           ═══════════════════════════════════════════════════════ */
        .att-row {
            display: flex; justify-content: space-between;
            align-items: center; gap: 4px;
            background: var(--ibg); border: 1px solid var(--bd);
            border-radius: var(--radius-s); padding: 14px 10px;
        }
        .att-stat { text-align: center; flex: 1; }
        .att-stat .av {
            font-size: 22px; font-weight: 700;
            font-family: 'JetBrains Mono', monospace;
        }
        .att-stat .al {
            font-size: 10px; color: var(--tx3); font-weight: 600;
            text-transform: uppercase; letter-spacing: .6px; margin-top: 4px;
        }
        .att-div { width: 1px; height: 32px; background: var(--bd); flex-shrink: 0; }

        .rate-lbl {
            display: flex; justify-content: space-between;
            font-size: 12px; color: var(--tx3); margin: 12px 0 6px;
            font-weight: 500;
        }
        .rate-track {
            background: var(--bd); border-radius: 99px;
            height: 6px; overflow: hidden;
        }
        .rate-fill {
            height: 6px; border-radius: 99px; width: 0%;
            transition: width 1.2s cubic-bezier(.22,1,.36,1);
            background: linear-gradient(90deg, var(--success), #4ade80);
        }

        /* ═══════════════════════════════════════════════════════
           SALARY SLIPS
           ═══════════════════════════════════════════════════════ */
        .slip-row {
            display: flex; align-items: center; justify-content: space-between;
            padding: 10px 12px; border-radius: var(--radius-s);
            background: var(--ibg); border: 1px solid var(--bd);
            margin-bottom: 5px; gap: 10px;
            transition: background .15s;
        }
        .slip-row:hover { background: var(--hov); }
        .slip-name { font-size: 13px; font-weight: 600; color: var(--tx); }
        .slip-meta {
            font-size: 11px; color: var(--tx3);
            display: flex; align-items: center; gap: 6px; margin-top: 2px;
        }
        .slip-amt {
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px; font-weight: 700; color: var(--success);
            white-space: nowrap; flex-shrink: 0;
        }
        .stag {
            display: inline-block; font-size: 10px;
            padding: 2px 7px; border-radius: 5px; font-weight: 600;
        }
        .stag-s { background: var(--s-bg); color: var(--success); }
        .stag-d { background: var(--p-bg); color: var(--primary); }
        .stag-c { background: var(--w-bg); color: var(--warning); }

        /* ═══════════════════════════════════════════════════════
           REPORTS — Compact grouped list
           ═══════════════════════════════════════════════════════ */
        .rpt-group { margin-bottom: 14px; }
        .rpt-group:last-child { margin-bottom: 0; }
        .rpt-group-label {
            font-size: 10px; font-weight: 700; letter-spacing: .8px;
            text-transform: uppercase; color: var(--tx3);
            margin-bottom: 6px; padding-left: 2px;
        }
        .rpt-grid {
            display: grid;
            grid-template-columns: repeat(1, 1fr);
            gap: 4px;
        }
        @media(min-width:500px) { .rpt-grid { grid-template-columns: repeat(2, 1fr); } }

        .rpt-item {
            display: flex; align-items: center; gap: 8px;
            padding: 8px 10px; border-radius: 6px;
            text-decoration: none; color: var(--tx);
            font-size: 12px; font-weight: 500;
            transition: all .15s; cursor: pointer;
        }
        .rpt-item:hover {
            background: var(--hov); color: var(--primary);
        }
        .rpt-dot {
            width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
        }
        .rpt-item span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .rpt-footer {
            margin-top: 14px; padding-top: 14px;
            border-top: 1px solid var(--bd);
        }
        .rpt-footer-links { display: flex; gap: 6px; flex-wrap: wrap; }
        .rfl {
            padding: 5px 12px; border-radius: 6px;
            font-size: 11px; font-weight: 500;
            border: 1px solid var(--bd); background: var(--ibg);
            color: var(--tx2); text-decoration: none; transition: all .15s;
        }
        .rfl:hover { background: var(--hov); color: var(--tx); border-color: #cbd5e1; }

        /* ═══════════════════════════════════════════════════════
           SKELETON, EMPTY, ANIMATIONS
           ═══════════════════════════════════════════════════════ */
        .sk {
            background: linear-gradient(90deg, var(--ibg) 25%, var(--hov) 50%, var(--ibg) 75%);
            background-size: 200% 100%; animation: hsk 1.5s infinite;
            border-radius: 4px; color: transparent; user-select: none; display: inline-block;
        }
        @keyframes hsk { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        .empty {
            text-align: center; padding: 20px 16px;
            color: var(--tx3); font-size: 13px; font-weight: 500;
        }

        @keyframes hfd { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes hfu { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes hpop { from { transform: scale(.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        .hrd-sub { animation: hfd .35s ease both; }
        .hkpi { animation: hfd .35s .05s ease both; }
        .hmain { animation: hfu .4s .1s ease both; }
        .g2 { animation: hfu .4s .18s ease both; }
        .rpt-section { animation: hfu .4s .24s ease both; }
        .hpop { animation: hpop .25s ease both; }

        /* ═══════════════════════════════════════════════════════
           SCROLLBAR
           ═══════════════════════════════════════════════════════ */
        .hrd ::-webkit-scrollbar { width: 5px; height: 5px; }
        .hrd ::-webkit-scrollbar-track { background: transparent; }
        .hrd ::-webkit-scrollbar-thumb { background: var(--bd); border-radius: 99px; }

        /* ═══════════════════════════════════════════════════════
           DARK MODE ENHANCEMENTS
           ═══════════════════════════════════════════════════════ */
        html[data-theme="dark"] .kpi,
        html[data-theme="dark"] .sc {
            border-color: rgba(255,255,255,.06);
        }
        html[data-theme="dark"] .kpi:hover,
        html[data-theme="dark"] .sc:hover {
            border-color: rgba(255,255,255,.10);
        }
        html[data-theme="dark"] .dr,
        html[data-theme="dark"] .slip-row,
        html[data-theme="dark"] .att-row {
            border-color: rgba(255,255,255,.05);
        }
        html[data-theme="dark"] .qa-featured {
            background: linear-gradient(135deg, rgba(59,130,246,.10) 0%, rgba(59,130,246,.04) 100%);
            border-color: rgba(59,130,246,.20);
        }
        html[data-theme="dark"] .pulse-tabs {
            border-color: rgba(255,255,255,.06);
            background: rgba(255,255,255,.03);
        }
        html[data-theme="dark"] .pulse-tab.on {
            background: rgba(255,255,255,.08);
            box-shadow: 0 1px 3px rgba(0,0,0,.2);
        }

        /* body override for dark */
        [data-theme="dark"] .hrd {
            --shadow: 0 1px 3px rgba(0,0,0,.15), 0 1px 2px rgba(0,0,0,.1);
            --shadow-md: 0 4px 16px rgba(0,0,0,.25), 0 1px 3px rgba(0,0,0,.15);
        }
    `).appendTo('head');

    // ── HTML ──────────────────────────────────────────────────
    $(wrapper).find('.page-content').html(`
    <div class="hrd">

        <!-- Sub-header -->
        <div class="hrd-sub">
            <div class="hrd-sub-left">
                <div class="hrd-company-dot"></div>
                <p>CHAN RICH FRUITS (PVT) LTD &nbsp;·&nbsp; Real-time HR overview</p>
            </div>
            <div class="hrd-date" id="hrd-date">—</div>
        </div>

        <!-- ═══ KPI STRIP ═══ -->
        <div class="hkpi">
            <a class="kpi" href="/app/employee?status=Active" data-tip="View active employees">
                <div class="kpi-accent" style="background: var(--primary)"></div>
                <div class="klbl">Total Employees</div>
                <div class="knum" id="k-emp" style="color:var(--primary)"><span class="sk">00</span></div>
                <div class="ksub" id="k-emp-s">Active staff</div>
            </a>
            <a class="kpi" href="/app/attendance?attendance_date={today}&status=Present" data-tip="View today's attendance">
                <div class="kpi-accent" style="background: var(--success)"></div>
                <div class="klbl">Present Today</div>
                <div class="knum" id="k-pres" style="color:var(--success)"><span class="sk">00</span></div>
                <div class="ksub" id="k-pres-s">As of today</div>
            </a>
            <a class="kpi" href="/app/leave-application?status=Approved" data-tip="View approved leaves">
                <div class="kpi-accent" style="background: var(--warning)"></div>
                <div class="klbl">On Leave Today</div>
                <div class="knum" id="k-leave" style="color:var(--warning)"><span class="sk">00</span></div>
                <div class="ksub" id="k-leave-s">Approved today</div>
            </a>
            <a class="kpi" href="/app/employee-checkin" data-tip="View this month's checkins">
                <div class="kpi-accent" style="background: var(--primary)"></div>
                <div class="klbl">Checkins (Month)</div>
                <div class="knum" id="k-cin" style="color:var(--primary)"><span class="sk">00</span></div>
                <div class="ksub" id="k-cin-s">This month</div>
            </a>
            <a class="kpi" href="/app/salary-slip" data-tip="View salary slips this month">
                <div class="kpi-accent" style="background: var(--success)"></div>
                <div class="klbl">Salary Slips (Month)</div>
                <div class="knum" id="k-slip" style="color:var(--success)"><span class="sk">00</span></div>
                <div class="ksub" id="k-slip-s">This month</div>
            </a>
        </div>

        <!-- ═══ QUICK ACTIONS + REPORTS ═══ -->
        <div class="hmain">

            <!-- Quick Actions -->
            <div class="sc">
                <div class="sch">
                    <h2>Quick Actions</h2>
                </div>

                <a class="qa-featured" href="/desk/day-team-planner">
                    <div class="qa-i">📅</div>
                    <div class="qa-t">
                        <h4>Day Team Shift Planner</h4>
                        <p>Plan & assign daily shifts · Day Team</p>
                    </div>
                    <span class="qa-featured-badge">Day Team</span>
                    <span class="qa-arr">›</span>
                </a>

                <div class="qa-list">
                    <a class="qa" href="/desk/import-attendance">
                        <div class="qa-i" style="background:var(--p-bg)">📥</div>
                        <div class="qa-t"><h4>Import Attendance</h4><p>Upload fingerprint CSV</p></div>
                        <span class="qa-arr">›</span>
                    </a>
                    <a class="qa" href="/app/attendance/new">
                        <div class="qa-i" style="background:var(--s-bg)">✏️</div>
                        <div class="qa-t"><h4>Manual Attendance</h4><p>Mark single attendance</p></div>
                        <span class="qa-arr">›</span>
                    </a>
                    <a class="qa" href="/app/shift-assignment/new">
                        <div class="qa-i" style="background:var(--w-bg)">🕐</div>
                        <div class="qa-t"><h4>Assign Shift</h4><p>Set employee shift type</p></div>
                        <span class="qa-arr">›</span>
                    </a>

                    <div class="qa-divider"></div>

                    <a class="qa" href="/app/leave-application/new">
                        <div class="qa-i" style="background:var(--w-bg)">🌴</div>
                        <div class="qa-t"><h4>New Leave Application</h4><p>Apply for employee leave</p></div>
                        <span class="qa-arr">›</span>
                    </a>
                    <a class="qa" href="/app/auto-leave-dashboard">
                        <div class="qa-i" style="background:var(--p-bg)">🤖</div>
                        <div class="qa-t"><h4>Auto Leave Dashboard</h4><p>Review & assign auto-leaves</p></div>
                        <span class="qa-arr">›</span>
                    </a>
                    <a class="qa" href="/app/payroll-entry/new">
                        <div class="qa-i" style="background:var(--s-bg)">💵</div>
                        <div class="qa-t"><h4>New Payroll Entry</h4><p>Generate monthly salary slips</p></div>
                        <span class="qa-arr">›</span>
                    </a>

                    <div class="qa-divider"></div>

                    <a class="qa" href="/app/employee/new">
                        <div class="qa-i" style="background:var(--p-bg)">➕</div>
                        <div class="qa-t"><h4>Add Employee</h4><p>Onboard a new employee</p></div>
                        <span class="qa-arr">›</span>
                    </a>
                    <a class="qa" href="/app/employee">
                        <div class="qa-i" style="background:var(--p-bg)">👥</div>
                        <div class="qa-t"><h4>Employee List</h4><p>View & manage all employees</p></div>
                        <span class="qa-arr">›</span>
                    </a>
                </div>
            </div>

            <!-- ═══ REPORTS — Compact grouped list ═══ -->
            <div class="sc rpt-section">
                <div class="sch">
                    <h2>Reports</h2>
                    <a class="sclink" href="/app/report?module=HR">All Reports →</a>
                </div>

                <div class="rpt-group">
                    <div class="rpt-group-label">HR</div>
                    <div class="rpt-grid">
                        <a class="rpt-item" href="/app/employee?company=CHAN RICH FRUITS (PVT) LTD&status=Active">
                            <div class="rpt-dot" style="background:var(--primary)"></div><span>Employee Info</span>
                        </a>
                        <a class="rpt-item" href="/app/query-report/Employee Analytics">
                            <div class="rpt-dot" style="background:var(--primary)"></div><span>Analytics</span>
                        </a>
                        <a class="rpt-item" href="/app/query-report/Employee Leave Balance">
                            <div class="rpt-dot" style="background:var(--success)"></div><span>Leave Balance</span>
                        </a>
                        <a class="rpt-item" href="/app/query-report/Employee Leave Balance Summary">
                            <div class="rpt-dot" style="background:var(--success)"></div><span>Leave Summary</span>
                        </a>
                        <a class="rpt-item" href="/app/query-report/Employee Birthday">
                            <div class="rpt-dot" style="background:var(--warning)"></div><span>Birthdays</span>
                        </a>
                        <a class="rpt-item" href="/app/query-report/Employees working on a holiday">
                            <div class="rpt-dot" style="background:var(--warning)"></div><span>Holiday Work</span>
                        </a>
                        <a class="rpt-item" href="/app/query-report/Employee Hours Utilization Based On Timesheet">
                            <div class="rpt-dot" style="background:var(--primary)"></div><span>Hours Utilization</span>
                        </a>
                        <a class="rpt-item" href="/app/query-report/Leave Ledger">
                            <div class="rpt-dot" style="background:var(--success)"></div><span>Leave Ledger</span>
                        </a>
                        <a class="rpt-item" href="/app/query-report/Employee Exits">
                            <div class="rpt-dot" style="background:var(--danger)"></div><span>Employee Exits</span>
                        </a>
                    </div>
                </div>

                <div class="rpt-group">
                    <div class="rpt-group-label">Attendance</div>
                    <div class="rpt-grid">
                        <a class="rpt-item" href="/app/query-report/Monthly Attendance Sheet">
                            <div class="rpt-dot" style="background:var(--primary)"></div><span>Monthly Sheet</span>
                        </a>
                        <a class="rpt-item" href="/app/query-report/Shift Attendance">
                            <div class="rpt-dot" style="background:var(--warning)"></div><span>Shift Attendance</span>
                        </a>
                        <a class="rpt-item" href="/app/query-report/Employee Advance Summary">
                            <div class="rpt-dot" style="background:var(--success)"></div><span>Employee Advance</span>
                        </a>
                        <a class="rpt-item" href="/app/query-report/Unpaid Expense Claim">
                            <div class="rpt-dot" style="background:var(--danger)"></div><span>Unpaid Expenses</span>
                        </a>
                    </div>
                </div>

                <div class="rpt-group">
                    <div class="rpt-group-label">Payroll</div>
                    <div class="rpt-grid">
                        <a class="rpt-item" href="/app/query-report/Salary Register">
                            <div class="rpt-dot" style="background:var(--success)"></div><span>Salary Register</span>
                        </a>
                        <a class="rpt-item" href="/app/query-report/Salary Payments Based On Payment Mode">
                            <div class="rpt-dot" style="background:var(--primary)"></div><span>Salary Payments</span>
                        </a>
                        <a class="rpt-item" href="/app/query-report/Salary Payments via ECS">
                            <div class="rpt-dot" style="background:var(--primary)"></div><span>Payments via ECS</span>
                        </a>
                        <a class="rpt-item" href="/app/query-report/Bank Remittance">
                            <div class="rpt-dot" style="background:var(--primary)"></div><span>Bank Remittance</span>
                        </a>
                        <a class="rpt-item" href="/app/query-report/Income Tax Computation">
                            <div class="rpt-dot" style="background:var(--danger)"></div><span>Income Tax</span>
                        </a>
                        <a class="rpt-item" href="/app/query-report/Income Tax Deductions">
                            <div class="rpt-dot" style="background:var(--danger)"></div><span>Tax Deductions</span>
                        </a>
                        <a class="rpt-item" href="/app/query-report/Provident Fund Deductions">
                            <div class="rpt-dot" style="background:var(--success)"></div><span>Provident Fund</span>
                        </a>
                        <a class="rpt-item" href="/app/query-report/Accrued Earnings Report">
                            <div class="rpt-dot" style="background:var(--success)"></div><span>Accrued Earnings</span>
                        </a>
                    </div>
                </div>

                <div class="rpt-footer">
                    <div class="rpt-footer-links">
                        <a class="rfl" href="/app/department">Departments</a>
                        <a class="rfl" href="/app/designation">Designations</a>
                        <a class="rfl" href="/app/branch">Branches</a>
                        <a class="rfl" href="/app/employment-type">Emp. Types</a>
                        <a class="rfl" href="/app/holiday-list">Holiday Lists</a>
                        <a class="rfl" href="/app/attendance">All Attendance</a>
                        <a class="rfl" href="/app/employee-checkin">All Checkins</a>
                        <a class="rfl" href="/app/shift-assignment">Shift Assignments</a>
                        <a class="rfl" href="/app/shift-type">Shift Types</a>
                        <a class="rfl" href="/app/leave-application">Leave Applications</a>
                        <a class="rfl" href="/app/salary-slip">All Slips</a>
                        <a class="rfl" href="/app/payroll-entry">Payroll Entries</a>
                        <a class="rfl" href="/app/salary-structure">Structures</a>
                        <a class="rfl" href="/app/salary-component">Components</a>
                    </div>
                </div>
            </div>
        </div>

        <!-- ═══ ROW 2: This Month · Today's Pulse · Salary Slips · Birthdays ═══ -->
        <div class="g2">
            <div class="sc">
                <div class="sch">
                    <h2>This Month</h2>
                    <a class="sclink" href="/app/query-report/Monthly Attendance Sheet">View →</a>
                </div>
                <div class="att-row">
                    <div class="att-stat"><div class="av" id="ms-p" style="color:var(--success)"><span class="sk">0</span></div><div class="al">Present</div></div>
                    <div class="att-div"></div>
                    <div class="att-stat"><div class="av" id="ms-a" style="color:var(--danger)"><span class="sk">0</span></div><div class="al">Absent</div></div>
                    <div class="att-div"></div>
                    <div class="att-stat"><div class="av" id="ms-h" style="color:var(--warning)"><span class="sk">0</span></div><div class="al">Half Day</div></div>
                    <div class="att-div"></div>
                    <div class="att-stat"><div class="av" id="ms-l" style="color:var(--primary)"><span class="sk">0</span></div><div class="al">Leave</div></div>
                </div>
                <div class="rate-lbl"><span>Attendance rate</span><span id="ms-rate">—</span></div>
                <div class="rate-track"><div class="rate-fill" id="ms-bar"></div></div>
            </div>

            <!-- Today's Pulse -->
            <div class="sc">
                <div class="sch">
                    <h2>Today's Pulse</h2>
                </div>

                <div class="pulse-tabs">
                    <button class="pulse-tab on" data-pulse="checkins" onclick="hrdPulseTab('checkins')">
                        Recent Checkins
                    </button>
                    <button class="pulse-tab" data-pulse="leaves" onclick="hrdPulseTab('leaves')">
                        Pending Leaves
                    </button>
                </div>

                <div class="pulse-panel on" id="pp-checkins">
                    <div id="recent-ci" class="drow"><div class="empty">Loading...</div></div>
                    <div style="margin-top:10px; text-align:center;">
                        <a class="sclink" href="/app/employee-checkin">View All Checkins →</a>
                    </div>
                </div>

                <div class="pulse-panel" id="pp-leaves">
                    <div id="leave-list" class="drow"><div class="empty">Loading...</div></div>
                    <div style="margin-top:10px; text-align:center;">
                        <a class="sclink" href="/app/leave-application?status=Open">View All Leaves →</a>
                    </div>
                </div>
            </div>

            <div class="sc">
                <div class="sch">
                    <h2>Recent Salary Slips</h2>
                    <a class="sclink" href="/app/salary-slip">All →</a>
                </div>
                <div id="slip-list"><div class="empty">Loading...</div></div>
            </div>

            <div class="sc">
                <div class="sch">
                    <h2>Upcoming Birthdays</h2>
                    <a class="sclink" href="/app/query-report/Employee Birthday">All →</a>
                </div>
                <div id="bday-list" class="drow"><div class="empty">Loading...</div></div>
            </div>
        </div>

    </div>
    `);

    // ── Pulse Tab Switcher ────────────────────────────────────
    window.hrdPulseTab = function(tab) {
        document.querySelectorAll('.pulse-tab').forEach(t => t.classList.remove('on'));
        document.querySelectorAll('.pulse-panel').forEach(p => p.classList.remove('on'));
        const tabEl = document.querySelector(`[data-pulse="${tab}"]`);
        const panelEl = document.getElementById('pp-' + tab);
        if (tabEl) tabEl.classList.add('on');
        if (panelEl) panelEl.classList.add('on');
    };

    // ── Clock ─────────────────────────────────────────────────
    function tick() {
        const n = new Date();
        const t = n.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const d = n.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        const ce = $(wrapper).find('.hrd-toolbar-clock')[0];
        const de = document.getElementById('hrd-date');
        if (ce) ce.textContent = t;
        if (de) de.textContent = d;
    }
    tick();
    wrapper._hrd_clock_interval = setInterval(tick, 1000);

    // ── Helpers ───────────────────────────────────────────────
    const today  = frappe.datetime.get_today();
    const month  = today.substring(0, 7);
    const mStart = today.substring(0, 4) + '-' + today.substring(5, 7) + '-01';

    // Count-up animation
    function countUp(el, target, duration) {
        duration = duration || 800;
        const num = parseInt(target, 10);
        if (isNaN(num) || num === 0) { el.textContent = target; return; }
        const startTime = performance.now();
        function update(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            el.textContent = Math.round(num * eased);
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }

    function setK(id, val, sub) {
        const el = document.getElementById(id);
        if (!el) return;
        countUp(el, val);
        el.classList.add('hpop');
        setTimeout(() => el.classList.remove('hpop'), 350);
        const se = document.getElementById(id + '-s');
        if (se && sub) se.textContent = sub;
    }

    function setEl(id, val) {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = val;
            el.classList.add('hpop');
            setTimeout(() => el.classList.remove('hpop'), 350);
        }
    }

    // ── KPIs ──────────────────────────────────────────────────
    function loadKPIs() {
        frappe.call({
            method: 'frappe.client.get_count',
            args: { doctype: 'Employee', filters: { status: 'Active' } },
            callback: r => setK('k-emp', r.message || 0, 'Active staff')
        });
        frappe.call({
            method: 'frappe.client.get_count',
            args: { doctype: 'Attendance', filters: { attendance_date: today, status: 'Present', docstatus: 1 } },
            callback: r => setK('k-pres', r.message || 0, 'As of today')
        });
        frappe.call({
            method: 'frappe.client.get_count',
            args: { doctype: 'Attendance', filters: { attendance_date: today, status: 'On Leave', docstatus: 1 } },
            callback: r => setK('k-leave', r.message || 0, 'Approved today')
        });
        frappe.call({
            method: 'frappe.client.get_count',
            args: { doctype: 'Employee Checkin', filters: [['time', 'like', month + '%']] },
            callback: r => setK('k-cin', r.message || 0, 'This month')
        });
        frappe.call({
            method: 'frappe.client.get_count',
            args: { doctype: 'Salary Slip', filters: [['start_date', 'like', month + '%'], ['docstatus', '!=', 2]] },
            callback: r => setK('k-slip', r.message || 0, 'This month')
        });
    }

    // ── Month Stats ───────────────────────────────────────────
    async function loadMonthStats() {
        const map = { Present: 'ms-p', Absent: 'ms-a', 'Half Day': 'ms-h', 'On Leave': 'ms-l' };
        let p = 0, tot = 0;
        for (const [status, elId] of Object.entries(map)) {
            await new Promise(res => {
                frappe.call({
                    method: 'frappe.client.get_count',
                    args: { doctype: 'Attendance', filters: { attendance_date: ['>=', mStart], status, docstatus: 1 } },
                    callback: r => {
                        const v = r.message || 0;
                        setEl(elId, v);
                        if (status === 'Present') p = v;
                        if (status !== 'On Leave') tot += v;
                        res();
                    }
                });
            });
        }
        if (tot > 0) {
            const rate = Math.round((p / tot) * 100);
            setEl('ms-rate', rate + '%');
            setTimeout(() => {
                const b = document.getElementById('ms-bar');
                if (b) b.style.width = rate + '%';
            }, 500);
        }
    }

    // ── Recent Checkins ───────────────────────────────────────
    function loadCheckins() {
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Employee Checkin',
                fields: ['employee', 'employee_name', 'log_type', 'time'],
                order_by: 'time desc',
                limit_page_length: 6
            },
            callback: r => {
                const box = document.getElementById('recent-ci');
                if (!box) return;
                if (!r.message?.length) {
                    box.innerHTML = '<div class="empty">No recent checkins</div>';
                    return;
                }
                box.innerHTML = r.message.map(c => {
                    const isIn = c.log_type === 'IN';
                    const col = isIn ? 'var(--success)' : 'var(--danger)';
                    const bg = isIn ? 'var(--s-bg)' : 'var(--d-bg)';
                    return `<div class="dr">
                        <div class="dr-dot" style="background:${bg};color:${col};font-size:9px;font-weight:700">${c.log_type}</div>
                        <div class="dr-main">
                            <div class="dn">${c.employee_name || c.employee}</div>
                            <div class="ds">${c.employee} · ${c.time?.substring(5, 10) || '—'}</div>
                        </div>
                        <div class="dr-val" style="color:${col}">${c.time?.substring(11, 16) || '—'}</div>
                    </div>`;
                }).join('');
            }
        });
    }

    // ── Salary Slips ──────────────────────────────────────────
    function loadSlips() {
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Salary Slip',
                fields: ['name', 'employee_name', 'net_pay', 'start_date', 'docstatus'],
                order_by: 'modified desc',
                limit_page_length: 5
            },
            callback: r => {
                const box = document.getElementById('slip-list');
                if (!box) return;
                if (!r.message?.length) {
                    box.innerHTML = '<div class="empty">No salary slips yet.<br><a href="/app/payroll-entry/new" style="color:var(--primary)">Generate payroll →</a></div>';
                    return;
                }
                box.innerHTML = r.message.map(s => {
                    const st = s.docstatus == 1
                        ? '<span class="stag stag-s">Submitted</span>'
                        : s.docstatus == 2
                            ? '<span class="stag stag-c">Cancelled</span>'
                            : '<span class="stag stag-d">Draft</span>';
                    return `<div class="slip-row">
                        <div style="min-width:0;overflow:hidden">
                            <div class="slip-name">${s.employee_name || s.name}</div>
                            <div class="slip-meta">${s.start_date?.substring(0, 7) || '—'} ${st}</div>
                        </div>
                        <div class="slip-amt">${s.net_pay ? 'LKR ' + parseFloat(s.net_pay).toLocaleString() : '—'}</div>
                    </div>`;
                }).join('');
            }
        });
    }

    // ── Pending Leaves ────────────────────────────────────────
    function loadLeaves() {
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Leave Application',
                fields: ['employee_name', 'leave_type', 'from_date', 'to_date'],
                filters: { status: 'Open' },
                order_by: 'from_date asc',
                limit_page_length: 6
            },
            callback: r => {
                const box = document.getElementById('leave-list');
                if (!box) return;
                if (!r.message?.length) {
                    box.innerHTML = '<div class="empty">No pending leave applications 🎉</div>';
                    return;
                }
                box.innerHTML = r.message.map(l => {
                    const days = l.from_date && l.to_date
                        ? Math.round((new Date(l.to_date) - new Date(l.from_date)) / 86400000) + 1
                        : '?';
                    return `<div class="dr">
                        <div class="dr-dot" style="background:var(--w-bg);color:var(--warning)">🌴</div>
                        <div class="dr-main">
                            <div class="dn">${l.employee_name}</div>
                            <div class="ds">${l.leave_type} · ${l.from_date}</div>
                        </div>
                        <div class="dr-val" style="color:var(--warning)">${days}d</div>
                    </div>`;
                }).join('');
            }
        });
    }

    // ── Birthdays ─────────────────────────────────────────────
    function loadBirthdays() {
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Employee',
                fields: ['employee_name', 'date_of_birth', 'department'],
                filters: [['status', '=', 'Active'], ['date_of_birth', '!=', '']],
                limit_page_length: 200
            },
            callback: r => {
                const box = document.getElementById('bday-list');
                if (!box) return;
                const now = new Date();
                const upcoming = (r.message || []).filter(e => {
                    if (!e.date_of_birth) return false;
                    const bd = new Date(e.date_of_birth);
                    const next = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
                    if (next < now) next.setFullYear(now.getFullYear() + 1);
                    e._d = Math.ceil((next - now) / 86400000);
                    return e._d <= 30;
                }).sort((a, b) => a._d - b._d).slice(0, 5);

                if (!upcoming.length) {
                    box.innerHTML = '<div class="empty">No birthdays in next 30 days</div>';
                    return;
                }
                box.innerHTML = upcoming.map(e => {
                    const lbl = e._d === 0 ? '🎉 Today' : e._d === 1 ? 'Tomorrow' : 'In ' + e._d + 'd';
                    const col = e._d === 0 ? 'var(--success)' : e._d <= 3 ? 'var(--warning)' : 'var(--tx3)';
                    return `<div class="dr">
                        <div class="dr-dot" style="background:var(--p-bg);color:var(--primary)">🎂</div>
                        <div class="dr-main">
                            <div class="dn">${e.employee_name}</div>
                            <div class="ds">${e.department || '—'}</div>
                        </div>
                        <div class="dr-val" style="color:${col};font-size:11px">${lbl}</div>
                    </div>`;
                }).join('');
            }
        });
    }

    // ── Global Refresh ────────────────────────────────────────
    window.hrdRefresh = wrapper._hrdRefresh = function() {
        loadKPIs();
        loadMonthStats();
        loadCheckins();
        loadSlips();
        loadLeaves();
        loadBirthdays();
        frappe.show_alert({ message: 'Dashboard refreshed', indicator: 'green' });
    };

    // ── Init ──────────────────────────────────────────────────
    loadKPIs();
    loadMonthStats();
    loadCheckins();
    loadSlips();
    loadLeaves();
    loadBirthdays();
};

frappe.pages['hr-dashboard'].on_page_hide = function(wrapper) {
    if (wrapper._hrd_clock_interval) {
        clearInterval(wrapper._hrd_clock_interval);
        wrapper._hrd_clock_interval = null;
    }
};

