"use strict";
/* Ladder view and rung editing closer to Logix Designer (0.14.0):
   - long rungs scroll sideways (each rung is as wide as the view or its own logic);
   - a Language Element toolbar above the routine (instruction families, Rung, Branch,
     Branch Level) that adds at the insertion point of the rung being edited, or starts
     an edit at the ladder caret; buttons can also be dragged onto the rung;
   - insertion points: every wire of the edited rung can be clicked to put the
     insertion point there (before/after an element, inside a branch level);
   - while a rung is edited the original rung stays visible underneath (marked r);
   - Logic menu: Add Rung / Element / Branch / Branch Level, Edit, Finalize, Cancel. */

(function(){
const css = document.createElement("style");
css.textContent = `
#lxBar{position:sticky;top:0;z-index:4;display:flex;flex-direction:column;gap:2px;background:var(--pane);border-bottom:1px solid var(--line);padding:3px 0 4px;margin-bottom:4px;width:var(--ladw,100%)}
#lxBar .lxtabs{display:flex;flex-wrap:nowrap;gap:2px;overflow-x:auto;scrollbar-width:thin}
#lxBar .lxtabs button{flex:0 0 auto;white-space:nowrap}
.rung.erung{width:var(--ladw,100%);min-width:0}.erung .ebody{min-width:0}
.erung .eline{overflow-x:auto;padding-bottom:4px}
.erung .eline>.series{min-width:max-content}
#lxBar .lxtabs button{font-size:11px;padding:1px 7px;border-radius:4px 4px 0 0;opacity:.75;font-family:var(--lfont)}
#lxBar .lxtabs button.on{opacity:1;background:var(--sel);border-bottom-color:transparent;font-weight:600}
#lxBar .lxbtns{display:flex;flex-wrap:nowrap;gap:3px;align-items:center;overflow-x:auto;scrollbar-width:thin;min-height:26px}
#lxBar .lxbtns button{flex:0 0 auto}
#lxBar .lxbtns button{font-family:var(--mono);font-size:11.5px;padding:2px 7px;min-width:38px}
#lxBar .lxbtns .sep{width:1px;height:18px;background:var(--line);margin:0 4px}
#lxBar .lxbtns .lxst{font-family:var(--lfont);font-size:11px;color:var(--mut);margin-left:auto;padding-left:10px;white-space:nowrap;flex:0 0 auto}
#lxBar button.bound{border-style:dashed}
.ladder .rhead{top:0}
.erung .wire[data-ip]{position:relative;cursor:pointer;min-height:22px}
.erung .wire[data-ip]::after{content:"";position:absolute;left:50%;top:50%;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;
  border:1.5px solid var(--off);background:var(--pane);opacity:.0;transition:opacity .1s}
.erung .eline:hover .wire[data-ip]::after{opacity:.75}
.erung .wire[data-ip]:hover::after{opacity:1;border-color:var(--acc);transform:scale(1.25)}
.erung .wire[data-ip].ipsel::after{opacity:1;width:12px;height:12px;margin:-6px 0 0 -6px;background:var(--acc);border-color:var(--acc);box-shadow:0 0 0 3px color-mix(in srgb,var(--acc) 30%,transparent)}
.erung .wire[data-ip].drop::after{opacity:1;background:var(--on);border-color:var(--on)}
.rung.orig{opacity:.62;border-top:1px dotted var(--editline)}
.rung.orig .rline{border-left-style:dashed;border-right-style:dashed}
.rmark{display:inline-block;background:var(--off);color:var(--pane);font-weight:800;border-radius:3px;padding:0 4px;margin-right:2px}
.eiphint{font-size:11px;color:var(--mut);margin:2px 0 0}
.erung .etools{gap:4px;margin-bottom:4px}.erung .etools button{padding:1px 7px;font-size:11.5px}
.erung .etitle{display:none}.erung .ehint{display:none}.erung .finbar{padding:4px 8px;margin-top:4px}`;
document.head.appendChild(css);
})();

/* ---------- width of the view for the rungs (CSS --ladw) ---------- */
(function(){
  const doc = $("doc");
  const set = () => doc.style.setProperty("--ladw", Math.max(300, doc.clientWidth - 28) + "px");
  set();
  if("ResizeObserver" in window) new ResizeObserver(set).observe(doc); else addEventListener("resize", set);
})();

/* ---------- insertion points ---------- */
function ipList(lk){
  const E = S.edit; if(!E) return null;
  if(lk==="T") return E.tree;
  const [bid, li] = lk.split(":").map(Number);
  const f = findNode(bid); return f && f.node.kind==="branch" ? f.node.legs[li] : null;
}
function ipParse(s){ const i = s.lastIndexOf(":"); return {lk: s.slice(0, i), k: +s.slice(i+1)}; }
function setIp(ip){ const E = S.edit; if(!E) return; E.ip = ip; E.sel = null; renderEditor(); }
const _placeNode = placeNode;
placeNode = function(node, rel){
  if(rel && rel.ip){ const list = ipList(rel.ip.lk); if(list){ list.splice(Math.min(rel.ip.k, list.length), 0, node); return; } }
  return _placeNode(node, rel);
};
/* the insertion point wins over the selection; after an add it moves past the new element */
const _addInstr2 = addInstr;
addInstr = function(name, rel){
  const E = S.edit; if(!E) return;
  if(rel===undefined && E.ip && String(name).toUpperCase()!=="BRANCH"){
    const ip = E.ip; _addInstr2(name, {ip});
    if(S.edit){ S.edit.ip = {lk: ip.lk, k: ip.k + 1}; paintIp(); }
    return;
  }
  return _addInstr2(name, rel);
};
const _addBranch = addBranch;
addBranch = function(){
  const E = S.edit; if(!E || E.textMode) return;
  if(E.ip && !(E.sel && E.sel.id!=null)){            // a new branch at the insertion point, cursor in its first level
    const list = ipList(E.ip.lk); if(!list) return _addBranch();
    edPush();
    const br = {kind:"branch", _id: nextNode++, legs:[[], []]};
    list.splice(Math.min(E.ip.k, list.length), 0, br);
    E.ip = {lk: `${br._id}:0`, k: 0}; E.sel = null;
    renderEditor(); scheduleValidate(0, true); return;
  }
  _addBranch();                                      // wraps the selected element (or adds an empty branch)
  const E2 = S.edit;
  if(E2 && E2.sel && E2.sel.leg!=null){ E2.ip = {lk: `${E2.sel.leg}:${E2.sel.li}`, k: 0}; paintIp(); }
};
function addLevel(){
  const E = S.edit; if(!E) return;
  if(E.ip && E.ip.lk!=="T"){ const bid = +E.ip.lk.split(":")[0]; const f = findNode(bid);
    if(f){ edPush(); f.node.legs.push([]); E.ip = {lk: `${bid}:${f.node.legs.length-1}`, k: 0}; E.sel = null; renderEditor(); scheduleValidate(0, true); return; } }
  addLeg();
  if(S.edit && S.edit.sel && S.edit.sel.leg!=null){ S.edit.ip = {lk: `${S.edit.sel.leg}:${S.edit.sel.li}`, k: 0}; paintIp(); }
}
function paintIp(){
  const host = $("erung"); if(!host) return; const E = S.edit;
  host.querySelectorAll(".wire.ipsel").forEach(w => w.classList.remove("ipsel"));
  if(E && E.ip){ const w = host.querySelector(`.wire[data-ip="${CSS.escape(E.ip.lk + ":" + E.ip.k)}"]`); if(w) w.classList.add("ipsel"); }
  const h = host.querySelector(".eiphint");
  if(h) h.textContent = E && E.ip ? "Insertion point set (●): toolbar buttons, quick keys and Alt+Insert add here." : E && E.sel ? "Element selected: new elements go " + (S.insMode==="INS" ? "before" : "after") + " it (Ctrl+I switches)." : "Click a wire to set the insertion point, or click an element to select it.";
}

/* ---------- editor: wire clicks, drops on wires, original rung, hint ---------- */
const _bindEditor2 = bindEditor;
bindEditor = function(){
  _bindEditor2();
  const E = S.edit, host = $("erung"); if(!E || !host) return;
  /* the palette lives in the Language Element toolbar now; keep "other…" here */
  const grp = host.querySelector(".etools .egrp.pal-grp, .etools .egrp");
  if(grp && grp.querySelector("[data-add]")){ const other = grp.querySelector("#eOther"); grp.innerHTML = ""; grp.classList.remove("pal-grp");
    if(other){ grp.appendChild(other); other.placeholder = "add instruction…"; } }
  const line = host.querySelector(".eline");
  if(line){
    line.addEventListener("click", (e) => { const w = e.target.closest(".wire[data-ip]"); if(!w || e.target.closest(".ins")) return;
      e.stopPropagation(); setIp(ipParse(w.dataset.ip)); }, true);
    const prevOver = line.ondragover, prevDrop = line.ondrop;
    line.ondragover = (e) => { if(prevOver) prevOver(e); const w = e.target.closest(".wire[data-ip]");
      host.querySelectorAll(".wire.drop").forEach(x => x.classList.remove("drop"));
      if(w && e.dataTransfer.types.includes("text/x-vcs-instr")){ e.preventDefault(); w.classList.add("drop"); } };
    line.ondrop = (e) => { const w = e.target.closest(".wire[data-ip]"), name = e.dataTransfer.getData("text/x-vcs-instr");
      host.querySelectorAll(".wire.drop").forEach(x => x.classList.remove("drop"));
      if(w && name){ e.preventDefault(); host.querySelectorAll(".dropL,.dropR,.dropIn").forEach(x=>x.classList.remove("dropL","dropR","dropIn"));
        const ip = ipParse(w.dataset.ip); S.edit.ip = ip;
        if(name.toUpperCase()==="BRANCH") addBranch(); else addInstr(name); return; }
      if(prevDrop) prevDrop(e); };
    if(!host.querySelector(".eiphint")) line.insertAdjacentHTML("afterend", `<div class="eiphint"></div>`);
  }
  const br = $("eBranch"); if(br) br.onclick = addBranch;
  const lg = $("eLeg"); if(lg) lg.onclick = addLevel;
  paintIp(); lxBarState();
};
/* a new rung starts with the insertion point at its start */
const _startInsert = startInsert;
startInsert = function(at){ _startInsert(at); if(S.edit && !S.edit.st && S.edit.mode==="insert" && !S.edit.ip){ S.edit.ip = {lk:"T", k:0}; paintIp(); } };

/* ---------- Language Element toolbar ---------- */
S.lxTab = lsGet("LxTab") || "Favorites";
function lxGroups(){ return typeof palGroups==="function" ? palGroups() : {Favorites: PALETTE.map(p=>p[0])}; }
function lxBarHtml(){
  const g = lxGroups(); if(!g[S.lxTab]) S.lxTab = "Favorites";
  const qk = Object.entries(typeof quickMap==="function" ? quickMap() : {});
  const btn = (m) => { const sp = spec(m), aoi = sp ? null : aoiDef(m), k = qk.find(([,v])=>v===m);
    return `<button class="lxb ${sp && sp.status==="boundary" ? "bound" : ""}" data-lx="${esc(m)}" draggable="true" title="${esc(m)} — ${esc(sp ? sp.title : aoi ? (aoi.description || "Add-On Instruction") : "")}${k ? ` (quick key ${k[0].toUpperCase()})` : ""}\nClick: add at the insertion point · drag onto the rung">${esc(m)}</button>`; };
  return `<div class="lxtabs" role="tablist">${Object.keys(g).map(k => `<button type="button" role="tab" data-lxt="${esc(k)}" class="${k===S.lxTab?"on":""}">${esc(k)}</button>`).join("")}</div>
    <div class="lxbtns"><button data-lxr title="Add a rung (Ctrl+R)">Rung</button><button data-lx="BRANCH" draggable="true" title="Add Branch at the insertion point (quick key B)">⑂ Branch</button><button data-lxl title="Add a branch level to the branch at the insertion point">+ Level</button>
      <span class="sep"></span>${g[S.lxTab].map(btn).join("")}<span class="lxst" id="lxSt"></span></div>`;
}
function lxBarState(){
  const st = $("lxSt"); if(!st) return; const E = S.edit;
  st.textContent = !lxEditable() ? "read-only routine" : E && !E.st ? (E.ip ? `rung ${E.mode==="insert" ? "i" : "e"}${E.index}: adds at ●` : `rung ${E.index}: adds ${S.insMode==="INS" ? "before" : "after"} the selection`) : `adds at the caret (rung ${lxSel().caret.rung})`;
}
function lxBarAdd(name){
  if(!lxEditable()){ log("This routine cannot be edited", "wrn"); return; }
  if(name==="BRANCH"){ if(S.edit && !S.edit.st) addBranch(); else { addAtCaret("BRANCH"); } return; }
  if(S.edit && !S.edit.st){ addInstr(name); return; }
  addAtCaret(name);
}
function mountLxBar(){
  if(!lxIsLadder() && !(S.R && S.R.data && S.R.data.type==="RLL" && S.active===lxKey())) return;
  const w = lxWrap(); if(!w || !S.R.data.editable) return;
  let bar = $("lxBar");
  if(!bar){ bar = document.createElement("div"); bar.id = "lxBar"; bar.setAttribute("role", "toolbar"); bar.setAttribute("aria-label", "Language elements");
    const h = w.querySelector(".rhead"); if(h) h.after(bar); else w.prepend(bar); }
  const h = w.querySelector(".rhead"); bar.style.top = (h ? h.offsetHeight : 0) + "px";
  bar.innerHTML = lxBarHtml();
  bar.querySelectorAll("[data-lxt]").forEach(b => b.onclick = () => { S.lxTab = b.dataset.lxt; lsSet("LxTab", S.lxTab); mountLxBar(); });
  bar.querySelectorAll("[data-lx]").forEach(b => {
    b.onclick = () => lxBarAdd(b.dataset.lx);
    b.ondragstart = (e) => { e.dataTransfer.setData("text/x-vcs-instr", b.dataset.lx); e.dataTransfer.setData("text/plain", b.dataset.lx==="BRANCH" ? "[,]" : b.dataset.lx + "(?)"); e.dataTransfer.effectAllowed = "copy"; }; });
  const r = bar.querySelector("[data-lxr]"); if(r) r.onclick = () => { if(S.edit){ log("Finish or cancel the open edit first", "wrn"); return; } const c = lxSel().caret; startInsert(c.rung>=lxCount() ? lxCount() : lxModeIdx(c.rung)); };
  const l = bar.querySelector("[data-lxl]"); if(l) l.onclick = () => { if(!(S.edit && !S.edit.st)){ log("Select a branch in the rung being edited first", "wrn"); return; } addLevel(); };
  lxBarState();
}
const _afterRender3 = window.lxAfterRender;
window.lxAfterRender = function(){ if(_afterRender3) _afterRender3(); mountLxBar(); };
/* the bar's status follows the caret */
const _lxSetCaret = lxSetCaret;
lxSetCaret = function(...a){ const r = _lxSetCaret(...a); lxBarState(); return r; };
window.addEventListener("keyup", () => { if($("lxSt")) lxBarState(); });

/* quick keys and Add Element use the insertion point too: addAtCaret → addInstr already does */
/* "b" quick key / BRANCH from the toolbar when no edit is open: start one at the caret */
const _addAtCaret = addAtCaret;
addAtCaret = function(name){
  if(String(name).toUpperCase()==="BRANCH" && !S.edit){
    if(!lxIsLadder() || !lxEditable()) return;
    const c = lxSel().caret, cnt = lxCount();
    if(c.rung>=cnt || !cnt) startInsert(cnt); else startEdit(c.rung, c.iid);
    if(S.edit) addBranch(); return;
  }
  return _addAtCaret(name);
};

/* ---------- Logic menu: ladder editing commands ---------- */
if(typeof MENUS!=="undefined"){
  const li = MENUS.findIndex(m => m[0]==="Logic");
  if(li >= 0){ const base = MENUS[li][2];
    MENUS[li][2] = () => { const ed = lxIsLadder() || (S.R && S.R.data && S.R.data.type==="RLL" && S.active===lxKey());
      const can = ed && lxEditable(), editing = !!(S.edit && !S.edit.st);
      return [
        ["Add Rung", () => { const c = lxSel().caret; startInsert(c.rung>=lxCount() ? lxCount() : lxModeIdx(c.rung)); }, !can || editing, "Ctrl+R"],
        ["Add Element…", () => addElementDialog(), !can, "Alt+Insert"],
        ["Add Branch", () => lxBarAdd("BRANCH"), !can],
        ["Add Branch Level", () => addLevel(), !editing],
        ["Edit Rung", () => { const c = lxSel().caret; if(c.rung<lxCount()) startEdit(c.rung, c.iid); }, !can || editing, "Enter"],
        ["Finalize Rung Edit", () => finalize(), !editing || !(S.edit.checked && S.edit.valid), "Ctrl+Enter"],
        ["Cancel Rung Edit", () => cancelEdit(), !editing, "Esc"], "-",
        ...base()]; };
  }
}
window.addLevel = addLevel; window.setIp = setIp;
