/**
 * Employee Leave
 * --------------
 * Search an employee, click them, and do everything in one popup: see the
 * balance, change the allowance, apply leave, and cancel leave.
 *
 * Written for HR staff, not for developers -- no jargon in anything the user
 * reads. Internally, applying leave rewrites the attendance row that decides
 * what a day is paid, and nothing recalculates a salary that was already
 * finished, so the popup says so plainly whenever a date falls in a month that
 * has already been paid.
 */

frappe.pages['employee-leave-manager'].on_page_load = function (wrapper) {
    frappe.ui.make_app_page({ parent: wrapper, title: 'Employee Leave', single_column: true });
    document.title = 'Employee Leave';

    const M = 'auto_leave_assignment.api.leave_manager_api.';

    if (!document.getElementById('elm-font')) {
        const lnk = document.createElement('link');
        lnk.id = 'elm-font'; lnk.rel = 'stylesheet';
        lnk.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap';
        document.head.appendChild(lnk);
    }

    $('#elm-styles').remove();
    $('<style id="elm-styles">').text(`
        .elm {
            --bg:  var(--bg-color,    #f2f5f9);
            --card:var(--card-bg,     #ffffff);
            --ibg: var(--control-bg,  #f6f8fb);
            --hov: var(--hover-bg,    #eef2f8);
            --bd:  var(--border-color,#e3e8f0);
            --bd2: var(--dark-border-color,#c8d2e0);
            --tx:  var(--text-color,  #14202e);
            --mu:  var(--text-muted,  #5a6b80);
            --lt:  var(--text-light,  #93a5b8);
            --blue:#2563eb; --blue-lt:rgba(37,99,235,.09);
            --grn: #059669; --grn-lt:rgba(5,150,105,.10);
            --rose:#dc2626; --rose-lt:rgba(220,38,38,.08);
            --amb: #b45309; --amb-lt:rgba(217,119,6,.12);
            --r:12px; --sh:0 1px 3px rgba(0,0,0,.07),0 1px 2px rgba(0,0,0,.04);
        }
        [data-theme="dark"] .elm {
            --bg:var(--bg-color,#0d1117); --card:var(--card-bg,#161b22); --ibg:var(--control-bg,#1c2230);
            --hov:var(--hover-bg,#1e2635); --bd:var(--border-color,#2a3140); --bd2:var(--dark-border-color,#3a4455);
            --tx:var(--text-color,#e6edf3); --mu:var(--text-muted,#8b98a5); --lt:var(--text-light,#4d5d6e);
            --blue:#4d8ef7; --blue-lt:rgba(77,142,247,.14);
            --grn:#34d399; --grn-lt:rgba(52,211,153,.12);
            --rose:#f87171; --rose-lt:rgba(248,113,113,.11);
            --amb:#fbbf24; --amb-lt:rgba(251,191,36,.13);
            --sh:0 1px 3px rgba(0,0,0,.4);
        }
        .elm { font-family:'DM Sans',sans-serif; background:var(--bg); min-height:100vh;
               padding:22px 16px 60px; color:var(--tx); }
        .elm-wrap { max-width:840px; margin:0 auto; }

        .elm-head { text-align:center; margin-bottom:18px; }
        .elm-head h1 { margin:0 0 5px; font-size:23px; font-weight:800; letter-spacing:-.3px; }
        .elm-head p { margin:0; font-size:14px; color:var(--mu); }
        .elm-dl { margin-top:12px; border:1px solid var(--bd2); background:var(--card); color:var(--tx);
            font-size:13px; font-weight:700; padding:8px 16px; border-radius:9px; cursor:pointer;
            font-family:inherit; box-shadow:var(--sh); }
        .elm-dl:hover { background:var(--hov); }
        .elm-dl:disabled { opacity:.55; cursor:wait; }

        .elm-searchbox { position:relative; margin-bottom:14px; }
        .elm-searchbox input { width:100%; background:var(--card); border:2px solid var(--bd);
            border-radius:14px; padding:15px 17px 15px 46px; font-size:16px; color:var(--tx);
            font-family:inherit; outline:none; box-shadow:var(--sh); }
        .elm-searchbox input:focus { border-color:var(--blue); }
        .elm-searchbox .ic { position:absolute; left:16px; top:50%; transform:translateY(-50%);
            font-size:17px; opacity:.5; }

        .elm-count { font-size:13px; color:var(--mu); margin:0 4px 10px; display:flex;
            justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; }
        .elm-count b { color:var(--tx); }
        .elm-warnpill { background:var(--amb-lt); color:var(--amb); font-weight:700;
            font-size:12.5px; padding:5px 11px; border-radius:20px; cursor:pointer; border:0;
            font-family:inherit; }

        .elm-list { background:var(--card); border:1px solid var(--bd); border-radius:var(--r);
            overflow:hidden; box-shadow:var(--sh); }
        .elm-row { display:flex; align-items:center; gap:14px; padding:14px 18px;
            border-bottom:1px solid var(--bd); cursor:pointer; }
        .elm-row:last-child { border-bottom:0; }
        .elm-row:hover { background:var(--hov); }
        .elm-av { width:42px; height:42px; border-radius:50%; background:var(--blue-lt);
            color:var(--blue); display:flex; align-items:center; justify-content:center;
            font-weight:800; font-size:15px; flex-shrink:0; }
        .elm-row .who { flex:1; min-width:0; }
        .elm-row .who b { display:block; font-size:15px; font-weight:700; }
        .elm-row .who span { font-size:13px; color:var(--mu); }
        .elm-row .arr { color:var(--lt); font-size:19px; }
        .elm-tagwarn { background:var(--amb-lt); color:var(--amb); font-size:12px; font-weight:700;
            padding:3px 9px; border-radius:20px; }

        .elm-empty { padding:50px 20px; text-align:center; color:var(--mu); }
        .elm-empty .ic { font-size:34px; opacity:.45; margin-bottom:8px; }
        .elm-empty h4 { margin:0 0 4px; font-size:16px; color:var(--tx); font-weight:700; }

        .sk { height:14px; border-radius:6px; background:linear-gradient(90deg,var(--ibg) 25%,var(--hov) 37%,var(--ibg) 63%);
            background-size:400% 100%; animation:elmsk 1.3s ease infinite; }
        @keyframes elmsk { 0%{background-position:100% 50%} 100%{background-position:0 50%} }

        /* ── popup ───────────────────────────────────────── */
        .elm-modal .modal-dialog { max-width:680px; }
        .elm-d { font-family:'DM Sans',sans-serif; }
        .elm-d .who { display:flex; align-items:center; gap:13px; padding-bottom:14px;
            border-bottom:1px solid var(--border-color,#e3e8f0); margin-bottom:16px; }
        .elm-d .who .av { width:48px; height:48px; border-radius:50%; background:rgba(37,99,235,.09);
            color:#2563eb; display:flex; align-items:center; justify-content:center;
            font-weight:800; font-size:17px; }
        .elm-d .who h3 { margin:0; font-size:18px; font-weight:800; }
        .elm-d .who p { margin:1px 0 0; font-size:13px; color:var(--text-muted,#5a6b80); }

        .elm-bals { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
            gap:10px; margin-bottom:16px; }
        .elm-b { border:1px solid var(--border-color,#e3e8f0); border-radius:12px; padding:13px 15px;
            text-align:center; }
        .elm-b .t { font-size:12.5px; color:var(--text-muted,#5a6b80); font-weight:600; }
        .elm-b .n { font-size:30px; font-weight:800; line-height:1.1; margin:3px 0 1px; }
        .elm-b .s { font-size:12px; color:var(--text-muted,#5a6b80); }
        .elm-b .ch { margin-top:8px; background:none; border:1px solid var(--border-color,#e3e8f0);
            border-radius:7px; font-size:12px; font-weight:700; padding:4px 11px; cursor:pointer;
            color:var(--text-color); font-family:inherit; }
        .elm-b .ch:hover { background:var(--hover-bg,#eef2f8); }
        .elm-b.none { background:rgba(217,119,6,.08); border-color:rgba(217,119,6,.3); }
        .elm-b.none .n { font-size:15px; color:#b45309; margin-top:9px; }

        .elm-seg2 { display:flex; gap:6px; margin-bottom:14px; }
        .elm-seg2 button { flex:1; border:1px solid var(--border-color,#e3e8f0); background:transparent;
            color:var(--text-muted,#5a6b80); font-size:13.5px; font-weight:700; padding:9px 6px;
            border-radius:9px; cursor:pointer; font-family:inherit; }
        .elm-seg2 button.on { background:#2563eb; border-color:#2563eb; color:#fff; }

        .elm-f { margin-bottom:13px; }
        .elm-f label { display:block; font-size:13px; font-weight:700; margin-bottom:5px; }
        .elm-f input[type=date], .elm-f input[type=text], .elm-f select {
            width:100%; border:1px solid var(--border-color,#e3e8f0); border-radius:9px;
            padding:10px 12px; font-size:14px; font-family:inherit; background:var(--control-bg,#f6f8fb);
            color:var(--text-color); outline:none; }
        .elm-f input:focus, .elm-f select:focus { border-color:#2563eb; }
        .elm-2col { display:grid; grid-template-columns:1fr 1fr; gap:10px; }

        .elm-types { display:flex; gap:8px; flex-wrap:wrap; }
        .elm-type { flex:1; min-width:130px; border:2px solid var(--border-color,#e3e8f0);
            background:transparent; border-radius:10px; padding:10px; cursor:pointer;
            font-family:inherit; text-align:left; color:var(--text-color); }
        .elm-type:hover { background:var(--hover-bg,#eef2f8); }
        .elm-type.on { border-color:#2563eb; background:rgba(37,99,235,.07); }
        .elm-type b { display:block; font-size:13.5px; font-weight:700; }
        .elm-type span { font-size:12px; color:var(--text-muted,#5a6b80); }
        .elm-type.unpaid.on { border-color:#dc2626; background:rgba(220,38,38,.07); }
        .elm-type:disabled { opacity:.45; cursor:not-allowed; }

        .elm-note { border-radius:10px; padding:11px 13px; font-size:13px; margin-bottom:13px;
            display:flex; gap:9px; align-items:flex-start; }
        .elm-note.warn { background:rgba(217,119,6,.10); color:#b45309; }
        .elm-note.info { background:rgba(37,99,235,.08); color:#2563eb; }
        .elm-note.bad  { background:rgba(220,38,38,.08); color:#dc2626; }
        .elm-note.ok   { background:rgba(5,150,105,.10); color:#059669; }

        .elm-hrow { display:flex; align-items:center; gap:12px; padding:11px 2px;
            border-bottom:1px solid var(--border-color,#e3e8f0); font-size:13.5px; }
        .elm-hrow:last-child { border-bottom:0; }
        .elm-hrow .d { flex:1; }
        .elm-hrow .d b { font-weight:700; }
        .elm-hrow .d small { display:block; color:var(--text-muted,#5a6b80); font-size:12px; }
        .elm-tag { font-size:11.5px; font-weight:700; padding:3px 9px; border-radius:20px; }
        .elm-tag.paid { background:rgba(5,150,105,.12); color:#059669; }
        .elm-tag.unpaid { background:rgba(220,38,38,.10); color:#dc2626; }
        .elm-tag.mute { background:var(--control-bg,#f6f8fb); color:var(--text-muted,#5a6b80); }
        .elm-x { border:1px solid rgba(220,38,38,.35); color:#dc2626; background:transparent;
            font-size:12.5px; font-weight:700; padding:5px 11px; border-radius:7px; cursor:pointer;
            font-family:inherit; }
        .elm-x:hover { background:rgba(220,38,38,.08); }
        .elm-give { border:1px solid #2563eb; color:#fff; background:#2563eb; font-size:12.5px;
            font-weight:700; padding:5px 12px; border-radius:7px; cursor:pointer; font-family:inherit; }
        .elm-scroll2 { max-height:330px; overflow:auto; }
        @media (max-width:600px) { .elm-2col { grid-template-columns:1fr; } }
    `).appendTo(document.head);

    const $root = $('<div class="elm"><div class="elm-wrap"></div></div>')
        .appendTo($(wrapper).find('.page-content')).find('.elm-wrap');

    const esc = (v) => (v === null || v === undefined) ? '' : String(v).replace(/[&<>"']/g,
        c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const n1 = (v) => (Math.round((Number(v) || 0) * 10) / 10).toFixed(1).replace(/\.0$/, '');
    const initials = (s) => (s || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
    // plain words for the one leave type whose real name confuses people
    const nice = (t) => t === 'Leave Without Pay' ? 'Unpaid Leave' : t;
    const niceDate = (d) => {
        const o = frappe.datetime.str_to_obj(d);
        if (!o) return d;
        return o.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    };

    function api(method, args) {
        return frappe.call({ method: M + method, args: args || {} }).then(r => r.message);
    }
    function fail(e) {
        let m = (e && e.message) || 'Something went wrong. Please try again.';
        try {
            if (e && e._server_messages) {
                const s = JSON.parse(e._server_messages);
                if (s.length) m = JSON.parse(s[0]).message || m;
            }
        } catch (x) { /* keep the default */ }
        frappe.msgprint({ title: 'Could not do that', indicator: 'red', message: m });
    }

    let ALL = [], TYPES = [];

    // ── main page ────────────────────────────────────────────
    $root.html(`
        <div class="elm-head">
          <h1>Employee Leave</h1>
          <p>Search for an employee, then click their name to see and change their leave.</p>
          <button class="elm-dl" id="elm-dl">⭳ Download leave report (CSV)</button>
        </div>
        <div class="elm-searchbox">
          <span class="ic">🔍</span>
          <input id="elm-q" type="text" placeholder="Type a name or employee number…" autocomplete="off">
        </div>
        <div class="elm-count" id="elm-count"></div>
        <div class="elm-list" id="elm-list"></div>
    `);

    function skeletonList() {
        return Array.from({ length: 6 }, () => `
            <div class="elm-row">
              <div class="elm-av sk" style="border-radius:50%"></div>
              <div class="who" style="width:100%">
                <div class="sk" style="width:38%;margin-bottom:7px"></div>
                <div class="sk" style="width:60%;height:11px"></div>
              </div>
            </div>`).join('');
    }

    function renderList() {
        const q = ($('#elm-q').val() || '').trim().toLowerCase();
        const rows = q ? ALL.filter(r =>
            (r.employee_name || '').toLowerCase().includes(q) ||
            (r.employee || '').toLowerCase().includes(q) ||
            (r.department || '').toLowerCase().includes(q)) : ALL;

        const needs = ALL.filter(r => r.needs_setup).length;
        $('#elm-count').html(`
            <span><b>${rows.length}</b> employee${rows.length === 1 ? '' : 's'}${q ? ' found' : ''}</span>
            ${needs ? `<button class="elm-warnpill" id="elm-needs">⚠ ${needs} have no leave set up — show them</button>` : ''}`);
        $('#elm-needs').off('click').on('click', () => {
            $('#elm-q').val('');
            $('#elm-list').html(listHtml(ALL.filter(r => r.needs_setup)));
            $('#elm-count').html(`<span><b>${needs}</b> employees with no leave set up</span>
                <button class="elm-warnpill" id="elm-allback">Show everyone</button>`);
            $('#elm-allback').on('click', renderList);
        });

        if (!rows.length) {
            $('#elm-list').html(`<div class="elm-empty"><div class="ic">🔍</div>
                <h4>No one found</h4><p>Try part of the name, or the employee number.</p></div>`);
            return;
        }
        $('#elm-list').html(listHtml(rows));
    }

    function listHtml(rows) {
        return rows.map(r => {
            const sum = r.needs_setup
                ? `<span class="elm-tagwarn">No leave set up</span>`
                : r.balances.map(b => `${esc(nice(b.leave_type))} <b>${n1(b.left)}</b> left`).join(' · ');
            return `<div class="elm-row" data-emp="${esc(r.employee)}">
              <div class="elm-av">${esc(initials(r.employee_name))}</div>
              <div class="who">
                <b>${esc(r.employee_name || r.employee)}</b>
                <span>${esc(r.employee)}${r.department ? ' · ' + esc(r.department) : ''} &nbsp;·&nbsp; ${sum}</span>
              </div>
              <div class="arr">›</div>
            </div>`;
        }).join('');
    }

    $root.on('input', '#elm-q', frappe.utils.debounce(renderList, 150));
    $root.on('click', '#elm-dl', downloadReport);

    // One row per monthly employee, straight from the server so the figures are
    // the same ones the employee popup shows.
    function downloadReport() {
        const btn = document.getElementById('elm-dl');
        btn.disabled = true; btn.textContent = 'Preparing…';
        api('export_leave_summary', {}).then(r => {
            const types = r.types || [];
            const head = ['Employee ID', 'Employee Name', 'Department', 'Fingerprint ID', 'Date of Joining'];
            types.forEach(tp => {
                const n = nice(tp);
                head.push(n + ' - Entitlement', n + ' - Taken', n + ' - Manual Deduction',
                          n + ' - Pending Approval', n + ' - Outstanding');
            });
            head.push('Total Outstanding Leave', 'Unpaid Leave Days (' + r.year + ')',
                      'Absent Days Without Leave (' + r.year + ')', 'Status');
            const lines = [head];
            (r.rows || []).forEach(x => {
                const line = [x.employee, x.employee_name, x.department, x.fingerprint_id, x.date_of_joining];
                types.forEach(tp => {
                    const c = x[tp] || {};
                    line.push(c.entitlement, c.taken, c.manual, c.pending, c.outstanding);
                });
                line.push(x.total_outstanding, x.unpaid_days, x.absent_no_leave, x.status);
                lines.push(line);
            });
            const cell = v => {
                if (v === null || v === undefined) return '';
                if (typeof v === 'number') return String(Math.round(v * 100) / 100);
                const s = String(v);
                return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
            };
            // BOM so Excel opens it as UTF-8
            const csv = '﻿' + lines.map(l => l.map(cell).join(',')).join('\r\n');
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
            a.download = 'employee-leave-report-' + r.as_of + '.csv';
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 2000);
            frappe.show_alert({ message: 'Leave report downloaded — ' + (r.rows || []).length + ' employees',
                                indicator: 'green' });
        }).catch(fail).then(() => {
            btn.disabled = false; btn.textContent = '⭳ Download leave report (CSV)';
        });
    }
    $root.on('click', '.elm-row', function () { openEmployee($(this).data('emp')); });

    function load() {
        $('#elm-list').html(skeletonList());
        return api('search_employees', { query: '' }).then(r => {
            ALL = r.employees || []; TYPES = r.types || [];
            renderList();
        }).catch(fail);
    }

    // ── the employee popup ───────────────────────────────────
    function openEmployee(emp) {
        const d = new frappe.ui.Dialog({ title: ' ', size: 'large' });
        d.$wrapper.addClass('elm-modal');
        const $b = d.$wrapper.find('.modal-body');
        $b.html(`<div class="elm-d"><div style="padding:30px 0"><div class="sk" style="width:45%;height:20px;margin-bottom:12px"></div>
                 <div class="sk" style="width:70%"></div></div></div>`);
        d.show();

        let DATA = null;
        let tab = 'apply';

        function refresh() {
            return api('get_employee_leave', { employee: emp }).then(r => { DATA = r; draw(); });
        }

        function draw() {
            const e = DATA;
            d.set_title(' ');
            $b.html(`<div class="elm-d">
              <div class="who">
                <div class="av">${esc(initials(e.employee_name))}</div>
                <div>
                  <h3>${esc(e.employee_name)}</h3>
                  <p>${esc(e.employee)}${e.department ? ' · ' + esc(e.department) : ''}</p>
                </div>
              </div>
              ${!e.eligible ? `<div class="elm-note warn"><span>⚠</span>
                 <span>This employee is paid for each day they work, so leave does not apply to them.
                 Any day they are absent is simply not paid.</span></div>` : ''}
              <div class="elm-bals" id="elm-bals"></div>
              <div class="elm-seg2">
                <button data-t="apply">Apply Leave</button>
                <button data-t="history">Leave Taken (${e.history.length})</button>
                <button data-t="absent">Absent Days (${e.absents.length})</button>
              </div>
              <div id="elm-tabbody"></div>
            </div>`);
            drawBalances();
            $b.find('.elm-seg2 button').on('click', function () {
                tab = $(this).data('t'); drawTabs();
            });
            drawTabs();
        }

        function drawBalances() {
            $b.find('#elm-bals').html(DATA.balances.map(x => x.has_allocation ? `
                <div class="elm-b">
                  <div class="t">${esc(nice(x.leave_type))}</div>
                  <div class="n" style="color:${x.left > 1 ? '#059669' : (x.left > 0 ? '#b45309' : '#dc2626')}">${n1(x.left)}</div>
                  <div class="s">days left of ${n1(x.allocated)}</div>
                  <button class="ch" data-ch="${esc(x.leave_type)}">Change</button>
                </div>` : `
                <div class="elm-b none">
                  <div class="t">${esc(nice(x.leave_type))}</div>
                  <div class="n">Not set up</div>
                  <button class="ch" data-ch="${esc(x.leave_type)}">Set up now</button>
                </div>`).join(''));
            $b.find('[data-ch]').on('click', function () { changeAllowance($(this).data('ch')); });
        }

        function drawTabs() {
            $b.find('.elm-seg2 button').removeClass('on').filter(`[data-t="${tab}"]`).addClass('on');
            if (tab === 'apply') drawApply();
            else if (tab === 'history') drawHistory();
            else drawAbsent();
        }

        // ---- apply leave -------------------------------------------------
        function drawApply() {
            const e = DATA;
            const opts = e.balances.map(x => ({
                type: x.leave_type, left: x.left, has: x.has_allocation, unpaid: false,
            })).concat([{ type: 'Leave Without Pay', left: null, has: true, unpaid: true }]);

            $b.find('#elm-tabbody').html(`
              <div class="elm-f elm-2col">
                <div><label>First day of leave</label><input type="date" id="f-from" value="${frappe.datetime.get_today()}"></div>
                <div><label>Last day of leave</label><input type="date" id="f-to" value="${frappe.datetime.get_today()}"></div>
              </div>
              <div class="elm-f">
                <label style="font-weight:600"><input type="checkbox" id="f-half" style="width:auto;margin-right:7px">
                Half day only</label>
              </div>
              <div class="elm-f">
                <label>Which leave?</label>
                <div class="elm-types" id="f-types">
                  ${opts.map(o => `
                    <button class="elm-type ${o.unpaid ? 'unpaid' : ''}" data-type="${esc(o.type)}"
                      ${(!o.has || (o.left !== null && o.left <= 0)) ? 'disabled' : ''}>
                      <b>${esc(nice(o.type))}</b>
                      <span>${o.left === null ? 'Salary is not paid for these days'
                             : (o.has ? `${n1(o.left)} days left` : 'Not set up')}</span>
                    </button>`).join('')}
                </div>
              </div>
              <div class="elm-f"><label>Reason (optional)</label>
                <input type="text" id="f-reason" placeholder="e.g. Medical, family matter…"></div>
              <div id="f-warn"></div>
              <button class="btn btn-primary btn-block" id="f-go" style="font-weight:700;padding:11px">
                Apply Leave</button>`);

            let chosen = null;
            $b.find('#f-types .elm-type').on('click', function () {
                if (this.disabled) return;
                $b.find('.elm-type').removeClass('on'); $(this).addClass('on');
                chosen = $(this).data('type'); checkWarn();
            });
            $b.find('#f-half').on('change', function () {
                $b.find('#f-to').prop('disabled', this.checked);
                if (this.checked) $b.find('#f-to').val($b.find('#f-from').val());
            });
            $b.find('#f-from').on('change', function () {
                if ($b.find('#f-to').val() < this.value || $b.find('#f-half').is(':checked'))
                    $b.find('#f-to').val(this.value);
                checkWarn();
            });
            $b.find('#f-to').on('change', checkWarn);

            function paidFor(dateStr) {
                return (DATA.paid_periods || []).find(p => dateStr >= p.from_date && dateStr <= p.to_date);
            }
            function checkWarn() {
                const from = $b.find('#f-from').val(), to = $b.find('#f-to').val();
                const p = paidFor(from) || paidFor(to);
                let html = '';
                if (p) {
                    html += `<div class="elm-note warn"><span>⚠</span><span>
                      <b>Salary for ${niceDate(p.from_date)} – ${niceDate(p.to_date)} has already been paid.</b>
                      Adding leave now will not change the money that was already given.
                      Tell whoever runs payroll if this needs to be corrected.</span></div>`;
                }
                if (chosen === 'Leave Without Pay' && p) {
                    html += `<div class="elm-note bad"><span>✕</span><span>
                      Unpaid leave cannot be added to a month whose salary is already finished.
                      Please pick a paid leave type, or a different date.</span></div>`;
                }
                $b.find('#f-warn').html(html);
            }

            $b.find('#f-go').on('click', function () {
                if (!chosen) {
                    frappe.msgprint({ title: 'Pick a leave type', indicator: 'orange',
                        message: 'Please choose which leave to use.' });
                    return;
                }
                const btn = this;
                const args = {
                    employee: emp, leave_type: chosen,
                    from_date: $b.find('#f-from').val(),
                    to_date: $b.find('#f-half').is(':checked') ? $b.find('#f-from').val() : $b.find('#f-to').val(),
                    half_day: $b.find('#f-half').is(':checked') ? 1 : 0,
                    reason: $b.find('#f-reason').val(),
                };
                $(btn).prop('disabled', true).text('Applying…');
                api('apply_leave_direct', args).then(res => {
                    $(btn).prop('disabled', false).text('Apply Leave');
                    if (res && res.ok) {
                        frappe.show_alert({ message: res.message, indicator: 'green' });
                        refresh().then(() => { tab = 'history'; drawTabs(); });
                        load();
                    } else {
                        frappe.msgprint({ title: 'Could not apply this leave', indicator: 'red',
                            message: (res && res.message) || 'Please try a different date or leave type.' });
                    }
                }).catch(e => { $(btn).prop('disabled', false).text('Apply Leave'); fail(e); });
            });
        }

        // ---- leave already taken ----------------------------------------
        function drawHistory() {
            const h = DATA.history;
            if (!h.length) {
                $b.find('#elm-tabbody').html(`<div class="elm-empty"><div class="ic">📄</div>
                  <h4>No leave taken this year</h4><p>Nothing has been applied for ${DATA.year}.</p></div>`);
                return;
            }
            $b.find('#elm-tabbody').html(`<div class="elm-scroll2">${h.map(r => `
                <div class="elm-hrow">
                  <div class="d">
                    <b>${esc(niceDate(r.from_date))}${r.to_date !== r.from_date ? ' – ' + esc(niceDate(r.to_date)) : ''}</b>
                    <small>${n1(r.days)} day${r.days === 1 ? '' : 's'}${r.half_day ? ' (half day)' : ''}${r.auto ? ' · added automatically' : ''}</small>
                  </div>
                  <span class="elm-tag ${r.is_unpaid ? 'unpaid' : 'paid'}">${esc(nice(r.leave_type))}</span>
                  ${r.paid_period ? '<span class="elm-tag mute" title="Salary already paid for this month">salary done</span>' : ''}
                  <button class="elm-x" data-cancel="${esc(r.name)}">Cancel</button>
                </div>`).join('')}</div>`);
            $b.find('[data-cancel]').on('click', function () {
                const la = $(this).data('cancel');
                const row = h.find(x => x.name === la);
                let msg = `Cancel <b>${esc(nice(row.leave_type))}</b> on
                    <b>${esc(niceDate(row.from_date))}</b>?<br><br>
                    The day will go back to being marked absent.`;
                if (row.paid_period) {
                    msg += `<br><br><span style="color:#b45309"><b>Note:</b> salary for this month has
                        already been paid, so this will not change the money already given.</span>`;
                }
                frappe.confirm(msg, () => {
                    api('cancel_leave_application', { leave_application: la }).then(res => {
                        frappe.show_alert({ message: (res && res.message) || 'Cancelled',
                            indicator: res && res.ok ? 'green' : 'red' });
                        if (res && !res.ok) {
                            frappe.msgprint({ title: 'Could not cancel', indicator: 'red', message: res.message });
                        }
                        refresh(); load();
                    }).catch(fail);
                });
            });
        }

        // ---- absent days with no leave -----------------------------------
        function drawAbsent() {
            const a = DATA.absents;
            if (!a.length) {
                $b.find('#elm-tabbody').html(`<div class="elm-empty"><div class="ic">✅</div>
                  <h4>Nothing outstanding</h4>
                  <p>Every absent day this year already has leave against it.</p></div>`);
                return;
            }
            const usable = DATA.balances.filter(x => x.has_allocation && x.left > 0);
            $b.find('#elm-tabbody').html(`
              ${usable.length ? '' : `<div class="elm-note warn"><span>⚠</span><span>
                 This employee has no paid leave left, so these days can only stay unpaid.
                 Use <b>Change</b> above to give them more days first.</span></div>`}
              <div class="elm-scroll2">${a.map(r => `
                <div class="elm-hrow">
                  <div class="d"><b>${esc(niceDate(r.date))}</b>
                    <small>${esc(r.status === 'Absent' ? 'Absent all day' : 'Half day')}</small></div>
                  ${r.paid_period ? '<span class="elm-tag mute" title="Salary already paid">salary done</span>' : ''}
                  <button class="elm-give" data-give="${esc(r.date)}"
                    ${usable.length ? '' : 'disabled style="opacity:.45;cursor:not-allowed"'}>Give leave</button>
                </div>`).join('')}</div>`);
            $b.find('[data-give]').on('click', function () {
                const date = $(this).data('give');
                const pick = new frappe.ui.Dialog({
                    title: 'Give leave for ' + niceDate(date),
                    fields: [{ fieldtype: 'Select', fieldname: 'lt', label: 'Which leave?', reqd: 1,
                        options: usable.map(x => x.leave_type).join('\n') }],
                    primary_action_label: 'Give leave',
                    primary_action(v) {
                        pick.hide();
                        api('apply_leave_direct', { employee: emp, leave_type: v.lt,
                            from_date: date, to_date: date }).then(res => {
                            frappe.show_alert({ message: (res && res.message) || 'Done',
                                indicator: res && res.ok ? 'green' : 'red' });
                            if (res && !res.ok) {
                                frappe.msgprint({ title: 'Could not apply', indicator: 'red', message: res.message });
                            }
                            refresh(); load();
                        }).catch(fail);
                    },
                });
                pick.show();
            });
        }

        // ---- change the allowance ----------------------------------------
        function changeAllowance(leaveType) {
            const cur = DATA.balances.find(x => x.leave_type === leaveType) || {};
            const dd = new frappe.ui.Dialog({
                title: (cur.has_allocation ? 'Change ' : 'Set up ') + nice(leaveType),
                fields: [
                    { fieldtype: 'HTML', options: `<p style="font-size:13.5px;margin-bottom:6px">
                        How many days of <b>${esc(nice(leaveType))}</b> should
                        ${esc(DATA.employee_name)} get for ${DATA.year}?</p>
                        ${cur.has_allocation ? `<p style="font-size:12.5px;color:#5a6b80">
                          Currently ${n1(cur.allocated)} days, of which ${n1(cur.taken)} already used.</p>` : ''}` },
                    { fieldtype: 'Float', fieldname: 'days', label: 'Days per year', reqd: 1,
                      default: cur.allocated || cur.max_allowed || 0,
                      description: cur.max_allowed ? `Company maximum is ${n1(cur.max_allowed)} days.` : '' },
                ],
                primary_action_label: 'Save',
                primary_action(v) {
                    dd.hide();
                    api('set_allocation', { employee: emp, leave_type: leaveType, days: v.days })
                        .then(res => {
                            frappe.show_alert({ message: (res && res.message) || 'Saved',
                                indicator: res && res.ok ? 'green' : 'red' });
                            if (res && !res.ok) {
                                frappe.msgprint({ title: 'Could not save', indicator: 'red', message: res.message });
                            }
                            refresh(); load();
                        }).catch(fail);
                },
            });
            dd.show();
        }

        refresh().catch(fail);
    }

    load();
};
