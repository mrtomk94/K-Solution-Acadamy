"use strict";
/* Navigation (gap report 5.2 LD-14..17, 5.7): Errors tab with click-to-go and F4,
   Go To (Ctrl+G), Find / Find All / Replace (Ctrl+F, F3, Ctrl+H), Cross Reference
   (Ctrl+E) and fault locations that open the logic. */

(function(){
const css = document.createElement("style");
css.textContent = `
.errs .row,.hits .row{display:flex;gap:8px;padding:1px 4px;cursor:pointer;border-radius:3px}
.errs .row:hover,.hits .row:hover{background:var(--sel)}.errs .row.cur,.hits .row.cur{background:var(--sel);outline:1px solid var(--acc)}
.errs .row.nav0{cursor:default}
.errbar{display:flex;gap:6px;align-items:center;margin-bottom:4px;font-family:system-ui}
.errbar button{padding:0 8px;font-size:11px}.errbar input{font-size:11px;padding:1px 6px}
.loc{color:var(--acc);cursor:pointer;text-decoration:underline dotted}
.xref td{font-family:var(--mono);font-size:12px}.xref tr[data-i]{cursor:pointer}.xref tr[data-i]:hover td{background:var(--sel)}
.xref .yes{color:var(--warn);font-weight:700}
.findfrm{display:grid;grid-template-columns:110px 1fr;gap:6px 10px;align-items:center}
.findfrm .chk{display:flex;gap:12px;flex-wrap:wrap}
.ins.flashi .sym,.ins.flashi .box{animation:flash 1.6s ease-out}`;
document.head.appendChild(css);
})();

S.errors = []; S.errIdx = -1; S.errTitle = ""; S.errShow = {error:true, warning:true, message:true}; S.errQ = "";
S.hits = []; S.hitIdx = -1; S.find = {q:"", scope:"routine", within:{operands:true, mnemonics:true, comments:true}, whole:false, case:false, with:""};
CTABS.splice(1, 0, ["errors", "Errors"], ["search", "Search Results"]);

/* ---------- locations ---------- */
function parseLoc(text){
  const m = /((?:AOI:)?[A-Za-z_][\w]*)\/([A-Za-z_]\w*)\s+(rung|line)\s+(\d+)/.exec(text||"");
  return m ? {program:m[1], routine:m[2], [m[3]]: +m[4]} : null;
}
function locText(l){ return `${l.program}/${l.routine}${l.rung!=null?` rung ${l.rung}`:l.line!=null?` line ${l.line}`:""}`; }
async function waitRoutine(prog, routine){
  for(let i=0; i<60; i++){
    if(S.R && S.R.prog===prog && S.R.routine===routine && S.R.doc && S.R.doc.querySelector(".ladder,.stview,.sted,.notice")) return true;
    await new Promise(r => setTimeout(r, 50));
  }
  return false;
}
/* open a routine and put the caret on a rung / instruction / ST line */
async function goToLocation(l){
  if(!l || !l.program || !l.routine) return;
  await openRoutine(l.program, l.routine);
  if(!(await waitRoutine(l.program, l.routine))) return;
  if(S.R.data.type==="RLL" && l.rung!=null){
    const n = Math.min(l.rung, S.R.data.rungs.length);
    let iid = l.index!=null ? l.index : null;
    if(iid==null && l.instr){ const k = lxInstrs(n).findIndex(x => x.name.toUpperCase()===String(l.instr).toUpperCase()); if(k>=0) iid = k; }
    const L = lxSel(); L.rungs = iid==null ? new Set([n]) : new Set(); L.anchor = n; L.ins = iid==null ? new Set() : new Set([iid]);
    lxSetCaret(n, iid, l.operand!=null ? l.operand : null);
    if(iid!=null) L.ins = new Set([iid]);
    lxPaint(); lxFocus();
    const el = lxRungEl(n); if(el){ el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); el.scrollIntoView({block:"center"}); }
  } else if(S.R.data.type==="ST" && l.line!=null){
    stGoLine(l.line, l.col);
  }
}
function stGoLine(line, col){
  const ta = $("stTa");
  if(ta){ const off = ta.value.split("\n").slice(0, line-1).reduce((a,x)=>a+x.length+1, 0) + Math.max(0, (col||1)-1);
          ta.focus(); ta.setSelectionRange(off, off); const lh = 18; ta.scrollTop = Math.max(0, (line-5)*lh); return; }
  const v = $("stView"); if(!v) return;
  const row = v.children[line-1]; if(!row) return;
  v.querySelectorAll(".curline").forEach(x=>x.classList.remove("curline"));
  row.classList.add("curline"); row.scrollIntoView({block:"center"});
  row.style.background = "var(--sel)"; setTimeout(()=>{ row.style.background = ""; }, 1800);
}

/* ---------- Errors tab ---------- */
function errorsFromVerify(r, filt, title){
  const out = [];
  const where = (s) => parseLoc(s) || {};
  const keep = (l) => !filt || (l.program===filt.program && (!filt.routine || l.routine===filt.routine));
  for(const e of r.parse_errors||[]){ const l = where(e.location); if(keep(l)) out.push({sev:"error", text:`${e.location}: ${e.error}`, ...l}); }
  for(const e of r.operand_errors||[]){ const l = where(e.location); if(keep(l)) out.push({sev:"error", text:`${e.location}: ${e.instruction}: ${e.error}`, instr:e.instruction, ...l}); }
  for(const u of r.unsupported||[]) for(const loc of u.locations||[]){ const l = where(loc); if(keep(l)) out.push({sev:"error", text:`${loc}: ${u.instruction} is not executed (${u.reason})`, instr:u.instruction, ...l}); }
  for(const b of r.boundary||[]) for(const loc of b.locations||[]){ const l = where(loc); if(keep(l)) out.push({sev:"message", text:`${loc}: ${b.instruction}: accepted, no effect in simulation`, instr:b.instruction, ...l}); }
  if(!filt){
    for(const t of r.missing_tags||[]) out.push({sev:"error", text:`Missing tag: ${t}`, tag:t});
    for(const x of r.routines_not_simulated||[]) out.push({sev:"warning", text:`${x.routine}: ${x.type} routine is not simulated`});
    for(const w of r.warnings||[]){ const l = where(w); out.push({sev:"warning", text:w, ...l}); }
  } else for(const w of r.warnings||[]){ const l = where(w); if(l.program && keep(l)) out.push({sev:"warning", text:w, ...l}); }
  setErrors(out, title);
}
function errorsFromIssues(list, title){
  setErrors(list.map(x => ({sev: x.severity==="error" ? "error" : "warning", text:`${locText(x)}: ${x.message}`, program:x.program, routine:x.routine, rung:x.rung, line:x.line, index:x.instr, operand:x.operand})), title);
}
function setErrors(list, title){
  S.errors = list; S.errIdx = -1; S.errTitle = title || "";
  const bad = list.filter(e => e.sev!=="message").length;
  if(bad){ S.ctab = "errors"; }
  renderConsoleTabs(); renderConsole();
}
function errVisible(){ const q = S.errQ.toLowerCase(); return S.errors.map((e,i)=>[e,i]).filter(([e]) => S.errShow[e.sev] && (!q || e.text.toLowerCase().includes(q))); }
function renderErrors(c){
  const n = (s) => S.errors.filter(e=>e.sev===s).length;
  const rows = errVisible().map(([e, i]) => `<div class="row ${i===S.errIdx?"cur":""} ${e.program?"":"nav0"}" data-e="${i}"><span class="${e.sev==="error"?"err":e.sev==="warning"?"wrn":"dim"}">${e.sev==="error"?"✖":e.sev==="warning"?"⚠":"ℹ"}</span><span>${esc(e.text)}</span></div>`).join("");
  c.innerHTML = `<div class="errbar"><b>${esc(S.errTitle||"Errors")}</b>
     <button class="${S.errShow.error?"on":""}" data-sev="error">✖ ${n("error")} Errors</button>
     <button class="${S.errShow.warning?"on":""}" data-sev="warning">⚠ ${n("warning")} Warnings</button>
     <button class="${S.errShow.message?"on":""}" data-sev="message">ℹ ${n("message")} Messages</button>
     <input id="errQ" placeholder="Search…" value="${esc(S.errQ)}"><span class="dim">click a line or press F4 / Shift+F4 to go to it</span></div>
     <div class="errs">${rows || `<span class="ok">No errors. ${S.errTitle?"":"Run Verify (✔) to check the project."}</span>`}</div>`;
  c.querySelectorAll("[data-sev]").forEach(b => b.onclick = () => { S.errShow[b.dataset.sev] = !S.errShow[b.dataset.sev]; renderConsole(); });
  const q = $("errQ"); q.oninput = () => { S.errQ = q.value; const p = q.selectionStart; renderConsole(); const q2 = $("errQ"); q2.focus(); q2.setSelectionRange(p,p); };
  c.querySelectorAll("[data-e]").forEach(r => { r.onclick = () => goError(+r.dataset.e); });
}
function goError(i){
  const e = S.errors[i]; if(!e) return;
  S.errIdx = i; if(S.ctab==="errors") renderConsole();
  statusMsg(e.text, e.sev);
  if(e.program) goToLocation(e);
  else if(e.tag && window.xrefOpen) log(e.text, "wrn");
}
function stepError(dir){
  const vis = errVisible().filter(([e]) => e.program);
  if(!vis.length){ statusMsg(S.errors.length ? "No navigable errors" : "No errors — run Verify first", "message"); return; }
  let k = vis.findIndex(([, i]) => i===S.errIdx);
  k = k<0 ? (dir>0 ? 0 : vis.length-1) : (k + dir + vis.length) % vis.length;
  goError(vis[k][1]);
}
function statusMsg(text, sev){
  let el = $("sMsg"); if(!el){ el = document.createElement("span"); el.id = "sMsg"; el.style.cssText = "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:45vw"; $("status").appendChild(el); }
  el.className = sev==="error" ? "err" : sev==="warning" ? "wrn" : "";
  el.textContent = text; el.title = text;
}
async function verifyScope(filt){
  try {
    const r = await api("GET","/api/studio/verify");
    if(!filt) r.text.split("\n").forEach(l=>log(l, /NOT|MISSING|PARSE|OPERAND|WARNING|BOUNDARY/.test(l)?"wrn":"ok"));
    const title = filt ? `Verify ${filt.routine ? `routine ${filt.program}/${filt.routine}` : `program ${filt.program}`}` : "Verify controller";
    errorsFromVerify(r, filt, title);
    const bad = S.errors.filter(e=>e.sev==="error").length, w = S.errors.filter(e=>e.sev==="warning").length;
    statusMsg(`${title}: ${bad} error(s), ${w} warning(s)`, bad ? "error" : w ? "warning" : "message");
    if(!bad && !w){ S.ctab = "errors"; renderConsoleTabs(); renderConsole(); }
  } catch(e){ log(e.message, "err"); }
}
$("bVerify").onclick = () => verifyScope(null);

/* ---------- Search Results tab ---------- */
function renderHits(c){
  const rows = S.hits.map((h, i) => `<div class="row ${i===S.hitIdx?"cur":""}" data-h="${i}"><span class="dim">${esc(locText(h))}</span><span>${h.kind==="comment"?"<i>comment</i> ":""}${esc(h.match || h.text)}</span></div>`).join("");
  c.innerHTML = `<div class="errbar"><b>${esc(S.findTitle||"Search Results")}</b><span class="dim">${S.hits.length} found · click a line, or F3 / Shift+F3</span></div><div class="hits">${rows || '<span class="dim">Use Find (Ctrl+F) → Find All.</span>'}</div>`;
  c.querySelectorAll("[data-h]").forEach(r => r.onclick = () => goHit(+r.dataset.h));
}
function goHit(i){
  const h = S.hits[i]; if(!h) return;
  S.hitIdx = i; if(S.ctab==="search") renderConsole();
  statusMsg(`Found ${i+1} of ${S.hits.length}: ${locText(h)}`);
  goToLocation({...h});
}
const _rc = renderConsole;
renderConsole = function(){
  const c = $("cbody");
  if(S.ctab==="errors") return renderErrors(c);
  if(S.ctab==="search") return renderHits(c);
  _rc();
  linkLocations(c);
};
/* fault / log lines that name a rung become links */
function linkLocations(c){
  if(!["faults","output"].includes(S.ctab)) return;
  const walk = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); const nodes = [];
  while(walk.nextNode()) if(/\/[A-Za-z_]\w*\s+(rung|line)\s+\d+/.test(walk.currentNode.nodeValue)) nodes.push(walk.currentNode);
  for(const t of nodes.slice(0, 300)){
    const re = /((?:AOI:)?[A-Za-z_]\w*)\/([A-Za-z_]\w*)\s+(rung|line)\s+(\d+)/g; const s = t.nodeValue; let m, last = 0; const frag = document.createDocumentFragment();
    while((m = re.exec(s))){ frag.append(s.slice(last, m.index)); const a = document.createElement("span"); a.className = "loc"; a.textContent = m[0]; a.title = "Open this location"; a.dataset.loc = m[0]; frag.append(a); last = m.index + m[0].length; }
    frag.append(s.slice(last)); t.replaceWith(frag);
  }
  c.querySelectorAll(".loc[data-loc]").forEach(a => a.onclick = (e) => { e.stopPropagation(); goToLocation(parseLoc(a.dataset.loc)); });
}

/* ---------- Go To (Ctrl+G) ---------- */
async function goToDialog(){
  if(S.R && S.active===lxKey() && S.R.data){
    const st = S.R.data.type==="ST", max = st ? (S.R.data.text||"").split("\n").length : lxCount();
    await dialog({title:"Go To", buttons:[["Cancel","cancel"],["Go To","ok","pri"]],
      body:`<div class="findfrm"><label for="gtN">${st?"Line":"Rung"}</label><input id="gtN" value="" placeholder="${st?`1 … ${max}`:`0 … ${max-1} or End`}"></div>`,
      onOpen:() => $("gtN").focus(),
      onSubmit: async () => {
        const v = $("gtN").value.trim();
        if(st){ const n = +v; if(!Number.isInteger(n) || n<1 || n>max) return `Enter a line number from 1 to ${max}`;
                setTimeout(()=>stGoLine(n), 0); return; }
        const n = /^end$/i.test(v) ? lxCount() : +v;
        if(v==="" || !Number.isInteger(n) || n<0 || n>lxCount()) return `Enter a rung number from 0 to ${lxCount()-1}, or End`;
        setTimeout(() => { const L = lxSel(); L.rungs = new Set(n<lxCount()?[n]:[]); L.anchor = n; lxSetCaret(n); lxFocus(); const el = lxRungEl(n); if(el){ el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); } }, 0);
      }});
    return;
  }
  if(S.active && S.active.startsWith("tags:")){
    const rows = () => [...document.querySelectorAll("#doc tr[data-addr]")];
    const pick = (q, go) => { const u = q.toLowerCase(); const tr = rows().find(r => ((r.querySelector("td")||{}).textContent||"").replace(/^[\s+−]+/, "").trim().toLowerCase().startsWith(u));
      if(tr){ document.querySelectorAll("#doc tr.sel").forEach(x=>x.classList.remove("sel")); tr.classList.add("sel"); tr.scrollIntoView({block:"nearest"}); if(go) select(tr.dataset.addr); } return tr; };
    await dialog({title:"Go To Tag", buttons:[["Cancel","cancel"],["Go To","ok","pri"]],
      body:`<div class="findfrm"><label for="gtT">Tag</label><input id="gtT" list="tagList" placeholder="type a name: the row is selected as you type"></div>`,
      onOpen:() => { const i = $("gtT"); i.focus(); i.oninput = () => pick(i.value, false); },
      onSubmit: async () => { if(!pick($("gtT").value, true)) return "No tag starts with that name in this view"; }});
    return;
  }
  log("Go To: open a routine or a tag list first", "wrn");
}

/* ---------- Find / Replace ---------- */
function findDefault(){
  if(lxIsLadder()){ const c = lxSel().caret; if(c.iid!=null){ const op = lxOpAddr(c.rung, c.iid, c.op); if(op) return op.raw; } }
  const ta = $("stTa"); if(ta && ta.selectionStart!==ta.selectionEnd) return ta.value.slice(ta.selectionStart, ta.selectionEnd);
  return S.find.q;
}
function findScope(){
  const f = S.find; const rt = S.R && S.active===lxKey();
  return {scope: rt ? f.scope : (f.scope==="routine" ? "all" : f.scope), program: S.R ? S.R.prog : "", routine: S.R ? S.R.routine : ""};
}
async function runFind(all){
  const f = S.find, sc = findScope();
  const within = Object.entries(f.within).filter(([,v])=>v).map(([k])=>k).join(",");
  const r = await api("GET", `/api/studio/search?q=${encodeURIComponent(f.q)}&scope=${sc.scope}&program=${encodeURIComponent(sc.program)}&routine=${encodeURIComponent(sc.routine)}&within=${within}&whole=${f.whole}&case=${f.case}`);
  S.hits = r.hits; S.hitIdx = -1; S.findTitle = `Find "${f.q}" — ${({routine:"current routine",program:"current program",all:"all routines"})[sc.scope]}`;
  if(all){ S.ctab = "search"; renderConsoleTabs(); renderConsole(); }
  return r.hits;
}
function findNextFrom(dir){
  if(!S.hits.length){ statusMsg(`"${S.find.q}" not found`, "warning"); log(`Find: "${S.find.q}" not found`, "wrn"); return; }
  // start from the caret when the current routine is open
  let k;
  if(S.hitIdx<0 && lxIsLadder()){ const c = lxSel().caret.rung, here = S.hits.map((h,i)=>[h,i]).filter(([h])=>h.program===S.R.prog && h.routine===S.R.routine);
    const nx = dir>0 ? here.find(([h])=>h.rung>=c) : [...here].reverse().find(([h])=>h.rung<=c);
    k = nx ? nx[1] : (dir>0 ? 0 : S.hits.length-1); }
  else k = S.hitIdx<0 ? (dir>0 ? 0 : S.hits.length-1) : (S.hitIdx + dir + S.hits.length) % S.hits.length;
  goHit(k);
}
async function findDialog(replace){
  const f = S.find; f.q = findDefault() || f.q;
  const rt = S.R && S.active===lxKey();
  const res = await dialog({title: replace ? "Replace" : "Find", buttons: replace ? [["Close","cancel"],["Find All","all"],["Replace All","ok","pri"]] : [["Close","cancel"],["Replace…","replace"],["Find All","all"],["Find Next","ok","pri"]],
    body:`<div class="findfrm"><label for="fq">Find what</label><input id="fq" value="${esc(f.q)}" list="tagList">
      ${replace?`<label for="fw">Replace with</label><input id="fw" value="${esc(f.with)}" list="tagList">`:""}
      <label for="fs">Find where</label><select id="fs">${rt?`<option value="routine">Current routine</option>`:""}<option value="program">Current program</option><option value="all">All routines</option></select>
      <span>Find within</span><span class="chk"><label><input type="checkbox" id="fwo" ${f.within.operands?"checked":""}> Operands</label><label><input type="checkbox" id="fwm" ${f.within.mnemonics?"checked":""}> Instructions</label><label><input type="checkbox" id="fwc" ${f.within.comments?"checked":""}> Rung comments</label></span>
      <span>Options</span><span class="chk"><label><input type="checkbox" id="fww" ${f.whole?"checked":""}> Match whole word</label><label><input type="checkbox" id="fwk" ${f.case?"checked":""}> Match case</label></span></div>
      ${replace?`<p class="notice-small">Replace All changes the logic through the normal edit path: each routine is validated and is one undo step.</p>`:""}`,
    onOpen:() => { $("fs").value = rt ? f.scope : (f.scope==="routine"?"all":f.scope); $("fq").focus(); $("fq").select(); },
    onSubmit: async (btn) => {
      f.q = $("fq").value; f.scope = $("fs").value; f.whole = $("fww").checked; f.case = $("fwk").checked;
      f.within = {operands:$("fwo").checked, mnemonics:$("fwm").checked, comments:$("fwc").checked};
      if(replace) f.with = $("fw").value;
      if(!f.q) return "Enter the text to find";
      if(btn==="replace") return;
      const hits = await runFind(btn==="all");
      if(!hits.length) return `"${f.q}" not found`;
    }});
  if(res==="replace") return findDialog(true);
  if(res==="ok" && !replace) findNextFrom(1);
  if(res==="ok" && replace) await replaceAll();
}
async function replaceAll(){
  const f = S.find, sc = findScope();
  const mode = (S.state||{}).mode;
  const ok = await dialog({title:"Replace All?", buttons:[["Cancel","cancel"],["Replace All","ok","pri"]],
    body:`<p>Replace <code>${esc(f.q)}</code> with <code>${esc(f.with)}</code> in ${S.hits.length} place(s)?</p>${mode==="RUN"?`<p class="wrn">The controller is running: the changes apply at the next scan.</p>`:""}`});
  if(ok!=="ok") return;
  const within = Object.entries(f.within).filter(([,v])=>v).map(([k])=>k).join(",");
  try {
    const r = await api("POST","/api/studio/replace",{q:f.q, with:f.with, scope:sc.scope, program:sc.program, routine:sc.routine, within, whole:f.whole, case:f.case});
    log(`Replace All: ${r.replaced} replaced in ${r.routines.length} routine(s)`, r.failed.length ? "wrn" : "ok");
    S.hits = [...r.routines.flatMap(x => (x.rungs||[]).map(n => ({program:x.program, routine:x.routine, rung:n, kind:"replaced", text:`Replaced: ${f.q} → ${f.with}`}))),
              ...r.failed.map(x => ({program:x.program, routine:x.routine, kind:"failed", text:`Failed replace: ${x.error}${x.issues.length?" — "+x.issues.join("; "):""}`}))];
    S.findTitle = `Replace "${f.q}" → "${f.with}"`; S.hitIdx = -1; S.ctab = "search"; renderConsoleTabs(); renderConsole();
    if(S.R) await reloadRoutine();
  } catch(e){ log(`Replace All: ${e.message}`, "err"); }
}

/* ---------- Cross Reference (Ctrl+E) ---------- */
function xrefOpen(addr){
  if(!addr) return;
  const id = "xref:" + addr;
  openTab(id, `Cross Reference - ${addr.replace(/^Program:[^.]+\./, "")}`, async (doc) => {
    S.live = null;
    const r = await api("GET", `/api/studio/xref?address=${encodeURIComponent(addr)}`);
    const st = S.xshow || (S.xshow = {});
    const show = st[addr] || "all";
    const rows = r.references.filter(x => !x.alias).filter(x => show==="all" || (show==="d" ? x.destructive : !x.destructive));
    const al = r.references.filter(x => x.alias);
    doc.innerHTML = `<div class="tagtools"><b>Cross Reference</b> <code>${esc(addr)}</code>
      <label class="dim">Show <select id="xShow"><option value="all">All</option><option value="d">Destructive (writes)</option><option value="n">Non-destructive (reads)</option></select></label>
      <span class="dim">${rows.length} of ${r.references.length - al.length} reference(s) · double-click a row to go there</span><button id="xRef" class="colbtn">↻ Refresh</button></div>
      <table class="xref"><thead><tr><th>Destructive</th><th>Program</th><th>Routine</th><th>Location</th><th>Instruction</th><th>Operand</th><th>Logic</th></tr></thead><tbody>
      ${rows.map((x,i)=>`<tr data-i="${r.references.indexOf(x)}"><td class="${x.destructive?"yes":""}">${x.destructive?"Y":"N"}</td><td>${esc(x.program)}</td><td>${esc(x.routine)}</td><td>${x.rung!=null?`Rung ${x.rung}`:`Line ${x.line}`}</td><td>${esc(x.instruction||(x.line!=null?"(ST)":""))}</td><td>${x.operand!=null?x.operand+1:""}</td><td class="desc" title="${esc(x.text)}">${esc(x.text)}</td></tr>`).join("") || `<tr><td colspan="7" class="dim">No references.</td></tr>`}</tbody></table>
      ${al.length?`<h3 style="margin:12px 10px 4px">Aliases</h3><ul class="refs">${al.map(a=>`<li>${esc(a.text)}</li>`).join("")}</ul>`:""}`;
    $("xShow").value = show;
    $("xShow").onchange = () => { st[addr] = $("xShow").value; renderDoc(); };
    $("xRef").onclick = () => renderDoc();
    doc.querySelectorAll("tr[data-i]").forEach(tr => tr.ondblclick = () => { const x = r.references[+tr.dataset.i]; goToLocation({program:x.program, routine:x.routine, rung:x.rung, line:x.line, index:x.index, operand:x.operand}); });
    doc.oncontextmenu = (e) => { const tr = e.target.closest("tr[data-i]"); if(!tr) return; e.preventDefault(); const x = r.references[+tr.dataset.i];
      showMenu(e, [["Go To Logic", ()=>goToLocation({program:x.program, routine:x.routine, rung:x.rung, line:x.line, index:x.index, operand:x.operand})], ["Monitor Tag", ()=>lxMonitor(addr)]]); };
  });
}
function xrefRoutine(program, routine){
  openTab(`xref:R:${program}/${routine}`, `Cross Reference - ${routine}`, async (doc) => {
    S.live = null;
    const r = await api("GET", `/api/studio/xref?program=${encodeURIComponent(program)}&routine=${encodeURIComponent(routine)}`);
    doc.innerHTML = `<div class="tagtools"><b>Cross Reference</b> routine <code>${esc(program)}/${esc(routine)}</code><span class="dim">${r.references.length} caller(s) · double-click to go there</span></div>
      <table class="xref"><thead><tr><th>Program</th><th>Routine</th><th>Location</th><th>Logic</th></tr></thead><tbody>${r.references.map((x,i)=>`<tr data-i="${i}"><td>${esc(x.program)}</td><td>${esc(x.routine)}</td><td>${x.rung!=null?`Rung ${x.rung}`:`Line ${x.line}`}</td><td class="desc">${esc(x.text)}</td></tr>`).join("") || `<tr><td colspan="4" class="dim">Not called by any JSR (it may be a main routine).</td></tr>`}</tbody></table>`;
    doc.querySelectorAll("tr[data-i]").forEach(tr => tr.ondblclick = () => { const x = r.references[+tr.dataset.i]; goToLocation({program:x.program, routine:x.routine, rung:x.rung, line:x.line, instr:"JSR"}); });
  });
}
function xrefContext(){
  if(lxIsLadder()){ const c = lxSel().caret; if(c.iid!=null){ const op = lxOpAddr(c.rung, c.iid, c.op); if(op && op.addr) return xrefOpen(op.addr);
      const ins = lxInstrs(c.rung)[c.iid]; if(ins && /^(JSR|SBR)$/i.test(ins.name) && ins.args[0]) return xrefRoutine(S.R.prog, ins.args[0]); }
    return xrefRoutine(S.R.prog, S.R.routine); }
  if(S.treeSel && S.treeSel.startsWith("r:") && document.activeElement && document.activeElement.closest && document.activeElement.closest("#org")){ const [p, r] = S.treeSel.slice(2).split("/"); return xrefRoutine(p, r); }
  if(S.sel) return xrefOpen(findDef(S.sel) ? S.sel : S.sel);
  log("Cross Reference: select a tag, an operand or a routine first", "wrn");
}

/* ---------- keys ---------- */
function navKeys(e){
  if($("dlg").open || menuOpen()) return false;
  const ctrl = e.ctrlKey || e.metaKey, k = e.key;
  if(k==="F4" && !ctrl && !e.altKey){ e.preventDefault(); stepError(e.shiftKey ? -1 : 1); return true; }
  if(k==="F3" && !ctrl){ e.preventDefault(); if(!S.find.q){ findDialog(false); return true; } (S.hits.length ? Promise.resolve() : runFind(false)).then(() => findNextFrom(e.shiftKey ? -1 : 1)); return true; }
  if(ctrl && !e.altKey && !e.shiftKey && (k==="f" || k==="F")){
    if(S.active && S.active.startsWith("tags:") && $("tfilter") && !(S.R && S.active===lxKey())){ e.preventDefault(); $("tfilter").focus(); $("tfilter").select(); return true; }
    e.preventDefault(); findDialog(false); return true; }
  if(ctrl && !e.altKey && !e.shiftKey && (k==="h" || k==="H")){ e.preventDefault(); findDialog(true); return true; }
  if(typingTarget(document.activeElement) && !(document.activeElement.id==="stTa")) return false;
  if(ctrl && !e.altKey && !e.shiftKey && (k==="g" || k==="G")){ e.preventDefault(); goToDialog(); return true; }
  if(ctrl && !e.altKey && !e.shiftKey && (k==="e" || k==="E")){ e.preventDefault(); xrefContext(); return true; }
  return false;
}
vcsKeyHooks.unshift(navKeys);
window.xrefOpen = xrefOpen; window.goToDialog = goToDialog; window.errorsFromIssues = errorsFromIssues;
