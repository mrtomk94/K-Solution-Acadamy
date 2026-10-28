"use strict";
/* Studio Edition (1.0.0): the Structured Text editor, following the Logix Designer help
   (gap report rows S01-S44).
   - grey margin selects whole lines (S03); hovering an instruction shows its parameters,
     hovering a collapsed block previews it (S04, S20); split window (S05); INS / OVR
     (S06); Original / Pending / Test views with Test, Untest and Assemble Edits (S07)
   - ST Element toolbar in the toolbar band and the Add ST Element dialog (Alt+Insert)
     (S08, S09); New Tag with the instruction's data type (S11); Argument List dialog
     (S12); Save / Insert / Clear Instruction Defaults (S13); Browse Routines, Devices,
     Tasks / Programs / Modules (S15)
   - Toggle Current Outlining (Ctrl+M) besides Expand / Collapse All (S21); green wavy
     line under statements not yet verified, unknown tags marked once you leave the line
     (S24); a lone comment closer or bracket gets a green wavy line (S25)
   - indent mode None / Block / Smart, tab size and Keep Tabs (S28, S29); header template
     on new routines (S31); zoom in 25 % steps (S36); Find All, Trend, Tag Properties,
     Go To Called / Calling Routine at the caret (S38, S39)
   - Watch pane for the open routine (S41); Routine Properties show Verified and the
     number of lines (S42); 2048-character lines are refused (S43, server); bookmarks
     (S44). */

(function(){
  const css = document.createElement("style");
  css.id = "s5St";
  css.textContent = `
#doc:has(#stTool) .rhead{display:none}
.s5unv{text-decoration:underline wavy #00A000;text-decoration-skip-ink:none;text-underline-offset:2px}
.s5lone{text-decoration:underline wavy #00A000;text-decoration-skip-ink:none}
.st-u.s5later{text-decoration:none!important;color:inherit}
#s5Tip{position:fixed;z-index:90;background:#FFFFE1;border:1px solid #767676;padding:3px 7px;font:12px "Segoe UI",Tahoma,sans-serif;max-width:560px;white-space:pre-wrap;pointer-events:none;box-shadow:1px 2px 4px rgba(0,0,0,.2)}
#s5Tip code{font:12px Consolas,monospace}
#s5Tip pre{margin:2px 0 0;font:11px Consolas,monospace;max-height:260px;overflow:hidden}
.stgut>div.bm .gn{background:#2F6FD0;color:#FFFFFF}
.stgut .gn{cursor:default}
#stTool .s5vw{display:inline-flex;border:1px solid #A9B4CC}
#stTool .s5vw button{border:none!important;border-right:1px solid #A9B4CC!important;min-width:56px}
#stTool .s5vw button:last-child{border-right:none!important}
#stTool .s5vw button.on{background:#FFE8A6!important}
#stTool button.s5act{min-width:0;padding:0 6px;font-family:"Segoe UI",Tahoma,sans-serif}
.s5ro{border:1px solid #C0C0C0;margin:0 4px 4px;height:calc(100vh - 470px);min-height:220px;overflow:auto;background:#F7F7F7;position:relative}
.s5ro pre{margin:0;padding:6px 8px;font:13px/16px Consolas,monospace;white-space:pre}
.s5ro .s5rot{position:sticky;top:0;background:#FFE8A6;border-bottom:1px solid #E5C365;padding:2px 8px;font:12px "Segoe UI",Tahoma,sans-serif}
#stxBar .lxbtns button{font:11px Consolas,monospace!important}
#doc2 .s5st2{display:grid;grid-template-columns:46px 1fr;height:100%;min-height:80px}
#doc2 .s5st2 .g2{background:#F0F0F0;border-right:1px solid #C0C0C0;font:13px/16px Consolas,monospace;color:#707070;text-align:right;padding:6px 4px 6px 0;overflow:hidden;white-space:pre}
#doc2 .s5st2 .w2{position:relative;overflow:hidden}
#doc2 #stHi2{position:absolute;left:0;top:0;margin:0;padding:6px 8px;font:13px/16px Consolas,monospace;white-space:pre;pointer-events:none;min-width:100%;min-height:100%;box-sizing:border-box}
#doc2 #stTa2{position:absolute;inset:0;width:100%;height:100%;background:transparent;color:transparent;caret-color:#0041C2;border:none;outline:none;resize:none;padding:6px 8px;font:13px/16px Consolas,monospace;white-space:pre;overflow:auto;box-sizing:border-box}
#doc2 #stTa2::selection{background:rgba(51,153,255,.35)}
.s5arg table{border-collapse:collapse;width:100%;font-size:12px}
.s5arg th{background:#F0F0F0;text-align:left;font-weight:400;border:1px solid #C0C0C0;padding:2px 6px}
.s5arg td{border:1px solid #D3D3D3;padding:1px 4px}
.s5arg td input{width:100%;box-sizing:border-box;font:12px Consolas,monospace;border:1px solid transparent}
.s5arg td input:focus{border-color:#0041C2}
.s5arg td.miss input{background:#FFF0F0}
.wsel{display:flex;gap:6px;align-items:center;margin-bottom:4px;font-family:"Segoe UI",Tahoma,sans-serif}
`;
  document.head.appendChild(css);
})();

const stTa = () => $("stTa");
const stIsOpen = () => !!(S.R && S.R.data && S.R.data.type==="ST" && S.active===lxKey());
const stKey2 = () => S.R ? `${S.R.prog}/${S.R.routine}` : "";

/* ======================================================================
   geometry of the textarea: character under the pointer
   ====================================================================== */
function s5StMetrics(ta){
  const cs = getComputedStyle(ta);
  let cw = S.s5Cw; const font = cs.font;
  if(!cw || S.s5CwFont!==font){ const c = document.createElement("canvas").getContext("2d"); c.font = font; cw = S.s5Cw = c.measureText("MMMMMMMMMM").width / 10 || 7.2; S.s5CwFont = font; }
  return {cw, lh: parseFloat(cs.lineHeight) || 16, pl: parseFloat(cs.paddingLeft) || 8, pt: parseFloat(cs.paddingTop) || 6, tab: +S5O.stTabSize || 4};
}
function s5StIndexAt(ta, x, y){
  const m = s5StMetrics(ta), r = ta.getBoundingClientRect();
  const line = Math.floor((y - r.top - m.pt + ta.scrollTop) / m.lh); if(line < 0) return null;
  const lines = ta.value.split("\n"); if(line >= lines.length) return null;
  const want = (x - r.left - m.pl + ta.scrollLeft) / m.cw; if(want < 0) return null;
  let col = 0, i = 0; const l = lines[line];
  for(; i < l.length; i++){ const w = l[i]==="\t" ? m.tab - (col % m.tab) : 1; if(col + w > want) break; col += w; }
  if(i >= l.length) return null;
  let off = 0; for(let k = 0; k < line; k++) off += lines[k].length + 1;
  return {off: off + i, line, ch: l[i]};
}
function s5Tip(html, x, y){
  let t = $("s5Tip"); if(!html){ if(t) t.remove(); return; }
  if(!t){ t = document.createElement("div"); t.id = "s5Tip"; document.body.appendChild(t); }
  t.innerHTML = html; t.style.left = Math.min(x + 12, innerWidth - 400) + "px"; t.style.top = Math.min(y + 18, innerHeight - 60) + "px";
}
const S5_STFN = {ABS:["Source","Absolute value"], SQRT:["Source","Square root"], SIN:["Source","Sine (radians)"], COS:["Source","Cosine (radians)"],
  TAN:["Source","Tangent (radians)"], ASIN:["Source","Arc sine"], ACOS:["Source","Arc cosine"], ATAN:["Source","Arc tangent"], LN:["Source","Natural log"], LOG:["Source","Log base 10"],
  DEG:["Source","Radians to degrees"], RAD:["Source","Degrees to radians"], TRUNC:["Source","Truncate"], ATAN2:["Y, X","Arc tangent of Y / X"]};
function s5Sig(name){
  const u = name.toUpperCase(), sp = spec(u), aoi = sp ? null : aoiDef(u);
  if(!sp && !aoi && S5_STFN[u]) return `<code><b>${u}</b>(${esc(S5_STFN[u][0])})</code>\n${esc(S5_STFN[u][1])}`;
  if(sp) return `<code><b>${esc(sp.mnemonic)}</b>(${sp.operands.map(o => `${esc(o.name)}${o.types && o.types.length ? " : " + esc(o.types.slice(0, 3).join("/")) + (o.types.length > 3 ? "/…" : "") : ""}${o.optional ? "?" : ""}${o.repeat ? " …" : ""}`).join(", ")})</code>\n${esc(sp.title)}`;
  if(aoi) return `<code><b>${esc(aoi.name)}</b>(${[aoi.name + "_instance", ...aoi.call].map(esc).join(", ")})</code>\n${esc(aoi.description || "Add-On Instruction")}`;
  return "";
}

/* ======================================================================
   decorations on the editor (after every render of the ST routine)
   ====================================================================== */
S.s5Ovr = false; S.s5Verified = {}; S.s5Test = {}; S.s5StView = {};
function s5StDecorate(){
  const ta = stTa(); if(!ta || ta.dataset.s5) return;
  ta.dataset.s5 = "1";
  const E = S.edit, key = stKey2();
  if(S.s5Verified[key]==null && E) S.s5Verified[key] = E.base!=null ? E.base : E.text;
  /* hover: instruction parameters, collapsed block preview */
  ta.addEventListener("mousemove", (e) => {
    clearTimeout(S.s5TipT);
    S.s5TipT = setTimeout(() => {
      const at = s5StIndexAt(ta, e.clientX, e.clientY); if(!at){ s5Tip(null); return; }
      if(IDE_HAS_SENT.test(at.ch)){ const f = ideFolds()[at.ch.charCodeAt(0) - IDE_SENT]; if(f){ const body = ideExpand(f.body).replace(/^\n/, "").split("\n");
        s5Tip(`${body.length} hidden line(s)<pre>${esc(body.slice(0, 18).join("\n"))}${body.length > 18 ? "\n…" : ""}</pre>`, e.clientX, e.clientY); return; } }
      const w = stWordAt(ta.value, at.off + 1); const word = (w.w || "").replace(/^.*\./, "");
      if(word && /^\s*\(/.test(ta.value.slice(w.b, w.b + 30)) && (spec(word) || aoiDef(word) || S5_STFN[word.toUpperCase()])){ s5Tip(s5Sig(word), e.clientX, e.clientY); return; }
      s5Tip(null);
    }, 350);
  });
  ta.addEventListener("mouseleave", () => { clearTimeout(S.s5TipT); s5Tip(null); });
  ta.addEventListener("keydown", s5StKeys, true);
  ta.addEventListener("scroll", () => s5Tip(null));
  /* margin: click selects the line, drag selects lines, Shift+click extends */
  const gut = $("stGut");
  if(gut && !gut.dataset.s5){
    gut.dataset.s5 = "1";
    const lineAt = (y) => { const m = s5StMetrics(ta), r = gut.getBoundingClientRect(); return Math.max(0, Math.floor((y - r.top - 6 + gut.scrollTop) / m.lh)); };
    const range = (a, b) => { const lines = ta.value.split("\n"), lo = Math.min(a, b), hi = Math.min(Math.max(a, b), lines.length - 1);
      let s = 0; for(let k = 0; k < lo; k++) s += lines[k].length + 1; let e = s; for(let k = lo; k <= hi; k++) e += lines[k].length + 1; return [s, Math.min(e, ta.value.length)]; };
    gut.addEventListener("mousedown", (e) => {
      if(e.target.closest(".gf") && e.target.closest(".gf").textContent) return;
      e.preventDefault();
      const a = e.shiftKey && S.s5GutA!=null ? S.s5GutA : lineAt(e.clientY); S.s5GutA = a;
      const sel = (b) => { const [s, en] = range(a, b); ta.focus(); ta.setSelectionRange(s, en); };
      sel(lineAt(e.clientY));
      const mv = (ev) => sel(lineAt(ev.clientY)), up = () => { removeEventListener("mousemove", mv); removeEventListener("mouseup", up); };
      addEventListener("mousemove", mv); addEventListener("mouseup", up);
    });
  }
  s5StTool();
  s5StStatus();
}
function s5StAfterOptions(){ if(S.stPaintHi) S.stPaintHi(); if(window.ideGutter) ideGutter(); }
window.s5StAfterOptions = s5StAfterOptions;

/* ---------- keys: INS / OVR, Tab size, Ctrl+M, bookmarks, Alt+Insert ---------- */
function s5StKeys(e){
  const ta = e.target, ctrl = e.ctrlKey || e.metaKey;
  if(e.key==="Insert" && !ctrl && !e.altKey && !e.shiftKey){ e.preventDefault(); S.s5Ovr = !S.s5Ovr; s5StStatus(); return; }
  if(e.key==="Insert" && e.altKey){ e.preventDefault(); e.stopImmediatePropagation(); s5AddStElement(); return; }
  if(ctrl && (e.key==="m" || e.key==="M") && !e.altKey){ e.preventDefault(); e.stopImmediatePropagation(); s5ToggleOutline(); return; }
  if(e.key==="F2" && ctrl && !e.shiftKey){ e.preventDefault(); s5StBm("toggle"); return; }
  if(e.key==="F2" && e.shiftKey && !ctrl){ e.preventDefault(); s5StBm(1); return; }
  if(e.key==="F2" && e.shiftKey && ctrl){ e.preventDefault(); s5StBm(-1); return; }
  /* overtype: a typed character replaces the one after the caret */
  if(S.s5Ovr && !ctrl && !e.altKey && e.key.length===1 && ta.selectionStart===ta.selectionEnd && !S.stCompl){
    const i = ta.selectionStart, nx = ta.value[i]; if(nx && nx!=="\n" && !IDE_HAS_SENT.test(nx)) ta.setSelectionRange(i, i + 1);
  }
  /* Tab with the chosen size / tabs */
  if(e.key==="Tab" && !ctrl && !e.altKey && !S.stCompl){
    const unit = S5O.stKeepTabs ? "\t" : " ".repeat(Math.max(1, Math.min(20, +S5O.stTabSize || 4)));
    if(unit==="    " && !S5O.stKeepTabs) return;                 // the default: snippets / placeholders handle it
    const v = ta.value, s = ta.selectionStart, en = ta.selectionEnd;
    const multi = en > s && v.slice(s, en).includes("\n");
    const info = stLineInfo(ta), w = info.before.trim().toUpperCase();
    if(!multi && !e.shiftKey && ((IDE_SNIP[w] && info.line.trim().toUpperCase()===w) || IDE_PH.has(v.slice(s, en).toUpperCase()))) return;
    if(!multi && !e.shiftKey){ let end = s; for(let k = 0; k < 7 && end >= 0; k++) end = v.indexOf("\n", end + 1); if(idePhAt(v, s, end < 0 ? null : end)) return; }
    e.preventDefault(); e.stopImmediatePropagation();
    const ls = v.lastIndexOf("\n", s - 1) + 1; let le = v.indexOf("\n", Math.max(s, en - (en > s && v[en - 1]==="\n" ? 1 : 0))); if(le < 0) le = v.length;
    const strip = new RegExp(`^( {1,${unit.length===1 && unit!=="\t" ? 1 : (+S5O.stTabSize || 4)}}|\\t)`);
    if(multi || e.shiftKey){
      const lines = v.slice(ls, le).split("\n");
      const out = lines.map(l => e.shiftKey ? l.replace(strip, "") : (l.length ? unit + l : l)).join("\n");
      stReplace(ta, ls, le, out, multi ? ls : Math.max(ls, s - (v.slice(ls, le).length - out.length)), multi ? ls + out.length : null);
    } else stReplace(ta, s, en, unit);
  }
}
/* indent mode for Enter */
(function(){
  const _en = stEnter;
  stEnter = function(ta){
    const mode = S5O.stIndent || "smart";
    if(mode==="smart") return _en.apply(this, arguments);
    const info = stLineInfo(ta);
    const ind = mode==="block" ? (info.line.match(/^[ \t]*/) || [""])[0] : "";
    stReplace(ta, ta.selectionStart, ta.selectionEnd, "\n" + ind);
  };
  const _ao = stAutoOutdent;
  stAutoOutdent = function(){ if((S5O.stIndent || "smart")!=="smart") return; return _ao.apply(this, arguments); };
})();

/* ---------- Toggle Current Outlining ---------- */
function s5ToggleOutline(){
  const ta = stTa(); if(!ta) return;
  const lines = ta.value.split("\n"), cur = ta.value.slice(0, ta.selectionStart).split("\n").length - 1;
  if(IDE_HAS_SENT.test(lines[cur] || "")){ ideUnfold(cur); return; }
  const ranges = ideFoldRanges(lines, ideFolds());
  let best = null; for(const k of Object.keys(ranges).map(Number)) if(k <= cur && ranges[k].end >= cur && (best==null || k > best)) best = k;
  if(best==null){ statusMsg && statusMsg("No outlined block at the caret", "warning"); return; }
  ideFold(best);
}

/* ---------- bookmarks ---------- */
function s5StBmKey(){ return `BMST:${(S.project && S.project.name) || ""}:${stKey2()}`; }
function s5StBmList(){ try { return JSON.parse(lsGet(s5StBmKey()) || "[]"); } catch(e){ return []; } }
function s5StBm(cmd){
  const ta = stTa(); if(!ta) return;
  const reals = ideRealLines(ta.value, ideFolds()), disp = ta.value.slice(0, ta.selectionStart).split("\n").length - 1, line = reals[disp] || 1;
  let l = s5StBmList();
  if(cmd==="toggle"){ l = l.includes(line) ? l.filter(x => x!==line) : [...l, line].sort((a, b) => a - b); lsSet(s5StBmKey(), JSON.stringify(l)); log(l.includes(line) ? `Bookmark set on line ${line}` : `Bookmark removed from line ${line}`); ideGutter(); return; }
  if(cmd==="clear"){ lsSet(s5StBmKey(), "[]"); ideGutter(); return; }
  if(!l.length){ log("No bookmarks in this routine", "wrn"); return; }
  const to = cmd > 0 ? (l.find(n => n > line) ?? l[0]) : ([...l].reverse().find(n => n < line) ?? l[l.length - 1]);
  stGoLine(to, 1);
}
(function(){
  const _g = ideGutter;
  ideGutter = function(){
    _g.apply(this, arguments);
    const ta = stTa(), gut = $("stGut"); if(!ta || !gut) return;
    const bm = new Set(s5StBmList()); if(!bm.size){ gut.querySelectorAll(".bm").forEach(x => x.classList.remove("bm")); return; }
    const reals = ideRealLines(ta.value, ideFolds());
    [...gut.children].forEach((row, i) => row.classList.toggle("bm", bm.has(reals[i])));
  };
})();

/* ======================================================================
   S24 / S25: statements not yet verified, lone delimiters, tags on leaving the line
   ====================================================================== */
(function(){
  const _hi = stHighlight;
  stHighlight = function(text, prog, issues){
    let html = _hi.apply(this, arguments);
    const ta = stTa(); const E = S.edit;
    if(!ta || !E || !E.st || text!==ta.value) return html;
    /* lone comment closers and closing brackets */
    let depth = 0, inC = false;
    html = html.split(/(<[^>]+>)/).map(p => {
      if(p.startsWith("<")){ if(/^<span class="st-(c|s)\b/.test(p)) inC = true; else if(p==="</span>") inC = false; return p; }
      if(inC) return p;
      return p.replace(/\*\)|\*\/|\(|\)/g, (m) => { if(m==="(") { depth++; return m; } if(m===")"){ if(depth > 0){ depth--; return m; } return `<span class="s5lone" title="No matching (">)</span>`; }
        return `<span class="s5lone" title="No matching comment start">${esc(m)}</span>`; });
    }).join("");
    /* lines changed since the routine was last verified: green wavy line; the caret line
       keeps unknown tags unmarked until the caret leaves it */
    const base = S.s5Verified[stKey2()];
    const disp = text.split("\n"), reals = ideRealLines(text, ideFolds()), full = (E.text || "").split("\n");
    const changed = base!=null && window.stChangedLines ? stChangedLines(base, E.text || "") : new Set();
    const caret = text.slice(0, ta.selectionStart).split("\n").length - 1;
    const rows = html.replace(/\n$/, "").split("\n");
    html = rows.map((h, i) => {
      /* built-in functions are functions, a JSR's first argument is a routine name */
      h = h.replace(/<span class="st-u">([A-Za-z_]\w*)<\/span>(\s*\()/g, (m, w, p) => S5_STFN[w.toUpperCase()] ? `<span class="st-f">${w}</span>${p}` : m);
      h = h.replace(/(<span class="st-[kf]">JSR<\/span>\s*\(\s*)<span class="st-u">([A-Za-z_]\w*)<\/span>/gi, (m, a, w) => `${a}<span class="st-t s5rt" title="routine">${w}</span>`);
      if(i===caret) h = h.replace(/class="st-u/g, 'class="s5later st-u');
      const r0 = (reals[i] || 1) - 1;
      if(changed.has(r0) && (full[r0] || "").trim() && !/^\s*(\/\/|\(\*)/.test(full[r0] || "")) h = `<span class="s5unv" title="Not verified yet: Verify Routine or Accept Edits checks it">${h}</span>`;
      return h;
    }).join("\n") + "\n";
    return html;
  };
  /* the caret moving to another line repaints (tags of the line just left get marked) */
  document.addEventListener("selectionchange", () => { const ta = stTa(); if(!ta || document.activeElement!==ta) return;
    const l = ta.value.slice(0, ta.selectionStart).split("\n").length; if(l!==S.s5CaretLine){ S.s5CaretLine = l; if(S.stPaintHi) S.stPaintHi(); } s5StStatus(); });
  /* verified: Accept Edits or Verify Routine with no errors */
  const _fin = stFinalize;
  stFinalize = async function(){ const E = S.edit, key = E ? `${E.prog}/${E.routine}` : "", txt = E && E.text; const r = await _fin.apply(this, arguments);
    if(E && !(S.edit && S.edit===E && S.edit.text!==S.edit.base)){ S.s5Verified[key] = txt; s5MarkVer(E.prog, E.routine, true); if(S.stPaintHi) S.stPaintHi(); } return r; };
  const _vs = verifyScope;
  verifyScope = async function(filt){
    const r = await _vs.apply(this, arguments);
    const progs = s5AllPrograms().filter(p => !filt || p.name===filt.program);
    progs.forEach(p => p.routines.forEach(rt => { if(filt && filt.routine && rt.name!==filt.routine) return;
      const bad = S.errors.some(e => e.sev==="error" && e.program===p.name && (!e.routine || e.routine===rt.name));
      s5MarkVer(p.name, rt.name, !bad);
      const E = S.edit; if(!bad && E && E.st && E.prog===p.name && E.routine===rt.name){ S.s5Verified[`${p.name}/${rt.name}`] = E.text; } }));
    /* the open routine's pending text is what Verify Routine checks in Studio */
    const E = S.edit;
    if(E && E.st && E.direct && (!filt || (filt.program===E.prog && (!filt.routine || filt.routine===E.routine)))){
      try { const v = await api("POST", "/api/studio/validate/st", {program:E.prog, routine:E.routine, text:E.text});
        const errs = v.issues.filter(x => x.severity==="error");
        if(!errs.length) S.s5Verified[`${E.prog}/${E.routine}`] = E.text;
        if(v.issues.length && window.errorsFromIssues) errorsFromIssues(v.issues.map(x => ({...x, program:E.prog, routine:E.routine})), `Verify routine ${E.prog}/${E.routine} (pending edits)`);
        E.issues = v.issues; E.valid = v.ok; E.checked = true; stPaint();
      } catch(e){}
    }
    if(S.stPaintHi) S.stPaintHi();
    return r;
  };
})();
S.s5Ver = {};
async function s5MarkVer(prog, routine, ok){
  let ver = null; try { ver = (await api("GET", `/api/studio/routine/version?program=${encodeURIComponent(prog)}&routine=${encodeURIComponent(routine)}`)).version; } catch(e){}
  S.s5Ver[`${prog}/${routine}`] = {ok, ver};
}

/* ======================================================================
   S07: Original / Pending / Test, Test / Untest / Assemble Edits
   ====================================================================== */
function s5StTool(){
  const t = $("stTool"); if(!t || t.querySelector(".s5vw")) return;
  const key = stKey2(), view = S.s5StView[key] || "pending", tested = !!S.s5Test[key];
  t.insertAdjacentHTML("afterbegin", `<span class="s5vw" role="group" aria-label="View">
      <button type="button" data-vw="original" class="${view==="original"?"on":""}" title="Original: the logic the controller had before the pending or tested edits">Original</button>
      <button type="button" data-vw="pending" class="${view==="pending"?"on":""}" title="Pending: your edits (editable)">Pending</button>
      <button type="button" data-vw="test" class="${view==="test"?"on":""}" title="Test: the edits the controller is testing">Test</button></span>
    <button type="button" class="s5act" id="s5Tst" title="Test Edits: run the pending edits in the controller; Untest goes back to the original">${tested ? "Untest Edits" : "Test Edits"}</button>
    <button type="button" class="s5act" id="s5Asm" title="Assemble Edits: keep the tested edits and drop the original" ${tested ? "" : "disabled"}>Assemble Edits</button>
    <span class="sep"></span>
    <button type="button" class="s5act" data-st="elem" title="Add ST Element (Alt+Insert)">Add Element…</button>
    <button type="button" class="s5act" data-st="args" title="Argument List of the instruction at the caret">Arguments…</button>
    <span class="sep"></span>`);
  t.querySelectorAll("[data-vw]").forEach(b => b.onclick = () => s5StSetView(b.dataset.vw));
  $("s5Tst").onclick = () => S.s5Test[stKey2()] ? s5Untest() : s5TestEdits();
  $("s5Asm").onclick = () => s5Assemble();
  t.querySelector('[data-st="elem"]').onclick = (e) => { e.stopPropagation(); s5AddStElement(); };
  t.querySelector('[data-st="args"]').onclick = (e) => { e.stopPropagation(); s5ArgList(); };
  s5StSetView(view, true);
}
function s5StSetView(v, quiet){
  const key = stKey2(); S.s5StView[key] = v;
  document.querySelectorAll("#stTool [data-vw]").forEach(b => b.classList.toggle("on", b.dataset.vw===v));
  const sted = document.querySelector(".sted"); const old = document.querySelector(".s5ro"); if(old) old.remove();
  if(!sted) return;
  if(v==="pending"){ sted.style.display = ""; if(!quiet) stTa() && stTa().focus(); return; }
  const E = S.edit, T = S.s5Test[key];
  const text = v==="original" ? (T ? T.orig : (E ? E.base : S.R.data.text)) : (T ? T.tested : (S.R.data.text));
  const label = v==="original" ? (T ? "Original — the logic before the tested edits (read-only)" : "Original — the logic in the controller (read-only)")
                               : (T ? "Test — the edits the controller is testing (read-only)" : "Test — no edits are being tested; this is the logic in the controller (read-only)");
  sted.style.display = "none";
  const ro = document.createElement("div"); ro.className = "s5ro";
  ro.innerHTML = `<div class="s5rot">${esc(label)}</div><pre>${stHighlight(text, S.R.prog, null)}</pre>`;
  sted.after(ro);
}
async function s5TestEdits(){
  const E = S.edit, key = stKey2(); if(!E || !E.st){ return; }
  if(E.text===E.base){ log("Test Edits: there are no pending edits", "wrn"); return; }
  const orig = E.base, tested = E.text;
  try { await api("POST", "/api/studio/edit/st", {program:E.prog, routine:E.routine, text:tested, version:E.version}); }
  catch(e){ const iss = e.data && e.data.issues ? ": " + e.data.issues.filter(x => x.severity==="error").map(x => `line ${x.line}: ${x.message}`).slice(0, 3).join("; ") : ""; log(`Test Edits refused: ${e.message}${iss}`, "err"); return; }
  S.s5Test[key] = {orig, tested, prog:E.prog, routine:E.routine};
  log(`Testing the edits of ${key}: the controller runs them; Untest Edits goes back, Assemble Edits keeps them`, "ok");
  delete (S.stDrafts || {})[key]; S.edit = null; await reloadRoutine(); s5StSetView("test"); s5PaintOnline();
}
async function s5Untest(key){
  key = key || stKey2(); const T = S.s5Test[key]; if(!T) return;
  try { const v = (await api("GET", `/api/studio/routine?program=${encodeURIComponent(T.prog)}&routine=${encodeURIComponent(T.routine)}`)).version;
        await api("POST", "/api/studio/edit/st", {program:T.prog, routine:T.routine, text:T.orig, version:v}); }
  catch(e){ log(`Untest Edits: ${e.message}`, "err"); return; }
  delete S.s5Test[key]; log(`Untested: ${key} runs its original logic again; your edits are kept as pending`, "ok");
  S.stDrafts = S.stDrafts || {}; S.stDrafts[key] = {text:T.tested, base:T.orig};
  if(S.R && stKey2()===key){ S.edit = null; S.s5StView[key] = "pending"; await reloadRoutine(); }
  s5PaintOnline();
}
async function s5Assemble(key){
  key = key || stKey2(); if(!S.s5Test[key]) return;
  delete S.s5Test[key]; log(`Assembled: the tested edits of ${key} are kept`, "ok");
  if(S.R && stKey2()===key){ S.s5StView[key] = "pending"; S.edit = null; renderST(); }
  s5PaintOnline();
}
window.s5UntestAll = () => Object.keys(S.s5Test).forEach(k => s5Untest(k));
window.s5AssembleAll = () => Object.keys(S.s5Test).forEach(k => s5Assemble(k));

/* ======================================================================
   S08 / S09: ST Element toolbar and Add ST Element dialog
   ====================================================================== */
function s5StGroups(){
  const g = {Constructs: ["IF", "ELSIF", "CASE", "FOR", "WHILE", "REPEAT", "#REGION"]};
  for(const sp of Object.values(S.isa)){ if(!(sp.languages || []).includes("ST")) continue; (g[sp.family] ||= []).push(sp.mnemonic); }
  const aois = (S.project && S.project.aois || []).map(a => a.name); if(aois.length) g["Add-On"] = aois;
  for(const k in g) if(k!=="Constructs") g[k].sort();
  return g;
}
function s5StInsertText(m){
  const u = m.toUpperCase();
  if(IDE_SNIP[u]) return {snip:u};
  const sp = spec(u), aoi = sp ? null : aoiDef(u);
  const saved = s5Defaults()[u];
  const args = saved ? saved : sp ? sp.operands.filter(o => !o.optional || o.kind!=="imm").filter(o => !o.repeat || true).slice(0, 8).map(o => o.name.replace(/[^A-Za-z0-9_]/g, "_")) : aoi ? [aoi.name + "_instance", ...aoi.call] : [];
  return {text: `${sp ? sp.mnemonic : aoi ? aoi.name : m}(${args.join(", ")});`};
}
function s5StInsert(m){
  const ta = stTa(); if(!ta || S.s5StView[stKey2()] && S.s5StView[stKey2()]!=="pending"){ log("Switch to the Pending view to edit", "wrn"); return; }
  const x = s5StInsertText(m);
  ta.focus();
  if(x.snip){
    const info = stLineInfo(ta), ind = info.line.match(/^\s*/)[0];
    const txt = IDE_SNIP[x.snip](ind), at = info.line.trim() ? ta.selectionStart : info.ls + ind.length, prefix = info.line.trim() ? "\n" + ind : "";
    stReplace(ta, at, info.line.trim() ? ta.selectionEnd : info.le, prefix + txt);
    const ph = idePhAt(ta.value, at, at + prefix.length + txt.length); if(ph) ta.setSelectionRange(ph[0], ph[1]);
    return;
  }
  const s = ta.selectionStart; stReplace(ta, s, ta.selectionEnd, x.text);
  const p = ta.value.indexOf("(", s); const c = ta.value.indexOf(",", p), cl = ta.value.indexOf(")", p);
  if(p >= 0) ta.setSelectionRange(p + 1, c > p && c < cl ? c : cl);
}
function s5MountStBar(){
  const host = $("s5Lang"); if(!host || !stIsOpen()) return;
  const lb = host.querySelector("#lxBar"); if(lb) lb.remove();
  let bar = $("stxBar");
  const g = s5StGroups(); if(!g[S.s5StTab]) S.s5StTab = lsGet("StxTab") || "Constructs"; if(!g[S.s5StTab]) S.s5StTab = "Constructs";
  if(!bar){ bar = document.createElement("div"); bar.id = "stxBar"; bar.setAttribute("role", "toolbar"); bar.setAttribute("aria-label", "ST elements"); host.innerHTML = ""; host.appendChild(bar); }
  bar.innerHTML = `<div class="lxtabs" role="tablist">${Object.keys(g).map(k => `<button type="button" role="tab" data-sxt="${esc(k)}" class="${k===S.s5StTab?"on":""}">${esc(k)}</button>`).join("")}</div>
    <div class="lxbtns">${g[S.s5StTab].map(m => { const sp = spec(m); return `<button type="button" class="s5box" data-sx="${esc(m)}" draggable="true" title="${esc(m)}${sp ? " — " + esc(sp.title) : IDE_SNIP[m] ? " construct" : ""}\nClick or double-click: insert at the caret · drag into the code">${esc(m==="#REGION" ? "#region" : m)}</button>`; }).join("")}</div>`;
  bar.querySelectorAll("[data-sxt]").forEach(b => b.onclick = () => { S.s5StTab = b.dataset.sxt; lsSet("StxTab", S.s5StTab); s5MountStBar(); });
  bar.querySelectorAll("[data-sx]").forEach(b => {
    b.onmousedown = (e) => e.preventDefault();
    b.onclick = () => s5StInsert(b.dataset.sx);
    b.ondragstart = (e) => { const x = s5StInsertText(b.dataset.sx); e.dataTransfer.setData("text/plain", x.snip ? IDE_SNIP[x.snip]("") : x.text); e.dataTransfer.effectAllowed = "copy"; };
  });
}
window.s5MountStBar = s5MountStBar;
async function s5AddStElement(){
  const ta = stTa(); if(!ta){ log("Add ST Element: open a Structured Text routine", "wrn"); return; }
  const groups = s5StGroups(); let byGroup = lsGet("AeGroups")!=="0", pick = null;
  const all = Object.entries(groups).flatMap(([g, ms]) => ms.map(m => ({m, g})));
  const pos = [ta.selectionStart, ta.selectionEnd];
  const res = await dialog({title:"Add ST Element", buttons:[["Cancel","cancel"],["OK","ok","pri"]],
    body:`<div class="aeWrap"><div><input id="aeQ" placeholder="Type an instruction or construct…" spellcheck="false" style="width:100%" autocomplete="off">
      <label class="dim" style="display:block;margin:4px 0"><input type="checkbox" id="aeGrp" ${byGroup?"checked":""}> Show groups</label>
      <div class="aeList" id="aeList" tabindex="-1"></div></div><div class="aeHelp" id="aeHelp"></div></div>`,
    onOpen: () => {
      const q = $("aeQ"), list = $("aeList");
      const help = (m) => { const sp = spec(m), aoi = sp ? null : aoiDef(m);
        $("aeHelp").innerHTML = IDE_SNIP[m] ? `<b>${esc(m)}</b> construct<pre style="font-size:11px">${esc(IDE_SNIP[m](""))}</pre>`
          : sp ? `<b>${esc(sp.mnemonic)}</b> — ${esc(sp.title)}<div class="dim">${esc(sp.family)}</div><table>${sp.operands.map(o => `<tr><td>${esc(o.name)}${o.optional?" (optional)":""}</td><td class="dim">${esc((o.types||[]).join(", ") || o.kind)}</td></tr>`).join("")}</table>`
          : aoi ? `<b>${esc(aoi.name)}</b> — Add-On Instruction<p>${esc(aoi.description||"")}</p>` : ""; };
      const draw = () => {
        const t = q.value.trim().toUpperCase();
        let items = all.filter(x => !t || x.m.includes(t) || ((spec(x.m)||{}).title||"").toUpperCase().includes(t));
        items.sort((a, b) => (t ? (b.m.startsWith(t) - a.m.startsWith(t)) : 0) || (byGroup ? a.g.localeCompare(b.g) : 0) || a.m.localeCompare(b.m));
        if(t){ const ex = items.find(x => x.m===t) || items[0]; pick = ex ? ex.m : null; } else if(pick==null && items.length) pick = items[0].m;
        let html = "", last = null;
        for(const x of items){ if(byGroup && !t && x.g!==last){ html += `<div class="grp">${esc(x.g)}</div>`; last = x.g; }
          html += `<div data-m="${esc(x.m)}" class="${x.m===pick?"on":""}">${esc(x.m)} <span class="dim">${esc((spec(x.m)||{}).title || (IDE_SNIP[x.m] ? "construct" : "AOI"))}</span></div>`; }
        list.innerHTML = html || `<div class="dim">No match</div>`;
        const on = list.querySelector(".on"); if(on) on.scrollIntoView({block:"nearest"}); help(pick);
      };
      q.oninput = draw;
      q.onkeydown = (e) => { if(e.key!=="ArrowDown" && e.key!=="ArrowUp") return; e.preventDefault();
        const els = [...list.querySelectorAll("[data-m]")]; const i = els.findIndex(x => x.dataset.m===pick);
        const nx = els[Math.max(0, Math.min(els.length - 1, i + (e.key==="ArrowDown" ? 1 : -1)))]; if(nx){ pick = nx.dataset.m; els.forEach(x => x.classList.toggle("on", x===nx)); nx.scrollIntoView({block:"nearest"}); help(pick); } };
      list.onclick = (e) => { const d = e.target.closest("[data-m]"); if(!d) return; pick = d.dataset.m; list.querySelectorAll(".on").forEach(x => x.classList.remove("on")); d.classList.add("on"); help(pick); q.focus(); };
      list.ondblclick = (e) => { if(e.target.closest("[data-m]")) $("dlgBtns").querySelector("button.pri").click(); };
      $("aeGrp").onchange = () => { byGroup = $("aeGrp").checked; lsSet("AeGroups", byGroup ? "1" : "0"); draw(); };
      draw(); q.focus();
    }, onSubmit: () => pick ? null : "Choose an element"});
  if(res==="ok" && pick){ const t = stTa(); if(t){ t.focus(); t.setSelectionRange(pos[0], pos[1]); s5StInsert(pick); } }
}
window.s5AddStElement = s5AddStElement;

/* ======================================================================
   S12 / S13: Argument List, instruction defaults
   ====================================================================== */
function s5CallAt(ta){
  const v = ta.value, c = ta.selectionStart;
  /* the innermost NAME( … ) around the caret */
  let depth = 0;
  for(let i = c - 1; i >= 0; i--){
    const ch = v[i];
    if(ch===")") depth++;
    else if(ch==="("){ if(depth===0){ let j = i; while(j > 0 && /\s/.test(v[j - 1])) j--; let a = j; while(a > 0 && /[\w]/.test(v[a - 1])) a--;
        const name = v.slice(a, j); if(!name || ST_KW.has(name.toUpperCase())){ depth = 0; continue; }
        let d2 = 0, k = i + 1; for(; k < v.length; k++){ if(v[k]==="(") d2++; else if(v[k]===")"){ if(!d2) break; d2--; } }
        const inner = v.slice(i + 1, k), args = []; let cur = "", d3 = 0;
        for(const x of inner){ if(x==="(" || x==="[") d3++; else if(x===")" || x==="]") d3--; if(x==="," && !d3){ args.push(cur.trim()); cur = ""; } else cur += x; }
        if(cur.trim() || args.length) args.push(cur.trim());
        return {name, a, open:i, close:k, args}; }
      depth--; }
    else if(ch===";" && depth===0) break;
  }
  return null;
}
async function s5ArgList(){
  const ta = stTa(); if(!ta) return;
  const call = s5CallAt(ta); if(!call){ log("Argument List: put the caret inside an instruction call, for example TONR(MyTimer)", "wrn"); return; }
  const sp = spec(call.name), aoi = sp ? null : aoiDef(call.name);
  const params = sp ? sp.operands : aoi ? [{name:aoi.name + " instance", types:[aoi.name]}, ...aoi.call.map(p => ({name:p, types:[(aoi.parameters.find(x => x.name===p) || {}).type || ""]}))] : call.args.map((_, i) => ({name:`Argument ${i + 1}`, types:[]}));
  const n = Math.max(call.args.length, params.filter(o => !o.optional && !o.repeat).length);
  const rows = []; for(let i = 0; i < n; i++){ const o = params[Math.min(i, params.length - 1)] || {}; const v = call.args[i];
    const t = (o.types || []).join(" / ") || o.kind || "";
    rows.push(`<tr class="${!v || v==="?" ? "miss" : ""}"><td title="${esc(t)}">${esc(o.name || "")}${o.repeat ? " …" : ""}</td><td class="dim" style="font-size:11px">${esc(t.length > 30 ? t.slice(0, 28) + "…" : t)}</td><td><input data-i="${i}" value="${esc(v==null || v==="" ? "?" : v)}" list="tagList" spellcheck="false"></td></tr>`); }
  fillLists(S.R.prog);
  const res = await dialog({title:`Argument List - ${call.name}`, buttons:[["Cancel","cancel"],["Apply","apply"],["OK","ok","pri"]], stay:["apply"],
    body:`<div class="s5arg"><p class="notice-small">${esc(sp ? sp.title : aoi ? "Add-On Instruction" : "")}. Parameters in order; <b>?</b> marks a missing one. Hover a name for its data type.</p>
      <table><tr><th style="width:30%">Parameter</th><th style="width:22%">Data type</th><th>Argument</th></tr>${rows.join("")}</table>
      <p><button type="button" id="s5argAdd">Add argument</button></p></div>`,
    onOpen: () => { const f = document.querySelector(".s5arg input"); if(f){ f.focus(); f.select(); }
      $("s5argAdd").onclick = () => { const tb = document.querySelector(".s5arg table"), i = tb.querySelectorAll("input").length; tb.insertAdjacentHTML("beforeend", `<tr class="miss"><td>Argument ${i + 1}</td><td></td><td><input data-i="${i}" value="?" list="tagList"></td></tr>`); }; },
    onSubmit: () => {
      const vals = [...document.querySelectorAll(".s5arg input[data-i]")].map(i => i.value.trim() || "?");
      while(vals.length && vals[vals.length - 1]==="?" && vals.length > n) vals.pop();
      const cur = s5CallAt(ta) || call;
      stReplace(ta, cur.open + 1, cur.close, vals.join(", "));
      ta.setSelectionRange(cur.open + 1, cur.open + 1);
    }});
  return res;
}
function s5Defaults(){ try { return JSON.parse(lsGet("S5StDefaults") || "{}"); } catch(e){ return {}; } }
function s5SaveDefaults(){ const ta = stTa(), call = ta && s5CallAt(ta); if(!call){ log("Save Instruction Defaults: put the caret inside an instruction call", "wrn"); return; }
  const d = s5Defaults(); d[call.name.toUpperCase()] = call.args; lsSet("S5StDefaults", JSON.stringify(d)); log(`Defaults of ${call.name} saved: ${call.args.join(", ")}`, "ok"); }
function s5InsertDefaults(name){ const ta = stTa(); if(!ta) return; const u = (name || "").toUpperCase(), d = s5Defaults()[u];
  if(!d){ log(`${u || "This instruction"} has no saved defaults`, "wrn"); return; }
  const call = s5CallAt(ta);
  if(call && call.name.toUpperCase()===u){ stReplace(ta, call.open + 1, call.close, d.join(", ")); return; }
  stReplace(ta, ta.selectionStart, ta.selectionEnd, `${u}(${d.join(", ")});`); }
function s5ClearDefaults(name){ const d = s5Defaults(), u = (name || "").toUpperCase(); if(u) delete d[u]; else Object.keys(d).forEach(k => delete d[k]); lsSet("S5StDefaults", JSON.stringify(d)); log(u ? `Defaults of ${u} cleared` : "All instruction defaults cleared"); }

/* ======================================================================
   context menu additions (S11, S13, S15, S21, S38, S39)
   ====================================================================== */
(function(){
  const _menu = stEditMenu;
  stEditMenu = function(e, ta){
    const _show = showMenu;
    showMenu = function(ev, items, anc, opts){
      showMenu = _show;
      const w = stWordAt(ta.value, ta.selectionStart), word = w.w, root = (word || "").split(/[.\[]/)[0], u = (word || "").toUpperCase();
      const call = s5CallAt(ta), isTag = word && /^[A-Za-z_]/.test(word) && !ST_KW.has(u) && !stIsFunc(u);
      const known = isTag && stKnownRoot(root, S.R.prog), addr = isTag ? aoiAddr(S.R.prog, word) : null;
      const extra = [];
      /* New Tag with the data type the instruction wants */
      if(isTag && !known && call && call.args.length){
        const k = call.args.findIndex(a => a.split(/[.\[]/)[0]===root);
        if(k >= 0){ const typ = guessType(call.name, k);
          const i = items.findIndex(x => Array.isArray(x) && /^New Tag/.test(x[0]));
          const it = [`New Tag "${root}" (${typ})…`, () => newTagDialog({name:root, data_type:typ, onCreated: () => { S.stNames = null; stLoadNames(S.R.prog).then(() => S.stPaintHi && S.stPaintHi()); stValidate(); }}), !(S.project && S.project.authoring)];
          if(i >= 0) items.splice(i, 1, it); else extra.push(it); }
      }
      if(isTag && known && addr){
        extra.push([`Monitor "${word}"`, () => lxMonitor(addr)], [`Find All "${root}"`, () => { S.find.q = root; S.find.scope = "all"; runFind(true); }],
                   [`Trend "${word}"`, () => s5Trend(addr)], ["Tag Properties…", () => { const d = findDef(addr); if(d) tagPropertiesDialog(d); }, !findDef(addr) || !(S.project && S.project.authoring)]);
      }
      const jsr = call && call.name.toUpperCase()==="JSR" && call.args[0] ? call.args[0] : null;
      const nav = [["Go To Called Routine" + (jsr ? ` ${jsr}` : ""), () => openRoutine(S.R.prog, jsr), !jsr], ["Go To Calling Routine", () => s5GoCalling()]];
      const outl = [["Toggle Current Outlining", s5ToggleOutline, false, "Ctrl+M"], ["Expand All", () => ideUnfoldAll()], ["Collapse All", () => window.stCollapseAll && stCollapseAll()]];
      const ins = [["Add ST Element…", s5AddStElement, false, "Alt+Insert"], ["Argument List…", s5ArgList, !call],
        ["Browse Routines…", async () => { const p = await s5BrowseRoutines(); if(p) stReplace(ta, ta.selectionStart, ta.selectionEnd, p); }],
        ["Browse Tasks / Programs / Modules…", async () => { const p = await s5BrowseObjects(); if(p) stReplace(ta, ta.selectionStart, ta.selectionEnd, p); }],
        ["Browse Devices…", async () => { const p = await s5BrowseDevices(); if(p) stReplace(ta, ta.selectionStart, ta.selectionEnd, p); }]];
      const defs = call ? [["Save Instruction Defaults", s5SaveDefaults], ["Insert Instruction Defaults", () => s5InsertDefaults(call.name), !s5Defaults()[call.name.toUpperCase()]], ["Clear Instruction Defaults", () => s5ClearDefaults(call.name), !s5Defaults()[call.name.toUpperCase()]]] : [];
      const bm = [["Toggle Bookmark", () => s5StBm("toggle"), false, "Ctrl+F2"], ["Next Bookmark", () => s5StBm(1), false, "Shift+F2"], ["Previous Bookmark", () => s5StBm(-1), false, "Ctrl+Shift+F2"]];
      const all = [...items];
      const at = all.findIndex(x => Array.isArray(x) && /^Go To Matching/.test(x[0]));
      all.splice(at >= 0 ? at : all.length, 0, ...extra, ...(extra.length ? ["-"] : []));
      return _show(ev, [...all, "-", ...ins, ...(defs.length ? ["-", ...defs] : []), "-", ...nav, "-", ...outl, "-", ...bm], anc, opts);
    };
    try { return _menu.apply(this, arguments); } finally { showMenu = _show; }
  };
})();

/* ======================================================================
   S05: split window for Structured Text (two editors on the same text)
   ====================================================================== */
function s5StSplit(d2){
  const E = S.edit; if(!E || !E.st){ d2.innerHTML = `<div class="notice">Split view edits the Pending text: open the routine's Pending view.</div>`; return; }
  if(!$("stTa2")){
    d2.innerHTML = `<div class="s5st2"><div class="g2" id="stGut2"></div><div class="w2"><pre id="stHi2" aria-hidden="true"></pre><textarea id="stTa2" spellcheck="false" wrap="off" aria-label="Lower pane"></textarea></div></div>`;
    const t2 = $("stTa2"), hi = $("stHi2"), g2 = $("stGut2");
    const sync = () => { hi.style.transform = `translate(${-t2.scrollLeft}px, ${-t2.scrollTop}px)`; g2.scrollTop = t2.scrollTop; };
    t2.addEventListener("scroll", sync);
    t2.addEventListener("input", () => {
      const ta = stTa(); if(!ta) return;
      ideUnfoldAll(); ta.value = t2.value; ta.dispatchEvent(new Event("input"));
      s5StPaint2(true);
    });
    t2.addEventListener("keydown", (e) => { if(e.key==="Tab"){ e.preventDefault(); const s = t2.selectionStart; t2.setRangeText("    ", s, t2.selectionEnd, "end"); t2.dispatchEvent(new Event("input")); }
      if(e.key==="F6"){ e.preventDefault(); const ta = stTa(); if(ta) ta.focus(); } });
  }
  s5StPaint2(false);
}
function s5StPaint2(fromLower){
  const t2 = $("stTa2"), hi = $("stHi2"), g2 = $("stGut2"), E = S.edit; if(!t2 || !E) return;
  if(!fromLower && document.activeElement!==t2 && t2.value!==E.text){ const st = t2.scrollTop; t2.value = E.text; t2.scrollTop = st; }
  hi.innerHTML = esc(t2.value).length < 400000 ? s5PlainHighlight(t2.value) : esc(t2.value);
  g2.textContent = t2.value.split("\n").map((_, i) => i + 1).join("\n");
  hi.style.transform = `translate(${-t2.scrollLeft}px, ${-t2.scrollTop}px)`;
}
function s5PlainHighlight(text){ const saved = S.edit && S.edit.folds; try { if(S.edit) S.edit.folds = {}; return stHighlight(text, S.R.prog, null); } finally { if(S.edit) S.edit.folds = saved; } }
(function(){
  /* keep the lower pane in step with the upper editor */
  document.addEventListener("input", (e) => { if(e.target && e.target.id==="stTa" && S.s5Split) setTimeout(() => s5StPaint2(false), 0); }, true);
  window.s5StSplit = s5StSplit;
})();

/* ======================================================================
   S06: INS / OVR in the status bar; S36: zoom in 25 % steps
   ====================================================================== */
function s5StStatus(){
  let el = $("s5Ovr");
  if(!el){ el = document.createElement("span"); el.id = "s5Ovr"; el.title = "Insert / overtype (Insert key)"; el.style.cursor = "pointer"; el.onclick = () => { S.s5Ovr = !S.s5Ovr; s5StStatus(); }; const st = $("status"); st.insertBefore(el, $("sScan")); }
  const on = !!stTa() && stIsOpen();
  el.textContent = on ? (S.s5Ovr ? "OVR" : "INS") : "";
  const si = $("sIns"); if(si) si.style.display = on ? "none" : "";
}
(function(){
  const _zb = zoomBy, _zs = zoomSet;
  zoomBy = function(d){ if(stIsOpen()) return zoomSet(zoomOf() + d * 0.25); return _zb.apply(this, arguments); };
  zoomSet = function(z){ if(stIsOpen() && S.active){ S.zoom[S.active] = Math.round(Math.max(0.5, Math.min(2, z)) * 20) / 20; zoomApply(); return; } return _zs.apply(this, arguments); };
  const _rd = renderDoc; renderDoc = function(){ const r = _rd.apply(this, arguments); setTimeout(s5StStatus, 0); return r; };
})();

/* ======================================================================
   S31: header template in new Structured Text routines
   ====================================================================== */
(function(){
  const _api = api;
  api = async function(method, path, body){
    const r = await _api.apply(this, arguments);
    if(method==="POST" && path==="/api/studio/routine" && body && String(body.type || "").toUpperCase()==="ST" && S5O.stHeader){
      try {
        const rt = await _api("GET", `/api/studio/routine?program=${encodeURIComponent(body.program)}&routine=${encodeURIComponent(body.name)}`);
        if(!(rt.text || "").trim()){
          const d = new Date(), txt = (S5O.stHeaderText || "").replace(/\{company\}/g, S5O.stHeaderCompany || "").replace(/\{developer\}/g, S5O.stHeaderDeveloper || "")
            .replace(/\{routine\}/g, body.name).replace(/\{program\}/g, body.program).replace(/\{description\}/g, body.description || "").replace(/\{date\}/g, d.toISOString().slice(0, 10));
          await _api("POST", "/api/studio/edit/st", {program:body.program, routine:body.name, text:txt, version:rt.version});
          log(`Header template inserted in ${body.program}/${body.name}`, "ok");
        }
      } catch(e){ log(`Header template: ${e.message}`, "wrn"); }
    }
    return r;
  };
})();

/* ======================================================================
   S41: Watch pane for the open routine; S42: Routine Properties
   ====================================================================== */
(function(){
  const _rw = renderWatch;
  renderWatch = function(c){
    if(S.drag && c.querySelector("tr[data-w]")) return;     /* a drag from the Watch rows keeps its row */
    /* same rows as on screen: only the value cells change (rows stay, so a drag or a click on
       a row is never cut off by a value update) */
    const want = S.s5WatchRt && S.R && S.R.data ? routineTags() : S.watch;
    const have = [...c.querySelectorAll("tr[data-w]")].map(r => r.dataset.w);
    if(have.length && have.length===want.length && have.every((a, i) => a===want[i]) && $("s5ws")){
      const tmp = document.createElement("div"); renderWatchFull.call(this, tmp);
      const rows = new Map([...tmp.querySelectorAll("tr[data-w]")].map(r => [r.dataset.w, r]));
      c.querySelectorAll("tr[data-w]").forEach(tr => { const nr = rows.get(tr.dataset.w); if(!nr) return;
        const pairs = [1, 2].map(k => [tr.children[k], nr.children[k]]);           /* moved cells keep the handlers renderWatch bound */
        pairs.forEach(([a, b]) => { if(a && b && a.innerHTML!==b.innerHTML && !a.contains(document.activeElement)) a.replaceWith(b); }); });
      return;
    }
    return renderWatchFull.call(this, c);
  };
  const renderWatchFull = function(c){
    if(S.s5WatchRt && S.R && S.R.data){
      const saved = S.watch; S.watch = routineTags();
      try { _rw.call(this, c); } finally { S.watch = saved; }
      const top = c.querySelector(".wadd"); if(top) top.style.display = "none";
      c.querySelectorAll("[data-wr]").forEach(b => b.style.display = "none");
    } else _rw.call(this, c);
    c.insertAdjacentHTML("afterbegin", `<div class="wsel"><label>Show <select id="s5ws"><option value="list">Watch list</option><option value="rt">Tags of the open routine${S.R ? ` (${esc(S.R.routine)})` : ""}</option></select></label></div>`);
    $("s5ws").value = S.s5WatchRt ? "rt" : "list";
    $("s5ws").onchange = (e) => { S.s5WatchRt = e.target.value==="rt"; renderConsole(); };
  };
  /* follow the open routine */
  const _rd = renderDoc; renderDoc = function(){ const r = _rd.apply(this, arguments); if(S.s5WatchRt && S.ctab==="watch") setTimeout(renderConsole, 400); return r; };
  const _rp = routinePropsDialog;
  routinePropsDialog = async function(program, r){
    const key = `${program}/${r.name}`;
    let info = null; try { info = await api("GET", `/api/studio/routine?program=${encodeURIComponent(program)}&routine=${encodeURIComponent(r.name)}`); } catch(e){}
    const v = S.s5Ver[key], verified = info && v && v.ok && v.ver===info.version;
    const t = setInterval(() => { const b = $("dlgBody"); if(!b || !$("dlg").open) return; clearInterval(t); if(b.querySelector(".s5rinfo")) return;
      const size = info ? (info.type==="ST" ? `${(info.text || "").split("\n").length} line(s)` : info.rungs ? `${info.rungs.length} rung(s)` : "") : "";
      b.insertAdjacentHTML("afterbegin", `<table class="s5rinfo" style="font-size:12px;margin-bottom:6px"><tr><td style="padding-right:12px">Type</td><td>${esc(info ? ({RLL:"Ladder Diagram", ST:"Structured Text", FBD:"Function Block Diagram", SFC:"Sequential Function Chart"})[info.type] || info.type : r.type)}</td></tr>
        <tr><td>Program</td><td>${esc(program)}</td></tr><tr><td>Number of ${info && info.type==="ST" ? "lines" : "rungs"}</td><td>${esc(size)}</td></tr>
        <tr><td>Verified</td><td>${verified ? "Verified" : "Not Verified"}</td></tr></table>`); }, 30);
    setTimeout(() => clearInterval(t), 3000);
    return _rp.apply(this, arguments);
  };
})();

/* ======================================================================
   after every ST render
   ====================================================================== */
(function(){
  const _r = renderST;
  renderST = function(){
    const r = _r.apply(this, arguments);
    s5StDecorate(); setTimeout(s5MountStBar, 0);
    if(S.s5Split) setTimeout(() => s5RenderLow(), 0);
    return r;
  };
  const _sp = stPaint; stPaint = function(){ const r = _sp.apply(this, arguments); if(S.s5Split) s5StPaint2(false); return r; };
  /* Alt+Insert while an ST routine is open */
  vcsKeyHooks.unshift((e) => { if(e.altKey && e.key==="Insert" && stIsOpen() && !$("dlg").open){ e.preventDefault(); s5AddStElement(); return true; } return false; });
  /* Edit and View menus */
  const at = (name) => MENUS.findIndex(m => m[0]===name);
  const add = (name, fn) => { const i = at(name); if(i < 0) return; const base = MENUS[i][2]; MENUS[i][2] = () => fn(base()); };
  add("View", (items) => [...items, ...(stIsOpen() ? ["-", ["Toggle Current Outlining", s5ToggleOutline, !stTa(), "Ctrl+M"], ["Expand All", () => ideUnfoldAll(), !stTa()], ["Collapse All", () => window.stCollapseAll && stCollapseAll(), !stTa()]] : [])]);
})();
