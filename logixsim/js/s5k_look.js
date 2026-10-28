"use strict";
/* Studio Edition (1.0.0): the window laid out and coloured like Logix Designer.
   - navy window frame, light menu bar and toolbars, gold active document tab, docked panes
     with title bars (Controller Organizer, Properties, Errors);
   - standard toolbar of icon buttons, the online toolbar (controller mode, Run / OK /
     Energy Storage / I/O indicators, forces and edits states, communication path) and the
     Language Element toolbar in the toolbar band, its category tabs under the buttons;
   - Controller Organizer arranged like Studio's (Controller, Tasks, Motion Groups, Assets
     with Add-On Instructions, Data Types and Trends, I/O Configuration), plain icons;
   - Errors / Search Results / Watch tabs at the bottom of the output window;
   - status bar: messages left, position (Rung x of y, Ln / Col), INS/OVR and zoom right.
   All icons are drawn here (simple generic shapes); no Rockwell artwork is used. */

const S5 = {edition: "Studio Edition"};
(function(){
  const css = document.createElement("style");
  css.id = "s5Look";
  css.textContent = `
:root,:root[data-theme="dark"],:root[data-theme="light"]{--s5frame:#293955;--s5frame2:#35496A;--s5menu:#D6DBE9;--s5tool1:#E9ECF4;--s5tool2:#CFD6E5;
  --s5tab:#4D6082;--s5tab2:#3E5277;--s5gold1:#FFFCF4;--s5gold2:#FFE8A6;--s5title1:#4D6082;--s5title2:#3D5277;--s5line:#8E9BBC}
body{background:var(--s5frame)!important;grid-template-rows:auto auto auto 1fr auto!important;grid-template-columns:minmax(0,1fr)!important;font:12px/1.35 "Segoe UI",Tahoma,Arial,sans-serif}
/* menu bar */
#menubar{background:var(--s5menu)!important;border-bottom:none!important;padding:1px 4px!important;font-size:12px!important}
#menubar .mb{padding:2px 8px!important;border:1px solid transparent}
#menubar .mb:hover,#menubar .mb.open{background:#FDF4BF!important;border-color:#E5C365!important;outline:none!important}
/* standard toolbar (the old button row) */
#bar{background:linear-gradient(var(--s5tool1),var(--s5tool2))!important;border-bottom:1px solid var(--s5line)!important;padding:2px 6px!important;gap:2px!important;flex-wrap:nowrap!important;min-height:28px}
#bar .brand{display:none}
#bar .grp{gap:1px!important;padding:0 4px 0 2px!important;border-right:1px solid #A9B4CC!important;margin-right:2px}
#bar button{height:24px;min-width:24px;padding:0 4px!important;border:1px solid transparent!important;background:transparent!important;display:inline-flex;align-items:center;gap:3px;font-size:12px}
#bar button:hover:not(:disabled){background:#FDF4BF!important;border-color:#E5C365!important}
#bar button:disabled{opacity:.4}
#bar button .s5t{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}
#bar button{position:relative}
#bar button .s5dn{font-size:9px;margin-left:-2px}
#bar button.s5lab .s5t{display:inline}
#bar svg.s5i{width:16px;height:16px;flex:none}
#bar #bSearch{height:20px;width:170px;border:1px solid #A9B4CC;padding:0 4px}
#bar .tsearch{gap:1px!important}
#bar #conn,#bar #bTheme{display:none!important}
#bar .spacer{flex:1}
/* second band: online toolbar + Language Element toolbar */
#s5Band{display:flex;align-items:stretch;gap:0;background:linear-gradient(var(--s5tool1),var(--s5tool2));border-bottom:1px solid var(--s5line);min-height:64px}
#s5Online{display:grid;grid-template-columns:auto auto auto;grid-template-rows:auto auto auto auto;column-gap:6px;row-gap:1px;padding:3px 8px 3px 6px;border-right:1px solid #A9B4CC;font-size:11.5px;align-items:center;min-width:390px}
#s5Online .s5ctl{grid-column:1;grid-row:1/5;width:34px;height:50px;align-self:center}
#s5Mode{grid-column:2;grid-row:1}#s5Forces{grid-column:2;grid-row:2}#s5Edits{grid-column:2;grid-row:3}
#s5Online .s5dd{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:118px;height:17px;padding:0 4px;border:1px solid #A9B4CC;background:#FFFFFF;cursor:pointer;white-space:nowrap}
#s5Online .s5dd:hover{border-color:#E5C365;background:#FFFCF0}
#s5Online .s5dd::after{content:"";border:4px solid transparent;border-top-color:#303030;margin-top:4px}
#s5Online .s5dd.nodd::after{display:none}
#s5Online .s5dd.warn{background:#FFF0B3}
#s5Online .s5dd.bad{background:#FFD6D6;color:#900}
#s5Online .s5dd.on{background:#FFE58A}
#s5Online .s5dd.blink{animation:s5fblink 1s steps(1) infinite}
@keyframes s5fblink{50%{background:#FFFFFF}}
#bar #bConn .dot{position:absolute;right:1px;bottom:1px;width:6px;height:6px;border-radius:50%!important;margin:0}
#s5Leds{grid-column:3;grid-row:1/4;display:grid;grid-template-columns:auto auto;gap:1px 10px;align-content:center}
#s5Leds span{display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
#s5Leds i{display:inline-block;width:12px;height:9px;border:1px solid #6B6B6B;background:#D0D0D0}
#s5Leds i.g{background:#29C43A}#s5Leds i.r{background:#E02020}#s5Leds i.y{background:#F4C21B}#s5Leds i.f{animation:s5blink 1s steps(1) infinite}
@keyframes s5blink{50%{background:#D0D0D0}}
#s5Path{grid-column:2/4;grid-row:4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:380px;color:#202020}
#s5Path b{font-weight:400;color:#505050}
#s5Run{grid-column:3;grid-row:3;display:none}
#s5Lang{flex:1;min-width:0;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;padding:2px 4px 0}
#s5Lang:empty::before{content:"";flex:1}
#s5Lang #lxBar,#s5Lang #stxBar{position:static!important;width:auto!important;margin:0!important;padding:0!important;border:none!important;background:transparent!important;display:flex!important;flex-direction:column-reverse!important;gap:0!important}
#s5Lang .lxbtns{min-height:30px!important;gap:1px!important;padding:0 2px}
#s5Lang .lxbtns button{height:26px;min-width:28px!important;padding:0 4px!important;background:transparent!important;border:1px solid transparent!important;font:11px Consolas,"Courier New",monospace!important}
#s5Lang .lxbtns button:hover{background:#FDF4BF!important;border-color:#E5C365!important}
#s5Lang .lxbtns button.s5box{border:1px solid #6F7FA0!important;background:#FFFFFF!important;height:20px;margin:0 1px;font-size:10px!important;padding:0 3px!important}
#s5Lang .lxbtns button.s5box:hover{background:#FDF4BF!important}
#s5Lang .lxtabs{gap:0!important;border-top:1px solid #A9B4CC;padding-top:0}
#s5Lang .lxtabs button{border:1px solid #A9B4CC!important;border-top:none!important;background:#DDE3EF!important;font:11px "Segoe UI",Tahoma,sans-serif!important;padding:0 7px!important;height:18px;opacity:1!important;margin-right:-1px}
#s5Lang .lxtabs button.on{background:#FFFFFF!important;font-weight:400!important;position:relative;top:-1px;height:19px}
#s5Lang .lxst{display:none}
/* docked panes */
#work{background:var(--s5frame);gap:0;padding:0 3px 3px}
#org,#props{border:1px solid var(--s5frame2)!important;padding:0!important;background:#FFFFFF!important}
#org>h3,#props>h3,#s5ConTitle{all:unset;display:flex;align-items:center;gap:6px;height:19px;padding:0 4px 0 6px;background:linear-gradient(var(--s5title1),var(--s5title2));color:#FFFFFF;font:12px "Segoe UI",Tahoma,sans-serif;position:sticky;top:0;z-index:5;box-sizing:border-box;width:100%}
#org>h3 .s5x,#props>h3 .s5x,#s5ConTitle .s5x{margin-left:auto;cursor:pointer;font-size:11px;padding:0 3px;opacity:.85}
#org>h3 .s5x:hover,#props>h3 .s5x:hover,#s5ConTitle .s5x:hover{background:#FDF4BF;color:#000}
#org.s5act>h3,#props.s5act>h3,#console.s5act #s5ConTitle{background:linear-gradient(#FFF29D,#FFE8A6);color:#000}
#pbody{padding:6px 8px}
#tree{padding:2px 0 16px}
/* document area: tabs on the frame, gold active tab */
#center{background:var(--s5frame);border:none}
#tabs{background:var(--s5frame)!important;border:none!important;padding:3px 0 0!important;gap:1px!important;min-height:22px}
#tabs .tab{background:linear-gradient(var(--s5tab),var(--s5tab2))!important;color:#FFFFFF!important;border:1px solid #5B6D91!important;border-bottom:none!important;padding:2px 8px!important;font:12px "Segoe UI",Tahoma,sans-serif!important;border-radius:2px 2px 0 0!important}
#tabs .tab:hover{background:linear-gradient(#5B78A6,#4D6082)!important}
#tabs .tab.act{background:linear-gradient(var(--s5gold1),var(--s5gold2))!important;color:#000!important;border-color:#E5C365!important}
#tabs .tab .x{opacity:.7}
#doc{background:#FFFFFF!important;border-top:3px solid var(--s5gold2)}
/* output window: title bar, tabs at the bottom */
#console{border:1px solid var(--s5frame2)!important;background:#FFFFFF!important;margin-top:3px}
#console #ctabs{order:3;border-top:1px solid #A9B4CC!important;border-bottom:none!important;background:var(--s5frame)!important;padding:0 4px 2px!important;gap:1px!important}
#console .ctab{background:linear-gradient(var(--s5tab),var(--s5tab2))!important;color:#FFFFFF!important;border-radius:0 0 2px 2px!important;padding:1px 9px!important;font:12px "Segoe UI",Tahoma,sans-serif!important}
#console .ctab.act{background:#FFFFFF!important;color:#000!important;font-weight:400!important}
#console #cbody{order:2}
#console #s5ConTitle{order:1}
/* status bar */
#status{background:var(--s5menu)!important;color:#000!important;border-top:1px solid var(--s5line)!important;padding:1px 6px!important;gap:0!important;font:12px "Segoe UI",Tahoma,sans-serif!important}
#status>span{padding:0 8px;border-left:1px solid #A9B4CC;white-space:nowrap}
#status>span:empty{display:none}
#status>#s5Msg{border-left:none;flex:1;overflow:hidden;text-overflow:ellipsis;padding-left:2px}
#status #sIns{border:none!important;border-left:1px solid #A9B4CC!important;border-radius:0!important}
/* menus and dialogs in the same palette */
#menu{background:#F5F6F7!important;border:1px solid #9BA7B7!important;padding:2px!important}
#menu div{padding:3px 22px 3px 24px!important}
#menu div:hover,#menu div:focus{background:#FDF4BF!important;outline:1px solid #E5C365}
dialog{border:1px solid #6F7FA0!important;padding:0!important}
dialog #dlgTitle{margin:0!important;padding:5px 10px!important;background:linear-gradient(var(--s5title1),var(--s5title2));color:#FFFFFF;font:12px "Segoe UI",Tahoma,sans-serif!important;text-transform:none!important;letter-spacing:0!important}
dialog #dlgBody{padding:10px 12px 4px}
dialog #dlgErr{padding:0 12px}
dialog #dlgBtns{padding:6px 12px 10px}
/* organizer: plain tree, dotted lines, small icons, no badges */
#org .tree .tree{border-left:1px dotted #A0A0A0!important;margin-left:11px!important}
#org .tree.root>li{border-bottom:none!important;padding:0!important}
#org .node{min-height:18px!important;padding:0 4px 0 2px!important;gap:3px!important;border-radius:0!important;font:12px "Segoe UI",Tahoma,sans-serif}
#org .node.grp,#org .node{font-weight:400!important;background:transparent}
#org .tree.root>li>.node{background:transparent!important}
#org .node.sel{background:#3399FF!important;color:#FFFFFF!important}
#org .node.sel .lbl{color:#FFFFFF!important}
#org .node:hover:not(.sel){background:#E5F1FB!important}
#org .node .badge,#org .node .desc{display:none!important}
#org .node .twist{width:11px;height:11px;font-size:0!important;flex:none;border:1px solid #919191;background:#FFFFFF;box-sizing:border-box;position:relative;display:inline-block}
#org .node .twist:empty{border:none;background:transparent}
#org .node .twist:not(:empty)::before{content:"";position:absolute;left:2px;right:2px;top:4px;height:1px;background:#202020}
#org .node .twist.s5plus::after{content:"";position:absolute;top:2px;bottom:2px;left:4px;width:1px;background:#202020}
#org .ico{font-size:0!important;width:16px!important;height:16px!important;min-width:16px;padding:0!important;border:none!important;border-radius:0!important;background-color:transparent!important;background-repeat:no-repeat!important;background-position:center!important}
#org .node.s5none .lbl{color:#707070}
#org{background:#FFFFFF!important}
#org .node.grp{background:transparent!important;border:none!important;margin-top:0!important}
#org .node.grp>.lbl,#org .node .lbl{color:#000000;font-weight:400!important;font-size:12px!important;letter-spacing:0!important}
#org .node{border:1px solid transparent!important}
#org .node.sel{border-color:#3399FF!important}
#org .ico[class*="k-"]{background-color:transparent!important}
`;
  document.head.appendChild(css);
})();

/* ---------- icons (generic, drawn here) ---------- */
const S5I = {
  new: '<path d="M3 1h7l3 3v11H3z" fill="#fff" stroke="#4a5a7a"/><path d="M10 1v3h3" fill="none" stroke="#4a5a7a"/>',
  open: '<path d="M1 4h5l1 1h7v9H1z" fill="#F6D67A" stroke="#9A7A20"/><path d="M1 14l2-6h12l-2 6z" fill="#FBE7A1" stroke="#9A7A20"/>',
  save: '<rect x="2" y="2" width="12" height="12" fill="#5F7FB5" stroke="#2F4A7A"/><rect x="4" y="2" width="8" height="5" fill="#fff"/><rect x="5" y="10" width="6" height="4" fill="#C9D4E8"/>',
  imp: '<path d="M2 10v4h12v-4" fill="none" stroke="#4a5a7a" stroke-width="1.4"/><path d="M8 1v9M5 7l3 3 3-3" fill="none" stroke="#2E7D32" stroke-width="1.6"/>',
  exp: '<path d="M2 10v4h12v-4" fill="none" stroke="#4a5a7a" stroke-width="1.4"/><path d="M8 10V1M5 4l3-3 3 3" fill="none" stroke="#1565C0" stroke-width="1.6"/>',
  verify: '<path d="M3 1h8l2 2v12H3z" fill="#fff" stroke="#4a5a7a"/><path d="M5 9l2 2 4-5" fill="none" stroke="#2E7D32" stroke-width="1.8"/>',
  tag: '<path d="M1 8l6-6h7v7l-6 6z" fill="#FCE9A8" stroke="#8B6D10"/><circle cx="11" cy="5" r="1.4" fill="#8B6D10"/>',
  undo: '<path d="M5 3L1 7l4 4" fill="none" stroke="#1F4E9C" stroke-width="1.6"/><path d="M1 7h8a5 5 0 0 1 0 8H6" fill="none" stroke="#1F4E9C" stroke-width="1.6"/>',
  redo: '<path d="M11 3l4 4-4 4" fill="none" stroke="#1F4E9C" stroke-width="1.6"/><path d="M15 7H7a5 5 0 0 0 0 8h3" fill="none" stroke="#1F4E9C" stroke-width="1.6"/>',
  find: '<circle cx="6.5" cy="6.5" r="4.5" fill="#E8F0FB" stroke="#4a5a7a" stroke-width="1.5"/><path d="M10 10l5 5" stroke="#4a5a7a" stroke-width="2"/>',
  more: '<circle cx="3" cy="8" r="1.3" fill="#333"/><circle cx="8" cy="8" r="1.3" fill="#333"/><circle cx="13" cy="8" r="1.3" fill="#333"/>',
  run: '<path d="M4 2l10 6-10 6z" fill="#2EAF3E" stroke="#1B6B26"/>',
  prog: '<rect x="3" y="3" width="10" height="10" fill="#2F6FD0" stroke="#1C4482"/>',
  pause: '<rect x="3" y="2" width="3.5" height="12" fill="#D9A400"/><rect x="9.5" y="2" width="3.5" height="12" fill="#D9A400"/>',
  step: '<path d="M2 3l7 5-7 5z" fill="#2EAF3E"/><rect x="11" y="3" width="2.5" height="10" fill="#2EAF3E"/>',
  reset: '<path d="M13 8a5 5 0 1 1-2-4" fill="none" stroke="#1F4E9C" stroke-width="1.7"/><path d="M12 1v4H8" fill="none" stroke="#1F4E9C" stroke-width="1.7"/>',
  conn: '<path d="M5 1v4M11 1v4M3 5h10v3a5 5 0 0 1-10 0z" fill="#C9D4E8" stroke="#4a5a7a"/><path d="M8 13v2" stroke="#4a5a7a" stroke-width="2"/>',
  clock: '<circle cx="8" cy="8" r="6.3" fill="#fff" stroke="#4a5a7a" stroke-width="1.3"/><path d="M8 4v4l3 2" fill="none" stroke="#4a5a7a" stroke-width="1.4"/>',
  file: '<path d="M3 1h7l3 3v11H3z" fill="#fff" stroke="#4a5a7a"/><path d="M5 7h6M5 9h6M5 11h4" stroke="#7A8BAA"/>',
  arrow: '<path d="M4 6l4 4 4-4z" fill="#333"/>'};
function s5svg(k, w){ return `<svg class="s5i" viewBox="0 0 16 16" width="${w||16}" height="${w||16}" aria-hidden="true">${S5I[k]||""}</svg>`; }
const S5ORG = {
  ctrl: '<rect x="1" y="3" width="14" height="10" fill="#C9D4E8" stroke="#3E5277"/><rect x="3" y="5" width="3" height="6" fill="#3E5277"/><rect x="7" y="5" width="2" height="6" fill="#6F86AE"/><rect x="10" y="5" width="2" height="6" fill="#6F86AE"/>',
  tags: '<rect x="1.5" y="2.5" width="13" height="11" fill="#fff" stroke="#4a5a7a"/><path d="M1.5 6h13M1.5 9.5h13M6 2.5v11" stroke="#7A8BAA"/>',
  task: '<circle cx="8" cy="8" r="6" fill="#E8F0FB" stroke="#2F6FD0" stroke-width="1.3"/><path d="M8 4v4h3" fill="none" stroke="#2F6FD0" stroke-width="1.4"/>',
  prog: '<path d="M1 4h5l1 1h8v9H1z" fill="#C7D7EE" stroke="#3E5277"/><circle cx="8" cy="9.5" r="2.2" fill="none" stroke="#3E5277" stroke-width="1.3"/>',
  ld: '<rect x="1.5" y="1.5" width="13" height="13" fill="#fff" stroke="#4a5a7a"/><path d="M4 3v10M12 3v10M4 6h8M4 10h8" stroke="#2E7D32" stroke-width="1.2"/>',
  st: '<rect x="1.5" y="1.5" width="13" height="13" fill="#fff" stroke="#4a5a7a"/><path d="M4 5h8M4 8h5M6 11h6" stroke="#1F4E9C" stroke-width="1.2"/>',
  fbd: '<rect x="1.5" y="1.5" width="13" height="13" fill="#fff" stroke="#4a5a7a"/><rect x="4" y="4" width="4" height="4" fill="#E0A000"/><rect x="9" y="8" width="4" height="4" fill="#E0A000"/><path d="M8 6h2v2" fill="none" stroke="#555"/>',
  sfc: '<rect x="1.5" y="1.5" width="13" height="13" fill="#fff" stroke="#4a5a7a"/><rect x="5" y="3" width="6" height="3" fill="none" stroke="#7B3FA0"/><path d="M8 6v4M6 8h4" stroke="#7B3FA0"/><rect x="5" y="10" width="6" height="3" fill="none" stroke="#7B3FA0"/>',
  dt: '<rect x="1.5" y="2.5" width="13" height="11" fill="#fff" stroke="#4a5a7a"/><path d="M4 5h2M4 8h2M4 11h2M8 5h4M8 8h4M8 11h4" stroke="#7A8BAA"/>',
  aoi: '<rect x="3.5" y="2.5" width="9" height="11" fill="#fff" stroke="#4a5a7a"/><path d="M1 6h2.5M1 10h2.5M12.5 8H15" stroke="#4a5a7a"/><path d="M6 6h4M6 9h4" stroke="#2F6FD0"/>',
  io: '<rect x="4" y="1.5" width="8" height="13" fill="#D9DEE8" stroke="#4a5a7a"/><rect x="6" y="3.5" width="4" height="2" fill="#29C43A"/><path d="M6 8h4M6 10h4M6 12h4" stroke="#7A8BAA"/>',
  folder: '<path d="M1 3.5h5l1 1.5h8v8.5H1z" fill="#F6D67A" stroke="#9A7A20"/>',
  trend: '<rect x="1.5" y="1.5" width="13" height="13" fill="#fff" stroke="#4a5a7a"/><path d="M3 11l3-4 3 2 4-6" fill="none" stroke="#C62828" stroke-width="1.3"/>',
  motion: '<circle cx="8" cy="8" r="5.5" fill="none" stroke="#4a5a7a" stroke-width="1.3"/><path d="M8 2.5v3M8 10.5v3M2.5 8h3M10.5 8h3" stroke="#4a5a7a"/>',
  handler: '<rect x="1.5" y="1.5" width="13" height="13" fill="#fff" stroke="#4a5a7a"/><path d="M8 4v5" stroke="#C62828" stroke-width="2"/><circle cx="8" cy="11.5" r="1.1" fill="#C62828"/>'};
(function(){
  const css = document.createElement("style"); css.id = "s5OrgIcons";
  css.textContent = Object.entries(S5ORG).map(([k, body]) => `#org .ico.k-${k}{background-image:url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'>${body.replace(/"/g, "'")}</svg>`)}")!important}`).join("\n");
  document.head.appendChild(css);
})();

/* ---------- standard toolbar: icon buttons (ids, titles and handlers stay) ---------- */
(function(){
  const map = {bFile:"file", bImport:"imp", bVerify:"verify", bSave:"save", bExport:"exp", bNewTag:"tag", bRun:"run", bPause:"pause", bStop:"prog",
               bStep:"step", bReset:"reset", bConn:"conn", bTiming:"clock", bUndo:"undo", bRedo:"redo", bSearchAll:"find", bVerifyMenu:"arrow"};
  const apply = () => {
    for(const [id, k] of Object.entries(map)){
      const b = $(id); if(!b || b.dataset.s5) continue;
      b.dataset.s5 = "1";
      const txt = b.textContent.replace(/^[^\w]+/, "").trim();
      const keep = [...b.querySelectorAll(".dot")];                 /* status lights stay (the Connections light) */
      b.innerHTML = s5svg(k) + `<span class="s5t">${esc(txt)}</span>`;
      keep.forEach(x => b.appendChild(x));
      if(!b.getAttribute("aria-label")) b.setAttribute("aria-label", txt || b.title || id);
    }
    const bf = $("bFile"); if(bf && !bf.querySelector(".s5dn")) bf.insertAdjacentHTML("beforeend", `<span class="s5dn" aria-hidden="true">▾</span>`);
  };
  apply();
  /* New / Open / Save at the start, as in Studio */
  const bar = $("bar"), g0 = bar.querySelector(".grp");
  if(g0 && !$("s5New")){
    const nb = document.createElement("button"); nb.id = "s5New"; nb.title = "New Project (Alt+N)"; nb.innerHTML = s5svg("new"); nb.onclick = () => newProjectDialog();
    const ob = document.createElement("button"); ob.id = "s5Open"; ob.title = "Open (Ctrl+O)"; ob.innerHTML = s5svg("open"); ob.onclick = () => openProjectDialog();
    g0.prepend(nb, ob);
  }
  /* timing toggles its text in paintStatus: keep the icon */
  const _ps = paintStatus;
  paintStatus = function(){
    _ps.apply(this, arguments);
    const bt = $("bTiming"); if(bt && !bt.querySelector("svg")){ const t = bt.textContent; bt.innerHTML = s5svg("clock") + `<span class="s5t">${esc(t.replace(/^[^\w]+/, ""))}</span>`; }
    s5PaintOnline();
  };
})();

/* ---------- online toolbar ---------- */
function s5OnlineHtml(){
  return `<div id="s5Online" role="group" aria-label="Controller status">
    <svg class="s5ctl" viewBox="0 0 34 50" aria-hidden="true"><rect x="1" y="2" width="32" height="46" fill="#D9DEE8" stroke="#3E5277"/><rect x="4" y="6" width="9" height="38" fill="#3E5277"/><rect x="15" y="6" width="6" height="38" fill="#6F86AE"/><rect x="23" y="6" width="6" height="38" fill="#6F86AE"/><rect x="6" y="9" width="5" height="3" id="s5CtlLed" fill="#29C43A"/></svg>
    <div class="s5dd" id="s5Mode" title="Controller mode — click for Run / Program / Pause / Single Scan">Rem Program</div>
    <div id="s5Leds"><span><i id="ledRun"></i>Run</span><span><i id="ledOk" class="g"></i>OK</span><span><i id="ledBat" class="g"></i>Energy Storage</span><span><i id="ledIo" class="g"></i>I/O</span></div>
    <div class="s5dd" id="s5Forces" title="I/O forces — click for Enable / Disable / Remove">No Forces</div>
    <div class="s5dd nodd" id="s5Edits" title="Edits state of the open logic">No Edits</div>
    <div id="s5Path" title="Communication path">Path: <b>VirtualControlStudio\\Soft Controller</b></div>
  </div><div id="s5Lang"></div>`;
}
(function(){
  const band = document.createElement("div"); band.id = "s5Band"; band.innerHTML = s5OnlineHtml();
  $("bar").after(band);
  /* the old mode box and force indicator stay (scripts use them) but live in the band, hidden */
  const keep = document.createElement("div"); keep.id = "s5Keep"; keep.hidden = true;
  ["modebox", "forceind"].forEach(id => { const el = $(id); if(el) keep.appendChild(el); });
  band.appendChild(keep);
  $("s5Mode").onclick = (e) => { e.stopPropagation(); if(window.modeMenu) modeMenu(); };
  $("s5Forces").onclick = (e) => { e.stopPropagation(); const n = Object.keys(S.forces).length;
    showMenu(null, [["Enable All I/O Forces", ()=>forceAll("enable"), S.forcesEnabled!==false], ["Disable All I/O Forces", ()=>forceAll("disable"), S.forcesEnabled===false], ["Remove All I/O Forces", ()=>forceAll("remove"), !n]], $("s5Forces")); };
  $("s5Edits").onclick = () => { if(window.s5EditsMenu) s5EditsMenu(); };
  /* the mode menu opens under the new mode box */
  const _mm = window.modeMenu;
  if(_mm){ window.modeMenu = modeMenu = function(){ const mb = $("modebox"), real = mb.getBoundingClientRect; mb.getBoundingClientRect = () => $("s5Mode").getBoundingClientRect(); try { return _mm(); } finally { mb.getBoundingClientRect = real; } }; }
})();
function s5ModeText(){
  const s = S.state || {}, m = s.mode || "PROGRAM";
  if(m==="RUN") return "Rem Run";
  if(m==="PAUSED") return "Rem Run (Paused)";
  if(m==="FAULTED") return "Faulted";
  return "Rem Program";
}
function s5PaintOnline(){
  if(!$("s5Mode")) return;
  const s = S.state || {}, m = s.mode || "PROGRAM";
  const me = $("s5Mode"); me.textContent = s5ModeText(); me.classList.toggle("bad", m==="FAULTED"); me.classList.toggle("on", m==="RUN");
  const led = (id, cls) => { const el = $(id); if(el) el.className = cls || ""; };
  led("ledRun", m==="RUN" ? "g" : m==="PAUSED" ? "g f" : "");
  led("ledOk", m==="FAULTED" || s.major_fault ? "r" : "g");
  led("ledBat", "g");
  const conns = S.connections || [];
  const ioBad = conns.some(c => c.enabled && c.state && /error|fault|down/i.test(String(c.state)));
  led("ledIo", ioBad ? "g f" : "g");
  const ctl = $("s5CtlLed"); if(ctl) ctl.setAttribute("fill", m==="FAULTED" ? "#E02020" : m==="RUN" ? "#29C43A" : "#F4C21B");
  const nf = Object.keys(S.forces||{}).length, fen = S.forcesEnabled !== false, fe = $("s5Forces");
  fe.textContent = !nf ? "No Forces" : fen ? "Forces Enabled" : "Forces Disabled";
  fe.classList.toggle("on", !!nf && fen); fe.classList.toggle("warn", !!nf && !fen); fe.classList.toggle("blink", !!nf && !fen);
  const ed = $("s5Edits"), st = window.s5EditState ? s5EditState() : {text: s.dirty ? "Unsaved Edits" : "No Edits"};
  ed.textContent = st.text; ed.classList.toggle("warn", !!st.warn); ed.classList.toggle("nodd", !st.menu);
  const p = S.project && S.project.controller;
  const path = $("s5Path"); if(path) path.innerHTML = `Path: <b>VirtualControlStudio\\Soft Controller${p && p.name ? "\\" + esc(p.name) : ""}</b>`;
  document.title = p && p.name ? `${s.dirty?"* ":""}${p.name} [${p.processor||"controller"} ${p.revision||""}] - VirtualControlStudio ${S5.edition}` : `VirtualControlStudio ${S5.edition}`;
}

/* ---------- docked pane title bars ---------- */
(function(){
  const oh = document.querySelector("#org > h3"); if(oh){ oh.innerHTML = `Controller Organizer<span class="s5x" title="Hide (Alt+0)">✕</span>`; oh.querySelector(".s5x").onclick = () => togglePane("org"); }
  const ph = document.querySelector("#props > h3"); if(ph){ ph.innerHTML = `Properties<span class="s5x" title="Hide (Alt+2)">✕</span>`; ph.querySelector(".s5x").onclick = () => togglePane("props"); }
  const con = $("console");
  if(con && !$("s5ConTitle")){ const t = document.createElement("div"); t.id = "s5ConTitle"; t.innerHTML = `<span id="s5ConName">Errors</span><span class="s5x" title="Hide (Alt+1)">✕</span>`; con.prepend(t); t.querySelector(".s5x").onclick = () => togglePane("con"); }
  /* the pane with the focus shows a gold title bar */
  const act = (e) => { const pane = e.target.closest && e.target.closest("#org, #props, #console");
    ["org", "props", "console"].forEach(id => $(id) && $(id).classList.toggle("s5act", !!pane && pane.id===id)); };
  document.addEventListener("mousedown", act, true); document.addEventListener("focusin", act, true);
  const _rct = renderConsoleTabs;
  renderConsoleTabs = function(){ _rct.apply(this, arguments);
    const t = $("ctabs").querySelector(".ctab.act"), n = $("s5ConName"); if(n) n.textContent = t ? t.textContent.replace(/\s*\(\d+\)$/, "") : "Output"; };
  renderConsoleTabs();
})();

/* ---------- Controller Organizer arranged like Studio ---------- */
(function(){
  const _rt = renderTree;
  renderTree = function(){
    _rt.apply(this, arguments);
    if(!hasProject()) return;
    const t = $("tree"), li = (key) => { const n = t.querySelector(`.node[data-key="${CSS.escape(key)}"]`); return n ? n.parentElement : null; };
    const ctrl = li("ctrl");
    if(ctrl){
      const ul = ctrl.querySelector(":scope > ul");
      if(ul && !ul.querySelector('[data-key="s5fh"]')){
        ul.appendChild(node("Controller Fault Handler", {key:"s5fh", kind:"handler", title:"No fault routine is configured; faults are shown in the Faults tab"}));
        ul.appendChild(node("Power-Up Handler", {key:"s5pu", kind:"handler", title:"No power-up routine is configured"}));
      }
    }
    const tasks = li("tasks");
    if(tasks && !li("s5motion")){
      const mg = node("Motion Groups", {key:"s5motion", kind:"folder", group:true, children:[node("Ungrouped Axes", {key:"s5axes", kind:"motion", title:"Motion is not simulated"})]});
      tasks.after(mg);
      const assetsKids = [];
      const aois = li("aois"), dts = li("dts");
      const assets = node("Assets", {key:"s5assets", kind:"folder", group:true, open:true, children:[node("Trends", {key:"s5trends", kind:"trend", title:"Trend charts of tags (Logic ▸ Trend…)", onclick:()=>window.s5TrendDialog && s5TrendDialog()})]});
      mg.after(assets);
      const aul = assets.querySelector(":scope > ul");
      if(aul){ if(aois) aul.prepend(aois); else aul.prepend(node("Add-On Instructions", {key:"aois0", kind:"folder", children:[]}));
        if(dts) aois ? aois.after(dts) : aul.children[0].after(dts); }
    }
    t.querySelectorAll(".node .twist").forEach(tw => { tw.classList.toggle("s5plus", tw.textContent==="▸"); });
    t.querySelectorAll(".node").forEach(n => { const k = n.dataset.key || ""; if(/^s5(fh|pu|axes)$/.test(k)) n.classList.add("s5none"); });
  };
  /* the twist shows [+] / [-] boxes: keep the class in step when it toggles */
  document.addEventListener("click", (e) => { const tw = e.target.closest && e.target.closest("#org .twist"); if(tw) setTimeout(() => tw.classList.toggle("s5plus", tw.textContent==="▸"), 0); });
  if(S.project) renderTree();
})();

/* ---------- status bar ---------- */
(function(){
  const st = $("status");
  if(!$("s5Msg")){ const m = document.createElement("span"); m.id = "s5Msg"; m.textContent = "Ready"; st.prepend(m); }
  if(!$("s5Pos")){ const p = document.createElement("span"); p.id = "s5Pos"; st.insertBefore(p, $("sScan")); }
  const _log = log;
  log = function(msg, cls){ _log.apply(this, arguments); const m = $("s5Msg"); if(m){ m.textContent = String(msg).split("\n")[0]; m.className = cls || ""; clearTimeout(S.s5MsgT); S.s5MsgT = setTimeout(() => { m.textContent = "Ready"; m.className = ""; }, 8000); } };
})();
function s5Position(){
  const el = $("s5Pos"); if(!el) return;
  if(typeof lxIsLadder==="function" && lxIsLadder()){ const c = lxSel().caret, n = lxCount(); el.textContent = c.rung>=n ? `End of ${n} rung(s)` : `Rung ${c.rung} of ${n}`; return; }
  el.textContent = "";
}
(function(){
  const _sc = lxSetCaret; lxSetCaret = function(){ const r = _sc.apply(this, arguments); s5Position(); return r; };
  const _a = window.lxAfterRender; window.lxAfterRender = function(){ if(_a) _a(); s5Position(); };
  const _rd = renderDoc; renderDoc = function(){ const r = _rd.apply(this, arguments); s5Position(); return r; };
})();

/* ---------- Language Element toolbar in the toolbar band ---------- */
(function(){
  const _m = mountLxBar;
  mountLxBar = function(){
    _m.apply(this, arguments);
    const bar = $("lxBar"), host = $("s5Lang"); if(!bar || !host) return;
    if(bar.parentElement!==host){ host.innerHTML = ""; host.appendChild(bar); }
    /* elements that are boxes in the ladder show as small boxes */
    bar.querySelectorAll(".lxbtns [data-lx]").forEach(b => { const m = String(b.dataset.lx).toUpperCase(); if(!b.classList.contains("lxico") && !CONTACTS[m] && !COILS[m] && m!=="BRANCH") b.classList.add("s5box"); });
  };
  /* leaving a ladder routine clears the band (an ST routine puts its own bar there) */
  const _rd = renderDoc;
  renderDoc = function(){ const r = _rd.apply(this, arguments); setTimeout(s5LangSync, 0); if(r && r.then) r.then(() => setTimeout(s5LangSync, 0)); return r; };
})();
function s5LangSync(){
  const host = $("s5Lang"); if(!host) return;
  const lad = S.R && S.R.data && S.R.data.type==="RLL" && S.active===lxKey() && S.R.data.editable;
  const st = S.R && S.R.data && S.R.data.type==="ST" && S.active===lxKey();
  if(!lad){ const b = host.querySelector("#lxBar"); if(b) b.remove(); }
  if(!st){ const b = host.querySelector("#stxBar"); if(b) b.remove(); }
  if(st && window.s5MountStBar) s5MountStBar();
}

/* ---------- edition name ---------- */
(function(){
  const _lp = loadProject;
  loadProject = async function(){ const r = await _lp.apply(this, arguments); const b = document.querySelector("#bar .brand"); if(b) b.textContent = `VirtualControlStudio ${S.project.version || ""} ${S5.edition}`; s5PaintOnline(); return r; };
  const _ab = about;
  about = function(){ const r = _ab.apply(this, arguments); setTimeout(() => { const t = $("dlgTitle"); if(t) t.textContent = `About VirtualControlStudio ${S5.edition}`;
    const p = document.querySelector("#dlgBody p"); if(p && !p.dataset.s5){ p.dataset.s5 = "1"; p.insertAdjacentHTML("afterend", `<p class="notice-small">${S5.edition}: the window, the ladder and the Structured Text editors follow the layout and behaviour described in the Logix Designer help. All icons and texts are VirtualControlStudio's own.</p>`); } }, 0); return r; };
})();
window.s5PaintOnline = s5PaintOnline;
