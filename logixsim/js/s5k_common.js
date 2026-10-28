"use strict";
/* Studio Edition (1.0.0): shared pieces for the ladder and Structured Text editors.
   - Tools ▸ Options with pages like Studio's: Application, Ladder Display, Ladder Editor,
     Structured Text Display, Structured Text Editor, Display Fonts & Colours, Print,
     Header Template (L41, L51, L52, L06, S19, S26-S29, S31);
   - routine tabs show * while the routine has changes that are not saved (L02, S01);
   - Window ▸ New Window opens the routine in a second window; both follow the same
     edits (L05);
   - edits state for the online toolbar; Go To Calling Routine (L46, S39);
   - Trend windows for tags (S38) and pickers for routines, tasks, programs, modules and
     devices (S15);
   - Find options: wrap, direction, wildcards, comments / statements only (S40). */

(function(){
  const css = document.createElement("style");
  css.id = "s5Common";
  css.textContent = `
.s5opt{display:grid;grid-template-columns:190px 1fr;gap:0;min-width:720px;min-height:380px;border:1px solid #A9B4CC}
.s5opt .pages{background:#F5F6F7;border-right:1px solid #A9B4CC;padding:4px 0;font-size:12px}
.s5opt .pages div{padding:3px 10px;cursor:default;white-space:nowrap}
.s5opt .pages div.grp{color:#505050;padding-top:6px}
.s5opt .pages div.pg{padding-left:20px}
.s5opt .pages div.on{background:#3399FF;color:#FFFFFF}
.s5opt .page{padding:8px 12px;display:none;font-size:12px;max-height:440px;overflow:auto}
.s5opt .page.on{display:block}
.s5opt .page h4{margin:0 0 8px;font:600 12px "Segoe UI",Tahoma,sans-serif;border-bottom:1px solid #D0D6E2;padding-bottom:3px}
.s5opt label.r{display:flex;align-items:center;gap:8px;margin:5px 0}
.s5opt label.r>span{min-width:220px}
.s5opt input[type=number]{width:70px}
.s5opt table.fc{border-collapse:collapse;width:100%}
.s5opt table.fc td,.s5opt table.fc th{border:1px solid #D0D6E2;padding:2px 4px;text-align:left;font-weight:400}
.s5opt table.fc th{background:#F0F0F0}
.s5opt table.fc tr.on td{background:#E5F1FB}
.s5opt .prev{border:1px solid #A9B4CC;background:#FFFFFF;padding:6px 8px;margin-top:8px;min-height:64px;white-space:pre;font-family:Consolas,monospace;overflow:auto}
.s5opt textarea{width:100%;font:12px Consolas,"Courier New",monospace}
.s5pick{min-width:420px}.s5pick .lst{height:280px;overflow:auto;border:1px solid #A9B4CC;font-size:12px}
.s5pick .lst div{padding:1px 6px;cursor:default;white-space:nowrap}.s5pick .lst div.on{background:#3399FF;color:#FFFFFF}
.s5pick .lst div.g{color:#505050;background:#F0F0F0}
.s5trend{position:fixed;z-index:65;background:#FFFFFF;border:1px solid #6F7FA0;box-shadow:0 4px 18px rgba(0,0,0,.25);width:520px}
.s5trend .tt{display:flex;align-items:center;gap:6px;height:20px;padding:0 4px 0 8px;background:linear-gradient(#4D6082,#3D5277);color:#FFFFFF;font:12px "Segoe UI",Tahoma,sans-serif;cursor:move;user-select:none}
.s5trend .tt span:last-child{margin-left:auto;cursor:pointer;padding:0 4px}
.s5trend canvas{display:block}
.s5trend .tl{display:flex;flex-wrap:wrap;gap:8px;padding:3px 8px;font:11px Consolas,monospace}
.s5trend .tl i{display:inline-block;width:10px;height:3px;vertical-align:middle;margin-right:4px}
.s5trend .tb{display:flex;gap:4px;padding:3px 6px;border-top:1px solid #D0D6E2}
.s5trend .tb input{flex:1}
.findfrm .s5x2{display:flex;flex-wrap:wrap;gap:4px 14px}
`;
  document.head.appendChild(css);
})();

/* ======================================================================
   Options
   ====================================================================== */
const S5_DEF = {
  // ladder display
  pageHeader:false, opWidth:40, commentLines:1000, descLines:3, passThrough:true, rungTextBar:true,
  // ladder editor
  autoVerify:"on",                 // off | on | strict
  // structured text
  stLineNumbers:true, stOutline:true, stIndent:"smart", stTabSize:4, stKeepTabs:false,
  stHeader:false, stHeaderText:"(*\n  Company:     {company}\n  Developer:   {developer}\n  Routine:     {routine}\n  Description: {description}\n  Created:     {date}\n*)\n",
  stHeaderCompany:"", stHeaderDeveloper:"",
  // print
  printColour:true, printST:"colour",
  // fonts and colours (per item)
  fonts:{}};
const S5_ITEMS = {
  ld: [["ldTag","Tag names","Consolas","13","#000000"],["ldMnem","Instruction mnemonics","Consolas","12","#000000"],["ldComment","Rung comments","Consolas","12","#000000"],
       ["ldNum","Rung numbers","Consolas","13","#404040"],["ldDesc","Operand descriptions","Segoe UI","10","#5F5F5F"],["ldVal","Values","Consolas","11","#0000D0"]],
  st: [["stText","Normal text","Consolas","13","#000000"],["stKw","Keywords","Consolas","13","#0000FF"],["stFn","Instructions and functions","Consolas","13","#0000FF"],
       ["stCom","Comments","Consolas","13","#008000"],["stTagc","Tags","Consolas","13","#800000"],["stNum","Numbers and strings","Consolas","13","#000000"]]};
const S5_FONTS = ["Consolas","Courier New","Lucida Console","Segoe UI","Tahoma","Arial","Verdana","Calibri"];
let S5O = (() => { try { return {...S5_DEF, ...JSON.parse(lsGet("S5Opt") || "{}")}; } catch(e){ return {...S5_DEF}; } })();
function s5o(k){ return S5O[k]; }
function s5set(obj){ S5O = {...S5O, ...obj}; lsSet("S5Opt", JSON.stringify(S5O)); s5ApplyDisplay(); }
function s5font(key){
  const d = [...S5_ITEMS.ld, ...S5_ITEMS.st].find(x => x[0]===key) || [key, key, "Consolas", "12", "#000000"];
  const f = (S5O.fonts || {})[key] || {};
  return {family: f.family || d[2], size: +(f.size || d[3]), color: f.color || d[4], bold: !!f.bold, label: d[1]};
}
function s5ApplyDisplay(){
  let st = $("s5Disp"); if(!st){ st = document.createElement("style"); st.id = "s5Disp"; document.head.appendChild(st); }
  const F = (k) => { const f = s5font(k); return `font-family:"${f.family}",Consolas,monospace!important;font-size:${f.size}px!important;color:${f.color}!important;font-weight:${f.bold?700:400}!important`; };
  const C = (k) => s5font(k).color;
  const w = Math.max(10, Math.min(200, +S5O.opWidth || 40)), cl = Math.max(1, Math.min(1000, +S5O.commentLines || 1000)), dl = Math.max(1, Math.min(20, +S5O.descLines || 3));
  st.textContent = `
.ladder .ins .tagn,.ladder .box .br span:nth-child(2){${F("ldTag")};max-width:${w}ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ladder .ins>.tagn{line-height:15px!important;padding-bottom:1px}
.ladder .box .bt>span:first-child{${F("ldMnem")}}
.ladder .rcomment{${F("ldComment")};display:-webkit-box!important;-webkit-box-orient:vertical;-webkit-line-clamp:${cl};overflow:hidden}
.ladder>.rung>.rnum{${F("ldNum")}}
.ladder .ins>.odesc{font-family:"${s5font("ldDesc").family}",sans-serif!important;font-size:${s5font("ldDesc").size}px!important;color:${C("ldDesc")}!important;-webkit-line-clamp:${dl}!important;max-height:${dl * (s5font("ldDesc").size + 1)}px}
${S5O.passThrough ? "" : ".ladder .ins>.odesc.pass{display:none!important}"}
.ladder .box .lv,.ladder .ins .val{color:${C("ldVal")}!important;font-family:"${s5font("ldVal").family}",monospace!important}
#stHi,#stTa,.stview,#stTa2,#stHi2{font-family:"${s5font("stText").family}",Consolas,monospace!important;font-size:${s5font("stText").size}px!important}
#stHi,.stview,#stHi2{color:${C("stText")}}
.st-k,.st-rg{color:${C("stKw")}!important;font-weight:${s5font("stKw").bold?700:400}!important}
.st-f{color:${C("stFn")}!important;font-weight:${s5font("stFn").bold?700:400}!important}
.st-c{color:${C("stCom")}!important}
.st-t{color:${C("stTagc")}!important}
.st-n,.st-s{color:${C("stNum")}!important}
#stHi,#stTa,#stHi2,#stTa2,.stview{tab-size:${+S5O.stTabSize || 4}!important;-moz-tab-size:${+S5O.stTabSize || 4}!important}
${S5O.stLineNumbers ? "" : ".stgut .gn{visibility:hidden}.stview>div::before{visibility:hidden}"}
${S5O.stOutline ? "" : ".stgut .gf,.stview .fold{visibility:hidden!important;pointer-events:none!important}"}
${S5O.pageHeader ? ".ladder>.rhead{display:flex!important}" : ""}
@media print{
  ${S5O.printColour ? "" : ".ladder *{color:#000!important}.ladder .wire.pf{background:linear-gradient(#000,#000) 0 var(--H)/100% 1px no-repeat!important}"}
  ${S5O.printST==="bw" ? ".stview *,.stview{color:#000!important;font-weight:400!important}" : ""}
}`;
}
s5ApplyDisplay();

async function s5OptionsDialog(){
  const pages = [
    ["Application", "app"], ["Ladder Editor", null], ["Display", "ldd"], ["Editing", "lde"],
    ["Structured Text Editor", null], ["Display", "std"], ["Editing", "ste"], ["Header Template", "sth"],
    ["Display Fonts & Colours", "fc"], ["Print", "prn"]];
  const o = S5O, num = (id, v, a, b) => `<input type="number" id="${id}" value="${v}" min="${a}" max="${b}">`;
  const chk = (id, v) => `<input type="checkbox" id="${id}" ${v ? "checked" : ""}>`;
  const sel = (id, v, opts) => `<select id="${id}">${opts.map(([k, l]) => `<option value="${k}" ${k===v?"selected":""}>${esc(l)}</option>`).join("")}</select>`;
  const fcRows = (grp) => S5_ITEMS[grp].map(([k]) => { const f = s5font(k); return `<tr data-fk="${k}"><td>${esc(f.label)}</td>
      <td>${sel("ff_"+k, f.family, S5_FONTS.map(x => [x, x]))}</td><td><input type="number" id="fs_${k}" value="${f.size}" min="7" max="28" style="width:52px"></td>
      <td><input type="color" id="fcol_${k}" value="${f.color}"></td><td>${chk("fb_"+k, f.bold)}</td></tr>`; }).join("");
  const body = `<div class="s5opt"><div class="pages">${pages.map(([l, k]) => k ? `<div class="pg${k==="app"||k==="fc"||k==="prn" ? "" : ""}" data-pg="${k}">${esc(l)}</div>` : `<div class="grp">${esc(l)}</div>`).join("")}</div>
    <div>
    <div class="page" data-p="app"><h4>Application</h4>
      <label class="r"><span>Organizer: open items with a single click</span>${chk("f_single", S.orgSingle)}</label>
      <label class="r"><span>Default data type of new tags</span><input id="o_dtype" list="dtList" value="${esc(lsGet("DefaultType") || "BOOL")}"></label>
      <label class="r"><span>Show the rung text edit bar</span>${chk("o_bar", o.rungTextBar)}</label></div>
    <div class="page" data-p="ldd"><h4>Ladder Editor — Display</h4>
      <label class="r"><span>Show page header (routine description)</span>${chk("o_ph", o.pageHeader)}</label>
      <label class="r"><span>Show operand descriptions</span>${chk("o_desc", !!S.showDesc)}</label>
      <label class="r"><span>Show pass-through descriptions</span>${chk("o_pass", o.passThrough)}</label>
      <label class="r"><span>Operand width (10–200 characters)</span>${num("o_ow", o.opWidth, 10, 200)}</label>
      <label class="r"><span>Rung comment lines (1–1000)</span>${num("o_cl", o.commentLines, 1, 1000)}</label>
      <label class="r"><span>Description lines (1–20)</span>${num("o_dl", o.descLines, 1, 20)}</label></div>
    <div class="page" data-p="lde"><h4>Ladder Editor — Editing</h4>
      <label class="r"><span>Automatic rung verification</span>${sel("o_av", o.autoVerify, [["off","Off"],["on","On (after changes)"],["strict","Strict (also when leaving a rung, paste, undo, morph)"]])}</label>
      <label class="r"><span>Enable Quick Keys</span>${chk("o_qk", !!S.quickOn)}</label>
      <label class="r"><span>Show the Quick Key map in the page header</span>${chk("o_qmap", !!S.showQuick)}</label></div>
    <div class="page" data-p="std"><h4>Structured Text — Display</h4>
      <label class="r"><span>Show line numbers</span>${chk("o_ln", o.stLineNumbers)}</label>
      <label class="r"><span>Automatic outlining</span>${chk("o_out", o.stOutline)}</label>
      <label class="r"><span>Tag values in the code</span>${sel("o_vals", S.stValsMode || "off", [["off","Never"],["run","When the controller runs"],["always","Always"]])}</label></div>
    <div class="page" data-p="ste"><h4>Structured Text — Editing</h4>
      <label class="r"><span>Indent mode</span>${sel("o_ind", o.stIndent, [["none","None"],["block","Block"],["smart","Smart"]])}</label>
      <label class="r"><span>Tab size (1–20)</span>${num("o_tab", o.stTabSize, 1, 20)}</label>
      <label class="r"><span>Tab key</span>${sel("o_keep", o.stKeepTabs ? "keep" : "spaces", [["spaces","Insert spaces"],["keep","Keep tabs"]])}</label>
      <label class="r"><span>Completion prompt while typing</span>${chk("o_compl", S.stAutoCompl!==false)}</label></div>
    <div class="page" data-p="sth"><h4>Structured Text — Header Template</h4>
      <label class="r"><span>Insert the header in new Structured Text routines</span>${chk("o_hdr", o.stHeader)}</label>
      <label class="r"><span>Company</span><input id="o_hco" value="${esc(o.stHeaderCompany)}"></label>
      <label class="r"><span>Developer</span><input id="o_hdev" value="${esc(o.stHeaderDeveloper)}"></label>
      <textarea id="o_htxt" rows="8" spellcheck="false">${esc(o.stHeaderText)}</textarea>
      <p class="notice-small">Fields: {company} {developer} {routine} {program} {description} {date}</p></div>
    <div class="page" data-p="fc"><h4>Display Fonts &amp; Colours</h4>
      <table class="fc"><tr><th>Ladder item</th><th>Font</th><th>Size</th><th>Colour</th><th>Bold</th></tr>${fcRows("ld")}
      <tr><th>Structured Text item</th><th></th><th></th><th></th><th></th></tr>${fcRows("st")}</table>
      <div class="prev" id="o_prev"></div><button type="button" id="o_fcReset">Use Defaults</button></div>
    <div class="page" data-p="prn"><h4>Print</h4>
      <label class="r"><span>Ladder: print in colour</span>${chk("o_pcol", o.printColour)}</label>
      <label class="r"><span>Structured Text</span>${sel("o_pst", o.printST, [["colour","Screen colours"],["bw","Black and white"]])}</label></div>
    </div></div>`;
  const preview = () => {
    const pv = $("o_prev"); if(!pv) return;
    const st = (k) => { const fam = $("ff_"+k).value, sz = $("fs_"+k).value, c = $("fcol_"+k).value, b = $("fb_"+k).checked; return `font-family:'${fam}';font-size:${sz}px;color:${c};font-weight:${b?700:400}`; };
    pv.innerHTML = `<span style="${st("ldNum")}">0</span>  <span style="${st("ldComment")}">Start / stop seal-in</span>\n     <span style="${st("ldDesc")}">Start push button</span>\n     <span style="${st("ldTag")}">Start_PB</span>   <span style="${st("ldMnem")}">TON</span>  <span style="${st("ldVal")}">1000</span>\n\n<span style="${st("stKw")}">IF</span> <span style="${st("stTagc")}">Motor_Run</span> <span style="${st("stKw")}">THEN</span> <span style="${st("stCom")}">// comment</span>\n    <span style="${st("stTagc")}">Count</span> <span style="${st("stText")}">:=</span> <span style="${st("stFn")}">ABS</span><span style="${st("stText")}">(</span><span style="${st("stNum")}">10</span><span style="${st("stText")}">);</span>`;
  };
  const r = await dialog({title:"Options", buttons:[["Cancel","cancel"],["Apply","apply"],["OK","ok","pri"]], stay:["apply"], body,
    onOpen: (d) => {
      const show = (k) => { d.querySelectorAll("[data-pg]").forEach(x => x.classList.toggle("on", x.dataset.pg===k)); d.querySelectorAll(".page").forEach(x => x.classList.toggle("on", x.dataset.p===k)); };
      d.querySelectorAll("[data-pg]").forEach(x => x.onclick = () => show(x.dataset.pg));
      show(S.s5OptPage || "app");
      d.querySelectorAll(".page[data-p=fc] select, .page[data-p=fc] input").forEach(x => x.oninput = preview);
      $("o_fcReset").onclick = () => { [...S5_ITEMS.ld, ...S5_ITEMS.st].forEach(([k, , f, s, c]) => { $("ff_"+k).value = f; $("fs_"+k).value = s; $("fcol_"+k).value = c; $("fb_"+k).checked = false; }); preview(); };
      preview();
    },
    onSubmit: async () => {
      const g = (id) => $(id), n = (id, a, b) => Math.max(a, Math.min(b, parseInt(g(id).value, 10) || a));
      const fonts = {};
      [...S5_ITEMS.ld, ...S5_ITEMS.st].forEach(([k]) => { fonts[k] = {family: g("ff_"+k).value, size: g("fs_"+k).value, color: g("fcol_"+k).value, bold: g("fb_"+k).checked}; });
      s5set({rungTextBar: g("o_bar").checked, pageHeader: g("o_ph").checked, passThrough: g("o_pass").checked, opWidth: n("o_ow", 10, 200), commentLines: n("o_cl", 1, 1000), descLines: n("o_dl", 1, 20),
             autoVerify: g("o_av").value, stLineNumbers: g("o_ln").checked, stOutline: g("o_out").checked, stIndent: g("o_ind").value, stTabSize: n("o_tab", 1, 20),
             stKeepTabs: g("o_keep").value==="keep", stHeader: g("o_hdr").checked, stHeaderCompany: g("o_hco").value, stHeaderDeveloper: g("o_hdev").value, stHeaderText: g("o_htxt").value,
             printColour: g("o_pcol").checked, printST: g("o_pst").value, fonts});
      S.orgSingle = g("f_single").checked; lsSet("OrgSingle", S.orgSingle ? "1" : "0");
      if(g("o_dtype").value) lsSet("DefaultType", g("o_dtype").value);
      if(!!S.showDesc !== g("o_desc").checked && window.toggleOperandDesc) toggleOperandDesc();
      if(!!S.quickOn !== g("o_qk").checked && window.setQuickKeys) setQuickKeys(g("o_qk").checked);
      if(!!S.showQuick !== g("o_qmap").checked && window.toggleQuickMap) toggleQuickMap();
      S.stValsMode = g("o_vals").value; lsSet("StVals", S.stValsMode);
      S.stAutoCompl = g("o_compl").checked; lsSet("StCompl", S.stAutoCompl ? "1" : "0");
      const pg = document.querySelector(".s5opt [data-pg].on"); if(pg) S.s5OptPage = pg.dataset.pg;
      if(window.s5AfterOptions) s5AfterOptions();
    }});
  return r;
}
optionsDialog = s5OptionsDialog;

/* ======================================================================
   * on routine tabs: changed since the project was last saved
   ====================================================================== */
S.s5Mod = new Set();
(function(){
  const _api = api;
  api = async function(method, path, body){
    if(method!=="GET") S.s5LastPost = performance.now();
    const r = await _api.apply(this, arguments);
    if(method!=="GET") S.s5LastPost = performance.now();
    try {
      if(method==="POST" && /^\/api\/studio\/(edit\/(rung|st|batch|undo|redo)|replace)$/.test(path) && body && body.program){
        S.s5Mod.add(`${body.program}/${body.routine || ""}`);
        if(path.endsWith("/replace")) (r.routines || []).forEach(x => S.s5Mod.add(`${x.program}/${x.routine}`));
        setTimeout(() => { renderTabs(); s5PaintOnline(); }, 0);
      }
      if(method==="POST" && /^\/api\/studio\/project\/(save|open|new|upload)$/.test(path)){ S.s5Mod.clear(); setTimeout(renderTabs, 0); }
    } catch(e){}
    return r;
  };
  const _tabs = renderTabs;
  renderTabs = function(){
    _tabs.apply(this, arguments);
    if(S.state && S.state.dirty===false && S.s5Mod.size){ S.s5Mod.clear(); }
    document.querySelectorAll("#tabs .tab").forEach(el => {
      const id = el.dataset.id || ""; if(!id.startsWith("r:")) return;
      const first = el.firstChild; if(!first || first.nodeType!==3) return;
      const pending = (S.edit && `r:${S.edit.prog}/${S.edit.routine}`===id && (!S.edit.st || (S.edit.direct ? S.edit.text!==S.edit.base : true))) || (S.stDrafts && S.stDrafts[id.slice(2)]);
      const mark = pending || S.s5Mod.has(id.slice(2));
      const t = S.tabs.find(x => x.id===id); if(!t) return;
      first.textContent = t.title + (mark ? "*" : "") + " ";
      el.classList.toggle("s5dirty", !!mark);
    });
  };
  /* a save makes the stars go */
  const _ps = paintStatus;
  paintStatus = function(){ const was = S.s5WasDirty; _ps.apply(this, arguments); const now = !!(S.state && S.state.dirty); S.s5WasDirty = now; if(was && !now && S.s5Mod.size){ S.s5Mod.clear(); renderTabs(); } };
})();

/* ======================================================================
   Edits state (online toolbar)
   ====================================================================== */
function s5EditState(){
  if(S.s5Test && Object.keys(S.s5Test).length) return {text:"Test Edits", warn:true, menu:true};
  const pend = (S.edit && !S.edit.st) || (S.edit && S.edit.st && S.edit.direct && S.edit.text!==S.edit.base) || (S.stDrafts && Object.keys(S.stDrafts).length);
  if(pend) return {text:"Pending Edits", warn:true, menu:true};
  if(S.state && S.state.dirty) return {text:"Unsaved Edits", warn:false, menu:true};
  return {text:"No Edits", menu:false};
}
function s5EditsMenu(){
  const st = s5EditState(); if(!st.menu) return;
  const items = [];
  if(S.s5Test && Object.keys(S.s5Test).length) items.push(["Untest Edits (back to the original)", () => window.s5UntestAll && s5UntestAll()], ["Assemble Edits (keep the tested code)", () => window.s5AssembleAll && s5AssembleAll()], "-");
  if(S.stDrafts && Object.keys(S.stDrafts).length) Object.keys(S.stDrafts).forEach(k => items.push([`Open ${k} (pending)`, () => { const [p, r] = k.split("/"); openRoutine(p, r); }]));
  if(S.edit && !S.edit.st) items.push([`Go To Rung ${S.edit.index} of ${S.edit.routine} (being edited)`, () => openRoutine(S.edit.prog, S.edit.routine)]);
  items.push(["Save Project", () => saveProject(false), !(S.state && S.state.dirty), "Ctrl+S"]);
  showMenu(null, items, $("s5Edits"));
}
window.s5EditState = s5EditState; window.s5EditsMenu = s5EditsMenu;

/* ======================================================================
   New Window and keeping two windows in step (L05)
   ====================================================================== */
function s5NewWindow(){
  if(!S.R || S.active!==lxKey()){ log("New Window: open a routine first", "wrn"); return; }
  const url = `${location.pathname}?s5open=${encodeURIComponent(S.R.prog + "/" + S.R.routine)}`;
  const w = window.open(url, "_blank", "popup,width=1280,height=860");
  if(!w) log("New Window: the browser blocked the window; allow pop-ups for this page", "wrn");
}
(function(){
  /* ?s5open=Program/Routine opens that routine once the project is loaded */
  const q = new URLSearchParams(location.search).get("s5open");
  if(q){ const i = q.indexOf("/"), t0 = Date.now();
    const tryOpen = () => { if(S.s5Opened || i <= 0) return;
      if(typeof hasProject==="function" && hasProject() && S.isa && Object.keys(S.isa).length){ S.s5Opened = true; openRoutine(q.slice(0, i), q.slice(i + 1)); return; }
      if(Date.now() - t0 < 20000) setTimeout(tryOpen, 150); };
    setTimeout(tryOpen, 100); }
  addEventListener("mousedown", () => { S.s5MouseDown = true; }, true);
  addEventListener("mouseup", () => { setTimeout(() => { S.s5MouseDown = false; }, 300); }, true);
  /* another window (or the API) changed the open routine: show the new version */
  setInterval(async () => {
    if(!S.R || !S.R.data || S.edit || S.inline || S.drag || S.s5MouseDown || document.hidden || S.active!==lxKey() || $("dlg").open || performance.now() - (S.s5LastPost || 0) < 3000) return;
    try { const v = await api("GET", `/api/studio/routine/version?program=${encodeURIComponent(S.R.prog)}&routine=${encodeURIComponent(S.R.routine)}`);
      if(S.R && !S.edit && v.version!==S.R.data.version && v.routine===S.R.routine){ await reloadRoutine(); log(`${S.R.prog}/${S.R.routine} was changed in another window: showing version ${v.version}`); } } catch(e){}
  }, 1500);
})();

/* ======================================================================
   Go To Calling Routine / Called Routine (L46, S39)
   ====================================================================== */
async function s5GoCalling(prog, routine){
  prog = prog || (S.R && S.R.prog); routine = routine || (S.R && S.R.routine);
  if(!prog || !routine) return;
  let r; try { r = await api("GET", `/api/studio/xref?program=${encodeURIComponent(prog)}&routine=${encodeURIComponent(routine)}`); } catch(e){ log(e.message, "err"); return; }
  const refs = r.references || [];
  if(!refs.length){ log(`${routine} is not called by any JSR${(S.project.tasks.flatMap(t => t.programs).find(p => p.name===prog) || {}).main===routine ? " (it is the main routine)" : ""}`, "wrn"); return; }
  const go = (x) => goToLocation({program:x.program, routine:x.routine, rung:x.rung, line:x.line, instr:"JSR"});
  if(refs.length===1) return go(refs[0]);
  let pick = 0;
  const res = await dialog({title:"Go To Calling Routine", buttons:[["Cancel","cancel"],["Go To","ok","pri"]],
    body:`<div class="s5pick"><div class="lst" id="s5cr">${refs.map((x, i) => `<div data-i="${i}" class="${i===0?"on":""}">${esc(x.program)}/${esc(x.routine)} — ${x.rung!=null ? `rung ${x.rung}` : `line ${x.line}`}</div>`).join("")}</div></div>`,
    onOpen: () => { const l = $("s5cr"); l.onclick = (e) => { const d = e.target.closest("[data-i]"); if(!d) return; pick = +d.dataset.i; l.querySelectorAll(".on").forEach(x => x.classList.remove("on")); d.classList.add("on"); };
      l.ondblclick = () => $("dlgBtns").querySelector(".pri").click(); }});
  if(res==="ok") go(refs[pick]);
}
window.s5GoCalling = s5GoCalling;

/* ======================================================================
   Pickers (Browse Routines / Programs / Tasks / Modules / Devices)
   ====================================================================== */
async function s5Picker(title, groups){
  let pick = null;
  const flat = groups.flatMap(([g, list]) => list.map(v => ({g, v: typeof v==="string" ? v : v.v, d: typeof v==="string" ? "" : (v.d || "")})));
  const res = await dialog({title, buttons:[["Cancel","cancel"],["OK","ok","pri"]],
    body:`<div class="s5pick"><input id="s5pq" placeholder="Filter…" style="width:100%;margin-bottom:4px" autocomplete="off"><div class="lst" id="s5pl"></div></div>`,
    onOpen: () => {
      const q = $("s5pq"), l = $("s5pl");
      const draw = () => { const t = q.value.toLowerCase(); let html = "", last = null;
        flat.filter(x => !t || x.v.toLowerCase().includes(t)).forEach(x => { if(x.g!==last){ html += `<div class="g">${esc(x.g)}</div>`; last = x.g; }
          if(pick==null) pick = x.v; html += `<div data-v="${esc(x.v)}" class="${x.v===pick?"on":""}">${esc(x.v)}${x.d ? ` <span class="dim">${esc(x.d)}</span>` : ""}</div>`; });
        l.innerHTML = html || `<div class="dim">Nothing to choose</div>`; };
      q.oninput = () => { pick = null; draw(); };
      l.onclick = (e) => { const d = e.target.closest("[data-v]"); if(!d) return; pick = d.dataset.v; draw(); };
      l.ondblclick = (e) => { if(e.target.closest("[data-v]")) $("dlgBtns").querySelector(".pri").click(); };
      draw(); q.focus();
    }, onSubmit: () => pick ? null : "Choose an item"});
  return res==="ok" ? pick : null;
}
function s5AllPrograms(){ return S.project ? [...S.project.tasks.flatMap(t => t.programs), ...S.project.unscheduled] : []; }
async function s5BrowseRoutines(){ const p = s5AllPrograms().find(x => x.name===(S.R && S.R.prog));
  return s5Picker("Browse Routines", [[`Routines of ${S.R ? S.R.prog : ""}`, (p ? p.routines : []).map(r => ({v:r.name, d:r.type}))]]); }
async function s5BrowseObjects(){ const P = S.project || {tasks:[], unscheduled:[], modules:[]};
  return s5Picker("Browse Tasks, Programs and Modules", [["Tasks", P.tasks.map(t => ({v:t.name, d:t.type}))], ["Programs", s5AllPrograms().map(p => ({v:p.name, d:p.description||""}))],
    ["Modules", (P.modules || []).map(m => ({v:m.tag || m.name, d:m.catalog || ""}))]]); }
async function s5BrowseDevices(){ const P = S.project || {modules:[]};
  let conns = []; try { conns = (await api("GET", "/api/studio/connections")).connections || []; } catch(e){}
  return s5Picker("Browse Devices", [["I/O modules", (P.modules || []).map(m => ({v:m.tag || m.name, d:m.catalog || m.module || ""}))], ["Connections", conns.map(c => ({v:c.name || c.id, d:c.kind || ""}))]]); }
window.s5BrowseRoutines = s5BrowseRoutines; window.s5BrowseObjects = s5BrowseObjects; window.s5BrowseDevices = s5BrowseDevices;

/* ======================================================================
   Trend windows (S38): live chart of one or more tags
   ====================================================================== */
S.s5Trends = [];
const S5_TCOL = ["#C62828", "#1565C0", "#2E7D32", "#EF6C00", "#6A1B9A", "#00838F"];
function s5Trend(addr){
  let T = S.s5Trends.find(t => !t.closed);
  if(!T){
    T = {tags:[], data:{}, t0:performance.now(), span:60, closed:false};
    const box = document.createElement("div"); box.className = "s5trend"; box.style.left = Math.max(10, innerWidth - 560) + "px"; box.style.top = "150px";
    box.innerHTML = `<div class="tt"><span>Trend</span><span title="Close">✕</span></div><canvas width="520" height="200"></canvas><div class="tl"></div>
      <div class="tb"><input placeholder="Add a tag…" list="tagList"><select title="Time span"><option value="30">30 s</option><option value="60" selected>60 s</option><option value="300">5 min</option></select><button type="button">Clear</button></div>`;
    document.body.appendChild(box); T.box = box; T.cv = box.querySelector("canvas");
    box.querySelector(".tt span:last-child").onclick = () => { T.closed = true; clearInterval(T.iv); box.remove(); };
    const inp = box.querySelector("input"); inp.onkeydown = (e) => { if(e.key==="Enter" && inp.value.trim()){ const a = S.R ? (aoiAddr(S.R.prog, inp.value.trim()) || inp.value.trim()) : inp.value.trim(); s5Trend(a); inp.value = ""; } };
    box.querySelector("select").onchange = (e) => { T.span = +e.target.value; };
    box.querySelector("button").onclick = () => { T.tags.forEach(a => T.data[a] = []); };
    let drag = null; box.querySelector(".tt").onmousedown = (e) => { drag = [e.clientX - box.offsetLeft, e.clientY - box.offsetTop]; e.preventDefault(); };
    addEventListener("mousemove", (e) => { if(drag){ box.style.left = (e.clientX - drag[0]) + "px"; box.style.top = (e.clientY - drag[1]) + "px"; } });
    addEventListener("mouseup", () => { drag = null; });
    T.iv = setInterval(() => s5TrendTick(T), 250);
    S.s5Trends.push(T);
  }
  if(addr && !T.tags.includes(addr)){ T.tags.push(addr); T.data[addr] = []; }
  s5TrendTick(T);
  return T;
}
function s5TrendTick(T){
  const now = (performance.now() - T.t0) / 1000;
  T.tags.forEach(a => { const v = (window.val2 ? val2(a) : S.values[a]); const n = typeof v==="boolean" ? (v ? 1 : 0) : typeof v==="number" ? v : null;
    const arr = T.data[a]; if(n!=null) arr.push([now, n]); while(arr.length && arr[0][0] < now - 600) arr.shift(); });
  const c = T.cv.getContext("2d"), W = T.cv.width, H = T.cv.height;
  c.fillStyle = "#FFFFFF"; c.fillRect(0, 0, W, H);
  let lo = Infinity, hi = -Infinity;
  T.tags.forEach(a => T.data[a].forEach(([t, v]) => { if(t >= now - T.span){ lo = Math.min(lo, v); hi = Math.max(hi, v); } }));
  if(!isFinite(lo)){ lo = 0; hi = 1; } if(hi===lo){ hi += 1; lo -= 1; }
  const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
  c.strokeStyle = "#E3E7EF"; c.lineWidth = 1; c.font = "10px Consolas,monospace"; c.fillStyle = "#606060";
  for(let i = 0; i <= 4; i++){ const y = Math.round(10 + i * (H - 30) / 4) + .5; c.beginPath(); c.moveTo(44, y); c.lineTo(W - 6, y); c.stroke();
    c.fillText(String(+(hi - i * (hi - lo) / 4).toPrecision(4)), 2, y + 3); }
  c.fillText(`-${T.span}s`, 44, H - 6); c.fillText("now", W - 30, H - 6);
  const X = (t) => 44 + (W - 50) * (1 - (now - t) / T.span), Y = (v) => 10 + (H - 30) * (hi - v) / (hi - lo);
  T.tags.forEach((a, i) => { const pts = T.data[a].filter(([t]) => t >= now - T.span - 1); if(!pts.length) return;
    c.strokeStyle = S5_TCOL[i % S5_TCOL.length]; c.lineWidth = 1.6; c.beginPath();
    pts.forEach(([t, v], k) => { const x = X(t), y = Y(v); if(k){ c.lineTo(x, Y(pts[k-1][1])); c.lineTo(x, y); } else c.moveTo(x, y); });
    c.lineTo(W - 6, Y(pts[pts.length - 1][1])); c.stroke(); });
  T.box.querySelector(".tl").innerHTML = T.tags.map((a, i) => { const v = window.val2 ? val2(a) : S.values[a];
    return `<span><i style="background:${S5_TCOL[i % S5_TCOL.length]}"></i>${esc(a)} = ${esc(v===undefined ? "??" : fmt(v))}</span>`; }).join("");
}
async function s5TrendDialog(){
  const open = S.s5Trends.find(t => !t.closed);
  const v = await (async () => { let x = ""; const r = await dialog({title:"New Trend", buttons:[["Cancel","cancel"],["OK","ok","pri"]], body:`<label>Tag <input id="s5tq" list="tagList" style="width:300px"></label>${open ? `<p class="notice-small">The tag is added to the open trend.</p>` : ""}`,
    onOpen: () => { fillLists(S.R ? S.R.prog : ""); $("s5tq").focus(); }, onSubmit: () => { x = $("s5tq").value.trim(); return x ? null : "Enter a tag"; }}); return r==="ok" ? x : null; })();
  if(v) s5Trend(S.R ? (aoiAddr(S.R.prog, v) || v) : v);
}
window.s5Trend = s5Trend; window.s5TrendDialog = s5TrendDialog;

/* ======================================================================
   Find options (S40)
   ====================================================================== */
S.find.wrap = S.find.wrap !== false; S.find.wild = !!S.find.wild; S.find.dir = S.find.dir || 1; S.find.stArea = S.find.stArea || "all";
(function(){
  const _fd = findDialog;
  findDialog = async function(replace){
    const f = S.find;
    const t = setInterval(() => {
      const frm = document.querySelector("#dlg .findfrm"); if(!frm) return; clearInterval(t);
      if(frm.querySelector(".s5x2")) return;
      frm.insertAdjacentHTML("beforeend", `<span>More options</span><span class="s5x2">
        <label><input type="checkbox" id="fwrap" ${f.wrap?"checked":""}> Wrap</label>
        <label><input type="checkbox" id="fwild" ${f.wild?"checked":""}> Use wildcards (* ? #)</label>
        <label>Direction <select id="fdir"><option value="1">Down</option><option value="-1">Up</option></select></label>
        <label>Structured Text <select id="fsta"><option value="all">Statements and comments</option><option value="code">Statements only</option><option value="comments">Comments only</option></select></label></span>`);
      $("fdir").value = String(f.dir); $("fsta").value = f.stArea;
      const keep = () => { f.wrap = $("fwrap").checked; f.wild = $("fwild").checked; f.dir = +$("fdir").value; f.stArea = $("fsta").value; };
      frm.addEventListener("change", keep); frm.addEventListener("input", keep);
    }, 20);
    setTimeout(() => clearInterval(t), 2000);
    return _fd.apply(this, arguments);
  };
  const _rf = runFind;
  runFind = async function(all){
    const f = S.find, sc = findScope();
    if(!f.wild && f.stArea==="all") return _rf.apply(this, arguments);
    let within = Object.entries(f.within).filter(([, v]) => v).map(([k]) => k);
    if(f.stArea==="code") within.push("stcode"); else if(f.stArea==="comments") within.push("stcomments");
    const r = await api("GET", `/api/studio/search?q=${encodeURIComponent(f.q)}&scope=${sc.scope}&program=${encodeURIComponent(sc.program)}&routine=${encodeURIComponent(sc.routine)}&within=${within.join(",")}&whole=${f.whole}&case=${f.case}&wild=${f.wild}`);
    S.hits = r.hits; S.hitIdx = -1; S.findTitle = `Find "${f.q}"${f.wild ? " (wildcards)" : ""} — ${({routine:"current routine",program:"current program",all:"all routines"})[sc.scope]}`;
    if(all){ S.ctab = "search"; renderConsoleTabs(); renderConsole(); }
    return r.hits;
  };
  const _fn = findNextFrom;
  findNextFrom = function(dir){
    const f = S.find; dir = dir * (f.dir || 1);
    if(!f.wrap && S.hits.length && S.hitIdx >= 0){
      const nx = S.hitIdx + dir;
      if(nx < 0 || nx >= S.hits.length){ statusMsg(`Find: reached the ${dir > 0 ? "end" : "start"} — "${f.q}" not found further (Wrap is off)`, "warning"); log(`Find: no more matches ${dir > 0 ? "below" : "above"}`, "wrn"); return; }
    }
    return _fn.call(this, dir);
  };
})();

/* ======================================================================
   Menus: Window ▸ New Window, Logic ▸ Trend, Search ▸ Go To Calling Routine
   ====================================================================== */
(function(){
  const at = (name) => MENUS.findIndex(m => m[0]===name);
  const add = (name, fn) => { const i = at(name); if(i < 0) return; const base = MENUS[i][2]; MENUS[i][2] = () => fn(base()); };
  add("Window", (items) => [["New Window", s5NewWindow, !(S.R && S.active===lxKey()), ""], ...items]);
  add("Search", (items) => [...items, "-", ["Go To Calling Routine", () => s5GoCalling(), !(S.R && S.active===lxKey())]]);
  add("Logic", (items) => [...items, "-", ["Trend…", s5TrendDialog]]);
})();
