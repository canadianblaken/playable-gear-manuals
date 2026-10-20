/* ================= Synth CC mapper: MIDI Guide catalog -> the five Control-mode knob assignments =================
   The catalog (1d-midiguide.js) is MIDI Guide by Pencil Research, CC BY-SA 4.0, unpacked on first use.
   A mapping is plain data, apart from the panel, so a later device-transfer action can write mappingGlobals(m)
   with DEV.link.setGlobal. Nothing here touches DEV.link, asks for MIDI access or sends MIDI. */
const KNOB_IDS={cc:28,port:33,ch:38,min:48,max:53},GLOBAL_CH=127,GLOBAL_CH_ID=80;
const KIND_TEXT={cc14:"14-bit CC pair",mode:"channel mode message",nrpn:"NRPN",other:"not a CC"};
let MG=null;
async function loadCatalog(){if(MG)return MG;
 if(typeof DecompressionStream!=="function")throw new Error("this browser cannot unpack the catalog (it needs DecompressionStream: Chrome 80, Safari 16.4, Firefox 113 or later)");
 const bin=Uint8Array.from(atob(MIDIGUIDE_GZ),c=>c.charCodeAt(0));
 const cat=JSON.parse(await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream("gzip"))).text());
 cat.devices.forEach(d=>{d.id=d.m+"/"+d.d;d.params=d.p.map(a=>mgParam(d,a));d.cc=d.params.filter(p=>p.kind==="cc");d.unsupported=d.params.filter(p=>p.kind!=="cc")});
 cat.byId=new Map(cat.devices.map(d=>[d.id,d]));return MG=cat}
/* one catalog row; the importer drops trailing empty fields */
function mgParam(d,a){const g=i=>a[i]===undefined?null:a[i],s=i=>a[i]||"";
 return {section:d.s[a[0]]||"",name:s(1),desc:s(2),kind:a[3],cc:g(4),lsb:g(5),nrpnMsb:g(6),nrpnLsb:g(7),min:g(8),max:g(9),def:g(10),
  nrpnMin:g(11),nrpnMax:g(12),nrpnDef:g(13),centered:!!a[14],notes:s(15),usage:s(16),rawCC:s(17)}}
/* a knob is a good fit for a range of values; switches (a usage list without "~", or a short range) still work but are not suggested */
const continuous=p=>/~/.test(p.usage)||!p.usage&&((p.max??127)-(p.min??0))>=16;
function unsupportedText(p){const where=p.kind==="cc14"?`CC ${p.cc} + LSB ${p.lsb}`:p.kind==="mode"?`CC ${p.cc}`:p.kind==="nrpn"?`NRPN ${p.nrpnMsb??"?"}:${p.nrpnLsb??"?"}`:p.rawCC?`CC field “${p.rawCC}”`:"no CC or NRPN";
 return `${p.section?p.section+" · ":""}${p.name} — ${KIND_TEXT[p.kind]}, ${where}${p.notes?" ("+p.notes+")":""}`}

/* starting layouts: the first unused continuous single-CC parameter matching each slot, in order of preference */
const SUGGEST=[
 {slot:"Filter cutoff",re:[/cut-?off/i,/\b(filter|vcf)\b.*\bfreq/i,/^(vcf|filter)$/i]},
 {slot:"Resonance",re:[/resonance|emphasis/i,/\breso?\b/i,/\bpeak\b/i]},
 {slot:"Filter envelope amount",re:[/\b(filter|vcf)\b.*\b(env|eg|envelope)\b.*\b(amount|amt|depth|int|intensity)\b/i,/\b(env|eg|envelope)\b.*\b(amount|amt|depth|intensity)\b/i,/contour/i]},
 {slot:"Envelope release or decay",re:[/\b(amp|vca)\b.*\brelease\b/i,/\b(amp|vca)\b.*\bdecay\b/i,/\brelease\b/i,/\bdecay\b/i]},
 {slot:"LFO rate",re:[/\blfo\b.*\b(rate|speed|freq|frequency)\b/i,/\b(rate|speed)\b/i]}];
function suggestKnobs(d){const used=new Set(),cands=d.cc.filter(continuous);
 return SUGGEST.map(s=>{for(const re of s.re){const p=cands.find(p=>!used.has(p)&&re.test(`${p.section} ${p.name}`));if(p){used.add(p);return knobFrom(p,true)}}return null})}
const knobFrom=(p,suggested=false)=>({cc:p.cc,min:p.min??0,max:p.max??127,label:p.name,section:p.section,suggested});

/* ---------- the mapping model ---------- */
const int=(v,lo,hi)=>Number.isInteger(v)&&v>=lo&&v<=hi;
const text=(v,max)=>typeof v==="string"&&v.length<=max;
/* returns a clean copy or throws; only known fields survive */
function checkMapping(m){if(!m||typeof m!=="object")throw new Error("not a mapping");
 if(!text(m.name,60)||!m.name.trim())throw new Error("mapping needs a name of 1–60 characters");
 if(!(m.device===null||text(m.device,200)))throw new Error(`“${m.name}”: bad synth`);
 if(!(int(m.channel,0,15)||m.channel===GLOBAL_CH))throw new Error(`“${m.name}”: channel must be 1–16 or Global`);
 if(!int(m.port,0,3))throw new Error(`“${m.name}”: bad output port`);
 if(!Array.isArray(m.knobs)||m.knobs.length!==5)throw new Error(`“${m.name}”: needs five knobs`);
 const knobs=m.knobs.map((k,i)=>{if(k===null)return null;
  if(!k||!int(k.cc,0,119)||!int(k.min,0,127)||!int(k.max,0,127)||!text(k.label,80)||!(k.section===undefined||text(k.section,80)))throw new Error(`“${m.name}”: knob ${i+1} is not a single CC 0–119 with min/max 0–127`);
  return {cc:k.cc,min:k.min,max:k.max,label:k.label,section:k.section||""}});
 return {name:m.name.trim(),device:m.device,channel:m.channel,port:m.port,knobs}}
/* the global settings a mapping sets: IDs 28-32 CC, 33-37 port, 38-42 channel (0-15, 127 = Global), 48-52 min, 53-57 max */
function mappingGlobals(m){const g={};m.knobs.forEach((k,i)=>{if(!k)return;
 g[KNOB_IDS.cc+i]=k.cc;g[KNOB_IDS.port+i]=m.port;g[KNOB_IDS.ch+i]=m.channel;g[KNOB_IDS.min+i]=k.min;g[KNOB_IDS.max+i]=k.max});return g}
/* simulation only: unassigned knobs keep their current settings */
function applyMappingToSim(m){m=checkMapping(m);for(const [id,v] of Object.entries(mappingGlobals(m)))S.globals[id]=v;
 S.knobLabels=m.knobs.map(k=>k?{cc:k.cc,name:k.label}:null);emit("ccmap:apply");dirty();return m}
const channelText=c=>c===GLOBAL_CH?`Global (now ${(S.globals[GLOBAL_CH_ID]&15)+1})`:String(c+1);

/* ---------- saved mappings (this browser) and files ---------- */
const CCMAP_KEY="ksp.ccmaps",CCMAP_DRAFT="ksp.ccmap.draft",CCMAP_FORMAT="keystep-pro-cc-mappings";
function loadSavedMaps(){let raw;try{raw=JSON.parse(localStorage.getItem(CCMAP_KEY)||"[]")}catch(e){return {maps:[],skipped:0}}
 const maps=[];let skipped=0;for(const m of Array.isArray(raw)?raw:[]){try{maps.push(checkMapping(m))}catch(e){skipped++}}return {maps,skipped}}
function storeSavedMaps(maps){try{localStorage.setItem(CCMAP_KEY,JSON.stringify(maps));return true}catch(e){return false}}
function exportMaps(maps){return {format:CCMAP_FORMAT,version:1,saved:new Date().toISOString(),catalog:`MIDI Guide ${MIDIGUIDE_META.revision.slice(0,12)} (${MIDIGUIDE_META.revisionDate})`,maps}}
function importMaps(obj){if(!obj||obj.format!==CCMAP_FORMAT||obj.version!==1||!Array.isArray(obj.maps))throw new Error("not a KeyStep Pro CC mapping file from this page");
 if(obj.maps.length>500)throw new Error("too many mappings in the file");return obj.maps.map(checkMapping)}
/* match a saved knob against the catalog as it is now */
function resolveKnob(d,k){if(!k)return {state:"none"};if(!d)return {state:"nodevice"};
 const same=d.cc.find(p=>p.cc===k.cc&&p.name===k.label);if(same)return {state:"ok",p:same};
 const byCC=d.cc.find(p=>p.cc===k.cc);return byCC?{state:"renamed",p:byCC}:{state:"missing"}}

/* ---------- the tab ---------- */
const CCM={dev:null,knobs:[null,null,null,null,null],channel:0,port:3,saved:[]};
function ccmStatus(s,cls=""){const e=$("#ccmStatus");if(e){e.textContent=s;e.className="pg "+cls}}
function ccmDraft(){return {name:"draft",device:CCM.dev?CCM.dev.id:null,channel:CCM.channel,port:CCM.port,knobs:CCM.knobs.map(k=>k&&{cc:k.cc,min:k.min,max:k.max,label:k.label,section:k.section})}}
function ccmSaveDraft(){try{localStorage.setItem(CCMAP_DRAFT,JSON.stringify(ccmDraft()))}catch(e){}}
function ccEl(tag,props={},kids=[]){const e=document.createElement(tag);Object.assign(e,props);for(const k of kids)e.append(k);return e}
async function renderCCMap(){const pane=$("#paneCC");if(pane.dataset.built)return;pane.dataset.built=1;
 pane.innerHTML=`<div class="card"><h2>Synth CC mapper</h2>
  <p class="pg">Pick a synth and give the KeyStep Pro's five Control-mode knobs some of its parameters. These are the five <b>global</b> knob assignments (Utility › Controller › Knob 1–5): every track's Control mode uses the same five, there are no separate banks per track. Applying changes the simulated KeyStep Pro only.</p>
  <div class="feat"><div class="row"><input type="search" id="ccmSearch" placeholder="Search manufacturer or model" aria-label="Search synths" autocomplete="off"><span class="pg" id="ccmCount"></span></div>
   <select id="ccmList" size="8" aria-label="Synths" class="ccmList"></select></div>
  <div id="ccmDevice" class="feat" hidden></div>
  <div class="feat"><h3>Knobs</h3><div class="row small">MIDI channel <select id="ccmCh" aria-label="MIDI channel"></select> Output <select id="ccmPort" aria-label="Output port"></select></div>
   <div id="ccmKnobs"></div>
   <div class="row"><button class="sm" id="ccmSuggest">Use suggestions</button><button class="sm" id="ccmClear">Clear</button><button class="sm" id="ccmApply">Apply to simulation</button></div>
   <p class="pg" id="ccmStatus" aria-live="polite"></p></div>
  <div class="feat"><h3>Saved mappings</h3><div class="row"><input type="text" id="ccmName" maxlength="60" placeholder="Name" aria-label="Mapping name"><button class="sm" id="ccmSave">Save</button></div>
   <div class="row"><select id="ccmSaved" aria-label="Saved mappings"></select><button class="sm" id="ccmLoad">Load</button><button class="sm" id="ccmDel">Delete</button><button class="sm" id="ccmExport">Export file</button><label class="sm2 filebtn">Import file<input type="file" id="ccmImport" accept=".json,application/json" hidden></label></div></div>
  <details><summary>How the simulation uses these settings</summary><ul class="tight pg">
   <li>Min and Max scale the knob: the simulation keeps the knob position (0–127, also what Control-track automation records) and sends Min + (Max − Min) × position / 127, so live moves and recorded automation use the same range. A Min above Max reverses the knob. This scaling follows Arturia's description of the settings and is not yet traced in the firmware.</li>
   <li>Only single 7-bit CCs are offered, because that is what a knob sends. NRPN, 14-bit CC pairs (MSB + LSB), channel mode messages (CC 120–127) and SysEx are listed separately and never turned into plain CCs.</li>
   <li>Output port is stored as on the device. This page's MIDI button (top bar) stands in for the USB port: it sends a knob only when its port is USB or All. MIDI 1/MIDI 2 routing and writing a mapping to a real KeyStep Pro are not done yet.</li>
   <li>Suggestions are picked from the synth's own documented parameters by name, never assumed from another synth.</li></ul></details>
  <p class="pg" id="ccmCredit"></p></div>`;
 const credit=$("#ccmCredit");credit.append("Synth data: ",ccEl("a",{href:"https://midi.guide/",textContent:"MIDI Guide",target:"_blank",rel:"noopener"})," by Pencil Research, ",
  ccEl("a",{href:"https://creativecommons.org/licenses/by-sa/4.0/",textContent:"CC BY-SA 4.0",target:"_blank",rel:"noopener"}),
  `, snapshot ${MIDIGUIDE_META.revision.slice(0,12)} (${MIDIGUIDE_META.revisionDate}), converted for this page. Parts that describe a specific device may be owned by its manufacturer. Check a synth's manual before relying on a mapping.`);
 const chSel=$("#ccmCh");for(let c=0;c<16;c++)chSel.add(new Option(String(c+1),c));chSel.add(new Option("Global",GLOBAL_CH));
 const portSel=$("#ccmPort");(GBY[KNOB_IDS.port].o||[[0,"USB"],[1,"MIDI 1"],[2,"MIDI 2"],[3,"All"]]).forEach(([v,n])=>portSel.add(new Option(n,v)));
 chSel.value=CCM.channel;portSel.value=CCM.port;chSel.onchange=()=>{CCM.channel=+chSel.value;ccmSaveDraft()};portSel.onchange=()=>{CCM.port=+portSel.value;ccmSaveDraft()};
 $("#ccmSuggest").onclick=()=>{if(!CCM.dev)return ccmStatus("Pick a synth first.","bad");CCM.knobs=suggestKnobs(CCM.dev);drawKnobs();ccmSaveDraft();
  const n=CCM.knobs.filter(Boolean).length;ccmStatus(n?`${n} suggestion${n===1?"":"s"} from ${CCM.dev.m} ${CCM.dev.d}'s parameters.`:"No parameter names matched the suggestion slots; pick the knobs yourself.")};
 $("#ccmClear").onclick=()=>{CCM.knobs=[null,null,null,null,null];drawKnobs();ccmSaveDraft();ccmStatus("Cleared.")};
 $("#ccmApply").onclick=()=>{try{const m=applyMappingToSim({...ccmDraft(),name:$("#ccmName").value.trim()||"Unsaved mapping"});
  const set=m.knobs.map((k,i)=>k?`${i+1} ${k.label} (CC ${k.cc})`:null).filter(Boolean);
  ccmStatus(set.length?`Applied to the simulation, channel ${channelText(m.channel)}: knob ${set.join(", ")}. Press Control + a track button on the panel and turn the knobs.`:"Nothing assigned yet.",set.length?"ok":"bad")}catch(e){ccmStatus(e.message,"bad")}};
 $("#ccmSave").onclick=()=>{try{const m=checkMapping({...ccmDraft(),name:$("#ccmName").value});CCM.saved=CCM.saved.filter(x=>x.name!==m.name).concat(m);
  const ok=storeSavedMaps(CCM.saved);ccmStatus(ok?`Saved “${m.name}” in this browser.`:"Could not save: this browser blocks local storage here.",ok?"ok":"bad");drawSaved(m.name)}catch(e){ccmStatus(e.message,"bad")}};
 $("#ccmLoad").onclick=()=>{const m=CCM.saved.find(x=>x.name===$("#ccmSaved").value);if(m)loadMapping(m)};
 $("#ccmDel").onclick=()=>{const n=$("#ccmSaved").value;if(!n)return;CCM.saved=CCM.saved.filter(x=>x.name!==n);storeSavedMaps(CCM.saved);drawSaved();ccmStatus(`Deleted “${n}”.`)};
 $("#ccmExport").onclick=()=>{if(!CCM.saved.length)return ccmStatus("Save a mapping first.","bad");saveJSON(exportMaps(CCM.saved),"KeyStep Pro CC mappings.json")};
 $("#ccmImport").onchange=async e=>{const f=e.target.files[0];e.target.value="";if(!f)return;try{const maps=importMaps(JSON.parse(await f.text()));
  for(const m of maps)CCM.saved=CCM.saved.filter(x=>x.name!==m.name).concat(m);storeSavedMaps(CCM.saved);drawSaved(maps[0]&&maps[0].name);ccmStatus(`Imported ${maps.length} mapping${maps.length===1?"":"s"}.`,"ok")}catch(err){ccmStatus("Import failed: "+err.message,"bad")}};
 const s=loadSavedMaps();CCM.saved=s.maps;drawSaved();if(s.skipped)ccmStatus(`${s.skipped} saved mapping(s) could not be read and were skipped.`,"bad");
 ccmStatus("Unpacking the synth catalog…");
 try{await loadCatalog()}catch(e){ccmStatus("The synth catalog could not be loaded: "+e.message,"bad");return}
 const search=$("#ccmSearch"),list=$("#ccmList");
 const drawList=()=>{const words=search.value.toLowerCase().split(/\s+/).filter(Boolean),keep=list.value;list.innerHTML="";let n=0;
  for(const d of MG.devices){const hay=(d.m+" "+d.d).toLowerCase();if(!words.every(w=>hay.includes(w)))continue;n++;list.add(new Option(`${d.m} — ${d.d} (${d.cc.length} CC)`,d.id))}
  list.value=keep;$("#ccmCount").textContent=`${n} of ${MG.devices.length} synths`};
 search.oninput=drawList;list.onchange=()=>{selectDevice(MG.byId.get(list.value),true)};drawList();
 let draft=null;try{draft=JSON.parse(localStorage.getItem(CCMAP_DRAFT)||"null")}catch(e){}
 if(draft){try{loadMapping(checkMapping(draft),true)}catch(e){drawKnobs()}}else drawKnobs();
 if(!draft)ccmStatus(`${MG.devices.length} synths from MIDI Guide. Pick one to start.`);
 emit("ccmap:ready")}
function selectDevice(d,suggest){CCM.dev=d||null;const box=$("#ccmDevice");box.innerHTML="";box.hidden=!d;
 if(d){$("#ccmList").value=d.id;const by=k=>d.unsupported.filter(p=>p.kind===k).length;
  box.append(ccEl("h3",{textContent:`${d.m} ${d.d}`}),ccEl("div",{className:"pg",textContent:`${d.cc.length} parameter${d.cc.length===1?"":"s"} a knob can send (single CC). Not offered: ${by("nrpn")} NRPN, ${by("cc14")} 14-bit CC pair, ${by("mode")} channel mode, ${by("other")} other.`}));
  if(!d.cc.length)box.append(ccEl("p",{className:"need",textContent:"None of this synth's documented parameters can go on a KeyStep Pro knob: a knob sends one 7-bit CC, and this synth uses NRPN, 14-bit CC pairs or other messages for them (listed below). Use the synth's own controls, or software that sends NRPN."}));
  if(d.unsupported.length){const det=ccEl("details",{},[ccEl("summary",{textContent:`Parameters not offered (${d.unsupported.length})`})]),ul=ccEl("ul",{className:"tight pg"});
   d.unsupported.forEach(p=>ul.append(ccEl("li",{textContent:unsupportedText(p)})));det.append(ul);box.append(det)}
  if(suggest){CCM.knobs=suggestKnobs(d);const n=CCM.knobs.filter(Boolean).length;ccmStatus(d.cc.length?(n?`Suggested ${n} knob${n===1?"":"s"} from this synth's parameters; change any of them.`:"No parameter names matched the suggestion slots; pick the knobs yourself."):"")}}
 drawKnobs();ccmSaveDraft()}
function loadMapping(m,quiet){const d=m.device&&MG?MG.byId.get(m.device):null;CCM.channel=m.channel;CCM.port=m.port;$("#ccmCh").value=m.channel;$("#ccmPort").value=m.port;
 if(m.name!=="draft")$("#ccmName").value=m.name;CCM.knobs=m.knobs.map(k=>k&&{...k,suggested:false});selectDevice(d,false);
 const notes=[];if(m.device&&!d)notes.push(`“${m.device}” is not in this catalog version; its knobs are kept as saved CC numbers`);
 m.knobs.forEach((k,i)=>{const r=resolveKnob(d,k);if(d&&r.state==="renamed")notes.push(`knob ${i+1}: CC ${k.cc} is now called “${r.p.name}” in the catalog`);if(d&&r.state==="missing")notes.push(`knob ${i+1}: CC ${k.cc} (“${k.label}”) is no longer listed for this synth`)});
 if(!quiet||notes.length)ccmStatus(notes.length?"Loaded with changes: "+notes.join("; ")+".":`Loaded “${m.name}”.`,notes.length?"bad":"ok")}
function drawKnobs(){const box=$("#ccmKnobs");if(!box)return;box.innerHTML="";const d=CCM.dev;
 for(let i=0;i<5;i++){const k=CCM.knobs[i],row=ccEl("div",{className:"ccmKnob"}),sel=ccEl("select",{ariaLabel:`Knob ${i+1} parameter`});
  sel.add(new Option("— not assigned (keeps its current setting) —",""));
  const r=resolveKnob(d,k);if(k&&r.state!=="ok"){sel.add(new Option(`CC ${k.cc} · ${k.label} (saved; not in the catalog for this synth)`,"saved"))}
  if(d){let og=null,sec=null;d.cc.forEach((p,j)=>{if(p.section!==sec){sec=p.section;og=ccEl("optgroup",{label:sec||"(no section)"});sel.append(og)}og.append(new Option(`CC ${p.cc} · ${p.name}`,j))})}
  sel.value=!k?"":r.state==="ok"?String(d.cc.indexOf(r.p)):"saved";
  const mn=ccEl("input",{type:"number",min:0,max:127,value:k?k.min:0,ariaLabel:`Knob ${i+1} minimum`,disabled:!k}),mx=ccEl("input",{type:"number",min:0,max:127,value:k?k.max:127,ariaLabel:`Knob ${i+1} maximum`,disabled:!k});
  const info=ccEl("div",{className:"pg"});if(k){const p=r.state==="ok"?r.p:null;
   info.textContent=[k.suggested?`Suggested (${SUGGEST[i].slot})`:"",p&&p.section,p&&p.desc,p&&p.usage&&`Values: ${p.usage}`,p&&p.notes&&`Note: ${p.notes}`,p&&p.centered?"Centered (bipolar)":""].filter(Boolean).join(" · ")}
  sel.onchange=()=>{const v=sel.value;CCM.knobs[i]=v===""?null:v==="saved"?k:knobFrom(d.cc[+v]);drawKnobs();ccmSaveDraft()};
  const num=(inp,f)=>{inp.onchange=()=>{const v=Math.round(+inp.value);if(!int(v,0,127)){inp.value=CCM.knobs[i][f];return ccmStatus("Min and Max are 0–127.","bad")}CCM.knobs[i][f]=v;ccmSaveDraft()}};num(mn,"min");num(mx,"max");
  row.append(ccEl("b",{textContent:`Knob ${i+1}`}),sel,"Min",mn,"Max",mx,info);box.append(row)}}
function drawSaved(pick){const s=$("#ccmSaved");if(!s)return;s.innerHTML="";if(!CCM.saved.length)s.add(new Option("(none saved)",""));
 CCM.saved.forEach(m=>s.add(new Option(`${m.name}${m.device?" · "+m.device.replace("/"," "):""}`,m.name)));if(pick)s.value=pick}
