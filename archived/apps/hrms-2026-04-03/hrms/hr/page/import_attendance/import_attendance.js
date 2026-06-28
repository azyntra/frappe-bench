frappe.pages['import-attendance'].on_page_load = function(wrapper) {
    frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Import Attendance',
        single_column: true
    });

    if (!document.getElementById('att-font')) {
        const lnk = document.createElement('link');
        lnk.id = 'att-font'; lnk.rel = 'stylesheet';
        lnk.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap';
        document.head.appendChild(lnk);
    }

    $('#att-styles').remove();
    $('<style id="att-styles">').text(`
        .att-root {
            --ab: #1a56db; --ag: #0e9f6e; --aa: #d97706; --ar: #e02424;
            --ab8: rgba(26,86,219,0.08);  --ag8: rgba(14,159,110,0.08);
            --aa8: rgba(217,119,6,0.08);  --ar8: rgba(224,36,36,0.08);
            --bg:   var(--bg-color,#f4f6f9);
            --card: var(--card-bg,#fff);
            --bd:   var(--border-color,#e2e8f0);
            --tx:   var(--text-color,#1c2b3a);
            --mu:   var(--text-muted,#6b7c93);
            --lt:   var(--text-light,#9ba8b7);
            --ibg:  var(--control-bg,#f8fafc);
            --hov:  var(--fg-hover-color,#f0f4f8);
        }
        .att-root*{box-sizing:border-box}
        .att-root{font-family:'DM Sans',sans-serif;background:var(--bg);min-height:100vh;padding:24px 28px 60px;color:var(--tx)}

        /* Header */
        .ah{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;animation:afd .4s ease both}
        .ahl{display:flex;align-items:center;gap:13px}
        .ai{width:44px;height:44px;background:linear-gradient(135deg,var(--ab),var(--ag));border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:19px;box-shadow:0 4px 12px rgba(26,86,219,.22);flex-shrink:0}
        .ah h1{font-size:19px;font-weight:700;margin:0;color:var(--tx);letter-spacing:-.3px}
        .ah p{font-size:12px;color:var(--mu);margin:2px 0 0}

        /* New Import Btn */
        #att-new-btn{display:none;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;background:var(--ibg);border:1px solid var(--bd);color:var(--tx);font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s}
        #att-new-btn:hover{background:var(--hov);border-color:var(--ab);color:var(--ab)}
        #att-new-btn.vis{display:flex}

        /* Steps */
        .as{display:flex;align-items:center;margin-bottom:18px;animation:afd .4s .07s ease both}
        .asp{display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:99px;font-size:12px;font-weight:500;color:var(--lt);background:transparent;transition:all .3s;white-space:nowrap}
        .asp.active{background:var(--card);color:var(--ab);font-weight:600;box-shadow:0 2px 8px rgba(26,86,219,.1)}
        .asp.done{color:var(--ag)}
        .asn{width:19px;height:19px;border-radius:50%;background:var(--lt);color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0}
        .asp.active .asn{background:var(--ab)}
        .asp.done   .asn{background:var(--ag)}
        .asl{flex:1;max-width:36px;height:2px;background:var(--bd);border-radius:2px}

        /* Grid */
        .ag2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;animation:afu .4s .13s ease both}

        /* Card */
        .ac{background:var(--card);border-radius:13px;padding:20px;border:1px solid var(--bd);box-shadow:0 1px 3px rgba(0,0,0,.04)}
        .act{font-size:10px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;color:var(--lt);margin-bottom:13px;display:flex;align-items:center;gap:7px}
        .act::after{content:'';flex:1;height:1px;background:var(--bd)}

        /* Drop Zone */
        .adz{border:2px dashed var(--bd);border-radius:10px;padding:30px 20px;text-align:center;cursor:pointer;transition:all .22s;background:var(--ibg);user-select:none}
        .adz:hover:not(.adz-off),.adz.over{border-color:var(--ab);background:var(--ab8);transform:scale(1.007)}
        .adz.adz-off{opacity:.4;cursor:not-allowed;pointer-events:none}
        .adz-ico{font-size:32px;margin-bottom:7px;display:block}
        .adz h3{font-size:14px;font-weight:600;margin:0 0 4px;color:var(--tx)}
        .adz p{font-size:12px;color:var(--mu);margin:0}
        .adz-btn{margin-top:11px;display:inline-flex;align-items:center;gap:5px;background:var(--ab);color:#fff;padding:7px 17px;border-radius:7px;font-size:13px;font-weight:600}
        #att-fi{display:none}

        /* File badge */
        .afb{display:none;align-items:center;gap:9px;padding:11px 13px;margin-top:11px;background:var(--ag8);border:1px solid rgba(14,159,110,.2);border-radius:8px}
        .afb.vis{display:flex}
        .afb-ic{font-size:20px}
        .afb-n{font-size:13px;font-weight:600;color:var(--ag)}
        .afb-m{font-size:11px;color:var(--mu)}

        /* Alerts */
        .aal{border-radius:8px;padding:10px 12px;font-size:13px;display:none;margin-top:10px}
        .aal.vis{display:block}
        .aal.warn{background:var(--aa8);border:1px solid rgba(217,119,6,.22);color:var(--aa)}
        .aal.succ{background:var(--ag8);border:1px solid rgba(14,159,110,.22);color:var(--ag)}
        .aal.err {background:var(--ar8);border:1px solid rgba(224,36,36,.22); color:var(--ar)}
        .aal strong{display:block;margin-bottom:2px}
        .apl{display:flex;flex-wrap:wrap;gap:3px;margin-top:6px}
        .ap{background:rgba(217,119,6,.1);border-radius:5px;padding:2px 7px;font-size:11px;font-weight:600;font-family:'DM Mono',monospace;color:var(--aa)}

        /* Stats */
        .asr{display:flex;flex-direction:column;gap:11px}
        .arow{display:grid;grid-template-columns:1fr 1fr;gap:9px}
        .atile{background:var(--ibg);border:1px solid var(--bd);border-radius:10px;padding:13px;text-align:center;transition:all .3s}
        .atile.hl{background:var(--ab8);border-color:rgba(26,86,219,.16)}
        .anum{font-size:28px;font-weight:700;color:var(--ab);font-family:'DM Mono',monospace;line-height:1;transition:all .25s}
        .anum.g{color:var(--ag)} .anum.a{color:var(--aa)} .anum.r{color:var(--ar)}
        .albl{font-size:11px;color:var(--mu);margin-top:3px;font-weight:500}

        /* Progress */
        .apw{display:none}
        .apw.vis{display:block}
        .apt{background:var(--bd);border-radius:99px;height:7px;overflow:hidden}
        .apf{height:7px;background:linear-gradient(90deg,var(--ab),var(--ag));border-radius:99px;width:0%;transition:width .35s ease}
        .apm{display:flex;justify-content:space-between;font-size:11px;color:var(--mu);margin-top:4px}

        /* Import Button */
        .aib{width:100%;padding:12px;background:linear-gradient(135deg,var(--ab),var(--ag));color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;transition:all .22s;font-family:'DM Sans',sans-serif;box-shadow:0 4px 12px rgba(26,86,219,.2);display:flex;align-items:center;justify-content:center;gap:7px}
        .aib:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 6px 16px rgba(26,86,219,.3)}
        .aib:disabled{opacity:.35;cursor:not-allowed;transform:none;box-shadow:none}
        .aib.done{background:linear-gradient(135deg,var(--ag),#057a55)}

        /* Log */
        .alog{background:var(--ibg);border:1px solid var(--bd);border-radius:9px;padding:11px;max-height:160px;overflow-y:auto;font-family:'DM Mono',monospace;font-size:11px;line-height:1.75;display:none;margin-top:10px}
        .alog.vis{display:block}
        .lok{color:var(--ag)} .ler{color:var(--ar)} .ldup{color:var(--aa)}
        .alog::-webkit-scrollbar{width:3px}
        .alog::-webkit-scrollbar-thumb{background:var(--bd);border-radius:3px}

        /* Preview */
        .aprev{display:none;animation:afu .4s .18s ease both}
        .aprev.vis{display:block}
        .aprevh{display:flex;align-items:center;justify-content:space-between;margin-bottom:11px}
        .aprevh h2{font-size:14px;font-weight:700;margin:0;color:var(--tx)}
        .asrch{padding:7px 12px;border:1px solid var(--bd);border-radius:7px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;width:190px;background:var(--ibg);color:var(--tx);transition:border-color .2s}
        .asrch:focus{border-color:var(--ab)}
        .asrch::placeholder{color:var(--lt)}

        /* Tabs */
        .atabs{display:flex;gap:5px;margin-bottom:10px}
        .atab{padding:5px 13px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid var(--bd);background:var(--ibg);color:var(--mu);transition:all .18s}
        .atab.on{background:var(--ab);border-color:var(--ab);color:#fff}

        /* Table */
        .atw{border-radius:11px;overflow:hidden;border:1px solid var(--bd)}
        .atbl{width:100%;border-collapse:collapse;font-size:13px}
        .atbl thead tr{background:var(--ibg)}
        .atbl th{padding:9px 13px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:var(--mu);border-bottom:1px solid var(--bd)}
        .atbl td{padding:9px 13px;border-bottom:1px solid var(--bd);vertical-align:middle;background:var(--card);color:var(--tx)}
        .atbl tr:last-child td{border-bottom:none}
        .atbl tr:hover td{background:var(--hov)}
        .atbl tr.hide{display:none}

        /* Badges */
        .bm{display:inline-flex;align-items:center;gap:3px;background:var(--ag8);color:var(--ag);padding:2px 9px;border-radius:99px;font-size:11px;font-weight:700}
        .bu{display:inline-flex;align-items:center;gap:3px;background:var(--aa8);color:var(--aa);padding:2px 9px;border-radius:99px;font-size:11px;font-weight:700}
        .eid{font-family:'DM Mono',monospace;font-size:11px;background:var(--ab8);color:var(--ab);padding:2px 7px;border-radius:5px;font-weight:500;margin-right:5px}
        .fid{font-family:'DM Mono',monospace;font-weight:600;color:var(--ab)}
        .fid.u{color:var(--aa)}

        @keyframes afd{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes afu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes apop{from{transform:translateY(5px);opacity:0}to{transform:translateY(0);opacity:1}}
        .pop{animation:apop .25s ease both}
    `).appendTo('head');

    $(wrapper).find('.page-content').html(`
    <div class="att-root">
        <div class="ah">
            <div class="ahl">
                <div class="ai">🖐</div>
                <div>
                    <h1>Import Attendance</h1>
                    <p>Upload fingerprint CSV — employees are matched automatically</p>
                </div>
            </div>
            <button id="att-new-btn">🔄 New Import</button>
        </div>

        <div class="as">
            <div class="asp active" id="sp1"><div class="asn">1</div>Upload CSV</div>
            <div class="asl"></div>
            <div class="asp" id="sp2"><div class="asn">2</div>Review</div>
            <div class="asl"></div>
            <div class="asp" id="sp3"><div class="asn">3</div>Import</div>
            <div class="asl"></div>
            <div class="asp" id="sp4"><div class="asn">4</div>Done</div>
        </div>

        <div class="ag2">
            <!-- LEFT -->
            <div class="ac">
                <div class="act">📂 Upload File</div>
                <div class="adz" id="att-dz">
                    <span class="adz-ico">🗂️</span>
                    <h3>Drop your CSV here</h3>
                    <p>Fingerprint machine export (.csv)</p>
                    <div class="adz-btn">📁 Browse File</div>
                    <input type="file" id="att-fi" accept=".csv">
                </div>
                <div class="afb" id="att-fb">
                    <span class="afb-ic">✅</span>
                    <div>
                        <div class="afb-n" id="att-fn">—</div>
                        <div class="afb-m" id="att-fm">—</div>
                    </div>
                </div>
                <div class="aal warn" id="att-warn">
                    <strong>⚠️ Employees without Fingerprint ID</strong>
                    Open Employee record → set <b>Fingerprint ID</b> field → re-upload.
                    <div class="apl" id="att-wp"></div>
                </div>
            </div>

            <!-- RIGHT -->
            <div class="ac">
                <div class="act">📊 Import Status</div>
                <div class="asr">
                    <div class="arow">
                        <div class="atile hl"><div class="anum" id="sC">—</div><div class="albl">Checkin Records</div></div>
                        <div class="atile">   <div class="anum" id="sE">—</div><div class="albl">Employees in CSV</div></div>
                    </div>
                    <div class="arow">
                        <div class="atile"><div class="anum g" id="sM">—</div><div class="albl">Auto-Matched</div></div>
                        <div class="atile"><div class="anum a" id="sS">—</div><div class="albl">Skipped (No FP ID)</div></div>
                    </div>
                    <div class="apw" id="att-pw">
                        <div class="apt"><div class="apf" id="att-pf"></div></div>
                        <div class="apm"><span id="att-pl">Preparing...</span><span id="att-pp">0%</span></div>
                    </div>
                    <div class="aal succ" id="att-succ">
                        <strong>✅ Import Complete!</strong>
                        <span id="att-sm"></span>
                    </div>
                    <div class="aal err" id="att-err">
                        <strong>⚠️ Some records had errors</strong>
                        <span id="att-em"></span>
                        <div style="margin-top:5px;font-size:12px;">Likely <b>duplicate records</b> already imported previously.</div>
                    </div>
                    <button class="aib" id="att-ib" disabled>
                        <span id="att-bico">🚀</span><span id="att-blbl">Start Import</span>
                    </button>
                    <div class="alog" id="att-log"></div>
                </div>
            </div>
        </div>

        <!-- Bottom Preview -->
        <div class="aprev" id="att-prev">
            <div class="ac">
                <div class="aprevh">
                    <h2>👥 Employee Mapping Preview</h2>
                    <input class="asrch" id="att-srch" placeholder="🔍 Search name or ID...">
                </div>
                <div class="atabs">
                    <div class="atab on"  id="tab-all"     data-tab="all">All</div>
                    <div class="atab"     id="tab-matched" data-tab="matched">✓ Matched</div>
                    <div class="atab"     id="tab-unmapped" data-tab="unmapped">⚠ Not Mapped</div>
                </div>
                <div class="atw">
                    <table class="atbl">
                        <thead><tr>
                            <th>FP ID</th><th>Device Name</th><th>Punches</th>
                            <th>ERPNext Employee</th><th>Days</th><th>Status</th>
                        </tr></thead>
                        <tbody id="att-tb"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    `);

    // ── State ─────────────────────────────────────────────────
    let empInfo   = {};
    let empMap    = {};
    let checkins  = [];
    let curTab    = 'all';
    let curSearch = '';
    let importing = false;

    // ── Helpers ───────────────────────────────────────────────
    function setNum(id, val, cls) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = val;
        el.className   = 'anum pop' + (cls ? ' ' + cls : '');
        setTimeout(() => el.classList.remove('pop'), 300);
    }

    function setStep(n) {
        [1,2,3,4].forEach(i => {
            const el = document.getElementById('sp' + i);
            if (!el) return;
            el.className = 'asp' + (i === n ? ' active' : i < n ? ' done' : '');
            el.querySelector('.asn').textContent = i < n ? '✓' : i;
        });
    }

    function vis(id, show) {
        const el = document.getElementById(id);
        if (!el) return;
        show ? el.classList.add('vis') : el.classList.remove('vis');
    }

    function addLog(cls, msg) {
        const log  = document.getElementById('att-log');
        const line = document.createElement('div');
        line.className   = cls;
        line.textContent = msg;
        log.appendChild(line);
        log.scrollTop = log.scrollHeight;
    }

    function applyFilter() {
        const q = curSearch.toLowerCase();
        document.querySelectorAll('#att-tb tr').forEach(tr => {
            const s   = (tr.dataset.search || '').toLowerCase();
            const t   = tr.dataset.type || '';
            const tok = curTab === 'all' || t === curTab;
            const sok = !q || s.includes(q);
            tr.classList.toggle('hide', !(tok && sok));
        });
    }

    // ── Tab clicks ────────────────────────────────────────────
    document.querySelectorAll('.atab').forEach(tab => {
        tab.addEventListener('click', function() {
            curTab = this.dataset.tab;
            document.querySelectorAll('.atab').forEach(t => t.classList.remove('on'));
            this.classList.add('on');
            applyFilter();
        });
    });

    // ── Search ────────────────────────────────────────────────
    document.getElementById('att-srch').addEventListener('input', function() {
        curSearch = this.value;
        applyFilter();
    });

    // ── Reset / New Import ────────────────────────────────────
    function resetPage() {
        if (importing) return; // safety: don't reset during import

        empInfo  = {}; empMap = {}; checkins = [];
        curTab = 'all'; curSearch = '';

        // Re-enable drop zone
        const dz = document.getElementById('att-dz');
        dz.classList.remove('adz-off');

        // Reset file input (clone to remove all listeners issue)
        const oldFi = document.getElementById('att-fi');
        const newFi = oldFi.cloneNode(true);
        oldFi.parentNode.replaceChild(newFi, oldFi);
        newFi.addEventListener('change', e => handleFile(e.target.files[0]));

        // Hide / clear elements
        vis('att-fb',   false);
        vis('att-warn', false);
        vis('att-succ', false);
        vis('att-pw',   false);
        vis('att-log',  false);
        vis('att-prev', false);
        document.getElementById('att-log').innerHTML = '';
        document.getElementById('att-wp').innerHTML  = '';
        document.getElementById('att-fn').textContent = '—';
        document.getElementById('att-fm').textContent = '—';
        document.getElementById('att-tb').innerHTML  = '';
        document.getElementById('att-srch').value    = '';
        document.getElementById('att-err').classList.remove('vis');
        document.getElementById('att-pf').style.width = '0%';

        // Reset button
        const btn = document.getElementById('att-ib');
        btn.disabled = true;
        btn.classList.remove('done');
        document.getElementById('att-bico').textContent = '🚀';
        document.getElementById('att-blbl').textContent = 'Start Import';

        // Reset stats
        setNum('sC','—'); setNum('sE','—'); setNum('sM','—'); setNum('sS','—');

        // Reset tabs
        document.querySelectorAll('.atab').forEach(t => t.classList.remove('on'));
        document.getElementById('tab-all').classList.add('on');

        // Hide new import button
        document.getElementById('att-new-btn').classList.remove('vis');

        setStep(1);
    }

    document.getElementById('att-new-btn').addEventListener('click', resetPage);

    // ── Drop Zone Events ──────────────────────────────────────
    const dz = document.getElementById('att-dz');
    dz.addEventListener('click', function() {
        if (importing) return;
        document.getElementById('att-fi').click();
    });
    dz.addEventListener('dragover',  e => { if (!importing) { e.preventDefault(); dz.classList.add('over'); }});
    dz.addEventListener('dragleave', () => dz.classList.remove('over'));
    dz.addEventListener('drop', e => {
        e.preventDefault(); dz.classList.remove('over');
        if (!importing) handleFile(e.dataTransfer.files[0]);
    });
    document.getElementById('att-fi').addEventListener('change', e => handleFile(e.target.files[0]));

    // ── File Handler ──────────────────────────────────────────
    function handleFile(file) {
        if (!file || !file.name.endsWith('.csv')) {
            frappe.msgprint('Please upload a valid .csv file.'); return;
        }
        // Reset previous results but keep drop zone active
        document.getElementById('att-err').classList.remove('vis');
        vis('att-succ', false);
        vis('att-pw',   false);
        vis('att-log',  false);
        document.getElementById('att-log').innerHTML = '';
        const btn = document.getElementById('att-ib');
        btn.disabled = true; btn.classList.remove('done');
        document.getElementById('att-bico').textContent = '🚀';
        document.getElementById('att-blbl').textContent = 'Start Import';

        document.getElementById('att-fn').textContent = file.name;
        document.getElementById('att-fm').textContent = 'Loading employee data...';
        vis('att-fb', true);
        setNum('sC','...'); setNum('sE','...'); setNum('sM','...'); setNum('sS','...');
        setStep(2);

        const reader = new FileReader();
        reader.onload = e => loadEmployees(() => parseCSV(e.target.result));
        reader.readAsText(file);
    }

    // ── Load Employees ────────────────────────────────────────
    function loadEmployees(cb) {
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Employee',
                filters: [['status','=','Active']],
                fields: ['name','employee_name','fingerprint_id'],
                limit_page_length: 500
            },
            callback: r => {
                empMap = {};
                (r.message || []).forEach(emp => {
                    if (emp.fingerprint_id)
                        empMap[emp.fingerprint_id.toString().trim()] = { id: emp.name, name: emp.employee_name };
                });
                if (cb) cb();
            }
        });
    }

    // ── Parse CSV ─────────────────────────────────────────────
    function parseCSV(text) {
        empInfo = {};
        text.trim().split('\n').slice(1).forEach(line => {
            const cols = line.split(',');
            if (cols.length < 4) return;
            const pid  = cols[0].trim().replace(/^'/, '');
            const name = cols[1].trim();
            const time = cols[3].trim();
            if (!pid || !time) return;
            if (!empInfo[pid]) empInfo[pid] = { name, times: [] };
            empInfo[pid].times.push(time);
        });
        const total  = Object.keys(empInfo).length;
        const punches= Object.values(empInfo).reduce((s,e) => s + e.times.length, 0);
        document.getElementById('att-fm').textContent = punches + ' punches · ' + total + ' employees';
        buildUI();
    }

    // ── Build Checkins ────────────────────────────────────────
    function buildCheckins() {
        const byKey = {};
        for (const [pid, info] of Object.entries(empInfo)) {
            const m = empMap[pid];
            if (!m) continue;
            info.times.forEach(ts => {
                const key = m.id + '|' + ts.split(' ')[0];
                if (!byKey[key]) byKey[key] = { empId: m.id, times: [] };
                byKey[key].times.push(ts);
            });
        }
        const result = [];
        for (const e of Object.values(byKey)) {
            e.times.sort();
            result.push({ employee: e.empId, log_type: 'IN',  time: e.times[0] });
            if (e.times.length > 1)
                result.push({ employee: e.empId, log_type: 'OUT', time: e.times[e.times.length - 1] });
        }
        return result;
    }

    // ── Build UI ──────────────────────────────────────────────
    function buildUI() {
        checkins = buildCheckins();
        let matched = 0, unmapped = [];
        const tbody = document.getElementById('att-tb');
        tbody.innerHTML = '';

        for (const [pid, info] of Object.entries(empInfo)) {
            const m    = empMap[pid];
            const days = new Set(info.times.map(ts => ts.split(' ')[0])).size;

            if (m) {
                matched++;
                tbody.innerHTML += `
                <tr data-search="${pid} ${info.name} ${m.id} ${m.name}" data-type="matched">
                    <td><span class="fid">${pid}</span></td>
                    <td style="font-weight:500">${info.name}</td>
                    <td><span style="font-family:'DM Mono',monospace">${info.times.length}</span></td>
                    <td><span class="eid">${m.id}</span><span style="color:var(--mu);font-weight:500">${m.name}</span></td>
                    <td><span style="font-family:'DM Mono',monospace">${days}</span></td>
                    <td><span class="bm">✓ Matched</span></td>
                </tr>`;
            } else {
                unmapped.push(pid + ' · ' + info.name);
                tbody.innerHTML += `
                <tr data-search="${pid} ${info.name}" data-type="unmapped">
                    <td><span class="fid u">${pid}</span></td>
                    <td style="font-weight:500;color:var(--mu)">${info.name}</td>
                    <td><span style="font-family:'DM Mono',monospace">${info.times.length}</span></td>
                    <td style="color:var(--lt)">— not found</td>
                    <td style="color:var(--lt)">—</td>
                    <td><span class="bu">⚠ No FP ID</span></td>
                </tr>`;
            }
        }

        const total = Object.keys(empInfo).length;
        setNum('sC', checkins.length, '');
        setNum('sE', total, '');
        setNum('sM', matched, 'g');
        setNum('sS', total - matched, total - matched > 0 ? 'a' : 'g');

        if (unmapped.length) {
            document.getElementById('att-wp').innerHTML =
                unmapped.map(u => `<span class="ap">${u}</span>`).join('');
            vis('att-warn', true);
        } else {
            vis('att-warn', false);
        }

        document.getElementById('att-ib').disabled = checkins.length === 0;
        vis('att-prev', true);
        document.getElementById('att-new-btn').classList.add('vis');
        curTab = 'all'; curSearch = '';
        applyFilter();
    }

    // ── Import ────────────────────────────────────────────────
    document.getElementById('att-ib').addEventListener('click', function() {
        if (importing || !checkins.length) return;

        frappe.confirm(
            `Import <b>${checkins.length}</b> Employee Checkin records?<br>
             <small style="color:var(--mu,#888)">Already-imported duplicates will be skipped automatically.</small>`,
            async function() {
                importing = true;

                const btn = document.getElementById('att-ib');
                btn.disabled = true;
                document.getElementById('att-bico').textContent = '⏳';
                document.getElementById('att-blbl').textContent = 'Importing...';
                document.getElementById('att-dz').classList.add('adz-off');
                document.getElementById('att-new-btn').classList.remove('vis');
                vis('att-pw',  true);
                vis('att-log', true);
                setStep(3);

                let done = 0, errs = 0, dups = 0;

                for (let i = 0; i < checkins.length; i++) {
                    const rec = checkins[i];
                    try {
                        await frappe.call({
                            method: 'frappe.client.insert',
                            args: { doc: {
                                doctype:   'Employee Checkin',
                                employee:  rec.employee,
                                log_type:  rec.log_type,
                                time:      rec.time,
                                device_id: 'Fingerprint_Upload'
                            }}
                        });
                        done++;
                        addLog('lok', '✓ ' + rec.employee + '  ' + rec.log_type + '  ' + rec.time);
                    } catch(e) {
                        const msg = (e.message || e.exc || '').toLowerCase();
                        if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('already')) {
                            dups++;
                            addLog('ldup', '↷ SKIP  ' + rec.employee + '  ' + rec.log_type + '  ' + rec.time);
                        } else {
                            errs++;
                            addLog('ler', '✗ ERR  ' + rec.employee + '  ' + rec.time);
                        }
                    }
                    const pct = Math.round(((i+1)/checkins.length)*100);
                    document.getElementById('att-pf').style.width = pct + '%';
                    document.getElementById('att-pl').textContent =
                        done + ' imported' + (dups ? ', ' + dups + ' skipped' : '') + (errs ? ', ' + errs + ' errors' : '');
                    document.getElementById('att-pp').textContent = pct + '%';
                    setNum('sC', done, '');
                    if (i % 5 === 0) await new Promise(r => setTimeout(r, 40));
                }

                // ── Finish ──
                importing = false;
                setStep(4);
                btn.classList.add('done');
                document.getElementById('att-bico').textContent = '✅';
                document.getElementById('att-blbl').textContent = 'Import Complete';

                // Re-enable drop zone & show New Import
                document.getElementById('att-dz').classList.remove('adz-off');
                document.getElementById('att-new-btn').classList.add('vis');

                // Success
                let sm = done + ' records imported';
                if (dups)  sm += ', ' + dups + ' duplicates skipped';
                if (!errs) sm += ' with no errors';
                document.getElementById('att-sm').textContent = sm + '.';
                vis('att-succ', true);

                // Errors
                if (errs > 0) {
                    document.getElementById('att-em').textContent = errs + ' record(s) failed. See log below.';
                    document.getElementById('att-err').classList.add('vis');
                }

                frappe.show_alert({
                    message: '🎉 ' + done + ' imported' + (dups ? ', ' + dups + ' dupes skipped' : '') + (errs ? ', ' + errs + ' errors' : ''),
                    indicator: errs > 0 ? 'orange' : 'green'
                });
            }
        );
    });
};
