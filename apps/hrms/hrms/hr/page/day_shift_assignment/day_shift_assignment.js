frappe.pages['day-shift-assignment'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Day Team Shift Assignment',
        single_column: true
    });
    document.title = 'Day Team Shift Assignment';

    if (!document.getElementById('dsa-font')) {
        const lnk = document.createElement('link');
        lnk.id = 'dsa-font'; lnk.rel = 'stylesheet';
        lnk.href = 'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap';
        document.head.appendChild(lnk);
    }

    $('#dsa-styles').remove();
    $('<style id="dsa-styles">').text(`
        .dsa{--bg:var(--bg-color,#f0f2f5);--card:var(--card-bg,#fff);--bd:var(--border-color,#e2e8f0);
            --tx:var(--text-color,#0f172a);--mu:var(--text-muted,#64748b);--lt:var(--text-light,#94a3b8);
            --ibg:var(--control-bg,#f8fafc);--hov:var(--fg-hover-color,#f1f5f9);
            --blue:#2563eb;--green:#059669;--amber:#d97706;--rose:#e11d48;--violet:#7c3aed;--cyan:#0891b2}
        .dsa*{box-sizing:border-box}
        .dsa{font-family:'Sora',sans-serif;background:var(--bg);min-height:100vh;padding:14px 12px 100px;color:var(--tx)}

        /* Top bar */
        .dsa-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px}
        .dsa-left{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .dsa-date-pill{background:var(--card);border:1.5px solid var(--bd);border-radius:10px;padding:8px 14px;
            display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;transition:border-color .18s}
        .dsa-date-pill:hover{border-color:var(--blue)}
        .dsa-date-pill input[type=date]{border:none;background:transparent;font-family:'JetBrains Mono',monospace;
            font-size:13px;font-weight:700;color:var(--blue);cursor:pointer;outline:none;padding:0}
        .dsa-daytag{font-size:11px;font-weight:700;padding:4px 10px;border-radius:7px;border:1px solid}
        .dsa-daytag.workday{background:rgba(5,150,105,.08);border-color:rgba(5,150,105,.25);color:var(--green)}
        .dsa-daytag.sunday{background:rgba(225,29,72,.08);border-color:rgba(225,29,72,.25);color:var(--rose)}
        .dsa-daytag.poya{background:rgba(124,58,237,.08);border-color:rgba(124,58,237,.25);color:var(--violet)}
        .dsa-stats{display:flex;gap:7px}
        .dsa-stat{background:var(--card);border:1px solid var(--bd);border-radius:9px;padding:5px 14px;text-align:center}
        .dsa-stat .sv{font-size:19px;font-weight:800;font-family:'JetBrains Mono',monospace;line-height:1.2}
        .dsa-stat .sl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--mu)}

        /* Shift summary cards */
        .dsa-shift-row{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:13px}
        @media(max-width:540px){.dsa-shift-row{grid-template-columns:1fr}}
        .dsa-scard{border-radius:11px;padding:11px 13px;border:1.5px solid transparent;cursor:pointer;
            transition:all .2s;position:relative;overflow:hidden;user-select:none}
        .dsa-scard:hover{transform:translateY(-2px);box-shadow:0 5px 16px rgba(0,0,0,.09)}
        .dsa-scard-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:3px}
        .dsa-scard-name{font-size:12px;font-weight:800}
        .dsa-scard-count{font-size:18px;font-weight:800;font-family:'JetBrains Mono',monospace}
        .dsa-scard-time{font-size:10px;font-family:'JetBrains Mono',monospace;opacity:.75}
        .dsa-scard-hint{font-size:9px;font-weight:600;opacity:.6;text-transform:uppercase;letter-spacing:.4px;margin-top:4px}

        /* Toolbar */
        .dsa-toolbar{display:flex;gap:7px;margin-bottom:9px;flex-wrap:wrap;align-items:center}
        .dsa-search-wrap{flex:1;min-width:150px;position:relative}
        .dsa-search-wrap input{width:100%;padding:8px 10px 8px 30px;border-radius:8px;border:1px solid var(--bd);
            background:var(--card);font-family:'Sora',sans-serif;font-size:12px;color:var(--tx);
            outline:none;transition:border-color .18s}
        .dsa-search-wrap input:focus{border-color:var(--blue)}
        .dsa-search-wrap input::placeholder{color:var(--lt)}
        .dsa-search-icon{position:absolute;left:9px;top:50%;transform:translateY(-50%);font-size:12px;
            pointer-events:none;color:var(--lt)}
        .dsa-fbtn{padding:7px 12px;border-radius:8px;border:1px solid var(--bd);background:var(--card);
            font-family:'Sora',sans-serif;font-size:11px;font-weight:600;color:var(--mu);
            cursor:pointer;transition:all .18s;white-space:nowrap}
        .dsa-fbtn:hover{border-color:var(--blue);color:var(--blue);background:var(--hov)}
        .dsa-fbtn.on{background:var(--blue);border-color:var(--blue);color:#fff}

        /* Bulk bar */
        .dsa-bulk{display:none;background:var(--card);border:1.5px solid var(--blue);border-radius:10px;
            padding:8px 12px;margin-bottom:9px;align-items:center;gap:7px;flex-wrap:wrap}
        .dsa-bulk.show{display:flex}
        .dsa-bulk-lbl{font-size:12px;font-weight:700;color:var(--blue);flex:1;min-width:80px}
        .dsa-bulk-btns{display:flex;gap:5px;flex-wrap:wrap}
        .dsa-bulk-btn{padding:5px 11px;border-radius:7px;font-size:11px;font-weight:700;
            cursor:pointer;border:none;font-family:'Sora',sans-serif;transition:transform .12s}
        .dsa-bulk-btn:hover{transform:scale(1.04)}
        .dsa-bulk-rm{padding:5px 11px;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;
            border:1px solid var(--bd);background:var(--ibg);color:var(--mu);font-family:'Sora',sans-serif}
        .dsa-bulk-rm:hover{background:rgba(225,29,72,.1);color:var(--rose);border-color:var(--rose)}
        .dsa-bulk-clr{padding:5px 9px;border-radius:7px;font-size:11px;cursor:pointer;
            border:1px solid var(--bd);background:transparent;color:var(--lt);font-family:'Sora',sans-serif}

        /* List header */
        .dsa-lhdr{display:flex;justify-content:space-between;align-items:center;
            margin-bottom:7px;font-size:11px;color:var(--lt)}
        .dsa-sel-all{color:var(--blue);font-weight:600;cursor:pointer;border:none;
            background:none;font-family:'Sora',sans-serif;font-size:11px;padding:0}

        /* Employee row */
        .dsa-row{background:var(--card);border:1.5px solid var(--bd);border-radius:11px;
            display:grid;grid-template-columns:18px 33px 1fr auto;align-items:center;
            gap:9px;padding:9px 11px;margin-bottom:6px;cursor:pointer;
            transition:all .18s;position:relative}
        .dsa-row:hover{box-shadow:0 3px 10px rgba(0,0,0,.07);transform:translateY(-1px)}
        .dsa-row.sel{border-color:var(--blue);background:rgba(37,99,235,.03)}
        .dsa-row.has-shift{border-color:rgba(5,150,105,.25)}
        @keyframes rowIn{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:translateY(0)}}
        .dsa-row{animation:rowIn .2s ease both}

        .dsa-chk{width:16px;height:16px;border-radius:4px;border:2px solid var(--bd);
            display:flex;align-items:center;justify-content:center;background:var(--ibg);transition:all .15s}
        .dsa-row.sel .dsa-chk{background:var(--blue);border-color:var(--blue)}
        .dsa-chk-t{display:none;color:#fff;font-size:9px;font-weight:900}
        .dsa-row.sel .dsa-chk-t{display:block}

        .dsa-av{width:33px;height:33px;border-radius:8px;display:flex;align-items:center;
            justify-content:center;font-size:11px;font-weight:800;color:#fff;flex-shrink:0}

        .dsa-info{min-width:0}
        .dsa-name{font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--tx)}
        .dsa-meta{font-size:10px;color:var(--lt);font-family:'JetBrains Mono',monospace;margin-top:1px}

        /* Right: shift badge + picker */
        .dsa-right{position:relative;display:flex;align-items:center;gap:5px}
        .dsa-no-badge{font-size:10px;color:var(--lt);background:var(--ibg);border:1px dashed var(--bd);
            border-radius:6px;padding:3px 10px;cursor:pointer;white-space:nowrap;transition:all .15s}
        .dsa-no-badge:hover{border-color:var(--blue);color:var(--blue)}
        .dsa-badge{border-radius:8px;padding:5px 11px;border:1.5px solid transparent;
            cursor:pointer;transition:all .18s;white-space:nowrap;display:flex;flex-direction:column;align-items:flex-end}
        .dsa-badge:hover{transform:scale(1.03)}
        .dsa-badge .bn{font-size:11px;font-weight:800;display:flex;align-items:center;gap:3px}
        .dsa-badge .bt{font-size:10px;font-family:'JetBrains Mono',monospace;opacity:.8;margin-top:1px}
        .dsa-arr{padding:4px 7px;border-radius:6px;border:1px solid var(--bd);background:var(--ibg);
            cursor:pointer;font-size:11px;color:var(--mu);transition:all .15s}
        .dsa-arr:hover{border-color:var(--blue);color:var(--blue)}

        /* Dropdown picker */
        .dsa-picker{display:none;position:absolute;right:0;top:calc(100% + 5px);
            background:var(--card);border:1px solid var(--bd);border-radius:11px;
            padding:5px;z-index:9999;box-shadow:0 6px 20px rgba(0,0,0,.13);min-width:210px}
        .dsa-picker.open{display:block}
        .dsa-picker-ttl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;
            color:var(--lt);padding:4px 8px 5px;display:block}
        .dsa-popt{display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:8px;
            cursor:pointer;border:none;width:100%;text-align:left;font-family:'Sora',sans-serif;
            background:transparent;transition:background .12s;margin-bottom:2px}
        .dsa-popt:hover{background:var(--hov)}
        .dsa-popt-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
        .dsa-popt-n{font-size:12px;font-weight:700;color:var(--tx);display:block}
        .dsa-popt-t{font-size:10px;color:var(--lt);font-family:'JetBrains Mono',monospace}
        .dsa-pdiv{height:1px;background:var(--bd);margin:4px 0}
        .dsa-prm{display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:8px;
            cursor:pointer;border:none;width:100%;text-align:left;font-family:'Sora',sans-serif;
            background:transparent;color:var(--rose);font-size:11px;font-weight:600;transition:background .12s}
        .dsa-prm:hover{background:rgba(225,29,72,.06)}

        /* Save bar */
        .dsa-savebar{position:fixed;bottom:0;left:0;right:0;background:var(--card);
            border-top:1px solid var(--bd);padding:11px 16px;display:none;
            align-items:center;justify-content:space-between;gap:10px;
            z-index:1000;box-shadow:0 -4px 18px rgba(0,0,0,.07)}
        .dsa-savebar.show{display:flex}
        .dsa-save-info{font-size:12px;font-weight:600;color:var(--mu)}
        .dsa-save-btns{display:flex;gap:7px}
        .btn-discard{padding:8px 15px;border-radius:8px;border:1px solid var(--bd);background:var(--ibg);
            color:var(--mu);font-family:'Sora',sans-serif;font-size:12px;font-weight:600;
            cursor:pointer;transition:all .18s}
        .btn-discard:hover{background:var(--rose);color:#fff;border-color:var(--rose)}
        .btn-save{padding:8px 20px;border-radius:8px;border:none;background:var(--blue);color:#fff;
            font-family:'Sora',sans-serif;font-size:12px;font-weight:700;cursor:pointer;
            transition:all .18s;display:flex;align-items:center;gap:5px}
        .btn-save:hover{background:#1d4ed8;transform:translateY(-1px)}
        .btn-save:disabled{opacity:.55;cursor:not-allowed;transform:none}

        /* Progress bar during save */
        .dsa-progress{position:fixed;top:0;left:0;height:3px;background:var(--blue);
            transition:width .3s ease;z-index:9999;display:none}
        .dsa-progress.show{display:block}

        /* Toast */
        .dsa-toast{position:fixed;bottom:72px;left:50%;transform:translateX(-50%);
            background:#0f172a;color:#fff;padding:8px 16px;border-radius:9px;font-size:12px;
            font-weight:600;opacity:0;transition:opacity .25s;z-index:9999;white-space:nowrap;pointer-events:none}
        .dsa-toast.show{opacity:1}

        .dsa-empty{text-align:center;padding:40px;color:var(--lt);font-size:13px}
        .dsa-loading{text-align:center;padding:30px;color:var(--mu);font-size:12px}
    `).appendTo('head');

    // ── Config ────────────────────────────────────────────────────────────────
    const SHIFTS = [
        { name:'Target-Shift(6am-2.30pm)', label:'6:00 AM – 2:30 PM', short:'6am–2:30', icon:'🌅', color:'#d97706', bg:'rgba(217,119,6,.1)',  bd:'rgba(217,119,6,.3)'  },
        { name:'Target-Shift(8am-3pm)',    label:'8:00 AM – 3:00 PM', short:'8am–3:00', icon:'☀️',  color:'#2563eb', bg:'rgba(37,99,235,.1)',  bd:'rgba(37,99,235,.3)'  },
        { name:'Target-Shift(6am-3pm)',    label:'6:00 AM – 3:00 PM', short:'6am–3:00', icon:'🌿', color:'#059669', bg:'rgba(5,150,105,.1)',  bd:'rgba(5,150,105,.3)'  },
    ];
    const SMAP     = {};  SHIFTS.forEach(s => SMAP[s.name] = s);
    const AVC      = ['#2563eb','#059669','#d97706','#7c3aed','#0891b2','#e11d48','#0d9488','#ea580c'];
    const COMPANY  = 'CHAN RICH FRUITS (PVT) LTD';
    const DEPT     = 'Day Team - CHAN RICH';

    // ── State ─────────────────────────────────────────────────────────────────
    let selDate      = frappe.datetime.get_today();
    let employees    = [];
    let assignments  = {};   // { empId: shiftName } — today only
    let savedState   = {};
    let selEmps      = new Set();
    let filterMode   = 'all';
    let searchQ      = '';
    let isDirty      = false;
    let openPicker   = null;

    // ── HTML ──────────────────────────────────────────────────────────────────
    $(wrapper).find('.page-content').html(`
    <div class="dsa">
        <div class="dsa-topbar">
            <div class="dsa-left">
                <div class="dsa-date-pill">
                    📅 <input type="date" id="dsa-date" value="${selDate}">
                </div>
                <span class="dsa-daytag workday" id="dsa-daytag">—</span>
            </div>
            <div class="dsa-stats">
                <div class="dsa-stat">
                    <div class="sv" id="st-t" style="color:var(--blue)">—</div>
                    <div class="sl">Total</div>
                </div>
                <div class="dsa-stat">
                    <div class="sv" id="st-a" style="color:var(--green)">—</div>
                    <div class="sl">Assigned</div>
                </div>
                <div class="dsa-stat">
                    <div class="sv" id="st-p" style="color:var(--amber)">—</div>
                    <div class="sl">Pending</div>
                </div>
            </div>
        </div>

        <!-- Shift summary cards -->
        <div class="dsa-shift-row" id="dsa-scards"></div>

        <!-- Toolbar -->
        <div class="dsa-toolbar">
            <div class="dsa-search-wrap">
                <span class="dsa-search-icon">🔍</span>
                <input type="text" id="dsa-search" placeholder="Search employees...">
            </div>
            <button class="dsa-fbtn on" data-f="all"        onclick="dsaFilt('all')">All</button>
            <button class="dsa-fbtn"    data-f="assigned"   onclick="dsaFilt('assigned')">Assigned</button>
            <button class="dsa-fbtn"    data-f="unassigned" onclick="dsaFilt('unassigned')">Unassigned</button>
        </div>

        <!-- Bulk bar -->
        <div class="dsa-bulk" id="dsa-bulk">
            <span class="dsa-bulk-lbl" id="dsa-blbl">0 selected</span>
            <div class="dsa-bulk-btns" id="dsa-bbtns"></div>
            <button class="dsa-bulk-rm" onclick="dsaBulk(null)">✕ Remove shift</button>
            <button class="dsa-bulk-clr" onclick="dsaClearSel()">Clear</button>
        </div>

        <!-- List -->
        <div id="dsa-wrap"><div class="dsa-loading">Loading day team...</div></div>
    </div>

    <!-- Progress bar -->
    <div class="dsa-progress" id="dsa-prog"></div>

    <!-- Save bar -->
    <div class="dsa-savebar" id="dsa-savebar">
        <span class="dsa-save-info" id="dsa-sinfo">Changes pending</span>
        <div class="dsa-save-btns">
            <button class="btn-discard" onclick="dsaDiscard()">Discard</button>
            <button class="btn-save" id="dsa-savebtn" onclick="dsaSave()">💾 Save Assignments</button>
        </div>
    </div>
    <div class="dsa-toast" id="dsa-toast"></div>
    `);

    // ── Build shift summary cards ──────────────────────────────────────────────
    const scEl = document.getElementById('dsa-scards');
    SHIFTS.forEach(s => {
        const d = document.createElement('div');
        d.className = 'dsa-scard';
        d.id = 'sc-' + s.name;
        d.style.cssText = `background:${s.bg};border-color:${s.bd};color:${s.color}`;
        d.innerHTML = `
            <div class="dsa-scard-top">
                <span class="dsa-scard-name">${s.icon} ${s.short}</span>
                <span class="dsa-scard-count" id="scc-${s.name}">0</span>
            </div>
            <div class="dsa-scard-time">${s.label}</div>
            <div class="dsa-scard-hint">Tap to bulk assign selected ↑</div>`;
        d.onclick = () => dsaBulk(s.name);
        scEl.appendChild(d);
    });

    // ── Build bulk buttons ────────────────────────────────────────────────────
    const bbEl = document.getElementById('dsa-bbtns');
    SHIFTS.forEach(s => {
        const b = document.createElement('button');
        b.className = 'dsa-bulk-btn';
        b.style.cssText = `background:${s.bg};color:${s.color}`;
        b.textContent = s.icon + ' ' + s.short;
        b.onclick = () => dsaBulk(s.name);
        bbEl.appendChild(b);
    });

    // ── Load employees ────────────────────────────────────────────────────────
    function loadEmployees() {
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Employee',
                filters: { status: 'Active', department: DEPT },
                fields: ['name','employee_name','designation'],
                limit_page_length: 300,
                order_by: 'employee_name asc'
            },
            callback: r => {
                employees = r.message || [];
                loadShifts();
            }
        });
    }

    // ── Load today's shift assignments ────────────────────────────────────────
    // Only load single-day assignments (start=end=selDate) created by this page
    function loadShifts() {
        const wrap = document.getElementById('dsa-wrap');
        if (wrap) wrap.innerHTML = `<div class="dsa-loading">Loading shifts for ${selDate}...</div>`;

        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Shift Assignment',
                filters: [
                    ['start_date', '=', selDate],
                    ['end_date',   '=', selDate],
                    ['docstatus',  '=', 1]
                ],
                fields: ['name','employee','shift_type'],
                limit_page_length: 500
            },
            callback: r => {
                assignments = {}; savedState = {};
                const valid = new Set(SHIFTS.map(s => s.name));
                (r.message || []).forEach(a => {
                    if (valid.has(a.shift_type)) {
                        assignments[a.employee] = a.shift_type;
                        savedState[a.employee]  = a.shift_type;
                    }
                });
                isDirty = false;
                render(); updateStats(); updateCounts(); updateDayTag(); hideSaveBar();
            }
        });
    }

    // ── Render list ───────────────────────────────────────────────────────────
    function render() {
        const wrap = document.getElementById('dsa-wrap');
        if (!wrap) return;

        const q    = searchQ.toLowerCase();
        const list = employees.filter(e => {
            if (q && !e.employee_name.toLowerCase().includes(q) && !e.name.toLowerCase().includes(q)) return false;
            if (filterMode === 'assigned'   && !assignments[e.name]) return false;
            if (filterMode === 'unassigned' &&  assignments[e.name]) return false;
            return true;
        });

        if (!list.length) {
            wrap.innerHTML = '<div class="dsa-empty">No employees found</div>';
            return;
        }

        wrap.innerHTML = `
            <div class="dsa-lhdr">
                <span>${list.length} employee${list.length !== 1 ? 's' : ''}</span>
                <button class="dsa-sel-all" onclick="dsaSelAll()">Select All</button>
            </div>
            <div id="dsa-list"></div>`;

        const listEl = document.getElementById('dsa-list');
        list.forEach((emp, i) => {
            const av  = emp.employee_name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
            const clr = AVC[i % AVC.length];
            const asgn = assignments[emp.name];
            const shift = asgn ? SMAP[asgn] : null;
            const isSel = selEmps.has(emp.name);

            const row = document.createElement('div');
            row.className = `dsa-row${isSel?' sel':''}${asgn?' has-shift':''}`;
            row.id = 'dr-' + emp.name;
            row.style.animationDelay = (i * 0.012) + 's';
            row.innerHTML = `
                <div class="dsa-chk"><span class="dsa-chk-t">✓</span></div>
                <div class="dsa-av" style="background:${clr}">${av}</div>
                <div class="dsa-info">
                    <div class="dsa-name">${emp.employee_name}</div>
                    <div class="dsa-meta">${emp.name}</div>
                </div>
                <div class="dsa-right" id="rr-${emp.name}">
                    ${buildRight(emp.name, shift)}
                </div>`;

            row.addEventListener('click', e => {
                if (e.target.closest('.dsa-right')) return;
                dsaToggle(emp.name);
            });
            listEl.appendChild(row);
        });
    }

    function buildRight(empId, shift) {
        const opts = SHIFTS.map(s => `
            <button class="dsa-popt" onclick="event.stopPropagation();dsaAssign('${empId}','${s.name}');closeP()">
                <span class="dsa-popt-dot" style="background:${s.color}"></span>
                <span>
                    <span class="dsa-popt-n">${s.icon} ${s.short}</span>
                    <span class="dsa-popt-t">${s.label}</span>
                </span>
            </button>`).join('');

        const rmBtn = shift ? `
            <div class="dsa-pdiv"></div>
            <button class="dsa-prm" onclick="event.stopPropagation();dsaAssign('${empId}',null);closeP()">
                ✕ Remove shift
            </button>` : '';

        const picker = `
            <div class="dsa-picker" id="pk-${empId}">
                <span class="dsa-picker-ttl">Assign shift for ${selDate}</span>
                ${opts}${rmBtn}
            </div>`;

        if (shift) {
            return `
                <div class="dsa-badge"
                    style="background:${shift.bg};border-color:${shift.bd};color:${shift.color}"
                    onclick="event.stopPropagation();toggleP('${empId}')">
                    <span class="bn">${shift.icon} ${shift.short}</span>
                    <span class="bt">${shift.label}</span>
                </div>
                <button class="dsa-arr" onclick="event.stopPropagation();toggleP('${empId}')">⌄</button>
                ${picker}`;
        }
        return `
            <span class="dsa-no-badge" onclick="event.stopPropagation();toggleP('${empId}')">
                + Assign shift
            </span>
            ${picker}`;
    }

    function refreshRight(empId) {
        const el    = document.getElementById('rr-' + empId);
        const row   = document.getElementById('dr-' + empId);
        const shift = assignments[empId] ? SMAP[assignments[empId]] : null;
        if (el)  el.innerHTML = buildRight(empId, shift);
        if (row) {
            row.classList.toggle('has-shift', !!assignments[empId]);
        }
    }

    // ── Picker ────────────────────────────────────────────────────────────────
    window.toggleP = function(empId) {
        const pk = document.getElementById('pk-' + empId);
        if (!pk) return;
        if (openPicker && openPicker !== pk) openPicker.classList.remove('open');
        pk.classList.toggle('open');
        openPicker = pk.classList.contains('open') ? pk : null;
    };
    window.closeP = function() {
        if (openPicker) { openPicker.classList.remove('open'); openPicker = null; }
    };
    // Close picker when clicking outside
    document.addEventListener('click', e => {
        if (!e.target.closest('.dsa-right') && !e.target.closest('.dsa-picker')) closeP();
    });

    // ── Assign one employee ───────────────────────────────────────────────────
    window.dsaAssign = function(empId, shiftName) {
        if (shiftName) assignments[empId] = shiftName;
        else           delete assignments[empId];
        isDirty = true;
        refreshRight(empId);
        updateStats(); updateCounts(); showSaveBar();
    };

    // ── Bulk assign selected ──────────────────────────────────────────────────
    window.dsaBulk = function(shiftName) {
        if (!selEmps.size) { toast('Select employees first — click on their row'); return; }
        const cnt = selEmps.size;
        selEmps.forEach(id => {
            if (shiftName) assignments[id] = shiftName;
            else           delete assignments[id];
            refreshRight(id);
        });
        isDirty = true;
        updateStats(); updateCounts(); showSaveBar();
        const msg = shiftName
            ? `${SMAP[shiftName].icon} Assigned ${SMAP[shiftName].short} to ${cnt} employee${cnt!==1?'s':''}`
            : `Removed shift from ${cnt} employee${cnt!==1?'s':''}`;
        toast(msg);
        dsaClearSel();
    };

    // ── Selection ─────────────────────────────────────────────────────────────
    window.dsaToggle = function(empId) {
        if (selEmps.has(empId)) selEmps.delete(empId);
        else selEmps.add(empId);
        const row = document.getElementById('dr-' + empId);
        if (row) row.classList.toggle('sel', selEmps.has(empId));
        updateBulkBar();
    };
    window.dsaSelAll = function() {
        document.querySelectorAll('.dsa-row').forEach(r => {
            const id = r.id.replace('dr-','');
            selEmps.add(id);
            r.classList.add('sel');
        });
        updateBulkBar();
    };
    window.dsaClearSel = function() {
        selEmps.clear();
        document.querySelectorAll('.dsa-row.sel').forEach(r => r.classList.remove('sel'));
        updateBulkBar();
    };
    function updateBulkBar() {
        const bar = document.getElementById('dsa-bulk');
        const lbl = document.getElementById('dsa-blbl');
        if (!bar) return;
        bar.classList.toggle('show', selEmps.size > 0);
        if (lbl) lbl.textContent = `${selEmps.size} employee${selEmps.size!==1?'s':''} selected`;
    }

    // ── Filter & Search ───────────────────────────────────────────────────────
    window.dsaFilt = function(mode) {
        filterMode = mode;
        document.querySelectorAll('.dsa-fbtn').forEach(b =>
            b.classList.toggle('on', b.getAttribute('data-f') === mode));
        render();
    };
    document.getElementById('dsa-search').addEventListener('input', function() {
        searchQ = this.value; render();
    });

    // ── Stats & day tag ───────────────────────────────────────────────────────
    function updateStats() {
        const t = employees.length;
        const a = Object.keys(assignments).length;
        const set = (id, v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
        set('st-t', t); set('st-a', a); set('st-p', t - a);
    }
    function updateCounts() {
        SHIFTS.forEach(s => {
            const cnt = Object.values(assignments).filter(v => v === s.name).length;
            const el  = document.getElementById('scc-' + s.name);
            if (el) el.textContent = cnt;
        });
    }
    function updateDayTag() {
        const el   = document.getElementById('dsa-daytag');
        if (!el) return;
        const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        const d    = new Date(selDate + 'T00:00:00');
        const dow  = d.getDay();
        el.textContent = days[dow];
        el.className   = 'dsa-daytag ' + (dow === 0 ? 'sunday' : 'workday');
    }

    // ── Save bar ──────────────────────────────────────────────────────────────
    function countChanges() {
        return employees.filter(e =>
            (assignments[e.name]||null) !== (savedState[e.name]||null)
        ).length;
    }
    function showSaveBar() {
        const bar  = document.getElementById('dsa-savebar');
        const info = document.getElementById('dsa-sinfo');
        if (bar) bar.classList.add('show');
        const n = countChanges();
        if (info) info.textContent = `${n} change${n!==1?'s':''} pending for ${selDate}`;
    }
    function hideSaveBar() {
        const bar = document.getElementById('dsa-savebar');
        if (bar) bar.classList.remove('show');
    }
    window.dsaDiscard = function() {
        assignments = {...savedState}; isDirty = false;
        render(); updateStats(); updateCounts(); hideSaveBar();
        toast('Changes discarded');
    };

    // ── SAVE — Core function ──────────────────────────────────────────────────
    // Strategy:
    //   1. Find employees whose assignment changed
    //   2. For each: cancel any existing shift assignment on this exact date
    //   3. Create new single-day assignment if a shift was selected
    //   This avoids overlap because we cancel FIRST then create
    window.dsaSave = async function() {
        const btn  = document.getElementById('dsa-savebtn');
        const info = document.getElementById('dsa-sinfo');
        const prog = document.getElementById('dsa-prog');

        const changed = employees.filter(e =>
            (assignments[e.name]||null) !== (savedState[e.name]||null)
        );

        if (!changed.length) { toast('No changes to save'); return; }

        if (btn)  { btn.disabled = true; btn.textContent = '⏳ Saving...'; }
        if (prog) { prog.style.display = 'block'; prog.style.width = '0%'; }

        let ok = 0, err = 0;

        for (let i = 0; i < changed.length; i++) {
            const emp      = changed[i];
            const newShift = assignments[emp.name] || null;

            // Update progress bar
            if (prog) prog.style.width = Math.round(((i+1)/changed.length)*100) + '%';
            if (info) info.textContent = `Saving ${i+1} of ${changed.length}...`;

            try {
                // ── Step 1: Find ALL existing assignments for this employee
                //           that overlap this date (including long-running ones)
                const existing = await frappe.call({
                    method: 'frappe.client.get_list',
                    args: {
                        doctype: 'Shift Assignment',
                        filters: [
                            ['employee',   '=', emp.name],
                            ['start_date', '<=', selDate],
                            ['end_date',   '>=', selDate],
                            ['docstatus',  '=', 1]
                        ],
                        fields: ['name', 'shift_type', 'start_date', 'end_date'],
                        limit_page_length: 20
                    }
                });

                // ── Step 2: Cancel each overlapping assignment
                for (const rec of (existing.message || [])) {
                    try {
                        await frappe.call({
                            method: 'frappe.client.cancel',
                            args: { doctype: 'Shift Assignment', name: rec.name }
                        });
                    } catch(ce) {
                        // Already cancelled or permission issue — continue
                        console.warn('Cancel skipped:', rec.name);
                    }
                }

                // ── Step 3: Create new single-day assignment if shift selected
                if (newShift) {
                    const ins = await frappe.call({
                        method: 'frappe.client.insert',
                        args: {
                            doc: {
                                doctype:    'Shift Assignment',
                                employee:   emp.name,
                                company:    COMPANY,
                                shift_type: newShift,
                                start_date: selDate,
                                end_date:   selDate,
                                docstatus:  0
                            }
                        }
                    });
                    if (ins.message) {
                        await frappe.call({
                            method: 'frappe.client.submit',
                            args: { doc: ins.message }
                        });
                    }
                }
                ok++;
            } catch(e) {
                console.error('Error saving shift for', emp.employee_name, e);
                err++;
            }
        }

        // ── Wrap up
        savedState = {...assignments}; isDirty = false;

        if (btn)  { btn.disabled = false; btn.textContent = '💾 Save Assignments'; }
        if (prog) { prog.style.width = '100%'; setTimeout(() => { prog.style.display='none'; prog.style.width='0%'; }, 600); }

        hideSaveBar();
        render();
        updateStats();
        updateCounts();

        if (err > 0) {
            frappe.show_alert({ message: `Saved ${ok}, ${err} failed — check console`, indicator: 'orange' });
        } else {
            frappe.show_alert({ message: `✓ ${ok} shift assignment${ok!==1?'s':''} saved for ${selDate}`, indicator: 'green' });
            toast(`✓ ${ok} shifts saved for ${selDate}`);
        }
    };

    // ── Toast ─────────────────────────────────────────────────────────────────
    function toast(msg) {
        const t = document.getElementById('dsa-toast');
        if (!t) return;
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 2500);
    }

    // ── Date change ───────────────────────────────────────────────────────────
    document.getElementById('dsa-date').addEventListener('change', function() {
        if (isDirty && !confirm('You have unsaved changes.\nDiscard and change date?')) {
            this.value = selDate; return;
        }
        selDate = this.value;
        selEmps.clear();
        closeP();
        loadShifts();
    });

    // ── Init ──────────────────────────────────────────────────────────────────
    loadEmployees();
};
