"use strict";
/* Ladder editor workflows modelled on Logix Designer (gap report 5.2 / 5.3):
   rung selection region and multi-select, a keyboard caret, rung and instruction
   context menus, Cut/Copy/Paste/Delete, Undo/Redo, Insert/Append mode, Ctrl+R,
   Ctrl+D, Alt+Enter, double-click targets and rung comments.
   Every change still goes through the server's validate + finalize path
   (/api/studio/edit/...), so nothing here changes how logic executes. */

(function(){
const css = document.createElement("style");
css.textContent = `
.ladder:focus{outline:none}
.rung.lsel{background:color-mix(in srgb,var(--acc) 12%,transparent)}
.rung.caret>.rnum{outline:2px solid var(--acc);outline-offset:-2px;border-radius:3px;color:var(--ink)}
.ladder:not(:focus-within) .rung.caret>.rnum{outline-style:dotted}
.ins.caret .sym,.ins.caret .box{box-shadow:0 0 0 2px var(--acc)}
.ins.msel .sym,.ins.msel .box{box-shadow:0 0 0 2px var(--acc);background:var(--sel)}
.br.opcaret,.tagn.opcaret{outline:1px dashed var(--acc)}
.rnum{cursor:pointer;user-select:none}
.rung.placeholder .rline{border-style:dashed;justify-content:center;align-items:center;color:var(--mut);font-style:italic;min-height:30px}
.endrung.caret .rline{outline:2px solid var(--acc);outline-offset:-2px}
#sIns{cursor:pointer;font-family:var(--mono);padding:0 4px;border:1px solid var(--line);border-radius:3px}`;
document.head.appendChild(css);
})();

S.lsel = null;                       // ladder selection of the visible routine
S.insMode = lsGet("InsMode")==="APP" ? "APP" : "INS";
S.clip = null;                       // {kind:"rungs", items:[{text, comment}], text} | {kind:"instr", text}

/* ---------- helpers ---------- */
function lxKey(){ return S.R ? `r:${S.R.prog}/${S.R.routine}` : null; }
function lxIsLadder(){ return !!(S.R && S.R.data && S.R.data.type==="RLL" && S.active===lxKey() && S.R.data.rungs); }
function lxEditable(){ return !!(S.R && S.R.data && S.R.data.editable); }
function lxCount(){ return S.R.data.rungs.length; }
function lxSel(){
  const k = lxKey();
  if(!S.lsel || S.lsel.id!==k) S.lsel = {id:k, rungs:new Set(), anchor:null, caret:{rung:0, iid:null, op:null}, ins:new Set()};
  return S.lsel;
}
function lxBusy(){ return $("dlg").open || menuOpen() || !!$("tbrowse"); }
function lxReady(){                  // the ladder (not a field, dialog or editor) has the keyboard
  if(!lxIsLadder() || S.edit || lxBusy()) return false;
  const ae = document.activeElement;
  if(typingTarget(ae)) return false;
  return !ae || ae===document.body || !!(ae.closest && ae.closest(".ladder"));
}
function lxWrap(){ return S.R && S.R.doc ? S.R.doc.querySelector(".ladder") : null; }
function lxRungEl(n){ const w = lxWrap(); if(!w) return null; return n>=lxCount() ? w.querySelector(".endrung") : w.querySelector(`.rung[data-n="${n}"]`); }
function lxInstrs(n){ const r = S.R.data.rungs[n]; return r && !r.error ? instrOrder(r.tree) : []; }
function lxFocus(){ const w = lxWrap(); if(w && document.activeElement!==w && !typingTarget(document.activeElement)) w.focus({preventScroll:true}); }
function lxSort(set){ return [...set].sort((a,b)=>a-b); }

/* paint the selection and caret (also after every re-render) */
function lxPaint(){
  const w = lxWrap(); if(!w || !lxIsLadder()) return;
  const L = lxSel();
  w.querySelectorAll(".rung.lsel,.rung.caret,.ins.caret,.ins.msel,.opcaret").forEach(el => el.classList.remove("lsel","caret","msel","opcaret"));
  L.rungs.forEach(n => { const el = lxRungEl(n); if(el && n<lxCount()) el.classList.add("lsel"); });
  const re = lxRungEl(L.caret.rung); if(!re) return;
  if(L.caret.iid==null) re.classList.add("caret");
  else {
    L.ins.forEach(i => { const x = re.querySelector(`.ins[data-iid="${i}"]`); if(x) x.classList.add("msel"); });
    const ie = re.querySelector(`.ins[data-iid="${L.caret.iid}"]`);
    if(ie){ ie.classList.add("caret");
      if(L.caret.op!=null){ const o = ie.querySelector(`[data-k="${L.caret.op}"]`); if(o) o.classList.add("opcaret"); } }
    else re.classList.add("caret");
  }
}
/* keep the caret in view for keyboard moves; a mouse click never scrolls (a double-click
   must land on the same element twice) */
S.lastPointer = 0;
document.addEventListener("mousedown", () => { S.lastPointer = performance.now(); }, true);
function lxShow(n){ if(performance.now() - S.lastPointer < 600) return; const el = lxRungEl(n); if(el) el.scrollIntoView({block:"nearest"}); }
function lxSetCaret(rung, iid=null, op=null){
  const L = lxSel(); const max = lxCount();
  L.caret = {rung: Math.max(0, Math.min(max, rung)), iid, op};
  if(iid==null) L.ins = new Set();
  lxPaint(); lxShow(L.caret.rung);
  const ins = iid!=null ? lxInstrs(L.caret.rung)[iid] : null;
  if(ins){ const a = aoiAddr(S.R.prog, ins.args[op!=null ? op : 0]); S.selInstr = ins.name.toUpperCase(); if(a) select(a); else renderProps(); }
  lxStatus();
}
function lxSelectRungs(from, to){
  const L = lxSel(); L.rungs = new Set();
  const a = Math.min(from, to), b = Math.min(Math.max(from, to), lxCount()-1);
  for(let i=a; i<=b; i++) L.rungs.add(i);
  lxPaint();
}

/* ---------- mouse ---------- */
function lxClickIns(e, el){
  const rd = el.closest(".rung[data-n]"); if(!rd) return;
  const n = +rd.dataset.n, iid = +el.dataset.iid, L = lxSel();
  const k = (e.target.closest("[data-k]") || {}).dataset;
  const op = k && k.k!=null ? +k.k : null;
  if((e.ctrlKey || e.metaKey) && L.caret.rung===n && L.caret.iid!=null){         // several instructions of one rung
    if(!L.ins.size) L.ins.add(L.caret.iid);
    L.ins.has(iid) ? L.ins.delete(iid) : L.ins.add(iid);
  } else L.ins = new Set([iid]);
  L.rungs = new Set(); L.anchor = n;
  const keep = new Set(L.ins);
  lxSetCaret(n, iid, op); L.ins = keep; lxPaint();
  document.querySelectorAll(".ins.sel").forEach(x=>x.classList.remove("sel")); el.classList.add("sel");
}
function lxClickRung(e, n){
  const L = lxSel();
  if(e.shiftKey && L.anchor!=null){ lxSelectRungs(L.anchor, n); }
  else if(e.ctrlKey || e.metaKey){ L.rungs.has(n) ? L.rungs.delete(n) : L.rungs.add(n); L.anchor = n; }
  else { L.rungs = new Set(n<lxCount() ? [n] : []); L.anchor = n; }
  lxSetCaret(n);
  if(!(e.shiftKey || e.ctrlKey || e.metaKey) || true) lxPaint();
}
document.addEventListener("click", (e) => {
  if(!lxIsLadder() || S.edit || !e.target.closest) return;
  const w = e.target.closest(".ladder"); if(!w) return;
  if(e.target.closest(".rhead,.insbar,button,input,textarea,select,a")) return;
  const ins = e.target.closest(".ins[data-iid]");
  if(ins){ lxClickIns(e, ins); lxFocus(); return; }
  const rd = e.target.closest(".rung[data-n]");
  if(rd){ lxClickRung(e, +rd.dataset.n); lxFocus(); return; }
  if(e.target.closest(".endrung")){ lxClickRung(e, lxCount()); lxFocus(); return; }
  const L = lxSel(); L.rungs = new Set(); L.ins = new Set(); lxPaint(); lxFocus();
});
document.addEventListener("dblclick", (e) => {
  if(!lxIsLadder() || S.edit || !lxEditable() || !e.target.closest) return;
  if(!e.target.closest(".ladder") || e.target.closest(".rhead,.insbar")) return;
  if(e.target.closest(".bt span") && /^(JSR|FOR)$/i.test(e.target.textContent.trim())) return;   // opens the routine
  if(e.target.closest(".placeholder")){ startInsert(0); return; }
  const rd = e.target.closest(".rung[data-n]"); if(!rd) return;
  const n = +rd.dataset.n;
  if(e.target.closest(".rnum")){ lxEditText(n); return; }
  if(e.target.closest(".rcomment")){ startEdit(n, null); setTimeout(()=>{ const c = $("eComment"); if(c){ c.focus(); c.setSelectionRange(c.value.length, c.value.length); } }, 0); return; }
  const ins = e.target.closest(".ins[data-iid]");
  if(ins){
    const kk = e.target.closest("[data-k]"), k = kk ? +kk.dataset.k : null;
    startEdit(n, +ins.dataset.iid);
    if(k!=null) setTimeout(()=>{ const i = document.querySelector(`#eInstr input[data-op="${k}"]`); if(i){ i.focus(); i.select(); } }, 0);
    return;
  }
  startEdit(n, null);
});
document.addEventListener("contextmenu", (e) => {
  if(!lxIsLadder() || S.edit || !e.target.closest || !e.target.closest(".ladder")) return;
  if(e.target.closest(".rhead,.insbar")) return;
  const ins = e.target.closest(".ins[data-iid]");
  if(ins){
    e.preventDefault();
    const n = +ins.closest(".rung[data-n]").dataset.n, iid = +ins.dataset.iid, L = lxSel();
    if(!(L.caret.rung===n && L.ins.has(iid))){ lxClickIns({target:e.target, ctrlKey:false}, ins); }
    else { const kk = e.target.closest("[data-k]"); L.caret.op = kk ? +kk.dataset.k : null; lxPaint(); }
    lxFocus(); instrMenu(e, n, iid, L.caret.op); return;
  }
  const rd = e.target.closest(".rung[data-n]"), end = e.target.closest(".endrung");
  if(rd || end){
    e.preventDefault();
    const n = rd ? +rd.dataset.n : lxCount(), L = lxSel();
    if(!L.rungs.has(n)) lxClickRung({}, n); else lxSetCaret(n);
    lxFocus(); rungMenu(e, n); return;
  }
});

/* ---------- menus ---------- */
function lxModeIdx(n){ return S.insMode==="APP" ? Math.min(n+1, lxCount()) : n; }
function rungMenu(e, n, anchor){
  const ed = lxEditable(), end = n>=lxCount(), L = lxSel();
  const sel = L.rungs.size ? lxSort(L.rungs) : (end ? [] : [n]);
  const many = sel.length > 1 ? ` (${sel.length} rungs)` : "";
  const items = end ? [
      ["Add Rung", ()=>startInsert(n), !ed, "Ctrl+R"],
      ["Paste", ()=>lxPaste(null), !ed || !S.clip, "Ctrl+V"]]
    : [
      ["Edit Rung", ()=>startEdit(n, null), !ed, "Enter"],
      ["Edit Rung as Text", ()=>lxEditText(n), !ed],
      ["Edit Rung Comment…", ()=>rungCommentDialog(n), !ed, "Ctrl+D"],
      "-",
      ["Add Rung Above", ()=>startInsert(n), !ed, S.insMode==="INS" ? "Ctrl+R" : ""],
      ["Add Rung Below", ()=>startInsert(n+1), !ed, S.insMode==="APP" ? "Ctrl+R" : ""],
      "-",
      ["Cut" + many, ()=>lxCut(), !ed, "Ctrl+X"],
      ["Copy" + many, ()=>lxCopy(), false, "Ctrl+C"],
      ["Paste", ()=>lxPaste(null), !ed || !S.clip, "Ctrl+V"],
      ["Delete" + many, ()=>lxDelete(), !ed, "Del"],
      "-",
      ["Verify Rung", ()=>verifyRung(n)],
      ["Go To…", ()=>window.goToDialog && goToDialog(), !window.goToDialog, "Ctrl+G"],
      ["Select All Rungs", ()=>{ lxSelectRungs(0, lxCount()-1); }, false, "Ctrl+A"]];
  if(window.lxMenuExtra) items.push(...lxMenuExtra("rung", n));
  showMenu(e, items, anchor);
}
function lxOpAddr(n, iid, k){
  const ins = lxInstrs(n)[iid]; if(!ins) return null;
  const sp = spec(ins.name);
  let idx = k!=null ? k : 0;
  if(sp && k==null){ const ops = sp.operands||[]; if(ops[0] && ["label","routine","imm","expr"].includes(ops[0].kind)) idx = null; }
  if(idx==null) return null;
  const raw = ins.args[idx]; if(!raw || raw==="?" || /^[-+]?\d/.test(raw)) return null;
  return {raw, addr: aoiAddr(S.R.prog, raw), k: idx, ins};
}
function lxTagKnown(addr){
  if(!addr) return false;
  if(addr in S.values) return true;
  const pre1 = addr+".", pre2 = addr+"[";
  for(const k in S.values) if(k.startsWith(pre1) || k.startsWith(pre2)) return true;
  return !!findDef(addr);
}
function instrMenu(e, n, iid, k, anchor){
  const ed = lxEditable(), L = lxSel(), ins = lxInstrs(n)[iid]; if(!ins) return;
  const nm = ins.name.toUpperCase();
  const cnt = L.ins.size > 1 ? ` (${L.ins.size})` : "";
  const items = [
    [`Edit ${ins.name}`, ()=>startEdit(n, iid), !ed, "Enter"],
    ["Cut Instruction" + cnt, ()=>lxCut(), !ed, "Ctrl+X"],
    ["Copy Instruction" + cnt, ()=>lxCopy(), false, "Ctrl+C"],
    ["Paste", ()=>lxPaste(null), !ed || !S.clip, "Ctrl+V"],
    ["Delete Instruction" + cnt, ()=>lxDelete(), !ed, "Del"]];
  const op = lxOpAddr(n, iid, k);
  if(op && op.addr){
    const a = op.addr, v = S.values[a], known = lxTagKnown(a), label = op.raw.length > 28 ? op.raw.slice(0, 26) + "…" : op.raw;
    items.push("-");
    if(!known) items.push([`New Tag "${label}"…`, ()=>lxCreateTag(op), !(S.project && S.project.authoring)]);
    else {
      items.push([`Monitor "${label}"`, ()=>lxMonitor(a)],
                 [`Go To Cross Reference for "${label}"`, ()=>window.xrefOpen && xrefOpen(a), !window.xrefOpen, "Ctrl+E"],
                 ["Edit Description…", ()=>tagDescDialog(a), !(S.project && S.project.authoring), "Ctrl+D"]);
      if(typeof v==="boolean") items.push(["Toggle Bit", ()=>{ select(a); toggleSelected(); }, false, "Ctrl+T"], ["Force On", ()=>force(a,true)], ["Force Off", ()=>force(a,false)]);
      else if(v!==undefined && typeof v!=="object") items.push(["Force current value", ()=>force(a, v)]);
      if(isForced(a)) items.push(["Remove Force", ()=>unforce(a)]);
      items.push(["Add to Watch", ()=>addWatch(a)]);
      const def = findDef(a); if(def) items.push(["Tag Properties…", ()=>tagPropertiesDialog(def), !(S.project && S.project.authoring)]);
    }
  }
  if(["JSR","SBR","FOR"].includes(nm) && ins.args[0] && ins.args[0]!=="?" && !S.R.prog.startsWith("AOI:"))
    items.push("-", [`Open Routine ${ins.args[0]}`, ()=>openRoutine(S.R.prog, ins.args[0])]);
  else if(nm==="JMP" && ins.args[0]) items.push("-", [`Go To Label ${ins.args[0]}`, ()=>lxGoLabel(ins.args[0])]);
  if(window.lxMenuExtra) items.splice(1, 0, ...lxMenuExtra("instr", n, iid, k));
  showMenu(e, items, anchor);
}
function lxGoLabel(lbl){
  const u = lbl.toUpperCase();
  const n = S.R.data.rungs.findIndex(r => !r.error && instrOrder(r.tree).some(i => i.name.toUpperCase()==="LBL" && (i.args[0]||"").toUpperCase()===u));
  if(n<0){ log(`Label ${lbl} not found in this routine`, "wrn"); return; }
  lxSel().rungs = new Set([n]); lxSetCaret(n);
}
function lxMonitor(addr){
  const scope = addr.startsWith("Program:") ? addr.slice(8, addr.indexOf(".")) : "controller";
  const root = (addr.replace(/^Program:[^.]+\./, "").match(/^[^.\[]+/)||[""])[0];
  openTags(scope, root, "monitor");
  setTimeout(() => { select(addr); const tr = document.querySelector(`tr[data-addr="${CSS.escape(addr)}"]`); if(tr){ tr.classList.add("sel"); tr.scrollIntoView({block:"nearest"}); } }, 600);
}
function lxCreateTag(op){
  const raw = op.raw.trim();
  const full = raw.match(/^Program:([A-Za-z_]\w*)\.([A-Za-z_]\w*)/i);
  const root = full ? full[2] : (raw.match(/^[A-Za-z_][A-Za-z0-9_]*/)||[""])[0];
  newTagDialog({name: root, scope: full ? full[1] : undefined, data_type: guessType(op.ins.name, op.k)});
}

/* ---------- dialogs: rung comment, tag description ---------- */
async function rungCommentDialog(n){
  const r = S.R.data.rungs[n]; if(!r) return;
  const ver = S.R.data.version;
  const res = await dialog({title:`Rung ${n} comment`, buttons:[["Cancel","cancel"],["OK","ok","pri"]],
    body:`<textarea id="rcTa" rows="5" style="width:100%;font:inherit">${esc(r.comment||"")}</textarea><p class="notice-small">Ctrl+Enter applies. An empty comment removes it.</p>`,
    onOpen:() => { const t = $("rcTa"); t.focus(); t.setSelectionRange(t.value.length, t.value.length); },
    onSubmit: async () => {
      try { await api("POST","/api/studio/edit/rung",{program:S.R.prog, routine:S.R.routine, op:"comment", index:n, comment:$("rcTa").value, version:ver}); }
      catch(e){ return e.message; } }});
  if(res==="ok"){ log(`Rung ${n} comment changed`, "ok"); S.flash = n; await reloadRoutine(); }
}
async function tagDescDialog(addr){
  const def = findDef(addr); if(!def){ log(`${addr}: no tag to describe`, "wrn"); return; }
  const res = await dialog({title:`Description - ${def.address}`, buttons:[["Cancel","cancel"],["OK","ok","pri"]],
    body:`${def.address!==addr?`<p class="notice-small">${esc(addr)} is part of <b>${esc(def.address)}</b>; its description is the tag's.</p>`:""}<textarea id="tdTa" rows="4" style="width:100%;font:inherit">${esc(def.description||"")}</textarea><p class="notice-small">Ctrl+Enter applies.</p>`,
    onOpen:() => { const t = $("tdTa"); t.focus(); t.select(); },
    onSubmit: async () => { try { await api("PUT","/api/studio/tag",{address:def.address, description:$("tdTa").value}); } catch(e){ return e.message; } }});
  if(res==="ok"){ log(`Description of ${def.address} changed`, "ok"); await refreshProject(); }
}
async function verifyRung(n){
  const r = S.R.data.rungs[n]; if(!r) return;
  try {
    const v = await api("POST","/api/studio/validate/rung",{program:S.R.prog, routine:S.R.routine, text:r.text, index:n, inserting:false});
    if(!v.issues.length) log(`Verify rung ${n}: no errors`, "ok");
    v.issues.forEach(x => log(`Verify rung ${n}: ${x.severity==="error"?"error":"warning"}: ${x.message}`, x.severity==="error"?"err":"wrn"));
    if(window.errorsFromIssues) errorsFromIssues(v.issues.map(x => ({...x, program:S.R.prog, routine:S.R.routine, rung:n})), `Verify rung ${S.R.prog}/${S.R.routine} ${n}`);
  } catch(e){ log(`Verify rung: ${e.message}`, "err"); }
}
function lxEditText(n){
  startEdit(n, null);
  const E = S.edit; if(!E) return;
  E.text = S.R.data.rungs[n].text.replace(/;\s*$/, ""); E.textMode = true; renderEditor();
}

/* ---------- rung text helpers (client copy of the neutral-text syntax) ---------- */
function parseRungText(text){
  let i = 0; const s = text.trim().replace(/;\s*$/, "");
  const ws = () => { while(i<s.length && /\s/.test(s[i])) i++; };
  function seq(stop){
    const items = [];
    for(;;){
      ws(); if(i>=s.length || stop.includes(s[i])) return items;
      if(s[i]==="["){ i++; const legs = [seq(",]")];
        while(s[i]===","){ i++; legs.push(seq(",]")); }
        if(s[i]!=="]") throw new Error("missing ]"); i++;
        items.push({kind:"branch", _id: nextNode++, legs}); continue; }
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i)); if(!m) throw new Error(`unexpected '${s[i]}'`);
      const name = m[0]; i += name.length; ws();
      if(s[i]!=="(") throw new Error(`${name}: missing (`);
      i++; let depth = 0, cur = "", args = [];
      for(; i<s.length; i++){
        const c = s[i];
        if(c==="(" || c==="["){ depth++; cur += c; }
        else if((c===")" || c==="]") && depth>0){ depth--; cur += c; }
        else if(c===")"){ break; }
        else if(c==="," && depth===0){ args.push(cur.trim()); cur = ""; }
        else cur += c;
      }
      if(s[i]!==")") throw new Error(`${name}: missing )`); i++;
      if(cur.trim() || args.length) args.push(cur.trim());
      items.push({kind:"instr", _id: nextNode++, name, args});
    }
  }
  const out = seq(""); ws(); if(i<s.length) throw new Error(`unexpected '${s[i]}'`); return out;
}
function splitRungs(text){
  const out = []; let depth = 0, cur = "";
  for(const c of text){ if(c==="(" || c==="[") depth++; else if(c===")" || c==="]") depth--;
    if(c===";" && depth<=0){ if(cur.trim()) out.push(cur.trim()); cur = ""; } else cur += c; }
  if(cur.trim()) out.push(cur.trim());
  return out;
}
/* remove instruction nodes (by instruction order index) from a rung tree copy */
function lxWithout(tree, iids){
  const order = instrOrder(tree), drop = new Set(iids.map(i => order[i]).filter(Boolean));
  const walk = (items) => {
    const out = [];
    for(const n of items){
      if(n.kind==="branch"){
        const legs = n.legs.map(walk).filter(l => l.length);
        if(legs.length>=2) out.push({...n, legs}); else if(legs.length===1) out.push(...legs[0]);
      } else if(!drop.has(n)) out.push(n);
    }
    return out;
  };
  return walk(tree);
}

/* ---------- clipboard, delete ---------- */
function lxTarget(){
  const L = lxSel();
  if(L.rungs.size) return {kind:"rungs", rungs: lxSort(L.rungs)};
  if(L.caret.iid!=null) return {kind:"instr", rung: L.caret.rung, iids: L.ins.size ? lxSort(L.ins) : [L.caret.iid]};
  if(L.caret.rung < lxCount()) return {kind:"rungs", rungs:[L.caret.rung]};
  return null;
}
function lxClipData(){
  const t = lxTarget(); if(!t) return null;
  if(t.kind==="rungs"){
    const items = t.rungs.map(n => ({text: S.R.data.rungs[n].text.replace(/;\s*$/, "") + ";", comment: S.R.data.rungs[n].comment || ""}));
    return {kind:"rungs", items, text: items.map(x=>x.text).join("\n") + "\n"};
  }
  const order = lxInstrs(t.rung);
  const text = t.iids.map(i => order[i]).filter(Boolean).map(n => n.name + "(" + n.args.join(",") + ")").join("");
  return {kind:"instr", text};
}
function lxCopy(ev){
  const c = lxClipData(); if(!c) return false;
  S.clip = c;
  if(ev && ev.clipboardData){ ev.clipboardData.setData("text/plain", c.text); ev.preventDefault(); }
  else { try { navigator.clipboard.writeText(c.text).catch(()=>{}); } catch(e){} }
  log(c.kind==="rungs" ? `Copied ${c.items.length} rung(s)` : `Copied ${c.text}`);
  return true;
}
async function lxCut(ev){ if(!lxEditable()) return; if(lxCopy(ev)) await lxDelete(true); }
async function lxDelete(silent){
  if(!lxEditable()) return;
  const t = lxTarget(); if(!t) return;
  const ver = S.R.data.version;
  if(t.kind==="rungs"){
    if(!silent && await dialog({title: t.rungs.length>1 ? `Delete ${t.rungs.length} rungs?` : `Delete rung ${t.rungs[0]}?`,
        body:`<p>Delete rung${t.rungs.length>1?"s":""} ${t.rungs.join(", ")}? This applies to the program immediately; Undo (Ctrl+Z) restores ${t.rungs.length>1?"them":"it"}.</p>`,
        buttons:[["Cancel","cancel"],["Delete","ok","pri"]], danger:true})!=="ok") return;
    const ops = [...t.rungs].sort((a,b)=>b-a).map(n => ({op:"delete", index:n}));
    try { await api("POST","/api/studio/edit/batch",{program:S.R.prog, routine:S.R.routine, ops, version:ver});
          log(`Deleted rung(s) ${t.rungs.join(", ")}`, "ok"); const L = lxSel(); L.rungs = new Set(); L.caret = {rung: Math.min(t.rungs[0], lxCount()-t.rungs.length), iid:null, op:null}; await reloadRoutine(); }
    catch(e){ log(`Delete: ${e.message}`, "err"); }
    return;
  }
  const rung = S.R.data.rungs[t.rung];
  const left = lxWithout(rung.tree, t.iids);
  try {
    if(!left.length){
      if(await dialog({title:"Delete the rung?", body:`<p>Removing ${t.iids.length>1?"these instructions":"this instruction"} leaves rung ${t.rung} empty. Delete the rung?</p>`, buttons:[["Cancel","cancel"],["Delete rung","ok","pri"]]})!=="ok") return;
      await api("POST","/api/studio/edit/rung",{program:S.R.prog, routine:S.R.routine, op:"delete", index:t.rung, version:ver});
    } else {
      await api("POST","/api/studio/edit/rung",{program:S.R.prog, routine:S.R.routine, op:"replace", index:t.rung, text:serialize(left), comment:rung.comment||"", version:ver});
    }
    log(`Deleted instruction(s) in rung ${t.rung}`, "ok");
    lxSel().ins = new Set(); lxSel().caret.iid = null; S.flash = t.rung; await reloadRoutine();
  } catch(e){
    const iss = e.data && e.data.issues ? ": " + e.data.issues.map(x=>x.message).join("; ") : "";
    log(`Delete: ${e.message}${iss}`, "err");
  }
}
/* paste: rungs go before/after the caret rung (Insert/Append); instructions open the
   editor on the caret rung with them in place, to review and finalize */
async function lxPaste(text){
  if(!lxEditable()) return;
  let clip = S.clip;
  if(text!=null && !(clip && clip.text.trim()===text.trim())){
    const t = text.trim(); if(!t){ return; }
    clip = /;/.test(t) ? {kind:"rungs", items: splitRungs(t).map(x=>({text:x+";", comment:""})), text:t} : {kind:"instr", text:t};
  }
  if(!clip){ log("Nothing to paste: copy rungs or instructions first", "wrn"); return; }
  const L = lxSel(), ver = S.R.data.version;
  if(clip.kind==="rungs"){
    const at = L.caret.rung>=lxCount() ? lxCount() : lxModeIdx(L.caret.rung);
    const ops = clip.items.map((x, i) => ({op:"insert", index: at+i, text:x.text, comment:x.comment}));
    try { await api("POST","/api/studio/edit/batch",{program:S.R.prog, routine:S.R.routine, ops, version:ver});
          log(`Pasted ${ops.length} rung(s) at ${at}`, "ok"); L.rungs = new Set(ops.map(o=>o.index)); L.caret = {rung:at, iid:null, op:null}; S.flash = at; await reloadRoutine(); }
    catch(e){ const iss = e.data && e.data.issues ? ": " + e.data.issues.map(x=>x.message).join("; ") : ""; log(`Paste refused: ${e.message}${iss}`, "err"); }
    return;
  }
  let nodes; try { nodes = parseRungText(clip.text); } catch(err){ log(`Paste: not ladder logic (${err.message})`, "err"); return; }
  const n = L.caret.rung;
  if(n>=lxCount()){ startInsert(lxCount()); S.edit.tree = nodes; renderEditor(); scheduleValidate(0, true); return; }
  startEdit(n, null); const E = S.edit; if(!E) return;
  edPush();
  if(L.caret.iid==null) E.tree.splice(0, 0, ...nodes);
  else {
    const target = instrOrder(E.tree)[L.caret.iid], f = target ? findNode(target._id) : null;
    if(f) f.list.splice(S.insMode==="APP" ? f.index+1 : f.index, 0, ...nodes); else E.tree.push(...nodes);
  }
  E.sel = {id: nodes[0]._id}; renderEditor(); scheduleValidate(0, true);
  log("Pasted into the rung editor: check and Finalize (Ctrl+Enter)");
}
document.addEventListener("copy", (e) => { if(lxReady()) lxCopy(e); });
document.addEventListener("cut", (e) => { if(lxReady() && lxEditable()){ e.preventDefault(); lxCut(e); } });
document.addEventListener("paste", (e) => {
  if(!lxReady() || !lxEditable()) return;
  e.preventDefault();
  lxPaste(e.clipboardData ? e.clipboardData.getData("text/plain") : null);
});

/* ---------- undo / redo ---------- */
async function lxUndo(){
  try { const r = await api("POST","/api/studio/edit/undo",{program:S.R.prog, routine:S.R.routine, version:S.R.data.version});
        log(`Undo: ${S.R.prog}/${S.R.routine} (effective at scan #${r.entry.effective_scan})`, "ok"); await reloadRoutine(); }
  catch(e){ log(`Undo: ${e.message}`, e.status===409 ? "wrn" : "err"); }
}
async function lxRedo(){
  try { const r = await api("POST","/api/studio/edit/redo",{program:S.R.prog, routine:S.R.routine, version:S.R.data.version});
        log(`Redo: ${S.R.prog}/${S.R.routine} (effective at scan #${r.entry.effective_scan})`, "ok"); await reloadRoutine(); }
  catch(e){ log(`Redo: ${e.message}`, e.status===409 ? "wrn" : "err"); }
}
async function projectUndoAsk(){
  let label = null; try { label = (await api("GET","/api/studio/project/undo")).label; } catch(e){}
  if(!label){ log("Nothing to undo", "wrn"); return; }
  if(await dialog({title:"Undo project change?", body:`<p>Undo: <b>${esc(label)}</b>?</p>`, buttons:[["Cancel","cancel"],["Undo","ok","pri"]]})==="ok") undoProjectChange();
}

/* ---------- Insert / Append mode (Ctrl+I) ---------- */
function lxStatus(){
  let el = $("sIns");
  if(!el){ el = document.createElement("span"); el.id = "sIns"; el.title = "Insert / Append mode (Ctrl+I): where Paste, Ctrl+R and new instructions go relative to the caret";
    el.onclick = () => toggleInsMode(); $("status").insertBefore(el, $("sScan")); }
  el.textContent = S.insMode;
}
function toggleInsMode(){ S.insMode = S.insMode==="INS" ? "APP" : "INS"; lsSet("InsMode", S.insMode); lxStatus(); log(S.insMode==="INS" ? "Insert mode: new elements go before the caret" : "Append mode: new elements go after the caret"); }
lxStatus();

/* ---------- keyboard ---------- */
function lxMoveH(dir){
  const L = lxSel(), c = L.caret, cnt = lxCount();
  const ins = c.rung<cnt ? lxInstrs(c.rung) : [];
  if(dir>0){
    if(c.iid==null){ if(ins.length) return lxSetCaret(c.rung, 0); if(c.rung<cnt) return lxSetCaret(c.rung+1); return; }
    if(c.iid < ins.length-1) return lxSetCaret(c.rung, c.iid+1);
    return lxSetCaret(Math.min(cnt, c.rung+1));
  }
  if(c.iid==null){ if(c.rung>0){ const p = lxInstrs(c.rung-1); return lxSetCaret(c.rung-1, p.length ? p.length-1 : null); } return; }
  if(c.iid>0) return lxSetCaret(c.rung, c.iid-1);
  return lxSetCaret(c.rung);
}
function lxKeys(e){
  if(!lxReady()) return false;
  const L = lxSel(), c = L.caret, cnt = lxCount(), k = e.key, ctrl = e.ctrlKey || e.metaKey;
  const done = () => { e.preventDefault(); return true; };
  if(k==="ArrowDown" || k==="ArrowUp"){
    const to = Math.max(0, Math.min(cnt, c.rung + (k==="ArrowDown" ? 1 : -1)));
    if(e.shiftKey){ if(L.anchor==null) L.anchor = c.rung; lxSetCaret(to); lxSelectRungs(L.anchor, to); }
    else { L.rungs = new Set(to<cnt ? [to] : []); L.anchor = to; lxSetCaret(to); }
    return done();
  }
  if(k==="ArrowRight" && !e.altKey){ L.rungs = new Set(); lxMoveH(1); return done(); }
  if(k==="ArrowLeft" && !e.altKey){ L.rungs = new Set(); lxMoveH(-1); return done(); }
  if(k==="Home" && ctrl){ if(e.shiftKey){ lxSelectRungs(c.rung, 0); lxSetCaret(0); } else { L.rungs = new Set(cnt?[0]:[]); L.anchor = 0; lxSetCaret(0); } return done(); }
  if(k==="End" && ctrl){ const last = Math.max(0, cnt-1); if(e.shiftKey){ lxSelectRungs(c.rung, last); lxSetCaret(last); } else { L.rungs = new Set(cnt?[last]:[]); L.anchor = last; lxSetCaret(last); } return done(); }
  if(k==="Home"){ lxSetCaret(c.rung); return done(); }
  if(k==="End"){ const ins = lxInstrs(c.rung); lxSetCaret(c.rung, ins.length ? ins.length-1 : null); return done(); }
  if(k==="PageDown" || k==="PageUp"){ const step = 8, to = Math.max(0, Math.min(cnt, c.rung + (k==="PageDown"?step:-step))); L.rungs = new Set(to<cnt?[to]:[]); lxSetCaret(to); return done(); }
  if(k==="Escape"){ L.rungs = new Set(); L.ins = new Set(); lxPaint(); return done(); }
  if((k==="Enter" || k==="F2") && !ctrl && !e.altKey){
    if(!lxEditable()) return done();
    if(c.rung>=cnt){ startInsert(cnt); return done(); }
    startEdit(c.rung, c.iid);
    if(c.iid!=null && c.op!=null) setTimeout(()=>{ const i = document.querySelector(`#eInstr input[data-op="${c.op}"]`); if(i){ i.focus(); i.select(); } }, 0);
    return done();
  }
  if(k==="Delete" && !ctrl){ lxDelete(); return done(); }
  if(ctrl && !e.altKey && (k==="z" || k==="Z") && !e.shiftKey){ if(lxEditable()) lxUndo(); return done(); }
  if(ctrl && !e.altKey && ((k==="y" || k==="Y") || ((k==="z" || k==="Z") && e.shiftKey))){ if(lxEditable()) lxRedo(); return done(); }
  if(ctrl && !e.altKey && (k==="r" || k==="R")){ if(lxEditable()) startInsert(c.rung>=cnt ? cnt : lxModeIdx(c.rung)); return done(); }
  if(ctrl && !e.altKey && (k==="i" || k==="I")){ toggleInsMode(); return done(); }
  if(ctrl && !e.altKey && (k==="d" || k==="D")){
    if(c.iid!=null){ const op = lxOpAddr(c.rung, c.iid, c.op); if(op && op.addr && lxTagKnown(op.addr)) tagDescDialog(op.addr); else log("Ctrl+D: this operand is not a tag", "wrn"); }
    else if(c.rung<cnt) rungCommentDialog(c.rung);
    return done();
  }
  if(ctrl && !e.altKey && (k==="a" || k==="A")){
    if(c.iid!=null){ L.ins = new Set(lxInstrs(c.rung).map((_,i)=>i)); lxPaint(); } else if(cnt) lxSelectRungs(0, cnt-1);
    return done();
  }
  if(e.altKey && k==="Enter"){ const pr = (S.project.tasks.flatMap(t=>t.programs).concat(S.project.unscheduled)).find(p=>p.name===S.R.prog);
    const r = pr && pr.routines.find(x=>x.name===S.R.routine); if(r) routinePropsDialog(S.R.prog, r); return done(); }
  if((k==="F10" && e.shiftKey) || k==="ContextMenu"){
    const re = lxRungEl(c.rung);
    if(c.iid!=null){ const ie = re && re.querySelector(`.ins[data-iid="${c.iid}"]`); instrMenu(null, c.rung, c.iid, c.op, ie || re); }
    else rungMenu(null, c.rung, re ? re.querySelector(".rnum") || re : null);
    return done();
  }
  return false;
}

/* undo/redo inside the rung editor (structure changes; text fields keep their own undo) */
function edUndoKeys(e){
  if(!S.edit || S.edit.st || lxBusy() || typingTarget(document.activeElement)) return false;
  const ctrl = e.ctrlKey || e.metaKey;
  if(ctrl && (e.key==="z" || e.key==="Z") && !e.shiftKey){ e.preventDefault(); edUndo(); return true; }
  if(ctrl && (e.key==="y" || e.key==="Y" || ((e.key==="z" || e.key==="Z") && e.shiftKey))){ e.preventDefault(); edRedo(); return true; }
  return false;
}

/* Ctrl+Z / Ctrl+Y elsewhere: a Structured Text view undoes its routine, other views
   offer the last project change (tags, programs, routines...) */
function otherUndoKeys(e){
  const ctrl = e.ctrlKey || e.metaKey;
  if(!ctrl || e.altKey || !(e.key==="z" || e.key==="Z" || e.key==="y" || e.key==="Y")) return false;
  if(S.edit || lxBusy() || typingTarget(document.activeElement)) return false;
  const redo = e.key==="y" || e.key==="Y" || e.shiftKey;
  e.preventDefault();
  if(S.R && S.active===lxKey() && S.R.data && S.R.data.editable){ redo ? lxRedo() : lxUndo(); return true; }
  if(redo){ log("Redo is available inside routines (Ctrl+Y)", "wrn"); return true; }
  projectUndoAsk(); return true;
}

/* hook for the page's keyboard handler */
window.vcsKeyHooks = window.vcsKeyHooks || [];
vcsKeyHooks.push(edUndoKeys, lxKeys, otherUndoKeys);
window.lxAfterRender = function(){ if(lxIsLadder()){ const w = lxWrap(); if(w) w.tabIndex = 0; lxPaint(); } };
