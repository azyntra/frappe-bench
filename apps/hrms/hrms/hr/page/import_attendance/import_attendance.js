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
        .att-root{font-family:'DM Sans',sans-serif;background:var(--bg);min-height:100vh;padding:16px 14px 60px;color:var(--tx)}

        /* Header */
        .ah{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;animation:afd .4s ease both;gap:10px;flex-wrap:wrap}
        .ahl{display:flex;align-items:center;gap:11px;flex:1;min-width:0}
        .ai{width:40px;height:40px;min-width:40px;background:linear-gradient(135deg,var(--ab),var(--ag));border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 4px 12px rgba(26,86,219,.22)}
        .ah h1{font-size:16px;font-weight:700;margin:0;color:var(--tx);letter-spacing:-.3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .ah p{font-size:11px;color:var(--mu);margin:2px 0 0;white-space:normal}
        #att-new-btn{display:none;align-items:center;gap:5px;padding:7px 13px;border-radius:8px;background:var(--ibg);border:1px solid var(--bd);color:var(--tx);font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s;white-space:nowrap;flex-shrink:0}
        #att-new-btn:hover{background:var(--hov);border-color:var(--ab);color:var(--ab)}
        #att-new-btn.vis{display:flex}

        /* Steps — now 5 steps */
        .as{display:flex;align-items:center;margin-bottom:14px;animation:afd .4s .07s ease both;overflow-x:auto;padding-bottom:2px;-webkit-overflow-scrolling:touch}
        .as::-webkit-scrollbar{display:none}
        .asp{display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:99px;font-size:11px;font-weight:500;color:var(--lt);background:transparent;transition:all .3s;white-space:nowrap}
        .asp.active{background:var(--card);color:var(--ab);font-weight:600;box-shadow:0 2px 8px rgba(26,86,219,.1)}
        .asp.done{color:var(--ag)}
        .asn{width:17px;height:17px;border-radius:50%;background:var(--lt);color:#fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0}
        .asp.active .asn{background:var(--ab)}
        .asp.done   .asn{background:var(--ag)}
        .asl{flex:1;min-width:16px;max-width:28px;height:2px;background:var(--bd);border-radius:2px}

        /* Main grid */
        .ag2{display:grid;grid-template-columns:1fr;gap:12px;margin-bottom:12px;animation:afu .4s .13s ease both}
        @media(min-width:640px){.ag2{grid-template-columns:1fr 1fr}}

        .ac{background:var(--card);border-radius:13px;padding:16px;border:1px solid var(--bd);box-shadow:0 1px 3px rgba(0,0,0,.04)}
        .act{font-size:10px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;color:var(--lt);margin-bottom:11px;display:flex;align-items:center;gap:7px}
        .act::after{content:'';flex:1;height:1px;background:var(--bd)}

        /* Drop zone */
        .adz{border:2px dashed var(--bd);border-radius:10px;padding:24px 16px;text-align:center;cursor:pointer;transition:all .22s;background:var(--ibg);user-select:none}
        .adz:hover:not(.adz-off),.adz.over{border-color:var(--ab);background:var(--ab8);transform:scale(1.007)}
        .adz.adz-off{opacity:.4;cursor:not-allowed;pointer-events:none}
        .adz-ico{font-size:28px;margin-bottom:6px;display:block}
        .adz h3{font-size:13px;font-weight:600;margin:0 0 3px;color:var(--tx)}
        .adz p{font-size:12px;color:var(--mu);margin:0}
        .adz-btn{margin-top:10px;display:inline-flex;align-items:center;gap:5px;background:var(--ab);color:#fff;padding:7px 16px;border-radius:7px;font-size:13px;font-weight:600}
        #att-fi{display:none}

        .afb{display:none;align-items:center;gap:9px;padding:10px 12px;margin-top:10px;background:var(--ag8);border:1px solid rgba(14,159,110,.2);border-radius:8px}
        .afb.vis{display:flex}
        .afb-ic{font-size:18px}
        .afb-n{font-size:12px;font-weight:600;color:var(--ag);word-break:break-all}
        .afb-m{font-size:11px;color:var(--mu)}

        .aal{border-radius:8px;padding:10px 12px;font-size:12px;display:none;margin-top:10px}
        .aal.vis{display:block}
        .aal.warn{background:var(--aa8);border:1px solid rgba(217,119,6,.22);color:var(--aa)}
        .aal.succ{background:var(--ag8);border:1px solid rgba(14,159,110,.22);color:var(--ag)}
        .aal.err {background:var(--ar8);border:1px solid rgba(224,36,36,.22);color:var(--ar)}
        .aal.info{background:var(--ab8);border:1px solid rgba(26,86,219,.22);color:var(--ab)}
        .aal strong{display:block;margin-bottom:2px}
        .apl{display:flex;flex-wrap:wrap;gap:3px;margin-top:6px}
        .ap{background:rgba(217,119,6,.1);border-radius:5px;padding:2px 7px;font-size:11px;font-weight:600;font-family:'DM Mono',monospace;color:var(--aa)}

        /* Stats grid */
        .asr{display:flex;flex-direction:column;gap:10px}
        .arow{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .atile{background:var(--ibg);border:1px solid var(--bd);border-radius:10px;padding:12px;text-align:center;transition:all .3s}
        .atile.hl{background:var(--ab8);border-color:rgba(26,86,219,.16)}
        .anum{font-size:26px;font-weight:700;color:var(--ab);font-family:'DM Mono',monospace;line-height:1;transition:all .25s}
        .anum.g{color:var(--ag)} .anum.a{color:var(--aa)} .anum.r{color:var(--ar)}
        .albl{font-size:10px;color:var(--mu);margin-top:3px;font-weight:500}

        /* Speed badge */
        .speed-badge{display:inline-flex;align-items:center;gap:5px;background:var(--ag8);
            border:1px solid rgba(14,159,110,.2);color:var(--ag);padding:4px 10px;
            border-radius:99px;font-size:11px;font-weight:700;margin-bottom:8px}

        /* Progress */
        .apw{display:none} .apw.vis{display:block}
        .apt{background:var(--bd);border-radius:99px;height:8px;overflow:hidden}
        .apf{height:8px;background:linear-gradient(90deg,var(--ab),var(--ag));border-radius:99px;width:0%;transition:width .3s ease}
        .apm{display:flex;justify-content:space-between;font-size:11px;color:var(--mu);margin-top:4px}

        .batch-info{display:none;font-size:12px;color:var(--mu);text-align:center;margin-top:6px;font-family:'DM Mono',monospace}
        .batch-info.vis{display:block}

        /* Buttons */
        .aib{width:100%;padding:11px;background:linear-gradient(135deg,var(--ab),var(--ag));color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;transition:all .22s;font-family:'DM Sans',sans-serif;box-shadow:0 4px 12px rgba(26,86,219,.2);display:flex;align-items:center;justify-content:center;gap:7px}
        .aib:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 6px 16px rgba(26,86,219,.3)}
        .aib:disabled{opacity:.35;cursor:not-allowed;transform:none;box-shadow:none}
        .aib.done{background:linear-gradient(135deg,var(--ag),#057a55)}

        /* Attendance process button — purple gradient */
        .att-proc-btn{width:100%;padding:11px;background:linear-gradient(135deg,#7c3aed,#1a56db);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;transition:all .22s;font-family:'DM Sans',sans-serif;box-shadow:0 4px 12px rgba(124,58,237,.2);display:flex;align-items:center;justify-content:center;gap:7px;margin-top:8px}
        .att-proc-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 6px 16px rgba(124,58,237,.35)}
        .att-proc-btn:disabled{opacity:.35;cursor:not-allowed;transform:none;box-shadow:none}
        .att-proc-btn.done{background:linear-gradient(135deg,var(--ag),#057a55)}

        /* Log */
        .alog{background:var(--ibg);border:1px solid var(--bd);border-radius:9px;padding:10px;max-height:150px;overflow-y:auto;font-family:'DM Mono',monospace;font-size:11px;line-height:1.75;display:none;margin-top:10px}
        .alog.vis{display:block}
        .lok{color:var(--ag)} .ler{color:var(--ar)} .ldup{color:var(--aa)} .linf{color:var(--ab)}
        .alog::-webkit-scrollbar{width:3px}
        .alog::-webkit-scrollbar-thumb{background:var(--bd);border-radius:3px}

        /* Attendance result panel */
        .att-att-panel{display:none;margin-top:8px}
        .att-att-panel.vis{display:block}
        .att-att-tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px}
        @media(max-width:480px){.att-att-tiles{grid-template-columns:repeat(2,1fr)}}

        /* Attendance log */
        .att-alog{background:var(--ibg);border:1px solid var(--bd);border-radius:9px;padding:10px;max-height:130px;overflow-y:auto;font-family:'DM Mono',monospace;font-size:11px;line-height:1.75;margin-top:8px}
        .att-alog::-webkit-scrollbar{width:3px}
        .att-alog::-webkit-scrollbar-thumb{background:var(--bd);border-radius:3px}

        /* Preview table */
        .aprev{display:none;animation:afu .4s .18s ease both} .aprev.vis{display:block}
        .aprevh{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px}
        .aprevh h2{font-size:13px;font-weight:700;margin:0;color:var(--tx)}
        .asrch{padding:7px 11px;border:1px solid var(--bd);border-radius:7px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;width:100%;max-width:200px;background:var(--ibg);color:var(--tx);transition:border-color .2s}
        .asrch:focus{border-color:var(--ab)}
        .asrch::placeholder{color:var(--lt)}

        .atabs{display:flex;gap:5px;margin-bottom:10px;flex-wrap:wrap}
        .atab{padding:5px 11px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid var(--bd);background:var(--ibg);color:var(--mu);transition:all .18s}
        .atab.on{background:var(--ab);border-color:var(--ab);color:#fff}

        .atw{border-radius:11px;overflow:hidden;border:1px solid var(--bd);overflow-x:auto;-webkit-overflow-scrolling:touch}
        .atbl{width:100%;min-width:580px;border-collapse:collapse;font-size:12px}
        .atbl thead tr{background:var(--ibg)}
        .atbl th{padding:8px 11px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:var(--mu);border-bottom:1px solid var(--bd);white-space:nowrap}
        .atbl td{padding:8px 11px;border-bottom:1px solid var(--bd);vertical-align:middle;background:var(--card);color:var(--tx)}
        .atbl tr:last-child td{border-bottom:none}
        .atbl tr:hover td{background:var(--hov)}
        .atbl tr.hide{display:none}

        .bm{display:inline-flex;align-items:center;gap:3px;background:var(--ag8);color:var(--ag);padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700}
        .bu{display:inline-flex;align-items:center;gap:3px;background:var(--aa8);color:var(--aa);padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700}
        .bs{display:inline-flex;align-items:center;gap:3px;background:rgba(124,58,237,.1);color:#7c3aed;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700}
        .eid{font-family:'DM Mono',monospace;font-size:11px;background:var(--ab8);color:var(--ab);padding:2px 6px;border-radius:5px;font-weight:500;margin-right:4px}
        .fid{font-family:'DM Mono',monospace;font-weight:600;color:var(--ab)}
        .fid.u{color:var(--aa)}

        /* Shift badge in table */
        .shift-tag{display:inline-flex;align-items:center;gap:3px;background:rgba(124,58,237,.08);color:#7c3aed;border:1px solid rgba(124,58,237,.18);padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;white-space:nowrap}
        .shift-none{font-size:11px;color:var(--lt)}

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
                    <p>Upload fingerprint CSV — checkins imported &amp; attendance marked automatically</p>
                </div>
            </div>
            <button id="att-new-btn">🔄 New Import</button>
        </div>

        <!-- 5-step progress bar -->
        <div class="as">
            <div class="asp active" id="sp1"><div class="asn">1</div>Upload CSV</div>
            <div class="asl"></div>
            <div class="asp" id="sp2"><div class="asn">2</div>Review</div>
            <div class="asl"></div>
            <div class="asp" id="sp3"><div class="asn">3</div>Checkins</div>
            <div class="asl"></div>
            <div class="asp" id="sp4"><div class="asn">4</div>Attendance</div>
            <div class="asl"></div>
            <div class="asp" id="sp5"><div class="asn">5</div>Done</div>
        </div>

        <div class="ag2">
            <!-- LEFT: upload -->
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

            <!-- RIGHT: status panel -->
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

                    <div class="speed-badge" id="att-speed-badge" style="display:none">
                        ⚡ Bulk mode — ~10x faster than one-by-one
                    </div>

                    <!-- Checkin progress -->
                    <div class="apw" id="att-pw">
                        <div class="apt"><div class="apf" id="att-pf"></div></div>
                        <div class="apm">
                            <span id="att-pl">Preparing...</span>
                            <span id="att-pp">0%</span>
                        </div>
                    </div>
                    <div class="batch-info" id="att-batch-info">Batch 0 / 0</div>

                    <div class="aal succ" id="att-succ">
                        <strong>✅ Checkins Imported!</strong>
                        <span id="att-sm"></span>
                    </div>
                    <div class="aal err" id="att-err">
                        <strong>⚠️ Some checkin records had errors</strong>
                        <span id="att-em"></span>
                    </div>

                    <!-- Import checkin button -->
                    <button class="aib" id="att-ib" disabled>
                        <span id="att-bico">🚀</span><span id="att-blbl">Start Import</span>
                    </button>
                    <div class="alog" id="att-log"></div>

                    <!-- ── Attendance processing section ── -->
                    <div class="att-att-panel" id="att-att-panel">
                        <div class="act" style="margin-top:14px">🗓️ Attendance Processing</div>

                        <!-- Attendance progress bar -->
                        <div class="apw" id="att-apw">
                            <div class="apt"><div class="apf" id="att-apf"></div></div>
                            <div class="apm">
                                <span id="att-apl">Processing...</span>
                                <span id="att-app">0%</span>
                            </div>
                        </div>
                        <div class="batch-info" id="att-abatch">Processing...</div>

                        <!-- Attendance tiles -->
                        <div class="att-att-tiles" id="att-att-tiles" style="display:none">
                            <div class="atile"><div class="anum g" id="aCreated">—</div><div class="albl">Created</div></div>
                            <div class="atile"><div class="anum" id="aUpdated">—</div><div class="albl">Updated</div></div>
                            <div class="atile"><div class="anum a" id="aSkipped">—</div><div class="albl">Skipped</div></div>
                            <div class="atile"><div class="anum r" id="aErrors">—</div><div class="albl">Errors</div></div>
                        </div>

                        <div class="aal succ" id="att-asucc" style="display:none">
                            <strong>✅ Attendance Marked!</strong>
                            <span id="att-asm"></span>
                        </div>
                        <div class="aal err"  id="att-aerr"  style="display:none">
                            <strong>⚠️ Some attendance records had errors</strong>
                            <span id="att-aem"></span>
                        </div>

                        <div class="att-alog" id="att-alog"></div>

                        <!-- Process attendance button -->
                        <button class="att-proc-btn" id="att-proc-btn" disabled>
                            <span id="att-pico">🗓️</span><span id="att-plbl">Mark Attendance from Checkins</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Preview table -->
        <div class="aprev" id="att-prev">
            <div class="ac">
                <div class="aprevh">
                    <h2>👥 Employee Mapping &amp; Shift Preview</h2>
                    <input class="asrch" id="att-srch" placeholder="🔍 Search name or ID...">
                </div>
                <div class="atabs">
                    <div class="atab on" id="tab-all"     data-tab="all">All</div>
                    <div class="atab"    id="tab-matched" data-tab="matched">✓ Matched</div>
                    <div class="atab"    id="tab-unmapped" data-tab="unmapped">⚠ Not Mapped</div>
                    <div class="atab"    id="tab-noshift" data-tab="noshift">⚡ No Shift</div>
                </div>
                <div class="atw">
                    <table class="atbl">
                        <thead><tr>
                            <th>FP ID</th><th>Device Name</th><th>Punches</th>
                            <th>ERPNext Employee</th><th>Shift</th><th>Days</th><th>Status</th>
                        </tr></thead>
                        <tbody id="att-tb"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    `);

    // ── State ──────────────────────────────────────────────────────────────
    let empInfo    = {};
    let empMap     = {};
    let shiftMap   = {};   // { empId: {shift_type, shift_start, shift_end} | null }
    let checkins   = [];
    let empDates   = [];   // [{employee, date}] for attendance processing
    let curTab     = 'all';
    let curSearch  = '';
    let importing  = false;
    let processing = false;

    const BATCH_SIZE      = 100;
    const ATT_BATCH_SIZE  = 50;   // attendance records per batch

    // ── Helpers ────────────────────────────────────────────────────────────
    function setNum(id, val, cls) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = val;
        el.className = 'anum pop' + (cls ? ' ' + cls : '');
        setTimeout(() => el.classList.remove('pop'), 300);
    }

    function setStep(n) {
        [1,2,3,4,5].forEach(i => {
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

    function show(id, show) {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.display = show ? '' : 'none';
    }

    function addLog(logId, cls, msg) {
        const log  = document.getElementById(logId);
        if (!log) return;
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

    // ── Tabs ───────────────────────────────────────────────────────────────
    document.querySelectorAll('.atab').forEach(tab => {
        tab.addEventListener('click', function() {
            curTab = this.dataset.tab;
            document.querySelectorAll('.atab').forEach(t => t.classList.remove('on'));
            this.classList.add('on');
            applyFilter();
        });
    });

    document.getElementById('att-srch').addEventListener('input', function() {
        curSearch = this.value;
        applyFilter();
    });

    // ── Reset ──────────────────────────────────────────────────────────────
    function resetPage() {
        if (importing || processing) return;
        empInfo = {}; empMap = {}; shiftMap = {}; checkins = []; empDates = [];
        curTab = 'all'; curSearch = '';

        document.getElementById('att-dz').classList.remove('adz-off');
        const oldFi = document.getElementById('att-fi');
        const newFi = oldFi.cloneNode(true);
        oldFi.parentNode.replaceChild(newFi, oldFi);
        newFi.addEventListener('change', e => handleFile(e.target.files[0]));

        vis('att-fb',   false); vis('att-warn', false);
        vis('att-succ', false); vis('att-pw',   false);
        vis('att-log',  false); vis('att-prev', false);
        document.getElementById('att-log').innerHTML  = '';
        document.getElementById('att-wp').innerHTML   = '';
        document.getElementById('att-fn').textContent = '—';
        document.getElementById('att-fm').textContent = '—';
        document.getElementById('att-tb').innerHTML   = '';
        document.getElementById('att-srch').value     = '';
        document.getElementById('att-err').classList.remove('vis');
        document.getElementById('att-pf').style.width = '0%';
        document.getElementById('att-batch-info').classList.remove('vis');
        document.getElementById('att-speed-badge').style.display = 'none';

        // Reset checkin button
        const btn = document.getElementById('att-ib');
        btn.disabled = true; btn.classList.remove('done');
        document.getElementById('att-bico').textContent = '🚀';
        document.getElementById('att-blbl').textContent = 'Start Import';

        // Reset attendance section
        vis('att-att-panel', false);
        document.getElementById('att-apf').style.width = '0%';
        document.getElementById('att-alog').innerHTML  = '';
        show('att-att-tiles', false);
        show('att-asucc',     false);
        show('att-aerr',      false);
        document.getElementById('att-proc-btn').disabled = true;
        document.getElementById('att-proc-btn').classList.remove('done');
        document.getElementById('att-pico').textContent = '🗓️';
        document.getElementById('att-plbl').textContent = 'Mark Attendance from Checkins';

        setNum('sC','—'); setNum('sE','—'); setNum('sM','—'); setNum('sS','—');
        setNum('aCreated','—'); setNum('aUpdated','—');
        setNum('aSkipped','—'); setNum('aErrors','—');

        document.querySelectorAll('.atab').forEach(t => t.classList.remove('on'));
        document.getElementById('tab-all').classList.add('on');
        document.getElementById('att-new-btn').classList.remove('vis');
        setStep(1);
    }

    document.getElementById('att-new-btn').addEventListener('click', resetPage);

    // ── Drop Zone ──────────────────────────────────────────────────────────
    const dz = document.getElementById('att-dz');
    dz.addEventListener('click', () => { if (!importing && !processing) document.getElementById('att-fi').click(); });
    dz.addEventListener('dragover',  e => { if (!importing) { e.preventDefault(); dz.classList.add('over'); }});
    dz.addEventListener('dragleave', () => dz.classList.remove('over'));
    dz.addEventListener('drop', e => {
        e.preventDefault(); dz.classList.remove('over');
        if (!importing && !processing) handleFile(e.dataTransfer.files[0]);
    });
    document.getElementById('att-fi').addEventListener('change', e => handleFile(e.target.files[0]));

    // ── File Handler ───────────────────────────────────────────────────────
    function handleFile(file) {
        if (!file || !file.name.endsWith('.csv')) {
            frappe.msgprint('Please upload a valid .csv file.'); return;
        }
        document.getElementById('att-err').classList.remove('vis');
        vis('att-succ', false); vis('att-pw', false); vis('att-log', false);
        document.getElementById('att-log').innerHTML = '';
        const btn = document.getElementById('att-ib');
        btn.disabled = true; btn.classList.remove('done');
        document.getElementById('att-bico').textContent = '🚀';
        document.getElementById('att-blbl').textContent = 'Start Import';

        document.getElementById('att-fn').textContent = file.name;
        document.getElementById('att-fm').textContent = 'Loading employee & shift data...';
        vis('att-fb', true);
        setNum('sC','...'); setNum('sE','...'); setNum('sM','...'); setNum('sS','...');
        setStep(2);

        const reader = new FileReader();
        reader.onload = e => loadEmployees(() => parseCSV(e.target.result));
        reader.readAsText(file);
    }

    // ── Load Employees ─────────────────────────────────────────────────────
    function loadEmployees(cb) {
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Employee',
                filters: [['status','=','Active']],
                fields: ['name','employee_name','custom_fingerprint_id'],
                limit_page_length: 500
            },
            callback: r => {
                empMap = {};
                (r.message || []).forEach(emp => {
                    if (emp.custom_fingerprint_id)
                        empMap[emp.custom_fingerprint_id.toString().trim()] = {
                            id: emp.name, name: emp.employee_name
                        };
                });
                if (cb) cb();
            }
        });
    }

    // ── Parse CSV ──────────────────────────────────────────────────────────
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
        const total   = Object.keys(empInfo).length;
        const punches = Object.values(empInfo).reduce((s,e) => s + e.times.length, 0);
        document.getElementById('att-fm').textContent = punches + ' punches · ' + total + ' employees';
        // Extract first date from CSV to use as the shift-lookup date
        // (using today's date fails when the CSV is from a prior month)
        let firstCsvDate = null;
        for (const info of Object.values(empInfo)) {
            if (info.times.length) {
                const d = info.times[0].split(' ')[0];
                if (!firstCsvDate || d < firstCsvDate) firstCsvDate = d;
            }
        }
        loadShiftInfo(firstCsvDate, () => buildUI());
    }

    // ── Load Shift Info ────────────────────────────────────────────────────
    function loadShiftInfo(checkDate, cb) {
        // Collect only matched employee IDs
        const matchedEmpIds = [];
        for (const [pid] of Object.entries(empInfo)) {
            const m = empMap[pid];
            if (m) matchedEmpIds.push(m.id);
        }
        if (!matchedEmpIds.length) { shiftMap = {}; if (cb) cb(); return; }

        frappe.call({
            method: 'hrms.hr.page.import_attendance.import_attendance.get_employee_shift_info',
            args: {
                employees:  JSON.stringify(matchedEmpIds),
                check_date: checkDate   // first date found in the CSV
            },
            callback: r => {
                shiftMap = r.message || {};
                if (cb) cb();
            },
            error: () => {
                shiftMap = {};
                if (cb) cb();
            }
        });
    }

    // ── Build Checkins ─────────────────────────────────────────────────────
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
        const result    = [];
        const edSet     = new Set();
        const edList    = [];
        for (const e of Object.values(byKey)) {
            e.times.sort();
            result.push({ employee: e.empId, log_type: 'IN',  time: e.times[0] });
            if (e.times.length > 1)
                result.push({ employee: e.empId, log_type: 'OUT', time: e.times[e.times.length - 1] });
            // collect unique employee+date pairs for attendance processing
            const d   = e.times[0].split(' ')[0];
            const key = e.empId + '|' + d;
            if (!edSet.has(key)) {
                edSet.add(key);
                edList.push({ employee: e.empId, date: d });
            }
        }
        empDates = edList;
        return result;
    }

    // ── Build UI ───────────────────────────────────────────────────────────
    function buildUI() {
        checkins = buildCheckins();
        let matched = 0, unmapped = [], noShift = 0;
        const tbody = document.getElementById('att-tb');
        tbody.innerHTML = '';

        for (const [pid, info] of Object.entries(empInfo)) {
            const m    = empMap[pid];
            const days = new Set(info.times.map(ts => ts.split(' ')[0])).size;
            if (m) {
                matched++;
                const si        = shiftMap[m.id];
                const shiftCell = si
                    ? `<span class="shift-tag">⏰ ${si.shift_type}</span>`
                    : `<span class="shift-none">— no shift</span>`;
                const rowType   = si ? 'matched' : 'noshift';
                if (!si) noShift++;
                tbody.innerHTML += `
                <tr data-search="${pid} ${info.name} ${m.id} ${m.name}" data-type="${rowType}">
                    <td><span class="fid">${pid}</span></td>
                    <td style="font-weight:500">${info.name}</td>
                    <td><span style="font-family:'DM Mono',monospace">${info.times.length}</span></td>
                    <td><span class="eid">${m.id}</span><span style="color:var(--mu);font-weight:500">${m.name}</span></td>
                    <td>${shiftCell}</td>
                    <td><span style="font-family:'DM Mono',monospace">${days}</span></td>
                    <td><span class="bm">✓ Matched</span>${si ? '' : '<span class="bu" style="margin-left:4px">No Shift</span>'}</td>
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

        if (noShift > 0) {
            // Show informational note about no-shift employees
            const infoEl = document.createElement('div');
            infoEl.className = 'aal info vis';
            infoEl.innerHTML = `<strong>ℹ️ ${noShift} employee(s) have no shift assigned</strong>
                Attendance will still be marked as <b>Present</b> based on checkins, 
                but without shift-time validation (no late/early detection).`;
            document.getElementById('att-warn').after(infoEl);
        }

        if (checkins.length > 0) {
            document.getElementById('att-ib').disabled = false;
            document.getElementById('att-speed-badge').style.display = 'inline-flex';
        }
        vis('att-prev', true);
        document.getElementById('att-new-btn').classList.add('vis');
        curTab = 'all'; curSearch = '';
        applyFilter();
    }

    // ── STEP 3: BULK CHECKIN IMPORT ────────────────────────────────────────
    document.getElementById('att-ib').addEventListener('click', function() {
        if (importing || !checkins.length) return;
        const totalBatches = Math.ceil(checkins.length / BATCH_SIZE);

        frappe.confirm(
            `Import <b>${checkins.length}</b> checkin records in <b>${totalBatches}</b> batches?<br>
             <small style="color:var(--mu,#888)">Attendance will be marked automatically after this step.</small>`,
            async function() {
                importing = true;
                const startTime = Date.now();

                const btn = document.getElementById('att-ib');
                btn.disabled = true;
                document.getElementById('att-bico').textContent = '⚡';
                document.getElementById('att-blbl').textContent = 'Importing Checkins...';
                document.getElementById('att-dz').classList.add('adz-off');
                document.getElementById('att-new-btn').classList.remove('vis');
                document.getElementById('att-speed-badge').style.display = 'none';
                vis('att-pw', true);
                vis('att-log', true);
                document.getElementById('att-batch-info').classList.add('vis');
                setStep(3);

                let totalDone = 0, totalDups = 0, totalErrs = 0;

                for (let b = 0; b < totalBatches; b++) {
                    const batch    = checkins.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
                    const batchNum = b + 1;
                    document.getElementById('att-batch-info').textContent =
                        `Batch ${batchNum} / ${totalBatches}  (${batch.length} records)`;

                    try {
                        const result = await new Promise((resolve, reject) => {
                            frappe.call({
                                method: 'hrms.hr.page.import_attendance.import_attendance.bulk_insert_checkins',
                                args: { checkins: JSON.stringify(batch) },
                                callback: r => resolve(r.message),
                                error:    e => reject(e)
                            });
                        });

                        totalDone += result.inserted   || 0;
                        totalDups += result.duplicates || 0;
                        totalErrs += result.errors     || 0;

                        addLog('att-log', 'linf', `✦ Batch ${batchNum}/${totalBatches} → ${result.inserted} inserted, ${result.duplicates} dupes, ${result.errors} errors`);
                        if (result.error_details && result.error_details.length) {
                            result.error_details.forEach(ed =>
                                addLog('att-log', 'ler', `  ✗ ${ed.employee} ${ed.time} — ${ed.error}`)
                            );
                        }

                    } catch(e) {
                        totalErrs += batch.length;
                        addLog('att-log', 'ler', `✗ Batch ${batchNum} failed: ${e.message || 'Server error'}`);
                    }

                    const pct = Math.round(((b + 1) / totalBatches) * 100);
                    document.getElementById('att-pf').style.width = pct + '%';
                    document.getElementById('att-pl').textContent =
                        totalDone + ' imported' +
                        (totalDups ? ', ' + totalDups + ' skipped' : '') +
                        (totalErrs ? ', ' + totalErrs + ' errors' : '');
                    document.getElementById('att-pp').textContent = pct + '%';
                    setNum('sC', totalDone, '');
                }

                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                importing = false;

                btn.classList.add('done');
                document.getElementById('att-bico').textContent = '✅';
                document.getElementById('att-blbl').textContent = 'Checkins Imported';
                document.getElementById('att-batch-info').textContent =
                    `⚡ Completed in ${elapsed}s — ${totalBatches} batches`;

                let sm = totalDone + ' records imported in ' + elapsed + 's';
                if (totalDups) sm += ', ' + totalDups + ' duplicates skipped';
                if (!totalErrs) sm += ' with no errors';
                document.getElementById('att-sm').textContent = sm + '.';
                vis('att-succ', true);

                if (totalErrs > 0) {
                    document.getElementById('att-em').textContent =
                        totalErrs + ' record(s) failed. See log below.';
                    document.getElementById('att-err').classList.add('vis');
                }

                addLog('att-log', 'lok', `\n⚡ Total: ${totalDone} inserted | ${totalDups} dupes | ${totalErrs} errors | ${elapsed}s`);

                frappe.show_alert({
                    message: `✅ ${totalDone} checkins imported. Now mark attendance ↓`,
                    indicator: totalErrs > 0 ? 'orange' : 'green'
                });

                // ── Show attendance processing panel ──
                vis('att-att-panel', true);
                document.getElementById('att-dz').classList.remove('adz-off');
                document.getElementById('att-new-btn').classList.add('vis');

                // Enable attendance button if there are employee-date pairs
                if (empDates.length > 0) {
                    document.getElementById('att-proc-btn').disabled = false;
                }
                setStep(4);
            }
        );
    });

    // ── STEP 4: PROCESS ATTENDANCE ─────────────────────────────────────────
    document.getElementById('att-proc-btn').addEventListener('click', async function() {
        if (processing || !empDates.length) return;
        const totalBatches = Math.ceil(empDates.length / ATT_BATCH_SIZE);

        frappe.confirm(
            `Mark attendance for <b>${empDates.length}</b> employee-day pairs in <b>${totalBatches}</b> batches?<br>
             <small style="color:var(--mu,#888)">Shift rules applied automatically. Existing submitted records are skipped.</small>`,
            async function() {
                processing = true;
                const startTime = Date.now();

                const procBtn = document.getElementById('att-proc-btn');
                procBtn.disabled = true;
                document.getElementById('att-pico').textContent = '⚙️';
                document.getElementById('att-plbl').textContent = 'Processing Attendance...';
                document.getElementById('att-new-btn').classList.remove('vis');
                document.getElementById('att-ib').disabled = true;

                // Show attendance progress
                document.getElementById('att-apw').classList.add('vis');
                document.getElementById('att-abatch').classList.add('vis');
                document.getElementById('att-alog').innerHTML = '';

                let totCreated = 0, totUpdated = 0, totSkipped = 0, totErrors = 0;

                for (let b = 0; b < totalBatches; b++) {
                    const batch    = empDates.slice(b * ATT_BATCH_SIZE, (b + 1) * ATT_BATCH_SIZE);
                    const batchNum = b + 1;
                    document.getElementById('att-abatch').textContent =
                        `Processing batch ${batchNum} / ${totalBatches}  (${batch.length} pairs)`;

                    try {
                        const result = await new Promise((resolve, reject) => {
                            frappe.call({
                                method: 'hrms.hr.page.import_attendance.import_attendance.process_attendance_for_employees',
                                args: { employee_dates: JSON.stringify(batch) },
                                callback: r => resolve(r.message),
                                error:    e => reject(e)
                            });
                        });

                        totCreated += result.created  || 0;
                        totUpdated += result.updated  || 0;
                        totSkipped += result.skipped  || 0;
                        totErrors  += result.errors   || 0;

                        addLog('att-alog', 'linf',
                            `✦ Batch ${batchNum}/${totalBatches} → ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors`);

                        if (result.error_details && result.error_details.length) {
                            result.error_details.forEach(ed =>
                                addLog('att-alog', 'ler', `  ✗ ${ed.employee} ${ed.date} — ${ed.error}`)
                            );
                        }

                    } catch(e) {
                        totErrors += batch.length;
                        addLog('att-alog', 'ler', `✗ Batch ${batchNum} failed: ${e.message || 'Server error'}`);
                    }

                    const pct = Math.round(((b + 1) / totalBatches) * 100);
                    document.getElementById('att-apf').style.width = pct + '%';
                    document.getElementById('att-apl').textContent =
                        totCreated + ' created' +
                        (totUpdated ? ', ' + totUpdated + ' updated' : '') +
                        (totSkipped ? ', ' + totSkipped + ' skipped' : '') +
                        (totErrors  ? ', ' + totErrors + ' errors'  : '');
                    document.getElementById('att-app').textContent = pct + '%';
                }

                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                processing = false;

                // Update tiles
                show('att-att-tiles', true);
                setNum('aCreated', totCreated, 'g');
                setNum('aUpdated', totUpdated, '');
                setNum('aSkipped', totSkipped, 'a');
                setNum('aErrors',  totErrors,  totErrors > 0 ? 'r' : 'g');

                document.getElementById('att-abatch').textContent =
                    `⚡ Attendance done in ${elapsed}s — ${totalBatches} batches`;

                // Success / error banners
                document.getElementById('att-asm').textContent =
                    `${totCreated} records created, ${totUpdated} updated in ${elapsed}s.`;
                document.getElementById('att-asucc').style.display = '';

                if (totErrors > 0) {
                    document.getElementById('att-aem').textContent =
                        totErrors + ' record(s) failed. See log below.';
                    document.getElementById('att-aerr').style.display = '';
                }

                procBtn.classList.add('done');
                document.getElementById('att-pico').textContent = '✅';
                document.getElementById('att-plbl').textContent = 'Attendance Marking Complete';

                addLog('att-alog', 'lok',
                    `\n✅ Total: ${totCreated} created | ${totUpdated} updated | ${totSkipped} skipped | ${totErrors} errors | ${elapsed}s`);

                document.getElementById('att-new-btn').classList.add('vis');
                setStep(5);

                frappe.show_alert({
                    message: `✅ Attendance marked: ${totCreated} created, ${totUpdated} updated`,
                    indicator: totErrors > 0 ? 'orange' : 'green'
                });

                if (totCreated > 0 || totUpdated > 0) {
                    const dates = empDates.map(e => e.date).sort();
                    addLog('att-alog', 'linf', `\n🤖 Running Auto Leave Assignment in the background...`);
                    frappe.call({
                        method: "auto_leave_assignment.api.dashboard_api.run_manual_processing",
                        args: {
                            from_date: dates[0],
                            to_date: dates[dates.length - 1]
                        },
                        callback: function(r) {
                            if (!r.exc && r.message) {
                                let res = r.message;
                                // Handle structured dict format: {assigned, skipped, errors}
                                if (typeof res.assigned !== 'undefined') {
                                    addLog('att-alog', 'lok', `✅ Auto Leave Assignment Complete: ${res.assigned} assigned, ${res.skipped} skipped, ${res.errors} errors`);
                                    frappe.show_alert({
                                        message: `🤖 Auto Leave: ${res.assigned} assigned, ${res.skipped} skipped` + (res.errors > 0 ? `, ${res.errors} errors` : ''),
                                        indicator: res.errors > 0 ? 'orange' : 'green'
                                    });
                                } else {
                                    // Fallback for any other format
                                    addLog('att-alog', 'lok', `✅ Auto Leave Assignment Complete`);
                                    frappe.show_alert({
                                        message: '🤖 Auto Leave Assignment Complete',
                                        indicator: 'green'
                                    });
                                }
                            }
                        },
                        error: function() {
                            addLog('att-alog', 'ler', `✗ Auto Leave Assignment failed. Check Error Log for details.`);
                        }
                    });
                }
            }
        );
    });
};
