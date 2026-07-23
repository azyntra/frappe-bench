frappe.pages['day-team-attendance'].on_page_load = function(wrapper) {
    frappe.ui.make_app_page({ parent: wrapper, title: 'Day Team Attendance & OT', single_column: true });
    document.title = 'Day Team Attendance & OT';

    if (!document.getElementById('dta-font')) {
        const lnk = document.createElement('link');
        lnk.id = 'dta-font'; lnk.rel = 'stylesheet';
        lnk.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap';
        document.head.appendChild(lnk);
    }

    $('#dta-styles').remove();
    $('<style id="dta-styles">').text(`
        .dta {
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
        [data-theme="dark"] .dta {
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
        .dta * { box-sizing:border-box; -webkit-font-smoothing:antialiased; }
        .dta { font-family:'DM Sans',sans-serif; background:var(--bg); min-height:100vh; padding:14px 14px 48px; color:var(--tx); }

        .dta-topbar { background:var(--card); border:1px solid var(--bd); border-left:4px solid var(--grn);
            border-radius:var(--r); padding:12px 16px; margin-bottom:8px; display:flex; align-items:center;
            justify-content:space-between; flex-wrap:wrap; gap:10px; box-shadow:var(--sh); }
        .dta-brand { display:flex; align-items:center; gap:11px; }
        .dta-brand-icon { width:38px; height:38px; border-radius:9px; background:var(--grn); display:flex;
            align-items:center; justify-content:center; font-size:17px; box-shadow:0 2px 8px rgba(5,150,105,.35); }
        .dta-brand-title { font-size:14px; font-weight:700; letter-spacing:-.3px; }
        .dta-brand-sub { font-size:10px; color:var(--mu); font-weight:500; margin-top:1px; }
        .dta-nav { display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
        .dta-date { background:var(--ibg); border:1.5px solid var(--bd); border-radius:8px; padding:5px 9px;
            font-family:'DM Mono',monospace; font-size:12px; color:var(--tx); outline:none; }
        .dta-date:focus { border-color:var(--blue); }
        .dta-btn { padding:7px 12px; border-radius:8px; border:1.5px solid var(--bd); background:var(--ibg);
            font-family:'DM Sans',sans-serif; font-size:11.5px; font-weight:600; color:var(--mu); cursor:pointer;
            transition:all .14s; white-space:nowrap; display:inline-flex; align-items:center; gap:5px; }
        .dta-btn:hover { border-color:var(--blue); color:var(--blue); background:var(--blue-lt); }
        .dta-btn.primary { background:var(--blue); border-color:transparent; color:#fff; box-shadow:0 2px 8px rgba(37,99,235,.3); }
        .dta-btn.primary:hover { opacity:.88; }
        .dta-btn.amber:hover { border-color:var(--amb); color:var(--amb); background:var(--amb-lt); }

        .dta-cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:8px; margin-bottom:8px; }
        .dta-card { background:var(--card); border:1px solid var(--bd); border-radius:var(--r); padding:10px 13px; box-shadow:var(--sh); }
        .dta-card .cv { font-size:21px; font-weight:800; font-family:'DM Mono',monospace; line-height:1.15; }
        .dta-card .cl { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--mu); margin-top:2px; }

        .dta-warn { background:var(--amb-lt); border:1px solid var(--amb-bd); border-radius:var(--r);
            padding:8px 12px; margin-bottom:8px; font-size:11px; color:var(--amb); display:none; }
        .dta-warn.on { display:block; }
        .dta-warn div { padding:1px 0; }

        .dta-filterbar { background:var(--card); border:1px solid var(--bd); border-radius:var(--r);
            padding:8px 11px; margin-bottom:8px; display:flex; align-items:center; gap:7px; flex-wrap:wrap; box-shadow:var(--sh); }
        .dta-search { position:relative; flex:1; min-width:150px; max-width:240px; }
        .dta-search input { width:100%; padding:6px 10px 6px 30px; border-radius:7px; border:1.5px solid var(--bd);
            background:var(--ibg); font-family:'DM Sans',sans-serif; font-size:11.5px; color:var(--tx); outline:none; }
        .dta-search input:focus { border-color:var(--blue); }
        .dta-search .ic { position:absolute; left:9px; top:50%; transform:translateY(-50%); font-size:11px; color:var(--lt); }
        .dta-tog { padding:5px 11px; border-radius:7px; border:1.5px solid var(--bd); background:var(--ibg);
            font-size:10.5px; font-weight:700; color:var(--mu); cursor:pointer; transition:all .13s; }
        .dta-tog.on { background:var(--blue-lt); border-color:var(--blue-bd); color:var(--blue); }
        .dta-leg { display:flex; gap:5px; align-items:center; flex-wrap:wrap; margin-left:auto; }
        .dta-chip { padding:3px 8px; border-radius:6px; font-size:9px; font-weight:700; border:1.5px solid; }

        .dta-grid-outer { border-radius:var(--r); border:1px solid var(--bd); background:var(--card);
            overflow:hidden; box-shadow:var(--sh); }
        .dta-scroll { overflow-x:auto; }
        .dta-grid { border-collapse:collapse; min-width:100%; }
        .dta-th-emp { width:190px; min-width:190px; padding:8px 12px; font-size:9px; font-weight:700;
            letter-spacing:.5px; text-transform:uppercase; color:var(--mu); border-right:2px solid var(--bd2);
            border-bottom:1px solid var(--bd2); background:var(--ibg); position:sticky; left:0; z-index:20; text-align:left; }
        .dta-th-day { min-width:46px; padding:5px 2px; text-align:center; border-right:1px solid var(--bd);
            border-bottom:1px solid var(--bd2); background:var(--card); }
        .dta-th-day .dn { font-size:7.5px; font-weight:700; text-transform:uppercase; color:var(--lt); display:block; line-height:1; }
        .dta-th-day .dd { font-size:13px; font-weight:800; font-family:'DM Mono',monospace; display:block; line-height:1.2; }
        .dta-th-day.hol .dn, .dta-th-day.hol .dd { color:var(--vio); }
        .dta-th-day.hol { background:var(--vio-lt); }
        .dta-th-sum { min-width:52px; padding:5px 4px; text-align:center; font-size:8px; font-weight:700;
            text-transform:uppercase; color:var(--mu); border-right:1px solid var(--bd);
            border-bottom:1px solid var(--bd2); border-left:2px solid var(--bd2); background:var(--ibg); }
        .dta-th-sum ~ .dta-th-sum { border-left:none; }

        .dta-td-emp { padding:7px 11px; border-right:2px solid var(--bd2); border-bottom:1px solid var(--bd);
            position:sticky; left:0; background:var(--card); z-index:5; }
        .dta-emp-name { font-size:11px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:165px; }
        .dta-emp-id { font-size:8.5px; color:var(--lt); font-family:'DM Mono',monospace; }
        .dta-td { min-width:46px; height:44px; padding:2px; text-align:center; border-right:1px solid var(--bd);
            border-bottom:1px solid var(--bd); cursor:pointer; transition:background .12s; vertical-align:middle; }
        .dta-td:hover { background:var(--hov); }
        .dta-td.hol { background:var(--vio-lt); }
        .dta-td-sum { min-width:52px; text-align:center; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);
            border-left:2px solid var(--bd2); font-family:'DM Mono',monospace; font-size:11px; font-weight:700; background:var(--ibg); }
        .dta-td-sum ~ .dta-td-sum { border-left:none; }

        .dta-b { display:inline-flex; flex-direction:column; align-items:center; justify-content:center;
            width:38px; border-radius:7px; padding:3px 0 2px; border:1.5px solid transparent; position:relative; }
        .dta-b .t { font-size:11px; font-weight:900; line-height:1.1; }
        .dta-b .o { font-size:7.5px; font-weight:700; font-family:'DM Mono',monospace; line-height:1.2; }
        .dta-b.T { background:var(--blue-lt); border-color:var(--blue-bd); color:var(--blue); }
        .dta-b.N { background:var(--grn-lt); border-color:var(--grn-bd); color:var(--grn); }
        .dta-b.A { background:var(--rose-lt); border-color:var(--rose-bd); color:var(--rose); }
        .dta-b.H { background:var(--vio-lt); border-color:var(--vio-bd); color:var(--vio); }
        .dta-b.HD { background:var(--amb-lt); border-color:var(--amb-bd); color:var(--amb); }
        .dta-b .auto-dot { position:absolute; top:-3px; right:-3px; width:8px; height:8px; border-radius:50%;
            background:var(--amb); border:1.5px solid var(--card); }

        .dta-loading { text-align:center; padding:60px 20px; color:var(--mu); }
        .dta-spin { width:26px; height:26px; border:2.5px solid var(--bd); border-top-color:var(--grn);
            border-radius:50%; animation:dtaSpin .7s linear infinite; margin:0 auto 12px; }
        @keyframes dtaSpin { to { transform:rotate(360deg); } }

        .dta-toast { position:fixed; bottom:20px; left:50%; transform:translateX(-50%) translateY(8px);
            background:#0f1c2e; color:#fff; padding:8px 16px; border-radius:9px; font-size:11.5px; font-weight:600;
            opacity:0; transition:all .2s; z-index:9999; white-space:nowrap; pointer-events:none;
            box-shadow:0 5px 18px rgba(0,0,0,.28); }
        .dta-toast.on { opacity:1; transform:translateX(-50%) translateY(0); }
        .dta-scroll::-webkit-scrollbar { height:5px; }
        .dta-scroll::-webkit-scrollbar-thumb { background:var(--bd2); border-radius:3px; }
    `).appendTo('head');

    // ─── State ─────────────────────────────────────────────────────────────
    const M = 'hrms.hr.page.day_team_attendance.day_team_attendance.';
    let DATA = null;
    let searchQ = '', onlyOT = false, onlyTarget = false;

    // default = current payroll cycle (20th → 19th)
    function cycleRange() {
        const t = frappe.datetime.str_to_obj(frappe.datetime.get_today());
        let fy = t.getFullYear(), fm = t.getMonth();
        if (t.getDate() < 20) { fm -= 1; if (fm < 0) { fm = 11; fy -= 1; } }
        const from = new Date(fy, fm, 20), to = new Date(fy, fm + 1, 19);
        const f = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        return [f(from), f(to)];
    }
    const [defFrom, defTo] = cycleRange();

    // ─── Shell ─────────────────────────────────────────────────────────────
    $(wrapper).find('.page-content').html(`
    <div class="dta">
        <div class="dta-topbar">
            <div class="dta-brand">
                <div class="dta-brand-icon">📊</div>
                <div>
                    <div class="dta-brand-title">Day Team Attendance &amp; OT</div>
                    <div class="dta-brand-sub">Auto-classified from punches · T = Target (8–3) · N = Normal (8–5)</div>
                </div>
            </div>
            <div class="dta-nav">
                <input type="date" class="dta-date" id="dta-from" value="${defFrom}">
                <span style="color:var(--lt)">→</span>
                <input type="date" class="dta-date" id="dta-to" value="${defTo}">
                <button class="dta-btn primary" onclick="dtaLoad()">Load</button>
                <button class="dta-btn amber" onclick="dtaReprocess()">⚙ Re-process</button>
                <button class="dta-btn" onclick="dtaExport()">📋 CSV</button>
            </div>
        </div>
        <div class="dta-cards" id="dta-cards"></div>
        <div class="dta-warn" id="dta-warn"></div>
        <div class="dta-filterbar">
            <div class="dta-search"><span class="ic">🔍</span><input id="dta-search" placeholder="Search employee…"></div>
            <button class="dta-tog" id="dta-tog-ot" onclick="dtaTog('ot')">⏱ Only OT</button>
            <button class="dta-tog" id="dta-tog-tg" onclick="dtaTog('tg')">🎯 Only Target</button>
            <div class="dta-leg">
                <span class="dta-chip" style="background:var(--blue-lt);border-color:var(--blue-bd);color:var(--blue)">T Target 8–3</span>
                <span class="dta-chip" style="background:var(--grn-lt);border-color:var(--grn-bd);color:var(--grn)">N Normal 8–5</span>
                <span class="dta-chip" style="background:var(--rose-lt);border-color:var(--rose-bd);color:var(--rose)">A Absent</span>
                <span class="dta-chip" style="background:var(--vio-lt);border-color:var(--vio-bd);color:var(--vio)">H Holiday</span>
                <span class="dta-chip" style="background:var(--amb-lt);border-color:var(--amb-bd);color:var(--amb)">● auto</span>
            </div>
        </div>
        <div class="dta-grid-outer"><div class="dta-scroll"><div id="dta-wrap">
            <div class="dta-loading"><div class="dta-spin"></div>Loading…</div>
        </div></div></div>
    </div>
    <div class="dta-toast" id="dta-toast"></div>
    `);

    document.getElementById('dta-search').addEventListener('input', function() {
        searchQ = this.value.trim().toLowerCase(); render();
    });
    window.dtaTog = function(which) {
        if (which === 'ot') onlyOT = !onlyOT; else onlyTarget = !onlyTarget;
        document.getElementById('dta-tog-ot').classList.toggle('on', onlyOT);
        document.getElementById('dta-tog-tg').classList.toggle('on', onlyTarget);
        render();
    };

    function toast(msg) {
        const t = document.getElementById('dta-toast'); if (!t) return;
        t.innerHTML = msg; t.classList.add('on'); clearTimeout(t._t);
        t._t = setTimeout(() => t.classList.remove('on'), 3200);
    }
    const fmtLKR = n => 'Rs ' + (n || 0).toLocaleString('en-LK', { maximumFractionDigits: 0 });

    // ─── Load ──────────────────────────────────────────────────────────────
    window.dtaLoad = function() {
        const from = document.getElementById('dta-from').value, to = document.getElementById('dta-to').value;
        if (!from || !to) { toast('Pick a date range'); return; }
        document.getElementById('dta-wrap').innerHTML =
            '<div class="dta-loading"><div class="dta-spin"></div>Loading…</div>';
        frappe.call({ method: M + 'get_overview', args: { from_date: from, to_date: to } })
            .then(r => { DATA = r.message; renderCards(); renderWarnings(); render(); })
            .catch(e => {
                document.getElementById('dta-wrap').innerHTML =
                    `<div class="dta-loading">⚠️ ${e.message || 'Failed to load'}</div>`;
            });
    };

    function renderCards() {
        const t = DATA.totals || {};
        document.getElementById('dta-cards').innerHTML = `
            <div class="dta-card"><div class="cv" style="color:var(--tx)">${t.members || 0}</div><div class="cl">Members</div></div>
            <div class="dta-card"><div class="cv" style="color:var(--blue)">${t.target_days || 0}</div><div class="cl">Target days</div></div>
            <div class="dta-card"><div class="cv" style="color:var(--grn)">${t.normal_days || 0}</div><div class="cl">Normal days</div></div>
            <div class="dta-card"><div class="cv" style="color:var(--amb)">${t.ot_hours || 0}</div><div class="cl">OT hours</div></div>
            <div class="dta-card"><div class="cv" style="color:var(--amb)">${fmtLKR(t.ot_amount)}</div><div class="cl">OT @ ${t.ot_rate || 160}/hr</div></div>
            <div class="dta-card"><div class="cv" style="color:var(--vio)">${t.auto_days || 0}</div><div class="cl">Auto-classified</div></div>`;
    }

    function renderWarnings() {
        const el = document.getElementById('dta-warn');
        const w = DATA.warnings || [];
        el.classList.toggle('on', w.length > 0);
        el.innerHTML = w.map(x => `<div>⚠ ${x}</div>`).join('');
    }

    // ─── Grid ──────────────────────────────────────────────────────────────
    function render() {
        const wrap = document.getElementById('dta-wrap');
        if (!DATA) return;
        const holSet = new Set(DATA.holidays || []);
        let members = DATA.members || [];
        if (searchQ) members = members.filter(m =>
            m.employee_name.toLowerCase().includes(searchQ) || m.name.toLowerCase().includes(searchQ));
        if (onlyOT) members = members.filter(m => (DATA.summary[m.name] || {}).ot_hours > 0);
        if (onlyTarget) members = members.filter(m => (DATA.summary[m.name] || {}).target_days > 0);
        if (!members.length) { wrap.innerHTML = '<div class="dta-loading">No matching employees</div>'; return; }

        const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        let html = `<table class="dta-grid"><thead><tr><th class="dta-th-emp">Employee (${members.length})</th>`;
        for (const ds of DATA.days) {
            const d = new Date(ds + 'T00:00:00'), hol = holSet.has(ds);
            html += `<th class="dta-th-day${hol ? ' hol' : ''}"><span class="dn">${DAYS[d.getDay()]}</span><span class="dd">${d.getDate()}</span></th>`;
        }
        html += `<th class="dta-th-sum">Days</th><th class="dta-th-sum">T</th><th class="dta-th-sum">N</th>
                 <th class="dta-th-sum">OT hrs</th><th class="dta-th-sum">OT Rs</th></tr></thead><tbody>`;

        for (const m of members) {
            const cells = DATA.cells[m.name] || {}, s = DATA.summary[m.name] || {};
            html += `<tr><td class="dta-td-emp">
                <div class="dta-emp-name">${m.employee_name}</div>
                <div class="dta-emp-id">${m.name}${m.structure ? '' : ' · <span style="color:var(--rose)">no structure</span>'}</div></td>`;
            for (const ds of DATA.days) {
                const c = cells[ds], hol = holSet.has(ds);
                html += `<td class="dta-td${hol ? ' hol' : ''}" onclick="dtaCell('${m.name}','${ds}','${(m.employee_name || '').replace(/'/g, '')}')">`;
                if (c) {
                    let cls, letter;
                    if (c.status === 'Absent') { cls = 'A'; letter = 'A'; }
                    else if (c.status === 'Half Day') { cls = 'HD'; letter = '½'; }
                    else if (c.holiday) { cls = 'H'; letter = 'H'; }
                    else { cls = c.team || 'N'; letter = c.team || '·'; }
                    html += `<span class="dta-b ${cls}">${c.auto ? '<span class="auto-dot"></span>' : ''}
                        <span class="t">${letter}</span>${c.ot ? `<span class="o">+${c.ot}h</span>` : ''}</span>`;
                }
                html += '</td>';
            }
            html += `<td class="dta-td-sum">${s.present_days || 0}</td>
                <td class="dta-td-sum" style="color:var(--blue)">${s.target_days || 0}</td>
                <td class="dta-td-sum" style="color:var(--grn)">${s.normal_days || 0}</td>
                <td class="dta-td-sum" style="color:var(--amb)">${s.ot_hours || 0}</td>
                <td class="dta-td-sum" style="color:var(--amb);font-size:9.5px">${(s.ot_amount || 0).toLocaleString()}</td></tr>`;
        }
        html += '</tbody></table>';
        wrap.innerHTML = html;
    }

    // ─── Cell drill-down ───────────────────────────────────────────────────
    window.dtaCell = function(emp, ds, empName) {
        frappe.call({ method: M + 'get_day_punches', args: { employee: emp, work_date: ds } }).then(r => {
            const d = r.message || {};
            const rows = (d.punches || []).map(p =>
                `<tr><td style="padding:3px 10px;font-family:monospace">${p.time.substring(11, 19)}</td>
                 <td style="padding:3px 10px"><span class="indicator-pill ${p.log_type === 'IN' ? 'green' : 'orange'}">${p.log_type}</span></td></tr>`).join('');
            const c = ((DATA.cells[emp] || {})[ds]) || {};
            frappe.msgprint({
                title: `${empName} — ${ds}`,
                message: `
                  <div style="font-size:12px;line-height:1.7">
                    <b>Shift:</b> ${d.resolved_shift || '<i>none</i>'}
                    ${c.auto ? ' <span class="indicator-pill yellow">auto</span>' : (c.manual ? ' <span class="indicator-pill blue">manual</span>' : '')}<br>
                    <b>Punch pattern says:</b> ${d.inferred_shift || '—'}${d.is_holiday ? ' · <b style="color:#7c3aed">Holiday</b>' : ''}<br>
                    <b>Status:</b> ${c.status || '—'} · <b>Worked:</b> ${c.wh || 0}h · <b>OT:</b> ${c.ot || 0}h
                  </div>
                  <table style="margin-top:8px;border:1px solid var(--border-color);border-radius:6px;width:100%">
                    <tr><th style="padding:3px 10px;text-align:left">Time</th><th style="padding:3px 10px;text-align:left">Type</th></tr>
                    ${rows || '<tr><td colspan="2" style="padding:6px 10px"><i>No punches</i></td></tr>'}
                  </table>`,
            });
        });
    };

    // ─── Re-process ────────────────────────────────────────────────────────
    window.dtaReprocess = function() {
        const from = document.getElementById('dta-from').value, to = document.getElementById('dta-to').value;
        toast('⏳ Checking what would change…');
        frappe.call({ method: M + 'reprocess_range', args: { from_date: from, to_date: to, dry_run: 1 } }).then(r => {
            const res = r.message || {}, acts = res.actions || [];
            const real = acts.filter(a => a.action !== 'blocked-paid');
            if (!real.length) {
                frappe.msgprint({ title: 'Re-process', message:
                    `Nothing to change for ${from} → ${to}.` +
                    (res.blocked_paid ? `<br>${res.blocked_paid} day(s) skipped — already covered by a submitted salary slip.` : '') });
                return;
            }
            const rows = real.slice(0, 60).map(a =>
                `<tr><td style="padding:2px 8px">${a.employee}</td><td style="padding:2px 8px;font-family:monospace">${a.date}</td>
                 <td style="padding:2px 8px">${a.action}</td>
                 <td style="padding:2px 8px;font-size:10px">${a.shift_from || '—'} → ${a.shift_to || '—'}</td>
                 <td style="padding:2px 8px">${a.attendance}</td>
                 <td style="padding:2px 8px;font-family:monospace">${a.ot_before ?? 0}${a.ot_after != null ? ' → ' + a.ot_after : ''}</td></tr>`).join('');
            const d = new frappe.ui.Dialog({
                title: `Re-process preview — ${real.length} change(s)`,
                size: 'large',
                primary_action_label: 'Apply changes',
                primary_action: () => {
                    d.hide(); toast('⏳ Applying…');
                    frappe.call({ method: M + 'reprocess_range', args: { from_date: from, to_date: to, dry_run: 0 } })
                        .then(r2 => {
                            const errs = (r2.message.actions || []).filter(a => (a.result || '').startsWith('error'));
                            toast(errs.length ? `⚠ done with ${errs.length} error(s)` : `✓ ${r2.message.total} change(s) applied`);
                            dtaLoad();
                        });
                },
            });
            d.$body.html(`
                <div style="font-size:11.5px;margin-bottom:8px">
                    ${res.blocked_paid ? `${res.blocked_paid} day(s) skipped (already paid). ` : ''}
                    Showing ${Math.min(real.length, 60)} of ${real.length}:
                </div>
                <div style="max-height:340px;overflow:auto;border:1px solid var(--border-color);border-radius:6px">
                <table style="width:100%;font-size:11px">
                <tr><th style="padding:3px 8px;text-align:left">Employee</th><th style="padding:3px 8px;text-align:left">Date</th>
                <th style="padding:3px 8px;text-align:left">Roster</th><th style="padding:3px 8px;text-align:left">Shift</th>
                <th style="padding:3px 8px;text-align:left">Attendance</th><th style="padding:3px 8px;text-align:left">OT</th></tr>
                ${rows}</table></div>`);
            d.show();
        });
    };

    // ─── CSV export ────────────────────────────────────────────────────────
    window.dtaExport = function() {
        if (!DATA) { toast('Load data first'); return; }
        let csv = 'Employee ID,Name,' + DATA.days.join(',') +
            ',Present Days,Target Days,Normal Days,OT Hours,OT Amount\n';
        for (const m of DATA.members) {
            const cells = DATA.cells[m.name] || {}, s = DATA.summary[m.name] || {};
            const row = [m.name, `"${m.employee_name}"`];
            for (const ds of DATA.days) {
                const c = cells[ds];
                row.push(c ? `"${c.status === 'Absent' ? 'A' : (c.team || c.status)}${c.ot ? '+' + c.ot + 'h' : ''}${c.auto ? ' (auto)' : ''}"` : '');
            }
            row.push(s.present_days || 0, s.target_days || 0, s.normal_days || 0, s.ot_hours || 0, s.ot_amount || 0);
            csv += row.join(',') + '\n';
        }
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url;
        a.download = `day_team_attendance_${document.getElementById('dta-from').value}_${document.getElementById('dta-to').value}.csv`;
        a.click(); URL.revokeObjectURL(url);
        toast('📋 CSV exported');
    };

    dtaLoad();
};
