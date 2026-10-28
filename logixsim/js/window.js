"use strict";
/* Main window (gap report 5.6): menu bar (File, Edit, View, Search, Logic, Communications,
   Tools, Window, Help), toolbar Undo / Redo / search box / Verify menu, controller status
   menu, status bar fields, tab menu and tab keys, hide / restore panes (Alt+0/1/2),
   Reset Window Layout, ladder zoom, print, Options, keyboard shortcut list. */

(function(){
const css = document.createElement("style");
css.textContent = `
body{grid-template-rows:auto auto 1fr auto}
#menubar{display:flex;gap:0;padding:0 6px;background:var(--pane);border-bottom:1px solid var(--line);font-size:13px;user-select:none}
#menubar .mb{padding:3px 9px;border-radius:4px;cursor:default}#menubar .mb:hover,#menubar .mb.open{background:var(--sel)}
#menubar .mb u{text-decoration:underline}
#bSearch{width:150px}#bar .tsearch{display:flex;gap:2px;align-items:center}
#modebox{cursor:pointer}
#status span.click{cursor:pointer}#status span.click:hover{color:var(--ink);text-decoration:underline}
.tab.dragover{box-shadow:inset 3px 0 0 var(--acc)}
#work.noorg{--orgW:0px!important}#work.noorg #org,#work.noorg #spOrg{display:none}
#work.nocon{--conH:0px!important}#work.nocon #console,#work.nocon #spCon{display:none}
#work.noprops{--propsW:0px!important}#work.noprops #props,#work.noprops #spProps{display:none}
.keys td{padding:2px 8px;font-size:12px}.keys td:first-child{font-family:var(--mono);white-space:nowrap}
@media print{#menubar,#bar,#org,#props,#console,#status,#tabs,.split,.insbar,.rhead button{display:none!important}
  body,#work,#center,#doc{display:block!important;overflow:visible!important;height:auto!important}
  .rung{break-inside:avoid;content-visibility:visible!important}}`;
document.head.appendChild(css);
})();

/* ---------- context helpers ---------- */
const inRoutine = () => !!(S.R && S.active===lxKey() && S.R.data);
const inLadder = () => lxIsLadder();
const inTags = () => !!(S.active && S.active.startsWith("tags:"));
const authoring = () => !!(S.project && S.project.authoring);
function clipCmd(kind){
  if(inLadder() && !S.edit){ if(kind==="copy") lxCopy(); else if(kind==="cut") lxCut(); else if(kind==="paste") lxPaste(null); else if(kind==="delete") lxDelete(); return; }
  if(inTags() && S.tagGrid){ const V = S.tagGrid.view, list = V.sel.size ? [...V.sel] : (S.sel ? [S.sel] : []);
    if(kind==="copy") copyRows(list); else if(kind==="delete") deleteTags(list.filter(a=>S.tagDefs[a]));
    else if(kind==="paste" && S.tagGrid.mode==="edit") (navigator.clipboard && navigator.clipboard.readText ? navigator.clipboard.readText() : Promise.resolve(S.tagClip||"")).then(t => S.tagGrid.pasteRows(t || S.tagClip || "")).catch(()=>S.tagGrid.pasteRows(S.tagClip||""));
    return; }
  if(S.treeSel && document.activeElement && document.activeElement.closest && document.activeElement.closest("#org")){ if(kind==="copy") orgCopy(S.treeSel); else if(kind==="paste") orgPaste(S.treeSel); return; }
  log("Select rungs, instructions or tags first", "wrn");
}
function doUndo(redo){
  if(S.edit && !S.edit.st){ redo ? edRedo() : edUndo(); return; }
  if(inRoutine() && S.R.data.editable){ redo ? lxRedo() : lxUndo(); return; }
  if(redo){ log("Redo is available inside routines", "wrn"); return; }
  projectUndoAsk();
}
function selAll(){ if(inLadder()){ const c = lxSel().caret; if(c.iid!=null){ lxSel().ins = new Set(lxInstrs(c.rung).map((_,i)=>i)); lxPaint(); } else if(lxCount()) lxSelectRungs(0, lxCount()-1); }
  else if(inTags() && S.tagGrid){ const rows = [...document.querySelectorAll("#doc tr[data-addr]")]; S.tagGrid.view.sel = new Set(rows.map(r=>r.dataset.addr)); rows.forEach(r=>r.classList.add("msel")); } }
function forceSel(v){ const a = S.sel; if(!a){ log("Select a tag or an instruction first", "wrn"); return; } v===null ? unforce(a) : force(a, v); }
function propsCmd(){
  if(inLadder()){ const c = lxSel().caret; if(c.iid!=null){ const op = lxOpAddr(c.rung, c.iid, c.op); const d = op && op.addr && findDef(op.addr); if(d) return tagPropertiesDialog(d); } }
  if(inRoutine()){ const pr = (S.project.tasks.flatMap(t=>t.programs).concat(S.project.unscheduled)).find(p=>p.name===S.R.prog); const r = pr && pr.routines.find(x=>x.name===S.R.routine); if(r) return routinePropsDialog(S.R.prog, r); }
  if(S.sel && findDef(S.sel)) return tagPropertiesDialog(findDef(S.sel));
  if(S.treeSel){ const it = (menuFor(S.treeSel)||[]).find(x => Array.isArray(x) && /^(Properties|Controller Properties)/.test(x[0])); if(it) return it[1](); }
  controllerPropsDialog();
}

/* ---------- menu bar ---------- */
const MENUS = [
  ["File", "F", () => [
    ["New Project…", newProjectDialog, false, "Alt+N"], ["Open…", openProjectDialog, false, "Ctrl+O"], ["Save", ()=>saveProject(false), !hasProject(), "Ctrl+S"], ["Save As…", ()=>saveProject(true), !hasProject(), "Ctrl+Shift+S"], "-",
    ["Import L5X…", ()=>$("file").click()], ["Export L5X", ()=>{ location.href = "/api/studio/export"; }, !hasProject()], "-",
    ["Print…", printView, !S.active, "Ctrl+P"], "-", ["Undo last project change", undoProjectChange, !authoring()]]],
  ["Edit", "E", () => [
    ["Undo", ()=>doUndo(false), false, "Ctrl+Z"], ["Redo", ()=>doUndo(true), false, "Ctrl+Y"], "-",
    ["Cut", ()=>clipCmd("cut"), !inLadder(), "Ctrl+X"], ["Copy", ()=>clipCmd("copy"), false, "Ctrl+C"], ["Paste", ()=>clipCmd("paste"), false, "Ctrl+V"], ["Delete", ()=>clipCmd("delete"), false, "Del"],
    ["Select All", selAll, !(inLadder() || inTags()), "Ctrl+A"], "-",
    ["Add Element…", ()=>window.addElementDialog && addElementDialog(), !(inLadder() && lxEditable()), "Alt+Insert"],
    ["Edit Description…", ()=>{ if(S.sel) tagDescDialog(S.sel); }, !S.sel, "Ctrl+D"],
    ["Toggle Bit", toggleSelected, false, "Ctrl+T"], ["Force On", ()=>forceSel(true)], ["Force Off", ()=>forceSel(false)], ["Remove Force", ()=>forceSel(null)], "-",
    ["Properties", propsCmd, !hasProject(), "Alt+Enter"], ["Controller Properties…", controllerPropsDialog, !hasProject()]]],
  ["View", "V", () => [
    [`${paneShown("org")?"✔ ":""}Controller Organizer`, ()=>togglePane("org"), false, "Alt+0"],
    [`${paneShown("con")?"✔ ":""}Output / Errors / Watch`, ()=>togglePane("con"), false, "Alt+1"],
    [`${paneShown("props")?"✔ ":""}Properties`, ()=>togglePane("props"), false, "Alt+2"], "-",
    ["Errors", ()=>showCon("errors")], ["Search Results", ()=>showCon("search")], ["Watch", ()=>showCon("watch")], "-",
    ["Zoom In", ()=>zoomBy(1), !inRoutine(), "Ctrl+="], ["Zoom Out", ()=>zoomBy(-1), !inRoutine(), "Ctrl+-"], ["Zoom 100%", ()=>zoomSet(1), !inRoutine(), "Ctrl+0"], "-",
    [`${S.showDesc?"✔ ":""}Show Operand Descriptions`, ()=>window.toggleOperandDesc && toggleOperandDesc()],
    [`${S.showQuick?"✔ ":""}Show Quick Key Map`, ()=>window.toggleQuickMap && toggleQuickMap()],
    [currentDark() ? "Light Mode" : "Dark Mode", ()=>$("bTheme").click()]]],
  ["Search", "S", () => [
    ["Find…", ()=>findDialog(false), false, "Ctrl+F"], ["Replace…", ()=>findDialog(true), !authoring(), "Ctrl+H"], ["Go To…", goToDialog, false, "Ctrl+G"], "-",
    ["Find Next", ()=>navKeys(new KeyboardEvent("keydown", {key:"F3"})), false, "F3"], ["Find Previous", ()=>navKeys(new KeyboardEvent("keydown", {key:"F3", shiftKey:true})), false, "Shift+F3"], "-",
    ["Cross Reference", xrefContext, false, "Ctrl+E"], ["Next Error", ()=>stepError(1), false, "F4"], ["Previous Error", ()=>stepError(-1), false, "Shift+F4"], "-",
    ["Next Result", ()=>S.hits.length && goHit((S.hitIdx+1) % S.hits.length)], ["Previous Result", ()=>S.hits.length && goHit((S.hitIdx-1+S.hits.length) % S.hits.length)]]],
  ["Logic", "L", () => [
    ["Monitor Tags", ()=>openTags(inTags() ? S.active.slice(5) : "controller", null, "monitor")], ["Edit Tags", ()=>openTags(inTags() ? S.active.slice(5) : "controller", null, "edit")], "-",
    ["Verify Routine", ()=>inRoutine() && verifyScope({program:S.R.prog, routine:S.R.routine}), !inRoutine()],
    ["Verify Program", ()=>inRoutine() && verifyScope({program:S.R.prog}), !inRoutine()],
    ["Verify Controller", ()=>verifyScope(null), !hasProject()], "-",
    [`${S.insMode==="INS"?"✔ ":""}Insert Mode`, ()=>{ if(S.insMode!=="INS") toggleInsMode(); }, false, "Ctrl+I"], [`${S.insMode==="APP"?"✔ ":""}Append Mode`, ()=>{ if(S.insMode!=="APP") toggleInsMode(); }], "-",
    ["Enable All I/O Forces", ()=>forceAll("enable")], ["Disable All I/O Forces", ()=>forceAll("disable")], ["Remove All I/O Forces", ()=>forceAll("remove")]]],
  ["Communications", "C", () => { const m = (S.state||{}).mode || "PROGRAM"; return [
    ["Run Mode", ()=>mode("run"), m==="RUN"], ["Program Mode", ()=>mode("stop"), m==="PROGRAM"], ["Pause", ()=>mode("pause"), m!=="RUN"], ["Single Scan", ()=>mode("step"), m==="RUN" || m==="FAULTED"], ["Reset Tags…", resetTags], "-",
    [`${(S.state||{}).timing==="exact"?"":"✔ "}Real Time`, ()=>{ if((S.state||{}).timing==="exact") toggleTiming(); }], [`${(S.state||{}).timing==="exact"?"✔ ":""}Exact Controller Time`, ()=>{ if((S.state||{}).timing!=="exact") toggleTiming(); }], "-",
    ["Go To Faults", ()=>showCon("faults")], ["Connections…", openConnections]]; }],
  ["Tools", "T", () => [["Options…", optionsDialog], ["Assign Quick Keys…", ()=>window.quickKeysDialog && quickKeysDialog()]]],
  ["Window", "W", () => [
    ["Next Tab", ()=>cycleTab(1), S.tabs.length<2, "Ctrl+F6"], ["Previous Tab", ()=>cycleTab(-1), S.tabs.length<2, "Ctrl+Shift+F6"], "-",
    ["Close", ()=>S.active && closeTab(S.active), !S.active, "Ctrl+Shift+F4"], ["Close All But This", ()=>closeOthers(S.active), S.tabs.length<2], ["Close All", closeAll, !S.tabs.length], "-",
    ["Reset Window Layout", resetLayout], "-",
    ...S.tabs.slice(0, 12).map((t, i) => [`${t.id===S.active?"✔ ":""}${i+1} ${t.title}`, ()=>activateTab(t.id)])]],
  ["Help", "H", () => [["Instruction Help", helpF1, false, "F1"], ["Keyboard Shortcuts", shortcutsDialog], "-", ["About VirtualControlStudio", about]]],
];
function buildMenubar(){
  const mb = document.createElement("div"); mb.id = "menubar"; mb.setAttribute("role", "menubar");
  mb.innerHTML = MENUS.map(([n, k], i) => `<div class="mb" data-m="${i}" role="menuitem">${n.replace(k, `<u>${k}</u>`)}</div>`).join("");
  document.body.insertBefore(mb, $("bar"));
  mb.addEventListener("click", (e) => { const t = e.target.closest(".mb"); if(!t) return; e.stopPropagation(); openMenu(+t.dataset.m); });
  mb.addEventListener("mouseover", (e) => { const t = e.target.closest(".mb"); if(t && S.mbOpen!=null && +t.dataset.m!==S.mbOpen) openMenu(+t.dataset.m); });
}
function openMenu(i){
  const el = document.querySelector(`#menubar .mb[data-m="${i}"]`); if(!el) return;
  document.querySelectorAll("#menubar .mb.open").forEach(x=>x.classList.remove("open")); el.classList.add("open");
  S.mbOpen = i;
  showMenu(null, MENUS[i][2](), el, {onSide: (d) => openMenu((i + d + MENUS.length) % MENUS.length),
                                      onClose: () => { if(S.mbOpen===i){ S.mbOpen = null; el.classList.remove("open"); } }});
}
buildMenubar();

/* ---------- toolbar: Undo/Redo, search box, Verify menu, mode menu ---------- */
(function(){
  const g = document.createElement("div"); g.className = "grp";
  g.innerHTML = `<button id="bUndo" title="Undo (Ctrl+Z)">↶</button><button id="bRedo" title="Redo (Ctrl+Y)">↷</button>
    <span class="tsearch"><input id="bSearch" list="tagList" placeholder="Find in logic… (Enter)" title="Enter: Find Next · Shift+Enter: Find Previous"><button id="bSearchAll" title="Find All">⋯</button></span>`;
  $("bar").insertBefore(g, $("modebox"));
  $("bUndo").onclick = () => doUndo(false); $("bRedo").onclick = () => doUndo(true);
  const run = async (all, dir) => { const q = $("bSearch").value.trim(); if(!q) return;
    if(S.find.q!==q || all){ S.find.q = q; S.find.scope = inRoutine() ? "routine" : "all"; S.hitIdx = -1; await runFind(all); }
    if(!all) findNextFrom(dir); };
  $("bSearch").onkeydown = (e) => { if(e.key==="Enter"){ e.preventDefault(); run(false, e.shiftKey ? -1 : 1); } if(e.key==="Escape") $("bSearch").blur(); };
  $("bSearchAll").onclick = () => run(true, 1);
  const vb = $("bVerify");
  vb.oncontextmenu = (e) => { e.preventDefault(); verifyMenu(vb); };
  vb.title = "Verify the controller (right-click: Verify Routine / Program)";
  const arrow = document.createElement("button"); arrow.id = "bVerifyMenu"; arrow.textContent = "▾"; arrow.title = "Verify Routine / Program / Controller";
  arrow.style.padding = "4px 5px"; vb.after(arrow); arrow.onclick = (e) => { e.stopPropagation(); verifyMenu(arrow); };
  $("modebox").title = "Controller mode — click for Run / Program / Pause / Single Scan / Go To Faults";
  $("modebox").onclick = (e) => { e.stopPropagation(); modeMenu(); };
})();
function verifyMenu(anchor){ showMenu(null, [["Verify Routine", ()=>verifyScope({program:S.R.prog, routine:S.R.routine}), !inRoutine()], ["Verify Program", ()=>verifyScope({program:S.R.prog}), !inRoutine()], ["Verify Controller", ()=>verifyScope(null)]], anchor); }
function modeMenu(){
  const s = S.state || {}, m = s.mode || "PROGRAM";
  showMenu(null, [
    ...(s.major_fault ? [[`MAJOR FAULT T${s.major_fault.type} C${s.major_fault.code}: ${s.major_fault.text}`.slice(0, 90), ()=>showCon("faults")], "-"] : []),
    ["Run Mode", ()=>mode("run"), m==="RUN"], ["Program Mode", ()=>mode("stop"), m==="PROGRAM"], ["Pause", ()=>mode("pause"), m!=="RUN"], ["Single Scan", ()=>mode("step"), m==="RUN" || m==="FAULTED"], "-",
    ["Go To Faults", ()=>showCon("faults")], ["Controller Properties…", controllerPropsDialog, !hasProject()]], $("modebox"));
}
async function forceAll(what){
  const n = Object.keys(S.forces).length;
  const t = {enable:["Enable all I/O forces?", `${n} installed force(s) will override the logic.`], disable:["Disable all I/O forces?", "Installed forces stay but stop overriding the logic."], remove:["Remove all I/O forces?", `${n} force(s) will be removed.`]}[what];
  if(await dialog({title:t[0], body:`<p>${t[1]}</p>`, buttons:[["Cancel","cancel"],["Yes","ok","pri"]]})!=="ok") return;
  if(what==="remove") await api("DELETE","/api/v1/forces"); else await api("PUT","/api/v1/forces/enabled",{enabled: what==="enable"});
  log(`I/O forces: ${what}`, "wrn"); await refreshForces();
}
function showCon(tab){ if(!paneShown("con")) togglePane("con"); S.ctab = tab; renderConsoleTabs(); renderConsole(); }

/* ---------- panes: hide / show / reset ---------- */
const PANECLS = {org:"noorg", con:"nocon", props:"noprops"};
function paneShown(p){ return !$("work").classList.contains(PANECLS[p]); }
function togglePane(p, show){
  const w = $("work"), on = show!=null ? show : !paneShown(p);
  w.classList.toggle(PANECLS[p], !on);
  const hidden = Object.keys(PANECLS).filter(k => !paneShown(k)); lsSet("HiddenPanes", JSON.stringify(hidden));
  if(on && p==="org") setTimeout(()=>$("tree").focus(), 0);
}
try { JSON.parse(lsGet("HiddenPanes") || "[]").forEach(p => PANECLS[p] && $("work").classList.add(PANECLS[p])); } catch(e){}
async function resetLayout(){
  if(await dialog({title:"Reset Window Layout?", body:"<p>Show every pane at its default size?</p>", buttons:[["Cancel","cancel"],["Reset","ok","pri"]]})!=="ok") return;
  Object.keys(PANECLS).forEach(p => togglePane(p, true));
  for(const k in PANE_DEF) setPane(k, PANE_DEF[k], true);
  log("Window layout reset");
}

/* ---------- tabs: menu, cycle, close others, drag to reorder ---------- */
function cycleTab(d){ if(S.tabs.length<2) return; const i = S.tabs.findIndex(t=>t.id===S.active); activateTab(S.tabs[(i + d + S.tabs.length) % S.tabs.length].id); }
async function closeOthers(id){ for(const t of [...S.tabs]) if(t.id!==id){ await closeTab(t.id); if(S.tabs.some(x=>x.id===t.id)) return; } }
async function closeAll(){ for(const t of [...S.tabs]){ await closeTab(t.id); if(S.tabs.some(x=>x.id===t.id)) return; } }
window.tabMenu = function(e, id){
  const items = [["Close", ()=>closeTab(id), false, "Ctrl+Shift+F4"], ["Close All But This", ()=>closeOthers(id), S.tabs.length<2], ["Close All", closeAll]];
  if(id.startsWith("r:")){ const [p, r] = id.slice(2).split("/");
    if(!p.startsWith("AOI:")) items.push("-", ["Verify Routine", ()=>verifyScope({program:p, routine:r})], ["Cross Reference (callers)", ()=>xrefRoutine(p, r)],
      ["Routine Properties…", ()=>{ const pr = (S.project.tasks.flatMap(t=>t.programs).concat(S.project.unscheduled)).find(x=>x.name===p); const ro = pr && pr.routines.find(x=>x.name===r); if(ro) routinePropsDialog(p, ro); }]); }
  showMenu(e, items);
};
$("tabs").addEventListener("dragstart", (e) => { const t = e.target.closest(".tab"); if(!t) return; S.tabDrag = t.dataset.id; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", t.dataset.id); });
$("tabs").addEventListener("dragover", (e) => { if(!S.tabDrag) return; const t = e.target.closest(".tab"); e.preventDefault(); document.querySelectorAll(".tab.dragover").forEach(x=>x.classList.remove("dragover")); if(t) t.classList.add("dragover"); });
$("tabs").addEventListener("drop", (e) => { const t = e.target.closest(".tab"); e.preventDefault(); const from = S.tabDrag; S.tabDrag = null;
  document.querySelectorAll(".tab.dragover").forEach(x=>x.classList.remove("dragover"));
  if(!from || !t || t.dataset.id===from) return;
  const i = S.tabs.findIndex(x=>x.id===from), item = S.tabs.splice(i, 1)[0]; const j = S.tabs.findIndex(x=>x.id===t.dataset.id); S.tabs.splice(j, 0, item); renderTabs(); });
$("tabs").addEventListener("dragend", () => { S.tabDrag = null; });
const _renderTabs = renderTabs;
function tabTip(t){
  const id = t.id;
  if(id.startsWith("r:")){ const [p, r] = id.slice(2).split("/"); const pr = S.project && [...S.project.tasks.flatMap(x=>x.programs), ...S.project.unscheduled].find(x=>x.name===p);
    const ro = pr && pr.routines.find(x=>x.name===r); const task = S.project && S.project.tasks.find(x=>x.programs.some(y=>y.name===p));
    const kind = ro ? ({RLL:"Ladder Diagram", ST:"Structured Text", FBD:"Function Block", SFC:"Sequential Function Chart"}[ro.type] || ro.type) : "";
    return p.startsWith("AOI:") ? `Add-On Instruction ${p.slice(4)} — ${r}` : `${task ? task.name + " ▸ " : ""}${p} ▸ ${r}${kind ? ` (${kind})` : ""}${pr && pr.main===r ? " — main routine" : ""}`; }
  if(id==="tags:controller") return "Controller Tags — controller scope";
  if(id.startsWith("tags:")) return `Program Tags — program ${id.slice(5)}`;
  return t.title;
}
renderTabs = function(){ S.tabs.forEach(t => { t.tip = tabTip(t); }); _renderTabs(); $("tabs").querySelectorAll(".tab").forEach(t => t.draggable = true); };

/* ---------- zoom (Ctrl+wheel, Ctrl+= / Ctrl+- / Ctrl+0, View menu) ---------- */
S.zoom = {};
function zoomOf(){ return S.zoom[S.active] || 1; }
function zoomApply(){ const w = document.querySelector("#doc .ladder, #doc .stview, #doc .sted"); if(w && inRoutine()) w.style.zoom = zoomOf() === 1 ? "" : zoomOf(); statusZoom(); }
function zoomSet(z){ if(!S.active) return; S.zoom[S.active] = Math.round(Math.max(0.5, Math.min(2, z)) * 10) / 10; zoomApply(); }
function zoomBy(d){ zoomSet(zoomOf() + d * 0.1); }
$("doc").addEventListener("wheel", (e) => { if(!(e.ctrlKey || e.metaKey) || !inRoutine()) return; e.preventDefault(); zoomBy(e.deltaY < 0 ? 1 : -1); }, {passive:false});
const _renderDoc2 = renderDoc;
renderDoc = function(){ _renderDoc2(); setTimeout(zoomApply, 0); setTimeout(zoomApply, 300); };
const _afterR = window.lxAfterRender;
window.lxAfterRender = function(){ if(_afterR) _afterR(); zoomApply(); };

/* ---------- status bar ---------- */
function statusZoom(){
  let el = $("sZoom");
  if(!el){ el = document.createElement("span"); el.id = "sZoom"; el.className = "click"; el.title = "Zoom (click: 100%)"; el.onclick = () => zoomSet(1); $("status").insertBefore(el, $("sScan")); }
  el.textContent = inRoutine() ? `${Math.round(zoomOf()*100)}%` : "";
}
function statusST(){
  let el = $("sLine");
  if(!el){ el = document.createElement("span"); el.id = "sLine"; $("status").insertBefore(el, $("sScan")); }
  const ta = $("stTa");
  if(!ta || !inRoutine()){ el.textContent = ""; return; }
  const before = ta.value.slice(0, ta.selectionStart).split("\n");
  el.textContent = `Ln ${before.length}, Col ${before[before.length-1].length + 1}`;
}
document.addEventListener("selectionchange", () => { if(document.activeElement && document.activeElement.id==="stTa") statusST(); });
document.addEventListener("keyup", (e) => { if(e.target && e.target.id==="stTa") statusST(); });
document.addEventListener("click", (e) => { if(e.target && e.target.id==="stTa") statusST(); });
const _paintStatus = paintStatus;
paintStatus = function(){
  _paintStatus();
  const f = $("sFault"); if(f && !f.dataset.bound){ f.dataset.bound = "1"; f.classList.add("click"); f.title = "Open the Faults tab"; f.onclick = () => showCon("faults"); }
  const c = $("sCtrl"); if(c && !c.dataset.bound){ c.dataset.bound = "1"; c.classList.add("click"); c.title = "Click to save the project (Ctrl+S)"; c.onclick = () => { if(S.state && S.state.dirty) saveProject(false); }; }
  statusZoom(); if(!$("stTa") && $("sLine")) $("sLine").textContent = "";
  const u = $("bUndo"), r = $("bRedo");
  if(u && r){ const rd = inRoutine() && S.R.data; u.disabled = false; r.disabled = !(S.edit || (rd && rd.redo)); }
};

/* ---------- print, help, options ---------- */
function printView(){ if(!S.active){ log("Open a routine or a tag list to print it", "wrn"); return; } window.print(); }
function helpF1(){
  if(S.selInstr || (inLadder() && lxSel().caret.iid!=null)){
    if(!S.selInstr && inLadder()){ const ins = lxInstrs(lxSel().caret.rung)[lxSel().caret.iid]; if(ins) S.selInstr = ins.name.toUpperCase(); }
    if(!paneShown("props")) togglePane("props", true);
    S.quick = null; renderProps(); const h = document.querySelector("#pbody .ihelp"); if(h) h.scrollIntoView({block:"nearest"}); return;
  }
  shortcutsDialog();
}
const SHORTCUTS = [
  ["Ctrl+S / Ctrl+Shift+S", "Save / Save As"], ["Ctrl+O, Alt+N", "Open, New project"], ["Ctrl+P", "Print the open routine or tag list"],
  ["Ctrl+Z / Ctrl+Y", "Undo / Redo"], ["Ctrl+X / C / V, Del", "Cut / Copy / Paste / Delete (rungs, instructions, tags, organizer items)"],
  ["Ctrl+A", "Select all rungs (or all instructions of the rung)"], ["Ctrl+F, F3 / Shift+F3", "Find, Find Next / Previous"], ["Ctrl+H", "Replace"],
  ["Ctrl+G", "Go To rung / line / tag"], ["Ctrl+E", "Cross Reference"], ["F4 / Shift+F4", "Next / previous error"],
  ["Ctrl+W (Alt+W)", "New Tag"], ["Ctrl+T (Alt+T)", "Toggle Bit"], ["Ctrl+D", "Edit description / rung comment"],
  ["Ctrl+R", "Add rung (Insert / Append)"], ["Ctrl+I", "Insert / Append mode"], ["Alt+Insert", "Add Element dialog"],
  ["Alt+Enter", "Properties of the routine / selection"], ["Arrows, Home/End, Ctrl+Home/End", "Move the ladder caret"], ["Enter / F2", "Edit at the caret"],
  ["Shift+F10, Menu key", "Context menu"], ["Alt+0 / Alt+1 / Alt+2", "Show or hide organizer / output / properties"],
  ["Ctrl+F6, Alt+PageDown", "Next tab (Ctrl+Tab, Ctrl+PageDown in an app window)"], ["Ctrl+Shift+F6, Alt+PageUp", "Previous tab"],
  ["Ctrl+Shift+F4", "Close the tab (Ctrl+F4 in an app window)"], ["Ctrl+wheel, Ctrl+= / Ctrl+- / Ctrl+0", "Zoom the routine"],
  ["Ctrl+Enter", "Finalize (accept) the rung or ST edit; apply a description"], ["Esc", "Cancel"], ["F10, Alt+F/E/V/S/L/C/H", "Menu bar"],
  ["Letters (Quick Keys on)", "Add the assigned instruction at the caret"], ["Ctrl+Shift+Space", "Completion list in Structured Text"]];
function shortcutsDialog(){ dialog({title:"Keyboard Shortcuts", buttons:[["Close","cancel","pri"]], body:`<table class="keys">${SHORTCUTS.map(([k,d])=>`<tr><td>${esc(k)}</td><td>${esc(d)}</td></tr>`).join("")}</table>
  <p class="notice-small">In a normal browser tab the browser keeps Ctrl+W, Ctrl+T, Ctrl+N, Ctrl+Tab, Ctrl+PageUp/Down and Ctrl+F4; use the alternatives shown, or open Studio in its own app window.</p>`}); }
async function optionsDialog(){
  await formDialog({title:"Options", submit:"OK", fields:[
      {name:"single", label:"Organizer: open items with a single click", type:"checkbox", value: S.orgSingle},
      {name:"dtype", label:"Default data type of new tags (Edit Tags row)", value: lsGet("DefaultType") || "BOOL", list:"dtList"},
      {name:"desc", label:"Ladder: show operand descriptions", type:"checkbox", value: !!S.showDesc},
      {name:"qk", label:"Ladder: enable Quick Keys", type:"checkbox", value: !!S.quickOn},
      {name:"qmap", label:"Ladder: show the Quick Key map", type:"checkbox", value: !!S.showQuick}],
    onSubmit: async (v) => {
      S.orgSingle = v.single; lsSet("OrgSingle", v.single ? "1" : "0");
      if(v.dtype) lsSet("DefaultType", v.dtype);
      if(!!S.showDesc !== v.desc && window.toggleOperandDesc) toggleOperandDesc();
      if(!!S.quickOn !== v.qk && window.setQuickKeys) setQuickKeys(v.qk);
      if(!!S.showQuick !== v.qmap && window.toggleQuickMap) toggleQuickMap();
    }});
}

/* ---------- keys ---------- */
function windowKeys(e){
  if($("dlg").open || menuOpen()) return false;
  const ctrl = e.ctrlKey || e.metaKey, k = e.key;
  const done = () => { e.preventDefault(); return true; };
  if(e.altKey && !ctrl && (k==="0" || k==="1" || k==="2")){ togglePane(k==="0" ? "org" : k==="1" ? "con" : "props"); return done(); }
  if(e.altKey && !ctrl && !e.shiftKey && k.length===1){
    const i = MENUS.findIndex(m => m[1].toLowerCase()===k.toLowerCase() && !["T","W"].includes(m[1]));   // Alt+T / Alt+W stay Toggle Bit / New Tag
    if(i>=0){ openMenu(i); return done(); }
    if(k==="n" || k==="N"){ newProjectDialog(); return done(); }
  }
  if(k==="F10" && !e.shiftKey && !ctrl){ openMenu(0); return done(); }
  if(k==="F1"){ helpF1(); return done(); }
  if((ctrl && k==="F6") || (ctrl && k==="Tab") || (e.altKey && (k==="PageDown" || k==="PageUp")) || (ctrl && (k==="PageDown" || k==="PageUp"))){
    if(typingTarget(document.activeElement) && !ctrl) return false;
    cycleTab((k==="PageUp" || e.shiftKey) ? -1 : 1); return done(); }
  if(ctrl && k==="F4"){ if(S.active) closeTab(S.active); return done(); }
  if(ctrl && !e.altKey && !e.shiftKey && (k==="o" || k==="O")){ openProjectDialog(); return done(); }
  if(ctrl && !e.altKey && !e.shiftKey && (k==="p" || k==="P")){ printView(); return done(); }
  if(typingTarget(document.activeElement)) return false;
  if(ctrl && inRoutine() && (k==="=" || k==="+")){ zoomBy(1); return done(); }
  if(ctrl && inRoutine() && k==="-"){ zoomBy(-1); return done(); }
  if(ctrl && inRoutine() && k==="0"){ zoomSet(1); return done(); }
  if(e.altKey && k==="Enter" && !inLadder()){ propsCmd(); return done(); }
  return false;
}
vcsKeyHooks.unshift(windowKeys);
document.addEventListener("click", (e) => { if(!e.target.closest("#menubar") && S.mbOpen!=null && !e.target.closest("#menu")){ document.querySelectorAll("#menubar .mb.open").forEach(x=>x.classList.remove("open")); S.mbOpen = null; } });
window.togglePane = togglePane; window.openMenu = openMenu;
