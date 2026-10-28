"use strict";
/* 0.18.0 editors (loaded last), following the Logix Designer v37 help:
   Structured Text
   - edited directly, as Studio does offline: the routine opens ready to type; Accept Edits
     applies it to the controller, Discard goes back; unaccepted text is kept per routine
     (a draft) while you work elsewhere, and the tab shows * until it is accepted
   - change bar in the gutter: yellow = changed, orange = changed then undone,
     green = accepted
   - toolbar: comment / uncomment, indent / outdent, expand / collapse all, inline values,
     tab and space markers, completion prompt on or off
   - snippets also for ELSIF and #region; Shift+Tab goes back a placeholder, Enter or Esc
     leaves the snippet; Ctrl+Shift+Space opens the completion list
   - Studio's default colours: keywords blue, comments dark green, tags dark red
   Ladder
   - a changed instruction in the rung editor shows * (dirty)
   - double-click a blue value in a block to write that tag in place
   - instruction properties dialog (… on a block, or the instruction menu)
   (Verify warnings for duplicate destructive bits, shorted branches and routines that
   nothing calls are produced by verify.py.) */

(function(){
  const css = document.createElement("style");
  css.id = "editorStyles";
  css.textContent = `
/* ---------- ST: Studio default colours ---------- */
:root,:root[data-theme="dark"],:root[data-theme="light"]{--stk:#0000FF;--stf:#0000FF;--stc:#008000;--sts:#000000;--stn:#000000;--stt:#800000}
.st-k,.st-rg,.st-f{color:#0000FF!important;font-weight:400!important}
.st-c{color:#008000!important}
.st-t{color:#800000!important}
.st-n,.st-s,.st-a{color:#000000!important;font-weight:400!important}
.st-u{color:#800000}
/* ---------- ST: direct editing ---------- */
.sted.direct{border:1px solid #C0C0C0!important;border-radius:0!important;margin:0 4px 4px!important;height:calc(100vh - 470px)!important;min-height:220px}
.sted.direct.invalid{border-color:#C0C0C0!important}
#stTool{display:flex;flex-wrap:wrap;align-items:center;gap:2px;padding:3px 4px;margin:0 4px;background:#F0F0F0;border:1px solid #C0C0C0;border-bottom:none;font-size:12px}
#stTool button{min-width:26px;height:22px;padding:0 6px;font-size:12px;font-family:Consolas,"Courier New",monospace;background:#FFFFFF;border:1px solid #C0C0C0}
#stTool button:hover{border-color:#0078D7;background:#E5F1FB}
#stTool button.on{background:#CCE8FF;border-color:#0078D7}
#stTool .sep{width:1px;align-self:stretch;background:#C0C0C0;margin:0 4px}
#stTool select{height:22px;font-size:12px}
#stTool label{display:inline-flex;gap:3px;align-items:center;margin-left:4px;color:#303030;white-space:nowrap}
#stTool input[type=checkbox]{display:inline-block;width:13px!important;min-width:0!important;flex:none!important;margin:0 3px 0 0;position:static}
#stTool label{display:inline-block!important}
#stTool .stdirty{margin-left:auto;color:#A85F00;font-weight:600}
#stTool .stclean{margin-left:auto;color:#5A5A5A}
#stBar.direct #stFinal{background:#FFFFFF;color:#000;border:1px solid #707070}
#stBar.direct #stFinal:not(:disabled){background:#E5F1FB;border-color:#0078D7}
/* change bar in the gutter */
.stgut>div{border-left:4px solid transparent}
.stgut>div.chg-y{border-left-color:#F2C200}
.stgut>div.chg-o{border-left-color:#F08A00}
.stgut>div.chg-g{border-left-color:#22A845}
/* inline values at the end of a line, tab and space markers */
.st-iv{color:#0000D0;font-size:11px;background:#EEF3FB;outline:1px solid #C9D6EE;margin-left:10px;padding:0 4px}
.ws-sp{background:radial-gradient(circle,#A0A0A0 1px,transparent 1.4px) center/100% 100% no-repeat}
.ws-tb{background:linear-gradient(#B0B0B0,#B0B0B0) left center/80% 1px no-repeat}
/* ---------- ladder ---------- */
.ladder .ins{position:relative}
.ladder .ins>.dmark{position:absolute;top:0;right:0;color:#0000FF;font-weight:700;font-family:Consolas,monospace;font-size:13px;line-height:12px;z-index:2}
.ladder .box .bt .cfg{margin-left:auto;font-weight:400;color:#404040;border:1px solid #A0A0A0;background:#FFFFFF;line-height:11px;padding:0 3px;cursor:pointer;font-size:10px}
.ladder .box .bt .cfg:hover{border-color:#0078D7;background:#E5F1FB}
.ladder .box .lv[data-a]:not([data-a=""]){cursor:text}
#lvEdit{position:fixed;z-index:70;font:12px Consolas,"Courier New",monospace;border:1px solid #0041C2;padding:0 3px;width:110px;text-align:right}
#ipDlg table{border-collapse:collapse;width:100%;font-size:12px}
#ipDlg th{background:#F0F0F0;text-align:left;font-weight:400;border:1px solid #C0C0C0;padding:2px 6px}
#ipDlg td{border:1px solid #D3D3D3;padding:1px 4px;vertical-align:middle}
#ipDlg td input{width:100%;box-sizing:border-box;font:12px Consolas,"Courier New",monospace;border:1px solid transparent;padding:1px 3px}
#ipDlg td input:focus{border-color:#0041C2}
#ipDlg td.ro{color:#505050;font-family:Consolas,monospace}
#ipDlg .arrow{color:#0000D0;font-weight:700}
`;
  document.head.appendChild(css);
})();

/* ======================================================================
   Structured Text: direct editing
   ====================================================================== */
S.stDirect = lsGet("StDirect") !== "0";
S.stDrafts = {};
S.stGreen = {};
S.stValsMode = lsGet("StVals") || "off";          // off | run | always
S.stWs = lsGet("StWs") === "1";
S.stAutoCompl = lsGet("StCompl") !== "0";
const stKey = () => S.R ? `${S.R.prog}/${S.R.routine}` : "";
const stDirty = (E) => !!(E && E.st && E.direct && E.text !== E.base);

/* line diff: which current lines differ from the base (common prefix and suffix, then an
   LCS on the middle when it is small enough, otherwise the whole middle) */
function stChangedLines(base, cur){
  const a = base.split("\n"), b = cur.split("\n"), out = new Set();
  let p = 0; while(p < a.length && p < b.length && a[p]===b[p]) p++;
  let s = 0; while(s < a.length - p && s < b.length - p && a[a.length-1-s]===b[b.length-1-s]) s++;
  const am = a.slice(p, a.length - s), bm = b.slice(p, b.length - s);
  if(!bm.length) return out;
  if(!am.length || am.length * bm.length > 400000){ bm.forEach((_, i) => out.add(p + i)); return out; }
  const n = am.length, m = bm.length, L = Array.from({length: n + 1}, () => new Uint16Array(m + 1));
  for(let i = n - 1; i >= 0; i--) for(let j = m - 1; j >= 0; j--) L[i][j] = am[i]===bm[j] ? L[i+1][j+1] + 1 : Math.max(L[i+1][j], L[i][j+1]);
  let i = 0, j = 0; const keep = new Set();
  while(i < n && j < m){ if(am[i]===bm[j]){ keep.add(j); i++; j++; } else if(L[i+1][j] >= L[i][j+1]) i++; else j++; }
  bm.forEach((_, k) => { if(!keep.has(k)) out.add(p + k); });
  return out;
}

(function(){
  const _render = renderST;
  renderST = function(){
    const r = S.R && S.R.data;
    if(S.stDirect && !S.edit && r && r.type==="ST" && r.editable){
      const key = stKey(), d = S.stDrafts[key];
      const text = d && d.base===r.text ? d.text : r.text;
      if(d && d.base!==r.text) delete S.stDrafts[key];
      S.edit = {st:true, direct:true, prog:S.R.prog, routine:S.R.routine, text, base:r.text, version:r.version,
                issues:[], valid:true, checked:false, ever:new Set()};
    }
    _render();
    const E = S.edit;
    if(E && E.st && E.direct && $("stTa")){ stDecorate(E); setTimeout(stValidate, 0); }
  };
})();

function stDecorate(E){
  const ta = $("stTa"), sted = document.querySelector(".sted"), bar = $("stBar");
  if(sted) sted.classList.add("direct");
  if(bar){ bar.classList.add("direct");
    const fin = $("stFinal"), can = $("stCancel");
    if(fin){ fin.textContent = "✔ Accept Edits"; fin.title = "Apply this routine to the controller (Ctrl+Enter)"; }
    if(can){ can.textContent = "Discard Changes"; can.title = "Go back to the routine as the controller has it"; }
    [...bar.querySelectorAll("span.dim")].slice(1).forEach(x => x.textContent = (S.state||{}).mode==="RUN" ? "Accepted edits apply between two scans; tags keep their values." : "");
  }
  if(sted && !$("stTool")) sted.insertAdjacentHTML("beforebegin", stToolHtml());
  const hint = document.querySelector(".rhead .hint"); if(hint) hint.textContent = "Type to edit · Accept Edits (Ctrl+Enter) applies the routine to the controller";
  stToolBind();
  ta.addEventListener("input", () => stAfterInput(E));
  ta.addEventListener("keydown", (e) => { if(e.key==="Enter" && (e.ctrlKey || e.metaKey)){ e.preventDefault(); const f = $("stFinal"); if(f && !f.disabled) f.click(); } });
  stAfterInput(E, true);
  if(S.stValsTimer) clearInterval(S.stValsTimer);
  S.stValsTimer = setInterval(() => {
    if(!$("stTa")){ clearInterval(S.stValsTimer); S.stValsTimer = null; return; }
    if(stValsOn() && S.stPaintHi) S.stPaintHi();
  }, 500);
}
function stAfterInput(E, first){
  if(S.edit!==E) return;
  const key = `${E.prog}/${E.routine}`;
  if(stDirty(E)) S.stDrafts[key] = {text:E.text, base:E.base}; else delete S.stDrafts[key];
  const st = $("stState");
  if(st){ st.className = stDirty(E) ? "stdirty" : "stclean"; st.textContent = stDirty(E) ? "Edited — not accepted" : "No changes"; }
  const fin = $("stFinal"); if(fin && !first) fin.disabled = !(E.checked && E.valid && stDirty(E));
  renderTabs();
  clearTimeout(S.stChgT); S.stChgT = setTimeout(() => { if(window.ideGutter) ideGutter(); }, first ? 0 : 200);
}
function stToolHtml(){
  const v = S.stValsMode;
  return `<div id="stTool" role="toolbar" aria-label="Structured Text">
    <button type="button" data-st="comment" title="Comment: // on each line, or (* *) around a partial selection">//</button>
    <button type="button" data-st="uncomment" title="Uncomment the selected lines or the (* *) block at the caret">⁄⁄̶</button>
    <span class="sep"></span>
    <button type="button" data-st="indent" title="Increase indent">⇥</button>
    <button type="button" data-st="outdent" title="Decrease indent">⇤</button>
    <span class="sep"></span>
    <button type="button" data-st="expand" title="Expand all outlining">[+]</button>
    <button type="button" data-st="collapse" title="Collapse all outlining">[-]</button>
    <span class="sep"></span>
    <select id="stVals" title="Show tag values in the code">
      <option value="off" ${v==="off"?"selected":""}>Values: off</option>
      <option value="run" ${v==="run"?"selected":""}>Values: when running</option>
      <option value="always" ${v==="always"?"selected":""}>Values: always</option></select>
    <button type="button" data-st="ws" class="${S.stWs?"on":""}" title="Show tabs and spaces">¶</button>
    <label title="Show the completion list while typing (Ctrl+Shift+Space opens it any time)"><input type="checkbox" id="stCompl" ${S.stAutoCompl?"checked":""}> Completion prompt</label>
    <span id="stState" class="stclean">No changes</span></div>`;
}
function stToolBind(){
  const t = $("stTool"); if(!t || t.dataset.b) return; t.dataset.b = "1";
  t.addEventListener("mousedown", (e) => { if(e.target.closest("button")) e.preventDefault(); });
  t.addEventListener("click", (e) => {
    const b = e.target.closest("[data-st]"); if(!b) return;
    const ta = $("stTa"); if(!ta) return;
    const k = b.dataset.st;
    if(k==="comment") stComment(ta);
    else if(k==="uncomment") stUncomment(ta);
    else if(k==="indent") stIndentSel(ta, false);
    else if(k==="outdent") stIndentSel(ta, true);
    else if(k==="expand"){ if(window.ideUnfoldAll) ideUnfoldAll(); }
    else if(k==="collapse") stCollapseAll();
    else if(k==="ws"){ S.stWs = !S.stWs; lsSet("StWs", S.stWs ? "1" : "0"); b.classList.toggle("on", S.stWs); if(S.stPaintHi) S.stPaintHi(); }
    ta.focus();
  });
  $("stVals").onchange = (e) => { S.stValsMode = e.target.value; lsSet("StVals", S.stValsMode); if(S.stPaintHi) S.stPaintHi(); };
  $("stCompl").onchange = (e) => { S.stAutoCompl = e.target.checked; lsSet("StCompl", S.stAutoCompl ? "1" : "0"); };
}
/* the whole lines touched by the selection */
function stSelLines(ta){
  const v = ta.value, s = ta.selectionStart, e = ta.selectionEnd;
  const a = v.lastIndexOf("\n", s - 1) + 1;
  let b = v.indexOf("\n", Math.max(s, e - (e > s && v[e-1]==="\n" ? 1 : 0))); if(b < 0) b = v.length;
  return {a, b, s, e, v};
}
function stComment(ta){
  const {a, b, s, e, v} = stSelLines(ta);
  const partial = e > s && (s > a + (v.slice(a).match(/^[ \t]*/)[0].length) || (e < b && v.slice(e, b).trim())) ;
  if(e > s && partial){                                             // part of a line or lines: (* *)
    const mid = v.slice(s, e);
    stReplace(ta, s, e, `(*${mid}*)`, s, s + mid.length + 4); return;
  }
  const lines = v.slice(a, b).split("\n");
  const ind = Math.min(...lines.filter(l => l.trim()).map(l => l.match(/^[ \t]*/)[0].length).concat([1e9]));
  const out = lines.map(l => l.trim() ? l.slice(0, ind === 1e9 ? 0 : ind) + "//" + l.slice(ind === 1e9 ? 0 : ind) : l).join("\n");
  stReplace(ta, a, b, out, a, a + out.length);
}
function stUncomment(ta){
  const {a, b, v} = stSelLines(ta);
  const lines = v.slice(a, b).split("\n");
  if(lines.some(l => /^\s*\/\//.test(l))){
    const out = lines.map(l => l.replace(/^(\s*)\/\/ ?/, "$1")).join("\n");
    stReplace(ta, a, b, out, a, a + out.length); return;
  }
  const c = ta.selectionStart, o = v.lastIndexOf("(*", c), cl = v.indexOf("*)", Math.max(o, 0));
  if(o >= 0 && cl >= 0 && cl + 2 >= c && v.lastIndexOf("*)", c - 1) < o){
    const inner = v.slice(o + 2, cl);
    stReplace(ta, o, cl + 2, inner, o, o + inner.length); return;
  }
  log("Uncomment: no // lines and no (* *) block at the caret", "wrn");
}
function stIndentSel(ta, out){
  const {a, b} = stSelLines(ta);
  if(ta.selectionEnd === ta.selectionStart || !ta.value.slice(a, b).includes("\n")) ta.setSelectionRange(a, b === a ? b : b);
  stTab(ta, out);
}
function stCollapseAll(){
  const ta = $("stTa"); if(!ta || !window.ideFoldRanges) return;
  let guard = 0;
  for(;;){
    const lines = ta.value.split("\n"), r = ideFoldRanges(lines, ideFolds());
    const starts = Object.keys(r).map(Number).sort((x, y) => y - x);
    if(!starts.length || guard++ > 400) break;
    ideFold(starts[0]);
  }
}

/* change bar on top of the gutter that ide.js draws */
(function(){
  const _g = ideGutter;
  ideGutter = function(){
    _g();
    const E = S.edit, ta = $("stTa"), gut = $("stGut"); if(!E || !E.st || !E.direct || !ta || !gut) return;
    const changed = stChangedLines(E.base, E.text);
    changed.forEach(i => E.ever.add(i));
    const cur = E.text.split("\n"), green = S.stGreen[`${E.prog}/${E.routine}`] || new Set();
    const reals = ideRealLines(ta.value, ideFolds()), rows = gut.children, disp = ta.value.split("\n");
    for(let i = 0; i < rows.length; i++){
      const r0 = (reals[i] || 1) - 1, r1 = i + 1 < reals.length ? reals[i+1] - 1 : r0 + 1 + (window.ideHiddenLines ? ideHiddenLines(disp[i] || "", ideFolds()) : 0);
      let y = false, o = false, g = false;
      for(let r = r0; r < Math.max(r1, r0 + 1); r++){ if(changed.has(r)) y = true; else if(E.ever.has(r)) o = true; if(!changed.has(r) && green.has(cur[r])) g = true; }
      rows[i].classList.toggle("chg-y", y); rows[i].classList.toggle("chg-o", !y && o); rows[i].classList.toggle("chg-g", !y && !o && g);
    }
  };
})();

/* Accept Edits: remember which lines were changed (green) */
(function(){
  const _fin = stFinalize;
  stFinalize = async function(){
    const E = S.edit, key = E ? `${E.prog}/${E.routine}` : "";
    let lines = null;
    if(E && E.direct){ const ch = stChangedLines(E.base, E.text), cur = E.text.split("\n"); lines = new Set([...ch].map(i => cur[i]).filter(x => x && x.trim())); }
    const r = await _fin.apply(this, arguments);
    if(lines && !(S.edit && S.edit===E)){ S.stGreen[key] = lines; delete S.stDrafts[key]; renderTabs(); if(window.ideGutter) ideGutter(); }
    return r;
  };
  const _can = stCancelAsk;
  stCancelAsk = async function(){
    const E = S.edit; if(E && E.direct) delete S.stDrafts[`${E.prog}/${E.routine}`];
    const r = await _can.apply(this, arguments);
    if(E && E.direct && S.edit===E && !stDirty(E)) { S.edit = null; renderST(); }
    return r;
  };
  /* Accept stays off while nothing changed */
  const _p = stPaint;
  stPaint = function(){ _p(); const E = S.edit, f = $("stFinal"); if(E && E.direct && f) f.disabled = !(E.checked && E.valid && stDirty(E)); };
})();

/* leaving a directly edited routine keeps its draft: no question */
(function(){
  const _leave = leaveEdit;
  leaveEdit = async function(nextId, closing){
    const E = S.edit;
    if(E && E.st && E.direct){
      const id = `r:${E.prog}/${E.routine}`;
      if(closing && nextId===id){
        if(stDirty(E)){
          const a = await dialog({title:"Unaccepted edits", body:`<p>${esc(E.prog)}/${esc(E.routine)} has edits that were not accepted. Close it and keep them for later in this session?</p>`,
             buttons:[["Keep open","cancel"],["Discard","discard"],["Close","ok","pri"]]});
          if(a==="cancel") return false;
          if(a==="discard") delete S.stDrafts[`${E.prog}/${E.routine}`];
        }
      }
      if((closing && nextId===id) || (!closing && String(nextId||"").startsWith("r:") && nextId!==id)) S.edit = null;
      return true;
    }
    return _leave.apply(this, arguments);
  };
  const _tabs = renderTabs;
  renderTabs = function(){
    _tabs();
    const E = S.edit, eid = E && E.st && E.direct ? `r:${E.prog}/${E.routine}` : null;
    document.querySelectorAll("#tabs .tab").forEach(el => {
      const id = el.dataset.id || "", first = el.firstChild; if(!first || first.nodeType!==3 || !id.startsWith("r:")) return;
      const draft = !!S.stDrafts[id.slice(2)];
      if(id!==eid && !draft) return;
      const t = S.tabs.find(x => x.id===id); if(!t) return;
      const dirty = id===eid ? stDirty(E) : draft;
      first.textContent = t.title + (dirty ? " * " : " ");
    });
  };
  addEventListener("beforeunload", (e) => { if(Object.keys(S.stDrafts).length){ e.preventDefault(); e.returnValue = ""; } });
})();

/* ---------- completion option, snippets ---------- */
(function(){
  const _open = stComplOpen;
  stComplOpen = function(ta, auto){ if(auto && !S.stAutoCompl) return; return _open.apply(this, arguments); };
  window.stComplOpen = stComplOpen;
  if(typeof IDE_SNIP!=="undefined"){
    IDE_SNIP.ELSIF = (i) => `ELSIF bool_expression THEN\n${i}    statement;`;
    IDE_SNIP["#REGION"] = (i) => `#region region_text\n${i}statement;\n${i}#endregion`;
    IDE_PH.add("REGION_TEXT");
  }
  const _tab = stTab;
  stTab = function(ta, shift){
    const v = ta.value, s = ta.selectionStart, e = ta.selectionEnd;
    if(shift && !(e > s && v.slice(s, e).includes("\n"))){            // Shift+Tab: previous placeholder
      let from = v.lastIndexOf("\n", s - 1); for(let k = 0; k < 8 && from > 0; k++) from = v.lastIndexOf("\n", from - 1);
      let best = null, ph;
      const re = /[A-Za-z_][A-Za-z0-9_]*/g; re.lastIndex = Math.max(0, from);
      while((ph = re.exec(v)) && ph.index < s){ if(IDE_PH.has(ph[0].toUpperCase()) && !stKnownRoot(ph[0], S.R.prog)) best = [ph.index, ph.index + ph[0].length]; }
      if(best){ ta.setSelectionRange(best[0], best[1]); return; }
    }
    return _tab(ta, shift);
  };
  /* Enter or Esc on a selected placeholder leaves the snippet */
  document.addEventListener("keydown", (e) => {
    const ta = e.target; if(!ta || ta.id!=="stTa" || !(e.key==="Enter" || e.key==="Escape") || e.ctrlKey || e.altKey || S.stCompl) return;
    const s = ta.selectionStart, en = ta.selectionEnd; if(en <= s) return;
    if(!IDE_PH.has(ta.value.slice(s, en).toUpperCase())) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if(e.key==="Escape"){ ta.setSelectionRange(s, s); return; }
    let le = ta.value.indexOf("\n", en); if(le < 0) le = ta.value.length;
    ta.setSelectionRange(le, le);
  }, true);
})();

/* ---------- inline values and whitespace markers in the colours layer ---------- */
function stValsOn(){ return S.stValsMode==="always" || (S.stValsMode==="run" && (S.state||{}).mode==="RUN"); }
(function(){
  const _hi = stHighlight;
  const PATH = /[A-Za-z_]\w*(?:\[[^\]\n]*\])?(?:\.[A-Za-z_0-9]\w*(?:\[[^\]\n]*\])?)*/g;
  stHighlight = function(text, prog, issues){
    let html = _hi(text, prog, issues);
    if(S.stWs) html = html.split(/(<[^>]+>)/).map(p => p.startsWith("<") ? p : p.replace(/ /g, '<span class="ws-sp"> </span>').replace(/\t/g, '<span class="ws-tb">\t</span>')).join("");
    if(stValsOn() && $("stTa")){
      const lines = html.replace(/\n$/, "").split("\n"), src = text.split("\n");
      html = lines.map((h, i) => {
        const code = (src[i] || "").replace(/\/\/.*$/, "").replace(/\(\*.*?\*\)/g, "").replace(/\/\*.*?\*\//g, "").replace(/'[^']*'/g, "''");
        const seen = new Set(), parts = [];
        let m; PATH.lastIndex = 0;
        while((m = PATH.exec(code)) && parts.length < 4){
          const w = m[0], root = w.split(/[.\[]/)[0].toUpperCase();
          if(code[m.index - 1]==="." || ST_KW.has(root) || stIsFunc(root) || IDE_PH.has(root) || seen.has(w) || /^\d/.test(w)) continue;
          seen.add(w);
          const a = aoiAddr(S.R.prog, w), v = a ? valueAt(a) : undefined;
          if(v===undefined || (typeof v==="object" && v!==null)) continue;
          parts.push(`${esc(w)} = ${esc(fmtVal(a, v))}`);
        }
        return parts.length ? h + `<span class="st-iv">${parts.join("   ")}</span>` : h;
      }).join("\n") + "\n";
    }
    return html;
  };
})();

/* ======================================================================
   Ladder
   ====================================================================== */
/* dirty instructions in the rung editor: * after a changed or new instruction */
(function(){
  const sig = (n) => `${String(n.name).toUpperCase()}(${(n.args||[]).join(",")})`;
  const mark = () => {
    const E = S.edit; if(!E || E.st || E.textMode || !E.sig) return;
    document.querySelectorAll("#erung .ins[data-nid]").forEach(el => {
      const f = findNode(+el.dataset.nid), n = f && f.node; if(!n || n.kind==="branch") return;
      const dirty = E.sig[n._id] !== sig(n);
      el.classList.toggle("dirty", dirty);
      let d = el.querySelector(":scope > .dmark");
      if(dirty && !d){ d = document.createElement("b"); d.className = "dmark"; d.textContent = "*"; d.title = "Changed in this edit"; el.appendChild(d); }
      if(!dirty && d) d.remove();
    });
  };
  const record = () => { const E = S.edit; if(!E || E.st) return; E.sig = {}; if(E.mode==="edit") instrOrder(E.tree).forEach(n => { E.sig[n._id] = sig(n); }); mark(); };
  const _se = startEdit; startEdit = function(){ const r = _se.apply(this, arguments); record(); return r; };
  const _si = startInsert; startInsert = function(){ const r = _si.apply(this, arguments); record(); return r; };
  const _re = renderEditor; renderEditor = function(){ const r = _re.apply(this, arguments); mark(); return r; };
})();

/* double-click a blue value in a block: write the tag in place */
window.addEventListener("dblclick", (e) => {
  const lv = e.target.closest && e.target.closest(".ladder .rung[data-n] .box .lv");
  if(!lv || !lv.dataset.a) return;
  e.preventDefault(); e.stopImmediatePropagation();
  lvEdit(lv);
}, true);
function lvEdit(lv){
  const old = $("lvEdit"); if(old) old.remove();
  const addr = lv.dataset.a, r = lv.getBoundingClientRect();
  const inp = document.createElement("input"); inp.id = "lvEdit"; inp.spellcheck = false;
  const v = valueAt(addr); inp.value = v===undefined ? "" : (typeof v==="boolean" ? (v ? "1" : "0") : String(v));
  inp.title = `${addr}: Enter writes the value to the tag · Esc cancels`;
  inp.style.left = Math.max(2, r.right - 112) + "px"; inp.style.top = (r.top - 2) + "px";
  document.body.appendChild(inp); inp.focus(); inp.select();
  let done = false;
  const close = () => { done = true; inp.remove(); };
  inp.onkeydown = async (e) => {
    e.stopPropagation();
    if(e.key==="Escape"){ e.preventDefault(); close(); }
    if(e.key==="Enter"){ e.preventDefault(); const raw = inp.value.trim(); close(); if(raw!=="") await write(addr, raw); }
  };
  inp.onblur = () => { if(!done) setTimeout(close, 0); };
}

/* instruction properties dialog: operands, live values of value operands (written at
   once on Apply), members of timers, counters and control structures */
const IP_MEMBERS = {TIMER:["PRE","ACC","EN","TT","DN"], COUNTER:["PRE","ACC","CU","CD","DN","OV","UN"],
  CONTROL:["LEN","POS","EN","EU","DN","EM","ER","UL","IN","FD"], FBD_TIMER:["PRE","ACC","EN","TT","DN"]};
const IP_RO = new Set(["EN","TT","DN","CU","CD","OV","UN","EU","EM","ER","UL","IN","FD"]);
async function instrProps(n, iid){
  const ins = lxInstrs(n)[iid]; if(!ins) return;
  const sp = spec(ins.name), ops = sp ? sp.operands : ins.args.map((_, k) => ({name:`Operand ${k+1}`}));
  const rows = [], vals = [], PHANTOM = {PRESET:"PRE", ACCUM:"ACC"};
  const base0 = ins.args[0] && ins.args[0]!=="?" ? aoiAddr(S.R.prog, ins.args[0]) : null;
  const t0 = base0 ? String((findDef(base0) || {}).type || "").replace(/\[.*$/, "").toUpperCase() : "";
  const phantom = !!IP_MEMBERS[t0], shownMembers = new Set();
  if(phantom) ins.args.forEach((arg, k) => { const o = ops[Math.min(k, ops.length - 1)] || {}, m = PHANTOM[String(o.name||"").toUpperCase()]; if(m && (arg==="?" || arg==="")) shownMembers.add(m); });
  ins.args.forEach((arg, k) => {
    const o = ops[Math.min(k, ops.length - 1)] || {};
    const ph = phantom && (arg==="?" || arg==="") && PHANTOM[String(o.name||"").toUpperCase()];
    if(ph) shownMembers.add(ph);
    const addr = ph ? `${base0}.${ph}` : (arg && arg!=="?" && !/^[-+]?\d/.test(arg) ? aoiAddr(S.R.prog, arg) : null);
    const def = addr && !ph ? findDef(addr) : null, type = ph ? "DINT" : ((def && def.type) || (o.types || [])[0] || "");
    const v = addr ? valueAt(addr) : undefined, atomic = v!==undefined && (typeof v!=="object" || v===null);
    rows.push(`<tr><td>${esc(o.name || "")}</td><td><input data-op="${k}" value="${esc(arg)}" spellcheck="false" list="tagList"></td>
      <td class="ro">${esc(String(type).replace(/\[.*$/, ""))}</td>
      <td>${atomic ? `<input data-val="${esc(addr)}" value="${esc(typeof v==="boolean" ? (v?1:0) : v)}"> ` : ""}</td></tr>`);
    const base = String(type).replace(/\[.*$/, "").toUpperCase();
    if(addr && IP_MEMBERS[base]) IP_MEMBERS[base].forEach(m => {
      const a = `${addr}.${m}`, mv = valueAt(a); if(mv===undefined || shownMembers.has(m)) return;
      vals.push(`<tr><td>.${m}</td><td class="ro">${esc(arg)}.${m}</td><td class="ro">${IP_RO.has(m) ? "BOOL" : "DINT"}</td>
        <td>${IP_RO.has(m) ? `<span class="ro">${mv ? 1 : 0}</span>` : `<input data-val="${esc(a)}" value="${esc(mv)}"> `}</td></tr>`);
    });
  });
  const editable = lxEditable();
  const body = `<div id="ipDlg"><p class="notice-small">Rung ${n} · ${esc(sp ? sp.title : ins.name)}. Values with <span class="arrow">←</span> are written to the tag when you press Apply or OK; operand changes edit the rung.</p>
    <table><tr><th style="width:22%">Parameter</th><th>Operand</th><th style="width:14%">Type</th><th style="width:22%">Value <span class="arrow">←</span></th></tr>${rows.join("")}${vals.join("")}</table></div>`;
  fillLists(S.R.prog);
  await dialog({title:`${ins.name} Properties`, body, stay:["apply"], buttons:[["Cancel","cancel"],["Apply","apply"],["OK","ok","pri"]],
    onOpen: () => { const f = document.querySelector('#ipDlg input'); if(f){ f.focus(); f.select(); } },
    onSubmit: async () => {
      for(const i of document.querySelectorAll("#ipDlg input[data-val]")){
        const a = i.dataset.val, cur = valueAt(a), shown = typeof cur==="boolean" ? (cur?"1":"0") : String(cur);
        if(i.value.trim()!=="" && i.value.trim()!==shown){ const r = await req({op:"write", values:{[a]: i.value.trim()}}); if(r && r.ok===false) return `${a}: ${Object.values(r.errors||{}).join("; ")}`; log(`${a} = ${i.value.trim()}`, "ok"); }
      }
      const newArgs = [...document.querySelectorAll("#ipDlg input[data-op]")].map(i => i.value.trim() || "?");
      if(newArgs.join("\u0001")!==ins.args.join("\u0001")){
        if(!editable) return "This routine cannot be edited here";
        const rung = S.R.data.rungs[n], tree = cloneTree(rung.tree), node = instrOrder(tree)[iid];
        node.args = newArgs;
        try { await api("POST","/api/studio/edit/rung",{program:S.R.prog, routine:S.R.routine, op:"replace", index:n, text:serialize(tree), comment:rung.comment||"", version:S.R.data.version});
              log(`Rung ${n}: ${ins.name} operands changed`, "ok"); await reloadRoutine(); }
        catch(err){ const iss = err.data && err.data.issues ? err.data.issues.filter(x=>x.severity==="error").map(x=>x.message).join("; ") : ""; return iss || err.message; }
      }
    }});
}
/* the … button on blocks, and the instruction menu */
(function(){
  const _a = window.lxAfterRender;
  window.lxAfterRender = function(){
    if(_a) _a();
    document.querySelectorAll("#doc .ladder > .rung[data-n] .ins[data-iid] > .box > .bt").forEach(bt => {
      if(bt.querySelector(".cfg")) return;
      const b = document.createElement("span"); b.className = "cfg"; b.textContent = "…"; b.title = "Instruction properties"; bt.appendChild(b);
    });
  };
  document.addEventListener("click", (e) => {
    const c = e.target.closest && e.target.closest(".ladder .box .bt .cfg"); if(!c) return;
    e.preventDefault(); e.stopPropagation();
    const ins = c.closest(".ins[data-iid]"), rd = c.closest(".rung[data-n]"); if(ins && rd) instrProps(+rd.dataset.n, +ins.dataset.iid);
  }, true);
  const extra = window.lxMenuExtra;
  window.lxMenuExtra = function(kind, n, iid, k){
    const base = extra ? extra(kind, n, iid, k) : [];
    if(kind==="instr" && iid!=null) return [["Instruction Properties…", () => instrProps(n, iid)], ...base];
    return base;
  };
})();
