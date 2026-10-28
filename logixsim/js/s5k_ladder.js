"use strict";
/* Studio Edition (1.0.0): the ladder editor, following the Logix Designer help (gap report
   rows L02-L55). Every change still goes through the server's validate + apply path.
   - rung text edit bar: the rung, a branch level, the rung comment or the main operand's
     description as text, with Accept / Cancel (L07); double-clicking a left branch rail
     opens that level in it (L08)
   - split window: upper and lower panes of the same routine, each with its own caret,
     scroll and zoom; F6 switches pane (L04); page header with the description (L06)
   - caret: operand by operand with the arrows and Tab, up and down between branch levels
     (L10); branch levels and branch rails can be selected, Shift extends (L11)
   - JSR / SBR / RET parameters and Remove All Unknown Parameters from the menu (L16, L17)
   - destination operands are plain text, source operands offer the tag list (L20);
     ?? where a value cannot be read (L22); phantom operands write the tag (L26); operand
     edits commit / discard as in Studio (L27)
   - Tag Browser: filter on name / description / both with history, Show menu (unused,
     produced, consumed, alias, base) and a data type filter (L31)
   - paste rules for branch levels and branches (L32); RSLogix 500 rung text converts
     (L33); one undo history per routine, also over the rung editor (L34)
   - drag: green circle on the active target, white squares on the others (L35); operand
     fields and several instructions (L36); left rails move a branch level, right rails
     extend / shrink a branch (Ctrl/Alt: move it) (L37); Move Branch Rail with labelled
     positions (L38)
   - descriptions: main operand, base tag, pass-through (L39); automatic rung
     verification with a strict mode (L41); Parsing Error dialog (L44); Go To Called /
     Calling Routine (L46); a customizable User tab on the Language Element toolbar (L50);
     Data Context of Add-On Instruction logic (L55) */

(function(){
  const css = document.createElement("style");
  css.id = "s5Ladder";
  css.textContent = `
/* ---------- the routine window as Studio draws it ---------- */
.ladder>.rhead{display:none}
.ladder>.rhead .badge,.ladder>.rhead .hint,.ladder>.rhead>.dim{display:none!important}
.ladder>.rhead .s5desc{font:12px "Segoe UI",Tahoma,sans-serif;color:#202020;white-space:pre-wrap}
.ladder>.rung[data-n]>.rnum,.ladder>.rung.placeholder>.rnum{background:transparent!important;border:1px solid transparent!important;width:34px!important;justify-content:flex-end!important;padding-right:5px!important;color:#202020}
.ladder>.rung.lsel>.rnum{background:#3399FF!important;color:#FFFFFF!important}
.ladder>.rung.caret>.rnum{outline:1px dotted #000!important;outline-offset:-2px}
.ladder>.rung>.rcomment.rctop{border:none!important;padding:0 0 1px 0!important;margin:2px 0 2px 44px!important;background:transparent!important;max-width:calc(100% - 60px)}
.ladder .box{background:#FFFFFF!important;border:1px solid #000!important}
.ladder .box .bt{background:#FFFFFF!important;border-bottom:none!important;display:grid!important;grid-template-columns:1fr auto;justify-items:start;padding:1px 4px 0!important}
.ladder .box .bt>span:first-child{font-weight:700}
.ladder .box .bt .btt{display:block!important;grid-column:1;grid-row:2;font:11px "Segoe UI",Tahoma,sans-serif!important;color:#202020!important;white-space:nowrap}
.ladder .box .bt .cfg{grid-column:2;grid-row:1}
/* ---------- rung text edit bar ---------- */
#s5Cmd{position:sticky;top:0;z-index:7;display:flex;align-items:center;gap:4px;padding:3px 4px;background:#F0F0F0;border-bottom:1px solid #A9B4CC;font:12px "Segoe UI",Tahoma,sans-serif}
#s5Cmd select{height:22px!important;font-size:12px!important;padding:0 2px!important;line-height:normal!important}
#s5Cmd input{flex:1;min-width:120px;height:21px;font:12px Consolas,"Courier New",monospace;border:1px solid #A9B4CC;padding:0 4px}
#s5Cmd input.dirty{background:#FFFBE0}
#s5Cmd button{height:21px;min-width:24px;padding:0 6px;border:1px solid #A9B4CC;background:#FFFFFF}
#s5Cmd button:hover:not(:disabled){background:#FDF4BF;border-color:#E5C365}
#s5Cmd .err{color:#C00000;max-width:40%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* ---------- selected branch levels / rails ---------- */
.ladder .branch>.series.s5lvsel{outline:1px dotted #000;outline-offset:-1px;background:rgba(51,153,255,.10)}
.ladder .branch>.series.s5lvsel::before{width:3px!important;background:#3399FF!important}
.ladder .branch.s5brsel>.series::after{width:3px!important;background:#3399FF!important}
.ladder .branch.s5brsel{outline:1px dotted #000;outline-offset:1px}
.ladder .branch>.series{cursor:default}
.ladder.s5railhot{cursor:ew-resize}
/* ---------- drag targets: active = green circle, other valid = white square ---------- */
.ladder.idedrag .wire.okdrop::after,.ladder.s5drag .wire.s5ok::after{content:""!important;position:absolute;left:50%;top:var(--H,50%)!important;width:9px!important;height:9px!important;margin:-5px 0 0 -5px!important;
  border-radius:0!important;background:#FFFFFF!important;border:1px solid #303030!important;opacity:1!important;z-index:3}
.ladder.idedrag .wire.okdrop.hot::after,.ladder.s5drag .wire.s5ok.hot::after{width:13px!important;height:13px!important;margin:-7px 0 0 -7px!important;border-radius:50%!important;background:#00FF00!important;border-color:#006400!important}
.ladder.s5drag .wire{position:relative}
.ladder .branch.s5ok{outline:1px dashed #303030}
.ladder .branch.s5ok.hot{outline:2px solid #00C000}
.ladder .branch>.series.s5ok.hot{background:rgba(0,255,0,.12)}
#s5Ghost{position:fixed;z-index:80;pointer-events:none;width:2px;background:#3399FF;opacity:.8}
.s5lab{position:fixed;z-index:81;background:#FFE58A;border:1px solid #9A7A20;font:700 11px Consolas,monospace;padding:0 3px;cursor:pointer}
/* ---------- split window ---------- */
#doc2{display:none;background:#FFFFFF;overflow:auto;min-height:60px;border-top:5px solid var(--s5frame,#293955);position:relative}
#center.s5split #doc2{display:block;flex:0 0 var(--s5split,45%)}
#center.s5split #doc{flex:1 1 auto;min-height:60px}
#s5SplitBar{display:none;height:5px;cursor:row-resize;background:var(--s5frame,#293955)}
#center.s5split #s5SplitBar{display:block}
#doc2 .ladder>.rung[data-n]{grid-template-columns:40px minmax(0,1fr)!important}
#doc2 .ladder:focus{outline:none}
.s5pane{box-shadow:inset 0 2px 0 #FFE8A6}
/* ---------- tag browser ---------- */
#tbrowse .s5tbf{display:flex;gap:4px;align-items:center;padding:3px 6px;border-bottom:1px solid #D3D3D3;background:#FAFAFA;font-size:11px}
#tbrowse .s5tbf select{font-size:11px;height:19px}
#tbrowse .s5show{position:relative}
#tbrowse .s5showm{position:absolute;right:0;top:20px;background:#FFFFFF;border:1px solid #707070;padding:4px 8px;z-index:3;display:none;white-space:nowrap;box-shadow:0 3px 10px rgba(0,0,0,.2)}
#tbrowse .s5showm.on{display:block}
#tbrowse .s5showm label{display:block;margin:2px 0}
#tbrowse .tbi .s5k{font-size:10px;color:#7A4A00;margin-left:4px}
/* ---------- customize toolbar ---------- */
.s5cust{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;min-width:560px}
.s5cust .lst{height:260px;overflow:auto;border:1px solid #A9B4CC;font:12px Consolas,monospace}
.s5cust .lst div{padding:1px 6px;cursor:default}.s5cust .lst div.on{background:#3399FF;color:#FFFFFF}
.s5cust .mid{display:flex;flex-direction:column;gap:4px;justify-content:center}
/* ---------- AOI data context ---------- */
#s5Ctx{position:sticky;top:0;z-index:7;display:flex;align-items:center;gap:6px;padding:3px 6px;background:#F0F0F0;border-bottom:1px solid #A9B4CC;font:12px "Segoe UI",Tahoma,sans-serif}
#s5Ctx select{font-size:12px;min-width:260px}
.s5parse textarea{width:100%;font:12px Consolas,monospace}
.s5parse .errl{max-height:110px;overflow:auto;border:1px solid #D3D3D3;padding:3px 6px;margin:4px 0;font-size:12px}
`;
  document.head.appendChild(css);
})();

/* ======================================================================
   helpers on rung trees (pre-order: the same order instrOrder and the DOM use)
   ====================================================================== */
function s5Walk(tree){
  const brs = [], owner = [], places = []; let ii = 0;
  const rec = (items, ctx) => items.forEach((n, k) => {
    if(n.kind==="branch"){ const b = brs.length; brs.push(n); places.push({list:items, index:k, ctx}); n.legs.forEach((l, li) => rec(l, {bidx:b, li})); }
    else owner[ii++] = ctx;
  });
  rec(tree, null);
  return {brs, owner, places};
}
function s5RungEls(n, wrap){ const w = wrap || lxWrap(); return w ? w.querySelector(`.rung[data-n="${n}"]`) : null; }
function s5BranchEls(rd){ return rd ? [...rd.querySelectorAll(".rline .branch")] : []; }
function s5Rung(n){ const r = S.R && S.R.data && S.R.data.rungs[n]; return r && !r.error ? r : null; }
async function s5Replace(n, tree, msg){
  const rung = S.R.data.rungs[n];
  try { const res = await api("POST", "/api/studio/edit/rung", {program:S.R.prog, routine:S.R.routine, op:"replace", index:n, text:serialize(tree), comment:rung.comment||"", version:S.R.data.version});
        log(`${msg} (effective at scan #${res.entry.effective_scan})`, "ok"); S.flash = n; await reloadRoutine(); return true; }
  catch(e){ const iss = e.data && e.data.issues ? ": " + e.data.issues.filter(x => x.severity==="error").map(x => x.message).join("; ") : ""; log(`${msg.split(":")[0]}: refused — ${e.message}${iss}`, "err"); return false; }
}

/* ======================================================================
   L07 / L08: rung text edit bar
   ====================================================================== */
S.s5Cmd = {kind:"rung", dirty:false};
function s5CmdTarget(){
  const L = lxSel(), c = L.caret, n = c.rung, r = s5Rung(n);
  const k = S.s5Cmd.kind;
  if(!S.R || n >= lxCount()) return null;
  const raw = S.R.data.rungs[n];
  if(k==="rung") return {n, text: raw.text.replace(/;\s*$/, "")};
  if(k==="comment") return {n, text: raw.comment || ""};
  if(k==="level"){
    if(!r) return null;
    let lv = S.s5Sel && S.s5Sel.kind==="level" && S.s5Sel.rung===n ? {bidx:S.s5Sel.bidx, li:S.s5Sel.li} : (S.s5Cmd.level && S.s5Cmd.level.n===n ? S.s5Cmd.level : null);
    if(!lv && c.iid!=null){ const w = s5Walk(r.tree); lv = w.owner[c.iid] || null; }
    if(!lv) return {n, none:"Put the caret in a branch level (or select its left rail)"};
    const br = s5Walk(r.tree).brs[lv.bidx]; if(!br || !br.legs[lv.li]) return {n, none:"No such branch level"};
    return {n, level:lv, text: serialize(br.legs[lv.li])};
  }
  if(k==="desc"){
    const op = c.iid!=null ? lxOpAddr(n, c.iid, c.op) : null;
    if(!op || !op.addr) return {n, none:"Put the caret on an instruction operand that is a tag"};
    const d = findDef(op.addr); if(!d) return {n, none:`${op.raw}: not a tag`};
    return {n, addr:d.address, text: d.description || ""};
  }
  return null;
}
function s5CmdMount(){
  if(!lxIsLadder() || !S5O.rungTextBar || S.R.prog.startsWith("AOI:")){ const o = $("s5Cmd"); if(o && !lxIsLadder()) o.remove(); if(o && !S5O.rungTextBar) o.remove(); return; }
  const w = lxWrap(); if(!w) return;
  let bar = $("s5Cmd");
  if(!bar || !w.contains(bar)){
    if(bar) bar.remove();
    bar = document.createElement("div"); bar.id = "s5Cmd"; bar.setAttribute("role", "toolbar"); bar.setAttribute("aria-label", "Rung text edit bar");
    bar.innerHTML = `<select id="s5CmdKind" title="What the bar edits"><option value="rung">Rung</option><option value="level">Branch Level</option><option value="comment">Rung Comment</option><option value="desc">Description</option></select>
      <input id="s5CmdText" spellcheck="false" autocomplete="off" aria-label="Text"><button type="button" id="s5CmdOk" title="Accept (Enter)">✔</button><button type="button" id="s5CmdNo" title="Cancel (Esc)">✖</button><span class="err" id="s5CmdErr"></span>`;
    const h = w.querySelector(".rhead"); if(h) h.after(bar); else w.prepend(bar);
    const inp = $("s5CmdText");
    $("s5CmdKind").onchange = (e) => { S.s5Cmd.kind = e.target.value; S.s5Cmd.dirty = false; s5CmdFill(true); inp.focus(); };
    inp.oninput = () => { S.s5Cmd.dirty = true; inp.classList.add("dirty"); $("s5CmdErr").textContent = ""; };
    inp.onkeydown = (e) => { e.stopPropagation(); if(e.key==="Enter"){ e.preventDefault(); s5CmdAccept(); } if(e.key==="Escape"){ e.preventDefault(); s5CmdCancel(); } };
    $("s5CmdOk").onclick = s5CmdAccept; $("s5CmdNo").onclick = s5CmdCancel;
  }
  $("s5CmdKind").value = S.s5Cmd.kind;
  s5CmdFill(false);
}
function s5CmdFill(force){
  const inp = $("s5CmdText"); if(!inp) return;
  if(!force && (S.s5Cmd.dirty || document.activeElement===inp)) return;
  const t = s5CmdTarget(), edit = lxEditable();
  inp.classList.remove("dirty"); S.s5Cmd.dirty = false; $("s5CmdErr").textContent = "";
  if(!t){ inp.value = ""; inp.placeholder = "(End)"; inp.disabled = true; $("s5CmdOk").disabled = true; return; }
  if(t.none){ inp.value = ""; inp.placeholder = t.none; inp.disabled = true; $("s5CmdOk").disabled = true; return; }
  inp.disabled = !(edit || S.s5Cmd.kind==="desc"); $("s5CmdOk").disabled = inp.disabled;
  inp.placeholder = S.s5Cmd.kind==="comment" ? "(no rung comment)" : S.s5Cmd.kind==="desc" ? "(no description)" : "";
  inp.value = t.text; S.s5Cmd.t = t;
}
function s5CmdCancel(){ S.s5Cmd.dirty = false; s5CmdFill(true); lxFocus(); }
async function s5CmdAccept(){
  const t = S.s5Cmd.t, inp = $("s5CmdText"); if(!t || !inp) return;
  const v = inp.value, k = S.s5Cmd.kind, err = (m) => { $("s5CmdErr").textContent = m; $("s5CmdErr").title = m; inp.focus(); };
  if(!S.s5Cmd.dirty){ lxFocus(); return; }
  try {
    if(k==="rung"){
      if(!v.trim()) return err("Empty rung: use Delete to remove a rung");
      await api("POST", "/api/studio/edit/rung", {program:S.R.prog, routine:S.R.routine, op:"replace", index:t.n, text:v.trim().replace(/;\s*$/, ""), comment:S.R.data.rungs[t.n].comment||"", version:S.R.data.version});
      log(`Rung ${t.n} changed from the rung text edit bar`, "ok");
    } else if(k==="comment"){
      await api("POST", "/api/studio/edit/rung", {program:S.R.prog, routine:S.R.routine, op:"comment", index:t.n, comment:v, version:S.R.data.version});
      log(`Rung ${t.n} comment changed`, "ok");
    } else if(k==="level"){
      let items; try { items = v.trim() ? parseRungText(v) : []; } catch(e){ return err(`Not ladder logic: ${e.message}`); }
      const tree = cloneTree(S.R.data.rungs[t.n].tree), br = s5Walk(tree).brs[t.level.bidx];
      br.legs[t.level.li] = items;
      await api("POST", "/api/studio/edit/rung", {program:S.R.prog, routine:S.R.routine, op:"replace", index:t.n, text:serialize(tree), comment:S.R.data.rungs[t.n].comment||"", version:S.R.data.version});
      log(`Rung ${t.n}: branch level changed`, "ok");
    } else if(k==="desc"){
      await api("PUT", "/api/studio/tag", {address:t.addr, description:v});
      log(`Description of ${t.addr} changed`, "ok"); await refreshProject();
    }
  } catch(e){ const iss = e.data && e.data.issues ? e.data.issues.filter(x => x.severity==="error").map(x => x.message).join("; ") : ""; return err(`✖ ${iss || e.message}`); }
  S.s5Cmd.dirty = false; S.flash = t.n; await reloadRoutine(); lxFocus();
}
/* double-click a left branch rail: that level in the bar (capture: before the editors) */
window.addEventListener("dblclick", (e) => {
  if(!lxIsLadder() || S.edit || !e.target.closest) return;
  const hit = s5RailHit(e); if(!hit) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if(hit.side==="left"){ S.s5Sel = {kind:"level", rung:hit.n, bidx:hit.bidx, li:hit.li}; s5SelPaint();
    S5O.rungTextBar || s5set({rungTextBar:true});
    S.s5Cmd.kind = "level"; S.s5Cmd.level = {n:hit.n, bidx:hit.bidx, li:hit.li}; S.s5Cmd.dirty = false; lxSetCaret(hit.n); s5CmdMount(); s5CmdFill(true);
    const i = $("s5CmdText"); if(i){ i.focus(); i.select(); } }
  else { S.s5Sel = {kind:"branch", rung:hit.n, bidx:hit.bidx}; s5SelPaint(); s5MoveRail(hit.n, hit.bidx); }
}, true);

/* ======================================================================
   L11: selecting branch levels (left rail) and branches (right rail)
   ====================================================================== */
S.s5Sel = null;
function s5RailHit(e, wrap){
  const lv = e.target.closest(".ladder .rung[data-n] .branch > .series");
  const rd = e.target.closest(".ladder .rung[data-n]"); if(!rd || e.target.closest(".ins")) return null;
  const n = +rd.dataset.n, els = s5BranchEls(rd);
  /* the level whose rail is nearest the pointer (rails are the levels' left / right edges) */
  let best = null;
  els.forEach((b, bidx) => {
    [...b.children].filter(x => x.classList.contains("series")).forEach((s, li) => {
      const r = s.getBoundingClientRect(); if(e.clientY < r.top - 2 || e.clientY > r.bottom + 2) return;
      const dl = Math.abs(e.clientX - r.left), dr = Math.abs(e.clientX - r.right);
      if(dl <= 6 && (!best || dl < best.d)) best = {n, bidx, li, side:"left", d:dl, el:s};
      if(dr <= 6 && (!best || dr < best.d)) best = {n, bidx, li, side:"right", d:dr, el:b};
    });
  });
  if(!best && lv){ const r = lv.getBoundingClientRect(); if(e.clientX - r.left < 6){ const b = lv.parentElement; best = {n, bidx:els.indexOf(b), li:[...b.children].indexOf(lv), side:"left", el:lv}; } }
  return best;
}
function s5SelPaint(){
  document.querySelectorAll(".s5lvsel,.s5brsel").forEach(x => x.classList.remove("s5lvsel", "s5brsel"));
  const s = S.s5Sel; if(!s || !lxIsLadder()) return;
  document.querySelectorAll(`#doc .ladder .rung[data-n="${s.rung}"], #doc2 .ladder .rung[data-n="${s.rung}"]`).forEach(rd => {
    const b = s5BranchEls(rd)[s.bidx]; if(!b) return;
    if(s.kind==="branch") b.classList.add("s5brsel");
    else { const lvs = [...b.children].filter(x => x.classList.contains("series")); (s.lis || [s.li]).forEach(li => lvs[li] && lvs[li].classList.add("s5lvsel")); }
  });
}
document.addEventListener("click", (e) => {
  if(!lxIsLadder() || S.edit || !e.target.closest || !e.target.closest(".ladder")) return;
  const hit = s5RailHit(e);
  if(!hit){ if(S.s5Sel && !e.target.closest("#s5Cmd")){ S.s5Sel = null; s5SelPaint(); } return; }
  e.preventDefault(); e.stopImmediatePropagation();
  const cur = S.s5Sel;
  if(hit.side==="left"){
    if(e.shiftKey && cur && cur.kind==="level" && cur.rung===hit.n && cur.bidx===hit.bidx){
      const a = Math.min(cur.li, hit.li), b = Math.max(cur.li, hit.li); S.s5Sel = {...cur, lis: Array.from({length:b - a + 1}, (_, i) => a + i)};
    } else S.s5Sel = {kind:"level", rung:hit.n, bidx:hit.bidx, li:hit.li};
  } else S.s5Sel = {kind:"branch", rung:hit.n, bidx:hit.bidx};
  const L = lxSel(); L.rungs = new Set(); L.ins = new Set(); L.caret = {rung:hit.n, iid:null, op:null}; lxPaint(); s5SelPaint(); lxFocus();
  if(S.s5Cmd.kind==="level") s5CmdFill(true);
  statusMsg && statusMsg(S.s5Sel.kind==="level" ? `Branch level selected (rung ${hit.n}): Ctrl+C, Ctrl+X, Del, Ctrl+V, double-click to edit as text` : `Branch selected (rung ${hit.n}): drag its right rail, or right-click › Move Branch Rail`, "message");
}, true);
function s5SelText(){
  const s = S.s5Sel, r = s && s5Rung(s.rung); if(!r) return null;
  const br = s5Walk(r.tree).brs[s.bidx]; if(!br) return null;
  if(s.kind==="branch") return {kind:"branch", text: serialize([br])};
  const lis = s.lis || [s.li];
  return {kind:"level", text: serialize(br.legs[lis[0]] || []), levels: lis.map(li => serialize(br.legs[li] || []))};
}
async function s5SelDelete(){
  const s = S.s5Sel, r = s && s5Rung(s.rung); if(!r || !lxEditable()) return;
  const tree = cloneTree(r.tree), w = s5Walk(tree), br = w.brs[s.bidx], pl = w.places[s.bidx]; if(!br) return;
  if(s.kind==="branch"){ pl.list.splice(pl.index, 1); }
  else {
    const lis = new Set(s.lis || [s.li]);
    br.legs = br.legs.filter((_, li) => !lis.has(li));
    if(br.legs.length===1) pl.list.splice(pl.index, 1, ...br.legs[0]);
    else if(!br.legs.length) pl.list.splice(pl.index, 1);
  }
  S.s5Sel = null;
  if(!tree.length){ log("That would leave the rung empty: delete the rung instead", "wrn"); return; }
  await s5Replace(s.rung, tree, `Rung ${s.rung}: ${s.kind==="branch" ? "branch" : "branch level"} deleted`);
}

/* ======================================================================
   L32 / L33: paste rules, RSLogix 500 text; clipboard for levels and branches
   ====================================================================== */
(function(){
  const _copy = lxCopy;
  lxCopy = function(ev){
    if(S.s5Sel && lxIsLadder()){
      const c = s5SelText(); if(!c) return false;
      S.clip = c; const txt = c.kind==="branch" ? c.text : c.text;
      if(ev && ev.clipboardData){ ev.clipboardData.setData("text/plain", txt); ev.preventDefault(); } else { try { navigator.clipboard.writeText(txt).catch(()=>{}); } catch(e){} }
      log(c.kind==="branch" ? `Copied branch ${c.text}` : `Copied branch level ${c.text || "(empty)"}`); return true;
    }
    return _copy.apply(this, arguments);
  };
  const _cut = lxCut;
  lxCut = async function(ev){ if(S.s5Sel && lxIsLadder()){ if(lxCopy(ev)) await s5SelDelete(); return; } return _cut.apply(this, arguments); };
  const _del = lxDelete;
  lxDelete = async function(silent){ if(S.s5Sel && lxIsLadder()){ return s5SelDelete(); } return _del.apply(this, arguments); };
  const _paste = lxPaste;
  lxPaste = async function(text){
    if(!lxEditable()) return;
    if(text!=null && s5Is500(text)) return s5Paste500(text);
    let clip = S.clip;
    if(text!=null && !(clip && (clip.text||"").trim()===text.trim())) clip = null;
    const s = S.s5Sel, L = lxSel();
    /* a branch level (or instructions) onto a selected branch level: a new level after it,
       or appended to it */
    if(s && s.kind==="level" && (clip || text!=null)){
      const r = s5Rung(s.rung); if(!r) return;
      const src = clip ? clip.text : text.trim();
      let items; try { items = parseRungText(src); } catch(e){ log(`Paste: not ladder logic (${e.message})`, "err"); return; }
      const tree = cloneTree(r.tree), br = s5Walk(tree).brs[s.bidx];
      if(clip && clip.kind==="level"){ const at = Math.max(...(s.lis || [s.li])) + 1; (clip.levels || [clip.text]).forEach((t, i) => { let it2; try { it2 = parseRungText(t); } catch(e){ it2 = []; } br.legs.splice(at + i, 0, it2); }); }
      else br.legs[s.li].push(...items);
      S.s5Sel = null; return s5Replace(s.rung, tree, `Rung ${s.rung}: pasted into the branch`);
    }
    /* a branch level onto an instruction inside a branch: a new level of that branch */
    if(clip && clip.kind==="level" && L.caret.iid!=null){
      const r = s5Rung(L.caret.rung); const own = r && s5Walk(r.tree).owner[L.caret.iid];
      if(own){ const tree = cloneTree(r.tree), br = s5Walk(tree).brs[own.bidx];
        (clip.levels || [clip.text]).forEach((t, i) => { let it2; try { it2 = parseRungText(t); } catch(e){ it2 = []; } br.legs.splice(own.li + 1 + i, 0, it2); });
        return s5Replace(L.caret.rung, tree, `Rung ${L.caret.rung}: branch level pasted`); }
    }
    if(clip && (clip.kind==="level" || clip.kind==="branch")){            // elsewhere: as elements at the caret
      const t = clip.kind==="level" ? clip.text : clip.text; S.clip = {kind:"instr", text:t}; const r = await _paste.call(this, null); S.clip = clip; return r;
    }
    return _paste.apply(this, arguments);
  };
})();
/* RSLogix 500 rung text: SOR XIC B3:0/0 BST XIO N7:0/1 NXB ... BND OTE O:0/0 EOR */
function s5Is500(t){ return /\bSOR\b/.test(t) && /\bEOR\b/.test(t) && !/\(/.test(t.replace(/\(\*[\s\S]*?\*\)/g, "")); }
const S5_500OPS = {XIC:1,XIO:1,OTE:1,OTL:1,OTU:1,ONS:1,OSR:1,OSF:3,TON:4,TOF:4,RTO:4,CTU:3,CTD:3,RES:1,MOV:2,MVM:3,ADD:3,SUB:3,MUL:3,DIV:3,NEG:2,ABS:2,SQR:2,
  EQU:2,NEQ:2,LES:2,LEQ:2,GRT:2,GEQ:2,LIM:3,MEQ:3,CLR:1,NOT:2,AND:3,OR:3,XOR:3,COP:3,FLL:3,TOD:2,FRD:2,SCP:6,JSR:1,JMP:1,LBL:1,SBR:0,RET:0,TND:0,AFI:0,NOP:0,MCR:0,END:0,
  BTD:5,SWP:2,ENC:3,DCD:2,SCL:4,MSG:2,IIM:3,IOM:3,BSL:4,BSR:4,FFL:5,FFU:5,LFL:5,LFU:5,SQO:6,SQC:6,SQL:5,PID:3,CPT:2};
const S5_500TYPE = {B:"INT", N:"INT", F:"REAL", T:"TIMER", C:"COUNTER", R:"CONTROL", L:"DINT", ST:"STRING", A:"INT"};
function s5Addr500(a, made){
  let m;
  if(/^-?\d+(\.\d+)?$/.test(a)) return a;
  if((m = /^([IO]):(\d+)(?:\.(\d+))?(?:\/(\d+))?$/i.exec(a))){ const io = m[1].toUpperCase(); return `Local:${m[2]}:${io}.Data${m[3]!=null ? `[${m[3]}]` : ""}${m[4]!=null ? "." + m[4] : ""}`; }
  if((m = /^S:1\/15$/i.exec(a))) return "S:FS";
  if((m = /^S:(\d+)(?:\/(\d+))?$/i.exec(a))) return `S2[${m[1]}]${m[2]!=null ? "." + m[2] : ""}`;
  if((m = /^([A-Z]{1,2})(\d+)\/(\d+)$/i.exec(a))){ const f = m[1].toUpperCase() + m[2], bit = +m[3], w = Math.floor(bit / 16); made[f] = {p:m[1].toUpperCase(), max:Math.max((made[f]||{}).max||0, w)}; return `${f}[${w}].${bit % 16}`; }
  if((m = /^([A-Z]{1,2})(\d+):(\d+)(?:([./])([A-Z]+|\d+))?$/i.exec(a))){
    const f = m[1].toUpperCase() + m[2]; made[f] = {p:m[1].toUpperCase(), max:Math.max((made[f]||{}).max||0, +m[3])};
    return `${f}[${m[3]}]${m[5]!=null ? "." + m[5].toUpperCase() : ""}`;
  }
  if((m = /^U:(\d+)$/i.exec(a))) return `LAD_${m[1]}`;
  if((m = /^#(.*)$/.exec(a))) return s5Addr500(m[1], made);
  return a;
}
function s5Convert500(text){
  const toks = text.replace(/\r/g, " ").split(/\s+/).filter(Boolean), rungs = [], made = {};
  let i = 0;
  while(i < toks.length){
    while(i < toks.length && toks[i].toUpperCase()!=="SOR") i++;
    if(i >= toks.length) break; i++;
    const root = [], stack = [{items:root}];
    const cur = () => { const top = stack[stack.length - 1]; return top.br ? top.br.legs[top.br.legs.length - 1] : top.items; };
    while(i < toks.length && toks[i].toUpperCase()!=="EOR"){
      const t = toks[i++].toUpperCase();
      if(t==="BST"){ const br = {kind:"branch", legs:[[]]}; cur().push(br); stack.push({br}); continue; }
      if(t==="NXB"){ const top = stack[stack.length - 1]; if(top.br) top.br.legs.push([]); continue; }
      if(t==="BND"){ if(stack.length > 1) stack.pop(); continue; }
      let n = S5_500OPS[t]; if(n==null){ n = 0; while(i + n < toks.length && !S5_500OPS[toks[i + n].toUpperCase()] && !/^(BST|NXB|BND|EOR)$/i.test(toks[i + n])) n++; }
      const raw = toks.slice(i, i + n); i += n;
      let args = raw.map(a => s5Addr500(a, made)), name = t;
      if(/^(TON|TOF|RTO)$/.test(t)){ const tb = parseFloat(raw[1]) || 1; args = [args[0], String(Math.round((+raw[2] || 0) * tb * 1000)), String(Math.round((+raw[3] || 0) * tb * 1000))]; }
      else if(t==="JSR") args = [args[0], "0"];
      else if(t==="OSR") args = [args[0], args[0].replace(/\]\.\d+$/, "]") === args[0] ? args[0] + "_OSR" : args[0] + "_out"];
      else if(t==="CPT") args = [args[0], raw.slice(1).join(" ")];
      else if(t==="TND" || t==="END") continue;
      cur().push({kind:"instr", name, args});
    }
    i++;
    const ser = (items) => items.map(x => x.kind==="branch" ? "[" + x.legs.map(ser).join(",") + "]" : `${x.name}(${x.args.join(",")})`).join("");
    if(root.length) rungs.push(ser(root) + ";");
  }
  return {rungs, made};
}
async function s5Paste500(text){
  const {rungs, made} = s5Convert500(text);
  if(!rungs.length){ log("Paste: no RSLogix 500 rungs found (SOR … EOR)", "err"); return; }
  const missing = Object.entries(made).filter(([f]) => !findDef(f) && !(S.tagDefs && S.tagDefs[f]));
  const L = lxSel(), at = L.caret.rung >= lxCount() ? lxCount() : lxModeIdx(L.caret.rung);
  let mk = !!missing.length;
  const res = await dialog({title:"Paste RSLogix 500 Rungs", buttons:[["Cancel","cancel"],["Paste","ok","pri"]], onSubmit: () => { const c = $("s5mk"); mk = !!(c && c.checked); },
    body:`<p>${rungs.length} rung(s) converted to Logix rung text:</p><pre style="max-height:180px;overflow:auto;border:1px solid #D3D3D3;padding:4px;font-size:11px">${esc(rungs.join("\n"))}</pre>
      ${missing.length ? `<label><input type="checkbox" id="s5mk" checked> Create the data files as controller tags: ${missing.map(([f, x]) => `${esc(f)} ${S5_500TYPE[x.p] || "INT"}[${x.max + 1}]`).join(", ")}</label>` : ""}
      <p class="notice-small">Timers convert to milliseconds; I/O addresses become Local:slot:I/O.Data; S:1/15 becomes S:FS.</p>`});
  if(res!=="ok") return;
  if(mk){
    for(const [f, x] of missing){ try { await api("POST", "/api/studio/tag", {name:f, scope:"controller", data_type:S5_500TYPE[x.p] || "INT", dims:[x.max + 1], description:"RSLogix 500 data file"}); log(`Tag ${f} created`, "ok"); } catch(e){ log(`${f}: ${e.message}`, "wrn"); } }
    await refreshProject().catch(()=>{});
  }
  try { await api("POST", "/api/studio/edit/batch", {program:S.R.prog, routine:S.R.routine, ops: rungs.map((t, k) => ({op:"insert", index:at + k, text:t, comment:""})), version:S.R.data.version});
        log(`Pasted ${rungs.length} converted RSLogix 500 rung(s) at ${at}`, "ok"); L.rungs = new Set(rungs.map((_, k) => at + k)); L.caret = {rung:at, iid:null, op:null}; S.flash = at; await reloadRoutine(); }
  catch(e){ const iss = e.data && e.data.issues ? ": " + e.data.issues.map(x => x.message).slice(0, 4).join("; ") : ""; log(`Paste refused: ${e.message}${iss}`, "err"); }
}
window.s5Convert500 = s5Convert500;

/* ======================================================================
   L10: caret operand by operand, Tab between operands, up / down between levels
   ====================================================================== */
function s5Ops(n, iid){ const ins = lxInstrs(n)[iid]; return ins ? opCount(ins) : 0; }
function s5MoveOp(dir){
  const L = lxSel(), c = L.caret, cnt = lxCount();
  if(c.rung >= cnt) return false;
  const list = lxInstrs(c.rung);
  if(c.iid==null) return false;
  const ops = s5Ops(c.rung, c.iid);
  if(dir > 0){
    if(c.op==null && ops){ lxSetCaret(c.rung, c.iid, 0); return true; }
    if(c.op!=null && c.op < ops - 1){ lxSetCaret(c.rung, c.iid, c.op + 1); return true; }
    if(c.iid < list.length - 1){ lxSetCaret(c.rung, c.iid + 1, null); return true; }
    lxSetCaret(Math.min(cnt, c.rung + 1)); return true;
  }
  if(c.op!=null && c.op > 0){ lxSetCaret(c.rung, c.iid, c.op - 1); return true; }
  if(c.op===0){ lxSetCaret(c.rung, c.iid, null); return true; }
  if(c.iid > 0){ const p = s5Ops(c.rung, c.iid - 1); lxSetCaret(c.rung, c.iid - 1, p ? p - 1 : null); return true; }
  lxSetCaret(c.rung); return true;
}
function s5MoveVert(dir){
  const L = lxSel(), c = L.caret; if(c.iid==null) return false;
  const rd = lxRungEl(c.rung); if(!rd) return false;
  const me = rd.querySelector(`.ins[data-iid="${c.iid}"]`); if(!me) return false;
  const a = me.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null;
  rd.querySelectorAll(".ins[data-iid]").forEach(el => { if(el===me) return; const b = el.getBoundingClientRect(), by = b.top + b.height / 2;
    if(dir > 0 ? by <= ay + 4 : by >= ay - 4) return;
    const d = Math.abs(by - ay) * 4 + Math.abs(b.left + b.width / 2 - ax); if(!best || d < best.d) best = {d, iid:+el.dataset.iid}; });
  if(!best) return false;
  L.rungs = new Set(); lxSetCaret(c.rung, best.iid, null); return true;
}
function s5LadderKeys(e){
  if(!lxReady()) return false;
  const k = e.key, ctrl = e.ctrlKey || e.metaKey, done = () => { e.preventDefault(); return true; };
  if(S.s5Sel){
    if(k==="Escape"){ S.s5Sel = null; s5SelPaint(); return done(); }
    if(k==="Delete" && !ctrl){ s5SelDelete(); return done(); }
    if(k==="Enter" && !ctrl && !e.altKey && S.s5Sel.kind==="level"){ S.s5Cmd.kind = "level"; S.s5Cmd.level = {n:S.s5Sel.rung, bidx:S.s5Sel.bidx, li:S.s5Sel.li}; s5CmdMount(); s5CmdFill(true); const i = $("s5CmdText"); if(i){ i.focus(); i.select(); } return done(); }
    if(k==="ArrowUp" || k==="ArrowDown"){ const s = S.s5Sel; if(s.kind==="level"){ const r = s5Rung(s.rung), br = r && s5Walk(r.tree).brs[s.bidx];
        if(br){ const to = Math.max(0, Math.min(br.legs.length - 1, (e.shiftKey ? (s.lis ? (k==="ArrowDown" ? Math.max(...s.lis) : Math.min(...s.lis)) : s.li) : s.li) + (k==="ArrowDown" ? 1 : -1)));
          if(e.shiftKey){ const a = Math.min(s.li, to), b = Math.max(s.lis ? Math.max(...s.lis) : s.li, to); S.s5Sel = {...s, lis: Array.from({length:b - a + 1}, (_, i) => a + i)}; }
          else S.s5Sel = {kind:"level", rung:s.rung, bidx:s.bidx, li:to};
          s5SelPaint(); return done(); } } }
  }
  if(ctrl || e.altKey) return false;
  if(k==="Tab"){ return s5MoveOp(e.shiftKey ? -1 : 1) ? done() : false; }
  if(e.shiftKey) return false;
  if(k==="ArrowRight" && lxSel().caret.iid!=null){ lxSel().rungs = new Set(); return s5MoveOp(1) ? done() : false; }
  if(k==="ArrowLeft" && lxSel().caret.iid!=null){ lxSel().rungs = new Set(); return s5MoveOp(-1) ? done() : false; }
  if(k==="ArrowUp" || k==="ArrowDown") return s5MoveVert(k==="ArrowDown" ? 1 : -1) ? done() : false;
  if(k==="F6" && S.s5Split) { s5FocusPane(S.s5Pane===2 ? 1 : 2); return done(); }
  return false;
}
vcsKeyHooks.splice(Math.max(0, vcsKeyHooks.indexOf(lxKeys)), 0, s5LadderKeys);

/* ======================================================================
   L04: split window (two panes of the same routine)
   ====================================================================== */
S.s5Split = false; S.s5Pane = 1; S.s5Lsel2 = null;
(function(){
  const c = $("center"), d2 = document.createElement("div"); d2.id = "doc2"; d2.tabIndex = -1;
  const bar = document.createElement("div"); bar.id = "s5SplitBar"; bar.title = "Drag to size the panes";
  c.appendChild(bar); c.appendChild(d2);
  bar.onmousedown = (e) => { e.preventDefault(); const r = c.getBoundingClientRect();
    const mv = (ev) => { const h = Math.max(60, Math.min(r.height - 120, r.bottom - ev.clientY)); c.style.setProperty("--s5split", h + "px"); };
    const up = () => { removeEventListener("mousemove", mv); removeEventListener("mouseup", up); setTimeout(lxSyncScroll, 0); };
    addEventListener("mousemove", mv); addEventListener("mouseup", up); };
  d2.addEventListener("scroll", () => { if(S.s5Low) S.s5Low.paint(); }, {passive:true});
  d2.addEventListener("mousedown", () => s5FocusPane(2), true);
  $("doc").addEventListener("mousedown", () => s5FocusPane(1), true);
  d2.addEventListener("wheel", (e) => { if(!(e.ctrlKey || e.metaKey) || !S.s5Split) return; e.preventDefault(); s5Zoom2(e.deltaY < 0 ? 0.1 : -0.1); }, {passive:false});
})();
function s5ToggleSplit(on){
  if(!S.R || S.active!==lxKey()){ log("Split: open a routine first", "wrn"); return; }
  S.s5Split = on!=null ? on : !S.s5Split;
  $("center").classList.toggle("s5split", S.s5Split);
  if(!S.s5Split){ $("doc2").innerHTML = ""; S.s5Low = null; if(S.s5Pane===2) s5FocusPane(1); }
  else s5RenderLow();
  setTimeout(lxSyncScroll, 0);
}
function s5Zoom2(d){ const lad = document.querySelector("#doc2 .ladder"); if(!lad) return; const z = Math.max(0.5, Math.min(2, (S.s5Zoom2 || 1) + d)); S.s5Zoom2 = Math.round(z * 10) / 10; lad.style.zoom = S.s5Zoom2; }
function s5RenderLow(){
  const d2 = $("doc2"); if(!S.s5Split || !S.R || !S.R.data){ return; }
  if(S.R.data.type==="ST"){ if(window.s5StSplit) s5StSplit(d2); return; }
  if(S.R.data.type!=="RLL" || !S.R.data.rungs){ d2.innerHTML = `<div class="notice">Split view shows ladder and Structured Text routines.</div>`; return; }
  const top = d2.scrollTop, r = S.R.data, dyn = [], flows = [];
  const wrap = document.createElement("div"); wrap.className = "ladder s5low" + (r.rungs.length > 60 ? " big" : ""); wrap.tabIndex = 0;
  r.rungs.forEach(rung => wrap.appendChild(monitorRung(rung, dyn, flows)));
  const end = document.createElement("div"); end.className = "rung endrung"; end.innerHTML = `<div class="rnum"></div><div class="rline endline"><span>(End)</span></div>`; wrap.appendChild(end);
  d2.innerHTML = ""; d2.appendChild(wrap);
  if(S.s5Zoom2) wrap.style.zoom = S.s5Zoom2;
  wrap.querySelectorAll(":scope > .rung[data-n]").forEach(rd => { const c = rd.querySelector(":scope > div > .rcomment"); if(c){ c.classList.add("rctop"); rd.prepend(c); } });
  if(window.ideSymbols) ideSymbols();
  if(window.lookBlocks) lookBlocks(wrap);
  d2.querySelectorAll(".ins .sym:not([data-sym])").forEach(s => { s.dataset.sym = s.textContent.replace(/\s+/g, ""); });
  const byRung = new Map(); dyn.forEach(x => { if(x.rung===undefined) return; if(!byRung.has(x.rung)) byRung.set(x.rung, []); byRung.get(x.rung).push(x); });
  const flowBy = new Map(flows.map(f => [f.rung, f]));
  const paint = () => { const vis = []; const dr = d2.getBoundingClientRect();
    wrap.querySelectorAll(":scope > .rung[data-n]").forEach(rd => { const b = rd.getBoundingClientRect(); if(b.bottom > dr.top - 200 && b.top < dr.bottom + 200) vis.push(+rd.dataset.n); });
    const ds = [], fs = []; vis.forEach(n => { (byRung.get(n) || []).forEach(x => ds.push(x)); if(flowBy.has(n)) fs.push(flowBy.get(n)); }); paintLadder(ds, fs); };
  S.s5Low = {paint, wrap};
  d2.scrollTop = top; paint();
  if(S.s5Lsel2) s5PaintPane2();
}
function s5PaintPane2(){
  const wrap = document.querySelector("#doc2 .ladder"); if(!wrap) return;
  const L = S.s5Pane===2 ? lxSel() : S.s5Lsel2; if(!L) return;
  wrap.querySelectorAll(".lsel,.caret,.msel").forEach(x => x.classList.remove("lsel", "caret", "msel"));
  L.rungs.forEach(n => { const el = wrap.querySelector(`.rung[data-n="${n}"]`); if(el) el.classList.add("lsel"); });
  const re = wrap.querySelector(`.rung[data-n="${L.caret.rung}"]`) || wrap.querySelector(".endrung"); if(!re) return;
  const ie = L.caret.iid!=null ? re.querySelector(`.ins[data-iid="${L.caret.iid}"]`) : null;
  (ie || re).classList.add("caret");
}
function s5FocusPane(p){
  if(!S.s5Split || p===S.s5Pane){ if(!S.s5Split) S.s5Pane = 1; return; }
  /* each pane has its own caret and selection: swap them */
  const k = lxKey(), mine = S.lsel && S.lsel.id===k ? S.lsel : null;
  const other = S.s5Lsel2 && S.s5Lsel2.id===k ? S.s5Lsel2 : null;
  S.s5Lsel2 = mine; S.lsel = other || (mine ? {...mine, rungs:new Set(mine.rungs), ins:new Set(mine.ins), caret:{...mine.caret}} : null);
  S.s5Pane = p;
  $("doc").classList.toggle("s5pane", p===1); $("doc2").classList.toggle("s5pane", p===2);
  if(p===2){ s5PaintPane2(); const w = document.querySelector("#doc2 .ladder"); if(w) w.focus({preventScroll:true}); }
  else { lxPaint(); s5PaintPane2(); const w = document.querySelector("#doc .ladder"); if(w) w.focus({preventScroll:true}); }
  s5Position();
}
(function(){
  const _w = lxWrap;
  lxWrap = function(){ if(S.s5Split && S.s5Pane===2){ const w = document.querySelector("#doc2 .ladder"); if(w) return w; } return _w(); };
  const _lp = lxPaint;
  lxPaint = function(){ _lp.apply(this, arguments); if(S.s5Split){ s5PaintPane2(); } s5SelPaint(); };
  const _rl = renderLadder;
  renderLadder = function(){ const r = _rl.apply(this, arguments); if(S.s5Split) s5RenderLow(); return r; };
  const _live = () => { if(S.s5Split && S.s5Low) S.s5Low.paint(); };
  setInterval(_live, 400);
  /* other routines: split follows the active tab */
  const _rd = renderDoc;
  renderDoc = function(){ const r = _rd.apply(this, arguments); if(S.s5Split){ if(!(S.R && S.active===lxKey())) s5ToggleSplit(false); else setTimeout(s5RenderLow, 50); } return r; };
  /* a rung edit always opens in the upper pane */
  const _se = startEdit;
  startEdit = function(){ if(S.s5Split && S.s5Pane===2) s5FocusPane(1); return _se.apply(this, arguments); };
})();
window.s5ToggleSplit = s5ToggleSplit; window.s5RenderLow = s5RenderLow;

/* ======================================================================
   L06: page header (routine description)
   ====================================================================== */
function s5PageHeader(){
  const w = lxWrap(); if(!w) return; const h = w.querySelector(":scope > .rhead"); if(!h) return;
  let d = h.querySelector(".s5desc"); if(!d){ d = document.createElement("span"); d.className = "s5desc"; h.insertBefore(d, h.firstChild.nextSibling); }
  d.textContent = (S.R.data.description || "").trim() ? `— ${S.R.data.description.trim()}` : "— (no routine description)";
}

/* ======================================================================
   L16 / L17 / L39 / L46 / L12: instruction and rung menu commands
   ====================================================================== */
/* parameter commands open the rung editor with the change made: the new parameter is
   a ? to fill in, then Finalize applies it (as a pending edit in Studio) */
function s5Args(n, iid, fn, msg){
  if(!lxEditable()) return;
  if(S.edit){ log("Finish or cancel the open edit first", "wrn"); return; }
  startEdit(n, iid); const E = S.edit; if(!E) return;
  const node = instrOrder(E.tree)[iid]; if(!node){ cancelEdit(); return; }
  edPush();
  if(fn(node)===false) return;
  E.sel = {id: node._id}; renderEditor(); scheduleValidate(0, true);
  const q = node.args.indexOf("?");
  setTimeout(() => { const i = document.querySelector(`#eInstr input[data-op="${q >= 0 ? q : 0}"]`); if(i){ i.focus(); i.select(); } }, 0);
  log(`Rung ${n}: ${msg} — fill it in and Finalize (Ctrl+Enter)`);
}
function s5ParamItems(n, iid, k){
  const ins = lxInstrs(n)[iid]; if(!ins) return [];
  const nm = ins.name.toUpperCase(), out = [], ed = lxEditable();
  if(nm==="JSR"){
    out.push(["Add Input Parameter", () => s5Args(n, iid, (x) => { const c = parseInt(x.args[1] || "0", 10) || 0; while(x.args.length < 2) x.args.push("0"); x.args.splice(2 + c, 0, "?"); x.args[1] = String(c + 1); }, "JSR input parameter added"), !ed],
             ["Add Return Parameter", () => s5Args(n, iid, (x) => { while(x.args.length < 2) x.args.push("0"); x.args.push("?"); }, "JSR return parameter added"), !ed]);
    if(k!=null && k >= 2) out.push(["Remove Parameter", () => s5Args(n, iid, (x) => { const c = parseInt(x.args[1] || "0", 10) || 0; x.args.splice(k, 1); if(k < 2 + c) x.args[1] = String(c - 1); }, "JSR parameter removed"), !ed]);
  }
  if(nm==="SBR" || nm==="RET"){
    out.push([nm==="SBR" ? "Add Input Parameter" : "Add Return Parameter", () => s5Args(n, iid, (x) => { x.args.push("?"); }, `${nm} parameter added`), !ed]);
    if(k!=null) out.push(["Remove Parameter", () => s5Args(n, iid, (x) => { x.args.splice(k, 1); }, `${nm} parameter removed`), !ed]);
  }
  const aoi = aoiDef(nm);
  if(aoi && ins.args.length > 1 + aoi.call.length) out.push(["Remove All Unknown Parameters", () => s5Args(n, iid, (x) => { x.args = x.args.slice(0, 1 + aoi.call.length); }, `${ins.args.length - 1 - aoi.call.length} unknown parameter(s) removed`), !ed]);
  return out;
}
(function(){
  const extra = window.lxMenuExtra;
  window.lxMenuExtra = function(kind, n, iid, k){
    const base = extra ? extra(kind, n, iid, k) : [];
    if(kind==="rung"){
      const more = ["-", ["Go To Calling Routine", () => s5GoCalling(), false],
        [S.s5Split ? "Remove Split" : "Split Window", () => s5ToggleSplit(), false]];
      if(S.s5Sel){ more.unshift("-", [S.s5Sel.kind==="branch" ? "Move Branch Rail…" : "Edit Branch Level as Text", () => { if(S.s5Sel.kind==="branch") s5MoveRail(S.s5Sel.rung, S.s5Sel.bidx); else s5LadderKeys(new KeyboardEvent("keydown", {key:"Enter"})); }, !lxEditable()]); }
      return [...base, ...more];
    }
    const ins = lxInstrs(n)[iid]; if(!ins) return base;
    const items = [...base];
    const op = lxOpAddr(n, iid, k);
    if(op && op.addr && lxTagKnown(op.addr)){
      const d = findDef(op.addr);
      items.push(["Edit Main Operand Description…", () => tagDescDialog(op.addr), !(S.project && S.project.authoring), "Ctrl+D"]);
      if(d && d.address!==op.addr) items.push([`Edit Base Tag Description (${d.address.replace(/^Program:[^.]+\./, "")})…`, () => tagDescDialog(d.address), !(S.project && S.project.authoring)]);
      items.push([`Trend "${op.raw.length > 24 ? op.raw.slice(0, 22) + "…" : op.raw}"`, () => s5Trend(op.addr)]);
    }
    items.push(...s5ParamItems(n, iid, k));
    if(/^(JSR|FOR)$/i.test(ins.name) && ins.args[0] && ins.args[0]!=="?") items.push(["Go To Called Routine", () => openRoutine(S.R.prog, ins.args[0])]);
    items.push(["Select All Instructions", () => { const L = lxSel(); L.ins = new Set(lxInstrs(n).map((_, i) => i)); lxPaint(); }, false, "Ctrl+A"]);
    return items;
  };
})();

/* ======================================================================
   L20 / L22 / L26 / L27: operands
   ====================================================================== */
const S5_DEST = new Set(["dest", "tag"]);
(function(){
  const _ie = inlineEdit;
  inlineEdit = function(n, iid, k, initial){
    const ok = _ie.apply(this, arguments);
    const inp = $("opEdit"); if(!ok || !inp) return ok;
    S.s5InlineAt = performance.now();
    const ins = lxInstrs(n)[iid], sp = ins && spec(ins.name), o = sp && sp.operands[Math.min(k || 0, sp.operands.length - 1)];
    if(o && S5_DEST.has(o.kind)){ inp.removeAttribute("list"); inp.title = inp.title.replace(" · Alt+↓: browse tags", "") + " · destination: type the tag (Alt+↓ browses)"; }
    /* arrows commit (and move like Enter / Shift+Tab); a menu, a scroll or leaving the
       window discards */
    inp.addEventListener("keydown", (e) => {
      if((e.key==="ArrowUp" || e.key==="ArrowDown") && !e.altKey){ e.preventDefault(); e.stopImmediatePropagation(); inp.dispatchEvent(new KeyboardEvent("keydown", {key:"Enter", bubbles:false})); }
    }, true);
    return ok;
  };
  const discard = (why) => { if(S.inline && S.inline.inp && !S.inline.busy){ const st = S.inline; closeInline(); lxSetCaret(st.n, st.iid, st.k); if(why) statusMsg && statusMsg(`Operand edit discarded (${why})`, "message"); } };
  document.addEventListener("contextmenu", (e) => { if(S.inline && !(e.target && e.target.id==="opEdit")) discard("menu"); }, true);
  window.addEventListener("blur", () => discard("focus left the window"));
  document.addEventListener("scroll", (e) => { if(S.inline && e.target && (e.target.id==="doc" || e.target.id==="doc2") && !$("tbrowse") && performance.now() - (S.s5InlineAt || 0) > 500) discard("scroll"); }, true);
  /* rung editor: destination operand fields without the drop-down list */
  const _ri = renderInstrEditor;
  renderInstrEditor = function(){
    const r = _ri.apply(this, arguments);
    const E = S.edit; if(!E || !E.sel || E.sel.id==null) return r;
    const f = findNode(E.sel.id), n = f && f.node, sp = n && n.kind!=="branch" && spec(n.name);
    if(sp) document.querySelectorAll("#eInstr input[data-op]").forEach(i => { const o = sp.operands[Math.min(+i.dataset.op, sp.operands.length - 1)]; if(o && S5_DEST.has(o.kind)) i.removeAttribute("list"); });
    return r;
  };
})();
/* ?? where a value cannot be read */
(function(){
  const _pl = paintLadder;
  paintLadder = function(dyn, flows){
    _pl.apply(this, arguments);
    for(const d of dyn){
      const unreadable = (a) => a && val(a)===undefined && !/\[[^\]]*[A-Za-z_]/.test(a) && Object.keys(S.values).length > 0 && !(window.val2 && val2(a)!==undefined) && !lxTagKnown(a);
      if(d.kind==="num" && !d.el.textContent && unreadable(d.addr)){ d.el.textContent = "??"; d.el.title = `${d.addr}: the value could not be read`; }
      if(d.kind==="bit" && unreadable(d.addr)){ const s = d.el.querySelector(".val"); if(s && !s.textContent) s.textContent = "??"; }
    }
  };
})();
/* phantom operands (Preset / Accum of timers and counters, Length / Position of control
   structures): editing writes the tag member, the rung is not changed */
window.addEventListener("dblclick", (e) => {
  const row = e.target.closest && e.target.closest(".ladder .rung[data-n] .box .br[data-k]"); if(!row) return;
  const lv = row.querySelector(".lv[data-a]"); if(!lv || !/\.(PRE|ACC|LEN|POS)$/.test(lv.dataset.a || "")) return;
  const ins = row.closest(".ins[data-iid]"), rd = row.closest(".rung[data-n]"); const it = ins && lxInstrs(+rd.dataset.n)[+ins.dataset.iid];
  const sp = it && spec(it.name), o = sp && sp.operands[+row.dataset.k]; if(!o || o.kind!=="imm") return;
  e.preventDefault(); e.stopImmediatePropagation();
  lvEdit(lv);
}, true);
(function(){
  /* the rung editor: a Preset / Accum typed there is written to the tag on Finalize */
  const _fin = finalize;
  finalize = async function(){
    const E = S.edit, writes = [];
    if(E && !E.st && !E.textMode){
      const orig = E.mode==="edit" && S.R.data.rungs[E.index] && !S.R.data.rungs[E.index].error ? instrOrder(S.R.data.rungs[E.index].tree) : [];
      instrOrder(E.tree).forEach((n, i) => { const sp = spec(n.name); if(!sp) return;
        const base = n.args[0] && n.args[0]!=="?" ? aoiAddr(S.R.prog, n.args[0]) : null; if(!base) return;
        sp.operands.forEach((o, k) => { if(o.kind!=="imm" || !/^(Preset|Accum|Length|Position)$/i.test(o.name)) return; const v = n.args[k];
          const was = orig[i] && orig[i].name.toUpperCase()===n.name.toUpperCase() ? orig[i].args[k] : undefined;
          if(v!=null && /^[-+]?\d+$/.test(v) && v!==was) writes.push([`${base}.${({preset:"PRE", accum:"ACC", length:"LEN", position:"POS"})[o.name.toLowerCase()]}`, v]); }); });
    }
    const r = await _fin.apply(this, arguments);
    if(!S.edit && writes.length){ for(const [a, v] of writes){ try { await write(a, v); } catch(err){} } }
    return r;
  };
})();

/* ======================================================================
   L31: Tag Browser with Filter (Name / Description / Both), history and a Show menu
   ====================================================================== */
S.s5Tb = (() => { try { return {mode:"both", show:{base:true, alias:true, produced:true, consumed:true, unused:true}, type:"", ...JSON.parse(lsGet("S5Tb") || "{}")}; } catch(e){ return {mode:"both", show:{base:true, alias:true, produced:true, consumed:true, unused:true}, type:""}; } })();
openTagBrowser = async function(input, types, onPick, opts){
  opts = opts || {};
  closeTagBrowser();
  const prog = S.R && S.R.prog && !S.R.prog.startsWith("AOI:") ? S.R.prog : "";
  let d; try { d = await api("GET", `/api/studio/tagbrowser?program=${encodeURIComponent(prog)}&depth=3`); } catch(e){ log(e.message, "err"); return; }
  if(opts.keepFocus && (!S.inline || S.inline.inp!==input)) return;
  const want = (types||[]).filter(t => t && t!=="any");
  const fits = (t) => !want.length || want.includes((t||"").replace(/\[.*$/, ""));
  const BITW = {SINT:8, USINT:8, INT:16, UINT:16, DINT:32, UDINT:32, LINT:64, ULINT:64};
  const kidsOf = (it) => (it.members && it.members.length) ? it.members
    : (BITW[String(it.type||"").replace(/\[.*$/, "")] && !/\[/.test(it.type||"") ? Array.from({length: BITW[it.type]}, (_, i) => ({name: String(i), type: "BOOL"})) : []);
  const fitsDeep = (it, lvl=0) => fits(it.type) || (lvl<3 && kidsOf(it).some(m => fitsDeep(m, lvl+1)));
  const T = S.s5Tb, hist = (() => { try { return JSON.parse(lsGet("S5TbHist") || "[]"); } catch(e){ return []; } })();
  const typesHere = [...new Set(d.items.map(it => (it.base_type || it.type || "").replace(/\[.*$/, "")).filter(Boolean))].sort();
  const box = document.createElement("div"); box.id = "tbrowse"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "Tag Browser");
  box.innerHTML = `<div class="tbscope" role="tablist">
      <button type="button" role="tab" data-sc="all">All</button>
      ${prog ? `<button type="button" role="tab" data-sc="local">Local Tags (${esc(prog)})</button>` : ""}
      <button type="button" role="tab" data-sc="controller">Controller Tags</button></div>
    <div class="s5tbf"><span>Filter on</span><select id="s5tbm" title="Search the name, the description or both"><option value="name">Name</option><option value="desc">Description</option><option value="both">Both</option></select>
      <select id="s5tbt" title="Data type"><option value="">All data types</option>${typesHere.map(t => `<option ${t===T.type?"selected":""}>${esc(t)}</option>`).join("")}</select>
      <span class="s5show"><button type="button" id="s5tbs" title="Show">Show ▾</button><div class="s5showm" id="s5tbsm">
        ${[["base","Base tags"],["alias","Alias tags"],["produced","Produced tags"],["consumed","Consumed tags"],["unused","Unused tags"]].map(([k, l]) => `<label><input type="checkbox" data-sh="${k}" ${T.show[k]!==false?"checked":""}> ${l}</label>`).join("")}</div></span></div>
    <div class="tbh"><input id="tbq" placeholder="Filter…" spellcheck="false" autocomplete="off" list="s5tbh"><datalist id="s5tbh">${hist.map(h => `<option value="${esc(h)}">`).join("")}</datalist>
     ${want.length?`<label><input type="checkbox" id="tbfit" checked> only ${esc(want.join("/"))}</label>`:""}</div><div class="tbl" role="listbox"></div>`;
  document.body.appendChild(box);
  $("s5tbm").value = T.mode;
  const r = input.getBoundingClientRect();
  box.style.left = Math.max(4, Math.min(r.left, innerWidth - 400)) + "px";
  box.style.top = (r.bottom + 2 + 330 > innerHeight ? Math.max(4, r.top - 332) : r.bottom + 2) + "px";
  const open = new Set();
  let scope = prog ? S.tbScope : (S.tbScope==="local" ? "all" : S.tbScope);
  const save = () => lsSet("S5Tb", JSON.stringify(S.s5Tb));
  const kindOf = (it) => it.alias_for ? "alias" : String(it.tag_type || "Base").toLowerCase();
  const draw = () => {
    box.querySelectorAll("[data-sc]").forEach(b => { b.classList.toggle("on", b.dataset.sc===scope); b.setAttribute("aria-selected", b.dataset.sc===scope ? "true" : "false"); });
    const q = $("tbq").value.toLowerCase(), only = $("tbfit") ? $("tbfit").checked : false, mode = T.mode;
    const rows = [];
    const add = (it, path, lvl) => {
      const kids = kidsOf(it), k = lvl===0 ? kindOf(it) : "";
      rows.push(`<div class="tbi ${fits(it.type)?"fit":""}" role="option" data-p="${esc(path)}" style="padding-left:${6+lvl*14}px">
        <span class="tbx" data-x="${esc(path)}">${kids.length?(open.has(path)?"▾":"▸"):""}</span><b>${esc(it.name)}</b>
        <span class="dim">${esc(it.type)}</span>${k && k!=="base" ? `<span class="s5k">${esc(k)}</span>` : ""}${lvl===0 && it.used===false ? `<span class="s5k">unused</span>` : ""}${it.description?` <span class="dim">${esc(it.description)}</span>`:""}</div>`);
      if(open.has(path)) kids.forEach(m => add(m, `${path}.${m.name}`, lvl+1));
    };
    const match = (it) => {
      const name = it.name.toLowerCase(), desc = (it.description||"").toLowerCase();
      const hitq = !q || (mode!=="desc" && name.includes(q)) || (mode!=="name" && desc.includes(q));
      const k = kindOf(it), sh = T.show;
      const kind = sh[k==="alias" ? "alias" : k==="produced" ? "produced" : k==="consumed" ? "consumed" : "base"] !== false;
      const used = sh.unused !== false || it.used !== false;
      const ty = !T.type || (it.base_type || it.type || "").replace(/\[.*$/, "")===T.type;
      return hitq && kind && used && ty && (!only || fitsDeep(it));
    };
    const local = d.items.filter(it => it.scope!=="controller" && match(it)), ctl = d.items.filter(it => it.scope==="controller" && match(it));
    if(scope!=="controller" && prog){ rows.push(`<div class="tbgrp">Local Tags — ${esc(prog)}</div>`); local.slice(0, 300).forEach(it => add(it, it.name, 0)); if(!local.length) rows.push(`<div class="dim" style="padding:2px 8px">none</div>`); }
    if(scope!=="local"){ rows.push(`<div class="tbgrp">Controller Tags</div>`); ctl.slice(0, 300).forEach(it => add(it, it.name, 0)); if(!ctl.length) rows.push(`<div class="dim" style="padding:2px 8px">none</div>`); }
    box.querySelector(".tbl").innerHTML = rows.join("");
  };
  const remember = () => { const q = $("tbq").value.trim(); if(!q) return; const h = [q, ...hist.filter(x => x!==q)].slice(0, 12); lsSet("S5TbHist", JSON.stringify(h)); };
  const pick = (p) => { remember(); onPick(p); closeTagBrowser(); };
  box.addEventListener("mousedown", (e) => { if(opts.keepFocus && !e.target.closest("input,select")) e.preventDefault(); });
  box.addEventListener("click", (e) => {
    e.stopPropagation();
    if(e.target.id==="s5tbs"){ $("s5tbsm").classList.toggle("on"); return; }
    const sc = e.target.closest("[data-sc]"); if(sc){ scope = sc.dataset.sc; S.tbScope = scope; lsSet("TbScope", scope); draw(); return; }
    const x = e.target.dataset.x; if(x){ open.has(x) ? open.delete(x) : open.add(x); draw(); return; }
    const row = e.target.closest(".tbi"); if(row) pick(row.dataset.p);
  });
  box.querySelectorAll("[data-sh]").forEach(c => c.onchange = () => { T.show[c.dataset.sh] = c.checked; save(); draw(); });
  $("s5tbm").onchange = (e) => { T.mode = e.target.value; save(); draw(); };
  $("s5tbt").onchange = (e) => { T.type = e.target.value; save(); draw(); };
  $("tbq").oninput = draw; if($("tbfit")) $("tbfit").onchange = draw;
  $("tbq").onkeydown = (e) => { if(e.key==="Escape"){ closeTagBrowser(); input.focus(); }
                                if(e.key==="Enter"){ const first = box.querySelector(".tbi"); if(first) pick(first.dataset.p); } };
  if(opts.keepFocus){
    const sync = () => { if(!$("tbrowse")) { input.removeEventListener("input", sync); return; } const v = input.value.trim(); $("tbq").value = v==="?" ? "" : v; draw(); };
    input.addEventListener("input", sync);
  } else $("tbq").focus();
  draw();
};

/* ======================================================================
   L34: one undo history per routine, also over the rung editor
   ====================================================================== */
(function(){
  const _eu = edUndo;
  edUndo = function(){
    const E = S.edit;
    if(E && !E.st && !(E.hist && E.hist.length)){
      S.s5EditRedo = {prog:E.prog, routine:E.routine, mode:E.mode, index:E.index, tree:E.tree, text:E.text, comment:E.comment, textMode:E.textMode};
      cancelEdit(); log(`Undo: the edit of rung ${E.index} is undone (Ctrl+Y brings it back)`); return;
    }
    return _eu.apply(this, arguments);
  };
  const _rr = lxRedo;
  lxRedo = async function(){
    const x = S.s5EditRedo;
    if(x && S.R && x.prog===S.R.prog && x.routine===S.R.routine && !S.edit){
      S.s5EditRedo = null;
      if(x.mode==="insert") startInsert(x.index); else startEdit(x.index, null);
      const E = S.edit; if(E){ E.tree = x.tree; E.text = x.text; E.comment = x.comment; E.textMode = x.textMode; renderEditor(); scheduleValidate(0, true); }
      log(`Redo: the edit of rung ${x.index} is back`); return;
    }
    return _rr.apply(this, arguments);
  };
  /* any other change forgets the cancelled edit */
  const _ul = lxUndo; lxUndo = async function(){ S.s5EditRedo = null; return _ul.apply(this, arguments); };
})();

/* ======================================================================
   L36 / L37 / L38: dragging operands, several instructions and branch rails
   ====================================================================== */
document.addEventListener("mousedown", (e) => {
  if(!lxIsLadder() || S.edit || !lxEditable() || !e.target.closest) return;
  const op = e.target.closest(".ladder .rung[data-n] .ins[data-iid] [data-k]");
  if(op && !e.target.closest(".bt")){ op.draggable = true; const ins = op.closest(".ins"); if(ins) ins.draggable = false; setTimeout(() => { if(ins) ins.draggable = true; }, 0); }
}, true);
document.addEventListener("dragstart", (e) => {
  const t = e.target; if(!t || !t.closest || !lxIsLadder()) return;
  if(t.matches && t.matches(".ladder .rung[data-n] .ins[data-iid] [data-k]")){
    const ins = t.closest(".ins[data-iid]"), n = +t.closest(".rung[data-n]").dataset.n, iid = +ins.dataset.iid, k = +t.dataset.k;
    const it = lxInstrs(n)[iid]; const raw = it ? (it.args[k] || "") : "";
    if(!raw || raw==="?"){ e.preventDefault(); return; }
    e.stopImmediatePropagation();
    S.drag = {kind:"tag", addr: raw, op:{n, iid, k}};
    e.dataTransfer.setData("text/x-vcs-tag", raw); e.dataTransfer.setData("text/plain", raw); e.dataTransfer.effectAllowed = "copy";
    return;
  }
  /* several selected instructions move (or copy) together */
  if(t.classList && t.classList.contains("ins") && t.dataset.iid!=null){
    const n = +t.closest(".rung[data-n]").dataset.n, iid = +t.dataset.iid, L = lxSel();
    if(L.caret.rung===n && L.ins.size > 1 && L.ins.has(iid)) setTimeout(() => { if(S.drag && S.drag.kind==="ins") S.drag.iids = lxSort(L.ins); }, 0);
  }
}, true);
document.addEventListener("dragend", (e) => { const t = e.target; if(t && t.matches && t.matches("[data-k]")) t.draggable = false; }, true);
(function(){
  const _di = dropIns;
  dropIns = async function(d, t, copy){
    if(!d.iids || d.iids.length < 2) return _di.apply(this, arguments);
    const R = S.R.data.rungs, src = R[d.rung], dst = R[t.rung]; if(!src || !dst || src.error || dst.error) return;
    const order = instrOrder(src.tree), moving = d.iids.map(i => order[i]).filter(Boolean).map(n => ({kind:"instr", _id: nextNode++, name:n.name, args:[...n.args]}));
    if(!copy && t.rung===d.rung && t.iid!=null && d.iids.includes(t.iid)){ log("Dropped onto the selection: nothing changed"); return; }
    const same = t.rung===d.rung;
    const a = copy ? cloneTree(src.tree) : lxWithout(cloneTree(src.tree), d.iids);
    const b = same ? a : cloneTree(dst.tree);
    let tid = t.iid; if(tid!=null && same && !copy) tid -= d.iids.filter(i => i < t.iid).length;
    const target = tid==null ? null : instrOrder(b)[tid];
    if(target){ const g = findNode(target._id, b); g.list.splice(t.before ? g.index : g.index + 1, 0, ...moving); }
    else if(moving.every(isInputNode)) b.splice(tailStart(b), 0, ...moving); else b.push(...moving);
    const ops = [];
    if(same) ops.push({op:"replace", index:d.rung, text:serialize(a), comment:src.comment||""});
    else { if(!copy) ops.push({op:"replace", index:d.rung, text:serialize(a), comment:src.comment||""}); ops.push({op:"replace", index:t.rung, text:serialize(b), comment:dst.comment||""}); }
    return runBatch(ops, `${copy ? "Copied" : "Moved"} ${moving.length} instructions to rung ${t.rung} (one undo step)`, () => { lxSel().caret = {rung:t.rung, iid:null, op:null}; lxSel().ins = new Set(); });
  };
})();
/* branch rails: press on a left rail and drag the level onto another branch (or to another
   place in its branch); press on a right rail and drag to a wire to extend / shrink the
   branch; with Ctrl or Alt the whole branch moves there */
function s5RailTargets(n, bidx, whole){
  const rd = lxRungEl(n), r = s5Rung(n); if(!rd || !r) return [];
  const be = s5BranchEls(rd)[bidx]; if(!be) return [];
  const parent = be.parentElement, kids = [...parent.children], wires = kids.filter(x => x.classList.contains("wire"));
  const items = kids.filter(x => !x.classList.contains("wire")), bi = items.indexOf(be);
  const out = [];
  if(whole){ wires.forEach((w, k) => { if(k!==bi && k!==bi + 1) out.push({w, kind:"move", k}); }); return out; }
  wires.forEach((w, k) => { if(k > bi + 1) out.push({w, kind:"extend", k}); });
  const lv0 = [...be.children].find(x => x.classList.contains("series"));
  if(lv0){ const lw = [...lv0.children].filter(x => x.classList.contains("wire")); lw.forEach((w, j) => { if(j >= 1 && j < lw.length - 1) out.push({w, kind:"shrink", j}); }); }
  return out;
}
async function s5ApplyRail(n, bidx, tg){
  const r = s5Rung(n); if(!r) return;
  const tree = cloneTree(r.tree), w = s5Walk(tree), br = w.brs[bidx], pl = w.places[bidx]; if(!br) return;
  const list = pl.list, bi = pl.index;
  if(tg.kind==="extend"){ const take = list.splice(bi + 1, tg.k - bi - 1); br.legs[0].push(...take); }
  else if(tg.kind==="shrink"){ const out = br.legs[0].splice(tg.j); list.splice(bi + 1, 0, ...out); }
  else if(tg.kind==="move"){ list.splice(bi, 1); list.splice(tg.k > bi ? tg.k - 1 : tg.k, 0, br); }
  await s5Replace(n, tree, `Rung ${n}: branch ${tg.kind==="move" ? "moved" : tg.kind==="extend" ? "extended" : "shrunk"}`);
}
async function s5MoveLevel(n, bidx, li, tb, tli){
  const r = s5Rung(n); if(!r) return;
  const tree = cloneTree(r.tree), w = s5Walk(tree), br = w.brs[bidx], dst = w.brs[tb]; if(!br || !dst) return;
  const lv = br.legs.splice(li, 1)[0];
  dst.legs.splice(Math.min(tli, dst.legs.length), 0, lv);
  if(br.legs.length===1 && br!==dst){ const pl = w.places[bidx]; pl.list.splice(pl.index, 1, ...br.legs[0]); }
  await s5Replace(n, tree, `Rung ${n}: branch level moved`);
}
document.addEventListener("mousedown", (e) => {
  if(e.button!==0 || !lxIsLadder() || S.edit || !lxEditable() || !e.target.closest) return;
  const hit = s5RailHit(e); if(!hit) return;
  const x0 = e.clientX, y0 = e.clientY, lad = e.target.closest(".ladder"); let on = false, targets = [], hot = null, ghost = null;
  const whole = () => e.ctrlKey || e.altKey || S.s5DragMods;
  const mv = (ev) => {
    if(!on){ if(Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) < 6) return; on = true; lad.classList.add("s5drag");
      ghost = document.createElement("div"); ghost.id = "s5Ghost"; document.body.appendChild(ghost);
      if(hit.side==="right"){ S.s5DragMods = ev.ctrlKey || ev.altKey; targets = s5RailTargets(hit.n, hit.bidx, whole()); targets.forEach(t => t.w.classList.add("s5ok")); }
      else { const rd = lxRungEl(hit.n); targets = s5BranchEls(rd).map((b, bidx) => ({b, bidx})); targets.forEach(t => t.b.classList.add("s5ok")); } }
    const r = hit.el.getBoundingClientRect(); ghost.style.left = ev.clientX + "px"; ghost.style.top = r.top + "px"; ghost.style.height = Math.max(20, r.height) + "px";
    document.querySelectorAll(".s5ok.hot").forEach(x => x.classList.remove("hot")); hot = null;
    if(hit.side==="right"){ let best = null; targets.forEach(t => { const b = t.w.getBoundingClientRect(), d = Math.abs(ev.clientX - (b.left + b.width / 2)) + Math.abs(ev.clientY - b.top - Math.min(40, b.height / 2)) / 3; if(!best || d < best.d) best = {d, t}; });
      if(best && best.d < 60){ hot = best.t; hot.w.classList.add("hot"); } }
    else { const lv = document.elementFromPoint(ev.clientX, ev.clientY); const s = lv && lv.closest && lv.closest(".branch > .series");
      if(s && s.closest(".rung[data-n]") && +s.closest(".rung[data-n]").dataset.n===hit.n){ const b = s.parentElement, t = targets.find(x => x.b===b); if(t){ const li = [...b.children].indexOf(s), r2 = s.getBoundingClientRect();
        hot = {bidx:t.bidx, li: ev.clientY > r2.top + r2.height / 2 ? li + 1 : li}; s.classList.add("s5ok", "hot"); } } }
  };
  const up = async () => {
    removeEventListener("mousemove", mv, true); removeEventListener("mouseup", up, true);
    if(ghost) ghost.remove(); lad.classList.remove("s5drag"); document.querySelectorAll(".s5ok").forEach(x => x.classList.remove("s5ok", "hot"));
    S.s5DragMods = false;
    if(!on || !hot) return;
    S.s5Suppress = performance.now();
    if(hit.side==="right") await s5ApplyRail(hit.n, hit.bidx, hot);
    else { if(hot.bidx===hit.bidx && (hot.li===hit.li || hot.li===hit.li + 1)) return; await s5MoveLevel(hit.n, hit.bidx, hit.li, hot.bidx, hot.bidx===hit.bidx && hot.li > hit.li ? hot.li - 1 : hot.li); }
  };
  addEventListener("mousemove", mv, true); addEventListener("mouseup", up, true);
}, true);
/* Move Branch Rail: letters at the places the right rail can go */
function s5MoveRail(n, bidx){
  if(!lxEditable()) return;
  document.querySelectorAll(".s5lab").forEach(x => x.remove());
  const tg = s5RailTargets(n, bidx, false); if(!tg.length){ log("The branch rail has nowhere else to go", "wrn"); return; }
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const labs = tg.slice(0, 26).map((t, i) => { const b = t.w.getBoundingClientRect(), l = document.createElement("span"); l.className = "s5lab"; l.textContent = letters[i];
    l.style.left = (b.left + b.width / 2 - 6) + "px"; l.style.top = (b.top + Math.min(30, b.height / 2) - 8) + "px"; l.title = `Move the right rail here (${t.kind})`;
    l.onclick = () => go(i); document.body.appendChild(l); return l; });
  const stop = () => { labs.forEach(l => l.remove()); removeEventListener("keydown", key, true); $("doc").removeEventListener("scroll", stop); };
  const go = (i) => { stop(); s5ApplyRail(n, bidx, tg[i]); };
  const key = (e) => { if(e.key==="Escape"){ e.preventDefault(); e.stopPropagation(); stop(); return; } const i = letters.indexOf(e.key.toUpperCase()); if(e.key.length===1 && i >= 0 && i < labs.length){ e.preventDefault(); e.stopPropagation(); go(i); } };
  addEventListener("keydown", key, true); $("doc").addEventListener("scroll", stop);
  statusMsg && statusMsg("Move Branch Rail: press the letter of the new position (Esc cancels)", "message");
}
window.s5MoveRail = s5MoveRail;

/* ======================================================================
   L41: automatic rung verification (strict: also when leaving a rung)
   ====================================================================== */
async function s5QuietVerify(n){
  if(!S.R || !S.R.data || S.R.data.type!=="RLL" || n==null) return;
  const r = S.R.data.rungs[n]; if(!r) return;
  try { const v = await api("POST", "/api/studio/validate/rung", {program:S.R.prog, routine:S.R.routine, text:r.text, index:n, inserting:false});
    if(v.issues.length){ v.issues.forEach(x => log(`Rung ${n}: ${x.severity==="error"?"error":"warning"}: ${x.message}`, x.severity==="error"?"err":"wrn"));
      if(window.errorsFromIssues) errorsFromIssues(v.issues.map(x => ({...x, program:S.R.prog, routine:S.R.routine, rung:n})), `Verify rung ${S.R.prog}/${S.R.routine} ${n}`); } } catch(e){}
}
(function(){
  const _sc = lxSetCaret;
  lxSetCaret = function(rung){
    const prev = lxIsLadder() ? lxSel().caret.rung : null;
    const r = _sc.apply(this, arguments);
    if(S5O.autoVerify==="strict" && prev!=null && rung!==prev && prev < lxCount()) s5QuietVerify(prev);
    if(!S.s5Cmd.dirty) setTimeout(() => s5CmdFill(false), 0);
    return r;
  };
  const _api = api;
  api = async function(method, path, body){
    const r = await _api.apply(this, arguments);
    if(S5O.autoVerify!=="off" && method==="POST" && /^\/api\/studio\/edit\/(rung|batch|undo|redo)$/.test(path) && body && S.R && body.program===S.R.prog && body.routine===S.R.routine){
      const strict = S5O.autoVerify==="strict";
      const ns = body.ops ? body.ops.filter(o => o.op!=="delete").map(o => o.index) : body.index!=null && body.op!=="delete" ? [body.index] : [];
      if(ns.length || strict) setTimeout(() => { (ns.length ? ns : [lxSel().caret.rung]).slice(0, 20).forEach(s5QuietVerify); }, 400);
    }
    return r;
  };
})();

/* ======================================================================
   L44: Parsing Error dialog for rungs that cannot be read
   ====================================================================== */
(function(){
  const _se = startEdit;
  startEdit = function(index, iid){
    const r = S.R && S.R.data && S.R.data.rungs[index];
    if(r && r.error && !S.s5ParseOK){ s5ParseDialog(index); return; }
    return _se.apply(this, arguments);
  };
})();
async function s5ParseDialog(n){
  const r = S.R.data.rungs[n];
  const errs = async (text) => { try { const v = await api("POST", "/api/studio/validate/rung", {program:S.R.prog, routine:S.R.routine, text, index:n, inserting:false}); return v; } catch(e){ return {ok:false, issues:[{severity:"error", message:e.message}]}; } };
  const first = await errs(r.text.replace(/;\s*$/, ""));
  const res = await dialog({title:`Parsing Error - Rung ${n}`, buttons:[["Cancel","cancel"],["Modify Rung","ok","pri"]],
    body:`<div class="s5parse"><p>Rung ${n} of ${esc(S.R.routine)} cannot be read. Correct the text; <b>Modify Rung</b> checks it again and applies it once it can be read.</p>
      <div class="errl" id="s5perr">${(first.issues.length ? first.issues : [{message:r.error}]).map(x => `<div class="err">✖ ${esc(x.message)}${x.pos!=null ? ` (at character ${x.pos + 1})` : ""}</div>`).join("")}</div>
      <textarea id="s5ptxt" rows="6" spellcheck="false">${esc(r.text.replace(/;\s*$/, ""))}</textarea></div>`,
    onOpen: () => { $("s5ptxt").focus(); },
    onSubmit: async () => {
      const t = $("s5ptxt").value.trim().replace(/;\s*$/, "");
      const v = await errs(t);
      const bad = v.issues.filter(x => x.severity==="error");
      if(bad.length){ $("s5perr").innerHTML = bad.map(x => `<div class="err">✖ ${esc(x.message)}${x.pos!=null ? ` (at character ${x.pos + 1})` : ""}</div>`).join(""); return "The rung still has errors"; }
      try { await api("POST", "/api/studio/edit/rung", {program:S.R.prog, routine:S.R.routine, op:"replace", index:n, text:t, comment:r.comment||"", version:S.R.data.version}); }
      catch(e){ return e.message; }
    }});
  if(res==="ok"){ log(`Rung ${n} corrected`, "ok"); S.flash = n; await reloadRoutine(); }
}

/* ======================================================================
   L50: a User tab on the Language Element toolbar
   ====================================================================== */
function s5UserTab(){ try { const v = JSON.parse(lsGet("S5UserTab") || "null"); return Array.isArray(v) ? v : []; } catch(e){ return []; } }
(function(){
  const _pg = palGroups;
  palGroups = function(){ const g = _pg.apply(this, arguments); const u = s5UserTab(); if(u.length){ const o = {Favorites: g.Favorites, User: u}; for(const k in g) if(k!=="Favorites") o[k] = g[k]; return o; } return g; };
})();
async function s5CustomizeToolbar(){
  const all = Object.values(S.isa).filter(sp => (sp.languages || []).includes("LD")).map(sp => sp.mnemonic).concat((S.project && S.project.aois || []).map(a => a.name)).sort();
  let user = s5UserTab(), pa = null, pu = null;
  const res = await dialog({title:"Customize Toolbar", buttons:[["Cancel","cancel"],["OK","ok","pri"]],
    body:`<p class="notice-small">The <b>User</b> tab of the Language Element toolbar shows these elements, in this order.</p>
      <div class="s5cust"><div><input id="s5cq" placeholder="Filter…" style="width:100%;margin-bottom:3px"><div class="lst" id="s5ca"></div></div>
      <div class="mid"><button type="button" id="s5cAdd">Add →</button><button type="button" id="s5cRem">← Remove</button><button type="button" id="s5cUp">Move Up</button><button type="button" id="s5cDn">Move Down</button><button type="button" id="s5cClr">Clear</button></div>
      <div><div style="margin-bottom:3px;font-size:12px">User tab</div><div class="lst" id="s5cu"></div></div></div>`,
    onOpen: () => {
      const draw = () => { const q = $("s5cq").value.trim().toUpperCase();
        $("s5ca").innerHTML = all.filter(m => !q || m.includes(q)).map(m => `<div data-m="${esc(m)}" class="${m===pa?"on":""}">${esc(m)}</div>`).join("");
        $("s5cu").innerHTML = user.map((m, i) => `<div data-i="${i}" class="${i===pu?"on":""}">${esc(m)}</div>`).join("") || `<div class="dim">(empty: the tab is hidden)</div>`; };
      $("s5cq").oninput = draw;
      $("s5ca").onclick = (e) => { const d = e.target.closest("[data-m]"); if(d){ pa = d.dataset.m; draw(); } };
      $("s5ca").ondblclick = () => $("s5cAdd").click();
      $("s5cu").onclick = (e) => { const d = e.target.closest("[data-i]"); if(d){ pu = +d.dataset.i; draw(); } };
      $("s5cAdd").onclick = () => { if(pa && !user.includes(pa)){ user.push(pa); pu = user.length - 1; draw(); } };
      $("s5cRem").onclick = () => { if(pu!=null){ user.splice(pu, 1); pu = null; draw(); } };
      $("s5cUp").onclick = () => { if(pu > 0){ [user[pu - 1], user[pu]] = [user[pu], user[pu - 1]]; pu--; draw(); } };
      $("s5cDn").onclick = () => { if(pu!=null && pu < user.length - 1){ [user[pu + 1], user[pu]] = [user[pu], user[pu + 1]]; pu++; draw(); } };
      $("s5cClr").onclick = () => { user = []; pu = null; draw(); };
      draw(); $("s5cq").focus();
    }});
  if(res==="ok"){ lsSet("S5UserTab", JSON.stringify(user)); if(user.length){ S.lxTab = "User"; lsSet("LxTab", "User"); } if(lxIsLadder()) mountLxBar(); log(user.length ? `User tab: ${user.join(", ")}` : "User tab removed"); }
}
window.s5CustomizeToolbar = s5CustomizeToolbar;
document.addEventListener("contextmenu", (e) => {
  const t = e.target.closest && e.target.closest("#lxBar .lxtabs, #lxBar .lxbtns"); if(!t) return;
  e.preventDefault(); showMenu(e, [["Customize…", s5CustomizeToolbar]]);
});

/* ======================================================================
   L52: description lines follow the option
   ====================================================================== */
lookDescriptions = function(){
  const lad = document.querySelector("#doc .ladder"); if(!lad) return;
  const max = Math.max(1, Math.min(20, +S5O.descLines || 3)), lh = (s5font("ldDesc").size || 10) + 1;
  lad.querySelectorAll(":scope > .rung[data-n]").forEach(rd => {
    let n = 0;
    rd.querySelectorAll(".ins > .odesc").forEach(d => {
      const el = d.parentElement, isBox = !!el.querySelector(":scope > .box");
      const perLine = isBox ? 30 : Math.max(14, ((el.querySelector(".tagn") || {}).textContent || "").length + 4);
      n = Math.max(n, Math.min(max, Math.ceil(d.textContent.trim().length / perLine)));
    });
    const v = n ? (n * lh + 4) + "px" : "";
    if(rd.style.getPropertyValue("--dh")!==v){ if(v) rd.style.setProperty("--dh", v); else rd.style.removeProperty("--dh"); }
  });
};

/* ======================================================================
   L55: Data Context of Add-On Instruction logic
   ====================================================================== */
S.s5AoiCtx = {};
(function(){
  const _a = aoiAddr;
  aoiAddr = function(prog, op){
    if(prog && prog.startsWith("AOI:")){ const inst = S.s5AoiCtx[prog.slice(4)];
      if(inst && op && op!=="?" && /^[A-Za-z_]/.test(op) && !/^S:/i.test(op)) return `${inst}.${op}`; return null; }
    return _a.apply(this, arguments);
  };
})();
async function s5AoiInstances(aoi){
  const out = [], seen = new Set();
  const scan = async (prog) => { try { const d = await api("GET", `/api/studio/tagbrowser?program=${encodeURIComponent(prog)}&depth=0`);
    d.items.forEach(it => { if((it.base_type || "").toUpperCase()===aoi.toUpperCase() && !(it.dims||[]).length && !seen.has(it.address)){ seen.add(it.address); out.push({addr:it.address, scope:it.scope}); } }); } catch(e){} };
  await scan("");
  for(const p of s5AllPrograms()) await scan(p.name);
  return out;
}
async function s5AoiContext(){
  if(!S.R || !S.R.prog.startsWith("AOI:") || S.R.data.type!=="RLL") return;
  const w = lxWrap(); if(!w || w.querySelector("#s5Ctx")) return;
  const aoi = S.R.prog.slice(4), bar = document.createElement("div"); bar.id = "s5Ctx";
  bar.innerHTML = `<span>Data Context:</span><select id="s5CtxSel"><option value="">${esc(aoi)} &lt;definition&gt;</option></select><span class="dim" id="s5CtxNote">Definition: logic as written (no values)</span>`;
  const h = w.querySelector(".rhead"); if(h) h.after(bar); else w.prepend(bar);
  const sel = $("s5CtxSel"), cur = S.s5AoiCtx[aoi] || "";
  const list = await s5AoiInstances(aoi);
  if(!$("s5CtxSel")) return;
  list.forEach(x => { const o = document.createElement("option"); o.value = x.addr; o.textContent = `${x.addr.replace(/^Program:([^.]+)\./, "$1 › ")}  (instance)`; sel.appendChild(o); });
  sel.value = cur;
  $("s5CtxNote").textContent = cur ? "Instance: read-only, values of this instance" : (list.length ? "Definition: logic as written (no values)" : "No instance of this Add-On Instruction in the project");
  sel.onchange = () => { S.s5AoiCtx[aoi] = sel.value; renderLadder(); };
}

/* ======================================================================
   after every render
   ====================================================================== */
(function(){
  const _a = window.lxAfterRender;
  window.lxAfterRender = function(){
    if(_a) _a();
    if(!(S.R && S.R.data && S.R.data.type==="RLL")) return;
    if(S5O.pageHeader) s5PageHeader();
    if(lxIsLadder()){ s5CmdMount(); s5SelPaint(); }
    if(S.R.prog.startsWith("AOI:")) s5AoiContext();
    const pane = S.s5Split; $("doc").classList.toggle("s5pane", pane && S.s5Pane===1);
  };
  window.s5AfterOptions = function(){ if(S.R && S.R.data && S.R.data.type==="RLL" && !S.edit) renderLadder(); if(S.R && S.R.data && S.R.data.type==="ST" && window.s5StAfterOptions) s5StAfterOptions(); };
})();

/* menus: View ▸ Split Window, Rung Text Edit Bar; Tools ▸ Customize Toolbar */
(function(){
  const at = (name) => MENUS.findIndex(m => m[0]===name);
  const add = (name, fn) => { const i = at(name); if(i < 0) return; const base = MENUS[i][2]; MENUS[i][2] = () => fn(base()); };
  add("View", (items) => [...items, "-", [`${S.s5Split ? "✔ " : ""}Split Window`, () => s5ToggleSplit(), !(S.R && S.active===lxKey())],
    [`${S5O.rungTextBar ? "✔ " : ""}Rung Text Edit Bar`, () => { s5set({rungTextBar: !S5O.rungTextBar}); if(lxIsLadder() && !S.edit) renderLadder(); }],
    [`${S5O.pageHeader ? "✔ " : ""}Page Header`, () => { s5set({pageHeader: !S5O.pageHeader}); if(lxIsLadder() && !S.edit) renderLadder(); }]]);
  add("Tools", (items) => [...items, ["Customize Toolbar…", s5CustomizeToolbar]]);
})();
