"use strict";
/* Structured Text editor (gap report increment 8): indenting and smart indent (ST-02),
   completion list (ST-03), syntax colours (ST-04), context menus (ST-06), Ctrl+] keyword
   matching, snippets and block folding in the view (ST-07), tag drops (ST-08).
   The textarea stays the editor, so the browser's own text undo keeps working. */

(function(){
const css = document.createElement("style");
css.textContent = `
:root{--stk:#1d4ed8;--stf:#7c3aed;--stc:#15803d;--sts:#b45309;--stn:#0e7490;--stt:#111827}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--stk:#7aa2ff;--stf:#c4a5ff;--stc:#6fcf8a;--sts:#f0b46a;--stn:#5ed1e0;--stt:#e5e7eb}}
:root[data-theme="dark"]{--stk:#7aa2ff;--stf:#c4a5ff;--stc:#6fcf8a;--sts:#f0b46a;--stn:#5ed1e0;--stt:#e5e7eb}
.st-k{color:var(--stk);font-weight:600}.st-f{color:var(--stf)}.st-c{color:var(--stc);font-style:italic}.st-s{color:var(--sts)}.st-n{color:var(--stn)}.st-t{color:var(--stt)}
.st-u{text-decoration:underline wavy var(--wrn,#d97706)}.st-e{text-decoration:underline wavy var(--bad)}
.stwrap{position:relative;overflow:hidden;min-width:0;min-height:0}
.stwrap #stTa{position:absolute;inset:0;width:100%;height:100%;background:transparent;color:transparent;caret-color:var(--ink);z-index:1}
.stwrap #stTa::selection{background:rgba(59,130,246,.35);color:transparent}
#stHi{position:absolute;left:0;top:0;margin:0;padding:6px 8px;font-family:var(--mono);font-size:12px;line-height:18px;white-space:pre;color:var(--ink);pointer-events:none;background:var(--pane);min-width:100%;min-height:100%;box-sizing:border-box}
#stCompl{position:fixed;z-index:70;background:var(--pane);border:1px solid var(--line);box-shadow:0 4px 14px rgba(0,0,0,.25);max-height:220px;overflow:auto;min-width:220px;font:12px var(--mono)}
#stCompl div{padding:1px 8px;white-space:nowrap;cursor:default;display:flex;gap:10px;justify-content:space-between}#stCompl div.on{background:var(--sel)}#stCompl i{color:var(--mut);font-style:normal}
.stview .fold{cursor:pointer;color:var(--mut);display:inline-block;width:12px;margin-left:-14px}.stview div.folded-body{display:none}.stview .foldmark{color:var(--mut);border:1px solid var(--line);border-radius:3px;padding:0 4px;margin-left:6px;font-size:10px;cursor:pointer}`;
document.head.appendChild(css);
})();

const ST_KW = new Set(("IF THEN ELSE ELSIF END_IF CASE OF END_CASE FOR TO BY DO END_FOR WHILE END_WHILE REPEAT UNTIL END_REPEAT EXIT RETURN " +
  "AND OR XOR NOT MOD TRUE FALSE").split(" "));
const ST_OPEN = {IF:"END_IF", CASE:"END_CASE", FOR:"END_FOR", WHILE:"END_WHILE", REPEAT:"END_REPEAT"};
const ST_CLOSE = Object.fromEntries(Object.entries(ST_OPEN).map(([a,b])=>[b,a]));
const ST_RE = /(\(\*[\s\S]*?(?:\*\)|$)|\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\n]*)|('[^'\n]*'?|"[^"\n]*"?)|((?:2|8|16)#[0-9A-Fa-f_]+|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?)|([A-Za-z_][A-Za-z0-9_]*)/g;

/* ---------- tokens and colours ---------- */
function stIsFunc(u){ const sp = spec(u); return !!(sp && (sp.languages||[]).includes("ST")) || !!aoiDef(u); }
function stKnownRoot(name, prog){
  if(S.stNames && S.stNames.roots.has(name.toUpperCase())) return true;
  return !!(S.tagDefs[name] || S.tagDefs[`Program:${prog}.${name}`]);
}
function stTokens(text){ const out = []; let m; ST_RE.lastIndex = 0;
  while((m = ST_RE.exec(text))){ if(!m[0]) { ST_RE.lastIndex++; continue; } out.push({a:m.index, b:m.index+m[0].length, t: m[1]?"c":m[2]?"s":m[3]?"n":"id", v:m[0]}); }
  return out; }
function stHighlight(text, prog, issues){
  const errAt = new Set((issues||[]).filter(x=>x.severity==="error").map(x=>`${x.line}:${x.col}`));
  let html = "", pos = 0, line = 1, lineStart = 0;
  const adv = (s) => { for(let i=0;i<s.length;i++) if(s[i]==="\n"){ line++; lineStart = pos + i + 1; } };
  let prev = null;
  for(const tk of stTokens(text)){
    const gap = text.slice(pos, tk.a); html += esc(gap); adv(gap); pos = tk.a;
    const col = tk.a - lineStart + 1;
    let cls = {c:"st-c", s:"st-s", n:"st-n"}[tk.t] || "";
    if(tk.t==="id"){
      const u = tk.v.toUpperCase(), member = prev && text.slice(prev.b, tk.a)===".";
      if(ST_KW.has(u)) cls = "st-k";
      else if(!member && stIsFunc(u) && /^\s*\(/.test(text.slice(tk.b, tk.b+40))) cls = "st-f";
      else if(member) cls = "st-t";
      else cls = stKnownRoot(tk.v, prog) ? "st-t" : (S.stNames ? "st-u" : "st-t");
    }
    if(errAt.has(`${line}:${col}`)) cls += " st-e";
    html += `<span class="${cls}">${esc(tk.v).replace(/\n/g, `</span>\n<span class="${cls}">`)}</span>`; adv(tk.v); pos = tk.b; prev = tk;
  }
  return html + esc(text.slice(pos)) + "\n";
}
async function stLoadNames(prog){
  if(S.stNames && S.stNames.prog===prog && Date.now() - S.stNames.at < 5000) return;
  try { const t = await api("GET", `/api/studio/tagnames?program=${encodeURIComponent(prog||"")}`);
        S.stNames = {prog, at:Date.now(), list:t.names, roots:new Set(t.names.map(n => n.replace(/^Program:[^.]+\./, "").split(/[.\[]/)[0].toUpperCase()))}; }
  catch(e){ S.stNames = {prog, at:Date.now(), list:[], roots:new Set()}; }
}

/* ---------- helpers on the textarea ---------- */
function stLineInfo(ta){
  const v = ta.value, s = ta.selectionStart, ls = v.lastIndexOf("\n", s-1) + 1;
  let le = v.indexOf("\n", s); if(le<0) le = v.length;
  return {v, s, ls, le, line: v.slice(ls, le), before: v.slice(ls, s), num: v.slice(0, s).split("\n").length};
}
function stReplace(ta, a, b, text, caretA, caretB){
  ta.focus(); ta.setSelectionRange(a, b);
  if(!document.execCommand("insertText", false, text)){ ta.setRangeText(text, a, b, "end"); ta.dispatchEvent(new Event("input")); }
  if(caretA!=null) ta.setSelectionRange(caretA, caretB!=null ? caretB : caretA);
}
const indentOf = (l) => (l.match(/^[ \t]*/)||[""])[0].replace(/\t/g, "    ").length;
const stripC = (l) => l.replace(/\/\/.*$/, "").replace(/\(\*.*?\*\)/g, "").replace(/\/\*.*?\*\//g, "").trim().toUpperCase();
const opensBlock = (l) => { const u = stripC(l); return /\b(THEN|DO|ELSE|OF|REPEAT)$/.test(u) || /^(ELSE|REPEAT)$/.test(u); };
function stWordAt(v, i){
  let a = i, b = i; while(a>0 && /[\w.\[\]:]/.test(v[a-1])) a--; while(b<v.length && /[\w]/.test(v[b])) b++;
  const w = v.slice(a, b).replace(/^[.\]]+/, ""); return {a: b - w.length, b, w};
}

/* ---------- ST-02 indenting, ST-07 snippets and Ctrl+] ---------- */
const SNIPPETS = {
  IF: (i) => [`IF  THEN\n${i}    \n${i}END_IF;`, 3],
  FOR: (i) => [`FOR  := 0 TO 10 BY 1 DO\n${i}    \n${i}END_FOR;`, 4],
  WHILE: (i) => [`WHILE  DO\n${i}    \n${i}END_WHILE;`, 6],
  CASE: (i) => [`CASE  OF\n${i}    1:\n${i}        \n${i}ELSE\n${i}        \n${i}END_CASE;`, 5],
  REPEAT: (i) => [`REPEAT\n${i}    \n${i}UNTIL  END_REPEAT;`, 7 + i.length + 5]};
function stTab(ta, shift){
  const v = ta.value, s = ta.selectionStart, e = ta.selectionEnd;
  const ls = v.lastIndexOf("\n", s-1) + 1; let le = v.indexOf("\n", Math.max(s, e - (e>s && v[e-1]==="\n" ? 1 : 0))); if(le<0) le = v.length;
  if(e>s && v.slice(s, e).includes("\n")){                                   // block indent / outdent
    const lines = v.slice(ls, le).split("\n");
    const out = lines.map(l => shift ? l.replace(/^( {1,4}|\t)/, "") : (l.length ? "    " + l : l)).join("\n");
    stReplace(ta, ls, le, out, ls, ls + out.length); return;
  }
  if(shift){ const line = v.slice(ls, le), rm = (line.match(/^( {1,4}|\t)/)||[""])[0].length; if(rm) stReplace(ta, ls, ls+rm, "", Math.max(ls, s-rm)); return; }
  const info = stLineInfo(ta), w = info.before.trim().toUpperCase();
  if(SNIPPETS[w] && info.line.trim().toUpperCase()===w && s===e){             // keyword + Tab = snippet
    const ind = info.line.match(/^\s*/)[0], [txt, off] = SNIPPETS[w](ind);
    stReplace(ta, info.ls + ind.length, info.le, txt, info.ls + ind.length + off); return;
  }
  stReplace(ta, s, e, "    ");
}
function stEnter(ta){
  const info = stLineInfo(ta);
  let ind = " ".repeat(indentOf(info.line));
  if(opensBlock(info.before)) ind += "    ";
  stReplace(ta, ta.selectionStart, ta.selectionEnd, "\n" + ind);
}
function stAutoOutdent(ta){
  const info = stLineInfo(ta), t = info.before.trim().toUpperCase();
  if(!/^(END_IF|END_FOR|END_WHILE|END_CASE|END_REPEAT|UNTIL|ELSE|ELSIF)$/.test(t)) return;
  const lines = info.v.slice(0, info.ls).split("\n"); lines.pop();
  let k = lines.length-1; while(k>=0 && !lines[k].trim()) k--;
  if(k<0) return;
  const target = opensBlock(lines[k]) ? indentOf(lines[k]) : indentOf(lines[k]) - 4;
  const cur = indentOf(info.line);
  if(target>=0 && cur>target){ const lead = (info.line.match(/^[ \t]*/)||[""])[0].length; const d = lead - target;
    stReplace(ta, info.ls, info.ls + lead, " ".repeat(target), info.s - d); }
}
function stMatch(ta){
  const v = ta.value, w = stWordAt(v, ta.selectionStart); const u = w.w.toUpperCase();
  const toks = stTokens(v).filter(t => t.t==="id").map(t => ({...t, u: t.v.toUpperCase()}));
  const here = toks.findIndex(t => t.a<=ta.selectionStart && t.b>=ta.selectionStart && (ST_OPEN[t.u] || ST_CLOSE[t.u]));
  if(here<0){ log("Ctrl+]: put the cursor on IF, CASE, FOR, WHILE, REPEAT or their END_", "wrn"); return; }
  const t0 = toks[here];
  if(ST_OPEN[t0.u]){ let depth = 0; for(let i=here; i<toks.length; i++){ const t = toks[i];
      if(t.u===t0.u && !(t0.u==="IF" && toks[i-1] && toks[i-1].u==="END_IF")) depth++; else if(t.u===ST_OPEN[t0.u]){ depth--; if(!depth){ ta.setSelectionRange(t.a, t.b); return; } } } }
  else { const open = ST_CLOSE[t0.u]; let depth = 0; for(let i=here; i>=0; i--){ const t = toks[i];
      if(t.u===t0.u) depth++; else if(t.u===open){ depth--; if(!depth){ ta.setSelectionRange(t.a, t.b); return; } } } }
  log(`No matching keyword for ${u}`, "wrn");
}

/* ---------- ST-03 completion ---------- */
function stCaretXY(ta){
  const info = stLineInfo(ta), r = ta.getBoundingClientRect();
  let cw = S.stCw; if(!cw){ const c = document.createElement("canvas").getContext("2d"); c.font = getComputedStyle(ta).font; cw = S.stCw = c.measureText("MMMMMMMMMM").width/10 || 7.2; }
  return {x: r.left + 8 + info.before.replace(/\t/g,"    ").length*cw - ta.scrollLeft, y: r.top + 6 + info.num*18 - ta.scrollTop};
}
function stComplItems(ta){
  const v = ta.value, s = ta.selectionStart; let a = s; while(a>0 && /\w/.test(v[a-1])) a--;
  const prefix = v.slice(a, s), up = prefix.toUpperCase(), items = [];
  if(v[a-1]==="."){                                                       // members
    let b = a-1; while(b>0 && /[\w.\[\]:]/.test(v[b-1])) b--;
    const base = v.slice(b, a-1).replace(/\[[^\]]*\]/g, m => m), names = (S.stNames && S.stNames.list) || [];
    const pre = (base + ".").toUpperCase(), seen = new Set();
    for(const n of names){ const nn = n.replace(/^Program:[^.]+\./, ""); if(!nn.toUpperCase().startsWith(pre)) continue;
      const rest = nn.slice(pre.length).split(/[.\[]/)[0]; if(rest && !seen.has(rest) && rest.toUpperCase().startsWith(up)){ seen.add(rest); items.push({v:rest, k:"member"}); } }
  } else {
    const seen = new Set();
    for(const n of (S.stNames && S.stNames.list) || []){ const nn = n.replace(/^Program:[^.]+\./, "").split(/[.\[]/)[0];
      if(!seen.has(nn) && nn.toUpperCase().startsWith(up)){ seen.add(nn); items.push({v:nn, k:"tag"}); } }
    for(const sp of Object.values(S.isa)) if((sp.languages||[]).includes("ST") && sp.mnemonic.startsWith(up)) items.push({v:sp.mnemonic, k:"instruction"});
    for(const a2 of (S.project && S.project.aois)||[]) if(a2.name.toUpperCase().startsWith(up)) items.push({v:a2.name, k:"AOI"});
    for(const kw of ST_KW) if(kw.startsWith(up)) items.push({v:kw, k:"keyword"});
  }
  items.sort((x,y) => (x.v.toUpperCase()===up ? -1 : 0) - (y.v.toUpperCase()===up ? -1 : 0) || x.v.localeCompare(y.v));
  return {a, s, items: items.slice(0, 60)};
}
function stComplClose(){ const c = $("stCompl"); if(c) c.remove(); S.stCompl = null; }
async function stComplOpen(ta, auto){
  if(!S.stNames || S.stNames.prog!==S.R.prog) await stLoadNames(S.R.prog);
  const r = stComplItems(ta);
  if(!r.items.length || (auto && r.items.length===1 && r.items[0].v===ta.value.slice(r.a, r.s))){ stComplClose(); if(!auto) log("No completions here", "wrn"); return; }
  let c = $("stCompl"); if(!c){ c = document.createElement("div"); c.id = "stCompl"; c.setAttribute("role", "listbox"); document.body.appendChild(c); }
  S.stCompl = {...r, i:0, ta};
  const xy = stCaretXY(ta);
  c.style.left = Math.min(xy.x, innerWidth - 240) + "px"; c.style.top = Math.min(xy.y + 2, innerHeight - 230) + "px";
  stComplDraw();
  c.onmousedown = (e) => e.preventDefault();
  c.onclick = (e) => { const d = e.target.closest("[data-i]"); if(d){ S.stCompl.i = +d.dataset.i; stComplDraw(); } };
  c.ondblclick = (e) => { const d = e.target.closest("[data-i]"); if(d){ S.stCompl.i = +d.dataset.i; stComplPick(); } };
}
function stComplDraw(){ const C = S.stCompl, c = $("stCompl"); if(!C || !c) return;
  c.innerHTML = C.items.map((x,i)=>`<div data-i="${i}" class="${i===C.i?"on":""}" role="option"><span>${esc(x.v)}</span><i>${esc(x.k)}</i></div>`).join("");
  const on = c.querySelector(".on"); if(on) on.scrollIntoView({block:"nearest"}); }
function stComplPick(){ const C = S.stCompl; if(!C) return; const it = C.items[C.i]; const ta = C.ta; stComplClose();
  const s = ta.selectionStart; let a = s; while(a>0 && /\w/.test(ta.value[a-1])) a--;
  stReplace(ta, a, s, it.v, a + it.v.length); }

/* ---------- edit mode: overlay, keys, context menu ---------- */
function stEditEnhance(){
  const ta = $("stTa"); if(!ta || ta.dataset.enh) return;
  ta.dataset.enh = "1";
  const wrap = document.createElement("div"); wrap.className = "stwrap";
  const hi = document.createElement("pre"); hi.id = "stHi"; hi.setAttribute("aria-hidden", "true");
  const hadFocus = document.activeElement===ta, s0 = ta.selectionStart, s1 = ta.selectionEnd;
  ta.replaceWith(wrap); wrap.appendChild(hi); wrap.appendChild(ta);
  if(hadFocus){ ta.focus(); ta.setSelectionRange(s0, s1); }
  let raf = 0;
  const paint = () => { raf = 0; const E = S.edit; hi.innerHTML = stHighlight(ta.value, S.R.prog, E && E.issues); sync(); };
  const sync = () => { hi.style.transform = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`; };
  S.stPaintHi = () => { if(!raf) raf = requestAnimationFrame(paint); };
  stLoadNames(S.R.prog).then(() => S.stPaintHi());
  paint();
  const prevScroll = ta.onscroll; ta.onscroll = (e) => { if(prevScroll) prevScroll(e); sync(); };
  const prevInput = ta.oninput;
  ta.oninput = (e) => {
    if(prevInput) prevInput(e);
    S.stPaintHi();
    if(e && e.inputType==="insertText" && e.data){
      if(/[A-Za-z_]/.test(e.data) || e.data===".") stAutoOutdent(ta);
      const info = stLineInfo(ta), m = info.before.match(/(\.?)(\w*)$/);
      if(e.data==="." || (m && m[2].length>=2 && /^[A-Za-z_]/.test(m[2]) && !/^\d/.test(m[2]))) stComplOpen(ta, true); else stComplClose();
    } else if(S.stCompl) stComplOpen(ta, true);
  };
  ta.onkeydown = (e) => {
    const C = S.stCompl;
    if(C){
      if(e.key==="ArrowDown" || e.key==="ArrowUp"){ e.preventDefault(); C.i = (C.i + (e.key==="ArrowDown"?1:-1) + C.items.length) % C.items.length; stComplDraw(); return; }
      if(e.key==="Enter" || e.key==="Tab"){
        const typed = ta.value.slice(C.a, ta.selectionStart).toUpperCase();
        if(e.key==="Enter" && C.items[C.i] && C.items[C.i].v.toUpperCase()===typed) stComplClose();   // already complete: Enter is a new line
        else { e.preventDefault(); e.stopPropagation(); stComplPick(); return; } }
      if(e.key==="Escape"){ e.preventDefault(); e.stopPropagation(); stComplClose(); return; }
      if(e.key==="PageDown" || e.key==="PageUp"){ e.preventDefault(); C.i = Math.max(0, Math.min(C.items.length-1, C.i + (e.key==="PageDown"?8:-8))); stComplDraw(); return; }
    }
    const ctrl = e.ctrlKey || e.metaKey;
    if(ctrl && e.key===" "){ e.preventDefault(); stComplOpen(ta, false); return; }
    if(ctrl && e.key==="]"){ e.preventDefault(); stMatch(ta); return; }
    if(e.key==="Tab" && !ctrl && !e.altKey){ e.preventDefault(); stTab(ta, e.shiftKey); return; }
    if(e.key==="Enter" && !ctrl && !e.altKey && !e.shiftKey){ e.preventDefault(); stEnter(ta); return; }
  };
  ta.addEventListener("blur", () => setTimeout(() => { if(document.activeElement!==ta) stComplClose(); }, 150));
  ta.oncontextmenu = (e) => { e.preventDefault(); stComplClose(); setTimeout(() => stEditMenu(e, ta), 0); };
  ta.addEventListener("drop", () => setTimeout(() => { ta.dispatchEvent(new Event("input")); }, 0));
}
function stEditMenu(e, ta){
  const w = stWordAt(ta.value, ta.selectionStart), word = w.w, u = word.toUpperCase();
  const isTag = word && /^[A-Za-z_]/.test(word) && !ST_KW.has(u) && !stIsFunc(u);
  const known = isTag && stKnownRoot(word.split(/[.\[]/)[0], S.R.prog);
  const addr = isTag ? aoiAddr(S.R.prog, word) : null;
  const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
  showMenu(e, [
    ["Cut", () => { navigator.clipboard && navigator.clipboard.writeText(sel); stReplace(ta, ta.selectionStart, ta.selectionEnd, ""); }, !sel, "Ctrl+X"],
    ["Copy", () => { navigator.clipboard && navigator.clipboard.writeText(sel); }, !sel, "Ctrl+C"],
    ["Paste", async () => { try { const t = await navigator.clipboard.readText(); stReplace(ta, ta.selectionStart, ta.selectionEnd, t); } catch(err){ log("Paste: use Ctrl+V (the browser blocked clipboard access)", "wrn"); } }, false, "Ctrl+V"],
    "-",
    ["Browse Tags…", () => openTagBrowser(ta, [], (path) => { const p = path.replace(new RegExp(`^Program:${S.R.prog}\\.`), ""); const ww = stWordAt(ta.value, ta.selectionStart);
        if(ww.w && /^[A-Za-z_]/.test(ww.w) && !ST_KW.has(ww.w.toUpperCase())) stReplace(ta, ww.a, ww.b, p, ww.a + p.length); else stReplace(ta, ta.selectionStart, ta.selectionEnd, p); }), false, "Alt+↓"],
    ["Complete Word", () => stComplOpen(ta, false), false, "Ctrl+Space"],
    ...(isTag && known ? [[`Go To Cross Reference for "${word}"`, () => xrefOpen(addr), !window.xrefOpen, "Ctrl+E"]] : []),
    ...(isTag && !known ? [[`New Tag "${word.split(/[.\[]/)[0]}"…`, () => newTagDialog({name: word.split(/[.\[]/)[0], onCreated: () => { S.stNames = null; stLoadNames(S.R.prog).then(() => S.stPaintHi && S.stPaintHi()); stValidate(); }}), !(S.project && S.project.authoring)]] : []),
    "-",
    ["Go To Matching Keyword", () => stMatch(ta), !(ST_OPEN[u] || ST_CLOSE[u]), "Ctrl+]"],
    ["Go To Line…", () => window.goToDialog && goToDialog(), false, "Ctrl+G"],
    ["Verify Routine", () => verifyScope({program:S.R.prog, routine:S.R.routine})],
  ]);
}

/* ---------- view mode: colours, folding, context menu ---------- */
function stViewEnhance(){
  const v = $("stView"); if(!v || v.dataset.enh) return;
  v.dataset.enh = "1";
  const r = S.R.data, lines = r.text.split("\n");
  const html = stHighlight(r.text, S.R.prog, null).replace(/\n$/, "").split("\n");
  /* block folding: an opener line gets ▾ and folds to its END_ */
  const pairs = {}; const stack = [];
  lines.forEach((l, i) => { const u = stripC(l);
    const m = u.match(/^(IF|CASE|FOR|WHILE|REPEAT)\b/); const c = u.match(/^(END_IF|END_CASE|END_FOR|END_WHILE|END_REPEAT)\b/);
    if(m && !(m[1]==="IF" && /END_IF\s*;?$/.test(u))) stack.push([m[1], i]);
    else if(c){ for(let k=stack.length-1; k>=0; k--) if(ST_OPEN[stack[k][0]]===c[1]){ pairs[stack[k][1]] = i; stack.length = k; break; } } });
  v.innerHTML = html.map((h, i) => `<div data-ln="${i+1}">${pairs[i]!=null ? `<span class="fold" data-fold="${i}" title="Collapse / expand this block">▾</span>` : ""}${h || " "}</div>`).join("");
  v.onclick = (e) => { const f = e.target.closest("[data-fold],.foldmark"); if(!f) return; e.stopPropagation();
    const i = +(f.dataset.fold ?? f.dataset.unfold), end = pairs[i], rows = v.children, open = !rows[i+1] || !rows[i+1].classList.contains("folded-body");
    for(let k=i+1; k<=end; k++) rows[k].classList.toggle("folded-body", open);
    const mk = rows[i].querySelector(".fold"); if(mk) mk.textContent = open ? "▸" : "▾";
    const old = rows[i].querySelector(".foldmark"); if(old) old.remove();
    if(open) rows[i].insertAdjacentHTML("beforeend", `<span class="foldmark" data-unfold="${i}" title="${end - i} lines hidden — click to expand">… ${end-i} lines</span>`); };
  stLoadNames(S.R.prog).then(() => { if($("stView")===v){ const h2 = stHighlight(r.text, S.R.prog, null).replace(/\n$/, "").split("\n");
    [...v.children].forEach((row, i) => { const f = row.querySelector(".fold"), fm = row.querySelector(".foldmark"); row.innerHTML = (f ? f.outerHTML : "") + (h2[i] || " ") + (fm ? fm.outerHTML : ""); }); } });
  v.oncontextmenu = (e) => {
    e.preventDefault();
    let word = "";
    const rg = document.caretRangeFromPoint ? document.caretRangeFromPoint(e.clientX, e.clientY) : null;
    if(rg && rg.startContainer && rg.startContainer.nodeType===3){ const row = rg.startContainer.parentElement.closest("[data-ln]");
      if(row){ const t = row.textContent, pre = document.createRange(); pre.setStart(row, 0); pre.setEnd(rg.startContainer, rg.startOffset);
        const i = pre.toString().length; word = stWordAt(t, i).w; } }
    const u = word.toUpperCase(), isTag = word && /^[A-Za-z_]/.test(word) && !ST_KW.has(u) && !stIsFunc(u);
    const addr = isTag ? aoiAddr(S.R.prog, word) : null;
    showMenu(e, [
      ...(isTag ? [[`Go To Cross Reference for "${word}"`, () => xrefOpen(addr), !window.xrefOpen, "Ctrl+E"], [`Monitor "${word}"`, () => lxMonitor(addr)], ["Add to Watch", () => addWatch(addr)], "-"] : []),
      [`Edit ${S.R.routine}`, () => { const b = $("stEdit"); if(b) b.click(); }, !r.editable],
      ["Go To Line…", () => window.goToDialog && goToDialog(), false, "Ctrl+G"],
      ["Verify Routine", () => verifyScope({program:S.R.prog, routine:S.R.routine})],
      ["Cross Reference (callers)", () => xrefRoutine(S.R.prog, S.R.routine)]]);
  };
}

/* ---------- hook into the page ---------- */
const _renderST = renderST;
renderST = function(){ stComplClose(); _renderST(); if(S.edit && S.edit.st) stEditEnhance(); else stViewEnhance(); };
const _stPaint = stPaint;
stPaint = function(){ _stPaint(); if(S.stPaintHi && $("stHi")) S.stPaintHi(); };
/* re-render the ST view once names are known so unknown tags are marked */
document.addEventListener("keydown", (e) => { if(e.key==="Escape" && S.stCompl){ e.stopPropagation(); e.preventDefault(); stComplClose(); } }, true);
window.stComplOpen = stComplOpen; window.stMatch = stMatch;
