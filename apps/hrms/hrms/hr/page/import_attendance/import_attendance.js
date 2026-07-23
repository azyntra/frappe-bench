frappe.pages['import-attendance'].on_page_load = function(wrapper) {
    frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Import Attendance',
        single_column: true
    });

    if (!document.getElementById('att-font')) {
        const lnk = document.createElement('link');
        lnk.id = 'att-font'; lnk.rel = 'stylesheet';
        lnk.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap';
        document.head.appendChild(lnk);
    }

    $('#att-styles').remove();
    $('<style id="att-styles">').text(`
        .att-root {
            --ab:#2563eb; --ag:#059669; --aa:#d97706; --ar:#dc2626; --ap:#7c3aed;
            --ab8:rgba(37,99,235,.08);  --ag8:rgba(5,150,105,.08);
            --aa8:rgba(217,119,6,.09);  --ar8:rgba(220,38,38,.08);
            --ap8:rgba(124,58,237,.08);
            --bg:  var(--bg-color,#f6f8fb);
            --card:var(--card-bg,#fff);
            --bd:  var(--border-color,#e6ebf1);
            --bd2: var(--border-color,#eef2f6);
            --tx:  var(--text-color,#101828);
            --mu:  var(--text-muted,#667085);
            --lt:  var(--text-light,#98a2b3);
            --ibg: var(--control-bg,#f8fafc);
            --hov: var(--fg-hover-color,#f1f5f9);
        }
        .att-root *{box-sizing:border-box}
        .att-root{font-family:'DM Sans',-apple-system,sans-serif;background:var(--bg);min-height:100vh;padding:20px 16px 72px;color:var(--tx);-webkit-font-smoothing:antialiased}
        .att-wrap{max-width:1040px;margin:0 auto}

        /* ── Header ── */
        .ah{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;gap:12px;flex-wrap:wrap;animation:afd .4s ease both}
        .ahl{display:flex;align-items:center;gap:13px;min-width:0}
        .ai{width:46px;height:46px;min-width:46px;background:linear-gradient(135deg,var(--ab),var(--ap));border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 6px 16px rgba(37,99,235,.25)}
        .ah h1{font-size:19px;font-weight:700;margin:0;letter-spacing:-.4px;line-height:1.15}
        .ah p{font-size:12.5px;color:var(--mu);margin:3px 0 0}
        #att-new-btn{display:none;align-items:center;gap:6px;padding:9px 15px;border-radius:9px;background:var(--card);border:1px solid var(--bd);color:var(--tx);font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .18s;white-space:nowrap;flex-shrink:0}
        #att-new-btn:hover{border-color:var(--ab);color:var(--ab);background:var(--ab8)}
        #att-new-btn.vis{display:inline-flex}

        /* ── Cards ── */
        .ac{background:var(--card);border-radius:16px;padding:18px;border:1px solid var(--bd);box-shadow:0 1px 2px rgba(16,24,40,.04)}
        .act{font-size:11px;font-weight:700;letter-spacing:.9px;text-transform:uppercase;color:var(--lt);margin-bottom:13px;display:flex;align-items:center;gap:8px}
        .act .num-badge{width:18px;height:18px;border-radius:6px;background:var(--ab8);color:var(--ab);font-size:10px;display:inline-flex;align-items:center;justify-content:center;font-weight:800}

        .ag2{display:grid;grid-template-columns:1fr;gap:14px;margin-bottom:14px;animation:afu .4s .08s ease both}
        @media(min-width:720px){.ag2{grid-template-columns:1.15fr .85fr}}

        /* ── Drop zone ── */
        .adz{border:2px dashed var(--bd);border-radius:13px;padding:30px 18px;text-align:center;cursor:pointer;transition:all .2s;background:var(--ibg);user-select:none}
        .adz:hover:not(.adz-off),.adz.over{border-color:var(--ab);background:var(--ab8)}
        .adz.adz-off{opacity:.45;cursor:not-allowed;pointer-events:none}
        .adz-ico{font-size:34px;margin-bottom:8px;display:block;opacity:.9}
        .adz h3{font-size:14px;font-weight:600;margin:0 0 4px}
        .adz p{font-size:12.5px;color:var(--mu);margin:0}
        .adz-btn{margin-top:13px;display:inline-flex;align-items:center;gap:6px;background:var(--ab);color:#fff;padding:9px 18px;border-radius:9px;font-size:13px;font-weight:600;box-shadow:0 3px 10px rgba(37,99,235,.22)}
        #att-fi{display:none}

        .afb{display:none;align-items:center;gap:11px;padding:12px 13px;margin-top:12px;background:var(--ag8);border:1px solid rgba(5,150,105,.2);border-radius:11px}
        .afb.vis{display:flex}
        .afb-ic{font-size:20px}
        .afb-n{font-size:13px;font-weight:600;color:var(--ag);word-break:break-all}
        .afb-m{font-size:12px;color:var(--mu);margin-top:1px}

        .aal{border-radius:11px;padding:11px 13px;font-size:12.5px;display:none;margin-top:12px;line-height:1.5}
        .aal.vis{display:block}
        .aal.warn{background:var(--aa8);border:1px solid rgba(217,119,6,.22);color:var(--aa)}
        .aal.info{background:var(--ab8);border:1px solid rgba(37,99,235,.2);color:var(--ab)}
        .aal strong{display:block;margin-bottom:3px;font-weight:700}
        .apl{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px}
        .ap{background:rgba(217,119,6,.12);border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600;font-family:'DM Mono',monospace;color:var(--aa)}

        /* ── Summary stat tiles ── */
        .asr{display:grid;grid-template-columns:1fr 1fr;gap:9px}
        .atile{background:var(--ibg);border:1px solid var(--bd2);border-radius:12px;padding:14px 12px;text-align:center;transition:all .25s}
        .atile.hl{background:var(--ab8);border-color:rgba(37,99,235,.18)}
        .anum{font-size:27px;font-weight:700;color:var(--tx);font-family:'DM Mono',monospace;line-height:1;letter-spacing:-.5px}
        .anum.b{color:var(--ab)} .anum.g{color:var(--ag)} .anum.a{color:var(--aa)} .anum.r{color:var(--ar)}
        .albl{font-size:10.5px;color:var(--mu);margin-top:5px;font-weight:600;letter-spacing:.2px}
        .empty-hint{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;height:100%;min-height:150px;color:var(--lt)}
        .empty-hint .eh-ic{font-size:30px;margin-bottom:8px;opacity:.5}
        .empty-hint p{font-size:12.5px;margin:0}

        /* ── Preview table ── */
        .aprev{display:none;margin-bottom:14px;animation:afu .4s ease both} .aprev.vis{display:block}
        .aprevh{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:10px}
        .aprevh h2{font-size:14px;font-weight:700;margin:0;display:flex;align-items:center;gap:7px}
        .asrch{padding:8px 12px;border:1px solid var(--bd);border-radius:9px;font-size:13px;font-family:inherit;outline:none;width:100%;max-width:220px;background:var(--ibg);color:var(--tx);transition:border-color .18s}
        .asrch:focus{border-color:var(--ab);background:var(--card)}
        .asrch::placeholder{color:var(--lt)}
        .atabs{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap}
        .atab{padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid var(--bd);background:var(--ibg);color:var(--mu);transition:all .16s}
        .atab:hover{border-color:var(--ab);color:var(--ab)}
        .atab.on{background:var(--ab);border-color:var(--ab);color:#fff}
        .atw{border-radius:12px;overflow:hidden;border:1px solid var(--bd);overflow-x:auto;-webkit-overflow-scrolling:touch}
        .atbl{width:100%;min-width:600px;border-collapse:collapse;font-size:12.5px}
        .atbl thead tr{background:var(--ibg)}
        .atbl th{padding:9px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--mu);border-bottom:1px solid var(--bd);white-space:nowrap}
        .atbl td{padding:9px 12px;border-bottom:1px solid var(--bd2);vertical-align:middle;background:var(--card);color:var(--tx)}
        .atbl tr:last-child td{border-bottom:none}
        .atbl tr:hover td{background:var(--hov)}
        .atbl tr.hide{display:none}
        .bm{display:inline-flex;align-items:center;gap:3px;background:var(--ag8);color:var(--ag);padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700}
        .bu{display:inline-flex;align-items:center;gap:3px;background:var(--aa8);color:var(--aa);padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700}
        .eid{font-family:'DM Mono',monospace;font-size:11px;background:var(--ab8);color:var(--ab);padding:2px 6px;border-radius:5px;font-weight:500;margin-right:4px}
        .fid{font-family:'DM Mono',monospace;font-weight:600;color:var(--ab)}
        .fid.u{color:var(--aa)}
        .shift-tag{display:inline-flex;align-items:center;gap:3px;background:var(--ap8);color:var(--ap);border:1px solid rgba(124,58,237,.2);padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;white-space:nowrap}
        .shift-none{font-size:11px;color:var(--lt)}
        .mono{font-family:'DM Mono',monospace}

        /* ── Run panel ── */
        .arun{animation:afu .4s .12s ease both}
        .run-btn{width:100%;padding:15px;background:linear-gradient(135deg,var(--ab),var(--ap));color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;transition:all .2s;font-family:inherit;box-shadow:0 8px 22px rgba(37,99,235,.28);display:flex;align-items:center;justify-content:center;gap:9px;letter-spacing:.2px}
        .run-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 12px 28px rgba(37,99,235,.36)}
        .run-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}
        .run-btn.done{background:linear-gradient(135deg,var(--ag),#047857);box-shadow:0 8px 22px rgba(5,150,105,.28)}
        .run-hint{text-align:center;font-size:11.5px;color:var(--mu);margin-top:9px}

        /* ── Pipeline ── */
        .pipe{display:none;margin-top:16px} .pipe.vis{display:block}
        .pipe-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px}
        .pipe-head h2{font-size:14px;font-weight:700;margin:0;display:flex;align-items:center;gap:8px}
        .pipe-meta{display:flex;align-items:center;gap:9px;font-size:11.5px;color:var(--mu);font-family:'DM Mono',monospace}
        .pipe-step-pill{background:var(--ab8);color:var(--ab);border-radius:99px;padding:3px 11px;font-weight:700;font-size:11px;font-family:'DM Sans',sans-serif}

        .stg{position:relative;display:flex;gap:14px;padding:2px 0 18px}
        .stg:last-child{padding-bottom:0}
        .stg-rail{position:relative;display:flex;flex-direction:column;align-items:center;flex-shrink:0}
        .stg-node{width:30px;height:30px;border-radius:50%;background:var(--ibg);border:2px solid var(--bd);color:var(--lt);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;z-index:1;transition:all .3s;flex-shrink:0}
        .stg-line{width:2px;flex:1;background:var(--bd);margin:4px 0;min-height:14px;transition:background .3s}
        .stg:last-child .stg-line{display:none}
        .stg.run  .stg-node{background:var(--ab);border-color:var(--ab);color:#fff;box-shadow:0 0 0 5px var(--ab8)}
        .stg.done .stg-node{background:var(--ag);border-color:var(--ag);color:#fff}
        .stg.done .stg-line{background:var(--ag)}
        .stg.error .stg-node{background:var(--ar);border-color:var(--ar);color:#fff}
        .stg.skip .stg-node{background:var(--ibg);border-color:var(--bd);border-style:dashed;color:var(--lt)}

        .stg-body{flex:1;min-width:0;padding-top:2px}
        .stg-top{display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap}
        .stg-title{font-size:13.5px;font-weight:700;color:var(--tx)}
        .stg.wait .stg-title{color:var(--mu)}
        .stg-state{font-size:11.5px;font-weight:700;color:var(--lt);white-space:nowrap}
        .stg.run  .stg-state{color:var(--ab)}
        .stg.done .stg-state{color:var(--ag)}
        .stg.error .stg-state{color:var(--ar)}
        .stg-sub{font-size:11.5px;color:var(--mu);margin-top:2px}
        .stg-bar{height:6px;background:var(--bd2);border-radius:99px;overflow:hidden;margin-top:9px;display:none}
        .stg.run .stg-bar,.stg.done .stg-bar,.stg.error .stg-bar{display:block}
        .stg-fill{height:100%;width:0%;background:linear-gradient(90deg,var(--ab),var(--ap));border-radius:99px;transition:width .35s ease}
        .stg.done .stg-fill{background:var(--ag)}
        .stg.error .stg-fill{background:linear-gradient(90deg,var(--aa),var(--ar))}
        .stg-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
        .chip{display:inline-flex;align-items:center;gap:5px;background:var(--ibg);border:1px solid var(--bd2);border-radius:8px;padding:3px 9px;font-size:12px;font-weight:700;font-family:'DM Mono',monospace;color:var(--tx)}
        .chip em{font-style:normal;font-weight:500;color:var(--mu);font-family:'DM Sans',sans-serif;font-size:11px}
        .chip.g{color:var(--ag);background:var(--ag8);border-color:rgba(5,150,105,.18)}
        .chip.a{color:var(--aa);background:var(--aa8);border-color:rgba(217,119,6,.18)}
        .chip.r{color:var(--ar);background:var(--ar8);border-color:rgba(220,38,38,.18)}

        .spin{width:13px;height:13px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
        @keyframes spin{to{transform:rotate(360deg)}}

        /* ── Activity log ── */
        .logwrap{display:none;margin-top:16px}.logwrap.vis{display:block}
        .log-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
        .log-head span{font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--lt)}
        .log-toggle{font-size:11px;font-weight:600;color:var(--ab);cursor:pointer;user-select:none}
        .alog{background:#0f172a;border:1px solid #1e293b;border-radius:11px;padding:12px 13px;max-height:240px;overflow-y:auto;font-family:'DM Mono',monospace;font-size:11.5px;line-height:1.85;color:#cbd5e1}
        .alog.collapsed{display:none}
        .alog .lhd{color:#93c5fd;font-weight:600;margin-top:6px}
        .alog .lok{color:#6ee7b7} .alog .ler{color:#fca5a5} .alog .ldup{color:#fcd34d} .alog .linf{color:#cbd5e1}
        .alog::-webkit-scrollbar{width:6px}
        .alog::-webkit-scrollbar-thumb{background:#334155;border-radius:6px}

        /* ── Final summary ── */
        .done-card{display:none;margin-top:16px;background:linear-gradient(135deg,var(--ag8),var(--ab8));border:1px solid rgba(5,150,105,.22);border-radius:14px;padding:18px;animation:apop .4s ease both}
        .done-card.vis{display:block}
        .done-top{display:flex;align-items:center;gap:11px;margin-bottom:14px}
        .done-ico{width:38px;height:38px;border-radius:11px;background:var(--ag);color:#fff;display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0}
        .done-top h3{font-size:15px;font-weight:700;margin:0}
        .done-top p{font-size:12px;color:var(--mu);margin:2px 0 0}
        .done-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}
        @media(max-width:560px){.done-grid{grid-template-columns:repeat(2,1fr)}}
        .done-stat{background:var(--card);border:1px solid var(--bd2);border-radius:10px;padding:11px;text-align:center}
        .done-stat .n{font-size:21px;font-weight:700;font-family:'DM Mono',monospace;color:var(--tx);letter-spacing:-.4px}
        .done-stat .l{font-size:10px;color:var(--mu);margin-top:3px;font-weight:600}

        @keyframes afd{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes afu{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes apop{from{transform:scale(.98);opacity:0}to{transform:scale(1);opacity:1}}
    `).appendTo('head');

    $(wrapper).find('.page-content').html(`
    <div class="att-root"><div class="att-wrap">
        <div class="ah">
            <div class="ahl">
                <div class="ai">🖐</div>
                <div>
                    <h1>Import Attendance</h1>
                    <p>Upload the fingerprint CSV — check-ins, attendance, shifts &amp; leave run in one click</p>
                </div>
            </div>
            <button id="att-new-btn">↺ New Import</button>
        </div>

        <div class="ag2">
            <!-- Upload -->
            <div class="ac">
                <div class="act"><span class="num-badge">1</span> Upload File</div>
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
                    Open the Employee record → set the <b>Fingerprint ID</b> field → re-upload.
                    <div class="apl" id="att-wp"></div>
                </div>
                <div class="aal info" id="att-noshift-note"></div>
            </div>

            <!-- Summary -->
            <div class="ac">
                <div class="act"><span class="num-badge">2</span> Ready to Process</div>
                <div id="att-summary-empty" class="empty-hint">
                    <span class="eh-ic">📄</span>
                    <p>Upload a CSV to see the summary</p>
                </div>
                <div class="asr" id="att-summary" style="display:none">
                    <div class="atile hl"><div class="anum b" id="sC">—</div><div class="albl">Check-in Punches</div></div>
                    <div class="atile"><div class="anum" id="sE">—</div><div class="albl">Employees in CSV</div></div>
                    <div class="atile"><div class="anum g" id="sM">—</div><div class="albl">Auto-Matched</div></div>
                    <div class="atile"><div class="anum a" id="sS">—</div><div class="albl">No Fingerprint ID</div></div>
                </div>
            </div>
        </div>

        <!-- Preview -->
        <div class="aprev" id="att-prev">
            <div class="ac">
                <div class="aprevh">
                    <h2>👥 Employee Mapping &amp; Shift Preview</h2>
                    <input class="asrch" id="att-srch" placeholder="🔍 Search name or ID...">
                </div>
                <div class="atabs">
                    <div class="atab on" data-tab="all">All</div>
                    <div class="atab" data-tab="matched">✓ Matched</div>
                    <div class="atab" data-tab="unmapped">⚠ Not Mapped</div>
                    <div class="atab" data-tab="noshift">⚡ No Shift</div>
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

        <!-- Run panel -->
        <div class="arun" id="att-run-panel" style="display:none">
            <div class="ac">
                <button class="run-btn" id="att-run" disabled>
                    <span class="run-ico">▶</span><span class="run-lbl">Run Import &amp; Mark Attendance</span>
                </button>
                <div class="run-hint">One click runs all four steps automatically, in order.</div>

                <!-- Pipeline -->
                <div class="pipe" id="att-pipe">
                    <div class="pipe-head">
                        <h2>⚙️ Processing Pipeline</h2>
                        <div class="pipe-meta">
                            <span class="pipe-step-pill" id="att-pipe-step">Step 0 / 4</span>
                            <span id="att-timer">0.0s</span>
                        </div>
                    </div>

                    <div class="stg wait" id="stg1">
                        <div class="stg-rail"><div class="stg-node" id="stg1-node">1</div><div class="stg-line"></div></div>
                        <div class="stg-body">
                            <div class="stg-top"><div class="stg-title">Import Check-ins</div><div class="stg-state" id="stg1-state">Waiting</div></div>
                            <div class="stg-sub">Insert every fingerprint punch as an Employee Check-in</div>
                            <div class="stg-bar"><div class="stg-fill" id="stg1-fill"></div></div>
                            <div class="stg-chips" id="stg1-chips"></div>
                        </div>
                    </div>

                    <div class="stg wait" id="stg2">
                        <div class="stg-rail"><div class="stg-node" id="stg2-node">2</div><div class="stg-line"></div></div>
                        <div class="stg-body">
                            <div class="stg-top"><div class="stg-title">Mark Attendance</div><div class="stg-state" id="stg2-state">Waiting</div></div>
                            <div class="stg-sub">Create attendance, auto-detect day-team shifts &amp; overtime</div>
                            <div class="stg-bar"><div class="stg-fill" id="stg2-fill"></div></div>
                            <div class="stg-chips" id="stg2-chips"></div>
                        </div>
                    </div>

                    <div class="stg wait" id="stg3">
                        <div class="stg-rail"><div class="stg-node" id="stg3-node">3</div><div class="stg-line"></div></div>
                        <div class="stg-body">
                            <div class="stg-top"><div class="stg-title">Fill Absent Days</div><div class="stg-state" id="stg3-state">Waiting</div></div>
                            <div class="stg-sub">Mark working days that have no punch as Absent</div>
                            <div class="stg-bar"><div class="stg-fill" id="stg3-fill"></div></div>
                            <div class="stg-chips" id="stg3-chips"></div>
                        </div>
                    </div>

                    <div class="stg wait" id="stg4">
                        <div class="stg-rail"><div class="stg-node" id="stg4-node">4</div><div class="stg-line"></div></div>
                        <div class="stg-body">
                            <div class="stg-top"><div class="stg-title">Auto Leave Assignment</div><div class="stg-state" id="stg4-state">Waiting</div></div>
                            <div class="stg-sub">Spend Casual → Annual → LWP on absent days</div>
                            <div class="stg-bar"><div class="stg-fill" id="stg4-fill"></div></div>
                            <div class="stg-chips" id="stg4-chips"></div>
                        </div>
                    </div>
                </div>

                <!-- Log -->
                <div class="logwrap" id="att-logwrap">
                    <div class="log-head">
                        <span>📋 Activity Log</span>
                        <span class="log-toggle" id="att-log-toggle">Hide</span>
                    </div>
                    <div class="alog" id="att-log"></div>
                </div>

                <!-- Final summary -->
                <div class="done-card" id="att-done">
                    <div class="done-top">
                        <div class="done-ico">✓</div>
                        <div>
                            <h3>Attendance imported successfully</h3>
                            <p id="att-done-sub">All steps completed.</p>
                        </div>
                    </div>
                    <div class="done-grid">
                        <div class="done-stat"><div class="n" id="d-checkins">0</div><div class="l">Check-ins</div></div>
                        <div class="done-stat"><div class="n" id="d-attendance">0</div><div class="l">Attendance</div></div>
                        <div class="done-stat"><div class="n" id="d-absent">0</div><div class="l">Absent Filled</div></div>
                        <div class="done-stat"><div class="n" id="d-leave">0</div><div class="l">Leave Assigned</div></div>
                    </div>
                </div>
            </div>
        </div>
    </div></div>
    `);

    // ── State ────────────────────────────────────────────────────────────────
    let empInfo = {}, empMap = {}, shiftMap = {}, checkins = [], empDates = [];
    let curTab = 'all', curSearch = '';
    let running = false;
    let runStart = 0, timerId = null;

    const BATCH_SIZE     = 100;
    const ATT_BATCH_SIZE = 50;

    // ── Helpers ──────────────────────────────────────────────────────────────
    const $id = id => document.getElementById(id);
    function setNum(id, val, cls) { const el = $id(id); if (!el) return; el.textContent = val; el.className = 'anum' + (cls ? ' ' + cls : ''); }
    function vis(id, on) { const el = $id(id); if (el) el.classList.toggle('vis', !!on); }
    function show(id, on) { const el = $id(id); if (el) el.style.display = on ? '' : 'none'; }
    function call(method, args) {
        return new Promise((resolve, reject) =>
            frappe.call({ method, args, callback: r => resolve(r.message), error: e => reject(e) }));
    }

    // Activity log (dark console)
    function log(cls, msg) {
        const el = $id('att-log'); if (!el) return;
        const line = document.createElement('div');
        line.className = cls; line.textContent = msg;
        el.appendChild(line); el.scrollTop = el.scrollHeight;
    }
    function logHead(msg) { log('lhd', msg); }

    // Stage controls
    function stageState(id, cls, text) {
        const stg = $id('stg' + id); if (!stg) return;
        stg.className = 'stg ' + cls;
        const st = $id(`stg${id}-state`); if (st && text != null) st.textContent = text;
        const node = $id(`stg${id}-node`);
        if (node) {
            if (cls === 'run')       node.innerHTML = '<span class="spin"></span>';
            else if (cls === 'done') node.textContent = '✓';
            else if (cls === 'error')node.textContent = '✕';
            else if (cls === 'skip') node.textContent = '–';
            else                     node.textContent = id;
        }
    }
    function stageProgress(id, pct) { const el = $id(`stg${id}-fill`); if (el) el.style.width = pct + '%'; }
    function stageChips(id, chips) {
        const el = $id(`stg${id}-chips`); if (!el) return;
        el.innerHTML = chips
            .filter(c => c.val !== undefined && c.val !== null)
            .map(c => `<span class="chip ${c.cls || ''}">${c.val} <em>${c.label}</em></span>`)
            .join('');
    }
    function pipeStep(n) { const el = $id('att-pipe-step'); if (el) el.textContent = `Step ${n} / 4`; }

    // Elapsed timer
    function startTimer() {
        runStart = Date.now();
        timerId = setInterval(() => {
            $id('att-timer').textContent = ((Date.now() - runStart) / 1000).toFixed(1) + 's';
        }, 100);
    }
    function stopTimer() { clearInterval(timerId); timerId = null; }

    // ── Preview filtering / tabs ─────────────────────────────────────────────
    function applyFilter() {
        const q = curSearch.toLowerCase();
        document.querySelectorAll('#att-tb tr').forEach(tr => {
            const s = (tr.dataset.search || '').toLowerCase();
            const t = tr.dataset.type || '';
            const tok = curTab === 'all' || t === curTab;
            const sok = !q || s.includes(q);
            tr.classList.toggle('hide', !(tok && sok));
        });
    }
    document.querySelectorAll('.atab').forEach(tab => tab.addEventListener('click', function() {
        curTab = this.dataset.tab;
        document.querySelectorAll('.atab').forEach(t => t.classList.remove('on'));
        this.classList.add('on');
        applyFilter();
    }));
    $id('att-srch').addEventListener('input', function() { curSearch = this.value; applyFilter(); });
    $id('att-log-toggle').addEventListener('click', function() {
        const lg = $id('att-log');
        const hidden = lg.classList.toggle('collapsed');
        this.textContent = hidden ? 'Show' : 'Hide';
    });

    // ── Reset ────────────────────────────────────────────────────────────────
    function resetPage() {
        if (running) return;
        empInfo = {}; empMap = {}; shiftMap = {}; checkins = []; empDates = [];
        curTab = 'all'; curSearch = '';

        $id('att-dz').classList.remove('adz-off');
        const oldFi = $id('att-fi');
        const newFi = oldFi.cloneNode(true);
        oldFi.parentNode.replaceChild(newFi, oldFi);
        newFi.addEventListener('change', e => handleFile(e.target.files[0]));

        vis('att-fb', false); vis('att-warn', false); vis('att-noshift-note', false);
        vis('att-prev', false);
        $id('att-wp').innerHTML = '';
        $id('att-noshift-note').innerHTML = '';
        $id('att-fn').textContent = '—'; $id('att-fm').textContent = '—';
        $id('att-tb').innerHTML = ''; $id('att-srch').value = '';

        show('att-summary', false); show('att-summary-empty', true);
        setNum('sC', '—', 'b'); setNum('sE', '—'); setNum('sM', '—', 'g'); setNum('sS', '—', 'a');

        // Run panel
        show('att-run-panel', false);
        const rb = $id('att-run');
        rb.disabled = true; rb.classList.remove('done');
        rb.querySelector('.run-ico').textContent = '▶';
        rb.querySelector('.run-lbl').textContent = 'Run Import & Mark Attendance';
        $id('att-pipe').classList.remove('vis');
        $id('att-logwrap').classList.remove('vis');
        $id('att-log').innerHTML = '';
        $id('att-done').classList.remove('vis');
        pipeStep(0); $id('att-timer').textContent = '0.0s';
        [1, 2, 3, 4].forEach(i => { stageState(i, 'wait', 'Waiting'); stageProgress(i, 0); stageChips(i, []); });

        document.querySelectorAll('.atab').forEach(t => t.classList.remove('on'));
        document.querySelector('.atab[data-tab="all"]').classList.add('on');
        $id('att-new-btn').classList.remove('vis');
    }
    $id('att-new-btn').addEventListener('click', resetPage);

    // ── Drop zone ────────────────────────────────────────────────────────────
    const dz = $id('att-dz');
    dz.addEventListener('click', () => { if (!running) $id('att-fi').click(); });
    dz.addEventListener('dragover', e => { if (!running) { e.preventDefault(); dz.classList.add('over'); } });
    dz.addEventListener('dragleave', () => dz.classList.remove('over'));
    dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('over'); if (!running) handleFile(e.dataTransfer.files[0]); });
    $id('att-fi').addEventListener('change', e => handleFile(e.target.files[0]));

    // ── File handling ────────────────────────────────────────────────────────
    function handleFile(file) {
        if (!file || !file.name.endsWith('.csv')) { frappe.msgprint('Please upload a valid .csv file.'); return; }
        // clear any prior run state but keep the new file
        vis('att-prev', false);
        show('att-run-panel', false);
        $id('att-done').classList.remove('vis');
        $id('att-pipe').classList.remove('vis');
        $id('att-logwrap').classList.remove('vis');
        $id('att-log').innerHTML = '';
        [1, 2, 3, 4].forEach(i => { stageState(i, 'wait', 'Waiting'); stageProgress(i, 0); stageChips(i, []); });

        $id('att-fn').textContent = file.name;
        $id('att-fm').textContent = 'Loading employee & shift data...';
        vis('att-fb', true);
        show('att-summary-empty', true); show('att-summary', false);
        setNum('sC', '...', 'b'); setNum('sE', '...'); setNum('sM', '...', 'g'); setNum('sS', '...', 'a');

        const reader = new FileReader();
        reader.onload = e => loadEmployees(() => parseCSV(e.target.result));
        reader.readAsText(file);
    }

    function loadEmployees(cb) {
        frappe.call({
            method: 'frappe.client.get_list',
            args: { doctype: 'Employee', filters: [['status', '=', 'Active']],
                    fields: ['name', 'employee_name', 'custom_fingerprint_id'], limit_page_length: 500 },
            callback: r => {
                empMap = {};
                (r.message || []).forEach(emp => {
                    if (emp.custom_fingerprint_id)
                        empMap[emp.custom_fingerprint_id.toString().trim()] = { id: emp.name, name: emp.employee_name };
                });
                if (cb) cb();
            }
        });
    }

    function parseCSV(text) {
        empInfo = {};
        text.trim().split('\n').slice(1).forEach(line => {
            const cols = line.split(',');
            if (cols.length < 4) return;
            const pid = cols[0].trim().replace(/^'/, '');
            const name = cols[1].trim();
            const time = cols[3].trim();
            if (!pid || !time) return;
            if (!empInfo[pid]) empInfo[pid] = { name, times: [] };
            empInfo[pid].times.push(time);
        });
        const total = Object.keys(empInfo).length;
        const punches = Object.values(empInfo).reduce((s, e) => s + e.times.length, 0);
        $id('att-fm').textContent = punches + ' punches · ' + total + ' employees';
        let firstCsvDate = null;
        for (const info of Object.values(empInfo)) {
            if (info.times.length) {
                const d = info.times[0].split(' ')[0];
                if (!firstCsvDate || d < firstCsvDate) firstCsvDate = d;
            }
        }
        loadShiftInfo(firstCsvDate, () => buildUI());
    }

    function loadShiftInfo(checkDate, cb) {
        const matchedEmpIds = [];
        for (const [pid] of Object.entries(empInfo)) { const m = empMap[pid]; if (m) matchedEmpIds.push(m.id); }
        if (!matchedEmpIds.length) { shiftMap = {}; if (cb) cb(); return; }
        frappe.call({
            method: 'hrms.hr.page.import_attendance.import_attendance.get_employee_shift_info',
            args: { employees: JSON.stringify(matchedEmpIds), check_date: checkDate },
            callback: r => { shiftMap = r.message || {}; if (cb) cb(); },
            error: () => { shiftMap = {}; if (cb) cb(); }
        });
    }

    // Keep EVERY punch (first = IN, rest = OUT). The day-team classifier reads
    // the ~3PM out-punch, so collapsing to first/last would erase it. Device
    // double-taps (same tap within 60s) are dropped.
    function buildCheckins() {
        const byKey = {};
        for (const [pid, info] of Object.entries(empInfo)) {
            const m = empMap[pid]; if (!m) continue;
            info.times.forEach(ts => {
                const key = m.id + '|' + ts.split(' ')[0];
                if (!byKey[key]) byKey[key] = { empId: m.id, times: [] };
                byKey[key].times.push(ts);
            });
        }
        const result = [], edSet = new Set(), edList = [];
        for (const e of Object.values(byKey)) {
            e.times.sort();
            const kept = []; let prevMs = null;
            for (const ts of e.times) {
                const ms = new Date(ts.replace(' ', 'T')).getTime();
                if (prevMs !== null && (ms - prevMs) < 60 * 1000) continue;
                kept.push(ts); prevMs = ms;
            }
            kept.forEach((ts, i) => result.push({ employee: e.empId, log_type: i === 0 ? 'IN' : 'OUT', time: ts }));
            const d = e.times[0].split(' ')[0], key = e.empId + '|' + d;
            if (!edSet.has(key)) { edSet.add(key); edList.push({ employee: e.empId, date: d }); }
        }
        empDates = edList;
        return result;
    }

    function buildUI() {
        checkins = buildCheckins();
        let matched = 0, unmapped = [], noShift = 0;
        const tbody = $id('att-tb'); tbody.innerHTML = '';

        for (const [pid, info] of Object.entries(empInfo)) {
            const m = empMap[pid];
            const days = new Set(info.times.map(ts => ts.split(' ')[0])).size;
            if (m) {
                matched++;
                const si = shiftMap[m.id];
                const shiftCell = si ? `<span class="shift-tag">⏰ ${si.shift_type}</span>` : `<span class="shift-none">— auto-detect</span>`;
                const rowType = si ? 'matched' : 'noshift';
                if (!si) noShift++;
                tbody.innerHTML += `
                <tr data-search="${pid} ${info.name} ${m.id} ${m.name}" data-type="${rowType}">
                    <td><span class="fid">${pid}</span></td>
                    <td style="font-weight:500">${info.name}</td>
                    <td><span class="mono">${info.times.length}</span></td>
                    <td><span class="eid">${m.id}</span><span style="color:var(--mu);font-weight:500">${m.name}</span></td>
                    <td>${shiftCell}</td>
                    <td><span class="mono">${days}</span></td>
                    <td><span class="bm">✓ Matched</span></td>
                </tr>`;
            } else {
                unmapped.push(pid + ' · ' + info.name);
                tbody.innerHTML += `
                <tr data-search="${pid} ${info.name}" data-type="unmapped">
                    <td><span class="fid u">${pid}</span></td>
                    <td style="font-weight:500;color:var(--mu)">${info.name}</td>
                    <td><span class="mono">${info.times.length}</span></td>
                    <td style="color:var(--lt)">— not found</td>
                    <td style="color:var(--lt)">—</td>
                    <td style="color:var(--lt)">—</td>
                    <td><span class="bu">⚠ No FP ID</span></td>
                </tr>`;
            }
        }

        const total = Object.keys(empInfo).length;
        show('att-summary-empty', false); show('att-summary', true);
        setNum('sC', checkins.length, 'b');
        setNum('sE', total, '');
        setNum('sM', matched, 'g');
        setNum('sS', total - matched, total - matched > 0 ? 'a' : 'g');

        if (unmapped.length) {
            $id('att-wp').innerHTML = unmapped.map(u => `<span class="ap">${u}</span>`).join('');
            vis('att-warn', true);
        } else { vis('att-warn', false); }

        if (noShift > 0) {
            $id('att-noshift-note').innerHTML =
                `<strong>ℹ️ ${noShift} day-team member(s) have no manual roster</strong>
                 Their shift (Target 8–3 vs Normal 8–5) is auto-detected from the punch pattern during Step 2.`;
            vis('att-noshift-note', true);
        } else { vis('att-noshift-note', false); }

        vis('att-prev', true);
        show('att-run-panel', true);
        $id('att-run').disabled = checkins.length === 0;
        $id('att-new-btn').classList.add('vis');
        curTab = 'all'; curSearch = '';
        document.querySelectorAll('.atab').forEach(t => t.classList.remove('on'));
        document.querySelector('.atab[data-tab="all"]').classList.add('on');
        applyFilter();
    }

    // ── Stage runners ────────────────────────────────────────────────────────
    async function runCheckinImport() {
        const totalBatches = Math.ceil(checkins.length / BATCH_SIZE);
        let done = 0, dups = 0, errs = 0;
        for (let b = 0; b < totalBatches; b++) {
            const batch = checkins.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
            stageState(1, 'run', `Batch ${b + 1} / ${totalBatches}`);
            try {
                const res = await call('hrms.hr.page.import_attendance.import_attendance.bulk_insert_checkins',
                    { checkins: JSON.stringify(batch) });
                done += res.inserted || 0; dups += res.duplicates || 0; errs += res.errors || 0;
                log('linf', `Stage 1 · batch ${b + 1}/${totalBatches} → ${res.inserted} inserted, ${res.duplicates} dup, ${res.errors} err`);
                (res.error_details || []).forEach(ed => log('ler', `   ✗ ${ed.employee} ${ed.time} — ${ed.error}`));
            } catch (e) {
                errs += batch.length;
                log('ler', `Stage 1 · batch ${b + 1} failed: ${(e && e.message) || 'server error'}`);
            }
            stageProgress(1, Math.round((b + 1) / totalBatches * 100));
            setNum('sC', done, 'b');
        }
        stageChips(1, [
            { label: 'imported', val: done, cls: 'g' },
            { label: 'skipped', val: dups, cls: dups ? 'a' : '' },
            { label: 'errors', val: errs, cls: errs ? 'r' : '' }
        ]);
        return { done, dups, errs };
    }

    async function runAttendance() {
        const totalBatches = Math.ceil(empDates.length / ATT_BATCH_SIZE);
        let created = 0, updated = 0, skipped = 0, errors = 0;
        for (let b = 0; b < totalBatches; b++) {
            const batch = empDates.slice(b * ATT_BATCH_SIZE, (b + 1) * ATT_BATCH_SIZE);
            stageState(2, 'run', `Batch ${b + 1} / ${totalBatches}`);
            try {
                const res = await call('hrms.hr.page.import_attendance.import_attendance.process_attendance_for_employees',
                    { employee_dates: JSON.stringify(batch) });
                created += res.created || 0; updated += res.updated || 0;
                skipped += res.skipped || 0; errors += res.errors || 0;
                log('linf', `Stage 2 · batch ${b + 1}/${totalBatches} → ${res.created} created, ${res.updated} updated, ${res.skipped} skipped, ${res.errors} err`);
                (res.error_details || []).forEach(ed => log('ler', `   ✗ ${ed.employee} ${ed.date} — ${ed.error}`));
            } catch (e) {
                errors += batch.length;
                log('ler', `Stage 2 · batch ${b + 1} failed: ${(e && e.message) || 'server error'}`);
            }
            stageProgress(2, Math.round((b + 1) / totalBatches * 100));
        }
        stageChips(2, [
            { label: 'created', val: created, cls: 'g' },
            { label: 'updated', val: updated, cls: '' },
            { label: 'skipped', val: skipped, cls: skipped ? 'a' : '' },
            { label: 'errors', val: errors, cls: errors ? 'r' : '' }
        ]);
        return { created, updated, skipped, errors };
    }

    async function runFillAbsent(emps, fromDate, toDate) {
        stageState(3, 'run', 'Scanning…');
        stageProgress(3, 40);
        try {
            const res = await call('hrms.hr.page.import_attendance.import_attendance.mark_unmarked_absent',
                { employees: JSON.stringify(emps), from_date: fromDate, to_date: toDate });
            const m = res || {};
            stageProgress(3, 100);
            log(m.errors ? 'ler' : 'lok',
                `Stage 3 → ${m.created || 0} absent-days created` +
                (m.skipped ? `, ${m.skipped} skipped` : '') + (m.errors ? `, ${m.errors} err` : ''));
            stageChips(3, [
                { label: 'filled', val: m.created || 0, cls: 'g' },
                { label: 'skipped', val: m.skipped || 0, cls: m.skipped ? 'a' : '' },
                { label: 'errors', val: m.errors || 0, cls: m.errors ? 'r' : '' }
            ]);
            return m;
        } catch (e) {
            stageProgress(3, 100);
            log('ler', `Stage 3 failed: ${(e && e.message) || 'server error'}`);
            return { created: 0, errors: 1 };
        }
    }

    async function runAutoLeave(fromDate, toDate) {
        stageState(4, 'run', 'Processing…');
        stageProgress(4, 40);
        try {
            const res = await call('auto_leave_assignment.api.dashboard_api.run_manual_processing',
                { from_date: fromDate, to_date: toDate });
            const m = res || {};
            stageProgress(4, 100);
            if (typeof m.assigned !== 'undefined') {
                log(m.errors ? 'ler' : 'lok',
                    `Stage 4 → ${m.assigned} leave assigned, ${m.skipped} skipped` + (m.errors ? `, ${m.errors} err` : ''));
                stageChips(4, [
                    { label: 'assigned', val: m.assigned || 0, cls: 'g' },
                    { label: 'skipped', val: m.skipped || 0, cls: m.skipped ? 'a' : '' },
                    { label: 'errors', val: m.errors || 0, cls: m.errors ? 'r' : '' }
                ]);
            } else {
                log('lok', 'Stage 4 → Auto Leave Assignment complete');
                stageChips(4, [{ label: 'done', val: '✓', cls: 'g' }]);
            }
            return m;
        } catch (e) {
            stageProgress(4, 100);
            log('ler', `Stage 4 failed: ${(e && e.message) || 'server error'} — check Error Log`);
            return { assigned: 0, errors: 1 };
        }
    }

    // ── The pipeline (one click) ─────────────────────────────────────────────
    async function runPipeline() {
        running = true;
        $id('att-dz').classList.add('adz-off');
        $id('att-new-btn').classList.remove('vis');
        $id('att-done').classList.remove('vis');
        const rb = $id('att-run');
        rb.disabled = true;
        rb.querySelector('.run-ico').innerHTML = '<span class="spin"></span>';
        rb.querySelector('.run-lbl').textContent = 'Running…';
        $id('att-pipe').classList.add('vis');
        $id('att-logwrap').classList.add('vis');
        $id('att-log').innerHTML = '';
        startTimer();

        // Stage 1 — check-ins
        pipeStep(1);
        logHead('▸ STAGE 1 — Import Check-ins');
        const s1 = await runCheckinImport();
        stageState(1, s1.errs ? 'error' : 'done', s1.errs ? `Done · ${s1.errs} errors` : 'Done');

        // Stage 2 — attendance
        pipeStep(2);
        logHead('▸ STAGE 2 — Mark Attendance');
        const s2 = await runAttendance();
        stageState(2, s2.errors ? 'error' : 'done', s2.errors ? `Done · ${s2.errors} errors` : 'Done');

        const touched = (s2.created + s2.updated) > 0;
        const dates = empDates.map(e => e.date).sort();
        const fromDate = dates[0], toDate = dates[dates.length - 1];
        const matchedEmps = [...new Set(empDates.map(e => e.employee))];

        // Stage 3 — fill absent
        pipeStep(3);
        let s3 = { created: 0 };
        if (touched) {
            logHead('▸ STAGE 3 — Fill Absent Days');
            s3 = await runFillAbsent(matchedEmps, fromDate, toDate);
            stageState(3, s3.errors ? 'error' : 'done', s3.errors ? `Done · ${s3.errors} errors` : 'Done');
        } else {
            stageState(3, 'skip', 'Skipped');
            stageChips(3, [{ label: 'no new attendance', val: '—' }]);
            log('ldup', 'Stage 3 → skipped (no new attendance to reconcile)');
        }

        // Stage 4 — auto leave
        pipeStep(4);
        let s4 = { assigned: 0 };
        if (touched) {
            logHead('▸ STAGE 4 — Auto Leave Assignment');
            s4 = await runAutoLeave(fromDate, toDate);
            stageState(4, s4.errors ? 'error' : 'done', s4.errors ? `Done · ${s4.errors} errors` : 'Done');
        } else {
            stageState(4, 'skip', 'Skipped');
            stageChips(4, [{ label: 'no new attendance', val: '—' }]);
            log('ldup', 'Stage 4 → skipped (no new attendance to process)');
        }

        // Finish
        stopTimer();
        const elapsed = ((Date.now() - runStart) / 1000).toFixed(1);
        running = false;

        const totalErr = s1.errs + s2.errors + (s3.errors || 0) + (s4.errors || 0);
        logHead(`✓ PIPELINE COMPLETE — ${elapsed}s` + (totalErr ? ` · ${totalErr} error(s)` : ''));

        rb.disabled = false;
        rb.classList.add('done');
        rb.querySelector('.run-ico').textContent = '✓';
        rb.querySelector('.run-lbl').textContent = 'Completed — Run Again';

        $id('d-checkins').textContent = s1.done;
        $id('d-attendance').textContent = (s2.created + s2.updated);
        $id('d-absent').textContent = (s3.created || 0);
        $id('d-leave').textContent = (s4.assigned || 0);
        $id('att-done-sub').textContent =
            `${s1.done} check-ins · ${s2.created + s2.updated} attendance · ${s3.created || 0} absent filled · ${s4.assigned || 0} leave assigned — in ${elapsed}s`
            + (totalErr ? ` · ${totalErr} error(s), see log` : '');
        $id('att-done').classList.add('vis');
        $id('att-dz').classList.remove('adz-off');
        $id('att-new-btn').classList.add('vis');

        frappe.show_alert({
            message: `✅ Attendance import complete — ${s2.created + s2.updated} attendance, ${s4.assigned || 0} leave`,
            indicator: totalErr > 0 ? 'orange' : 'green'
        }, 6);
    }

    // ── Run button (one click, single confirm) ───────────────────────────────
    $id('att-run').addEventListener('click', function() {
        if (running || !checkins.length) { if (!running) resetPage(); return; }
        // if it was already completed, allow a re-run
        this.classList.remove('done');
        this.querySelector('.run-ico').textContent = '▶';
        this.querySelector('.run-lbl').textContent = 'Run Import & Mark Attendance';

        frappe.confirm(
            `<div style="font-size:13px;line-height:1.7">
                Run the full attendance pipeline? This executes automatically, step by step:
                <ol style="margin:8px 0 0;padding-left:20px;color:var(--text-muted,#667085)">
                    <li>Import <b>${checkins.length}</b> check-in punches</li>
                    <li>Mark attendance for <b>${empDates.length}</b> employee-days <span style="color:var(--text-light,#98a2b3)">(day-team shifts auto-detected)</span></li>
                    <li>Fill in absent working days</li>
                    <li>Run auto leave assignment</li>
                </ol>
             </div>`,
            () => runPipeline()
        );
    });
};
