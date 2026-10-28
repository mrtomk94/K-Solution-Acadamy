/* K-Solution Academy — VirtualControlStudio (LogixSim) in the browser.
   Runs the real VirtualControlStudio Python engine with Pyodide (WebAssembly).
   The Studio page talks to "/api/..." exactly like the desktop build; this file
   answers those calls in-process (fetch + WebSocket shims) and drives the scan
   engine with a timer. Projects saved in Studio stay in this browser (IndexedDB). */
(function () {
  "use strict";
  const BASE = new URL(".", document.currentScript.src).href;
  const qs = new URLSearchParams(location.search);
  const VI = (qs.get("lang") || localStorage.getItem("ks_lang") || navigator.language || "").toLowerCase().startsWith("vi");
  const T = (en, vi) => (VI ? vi : en);
  let W = null, PY = null, FS = null;
  let readyResolve; const ready = new Promise(r => (readyResolve = r));
  window.VCS = { ready, base: BASE };

  /* ---------- loading overlay ---------- */
  const css = `#ksBoot{position:fixed;inset:0;z-index:99999;background:#0b1424;color:#e8eef8;display:flex;align-items:center;justify-content:center;font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
#ksBoot .card{width:min(560px,calc(100vw - 32px));background:#121e33;border:1px solid #24375a;border-radius:14px;padding:26px 24px;box-shadow:0 20px 60px #0008}
#ksBoot h1{margin:0 0 4px;font-size:22px}#ksBoot .sub{color:#9fb2d0;margin:0 0 18px;font-size:13px}
#ksBoot .bar{height:8px;background:#1c2b47;border-radius:6px;overflow:hidden}#ksBoot .bar i{display:block;height:100%;width:3%;background:linear-gradient(90deg,#1c58cf,#36c48a);transition:width .3s}
#ksBoot .msg{margin-top:10px;color:#b9c8df;font-size:13px;min-height:1.4em}
#ksBoot .picks{display:grid;gap:10px;margin-top:6px}#ksBoot .picks button{all:unset;cursor:pointer;display:block;padding:12px 14px;border:1px solid #2b4170;border-radius:10px;background:#16264200}
#ksBoot .picks button:hover,#ksBoot .picks button:focus-visible{border-color:#5d8cff;background:#1a2c4d}
#ksBoot .picks b{display:block;font-size:15px}#ksBoot .picks span{color:#9fb2d0;font-size:12.5px}
#ksBoot .err{color:#ff8a8a;white-space:pre-wrap;font:12px ui-monospace,Consolas,monospace;margin-top:10px;max-height:200px;overflow:auto}
#ksBoot .k{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:8px;background:#f5b400;color:#0b1424;font-weight:800;margin-right:10px;vertical-align:middle}
#ksBack{position:fixed;right:10px;bottom:30px;z-index:9999;font:12px system-ui;background:#1c58cf;color:#fff;border-radius:16px;padding:5px 12px;text-decoration:none;box-shadow:0 2px 8px #0004;opacity:.85}#ksBack:hover{opacity:1}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const ov = document.createElement("div"); ov.id = "ksBoot";
  ov.innerHTML = `<div class="card"><h1><span class="k">K</span>LogixSim Studio</h1>
<p class="sub">${T("K-Solution Academy virtual PLC — runs right in your browser, nothing to install.", "PLC ảo của K-Solution Academy — chạy ngay trên trình duyệt, không cần cài đặt.")}</p>
<div id="ksBody"><div class="bar"><i id="ksBar"></i></div><div class="msg" id="ksMsg">${T("Starting…", "Đang khởi động…")}</div></div></div>`;
  const mount = () => document.body ? document.body.appendChild(ov) : setTimeout(mount, 5);
  mount();
  const step = (pct, m) => { const b = document.getElementById("ksBar"), t = document.getElementById("ksMsg"); if (b) b.style.width = pct + "%"; if (t) t.textContent = m; };
  const fail = (e) => { const b = document.getElementById("ksBody"); if (b) b.innerHTML += `<div class="err">${String(e && (e.stack || e.message) || e).replace(/</g, "&lt;")}</div>`; console.error(e); };

  /* ---------- fetch shim ---------- */
  const realFetch = window.fetch.bind(window);
  const apiPath = (u) => { const i = u.pathname.indexOf("/api/"); return u.origin === location.origin && i >= 0 ? u.pathname.slice(i) : null; };
  async function toBytes(b) {
    if (b == null) return new Uint8Array();
    if (typeof b === "string") return new TextEncoder().encode(b);
    if (b instanceof ArrayBuffer) return new Uint8Array(b);
    if (ArrayBuffer.isView(b)) return new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
    if (b instanceof Blob) return new Uint8Array(await b.arrayBuffer());
    if (b instanceof URLSearchParams) return new TextEncoder().encode(b.toString());
    return new TextEncoder().encode(String(b));
  }
  let saveTimer = null;
  function persistSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(() => FS && FS.syncfs(false, e => e && console.warn("save to browser storage:", e)), 400); }
  async function callApi(method, path, search, headers, body) {
    await ready;
    const h = PY.toPy(headers || {}), b = PY.toPy(body);
    const res = await W.http(method, path, search, h, b);
    h.destroy(); b.destroy();
    const a = res.toJs({ dict_converter: Object.fromEntries }); res.destroy();
    if (method !== "GET" && /\/project\/(save|new|open|upload)|\/import/.test(path)) persistSoon();
    return a;
  }
  window.fetch = async function (input, init) {
    init = init || {};
    const req = input instanceof Request ? input : null;
    const u = new URL(req ? req.url : String(input), location.href);
    const p = apiPath(u);
    if (!p) return realFetch(input, init);
    const method = (init.method || (req && req.method) || "GET").toUpperCase();
    const hdr = {}; new Headers(init.headers || (req && req.headers) || {}).forEach((v, k) => (hdr[k] = v));
    const body = await toBytes(init.body !== undefined ? init.body : (req && method !== "GET" ? await req.arrayBuffer() : null));
    const [status, ctype, data, extra] = await callApi(method, p, u.search.replace(/^\?/, ""), hdr, body);
    const headers = new Headers(Object.assign({ "content-type": ctype || "application/json" }, extra || {}));
    return new Response(status === 204 ? null : data, { status, headers });
  };

  /* links such as <a href="/api/studio/export" download> → download through the shim */
  document.addEventListener("click", async (e) => {
    const a = e.target.closest && e.target.closest("a[href]"); if (!a) return;
    const u = new URL(a.getAttribute("href"), location.href); if (!apiPath(u)) return;
    e.preventDefault();
    const r = await window.fetch(u.href); const blob = await r.blob();
    let name = a.getAttribute("download") || "";
    const cd = r.headers.get("content-disposition") || ""; const m = /filename="?([^";]+)/i.exec(cd);
    if (!name && m) name = m[1]; if (!name) name = u.pathname.split("/").pop() || "download";
    const x = document.createElement("a"); x.href = URL.createObjectURL(blob); x.download = name; document.body.appendChild(x); x.click();
    setTimeout(() => { URL.revokeObjectURL(x.href); x.remove(); }, 1000);
  }, true);

  /* ---------- WebSocket shim (/api/v1/ws and /ws) ---------- */
  const RealWS = window.WebSocket;
  class LocalWS {
    constructor(url) {
      this.url = url; this.readyState = 0; this.onopen = this.onmessage = this.onclose = this.onerror = null; this._l = {};
      const u = new URL(url.replace(/^ws/, "http"));
      const i = u.pathname.indexOf("/api/v1/ws"); const path = i >= 0 ? u.pathname.slice(i) : "/ws";
      ready.then(() => {
        const send = (text) => {
          if (text === null || text === undefined) { this._close(); return; }
          setTimeout(() => this._emit("message", { data: String(text) }), 0);
        };
        this._send = send;
        this._sock = W.ws_open(path, u.search.replace(/^\?/, ""), send);
        if (!this._sock) { this._close(); return; }
        this.readyState = 1; this._emit("open", {});
      }).catch(e => { this._emit("error", e); this._close(); });
    }
    _emit(k, ev) { const f = this["on" + k]; if (f) f.call(this, ev); (this._l[k] || []).forEach(g => g.call(this, ev)); }
    addEventListener(k, f) { (this._l[k] = this._l[k] || []).push(f); }
    removeEventListener(k, f) { this._l[k] = (this._l[k] || []).filter(g => g !== f); }
    send(text) { if (this.readyState === 1 && this._sock) this._sock.feed(String(text)); }
    close() { if (this._sock) { try { this._sock.disconnect(); } catch (e) {} } this._close(); }
    _close() { if (this.readyState === 3) return; this.readyState = 3; this._emit("close", { code: 1000 }); }
  }
  LocalWS.CONNECTING = 0; LocalWS.OPEN = 1; LocalWS.CLOSING = 2; LocalWS.CLOSED = 3;
  window.WebSocket = function (url, protocols) {
    const u = new URL(String(url).replace(/^ws/, "http"), location.href);
    if (u.host === location.host && /\/api\/v1\/ws$|\/ws$/.test(u.pathname)) return new LocalWS(String(url));
    return new RealWS(url, protocols);
  };
  Object.assign(window.WebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });

  /* ---------- project picker ---------- */
  const EXAMPLES = [
    ["KS_P10_Conveyor.L5X", T("Conveyor station (KS_P10)", "Trạm băng tải (KS_P10)"), T("Start/Stop seal-in, HOA, photo-eye box count, jam timer, VFD speed, HMI tags.", "Tự giữ Start/Stop, HOA, đếm hộp bằng cảm biến, timer kẹt hàng, tốc độ VFD, tag HMI.")],
    ["KS_P20_ADU_House.L5X", T("ADU house (KS_P20)", "Nhà ADU (KS_P20)"), T("Room lights, porch light on daylight sensor, bath fan run-on timer, smoke alarm latch + horn.", "Đèn các phòng, đèn hiên theo cảm biến ngày/đêm, timer quạt phòng tắm, chốt báo khói + còi.")],
    ["Line1.L5X", T("VirtualControlStudio demo (Line1)", "Project mẫu VirtualControlStudio (Line1)"), T("Small sample with ladder + Structured Text routines.", "Mẫu nhỏ có routine ladder và Structured Text.")],
  ];
  function picker(hasSaved) {
    return new Promise((resolve) => {
      const b = document.getElementById("ksBody");
      b.innerHTML = `<p class="sub" style="margin:0 0 10px">${T("Choose a project to open:", "Chọn project để mở:")}</p><div class="picks">
${EXAMPLES.map(([f, n, d]) => `<button data-f="${f}"><b>${n}</b><span>${d}</span></button>`).join("")}
<button data-f="__file"><b>${T("Import my own L5X…", "Nhập file L5X của tôi…")}</b><span>${T("Export from Studio 5000 (File → Save As → .L5X) and open it here.", "Xuất từ Studio 5000 (File → Save As → .L5X) rồi mở ở đây.")}</span></button>
${hasSaved ? `<button data-f="__keep"><b>${T("Projects saved in this browser", "Project đã lưu trong trình duyệt")}</b><span>${T("Open Studio, then File → Open.", "Mở Studio, rồi File → Open.")}</span></button>` : ""}
<button data-f="__new"><b>${T("New empty project", "Project trống")}</b><span>MainTask → MainProgram → MainRoutine</span></button></div>
<input type="file" id="ksFile" accept=".L5X,.l5x,.xml" hidden>`;
      b.querySelectorAll("button[data-f]").forEach(x => x.onclick = () => {
        const f = x.dataset.f;
        if (f === "__file") { const i = document.getElementById("ksFile"); i.onchange = async () => { const file = i.files[0]; if (file) resolve({ name: file.name, data: new Uint8Array(await file.arrayBuffer()) }); }; i.click(); }
        else resolve(f);
      });
    });
  }

  /* ---------- boot ---------- */
  async function boot() {
    step(5, T("Loading the Python engine (first time ~15 MB, then cached)…", "Đang tải bộ máy Python (lần đầu ~15 MB, sau đó dùng cache)…"));
    await new Promise((res, rej) => { const s = document.createElement("script"); s.src = BASE + "pyodide/pyodide.js"; s.onload = res; s.onerror = () => rej(new Error("pyodide.js not found")); document.head.appendChild(s); });
    PY = await loadPyodide({ indexURL: BASE + "pyodide/", stdout: (t) => console.log("[py]", t), stderr: (t) => console.warn("[py]", t) });
    FS = PY.FS;
    step(55, T("Loading VirtualControlStudio…", "Đang nạp VirtualControlStudio…"));
    const zip = new Uint8Array(await (await realFetch(BASE + "vcs_py.zip", { cache: "no-cache" })).arrayBuffer());
    PY.unpackArchive(zip, "zip", { extractDir: "/home/pyodide/vcs" });
    // projects saved in Studio persist in this browser
    const home = "/home/pyodide/VirtualControlStudio";
    try { FS.mkdirTree(home); FS.mount(FS.filesystems.IDBFS, {}, home); await new Promise(r => FS.syncfs(true, r)); } catch (e) { console.warn("browser storage unavailable", e); }
    let hasSaved = false; try { hasSaved = FS.readdir(home).some(n => /\.vcsproj$/i.test(n)); } catch (e) {}
    step(75, T("Starting the soft PLC…", "Đang khởi động PLC ảo…"));
    PY.runPython("import sys; sys.path.insert(0, '/home/pyodide/vcs')");
    await PY.runPythonAsync("import vcs_web");
    W = PY.pyimport("vcs_web");
    setInterval(() => { try { W.tick(); } catch (e) { console.error(e); } }, 10);
    step(100, T("Ready", "Sẵn sàng"));

    let choice = qs.get("l5x");
    if (!choice) choice = await picker(hasSaved);
    if (choice && typeof choice === "object") W.load_l5x(PY.toPy(choice.data), choice.name);
    else if (choice === "__new") await W.http("POST", "/api/studio/project/new", "", PY.toPy({}), PY.toPy(new TextEncoder().encode('{"name":"MyProject"}')));
    else if (choice && choice !== "__keep") {
      const name = choice.split("/").pop();
      const r = await realFetch(new URL(/^https?:|\//.test(choice) ? choice : "examples/" + choice, BASE).href);
      if (!r.ok) throw new Error("cannot load " + choice);
      W.load_l5x(PY.toPy(new Uint8Array(await r.arrayBuffer())), name);
    }
    if (qs.get("run") === "1") await W.http("POST", "/api/v1/run", "", PY.toPy({}), PY.toPy(new Uint8Array()));
    readyResolve();
    ov.remove();
    /* serve the 3D Lab / HMI Lab of the virtual class (same site, other tab) */
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel("ks-logixsim");
      bc.onmessage = (e) => { const m = e.data || {}; if (!m.id) return;
        try { const w = PY.toPy(m.write || {}), r = PY.toPy(m.read || []);
          const out = JSON.parse(W.bridge(w, r)); w.destroy(); r.destroy(); out.re = m.id; bc.postMessage(out); }
        catch (err) { bc.postMessage({ re: m.id, error: String(err.message || err).slice(0, 300) }); } };
    }
    const back = document.createElement("a"); back.id = "ksBack"; back.href = qs.get("back") || "../index.html#c-logixsim";
    back.textContent = T("← Virtual class", "← Lớp học ảo"); document.body.appendChild(back);
  }
  boot().catch(fail);
})();
