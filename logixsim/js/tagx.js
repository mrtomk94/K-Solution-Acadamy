"use strict";
/* Tag structure and monitoring (0.14.0):
   - values of members, elements, bits of integers (Word.3) and indirect references
     (Station[Idx].Ready) everywhere the page shows a value (ladder, Properties, Watch);
   - a hover card on ladder operands and Structured Text tags: value, data type,
     description (members pass their data type's or base tag's description through);
   - "Monitor" from the logic expands the tag down to the member and highlights it;
   - Edit Tags: drill down into arrays and structures (UDT members with descriptions);
   - New Tag: a data type browser, TYPE[dims] typing and style choices that fit the type. */

(function(){
const css = document.createElement("style");
css.textContent = `
#hoverTip{position:fixed;z-index:80;max-width:380px;background:var(--pane);color:var(--ink);border:1px solid var(--line);border-radius:6px;
  box-shadow:0 6px 18px rgba(0,0,0,.22);padding:7px 10px;font-size:12px;pointer-events:none;line-height:1.45}
#hoverTip .ha{font-family:var(--mono);font-weight:600;word-break:break-all}#hoverTip .hv{font-family:var(--mono);font-size:13px;color:var(--acc)}
#hoverTip .hd{color:var(--mut)}#hoverTip .hd.pass{font-style:italic}#hoverTip .hr{color:var(--mut);font-family:var(--mono);font-size:11px}
#hoverTip .hf{color:var(--force);font-weight:700}
.etag td .exp{display:inline-block;width:14px;cursor:pointer;color:var(--mut);font-family:var(--mono)}
.etag tr.mem td{color:var(--mut);background:color-mix(in srgb,var(--pane2) 45%,transparent)}
.etag tr.mem td.mname{color:var(--ink);font-family:var(--mono)}.etag tr.mem td .pass{font-style:italic}
.tsel-pick{position:fixed;z-index:75;background:var(--pane);border:1px solid var(--line);border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,.25);width:300px;max-height:340px;display:flex;flex-direction:column}
.tsel-pick input{margin:6px;font:12px var(--mono)}.tsel-pick .tl{overflow:auto;font-size:12px}
.tsel-pick .tl div{padding:1px 10px;cursor:default;font-family:var(--mono)}.tsel-pick .tl div.g{font-family:system-ui;font-weight:700;color:var(--mut);background:var(--pane2)}
.tsel-pick .tl div.on,.tsel-pick .tl div[data-t]:hover{background:var(--sel)}
.dtwrap{display:flex;gap:4px}.dtwrap input{flex:1}
tr.hit td{animation:hitflash 2.2s ease-out}@keyframes hitflash{0%,40%{background:color-mix(in srgb,var(--acc) 35%,transparent)}100%{background:transparent}}`;
document.head.appendChild(css);
})();

const ATOMIC_T = new Set(["BOOL","SINT","INT","DINT","LINT","USINT","UINT","UDINT","ULINT","REAL","LREAL"]);
if(typeof INT_W!=="undefined") Object.assign(INT_W, {USINT:8, UINT:16, UDINT:32, ULINT:64});

/* ---------- values: members, bits, indirect indexes ---------- */
function idxResolve(addr){
  const pm = /^Program:([^.]+)\./.exec(addr), prog = pm ? pm[1] : (S.R && S.R.prog);
  return addr.replace(/\[([^\]]+)\]/g, (m, inner) => {
    const parts = inner.split(",").map(p => { p = p.trim(); if(/^-?\d+$/.test(p)) return p;
      let v = S.values[p];
      if(v===undefined && prog) v = S.values[`Program:${prog}.${p}`];
      if(v===undefined){ const q = /^Program:[^.]+\.(.*)$/.exec(p); if(q) v = S.values[q[1]]; }
      return typeof v==="number" ? String(Math.trunc(v)) : null; });
    return parts.includes(null) ? m : `[${parts.join(",")}]`; });
}
function valueAt(addr){
  if(addr==null) return undefined;
  if(addr in S.values) return S.values[addr];
  let a = addr;
  if(/\[[^\]]*[A-Za-z_]/.test(a)){ a = idxResolve(a); if(a in S.values) return S.values[a]; }
  const m = /^(.*)\.(\d+)$/.exec(a);
  if(m){ const p = S.values[m[1]]; if(typeof p==="number" && Number.isInteger(p)) return Number((BigInt(p) >> BigInt(+m[2])) & 1n)===1; }
  const s = /^(.*)\.(LEN|DATA\[(\d+)\])$/i.exec(a);                   // members of a STRING (held as text)
  if(s && typeof S.values[s[1]]==="string"){ const txt = S.values[s[1]];
    if(s[3]==null) return txt.length; const i = +s[3]; return i < txt.length ? ((txt.charCodeAt(i) << 24) >> 24) : 0; }
  return undefined;
}
val = valueAt;
if(typeof val2!=="undefined") val2 = valueAt;

/* ---------- descriptions and types from the server (cached a few seconds) ---------- */
S.descr = {};
async function describe(addrs){
  const now = Date.now(), want = [...new Set(addrs)].filter(a => a && !(S.descr[a] && now - S.descr[a].at < 5000));
  if(!want.length) return;
  try { const r = await api("POST", "/api/studio/describe", {addresses: want});
        for(const [a, info] of Object.entries(r.items || {})){ S.descr[a] = {...info, at: Date.now()}; if(info.type) S.addrType[a] = info.type; } }
  catch(e){}
}

/* ---------- hover card ---------- */
let tipT = null, tipFor = null, tipLive = null;
function tipEl(){ let t = $("hoverTip"); if(!t){ t = document.createElement("div"); t.id = "hoverTip"; t.setAttribute("role", "tooltip"); document.body.appendChild(t); } return t; }
function hideTip(){ clearTimeout(tipT); clearInterval(tipLive); tipT = tipLive = null; tipFor = null; const t = $("hoverTip"); if(t) t.remove(); }
function fmtVal(addr, v){
  if(v===undefined) return null;
  if(typeof v==="string") return `'${v}'`;
  if(typeof v==="boolean") return v ? "1" : "0";
  return window.fmtS ? fmtS(addr, v) : fmt(v);
}
function tipHtml(t){
  const v = valueAt(t.addr);
  const resolved = /\[[^\]]*[A-Za-z_]/.test(t.addr) ? idxResolve(t.addr) : null;
  const d = (resolved && S.descr[resolved] && S.descr[resolved].type ? S.descr[resolved] : S.descr[t.addr]) || {};
  const shown = t.operand && t.operand!==t.addr.replace(/^Program:[^.]+\./, "") ? t.operand : null;
  const isStruct = v===undefined && (kidsOf(t.addr).length || (resolved && kidsOf(resolved).length));
  const vtxt = fmtVal(t.addr, v);
  const forced = isForced(t.addr) ? ` <span class="hf">F</span>` : "";
  return `<div class="ha">${esc(t.addr)}</div>`
    + (shown ? `<div class="hr">operand ${esc(shown)}</div>` : "")
    + (resolved && resolved!==t.addr ? `<div class="hr">→ ${esc(resolved)}</div>` : "")
    + `<div><span class="hv">${vtxt!=null ? esc(vtxt) : isStruct ? "{structure}" : "—"}</span>${forced} <span class="hr">${esc(d.type || typeOfAddr(t.addr) || "")}</span></div>`
    + (d.description ? `<div class="hd ${d.from && d.from!=="tag" ? "pass" : ""}">${esc(d.description)}</div>` : "");
}
function showTip(t, anchor){
  const el = tipEl(); el.innerHTML = tipHtml(t);
  const r = anchor.getBoundingClientRect();
  const w = el.offsetWidth, h = el.offsetHeight;
  el.style.left = Math.max(6, Math.min(r.left, innerWidth - w - 8)) + "px";
  el.style.top = (r.bottom + 6 + h > innerHeight ? Math.max(6, r.top - h - 6) : r.bottom + 6) + "px";
}
function hoverTarget(e){
  const tgt = e.target; if(!tgt || !tgt.closest) return null;
  if(tgt.closest("#opEdit,#menu,#dlg,.erung .eops")) return null;
  const ins = tgt.closest(".rung[data-n] .ins[data-iid], .erung .ins");
  if(ins){
    const br = tgt.closest(".br[data-k]");
    if(br){ const lv = br.querySelector(".lv[data-a]"); const a = lv && lv.dataset.a; const op = br.children[1] ? br.children[1].textContent.replace(/^⚠ /, "") : "";
      if(a) return {addr:a, operand:op, el:br};
      return null; }
    const tn = tgt.closest(".tagn"); if(tn && ins.dataset.addr) return {addr:ins.dataset.addr, operand:tn.textContent.replace(/^⚠ /, ""), el:tn};
    if(ins.dataset.addr && tgt.closest(".sym,.val")) return {addr:ins.dataset.addr, operand:null, el:ins};
    return null;
  }
  const st = tgt.closest("#stView .st-t, #stView .st-u");
  if(st && S.R){ let w = st.textContent; let p = st.previousSibling;
    while(p && p.nodeType===3 && /^[.\[\]0-9]*$/.test(p.textContent) && p.previousSibling){ const q = p.previousSibling; if(!(q.classList && (q.classList.contains("st-t") || q.classList.contains("st-n")))) break; w = q.textContent + p.textContent + w; p = q.previousSibling; }
    return {addr: resolveAddr(S.R.prog, w), operand: w, el: st}; }
  const row = tgt.closest(".etag tr.mem[data-addr]");
  if(row && tgt.closest("td.mname")) return {addr:row.dataset.addr, operand:null, el:row.querySelector("td.mname")};
  return null;
}
document.addEventListener("mouseover", (e) => {
  const t = hoverTarget(e);
  if(!t || !t.addr){ if(tipFor && !(e.target.closest && e.target.closest("#hoverTip"))) hideTip(); return; }
  if(tipFor && tipFor.addr===t.addr && tipFor.el===t.el) return;
  hideTip(); tipFor = t;
  /* the instruction's own title would cover the card */
  const ins = t.el.closest(".ins"); if(ins && ins.title){ ins.dataset.tip = ins.title; ins.removeAttribute("title"); }
  tipT = setTimeout(async () => {
    if(tipFor!==t) return;
    showTip(t, t.el);
    await describe([t.addr, ...(/\[[^\]]*[A-Za-z_]/.test(t.addr) ? [idxResolve(t.addr)] : [])]);
    if(tipFor===t){ showTip(t, t.el); tipLive = setInterval(() => { if(tipFor===t && document.contains(t.el)) showTip(t, t.el); else hideTip(); }, 300); }
  }, 280);
});
document.addEventListener("mouseout", (e) => { if(tipFor && e.target.closest && tipFor.el.contains(e.target) && !(e.relatedTarget && tipFor.el.contains(e.relatedTarget))){
  const ins = tipFor.el.closest(".ins"); if(ins && ins.dataset.tip){ ins.title = ins.dataset.tip; delete ins.dataset.tip; } hideTip(); } });
document.addEventListener("scroll", () => { if(tipFor) hideTip(); }, true);
document.addEventListener("mousedown", () => { if(tipFor) hideTip(); }, true);

/* ---------- Monitor from the logic: expand down to the member and highlight it ---------- */
function pathPrefixes(addr){
  const m = /^(Program:[^.]+\.)?[^.\[]+/.exec(addr); if(!m) return [];
  const out = []; let cur = m[0], rest = addr.slice(cur.length);
  const re = /^(\[[^\]]*\]|\.[^.\[]+)/;
  while(rest){ const s = re.exec(rest); if(!s) break; out.push(cur); cur += s[0]; rest = rest.slice(s[0].length); }
  return out;
}
lxMonitor = function(addr){
  const real = /\[[^\]]*[A-Za-z_]/.test(addr) ? idxResolve(addr) : addr;
  const scope = real.startsWith("Program:") ? real.slice(8, real.indexOf(".")) : "controller";
  const root = (real.replace(/^Program:[^.]+\./, "").match(/^[^.\[]+/)||[""])[0];
  const V = tagView(scope);
  /* the filter shows the root; open every level on the way down (also the right page of big arrays) */
  const pre = pathPrefixes(real);
  pre.forEach((p, i) => { V.open.add(p); const next = pre[i+1] || real; const ks = kidsOf(p); const k = ks.indexOf(next);
    if(k >= (V.limit[p] || KID_PAGE)) V.limit[p] = k + 1; });
  V.filter = root;
  openTags(scope, root, "monitor");
  let tries = 0;
  const find = () => { const tr = document.querySelector(`#tbody tr[data-addr="${CSS.escape(real)}"]`);
    if(!tr){ if(++tries < 20) setTimeout(find, 150); else log(`${real} is not shown in the tag list`, "wrn"); return; }
    select(real); document.querySelectorAll("#tbody tr.sel").forEach(x=>x.classList.remove("sel"));
    tr.classList.add("sel", "hit"); tr.scrollIntoView({block:"center"});
    setTimeout(() => { const again = document.querySelector(`#tbody tr[data-addr="${CSS.escape(real)}"]`); if(again && S.sel===real) again.classList.add("sel"); }, 500); };
  setTimeout(find, 200);
};

/* ---------- type definitions (for Edit Tags drill-down) ---------- */
S.typeDefs = {};
async function typeDef(t){
  const k = (t||"").toUpperCase(); if(!k || ATOMIC_T.has(k)) return null;
  if(S.typeDefs[k] !== undefined) return S.typeDefs[k];
  try { S.typeDefs[k] = await api("GET", `/api/studio/datatype?name=${encodeURIComponent(t)}`); } catch(e){ S.typeDefs[k] = null; }
  return S.typeDefs[k];
}
function expandable(type, dims){ return !!((dims && dims.length) || (type && !ATOMIC_T.has(type.toUpperCase()))); }
function elementsOf(addr, dims){
  const out = []; const n = dims.reduce((a,b)=>a*b, 1); const lim = Math.min(n, 1000);
  for(let i=0; i<lim; i++){ let r = i; const ix = []; for(let k=dims.length-1; k>=0; k--){ ix.unshift(r % dims[k]); r = Math.floor(r / dims[k]); } out.push(`${addr}[${ix.join(",")}]`); }
  return {list: out, more: n - lim};
}
/* member / element rows under an expanded Edit Tags row (sync: uses cached type defs) */
function editMemberRows(addr, type, dims, depth, open, baseDesc){
  let html = "";
  const pad = (d) => `padding-left:${6 + d*16}px`;
  const row = (a, label, t, dd, desc, pass) => {
    const can = expandable(t, dd), isOpen = open.has(a);
    html += `<tr class="mem" data-addr="${esc(a)}" data-mtype="${esc(t)}" data-mdims="${(dd||[]).join(",")}"><td class="mname" style="${pad(depth)}">${can ? `<span class="exp" data-eexp="${esc(a)}">${isOpen?"−":"+"}</span>` : `<span class="exp"></span>`}${esc(label)}</td>
      <td>${esc(t + (dd && dd.length ? `[${dd.join(",")}]` : ""))}</td><td><span class="${pass?"pass":""}">${esc(desc||"")}</span></td><td></td><td></td><td></td><td></td></tr>`;
    if(isOpen) html += editMemberRows(a, t, dd, depth+1, open, baseDesc);
  };
  if(dims && dims.length){
    const e = elementsOf(addr, dims);
    e.list.forEach(a => row(a, a.slice(a.lastIndexOf("[")), type, [], baseDesc, true));
    if(e.more > 0) html += `<tr class="mem"><td colspan="7" style="${pad(depth)}" class="dim">… ${e.more} more elements</td></tr>`;
    return html;
  }
  const td = S.typeDefs[(type||"").toUpperCase()];
  if(!td){ html += `<tr class="mem"><td colspan="7" style="${pad(depth)}" class="dim">loading ${esc(type)}…</td></tr>`; return html; }
  td.members.forEach(m => row(`${addr}.${m.name}`, "." + m.name, m.type, m.dim ? [m.dim] : [], m.description || baseDesc, !m.description));
  return html;
}
async function editToggle(addr, type, dims, V, rerender){
  V.eopen = V.eopen || new Set();
  if(V.eopen.has(addr)){ V.eopen.delete(addr); rerender(); return; }
  V.eopen.add(addr);
  if(!(dims && dims.length)) await typeDef(type);
  rerender();
}
window.editMemberRows = editMemberRows; window.editToggle = editToggle; window.expandableType = expandable; window.typeDefFetch = typeDef;

/* ---------- data type browser (New Tag, Edit Tags) ---------- */
let pickEl = null;
function closeTypePicker(){ if(pickEl){ pickEl.remove(); pickEl = null; } }
async function openTypePicker(inp, onPick){
  closeTypePicker();
  let d; try { d = await api("GET", "/api/studio/datatypes"); } catch(e){ return; }
  const groups = [["Atomic", d.atomic], ["Strings", d.string], ["Predefined", d.predefined], ["User-Defined", d.user], ["Add-On Instructions", d.aoi], ["Module-Defined", d.module || []]];
  const el = pickEl = document.createElement("div"); el.className = "tsel-pick";
  el.innerHTML = `<input placeholder="Type to filter data types…" spellcheck="false"><div class="tl"></div>`;
  ($("dlg").open && $("dlg").contains(inp) ? $("dlg") : document.body).appendChild(el);     // a modal dialog makes the rest of the page inert
  const r = inp.getBoundingClientRect();
  el.style.left = Math.min(r.left, innerWidth - 310) + "px"; el.style.top = Math.min(r.bottom + 2, innerHeight - 350) + "px";
  const q = el.querySelector("input"), tl = el.querySelector(".tl");
  let pick = null;
  const draw = () => { const f = q.value.trim().toUpperCase(); let html = "";
    for(const [g, list] of groups){ const items = (list||[]).filter(t => !f || t.toUpperCase().includes(f)); if(!items.length) continue;
      html += `<div class="g">${esc(g)}</div>` + items.map(t => `<div data-t="${esc(t)}">${esc(t)}</div>`).join(""); }
    tl.innerHTML = html || `<div class="dim">No data type matches</div>`;
    const first = tl.querySelector("[data-t]"); pick = first ? first.dataset.t : null; if(first) first.classList.add("on"); };
  const done = (t) => { closeTypePicker(); if(t){ const dims = /\[[^\]]*\]$/.exec(inp.value); inp.value = t + (dims ? dims[0] : ""); inp.dispatchEvent(new Event("input")); inp.dispatchEvent(new Event("change")); if(onPick) onPick(t); } inp.focus(); };
  q.oninput = draw;
  q.onkeydown = (e) => { const els = [...tl.querySelectorAll("[data-t]")]; const i = els.findIndex(x => x.dataset.t===pick);
    if(e.key==="ArrowDown" || e.key==="ArrowUp"){ e.preventDefault(); const nx = els[Math.max(0, Math.min(els.length-1, i + (e.key==="ArrowDown"?1:-1)))]; if(nx){ els.forEach(x=>x.classList.remove("on")); nx.classList.add("on"); pick = nx.dataset.t; nx.scrollIntoView({block:"nearest"}); } }
    else if(e.key==="Enter"){ e.preventDefault(); e.stopPropagation(); done(pick); }
    else if(e.key==="Escape"){ e.preventDefault(); e.stopPropagation(); done(null); } };
  tl.onmousedown = (e) => e.preventDefault();
  tl.onclick = (e) => { const x = e.target.closest("[data-t]"); if(x) done(x.dataset.t); };
  draw(); q.focus();
  setTimeout(() => document.addEventListener("mousedown", function off(ev){ if(pickEl && !pickEl.contains(ev.target)){ closeTypePicker(); } document.removeEventListener("mousedown", off, true); }, true), 0);
}
window.openTypePicker = openTypePicker;

/* New Tag dialog: "…" type browser next to Data Type; Style choices follow the type */
const STYLE_FOR = (t) => { const u = (t||"").toUpperCase().replace(/\[.*$/, "").trim();
  return ["SINT","INT","DINT","LINT","USINT","UINT","UDINT","ULINT"].includes(u) ? ["Decimal","Hex","Binary","Octal","ASCII"] : ["REAL","LREAL"].includes(u) ? ["Float","Exponential"] : []; };
const _newTagDialog = newTagDialog;
newTagDialog = async function(pre = {}){
  const mo = new MutationObserver(() => {
    const inp = $(fieldId("data_type")); if(!inp || inp.dataset.enh) return;
    inp.dataset.enh = "1";
    const wrap = document.createElement("span"); wrap.className = "dtwrap"; inp.replaceWith(wrap); wrap.appendChild(inp);
    const b = document.createElement("button"); b.type = "button"; b.textContent = "…"; b.title = "Browse data types (Alt+↓)"; b.id = "dtBrowse"; wrap.appendChild(b);
    b.onclick = () => openTypePicker(inp);
    inp.addEventListener("keydown", (e) => { if(e.key==="ArrowDown" && e.altKey){ e.preventDefault(); openTypePicker(inp); } });
    inp.placeholder = "e.g. DINT, TIMER, Station_t or DINT[10]";
    const sty = $(fieldId("style"));
    const syncStyle = () => { if(!sty) return; const ok = STYLE_FOR(inp.value); const cur = sty.value;
      sty.innerHTML = `<option value="">(default)</option>` + ok.map(s => `<option>${s}</option>`).join(""); sty.value = ok.includes(cur) ? cur : ""; sty.disabled = !ok.length; };
    inp.addEventListener("input", syncStyle); inp.addEventListener("change", syncStyle); syncStyle();
    mo.disconnect();
  });
  mo.observe($("dlgBody"), {childList:true, subtree:true});
  try { return await _newTagDialog(pre); } finally { mo.disconnect(); closeTypePicker(); }
};
