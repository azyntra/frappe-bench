frappe.pages['day-team-planner'].on_page_load = function(wrapper) {
    frappe.ui.make_app_page({ parent: wrapper, title: 'Day Team Shift Planner', single_column: true });
    document.title = 'Day Team Shift Planner';

    if (!document.getElementById('dtp-font')) {
        const lnk = document.createElement('link');
        lnk.id = 'dtp-font'; lnk.rel = 'stylesheet';
        lnk.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap';
        document.head.appendChild(lnk);
    }

    $('#dtp-styles').remove();
    $('<style id="dtp-styles">').text(`
        /*
         * ─────────────────────────────────────────────────────────────
         *  ERPNext theme bridge
         *  Reads ERPNext CSS variables — auto-adapts when user switches
         *  Light ↔ Dark via ERPNext's own theme switcher.
         * ─────────────────────────────────────────────────────────────
         */
        .dtp {
            --dtp-bg:      var(--bg-color,         #f0f3f8);
            --dtp-card:    var(--card-bg,           #ffffff);
            --dtp-ibg:     var(--control-bg,        #f7f9fc);
            --dtp-hov:     var(--hover-bg,          #edf1f8);
            --dtp-bd:      var(--border-color,      #e2e8f3);
            --dtp-bd2:     var(--dark-border-color, #c5d0df);
            --dtp-tx:      var(--text-color,        #0f1c2e);
            --dtp-mu:      var(--text-muted,        #566880);
            --dtp-lt:      var(--text-light,        #95abbe);

            /* ── Light theme topbar: solid white, dark text ── */
            --dtp-topbar-bg:     #ffffff;
            --dtp-topbar-tx:     #0f1c2e;
            --dtp-topbar-sub:    #566880;
            --dtp-topbar-btn-bd: #d1d9e6;
            --dtp-topbar-btn-bg: #f0f4fa;
            --dtp-topbar-btn-tx: #1e3a5f;
            --dtp-topbar-pill:   #eef2fb;
            --dtp-topbar-pill-bd:#c5d0df;

            --dtp-blue:    #2563eb;
            --dtp-blue-lt: rgba(37,99,235,.10);
            --dtp-blue-bd: rgba(37,99,235,.30);
            --dtp-rose:    #dc2626;
            --dtp-rose-lt: rgba(220,38,38,.08);
            --dtp-rose-bd: rgba(220,38,38,.25);
            --dtp-violet:  #6d28d9;
            --dtp-vio-lt:  rgba(109,40,217,.10);
            --dtp-hol:     #7c3aed;
            --dtp-hol-lt:  rgba(124,58,237,.08);
            --dtp-hol-bd:  rgba(124,58,237,.25);
            --dtp-sun-bg:  rgba(220,38,38,.04);

            --dtp-sh-xs: 0 1px 2px rgba(0,0,0,.06);
            --dtp-sh-sm: 0 1px 4px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.04);
            --dtp-sh-md: 0 4px 16px rgba(0,0,0,.10),0 2px 6px rgba(0,0,0,.06);
            --dtp-sh-lg: 0 12px 40px rgba(0,0,0,.16),0 4px 14px rgba(0,0,0,.08);
            --dtp-r: 10px;
        }

        /* ERPNext sets [data-theme="dark"] on <html> when dark mode is active */
        [data-theme="dark"] .dtp {
            --dtp-bg:      var(--bg-color,         #0d1117);
            --dtp-card:    var(--card-bg,           #161b22);
            --dtp-ibg:     var(--control-bg,        #1c2230);
            --dtp-hov:     var(--hover-bg,          #1e2635);
            --dtp-bd:      var(--border-color,      #2a3140);
            --dtp-bd2:     var(--dark-border-color, #3a4455);
            --dtp-tx:      var(--text-color,        #e6edf3);
            --dtp-mu:      var(--text-muted,        #8b98a5);
            --dtp-lt:      var(--text-light,        #4d5d6e);

            /* Dark mode topbar — slightly lighter navy for contrast against dark bg */
            --dtp-topbar-bg:    #1a2540;
            --dtp-topbar-tx:    #ffffff;
            --dtp-topbar-sub:   rgba(255,255,255,0.42);
            --dtp-topbar-btn-bd:rgba(255,255,255,0.18);
            --dtp-topbar-btn-bg:rgba(255,255,255,0.08);
            --dtp-topbar-btn-tx:rgba(255,255,255,0.75);
            --dtp-topbar-pill:  rgba(255,255,255,0.10);
            --dtp-topbar-pill-bd:rgba(255,255,255,0.20);

            --dtp-blue:    #4d8ef7;
            --dtp-blue-lt: rgba(77,142,247,.12);
            --dtp-blue-bd: rgba(77,142,247,.35);
            --dtp-rose:    #f87171;
            --dtp-rose-lt: rgba(248,113,113,.09);
            --dtp-rose-bd: rgba(248,113,113,.28);
            --dtp-violet:  #a78bfa;
            --dtp-vio-lt:  rgba(167,139,250,.10);
            --dtp-hol:     #c084fc;
            --dtp-hol-lt:  rgba(192,132,252,.09);
            --dtp-hol-bd:  rgba(192,132,252,.28);
            --dtp-sun-bg:  rgba(248,113,113,.04);
            --dtp-sh-xs: 0 1px 2px rgba(0,0,0,.28);
            --dtp-sh-sm: 0 1px 4px rgba(0,0,0,.40),0 1px 2px rgba(0,0,0,.28);
            --dtp-sh-md: 0 4px 16px rgba(0,0,0,.50),0 2px 6px rgba(0,0,0,.30);
            --dtp-sh-lg: 0 12px 40px rgba(0,0,0,.60),0 4px 14px rgba(0,0,0,.40);
        }

        .dtp * { box-sizing:border-box; -webkit-font-smoothing:antialiased; }
        .dtp {
            font-family:'DM Sans',sans-serif;
            background:var(--dtp-bg);
            min-height:100vh;
            padding:14px 14px 48px;
            color:var(--dtp-tx);
        }

        /* ── TOP BAR ─────────────────────────────────────────── */
        .dtp-topbar {
            background: var(--dtp-topbar-bg);
            border-radius: var(--dtp-r);
            border: 1px solid var(--dtp-bd);
            border-left: 4px solid var(--dtp-blue);
            padding: 12px 16px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 8px;
            box-shadow: var(--dtp-sh-sm);
        }
        .dtp-brand { display:flex; align-items:center; gap:11px; }
        .dtp-brand-icon {
            width: 38px; height: 38px; border-radius: 9px; flex-shrink: 0;
            background: var(--dtp-blue);
            display: flex; align-items: center; justify-content: center; font-size: 17px;
            box-shadow: 0 2px 8px rgba(37,99,235,.35);
        }
        .dtp-brand-title {
            font-size: 14px; font-weight: 700;
            color: var(--dtp-topbar-tx);
            letter-spacing: -.3px; line-height: 1.2;
        }
        .dtp-brand-sub {
            font-size: 10px;
            color: var(--dtp-topbar-sub);
            font-weight: 500; margin-top: 1px;
        }
        .dtp-nav { display:flex; align-items:center; gap:5px; }
        .dtp-navbtn {
            width: 32px; height: 32px; border-radius: 8px;
            border: 1px solid var(--dtp-topbar-btn-bd);
            background: var(--dtp-topbar-btn-bg);
            cursor: pointer; font-size: 16px; font-weight: 700;
            display: flex; align-items: center; justify-content: center;
            color: var(--dtp-topbar-btn-tx);
            transition: all .14s;
        }
        .dtp-navbtn:hover {
            border-color: var(--dtp-blue);
            color: var(--dtp-blue);
            background: var(--dtp-blue-lt);
        }
        .dtp-navbtn.refreshing .ri { display:inline-block; animation:dtpSpin .7s linear infinite; }
        .dtp-month-pill {
            background: var(--dtp-topbar-pill);
            border: 1px solid var(--dtp-topbar-pill-bd);
            border-radius: 8px; padding: 6px 18px;
            font-size: 13px; font-weight: 700;
            color: var(--dtp-topbar-tx);
            font-family: 'DM Mono', monospace;
            min-width: 160px; text-align: center;
        }

        /* ── FILTER BAR ───────────────────────────────────────── */
        .dtp-filterbar {
            background: var(--dtp-card); border: 1px solid var(--dtp-bd);
            border-radius: var(--dtp-r); padding: 8px 11px; margin-bottom: 8px;
            display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
            box-shadow: var(--dtp-sh-sm);
        }
        .dtp-search { position:relative; flex:1; min-width:150px; max-width:240px; }
        .dtp-search input {
            width: 100%; padding: 6px 26px 6px 30px; border-radius: 7px;
            border: 1.5px solid var(--dtp-bd); background: var(--dtp-ibg);
            font-family: 'DM Sans', sans-serif; font-size: 11.5px;
            color: var(--dtp-tx); outline: none;
            transition: border-color .14s, box-shadow .14s;
        }
        .dtp-search input:focus { border-color:var(--dtp-blue); box-shadow:0 0 0 3px var(--dtp-blue-lt); }
        .dtp-search input::placeholder { color:var(--dtp-lt); }
        .dtp-search-ic  { position:absolute; left:9px; top:50%; transform:translateY(-50%); font-size:11px; color:var(--dtp-lt); pointer-events:none; }
        .dtp-search-clr { position:absolute; right:7px; top:50%; transform:translateY(-50%); font-size:11px; color:var(--dtp-lt); cursor:pointer; display:none; background:none; border:none; padding:0; }
        .dtp-search-clr.on { display:block; }
        .dtp-search-clr:hover { color:var(--dtp-rose); }
        .dtp-sep { width:1px; height:20px; background:var(--dtp-bd); flex-shrink:0; }
        .dtp-btn {
            padding: 6px 11px; border-radius: 7px;
            border: 1.5px solid var(--dtp-bd); background: var(--dtp-ibg);
            font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 600;
            color: var(--dtp-mu); cursor: pointer; transition: all .14s;
            white-space: nowrap; display: inline-flex; align-items: center; gap: 5px;
        }
        .dtp-btn:hover { border-color:var(--dtp-blue); color:var(--dtp-blue); background:var(--dtp-blue-lt); }
        .dtp-btn.red:hover { border-color:var(--dtp-rose); color:var(--dtp-rose); background:var(--dtp-rose-lt); }
        .dtp-btn.primary {
            background: var(--dtp-blue); border-color: transparent;
            color: #fff; box-shadow: 0 2px 8px rgba(37,99,235,.3);
        }
        .dtp-btn.primary:hover { opacity:.88; }

        /* ── LEGEND ───────────────────────────────────────────── */
        .dtp-legend {
            background: var(--dtp-card); border: 1px solid var(--dtp-bd);
            border-radius: var(--dtp-r); padding: 7px 12px; margin-bottom: 8px;
            display: flex; gap: 5px; flex-wrap: wrap; align-items: center;
            box-shadow: var(--dtp-sh-sm);
        }
        .dtp-leg-chip {
            padding: 3px 9px; border-radius: 6px; font-size: 9.5px; font-weight: 700;
            border: 1.5px solid transparent; display: inline-flex; align-items: center; gap: 4px;
            white-space: nowrap;
        }
        .dtp-leg-sep  { width:1px; height:14px; background:var(--dtp-bd); flex-shrink:0; }
        .dtp-leg-hint { font-size:9.5px; color:var(--dtp-lt); font-style:italic; }

        /* ── GRID SHELL ───────────────────────────────────────── */
        .dtp-grid-outer {
            border-radius: var(--dtp-r); border: 1px solid var(--dtp-bd);
            background: var(--dtp-card); overflow: hidden; box-shadow: var(--dtp-sh-sm);
        }
        .dtp-grid-scroll { overflow-x:auto; }
        .dtp-grid { border-collapse:collapse; min-width:100%; table-layout:fixed; }

        /* ── EMPLOYEE HEADER (sticky left) ────────────────────── */
        .dtp-th-emp {
            width: 200px; min-width: 200px; padding: 9px 12px;
            font-size: 9px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase;
            color: var(--dtp-mu);
            border-right: 2px solid var(--dtp-bd2); border-bottom: 1px solid var(--dtp-bd2);
            background: var(--dtp-ibg); position: sticky; left: 0; z-index: 20;
        }

        /* ── DAY HEADER ───────────────────────────────────────── */
        .dtp-th-day {
            width: 126px; min-width: 126px;
            padding: 5px 4px 4px;
            text-align: center;
            border-right: 1px solid var(--dtp-bd);
            border-bottom: 1px solid var(--dtp-bd2);
            background: var(--dtp-card);
            cursor: pointer; transition: background .13s;
            user-select: none; position: relative; vertical-align: middle;
        }
        .dtp-th-day:hover { background:var(--dtp-blue-lt); }
        .dtp-th-day .dn {
            font-size: 8.5px; font-weight: 700; text-transform: uppercase;
            letter-spacing: .5px; color: var(--dtp-lt);
            display: block; line-height: 1;
        }
        .dtp-th-day .dd {
            font-size: 18px; font-weight: 800; color: var(--dtp-tx);
            font-family: 'DM Mono', monospace;
            display: block; line-height: 1.1; margin-top: 1px;
        }
        .dtp-th-day.sun .dn,
        .dtp-th-day.sun .dd { color:var(--dtp-rose); }
        .dtp-th-day.sun    { background:var(--dtp-sun-bg); }
        .dtp-th-day.today  { background:var(--dtp-blue-lt); }
        .dtp-th-day.today .dn,
        .dtp-th-day.today .dd { color:var(--dtp-blue); }
        .dtp-th-day.today::before {
            content:''; position:absolute; top:0; left:0; right:0; height:2px;
            background:var(--dtp-blue);
        }
        .dtp-th-holiday-name {
            font-size: 6.5px; font-weight: 700; color: var(--dtp-hol);
            background: var(--dtp-hol-lt); border: 1px solid var(--dtp-hol-bd);
            border-radius: 3px; padding: 1px 4px; margin-top: 2px;
            display: inline-block; white-space: nowrap; overflow: hidden;
            text-overflow: ellipsis; max-width: 110px;
        }
        .dtp-th-day .col-badge {
            font-size: 7px; font-weight: 700; color: var(--dtp-blue);
            background: var(--dtp-blue-lt); border: 1px solid var(--dtp-blue-bd);
            border-radius: 3px; padding: 1px 4px; margin-top: 2px; display: inline-block;
        }
        .dtp-th-day .fill-hint {
            font-size: 7.5px; color: var(--dtp-lt);
            margin-top: 2px; display: block; opacity: 0; transition: opacity .13s;
        }
        .dtp-th-day:hover .fill-hint { opacity:1; }

        /* ── EMPLOYEE STICKY CELL ─────────────────────────────── */
        .dtp-td-emp {
            width: 200px; min-width: 200px; padding: 8px 11px;
            border-right: 2px solid var(--dtp-bd2); border-bottom: 1px solid var(--dtp-bd);
            position: sticky; left: 0; background: var(--dtp-card); z-index: 5;
            cursor: pointer; transition: background .12s;
        }
        .dtp-td-emp:hover { background:var(--dtp-hov); }
        .dtp-emp-row  { display:flex; align-items:center; gap:9px; }
        .dtp-emp-av   {
            width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
            display: flex; align-items: center; justify-content: center;
            font-size: 11px; font-weight: 800; color: #fff;
            box-shadow: 0 2px 5px rgba(0,0,0,.18);
        }
        .dtp-emp-name { font-size:11px; font-weight:700; color:var(--dtp-tx); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.3; }
        .dtp-emp-id   { font-size:8.5px; color:var(--dtp-lt); font-family:'DM Mono',monospace; margin-top:1px; }
        .dtp-emp-desg { font-size:8px; color:var(--dtp-mu); margin-top:1px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .dtp-sun-tag  { display:inline-block; font-size:7.5px; font-weight:700; margin-top:2px; color:var(--dtp-violet); background:var(--dtp-vio-lt); border-radius:3px; padding:1px 5px; }

        /* ── SHIFT CELLS ──────────────────────────────────────── */
        .dtp-td-cell {
            width: 126px; min-width: 126px; padding: 4px;
            border-right: 1px solid var(--dtp-bd); border-bottom: 1px solid var(--dtp-bd);
            vertical-align: top; cursor: pointer; transition: background .12s; position: relative;
        }
        .dtp-td-cell:hover { background:var(--dtp-hov); }
        .dtp-td-cell.sun-off  { background:var(--dtp-sun-bg); cursor:default; }
        .dtp-td-cell.sun-off:hover { background:var(--dtp-sun-bg); }
        .dtp-td-cell.today-col {
            background: rgba(37,99,235,.025);
            border-left: 2px solid rgba(37,99,235,.22);
            border-right: 2px solid rgba(37,99,235,.22);
        }
        .dtp-td-cell.holiday-col { background:var(--dtp-hol-lt); cursor:default; }

        /* ── SHIFT CARD ───────────────────────────────────────── */
        .dtp-shift-card {
            border-radius: 8px; padding: 7px 8px 6px 11px;
            border: 1.5px solid transparent;
            height: 76px; width: 100%;
            display: flex; flex-direction: column; justify-content: space-between;
            position: relative; overflow: hidden;
            transition: box-shadow .14s, transform .12s;
            cursor: pointer;
        }
        .dtp-shift-card:hover { transform:translateY(-1px); box-shadow:var(--dtp-sh-md); }
        .dtp-shift-bar   { position:absolute; top:0; left:0; width:3px; height:100%; border-radius:5px 0 0 5px; }
        .dtp-shift-top   { flex:1; min-height:0; }
        .dtp-shift-sname { font-size:10px; font-weight:800; line-height:1.25; margin-bottom:1px; }
        .dtp-shift-sshort{ font-size:8.5px; font-weight:600; opacity:.72; line-height:1.2; }
        .dtp-shift-time  { font-size:8.5px; font-family:'DM Mono',monospace; font-weight:500; display:flex; align-items:center; gap:2px; opacity:.75; white-space:nowrap; overflow:hidden; flex-shrink:0; }

        /* ── EMPTY CELL ───────────────────────────────────────── */
        .dtp-cell-empty {
            height: 76px; width: 100%;
            border-radius: 8px; border: 1.5px dashed var(--dtp-bd);
            display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
            transition: all .14s;
        }
        .dtp-td-cell:hover .dtp-cell-empty { border-color:var(--dtp-blue); background:var(--dtp-blue-lt); }
        .dtp-cell-plus     { font-size:17px; color:var(--dtp-bd2); transition:color .14s; line-height:1; }
        .dtp-cell-plus-lbl { font-size:8px; color:var(--dtp-lt); font-weight:600; opacity:0; transition:all .14s; }
        .dtp-td-cell:hover .dtp-cell-plus     { color:var(--dtp-blue); }
        .dtp-td-cell:hover .dtp-cell-plus-lbl { opacity:1; color:var(--dtp-blue); }

        /* ── WO CELL ──────────────────────────────────────────── */
        .dtp-cell-wo {
            height: 76px; width: 100%; border-radius: 8px;
            display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
        }
        .dtp-wo-lbl { font-size:12px; font-weight:900; color:var(--dtp-rose); letter-spacing:.5px; opacity:.35; }
        .dtp-wo-sub { font-size:7.5px; color:var(--dtp-lt); opacity:.5; font-weight:600; }

        /* ── HOLIDAY CELL ─────────────────────────────────────── */
        .dtp-cell-holiday {
            height: 76px; width: 100%;
            border-radius: 8px; border: 1.5px solid var(--dtp-hol-bd);
            background: var(--dtp-hol-lt);
            display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
            padding: 4px; text-align: center;
        }
        .dtp-holiday-icon { font-size:15px; line-height:1; }
        .dtp-holiday-lbl  { font-size:7px; font-weight:700; color:var(--dtp-hol); line-height:1.35; }

        /* ── SAVING CELL ──────────────────────────────────────── */
        .dtp-cell-saving {
            height: 76px; width: 100%; border-radius: 8px;
            background: var(--dtp-blue-lt); border: 1.5px solid var(--dtp-blue-bd);
            display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
        }
        .dtp-spin { width:15px; height:15px; border:2px solid var(--dtp-blue-bd); border-top-color:var(--dtp-blue); border-radius:50%; animation:dtpSpin .6s linear infinite; }
        @keyframes dtpSpin { to { transform:rotate(360deg); } }
        .dtp-cell-saving-txt { font-size:8.5px; color:var(--dtp-blue); font-weight:600; }

        .dtp-flash { animation:dtpFlash .45s ease; }
        @keyframes dtpFlash { 0%{filter:brightness(1.35) saturate(1.2)} 100%{filter:brightness(1) saturate(1)} }

        .dtp-grid tbody tr:hover .dtp-td-cell:not(.sun-off):not(.holiday-col) { background:rgba(37,99,235,.018); }
        .dtp-grid tbody tr:nth-child(even) .dtp-td-emp { background:var(--dtp-ibg); }
        .dtp-grid tbody tr:nth-child(even):hover .dtp-td-emp { background:var(--dtp-hov); }

        /* ── CONTEXT MENU ─────────────────────────────────────
           Hard-coded solid colors so ERPNext theme vars cannot
           make the popup transparent. isDark() drives switching.
        ───────────────────────────────────────────────────── */
        .dtp-ctx {
            display: none; position: fixed;
            border-radius: 14px; z-index: 100000;
            box-shadow: 0 24px 64px rgba(0,0,0,.30), 0 8px 24px rgba(0,0,0,.18);
            min-width: 272px; max-width: 292px; overflow: hidden;
            isolation: isolate;
            /* Solid colors set by JS via applyCtxTheme() */
        }
        .dtp-ctx.open { display:block; animation:dtpCtxIn .15s cubic-bezier(.2,.8,.4,1); }
        @keyframes dtpCtxIn { from{opacity:0;transform:scale(.93) translateY(-8px)} to{opacity:1;transform:scale(1) translateY(0)} }

        /* ── Header: always blue gradient — fully opaque ── */
        .dtp-ctx-hdr {
            padding: 14px 15px 13px;
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
            border-bottom: none; position: relative;
        }
        .dtp-ctx-emp  { font-size:13px; font-weight:800; color:#ffffff !important; letter-spacing:-.2px; line-height:1.2; }
        .dtp-ctx-date { font-size:10px; color:rgba(255,255,255,.82) !important; margin-top:3px; }
        .dtp-ctx-holiday-note {
            font-size: 9.5px; color: #fff !important; font-weight: 700; margin-top: 7px;
            display: flex; align-items: center; gap: 5px;
            background: rgba(255,255,255,.22) !important;
            padding: 4px 9px; border-radius: 6px;
            border: 1px solid rgba(255,255,255,.32) !important;
        }

        /* ── Body: solid, set by applyCtxTheme() ── */
        .dtp-ctx-body { padding:6px 6px 8px; max-height:420px; overflow-y:auto; }
        .dtp-ctx-sec  { font-size:8px; font-weight:800; text-transform:uppercase; letter-spacing:.8px; padding:8px 9px 4px; display:block; }

        .dtp-ctx-opt {
            display: flex; align-items: center; gap: 9px; padding: 8px 9px;
            border-radius: 9px; cursor: pointer; border: 1px solid transparent;
            width: 100%; text-align: left; font-family: 'DM Sans', sans-serif;
            transition: background .1s; position: relative;
        }
        .dtp-ctx-swatch {
            width: 36px; height: 36px; border-radius: 9px; flex-shrink: 0;
            display: flex; align-items: center; justify-content: center;
            font-size: 16px; border: 1.5px solid transparent;
        }
        .dtp-ctx-sname { font-size:12px; font-weight:700; display:block; line-height:1.2; }
        .dtp-ctx-stime { font-size:9.5px; font-family:'DM Mono',monospace; display:block; margin-top:2px; opacity:.75; }
        .dtp-ctx-tick  { position:absolute; right:10px; top:50%; transform:translateY(-50%); font-size:14px; color:#2563eb; }
        .dtp-ctx-div   { height:1px; margin:4px 0; }

        .dtp-ctx-act {
            display: flex; align-items: center; gap: 9px; padding: 8px 9px;
            border-radius: 9px; cursor: pointer; border: none; width: 100%; text-align: left;
            font-family: 'DM Sans', sans-serif;
            font-size: 12px; font-weight: 600; transition: background .1s;
        }
        .dtp-ctx-act-ic {
            width: 28px; height: 28px; border-radius: 7px; flex-shrink: 0;
            display: flex; align-items: center; justify-content: center; font-size: 13px;
        }

        /* Scrollbars */
        .dtp-ctx-body::-webkit-scrollbar,
        .dtp-grid-scroll::-webkit-scrollbar { width:4px; height:4px; }
        .dtp-ctx-body::-webkit-scrollbar-track,
        .dtp-grid-scroll::-webkit-scrollbar-track { background:var(--dtp-bg); }
        .dtp-ctx-body::-webkit-scrollbar-thumb,
        .dtp-grid-scroll::-webkit-scrollbar-thumb { background:var(--dtp-bd2); border-radius:2px; }

        /* ── PROGRESS BAR ─────────────────────────────────────── */
        .dtp-prog {
            position: fixed; top: 0; left: 0; height: 3px; z-index: 9999; display: none;
            background: linear-gradient(90deg,var(--dtp-blue),var(--dtp-violet),var(--dtp-blue));
            background-size: 200% 100%; transition: width .3s;
            animation: dtpProgAnim 1.5s linear infinite;
        }
        @keyframes dtpProgAnim { 0%{background-position:0% 0} 100%{background-position:200% 0} }
        .dtp-prog.on { display:block; }

        /* ── TOAST ────────────────────────────────────────────── */
        .dtp-toast {
            position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%) translateY(8px);
            background: #0f1c2e; color: #fff; padding: 8px 16px; border-radius: 9px;
            font-size: 11.5px; font-weight: 600; opacity: 0; transition: opacity .2s, transform .2s;
            z-index: 9999; white-space: nowrap; pointer-events: none;
            box-shadow: 0 5px 18px rgba(0,0,0,.28);
        }
        .dtp-toast.on { opacity:1; transform:translateX(-50%) translateY(0); }

        /* ── STATES ───────────────────────────────────────────── */
        .dtp-loading { text-align:center; padding:60px 20px; color:var(--dtp-mu); display:flex; flex-direction:column; align-items:center; gap:12px; }
        .dtp-spinner { width:26px; height:26px; border:2.5px solid var(--dtp-bd); border-top-color:var(--dtp-blue); border-radius:50%; animation:dtpSpin .7s linear infinite; }
        .dtp-loading-txt { font-size:11px; color:var(--dtp-lt); }
        .dtp-no-results  { text-align:center; padding:44px; color:var(--dtp-lt); font-size:12.5px; font-style:italic; }
        .dtp-error-state { text-align:center; padding:44px 20px; }
        .dtp-error-state .dtp-error-icon  { font-size:34px; margin-bottom:10px; }
        .dtp-error-state .dtp-error-title { font-size:13.5px; font-weight:700; color:var(--dtp-tx); margin-bottom:5px; }
        .dtp-error-state .dtp-error-msg   { font-size:11px; color:var(--dtp-mu); margin-bottom:14px; }


    `).appendTo('head');

    // ─── Config ────────────────────────────────────────────────────────────
    const COMPANY = 'CHAN RICH FRUITS (PVT) LTD';
    const DEPT    = 'Day Team - CHAN RICH';
    const DAYS    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const AVC     = ['#2563eb','#059669','#d97706','#7c3aed','#0891b2','#e11d48','#0d9488','#ea580c','#7c2d12','#1d4ed8'];

    const SHIFT_PALETTES = {
        light: [
            { icon:'🌅', color:'#92400e', bg:'#fef3c7', bd:'#f59e0b', bar:'#d97706' },
            { icon:'☀️',  color:'#1e3a8a', bg:'#dbeafe', bd:'#3b82f6', bar:'#2563eb' },
            { icon:'🌿', color:'#064e3b', bg:'#d1fae5', bd:'#10b981', bar:'#059669' },
            { icon:'🌙', color:'#4c1d95', bg:'#ede9fe', bd:'#8b5cf6', bar:'#7c3aed' },
            { icon:'🌆', color:'#881337', bg:'#ffe4e6', bd:'#f43f5e', bar:'#e11d48' },
            { icon:'⭐', color:'#0c4a6e', bg:'#e0f2fe', bd:'#0ea5e9', bar:'#0284c7' },
        ],
        dark: [
            { icon:'🌅', color:'#fcd34d', bg:'#2a1f08', bd:'#b45309', bar:'#d97706' },
            { icon:'☀️',  color:'#93c5fd', bg:'#0f1e35', bd:'#2563eb', bar:'#3b82f6' },
            { icon:'🌿', color:'#6ee7b7', bg:'#0a1e17', bd:'#059669', bar:'#34d399' },
            { icon:'🌙', color:'#c4b5fd', bg:'#1a1030', bd:'#7c3aed', bar:'#a78bfa' },
            { icon:'🌆', color:'#fca5a5', bg:'#200d0d', bd:'#dc2626', bar:'#f87171' },
            { icon:'⭐', color:'#7dd3fc', bg:'#0a1e2d', bd:'#0284c7', bar:'#38bdf8' },
        ]
    };

    // ─── State ─────────────────────────────────────────────────────────────
    const now         = new Date();
    let curYear       = now.getFullYear();
    let curMonth      = now.getMonth();
    let employees     = [];
    let filteredEmps  = [];
    let SHIFTS        = [];
    let SMAP          = {};
    let plan          = {};
    let savedPlan     = {};
    let sundayWorkers = new Set();
    let holidays      = {};
    let openCtx       = null;
    let searchQ       = '';
    let savingSet     = new Set();

    function isDark() {
        return document.documentElement.getAttribute('data-theme') === 'dark'
            || document.documentElement.classList.contains('dark')
            || document.body.classList.contains('dark');
    }
    function currentPalette() { return isDark() ? SHIFT_PALETTES.dark : SHIFT_PALETTES.light; }

    // ─── HTML Shell ────────────────────────────────────────────────────────
    $(wrapper).find('.page-content').html(`
    <div class="dtp" id="dtp-root">
        <div class="dtp-topbar">
            <div class="dtp-brand">
                <div class="dtp-brand-icon">📅</div>
                <div>
                    <div class="dtp-brand-title">Day Team Shift Planner</div>
                    <div class="dtp-brand-sub">CHAN RICH FRUITS (PVT) LTD · Day Team</div>
                </div>
            </div>
            <div class="dtp-nav">
                <button class="dtp-navbtn" onclick="dtpPrev()" title="Previous month">‹</button>
                <div class="dtp-month-pill" id="dtp-month">— ——</div>
                <button class="dtp-navbtn" onclick="dtpNext()" title="Next month">›</button>
                <div style="width:4px"></div>
                <button class="dtp-navbtn" id="dtp-refresh-btn" onclick="dtpRefresh()" title="Refresh" style="font-size:15px">
                    <span class="ri">↻</span>
                </button>
            </div>
        </div>

        <div class="dtp-filterbar">
            <div class="dtp-search">
                <span class="dtp-search-ic">🔍</span>
                <input type="text" id="dtp-search" placeholder="Search employee…">
                <button class="dtp-search-clr" id="dtp-search-clr" onclick="dtpClearSearch()">✕</button>
            </div>
            <div class="dtp-sep"></div>
            <button class="dtp-btn" onclick="dtpFillAll()">⚡ Fill All Workdays</button>
            <button class="dtp-btn" onclick="dtpFillWeekdays()">📅 Fill Mon–Sat Only</button>
            <button class="dtp-btn red" onclick="dtpClearMonth()">🗑 Clear Month</button>
            <div class="dtp-sep"></div>
            <button class="dtp-btn primary" onclick="dtpExport()">📋 Export CSV</button>
        </div>

        <div class="dtp-legend" id="dtp-legend">
            <span style="font-size:11px;color:var(--dtp-lt);font-style:italic;">Loading shifts…</span>
        </div>

        <div class="dtp-grid-outer">
            <div class="dtp-grid-scroll">
                <div id="dtp-grid-wrap">
                    <div class="dtp-loading">
                        <div class="dtp-spinner"></div>
                        <div style="font-size:12px">Loading…</div>
                        <div class="dtp-loading-txt">Connecting to ERPNext…</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="dtp-prog" id="dtp-prog"></div>
    <div class="dtp-toast" id="dtp-toast"></div>
    <div class="dtp-ctx" id="dtp-ctx"></div>
    `);

    // Watch ERPNext theme changes and re-render
    const _themeObserver = new MutationObserver(() => {
        rebuildShiftPalette();
        buildLegend();
        renderGrid();
    });
    _themeObserver.observe(document.documentElement, { attributes:true, attributeFilter:['data-theme','class'] });

    // ─── Search ─────────────────────────────────────────────────────────────
    document.getElementById('dtp-search').addEventListener('input', function() {
        searchQ = this.value.trim().toLowerCase();
        document.getElementById('dtp-search-clr').classList.toggle('on', searchQ.length > 0);
        applySearch();
    });
    window.dtpClearSearch = function() {
        document.getElementById('dtp-search').value = ''; searchQ = '';
        document.getElementById('dtp-search-clr').classList.remove('on');
        applySearch();
    };
    function applySearch() {
        filteredEmps = searchQ
            ? employees.filter(e => e.employee_name.toLowerCase().includes(searchQ) || e.name.toLowerCase().includes(searchQ))
            : [...employees];
        renderGrid();
    }

    // ─── Navigation ─────────────────────────────────────────────────────────
    window.dtpPrev = function() {
        if (savingSet.size) { toast('⏳ Saving in progress…'); return; }
        curMonth--; if (curMonth < 0) { curMonth = 11; curYear--; }
        plan = {}; savedPlan = {}; holidays = {}; init();
    };
    window.dtpNext = function() {
        if (savingSet.size) { toast('⏳ Saving in progress…'); return; }
        curMonth++; if (curMonth > 11) { curMonth = 0; curYear++; }
        plan = {}; savedPlan = {}; holidays = {}; init();
    };
    window.dtpRefresh = function() {
        if (savingSet.size) { toast('⏳ Saving in progress…'); return; }
        const btn = document.getElementById('dtp-refresh-btn');
        if (btn) btn.classList.add('refreshing');
        plan = {}; savedPlan = {}; holidays = {};
        init().finally(() => { if (btn) btn.classList.remove('refreshing'); });
    };

    // ─── Helpers ─────────────────────────────────────────────────────────────
    function daysInMonth(y, m) { return new Date(y, m+1, 0).getDate(); }
    function toDS(y, m, d) { return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
    function todayStr() { return frappe.datetime.get_today(); }

    function rebuildShiftPalette() {
        const pal = currentPalette();
        SHIFTS = SHIFTS.map((s, i) => { const p = pal[i % pal.length]; return { ...s, icon:p.icon, color:p.color, bg:p.bg, bd:p.bd, bar:p.bar }; });
        SMAP = {}; SHIFTS.forEach(s => SMAP[s.name] = s);
    }

    function buildLegend() {
        const el = document.getElementById('dtp-legend');
        if (!el) return;
        let html = '';
        SHIFTS.forEach(s => {
            html += `<div class="dtp-leg-chip" style="background:${s.bg};border-color:${s.bd};color:${s.color}">
                ${s.icon} <strong>${s.fullName}</strong>${s.short ? ` <span style="opacity:.7;font-weight:400">${s.short}</span>` : ''}
            </div>`;
        });
        html += `<div class="dtp-leg-sep"></div>
            <div class="dtp-leg-chip" style="background:var(--dtp-sun-bg);border-color:var(--dtp-rose-bd);color:var(--dtp-rose)">WO Sunday Off</div>
            <div class="dtp-leg-chip" style="background:var(--dtp-hol-lt);border-color:var(--dtp-hol-bd);color:var(--dtp-hol)">🎉 Public Holiday</div>
            <div class="dtp-leg-sep"></div>
            <span class="dtp-leg-hint">Click cell to assign · Click header to fill column · Click name to toggle Sunday worker</span>`;
        el.innerHTML = html;
    }


    // ─── Init ────────────────────────────────────────────────────────────────
    function init() {
        document.getElementById('dtp-month').textContent =
            new Date(curYear, curMonth, 1).toLocaleString('en', { month:'long', year:'numeric' });
        const wrap = document.getElementById('dtp-grid-wrap');
        if (wrap) wrap.innerHTML = `<div class="dtp-loading"><div class="dtp-spinner"></div><div style="font-size:12px">Loading…</div></div>`;

        const monthStart = toDS(curYear, curMonth, 1);
        const monthEnd   = toDS(curYear, curMonth, daysInMonth(curYear, curMonth));

        return Promise.all([
            frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Shift Type', fields:['name','start_time','end_time'], limit_page_length:100, order_by:'name asc' }}),
            frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Employee', filters:{ status:'Active', department:DEPT }, fields:['name','employee_name','designation'], limit_page_length:300, order_by:'employee_name asc' }}),
            frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Holiday List', fields:['name','from_date','to_date'], limit_page_length:20, order_by:'modified desc' }}),
            frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Shift Assignment', filters:[['start_date','between',[monthStart,monthEnd]],['docstatus','=',1]], fields:['name','employee','shift_type','start_date'], limit_page_length:5000 }})
        ]).then(async ([stRes, empRes, hlRes, saRes]) => {
            const pal = currentPalette();
            const rawShifts = stRes.message || [];
            const targetShifts = rawShifts.filter(s => s.name.toLowerCase().includes('target'));
            const useShifts = targetShifts.length > 0 ? targetShifts : rawShifts;
            SHIFTS = useShifts.map((s, i) => {
                const p = pal[i % pal.length];
                const fmt = t => { if (!t) return ''; const [hh,mm]=t.split(':'); const h=parseInt(hh),m=parseInt(mm); const ap=h>=12?'PM':'AM'; const hd=h>12?h-12:(h===0?12:h); return `${hd}:${String(m).padStart(2,'0')} ${ap}`; };
                const tS=fmt(s.start_time), tE=fmt(s.end_time);
                const short = (tS&&tE) ? `${tS.replace(' AM','am').replace(' PM','pm')}–${tE.replace(' AM','am').replace(' PM','pm')}` : '';
                const label = (tS&&tE) ? `${tS} – ${tE}` : s.name;
                return { name:s.name, fullName:s.name, short, label, icon:p.icon, color:p.color, bg:p.bg, bd:p.bd, bar:p.bar };
            });
            SMAP = {}; SHIFTS.forEach(s => SMAP[s.name] = s);

            employees = empRes.message || []; filteredEmps = [...employees];
            employees.forEach(e => { plan[e.name] = {}; });
            const validNames = new Set(SHIFTS.map(s => s.name));
            (saRes.message || []).forEach(a => { if (validNames.has(a.shift_type) && plan[a.employee] !== undefined) plan[a.employee][a.start_date] = a.shift_type; });
            savedPlan = JSON.parse(JSON.stringify(plan));

            holidays = {};
            const allLists = (hlRes.message || []).filter(hl => { if (!hl.from_date||!hl.to_date) return true; return hl.from_date<=monthEnd && hl.to_date>=monthStart; });
            for (const hl of allLists.slice(0,3)) {
                try {
                    const r = await frappe.call({ method:'frappe.client.get', args:{ doctype:'Holiday List', name:hl.name }});
                    (r.message?.holidays||[]).forEach(h => { if (h.holiday_date>=monthStart && h.holiday_date<=monthEnd) holidays[h.holiday_date]=h.description||'Public Holiday'; });
                } catch(e) {}
            }
            buildLegend();
           
            renderGrid();
        }).catch(err => {
            const wrap = document.getElementById('dtp-grid-wrap');
            if (wrap) wrap.innerHTML = `<div class="dtp-error-state"><div class="dtp-error-icon">⚠️</div><div class="dtp-error-title">Failed to load data</div><div class="dtp-error-msg">${err.message||'Check the browser console.'}</div><button class="dtp-btn primary" onclick="dtpRetry()">🔄 Retry</button></div>`;
        });
    }
    window.dtpRetry = function() { init(); };

    // ─── Render grid ─────────────────────────────────────────────────────────
    function renderGrid() {
        const days  = daysInMonth(curYear, curMonth);
        const today = todayStr();
        const wrap  = document.getElementById('dtp-grid-wrap');
        if (!wrap) return;
        if (!filteredEmps.length) {
            wrap.innerHTML = searchQ
                ? `<div class="dtp-no-results">😕 No employees match "<strong>${searchQ}</strong>"</div>`
                : `<div class="dtp-no-results">No active employees in department: <strong>${DEPT}</strong></div>`;
            return;
        }
        const dayCount = {};
        for (let d=1; d<=days; d++) { const ds=toDS(curYear,curMonth,d); dayCount[ds]=employees.filter(e=>!!plan[e.name]?.[ds]).length; }

        let html = `<table class="dtp-grid"><thead><tr><th class="dtp-th-emp">Employee (${filteredEmps.length})</th>`;
        for (let d=1; d<=days; d++) {
            const ds=toDS(curYear,curMonth,d), dow=new Date(ds+'T00:00:00').getDay(), isToday=ds===today, holiday=holidays[ds], cnt=dayCount[ds];
            let cls=''; if(dow===0) cls+=' sun'; if(isToday) cls+=' today';
            html += `<th class="dtp-th-day${cls}" onclick="dtpFillDay(${d})" title="Click to fill column">
                <span class="dn">${DAYS[dow]}</span><span class="dd">${d}</span>
                ${holiday ? `<span class="dtp-th-holiday-name" title="${holiday}">🎉 ${holiday}</span>`
                          : (cnt>0 ? `<span class="col-badge">${cnt}/${employees.length}</span>` : '')}
                <span class="fill-hint">fill ▾</span>
            </th>`;
        }
        html += '</tr></thead><tbody>';
        filteredEmps.forEach((emp, ei) => {
            const gi=employees.findIndex(e=>e.name===emp.name), isSW=sundayWorkers.has(emp.name);
            const avClr=AVC[(gi>=0?gi:ei)%AVC.length];
            const init=emp.employee_name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
            html += `<tr><td class="dtp-td-emp" onclick="dtpToggleSunday('${emp.name}')" title="Toggle Sunday worker">
                <div class="dtp-emp-row">
                    <div class="dtp-emp-av" style="background:${avClr}">${init}</div>
                    <div>
                        <div class="dtp-emp-name">${emp.employee_name}</div>
                        <div class="dtp-emp-id">${emp.name}</div>
                        ${emp.designation?`<div class="dtp-emp-desg">${emp.designation}</div>`:''}
                        ${isSW?'<div class="dtp-sun-tag">☀ Sunday worker</div>':''}
                    </div>
                </div>
            </td>`;
            for (let d=1; d<=days; d++) {
                const ds=toDS(curYear,curMonth,d), dow=new Date(ds+'T00:00:00').getDay();
                const offSun=dow===0&&!isSW, isHol=!!holidays[ds], shift=plan[emp.name]?.[ds]||null;
                let tdCls='dtp-td-cell';
                if(offSun) tdCls+=' sun-off'; if(ds===today) tdCls+=' today-col'; if(isHol&&!shift) tdCls+=' holiday-col'; // holiday-col is visual only, click still works
                const noClick=offSun;  // holidays are clickable — HR can assign shifts on public holidays
                html += `<td class="${tdCls}" data-emp="${emp.name}" data-date="${ds}"
                    ${noClick?'':`onclick="dtpCtx(event,'${emp.name}','${ds}')" oncontextmenu="event.preventDefault();dtpCtx(event,'${emp.name}','${ds}')"`}>
                    ${buildCell(emp.name,ds,shift,offSun,isHol)}</td>`;
            }
            html += '</tr>';
        });
        html += '</tbody></table>';
        wrap.innerHTML = html;
    }

    // ─── Cell builder ────────────────────────────────────────────────────────
    function buildCell(empId, ds, shiftName, offSun, isHol) {
        if (offSun) return `<div class="dtp-cell-wo"><div class="dtp-wo-lbl">WO</div><div class="dtp-wo-sub">Day Off</div></div>`;
        if (isHol && !shiftName) return `<div class="dtp-cell-holiday"><div class="dtp-holiday-icon">🎉</div><div class="dtp-holiday-lbl">${holidays[ds]||'Holiday'}</div></div>`;
        if (shiftName && SMAP[shiftName]) {
            const s=SMAP[shiftName];
            return `<div class="dtp-shift-card" style="background:${s.bg};border-color:${s.bd}">
                <div class="dtp-shift-bar" style="background:${s.bar}"></div>
                <div class="dtp-shift-top">
                    ${isHol?`<div style="font-size:7px;color:var(--dtp-hol);font-weight:700;margin-bottom:1px">🎉 ${holidays[ds]}</div>`:''}
                    <div class="dtp-shift-sname" style="color:${s.color}">${s.icon} ${s.fullName}</div>
                    ${s.short?`<div class="dtp-shift-sshort" style="color:${s.color}">${s.short}</div>`:''}
                </div>
                ${s.label?`<div class="dtp-shift-time" style="color:${s.color}">🕐 ${s.label}</div>`:''}
            </div>`;
        }
        if (shiftName) return `<div class="dtp-shift-card" style="background:var(--dtp-ibg);border-color:var(--dtp-bd2)"><div class="dtp-shift-bar" style="background:var(--dtp-mu)"></div><div class="dtp-shift-top"><div class="dtp-shift-sname" style="color:var(--dtp-mu)">📋 ${shiftName}</div></div></div>`;
        return `<div class="dtp-cell-empty"><span class="dtp-cell-plus">+</span><span class="dtp-cell-plus-lbl">assign</span></div>`;
    }
    function buildSaving() { return `<div class="dtp-cell-saving"><div class="dtp-spin"></div><div class="dtp-cell-saving-txt">Saving…</div></div>`; }
    function refreshCell(empId, ds) {
        const cell=document.querySelector(`.dtp-td-cell[data-emp="${empId}"][data-date="${ds}"]`);
        if (!cell) return;
        const dow=new Date(ds+'T00:00:00').getDay(), offSun=dow===0&&!sundayWorkers.has(empId);
        cell.innerHTML=buildCell(empId,ds,plan[empId]?.[ds]||null,offSun,!!holidays[ds]);
    }
    function flashCell(empId, ds) {
        const cell=document.querySelector(`.dtp-td-cell[data-emp="${empId}"][data-date="${ds}"]`);
        if (!cell) return; refreshCell(empId,ds); cell.classList.add('dtp-flash'); setTimeout(()=>cell.classList.remove('dtp-flash'),500);
    }
    function showSavingCell(empId, ds) { const cell=document.querySelector(`.dtp-td-cell[data-emp="${empId}"][data-date="${ds}"]`); if(cell) cell.innerHTML=buildSaving(); }

    // --- Context menu -------------------------------------------------------
    // Hard-coded solid colors -- ERPNext cannot override to transparent.
    function ctxColors() {
        const dark = isDark();
        return {
            bg:       dark ? '#1e2635' : '#ffffff',
            hov:      dark ? '#2a3448' : '#f0f4fa',
            tx:       dark ? '#e6edf3' : '#0f1c2e',
            mu:       dark ? '#8b98a5' : '#566880',
            lt:       dark ? '#4d5d6e' : '#8a9ab0',
            div:      dark ? '#2a3140' : '#e8edf5',
            rose:     dark ? '#f87171' : '#dc2626',
            roseLt:   dark ? 'rgba(248,113,113,.14)' : 'rgba(220,38,38,.08)',
            border:   dark ? '#3a4455' : '#d1d9e6',
            activeBg: dark ? 'rgba(77,142,247,.18)' : 'rgba(37,99,235,.09)',
            activeBd: dark ? 'rgba(77,142,247,.4)'  : 'rgba(37,99,235,.3)',
        };
    }

    window.dtpCtx = function(e, empId, ds) {
        e.stopPropagation();
        if (savingSet.has(empId+'|'+ds)) return;
        const emp=employees.find(x=>x.name===empId), cur=plan[empId]?.[ds]||null;
        const ctx=document.getElementById('dtp-ctx');
        const d=new Date(ds+'T00:00:00');
        const lbl=d.toLocaleDateString('en',{ weekday:'long', month:'long', day:'numeric', year:'numeric' });
        const isHol=!!holidays[ds];
        const C=ctxColors();

        // Solid inline style -- bypasses ERPNext overrides completely
        const baseStyle='background:'+C.bg+' !important;border:1.5px solid '+C.border+';border-top:3px solid #2563eb;border-radius:14px;position:fixed;z-index:100000;box-shadow:0 24px 64px rgba(0,0,0,.28),0 8px 24px rgba(0,0,0,.16);min-width:272px;max-width:292px;overflow:hidden;isolation:isolate;display:block;';
        ctx.setAttribute('style', baseStyle);

        // Helper: solid button HTML
        function btn(opts) {
            const bg0=opts.bg||C.bg, hov=opts.hov||C.hov;
            return '<button style="display:flex;align-items:center;gap:9px;padding:8px 9px;border-radius:9px;cursor:pointer;border:'+
                (opts.border||'none')+';width:100%;text-align:left;font-family:DM Sans,sans-serif;font-size:12px;font-weight:600;color:'+opts.color+';background:'+bg0+'" '+
                'onmouseover="this.style.background=\''+hov+'\'" onmouseout="this.style.background=\''+bg0+'\'" '+
                'onclick="'+opts.onclick+'">';
        }

        let html='<div class="dtp-ctx-hdr">'+
            '<div class="dtp-ctx-emp">'+(emp?emp.employee_name:empId)+'</div>'+
            '<div class="dtp-ctx-date">'+String.fromCodePoint(0x1F4C5)+' '+lbl+'</div>'+
            (isHol?'<div class="dtp-ctx-holiday-note">'+String.fromCodePoint(0x1F389)+' '+holidays[ds]+'</div>':'')+
        '</div>'+
        '<div style="padding:6px 6px 8px;max-height:420px;overflow-y:auto;background:'+C.bg+'">'+
        '<span style="font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:'+C.lt+';padding:8px 9px 4px;display:block">ASSIGN SHIFT</span>';

        if (!SHIFTS.length) {
            html+='<div style="padding:12px;font-size:12px;color:'+C.mu+';text-align:center">No shift types loaded</div>';
        } else {
            SHIFTS.forEach(function(s) {
                const active=cur===s.name;
                const bg0=active?C.activeBg:C.bg, bd0=active?C.activeBd:'transparent';
                html+=btn({bg:bg0,hov:C.hov,color:C.tx,border:'1px solid '+bd0,onclick:"dtpAssign('"+empId+"','"+ds+"','"+s.name.replace(/'/g,"\\'")+"')"})+
                    '<div style="width:36px;height:36px;border-radius:9px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:16px;background:'+s.bg+';border:1.5px solid '+s.bd+'">'+s.icon+'</div>'+
                    '<div style="flex:1;min-width:0">'+
                        '<span style="font-size:12px;font-weight:700;color:'+(active?s.color:C.tx)+';display:block;line-height:1.2">'+s.fullName+'</span>'+
                        '<span style="font-size:9.5px;color:'+C.mu+';font-family:DM Mono,monospace;display:block;margin-top:2px">'+(s.short||s.label)+'</span>'+
                    '</div>'+
                    (active?'<span style="font-size:14px;color:#2563eb;margin-left:4px">&#10003;</span>':'')+
                '</button>';
            });
        }

        if (cur) {
            html+='<div style="height:1px;background:'+C.div+';margin:4px 0"></div>'+
                btn({color:C.rose,roseLt:C.roseLt,hov:C.roseLt,onclick:"dtpAssign('"+empId+"','"+ds+"','__REMOVE__')"})+
                    '<div style="width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:13px;background:'+C.roseLt+'">&#128465;</div>Remove shift'+
                '</button>';
        }

        html+='<div style="height:1px;background:'+C.div+';margin:4px 0"></div>'+
            '<span style="font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:'+C.lt+';padding:8px 9px 4px;display:block">BULK &mdash; THIS EMPLOYEE</span>';

        SHIFTS.forEach(function(s) {
            html+=btn({color:C.mu,hov:C.hov,onclick:"dtpFillRow('"+empId+"','"+s.name.replace(/'/g,"\\'")+"')"})+
                '<div style="width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:13px;background:'+s.bg+'">'+s.icon+'</div>Fill month &rarr; '+s.fullName+
            '</button>';
        });

        html+=btn({color:C.rose,hov:C.roseLt,onclick:"dtpClearRow('"+empId+"')"})+
            '<div style="width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:13px;background:'+C.roseLt+'">&#128465;</div>Clear this employee\'s month'+
        '</button></div>';

        ctx.innerHTML=html;
        ctx.classList.add('open');
        openCtx=ctx;
        const vw=window.innerWidth, vh=window.innerHeight;
        let x=e.clientX+8, y=e.clientY+8;
        if(x+295>vw) x=vw-298; if(y+530>vh) y=vh-534; if(x<8) x=8; if(y<8) y=8;
        ctx.style.left=x+'px'; ctx.style.top=y+'px';
    };
    document.addEventListener('click', e => { if(openCtx&&!e.target.closest('#dtp-ctx')){ openCtx.setAttribute('style','display:none'); openCtx.classList.remove('open'); openCtx=null; } });


    // ─── Assign ──────────────────────────────────────────────────────────────
    window.dtpAssign = async function(empId, ds, shiftName) {
        if(openCtx){ openCtx.setAttribute('style','display:none'); openCtx.classList.remove('open'); openCtx=null; }
        const isRemove=shiftName==='__REMOVE__', newShift=isRemove?null:shiftName, oldShift=plan[empId]?.[ds]||null;
        if(newShift===oldShift) return;
        if(!plan[empId]) plan[empId]={};
        if(newShift) plan[empId][ds]=newShift; else delete plan[empId][ds];
        const key=empId+'|'+ds; savingSet.add(key); showSavingCell(empId,ds);
        try {
            await cancelAndDelete(empId,ds);
            if(newShift){ const ins=await frappe.call({ method:'frappe.client.insert', args:{ doc:{ doctype:'Shift Assignment', employee:empId, company:COMPANY, shift_type:newShift, start_date:ds, end_date:ds, docstatus:0 }}}); if(ins.message) await frappe.call({ method:'frappe.client.submit', args:{ doc:ins.message }}); }
            if(!savedPlan[empId]) savedPlan[empId]={};
            if(newShift) savedPlan[empId][ds]=newShift; else delete savedPlan[empId][ds];
            savingSet.delete(key); flashCell(empId,ds);
            const empName=employees.find(e=>e.name===empId)?.employee_name||empId;
            toast(newShift?`✓ ${SMAP[newShift]?.fullName||newShift} → ${empName}`:`Shift removed for ${empName}`);
        } catch(err) {
            if(oldShift) plan[empId][ds]=oldShift; else delete plan[empId][ds];
            savingSet.delete(key); refreshCell(empId,ds);
            frappe.show_alert({ message:`Save failed: ${err.message||err}`, indicator:'red' });
        }
    };

    // ─── Fill / clear ─────────────────────────────────────────────────────────
    window.dtpFillRow = async function(empId, shiftName) {
        if(openCtx){ openCtx.classList.remove('open'); openCtx=null; }
        const days=daysInMonth(curYear,curMonth), isSW=sundayWorkers.has(empId), cells=[];
        for(let d=1;d<=days;d++){ const ds=toDS(curYear,curMonth,d), dow=new Date(ds+'T00:00:00').getDay(); if(dow===0&&!isSW) continue; if(holidays[ds]) continue; if(plan[empId]?.[ds]===shiftName) continue; cells.push(ds); }
        if(!cells.length){ toast('All eligible days already set'); return; }
        await bulkSave(cells.map(ds=>({empId,ds,shiftName})));
    };
    window.dtpClearRow = async function(empId) {
        if(openCtx){ openCtx.classList.remove('open'); openCtx=null; }
        const days=daysInMonth(curYear,curMonth), cells=[];
        for(let d=1;d<=days;d++){ const ds=toDS(curYear,curMonth,d); if(plan[empId]?.[ds]) cells.push({empId,ds,shiftName:null}); }
        if(!cells.length){ toast('No shifts to clear'); return; }
        await bulkSave(cells);
    };
    window.dtpFillDay = function(d) {
        const ds=toDS(curYear,curMonth,d), dow=new Date(ds+'T00:00:00').getDay();
        if(!SHIFTS.length){ toast('No shift types available'); return; }
        frappe.prompt([{ label:'Shift', fieldname:'shift', fieldtype:'Select', options:SHIFTS.map(s=>s.name).join('\n'), reqd:1 }], async val => {
            const cells=employees.filter(emp=>!(dow===0&&!sundayWorkers.has(emp.name))).filter(emp=>plan[emp.name]?.[ds]!==val.shift).map(emp=>({empId:emp.name,ds,shiftName:val.shift}));
            if(!cells.length){ toast('All employees already on this shift'); return; } await bulkSave(cells);
        }, 'Assign shift for this day', 'Apply');
    };
    window.dtpFillAll = function() {
        if(!SHIFTS.length){ toast('No shift types available'); return; }
        frappe.prompt([{ label:'Default Shift', fieldname:'shift', fieldtype:'Select', options:SHIFTS.map(s=>s.name).join('\n'), reqd:1 }], async val => {
            const days=daysInMonth(curYear,curMonth), cells=[];
            employees.forEach(emp=>{ const isSW=sundayWorkers.has(emp.name); for(let d=1;d<=days;d++){ const ds=toDS(curYear,curMonth,d), dow=new Date(ds+'T00:00:00').getDay(); if(dow===0&&!isSW) continue; if(holidays[ds]) continue; if(plan[emp.name]?.[ds]===val.shift) continue; cells.push({empId:emp.name,ds,shiftName:val.shift}); } });
            if(!cells.length){ toast('All workdays already filled'); return; } await bulkSave(cells);
        }, 'Fill All Workdays', 'Apply');
    };
    window.dtpFillWeekdays = function() {
        if(!SHIFTS.length){ toast('No shift types available'); return; }
        frappe.prompt([{ label:'Shift (Mon–Sat)', fieldname:'shift', fieldtype:'Select', options:SHIFTS.map(s=>s.name).join('\n'), reqd:1 }], async val => {
            const days=daysInMonth(curYear,curMonth), cells=[];
            employees.forEach(emp=>{ for(let d=1;d<=days;d++){ const ds=toDS(curYear,curMonth,d), dow=new Date(ds+'T00:00:00').getDay(); if(dow===0) continue; if(holidays[ds]) continue; if(plan[emp.name]?.[ds]===val.shift) continue; cells.push({empId:emp.name,ds,shiftName:val.shift}); } });
            if(!cells.length){ toast('All Mon–Sat already filled'); return; } await bulkSave(cells);
        }, 'Fill Mon–Sat Only', 'Apply');
    };
    window.dtpClearMonth = function() {
        if(!confirm('Clear ALL shifts for this month?')) return;
        const days=daysInMonth(curYear,curMonth), cells=[];
        employees.forEach(emp=>{ for(let d=1;d<=days;d++){ const ds=toDS(curYear,curMonth,d); if(plan[emp.name]?.[ds]) cells.push({empId:emp.name,ds,shiftName:null}); } });
        if(!cells.length){ toast('Nothing to clear'); return; } bulkSave(cells);
    };

    // ─── Bulk save ───────────────────────────────────────────────────────────
    async function bulkSave(cells) {
        const prog=document.getElementById('dtp-prog');
        cells.forEach(({empId,ds,shiftName})=>{ if(!plan[empId]) plan[empId]={}; if(shiftName) plan[empId][ds]=shiftName; else delete plan[empId][ds]; savingSet.add(empId+'|'+ds); showSavingCell(empId,ds); });
        if(prog){ prog.style.display='block'; prog.style.width='0%'; }
        toast(`⏳ Saving ${cells.length} change${cells.length!==1?'s':''}…`);
        let done=0, errs=0;
        for(const {empId,ds,shiftName} of cells){
            done++; if(prog) prog.style.width=Math.round(done/cells.length*100)+'%';
            const key=empId+'|'+ds;
            try {
                await cancelAndDelete(empId,ds);
                if(shiftName){ const ins=await frappe.call({ method:'frappe.client.insert', args:{ doc:{ doctype:'Shift Assignment', employee:empId, company:COMPANY, shift_type:shiftName, start_date:ds, end_date:ds, docstatus:0 }}}); if(ins.message) await frappe.call({ method:'frappe.client.submit', args:{ doc:ins.message }}); }
                if(!savedPlan[empId]) savedPlan[empId]={}; if(shiftName) savedPlan[empId][ds]=shiftName; else delete savedPlan[empId][ds];
                savingSet.delete(key); flashCell(empId,ds);
            } catch(e){ errs++; const prev=savedPlan[empId]?.[ds]||null; if(prev) plan[empId][ds]=prev; else delete plan[empId][ds]; savingSet.delete(key); refreshCell(empId,ds); }
        }
        if(prog){ prog.style.width='100%'; setTimeout(()=>{ prog.style.display='none'; prog.style.width='0%'; },600); }
       
        toast(errs>0?`⚠ ${done-errs} saved, ${errs} failed`:`✓ ${done} change${done!==1?'s':''} saved`);
    }

    // ─── Sunday toggle ───────────────────────────────────────────────────────
    window.dtpToggleSunday = function(empId) {
        if(sundayWorkers.has(empId)) sundayWorkers.delete(empId); else sundayWorkers.add(empId);
        renderGrid();
        const emp=employees.find(e=>e.name===empId);
        toast(sundayWorkers.has(empId)?`☀ ${emp?.employee_name} marked as Sunday worker`:`${emp?.employee_name} removed from Sunday workers`);
    };

    // ─── Export CSV ──────────────────────────────────────────────────────────
    window.dtpExport = function() {
        const days=daysInMonth(curYear,curMonth), dates=[];
        for(let d=1;d<=days;d++) dates.push(toDS(curYear,curMonth,d));
        let csv='Employee ID,Employee Name,Designation,'+dates.join(',')+'\n';
        employees.forEach(emp=>{ const row=[emp.name,`"${emp.employee_name}"`,`"${emp.designation||''}"`]; dates.forEach(ds=>row.push(plan[emp.name]?.[ds]?`"${plan[emp.name][ds]}"`:'')); csv+=row.join(',')+'\n'; });
        const blob=new Blob(['\uFEFF'+csv],{ type:'text/csv;charset=utf-8;' }), url=URL.createObjectURL(blob), a=document.createElement('a');
        a.href=url; a.download=`day_team_shifts_${curYear}_${String(curMonth+1).padStart(2,'0')}.csv`; a.click(); URL.revokeObjectURL(url);
        toast('📋 CSV exported');
    };

    // ─── Cancel + delete overlapping assignments ─────────────────────────────
    async function cancelAndDelete(empId, ds) {
        const res=await frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Shift Assignment', filters:[['employee','=',empId],['start_date','<=',ds],['end_date','>=',ds],['docstatus','in',['0','1']]], fields:['name','docstatus'], limit_page_length:20 }});
        for(const rec of (res.message||[])){
            try {
                const ckins=await frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Employee Checkin', filters:[['employee','=',empId],['time','like',ds+'%']], fields:['name'], limit_page_length:50 }});
                for(const ck of (ckins.message||[])) await frappe.call({ method:'frappe.db.set_value', args:{ doctype:'Employee Checkin', name:ck.name, fieldname:{ shift_assignment:'', shift_type:'' }}}).catch(()=>{});
            } catch(e) {}
            if(String(rec.docstatus)==='1') try { await frappe.call({ method:'frappe.client.cancel', args:{ doctype:'Shift Assignment', name:rec.name }}); } catch(e) {}
            try { await frappe.call({ method:'frappe.client.delete', args:{ doctype:'Shift Assignment', name:rec.name }}); } catch(e) {}
        }
    }

    // ─── Toast ───────────────────────────────────────────────────────────────
    function toast(msg) {
        const t=document.getElementById('dtp-toast'); if(!t) return;
        t.innerHTML=msg; t.classList.add('on'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('on'),3200);
    }

    init();
};
