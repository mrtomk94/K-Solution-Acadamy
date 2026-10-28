"use strict";
/* Faster logic entry (gap report increment 7): Insert/Append placement, grouped palette,
   Add Element dialog (Alt+Insert), quick keys, in-place operand editing, typing starts
   an edit, drag and drop (rungs, palette, instructions, tags), branch moves and
   extend/shrink, operand descriptions on the rung, bookmarks. */

(function(){
const css = document.createElement("style");
css.textContent = `
.paltabs{display:flex;flex-wrap:wrap;gap:2px;margin-bottom:3px}.paltabs button{font-size:11px;padding:1px 6px;border-radius:3px 3px 0 0;opacity:.75}
.paltabs button.on{opacity:1;border-bottom-color:transparent;background:var(--sel)}.palset{display:inline-flex;flex-wrap:wrap;gap:2px;align-items:center}
.pal.bound{border-style:dashed}.egrp.pal-grp{display:inline-flex;flex-direction:column;align-items:flex-start}
#opEdit{position:fixed;z-index:60;font:12px var(--mono);padding:1px 4px;border:2px solid var(--acc);background:var(--pane);color:var(--ink);min-width:110px}
#opEditErr{position:fixed;z-index:60;background:var(--pane);color:var(--bad);border:1px solid var(--bad);padding:2px 6px;font-size:12px;max-width:420px}
.rung.dropT{box-shadow:inset 0 3px 0 var(--ok)}.rung.dropB,.endrung.dropT{box-shadow:inset 0 -3px 0 var(--ok)}
.endrung.dropT{box-shadow:inset 0 3px 0 var(--ok)}
.ins.dropL{box-shadow:-3px 0 0 var(--ok)}.ins.dropR{box-shadow:3px 0 0 var(--ok)}.rline.dropIn{outline:2px dashed var(--ok)}
[data-k].dropOp,input.dropOp{outline:2px solid var(--ok)}
.rnum[draggable=true]{cursor:grab}
.odesc{font-size:10px;line-height:12px;color:var(--mut);max-width:150px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;text-align:center;margin:0 auto 2px}
.odesc.pass{font-style:italic}
.rnum.bm::before{content:"🔖";font-size:10px;margin-right:2px}
.qmap{font:11px var(--mono);color:var(--mut)}.qmap b{color:var(--ink)}
.aeWrap{display:grid;grid-template-columns:260px 1fr;gap:10px;min-width:560px}.aeList{height:300px;overflow:auto;border:1px solid var(--line);font-size:12px}
.aeList div{padding:1px 6px;cursor:default;white-space:nowrap}.aeList div.grp{font-weight:700;color:var(--mut);background:var(--pane)}
.aeList div.on{background:var(--sel)}.aeHelp{font-size:12px;max-height:330px;overflow:auto}.aeHelp table td{padding:1px 6px}
@media (max-width:700px){.aeWrap{grid-template-columns:1fr;min-width:0}}`;
document.head.appendChild(css);
})();

/* ---------- settings ---------- */
const QK_DEFAULT = {b:"BRANCH", c:"CTU", d:"GEQ", f:"XIO", l:"OTL", o:"OTE", t:"TON", u:"OTU", x:"XIC"};
S.quickOn = lsGet("QuickKeys")==="1";
S.showQuick = lsGet("ShowQuick")==="1";
S.showDesc = lsGet("ShowDesc")==="1";
S.palTab = lsGet("PalTab") || "Favorites";
function quickMap(){ try { const m = JSON.parse(lsGet("QuickMap") || "null"); if(m && typeof m==="object") return m; } catch(e){} return {...QK_DEFAULT}; }
function setQuickKeys(on){ S.quickOn = !!on; lsSet("QuickKeys", on ? "1" : "0"); log(on ? "Quick keys on: letters add instructions in the ladder" : "Quick keys off"); if(lxIsLadder()) renderLadder(); }
function toggleQuickMap(){ S.showQuick = !S.showQuick; lsSet("ShowQuick", S.showQuick ? "1" : "0"); if(lxIsLadder()) renderLadder(); }
function toggleOperandDesc(){ S.showDesc = !S.showDesc; lsSet("ShowDesc", S.showDesc ? "1" : "0"); if(S.R && S.R.data && S.R.data.type==="RLL") renderLadder(); }
async function quickKeysDialog(){
  const m = quickMap(), letters = "abcdefghijklmnopqrstuvwxyz".split("");
  const fields = [{name:"on", label:"Enable Quick Keys in the ladder editor", type:"checkbox", value:S.quickOn},
                  ...letters.map(l => ({name:"k_"+l, label:`Key ${l.toUpperCase()}`, value: m[l] || "", list:"isaList"}))];
  await formDialog({title:"Assign Quick Keys", submit:"OK", fields,
    intro:`<p class="notice-small">One instruction per key; an instruction can have only one key. Use BRANCH for a branch. Add-On Instructions cannot be bound. Leave empty to free a key.</p>`,
    onSubmit: (v) => {
      const out = {}, seen = {};
      for(const l of letters){ const name = (v["k_"+l] || "").trim().toUpperCase(); if(!name) continue;
        if(name!=="BRANCH" && !spec(name)) return `Key ${l.toUpperCase()}: ${name} is not a ladder instruction${aoiDef(name) ? " (Add-On Instructions cannot be bound)" : ""}`;
        if(seen[name]) return `${name} is already bound to key ${seen[name].toUpperCase()}; an instruction can have only one quick key`;
        seen[name] = l; out[l] = spec(name) ? spec(name).mnemonic : "BRANCH"; }
      lsSet("QuickMap", JSON.stringify(out)); setQuickKeys(v.on);
    }});
}

/* ---------- LD-09: Insert / Append placement ---------- */
function placeNode(node, rel){            // rel: {id, before} | {leg, li} | null (smart rule)
  const E = S.edit;
  if(rel && rel.leg!=null){ const f = findNode(rel.leg); if(f){ f.node.legs[rel.li].push(node); return; } }
  if(rel && rel.id!=null){ const f = findNode(rel.id); if(f){ f.list.splice(rel.before ? f.index : f.index+1, 0, node); return; } }
  if(isInputNode(node)) E.tree.splice(tailStart(E.tree), 0, node); else E.tree.push(node);
}
const _addInstr = addInstr;
addInstr = function(name, rel){
  const E = S.edit; if(!E) return;
  if(E.textMode){ log("Switch off text mode to add instructions graphically", "wrn"); return; }
  if(String(name).toUpperCase()==="BRANCH"){ addBranch(); return; }
  const sel = E.sel;
  if(rel===undefined && sel && sel.id!=null){
    const f = findNode(sel.id);
    /* the instruction just added keeps the chain going to the right; an instruction the
       user selected follows the Insert (before) / Append (after) mode */
    if(f && f.node.kind==="instr") rel = {id: sel.id, before: S.insMode==="INS" && E.chain!==sel.id};
    else if(f && f.node.kind==="branch") rel = {id: sel.id, before: S.insMode==="INS"};
  }
  if(rel===undefined) rel = sel && sel.leg!=null ? sel : null;
  edPush();
  const node = {kind:"instr", _id: nextNode++, name, args: defaultArgs(name)};
  placeNode(node, rel);
  E.sel = {id: node._id}; E.chain = node._id;
  renderEditor(); scheduleValidate(0, true);
  setTimeout(() => { const i = document.querySelector('#eInstr input[data-op="0"]'); if(i){ i.focus(); i.select(); } }, 0);
};

/* ---------- LD-21: moves across branch boundaries, extend / shrink a branch ---------- */
moveSel = function(dir){
  const E = S.edit; if(!E || !E.sel || E.sel.id==null) return;
  const f = findNode(E.sel.id); if(!f) return;
  const j = f.index + dir, nb = f.list[j];
  edPush();
  if(nb && nb.kind==="branch" && f.node.kind==="instr"){                 // enter the neighbouring branch
    f.list.splice(f.index, 1);
    const leg = dir<0 ? nb.legs[nb.legs.length-1] : nb.legs[0];
    dir<0 ? leg.push(f.node) : leg.unshift(f.node);
  } else if(nb){ [f.list[f.index], f.list[j]] = [f.list[j], f.list[f.index]]; }
  else if(f.parent){                                                       // leave the branch
    const b = f.parent.branch, g = findNode(b._id);
    f.list.splice(f.index, 1);
    g.list.splice(dir<0 ? g.index : g.index+1, 0, f.node);
    if(b.legs.filter(l=>l.length).length<1){ const h = findNode(b._id); h.list.splice(h.index, 1); }
  } else { E.hist.pop(); return; }
  renderEditor(); scheduleValidate(0, true);
};
function extendBranch(dir){
  const E = S.edit; const b = E && ownerBranch(); if(!b){ log("Select a branch or something inside one", "wrn"); return; }
  const g = findNode(b._id);
  if(dir>0){ const nx = g.list[g.index+1]; if(!nx){ log("Nothing to the right of the branch", "wrn"); return; }
    edPush(); g.list.splice(g.index+1, 1); b.legs[0].push(nx); }
  else { const leg = b.legs[0]; if(!leg.length){ log("The branch's first level is empty", "wrn"); return; }
    edPush(); const last = leg.pop(); g.list.splice(g.index+1, 0, last); }
  E.sel = {id: b._id}; renderEditor(); scheduleValidate(0, true);
}

/* ---------- grouped palette in the rung editor ---------- */
function palGroups(){
  const g = {Favorites: PALETTE.map(p=>p[0])};
  for(const sp of Object.values(S.isa)){ if(!(sp.languages||[]).includes("LD")) continue; (g[sp.family] ||= []).push(sp.mnemonic); }
  const aois = (S.project && S.project.aois || []).map(a=>a.name); if(aois.length) g["Add-On"] = aois;
  for(const k in g) if(k!=="Favorites") g[k].sort();
  return g;
}
function palButtons(list){
  return list.map(m => { const sp = spec(m), aoi = sp ? null : aoiDef(m), qk = Object.entries(quickMap()).find(([,v])=>v===m);
    return `<button class="pal ${sp && sp.status==="boundary" ? "bound" : ""}" data-add="${esc(m)}" draggable="true" title="${esc(m)} — ${esc(sp ? sp.title : aoi ? (aoi.description||"Add-On Instruction") : "")}${sp && sp.status==="boundary" ? " (simulation boundary: accepted, no effect)" : ""}${qk ? ` · quick key ${qk[0].toUpperCase()}` : ""}\nClick to add at the selection, or drag onto the rung">${esc(m)}</button>`; }).join("");
}
const _bindEditor = bindEditor;
bindEditor = function(){
  _bindEditor();
  const E = S.edit, host = $("erung"); if(!E || !host) return;
  const grp = host.querySelector(".etools .egrp"); if(!grp) return;
  const groups = palGroups(); if(!groups[S.palTab]) S.palTab = "Favorites";
  grp.classList.add("pal-grp");
  grp.innerHTML = `<div class="paltabs">${Object.keys(groups).map(k=>`<button type="button" data-pt="${esc(k)}" class="${k===S.palTab?"on":""}">${esc(k)}</button>`).join("")}</div>
    <span class="palset">${palButtons(groups[S.palTab])}<input id="eOther" list="isaList" placeholder="other…" title="Type any instruction or AOI name, then Enter (Alt+Insert: Add Element dialog)" size="7"></span>`;
  grp.querySelectorAll("[data-pt]").forEach(b => b.onclick = () => { S.palTab = b.dataset.pt; lsSet("PalTab", S.palTab); renderEditor(); });
  grp.querySelectorAll("[data-add]").forEach(b => { b.onclick = () => addInstr(b.dataset.add);
    b.ondragstart = (e) => { e.dataTransfer.setData("text/x-vcs-instr", b.dataset.add); e.dataTransfer.setData("text/plain", b.dataset.add + "(?)"); e.dataTransfer.effectAllowed = "copy"; }; });
  const other = $("eOther"); other.onkeydown = (e) => { if(e.key==="Enter" && other.value.trim()) addInstr(other.value.trim()); };
  const tools = host.querySelector("#eLeg");
  if(tools && !$("eExt")){
    $("eBranch").title = "Add Branch Level: put the selection in a branch, or add an empty branch (quick key B)";
    tools.title = "Append New Level: add a level (leg) to the selected branch";
    $("eLeft").title = "Move left (Alt+←); moves into or out of a branch at its edge";
    $("eRight").title = "Move right (Alt+→); moves into or out of a branch at its edge";
    tools.insertAdjacentHTML("afterend", `<button id="eExt" title="Extend the branch: move its right rail over the next element (Alt+Shift+→)">⇥ Extend</button><button id="eShr" title="Shrink the branch: move its right rail back over the last element of the first level (Alt+Shift+←)">⇤ Shrink</button>`);
    $("eExt").onclick = () => extendBranch(1); $("eShr").onclick = () => extendBranch(-1);
  }
  bindEditorDrop(host);
};

/* drop palette buttons / tags into the rung being edited */
function bindEditorDrop(host){
  const line = host.querySelector(".eline"); if(!line) return;
  const clear = () => host.querySelectorAll(".dropL,.dropR,.dropIn").forEach(x=>x.classList.remove("dropL","dropR","dropIn"));
  line.ondragover = (e) => {
    if(!e.dataTransfer.types.includes("text/x-vcs-instr")) return;
    e.preventDefault(); e.dataTransfer.dropEffect = "copy"; clear();
    const ins = e.target.closest(".ins[data-nid]");
    if(ins){ const r = ins.getBoundingClientRect(); ins.classList.add(e.clientX < r.left + r.width/2 ? "dropL" : "dropR"); }
    else { const leg = e.target.closest("[data-leg]"); (leg || line).classList.add("dropIn"); }
  };
  line.ondragleave = (e) => { if(!line.contains(e.relatedTarget)) clear(); };
  line.ondrop = (e) => {
    const name = e.dataTransfer.getData("text/x-vcs-instr"); if(!name) return;
    e.preventDefault(); clear();
    const ins = e.target.closest(".ins[data-nid]"), leg = e.target.closest("[data-leg]");
    if(ins){ const r = ins.getBoundingClientRect(); addInstr(name, {id:+ins.dataset.nid, before: e.clientX < r.left + r.width/2}); }
    else if(leg){ const [b, li] = leg.dataset.leg.split(":").map(Number); addInstr(name, {leg:b, li}); }
    else addInstr(name, null);
  };
}

/* ---------- start an edit at the caret and add an element (quick keys, Add Element) ---------- */
function addAtCaret(name){
  if(S.edit){ if(S.edit.st) return; addInstr(name); return; }
  if(!lxIsLadder() || !lxEditable()){ log("Open an editable ladder routine first", "wrn"); return; }
  const c = lxSel().caret, cnt = lxCount();
  if(c.rung>=cnt || !cnt) startInsert(cnt); else startEdit(c.rung, c.iid);
  if(!S.edit) return;
  if(c.iid!=null && S.edit.sel) S.edit.chain = null;
  addInstr(name);
}

/* ---------- LD-09: Add Element dialog (Alt+Insert) ---------- */
async function addElementDialog(){
  if(!(S.edit && !S.edit.st) && !(lxIsLadder() && lxEditable())){ log("Add Element: open an editable ladder routine", "wrn"); return; }
  const groups = palGroups(); delete groups.Favorites;
  let byGroup = lsGet("AeGroups")!=="0", pick = null;
  const all = Object.entries(groups).flatMap(([g, ms]) => ms.map(m => ({m, g})));
  all.push({m:"BRANCH", g:"Branch"});
  const res = await dialog({title:"Add Ladder Element", buttons:[["Cancel","cancel"],["OK","ok","pri"]],
    body:`<div class="aeWrap"><div><input id="aeQ" placeholder="Type a mnemonic…" spellcheck="false" style="width:100%" autocomplete="off">
      <label class="dim" style="display:block;margin:4px 0"><input type="checkbox" id="aeGrp" ${byGroup?"checked":""}> Show groups</label>
      <div class="aeList" id="aeList" tabindex="-1"></div></div><div class="aeHelp" id="aeHelp"></div></div>`,
    onOpen: () => {
      const q = $("aeQ"), list = $("aeList");
      const help = (m) => { const sp = spec(m), aoi = sp ? null : aoiDef(m);
        $("aeHelp").innerHTML = m==="BRANCH" ? `<b>Branch</b><p>Adds a branch with two levels at the selection.</p>`
          : sp ? `<b>${esc(sp.mnemonic)}</b> — ${esc(sp.title)}<div class="dim">${esc(sp.family)}${sp.status==="boundary"?" · simulation boundary (accepted, no effect)":""}</div>
              <table>${sp.operands.map(o=>`<tr><td>${esc(o.name)}${o.optional?" (optional)":""}${o.repeat?" …":""}</td><td class="dim">${esc((o.types||[]).join(", ") || o.kind)}</td></tr>`).join("")}</table>
              ${(sp.notes||[]).slice(0,3).map(n=>`<p class="notice-small">${esc(n)}</p>`).join("")}`
          : aoi ? `<b>${esc(aoi.name)}</b> — Add-On Instruction<p>${esc(aoi.description||"")}</p>` : ""; };
      const draw = () => {
        const t = q.value.trim().toUpperCase();
        let items = all.filter(x => !t || x.m.startsWith(t) || ((spec(x.m)||{}).title||"").toUpperCase().includes(t));
        items.sort((a,b) => (t ? (b.m.startsWith(t) - a.m.startsWith(t)) : 0) || (byGroup ? a.g.localeCompare(b.g) : 0) || a.m.localeCompare(b.m));
        if(!t && pick==null && items.length) pick = items[0].m;
        if(t){ const ex = items.find(x=>x.m===t) || items[0]; pick = ex ? ex.m : null; }
        let html = "", last = null;
        for(const x of items){ if(byGroup && !t && x.g!==last){ html += `<div class="grp">${esc(x.g)}</div>`; last = x.g; }
          html += `<div data-m="${esc(x.m)}" class="${x.m===pick?"on":""}">${esc(x.m)} <span class="dim">${esc((spec(x.m)||{}).title || (x.m==="BRANCH"?"Branch":"AOI"))}</span></div>`; }
        list.innerHTML = html || `<div class="dim">No match</div>`;
        const on = list.querySelector(".on"); if(on) on.scrollIntoView({block:"nearest"});
        help(pick);
      };
      q.oninput = draw;
      q.onkeydown = (e) => { if(e.key!=="ArrowDown" && e.key!=="ArrowUp") return; e.preventDefault();
        const els = [...list.querySelectorAll("[data-m]")]; const i = els.findIndex(x=>x.dataset.m===pick);
        const nx = els[Math.max(0, Math.min(els.length-1, i + (e.key==="ArrowDown"?1:-1)))]; if(nx){ pick = nx.dataset.m; els.forEach(x=>x.classList.toggle("on", x===nx)); nx.scrollIntoView({block:"nearest"}); help(pick); } };
      list.onclick = (e) => { const d = e.target.closest("[data-m]"); if(!d) return; pick = d.dataset.m; list.querySelectorAll(".on").forEach(x=>x.classList.remove("on")); d.classList.add("on"); help(pick); q.focus(); };
      list.ondblclick = (e) => { if(e.target.closest("[data-m]")) $("dlgBtns").querySelector("button.pri").click(); };
      $("aeGrp").onchange = () => { byGroup = $("aeGrp").checked; lsSet("AeGroups", byGroup ? "1" : "0"); draw(); };
      draw(); q.focus();
    },
    onSubmit: () => pick ? null : "Choose an instruction"});
  if(res==="ok" && pick) addAtCaret(pick);
}

/* ---------- LD-05b / LD-08: in-place operand editing ---------- */
function opCount(ins){ const sp = spec(ins.name); return Math.max(ins.args.length, sp ? sp.operands.filter(o=>!o.optional && !o.repeat).length : ins.args.length); }
function opEl(n, iid, k){
  const re = lxRungEl(n); const ie = re && re.querySelector(`.ins[data-iid="${iid}"]`); if(!ie) return null;
  const o = ie.querySelector(`[data-k="${k}"]`); if(!o) return null;
  return o.classList.contains("br") ? (o.children[1] || o) : o;
}
function closeInline(){ const i = $("opEdit"), e = $("opEditErr"); if(i) i.remove(); if(e) e.remove(); S.inline = null; }
function inlineEdit(n, iid, k, initial){
  if(!lxIsLadder() || !lxEditable() || S.edit) return false;
  const ins = lxInstrs(n)[iid]; if(!ins) return false;
  if(k==null) k = 0;
  if(k >= opCount(ins)) return false;
  const sp = spec(ins.name), o = sp && sp.operands[Math.min(k, sp.operands.length-1)];
  lxSetCaret(n, iid, k);
  const el = opEl(n, iid, k); if(!el) return false;
  closeInline();
  el.scrollIntoView({block:"nearest", inline:"nearest"});
  const r = el.getBoundingClientRect();
  const inp = document.createElement("input"); inp.id = "opEdit"; inp.spellcheck = false; inp.autocomplete = "off";
  inp.setAttribute("list", o && o.kind==="routine" ? "routineList" : "tagList");
  inp.title = `${ins.name} · ${o ? o.name : "Operand " + (k+1)} — Enter: accept and go to the next operand · Tab / Shift+Tab: accept and edit the next / previous · Esc: discard · Alt+↓: browse tags`;
  const orig = ins.args[k] ?? "?";
  inp.value = initial!=null ? initial : orig;
  inp.style.left = Math.max(2, r.left - 3) + "px"; inp.style.top = (r.top - 3) + "px"; inp.style.width = Math.max(110, r.width + 30) + "px";
  document.body.appendChild(inp);
  fillLists(S.R.prog);
  S.inline = {n, iid, k, orig, busy:false, inp};
  inp.focus(); if(initial==null) inp.select(); else inp.setSelectionRange(inp.value.length, inp.value.length);
  const commit = async (move) => {
    const st = S.inline; if(!st || st.busy || st.inp!==inp) return;
    const v = inp.value.trim() || "?";
    if(v===orig){ closeInline(); after(move); return; }
    st.busy = true;
    const rung = S.R.data.rungs[n], tree = cloneTree(rung.tree), node = instrOrder(tree)[iid];
    while(node.args.length<=k) node.args.push("?");
    node.args[k] = v;
    try {
      const res = await api("POST","/api/studio/edit/rung",{program:S.R.prog, routine:S.R.routine, op:"replace", index:n, text:serialize(tree), comment:rung.comment||"", version:S.R.data.version});
      log(`Rung ${n}: ${ins.name} ${o ? o.name : "operand"} = ${v} (effective at scan #${res.entry.effective_scan})`, "ok");
      closeInline(); await reloadRoutine(); after(move);
    } catch(e){
      st.busy = false;
      const iss = e.data && e.data.issues ? e.data.issues.filter(x=>x.severity==="error").map(x=>x.message).join("; ") : "";
      let er = $("opEditErr"); if(!er){ er = document.createElement("div"); er.id = "opEditErr"; document.body.appendChild(er); }
      const ir = inp.getBoundingClientRect(); er.style.left = ir.left + "px"; er.style.top = (ir.bottom + 2) + "px";
      er.textContent = `✖ ${iss || e.message} — fix it or press Esc`;
      inp.focus();
    }
  };
  const after = (move) => {
    if(!move) { lxFocus(); return; }
    const list = lxInstrs(n); const cur = list[iid]; if(!cur){ lxFocus(); return; }
    let nk = k + move, ni = iid;
    if(nk >= opCount(cur)){ ni = iid + 1; nk = 0; } else if(nk < 0){ ni = iid - 1; nk = ni>=0 && list[ni] ? opCount(list[ni]) - 1 : 0; }
    if(ni<0 || ni>=list.length){ lxSetCaret(n, iid, k); lxFocus(); return; }
    if(move.edit) inlineEdit(n, ni, nk); else { lxSetCaret(n, ni, nk); lxFocus(); }
  };
  inp.onkeydown = (e) => {
    e.stopPropagation();
    if(e.key==="Escape"){ e.preventDefault(); closeInline(); lxSetCaret(n, iid, k); lxFocus(); }
    else if(e.key==="Enter"){ e.preventDefault(); commit(1); }
    else if(e.key==="Tab"){ e.preventDefault(); commit(e.shiftKey ? Object.assign(new Number(-1), {edit:true}) : Object.assign(new Number(1), {edit:true})); }
    else if(e.key==="ArrowDown" && e.altKey){ e.preventDefault(); openTagBrowser(inp, o && o.types || [], (path) => { inp.value = path; inp.focus(); }); }
  };
  inp.onblur = () => setTimeout(() => {          // a click elsewhere accepts; the tag browser keeps it open
    if(!S.inline || S.inline.inp!==inp || document.activeElement===inp || $("tbrowse") || S.inline.busy) return;
    commit(0);
  }, 120);
  return true;
}
document.addEventListener("scroll", (e) => { if(S.inline && !S.inline.busy && e.target && e.target.id==="doc"){ const el = opEl(S.inline.n, S.inline.iid, S.inline.k); const i = $("opEdit");
  if(el && i){ const r = el.getBoundingClientRect(); i.style.left = Math.max(2, r.left - 3) + "px"; i.style.top = (r.top - 3) + "px"; } } }, true);
/* double-click on an operand edits it in place (capture: runs before the editor handler) */
document.addEventListener("dblclick", (e) => {
  if(!lxIsLadder() || S.edit || !lxEditable() || !e.target.closest) return;
  const kk = e.target.closest(".ins[data-iid] [data-k]"); if(!kk) return;
  if(e.target.closest(".bt")) return;
  const ins = kk.closest(".ins[data-iid]"), rd = ins.closest(".rung[data-n]"); if(!rd) return;
  e.stopImmediatePropagation(); e.preventDefault();
  inlineEdit(+rd.dataset.n, +ins.dataset.iid, +kk.dataset.k);
}, true);

/* ---------- LD-23: bookmarks (per routine, kept in this browser) ---------- */
function bmKey(){ return `BM:${(S.project && S.project.name) || ""}:${S.R.prog}/${S.R.routine}`; }
function bmList(){ try { return JSON.parse(lsGet(bmKey()) || "[]"); } catch(e){ return []; } }
function bmSave(l){ lsSet(bmKey(), JSON.stringify([...new Set(l)].sort((a,b)=>a-b))); bmPaint(); }
function bmToggle(n){ const l = bmList(); const i = l.indexOf(n); if(i>=0) l.splice(i,1); else l.push(n); bmSave(l); log(i>=0 ? `Bookmark removed from rung ${n}` : `Bookmark set on rung ${n}`); }
function bmGo(dir){ const l = bmList().filter(n => n < lxCount()); if(!l.length){ log("No bookmarks in this routine", "wrn"); return; }
  const c = lxSel().caret.rung; const to = dir>0 ? (l.find(n=>n>c) ?? l[0]) : ([...l].reverse().find(n=>n<c) ?? l[l.length-1]);
  lxSel().rungs = new Set([to]); lxSetCaret(to); }
function bmClear(){ bmSave([]); log("All bookmarks of this routine removed"); }
function bmPaint(){ const w = lxWrap(); if(!w) return; const l = new Set(bmList());
  w.querySelectorAll(".rung[data-n] > .rnum").forEach(el => { const on = l.has(+el.parentElement.dataset.n); el.classList.toggle("bm", on); el.title = on ? "Bookmark" : el.title; }); }
function bmDialog(){ const l = bmList().filter(n => n < lxCount());
  dialog({title:`Bookmarks - ${S.R.routine}`, buttons:[["Close","cancel","pri"]], body: l.length ? `<ul class="refs">${l.map(n=>`<li><a href="#" data-bm="${n}">Rung ${n}</a> <span class="dim">${esc((S.R.data.rungs[n].comment || S.R.data.rungs[n].text).slice(0,80))}</span></li>`).join("")}</ul>` : "<p>No bookmarks in this routine.</p>",
    onOpen: (d) => d.querySelectorAll("[data-bm]").forEach(a => a.onclick = (e) => { e.preventDefault(); $("dlg").close("cancel"); const n = +a.dataset.bm; lxSel().rungs = new Set([n]); lxSetCaret(n); }) }); }

/* ---------- LD-20 operand descriptions, quick key map, bookmarks, drag handles after render ---------- */
function descFor(addr){
  const d = findDef(addr); if(d && d.description) return {t: d.description, pass:false};
  const root = addr.replace(/(\.[^.\[]+|\[[^\]]*\])$/, "");
  if(root!==addr){ const r = findDef(root); if(r && r.description) return {t: r.description, pass:true}; }
  if(d && d.alias_for){ const b = findDef(d.alias_for); if(b && b.description) return {t: b.description, pass:true}; }
  return null;
}
/* tag definitions (descriptions) for the routine's scopes, loaded when descriptions are shown */
S.defsAt = {};
async function loadDefs(prog){
  const now = Date.now(), scopes = ["controller", prog].filter(x => x && !x.startsWith("AOI:"));
  if(scopes.every(sc => now - (S.defsAt[sc] || 0) < 3000)) return false;
  for(const sc of scopes){ try { const d = await api("GET", `/api/studio/tags?scope=${encodeURIComponent(sc)}`); d.tags.forEach(t => { S.tagDefs[t.address] = t; }); S.defsAt[sc] = Date.now(); } catch(e){} }
  return true;
}
const _afterRender = window.lxAfterRender;
window.lxAfterRender = function(){
  if(_afterRender) _afterRender();
  if(!lxIsLadder()) return;
  const w = lxWrap(); if(!w) return;
  if(S.showDesc && !S.defsBusy){ const prog = S.R.prog; S.defsBusy = true;
    loadDefs(prog).then(ch => { S.defsBusy = false; if(ch && S.showDesc && lxIsLadder() && !S.edit) renderLadder(); }); }
  if(S.showDesc) w.querySelectorAll(".rung[data-n] .ins[data-iid]").forEach(el => {
    const a = el.dataset.addr; if(!a || el.querySelector(".odesc")) return;
    const d = descFor(a); if(!d) return;
    const x = document.createElement("div"); x.className = "odesc" + (d.pass ? " pass" : ""); x.textContent = d.t; x.title = d.t;
    el.insertBefore(x, el.firstChild);
  });
  const h = w.querySelector(".rhead");
  if(h && S.showQuick && S.quickOn && !h.querySelector(".qmap")){
    const s = document.createElement("span"); s.className = "qmap"; s.title = "Quick keys (Tools ▸ Assign Quick Keys)";
    s.innerHTML = Object.entries(quickMap()).map(([k,v])=>`<b>${esc(k)}</b> ${esc(v)}`).join(" · ");
    h.insertBefore(s, h.querySelector(".spacer"));
  }
  if(lxEditable() && !S.edit){
    w.querySelectorAll(".rung[data-n] > .rnum").forEach(el => { el.draggable = true; el.title = (el.title ? el.title + "\n" : "") + "Drag to move the rung (Ctrl+drag copies)"; });
    w.querySelectorAll(".rung[data-n] .ins[data-iid]").forEach(el => el.draggable = true);
  }
  bmPaint();
};

/* ---------- LD-10: drag and drop of rungs and instructions; LD-11 tags onto operands ---------- */
const DT = {rungs:"text/x-vcs-rungs", ins:"text/x-vcs-ins", tag:"text/x-vcs-tag"};
function dragClear(){ document.querySelectorAll(".dropT,.dropB,.dropL,.dropR,.dropIn,.dropOp").forEach(x=>x.classList.remove("dropT","dropB","dropL","dropR","dropIn","dropOp")); }
document.addEventListener("dragstart", (e) => {
  const t = e.target; if(!t || !t.closest) return;
  if(lxIsLadder() && !S.edit && lxEditable()){
    const rn = t.closest && t.classList && t.classList.contains("rnum") && t.parentElement.dataset.n!=null ? t : null;
    if(rn){ const n = +rn.parentElement.dataset.n, L = lxSel();
      const list = L.rungs.has(n) ? lxSort(L.rungs) : [n];
      if(!L.rungs.has(n)){ L.rungs = new Set([n]); lxSetCaret(n); }
      S.drag = {kind:"rungs", list, routine: lxKey()};
      e.dataTransfer.setData(DT.rungs, JSON.stringify(list));
      e.dataTransfer.setData("text/plain", list.map(i => S.R.data.rungs[i].text).join("\n"));
      e.dataTransfer.effectAllowed = "copyMove"; return; }
    const ie = t.classList && t.classList.contains("ins") && t.dataset.iid!=null ? t : null;
    if(ie){ const n = +ie.closest(".rung[data-n]").dataset.n, iid = +ie.dataset.iid; const ins = lxInstrs(n)[iid];
      S.drag = {kind:"ins", rung:n, iid, routine: lxKey()};
      e.dataTransfer.setData(DT.ins, JSON.stringify({rung:n, iid}));
      e.dataTransfer.setData("text/plain", ins ? serialize([ins]) : "");
      e.dataTransfer.effectAllowed = "copyMove"; return; }
  }
  const row = t.closest("tr[data-addr], tr[data-w]");
  if(row && t===row){ const a = row.dataset.addr || row.dataset.w; S.drag = {kind:"tag", addr:a};
    e.dataTransfer.setData(DT.tag, a); e.dataTransfer.setData("text/plain", a.replace(/^Program:[^.]+\./, "")); e.dataTransfer.effectAllowed = "copy"; }
});
/* tag rows (tag grids, Watch) are dragged by their name cell */
document.addEventListener("mousedown", (e) => {
  const td = e.target.closest && e.target.closest("tr[data-addr] > td:first-child, tr[data-w] > td:first-child");
  if(!td || e.target.closest("input,button,select,a,[data-exp]")) return;
  td.parentElement.draggable = true;
}, true);
document.addEventListener("dragend", () => { S.drag = null; dragClear(); document.querySelectorAll("tr[draggable=true]").forEach(r => r.draggable = false); });
function rungDropIndex(e){
  const rd = e.target.closest(".rung[data-n], .endrung, .insbar"); if(!rd) return null;
  if(rd.classList.contains("endrung")) return {el:rd, at:lxCount(), cls:"dropT"};
  if(rd.classList.contains("insbar")) return {el: rd.nextElementSibling && rd.nextElementSibling.matches(".rung") ? rd.nextElementSibling : rd, at:+rd.dataset.at, cls:"dropT"};
  const r = rd.getBoundingClientRect(), top = e.clientY < r.top + r.height/2;
  return {el:rd, at: +rd.dataset.n + (top ? 0 : 1), cls: top ? "dropT" : "dropB"};
}
function insDropTarget(e){
  const ie = e.target.closest(".rung[data-n] .ins[data-iid]");
  if(ie){ const r = ie.getBoundingClientRect(), before = e.clientX < r.left + r.width/2;
    return {el:ie, rung:+ie.closest(".rung[data-n]").dataset.n, iid:+ie.dataset.iid, before, cls: before ? "dropL" : "dropR"}; }
  const line = e.target.closest(".rung[data-n] .rline"); if(line) return {el:line, rung:+line.closest(".rung[data-n]").dataset.n, iid:null, cls:"dropIn"};
  return null;
}
document.addEventListener("dragover", (e) => {
  const d = S.drag; if(!d || !e.target.closest) return;
  if(d.kind==="tag"){
    const op = e.target.closest(".rung[data-n] .ins[data-iid] [data-k], #eInstr input[data-op]");
    if(op && (op.tagName==="INPUT" || (lxIsLadder() && lxEditable() && !S.edit))){ e.preventDefault(); e.dataTransfer.dropEffect = "copy"; dragClear(); op.classList.add("dropOp"); }
    else if(e.target.closest(".tab[data-id]")) { e.preventDefault(); tabHover(e.target.closest(".tab[data-id]")); }
    return;
  }
  if(!lxIsLadder() || S.edit || d.routine!==lxKey()) return;
  const t = d.kind==="rungs" ? rungDropIndex(e) : insDropTarget(e);
  if(!t) return;
  e.preventDefault(); e.dataTransfer.dropEffect = (e.ctrlKey || e.metaKey) ? "copy" : "move";
  dragClear(); t.el.classList.add(t.cls);
});
let tabHoverT = null, tabHoverId = null;
function tabHover(tab){ if(tabHoverId===tab.dataset.id) return; tabHoverId = tab.dataset.id; clearTimeout(tabHoverT);
  tabHoverT = setTimeout(() => { if(tabHoverId && S.active!==tabHoverId) activateTab(tabHoverId); tabHoverId = null; }, 450); }
document.addEventListener("drop", async (e) => {
  const d = S.drag; if(!d || !e.target.closest) return;
  if(d.kind==="tag"){
    const inp = e.target.closest("#eInstr input[data-op]");
    const short = (a) => { const m = a.match(/^Program:([^.]+)\.(.*)$/); return m && S.R && m[1]===S.R.prog ? m[2] : a; };
    if(inp){ e.preventDefault(); dragClear(); inp.value = short(d.addr); inp.dispatchEvent(new Event("input")); scheduleValidate(0, true); inp.focus(); return; }
    const op = e.target.closest(".rung[data-n] .ins[data-iid] [data-k]");
    if(op && lxIsLadder() && lxEditable() && !S.edit){
      e.preventDefault(); dragClear();
      const ie = op.closest(".ins[data-iid]"), n = +ie.closest(".rung[data-n]").dataset.n, iid = +ie.dataset.iid, k = +op.dataset.k;
      startEdit(n, iid); const E = S.edit; if(!E) return;
      const node = instrOrder(E.tree)[iid]; if(!node) return;
      edPush(); while(node.args.length<=k) node.args.push("?"); node.args[k] = short(d.addr);
      renderEditor(); scheduleValidate(0, true);
      setTimeout(() => { const i = document.querySelector(`#eInstr input[data-op="${k}"]`); if(i) i.focus(); }, 0);
      log(`${node.name} operand ${k+1} set to ${short(d.addr)}: check and Finalize (Ctrl+Enter)`);
    }
    return;
  }
  if(!lxIsLadder() || S.edit || d.routine!==lxKey()) return;
  const copy = e.ctrlKey || e.metaKey;
  if(d.kind==="rungs"){ const t = rungDropIndex(e); if(!t) return; e.preventDefault(); dragClear(); await dropRungs(d.list, t.at, copy); }
  else { const t = insDropTarget(e); if(!t) return; e.preventDefault(); dragClear(); await dropIns(d, t, copy); }
});
document.addEventListener("keydown", (e) => { if(e.key==="Escape" && S.drag){ S.drag = null; dragClear(); } }, true);
async function runBatch(ops, msg, sel){
  try { await api("POST","/api/studio/edit/batch",{program:S.R.prog, routine:S.R.routine, ops, version:S.R.data.version});
        log(msg, "ok"); if(sel) sel(); await reloadRoutine(); }
  catch(err){ const iss = err.data && err.data.issues ? ": " + err.data.issues.map(x=>x.message).join("; ") : ""; log(`Drop refused: ${err.message}${iss}`, "err"); }
}
async function dropRungs(list, at, copy){
  const R = S.R.data.rungs, items = list.map(i => ({text: R[i].text, comment: R[i].comment || ""}));
  const L = lxSel();
  if(copy){
    const ops = items.map((x, i) => ({op:"insert", index: at+i, text:x.text, comment:x.comment}));
    return runBatch(ops, `Copied ${items.length} rung(s) to ${at}`, () => { L.rungs = new Set(ops.map(o=>o.index)); L.caret = {rung:at, iid:null, op:null}; });
  }
  const lo = list[0], hi = list[list.length-1], contiguous = hi - lo + 1 === list.length;
  if(contiguous && at>=lo && at<=hi+1){ log("Dropped in the same place: nothing changed"); return; }
  const dest = at - list.filter(i => i < at).length;
  const ops = [...list].sort((a,b)=>b-a).map(i => ({op:"delete", index:i})).concat(items.map((x, i) => ({op:"insert", index: dest+i, text:x.text, comment:x.comment})));
  return runBatch(ops, `Moved ${items.length} rung(s) to ${dest} (one undo step)`, () => { L.rungs = new Set(items.map((_, i)=>dest+i)); L.caret = {rung:dest, iid:null, op:null}; });
}
async function dropIns(d, t, copy){
  const R = S.R.data.rungs, src = R[d.rung], dst = R[t.rung];
  if(!src || !dst || src.error || dst.error) return;
  const node = instrOrder(src.tree)[d.iid]; if(!node) return;
  if(!copy && t.rung===d.rung && t.iid===d.iid){ log("Dropped in the same place: nothing changed"); return; }
  const moving = {kind:"instr", _id: nextNode++, name: node.name, args: [...node.args]};
  const same = t.rung===d.rung;
  const a = copy ? cloneTree(src.tree) : lxWithout(cloneTree(src.tree), [d.iid]);
  const b = same ? a : cloneTree(dst.tree);
  const tid = t.iid==null ? null : (same && !copy && t.iid > d.iid ? t.iid - 1 : t.iid);
  const target = tid==null ? null : instrOrder(b)[tid];
  if(target){ const g = findNode(target._id, b); g.list.splice(t.before ? g.index : g.index+1, 0, moving); }
  else if(isInputNode(moving)) b.splice(tailStart(b), 0, moving); else b.push(moving);
  const ops = [];
  const ta = serialize(a), tb = serialize(b);
  if(same){ if(ta===src.text.replace(/;\s*$/, "")){ log("Dropped in the same place: nothing changed"); return; } ops.push({op:"replace", index:d.rung, text:ta, comment:src.comment||""}); }
  else { if(!copy) ops.push({op:"replace", index:d.rung, text:ta, comment:src.comment||""}); ops.push({op:"replace", index:t.rung, text:tb, comment:dst.comment||""}); }
  return runBatch(ops, `${copy ? "Copied" : "Moved"} ${node.name} to rung ${t.rung} (one undo step)`, () => { lxSel().caret = {rung:t.rung, iid:null, op:null}; });
}

/* ---------- menus ---------- */
window.lxMenuExtra = function(kind, n, iid, k){
  const ed = lxEditable();
  if(kind==="rung") return ["-", [bmList().includes(n) ? "Remove Bookmark" : "Toggle Bookmark", ()=>bmToggle(n), false, "Ctrl+F2"],
    ["Next Bookmark", ()=>bmGo(1), false, "Shift+F2"], ["Previous Bookmark", ()=>bmGo(-1), false, "Ctrl+Shift+F2"], ["Clear All Bookmarks", bmClear, !bmList().length], ["View Bookmarks…", bmDialog],
    "-", ["Add Element…", addElementDialog, !ed, "Alt+Insert"]];
  const ins = lxInstrs(n)[iid]; if(!ins) return [];
  return [[`Edit Operand${k!=null ? ` ${k+1}` : ""} in Place`, ()=>inlineEdit(n, iid, k!=null ? k : 0), !ed || !opCount(ins), "Dbl-click"],
          ["Add Element…", addElementDialog, !ed, "Alt+Insert"]];
};

/* ---------- keys ---------- */
function logicKeys(e){
  const ctrl = e.ctrlKey || e.metaKey, k = e.key;
  if($("dlg").open || menuOpen()) return false;
  const done = () => { e.preventDefault(); return true; };
  if(e.altKey && !ctrl && k==="Insert"){ if((S.edit && !S.edit.st && !typingTarget(document.activeElement)) || lxReady() || (S.edit && !S.edit.st)){ addElementDialog(); return done(); } return false; }
  /* rung editor: branch moves and extend / shrink */
  if(S.edit && !S.edit.st && !typingTarget(document.activeElement)){
    if(e.altKey && e.shiftKey && (k==="ArrowRight" || k==="ArrowLeft")){ extendBranch(k==="ArrowRight" ? 1 : -1); return done(); }
    if(S.quickOn && !ctrl && !e.altKey && k.length===1){ const m = quickMap()[k.toLowerCase()]; if(m){ addInstr(m); return done(); } }
    return false;
  }
  if(!lxReady()) return false;
  const c = lxSel().caret;
  if(k==="F2" && ctrl && !e.altKey){ if(c.rung<lxCount()) bmToggle(c.rung); return done(); }
  if(k==="F2" && e.shiftKey && !e.altKey){ bmGo(1); return done(); }
  if(k==="F2" && ctrl && e.shiftKey){ bmGo(-1); return done(); }
  if(ctrl || e.altKey || k.length!==1 || k===" ") return false;
  if(S.quickOn){ const m = quickMap()[k.toLowerCase()]; if(m && lxEditable()){ addAtCaret(m); return done(); } return false; }
  /* LD-08: typing on a selected operand starts editing it in place */
  if(c.iid!=null && lxEditable() && /[\w:.\[\]#+\-]/.test(k)){ if(inlineEdit(c.rung, c.iid, c.op!=null ? c.op : 0, k)) return done(); }
  return false;
}
/* Enter / F2 on a selected operand edits it in place */
function inlineEnterKeys(e){
  if(!lxReady() || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return false;
  if(e.key!=="Enter" && e.key!=="F2") return false;
  const c = lxSel().caret; if(c.iid==null || c.op==null || !lxEditable()) return false;
  if(inlineEdit(c.rung, c.iid, c.op)){ e.preventDefault(); return true; }
  return false;
}
/* ctrl+F2 variants must run before the ladder's F2 = edit */
vcsKeyHooks.unshift(logicKeys, inlineEnterKeys);
window.addElementDialog = addElementDialog; window.toggleOperandDesc = toggleOperandDesc; window.toggleQuickMap = toggleQuickMap;
window.setQuickKeys = setQuickKeys; window.quickKeysDialog = quickKeysDialog;
