"use strict";
/* Controller Organizer workflows (gap report 5.4): keyboard navigation, complete
   context menus (never the browser's), Quick View summary, drag and drop to schedule /
   move / copy programs and routines, Copy/Paste, Expand/Collapse All. */

(function(){
const css = document.createElement("style");
css.textContent = `
#tree:focus{outline:none}#tree:focus .node.sel{outline:2px solid var(--acc);outline-offset:-2px}
.node.dropok{background:color-mix(in srgb,var(--on) 25%,transparent);outline:1px dashed var(--on)}
.node.dropbefore{box-shadow:inset 0 2px 0 var(--on)}
.node.dragging{opacity:.5}
.qv h4{margin:0 0 6px}.qv .pv{margin-bottom:6px}`;
document.head.appendChild(css);
})();

const tree = $("tree");
tree.tabIndex = 0; tree.setAttribute("role", "tree");
S.orgClip = null;

function visibleNodes(){ return [...tree.querySelectorAll(".node")].filter(n => n.offsetParent !== null); }
function nodeByKey(k){ return k ? tree.querySelector(`.node[data-key="${CSS.escape(k)}"]`) : null; }
function curNode(){ return nodeByKey(S.treeSel) || visibleNodes()[0] || null; }
function parentNode(d){ const ul = d.closest("li").parentElement; const li = ul && ul.closest("li"); return li ? li.querySelector(":scope > .node") : null; }
function isOpen(d){ return d._ul && !d._ul.hidden; }
function selNode(d){ if(!d) return; treeSelect(d); d.scrollIntoView({block:"nearest"}); }
function nodeMenuAt(d){ if(!d) return; const items = menuFor(d.dataset.key) || [["(no commands)", ()=>{}, true]]; showMenu(null, items, d); }

/* ---------- Quick View (in the Properties pane) ---------- */
function progAndTask(name){ const p = S.project; for(const t of p.tasks){ const pr = t.programs.find(x=>x.name===name); if(pr) return [pr, t]; }
  const u = p.unscheduled.find(x=>x.name===name); return u ? [u, null] : [null, null]; }
function quickView(key){ S.quick = key; S.sel = null; S.selInstr = null; renderProps(); }
function quickHtml(key){
  const p = S.project; if(!p) return "";
  const rows = (r) => `<div class="pv">${r.map(([k,v])=>`<div>${esc(k)}</div><div>${v}</div>`).join("")}</div>`;
  let h = "";
  if(key==="ctrl") h = `<h4>Controller ${esc(p.controller.name)}</h4>` + rows([["Type", esc(p.controller.processor||"")],["Revision", esc(p.controller.revision||"")],["Description", esc(p.controller.description||"")]]);
  else if(key.startsWith("t:")){ const t = p.tasks.find(x=>x.name===key.slice(2)); if(t){ const st = (S.diag && S.diag.tasks && S.diag.tasks[t.name]) || {};
    h = `<h4>Task ${esc(t.name)}</h4>` + rows([["Type", esc(t.type)],["Period", t.rate_ms?`${t.rate_ms} ms`:"—"],["Priority", t.priority??"—"],["Watchdog", t.watchdog_ms?`${t.watchdog_ms} ms`:"—"],["Programs", String(t.programs.length)],["Last scan", st.last_ms!=null?`${st.last_ms} ms`:"—"]]); } }
  else if(key.startsWith("p:")){ const [pr, t] = progAndTask(key.slice(2)); if(pr)
    h = `<h4>Program ${esc(pr.name)}</h4>` + rows([["Task", t?esc(t.name):"unscheduled"],["Main routine", esc(pr.main||"(none)")],["Routines", String(pr.routines.length)],["Tags", String(pr.tags||0)],["State", pr.disabled?"disabled":"enabled"],["Description", esc(pr.description||"")]]); }
  else if(key.startsWith("r:")){ const [pn, rn] = key.slice(2).split("/"); const [pr] = progAndTask(pn); const r = pr && pr.routines.find(x=>x.name===rn);
    if(r) h = `<h4>Routine ${esc(rn)}</h4>` + rows([["Program", esc(pn)],["Type", r.type==="RLL"?"Ladder Diagram":r.type==="ST"?"Structured Text":esc(r.type)],["Size", r.rungs!=null?`${r.rungs} rungs`:"—"],["Main", r.main?"yes":"no"],["Simulated", r.simulated?"yes":"no"],["Description", esc(r.description||"")]]); }
  else if(key.startsWith("dt:")) h = `<h4>Data type ${esc(key.slice(3))}</h4><p class="dim">Double-click or Enter to see the members.</p>`;
  else if(key.startsWith("m:")){ const m = p.modules.find(x=>x.tag===key.slice(2)); if(m) h = `<h4>Module ${esc(m.tag)}</h4>` + rows([["Catalog", esc(m.catalog||"")],["Description", esc(m.description||m.module||"")]]); }
  else if(key.startsWith("a:") && !key.includes("/")){ const a = p.aois.find(x=>x.name===key.slice(2)); if(a) h = `<h4>Add-On Instruction ${esc(a.name)}</h4>` + rows([["Revision", esc(a.revision||"")],["Description", esc(a.description||"")],["Routines", String(a.routines.length)]]); }
  else h = `<h4>${esc((nodeByKey(key)||{}).title || key)}</h4>`;
  return `<div class="qv">${h}<p class="dim">Double-click or Enter opens · right-click or Shift+F10 for commands</p></div>`;
}

/* ---------- complete context menus ---------- */
const _menuFor = menuFor;
function verifyRt(p, r){ if(window.verifyScope) verifyScope({program:p, routine:r}); }
menuFor = function(key){
  const p = S.project; if(!hasProject()) return [["New Project…", newProjectDialog], ["Open…", openProjectDialog], ["Import L5X…", ()=>$("file").click()]];
  const base = _menuFor(key) || [];
  const auth = !!(p && p.authoring);
  const exp = ["-", ["Expand All", ()=>expandAll(true)], ["Collapse All", ()=>expandAll(false)]];
  if(key==="ctrl") return [...base, ...exp];
  if(key.startsWith("t:")){ const tn = key.slice(2);
    return [["Open", ()=>{ const t = p.tasks.find(x=>x.name===tn); if(t) openTask(t); }, false, "Enter"], ...base.slice(0, 2),
            ["Verify Task", ()=>{ const t = p.tasks.find(x=>x.name===tn); if(t && window.verifyScope) verifyScope(null); }],
            ["Paste", ()=>orgPaste(key), !(auth && S.orgClip && S.orgClip.kind==="p"), "Ctrl+V"], ...base.slice(2)]; }
  if(key==="unsched") return [...base, ["Paste", ()=>orgPaste(key), !(auth && S.orgClip && S.orgClip.kind==="p"), "Ctrl+V"]];
  if(key.startsWith("p:")){ const pn = key.slice(2), [pr, tk] = progAndTask(pn);
    const sched = p.tasks.map(t => [`Schedule in ${t.name}`, ()=>structOp("POST","/api/studio/program/schedule",{program:pn, task:t.name}, `Program ${pn} scheduled in ${t.name}`), !auth || (tk && tk.name===t.name)]);
    return [["Open", ()=>openProgram(pr, tk), false, "Enter"], ...base.slice(0, 2), "-",
            ["Verify Program", ()=>window.verifyScope && verifyScope({program:pn})],
            ["Copy", ()=>orgCopy(key), !auth, "Ctrl+C"], ["Paste", ()=>orgPaste(key), !(auth && S.orgClip && S.orgClip.kind==="r"), "Ctrl+V"], "-",
            ...sched, ...base.slice(2)]; }
  if(key.startsWith("r:")){ const [pn, rn] = key.slice(2).split("/");
    return [base[0] && [...base[0].slice(0,2), false, "Enter"], ["Verify Routine", ()=>verifyRt(pn, rn)],
            ["Cross Reference (callers)", ()=>window.xrefRoutine && xrefRoutine(pn, rn), false, "Ctrl+E"],
            ["Copy", ()=>orgCopy(key), !auth, "Ctrl+C"], ...base.slice(1)]; }
  if(key==="ctags" || key.startsWith("pt:")) return base;
  if(key==="dts" || key==="dtu" || key==="dtm" || key==="dtp" || key==="dts2") return [["Expand", ()=>{ const d = nodeByKey(key); if(d && !isOpen(d)) d._toggle(); }], ["Collapse", ()=>{ const d = nodeByKey(key); if(d && isOpen(d)) d._toggle(); }]];
  if(key.startsWith("dt:")){ const n = key.slice(3);
    return [["Open", ()=>openType(n), false, "Enter"], ["Monitor Tags of this Type", ()=>window.monitorType ? monitorType(n) : openTags("controller")]]; }
  if(key==="aois") return [["Expand", ()=>{ const d = nodeByKey(key); if(d && !isOpen(d)) d._toggle(); }]];
  if(key.startsWith("a:")){ const rest = key.slice(2);
    if(rest.includes("/")){ const [a, r] = rest.split("/"); return [["Open", ()=>openRoutine("AOI:"+a, r), false, "Enter"]]; }
    return [["Open Logic", ()=>{ const a = p.aois.find(x=>x.name===rest); if(a && a.routines[0]) openRoutine("AOI:"+rest, a.routines[0].name); }],
            ["Cross Reference (instances)", ()=>window.xrefOpen && searchInstances(rest)]]; }
  if(key==="conns") return [["Open", ()=>openConnections(), false, "Enter"]];
  if(key==="io") return [["Expand", ()=>{ const d = nodeByKey(key); if(d) d._toggle(); }]];
  if(key.startsWith("m:")){ const t = key.slice(2); return [["Monitor Module Tags", ()=>openTags("controller", t), false, "Enter"], ["Properties", ()=>quickView(key)]]; }
  return base.length ? base : [["(no commands)", ()=>{}, true]];
};
function searchInstances(aoi){ S.find.q = aoi; S.find.scope = "all"; S.find.within = {operands:false, mnemonics:true, comments:false}; S.find.whole = true; runFind(true); }
/* never the browser's own menu on the organizer */
tree.addEventListener("contextmenu", (e) => {
  const n = e.target.closest(".node"); e.preventDefault(); if(!n) return;
  if(menuFor(n.dataset.key)) return;                       // the page's handler shows it
  e.stopPropagation();
}, true);

/* ---------- Expand / Collapse All ---------- */
function expandAll(open, from){
  const scope = from ? from.closest("li") : tree;
  scope.querySelectorAll(".node").forEach(d => { if(d._ul && (!d._ul.hidden) !== open) d._toggle(); });
}

/* ---------- Copy / Paste ---------- */
function orgCopy(key){
  if(key.startsWith("p:")){ S.orgClip = {kind:"p", name:key.slice(2)}; log(`Copied program ${key.slice(2)}`); }
  else if(key.startsWith("r:")){ const [pn, rn] = key.slice(2).split("/"); S.orgClip = {kind:"r", program:pn, name:rn}; log(`Copied routine ${pn}/${rn}`); }
}
async function orgPaste(key){
  const c = S.orgClip; if(!c) return;
  try {
    if(c.kind==="r"){
      const to = key.startsWith("r:") ? key.slice(2).split("/")[0] : key.slice(2);
      const r = await api("POST","/api/studio/routine/copy",{program:c.program, name:c.name, to_program:to});
      log(`Routine ${c.program}/${c.name} copied to ${to}/${r.name}`, "ok");
    } else {
      const task = key.startsWith("t:") ? key.slice(2) : null;
      const r = await api("POST","/api/studio/program/copy",{name:c.name, task});
      log(`Program ${c.name} copied to ${r.name}${task?` (scheduled in ${task})`:" (unscheduled)"}`, "ok");
    }
    await refreshProject();
  } catch(e){ log(`Paste: ${e.message}`, "err"); }
}

/* ---------- keyboard ---------- */
let typeBuf = "", typeAt = 0;
tree.addEventListener("keydown", (e) => {
  if($("dlg").open || menuOpen()) return;
  const nodes = visibleNodes(), d = curNode(); if(!d) return;
  const i = nodes.indexOf(d), k = e.key, ctrl = e.ctrlKey || e.metaKey;
  const go = (x) => { e.preventDefault(); e.stopPropagation(); if(x) selNode(x); };
  if(k==="ArrowDown") return go(nodes[Math.min(nodes.length-1, i+1)]);
  if(k==="ArrowUp") return go(nodes[Math.max(0, i-1)]);
  if(k==="Home") return go(nodes[0]);
  if(k==="End") return go(nodes[nodes.length-1]);
  if(k==="ArrowRight"){ e.preventDefault(); if(d._ul && d._ul.hidden) d._toggle(); else if(d._ul) selNode(d._ul.querySelector(".node")); return; }
  if(k==="ArrowLeft"){ e.preventDefault(); if(isOpen(d)) d._toggle(); else selNode(parentNode(d)); return; }
  if(k==="Enter" && !e.altKey){ e.preventDefault(); e.stopPropagation(); if(d._open) d._open(); else d._toggle(); return; }
  if(k==="Enter" && e.altKey){ e.preventDefault(); e.stopPropagation(); const it = (menuFor(d.dataset.key)||[]).find(x => Array.isArray(x) && /^Properties/.test(x[0])); if(it) it[1](); return; }
  if(k===" " || k==="ContextMenu" || (k==="F10" && e.shiftKey)){ e.preventDefault(); e.stopPropagation(); nodeMenuAt(d); return; }
  if(k==="Delete"){ e.preventDefault(); e.stopPropagation(); const it = (menuFor(d.dataset.key)||[]).find(x => Array.isArray(x) && /^Delete/.test(x[0]) && !x[2]); if(it) it[1](); else log("This item cannot be deleted here", "wrn"); return; }
  if(k==="F2"){ e.preventDefault(); e.stopPropagation(); const it = (menuFor(d.dataset.key)||[]).find(x => Array.isArray(x) && /^Properties/.test(x[0])); if(it) it[1](); return; }
  if(k==="*"){ e.preventDefault(); expandAll(true, d); return; }
  if(ctrl && (k==="c" || k==="C")){ e.preventDefault(); e.stopPropagation(); orgCopy(d.dataset.key); return; }
  if(ctrl && (k==="v" || k==="V")){ e.preventDefault(); e.stopPropagation(); orgPaste(d.dataset.key); return; }
  if(ctrl && (k==="e" || k==="E") && d.dataset.key.startsWith("r:")){ e.preventDefault(); e.stopPropagation(); const [p, r] = d.dataset.key.slice(2).split("/"); xrefRoutine(p, r); return; }
  if(k.length===1 && /\w/.test(k) && !ctrl && !e.altKey){                // type-ahead
    const now = Date.now(); typeBuf = (now - typeAt < 700 ? typeBuf : "") + k.toLowerCase(); typeAt = now;
    const order = [...nodes.slice(i + (typeBuf.length===1 ? 1 : 0)), ...nodes.slice(0, i + (typeBuf.length===1 ? 1 : 0))];
    const hit = order.find(n => (n.querySelector(".lbl")||{}).textContent.toLowerCase().replace(/^controller /, "").startsWith(typeBuf));
    if(hit) go(hit); else e.preventDefault();
  }
});
tree.addEventListener("mousedown", (e) => { if(e.target.closest(".node")) setTimeout(()=>{ if(!$("dlg").open && !menuOpen()) tree.focus({preventScroll:true}); }, 0); });

/* ---------- drag and drop ---------- */
let drag = null;
function dragKind(key){ return key.startsWith("p:") ? "p" : (key.startsWith("r:") ? "r" : null); }
function dropInfo(d, e){
  if(!drag || !d) return null;
  const tk = d.dataset.key, copy = e.ctrlKey || e.metaKey;
  if(drag.kind==="p"){
    if(tk.startsWith("t:")) return {op: copy ? "copy" : "move", task: tk.slice(2)};
    if(tk==="unsched") return {op: copy ? "copy" : "move", task: null};
    if(tk.startsWith("p:") && tk!==drag.key){ const [, t] = progAndTask(tk.slice(2)); if(!t) return {op: copy ? "copy" : "move", task:null};
      return {op: copy ? "copy" : "move", task: t.name, before: tk.slice(2)}; }
    return null;
  }
  if(drag.kind==="r"){
    const [sp] = drag.key.slice(2).split("/");
    if(tk.startsWith("p:")){ const to = tk.slice(2); return {op: copy || to===sp ? "copy" : "move", to}; }
    if(tk.startsWith("r:")){ const to = tk.slice(2).split("/")[0]; return {op: copy || to===sp ? "copy" : "move", to}; }
  }
  return null;
}
function markNodes(){ tree.querySelectorAll(".node[data-key]").forEach(d => { const k = d.dataset.key; d.draggable = !!dragKind(k) && !!(S.project && S.project.authoring); }); }
const _renderTree = renderTree;
renderTree = function(){ _renderTree(); markNodes(); const d = nodeByKey(S.treeSel); if(d) d.classList.add("sel"); };
markNodes();
let hoverT = null, hoverNode = null;
tree.addEventListener("dragstart", (e) => {
  const d = e.target.closest(".node"); if(!d || !dragKind(d.dataset.key)){ e.preventDefault(); return; }
  drag = {key:d.dataset.key, kind:dragKind(d.dataset.key), el:d}; d.classList.add("dragging");
  e.dataTransfer.effectAllowed = "copyMove"; e.dataTransfer.setData("text/plain", d.dataset.key);
});
tree.addEventListener("dragover", (e) => {
  const d = e.target.closest(".node"); tree.querySelectorAll(".dropok,.dropbefore").forEach(x=>x.classList.remove("dropok","dropbefore"));
  const info = dropInfo(d, e);
  if(!info){ if(e.dataTransfer) e.dataTransfer.dropEffect = "none"; return; }
  e.preventDefault(); e.dataTransfer.dropEffect = info.op==="copy" ? "copy" : "move";
  d.classList.add(info.before ? "dropbefore" : "dropok");
  if(d!==hoverNode){ clearTimeout(hoverT); hoverNode = d; hoverT = setTimeout(() => { if(d._ul && d._ul.hidden) d._toggle(); }, 700); }
});
tree.addEventListener("dragleave", (e) => { const d = e.target.closest(".node"); if(d) d.classList.remove("dropok","dropbefore"); });
tree.addEventListener("dragend", () => { if(drag && drag.el) drag.el.classList.remove("dragging"); drag = null; clearTimeout(hoverT); tree.querySelectorAll(".dropok,.dropbefore").forEach(x=>x.classList.remove("dropok","dropbefore")); });
tree.addEventListener("drop", async (e) => {
  const d = e.target.closest(".node"), info = dropInfo(d, e), src = drag; e.preventDefault();
  tree.querySelectorAll(".dropok,.dropbefore").forEach(x=>x.classList.remove("dropok","dropbefore"));
  if(!info || !src) return;
  try {
    if(src.kind==="p"){
      const name = src.key.slice(2);
      let index;
      if(info.before){ const t = S.project.tasks.find(x=>x.name===info.task); const names = t.programs.map(x=>x.name).filter(x=>x!==name); index = names.indexOf(info.before); }
      if(info.op==="copy"){ const r = await api("POST","/api/studio/program/copy",{name, task:info.task, index}); log(`Program ${name} copied to ${r.name}`, "ok"); }
      else { await api("POST","/api/studio/program/schedule",{program:name, task:info.task, index}); log(info.task ? `Program ${name} scheduled in ${info.task}${index!=null?` at position ${index+1}`:""}` : `Program ${name} unscheduled`, "ok"); }
    } else {
      const [pn, rn] = src.key.slice(2).split("/");
      if(info.op==="copy"){ const r = await api("POST","/api/studio/routine/copy",{program:pn, name:rn, to_program:info.to}); log(`Routine ${pn}/${rn} copied to ${info.to}/${r.name}`, "ok"); }
      else {
        try { const r = await api("POST","/api/studio/routine/move",{program:pn, name:rn, to_program:info.to}); log(`Routine ${pn}/${rn} moved to ${info.to}/${r.name}`, "ok"); }
        catch(err){
          if(err.status===409 && err.data && err.data.references && err.data.references.length){
            if(await dialog({title:"Move routine?", body:`<p>${esc(err.message)}</p>${refsHtml(err.data.references)}`, buttons:[["Cancel","cancel"],["Move anyway","ok","pri"]], danger:true})!=="ok") return;
            await api("POST","/api/studio/routine/move",{program:pn, name:rn, to_program:info.to, force:true}); log(`Routine ${pn}/${rn} moved to ${info.to}`, "ok");
          } else throw err;
        }
      }
    }
    await refreshProject();
  } catch(err){ log(`Drag and drop: ${err.message}`, "err"); }
});
document.addEventListener("keydown", (e) => { if(e.key==="Escape" && drag){ drag = null; } });

/* Alt+0 focuses / shows the organizer (KB-12 also hides it from the View menu) */
window.quickView = quickView; window.quickHtml = quickHtml; window.expandAll = expandAll;
window.monitorType = function(type){
  openTags("controller", null, "monitor");
  setTimeout(() => { if(window.setTagTypeFilter) setTagTypeFilter(type); }, 500);
};

/* ---------- OR-06: multi-select of programs (Ctrl+click / Shift+click) ---------- */
S.treeMulti = new Set();
function paintMulti(){ tree.querySelectorAll(".node.msel").forEach(n => n.classList.remove("msel"));
  S.treeMulti.forEach(k => { const d = nodeByKey(k); if(d) d.classList.add("msel"); }); }
(function(){ const c = document.createElement("style"); c.textContent = `#tree .node.msel{background:var(--sel);outline:1px dotted var(--acc)}`; document.head.appendChild(c); })();
tree.addEventListener("click", (e) => {
  const d = e.target.closest && e.target.closest(".node"); if(!d) return;
  const k = d.dataset.key;
  if(!(e.ctrlKey || e.metaKey || e.shiftKey)){ if(S.treeMulti.size){ S.treeMulti.clear(); paintMulti(); } return; }
  if(!k.startsWith("p:")) return;                                  // only programs (siblings of one kind)
  e.stopPropagation(); e.preventDefault();
  if(!S.treeMulti.size && S.treeSel && S.treeSel.startsWith("p:")) S.treeMulti.add(S.treeSel);
  if(e.shiftKey && S.treeSel && S.treeSel.startsWith("p:")){
    const progs = visibleNodes().filter(n => n.dataset.key.startsWith("p:")).map(n => n.dataset.key);
    const a = progs.indexOf(S.treeSel), b = progs.indexOf(k);
    if(a>=0 && b>=0) progs.slice(Math.min(a,b), Math.max(a,b)+1).forEach(x => S.treeMulti.add(x));
  } else S.treeMulti.has(k) ? S.treeMulti.delete(k) : S.treeMulti.add(k);
  if(!e.shiftKey){ S.treeSel = k; tree.querySelectorAll(".node.sel").forEach(n=>n.classList.remove("sel")); d.classList.add("sel"); }
  paintMulti(); tree.focus();
}, true);
async function multiPrograms(action, task){
  const names = [...S.treeMulti].map(k => k.slice(2));
  if(action==="delete"){
    if(await dialog({title:`Delete ${names.length} programs?`, body:`<p>Delete these programs with their routines and tags?</p><ul class="refs">${names.map(n=>`<li><b>${esc(n)}</b></li>`).join("")}</ul>`,
        buttons:[["Cancel","cancel"],["Delete","ok","pri"]], danger:true})!=="ok") return;
    const refs = [], done = [];
    for(const n of names){ try { await api("DELETE", `/api/studio/program?name=${encodeURIComponent(n)}`); done.push(n); }
      catch(e){ if(e.status===409 && e.data && e.data.references) refs.push([n, e.data.references]); else log(`Delete ${n}: ${e.message}`, "err"); } }
    if(refs.length && await dialog({title:"Some programs are still used", buttons:[["Keep them","cancel"],["Delete anyway","ok","pri"]],
        body: refs.map(([n, r]) => `<p><b>${esc(n)}</b></p>${refsHtml(r)}`).join("")})==="ok")
      for(const [n] of refs){ try { await api("DELETE", `/api/studio/program?name=${encodeURIComponent(n)}&force=true`); done.push(n); } catch(e){ log(`Delete ${n}: ${e.message}`, "err"); } }
    if(done.length) log(`Deleted ${done.length} program(s): ${done.join(", ")}`, "ok");
  } else {
    for(const n of names){ try { await api("POST", "/api/studio/program/schedule", {program:n, task: task || null}); } catch(e){ log(`${n}: ${e.message}`, "err"); } }
    log(task ? `${names.length} program(s) scheduled in ${task}` : `${names.length} program(s) unscheduled`, "ok");
  }
  S.treeMulti.clear(); await refreshProject();
}
const _menuFor2 = menuFor;
menuFor = function(key){
  if(S.treeMulti.size > 1 && S.treeMulti.has(key)){
    const p = S.project, auth = !!(p && p.authoring), n = S.treeMulti.size;
    return [[`Delete ${n} Programs…`, ()=>multiPrograms("delete"), !auth, "Del"], "-",
            [`Unschedule ${n} Programs`, ()=>multiPrograms("schedule", null), !auth],
            ...p.tasks.map(t => [`Schedule ${n} Programs in ${t.name}`, ()=>multiPrograms("schedule", t.name), !auth])];
  }
  return _menuFor2(key);
};
tree.addEventListener("keydown", (e) => {
  if(e.key==="Delete" && S.treeMulti.size > 1 && S.project && S.project.authoring){ e.preventDefault(); e.stopPropagation(); multiPrograms("delete"); }
  else if(e.key==="Escape" && S.treeMulti.size){ S.treeMulti.clear(); paintMulti(); }
}, true);
const _renderTree2 = renderTree;
renderTree = function(){ _renderTree2(); paintMulti(); };
