"use strict";
/* Tag views (gap report 5.5, OW-02): Monitor Tags and Edit Tags as grids that work like
   the Data Monitor / Tag Editor — value commit with Enter / Tab / arrows (Esc reverts),
   display Style (radix), integer bits, expand all members, filters (name / description /
   both, data type, scope), column show / hide, multi-select with Copy / Paste / Delete,
   in-cell editing, a complete row menu, Force Mask entry, and an editable Watch list. */

(function(){
const css = document.createElement("style");
css.textContent = `
.tagtools select{max-width:170px}
.tagtable td.sty select{font-size:11px;padding:0 2px}
.tagtable td.ro{color:var(--mut);background:color-mix(in srgb,var(--pane2) 60%,transparent)}
.tagtable td.ed{cursor:text}.tagtable td.ed:hover{outline:1px dashed var(--line)}
.tagtable td .cell-ed{width:100%;font:inherit;font-family:var(--mono)}
.fmask{width:80px;font-family:var(--mono)}
.bitrow td:first-child{color:var(--mut)}
tr.msel td{background:color-mix(in srgb,var(--acc) 14%,transparent)}
.wadd{display:flex;gap:6px;margin-bottom:4px;font-family:system-ui}.wadd input{flex:1;max-width:320px}
.wtab td input{width:110px;font-family:var(--mono)}`;
document.head.appendChild(css);
})();

const INT_W = {SINT:8, INT:16, DINT:32, LINT:64};
S.tagStyle = {};                 // Monitor (session) style per base tag
S.addrType = {};                 // address -> data type (members, from the server)
S.tagView = {};                  // per scope: filter, field, type, sort, open...
S.hideCols = new Set(JSON.parse(lsGet("HideCols") || "[]"));

/* ---------- values, styles, literals ---------- */
function rootOf(addr){ const m = /^(Program:[^.]+\.)?[^.\[]+/.exec(addr||""); return m ? m[0] : addr; }
function typeOfAddr(addr){
  if(S.addrType[addr]) return S.addrType[addr];
  const d = S.tagDefs[addr]; if(d && !(d.dims && d.dims.length) && !d.dim) return d.type;
  if(d && (d.dims && d.dims.length || d.dim)) return null;
  const v = S.values[addr];
  if(typeof v==="boolean") return "BOOL";
  if(typeof v==="number") return Number.isInteger(v) ? null : "REAL";
  return null;
}
function styleOf(addr){ const r = rootOf(addr); if(S.tagStyle[r]) return S.tagStyle[r]; const d = S.tagDefs[r]; return (d && d.style) || ""; }
function bitWidth(addr){ return INT_W[typeOfAddr(addr)] || 32; }
function group4(s){ return s.replace(/\B(?=(.{4})+$)/g, "_"); }
function fmtS(addr, v){
  if(typeof v!=="number" || !addr) return fmt(v);
  const st = styleOf(addr);
  if(!st || st==="Decimal" || st==="Float") return fmt(v);
  if(st==="Exponential") return Number(v).toExponential(8);
  if(!Number.isInteger(v)) return fmt(v);
  const w = bitWidth(addr);
  const u = (BigInt(v) & ((1n << BigInt(w)) - 1n));
  if(st==="Hex") return "16#" + group4(u.toString(16).padStart(w/4, "0"));
  if(st==="Binary") return "2#" + group4(u.toString(2).padStart(w, "0"));
  if(st==="Octal") return "8#" + u.toString(8);
  if(st==="ASCII"){ let out = ""; for(let i=w/8-1; i>=0; i--){ const c = Number((u >> BigInt(i*8)) & 255n);
      out += c>=32 && c<127 && c!==36 && c!==39 ? String.fromCharCode(c) : "$" + c.toString(16).toUpperCase().padStart(2, "0"); }
    return "'" + out + "'"; }
  return fmt(v);
}
/* a Logix literal typed into a value cell: 12, -3, 1.5e3, 16#FF, 2#1010_0101, 8#17, 'AB' */
function parseLogix(text, addr){
  const t = String(text).trim().replace(/_/g, "");
  let m = /^([+-]?)(2|8|16)#([0-9a-f]+)$/i.exec(t);
  if(m){ let n = BigInt(parseInt(m[2],10)===16 ? "0x"+m[3] : m[2]==="8" ? "0o"+m[3] : "0b"+m[3]);
    const w = BigInt(bitWidth(addr)); n &= (1n<<w)-1n; if(n >= (1n<<(w-1n))) n -= (1n<<w);
    return Number(m[1]==="-" ? -n : n); }
  m = /^'(.*)'$/.exec(String(text).trim());
  if(m){ let n = 0n; const s = m[1].replace(/\$([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
    for(const ch of s) n = (n << 8n) | BigInt(ch.charCodeAt(0) & 255);
    const w = BigInt(bitWidth(addr)); n &= (1n<<w)-1n; if(n >= (1n<<(w-1n))) n -= (1n<<w); return Number(n); }
  if(t==="") return NaN;
  return Number(t);
}
/* value of an address, also a bit of an integer (W.3) */
function val2(addr){
  if(addr in S.values) return S.values[addr];
  const m = /^(.*)\.(\d+)$/.exec(addr||""); if(!m) return undefined;
  const p = S.values[m[1]]; if(typeof p!=="number" || !Number.isInteger(p)) return undefined;
  return Number((BigInt(p) >> BigInt(+m[2])) & 1n)===1;
}
/* writes: literals in the tag's style, bits of integers */
write = async function(addr, raw){
  let v = raw; const cur = val2(addr);
  if(typeof cur==="number"){ v = parseLogix(raw, addr); if(isNaN(v)){ log(`${addr}: not a number (${raw})`, "err"); return false; } }
  if(typeof cur==="boolean" && typeof v!=="boolean"){ const s = String(v).trim(); v = s==="1" || /^true$/i.test(s); }
  const r = await req({op: isForced(addr) ? "force" : "write", values:{[addr]:v}});
  if(!r.ok) log(Object.entries(r.errors||{}).map(([k,e])=>`${k}: ${e}`).join("; ") || r.error, "err"); else log(`${addr} := ${fmtS(addr, v)}`);
  if(isForced(addr)) await refreshForces();
  return !!r.ok;
};
toggle = async function(addr){ const v = val2(addr); if(typeof v!=="boolean"){ log(`${addr} is not a BOOL`, "wrn"); return; } await write(addr, !v); };
toggleSelected = async function(){
  const a = S.sel;
  if(!a){ log("Ctrl+T: select a BOOL tag or a contact/coil first", "wrn"); return; }
  const v = val2(a);
  if(v===undefined){ log(`Ctrl+T: ${a} is a structure or array — select one of its BOOL members`, "wrn"); return; }
  if(typeof v!=="boolean"){ log(`Ctrl+T: ${a} is not a BOOL (value ${fmtS(a, v)}); type a new value instead`, "wrn"); return; }
  const def = findDef(a);
  if(def && def.constant && !(await confirmConstant(a, !v))) return;
  const ok = await write(a, !v);
  if(ok!==false) document.querySelectorAll(`tr[data-addr="${CSS.escape(a)}"], .ins[data-addr="${CSS.escape(a)}"]`).forEach(el => { el.classList.remove("toggled"); void el.offsetWidth; el.classList.add("toggled"); });
};
async function learnTypes(addrs){
  const want = addrs.filter(a => !(a in S.addrType)); if(!want.length) return;
  want.forEach(a => S.addrType[a] = S.addrType[a] || null);
  try { const r = await api("POST","/api/studio/types",{addresses: want}); Object.assign(S.addrType, r.types||{}); } catch(e){}
}

/* ---------- columns ---------- */
const COLS = [
  {k:"name", label:"Name", sort:true, fixed:true, w:"24%"},
  {k:"value", label:"Value", fixed:true, w:"15%"},
  {k:"force", label:"Force Mask", extra:true},
  {k:"style", label:"Style", w:"8%"},
  {k:"description", label:"Description", sort:true},
  {k:"type", label:"Data Type", sort:true, w:"13%"},
  {k:"alias", label:"Alias For", sort:true, extra:true},
  {k:"access", label:"External Access", sort:true, extra:true},
  {k:"constant", label:"Constant", sort:true, extra:true},
  {k:"units", label:"Units", sort:true, extra:true},
  {k:"address", label:"Address", sort:true, extra:true}];
function visCols(){ return COLS.filter(c => (c.fixed || !S.hideCols.has(c.k)) && (!c.extra || S.moreCols)); }
function colMenu(e, rerender){
  showMenu(e, COLS.filter(c=>!c.fixed).map(c => [`${S.hideCols.has(c.k)?"  ":"✔ "}${c.label}${c.extra?" (more)":""}`, () => {
    S.hideCols.has(c.k) ? S.hideCols.delete(c.k) : S.hideCols.add(c.k);
    if(c.extra && !S.hideCols.has(c.k) && !S.moreCols){ S.moreCols = true; lsSet("MoreCols", "1"); }
    lsSet("HideCols", JSON.stringify([...S.hideCols])); rerender(); }]));
}

/* ---------- Monitor Tags ---------- */
function tagView(scope){ return S.tagView[scope] || (S.tagView[scope] = {filter:"", field:"both", type:"", sort:"name", dir:1, open:new Set(), limit:{}, sel:new Set(), anchor:null}); }
function scopeSelect(scope){
  return `<select id="tscope" title="Scope">${[["controller", `Controller: ${S.project ? S.project.controller.name : ""}`], ...allPrograms().map(p=>[p, `Program: ${p}`])]
    .map(([v,l])=>`<option value="${esc(v)}" ${v===scope?"selected":""}>${esc(l)}</option>`).join("")}</select>`;
}
openTags = function(scope, filter, mode){
  const id = "tags:"+scope;
  if(mode) S.tagMode[scope] = mode;
  const V = tagView(scope);
  if(filter!=null && filter!==undefined) V.filter = filter || "";
  if(S.active===id && mode){ renderDoc(); return; }
  openTab(id, scope==="controller" ? "Controller Tags" : `Program Tags - ${scope}`, async (doc) => {
    if(S.tagMode[scope]==="edit") return editTags(doc, scope);
    const d = await api("GET", `/api/studio/tags?scope=${encodeURIComponent(scope)}`);
    if(scope!=="controller") S.progTags[scope] = new Set(d.tags.map(t=>t.name));
    d.tags.forEach(t => { S.tagDefs[t.address] = t; });
    const st = {defs:d.tags, cells:new Map(), bits:new Map(), needDesc:new Set(), forceCells:new Map()};
    const types = [...new Set(d.tags.map(t=>t.alias_for ? null : t.type).filter(Boolean))].sort();
    const arrow = (k) => V.sort===k ? (V.dir>0?" ▲":" ▼") : "";
    const head = () => `<tr>${visCols().map(c=>`<th class="${c.sort?"sort":""}" data-sort="${c.k}" data-col="${c.k}" ${c.w?`style="width:${c.w}"`:""}>${c.label}${c.sort?arrow(c.k):""}</th>`).join("")}</tr>`;
    doc.innerHTML = `<div class="tagtools">${tagModeSwitch(scope, "monitor")}${scopeSelect(scope)}
      <select id="tfield" title="Filter on"><option value="both">Name + Description</option><option value="name">Name</option><option value="desc">Description</option></select>
      <input id="tfilter" placeholder="Filter…" value="${esc(V.filter)}">
      <select id="tshow" title="Show only this data type"><option value="">All types</option>${types.map(t=>`<option ${t===V.type?"selected":""}>${esc(t)}</option>`).join("")}</select>
      <span class="dim" id="tcount"></span>
      <span class="dim">Ctrl+T toggles · Enter / Tab writes · Esc reverts · Ctrl + expands all</span>
      <button id="tcols" class="colbtn" title="Right-click a column header to show or hide single columns">${S.moreCols?"Hide Extra Columns":"Show More Columns"}</button></div>
      <table class="tagtable"><thead id="thead">${head()}</thead><tbody id="tbody"></tbody></table>`;
    $("tfield").value = V.field;
    $("tfilter").oninput = (e) => { V.filter = e.target.value; draw(); };
    $("tfield").onchange = (e) => { V.field = e.target.value; draw(); };
    $("tshow").onchange = (e) => { V.type = e.target.value; draw(); };
    $("tscope").onchange = (e) => openTags(e.target.value, null, "monitor");
    bindTagModeSwitch(scope);
    $("tcols").onclick = () => { S.moreCols = !S.moreCols; lsSet("MoreCols", S.moreCols?"1":"0"); $("tcols").textContent = S.moreCols?"Hide Extra Columns":"Show More Columns"; $("thead").innerHTML = head(); draw(); };
    window.setTagTypeFilter = (t) => { V.type = t; const s = $("tshow"); if(s){ if(![...s.options].some(o=>o.value===t)) s.insertAdjacentHTML("beforeend", `<option>${esc(t)}</option>`); s.value = t; } draw(); };

    const isInt = (addr) => { const t = typeOfAddr(addr); return !!INT_W[t]; };
    function kids(addr){
      const v = S.values[addr];
      if(typeof v==="number" && Number.isInteger(v)){ if(!isInt(addr)) return []; const w = bitWidth(addr); return Array.from({length:w}, (_, i) => `${addr}.${i}`); }
      return addr in S.values ? [] : kidsOf(addr);
    }
    function cell(c, addr, label, depth, def, cst){
      const leaf = addr in S.values, bit = !leaf && val2(addr)!==undefined, v = leaf ? S.values[addr] : val2(addr);
      const forced = isForced(addr);
      switch(c.k){
        case "name": {
          const ks = (leaf && typeof v==="number" && Number.isInteger(v) && !isInt(addr)) ? [] : (bit ? [] : kids(addr));
          const canExp = ks.length || (leaf && typeof v==="number" && Number.isInteger(v) && typeOfAddr(addr)==null);
          const exp = canExp ? `<span class="exp" data-exp="${esc(addr)}">${V.open.has(addr)?"−":"+"}</span>` : `<span class="exp"></span>`;
          return `<td style="padding-left:${8+depth*16}px" title="${esc(addr)}">${exp}${esc(label)}</td>`; }
        case "value": {
          if(!leaf && !bit){ const n = kidsOf(addr).length; return `<td class="v"><span class="dim" title="${n} elements / members — expand with +">{…}</span></td>`; }
          const ca = cst ? ` data-const="1"` : "";
          let h;
          if(typeof v==="boolean") h = `<button class="boolbtn ${v?"on":""}" data-tog="${esc(addr)}"${ca} title="${cst?"constant tag — changing it asks for confirmation":"click or Ctrl+T to toggle"}">${v?1:0}</button>`;
          else if(typeof v==="string") h = `<input class="numin strin" data-set="${esc(addr)}"${ca} value="${esc(v)}" title="${esc(v)}">`;
          else h = `<input class="numin" data-set="${esc(addr)}"${ca} value="${esc(fmtS(addr, v))}">`;
          if(cst) h += `<span class="cst" title="Constant tag: logic cannot change it; changes here are confirmed and logged">🔒</span>`;
          return `<td class="v">${h}</td>`; }
        case "force": {
          if(!leaf && !bit) return `<td class="dim">${forced?"Forced":""}</td>`;
          const fv = S.forces[addr];
          const shown = fv===undefined ? "" : typeof fv==="boolean" ? (fv?"1":"0") : fmtS(addr, fv);
          return `<td><input class="fmask" data-force="${esc(addr)}" value="${esc(shown)}" placeholder="${forced?"forced":"."}" title="Type a value + Enter to force; empty or space + Enter removes the force"></td>`; }
        case "style": {
          if(!def || def.alias_for) return `<td class="dim sty">${esc(styleOf(addr)||"")}</td>`;
          const opts = (def.type==="REAL" ? ["Float","Exponential"] : INT_W[def.type] ? ["Decimal","Hex","Binary","Octal","ASCII"] : []);
          if(!opts.length || (def.dims&&def.dims.length) || def.dim) return `<td class="dim sty">${opts.length?esc(styleOf(addr)||opts[0]):""}</td>`;
          const cur = styleOf(addr) || opts[0];
          return `<td class="sty"><select data-style="${esc(addr)}" title="Display style for this session (set it in Edit Tags to save it)">${opts.map(o=>`<option ${o===cur?"selected":""}>${o}</option>`).join("")}</select></td>`; }
        case "description": {
          let desc = def ? def.description || "" : "", pass = false;
          if(!def && !bit){ const pd = S.passDesc[addr]; if(pd===undefined) st.needDesc.add(addr); else { desc = pd; pass = true; } }
          return `<td class="desc dim ${pass?"pass":""}" title="${esc(desc)}${pass?" (pass-through description)":""}">${esc(desc)}</td>`; }
        case "type": {
          const typ = def ? def.type + (def.dims&&def.dims.length ? `[${def.dims.join(",")}]` : (def.dim?`[${def.dim}]`:"")) : (bit ? "BOOL" : (typeOfAddr(addr) || (typeof v==="number" ? (Number.isInteger(v)?"":"REAL") : typeof v==="string"?"STRING":"")));
          return `<td class="typ dim">${esc(typ)}</td>`; }
        case "alias": return `<td class="dim">${esc(def&&def.alias_for||"")}</td>`;
        case "access": return `<td class="dim">${esc(def?({rw:"Read/Write",ro:"Read Only",none:"None"}[def.access]||def.access||""):"")}</td>`;
        case "constant": return `<td class="dim">${def&&def.constant?"✔":""}</td>`;
        case "units": return `<td class="dim">${esc(def&&def.units||"")}</td>`;
        case "address": return `<td class="dim typ">${esc(addr)}</td>`;
      }
      return "<td></td>";
    }
    function row(addr, label, depth, def, cst){
      cst = !!(cst || (def && def.constant));
      const bit = !(addr in S.values) && val2(addr)!==undefined;
      let html = `<tr data-addr="${esc(addr)}" class="${isForced(addr)?"forced":""} ${S.sel===addr?"sel":""} ${V.sel.has(addr)?"msel":""} ${bit?"bitrow":""}">${visCols().map(c => cell(c, addr, label, depth, def, cst)).join("")}</tr>`;
      if(V.open.has(addr)){
        const ks = kids(addr), lim = V.limit[addr] || KID_PAGE;
        ks.slice(0, lim).forEach(k => { html += row(k, k.slice(addr.length).replace(/^\./,""), depth+1, null, cst); });
        if(ks.length > lim) html += `<tr class="more"><td colspan="${visCols().length}" style="padding-left:${24+depth*16}px"><a href="#" data-more="${esc(addr)}">Show ${Math.min(KID_PAGE, ks.length-lim)} more of ${ks.length-lim} remaining…</a></td></tr>`;
      }
      return html;
    }
    const sortKey = (t, k) => k==="name" ? t.name.toLowerCase() : k==="type" ? t.type : k==="description" ? (t.description||"").toLowerCase()
                            : k==="force" ? (isForced(t.address)?0:1) : k==="alias" ? (t.alias_for||"") : k==="address" ? t.address : k==="constant" ? (t.constant?0:1) : String(t[k]||"");
    function rowsOf(){
      const f = V.filter.toLowerCase();
      return st.defs.filter(t => (!f || (V.field!=="desc" && t.name.toLowerCase().includes(f)) || (V.field!=="name" && (t.description||"").toLowerCase().includes(f)))
                              && (!V.type || t.type===V.type))
                    .sort((a,b) => { const x = sortKey(a, V.sort), y = sortKey(b, V.sort); return (x<y?-1:x>y?1:0) * V.dir; });
    }
    function draw(){
      const defs = rowsOf();
      $("tcount").textContent = `${defs.length} tags`;
      const body = $("tbody"); if(!body) return;
      body.innerHTML = defs.map(t => row(t.alias_for ? t.alias_for_address || t.address : t.address, t.name, 0, t)).join("");
      st.cells = new Map(); st.bits = new Map(); st.forceCells = new Map();
      body.querySelectorAll("[data-set],[data-tog]").forEach(el => {
        const a = el.dataset.set || el.dataset.tog; st.cells.set(a, el);
        const m = /^(.*)\.(\d+)$/.exec(a); if(m && !(a in S.values)){ if(!st.bits.has(m[1])) st.bits.set(m[1], []); st.bits.get(m[1]).push(a); } });
      body.querySelectorAll("[data-force]").forEach(el => st.forceCells.set(el.dataset.force, el));
      st.keyVer = S.keyVer;
      if(st.needDesc.size){
        const want = [...st.needDesc]; st.needDesc = new Set();
        want.forEach(a => S.passDesc[a] = "");
        api("POST", "/api/studio/passthrough", {addresses: want}).then(r => {
          let any = false; for(const [a, t] of Object.entries(r.descriptions||{})){ S.passDesc[a] = t; if(t) any = true; }
          if(any && $("tbody")) draw(); }).catch(()=>{});
      }
    }
    st.draw = draw;
    function update(chg){
      const ae = document.activeElement, editing = ae && ae.dataset && (ae.dataset.set || ae.dataset.force) && $("tbody") && $("tbody").contains(ae);
      if(chg==="all" || S.keyVer!==st.keyVer){ if(editing){ st.redraw = true; return; } return draw(); }
      if(st.redraw && !editing){ st.redraw = false; return draw(); }
      for(const k of chg){
        const els = [k, ...(st.bits.get(k)||[])];
        for(const a of els){
          const el = st.cells.get(a); if(!el || el===ae) continue;
          const v = val2(a);
          if(el.dataset.tog!==undefined){ el.classList.toggle("on", !!v); el.textContent = v ? 1 : 0; }
          else { const t = typeof v==="string" ? v : fmtS(a, v); if(el.value!==t) el.value = t; }
        }
      }
    }
    doc.onclick = (e) => {
      const th = e.target.closest("th.sort"); if(th){ const k = th.dataset.sort; V.dir = V.sort===k ? -V.dir : 1; V.sort = k; $("thead").innerHTML = head(); draw(); return; }
      const ex = e.target.dataset.exp; if(ex){ toggleOpen(ex); return; }
      const more = e.target.dataset.more; if(more){ e.preventDefault(); V.limit[more] = (V.limit[more] || KID_PAGE) + KID_PAGE; draw(); return; }
      const tg = e.target.dataset.tog; if(tg){ S.selInstr = null; select(tg); toggleSelected(); return; }
      const tr = e.target.closest("tr[data-addr]"); if(tr) rowClick(e, tr);
    };
    async function toggleOpen(addr){
      if(V.open.has(addr)){ V.open.delete(addr); draw(); return; }
      const v = S.values[addr];
      if(typeof v==="number" && Number.isInteger(v) && !(addr in S.addrType)){ await learnTypes([addr]); }
      V.open.add(addr); draw();
    }
    async function expandAllOf(addr, open){
      const out = [addr], seen = new Set();
      for(let i=0; i<out.length && out.length<3000; i++){
        const a = out[i]; if(seen.has(a)) continue; seen.add(a);
        if(!(a in S.values)) kidsOf(a).forEach(k => out.push(k));
      }
      const ints = out.filter(a => typeof S.values[a]==="number" && Number.isInteger(S.values[a]));
      if(open) await learnTypes(ints.slice(0, 2000));
      out.forEach(a => { if(open){ if(!(a in S.values) || ints.includes(a)) V.open.add(a); } else V.open.delete(a); });
      draw();
    }
    st.expandAllOf = expandAllOf;
    function rowClick(e, tr){
      const a = tr.dataset.addr;
      if(e.shiftKey && V.anchor){ const all = [...$("tbody").querySelectorAll("tr[data-addr]")].map(r=>r.dataset.addr), i = all.indexOf(V.anchor), j = all.indexOf(a);
        V.sel = new Set(all.slice(Math.min(i,j), Math.max(i,j)+1)); }
      else if(e.ctrlKey || e.metaKey){ V.sel.has(a) ? V.sel.delete(a) : V.sel.add(a); V.anchor = a; }
      else { V.sel = new Set([a]); V.anchor = a; }
      S.selInstr = null; select(a);
      doc.querySelectorAll("tr.sel,tr.msel").forEach(r=>r.classList.remove("sel","msel"));
      tr.classList.add("sel"); doc.querySelectorAll("tr[data-addr]").forEach(r => { if(V.sel.has(r.dataset.addr) && V.sel.size>1) r.classList.add("msel"); });
    }
    doc.onchange = (e) => {
      const sa = e.target.dataset.style;
      if(sa){ S.tagStyle[sa] = e.target.value; log(`${sa}: display style ${e.target.value} (this session; Edit Tags saves it)`); draw(); }
    };
    bindGridEditing(doc, st);
    doc.oncontextmenu = (e) => {
      const th = e.target.closest("th"); if(th){ e.preventDefault(); colMenu(e, () => { $("thead").innerHTML = head(); draw(); }); return; }
      const tr = e.target.closest("tr[data-addr]"); if(!tr) return; e.preventDefault();
      if(!V.sel.has(tr.dataset.addr)) rowClick({}, tr);
      tagMenu(e, tr.dataset.addr, {scope, st, view:V});
    };
    draw();
    S.live = (chg) => update(chg || "all");
    doc.onmousedown = null;
    S.tagGrid = {scope, st, view:V, mode:"monitor"};
  });
};

/* value cells: Enter / Tab / Up / Down commit, Esc reverts, leaving the grid by clicking
   elsewhere in it commits, losing focus to another window cancels (Commit Semantics) */
function bindGridEditing(doc, st){
  if(doc._gridBound) return; doc._gridBound = true;
  const inputs = () => [...doc.querySelectorAll("#tbody input[data-set], #tbody input[data-force]")];
  doc.addEventListener("focusin", (e) => { const t = e.target; if(t.dataset && (t.dataset.set || t.dataset.force)) t.dataset.orig = t.value; });
  async function commit(el){
    if(el.dataset.orig===undefined || el.value===el.dataset.orig) return true;
    if(el.dataset.force){ const a = el.dataset.force, raw = el.value.trim(); el.dataset.orig = el.value;
      if(raw==="" || raw==="."){ if(isForced(a)) await unforce(a); return true; }
      const cur = val2(a); let v = typeof cur==="boolean" ? (raw==="1" || /^true$/i.test(raw)) : parseLogix(raw, a);
      if(typeof v==="number" && isNaN(v)){ log(`${a}: not a number`, "err"); el.value = el.dataset.orig = ""; return false; }
      await force(a, v); return true; }
    const a = el.dataset.set, value = el.value;
    if(el.dataset.const){ await new Promise(r => setTimeout(r, 0)); if(!(await confirmConstant(a, value))){ el.value = el.dataset.orig; return false; } }
    el.dataset.orig = value;
    const ok = await write(a, value);
    if(ok){ const v = val2(a), nv = typeof v==="number" ? parseLogix(value, a) : null;
      if(typeof nv==="number" && !isNaN(nv)){ el.value = el.dataset.orig = fmtS(a, nv); } }
    return ok;
  }
  doc.addEventListener("keydown", async (e) => {
    const el = e.target; if(!(el.dataset && (el.dataset.set || el.dataset.force))) return;
    const list = inputs(), i = list.indexOf(el);
    const sameCol = (dir) => { const kind = el.dataset.set ? "set" : "force"; const rows = [...doc.querySelectorAll(`#tbody input[data-${kind}]`)]; return rows[rows.indexOf(el) + dir]; };
    if(e.key==="Enter"){ e.preventDefault(); e.stopPropagation(); await commit(el); el.select(); }
    else if(e.key==="Escape"){ e.preventDefault(); e.stopPropagation(); if(el.dataset.orig!==undefined) el.value = el.dataset.orig; el.select(); }
    else if(e.key==="Tab"){ e.preventDefault(); await commit(el); const n = list[i + (e.shiftKey ? -1 : 1)]; if(n){ n.focus(); n.select(); } }
    else if(e.key==="ArrowDown" || e.key==="ArrowUp"){ e.preventDefault(); await commit(el); const n = sameCol(e.key==="ArrowDown" ? 1 : -1); if(n){ n.focus(); n.select(); } }
  });
  doc.addEventListener("focusout", (e) => {
    const el = e.target; if(!(el.dataset && (el.dataset.set || el.dataset.force))) return;
    const to = e.relatedTarget;
    if(to && doc.contains(to)) commit(el);                       // clicked elsewhere in the grid
    else if(el.dataset.orig!==undefined && el.value!==el.dataset.orig && !$("dlg").open) el.value = el.dataset.orig;   // focus left the grid: cancel
  });
}

/* ---------- row menu (Data Monitor / Tag Editor commands) ---------- */
tagMenu = function(e, addr, ctx){
  const v = val2(addr), items = [], auth = !!(S.project && S.project.authoring);
  const def = S.tagDefs[addr], base = findDef(addr);
  const V = ctx && ctx.view, many = V && V.sel.size > 1 ? [...V.sel] : null;
  if(many){
    items.push([`Add ${many.length} tags to Watch`, () => many.forEach(addWatch)],
               [`Copy ${many.length} rows`, () => copyRows(many), false, "Ctrl+C"]);
    const tops = many.filter(a => S.tagDefs[a]);
    if(auth && tops.length) items.push([`Delete ${tops.length} tags…`, () => deleteTags(tops), false, "Del"],
      "-", ...["Read/Write","Read Only","None"].map(x => [`External Access ${x} for ${tops.filter(a=>!S.tagDefs[a].alias_for).length} tags`, () => setAccessMany(tops, x)]));
    return showMenu(e, items);
  }
  if(typeof v==="boolean") items.push(["Toggle Bit", ()=>{ select(addr); toggleSelected(); }, false, "Ctrl+T"], ["Force On", ()=>force(addr,true)], ["Force Off", ()=>force(addr,false)]);
  else if(v!==undefined && typeof v!=="object") items.push(["Force current value", ()=>force(addr, v)]);
  if(isForced(addr)) items.push(["Remove Force", ()=>unforce(addr)]);
  items.push("-", ["Add to Watch", ()=>addWatch(addr)], ["Properties", ()=>select(addr)]);
  if(window.xrefOpen) items.push(["Go To Cross Reference", ()=>xrefOpen(addr), false, "Ctrl+E"],
    ["Find All in Logic", ()=>{ S.find.q = addr.replace(/^Program:[^.]+\./, ""); S.find.scope = "all"; runFind(true); }]);
  const hasKids = !(addr in S.values) || (typeof v==="number" && Number.isInteger(v));
  if(ctx && ctx.st && ctx.st.expandAllOf && hasKids) items.push(["Expand All Members", ()=>ctx.st.expandAllOf(addr, true), false, "Ctrl++"], ["Collapse All Members", ()=>ctx.st.expandAllOf(addr, false)]);
  if(def){
    const scope = ctx ? ctx.scope : (addr.startsWith("Program:") ? addr.slice(8, addr.indexOf(".")) : "controller");
    const other = S.tagMode[scope]==="edit" ? "monitor" : "edit";
    items.push("-", [other==="edit" ? "Edit Tag (Edit Tags)" : "Monitor Tag (Monitor Tags)", () => { openTags(scope, null, other); setTimeout(()=>select(addr), 400); }]);
    if(!def.alias_for){
      items.push([`Filter On ${def.type}`, () => window.setTagTypeFilter && setTagTypeFilter(def.type)]);
      if(!INT_W[def.type] && !["BOOL","REAL"].includes(def.type)) items.push([`Open Data Type ${def.type}`, () => openType(def.type)]);
    }
  }
  if(auth && base){
    items.push("-", ["Create Tag Which Aliases…", ()=>newTagDialog({alias_for: addr.replace(/^Program:[^.]+\./, ""), scope: addr.startsWith("Program:") ? addr.slice(8, addr.indexOf(".")) : undefined})]);
    if(def) items.push(["Edit Description…", ()=>tagDescDialog(addr), false, "Ctrl+D"], ["Rename…", ()=>renameTagDialog(def.address)], ["Edit Tag Properties…", ()=>tagPropertiesDialog(def)],
      ...(def.alias_for ? [] : ["Read/Write","Read Only","None"].map(x => [`External Access: ${x}`, () => setAccessMany([def.address], x), (def.external_access||"Read/Write")===x])),
      ["Delete Tag", ()=>deleteTag(def.address), false, "Del"]);
  }
  showMenu(e, items);
};
async function setAccessMany(list, acc){
  let n = 0;
  for(const a of list){ if(S.tagDefs[a] && S.tagDefs[a].alias_for) continue; try { await api("PUT", "/api/studio/tag", {address:a, external_access:acc}); n++; } catch(err){ log(`${a}: ${err.message}`, "err"); } }
  log(`External Access ${acc} set on ${n} tag(s)`, "ok"); await refreshProject();
}
function copyRows(list){
  const lines = list.map(a => { const d = S.tagDefs[a]; const v = val2(a);
    return [d ? d.name : a, v===undefined || typeof v==="object" ? "" : fmtS(a, v), d ? d.type : (typeOfAddr(a)||""), d ? (d.description||"") : ""].join("\t"); });
  const text = lines.join("\n");
  S.tagClip = text;
  try { navigator.clipboard.writeText(text).catch(()=>{}); } catch(e){}
  log(`Copied ${list.length} row(s)`);
  return text;
}
async function deleteTags(list){
  const refs = {};
  for(const a of list){ try { const r = await api("GET", `/api/studio/tag/references?address=${encodeURIComponent(a)}`); if(r.references.length) refs[a] = r.references.length; } catch(e){} }
  const used = Object.keys(refs);
  if(await dialog({title:`Delete ${list.length} tag(s)?`, buttons:[["Cancel","cancel"],["Delete","ok","pri"]], danger:true,
      body:`<p>Delete ${list.map(esc).join(", ")}?</p>${used.length?`<p class="wrn">Still used in the logic: ${used.map(a=>`${esc(a)} (${refs[a]})`).join(", ")}. Verify will report those references.</p>`:""}<p class="notice-small">File ▸ Undo last project change (Ctrl+Z) brings a tag back.</p>`})!=="ok") return;
  let n = 0;
  for(const a of list){ try { await api("DELETE", `/api/studio/tag?address=${encodeURIComponent(a)}${refs[a]?"&force=true":""}`); n++; } catch(e){ log(`${a}: ${e.message}`, "err"); } }
  log(`${n} tag(s) deleted`, "ok"); await refreshProject();
}

/* ---------- Edit Tags (in-cell editing, filter, sort, create row, paste) ---------- */
editTags = async function(doc, scope){
  S.live = null;
  const d = await api("GET", `/api/studio/tags?scope=${encodeURIComponent(scope)}`);
  d.tags.forEach(t => { S.tagDefs[t.address] = t; });
  await loadTypeList();
  const auth = !!(S.project && S.project.authoring);
  const V = tagView(scope);
  V.esort = V.esort || "name"; V.edir = V.edir || 1;
  const typeText = (t) => t.alias_for ? `→ ${t.alias_for}` : t.type + (t.dims && t.dims.length ? `[${t.dims.join(",")}]` : "");
  const key = (t, k) => k==="name" ? t.name.toLowerCase() : k==="type" ? typeText(t) : k==="description" ? (t.description||"").toLowerCase() : k==="access" ? (t.external_access||"") : k==="constant" ? (t.constant?0:1) : k==="style" ? (t.style||"") : t.name;
  const arrow = (k) => V.esort===k ? (V.edir>0?" ▲":" ▼") : "";
  const styleOpts = (t) => t.alias_for || (t.dims&&t.dims.length) ? [] : t.type==="REAL" ? ["Float","Exponential"] : INT_W[t.type] ? ["Decimal","Hex","Binary","Octal","ASCII"] : [];
  const render = () => {
    const f = V.filter.toLowerCase();
    const rows = d.tags.filter(t => !f || (V.field!=="desc" && t.name.toLowerCase().includes(f)) || (V.field!=="name" && (t.description||"").toLowerCase().includes(f)))
      .filter(t => !V.type || t.type===V.type)
      .sort((a,b)=>{ const x = key(a, V.esort), y = key(b, V.esort); return (x<y?-1:x>y?1:0) * V.edir; });
    const ro = (t) => t.alias_for ? " ro" : "";
    V.eopen = V.eopen || new Set();
    const canExp = (t) => !t.alias_for && window.expandableType && expandableType(t.type, t.dims);
    $("etbody").innerHTML = rows.map(t => `<tr data-addr="${esc(t.address)}" class="${V.sel.has(t.address)?"sel":""}">
      <td class="${auth?"ed":""}" data-ed="name">${canExp(t) ? `<span class="exp" data-eexp="${esc(t.address)}" title="Show the members / elements">${V.eopen.has(t.address)?"−":"+"}</span>` : `<span class="exp"></span>`}${esc(t.name)}</td>
      <td class="typ ${auth && !t.alias_for?"ed":"ro"}" data-ed="${t.alias_for?"":"type"}">${esc(typeText(t))}</td>
      <td class="desc ${auth?"ed":""}" data-ed="description">${esc(t.description||"")}</td>
      <td class="${auth && !t.alias_for?"ed":"ro"}" data-ed="${t.alias_for?"":"access"}" title="${t.alias_for?"An alias has the External Access of its base tag; change it there":""}">${esc(t.external_access||"")}</td>
      <td class="${auth && !t.alias_for?"ed":"ro"}" data-ed="${t.alias_for?"":"constant"}">${t.constant?"✔":""}</td>
      <td class="${auth && styleOpts(t).length?"ed":"ro"}" data-ed="${styleOpts(t).length?"style":""}">${esc(t.style || (styleOpts(t)[0]||""))}</td>
      <td class="act">${auth?`<button data-ren="${esc(t.address)}" title="Rename (updates the logic)">Rename</button> <button data-prop="${esc(t.address)}" title="Properties">✎</button> <button data-del="${esc(t.address)}" title="Delete">✕</button>`:""}</td></tr>`
      + (canExp(t) && V.eopen.has(t.address) ? editMemberRows(t.address, t.type, t.dims || [], 1, V.eopen, t.description || "") : "")).join("")
      + (auth ? `<tr class="newrow"><td><input id="nName" placeholder="new tag name" spellcheck="false" autocomplete="off"></td>
      <td><input id="nType" list="dtList" value="${esc(lsGet("DefaultType")||"BOOL")}" spellcheck="false"></td><td><input id="nDesc" placeholder="description"></td>
      <td><select id="nAcc"><option>Read/Write</option><option>Read Only</option><option>None</option></select></td><td><input type="checkbox" id="nConst"></td><td></td>
      <td><input id="nDims" placeholder="array: 10 or 2,3" title="Array dimensions (empty = single value)" style="width:60%"> <button id="nAdd">Create</button></td></tr>` : "");
    $("ecount").textContent = `${rows.length} of ${d.tags.length} tags`;
    bindCreate();
  };
  const types = [...new Set(d.tags.map(t=>t.alias_for ? null : t.type).filter(Boolean))].sort();
  doc.innerHTML = `<div class="tagtools">${tagModeSwitch(scope, "edit")}${scopeSelect(scope)}
      <select id="tfield" title="Filter on"><option value="both">Name + Description</option><option value="name">Name</option><option value="desc">Description</option></select>
      <input id="tfilter" placeholder="Filter…" value="${esc(V.filter)}">
      <select id="tshow"><option value="">All types</option>${types.map(t=>`<option ${t===V.type?"selected":""}>${esc(t)}</option>`).join("")}</select>
      <span class="dim" id="ecount"></span>
      <span class="dim">${auth?"Click a cell to change it · type in the last row to create · Ctrl+V pastes rows":"Import or create a project to edit its tags."}</span>
      <button id="tNew" class="colbtn" ${auth?"":"disabled"}>＋ New Tag…</button></div>
    <table class="tagtable etag"><thead><tr>${[["name","Name","20%"],["type","Data Type","15%"],["description","Description",""],["access","External Access","11%"],["constant","Constant","6%"],["style","Style","8%"]].map(([k,l,w])=>`<th class="sort" data-sort="${k}" ${w?`style="width:${w}"`:""}>${l}${arrow(k)}</th>`).join("")}<th style="width:17%"></th></tr></thead>
    <tbody id="etbody"></tbody></table>`;
  $("tfield").value = V.field;
  $("tfilter").oninput = (e) => { V.filter = e.target.value; render(); };
  $("tfield").onchange = (e) => { V.field = e.target.value; render(); };
  $("tshow").onchange = (e) => { V.type = e.target.value; render(); };
  $("tscope").onchange = (e) => openTags(e.target.value, null, "edit");
  bindTagModeSwitch(scope);
  if($("tNew")) $("tNew").onclick = () => newTagDialog({scope});
  window.setTagTypeFilter = (t) => { V.type = t; const s = $("tshow"); if(s){ if(![...s.options].some(o=>o.value===t)) s.insertAdjacentHTML("beforeend", `<option>${esc(t)}</option>`); s.value = t; } render(); };
  let creating = false;
  async function create(){
    const nm = $("nName"); if(!nm || !nm.value.trim() || creating) return;     // Enter and leaving the row must not create twice
    let dims; try { dims = parseDims($("nDims").value); } catch(e){ log(e.message, "err"); return; }
    const name = nm.value.trim(); creating = true;
    try { const r = await api("POST", "/api/studio/tag", {name, scope, data_type:$("nType").value.trim(), dims,
                                                       description:$("nDesc").value, external_access:$("nAcc").value, constant:$("nConst").checked});
          nm.value = ""; log(`Tag ${r.address} created`, "ok"); creating = false; await refreshProject(); setTimeout(()=>{ const n=$("nName"); if(n) n.focus(); }, 50); }
    catch(e){ creating = false; log(`New tag: ${e.message}`, "err"); const n = $("nName"); if(n) n.focus(); }
  }
  function bindCreate(){
    if(!$("nAdd")) return;
    $("nAdd").onclick = create;
    ["nName","nType","nDesc","nDims"].forEach(i => $(i).onkeydown = (e) => { if(e.key==="Enter"){ e.preventDefault(); create(); } if(e.key==="Escape"){ $("nName").value = ""; $("nDesc").value = ""; } });
    const nr = doc.querySelector("tr.newrow");
    nr.addEventListener("focusout", (e) => { if(!nr.contains(e.relatedTarget) && $("nName") && $("nName").value.trim() && !$("dlg").open) create(); });   // leaving the row creates the tag
  }
  async function saveCell(t, field, value){
    try {
      if(field==="description") await api("PUT","/api/studio/tag",{address:t.address, description:value});
      else if(field==="access") await api("PUT","/api/studio/tag",{address:t.address, external_access:value});
      else if(field==="constant") await api("PUT","/api/studio/tag",{address:t.address, constant:value});
      else if(field==="style") await api("PUT","/api/studio/tag/style",{address:t.address, style:value});
      else if(field==="type"){ const m = /^([^\[]+)(?:\[([\d,\s]+)\])?$/.exec(value.trim()); if(!m) throw new Error("type like DINT or DINT[10]");
        await api("PUT","/api/studio/tag",{address:t.address, data_type:m[1].trim(), dims: m[2] ? parseDims(m[2]) : []}); }
      log(`Tag ${t.address}: ${field} changed`, "ok"); await refreshProject(); return true;
    } catch(e){ log(`${t.address}: ${e.message}`, "err"); render(); return false; }
  }
  function editCell(td, t){
    const field = td.dataset.ed; if(!field || td.querySelector(".cell-ed")) return;
    if(field==="name"){ renameTagDialog(t.address); return; }
    if(field==="constant"){ saveCell(t, "constant", !t.constant); return; }
    let ed;
    if(field==="access" || field==="style"){
      const opts = field==="access" ? ["Read/Write","Read Only","None"] : styleOpts(t);
      const cur = field==="access" ? (t.external_access||"Read/Write") : (t.style || opts[0]);
      td.innerHTML = `<select class="cell-ed">${opts.map(o=>`<option ${o===cur?"selected":""}>${o}</option>`).join("")}</select>`;
      ed = td.firstChild; ed.onchange = () => saveCell(t, field, ed.value);
    } else {
      const cur = field==="type" ? typeText(t) : (t.description||"");
      td.innerHTML = `<input class="cell-ed" ${field==="type"?'list="dtList"':""} value="${esc(cur)}" spellcheck="false">`;
      ed = td.firstChild;
      let done = false;
      const fin = async (ok) => { if(done) return; done = true; if(ok && ed.value!==cur) await saveCell(t, field, ed.value); else render(); };
      ed.onkeydown = (e) => { if(e.key==="Enter" || (e.key==="Enter" && e.ctrlKey)){ e.preventDefault(); e.stopPropagation(); fin(true); }
                              else if(e.key==="Escape"){ e.preventDefault(); e.stopPropagation(); fin(false); }
                              else if(e.key==="Tab"){ e.preventDefault(); fin(true); } };
      ed.onblur = () => fin(true);
    }
    ed.focus(); if(ed.select) ed.select();
  }
  doc.onclick = (e) => {
    const b = e.target.dataset;
    if(b.eexp){ e.stopPropagation(); const tr = e.target.closest("tr"); const t = d.tags.find(x => x.address===b.eexp);
      const type = t ? t.type : tr.dataset.mtype, dims = t ? (t.dims || []) : (tr.dataset.mdims ? tr.dataset.mdims.split(",").map(Number) : []);
      editToggle(b.eexp, type, dims, V, render); return; }
    if(b.ren){ renameTagDialog(b.ren); return; } if(b.prop){ tagPropertiesDialog(S.tagDefs[b.prop]); return; } if(b.del){ deleteTag(b.del); return; }
    const th = e.target.closest("th.sort"); if(th){ const k = th.dataset.sort; V.edir = V.esort===k ? -V.edir : 1; V.esort = k;
      doc.querySelectorAll("th.sort").forEach(h => { h.textContent = h.textContent.replace(/ [▲▼]$/, "") + (h.dataset.sort===V.esort ? (V.edir>0?" ▲":" ▼") : ""); }); render(); return; }
    const td = e.target.closest("td[data-ed]"), tr = e.target.closest("tr[data-addr]");
    if(td && tr && auth && td.dataset.ed && doc._edOk===tr.dataset.addr && !(e.ctrlKey||e.metaKey||e.shiftKey)){ editCell(td, S.tagDefs[tr.dataset.addr]); return; }
  };
  doc.onmousedown = (e) => {
    const tr = e.target.closest(".etag tr[data-addr]"); if(!tr || e.button!==0 || e.target.closest("button,input,select")) return;
    const a = tr.dataset.addr;
    if(tr.classList.contains("mem")){ doc._edOk = null; doc.querySelectorAll(".etag tr.sel").forEach(r => r.classList.remove("sel")); tr.classList.add("sel"); select(a); return; }
    doc._edOk = (V.sel.size===1 && V.sel.has(a)) ? a : null;      // a click on an already selected row edits the cell
    if(e.shiftKey && V.anchor){ const all = [...doc.querySelectorAll(".etag tr[data-addr]")].map(r=>r.dataset.addr), i = all.indexOf(V.anchor), j = all.indexOf(a);
      V.sel = new Set(all.slice(Math.min(i,j), Math.max(i,j)+1)); }
    else if(e.ctrlKey || e.metaKey){ V.sel.has(a) ? V.sel.delete(a) : V.sel.add(a); V.anchor = a; }
    else { if(!(V.sel.size===1 && V.sel.has(a))) V.sel = new Set([a]); V.anchor = a; }
    doc.querySelectorAll(".etag tr[data-addr]").forEach(r => r.classList.toggle("sel", V.sel.has(r.dataset.addr)));
    select(a);
  };
  doc.oncontextmenu = (e) => {
    const tr = e.target.closest("tr[data-addr]"); if(!tr) return;
    e.preventDefault();
    if(!V.sel.has(tr.dataset.addr)){ V.sel = new Set([tr.dataset.addr]); doc.querySelectorAll(".etag tr[data-addr]").forEach(r => r.classList.toggle("sel", V.sel.has(r.dataset.addr))); }
    tagMenu(e, tr.dataset.addr, {scope, view:V});
  };
  doc.onkeydown = null;
  render();
  S.tagGrid = {scope, view:V, mode:"edit", pasteRows: async (text) => {
    if(!auth) return;
    const lines = text.split(/\r?\n/).map(l => l.split("\t")).filter(f => f[0] && f[0].trim());
    let n = 0;
    for(const f of lines){
      const [name, a, b, c] = f.map(x => (x||"").trim());
      const body = f.length>=4 ? {name, data_type:b||"DINT", description:c} : f.length===3 ? {name, data_type:a||"DINT", description:b} : f.length===2 ? {name, data_type:a} : {name, data_type:"BOOL"};
      const tm = /^([^\[]+)\[([\d,\s]+)\]$/.exec(body.data_type||""); if(tm){ body.data_type = tm[1]; body.dims = parseDims(tm[2]); }
      try { await api("POST","/api/studio/tag",{...body, scope}); n++; } catch(e){ log(`Paste ${name}: ${e.message}`, "err"); }
    }
    log(`${n} tag(s) created from the clipboard`, n ? "ok" : "wrn"); if(n) await refreshProject();
  }};
};

/* ---------- keys and clipboard in the tag views ---------- */
function tagKeys(e){
  if(!S.active || !S.active.startsWith("tags:") || !S.tagGrid || $("dlg").open || menuOpen()) return false;
  if(typingTarget(document.activeElement)) return false;
  const G = S.tagGrid, V = G.view, ctrl = e.ctrlKey || e.metaKey, k = e.key;
  const rows = [...document.querySelectorAll("#doc tr[data-addr]")];
  const cur = rows.findIndex(r => r.dataset.addr===S.sel);
  const pick = (i) => { const r = rows[Math.max(0, Math.min(rows.length-1, i))]; if(!r) return; V.sel = new Set([r.dataset.addr]); V.anchor = r.dataset.addr; select(r.dataset.addr);
    rows.forEach(x => x.classList.toggle("sel", x===r)); rows.forEach(x=>x.classList.remove("msel")); r.scrollIntoView({block:"nearest"}); };
  if(k==="ArrowDown" || k==="ArrowUp"){ e.preventDefault(); pick(cur + (k==="ArrowDown"?1:-1)); return true; }
  if(k==="Home" && ctrl){ e.preventDefault(); pick(0); return true; }
  if(k==="End" && ctrl){ e.preventDefault(); pick(rows.length-1); return true; }
  if((k==="Enter" || k==="F2") && S.sel && G.mode==="monitor"){ const i = document.querySelector(`#doc input[data-set="${CSS.escape(S.sel)}"]`); if(i){ e.preventDefault(); i.focus(); i.select(); return true; } }
  if((k==="+" || k==="=") && ctrl && S.sel && G.st && G.st.expandAllOf){ e.preventDefault(); G.st.expandAllOf(S.sel, !V.open.has(S.sel)); return true; }
  if(k==="Delete" && S.project && S.project.authoring){ const list = [...(V.sel.size ? V.sel : new Set([S.sel]))].filter(a => a && S.tagDefs[a]); if(list.length){ e.preventDefault(); deleteTags(list); return true; } }
  if(ctrl && (k==="d" || k==="D") && S.sel){ e.preventDefault(); tagDescDialog(S.sel); return true; }
  if(ctrl && (k==="a" || k==="A")){ e.preventDefault(); V.sel = new Set(rows.map(r=>r.dataset.addr)); rows.forEach(r => r.classList.add("msel")); return true; }
  return false;
}
vcsKeyHooks.push(tagKeys);
document.addEventListener("copy", (e) => {
  if(!S.active || !S.active.startsWith("tags:") || !S.tagGrid || typingTarget(document.activeElement) || $("dlg").open) return;
  const V = S.tagGrid.view, list = V.sel.size ? [...V.sel] : (S.sel ? [S.sel] : []); if(!list.length) return;
  e.clipboardData.setData("text/plain", copyRows(list)); e.preventDefault();
});
document.addEventListener("paste", (e) => {
  if(!S.active || !S.active.startsWith("tags:") || !S.tagGrid || S.tagGrid.mode!=="edit" || typingTarget(document.activeElement) || $("dlg").open) return;
  e.preventDefault(); S.tagGrid.pasteRows(e.clipboardData.getData("text/plain"));
});

/* ---------- Watch (OW-02) ---------- */
function routineTags(){
  if(!(S.R && S.R.data)) return [];
  const out = new Set();
  const add = (op) => { const a = aoiAddr(S.R.prog, op); if(a && !/\[[^\]]*[A-Za-z_]/.test(a) && (a in S.values || val2(a)!==undefined || findDef(a) || kidsOf(a).length)) out.add(a); };
  if(S.R.data.type==="RLL") S.R.data.rungs.forEach(r => { if(!r.error) instrOrder(r.tree).forEach(i => i.args.forEach(add)); });
  else (S.R.data.text||"").replace(/(?:Program:\w+\.)?[A-Za-z_][\w.\[\]]*/g, (m) => { add(m); return m; });
  return [...out];
}
function renderWatch(c){
  const desc = (a) => { const d = findDef(a); return d ? (d.address===a ? d.description||"" : S.passDesc[a]||"") : ""; };
  c.innerHTML = `<div class="wadd"><input id="wAdd" list="tagList" placeholder="Add a tag: type its name, Enter (▾ browses)"><button id="wBrowse">▾</button><button id="wRt" title="Add every tag used in the open routine">Watch routine tags</button><button id="wClr">Clear</button></div>
    ${S.watch.length ? `<table class="wtab" style="font-family:var(--mono)"><tr><th>Tag</th><th>Value</th><th>Description</th><th></th></tr>${S.watch.map(a => { const v = val2(a);
      const cell = typeof v==="boolean" ? `<button class="boolbtn ${v?"on":""}" data-wt="${esc(a)}">${v?1:0}</button>` : (v===undefined || typeof v==="object") ? `<span class="dim">${esc(fmt(v))}</span>` : `<input data-set="${esc(a)}" value="${esc(typeof v==="string" ? v : fmtS(a, v))}">`;
      return `<tr data-w="${esc(a)}" class="${S.sel===a?"sel":""}"><td>${esc(a)}</td><td>${cell}${isForced(a)?' <b style="color:var(--force)">F</b>':""}</td><td class="desc dim">${esc(desc(a))}</td><td><button data-wr="${esc(a)}" title="Remove">✕</button></td></tr>`; }).join("")}</table>` : `<span class="dim">Type a tag name above, or right-click a tag / instruction → Add to Watch.</span>`}`;
  const inp = $("wAdd");
  const add = (v) => { v = (v||"").trim(); if(!v) return; const a = S.R ? (aoiAddr(S.R.prog, v) || v) : v;
    if(!(a in S.values) && val2(a)===undefined && !findDef(a) && !Object.keys(S.values).some(k=>k.startsWith(a+".")||k.startsWith(a+"["))){ log(`Watch: no tag ${v}`, "err"); return; }
    addWatch(a); };
  inp.onkeydown = (e) => { if(e.key==="Enter"){ e.preventDefault(); add(inp.value); } };
  $("wBrowse").onclick = (e) => { e.stopPropagation(); openTagBrowser(inp, [], (p) => { inp.value = p; add(p); }); };
  $("wRt").onclick = () => { const list = routineTags(); list.forEach(a => { if(!S.watch.includes(a)) S.watch.push(a); }); lsSet("Watch", JSON.stringify(S.watch)); log(`${list.length} routine tag(s) in Watch`); renderConsole(); };
  $("wClr").onclick = () => { S.watch = []; lsSet("Watch", "[]"); renderConsole(); };
  c.querySelectorAll("[data-wt]").forEach(b => b.onclick = (e) => { e.stopPropagation(); select(b.dataset.wt); toggleSelected(); });
  c.querySelectorAll("tr[data-w]").forEach(tr => tr.onclick = () => { select(tr.dataset.w); c.querySelectorAll("tr.sel").forEach(x=>x.classList.remove("sel")); tr.classList.add("sel"); });
  c.querySelectorAll("[data-wr]").forEach(b => b.onclick = (e) => { e.stopPropagation(); S.watch = S.watch.filter(x=>x!==b.dataset.wr); lsSet("Watch", JSON.stringify(S.watch)); renderConsole(); });
  c.querySelectorAll("input[data-set]").forEach(i => {
    i.onfocus = () => { i.dataset.orig = i.value; S.watchEditing = true; };
    i.onblur = () => { S.watchEditing = false; };
    i.onkeydown = async (e) => { if(e.key==="Enter"){ e.preventDefault(); const a = i.dataset.set; const def = findDef(a);
        if(def && def.constant && !(await confirmConstant(a, i.value))) return; await write(a, i.value); i.dataset.orig = i.value; }
      if(e.key==="Escape"){ e.preventDefault(); i.value = i.dataset.orig; } };
  });
  c.oncontextmenu = (e) => { const tr = e.target.closest("tr[data-w]"); if(!tr) return; e.preventDefault(); tagMenu(e, tr.dataset.w); };
}
const _rc2 = renderConsole;
renderConsole = function(){
  if(S.ctab==="watch"){ if(S.watchEditing && document.activeElement && $("cbody").contains(document.activeElement)) return; return renderWatch($("cbody")); }
  _rc2();
};

/* the Properties pane and ladder values use the display style */
const _rp = renderProps;
renderProps = function(){ _rp(); const a = S.sel, big = document.querySelector("#pbody .big"); if(a && big){ const v = val2(a); if(v!==undefined && typeof v!=="object") big.textContent = fmtS(a, v); }
  const pn = $("pNum"); if(pn && a){ const v = val2(a); if(typeof v==="number") pn.value = fmtS(a, v); } };
renderPropsLite = function(){ const big = document.querySelector("#pbody .big"); const v = val2(S.sel); if(big && v!==undefined) big.textContent = fmtS(S.sel, v); };
window.fmtS = fmtS; window.val2 = val2; window.parseLogix = parseLogix;
