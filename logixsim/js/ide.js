"use strict";
/* Classic IDE editors (0.16.0), loaded last.
   Ladder:  square rung-number blocks, rung comments boxed above the rung number,
            green drop dots while dragging from the Language Element toolbar (onto any
            rung, not only the one being edited), a Tag Browser with Local / Controller
            scopes that opens when an operand is double-clicked.
   ST:      line-number gutter with [-]/[+] outlining (IF, CASE, FOR, WHILE, REPEAT,
            multi-line comments, #region ... #endregion) in the view and while editing,
            keyword + Tab snippets with orange placeholders, classic colours.
   Errors:  the Errors tab is a table (Line/Rung | Error Type | Error Description);
            clicking a row centres the rung or line and flashes a blue cursor on it. */

(function(){
  const css = document.createElement("style");
  css.id = "ideStyles";
  css.textContent = `
/* ---------- ladder: rung number block, comment above it ---------- */
.ladder>.rung[data-n]>.rnum,.ladder>.rung.placeholder>.rnum{justify-self:end;align-self:start;box-sizing:border-box;width:30px;height:22px;
  margin:var(--rny,14px) 5px 0 0;padding:0!important;display:flex;align-items:center;justify-content:center;
  background:#DCE6F2!important;border:1px solid #8EA6C8;color:#000;font-size:12px;position:static}
.ladder>.rung.lsel>.rnum{background:#C3D5EE!important}
.ladder>.rung.caret>.rnum{outline:2px solid #0041C2!important;outline-offset:-1px}
.ladder>.rung>.rnum.err{color:#C00000;border-color:#C00000}
.ladder>.rung>.rcomment.rctop{grid-column:1/-1;justify-self:start;margin:2px 0 4px 4px;position:relative;z-index:1;background:#FFFFFF;
  max-width:calc(100% - 24px);white-space:pre-wrap}
.ladder>.rung.lsel>.rcomment.rctop{background:#FFFFFF}
/* ---------- ladder: green drop targets while dragging a language element ---------- */
.ladder.idedrag .wire{position:relative}
.ladder.idedrag .wire.okdrop::after{content:"";position:absolute;left:50%;top:50%;width:11px;height:11px;margin:-6px 0 0 -6px;
  border-radius:50%!important;background:#00FF00!important;border:1px solid #006400!important;opacity:1!important;z-index:3;transform:none!important;box-shadow:none!important}
.ladder.idedrag .wire.okdrop.hot::after{width:15px;height:15px;margin:-8px 0 0 -8px}
.ladder.idedrag .wire:not(.okdrop)::after{opacity:0!important}
.ladder.idedrag .insbar.okdrop{background:transparent;overflow:visible}
.ladder.idedrag .insbar.okdrop::after{content:"";position:absolute;left:4px;top:50%;width:11px;height:11px;margin-top:-6px;border-radius:50%!important;background:#00FF00;border:1px solid #006400}
.ladder.idedrag .insbar.okdrop.hot{background:#E5FFE5}
#lxBar .lxbtns button svg{vertical-align:-3px;margin-right:3px}
/* ---------- tag browser: Local / Controller scopes ---------- */
#tbrowse{border-radius:0!important;border:1px solid #707070}
#tbrowse .tbscope{display:flex;background:#F0F0F0;border-bottom:1px solid #C0C0C0}
#tbrowse .tbscope button{border:none;border-right:1px solid #C0C0C0;background:#E1E1E1;padding:3px 10px;font-size:11px}
#tbrowse .tbscope button.on{background:#FFFFFF}
#tbrowse .tbgrp{background:#F0F0F0;color:#404040;font-size:11px;padding:2px 6px;border-top:1px solid #D3D3D3;border-bottom:1px solid #D3D3D3;position:sticky;top:0}
#tbrowse .tbi{font-family:Consolas,"Courier New",monospace;cursor:default}
#tbrowse .tbi:hover,#tbrowse .tbi.on{background:#CCE8FF}
/* ---------- Errors table ---------- */
.errs table.errt{border-collapse:collapse;width:100%;font-size:12px}
.errs table.errt th{position:sticky;top:0;background:#F0F0F0;text-align:left;font-weight:400;border:1px solid #C0C0C0;padding:2px 6px;z-index:1}
.errs table.errt td{border:1px solid #D3D3D3;padding:1px 6px;font-family:Consolas,"Courier New",monospace;vertical-align:top}
.errs table.errt td:first-child{white-space:nowrap}
#console .ok{color:#007A00}
.errs table.errt tr.row{cursor:default}
.errs table.errt tr.row:hover td{background:#E5F1FB}
.errs table.errt tr.row.cur td{background:#CCE8FF}
.errs table.errt .sv{display:inline-block;width:10px;height:10px;border:1px solid #000;margin-right:6px;vertical-align:-1px}
.errs table.errt .sv.error{background:#C00000}.errs table.errt .sv.warning{background:#F0B400}.errs table.errt .sv.message{background:#FFFFFF}
/* blue cursor flash on the rung or line an error points to */
.rung.flash{animation:ideflash 1.5s ease-out!important}
@keyframes ideflash{0%,35%{background:#C9D8F5;box-shadow:inset 0 0 0 2px #0041C2}100%{background:transparent;box-shadow:none}}
.stview>div.flash{animation:ideflash 1.5s ease-out}
.stflash{position:absolute;left:0;right:0;height:16px;pointer-events:none;z-index:2;animation:ideflash 1.5s ease-out forwards}
@media (prefers-reduced-motion:reduce){.rung.flash,.stview>div.flash,.stflash{animation:none!important;outline:2px solid #0041C2}}
/* ---------- Structured Text ---------- */
:root,:root[data-theme="dark"],:root[data-theme="light"]{--stk:#0000B4;--stf:#5B2C83;--stc:#3A7D44;--sts:#B22222;--stn:#7A3E00;--stt:#000000}
.st-k{color:var(--stk);font-weight:700}.st-c{color:var(--stc);font-style:normal}.st-a{color:#404040;font-weight:700}
.st-rg{color:var(--stk);font-weight:700}.st-rgt{color:#303030}
.st-rgbox{outline:1px solid #A0A0A0;background:#EDEDED}
.st-ph{background:#FFE7C2;outline:1px solid #E07B00;color:#7A3B00;text-decoration:none}
.st-fold{display:inline-block;background:#EDEDED;border:1px solid #A0A0A0;color:#303030;line-height:14px;padding:0 4px;margin-left:2px;font-size:11px}
.stview{background:linear-gradient(#F0F0F0,#F0F0F0) 0 0/66px 100% no-repeat,linear-gradient(#C0C0C0,#C0C0C0) 66px 0/1px 100% no-repeat,#FFFFFF;padding:4px 0}
.stview>div{position:relative;padding:0 12px 0 74px!important;line-height:16px;min-height:16px}
.stview>div::before{content:attr(data-ln)!important;counter-increment:none!important;position:absolute;left:0;width:36px!important;text-align:right;color:#707070;margin:0!important}
.stview .fold{position:absolute!important;left:40px;margin:0!important;width:24px!important;color:#404040!important;cursor:pointer;font-size:11px}
.stview .fold::after{content:"[-]"}.stview .fold.closed::after{content:"[+]"}
.stview .foldmark{display:inline-block;background:#EDEDED;border:1px solid #A0A0A0!important;color:#303030!important;border-radius:0!important;padding:0 6px;margin-left:6px;font-size:11px;line-height:15px;cursor:pointer}
.stview>div.rgfold>.sc{display:none}
.stview>div.rgfold>.foldmark{margin-left:0}
.stview>div.curline{background:#E5F1FB}
.sted{grid-template-columns:70px 1fr!important}
.stgut{padding:6px 0 6px 0!important;background:#F0F0F0!important;border-right:1px solid #C0C0C0;text-align:left!important}
.stgut>div{display:flex;height:16px;line-height:16px;white-space:nowrap}
.stgut .gn{width:38px;text-align:right;color:#707070;padding-right:4px}
.stgut .gf{width:26px;color:#404040;cursor:pointer;font-size:11px;user-select:none}
.stgut .gf:hover{color:#0041C2}
.stgut>div.bad .gn{color:#FFFFFF;background:#C00000}
.stgut{pointer-events:auto}
.stwrap #stTa{caret-color:#0041C2}
`;
  document.head.appendChild(css);
})();

/* ======================================================================
   Ladder
   ====================================================================== */
/* comments go above the rung number; the rung number block lines up with the first wire */
function ideLadderLayout(){
  const lad = document.querySelector("#doc .ladder"); if(!lad) return;
  lad.querySelectorAll(":scope > .rung[data-n]").forEach(rd => {
    const c = rd.querySelector(":scope > div > .rcomment");
    if(c){ c.classList.add("rctop"); rd.prepend(c); }
  });
  ideRungNumberY();
}
function ideRungNumberY(){
  const lad = document.querySelector("#doc .ladder"); if(!lad) return;
  const all = lad.querySelectorAll(":scope > .rung[data-n], :scope > .rung.placeholder");
  [...all].slice(0, 400).forEach(rd => {                 /* each rung: the number block lines up with its own main wire */
    const num = rd.querySelector(":scope > .rnum"), line = rd.querySelector(".rline"), w = line && line.querySelector(".series > .wire");
    if(!num || !line || !w) return;
    const body = line.parentElement, wr = w.getBoundingClientRect();
    if(!wr.height) return;
    const y = wr.top + wr.height / 2 - body.getBoundingClientRect().top;
    if(y > 0 && y < 600) num.style.marginTop = Math.max(0, Math.round(y - 11)) + "px";
  });
}
(function(){
  const _a = window.lxAfterRender; window.lxAfterRender = function(){ if(_a) _a(); ideLadderLayout(); };
  const _m = mountLxBar; mountLxBar = function(){ _m(); ideMountIcons(); };
  const _z = zoomApply; zoomApply = function(){ _z(); setTimeout(ideRungNumberY, 0); };
})();

/* rung-number menu: Edit Rung Comment, Add Rung, Verify Rung first */
(function(){
  const _rm = rungMenu;
  rungMenu = function(e, n, anchor){
    const _show = showMenu;
    showMenu = function(ev, items, anc, opts){
      showMenu = _show;
      if(n < lxCount()){
        const take = (lab) => { const i = items.findIndex(x => Array.isArray(x) && x[0]===lab); return i>=0 ? items.splice(i, 1)[0] : null; };
        const cm = take("Edit Rung Comment…"), below = take("Add Rung Below"), vr = take("Verify Rung");
        const head = [cm, below && ["Add Rung", below[1], below[2], below[3]], vr].filter(Boolean);
        while(items.length && items[0]==="-") items.shift();
        items = [...head, "-", ...items];
      }
      return _show(ev, items, anc, opts);
    };
    try { return _rm(e, n, anchor); } finally { showMenu = _show; }
  };
})();

/* ---------- Language Element toolbar: icons, Rung is draggable ---------- */
const IDE_ICONS = {
  RUNG: '<path d="M2 1v14M18 1v14M2 8h16" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  BRANCH: '<path d="M0 4h20M3 4v9h14V4" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  XIC: '<path d="M0 8h6M14 8h6M4 2h3v12H4M16 2h-3v12h3" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  XIO: '<path d="M0 8h6M14 8h6M4 2h3v12H4M16 2h-3v12h3M7 14L13 2" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  OTE: '<path d="M0 8h5M15 8h5M7 2Q3 8 7 14M13 2Q17 8 13 14" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  OTL: '<path d="M0 8h5M15 8h5M7 2Q3 8 7 14M13 2Q17 8 13 14" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="10" y="11" text-anchor="middle" font-size="7" font-family="Consolas,monospace" fill="currentColor">L</text>',
  OTU: '<path d="M0 8h5M15 8h5M7 2Q3 8 7 14M13 2Q17 8 13 14" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="10" y="11" text-anchor="middle" font-size="7" font-family="Consolas,monospace" fill="currentColor">U</text>'};
function ideMountIcons(){
  const bar = $("lxBar"); if(!bar) return;
  bar.querySelectorAll("[data-lx], [data-lxr]").forEach(b => {
    const k = b.hasAttribute("data-lxr") ? "RUNG" : String(b.dataset.lx).toUpperCase();
    if(IDE_ICONS[k] && !b.querySelector("svg")) b.insertAdjacentHTML("afterbegin", `<svg width="20" height="16" viewBox="0 0 20 16" aria-hidden="true">${IDE_ICONS[k]}</svg>`);
    if(k==="BRANCH") b.childNodes.forEach(nd => { if(nd.nodeType===3) nd.textContent = nd.textContent.replace("⑂ ", ""); });
    if(k==="RUNG"){ b.draggable = true; b.title = "Rung — click to add a rung (Ctrl+R), or drag between rungs"; }
  });
}

/* ---------- drag a language element: green dots where it may go ---------- */
function ideRegions(seriesEl, items, region, depth, top, out){
  if(!seriesEl || !items) return;
  const kids = [...seriesEl.children];
  const wires = kids.filter(k => k.classList.contains("wire")), nodes = kids.filter(k => !k.classList.contains("wire"));
  const tail = top ? tailStart(items) : items.length;
  wires.forEach((w, k) => out.push({w, reg: top ? (k < tail ? "in" : k===tail ? "both" : "out") : region, depth}));
  items.forEach((it, k) => {
    if(it.kind!=="branch") return;
    const el = nodes[k]; if(!el) return;
    const legs = [...el.children].filter(x => x.classList.contains("series"));
    const reg = top ? (k < tail ? "in" : "both") : region;
    it.legs.forEach((l, li) => ideRegions(legs[li], l, reg, depth + 1, false, out));
  });
}
function ideValid(name, reg, depth){
  if(name==="RUNG") return false;
  if(name==="BRANCH") return depth + 1 <= 6;
  return isInputNode({kind:"instr", name}) ? reg!=="out" : reg!=="in";
}
function ideMarkDrops(name){
  const lad = document.querySelector("#doc .ladder"); if(!lad) return;
  lad.classList.add("idedrag");
  const spots = [];
  if(S.edit && !S.edit.st && !S.edit.textMode){
    const s = document.querySelector("#erung .eline > .series"); ideRegions(s, S.edit.tree, "in", 0, true, spots);
  } else if(!S.edit){
    lad.querySelectorAll(":scope > .rung[data-n]:not(.orig)").forEach(rd => {
      const r = S.R.data.rungs[+rd.dataset.n]; if(!r || r.error) return;
      ideRegions(rd.querySelector(".rline > .series"), r.tree, "in", 0, true, spots);
    });
  }
  spots.forEach(x => x.w.classList.toggle("okdrop", ideValid(name, x.reg, x.depth)));
  lad.querySelectorAll(":scope > .insbar").forEach(b => b.classList.toggle("okdrop", name==="RUNG" && !S.edit));
}
function ideClearDrops(){
  S.ideDrag = null;
  document.querySelectorAll(".ladder.idedrag").forEach(l => l.classList.remove("idedrag"));
  document.querySelectorAll(".okdrop, .ladder .hot").forEach(x => x.classList.remove("okdrop", "hot"));
}
document.addEventListener("dragstart", (e) => {
  const b = e.target.closest && e.target.closest("#lxBar [data-lx], #lxBar [data-lxr]"); if(!b) return;
  const name = b.hasAttribute("data-lxr") ? "RUNG" : String(b.dataset.lx).toUpperCase();
  S.ideDrag = name;
  if(name==="RUNG"){ e.dataTransfer.setData("text/x-vcs-rung", "1"); e.dataTransfer.setData("text/plain", "RUNG"); e.dataTransfer.effectAllowed = "copy"; }
  setTimeout(() => ideMarkDrops(name), 0);
}, true);
document.addEventListener("dragend", () => { if(S.ideDrag) setTimeout(ideClearDrops, 0); }, true);
const ideDropTarget = (e) => e.target.closest && e.target.closest(".ladder .wire.okdrop, .ladder .insbar.okdrop");
/* capture: a wire that is not a valid spot refuses the drop (also in the rung being edited) */
document.addEventListener("dragover", (e) => {
  if(!S.ideDrag) return;
  const t = ideDropTarget(e);
  document.querySelectorAll(".ladder .hot").forEach(x => { if(x!==t) x.classList.remove("hot"); });
  if(!t){ if(e.target.closest && e.target.closest(".ladder .wire")) e.stopPropagation(); return; }
  t.classList.add("hot");
  if(!t.closest("#erung")){ e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }
}, true);
document.addEventListener("drop", (e) => {
  if(!S.ideDrag) return;
  const t = ideDropTarget(e), name = S.ideDrag;
  if(!t || t.closest("#erung")) return;                 // the rung editor handles its own drops
  e.preventDefault(); e.stopPropagation(); ideClearDrops();
  if(t.classList.contains("insbar")){ startInsert(+t.dataset.at); return; }
  const rd = t.closest(".rung[data-n]"); if(!rd || S.edit) return;
  const n = +rd.dataset.n, ord = [...rd.querySelectorAll(".rline .wire")].indexOf(t);
  startEdit(n, null);
  const ws = [...document.querySelectorAll("#erung .eline .wire[data-ip]")], w = ws[ord];
  if(!S.edit || !w) return;
  S.edit.ip = ipParse(w.dataset.ip);
  if(name==="BRANCH") addBranch(); else addInstr(name);
}, true);

/* ---------- Tag Browser: Local (program) and Controller scopes ---------- */
S.tbScope = lsGet("TbScope") || "all";
openTagBrowser = async function(input, types, onPick, opts){
  opts = opts || {};
  closeTagBrowser();
  const prog = S.R && S.R.prog && !S.R.prog.startsWith("AOI:") ? S.R.prog : "";
  let d; try { d = await api("GET", `/api/studio/tagbrowser?program=${encodeURIComponent(prog)}&depth=3`); } catch(e){ log(e.message, "err"); return; }
  if(opts.keepFocus && (!S.inline || S.inline.inp!==input)) return;     // the operand editor closed meanwhile
  const want = (types||[]).filter(t => t && t!=="any");
  const fits = (t) => !want.length || want.includes((t||"").replace(/\[.*$/, ""));
  /* integers open into their bits (bit picker), as the Logix tag browser does */
  const BITW = {SINT:8, USINT:8, INT:16, UINT:16, DINT:32, UDINT:32, LINT:64, ULINT:64};
  const kidsOf = (it) => (it.members && it.members.length) ? it.members
    : (BITW[String(it.type||"").replace(/\[.*$/, "")] && !/\[/.test(it.type||"") ? Array.from({length: BITW[it.type]}, (_, i) => ({name: String(i), type: "BOOL"})) : []);
  const fitsDeep = (it, lvl=0) => fits(it.type) || (lvl<3 && kidsOf(it).some(m => fitsDeep(m, lvl+1)));
  const box = document.createElement("div"); box.id = "tbrowse"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "Tag Browser");
  box.innerHTML = `<div class="tbscope" role="tablist">
      <button type="button" role="tab" data-sc="all">All</button>
      ${prog ? `<button type="button" role="tab" data-sc="local">Local Tags (${esc(prog)})</button>` : ""}
      <button type="button" role="tab" data-sc="controller">Controller Tags</button></div>
    <div class="tbh"><input id="tbq" placeholder="Search tags…" spellcheck="false" autocomplete="off">
     ${want.length?`<label><input type="checkbox" id="tbfit" checked> only ${esc(want.join("/"))}</label>`:""}</div><div class="tbl" role="listbox"></div>`;
  document.body.appendChild(box);
  const r = input.getBoundingClientRect();
  box.style.left = Math.max(4, Math.min(r.left, innerWidth - 380)) + "px";
  box.style.top = (r.bottom + 2 + 300 > innerHeight ? Math.max(4, r.top - 302) : r.bottom + 2) + "px";
  const open = new Set();
  let scope = prog ? S.tbScope : (S.tbScope==="local" ? "all" : S.tbScope);
  const draw = () => {
    box.querySelectorAll("[data-sc]").forEach(b => { b.classList.toggle("on", b.dataset.sc===scope); b.setAttribute("aria-selected", b.dataset.sc===scope ? "true" : "false"); });
    const q = $("tbq").value.toLowerCase(), only = $("tbfit") ? $("tbfit").checked : false;
    const rows = [];
    const add = (it, path, lvl) => {
      const kids = kidsOf(it);
      rows.push(`<div class="tbi ${fits(it.type)?"fit":""}" role="option" data-p="${esc(path)}" style="padding-left:${6+lvl*14}px">
        <span class="tbx" data-x="${esc(path)}">${kids.length?(open.has(path)?"▾":"▸"):""}</span><b>${esc(it.name)}</b>
        <span class="dim">${esc(it.type)}</span>${it.description?` <span class="dim">${esc(it.description)}</span>`:""}</div>`);
      if(open.has(path)) kids.forEach(m => add(m, `${path}.${m.name}`, lvl+1));
    };
    const match = (it) => (!q || it.name.toLowerCase().includes(q) || (it.description||"").toLowerCase().includes(q)) && (!only || fitsDeep(it));
    const local = d.items.filter(it => it.scope!=="controller" && match(it)), ctl = d.items.filter(it => it.scope==="controller" && match(it));
    if(scope!=="controller" && prog){ rows.push(`<div class="tbgrp">Local Tags — ${esc(prog)}</div>`); local.slice(0, 300).forEach(it => add(it, it.name, 0)); if(!local.length) rows.push(`<div class="dim" style="padding:2px 8px">none</div>`); }
    if(scope!=="local"){ rows.push(`<div class="tbgrp">Controller Tags</div>`); ctl.slice(0, 300).forEach(it => add(it, it.name, 0)); if(!ctl.length) rows.push(`<div class="dim" style="padding:2px 8px">none</div>`); }
    box.querySelector(".tbl").innerHTML = rows.join("");
  };
  box.addEventListener("mousedown", (e) => { if(opts.keepFocus && !e.target.closest("input")) e.preventDefault(); });   // the operand editor keeps the focus
  box.addEventListener("click", (e) => {
    e.stopPropagation();
    const sc = e.target.closest("[data-sc]"); if(sc){ scope = sc.dataset.sc; S.tbScope = scope; lsSet("TbScope", scope); draw(); return; }
    const x = e.target.dataset.x; if(x){ open.has(x) ? open.delete(x) : open.add(x); draw(); return; }
    const row = e.target.closest(".tbi"); if(row){ onPick(row.dataset.p); closeTagBrowser(); }
  });
  $("tbq").oninput = draw; if($("tbfit")) $("tbfit").onchange = draw;
  $("tbq").onkeydown = (e) => { if(e.key==="Escape"){ closeTagBrowser(); input.focus(); }
                                if(e.key==="Enter"){ const first = box.querySelector(".tbi"); if(first){ onPick(first.dataset.p); closeTagBrowser(); } } };
  if(opts.keepFocus){                                     // typing in the operand filters the list
    const sync = () => { if(!$("tbrowse")) { input.removeEventListener("input", sync); return; } const v = input.value.trim(); $("tbq").value = v==="?" ? "" : v; draw(); };
    input.addEventListener("input", sync);
  } else $("tbq").focus();
  draw();
};
/* double-clicking an operand opens the in-place editor with the Tag Browser under it */
window.addEventListener("dblclick", (e) => {
  if(e.target.closest && e.target.closest(".ladder .ins[data-iid] [data-k]") && !e.target.closest(".bt")){ S.ideDbl = true; setTimeout(() => { S.ideDbl = false; }, 0); }
}, true);
(function(){
  const _ie = inlineEdit;
  inlineEdit = function(n, iid, k, initial){
    const ok = _ie(n, iid, k, initial);
    if(ok && S.ideDbl && S.inline && S.inline.inp){
      const inp = S.inline.inp, ins = lxInstrs(n)[iid], sp = ins && spec(ins.name);
      const o = sp && sp.operands[Math.min(k||0, sp.operands.length-1)];
      if(!o || !["label","routine","imm","expr"].includes(o.kind))
        openTagBrowser(inp, o && o.types || [], (path) => { inp.value = path; inp.focus(); inp.dispatchEvent(new KeyboardEvent("keydown", {key:"Enter", bubbles:true})); }, {keepFocus:true});
    }
    return ok;
  };
  const _ci = closeInline;
  closeInline = function(){ const r = _ci.apply(this, arguments); if($("tbrowse") && !(document.activeElement && document.activeElement.closest && document.activeElement.closest("#tbrowse"))) closeTagBrowser(); return r; };
})();

/* ======================================================================
   Errors table
   ====================================================================== */
const IDE_KIND = {syntax:"Syntax error", structure:"Structure error", type:"Data type mismatch", unknown_tag:"Undefined tag",
  missing_operand:"Missing operand", operand_count:"Operand count", operand_syntax:"Invalid operand", unknown_instruction:"Unknown instruction",
  unsupported:"Unsupported instruction", constant:"Constant tag", label:"Label error", routine:"Routine error", language:"Language error"};
const ideDesc = (w) => String(w).replace(/^(?:AOI:)?[A-Za-z_]\w*\/[A-Za-z_]\w*\s+(?:rung|line)\s+\d+\s*:\s*/, "");
errorsFromVerify = function(r, filt, title){
  const out = [];
  const where = (s) => parseLoc(s) || {};
  const keep = (l) => !filt || (l.program===filt.program && (!filt.routine || l.routine===filt.routine));
  for(const e of r.parse_errors||[]){ const l = where(e.location); if(keep(l)) out.push({sev:"error", type:"Syntax error", desc:e.error, text:`${e.location}: ${e.error}`, ...l}); }
  for(const e of r.operand_errors||[]){ const l = where(e.location); if(keep(l)) out.push({sev:"error", type:"Operand error", desc:`${e.instruction}: ${e.error}`, text:`${e.location}: ${e.instruction}: ${e.error}`, instr:e.instruction, ...l}); }
  for(const u of r.unsupported||[]) for(const loc of u.locations||[]){ const l = where(loc); if(keep(l)) out.push({sev:"error", type:"Unsupported instruction", desc:`${u.instruction} is not executed (${u.reason})`, text:`${loc}: ${u.instruction} is not executed (${u.reason})`, instr:u.instruction, ...l}); }
  for(const b of r.boundary||[]) for(const loc of b.locations||[]){ const l = where(loc); if(keep(l)) out.push({sev:"message", type:"Simulation boundary", desc:`${b.instruction}: accepted, no effect in simulation`, text:`${loc}: ${b.instruction}: accepted, no effect in simulation`, instr:b.instruction, ...l}); }
  if(!filt){
    for(const t of r.missing_tags||[]) out.push({sev:"error", type:"Undefined tag", desc:`Missing tag: ${t}`, text:`Missing tag: ${t}`, tag:t});
    for(const x of r.routines_not_simulated||[]) out.push({sev:"warning", type:"Not simulated", desc:`${x.type} routine is not simulated`, text:`${x.routine}: ${x.type} routine is not simulated`});
    for(const w of r.warnings||[]){ const l = where(w); out.push({sev:"warning", type:"Warning", desc:ideDesc(w), text:w, ...l}); }
  } else for(const w of r.warnings||[]){ const l = where(w); if(l.program && keep(l)) out.push({sev:"warning", type:"Warning", desc:ideDesc(w), text:w, ...l}); }
  setErrors(out, title);
};
errorsFromIssues = function(list, title){
  setErrors(list.map(x => ({sev: x.severity==="error" ? "error" : "warning", type: IDE_KIND[x.kind] || (x.severity==="error" ? "Error" : "Warning"), desc: x.message,
    text:`${locText(x)}: ${x.message}`, program:x.program, routine:x.routine, rung:x.rung, line:x.line, col:x.col, index:x.instr, operand:x.operand})), title);
};
function ideErrWhere(e){
  if(!e.program) return "—";
  const rt = e.routine ? `${e.program}/${e.routine}` : e.program;
  return e.rung!=null ? `${rt} · Rung ${e.rung}` : e.line!=null ? `${rt} · Ln ${e.line}` : rt;
}
renderErrors = function(c){
  const n = (s) => S.errors.filter(e=>e.sev===s).length;
  const rows = errVisible().map(([e, i]) => `<tr class="row ${i===S.errIdx?"cur":""} ${e.program?"":"nav0"}" data-e="${i}" tabindex="0">
      <td><span class="sv ${e.sev}" aria-label="${e.sev}"></span>${esc(ideErrWhere(e))}</td><td>${esc(e.type || (e.sev==="error" ? "Error" : e.sev==="warning" ? "Warning" : "Message"))}</td><td>${esc(e.desc || e.text)}</td></tr>`).join("");
  c.innerHTML = `<div class="errbar"><b>${esc(S.errTitle||"Errors")}</b>
     <button class="${S.errShow.error?"on":""}" data-sev="error">✖ ${n("error")} Errors</button>
     <button class="${S.errShow.warning?"on":""}" data-sev="warning">⚠ ${n("warning")} Warnings</button>
     <button class="${S.errShow.message?"on":""}" data-sev="message">ℹ ${n("message")} Messages</button>
     <input id="errQ" placeholder="Search…" value="${esc(S.errQ)}"><span class="dim">click a row or press F4 / Shift+F4 to go to it</span></div>
     <div class="errs">${rows ? `<table class="errt"><thead><tr><th style="width:28%">Line/Rung</th><th style="width:18%">Error Type</th><th>Error Description</th></tr></thead><tbody>${rows}</tbody></table>`
       : `<span class="ok">No errors. ${S.errTitle?"":"Run Verify (✔) to check the project."}</span>`}</div>`;
  c.querySelectorAll("[data-sev]").forEach(b => b.onclick = () => { S.errShow[b.dataset.sev] = !S.errShow[b.dataset.sev]; renderConsole(); });
  const q = $("errQ"); q.oninput = () => { S.errQ = q.value; const p = q.selectionStart; renderConsole(); const q2 = $("errQ"); q2.focus(); q2.setSelectionRange(p,p); };
  c.querySelectorAll("[data-e]").forEach(r => { r.onclick = () => goError(+r.dataset.e); r.onkeydown = (ev) => { if(ev.key==="Enter") goError(+r.dataset.e); }; });
};

/* ======================================================================
   Structured Text
   ====================================================================== */
const IDE_SENT = 0xE000, IDE_SENT_RE = /[\uE000-\uF8FF]/g, IDE_HAS_SENT = /[\uE000-\uF8FF]/;
const IDE_PH = new Set(["BOOL_EXPRESSION","STATEMENT","NUMERIC_EXPRESSION","SELECTOR","COUNT","INITIAL_VALUE","FINAL_VALUE","INCREMENT"]);
const IDE_ST_RE = /(\(\*[^\uE000-\uF8FF]*?(?:\*\)|(?=[\uE000-\uF8FF])|$)|\/\*[^\uE000-\uF8FF]*?(?:\*\/|(?=[\uE000-\uF8FF])|$)|\/\/[^\n\uE000-\uF8FF]*)|(#(?:end)?region\b[^\n\uE000-\uF8FF]*)|('[^'\n]*'?|"[^"\n]*"?)|((?:2|8|16)#[0-9A-Fa-f_]+|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?)|(:=)|([A-Za-z_][A-Za-z0-9_]*)|([\uE000-\uF8FF])/gi;

/* folded text: a private-use character stands for a hidden block (S.edit.folds) */
function ideFolds(){ const E = S.edit; return E && E.st ? (E.folds || (E.folds = {})) : {}; }
function ideExpand(text, folds){ folds = folds || ideFolds(); return text.replace(IDE_SENT_RE, (ch) => { const f = folds[ch.charCodeAt(0) - IDE_SENT]; return f ? ideExpand(f.body, folds) : ""; }); }
function ideHiddenLines(text, folds){ let n = 0; (text.match(IDE_SENT_RE) || []).forEach(ch => { const f = folds[ch.charCodeAt(0) - IDE_SENT]; if(f) n += (ideExpand(f.body, folds).match(/\n/g) || []).length; }); return n; }
/* real (unfolded) line number of each displayed line */
function ideRealLines(text, folds){
  folds = folds || ideFolds();
  const out = []; let real = 1;
  text.split("\n").forEach(l => { out.push(real); real += 1 + ideHiddenLines(l, folds); });
  return out;
}

/* foldable ranges of a list of lines: {start: {end, kind, label}}; with folds, a line that
   holds a folded block is scanned with its hidden text (so the nesting stays balanced) */
function ideFoldRanges(lines, folds){
  const ranges = {}, stack = [], regions = [];
  let inC = null, cStart = -1;
  const scan = (raw, i) => {
    if(!inC){
      const rg = /^\s*#region\b(.*)$/i.exec(raw);
      if(rg){ regions.push({i, label: rg[1].trim() || "region"}); return; }
      if(/^\s*#endregion\b/i.test(raw)){ const s = regions.pop(); if(s && i > s.i && !ranges[s.i]) ranges[s.i] = {end:i, kind:"region", label:s.label}; return; }
    }
    let code = "", j = 0;
    while(j < raw.length){
      if(inC){ const e = raw.indexOf(inC, j); if(e < 0){ j = raw.length; break; } j = e + 2; inC = null; if(cStart >= 0 && i > cStart && !ranges[cStart]) ranges[cStart] = {end:i, kind:"comment"}; cStart = -1; continue; }
      if(raw.startsWith("//", j)) break;
      if(raw.startsWith("(*", j) || raw.startsWith("/*", j)){ inC = raw[j]==="(" ? "*)" : "*/"; cStart = code.trim() ? -1 : i; j += 2; continue; }
      if(raw[j]==="'"){ const e = raw.indexOf("'", j + 1); j = e < 0 ? raw.length : e + 1; code += " ''"; continue; }
      code += raw[j++];
    }
    (code.toUpperCase().match(/[A-Z_][A-Z0-9_]*/g) || []).forEach(w => {
      if(ST_OPEN[w]) stack.push({w, i});
      else if(ST_CLOSE[w]){ for(let k = stack.length - 1; k >= 0; k--) if(stack[k].w===ST_CLOSE[w]){ const s = stack[k]; stack.length = k; if(i > s.i && !ranges[s.i]) ranges[s.i] = {end:i, kind:"block"}; break; } }
    });
  };
  lines.forEach((raw, i) => {
    if(folds && IDE_HAS_SENT.test(raw)) ideExpand(raw, folds).split("\n").forEach(sub => scan(sub, i));
    else scan(raw, i);
  });
  return ranges;
}

/* colours: keywords bold blue, := dark grey, comments green, strings brick red,
   #region pragmas, orange placeholders, folded-block boxes */
stHighlight = function(text, prog, issues){
  const reals = ideRealLines(text, ideFolds()), errAt = new Set();
  const disp = new Map(reals.map((r, i) => [r, i + 1]));
  (issues||[]).filter(x => x.severity==="error").forEach(x => { const d = disp.get(x.line); if(d) errAt.add(`${d}:${x.col}`); });
  let html = "", pos = 0, line = 1, lineStart = 0, prev = null, m;
  const adv = (s, at) => { for(let i = 0; i < s.length; i++) if(s[i]==="\n"){ line++; lineStart = at + i + 1; } };
  IDE_ST_RE.lastIndex = 0;
  while((m = IDE_ST_RE.exec(text))){
    if(!m[0]){ IDE_ST_RE.lastIndex++; continue; }
    const a = m.index, b = a + m[0].length, v = m[0];
    const gap = text.slice(pos, a); html += esc(gap); adv(gap, pos); pos = a;
    const col = a - lineStart + 1;
    let out;
    if(m[1]) out = `<span class="st-c">${esc(v).replace(/\n/g, `</span>\n<span class="st-c">`)}</span>`;
    else if(m[2]){ const k = /^#(?:end)?region/i.exec(v)[0], folded = IDE_HAS_SENT.test(text[b] || "");
      out = `${folded ? `<span class="st-rgbox">` : ""}<span class="st-rg">${esc(k)}</span><span class="st-rgt">${esc(v.slice(k.length))}</span>${folded ? "</span>" : ""}`; }
    else if(m[3]) out = `<span class="st-s">${esc(v)}</span>`;
    else if(m[4]) out = `<span class="st-n">${esc(v)}</span>`;
    else if(m[5]) out = `<span class="st-a">:=</span>`;
    else if(m[6]){
      const u = v.toUpperCase(), member = /\.\s*$/.test(text.slice(Math.max(0, a - 4), a));   /* x.Member, x[1].Member, x[i].y.Member */
      let cls;
      if(member) cls = "st-t";
      else if(ST_KW.has(u)) cls = "st-k";
      else if(!member && stIsFunc(u) && /^\s*\(/.test(text.slice(b, b + 40))) cls = "st-f";
      else if(member) cls = "st-t";
      else if(IDE_PH.has(u) && !stKnownRoot(v, prog)) cls = "st-ph";
      else cls = stKnownRoot(v, prog) ? "st-t" : (S.stNames ? "st-u" : "st-t");
      if(errAt.has(`${line}:${col}`)) cls += " st-e";
      out = `<span class="${cls}">${esc(v)}</span>`;
      prev = {b};
    } else {
      const id = v.charCodeAt(0) - IDE_SENT, f = ideFolds()[id];
      const n = f ? (ideExpand(f.body).match(/\n/g) || []).length : 0;
      out = `<span class="st-fold" data-sent="${id}" title="${n} hidden line(s): click [+] in the gutter to expand">${f && f.kind==="comment" ? "(* … *)" : "…"}</span>`;
    }
    if(!m[6]) prev = null;
    html += out; adv(v, a); pos = b;
  }
  return html + esc(text.slice(pos)) + "\n";
};

/* ---------- view mode: gutter with line numbers and [-]/[+] ---------- */
stViewEnhance = function(){
  const v = $("stView"); if(!v || v.dataset.enh) return;
  v.dataset.enh = "1";
  const r = S.R.data, lines = r.text.split("\n"), ranges = ideFoldRanges(lines), folded = new Set();
  const draw = () => {
    const html = stHighlight(r.text, S.R.prog, null).replace(/\n$/, "").split("\n");
    v.innerHTML = html.map((h, i) => `<div data-ln="${i+1}">${ranges[i] ? `<span class="fold" data-fold="${i}" title="Collapse / expand"></span>` : ""}<span class="sc">${h || " "}</span></div>`).join("");
    [...folded].sort((a, b) => b - a).forEach(i => setFold(i, true));
  };
  const setFold = (i, on) => {
    const rg = ranges[i], rows = v.children; if(!rg || !rows[i]) return;
    for(let k = i + 1; k <= rg.end; k++) if(rows[k]) rows[k].classList.toggle("folded-body", on);
    const mk = rows[i].querySelector(".fold"); if(mk) mk.classList.toggle("closed", on);
    const old = rows[i].querySelector(".foldmark"); if(old) old.remove();
    rows[i].classList.toggle("rgfold", on && rg.kind==="region");
    if(on){ const label = rg.kind==="region" ? rg.label : rg.kind==="comment" ? `(* … ${rg.end - i} lines *)` : `… ${rg.end - i} lines`;
      rows[i].insertAdjacentHTML("beforeend", `<span class="foldmark" data-unfold="${i}" title="${rg.end - i} lines hidden — click to expand">${esc(label)}</span>`);
      folded.add(i); } else folded.delete(i);
  };
  v.onclick = (e) => { const f = e.target.closest("[data-fold],.foldmark"); if(!f) return; e.stopPropagation();
    const i = +(f.dataset.fold ?? f.dataset.unfold); setFold(i, !folded.has(i)); };
  S.stViewFold = (line) => { for(const i of [...folded]) if(line - 1 > i && line - 1 <= ranges[i].end) setFold(i, false);
    for(const i of [...folded]) if(line - 1 === i && ranges[i].kind==="region") setFold(i, false); };
  draw();
  stLoadNames(S.R.prog).then(() => { if($("stView")===v) draw(); });
  v.oncontextmenu = (e) => {
    e.preventDefault();
    let word = "";
    const rg = document.caretRangeFromPoint ? document.caretRangeFromPoint(e.clientX, e.clientY) : null;
    if(rg && rg.startContainer && rg.startContainer.nodeType===3){ const row = rg.startContainer.parentElement.closest("[data-ln]");
      if(row){ const sc = row.querySelector(".sc") || row, t = sc.textContent, pre = document.createRange(); pre.setStart(sc, 0); pre.setEnd(rg.startContainer, rg.startOffset);
        word = stWordAt(t, pre.toString().length).w; } }
    const u = word.toUpperCase(), isTag = word && /^[A-Za-z_]/.test(word) && !ST_KW.has(u) && !stIsFunc(u);
    const addr = isTag ? aoiAddr(S.R.prog, word) : null;
    showMenu(e, [
      ...(isTag ? [[`Go To Cross Reference for "${word}"`, () => xrefOpen(addr), !window.xrefOpen, "Ctrl+E"], [`Monitor "${word}"`, () => lxMonitor(addr)], ["Add to Watch", () => addWatch(addr)], "-"] : []),
      [`Edit ${S.R.routine}`, () => { const b = $("stEdit"); if(b) b.click(); }, !r.editable],
      ["Expand All", () => [...folded].forEach(i => setFold(i, false)), !folded.size],
      ["Collapse All", () => Object.keys(ranges).map(Number).sort((a, b) => b - a).forEach(i => setFold(i, true)), !Object.keys(ranges).length],
      "-",
      ["Go To Line…", () => window.goToDialog && goToDialog(), false, "Ctrl+G"],
      ["Verify Routine", () => verifyScope({program:S.R.prog, routine:S.R.routine})],
      ["Cross Reference (callers)", () => xrefRoutine(S.R.prog, S.R.routine)]]);
  };
};

/* ---------- edit mode: gutter with real line numbers and [-]/[+] ---------- */
function ideGutter(){
  const E = S.edit, ta = $("stTa"), gut = $("stGut"); if(!E || !E.st || !ta || !gut) return;
  const lines = ta.value.split("\n"), folds = ideFolds(), reals = ideRealLines(ta.value, folds);
  const ranges = ideFoldRanges(lines, folds);
  const bad = new Set((E.issues||[]).filter(x => x.severity==="error").map(x => x.line));
  gut.innerHTML = lines.map((l, i) => {
    const hasSent = IDE_HAS_SENT.test(l);
    const span = reals[i + 1] != null ? reals[i + 1] : reals[i] + 1 + ideHiddenLines(l, folds);
    let isBad = false; for(let r = reals[i]; r < span; r++) if(bad.has(r)) isBad = true;
    const f = hasSent ? `<span class="gf" data-gu="${i}" title="Expand">[+]</span>` : ranges[i] ? `<span class="gf" data-gf="${i}" title="Collapse">[-]</span>` : `<span class="gf"></span>`;
    return `<div class="${isBad ? "bad" : ""}"><span class="gn">${reals[i]}</span>${f}</div>`;
  }).join("");
  gut.scrollTop = ta.scrollTop;
}
function ideFold(i){
  const E = S.edit, ta = $("stTa"); if(!E || !ta) return;
  const lines = ta.value.split("\n"), rg = ideFoldRanges(lines, ideFolds())[i]; if(!rg) return;
  const folds = ideFolds(); E.foldSeq = (E.foldSeq || 0) + 1; if(E.foldSeq > 6000) return;
  let a = 0; for(let k = 0; k <= i; k++) a += lines[k].length + (k < i ? 1 : 0);   // end of line i
  let b = a; for(let k = i + 1; k <= rg.end; k++) b += 1 + lines[k].length;      // end of line rg.end
  folds[E.foldSeq] = {body: ta.value.slice(a, b), kind: rg.kind, label: rg.label};
  stReplace(ta, a, b, String.fromCharCode(IDE_SENT + E.foldSeq), a, a);
  ideAfterChange(); ta.focus();
}
function ideUnfold(i){
  const ta = $("stTa"); if(!ta) return;
  const lines = ta.value.split("\n"); let a = 0; for(let k = 0; k < i; k++) a += lines[k].length + 1;
  const l = lines[i], j = l.search(IDE_SENT_RE); if(j < 0) return;
  const f = ideFolds()[l.charCodeAt(j) - IDE_SENT];
  stReplace(ta, a + j, a + j + 1, f ? f.body : "", a + j, a + j);
  ideAfterChange();
}
function ideUnfoldAll(){
  const ta = $("stTa"); if(!ta) return false;
  let any = false, guard = 0;
  while(IDE_HAS_SENT.test(ta.value) && guard++ < 500){
    const i = ta.value.split("\n").findIndex(l => IDE_HAS_SENT.test(l)); if(i < 0) break; ideUnfold(i); any = true; }
  return any;
}
function ideAfterChange(){
  const E = S.edit, ta = $("stTa"); if(!E || !E.st || !ta) return;
  E.text = ideExpand(ta.value);
  ideGutter(); if(S.stPaintHi) S.stPaintHi();
}
function ideStEditHook(){
  const E = S.edit, ta = $("stTa"), gut = $("stGut"); if(!E || !E.st || !ta || ta.dataset.ide) return;
  ta.dataset.ide = "1";
  const prevInput = ta.oninput;
  ta.oninput = (e) => { if(prevInput) prevInput(e); E.text = ideExpand(ta.value); ideGutter(); };
  const prevScroll = ta.onscroll; ta.onscroll = (e) => { if(prevScroll) prevScroll(e); gut.scrollTop = ta.scrollTop; };
  gut.onclick = (e) => { const f = e.target.closest("[data-gf],[data-gu]"); if(!f) return;
    if(f.dataset.gf!=null) ideFold(+f.dataset.gf); else ideUnfold(+f.dataset.gu); };
  gut.onmousedown = (e) => { if(e.target.closest(".gf")) e.preventDefault(); };
  ideGutter();
}
(function(){
  const _r = renderST; renderST = function(){ _r(); if(S.edit && S.edit.st) ideStEditHook(); };
  const _p = stPaint; stPaint = function(){ _p(); ideGutter(); };
})();

/* ---------- snippets: keyword + Tab expands the construct, orange placeholders ---------- */
const IDE_SNIP = {
  IF: (i) => `IF bool_expression THEN\n${i}    statement;\n${i}END_IF;`,
  CASE: (i) => `CASE numeric_expression OF\n${i}    selector:\n${i}        statement;\n${i}ELSE\n${i}    statement;\n${i}END_CASE;`,
  FOR: (i) => `FOR count := initial_value TO final_value BY increment DO\n${i}    statement;\n${i}END_FOR;`,
  WHILE: (i) => `WHILE bool_expression DO\n${i}    statement;\n${i}END_WHILE;`,
  REPEAT: (i) => `REPEAT\n${i}    statement;\n${i}UNTIL bool_expression\n${i}END_REPEAT;`};
function idePhAt(v, from, to){
  const re = /[A-Za-z_][A-Za-z0-9_]*/g; re.lastIndex = from; let m;
  while((m = re.exec(v)) && (to==null || m.index < to)){
    if(IDE_PH.has(m[0].toUpperCase()) && !stKnownRoot(m[0], S.R.prog) && !/[.\w]/.test(v[m.index - 1] || "")) return [m.index, m.index + m[0].length];
  }
  return null;
}
(function(){
  const _tab = stTab;
  stTab = function(ta, shift){
    const v = ta.value, s = ta.selectionStart, e = ta.selectionEnd;
    if(!shift && !(e > s && v.slice(s, e).includes("\n"))){
      const info = stLineInfo(ta), w = info.before.trim().toUpperCase();
      if(IDE_SNIP[w] && info.line.trim().toUpperCase()===w && s===e){
        const ind = info.line.match(/^\s*/)[0], txt = IDE_SNIP[w](ind), at = info.ls + ind.length;
        const ph = idePhAt(txt, 0);
        stReplace(ta, at, info.le, txt, ph ? at + ph[0] : at + txt.length, ph ? at + ph[1] : null);
        statusMsg(`${w} construct inserted — type over the orange placeholder, Tab goes to the next one`, "message");
        return;
      }
      const cur = (s!==e && IDE_PH.has(v.slice(s, e).toUpperCase())) ? e : s;
      let end = cur; for(let k = 0; k < 7 && end >= 0; k++) end = v.indexOf("\n", end + 1);
      const ph = idePhAt(v, cur, end < 0 ? null : end);
      if(ph){ ta.setSelectionRange(ph[0], ph[1]); return; }
    }
    return _tab(ta, shift);
  };
})();

/* ---------- go to a line: unfold, centre, flash the blue cursor ---------- */
(function(){
  const _go = stGoLine;
  stGoLine = function(line, col){
    const ta = $("stTa");
    if(ta){ ideUnfoldAll(); _go(line, col);
      const lh = 16; ta.scrollTop = Math.max(0, (line - 1) * lh - (ta.clientHeight - lh) / 2);
      const wrap = ta.parentElement; if(wrap){ const old = wrap.querySelector(".stflash"); if(old) old.remove();
        const f = document.createElement("div"); f.className = "stflash"; f.style.top = (6 + (line - 1) * lh - ta.scrollTop) + "px"; wrap.appendChild(f);
        const move = () => { f.style.top = (6 + (line - 1) * lh - ta.scrollTop) + "px"; }; ta.addEventListener("scroll", move);
        setTimeout(() => { f.remove(); ta.removeEventListener("scroll", move); }, 1600); }
      return; }
    if(S.stViewFold) S.stViewFold(line);
    const v = $("stView"), row = v && v.children[line - 1]; if(!row) return _go(line, col);
    v.querySelectorAll(".curline").forEach(x => x.classList.remove("curline"));
    row.classList.add("curline"); row.scrollIntoView({block:"center"});
    row.classList.remove("flash"); void row.offsetWidth; row.classList.add("flash");
  };
  const _j = stJumpFirstError; stJumpFirstError = function(){ ideUnfoldAll(); return _j(); };
})();

/* going to a rung: the routine may re-render once it has loaded, so the flash and the
   centring are applied to the rung element that is on screen afterwards */
(function(){
  const _g = goToLocation;
  goToLocation = async function(l){
    if(l && l.rung!=null) S.flash = l.rung;
    await _g(l);
    if(!(l && l.rung!=null)) return;
    const done = new WeakSet();
    const fl = () => {
      if(!(S.R && S.R.data && S.R.data.type==="RLL" && S.R.prog===l.program && S.R.routine===l.routine)) return;
      const el = lxRungEl(Math.min(l.rung, lxCount())); if(!el) return;
      if(!done.has(el)){ done.add(el); el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); }
      el.scrollIntoView({block:"center"});
    };
    fl(); setTimeout(fl, 150); setTimeout(fl, 400); setTimeout(() => { if(S.flash===l.rung) S.flash = null; }, 1000);
  };
})();

/* ======================================================================
   Closer to the mockup: continuous rails, drawn contact / coil symbols,
   compact routine header, icon buttons, plain organizer icons
   ====================================================================== */
(function(){
  const svg = (body, stroke) => "url(\"data:image/svg+xml," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='56' height='24' viewBox='0 0 56 24'>${body.replace(/STROKE/g, stroke)}</svg>`) + "\")";
  const BR = "<rect x='21' y='0' width='14' height='24' fill='#FFFFFF'/>";
  const CON = BR + "<path d='M17 2H21V22H17M39 2H35V22H39' fill='none' stroke='STROKE' stroke-width='2'/>";
  const XIO = CON + "<path d='M23 22L33 2' stroke='STROKE' stroke-width='2'/>";
  const COIL = "<rect x='21' y='0' width='14' height='24' fill='#FFFFFF'/><path d='M22 1Q14 12 22 23M34 1Q42 12 34 23' fill='none' stroke='STROKE' stroke-width='2'/>";
  const letter = (c) => COIL + `<text x='28' y='16' text-anchor='middle' font-size='11' font-family='Consolas,monospace' fill='STROKE'>${c}</text>`;
  const SYM = {"][": CON, "]/[": XIO, "()": COIL, "(L)": letter("L"), "(U)": letter("U")};
  const rules = Object.entries(SYM).map(([k, body]) =>
    `.ladder .ins .sym[data-sym="${k}"]{background:${svg(body, "#000000")} center/56px 24px no-repeat!important}
     .ladder .ins.on .sym[data-sym="${k}"]{background:${svg(body, "#00C000")} center/56px 24px no-repeat!important}`).join("\n");
  const css = document.createElement("style");
  css.id = "ideStyles2";
  css.textContent = `
/* power rails run continuously through comments, gaps and insert bars */
.ladder{--railc:#000000}
.ladder.offline{--railc:#808080}
.ladder>.rung[data-n],.ladder>.rung.placeholder,.ladder>.endrung,.ladder>.insbar{
  background-image:linear-gradient(var(--railc),var(--railc)),linear-gradient(var(--railc),var(--railc))!important;
  background-size:1px 100%,1px 100%!important;background-position:40px 0,100% 0!important;background-repeat:no-repeat!important}
.ladder>.insbar{margin:0!important;border-radius:0!important;height:10px}
.ladder>.rung{padding:2px 0 6px!important}
.ladder>.endrung .endline{border-left:1px solid var(--railc)!important;border-right:1px solid var(--railc)!important}
/* contacts and coils drawn as symbols (no text glyphs), tag name above */
.ladder .ins .sym[data-sym]{display:block;box-sizing:border-box;color:transparent!important;width:56px;min-width:56px;height:24px;padding:0!important;outline:none!important;letter-spacing:0;font-size:0!important;line-height:24px}
${rules}
.ladder .ins .tagn{background:transparent}
.ladder .ins .val{font-size:10px;color:#505050!important;line-height:12px}
/* compact routine header on one line */
.ladder>.rhead{flex-wrap:nowrap!important;padding:3px 0 4px!important;font-size:12px;gap:6px!important;white-space:nowrap}
.ladder>.rhead .hint{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}
.ladder>.rhead button{padding:1px 8px;flex:none}
/* Language Element toolbar: the basic elements as 28 x 24 icon buttons */
#lxBar .lxbtns button.lxico{width:30px;min-width:30px!important;height:24px;padding:0!important;display:inline-flex;align-items:center;justify-content:center}
#lxBar .lxbtns button.lxico svg{margin:0!important}
#lxBar .lxbtns button.lxico .lxt{display:none}
`;
  document.head.appendChild(css);
})();
function ideSymbols(){
  document.querySelectorAll("#doc .ladder .ins .sym:not([data-sym])").forEach(s => { s.dataset.sym = s.textContent.replace(/\s+/g, ""); });
}
(function(){
  const _a = window.lxAfterRender; window.lxAfterRender = function(){ if(_a) _a(); ideSymbols(); };
  const _i = ideMountIcons;
  ideMountIcons = function(){
    _i();
    const bar = $("lxBar"); if(!bar) return;
    bar.querySelectorAll("[data-lx], [data-lxr]").forEach(b => {
      const k = b.hasAttribute("data-lxr") ? "RUNG" : String(b.dataset.lx).toUpperCase();
      if(!IDE_ICONS[k] || b.classList.contains("lxico")) return;
      b.classList.add("lxico");
      b.childNodes.forEach(nd => { if(nd.nodeType===3 && nd.textContent.trim()){ const s = document.createElement("span"); s.className = "lxt"; s.textContent = nd.textContent; nd.replaceWith(s); } });
      b.setAttribute("aria-label", k==="RUNG" ? "Rung" : k==="BRANCH" ? "Branch" : k);
    });
  };
})();
/* the Errors tab is always there, also before the first Verify */
renderConsoleTabs();

/* Logix-style rung geometry: the rung line runs at a fixed height (38 px) through every
   element; tag names sit above it, boxes hang below it, the first branch level is on the
   rung line and further levels drop below with square vertical connectors. */
(function(){
  /* --H: height of the rung line in a rung; --dh: room for operand descriptions above
     the tag names (set per rung by look.js), so the line moves down when needed */
  const css = document.createElement("style");
  css.id = "ideStyles3";
  css.textContent = `
.ladder{--H:calc(38px + var(--dh, 0px))}
.ladder .rung,.ladder #erung,.ladder .erung{--H:calc(38px + var(--dh, 0px))}
.ladder .series{align-items:stretch}
.ladder .wire{background:linear-gradient(#000,#000) 0 var(--H)/100% 1px no-repeat!important;min-height:calc(var(--H) + 14px)}
.ladder .wire.pf{background:linear-gradient(#00FF00,#00FF00) 0 calc(var(--H) - 1px)/100% 2px no-repeat!important}
.ladder .wire::after{top:var(--H)!important}
.ladder .ins{justify-content:flex-start!important;padding:calc(2px + var(--dh, 0px)) 4px 4px!important;background:linear-gradient(#000,#000) 0 var(--H)/100% 1px no-repeat!important}
.ladder .ins>.tagn{height:24px;display:flex;align-items:flex-end;justify-content:center;line-height:12px;text-align:center;overflow:hidden}
.ladder .ins>.sym{margin:0}
.ladder .ins:has(>.box){padding-top:calc(var(--H) - 12px)!important}
.ladder .branch{border-left:none!important;border-right:none!important;margin:0!important;justify-content:flex-start}
.ladder .branch>.series{position:relative;margin:0!important;min-height:calc(var(--H) + 22px)}
.ladder .branch>.series::before,.ladder .branch>.series::after{content:"";position:absolute;width:1px;background:var(--railc,#000);top:0;bottom:0;z-index:1}
.ladder .branch>.series::before{left:0}.ladder .branch>.series::after{right:0}
.ladder .branch>.series:first-child::before,.ladder .branch>.series:first-child::after{top:var(--H)}
.ladder .branch>.series:last-child::before,.ladder .branch>.series:last-child::after{bottom:auto;height:calc(var(--H) + 1px)}
.ladder .branch>.series:only-child::before,.ladder .branch>.series:only-child::after{display:none}
.ladder .rline{align-items:stretch}
.ladder>.rung[data-n]>.rnum,.ladder>.rung.placeholder>.rnum{margin-top:calc(var(--H) * var(--lz, 1) - 11px)!important}
`;
  document.head.appendChild(css);
  /* the rung number block follows the rung line through CSS (--H, zoom) */
  ideRungNumberY = function(){};
})();
/* the rung editor draws the same symbols */
(function(){ const _re = renderEditor; renderEditor = function(){ const r = _re.apply(this, arguments); ideSymbols(); return r; };
  const _be = bindEditor; bindEditor = function(){ const r = _be.apply(this, arguments); ideSymbols(); return r; }; })();
