/**
 * Employee Leave Manager
 * ----------------------
 * One screen for leave balances, days that are missing a leave application,
 * and employees with no allocation at all.
 *
 * The payroll coupling is the whole point of this page. Payroll on this site
 * reads ONE Attendance row per date, so applying leave rewrites what an
 * employee is paid for that day -- but nothing recomputes a salary slip that
 * was already calculated. So every view states the payroll state of the
 * selected period, and the Rebuild tab recomputes submitted slips through the
 * real engine to show which ones no longer match.
 */

frappe.pages['employee-leave-manager'].on_page_load = function (wrapper) {
    frappe.ui.make_app_page({ parent: wrapper, title: 'Employee Leave Manager', single_column: true });
    document.title = 'Employee Leave Manager';

    const M = 'auto_leave_assignment.api.leave_manager_api.';

    if (!document.getElementById('elm-font')) {
        const lnk = document.createElement('link');
        lnk.id = 'elm-font'; lnk.rel = 'stylesheet';
        lnk.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap';
        document.head.appendChild(lnk);
    }

    $('#elm-styles').remove();
    $('<style id="elm-styles">').text(`
        .elm {
            --bg:  var(--bg-color,    #f0f3f8);
            --card:var(--card-bg,     #ffffff);
            --ibg: var(--control-bg,  #f7f9fc);
            --hov: var(--hover-bg,    #edf1f8);
            --bd:  var(--border-color,#e2e8f3);
            --bd2: var(--dark-border-color,#c5d0df);
            --tx:  var(--text-color,  #0f1c2e);
            --mu:  var(--text-muted,  #566880);
            --lt:  var(--text-light,  #95abbe);
            --blue:#2563eb; --blue-lt:rgba(37,99,235,.10); --blue-bd:rgba(37,99,235,.3);
            --grn: #059669; --grn-lt:rgba(5,150,105,.10);  --grn-bd:rgba(5,150,105,.3);
            --rose:#dc2626; --rose-lt:rgba(220,38,38,.08); --rose-bd:rgba(220,38,38,.25);
            --amb: #d97706; --amb-lt:rgba(217,119,6,.10);  --amb-bd:rgba(217,119,6,.3);
            --vio: #7c3aed; --vio-lt:rgba(124,58,237,.08); --vio-bd:rgba(124,58,237,.25);
            --r: 10px;
            --sh: 0 1px 4px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.04);
        }
        [data-theme="dark"] .elm {
            --bg:var(--bg-color,#0d1117); --card:var(--card-bg,#161b22); --ibg:var(--control-bg,#1c2230);
            --hov:var(--hover-bg,#1e2635); --bd:var(--border-color,#2a3140); --bd2:var(--dark-border-color,#3a4455);
            --tx:var(--text-color,#e6edf3); --mu:var(--text-muted,#8b98a5); --lt:var(--text-light,#4d5d6e);
            --blue:#4d8ef7; --blue-lt:rgba(77,142,247,.12); --blue-bd:rgba(77,142,247,.35);
            --grn:#34d399; --grn-lt:rgba(52,211,153,.10);  --grn-bd:rgba(52,211,153,.3);
            --rose:#f87171; --rose-lt:rgba(248,113,113,.09); --rose-bd:rgba(248,113,113,.28);
            --amb:#fbbf24; --amb-lt:rgba(251,191,36,.10);  --amb-bd:rgba(251,191,36,.3);
            --vio:#c084fc; --vio-lt:rgba(192,132,252,.09); --vio-bd:rgba(192,132,252,.28);
            --sh:0 1px 4px rgba(0,0,0,.4),0 1px 2px rgba(0,0,0,.28);
        }
        .elm { font-family:'DM Sans',sans-serif; background:var(--bg); min-height:100vh;
               padding:14px 14px 96px; color:var(--tx); }
        .elm .mono { font-family:'DM Mono',monospace; }

        .elm-topbar { background:var(--card); border:1px solid var(--bd); border-left:4px solid var(--blue);
            border-radius:var(--r); padding:12px 16px; margin-bottom:8px; display:flex; align-items:center;
            justify-content:space-between; flex-wrap:wrap; gap:10px; box-shadow:var(--sh); }
        .elm-brand { display:flex; align-items:center; gap:11px; }
        .elm-brand-ic { width:34px; height:34px; border-radius:9px; background:var(--blue-lt);
            color:var(--blue); display:flex; align-items:center; justify-content:center; font-size:17px; }
        .elm-brand h2 { margin:0; font-size:16px; font-weight:800; letter-spacing:-.2px; }
        .elm-brand p { margin:1px 0 0; font-size:11.5px; color:var(--mu); }
        .elm-ctrls { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }

        .elm-seg { display:inline-flex; background:var(--ibg); border:1px solid var(--bd); border-radius:8px; padding:2px; }
        .elm-seg button { border:0; background:transparent; color:var(--mu); font-size:11.5px; font-weight:700;
            padding:5px 11px; border-radius:6px; cursor:pointer; font-family:inherit; }
        .elm-seg button.on { background:var(--card); color:var(--blue); box-shadow:var(--sh); }

        .elm-per { display:inline-flex; align-items:center; gap:2px; background:var(--ibg);
            border:1px solid var(--bd); border-radius:8px; padding:2px 3px; }
        .elm-per button { border:0; background:transparent; color:var(--mu); cursor:pointer;
            font-size:14px; padding:3px 8px; border-radius:6px; font-family:inherit; }
        .elm-per button:hover { background:var(--hov); color:var(--tx); }
        .elm-per .lbl { font-size:12px; font-weight:700; padding:0 8px; min-width:150px; text-align:center; }

        .elm-btn { border:1px solid var(--bd2); background:var(--card); color:var(--tx); font-size:11.5px;
            font-weight:700; padding:6px 12px; border-radius:8px; cursor:pointer; font-family:inherit; }
        .elm-btn:hover { background:var(--hov); }
        .elm-btn.pri { background:var(--blue); border-color:var(--blue); color:#fff; }
        .elm-btn.pri:hover { filter:brightness(1.08); }
        .elm-btn.warn { background:var(--amb); border-color:var(--amb); color:#fff; }
        .elm-btn:disabled { opacity:.45; cursor:not-allowed; }

        .elm-banner { border-radius:var(--r); padding:10px 14px; margin-bottom:8px; font-size:12.5px;
            display:flex; align-items:center; gap:10px; border:1px solid; }
        .elm-banner .tag { font-size:10.5px; font-weight:800; letter-spacing:.4px; padding:3px 8px;
            border-radius:6px; white-space:nowrap; }
        .elm-banner.ok   { background:var(--grn-lt);  border-color:var(--grn-bd);  color:var(--grn); }
        .elm-banner.warn { background:var(--amb-lt);  border-color:var(--amb-bd);  color:var(--amb); }
        .elm-banner.bad  { background:var(--rose-lt); border-color:var(--rose-bd); color:var(--rose); }
        .elm-banner .tag.ok{background:var(--grn);color:#fff}
        .elm-banner .tag.warn{background:var(--amb);color:#fff}
        .elm-banner .tag.bad{background:var(--rose);color:#fff}
        .elm-banner a { color:inherit; text-decoration:underline; font-weight:700; }

        .elm-cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(142px,1fr)); gap:8px; margin-bottom:8px; }
        .elm-card { background:var(--card); border:1px solid var(--bd); border-radius:var(--r); padding:10px 12px;
            box-shadow:var(--sh); cursor:pointer; border-top:3px solid var(--bd2); transition:transform .08s; }
        .elm-card:hover { transform:translateY(-1px); background:var(--hov); }
        .elm-card .v { font-family:'DM Mono',monospace; font-size:19px; font-weight:600; line-height:1.15; }
        .elm-card .l { font-size:10.5px; color:var(--mu); font-weight:600; margin-top:2px;
            text-transform:uppercase; letter-spacing:.3px; }
        .elm-card.b{border-top-color:var(--blue)} .elm-card.b .v{color:var(--blue)}
        .elm-card.g{border-top-color:var(--grn)}  .elm-card.g .v{color:var(--grn)}
        .elm-card.r{border-top-color:var(--rose)} .elm-card.r .v{color:var(--rose)}
        .elm-card.a{border-top-color:var(--amb)}  .elm-card.a .v{color:var(--amb)}
        .elm-card.v2{border-top-color:var(--vio)} .elm-card.v2 .v{color:var(--vio)}

        .elm-filters { background:var(--card); border:1px solid var(--bd); border-radius:var(--r);
            padding:9px 12px; margin-bottom:8px; display:flex; gap:8px; align-items:center;
            flex-wrap:wrap; box-shadow:var(--sh); }
        .elm-filters input, .elm-filters select { background:var(--ibg); border:1px solid var(--bd);
            color:var(--tx); border-radius:7px; padding:5px 9px; font-size:12px; font-family:inherit; outline:none; }
        .elm-filters input:focus, .elm-filters select:focus { border-color:var(--blue); }
        .elm-chip { border:1px solid var(--bd); background:var(--ibg); color:var(--mu); font-size:11px;
            font-weight:700; padding:5px 10px; border-radius:20px; cursor:pointer; font-family:inherit; }
        .elm-chip.on { background:var(--blue-lt); border-color:var(--blue-bd); color:var(--blue); }

        .elm-tabs { display:flex; gap:4px; margin-bottom:8px; flex-wrap:wrap; }
        .elm-tab { border:1px solid var(--bd); background:var(--card); color:var(--mu); font-size:12px;
            font-weight:700; padding:7px 13px; border-radius:8px 8px 0 0; cursor:pointer; font-family:inherit;
            display:flex; align-items:center; gap:6px; }
        .elm-tab.on { background:var(--blue); border-color:var(--blue); color:#fff; }
        .elm-tab .n { background:rgba(0,0,0,.12); border-radius:10px; padding:1px 7px; font-size:10.5px; }
        .elm-tab.on .n { background:rgba(255,255,255,.22); }

        .elm-panel { background:var(--card); border:1px solid var(--bd); border-radius:var(--r);
            box-shadow:var(--sh); overflow:hidden; }
        .elm-scroll { overflow:auto; max-height:calc(100vh - 400px); }
        .elm-grid { width:100%; border-collapse:collapse; font-size:12.5px; }
        .elm-grid th { position:sticky; top:0; z-index:2; background:var(--ibg); color:var(--mu);
            font-size:10.5px; font-weight:800; text-transform:uppercase; letter-spacing:.35px;
            padding:9px 10px; text-align:left; border-bottom:1px solid var(--bd); white-space:nowrap; }
        .elm-grid td { padding:8px 10px; border-bottom:1px solid var(--bd); vertical-align:middle; }
        .elm-grid tbody tr:hover { background:var(--hov); }
        .elm-grid .num { font-family:'DM Mono',monospace; text-align:right; }
        .elm-emp { font-weight:700; }
        .elm-emp small { display:block; font-family:'DM Mono',monospace; font-size:10.5px;
            color:var(--lt); font-weight:400; }

        .elm-pill { display:inline-block; font-size:10.5px; font-weight:800; padding:2px 8px;
            border-radius:20px; border:1px solid; white-space:nowrap; }
        .elm-pill.ok{background:var(--grn-lt);border-color:var(--grn-bd);color:var(--grn)}
        .elm-pill.warn{background:var(--amb-lt);border-color:var(--amb-bd);color:var(--amb)}
        .elm-pill.bad{background:var(--rose-lt);border-color:var(--rose-bd);color:var(--rose)}
        .elm-pill.info{background:var(--blue-lt);border-color:var(--blue-bd);color:var(--blue)}
        .elm-pill.mute{background:var(--ibg);border-color:var(--bd);color:var(--mu)}

        .elm-bal { font-family:'DM Mono',monospace; font-size:12px; white-space:nowrap; cursor:help; }
        .elm-bal .l { color:var(--lt); }
        .elm-bal b.g{color:var(--grn)} .elm-bal b.a{color:var(--amb)} .elm-bal b.r{color:var(--rose)}

        .elm-act { display:flex; gap:5px; align-items:center; }
        .elm-abtn { border:1px solid var(--bd2); background:var(--card); color:var(--tx); font-size:11px;
            font-weight:700; padding:4px 9px; border-radius:6px; cursor:pointer; font-family:inherit; white-space:nowrap; }
        .elm-abtn:hover { background:var(--hov); }
        .elm-abtn.pri { background:var(--blue); border-color:var(--blue); color:#fff; }
        .elm-abtn.dgr { color:var(--rose); border-color:var(--rose-bd); }
        .elm-abtn:disabled { opacity:.4; cursor:not-allowed; }

        .elm-actionbar { position:fixed; left:0; right:0; bottom:0; z-index:40; background:var(--card);
            border-top:1px solid var(--bd2); box-shadow:0 -3px 14px rgba(0,0,0,.14); padding:10px 18px;
            display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .elm-actionbar .sel { font-size:12.5px; font-weight:700; }

        .elm-state { padding:44px 20px; text-align:center; color:var(--mu); }
        .elm-state .ic { font-size:30px; margin-bottom:8px; opacity:.5; }
        .elm-state h4 { margin:0 0 4px; font-size:14px; font-weight:800; color:var(--tx); }
        .elm-state p { margin:0; font-size:12.5px; }
        .elm-err { margin:12px; border:1px solid var(--rose-bd); background:var(--rose-lt);
            color:var(--rose); border-radius:8px; padding:12px 14px; font-size:12.5px; }

        .sk { height:11px; border-radius:5px; background:linear-gradient(90deg,var(--ibg) 25%,var(--hov) 37%,var(--ibg) 63%);
            background-size:400% 100%; animation:elmsk 1.3s ease infinite; }
        @keyframes elmsk { 0%{background-position:100% 50%} 100%{background-position:0 50%} }

        .elm-prog { height:5px; background:var(--ibg); border-radius:4px; overflow:hidden; margin-top:6px; }
        .elm-prog i { display:block; height:100%; background:var(--blue); width:0; transition:width .2s; }
        @media (max-width:820px) { .elm-scroll { max-height:none; } .elm-per .lbl { min-width:110px; } }
    `).appendTo(document.head);

    // ── state ────────────────────────────────────────────────
    const S = {
        mode: 'payroll', anchor: null, period: null,
        tab: 'balances',
        employee: '', department: '', leave_type: '', search: '',
        only_problems: 0,
        overview: null, worklist: null, unalloc: null, rebuild: null,
        selected: new Set(),
        options: null,
        loading: {}, error: {},
    };

    const $root = $('<div class="elm">').appendTo($(wrapper).find('.page-content'));

    const esc = (v) => (v === null || v === undefined) ? '' : String(v).replace(/[&<>"']/g,
        c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const n1 = (v) => (Math.round((Number(v) || 0) * 10) / 10).toFixed(1).replace(/\.0$/, '');

    function api(method, args) {
        return frappe.call({ method: M + method, args: args || {} })
            .then(r => r.message)
            .catch(e => { throw e; });
    }
    function errText(e) {
        try {
            if (e && e._server_messages) {
                const m = JSON.parse(e._server_messages);
                if (m.length) return JSON.parse(m[0]).message || String(m[0]);
            }
        } catch (x) { /* fall through */ }
        return (e && (e.message || e.responseText)) || 'Request failed.';
    }

    // ── shell ────────────────────────────────────────────────
    function shell() {
        $root.html(`
            <div class="elm-topbar">
              <div class="elm-brand">
                <div class="elm-brand-ic">🗓️</div>
                <div>
                  <h2>Employee Leave Manager</h2>
                  <p>Monthly (FT-) staff · balances, missing applications &amp; payroll impact</p>
                </div>
              </div>
              <div class="elm-ctrls">
                <div class="elm-seg" id="elm-mode">
                  <button data-mode="payroll">Payroll 21–20</button>
                  <button data-mode="calendar">Calendar</button>
                </div>
                <div class="elm-per">
                  <button id="elm-prev" title="Previous period">‹</button>
                  <span class="lbl" id="elm-label">…</span>
                  <button id="elm-next" title="Next period">›</button>
                </div>
                <button class="elm-btn" id="elm-refresh">↻ Refresh</button>
                <button class="elm-btn" id="elm-export">⭳ CSV</button>
              </div>
            </div>
            <div id="elm-banners"></div>
            <div class="elm-cards" id="elm-cards"></div>
            <div class="elm-filters" id="elm-filters"></div>
            <div class="elm-tabs" id="elm-tabs"></div>
            <div class="elm-panel" id="elm-panel"></div>
        `);

        $root.on('click', '#elm-mode button', function () {
            S.mode = $(this).data('mode'); S.anchor = S.period ? S.period.anchor : null; loadPeriod();
        });
        $root.on('click', '#elm-prev', () => { S.anchor = S.period.prev_anchor; loadPeriod(); });
        $root.on('click', '#elm-next', () => { S.anchor = S.period.next_anchor; loadPeriod(); });
        $root.on('click', '#elm-refresh', () => loadAll());
        $root.on('click', '#elm-export', exportCsv);
        $root.on('click', '#elm-runreb2', () => loadRebuild());
        $root.on('click', '.elm-tab', function () { S.tab = $(this).data('tab'); renderTabs(); renderPanel(); });
        $root.on('click', '.elm-card[data-tab]', function () { S.tab = $(this).data('tab'); renderTabs(); renderPanel(); });

        // filters
        $root.on('input', '#elm-search', function () { S.search = this.value; renderPanel(); });
        $root.on('change', '#elm-dept', function () { S.department = this.value; loadData(); });
        $root.on('change', '#elm-type', function () { S.leave_type = this.value; loadData(); });
        $root.on('click', '#elm-prob', function () {
            S.only_problems = S.only_problems ? 0 : 1; $(this).toggleClass('on'); loadData();
        });

        // row actions (delegated — no window globals)
        $root.on('click', '[data-act="apply"]', function () { doApply($(this).data('att'), this); });
        $root.on('click', '[data-act="apply-as"]', function () { pickType($(this).data('att')); });
        $root.on('click', '[data-act="undo"]', function () {
            doUndo($(this).data('emp'), $(this).data('date'), this);
        });
        $root.on('click', '[data-act="alloc"]', function () { allocDialog($(this).data('emp')); });
        $root.on('change', '.elm-sel', function () {
            const k = $(this).data('att');
            if (this.checked) S.selected.add(k); else S.selected.delete(k);
            renderActionBar();
        });
        $root.on('change', '#elm-selall', function () {
            const on = this.checked;
            $root.find('.elm-sel').each(function () {
                this.checked = on;
                const k = $(this).data('att');
                if (on) S.selected.add(k); else S.selected.delete(k);
            });
            renderActionBar();
        });
    }

    // ── loading ──────────────────────────────────────────────
    function loadPeriod() {
        return api('resolve_period', { mode: S.mode, anchor: S.anchor }).then(p => {
            S.period = p; S.anchor = p.anchor;
            $root.find('#elm-label').text(p.label);
            $root.find('#elm-mode button').removeClass('on')
                .filter(`[data-mode="${p.mode}"]`).addClass('on');
            return loadData();
        });
    }

    function loadAll() {
        return api('get_filter_options').then(o => { S.options = o; renderFilters(); })
            .then(loadPeriod);
    }

    function loadData() {
        S.selected.clear();
        S.loading = { overview: true, worklist: true };
        S.error = {};
        renderPanel();

        const p = S.period;
        const common = { from_date: p.from_date, to_date: p.to_date };

        const a = api('get_leave_overview', Object.assign({}, common, {
            department: S.department, leave_type: S.leave_type,
            employee: S.employee, only_problems: S.only_problems,
        })).then(r => { S.overview = r; }).catch(e => { S.error.overview = errText(e); })
            .then(() => { S.loading.overview = false; renderCards(); renderBanners(); renderTabs(); renderPanel(); });

        const b = api('get_missing_leave_worklist', Object.assign({}, common, {
            department: S.department, employee: S.employee,
        })).then(r => { S.worklist = r; }).catch(e => { S.error.worklist = errText(e); })
            .then(() => { S.loading.worklist = false; renderCards(); renderTabs(); renderPanel(); });

        api('get_attendance_coverage', common).then(r => { S.coverage = r; renderBanners(); }).catch(() => {});
        api('get_unallocated_employees', { as_of_date: p.to_date })
            .then(r => { S.unalloc = r; renderCards(); renderTabs(); if (S.tab === 'noalloc') renderPanel(); })
            .catch(() => {});

        return Promise.all([a, b]);
    }

    function loadRebuild() {
        S.loading.rebuild = true; renderPanel();
        return api('get_payroll_rebuild_queue', {}).then(r => { S.rebuild = r; })
            .catch(e => { S.error.rebuild = errText(e); })
            .then(() => { S.loading.rebuild = false; renderCards(); renderTabs(); renderPanel(); });
    }

    // ── banners ──────────────────────────────────────────────
    function renderBanners() {
        const out = [];
        const pay = S.overview && S.overview.payroll;
        if (pay) {
            if (pay.state === 'paid') {
                out.push(`<div class="elm-banner bad"><span class="tag bad">PAID</span>
                    <span><b>${pay.submitted_count} salary slip(s) already submitted for these employees.</b>
                    Applying or undoing leave here will <b>not</b> update them — the change is recorded and the
                    affected cycle appears under <b>Needs Rebuild</b>, where you can re-run payroll deliberately.</span></div>`);
            } else if (pay.state === 'draft') {
                out.push(`<div class="elm-banner warn"><span class="tag warn">DRAFT</span>
                    <span>${pay.draft_count} draft salary slip(s) exist for this period. Recompute them after
                    making changes — a draft holds whatever was calculated when it was saved.</span></div>`);
            } else {
                out.push(`<div class="elm-banner ok"><span class="tag ok">OPEN</span>
                    <span>No salary slips for this period yet. Leave changes will be picked up when payroll runs.</span></div>`);
            }
        }
        const c = S.coverage;
        if (c && c.eligible && c.pct < 50) {
            out.push(`<div class="elm-banner bad"><span class="tag bad">NO DATA</span>
                <span>Attendance exists for only <b>${c.with_attendance} of ${c.eligible}</b> employees in this period.
                Unmarked days count as <b>Absent</b>, so running payroll now would pay close to nothing.
                <a href="/desk/import-attendance">Import attendance first →</a></span></div>`);
        }
        $root.find('#elm-banners').html(out.join(''));
    }

    // ── cards ────────────────────────────────────────────────
    function renderCards() {
        const k = (S.overview && S.overview.kpis) || {};
        const types = (S.overview && S.overview.types) || [];
        const miss = S.worklist ? S.worklist.total : null;
        const nal = S.unalloc ? S.unalloc.length : null;
        const reb = S.rebuild ? S.rebuild.total_stale : null;
        const v = (x) => (x === null || x === undefined) ? '<span class="sk" style="width:34px;display:inline-block"></span>' : n1(x);

        const cards = [
            { c: 'b', v: k.eligible, l: 'Eligible (FT-)' },
            { c: miss ? 'r' : 'g', v: miss, l: 'Missing Leave', tab: 'missing' },
            { c: 'a', v: k.absent_days, l: 'Absent Days' },
            { c: 'r', v: k.lwp_days, l: 'LWP Days' },
        ];
        types.forEach(t => cards.push({
            c: 'g', v: k['remaining_' + t.toLowerCase().replace(/[^a-z0-9]+/g, '_')], l: t + ' Left',
        }));
        cards.push({ c: nal ? 'r' : 'g', v: nal, l: 'No Allocation', tab: 'noalloc' });
        cards.push({ c: reb ? 'v2' : 'g', v: reb, l: 'Needs Rebuild', tab: 'rebuild' });

        $root.find('#elm-cards').html(cards.map(x => `
            <div class="elm-card ${x.c}" ${x.tab ? `data-tab="${x.tab}"` : ''}>
              <div class="v">${v(x.v)}</div><div class="l">${esc(x.l)}</div>
            </div>`).join(''));
    }

    function renderFilters() {
        const o = S.options || { departments: [], leave_types: [] };
        $root.find('#elm-filters').html(`
            <input id="elm-search" placeholder="Search employee…" style="min-width:200px" value="${esc(S.search)}">
            <select id="elm-dept"><option value="">All departments</option>
              ${o.departments.map(d => `<option ${S.department === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select>
            <select id="elm-type"><option value="">All leave types</option>
              ${(o.leave_types || []).filter(t => !t.is_lwp).map(t =>
                  `<option ${S.leave_type === t.name ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
            <button class="elm-chip ${S.only_problems ? 'on' : ''}" id="elm-prob">Problems only</button>
            <span style="flex:1"></span>
            <span style="font-size:11px;color:var(--mu)">Leave applies to monthly <b>FT-</b> staff only —
              day-team are paid per day worked.</span>
        `);
    }

    function renderTabs() {
        const t = [
            ['balances', 'Balances', S.overview ? S.overview.rows.length : null],
            ['missing', 'Missing Leave', S.worklist ? S.worklist.total : null],
            ['noalloc', 'No Allocation', S.unalloc ? S.unalloc.length : null],
            ['rebuild', 'Needs Rebuild', S.rebuild ? S.rebuild.total_stale : null],
        ];
        $root.find('#elm-tabs').html(t.map(([k, l, n]) => `
            <button class="elm-tab ${S.tab === k ? 'on' : ''}" data-tab="${k}">
              ${esc(l)}${n === null ? '' : `<span class="n">${n}</span>`}
            </button>`).join(''));
    }

    // ── panel ────────────────────────────────────────────────
    function skeleton(cols) {
        return `<div style="padding:14px">${Array.from({ length: 6 }, () =>
            `<div style="display:flex;gap:10px;margin-bottom:11px">${Array.from({ length: cols }, (_, i) =>
                `<div class="sk" style="flex:${i === 0 ? 2 : 1}"></div>`).join('')}</div>`).join('')}</div>`;
    }
    function state(ic, h, p) {
        return `<div class="elm-state"><div class="ic">${ic}</div><h4>${esc(h)}</h4><p>${p}</p></div>`;
    }

    function renderPanel() {
        const $p = $root.find('#elm-panel');
        if (S.tab === 'rebuild' && !S.rebuild && !S.loading.rebuild && !S.error.rebuild) {
            $p.html(state('🧮', 'Check payroll consistency',
                `Recomputes every submitted salary slip through the real payroll engine and reports the ones
                 that no longer match current attendance. Nothing is modified.
                 <br><br><button class="elm-btn pri" id="elm-runreb">Run check</button>`));
            $root.find('#elm-runreb').off('click').on('click', loadRebuild);
            renderActionBar();
            return;
        }
        if (S.tab === 'balances') $p.html(renderBalances());
        else if (S.tab === 'missing') $p.html(renderMissing());
        else if (S.tab === 'noalloc') $p.html(renderNoAlloc());
        else $p.html(renderRebuild());
        renderActionBar();
    }

    function filterRows(rows, key) {
        if (!S.search) return rows;
        const q = S.search.toLowerCase();
        return rows.filter(r => (r[key] || '').toLowerCase().includes(q)
            || (r.employee || '').toLowerCase().includes(q));
    }

    function balCell(c) {
        if (!c || !c.allocated) return '<span class="elm-pill mute">none</span>';
        const left = c.remaining;
        const cls = left > 1 ? 'g' : (left > 0 ? 'a' : 'r');
        return `<span class="elm-bal" title="Display figure — the exact consumable balance is re-checked on apply">
            ${n1(c.allocated)}<span class="l"> · </span>${n1(c.taken)}<span class="l"> · </span>
            ${n1(c.pending)}<span class="l"> · </span><b class="${cls}">${n1(left)}</b></span>`;
    }

    function renderBalances() {
        if (S.loading.overview) return skeleton(6);
        if (S.error.overview) return `<div class="elm-err">${esc(S.error.overview)}</div>`;
        const o = S.overview;
        if (!o || !o.rows.length) {
            return state('🗂️', 'Nothing to show',
                'No monthly (FT-) employees matched these filters.');
        }
        const rows = filterRows(o.rows, 'employee_name');
        if (!rows.length) return state('🔍', 'No match', 'No employee matches that search.');

        return `<div class="elm-scroll"><table class="elm-grid">
          <thead><tr>
            <th>Employee</th><th>Dept</th>
            ${o.types.map(t => `<th title="Allocated · Taken · Pending · Left">${esc(t)}<br>
              <span style="font-weight:600;text-transform:none;letter-spacing:0">alloc·taken·pend·left</span></th>`).join('')}
            <th class="num">Absent</th><th class="num">LWP</th><th>Status</th>
          </tr></thead><tbody>
          ${rows.map(r => `<tr>
            <td class="elm-emp">${esc(r.employee_name)}<small>${esc(r.employee)}</small></td>
            <td style="color:var(--mu);font-size:11.5px">${esc(r.department || '—')}</td>
            ${o.types.map(t => `<td>${balCell(r.cells[t])}</td>`).join('')}
            <td class="num" style="color:${r.absent_days ? 'var(--amb)' : 'var(--lt)'}">${n1(r.absent_days)}</td>
            <td class="num" style="color:${r.lwp_days ? 'var(--rose)' : 'var(--lt)'}">${n1(r.lwp_days)}</td>
            <td><span class="elm-pill ${r.status === 'OK' ? 'ok' : (r.status === 'Exhausted' ? 'warn' : 'bad')}">${esc(r.status)}</span></td>
          </tr>`).join('')}
          </tbody></table></div>`;
    }

    function planChips(p) {
        if (!p) return '<span class="elm-pill mute">—</span>';
        if (!p.length) return '<span class="elm-pill bad">nothing available</span>';
        return p.map(c => `<span class="elm-pill ${c.is_lwp ? 'bad' : 'info'}">${esc(c.leave_type)} ${n1(c.days)}</span>`).join(' ');
    }

    function renderMissing() {
        if (S.loading.worklist) return skeleton(6);
        if (S.error.worklist) return `<div class="elm-err">${esc(S.error.worklist)}</div>`;
        const w = S.worklist;
        if (!w) return skeleton(6);
        if (!w.total) {
            const c = S.coverage;
            if (c && c.marked_days === 0) {
                return state('📭', 'No attendance for this period',
                    'Nothing was checked, because no attendance has been imported for these dates.');
            }
            return state('✅', 'No missing leave applications',
                `Every absence in this period already has leave applied.`);
        }
        const rows = filterRows(w.rows, 'employee_name');
        if (!rows.length) return state('🔍', 'No match', 'No employee matches that search.');

        let note = '';
        if (!w.pay_changing) {
            note = `<div style="padding:10px 14px;font-size:12px;border-bottom:1px solid var(--bd);
                     background:var(--amb-lt);color:var(--amb)">
                <b>None of these days would change anyone's pay.</b>
                Every one of them can only reach <b>Leave Without Pay</b>, because the employee has
                no allocation left — and payroll deducts an unpaid leave day exactly like an absent day.
                ${w.blocked ? `${w.blocked} of them are also inside an already-processed payroll period,
                  where ERPNext refuses Leave Without Pay outright.` : ''}
                To actually convert unpaid days into paid ones, give these employees an allocation on the
                <b>No Allocation</b> tab first.</div>`;
        }

        return `${note}<div class="elm-scroll"><table class="elm-grid">
          <thead><tr>
            <th style="width:30px"><input type="checkbox" id="elm-selall"></th>
            <th>Employee</th><th>Date</th><th>Status</th>
            <th>Will consume</th><th>Effect</th><th>Action</th>
          </tr></thead><tbody>
          ${rows.map(r => {
            const d = frappe.datetime.str_to_obj(r.attendance_date);
            const wd = d ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] : '';
            const blocked = r.effect === 'blocked_lwp';
            const eff = {
                paid_leave: ['ok', 'becomes paid', 'An unpaid day becomes a paid one.'],
                lwp_only: ['warn', 'record only', 'Payroll deducts an unpaid leave day exactly like an absent day, so pay does not change.'],
                blocked_lwp: ['bad', 'cannot apply', 'ERPNext refuses Leave Without Pay inside an already-processed payroll period.'],
                unknown: ['mute', '—', ''],
            }[r.effect || 'unknown'];
            return `<tr data-row="${esc(r.attendance)}">
              <td>${blocked ? '' : `<input type="checkbox" class="elm-sel" data-att="${esc(r.attendance)}">`}</td>
              <td class="elm-emp">${esc(r.employee_name)}<small>${esc(r.employee)}</small></td>
              <td class="mono">${esc(r.attendance_date)} <span style="color:var(--lt)">${wd}</span></td>
              <td><span class="elm-pill ${r.status === 'Absent' ? 'warn' : 'info'}">${esc(r.status)}</span></td>
              <td>${r.is_holiday ? '<span class="elm-pill mute">holiday</span>' : planChips(r.plan_preview)}</td>
              <td><span class="elm-pill ${eff[0]}" title="${esc(eff[2])}">${esc(eff[1])}</span>
                  ${r.payroll_locked ? `<span class="elm-pill bad" title="Salary slip ${esc(r.payroll_slip)}">paid period</span>` : ''}</td>
              <td><div class="elm-act">
                <button class="elm-abtn pri" data-act="apply" data-att="${esc(r.attendance)}"
                    ${blocked ? 'disabled title="' + esc(eff[2]) + '"' : ''}>Apply</button>
                <button class="elm-abtn" data-act="apply-as" data-att="${esc(r.attendance)}">Apply as ▾</button>
              </div></td>
            </tr>`;
        }).join('')}
          </tbody></table></div>
          ${w.preview_capped ? `<div style="padding:8px 12px;font-size:11.5px;color:var(--mu)">
            Preview shown for the first rows only — the rest are applied with the same chain.</div>` : ''}`;
    }

    function renderNoAlloc() {
        const u = S.unalloc;
        if (!u) return skeleton(5);
        if (!u.length) return state('✅', 'Everyone has an allocation',
            'All monthly (FT-) employees have leave allocated for this period.');
        return `<div style="padding:10px 14px;font-size:12px;color:var(--mu);border-bottom:1px solid var(--bd)">
            These employees have <b>no leave allocation</b>, so every absence falls straight through to
            <b>unpaid</b> Leave Without Pay. Granting an allocation fixes future absences — it does not
            retroactively convert days already booked as LWP.
          </div>
          <div class="elm-scroll"><table class="elm-grid">
          <thead><tr><th>Employee</th><th>Dept</th><th>Joined</th>
            <th class="num">Absences this year</th><th>Missing</th><th>Action</th></tr></thead><tbody>
          ${u.map(r => `<tr>
            <td class="elm-emp">${esc(r.employee_name)}<small>${esc(r.employee)}</small></td>
            <td style="color:var(--mu);font-size:11.5px">${esc(r.department || '—')}</td>
            <td class="mono" style="font-size:11.5px">${esc(r.date_of_joining || '—')}</td>
            <td class="num" style="color:${r.absences_ytd ? 'var(--rose)' : 'var(--lt)'}">${r.absences_ytd}</td>
            <td>${r.missing_types.map(t => `<span class="elm-pill warn">${esc(t)}</span>`).join(' ')}</td>
            <td><button class="elm-abtn pri" data-act="alloc" data-emp="${esc(r.employee)}">Allocate…</button></td>
          </tr>`).join('')}
          </tbody></table></div>`;
    }

    function renderRebuild() {
        if (S.loading.rebuild) return skeleton(5);
        if (S.error.rebuild) return `<div class="elm-err">${esc(S.error.rebuild)}</div>`;
        const r = S.rebuild;
        if (!r) return skeleton(5);
        if (!r.total_stale) {
            return state('✅', 'Payroll is consistent',
                `Every submitted salary slip still matches a fresh recompute from current attendance.
                 <br><button class="elm-btn" id="elm-runreb2" style="margin-top:10px">Re-check</button>`);
        }
        const html = r.cycles.filter(c => c.stale_count).map(c => `
          <div style="padding:10px 14px;border-bottom:1px solid var(--bd);background:var(--ibg);
                      font-size:12.5px;font-weight:700">
            ${esc(c.from_date)} → ${esc(c.to_date)}
            <span class="elm-pill bad" style="margin-left:8px">${c.stale_count} of ${c.slips} slips stale</span>
            <a class="elm-abtn" style="float:right;text-decoration:none"
               href="/app/salary-slip?start_date=${esc(c.from_date)}&docstatus=1">Open slips →</a>
          </div>
          <table class="elm-grid"><thead><tr>
            <th>Employee</th><th class="num">LWP</th><th class="num">Absent</th>
            <th class="num">Paid days</th><th>Slip</th></tr></thead><tbody>
          ${c.stale.map(s => `<tr>
            <td class="elm-emp">${esc(s.employee_name || s.employee)}<small>${esc(s.employee)}</small></td>
            <td class="num">${n1(s.stored.lwp)} → <b>${n1(s.recomputed.lwp)}</b></td>
            <td class="num">${n1(s.stored.absent)} → <b>${n1(s.recomputed.absent)}</b></td>
            <td class="num" style="color:${s.delta_payment_days > 0 ? 'var(--grn)' : 'var(--rose)'}">
              ${n1(s.stored.payment_days)} → <b>${n1(s.recomputed.payment_days)}</b></td>
            <td><a href="/app/salary-slip/${encodeURIComponent(s.slip)}" class="mono" style="font-size:11px">${esc(s.slip)}</a></td>
          </tr>`).join('')}
          </tbody></table>`).join('');
        return `<div style="padding:10px 14px;font-size:12px;color:var(--mu);border-bottom:1px solid var(--bd)">
            These submitted slips no longer match what payroll would calculate from current attendance.
            Re-run those cycles to settle the difference — nothing here modifies a slip.
          </div><div class="elm-scroll">${html}</div>`;
    }

    function renderActionBar() {
        $('#elm-actionbar').remove();
        if (S.tab !== 'missing' || !S.selected.size) return;
        const bar = $(`<div class="elm-actionbar" id="elm-actionbar">
            <span class="sel">${S.selected.size} day(s) selected</span>
            <span>
              <button class="elm-btn" id="elm-clear">Clear</button>
              <button class="elm-btn pri" id="elm-bulk">Apply selected</button>
            </span></div>`).appendTo(document.body);
        bar.find('#elm-clear').on('click', () => {
            S.selected.clear(); $root.find('.elm-sel,#elm-selall').prop('checked', false); renderActionBar();
        });
        bar.find('#elm-bulk').on('click', doBulk);
    }

    // ── actions ──────────────────────────────────────────────
    function rowResult(att, html) {
        const $td = $root.find(`tr[data-row="${att}"] td:last-child`);
        if ($td.length) $td.html(html);
    }

    function doApply(att, btn) {
        const row = (S.worklist.rows || []).find(r => r.attendance === att) || {};
        const go = () => {
            $(btn).prop('disabled', true).text('…');
            api('apply_leave_for_attendance', { attendance_name: att }).then(res => {
                if (res && res.ok) {
                    const chips = res.applied.map(a =>
                        `${a.leave_type} ${n1(a.days)}`).join(' + ');
                    rowResult(att, `<div class="elm-act"><span class="elm-pill ok">Applied — ${esc(chips)}</span>
                        <button class="elm-abtn dgr" data-act="undo" data-emp="${esc(row.employee)}"
                          data-date="${esc(row.attendance_date)}">Undo</button></div>`);
                    frappe.show_alert({ message: __('Leave applied: {0}', [chips]), indicator: 'green' });
                    refreshCounts();
                } else {
                    const msg = (res && res.message) || 'Could not apply.';
                    const info = res && res.code === 'MAX_CONTINUOUS';
                    rowResult(att, `<span class="elm-pill ${info ? 'warn' : 'bad'}" title="${esc(msg)}">${esc(msg.slice(0, 60))}</span>`);
                    frappe.show_alert({ message: msg, indicator: info ? 'orange' : 'red' });
                }
            }).catch(e => {
                $(btn).prop('disabled', false).text('Apply');
                frappe.show_alert({ message: errText(e), indicator: 'red' });
            });
        };
        if (row.payroll_locked) {
            frappe.confirm(
                `<b>${esc(row.attendance_date)} is inside a period that is already paid.</b><br><br>
                 Applying leave will not change that salary slip. The change is recorded and the cycle will
                 appear under <b>Needs Rebuild</b> so you can re-run payroll deliberately.<br><br>Continue?`,
                go);
        } else { go(); }
    }

    function pickType(att) {
        const row = (S.worklist.rows || []).find(r => r.attendance === att) || {};
        const types = (S.options.leave_types || []).map(t => t.name);
        const d = new frappe.ui.Dialog({
            title: __('Apply a specific leave type'),
            fields: [
                { fieldtype: 'HTML', options: `<div style="font-size:12.5px;margin-bottom:8px">
                    <b>${esc(row.employee_name || '')}</b> — ${esc(row.attendance_date || '')}<br>
                    <span style="color:var(--text-muted)">The automatic chain would use:
                    ${row.plan_preview ? row.plan_preview.map(c => `${esc(c.leave_type)} ${n1(c.days)}`).join(' + ') : '—'}</span></div>` },
                { fieldtype: 'Select', fieldname: 'leave_type', label: __('Leave Type'),
                  options: types.join('\n'), reqd: 1 },
            ],
            primary_action_label: __('Apply'),
            primary_action(v) {
                d.hide();
                api('apply_leave_with_type', { attendance_name: att, leave_type: v.leave_type })
                    .then(res => {
                        if (res && res.ok) {
                            const chips = res.applied.map(a => `${a.leave_type} ${n1(a.days)}`).join(' + ');
                            rowResult(att, `<div class="elm-act"><span class="elm-pill ok">Applied — ${esc(chips)}</span>
                                <button class="elm-abtn dgr" data-act="undo" data-emp="${esc(row.employee)}"
                                  data-date="${esc(row.attendance_date)}">Undo</button></div>`);
                            frappe.show_alert({ message: __('Leave applied'), indicator: 'green' });
                            refreshCounts();
                        } else {
                            frappe.msgprint({ title: __('Could not apply'), indicator: 'red',
                                message: (res && res.message) || __('Unknown error') });
                        }
                    }).catch(e => frappe.msgprint({ title: __('Failed'), indicator: 'red', message: errText(e) }));
            },
        });
        d.show();
    }

    function doUndo(emp, date, btn) {
        frappe.confirm(__('Cancel the leave applied for {0} on {1}?', [emp, date]), () => {
            $(btn).prop('disabled', true).text('…');
            api('undo_leave_for_day', { employee: emp, attendance_date: date }).then(res => {
                frappe.show_alert({ message: (res && res.message) || 'Done',
                    indicator: res && res.success ? 'green' : 'red' });
                loadData();
            }).catch(e => {
                $(btn).prop('disabled', false).text('Undo');
                frappe.show_alert({ message: errText(e), indicator: 'red' });
            });
        });
    }

    function doBulk() {
        const names = Array.from(S.selected);
        const locked = (S.worklist.rows || [])
            .filter(r => S.selected.has(r.attendance) && r.payroll_locked).length;
        const warn = locked
            ? `<div style="color:var(--red-600,#dc2626);margin-top:8px"><b>${locked} of these days are inside a
               period that is already paid.</b> Those salary slips will not change — the cycle will appear under
               Needs Rebuild.</div>` : '';

        frappe.confirm(
            `Apply leave to <b>${names.length}</b> day(s) using the automatic chain?${warn}`,
            () => {
                const dlg = new frappe.ui.Dialog({ title: __('Applying leave'), fields: [{ fieldtype: 'HTML', fieldname: 'body' }] });
                dlg.fields_dict.body.$wrapper.html(
                    `<div id="elm-bulkbody"><div style="font-size:12.5px">Working…</div>
                     <div class="elm-prog"><i id="elm-bar"></i></div></div>`);
                dlg.show();

                const onProg = (d) => {
                    $('#elm-bar').css('width', (d.done / d.total * 100) + '%');
                    $('#elm-bulkbody div:first').html(`Applied ${d.done} of ${d.total}…`);
                };
                const onDone = (d) => {
                    frappe.realtime.off('elm_bulk_progress', onProg);
                    frappe.realtime.off('elm_bulk_done', onDone);
                    showBulkResult(dlg, d.results, d.summary);
                };
                frappe.realtime.on('elm_bulk_progress', onProg);
                frappe.realtime.on('elm_bulk_done', onDone);

                api('bulk_apply_leave', { attendance_names: JSON.stringify(names) }).then(res => {
                    if (res && res.queued) return;   // realtime will finish it
                    frappe.realtime.off('elm_bulk_progress', onProg);
                    frappe.realtime.off('elm_bulk_done', onDone);
                    showBulkResult(dlg, res.results, res.summary);
                }).catch(e => {
                    frappe.realtime.off('elm_bulk_progress', onProg);
                    frappe.realtime.off('elm_bulk_done', onDone);
                    dlg.fields_dict.body.$wrapper.html(`<div class="elm-err">${esc(errText(e))}</div>`);
                });
            });
    }

    function showBulkResult(dlg, results, summary) {
        results = results || [];
        const rows = results.map(r => `<tr>
            <td>${esc(r.employee_name || r.employee || '')}</td>
            <td class="mono">${esc(r.attendance_date || '')}</td>
            <td><span class="elm-pill ${r.ok ? 'ok' : (r.code === 'MAX_CONTINUOUS' ? 'warn' : 'bad')}">
                ${r.ok ? esc((r.applied || []).map(a => a.leave_type + ' ' + n1(a.days)).join(' + ')) : esc(r.code || 'failed')}</span></td>
            <td style="font-size:11.5px;color:var(--text-muted)">${esc(r.message || '')}</td>
        </tr>`).join('');
        dlg.fields_dict.body.$wrapper.html(`
            <div style="font-size:13px;font-weight:700;margin-bottom:8px">
              ${summary.applied} applied · ${summary.failed} failed
              ${summary.into_paid_period ? ` · <span style="color:#dc2626">${summary.into_paid_period} into a paid period</span>` : ''}
            </div>
            <div style="max-height:360px;overflow:auto"><table class="elm-grid">
              <thead><tr><th>Employee</th><th>Date</th><th>Result</th><th>Detail</th></tr></thead>
              <tbody>${rows}</tbody></table></div>`);
        dlg.set_primary_action(__('Done'), () => { dlg.hide(); loadData(); });
        if (summary.into_paid_period) loadRebuild();
    }

    function allocDialog(emp) {
        const row = (S.unalloc || []).find(r => r.employee === emp) || {};
        const year = (S.period && S.period.to_date || '').slice(0, 4) || String(new Date().getFullYear());
        const caps = {};
        (S.options.leave_types || []).forEach(t => { caps[t.name] = t.max_leaves_allowed; });

        const d = new frappe.ui.Dialog({
            title: __('Grant leave allocation'),
            fields: [
                { fieldtype: 'HTML', options: `<div style="font-size:12.5px;margin-bottom:10px">
                    <b>${esc(row.employee_name || emp)}</b> (${esc(emp)})<br>
                    <span style="color:var(--text-muted)">Applies to future absences. Days already booked as
                    Leave Without Pay stay as they are.</span></div>` },
                { fieldtype: 'Select', fieldname: 'leave_type', label: __('Leave Type'), reqd: 1,
                  options: (row.missing_types || []).join('\n') },
                { fieldtype: 'Float', fieldname: 'days', label: __('Days'), reqd: 1 },
                { fieldtype: 'Date', fieldname: 'from_date', label: __('From'), reqd: 1, default: year + '-01-01' },
                { fieldtype: 'Date', fieldname: 'to_date', label: __('To'), reqd: 1, default: year + '-12-31' },
            ],
            primary_action_label: __('Create allocation'),
            primary_action(v) {
                d.hide();
                api('create_leave_allocation', {
                    employee: emp, leave_type: v.leave_type, from_date: v.from_date,
                    to_date: v.to_date, new_leaves_allocated: v.days,
                }).then(res => {
                    frappe.show_alert({ message: (res && res.message) || 'Done',
                        indicator: res && res.ok ? 'green' : 'red' });
                    if (res && res.ok) loadData();
                }).catch(e => frappe.msgprint({ title: __('Failed'), indicator: 'red', message: errText(e) }));
            },
        });
        d.fields_dict.leave_type.$input && d.fields_dict.leave_type.$input.on('change', function () {
            const cap = caps[this.value];
            if (cap) d.set_value('days', cap);
        });
        d.show();
    }

    function refreshCounts() {
        api('get_missing_leave_worklist', {
            from_date: S.period.from_date, to_date: S.period.to_date,
            department: S.department, employee: S.employee, with_preview: 0,
        }).then(r => { if (S.worklist) S.worklist.total = r.total; renderCards(); renderTabs(); }).catch(() => {});
    }

    function exportCsv() {
        let rows = [], name = 'leave';
        if (S.tab === 'balances' && S.overview) {
            const t = S.overview.types;
            rows.push(['Employee', 'ID', 'Department']
                .concat(t.flatMap(x => [x + ' Allocated', x + ' Taken', x + ' Pending', x + ' Left']))
                .concat(['Absent', 'LWP', 'Status']));
            S.overview.rows.forEach(r => rows.push(
                [r.employee_name, r.employee, r.department || '']
                    .concat(t.flatMap(x => {
                        const c = r.cells[x] || {};
                        return [c.allocated || 0, c.taken || 0, c.pending || 0, c.remaining || 0];
                    }))
                    .concat([r.absent_days, r.lwp_days, r.status])));
            name = 'leave-balances';
        } else if (S.tab === 'missing' && S.worklist) {
            rows.push(['Employee', 'ID', 'Date', 'Status', 'Will consume', 'Payroll']);
            S.worklist.rows.forEach(r => rows.push([
                r.employee_name, r.employee, r.attendance_date, r.status,
                (r.plan_preview || []).map(c => c.leave_type + ' ' + c.days).join(' + '),
                r.payroll_locked ? 'paid' : 'open']));
            name = 'missing-leave';
        } else if (S.tab === 'noalloc' && S.unalloc) {
            rows.push(['Employee', 'ID', 'Department', 'Joined', 'Absences', 'Missing']);
            S.unalloc.forEach(r => rows.push([r.employee_name, r.employee, r.department || '',
                r.date_of_joining || '', r.absences_ytd, r.missing_types.join(' + ')]));
            name = 'no-allocation';
        } else {
            frappe.show_alert({ message: __('Nothing to export on this tab'), indicator: 'orange' });
            return;
        }
        const csv = rows.map(r => r.map(c => {
            const s = String(c === null || c === undefined ? '' : c);
            return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        }).join(',')).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        a.download = `${name}-${S.period.from_date}-to-${S.period.to_date}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    // clean up the fixed bar when the page is hidden
    $(wrapper).on('hide', () => $('#elm-actionbar').remove());

    shell();
    renderTabs();
    loadAll().catch(e => $root.find('#elm-panel').html(`<div class="elm-err">${esc(errText(e))}</div>`));
};
