"use strict";
/* Classic workspace (0.15.0): a dense, flat Windows-desktop look for the whole Studio.
   - light only: no dark mode, square corners everywhere, Segoe UI 9 pt chrome on #F0F0F0;
   - white routine canvas, Consolas 10 pt tag names and mnemonics, black un-bolded text;
   - false wires 1 px black, true wires and symbols solid 2 px #00FF00 (no glow);
   - selected rung #DDE7F5 with a dashed outline, edit flags (e i r d) in solid blue;
   - zoom-immune rails: zoom scales only the logic between the rails; the left rail stays
     at the left edge (after the rung numbers) and the right rail at the right edge of
     the view while a long or zoomed rung scrolls underneath. */

(function(){
  document.documentElement.dataset.theme = "light";
  try { localStorage.setItem("vcsTheme", "light"); } catch(e){}
  const css = document.createElement("style");
  css.id = "classicTheme";
  css.textContent = `
:root,:root[data-theme="dark"],:root[data-theme="light"]{color-scheme:light;
  --bg:#F0F0F0;--pane:#FFFFFF;--pane2:#F0F0F0;--ink:#000000;--mut:#404040;--line:#A0A0A0;--sel:#CCE8FF;
  --acc:#0078D7;--on:#00FF00;--onbg:#FFFFFF;--off:#808080;--warn:#B36B00;--bad:#C00000;--force:#B38F00;
  --rail:#000000;--wire:#000000;--pf:#00FF00;--org:#FFFFFF;--orgline:#A0A0A0;--edit:#FFFFFF;--editline:#0000FF;
  --mono:Consolas,"Courier New",monospace;--lfont:Consolas,"Courier New",monospace;--lval:#000000}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:light;--bg:#F0F0F0;--pane:#FFFFFF;--pane2:#F0F0F0;--ink:#000000;--mut:#404040;--line:#A0A0A0;--rail:#000000;--wire:#000000;--pf:#00FF00;--on:#00FF00}}
body{background:#F0F0F0;color:#000;font:12px/1.35 "Segoe UI",Tahoma,sans-serif}
*,*::before,*::after{border-radius:0!important;box-shadow:none!important;text-shadow:none!important}
button,select,input,textarea{font:12px "Segoe UI",Tahoma,sans-serif;color:#000;border:1px solid #A0A0A0;background:#F0F0F0;background-image:none}
input,textarea,select{background:#FFFFFF}
button:hover{background:#E5F1FB;border-color:#0078D7}button:active{background:#CCE4F7}
button:disabled{color:#A0A0A0;background:#F0F0F0;border-color:#C8C8C8}
#bTheme{display:none!important}
#menubar{background:#F0F0F0;border-bottom:1px solid #D9D9D9}#menubar .mb:hover,#menubar .mb.open{background:#E5F1FB;outline:1px solid #CCE8FF}
#bar{background:#F0F0F0;border-bottom:1px solid #A0A0A0}
#org,#props,#console{background:#FFFFFF}
.tab{background:#E1E1E1;border:1px solid #A0A0A0;border-bottom:none}.tab.act{background:#FFFFFF;font-weight:400}
#menu{border:1px solid #A0A0A0;background:#F0F0F0}#menu [data-i]:hover,#menu [data-i]:focus{background:#CCE8FF}
#doc{background:#FFFFFF}
#status{background:#F0F0F0;border-top:1px solid #A0A0A0}
dialog{border:1px solid #707070}
/* --- ladder canvas --- */
.ladder{background:#FFFFFF;font-family:Consolas,"Courier New",monospace}
.rung{border-bottom:none;padding:4px 0}
.rnum{position:static;color:#404040;font-family:Consolas,"Courier New",monospace;font-size:13px}
.rung,.rung>.rnum{background:#FFFFFF}
.rung.lsel,.rung.lsel>.rnum{background:#DDE7F5}
.rung.lsel{outline:1px dashed #4A6EA9;outline-offset:-1px}
.rung.caret>.rnum{outline:1px dotted #000}
.rcomment{color:#000;font-style:normal;font-family:Consolas,"Courier New",monospace;font-size:12px;border:1px solid #000;padding:1px 6px;display:inline-block;margin:0 8px 3px}
/* rails: each rung row is exactly as wide as the view, so its left and right borders (the
   rails) never move or scale; the logic inside scrolls sideways (one shared scrollbar) and
   zooms (CSS --lz), the rails do not */
.ladder{width:var(--ladw,100%)!important;min-width:0!important}
.ladder>.rung,.ladder>.endrung{width:var(--ladw,100%)!important;min-width:0!important}
.ladder>.rung{grid-template-columns:40px minmax(0,1fr)!important}.ladder>.rung>div{min-width:0}
.rline{border-left:1px solid #000!important;border-right:1px solid #000!important;overflow:hidden}
.rline.energized{border-left:2px solid #00FF00!important}
.rung.skipped .rline,.ladder.offline .rline{border-left-color:#808080!important;border-right-color:#808080!important}
.rline:not(.eline)>.series{flex:1 0 auto;min-width:100%;transform:translateX(calc(-1px * min(var(--lx,0), var(--ov,0))))}
.ladder .rline:not(.eline)>.series,.ladder .rcomment{zoom:var(--lz,1)}
#lxScroll{position:sticky;bottom:0;z-index:6;overflow-x:auto;overflow-y:hidden;height:17px;background:#F0F0F0;border-top:1px solid #A0A0A0;margin-left:54px}
#lxScroll>div{height:1px}
/* wires: false 1 px black, true 2 px solid green */
.wire{background:linear-gradient(#000,#000) center/100% 1px no-repeat}
.wire.pf{background:linear-gradient(#00FF00,#00FF00) center/100% 2px no-repeat}
.ins{background:linear-gradient(#000,#000) center/100% 1px no-repeat;border-radius:0}
.ins .tagn{font-family:Consolas,"Courier New",monospace;font-size:13px;font-weight:400;color:#000;background:transparent}
.ins .sym{font-family:Consolas,"Courier New",monospace;font-weight:400;font-size:15px;color:#000;background:#FFFFFF;outline:none}
.ins.on .sym{background:#FFFFFF;color:#00CC00;outline:none;font-weight:700}
.ins .val{color:#000;background:transparent;font-size:11px}
.box{border:1px solid #000;font-family:Consolas,"Courier New",monospace;background:#FFFFFF}
.ins.on .box{border:2px solid #00FF00}
.box .bt{justify-content:center;font-weight:400;border-bottom:1px solid #000}
.box .bt .btt{display:none}
.box .br span:first-child{color:#000;font-family:Consolas,"Courier New",monospace}
.box .br span:nth-child(2){font-weight:400}.box .br .lv{color:#000}
.bit{background:#FFFFFF;color:#000;border:1px solid #000}.bit.on{background:#00FF00;color:#000}
.branch{border-left:1px solid #000;border-right:1px solid #000}
.rung.lsel .ins .tagn,.rung.lsel .ins .sym,.rung.lsel .ins .val{background:transparent}
/* edit flags: solid blue letters, no badge */
.emark,.rmark{background:transparent!important;color:#0000FF!important;font-weight:700;padding:0 2px}
.erung{background:#FFFFFF;outline:1px dashed #0000FF;outline-offset:-1px}
.rung.orig{opacity:1}
#lxBar .lxtabs button{background:#E1E1E1;border:1px solid #A0A0A0;opacity:1;font-family:"Segoe UI",Tahoma,sans-serif}
#lxBar .lxtabs button.on{background:#FFFFFF;border-bottom-color:#FFFFFF;font-weight:400}
#lxBar .lxbtns button{min-width:24px;height:24px;padding:0 5px;background:#FFFFFF;border:1px solid #C8C8C8}
#lxBar .lxbtns button:hover{border-color:#0078D7;background:#E5F1FB}
.tagtable th{background:#F0F0F0;font-weight:400;border:1px solid #C8C8C8}
.tagtable td{border:1px solid #E1E1E1}
`;
  document.head.appendChild(css);
})();

/* zoom: only the logic between the rails (CSS --lz), never the rails or the rung numbers */
if(typeof zoomApply === "function"){
  const _zoomApply = zoomApply;
  zoomApply = function(){
    const lad = document.querySelector("#doc .ladder");
    if(lad && inRoutine()){ lad.style.zoom = ""; lad.style.setProperty("--lz", String(zoomOf())); statusZoom(); return; }
    _zoomApply();
  };
}
/* offline (program mode): grey rails */
(function(){
  const mark = () => { const lad = document.querySelector("#doc .ladder"); if(lad) lad.classList.toggle("offline", ((S.state||{}).mode||"PROGRAM")==="PROGRAM"); };
  if(typeof paintStatus === "function"){ const _p = paintStatus; paintStatus = function(){ _p(); mark(); }; }
  const _a = window.lxAfterRender; window.lxAfterRender = function(){ if(_a) _a(); mark(); };
})();
/* the theme toggle is gone: clicking it (menu, old shortcut) keeps the classic light look */
(function(){ const b = $("bTheme"); if(b) b.onclick = () => { document.documentElement.dataset.theme = "light"; }; })();

/* one horizontal scrollbar for all rungs (pinned rails: only the logic moves) */
function lxSyncScroll(){
  const lad = document.querySelector("#doc .ladder"); if(!lad || !inRoutine()) return;
  const z = parseFloat(lad.style.getPropertyValue("--lz")) || 1;
  let over = 0, view = 0;
  const reads = [];                                         /* read all widths first, then write: no layout per rung */
  /* a large routine (content-visibility) only measures the rungs on screen: measuring
     every rung would lay out all of them */
  const big = lad.classList.contains("big");
  const lines = big ? [...(S.visRungs || [])].map(n => { const r = lxRungEl(n); return r && r.querySelector(".rline:not(.eline)"); }).filter(Boolean)
                    : lad.querySelectorAll(".rline:not(.eline)");
  const bk = S.R ? S.R.prog + "/" + S.R.routine : ""; if(S.lxBigKey!==bk){ S.lxBigKey = bk; S.lxBigOver = 0; }
  if(big) over = S.lxBigOver || 0;
  lines.forEach(rl => { const s = rl.querySelector(":scope > .series"); if(!s) return;
    view = rl.clientWidth; const ov = Math.max(0, s.getBoundingClientRect().width - rl.clientWidth);
    reads.push([s, ov]); over = Math.max(over, ov); });
  if(big){ S.lxBigOver = over; if(!view){ const r0 = lad.querySelector(".rline"); view = r0 ? r0.clientWidth : 0; } }
  /* the logic is at least as wide as the view between the rails, in unzoomed px (a % under
     CSS zoom resolves differently between browser versions) */
  if(!view){ const r0 = lad.querySelector(".rline:not(.eline)"); view = r0 ? r0.clientWidth : 0; }
  if(view){ const mv = (view / z) + "px"; if(lad.style.getPropertyValue("--rlmin")!==mv) lad.style.setProperty("--rlmin", mv); }
  reads.forEach(([s, ov]) => { const v = String(ov / z); if(s.style.getPropertyValue("--ov")!==v) s.style.setProperty("--ov", v); });  /* a rung only scrolls as far as its own logic is longer than the view */
  let bar = $("lxScroll");
  if(over <= 1){ if(bar) bar.remove(); lad.style.setProperty("--lx", "0"); return; }
  if(!bar || !lad.contains(bar)){ bar = document.createElement("div"); bar.id = "lxScroll"; bar.title = "Scroll the logic (Shift+wheel); the rails stay in place";
    bar.innerHTML = "<div></div>"; lad.appendChild(bar);
    bar.onscroll = () => { const zz = parseFloat(lad.style.getPropertyValue("--lz")) || 1; lad.style.setProperty("--lx", String(bar.scrollLeft / zz)); }; }
  bar.style.width = (view + 2) + "px";
  bar.firstChild.style.width = (view + over) + "px";
  bar.onscroll();
}
(function(){
  const _a = window.lxAfterRender; window.lxAfterRender = function(){ if(_a) _a(); setTimeout(lxSyncScroll, 0); };
  const _z = zoomApply; zoomApply = function(){ _z(); setTimeout(lxSyncScroll, 0); };
  if("ResizeObserver" in window) new ResizeObserver(() => lxSyncScroll()).observe($("doc"));
  let raf = 0;                                               /* large routines: measure the rungs that scroll into view */
  $("doc").addEventListener("scroll", () => { const lad = document.querySelector("#doc .ladder.big"); if(!lad || raf) return;
    raf = requestAnimationFrame(() => { raf = 0; setTimeout(lxSyncScroll, 120); }); }, {passive:true});
  $("doc").addEventListener("wheel", (e) => { const bar = $("lxScroll"); if(!bar || !(e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY))) return;
    e.preventDefault(); bar.scrollLeft += e.shiftKey ? e.deltaY : e.deltaX; }, {passive:false});
})();
