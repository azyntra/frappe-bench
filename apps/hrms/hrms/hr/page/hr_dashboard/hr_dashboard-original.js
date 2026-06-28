frappe.pages['hr-dashboard'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'HR Operations',
        single_column: false
    });

    document.title = 'HR Operations';

    if (!document.getElementById('hrd-font')) {
        const lnk = document.createElement('link');
        lnk.id = 'hrd-font'; lnk.rel = 'stylesheet';
        lnk.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap';
        document.head.appendChild(lnk);
    }

    $(wrapper).find('.hrd-toolbar-clock').remove();
    const clockEl = $(`<span class="hrd-toolbar-clock"
        style="font-family:'DM Mono',monospace;font-size:12px;
               color:var(--text-muted);margin-right:12px;letter-spacing:.3px;"></span>`);
    $(wrapper).find('.page-actions').prepend(clockEl);

    page.set_secondary_action('Refresh', () => wrapper._hrdRefresh && wrapper._hrdRefresh(), 'refresh');

    $('#hrd-styles').remove();
    $('<style id="hrd-styles">').text(`
        .hrd {
            --bg:    var(--bg-color, #f7f8fa);
            --card:  var(--card-bg, #ffffff);
            --bd:    var(--border-color, #e8eaed);
            --tx:    var(--text-color, #111827);
            --mu:    var(--text-muted, #6b7280);
            --lt:    var(--text-light, #9ca3af);
            --ibg:   var(--control-bg, #f9fafb);
            --hov:   var(--fg-hover-color, #f3f4f6);

            --blue:   #2563eb;
            --green:  #16a34a;
            --amber:  #d97706;
            --rose:   #dc2626;
            --violet: #7c3aed;
            --cyan:   #0891b2;
            --teal:   #0d9488;
            --slate:  #475569;

            --b10: rgba(37,99,235,.10);
            --g10: rgba(22,163,74,.10);
            --a10: rgba(217,119,6,.10);
            --r10: rgba(220,38,38,.10);
            --v10: rgba(124,58,237,.10);
            --c10: rgba(8,145,178,.10);
            --t10: rgba(13,148,136,.10);
        }
        .hrd * { box-sizing: border-box; }
        .hrd {
            font-family: 'DM Sans', sans-serif;
            background: var(--bg);
            min-height: 100vh;
            padding: 20px 18px 80px;
            color: var(--tx);
            font-size: 13px;
            line-height: 1.5;
        }

        /* Sub-header */
        .hrd-sub {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 6px;
        }
        .hrd-sub-left { display: flex; align-items: center; gap: 10px; }
        .hrd-company-dot {
            width: 8px; height: 8px; border-radius: 50%;
            background: var(--green); flex-shrink: 0;
            box-shadow: 0 0 0 3px rgba(22,163,74,.15);
        }
        .hrd-sub p { font-size: 12px; color: var(--mu); margin: 0; font-weight: 500; letter-spacing: .1px; }
        .hrd-date { font-size: 11px; color: var(--lt); font-family: 'DM Mono', monospace; white-space: nowrap; }

        /* KPI strip */
        .hkpi {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-bottom: 16px;
        }
        @media(min-width:500px){ .hkpi { grid-template-columns: repeat(3, 1fr); } }
        @media(min-width:900px){ .hkpi { grid-template-columns: repeat(5, 1fr); } }

        .kpi {
            background: var(--card);
            border: 1px solid var(--bd);
            border-radius: 10px;
            padding: 16px 14px 13px;
            position: relative;
            overflow: hidden;
            transition: box-shadow .18s, transform .18s;
        }
        .kpi:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,0,0,.07); }
        .kpi-accent {
            position: absolute; top: 0; left: 0; right: 0; height: 2px;
        }
        .kpi .klbl {
            font-size: 10px; font-weight: 600; letter-spacing: .6px;
            text-transform: uppercase; color: var(--lt); margin-bottom: 8px;
        }
        .kpi .knum {
            font-size: 28px; font-weight: 700; font-family: 'DM Mono', monospace;
            line-height: 1; letter-spacing: -1px; margin-bottom: 5px;
        }
        .kpi .ksub { font-size: 10px; color: var(--lt); }
        a.kpi { text-decoration: none; display: block; cursor: pointer; }
        a.kpi[data-tip]::after {
            content: attr(data-tip); position: absolute; bottom: calc(100% + 7px);
            left: 50%; transform: translateX(-50%) translateY(4px);
            background: var(--tx); color: var(--card);
            font-size: 10px; padding: 4px 9px; border-radius: 5px;
            white-space: nowrap; pointer-events: none; opacity: 0;
            transition: opacity .15s, transform .15s; z-index: 999;
            font-family: 'DM Sans', sans-serif;
        }
        a.kpi[data-tip]:hover::after { opacity: 1; transform: translateX(-50%) translateY(0); }

        /* Main 2-col */
        .hmain {
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
            margin-bottom: 14px;
        }
        @media(min-width:768px){ .hmain { grid-template-columns: 1.25fr 1fr; } }

        /* Section card */
        .sc {
            background: var(--card);
            border: 1px solid var(--bd);
            border-radius: 10px;
            padding: 16px;
        }
        .sch {
            display: flex; align-items: center;
            justify-content: space-between; margin-bottom: 12px;
        }
        .sch h2 {
            font-size: 12px; font-weight: 700; margin: 0;
            color: var(--tx); letter-spacing: .1px;
        }
        .sclink {
            font-size: 11px; color: var(--blue); font-weight: 600;
            cursor: pointer; text-decoration: none; transition: opacity .15s;
            padding: 3px 8px; border-radius: 5px;
            background: var(--b10);
        }
        .sclink:hover { opacity: .75; }

        /* Report Tabs */
        .rtabs {
            display: flex; gap: 4px; margin-bottom: 12px;
            border-bottom: 1px solid var(--bd); padding-bottom: 10px;
            flex-wrap: wrap;
        }
        .rtab {
            padding: 5px 12px; border-radius: 6px;
            font-size: 11px; font-weight: 600; cursor: pointer;
            border: 1px solid transparent; color: var(--mu);
            background: transparent; font-family: 'DM Sans', sans-serif;
            transition: all .15s;
        }
        .rtab:hover { background: var(--hov); color: var(--tx); }
        .rtab.on { background: var(--tx); color: var(--card); border-color: var(--tx); }
        .rtab-count {
            font-size: 9.5px; padding: 0 4px; border-radius: 99px;
            margin-left: 3px; font-weight: 700;
            background: rgba(255,255,255,.2); color: inherit;
        }
        .rtab:not(.on) .rtab-count { background: var(--bd); color: var(--lt); }

        /* Report grid */
        .rpanel { display: none; }
        .rpanel.on { display: block; }
        .rcgrid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
        }
        @media(min-width:480px){ .rcgrid { grid-template-columns: repeat(3, 1fr); } }

        .rc {
            border-radius: 8px; padding: 10px;
            cursor: pointer; transition: all .15s;
            border: 1px solid var(--bd); display: flex;
            align-items: center; gap: 8px; text-decoration: none;
            background: var(--ibg);
        }
        .rc:hover { background: var(--hov); border-color: #d1d5db; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,.06); }
        .rci {
            width: 28px; height: 28px; border-radius: 7px;
            display: flex; align-items: center; justify-content: center;
            font-size: 13px; flex-shrink: 0;
        }
        .rct h3 { font-size: 10.5px; font-weight: 600; margin: 0 0 1px; color: var(--tx); }
        .rct p { font-size: 9.5px; color: var(--lt); margin: 0; }

        /* color accents for rc */
        .rc-b .rci { background: var(--b10); }
        .rc-g .rci { background: var(--g10); }
        .rc-a .rci { background: var(--a10); }
        .rc-r .rci { background: var(--r10); }
        .rc-v .rci { background: var(--v10); }
        .rc-c .rci { background: var(--c10); }
        .rc-t .rci { background: var(--t10); }
        .rc-p .rci { background: rgba(219,39,119,.10); }
        .rc-o .rci { background: rgba(234,88,12,.10); }
        .rc-l .rci { background: rgba(101,163,13,.10); }

        /* Report footer links */
        .rpanel-footer { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--bd); }
        .rpanel-footer-links { display: flex; gap: 5px; flex-wrap: wrap; }
        .rfl {
            padding: 4px 10px; border-radius: 5px; font-size: 10.5px; font-weight: 500;
            border: 1px solid var(--bd); background: var(--ibg); color: var(--mu);
            text-decoration: none; transition: all .15s;
        }
        .rfl:hover { background: var(--hov); color: var(--tx); border-color: #d1d5db; }

        /* ── FEATURED action ───────────────────────────── */
        .qa-featured {
            display: flex; align-items: center; gap: 10px;
            padding: 12px 13px; border-radius: 8px; cursor: pointer;
            text-decoration: none; transition: all .15s;
            background: var(--ibg); border: 1px solid var(--bd);
            position: relative; overflow: hidden;
        }
        .qa-featured::before {
            content: ''; position: absolute; top: 0; left: 0;
            width: 3px; height: 100%;
            background: var(--blue);
        }
        .qa-featured:hover { background: var(--hov); border-color: var(--blue); box-shadow: 0 2px 10px rgba(37,99,235,.10); }
        .qa-featured .qa-i {
            width: 32px; height: 32px; border-radius: 8px;
            background: var(--b10); color: var(--blue);
            font-size: 15px; flex-shrink: 0;
            display: flex; align-items: center; justify-content: center;
        }
        .qa-featured .qa-t h4 { color: var(--blue); font-size: 12px; font-weight: 700; margin: 0 0 2px; }
        .qa-featured .qa-t p { color: var(--mu); font-size: 10px; margin: 0; }
        .qa-featured .qa-arr { color: var(--lt); font-size: 16px; margin-left: auto; flex-shrink: 0; }
        .qa-featured-badge {
            font-size: 9px; font-weight: 700;
            background: var(--b10); color: var(--blue);
            padding: 2px 7px; border-radius: 99px; white-space: nowrap;
            border: 1px solid rgba(37,99,235,.15); flex-shrink: 0;
        }

        /* QA Search */
        .qa-search { position: relative; margin-bottom: 10px; }
        .qa-search input {
            width: 100%; padding: 8px 11px 8px 32px; border-radius: 7px;
            border: 1px solid var(--bd); background: var(--ibg);
            font-family: 'DM Sans', sans-serif; font-size: 12px; color: var(--tx);
            outline: none; transition: border-color .15s;
        }
        .qa-search input:focus { border-color: var(--blue); background: var(--card); }
        .qa-search input::placeholder { color: var(--lt); }
        .qa-search-icon {
            position: absolute; left: 10px; top: 50%;
            transform: translateY(-50%); font-size: 12px;
            pointer-events: none; color: var(--lt);
        }

        /* QA Tabs */
        .qa-tabs {
            display: flex; gap: 3px; margin-bottom: 9px;
            border-bottom: 1px solid var(--bd); padding-bottom: 8px; flex-wrap: wrap;
        }
        .qa-tab {
            padding: 4px 10px; border-radius: 5px; font-size: 11px;
            font-weight: 600; cursor: pointer; border: 1px solid transparent;
            color: var(--mu); background: transparent;
            font-family: 'DM Sans', sans-serif; transition: all .15s;
        }
        .qa-tab:hover { background: var(--hov); color: var(--tx); }
        .qa-tab.on { background: var(--tx); color: var(--card); }
        .qa-tab-count {
            font-size: 9px; padding: 0 4px; border-radius: 99px;
            margin-left: 3px; font-weight: 700; background: rgba(255,255,255,.2);
        }
        .qa-tab:not(.on) .qa-tab-count { background: var(--bd); color: var(--lt); }

        /* QA Panel */
        .qa-panel { display: none; }
        .qa-panel.on { display: flex; flex-direction: column; gap: 5px; }

        /* Quick actions */
        .qa {
            display: flex; align-items: center; gap: 9px; padding: 9px 11px;
            border-radius: 8px; cursor: pointer; border: 1px solid var(--bd);
            background: var(--ibg); transition: all .15s; text-decoration: none;
        }
        .qa:hover { background: var(--hov); border-color: #d1d5db; }
        .qa-i {
            width: 28px; height: 28px; border-radius: 7px;
            display: flex; align-items: center; justify-content: center;
            font-size: 13px; flex-shrink: 0;
        }
        .qa-t { flex: 1; min-width: 0; }
        .qa-t h4 { font-size: 11.5px; font-weight: 600; margin: 0; color: var(--tx); }
        .qa-t p { font-size: 10px; color: var(--mu); margin: 0; }
        .qa-arr { color: var(--lt); font-size: 15px; flex-shrink: 0; }
        .qa.qa-new { border-style: dashed; }

        /* 3-col grid */
        .g3 {
            display: grid; grid-template-columns: 1fr;
            gap: 12px; margin-bottom: 12px;
        }
        @media(min-width:640px){ .g3 { grid-template-columns: repeat(2,1fr); } }
        @media(min-width:960px){ .g3 { grid-template-columns: repeat(3,1fr); } }
        .g3-full { display: grid; grid-template-columns: 1fr; gap: 12px; margin-bottom: 12px; }

        /* Data rows */
        .drow { display: flex; flex-direction: column; gap: 4px; }
        .dr {
            display: flex; align-items: center; gap: 8px; padding: 8px 10px;
            border-radius: 7px; background: var(--ibg); border: 1px solid var(--bd);
            transition: background .13s;
        }
        .dr:hover { background: var(--hov); }
        .dr-dot {
            width: 24px; height: 24px; border-radius: 6px;
            display: flex; align-items: center; justify-content: center;
            font-size: 10px; font-weight: 700; flex-shrink: 0;
        }
        .dr-main { flex: 1; min-width: 0; }
        .dn { font-size: 11.5px; font-weight: 600; color: var(--tx); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ds { font-size: 10px; color: var(--lt); }
        .dr-val { font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
        a.dr { cursor: pointer; text-decoration: none; }

        /* This Month stats */
        .att-row {
            display: flex; justify-content: space-between;
            align-items: center; margin-bottom: 10px; gap: 4px;
            background: var(--ibg); border: 1px solid var(--bd);
            border-radius: 8px; padding: 10px 8px;
        }
        .att-stat { text-align: center; flex: 1; }
        .att-stat .av { font-size: 20px; font-weight: 700; font-family: 'DM Mono', monospace; }
        .att-stat .al { font-size: 9px; color: var(--lt); font-weight: 600; text-transform: uppercase; letter-spacing: .5px; margin-top: 2px; }
        .att-div { width: 1px; height: 30px; background: var(--bd); flex-shrink: 0; }

        .rate-lbl { display: flex; justify-content: space-between; font-size: 10.5px; color: var(--lt); margin-bottom: 5px; margin-top: 8px; }
        .rate-track { background: var(--bd); border-radius: 99px; height: 4px; overflow: hidden; }
        .rate-fill { height: 4px; background: var(--green); border-radius: 99px; width: 0%; transition: width 1s ease; }

        /* Salary slips */
        .slip-row {
            display: flex; align-items: center; justify-content: space-between;
            padding: 8px 10px; border-radius: 7px; background: var(--ibg);
            border: 1px solid var(--bd); margin-bottom: 5px; gap: 8px;
        }
        .slip-name { font-size: 11.5px; font-weight: 600; color: var(--tx); }
        .slip-meta { font-size: 10px; color: var(--lt); display: flex; align-items: center; gap: 5px; margin-top: 2px; }
        .slip-amt { font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 700; color: var(--green); white-space: nowrap; flex-shrink: 0; }
        .stag { display: inline-block; font-size: 9px; padding: 1px 6px; border-radius: 4px; font-weight: 600; }
        .stag-s { background: var(--g10); color: var(--green); }
        .stag-d { background: var(--b10); color: var(--blue); }
        .stag-c { background: var(--a10); color: var(--amber); }

        /* Salary Components */
        .comp-row {
            display: flex; align-items: center; justify-content: space-between;
            padding: 7px 10px; border-radius: 7px; background: var(--ibg);
            border: 1px solid var(--bd); margin-bottom: 4px; gap: 8px;
        }
        .comp-name { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: var(--tx); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .comp-type { font-size: 9.5px; padding: 1px 7px; border-radius: 4px; font-weight: 600; flex-shrink: 0; }
        .ct-e { background: var(--g10); color: var(--green); }
        .ct-d { background: var(--r10); color: var(--rose); }

        /* Shift Type cards */
        .shift-grid {
            display: grid; grid-template-columns: repeat(2,1fr); gap: 7px;
        }
        @media(min-width:500px){ .shift-grid { grid-template-columns: repeat(3,1fr); } }
        @media(min-width:900px){ .shift-grid { grid-template-columns: repeat(4,1fr); } }

        .shift-card {
            border-radius: 8px; padding: 10px 11px; border: 1px solid var(--bd);
            background: var(--ibg); display: flex; flex-direction: column; gap: 3px;
            transition: all .15s; cursor: pointer; text-decoration: none; min-width: 0;
        }
        .shift-card:hover { background: var(--hov); border-color: #d1d5db; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
        .shift-card-top { display: flex; align-items: center; gap: 6px; min-width: 0; }
        .shift-icon {
            width: 24px; height: 24px; border-radius: 6px;
            display: flex; align-items: center; justify-content: center;
            font-size: 12px; flex-shrink: 0; background: var(--c10);
        }
        .shift-name { font-size: 11px; font-weight: 700; color: var(--tx); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
        .shift-time { font-size: 9.5px; color: var(--lt); font-family: 'DM Mono', monospace; }
        .shift-badge { display: inline-block; font-size: 9px; padding: 1px 6px; border-radius: 4px; font-weight: 600; margin-top: 2px; }
        .sb-day   { background: var(--b10); color: var(--blue); }
        .sb-night { background: var(--v10); color: var(--violet); }
        .sb-eve   { background: var(--a10); color: var(--amber); }
        .sb-gen   { background: var(--c10); color: var(--cyan); }

        /* Section divider */
        .hrd-divider { height: 1px; background: var(--bd); margin: 0 0 14px; opacity: .5; }

        /* Skeleton */
        .sk {
            background: linear-gradient(90deg, var(--ibg) 25%, var(--hov) 50%, var(--ibg) 75%);
            background-size: 200% 100%; animation: hsk 1.5s infinite;
            border-radius: 4px; color: transparent; user-select: none; display: inline-block;
        }
        @keyframes hsk { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        .empty { text-align: center; padding: 16px; color: var(--lt); font-size: 11.5px; }

        /* Animations */
        @keyframes hfd { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes hfu { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes hpop { from { transform: scale(.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .hrd-sub, .hkpi { animation: hfd .3s ease both; }
        .hmain { animation: hfu .3s .08s ease both; }
        .g3:nth-of-type(1) { animation: hfu .3s .14s ease both; }
        .g3:nth-of-type(2) { animation: hfu .3s .2s ease both; }
        .g3-full { animation: hfu .3s .25s ease both; }
        .hpop { animation: hpop .2s ease both; }

        /* Scrollbar */
        .hrd ::-webkit-scrollbar { width: 4px; height: 4px; }
        .hrd ::-webkit-scrollbar-track { background: transparent; }
        .hrd ::-webkit-scrollbar-thumb { background: var(--bd); border-radius: 99px; }
    `).appendTo('head');

    // ── HTML ──────────────────────────────────────────────────
    $(wrapper).find('.page-content').html(`
    <div class="hrd">

        <div class="hrd-sub">
            <div class="hrd-sub-left">
                <div class="hrd-company-dot"></div>
                <p>CHAN RICH FRUITS (PVT) LTD &nbsp;·&nbsp; Real-time HR overview</p>
            </div>
            <div class="hrd-date" id="hrd-date">—</div>
        </div>

        <!-- KPIs -->
        <div class="hkpi">
            <a class="kpi" href="/app/employee?status=Active" data-tip="View active employees">
                <div class="kpi-accent" style="background: var(--blue)"></div>
                <div class="klbl">Total Employees</div>
                <div class="knum" id="k-emp" style="color:var(--blue)"><span class="sk">00</span></div>
                <div class="ksub" id="k-emp-s">Active staff</div>
            </a>
            <a class="kpi" href="/app/attendance?attendance_date={today}&status=Present" data-tip="View today's attendance">
                <div class="kpi-accent" style="background: var(--green)"></div>
                <div class="klbl">Present Today</div>
                <div class="knum" id="k-pres" style="color:var(--green)"><span class="sk">00</span></div>
                <div class="ksub" id="k-pres-s">As of today</div>
            </a>
            <a class="kpi" href="/app/leave-application?status=Approved" data-tip="View approved leaves">
                <div class="kpi-accent" style="background: var(--amber)"></div>
                <div class="klbl">On Leave Today</div>
                <div class="knum" id="k-leave" style="color:var(--amber)"><span class="sk">00</span></div>
                <div class="ksub" id="k-leave-s">Approved today</div>
            </a>
            <a class="kpi" href="/app/employee-checkin" data-tip="View this month's checkins">
                <div class="kpi-accent" style="background: var(--violet)"></div>
                <div class="klbl">Checkins (Month)</div>
                <div class="knum" id="k-cin" style="color:var(--violet)"><span class="sk">00</span></div>
                <div class="ksub" id="k-cin-s">This month</div>
            </a>
            <a class="kpi" href="/app/salary-slip" data-tip="View salary slips this month">
                <div class="kpi-accent" style="background: var(--teal)"></div>
                <div class="klbl">Salary Slips (Month)</div>
                <div class="knum" id="k-slip" style="color:var(--teal)"><span class="sk">00</span></div>
                <div class="ksub" id="k-slip-s">This month</div>
            </a>
        </div>

        <!-- Reports + Quick Actions -->
        <div class="hmain">
            <div class="sc">
                <div class="sch">
                    <h2>Reports</h2>
                    <a class="sclink" href="/app/report?module=HR">All Reports →</a>
                </div>

                <div class="rtabs">
                    <button class="rtab on" data-tab="hr" onclick="hrdTab('hr')">
                        HR <span class="rtab-count">9</span>
                    </button>
                    <button class="rtab" data-tab="attend" onclick="hrdTab('attend')">
                        Attendance <span class="rtab-count">4</span>
                    </button>
                    <button class="rtab" data-tab="payroll" onclick="hrdTab('payroll')">
                        Payroll <span class="rtab-count">8</span>
                    </button>
                </div>

                <div class="rpanel on" id="rpanel-hr">
                    <div class="rcgrid">
                        <a class="rc rc-b" href="/app/employee?company=CHAN RICH FRUITS (PVT) LTD&status=Active">
                            <div class="rci">🧑‍💼</div>
                            <div class="rct"><h3>Employee Info</h3><p>Employee master</p></div>
                        </a>
                        <a class="rc rc-v" href="/app/query-report/Employee Analytics">
                            <div class="rci">📈</div>
                            <div class="rct"><h3>Analytics</h3><p>Trends & headcount</p></div>
                        </a>
                        <a class="rc rc-g" href="/app/query-report/Employee Leave Balance">
                            <div class="rci">🌴</div>
                            <div class="rct"><h3>Leave Balance</h3><p>Remaining leave</p></div>
                        </a>
                        <a class="rc rc-a" href="/app/query-report/Employee Leave Balance Summary">
                            <div class="rci">📋</div>
                            <div class="rct"><h3>Leave Summary</h3><p>Dept-wise leave</p></div>
                        </a>
                        <a class="rc rc-p" href="/app/query-report/Employee Birthday">
                            <div class="rci">🎂</div>
                            <div class="rct"><h3>Birthdays</h3><p>Upcoming birthdays</p></div>
                        </a>
                        <a class="rc rc-t" href="/app/query-report/Employees working on a holiday">
                            <div class="rci">🏢</div>
                            <div class="rct"><h3>Holiday Work</h3><p>Employees on holidays</p></div>
                        </a>
                        <a class="rc rc-o" href="/app/query-report/Employee Hours Utilization Based On Timesheet">
                            <div class="rci">⏱️</div>
                            <div class="rct"><h3>Hours Utilization</h3><p>Working hours</p></div>
                        </a>
                        <a class="rc rc-l" href="/app/query-report/Leave Ledger">
                            <div class="rci">📖</div>
                            <div class="rct"><h3>Leave Ledger</h3><p>Leave transactions</p></div>
                        </a>
                        <a class="rc rc-c" href="/app/query-report/Employee Exits">
                            <div class="rci">🚪</div>
                            <div class="rct"><h3>Employee Exits</h3><p>Resignations</p></div>
                        </a>
                    </div>
                    <div class="rpanel-footer">
                        <div class="rpanel-footer-links">
                            <a class="rfl" href="/app/department">Departments</a>
                            <a class="rfl" href="/app/designation">Designations</a>
                            <a class="rfl" href="/app/branch">Branches</a>
                            <a class="rfl" href="/app/employment-type">Emp. Types</a>
                            <a class="rfl" href="/app/holiday-list">Holiday Lists</a>
                        </div>
                    </div>
                </div>

                <div class="rpanel" id="rpanel-attend">
                    <div class="rcgrid">
                        <a class="rc rc-b" href="/app/query-report/Monthly Attendance Sheet">
                            <div class="rci">📅</div>
                            <div class="rct"><h3>Monthly Sheet</h3><p>Full attendance grid</p></div>
                        </a>
                        <a class="rc rc-a" href="/app/query-report/Shift Attendance">
                            <div class="rci">🔄</div>
                            <div class="rct"><h3>Shift Attendance</h3><p>By shift type</p></div>
                        </a>
                        <a class="rc rc-g" href="/app/query-report/Employee Advance Summary">
                            <div class="rci">💼</div>
                            <div class="rct"><h3>Employee Advance</h3><p>Advance summary</p></div>
                        </a>
                        <a class="rc rc-o" href="/app/query-report/Unpaid Expense Claim">
                            <div class="rci">🧾</div>
                            <div class="rct"><h3>Unpaid Expenses</h3><p>Pending claims</p></div>
                        </a>
                    </div>
                    <div class="rpanel-footer">
                        <div class="rpanel-footer-links">
                            <a class="rfl" href="/app/attendance">All Attendance</a>
                            <a class="rfl" href="/app/employee-checkin">All Checkins</a>
                            <a class="rfl" href="/app/shift-assignment">Shift Assignments</a>
                            <a class="rfl" href="/app/leave-application">Leave Applications</a>
                        </div>
                    </div>
                </div>

                <div class="rpanel" id="rpanel-payroll">
                    <div class="rcgrid">
                        <a class="rc rc-g" href="/app/query-report/Salary Register">
                            <div class="rci">💰</div>
                            <div class="rct"><h3>Salary Register</h3><p>All slips summary</p></div>
                        </a>
                        <a class="rc rc-c" href="/app/query-report/Salary Payments Based On Payment Mode">
                            <div class="rci">🏦</div>
                            <div class="rct"><h3>Salary Payments</h3><p>Payment mode</p></div>
                        </a>
                        <a class="rc rc-v" href="/app/query-report/Salary Payments via ECS">
                            <div class="rci">💳</div>
                            <div class="rct"><h3>Payments via ECS</h3><p>Bank transfers</p></div>
                        </a>
                        <a class="rc rc-b" href="/app/query-report/Bank Remittance">
                            <div class="rci">🏛️</div>
                            <div class="rct"><h3>Bank Remittance</h3><p>Remittance report</p></div>
                        </a>
                        <a class="rc rc-r" href="/app/query-report/Income Tax Computation">
                            <div class="rci">📊</div>
                            <div class="rct"><h3>Income Tax</h3><p>Tax computation</p></div>
                        </a>
                        <a class="rc rc-a" href="/app/query-report/Income Tax Deductions">
                            <div class="rci">🧾</div>
                            <div class="rct"><h3>Tax Deductions</h3><p>Monthly TDS</p></div>
                        </a>
                        <a class="rc rc-t" href="/app/query-report/Provident Fund Deductions">
                            <div class="rci">🏦</div>
                            <div class="rct"><h3>Provident Fund</h3><p>PF deductions</p></div>
                        </a>
                        <a class="rc rc-p" href="/app/query-report/Accrued Earnings Report">
                            <div class="rci">📈</div>
                            <div class="rct"><h3>Accrued Earnings</h3><p>Accrued salary</p></div>
                        </a>
                    </div>
                    <div class="rpanel-footer">
                        <div class="rpanel-footer-links">
                            <a class="rfl" href="/app/salary-slip">All Slips</a>
                            <a class="rfl" href="/app/payroll-entry">Payroll Entries</a>
                            <a class="rfl" href="/app/salary-structure">Structures</a>
                            <a class="rfl" href="/app/salary-component">Components</a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="sc">
                <div class="sch">
                    <h2>Quick Actions</h2>
                </div>

                <a class="qa-featured" href="/desk/day-team-planner" data-qa="Day Team Shift Planner schedule monthly shifts day team">
                    <div class="qa-i">📅</div>
                    <div class="qa-t">
                        <h4>Day Team Shift Planner</h4>
                        <p>Plan & assign daily shifts · Day Team</p>
                    </div>
                    <span class="qa-featured-badge">Day Team</span>
                    <span class="qa-arr">›</span>
                </a>

                <div style="margin: 10px 0 8px; border-top: 1px solid var(--bd)"></div>

                <div class="qa-search">
                    <span class="qa-search-icon">🔍</span>
                    <input type="text" placeholder="Search actions..." id="qa-filter" oninput="hrdFilterQA(this.value)">
                </div>

                <div class="qa-tabs" id="qa-tabs">
                    <button class="qa-tab on" data-qa-tab="attendance" onclick="hrdQATab('attendance')">
                        Attendance <span class="qa-tab-count">3</span>
                    </button>
                    <button class="qa-tab" data-qa-tab="payroll" onclick="hrdQATab('payroll')">
                        Payroll <span class="qa-tab-count">4</span>
                    </button>
                    <button class="qa-tab" data-qa-tab="employee" onclick="hrdQATab('employee')">
                        Employee <span class="qa-tab-count">4</span>
                    </button>
                    <button class="qa-tab" data-qa-tab="leave" onclick="hrdQATab('leave')">
                        Leave <span class="qa-tab-count">2</span>
                    </button>
                </div>

                <div class="qa-panel on" id="qap-attendance">
                    <a class="qa" href="/desk/import-attendance" data-qa="Import Attendance fingerprint CSV">
                        <div class="qa-i" style="background:var(--b10)">🖐</div>
                        <div class="qa-t"><h4>Import Attendance</h4><p>Upload fingerprint CSV</p></div><span class="qa-arr">›</span>
                    </a>
                    <a class="qa" href="/app/attendance/new" data-qa="Manual Attendance mark single">
                        <div class="qa-i" style="background:var(--c10)">📝</div>
                        <div class="qa-t"><h4>Manual Attendance</h4><p>Mark single attendance</p></div><span class="qa-arr">›</span>
                    </a>
                    <a class="qa" href="/app/shift-assignment/new" data-qa="Assign Shift employee shift type">
                        <div class="qa-i" style="background:var(--r10)">🕐</div>
                        <div class="qa-t"><h4>Assign Shift</h4><p>Set employee shift type</p></div><span class="qa-arr">›</span>
                    </a>
                </div>

                <div class="qa-panel" id="qap-payroll">
                    <a class="qa" href="/app/payroll-entry/new" data-qa="New Payroll Entry generate salary slips">
                        <div class="qa-i" style="background:var(--g10)">💵</div>
                        <div class="qa-t"><h4>New Payroll Entry</h4><p>Generate monthly salary slips</p></div><span class="qa-arr">›</span>
                    </a>
                    <a class="qa" href="/app/salary-slip" data-qa="View Salary Slips browse all slips">
                        <div class="qa-i" style="background:var(--t10)">💳</div>
                        <div class="qa-t"><h4>View Salary Slips</h4><p>Browse all salary slips</p></div><span class="qa-arr">›</span>
                    </a>
                    <a class="qa" href="/app/salary-structure/new" data-qa="New Salary Structure create">
                        <div class="qa-i" style="background:var(--t10)">📄</div>
                        <div class="qa-t"><h4>New Salary Structure</h4><p>Create salary structure</p></div><span class="qa-arr">›</span>
                    </a>
                    <a class="qa" href="/app/salary-structure-assignment/new" data-qa="Assign Salary Structure link employee">
                        <div class="qa-i" style="background:rgba(101,163,13,.10)">🔗</div>
                        <div class="qa-t"><h4>Assign Salary Structure</h4><p>Link structure to employee</p></div><span class="qa-arr">›</span>
                    </a>
                </div>

                <div class="qa-panel" id="qap-employee">
                    <a class="qa" href="/app/employee/new" data-qa="Add Employee onboard new">
                        <div class="qa-i" style="background:var(--v10)">➕</div>
                        <div class="qa-t"><h4>Add Employee</h4><p>Onboard a new employee</p></div><span class="qa-arr">›</span>
                    </a>
                    <a class="qa" href="/app/employee" data-qa="Employee List view all employees">
                        <div class="qa-i" style="background:var(--b10)">👥</div>
                        <div class="qa-t"><h4>Employee List</h4><p>View & manage all employees</p></div><span class="qa-arr">›</span>
                    </a>
                    <a class="qa" href="/app/employee-promotion/new" data-qa="Employee Promotion appraisal">
                        <div class="qa-i" style="background:var(--a10)">🏆</div>
                        <div class="qa-t"><h4>Employee Promotion</h4><p>Process a promotion</p></div><span class="qa-arr">›</span>
                    </a>
                    <a class="qa" href="/app/exit-interview/new" data-qa="Exit Interview offboarding resign">
                        <div class="qa-i" style="background:var(--r10)">🚪</div>
                        <div class="qa-t"><h4>Exit Interview</h4><p>Record employee offboarding</p></div><span class="qa-arr">›</span>
                    </a>
                </div>

                <div class="qa-panel" id="qap-leave">
                    <a class="qa" href="/app/leave-application/new" data-qa="New Leave Application apply employee leave">
                        <div class="qa-i" style="background:var(--a10)">🌴</div>
                        <div class="qa-t"><h4>New Leave Application</h4><p>Apply for employee leave</p></div><span class="qa-arr">›</span>
                    </a>
                    <a class="qa" href="/app/leave-allocation/new" data-qa="Leave Allocation allocate annual entitlement">
                        <div class="qa-i" style="background:var(--g10)">📋</div>
                        <div class="qa-t"><h4>Leave Allocation</h4><p>Allocate annual entitlement</p></div><span class="qa-arr">›</span>
                    </a>
                </div>
            </div>
        </div>

        <!-- Row 2 -->
        <div class="g3">
            <div class="sc">
                <div class="sch">
                    <h2>This Month</h2>
                    <a class="sclink" href="/app/query-report/Monthly Attendance Sheet">View →</a>
                </div>
                <div class="att-row">
                    <div class="att-stat"><div class="av" id="ms-p" style="color:var(--green)"><span class="sk">0</span></div><div class="al">Present</div></div>
                    <div class="att-div"></div>
                    <div class="att-stat"><div class="av" id="ms-a" style="color:var(--rose)"><span class="sk">0</span></div><div class="al">Absent</div></div>
                    <div class="att-div"></div>
                    <div class="att-stat"><div class="av" id="ms-h" style="color:var(--amber)"><span class="sk">0</span></div><div class="al">Half Day</div></div>
                    <div class="att-div"></div>
                    <div class="att-stat"><div class="av" id="ms-l" style="color:var(--violet)"><span class="sk">0</span></div><div class="al">Leave</div></div>
                </div>
                <div class="rate-lbl"><span>Attendance rate</span><span id="ms-rate">—</span></div>
                <div class="rate-track"><div class="rate-fill" id="ms-bar"></div></div>
                <div style="margin-top:14px">
                    <div class="sch" style="margin-bottom:7px">
                        <h2 style="font-size:11px;font-weight:600;color:var(--mu)">Recent Check-in / Out</h2>
                        <a class="sclink" href="/app/employee-checkin">All →</a>
                    </div>
                    <div id="recent-ci" class="drow"><div class="empty">Loading...</div></div>
                </div>
            </div>

            <div class="sc">
                <div class="sch">
                    <h2>Salary Components</h2>
                    <a class="sclink" href="/app/salary-component">Manage →</a>
                </div>
                <div style="margin-bottom:8px;display:flex;gap:5px;flex-wrap:wrap">
                    <span id="sc-ec" style="font-size:10.5px;background:var(--g10);color:var(--green);padding:2px 9px;border-radius:4px;font-weight:600">— Earnings</span>
                    <span id="sc-dc" style="font-size:10.5px;background:var(--r10);color:var(--rose);padding:2px 9px;border-radius:4px;font-weight:600">— Deductions</span>
                </div>
                <div id="comp-list"><div class="empty">Loading...</div></div>
                <a class="qa qa-new" href="/app/salary-component/new" style="margin-top:8px">
                    <div class="qa-i" style="background:var(--g10)">＋</div>
                    <div class="qa-t"><h4>Add Salary Component</h4><p>Create earning or deduction</p></div>
                </a>
            </div>

            <div class="sc">
                <div class="sch">
                    <h2>Recent Salary Slips</h2>
                    <a class="sclink" href="/app/salary-slip">All →</a>
                </div>
                <div id="slip-list"><div class="empty">Loading...</div></div>
                <a class="qa qa-new" href="/app/payroll-entry/new" style="margin-top:8px">
                    <div class="qa-i" style="background:var(--g10)">💵</div>
                    <div class="qa-t"><h4>Generate Payroll</h4><p>Create salary slips for month</p></div>
                </a>
            </div>
        </div>

        <!-- Row 3 -->
        <div class="g3">
            <div class="sc">
                <div class="sch">
                    <h2>Pending Leaves</h2>
                    <a class="sclink" href="/app/leave-application?status=Open">All →</a>
                </div>
                <div id="leave-list" class="drow"><div class="empty">Loading...</div></div>
            </div>
            <div class="sc">
                <div class="sch">
                    <h2>Upcoming Birthdays</h2>
                    <a class="sclink" href="/app/query-report/Employee Birthday">All →</a>
                </div>
                <div id="bday-list" class="drow"><div class="empty">Loading...</div></div>
            </div>
            <div class="sc">
                <div class="sch">
                    <h2>Salary Structures</h2>
                    <a class="sclink" href="/app/salary-structure">Manage →</a>
                </div>
                <div id="struct-list"><div class="empty">Loading...</div></div>
                <a class="qa qa-new" href="/app/salary-structure/new" style="margin-top:8px">
                    <div class="qa-i" style="background:var(--b10)">＋</div>
                    <div class="qa-t"><h4>New Salary Structure</h4><p>Create structure for employees</p></div>
                </a>
            </div>
        </div>

        <!-- Row 4 — Shift Types -->
        <div class="g3-full">
            <div class="sc">
                <div class="sch">
                    <h2>Shift Types</h2>
                    <a class="sclink" href="/app/shift-type">Manage →</a>
                </div>
                <div id="shift-grid" class="shift-grid"><div class="empty">Loading...</div></div>
                <a class="qa qa-new" href="/app/shift-type/new" style="margin-top:8px">
                    <div class="qa-i" style="background:var(--c10)">＋</div>
                    <div class="qa-t"><h4>New Shift Type</h4><p>Define a new work shift</p></div>
                </a>
            </div>
        </div>

    </div>
    `);

    // ── Tab switcher (Reports) ────────────────────────────────
    window.hrdTab = function(tab) {
        document.querySelectorAll('.rtab').forEach(t => t.classList.remove('on'));
        document.querySelectorAll('.rpanel').forEach(p => p.classList.remove('on'));
        const tabEl = document.querySelector(`[data-tab="${tab}"]`);
        const panelEl = document.getElementById('rpanel-' + tab);
        if(tabEl) tabEl.classList.add('on');
        if(panelEl) panelEl.classList.add('on');
    };

    // ── Quick Actions tab switcher ────────────────────────────
    window.hrdQATab = function(tab) {
        const filterVal = (document.getElementById('qa-filter')||{}).value || '';
        if(filterVal.trim()) return;
        document.querySelectorAll('.qa-tab').forEach(t => t.classList.remove('on'));
        document.querySelectorAll('.qa-panel').forEach(p => p.classList.remove('on'));
        const tabEl = document.querySelector(`[data-qa-tab="${tab}"]`);
        const panelEl = document.getElementById('qap-' + tab);
        if(tabEl) tabEl.classList.add('on');
        if(panelEl) panelEl.classList.add('on');
    };

    // ── Quick Actions search filter ───────────────────────────
    window.hrdFilterQA = function(val) {
        const q = val.trim().toLowerCase();
        if(!q) {
            document.querySelectorAll('.qa-tabs').forEach(t => t.style.display='');
            document.querySelectorAll('.qa-panel').forEach(p => { p.classList.remove('on'); p.style.display=''; });
            const activeTab = document.querySelector('.qa-tab.on');
            const activeTabId = activeTab ? activeTab.getAttribute('data-qa-tab') : 'attendance';
            const activePanel = document.getElementById('qap-' + activeTabId);
            if(activePanel) activePanel.classList.add('on');
            const featured = document.querySelector('.qa-featured');
            if(featured) featured.style.display = '';
            const featuredDivider = featured ? featured.nextElementSibling : null;
            if(featuredDivider) featuredDivider.style.display = '';
            return;
        }
        document.querySelectorAll('.qa-tabs').forEach(t => t.style.display='none');
        document.querySelectorAll('.qa-panel').forEach(p => { p.classList.add('on'); p.style.display='flex'; });

        const featured = document.querySelector('.qa-featured');
        const featuredDivider = featured ? featured.nextElementSibling : null;
        if(featured) {
            const featuredText = (featured.getAttribute('data-qa') || featured.textContent).toLowerCase();
            const showFeatured = featuredText.includes(q);
            featured.style.display = showFeatured ? '' : 'none';
            if(featuredDivider) featuredDivider.style.display = showFeatured ? '' : 'none';
        }

        document.querySelectorAll('.qa-panel .qa').forEach(el => {
            const text = (el.getAttribute('data-qa') || el.textContent).toLowerCase();
            el.style.display = text.includes(q) ? '' : 'none';
        });
    };

    // ── Clock ─────────────────────────────────────────────────
    function tick() {
        const n = new Date();
        const t = n.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
        const d = n.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
        const ce = $(wrapper).find('.hrd-toolbar-clock')[0];
        const de = document.getElementById('hrd-date');
        if(ce) ce.textContent = t;
        if(de) de.textContent = d;
    }
    tick();
    wrapper._hrd_clock_interval = setInterval(tick, 1000);

    // ── Helpers ───────────────────────────────────────────────
    const today  = frappe.datetime.get_today();
    const month  = today.substring(0,7);
    const mStart = today.substring(0,4)+'-'+today.substring(5,7)+'-01';

    function setK(id, val, sub) {
        const el = document.getElementById(id);
        if(!el) return;
        el.innerHTML = val;
        el.classList.add('hpop');
        setTimeout(()=>el.classList.remove('hpop'),300);
        const se = document.getElementById(id+'-s');
        if(se&&sub) se.textContent = sub;
    }
    function setEl(id, val) {
        const el = document.getElementById(id);
        if(el){ el.innerHTML=val; el.classList.add('hpop'); setTimeout(()=>el.classList.remove('hpop'),300); }
    }

    // ── KPIs ──────────────────────────────────────────────────
    function loadKPIs() {
        frappe.call({ method:'frappe.client.get_count', args:{ doctype:'Employee', filters:{status:'Active'} },
            callback: r => setK('k-emp', r.message||0, 'Active staff') });
        frappe.call({ method:'frappe.client.get_count', args:{ doctype:'Attendance', filters:{attendance_date:today,status:'Present',docstatus:1} },
            callback: r => setK('k-pres', r.message||0, 'As of today') });
        frappe.call({ method:'frappe.client.get_count', args:{ doctype:'Attendance', filters:{attendance_date:today,status:'On Leave',docstatus:1} },
            callback: r => setK('k-leave', r.message||0, 'Approved today') });
        frappe.call({ method:'frappe.client.get_count', args:{ doctype:'Employee Checkin', filters:[['time','like',month+'%']] },
            callback: r => setK('k-cin', r.message||0, 'This month') });
        frappe.call({ method:'frappe.client.get_count', args:{ doctype:'Salary Slip', filters:[['start_date','like',month+'%'],['docstatus','!=',2]] },
            callback: r => setK('k-slip', r.message||0, 'This month') });
    }

    // ── Month Stats ───────────────────────────────────────────
    async function loadMonthStats() {
        const map = { Present:'ms-p', Absent:'ms-a', 'Half Day':'ms-h', 'On Leave':'ms-l' };
        let p=0, tot=0;
        for(const [status, elId] of Object.entries(map)) {
            await new Promise(res => {
                frappe.call({ method:'frappe.client.get_count',
                    args:{ doctype:'Attendance', filters:{attendance_date:['>=',mStart],status,docstatus:1} },
                    callback: r => {
                        const v = r.message||0;
                        setEl(elId, v);
                        if(status==='Present') p=v;
                        if(status!=='On Leave') tot+=v;
                        res();
                    }
                });
            });
        }
        if(tot>0) {
            const rate = Math.round((p/tot)*100);
            setEl('ms-rate', rate+'%');
            setTimeout(()=>{ const b=document.getElementById('ms-bar'); if(b) b.style.width=rate+'%'; },400);
        }
    }

    // ── Recent Checkins ───────────────────────────────────────
    function loadCheckins() {
        frappe.call({ method:'frappe.client.get_list',
            args:{ doctype:'Employee Checkin', fields:['employee','employee_name','log_type','time'],
                   order_by:'time desc', limit_page_length:5 },
            callback: r => {
                const box = document.getElementById('recent-ci');
                if(!box) return;
                if(!r.message?.length){ box.innerHTML='<div class="empty">No recent checkins</div>'; return; }
                box.innerHTML = r.message.map(c => {
                    const isIn = c.log_type==='IN';
                    const col  = isIn?'var(--green)':'var(--rose)';
                    const bg   = isIn?'var(--g10)':'var(--r10)';
                    return `<div class="dr">
                        <div class="dr-dot" style="background:${bg};color:${col};font-size:9px;font-weight:700">${c.log_type}</div>
                        <div class="dr-main">
                            <div class="dn">${c.employee_name||c.employee}</div>
                            <div class="ds">${c.employee} · ${c.time?.substring(5,10)||'—'}</div>
                        </div>
                        <div class="dr-val" style="color:${col}">${c.time?.substring(11,16)||'—'}</div>
                    </div>`;
                }).join('');
            }
        });
    }

    // ── Salary Components ─────────────────────────────────────
    function loadComponents() {
        frappe.call({ method:'frappe.client.get_list',
            args:{ doctype:'Salary Component', fields:['name','type'], limit_page_length:20, order_by:'type asc' },
            callback: r => {
                const box = document.getElementById('comp-list');
                if(!box) return;
                if(!r.message?.length){ box.innerHTML='<div class="empty">No components yet.<br><a href="/app/salary-component/new" style="color:var(--blue)">Create one →</a></div>'; return; }
                const e = r.message.filter(c=>c.type==='Earning').length;
                const d = r.message.filter(c=>c.type==='Deduction').length;
                setEl('sc-ec', e+' Earnings');
                setEl('sc-dc', d+' Deductions');
                box.innerHTML = r.message.slice(0,6).map(c =>
                    `<div class="comp-row">
                        <div class="comp-name"><span style="color:${c.type==='Earning'?'var(--green)':'var(--rose)'}">●</span> ${c.name}</div>
                        <span class="comp-type ${c.type==='Earning'?'ct-e':'ct-d'}">${c.type}</span>
                    </div>`
                ).join('') + (r.message.length>6?`<div style="text-align:center;font-size:10.5px;color:var(--lt);margin-top:6px">+${r.message.length-6} more · <a href="/app/salary-component" style="color:var(--blue)">View all</a></div>`:'');
            }
        });
    }

    // ── Salary Slips ──────────────────────────────────────────
    function loadSlips() {
        frappe.call({ method:'frappe.client.get_list',
            args:{ doctype:'Salary Slip', fields:['name','employee_name','net_pay','start_date','docstatus'],
                   order_by:'modified desc', limit_page_length:5 },
            callback: r => {
                const box = document.getElementById('slip-list');
                if(!box) return;
                if(!r.message?.length){ box.innerHTML='<div class="empty">No salary slips yet.<br><a href="/app/payroll-entry/new" style="color:var(--blue)">Generate payroll →</a></div>'; return; }
                box.innerHTML = r.message.map(s => {
                    const st = s.docstatus==1?'<span class="stag stag-s">Submitted</span>':s.docstatus==2?'<span class="stag stag-c">Cancelled</span>':'<span class="stag stag-d">Draft</span>';
                    return `<div class="slip-row">
                        <div style="min-width:0;overflow:hidden">
                            <div class="slip-name">${s.employee_name||s.name}</div>
                            <div class="slip-meta">${s.start_date?.substring(0,7)||'—'} ${st}</div>
                        </div>
                        <div class="slip-amt">${s.net_pay?'LKR '+parseFloat(s.net_pay).toLocaleString():'—'}</div>
                    </div>`;
                }).join('');
            }
        });
    }

    // ── Pending Leaves ────────────────────────────────────────
    function loadLeaves() {
        frappe.call({ method:'frappe.client.get_list',
            args:{ doctype:'Leave Application', fields:['employee_name','leave_type','from_date','to_date'],
                   filters:{status:'Open'}, order_by:'from_date asc', limit_page_length:5 },
            callback: r => {
                const box = document.getElementById('leave-list');
                if(!box) return;
                if(!r.message?.length){ box.innerHTML='<div class="empty">No pending leaves</div>'; return; }
                box.innerHTML = r.message.map(l => {
                    const days = l.from_date&&l.to_date?Math.round((new Date(l.to_date)-new Date(l.from_date))/86400000)+1:'?';
                    return `<div class="dr">
                        <div class="dr-dot" style="background:var(--a10);color:var(--amber)">🌴</div>
                        <div class="dr-main"><div class="dn">${l.employee_name}</div><div class="ds">${l.leave_type} · ${l.from_date}</div></div>
                        <div class="dr-val" style="color:var(--amber)">${days}d</div>
                    </div>`;
                }).join('');
            }
        });
    }

    // ── Birthdays ─────────────────────────────────────────────
    function loadBirthdays() {
        frappe.call({ method:'frappe.client.get_list',
            args:{ doctype:'Employee', fields:['employee_name','date_of_birth','department'],
                   filters:[['status','=','Active'],['date_of_birth','!=','']], limit_page_length:200 },
            callback: r => {
                const box = document.getElementById('bday-list');
                if(!box) return;
                const now = new Date();
                const upcoming = (r.message||[]).filter(e => {
                    if(!e.date_of_birth) return false;
                    const bd   = new Date(e.date_of_birth);
                    const next = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
                    if(next < now) next.setFullYear(now.getFullYear()+1);
                    e._d = Math.ceil((next-now)/86400000);
                    return e._d <= 30;
                }).sort((a,b)=>a._d-b._d).slice(0,5);
                if(!upcoming.length){ box.innerHTML='<div class="empty">No birthdays in next 30 days</div>'; return; }
                box.innerHTML = upcoming.map(e => {
                    const lbl = e._d===0?'Today':e._d===1?'Tomorrow':'In '+e._d+'d';
                    const col = e._d===0?'var(--green)':e._d<=3?'var(--amber)':'var(--lt)';
                    return `<div class="dr">
                        <div class="dr-dot" style="background:var(--v10);color:var(--violet)">🎂</div>
                        <div class="dr-main"><div class="dn">${e.employee_name}</div><div class="ds">${e.department||'—'}</div></div>
                        <div class="dr-val" style="color:${col};font-size:10.5px">${lbl}</div>
                    </div>`;
                }).join('');
            }
        });
    }

    // ── Salary Structures ─────────────────────────────────────
    function loadStructures() {
        frappe.call({ method:'frappe.client.get_list',
            args:{ doctype:'Salary Structure', fields:['name','payroll_frequency'],
                   filters:{is_active:'Yes'}, limit_page_length:5 },
            callback: r => {
                const box = document.getElementById('struct-list');
                if(!box) return;
                if(!r.message?.length){ box.innerHTML='<div class="empty">No salary structures.<br><a href="/app/salary-structure/new" style="color:var(--blue)">Create one →</a></div>'; return; }
                box.innerHTML = r.message.map(s =>
                    `<div class="comp-row">
                        <div class="comp-name"><span style="color:var(--blue)">📄</span> ${s.name}</div>
                        <span class="stag stag-s">${s.payroll_frequency||'Monthly'}</span>
                    </div>`
                ).join('');
            }
        });
    }

    // ── Shift Types ───────────────────────────────────────────
    function loadShiftTypes() {
        frappe.call({ method:'frappe.client.get_list',
            args:{ doctype:'Shift Type', fields:['name','start_time','end_time'], limit_page_length:20 },
            callback: r => {
                const box = document.getElementById('shift-grid');
                if(!box) return;
                if(!r.message?.length){
                    box.innerHTML='<div class="empty">No shift types defined.<br><a href="/app/shift-type/new" style="color:var(--cyan)">Create one →</a></div>';
                    return;
                }
                function shiftMeta(start_time) {
                    if(!start_time) return { emoji:'🕐', cls:'sb-gen', label:'General' };
                    const h = parseInt((start_time||'00').split(':')[0], 10);
                    if(h >= 5  && h < 12) return { emoji:'🌅', cls:'sb-day',   label:'Morning' };
                    if(h >= 12 && h < 17) return { emoji:'☀️',  cls:'sb-day',   label:'Day' };
                    if(h >= 17 && h < 21) return { emoji:'🌆', cls:'sb-eve',   label:'Evening' };
                    return                        { emoji:'🌙', cls:'sb-night', label:'Night' };
                }
                function fmtTime(t) {
                    if(!t) return '—';
                    try {
                        const [hh,mm] = t.split(':');
                        const h = parseInt(hh,10);
                        return `${h>12?h-12:h||12}:${mm} ${h>=12?'PM':'AM'}`;
                    } catch(e) { return t; }
                }
                box.innerHTML = r.message.map(s => {
                    const meta = shiftMeta(s.start_time);
                    return `<a class="shift-card" href="/app/shift-type/${encodeURIComponent(s.name)}">
                        <div class="shift-card-top">
                            <div class="shift-icon">${meta.emoji}</div>
                            <div class="shift-name">${s.name}</div>
                        </div>
                        <div class="shift-time">${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}</div>
                        <div><span class="shift-badge ${meta.cls}">${meta.label}</span></div>
                    </a>`;
                }).join('');
            }
        });
    }

    // ── Global Refresh ────────────────────────────────────────
    window.hrdRefresh = wrapper._hrdRefresh = function() {
        loadKPIs(); loadMonthStats(); loadCheckins();
        loadComponents(); loadSlips(); loadLeaves();
        loadBirthdays(); loadStructures(); loadShiftTypes();
        frappe.show_alert({ message:'Dashboard refreshed', indicator:'green' });
    };

    // ── Init ──────────────────────────────────────────────────
    loadKPIs(); loadMonthStats(); loadCheckins();
    loadComponents(); loadSlips(); loadLeaves();
    loadBirthdays(); loadStructures(); loadShiftTypes();
};

frappe.pages['hr-dashboard'].on_page_hide = function(wrapper) {
    if (wrapper._hrd_clock_interval) {
        clearInterval(wrapper._hrd_clock_interval);
        wrapper._hrd_clock_interval = null;
    }
};
