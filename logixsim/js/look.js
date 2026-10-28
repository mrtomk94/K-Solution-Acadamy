"use strict";
/* 0.17.0 readability (loaded after ide.js):
   - Structured Text: tighter lines, tabs four wide
   - Tag grids: drag a column header to move the column (Monitor and Edit Tags)
   - Ladder: Studio-style instruction blocks (grey body, tinted header per family, values
     in blue under the operand, output bits beside the block), operand descriptions shown by
     default and kept above the rung line, outputs anchored at the right rail at any zoom
   - Controller Organizer: shaded background, coloured icons, tree guide lines */

(function(){
  const css = document.createElement("style");
  css.id = "lookStyles";
  css.textContent = `
/* ---------- Structured Text: no wasted space between lines ---------- */
#stTa,#stHi{line-height:16px!important;tab-size:4;-moz-tab-size:4}
.stview{tab-size:4;-moz-tab-size:4}
.stgut{line-height:16px!important}

/* ---------- tag grids: movable columns ---------- */
.tagtable thead th[draggable="true"]{cursor:grab}
.tagtable thead th.coldrop-l{box-shadow:inset 3px 0 0 #0041C2}
.tagtable thead th.coldrop-r{box-shadow:inset -3px 0 0 #0041C2}
.tagtable thead th.coldrag{opacity:.45}

/* ---------- ladder: instruction blocks ---------- */
.ladder .box{--bh:#E4E4E4;position:relative;background:#F4F4F4!important;border:1px solid #7F7F7F!important;border-radius:0!important;
  min-width:150px;font-family:"Segoe UI",Tahoma,Arial,sans-serif!important;font-size:11px;margin:0!important}
.ladder .box[data-fam="cmp"]{--bh:#D7E5F7}
.ladder .box[data-fam="math"]{--bh:#DCEED3}
.ladder .box[data-fam="move"]{--bh:#E6E0F2}
.ladder .box[data-fam="tmr"]{--bh:#F8E6C6}
.ladder .box[data-fam="prog"]{--bh:#E9E9E9}
.ladder .box .bt{background:var(--bh)!important;border-bottom:1px solid #A6A6A6!important;justify-content:flex-start!important;
  gap:8px;padding:1px 6px!important;font-weight:700!important;font-size:11px!important;line-height:15px;color:#000}
.ladder .box .bt .btt{display:none!important;font-weight:400;color:#404040;font-size:10.5px}
.ladder .box[data-out="1"] .bt .btt{display:inline!important}
.ladder .box .br{display:grid!important;grid-template-columns:auto minmax(0,1fr)!important;gap:0 10px!important;padding:1px 6px!important;line-height:14px!important;align-items:baseline}
.ladder .box .br>span:first-child{color:#5A5A5A!important;font-size:11px;font-family:"Segoe UI",Tahoma,Arial,sans-serif!important}
.ladder .box .br>span:nth-child(2){color:#000;font-weight:400!important;font-family:Consolas,"Courier New",monospace;font-size:12px;text-align:right;max-width:240px}
.ladder .box .br>.lv{grid-column:2;justify-self:end;color:#0000D0!important;font-family:Consolas,"Courier New",monospace;font-size:11.5px;min-height:14px}
.ladder .box .br>.lv:not(:empty)::after{content:" \\2190";font-family:"Segoe UI",Arial,sans-serif;font-weight:700}
.ladder .box .br>.lv[data-a=""]{display:none}
.ladder .ins.on .box{border:2px solid #00C000!important;margin:-1px!important}
.ladder .ins.on .box .bt{background:linear-gradient(var(--bh),var(--bh)),#C9F2C9!important}
/* output bits (EN, DN, …) beside the block on the right, as Logix Designer shows them */
.ladder .box .bits{position:absolute;left:100%;top:4px;display:flex!important;flex-direction:column;gap:3px;padding:0!important;border:none!important;background:transparent}
.ladder .box .bit{background:transparent!important;border:none!important;color:#000!important;font-family:Consolas,"Courier New",monospace;font-size:10.5px;
  line-height:13px;padding:0 0 0 12px!important;position:relative;white-space:nowrap}
.ladder .box .bit::before{content:"";position:absolute;left:0;top:6px;width:10px;border-top:1px solid #000}
.ladder .box .bit.on{color:#008000!important;font-weight:700}
.ladder .box .bit.on::before{border-top:2px solid #00C000}
.ladder .ins:has(.bits){padding-right:44px!important}
/* operand descriptions above the instruction (View ▸ Show Operand Descriptions): in the
   room the rung keeps above its tag names (--dh), so the rung line stays straight */
.ladder .ins>.odesc{position:absolute!important;left:-6px;right:-6px;top:2px;height:var(--dh,0px);max-width:none!important;margin:0!important;
  display:flex!important;align-items:flex-end;justify-content:center;-webkit-line-clamp:unset!important;
  text-align:center;color:#5F5F5F!important;font-family:"Segoe UI",Tahoma,Arial,sans-serif;font-size:10px!important;line-height:11px!important;overflow:hidden;pointer-events:none;white-space:normal}
.ladder .ins:has(>.box)>.odesc{top:calc(var(--H) - 14px - var(--dh,0px))}

/* ---------- outputs stay against the right rail at any zoom ---------- */
.ladder .rline:not(.eline)>.series{min-width:var(--rlmin, 100%)!important}

/* ---------- Controller Organizer: contrast and hierarchy ---------- */
#org{background:#E9EEF5!important}
#org .orghead,#org h3,#org .phead{background:#D5DEEA}
#org .tree{--tl:#9AA6B6}
#org ul.tree ul.tree{border-left:1px dotted var(--tl)!important;margin-left:13px}
#org .node{border-radius:0!important;border:1px solid transparent}
#org .node:hover{background:#D9E4F2!important}
#org .node.sel{background:#C3D7F0!important;border-color:#7DA2CE;box-shadow:none!important}
#org .node.grp{background:linear-gradient(#DCE4EE,#D2DCE8);border-top:1px solid #C3CDDA;border-bottom:1px solid #C3CDDA;margin-top:2px}
#org .node.grp>.lbl{color:#1F2D3D}
#org .node .lbl{color:#101820}
#org .node .desc{color:#4A5563}
#org .twist{display:inline-flex;align-items:center;justify-content:center;width:11px;height:11px;border:1px solid #8C98A8;background:#FFFFFF;font-size:8px;line-height:9px;color:#33404F;flex:none}
#org .twist:empty{border-color:transparent;background:transparent}
#org .ico{border-radius:2px!important;color:#FFFFFF!important;border:none!important;font-size:8.5px;font-weight:800;height:15px;line-height:15px}
#org .ico.k-ctrl{background:#2F4D7E!important}#org .ico.k-tags{background:#A86E12!important}#org .ico.k-task{background:#13817A!important}
#org .ico.k-prog{background:#6A4AA6!important}#org .ico.k-ld{background:#2C8A4B!important}#org .ico.k-st{background:#2F6FB5!important}
#org .ico.k-fbd,#org .ico.k-sfc{background:#7D8794!important}#org .ico.k-dt{background:#5B6B80!important}#org .ico.k-aoi{background:#B85C1C!important}
#org .ico.k-io{background:#4B5563!important}
#org .ico.k-folder{background:transparent!important;width:16px;min-width:16px;font-size:0!important;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='14' viewBox='0 0 16 14'%3E%3Cpath d='M1 2.5h5l1.5 1.5H15v8.5H1z' fill='%23F2C94C' stroke='%23B8892A'/%3E%3Cpath d='M1 5.5h14' stroke='%23D9A93A'/%3E%3C/svg%3E")!important;
  background-repeat:no-repeat!important;background-position:center!important}
#org .badge{background:#FFFFFF;border-color:#A8B3C2}
`;
  document.head.appendChild(css);
})();

/* ======================================================================
   Tag grids: drag a header to move its column
   ====================================================================== */
(function(){
  const KEY = {mon:"ColOrder", edit:"EditColOrder"};
  const read = (k) => { try { const v = JSON.parse(lsGet(k) || "null"); return Array.isArray(v) ? v : null; } catch(e){ return null; } };
  /* Monitor Tags: the column model (COLS) is reordered, so header and rows follow */
  function orderCols(){
    const o = read(KEY.mon); if(!o || typeof COLS==="undefined") return;
    const pos = (k) => { const i = o.indexOf(k); return i < 0 ? 1e3 + COLS.findIndex(c => c.k===k) : i; };
    COLS.sort((a, b) => pos(a.k) - pos(b.k));
  }
  orderCols();
  /* Edit Tags: the cells of each row are put in the saved order */
  const ekey = (th, i) => th.dataset.sort || (th.textContent.trim() ? th.textContent.trim() : "_" + i);
  function editKeys(table){ return [...table.tHead.rows[0].cells].map(ekey); }
  function applyEdit(table){
    const o = read(KEY.edit); if(!o || !table.tHead) return;
    const keys = editKeys(table);
    const want = [...keys].sort((a, b) => { const ia = o.indexOf(a), ib = o.indexOf(b); return (ia < 0 ? 1e3 + keys.indexOf(a) : ia) - (ib < 0 ? 1e3 + keys.indexOf(b) : ib); });
    if(want.join("|")===keys.join("|") && !table.querySelector("tbody tr:not([data-co])")) return;
    const perm = want.map(k => keys.indexOf(k));
    const fix = (tr) => {
      if(tr.dataset.co===want.join("|")) return;
      const cells = [...tr.children]; if(cells.length!==perm.length || cells.some(c => c.colSpan > 1)) { tr.dataset.co = want.join("|"); return; }
      const cur = tr.dataset.co ? tr.dataset.co.split("|") : keys;
      const byKey = new Map(cur.map((k, i) => [k, cells[i]]));
      want.forEach(k => { const c = byKey.get(k); if(c) tr.appendChild(c); });
      tr.dataset.co = want.join("|");
    };
    [...table.tHead.rows, ...table.tBodies[0] ? table.tBodies[0].rows : []].forEach(fix);
  }
  function watchEdit(){
    document.querySelectorAll("#doc table.tagtable.etag").forEach(t => {
      applyEdit(t);
      if(t._coObs || !t.tBodies[0]) return;
      t._coObs = new MutationObserver(() => applyEdit(t));
      t._coObs.observe(t.tBodies[0], {childList:true});
    });
  }
  function headers(){
    document.querySelectorAll("#doc table.tagtable thead th").forEach(th => { if(!th.draggable) th.draggable = true; });
    watchEdit();
  }
  new MutationObserver(() => headers()).observe(document.getElementById("doc"), {childList:true, subtree:true});
  let drag = null;
  document.addEventListener("dragstart", (e) => {
    const th = e.target.closest && e.target.closest("#doc table.tagtable thead th"); if(!th) return;
    const table = th.closest("table"), edit = table.classList.contains("etag");
    const cells = [...th.parentElement.cells];
    drag = {table, edit, key: edit ? (th.closest("tr").dataset.co ? th.closest("tr").dataset.co.split("|")[cells.indexOf(th)] : ekey(th, cells.indexOf(th))) : th.dataset.col, th};
    th.classList.add("coldrag");
    e.dataTransfer.setData("text/x-vcs-col", drag.key); e.dataTransfer.effectAllowed = "move";
  });
  const clearMarks = () => document.querySelectorAll(".coldrop-l,.coldrop-r").forEach(x => x.classList.remove("coldrop-l", "coldrop-r"));
  document.addEventListener("dragover", (e) => {
    if(!drag) return;
    const th = e.target.closest && e.target.closest("thead th"); clearMarks();
    if(!th || th.closest("table")!==drag.table || th===drag.th) return;
    e.preventDefault(); e.dataTransfer.dropEffect = "move";
    const r = th.getBoundingClientRect(); th.classList.add(e.clientX < r.left + r.width / 2 ? "coldrop-l" : "coldrop-r");
  });
  document.addEventListener("dragend", () => { if(drag && drag.th) drag.th.classList.remove("coldrag"); drag = null; clearMarks(); });
  document.addEventListener("drop", (e) => {
    if(!drag) return;
    const th = e.target.closest && e.target.closest("thead th"); const d = drag; clearMarks();
    if(!th || th.closest("table")!==d.table || th===d.th) return;
    e.preventDefault();
    const r = th.getBoundingClientRect(), after = e.clientX >= r.left + r.width / 2;
    if(d.edit){
      const tr = th.closest("tr"), cur = tr.dataset.co ? tr.dataset.co.split("|") : editKeys(d.table);
      const tk = cur[[...tr.cells].indexOf(th)];
      const o = cur.filter(k => k!==d.key); o.splice(o.indexOf(tk) + (after ? 1 : 0), 0, d.key);
      lsSet(KEY.edit, JSON.stringify(o)); applyEdit(d.table);
      log(`Edit Tags: column moved (${o.filter(k => !k.startsWith("_")).join(", ")})`);
    } else {
      const all = COLS.map(c => c.k), tk = th.dataset.col;
      const o = all.filter(k => k!==d.key); o.splice(o.indexOf(tk) + (after ? 1 : 0), 0, d.key);
      lsSet(KEY.mon, JSON.stringify(o)); orderCols();
      const sc = document.querySelector("#doc").scrollTop;
      renderDoc(); setTimeout(() => { const doc = $("doc"); if(doc) doc.scrollTop = sc; }, 300);
      log(`Tags: column ${d.key} moved`);
    }
    drag = null;
  });
  window.resetColumnOrder = () => { lsSet(KEY.mon, "null"); lsSet(KEY.edit, "null"); location.reload(); };
})();

/* ======================================================================
   Ladder: block families, operand descriptions
   ====================================================================== */
function lookFamily(sp){
  const f = String(sp && sp.family || "").toLowerCase();
  if(f.includes("compare")) return "cmp";
  if(f.includes("math") || f.includes("compute")) return "math";
  if(f.includes("move") || f.includes("logical") || f.includes("array") || f.includes("shift") || f.includes("ascii")) return "move";
  if(f.includes("timer") || f.includes("counter") || f.includes("sequencer")) return "tmr";
  return "prog";
}
function lookBlocks(root){
  (root || document).querySelectorAll(".ladder .box:not([data-fam])").forEach(b => {
    const n = (b.querySelector(".bt span") || {}).textContent || "", sp = spec(n.trim());
    b.dataset.fam = lookFamily(sp);
    b.dataset.out = sp && !sp.input ? "1" : "0";
  });
}
/* Studio shows operand descriptions by default; the View menu switches them off */
if(lsGet("ShowDesc")===null) S.showDesc = true;
function lookDescriptions(){
  const lad = document.querySelector("#doc .ladder"); if(!lad) return;
  lad.querySelectorAll(":scope > .rung[data-n]").forEach(rd => {
    let n = 0;
    rd.querySelectorAll(".ins > .odesc").forEach(d => {
      const el = d.parentElement, isBox = !!el.querySelector(":scope > .box");
      const perLine = isBox ? 30 : Math.max(14, ((el.querySelector(".tagn") || {}).textContent || "").length + 4);
      n = Math.max(n, Math.min(3, Math.ceil(d.textContent.trim().length / perLine)));
    });
    const v = n ? (n * 11 + 4) + "px" : "";
    if(rd.style.getPropertyValue("--dh")!==v){ if(v) rd.style.setProperty("--dh", v); else rd.style.removeProperty("--dh"); }
  });
}
/* member descriptions (a UDT member's own description, as Logix Designer passes it through)
   come from /api/studio/describe; the routine is drawn again once they have arrived */
S.descCache = new Map();
(function(){
  const _d = descFor;
  descFor = function(addr){
    const c = S.descCache.get(addr);
    if(c && c.t) return c;
    return _d(addr);
  };
})();
async function lookFetchDescriptions(){
  const lad = document.querySelector("#doc .ladder"); if(!lad || !S.showDesc || S.descBusy) return;
  const need = [...new Set([...lad.querySelectorAll(":scope > .rung[data-n] .ins[data-addr]")].map(x => x.dataset.addr).filter(a => a && !S.descCache.has(a)))];
  if(!need.length) return;
  S.descBusy = true;
  let found = false;
  try { const r = await api("POST", "/api/studio/describe", {addresses: need.slice(0, 2000)});
        need.slice(0, 2000).forEach(a => { const v = (r.items || {})[a] || {}; const t = v.description || "";
          S.descCache.set(a, {t, pass: v.from!=="tag"}); if(t && !lad.querySelector(`.ins[data-addr="${CSS.escape(a)}"] > .odesc`)) found = true; }); }
  catch(e){ need.forEach(a => S.descCache.set(a, {t:""})); }
  S.descBusy = false;
  if(found && document.querySelector("#doc .ladder")===lad && !S.edit && lxIsLadder()) renderLadder();
}
(function(){
  const _rp = refreshProject; refreshProject = async function(){ S.descCache.clear(); return _rp.apply(this, arguments); };
  const _a = window.lxAfterRender;
  window.lxAfterRender = function(){ if(_a) _a(); lookBlocks(); lookDescriptions(); lookFetchDescriptions(); };
  const _re = renderEditor; renderEditor = function(){ const r = _re.apply(this, arguments); lookBlocks(document.getElementById("erung")); return r; };
})();
