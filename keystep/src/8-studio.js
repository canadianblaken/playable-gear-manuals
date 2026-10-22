/* ================= Projects and Device settings modes: MIDI Control Center's screen, built on the project-file functions above =================
   Left: the 16 slots on the KeyStep (Recall / Store) and the library in this browser. Centre: the project being edited, a tab per track,
   scenes, project settings and the control track. Right: help for the tab in use and the activity log.
   Edits change DEV.project in place after an undo snapshot; nothing reaches the KeyStep until Store. */
const STU={mode:"proj",built:false,tab:0,pat:[1,1,1,1,1],page:[0,0,0,0,0],sel:null,undo:[],redo:[],slot:1,fromSlot:null,src:"",changed:false,
 libSel:null,clip:null,showAll:false,scroll:{},drag:null};
const TRACK_COL=["var(--t1)","var(--t2)","var(--t3)","var(--t4)","var(--t5)"];
const PTABS=[["Track 1",0],["Track 2",1],["Track 3",2],["Track 4",3],["Scenes","sc"],["Project","pj"],["Control","ct"]];
/* control track (item 0x7A), from MCC's recall plan: per pattern a step count and the CC number of knobs 1-5;
   per step [pattern, step] an on flag, a skip flag and one value per knob */
const CTRL_ITEM=0x7A,CT_P={state:0x28,len:0x59,knob:[0x5A,0x5B,0x5C,0x5D,0x5E],on:0x5F,skip:0x60};
const KNOB_NAMES=["Knob 1","Knob 2","Knob 3","Knob 4","Knob 5"],USER2=[0x68,0x69,0x6A];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const opts=(list,v)=>list.map(([k,n])=>`<option value="${k}" ${k===v?"selected":""}>${esc(n)}</option>`).join("");
/* the KeyStep cannot report project names, so the list shows the last name sent from this browser */
function slotNames(){try{return JSON.parse(localStorage.getItem("ksp.slotNames")||"{}")}catch(e){return {}}}
function slotNameSet(p,n){const m=slotNames();if(n)m[p]=n;else delete m[p];try{localStorage.setItem("ksp.slotNames",JSON.stringify(m))}catch(e){}}

/* ---------- modes ---------- */
function selectMode(m){if(m==="dev")m="proj";if(!["man","proj","set","cc"].includes(m))m="proj";STU.mode=m;
 document.querySelectorAll(".modes button").forEach(b=>b.setAttribute("aria-selected",b.dataset.mode===m));
 $("#vManual").hidden=m!=="man";$("#vProj").hidden=m!=="proj";$("#vSet").hidden=m!=="set";$("#vCC").hidden=m!=="cc";
 if(m==="proj"){stuBuild();emit("tab:dev")}if(m==="set")setBuild();if(m==="cc"){renderCCMap();emit("tab:cc")}
 try{localStorage.setItem("ksp.mode",m)}catch(e){}}

/* two clicks for anything that replaces data, no browser dialog */
const ARM=new Map();
function armed(btn,text){const a=ARM.get(btn);if(a){clearTimeout(a.t);btn.textContent=a.orig;ARM.delete(btn);return true}
 const orig=btn.textContent;btn.textContent=text;ARM.set(btn,{orig,t:setTimeout(()=>{btn.textContent=orig;ARM.delete(btn)},4000)});return false}
function disarm(){for(const [b,a] of ARM){clearTimeout(a.t);b.textContent=a.orig}ARM.clear()}
function openConn(){quickConnect()}
function xprog(x){$("#xprog").hidden=x==null;if(x!=null){$("#xpg").value=x;$("#xst").textContent=`${Math.round(x*100)}%`}}

/* ---------- the open project ---------- */
function stuShow(f,src,o={}){const prev=DEV.project;
 /* the project being replaced stays one Undo away if it had edits */
 const keep=prev&&prev!==f&&(STU.changed||src==="MIDI import")?[JSON.stringify(prev)]:[];
 DEV.project=f;STU.src=src;STU.undo=src==="MIDI import"?STU.undo.concat(keep):keep;STU.redo=[];STU.sel=null;
 if(src!=="MIDI import"){STU.fromSlot=o.slot||null;STU.pat=[1,1,1,1,1];STU.page=[0,0,0,0,0];STU.scroll={};if(o.slot)STU.slot=o.slot;else if(f.project)STU.slot=f.project}
 STU.changed=src==="MIDI import"||/Edited/.test(src);
 if(DEV.midiLoad)DEV.midiLoad();if(STU.built){renderWork();drawSlots()}emit("stu:show")}
DEV.showProject=stuShow;
function markChanged(){STU.changed=true;drawWorkHead()}
/* every edit: snapshot, change, redraw; an edit that throws leaves the project as it was */
function edit(fn,msg){const f=DEV.project;if(!f)return false;const before=JSON.stringify(f);
 try{fn(f)}catch(e){DEV.project=JSON.parse(before);say(e.message,"bad");renderPanel();return false}
 STU.undo.push(before);if(STU.undo.length>40)STU.undo.shift();STU.redo=[];markChanged();renderPanel();if(msg)say(msg,"ok");emit("stu:edit");return true}
function undo(){if(!STU.undo.length)return;STU.redo.push(JSON.stringify(DEV.project));DEV.project=JSON.parse(STU.undo.pop());STU.sel=null;markChanged();renderWork();say("Undone.")}
function redo(){if(!STU.redo.length)return;STU.undo.push(JSON.stringify(DEV.project));DEV.project=JSON.parse(STU.redo.pop());STU.sel=null;markChanged();renderWork();say("Redone.")}
function say(s,cls=""){const m=$("#pmsg");if(m){m.textContent=s;m.className="pnote "+(cls==="bad"?"warn":"")}if(cls==="bad")devLog(s,"bad")}

/* ---------- KeyStep slots ---------- */
function drawSlots(){const ul=$("#slotList"),names=slotNames();ul.innerHTML="";
 for(let p=1;p<=16;p++){const li=document.createElement("li");li.setAttribute("role","option");li.setAttribute("aria-selected",p===STU.slot);li.dataset.p=p;
  li.innerHTML=`<span class="n">${p}</span><span class="nm"></span>${DEV.project&&STU.fromSlot===p?'<span class="tag">open</span>':""}`;
  li.querySelector(".nm").textContent=names[p]||`Project ${p}`;if(names[p])li.title="The name last sent from this browser (the KeyStep cannot report names)";
  li.onclick=()=>{STU.slot=p;disarm();drawSlots();drawWorkHead()};li.ondblclick=()=>recall($("#recallBtn"));ul.appendChild(li)}}
function recall(btn){if(!DEV.link){openConn();devLog("Connect to the KeyStep first: the pill at the top.","bad");return}
 const p=STU.slot;if(DEV.project&&STU.changed&&!armed(btn,"Click again: drop the edits"))return;
 busy(async()=>{const t0=performance.now();xprog(0);try{const f=await readProject(DEV.link,p,xprog);
  stuShow(f,`KeyStep slot ${p}`,{slot:p});devLog(`slot ${p} recalled: ${f.data.length} blocks in ${((performance.now()-t0)/1000).toFixed(1)} s`,"ok");emit("dev:recall")}finally{xprog(null)}})}
function store(btn){const f=DEV.project;if(!f){devLog("Nothing to store yet: recall a slot, open a file or start a new project.","bad");return}
 if(!DEV.link){openConn();devLog("Connect to the KeyStep first: the pill at the top.","bad");return}
 const to=STU.slot;if(!armed(btn,`Click again to replace slot ${to}`))return;disarm();
 busy(async()=>{const n=$("#workName").value.trim();f.name=n?displayName(n):null;xprog(0);const t0=performance.now();
  try{const pr=await storeProject(DEV.link,to,f,{verify:true,prog:xprog});const s=((performance.now()-t0)/1000).toFixed(1);
   if(!pr.length){STU.changed=false;f.project=to;STU.fromSlot=to;STU.src=`KeyStep slot ${to}`;if(f.name&&(DEV.link.sim?SIMDEV.namesFw:true))slotNameSet(to,f.name)}
   devLog(pr.length?`PROBLEM: ${pr.length} value(s) differ after storing to slot ${to}: ${pr.slice(0,5).join("; ")}${pr.length>5?" …":""}`:`slot ${to} written and verified in ${s} s`,pr.length?"bad":"ok");
   if(!pr.length)emit("dev:store")}finally{xprog(null);drawSlots();drawWorkHead()}})}

/* ---------- library (this browser) ---------- */
async function drawLib(){const ul=$("#libList");let items;try{items=await libList()}catch(e){ul.textContent="The library is not available here: "+e.message;return}
 const q=$("#libSearch").value.trim().toLowerCase();items.sort((a,b)=>b.added.localeCompare(a.added));ul.innerHTML="";
 const shown=items.filter(it=>!q||it.name.toLowerCase().includes(q));
 if(!items.length){ul.innerHTML='<li class="pg" style="cursor:default">Empty. Save the open project here, or import files.</li>'}
 for(const it of shown){const li=document.createElement("li");li.setAttribute("aria-selected",it.id===STU.libSel);li.dataset.id=it.id;
  const nm=document.createElement("span");nm.className="nm";nm.textContent=it.name;const sm=document.createElement("span");sm.className="sm";sm.textContent=`P${it.file.project} · ${it.added.slice(0,10)}`;nm.appendChild(sm);li.appendChild(nm);
  li.onclick=()=>{STU.libSel=it.id;disarm();drawLib()};li.ondblclick=()=>libLoad(it.id);ul.appendChild(li)}
 $("#libAct").hidden=!shown.some(it=>it.id===STU.libSel)}
async function libLoad(id){const it=await libGet(id);if(!it)return;stuShow(JSON.parse(JSON.stringify(it.file)),`Library “${it.name}”`);devLog(`opened “${it.name}” from the library`,"ok");emit("lib:load")}
async function libAction(a,btn){const id=STU.libSel,it=id!=null&&await libGet(id);if(!it)return;
 if(a==="load")return libLoad(id);
 if(a==="file")return saveJSON(it.file,`KeyStep Pro ${fileSafe(it.name)}.json`);
 if(a==="del"){if(!armed(btn,"Click again to delete"))return;await libDelete(id);STU.libSel=null;devLog(`deleted “${it.name}” from the library`);return drawLib()}
 if(a==="ren"){const li=$(`#libList li[data-id="${id}"]`);if(!li)return;const inp=document.createElement("input");inp.className="search";inp.value=it.name;inp.maxLength=60;inp.setAttribute("aria-label","New name");
  li.replaceChildren(inp);inp.focus();inp.select();let done=false;const fin=async ok=>{if(done)return;done=true;if(ok&&inp.value.trim())await libRename(id,inp.value.trim());drawLib()};
  inp.onkeydown=e=>{if(e.key==="Enter")fin(true);if(e.key==="Escape")fin(false)};inp.onblur=()=>fin(true);inp.onclick=e=>e.stopPropagation()}}
async function openFileInput(e){const file=e.target.files[0];e.target.value="";if(!file)return;
 try{const obj=JSON.parse(await file.text());if(obj&&obj.format===BACKUP_FORMAT){devLog("That is a backup file: use Import (My library) to add its projects, or Back up or restore.","bad");return}
  stuShow(checkProjectFile(obj),file.name);devLog(`opened ${file.name}`,"ok")}catch(err){devLog(`${file.name}: ${err.message}`,"bad")}}

/* ---------- centre: header, tabs, panels ---------- */
function drawWorkHead(){const f=DEV.project;$("#pjEmpty").hidden=!!f;$("#pjWork").hidden=!f;if(!f)return;
 $("#workSrc").textContent="Editing · "+STU.src;const wn=$("#workName");if(document.activeElement!==wn)wn.value=f.name||"";
 $("#workChg").hidden=!STU.changed;$("#undoBtn").disabled=!STU.undo.length;$("#redoBtn").disabled=!STU.redo.length;
 const sb=$("#storeBtn2");if(!ARM.has(sb))sb.textContent=`Store to slot ${STU.slot}`}
function renderWork(){drawWorkHead();if(!DEV.project)return;const d=$("#ptabs");d.innerHTML="";
 PTABS.forEach(([n,k],i)=>{const b=document.createElement("button");b.setAttribute("role","tab");b.setAttribute("aria-selected",i===STU.tab);b.dataset.tab=i;
  b.innerHTML=(typeof k==="number"?`<span class="sw" style="background:${TRACK_COL[k]}"></span>`:k==="ct"?`<span class="sw" style="background:${TRACK_COL[4]}"></span>`:"")+n;
  b.onclick=()=>{STU.tab=i;STU.sel=null;try{localStorage.setItem("ksp.ptab",i)}catch(e){}renderWork()};d.appendChild(b)});renderPanel()}
const HELP={
 seq:`<p>Each row is a note, each column a step. Click an empty cell to add a note there; click a note to select it and edit it below; click it again to remove it.</p><p class="pg">A step holds up to 16 notes, a pattern 192. Patterns 1–16 are the KeyStep's pattern pages; a pattern with notes is underlined. Steps past the pattern's length are dimmed.</p>`,
 arp:`<p>This track is set to Arpeggiator: it plays the keys you hold, not these steps. The steps play again when you switch it back to Sequencer.</p>`,
 drum:`<p>Each row is a drum lane, each column a step. Click to place a hit; click a hit to select it (velocity, gate and timing below), again to remove it.</p><p class="pg">Lane notes come from the Drum Map in Device settings. <b>Steps → drums</b> turns another track's notes into hits. Drum and sequencer patterns of track 1 are stored side by side; the mode decides which ones play.</p>`,
 sc:`<p>A scene sets which pattern each track plays, which tracks are muted and a chain of patterns per track. Recalling a scene on the KeyStep switches all tracks at once.</p><p class="pg">Chains: track:patterns, for example <code>1:1 2 3 2:4</code>. Track 5 is the control track.</p>`,
 pj:`<p>Settings for the whole project: tempo, each track's chord (for Chord mode) and the two user scales.</p><p class="pg">A chord entered on the device with a note below its first note cannot travel over SysEx; such a chord is shown but cannot be edited or stored from here.</p>`,
 ct:`<p>The control track sends a CC per knob on each step, like a sequencer for the five encoders.</p><p class="pg">Drag the bars to set values, click the row under them to turn steps on or off. The layout comes from MCC's recall plan; these values have not yet been checked on a KeyStep, so try them on a test slot first.</p>`};
function renderPanel(){const el=$("#ppanel"),k=PTABS[STU.tab][1],f=DEV.project;if(!f)return;const roll=el.querySelector(".roll");if(roll)STU.scroll[STU.tab]=roll.scrollTop;
 el.innerHTML="";let help;
 if(typeof k==="number")help=trackPanel(el,k);else if(k==="sc"){scenesPanel(el);help="sc"}else if(k==="pj"){projectPanel(el);help="pj"}else{controlPanel(el);help="ct"}
 el.insertAdjacentHTML("beforeend",'<p class="pnote" id="pmsg" aria-live="polite"></p>');$("#pjHelpText").innerHTML=HELP[help];drawWorkHead()}

/* ---------- a track ---------- */
function trackPanel(el,t){const f=DEV.project,item=TRACK_ITEMS[t],mode=edGet(f,item,P_MODE,[1])??0,alt=!!(mode&DRUM_MODE_BIT),drum=t===0&&alt,pat=STU.pat[t];
 el.style.setProperty("--tc",TRACK_COL[t]);
 const pt=drum?null:edReadPattern(f,item,pat),dp=drum?edReadDrum(f,pat):null,ro=(pt||dp).unreadable>0,len=(pt||dp).len;
 const head=document.createElement("div");head.className="row";
 head.innerHTML=`<span class="seg" role="group" aria-label="Track mode"><button data-m="0" aria-pressed="${!alt}">Sequencer</button><button data-m="1" aria-pressed="${alt}">${t===0?"Drum":"Arpeggiator"}</button></span>
  ${drum?"":`<label>Root <select data-k="root" ${ro?"disabled":""}>${opts(NN.map((n,i)=>[i,n]),pt.root)}</select></label><label>Scale <select data-k="scale" ${ro?"disabled":""}>${opts(SCALE_NAMES,pt.scale)}</select></label>`}
  <label>Length <input type="number" data-k="len" min="1" max="64" value="${len}" ${ro?"disabled":""}> steps</label>`;
 head.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>edit(f=>{const m=edGet(f,item,P_MODE,[1])??0;edSet(f,item,P_MODE,[1],b.dataset.m==="1"?m|DRUM_MODE_BIT:m&~DRUM_MODE_BIT)}));
 head.querySelectorAll("[data-k]").forEach(c=>c.onchange=()=>{const k=c.dataset.k,v=Math.round(+c.value);
  if(k==="len"&&!(v>=1&&v<=64)){c.value=len;return say("Length is 1–64 steps.","bad")}
  edit(f=>{if(drum){const d=edReadDrum(f,pat);d.laneLen=d.laneLen.map(n=>n===d.len?v:n);d.len=v;edWriteDrum(f,pat,d)}else{const p=edReadPattern(f,item,pat);p[k]=v;edWritePattern(f,item,pat,p)}})});
 el.appendChild(head);
 const pats=document.createElement("div");pats.innerHTML=`<p class="cap">Pattern</p><div class="pats">${[...Array(16).keys()].map(i=>`<button data-p="${i+1}" class="${edGet(f,item,P_PATTERN_STATE,[i+1])===3?"has":""}" aria-pressed="${i+1===pat}" aria-label="Pattern ${i+1}">${i+1}</button>`).join("")}</div>`;
 pats.querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{STU.pat[t]=+b.dataset.p;STU.page[t]=0;STU.sel=null;renderPanel()});el.appendChild(pats);
 const tb=document.createElement("div");tb.className="tbar";
 tb.innerHTML=`<button data-a="copy">Copy pattern</button><button data-a="paste" ${STU.clip&&STU.clip.kind===(drum?"drum":"seq")?"":"disabled"}>Paste</button><button data-a="clear">Clear pattern</button><span class="sep"></span>
  ${drum?'<button data-a="s2d">Steps → drums…</button>':'<button data-a="mid">Import / export MIDI…</button><button data-a="bass">Make bass…</button>'}<span class="sep"></span><span class="pages" role="group" aria-label="Steps shown">${[0,1,2,3].map(g=>`<button data-g="${g}" aria-pressed="${g===STU.page[t]}" class="b" ${g*16>=len?'style="opacity:.5"':""}>${g*16+1}–${g*16+16}</button>`).join("")}</span>`;
 tb.querySelectorAll("[data-g]").forEach(b=>{b.className="";b.onclick=()=>{STU.page[t]=+b.dataset.g;renderPanel()}});
 tb.querySelector("[data-a=copy]").onclick=()=>{STU.clip=drum?{kind:"drum",v:deep(edReadDrum(f,pat))}:{kind:"seq",v:deep(edReadPattern(f,item,pat))};say(`Pattern ${pat} copied.`);renderPanel()};
 tb.querySelector("[data-a=paste]").onclick=()=>edit(f=>{if(STU.clip.v.unreadable)throw new Error("The copied pattern had unreadable notes.");drum?edWriteDrum(f,pat,deep(STU.clip.v)):edWritePattern(f,item,pat,deep(STU.clip.v))},`Pasted into pattern ${pat}.`);
 tb.querySelector("[data-a=clear]").onclick=e=>{if(ro)return say("This pattern has notes the recall could not read, so it is read-only.","bad");if(!armed(e.target,"Click again to clear"))return;
  edit(f=>{if(drum){const d=edReadDrum(f,pat);d.hits=[];edWriteDrum(f,pat,d)}else{const p=edReadPattern(f,item,pat);p.steps.forEach(s=>{s.notes=[];s.on=false});edWritePattern(f,item,pat,p)}},`Pattern ${pat} cleared.`)};
 if(drum)tb.querySelector("[data-a=s2d]").onclick=()=>s2dBox(el,pat);else{tb.querySelector("[data-a=mid]").onclick=()=>openTool("midifile");tb.querySelector("[data-a=bass]").onclick=()=>{STU.bass={t,src:t?0:1,pat,style:null,oct:2};renderPanel()}}
 el.appendChild(tb);if(!drum&&STU.bass&&STU.bass.t===t)bassBox(el,t,pat);
 if(t>0&&alt)el.insertAdjacentHTML("beforeend",'<p class="pnote warn">Set to Arpeggiator: this track plays the keys you hold. These steps play when it is set back to Sequencer.</p>');
 if(ro)el.insertAdjacentHTML("beforeend",`<p class="pnote warn">${(pt||dp).unreadable} note slot(s) of this pattern could not be read from the KeyStep, so it is read-only here (editing would lose them).</p>`);
 if(drum)drumGrid(el,pat,dp,ro);else rollGrid(el,t,pat,pt,ro);
 return drum?"drum":t>0&&alt?"arp":"seq"}
function rollGrid(el,t,pat,pt,ro){const item=TRACK_ITEMS[t],s0=STU.page[t]*16,used=pt.steps.flatMap(s=>s.notes.map(n=>n.pitch));
 const lo=Math.min(24,...used),hi=Math.max(108,...used);const sel=STU.sel&&STU.sel.t===t&&STU.sel.pat===pat?STU.sel:null;
 let html=`<div class="rg"><div class="hd k"></div>`;
 for(let s=s0;s<s0+16;s++)html+=`<div class="hd ${pt.steps[s].on?"":"off"}">${s+1}</div>`;
 for(let n=hi;n>=lo;n--){const blk=NN[n%12].includes("#");html+=`<div class="k ${blk?"blk":""}">${n%12===0||n===hi?nm(n):""}</div>`;
  for(let s=s0;s<s0+16;s++){const x=pt.steps[s].notes.find(q=>q.pitch===n);
   html+=`<button class="c${blk?" blk":""}${s%4===3?" beat":""}${x?" on":""}${s>=pt.len?" out":""}${sel&&x&&sel.step===s&&sel.pitch===n?" sel":""}" data-s="${s}" data-n="${n}" aria-label="${nm(n)} step ${s+1}${x?", on":""}"${x?` style="--o:${(.35+x.vel/127*.65).toFixed(2)}"`:""}></button>`}}
 const roll=document.createElement("div");roll.className="roll";roll.innerHTML=html+"</div>";el.appendChild(roll);
 roll.onclick=e=>{const c=e.target.closest(".c");if(!c)return;if(ro)return say("This pattern is read-only here.","bad");const s=+c.dataset.s,n=+c.dataset.n;
  const x=pt.steps[s].notes.find(q=>q.pitch===n);
  if(x&&sel&&sel.step===s&&sel.pitch===n){STU.sel=null;edit(f=>{const p=edReadPattern(f,item,pat);p.steps[s].notes=p.steps[s].notes.filter(q=>q.pitch!==n);if(!p.steps[s].notes.length)p.steps[s].on=false;edWritePattern(f,item,pat,p)})}
  else if(x){STU.sel={t,pat,step:s,pitch:n};renderPanel()}
  else{STU.sel={t,pat,step:s,pitch:n};edit(f=>{const p=edReadPattern(f,item,pat),st=p.steps[s];st.notes.push({pitch:n,gate:p.def.gate??7,vel:p.def.vel??100,shift:p.def.shift??49,rand:p.def.rand??100});st.on=true;if(!st.passes)st.passes=15;edWritePattern(f,item,pat,p)})||(STU.sel=null)}};
 if(STU.scroll[STU.tab]!=null)roll.scrollTop=STU.scroll[STU.tab];
 else{const mid=used.length?Math.round(used.reduce((a,b)=>a+b,0)/used.length):60;roll.scrollTop=Math.max(0,(hi-mid)*18-roll.clientHeight/2)}
 /* the selected note and its step */
 const box=document.createElement("div");const x=sel&&pt.steps[sel.step].notes.find(q=>q.pitch===sel.pitch);
 if(!x){box.innerHTML='<p class="pnote">Click a cell to add a note; click a note to edit it, click it again to remove it.</p>';el.appendChild(box);return}
 const st=pt.steps[sel.step];
 box.innerHTML=`<p class="cap">Step ${sel.step+1}, note ${nm(x.pitch)}</p><div class="insp">
  <label class="fld"><span class="l">Note</span><input type="text" data-k="pitch" value="${nm(x.pitch)}" size="4"></label>
  <label class="fld"><span class="l">Velocity <b>${x.vel}</b></span><input type="range" data-k="vel" min="1" max="127" value="${x.vel}"></label>
  <label class="fld"><span class="l">Gate</span><select data-k="gate">${[...Array(128).keys()].map(g=>`<option value="${g}" ${g===x.gate?"selected":""}>${gateText(g)}</option>`).join("")}</select></label>
  <label class="fld"><span class="l">Time shift (% of a step)</span><input type="number" data-k="shift" min="-49" max="50" value="${x.shift-49}"></label>
  <label class="fld"><span class="l">Randomness %</span><input type="number" data-k="rand" min="0" max="100" value="${x.rand}"></label>
  <div class="fld"><span class="l">Step ${sel.step+1}</span><label><input type="checkbox" data-k="on" ${st.on?"checked":""}> on</label> <span class="l">plays on pass</span>${[0,1,2,3].map(k=>`<label><input type="checkbox" data-pass="${k}" ${st.passes&1<<k?"checked":""}>${k+1}</label>`).join(" ")}</div>
 </div><div class="row" style="margin-top:6px"><button class="b" data-k="del">Remove note</button></div>`;
 const up=fn=>edit(f=>{const p=edReadPattern(f,item,pat),s=p.steps[sel.step],q=s.notes.find(q=>q.pitch===sel.pitch);fn(p,s,q);edWritePattern(f,item,pat,p)});
 box.querySelectorAll("[data-k]").forEach(c=>{const k=c.dataset.k;
  if(k==="del")c.onclick=()=>{STU.sel=null;up((p,s)=>{s.notes=s.notes.filter(q=>q.pitch!==sel.pitch);if(!s.notes.length)s.on=false})};
  else if(k==="vel")c.oninput=()=>{c.previousElementSibling.querySelector("b").textContent=c.value};
  if(k!=="del")c.onchange=()=>{if(k==="pitch"){const v=parseNote(c.value);if(v==null){c.value=nm(x.pitch);return say("Notes are like C4, F#3, Bb2.","bad")}if(st.notes.some(q=>q.pitch===v&&q!==x))return say("That note is already on this step.","bad");up((p,s,q)=>q.pitch=v);STU.sel.pitch=v;renderPanel();return}
   if(k==="on")return up((p,s)=>s.on=c.checked);
   const lim={vel:[1,127],gate:[0,127],shift:[-49,50],rand:[0,100]}[k],v=Math.round(+c.value);if(!(v>=lim[0]&&v<=lim[1]))return say(`${lim[0]} to ${lim[1]}.`,"bad");
   up((p,s,q)=>q[k]=k==="shift"?v+49:v)}});
 box.querySelectorAll("[data-pass]").forEach(c=>c.onchange=()=>up((p,s)=>{const b=1<<+c.dataset.pass;s.passes=c.checked?s.passes|b:s.passes&~b}));
 el.appendChild(box)}
function drumGrid(el,pat,dp,ro){const notes=(DEV.drumMap||{notes:drumMapNotes(GDEF)}).notes,s0=STU.page[0]*16,maxUsed=Math.max(-1,...dp.hits.map(h=>h.lane));
 const n=STU.showAll?DRUM_LANES:Math.max(12,maxUsed+1),sel=STU.sel&&STU.sel.drum&&STU.sel.pat===pat?STU.sel:null;
 let html=`<div class="hd"></div>`;for(let s=s0;s<s0+16;s++)html+=`<div class="hd">${s+1}</div>`;
 for(let l=0;l<n;l++){html+=`<div class="ln">${l+1} <i>${noteName(notes[l])}</i></div>`;
  for(let s=s0;s<s0+16;s++){const h=dp.hits.find(x=>x.lane===l&&x.step===s);
   html+=`<button class="p${Math.floor(s/4)%2?" q":""}${h?" on":""}${s>=dp.len?" out":""}${sel&&h&&sel.lane===l&&sel.step===s?" sel":""}" data-l="${l}" data-s="${s}" aria-label="Lane ${l+1} step ${s+1}${h?", hit":""}"${h?` style="--o:${(.4+h.vel/127*.6).toFixed(2)}"`:""}></button>`}}
 const g=document.createElement("div");g.className="drum";g.innerHTML=html;el.appendChild(g);
 el.insertAdjacentHTML("beforeend",`<p class="pnote">${n} of 24 lanes shown · <a href="#" data-a="all">${STU.showAll?"show fewer":"show all 24"}</a> · lane notes: ${DEV.drumMap?esc(DEV.drumMap.src):"the KeyStep's default map"} <a href="#" data-a="map">read the map from the KeyStep</a></p>`);
 el.querySelector("[data-a=all]").onclick=e=>{e.preventDefault();STU.showAll=!STU.showAll;renderPanel()};
 el.querySelector("[data-a=map]").onclick=e=>{e.preventDefault();readDrumMap()};
 g.onclick=e=>{const c=e.target.closest(".p");if(!c)return;if(ro)return say("This pattern is read-only here.","bad");const l=+c.dataset.l,s=+c.dataset.s,h=dp.hits.find(x=>x.lane===l&&x.step===s);
  if(h&&sel&&sel.lane===l&&sel.step===s){STU.sel=null;edit(f=>{const d=edReadDrum(f,pat);d.hits=d.hits.filter(x=>!(x.lane===l&&x.step===s));edWriteDrum(f,pat,d)})}
  else if(h){STU.sel={drum:true,pat,lane:l,step:s};renderPanel()}
  else{STU.sel={drum:true,pat,lane:l,step:s};edit(f=>{const d=edReadDrum(f,pat);d.hits.push({lane:l,step:s,gate:7,vel:100,shift:49,rand:100,pass:15});edWriteDrum(f,pat,d)})||(STU.sel=null)}};
 const h=sel&&dp.hits.find(x=>x.lane===sel.lane&&x.step===sel.step),box=document.createElement("div");
 if(!h){box.innerHTML='<p class="pnote">Click to place a hit; click a hit to edit it, click it again to remove it.</p>';el.appendChild(box);return}
 box.innerHTML=`<p class="cap">Lane ${h.lane+1} (${noteName(notes[h.lane])}), step ${h.step+1}</p><div class="insp">
  <label class="fld"><span class="l">Velocity <b>${h.vel}</b></span><input type="range" data-k="vel" min="1" max="127" value="${h.vel}"></label>
  <label class="fld"><span class="l">Gate</span><select data-k="gate">${[...Array(128).keys()].map(g=>`<option value="${g}" ${g===h.gate?"selected":""}>${gateText(g)}</option>`).join("")}</select></label>
  <label class="fld"><span class="l">Time shift (% of a step)</span><input type="number" data-k="shift" min="-49" max="50" value="${h.shift-49}"></label>
  <label class="fld"><span class="l">Randomness %</span><input type="number" data-k="rand" min="0" max="100" value="${h.rand}"></label>
 </div><div class="row" style="margin-top:6px"><button class="b" data-k="del">Remove hit</button></div>`;
 const up=fn=>edit(f=>{const d=edReadDrum(f,pat),x=d.hits.find(x=>x.lane===sel.lane&&x.step===sel.step);fn(d,x);edWriteDrum(f,pat,d)});
 box.querySelectorAll("[data-k]").forEach(c=>{const k=c.dataset.k;
  if(k==="del"){c.onclick=()=>{STU.sel=null;up(d=>d.hits=d.hits.filter(x=>!(x.lane===sel.lane&&x.step===sel.step)))};return}
  if(k==="vel")c.oninput=()=>{c.previousElementSibling.querySelector("b").textContent=c.value};
  c.onchange=()=>{const lim={vel:[1,127],gate:[0,127],shift:[-49,50],rand:[0,100]}[k],v=Math.round(+c.value);if(!(v>=lim[0]&&v<=lim[1]))return say(`${lim[0]} to ${lim[1]}.`,"bad");up((d,x)=>x[k]=k==="shift"?v+49:v)}});
 el.appendChild(box)}
async function readDrumMap(){if(!DEV.link){openConn();return say("Connect to the KeyStep first, or keep the default map.","bad")}
 await busy(async()=>{const gl={};for(const id of [81,82,...Array.from({length:24},(_,l)=>83+l)]){const v=await DEV.link.getGlobal(id);if(v==null)throw new Error(`no reply reading drum map setting ${id}`);gl[id]=v}
  DEV.drumMap={notes:drumMapNotes(gl),src:gl[81]?"Custom map (from the KeyStep)":"Chromatic map (from the KeyStep)"};devLog("drum map read from the KeyStep","ok")});renderPanel()}
/* steps -> drums: a track's pattern onto the drum lanes of the pattern on screen */
function s2dBox(el,pat){if(el.querySelector(".s2d"))return;const b=document.createElement("div");b.className="fld s2d";
 b.innerHTML=`<p class="cap">Steps → drums, into drum pattern ${pat}</p><div class="row"><label>From track <select data-a="t">${[1,2,3,4].map(t=>`<option value="${t}" ${t===2?"selected":""}>${t}</option>`).join("")}</select></label>
  <label>pattern <select data-a="p">${[...Array(16).keys()].map(i=>`<option value="${i+1}">${i+1}</option>`).join("")}</select></label>
  <label><input type="checkbox" data-a="fold"> move other notes by octaves onto the map</label><button class="b" data-a="go">Turn into drums</button><button class="b" data-a="x">Cancel</button></div>
  <p class="pnote">Each note lands on the lane that plays it (the drum map); track 1 is set to Drum mode. The pattern's hits are replaced.</p>`;
 el.querySelector(".tbar").after(b);const q=a=>b.querySelector(`[data-a=${a}]`);q("x").onclick=()=>b.remove();
 q("go").onclick=()=>{const m=(DEV.drumMap||{notes:drumMapNotes(GDEF)}).notes;let res=null;
  const ok=edit(f=>{const src=edReadPattern(f,TRACK_ITEMS[+q("t").value-1],+q("p").value);if(src.unreadable)throw new Error("That pattern has notes the recall could not read.");
   res=stepsToDrum(src,m,q("fold").checked);if(!res.dp.hits.length)throw new Error(`No note of that pattern is on the drum map (${noteName(m[0])}–${noteName(m[23])}). Tick “move other notes by octaves” or pick another pattern.`);
   edWriteDrum(f,pat,res.dp);edSetDrumMode(f,true)});
  if(ok){const miss=[...res.missed].map(([p,n])=>`${noteName(p)}×${n}`).join(" ");say(`${res.dp.hits.length} hits on drum pattern ${pat}; track 1 is in Drum mode.${miss?` Not on the map, left out: ${miss}.`:""}${res.doubled?` ${res.doubled} note(s) landed on a lane that already had a hit there.`:""}`);emit("editor:drums")}}}

/* make bass: a recorded part of another track becomes a bass line in the pattern on screen; the box stays open, so picking
   another style (or source, or octave) writes the pattern again and Undo steps back through them */
function bassBox(el,t,pat){const B=STU.bass,item=TRACK_ITEMS[t],b=document.createElement("div");b.className="fld bass";
 b.innerHTML=`<p class="cap">Make bass, into pattern ${pat} of track ${t+1}</p><div class="row"><label>From track <select data-a="t">${[0,1,2,3].filter(x=>x!==t).map(x=>`<option value="${x}" ${x===B.src?"selected":""}>${x+1}</option>`).join("")}</select></label>
  <label>pattern <select data-a="p">${[...Array(16).keys()].map(i=>`<option value="${i+1}" ${i+1===(B.srcPat??pat)?"selected":""}>${i+1}</option>`).join("")}</select></label>
  <label>Octave <select data-a="o">${[1,2,3].map(o=>`<option value="${o}" ${o===B.oct?"selected":""}>C${o}–B${o}</option>`).join("")}</select></label><button class="b" data-a="x">Close</button></div>
  <div class="row"><span class="seg" role="group" aria-label="Bass style">${BASS_STYLES.map(([k,n])=>`<button data-st="${k}" aria-pressed="${k===B.style}">${esc(n)}</button>`).join("")}</span></div>
  <p class="pnote">Pick a style to write it; pick another to switch. Each chord's root comes from its notes (lowest note on close calls). The pattern's notes, length, root and scale are replaced; Undo goes back one style at a time.</p>`;
 el.querySelector(".tbar").after(b);const q=a=>b.querySelector(`[data-a=${a}]`);if(!STU.bass.srcPat)B.srcPat=pat;
 q("x").onclick=()=>{STU.bass=null;renderPanel()};
 const go=()=>{if(!B.style)return renderPanel();let n=0;el.querySelector(".roll")?.remove();STU.scroll[STU.tab]=null;// show the new notes, not the old scroll position
 
  const ok=edit(f=>{const sp=edReadPattern(f,TRACK_ITEMS[B.src],B.srcPat);if(sp.unreadable)throw new Error("That pattern has notes the recall could not read.");
   const bs=makeBass(sp,B.style,B.oct),tp=edReadPattern(f,item,pat);if(tp.unreadable)throw new Error("This pattern has notes the recall could not read, so it is read-only.");
   Object.assign(tp,{len:bs.len,root:bs.root,scale:bs.scale,steps:bs.steps});n=bs.notes;edWritePattern(f,item,pat,tp)});
  if(ok){const alt=(edGet(DEV.project,item,P_MODE,[1])??0)&DRUM_MODE_BIT;say(`${BASS_STYLES.find(x=>x[0]===B.style)[1]}: ${n} bass notes from track ${B.src+1} pattern ${B.srcPat}.${alt?" This track is set to Arpeggiator; set it to Sequencer to hear them.":""}`);emit("editor:bass")}};
 q("t").onchange=()=>{B.src=+q("t").value;go()};q("p").onchange=()=>{B.srcPat=+q("p").value;go()};q("o").onchange=()=>{B.oct=+q("o").value;go()};
 b.querySelectorAll("[data-st]").forEach(x=>x.onclick=()=>{B.style=x.dataset.st;go()})}

/* ---------- scenes ---------- */
function scenesPanel(el){const f=DEV.project,t=document.createElement("table");t.className="t";
 t.innerHTML=`<thead><tr><th>Scene</th><th>Used</th>${[1,2,3,4].map(i=>`<th><span class="chips"><span style="background:${TRACK_COL[i-1]}">${i}</span></span></th>`).join("")}<th>Ctrl</th><th>Muted</th><th>Chains</th></tr></thead>`;
 const tb=document.createElement("tbody");t.appendChild(tb);
 for(let sc=1;sc<=16;sc++){const s=edReadScene(f,sc),tr=tb.insertRow();tr.insertCell().textContent=String(sc);
  const save=fn=>edit(f=>{const x=edReadScene(f,sc);fn(x);edWriteScene(f,sc,x)});
  const used=document.createElement("input");used.type="checkbox";used.checked=s.valid;used.setAttribute("aria-label",`Scene ${sc} in use`);used.onchange=()=>save(x=>x.valid=used.checked);tr.insertCell().append(used);
  s.pats.forEach((p,ti)=>{const sel=document.createElement("select");sel.setAttribute("aria-label",`Scene ${sc} ${ti<4?"track "+(ti+1):"control track"} pattern`);for(let i=0;i<16;i++)sel.add(new Option(String(i+1),i));sel.value=p;
   sel.onchange=()=>save(x=>{x.pats[ti]=+sel.value;x.valid=true});tr.insertCell().append(sel)});
  const mu=tr.insertCell();for(let ti=0;ti<4;ti++){const l=document.createElement("label"),c=document.createElement("input");c.type="checkbox";c.checked=!!(s.mute&1<<ti);
   c.onchange=()=>save(x=>{x.mute=c.checked?x.mute|1<<ti:x.mute&~(1<<ti);x.valid=true});l.append(c,String(ti+1));mu.append(l," ")}
  const ch=document.createElement("input");ch.type="text";ch.style.width="12em";ch.placeholder="e.g. 1:1 2 3  2:4";ch.setAttribute("aria-label",`Scene ${sc} chains`);
  ch.value=s.chains.map((c,ti)=>c.length?`${ti+1}:${c.map(x=>x+1).join(" ")}`:"").filter(Boolean).join("  ");
  ch.onchange=()=>{const chains=[[],[],[],[],[]];let cur=-1;for(const tok of ch.value.trim().split(/\s+/).filter(Boolean)){const m=tok.match(/^([1-5]):(\d+)?$/);
    if(m){cur=+m[1]-1;if(m[2])chains[cur].push(+m[2]-1)}else if(/^\d+$/.test(tok)&&cur>=0)chains[cur].push(+tok-1);else return say(`Chains look like 1:1 2 3 2:4; “${tok}” is not understood.`,"bad")}
   save(x=>{x.chains=chains;x.chainOn=chains.some(c=>c.length);x.valid=true})};tr.insertCell().append(ch)}
 el.appendChild(t)}

/* ---------- project settings ---------- */
function chordOf(f,item){const c=[...Array(16).keys()].map(i=>edGet(f,item,P_CHORD,[i+1]));if(c[0]==null&&c.slice(1).some(x=>x!=null))return {bad:true};
 if(c[0]==null||c[0]===0x7F)return {notes:[]};const offs=[];for(const o of c.slice(1)){if(o===0||o===0x7F)break;if(o==null)return {bad:true};offs.push(o)}return {notes:[c[0],...offs.map(o=>c[0]+o)]}}
const userMask=(f,ps)=>((edGet(f,PROJECT_ITEM,ps[0],[1])??0)|(edGet(f,PROJECT_ITEM,ps[1],[1])??0)<<7)&0xFFF;
function projectPanel(el){const f=DEV.project;const tempo=mfGetTempo(f);
 el.insertAdjacentHTML("beforeend",`<div class="row"><label>Tempo <input type="number" data-a="tempo" min="30" max="240" step="0.01" value="${+tempo.toFixed(2)}"> BPM</label>
  <label>Name <input type="text" data-a="name" maxlength="16" value="${esc(f.name||"")}" placeholder="16 characters"></label><button class="b" data-a="nameonly" data-dev title="Rename the selected slot on the KeyStep without storing the project (needs the project-names firmware)">Send the name only to slot ${STU.slot}</button></div>`);
 const tIn=el.querySelector("[data-a=tempo]"),nIn=el.querySelector("[data-a=name]");
 tIn.onchange=()=>{const v=+tIn.value;if(!(v>=30&&v<=240)){tIn.value=+tempo.toFixed(2);return say("Tempo is 30–240 BPM.","bad")}edit(f=>mfSetTempo(f,v))};
 nIn.onchange=()=>{const n=nIn.value.trim();try{if(n)displayName(n)}catch(err){return say(err.message,"bad")}edit(f=>f.name=n||null)};
 el.querySelector("[data-a=nameonly]").onclick=()=>{const n=(f.name||"").trim();if(!n)return say("Type a name first.","bad");if(!DEV.link){openConn();return say("Connect to the KeyStep first.","bad")}
  busy(async()=>{const s=displayName(n);await DEV.link.setName(STU.slot,s);slotNameSet(STU.slot,s);devLog(`slot ${STU.slot} named “${s}” (needs the project-names firmware)`,"ok");drawSlots()})};
 /* chords for Chord mode, per track */
 const ct=document.createElement("div");ct.innerHTML=`<p class="cap">Track chords (Chord mode)</p>`;const t=document.createElement("table");t.className="t";
 t.innerHTML="<thead><tr><th>Track</th><th>Chord notes (first = root)</th><th>Chord mode</th></tr></thead>";const tb=document.createElement("tbody");t.appendChild(tb);
 TRACK_ITEMS.forEach((item,ti)=>{const c=chordOf(f,item),md=edGet(f,item,P_MODE,[1])??0,tr=tb.insertRow();
  tr.insertCell().innerHTML=`<span class="chips"><span style="background:${TRACK_COL[ti]}">${ti+1}</span></span>`;
  const inp=document.createElement("input");inp.type="text";inp.style.width="14em";inp.setAttribute("aria-label",`Track ${ti+1} chord`);inp.placeholder="e.g. C4 E4 G4";
  if(c.bad){inp.value="(a note below its root)";inp.disabled=true}else inp.value=c.notes.map(nm).join(" ");
  inp.onchange=()=>{const toks=inp.value.trim().split(/[\s,]+/).filter(Boolean),ps=toks.map(parseNote);if(ps.includes(null))return say("Notes are like C4, F#3, Bb2.","bad");
   edit(f=>{const bytes=ps.length?chordBytes(ps):[0x7F,...Array(15).fill(0)];bytes.forEach((v,i)=>edSet(f,item,P_CHORD,[i+1],v))})};
  tr.insertCell().append(inp);const cb=document.createElement("input");cb.type="checkbox";cb.checked=!!(md&CHORD_MODE_BIT);cb.setAttribute("aria-label",`Track ${ti+1} chord mode`);
  cb.onchange=()=>edit(f=>{const m=edGet(f,item,P_MODE,[1])??0;edSet(f,item,P_MODE,[1],cb.checked?m|CHORD_MODE_BIT:m&~CHORD_MODE_BIT)});const l=document.createElement("label");l.append(cb," on");tr.insertCell().append(l)});
 ct.appendChild(t);ct.insertAdjacentHTML("beforeend",'<p class="pnote">Notes above the root only: SysEx cannot carry a chord note below its root.</p>');el.appendChild(ct);
 /* user scales 1 and 2: twelve notes from C, C always on */
 const us=document.createElement("div");us.innerHTML='<p class="cap">User scales</p>';
 [["User 1",P_USER1],["User 2",USER2]].forEach(([n,ps])=>{const m=userMask(f,ps),row=document.createElement("div");row.className="row";row.style.marginBottom="6px";
  row.innerHTML=`<span style="width:4.5em;color:var(--muted);font-size:13px">${n}</span><span class="us" role="group" aria-label="${n} notes">${NN.map((x,i)=>`<button data-i="${i}" aria-pressed="${!!(m&1<<i)}" ${i?"":"disabled title=\"The root is always in the scale\""}>${x}</button>`).join("")}</span>`;
  row.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>edit(f=>{const cur=userMask(f,ps)|1,nv=cur^1<<+b.dataset.i;edSet(f,PROJECT_ITEM,ps[0],[1],nv&127);edSet(f,PROJECT_ITEM,ps[1],[1],nv>>7);edSet(f,PROJECT_ITEM,ps[2],[1],0)}));us.appendChild(row)});
 el.appendChild(us);
 el.insertAdjacentHTML("beforeend",'<p class="pnote">Step-pad chords (the pads firmware) are saved on the KeyStep with Save Project; SysEx cannot read them, so they are not part of this file.</p>')}

/* ---------- control track ---------- */
function controlPanel(el){const f=DEV.project,pat=STU.pat[4],s0=STU.page[4]*16,g=(p,path)=>edGet(f,CTRL_ITEM,p,path);
 el.style.setProperty("--tc",TRACK_COL[4]);const len=(g(CT_P.len,[pat])??15)+1;
 el.insertAdjacentHTML("beforeend",`<p class="pnote warn">Layout from MCC's recall plan, not yet checked on a KeyStep: try it on a test slot first.</p>
  <div><p class="cap">Pattern</p><div class="pats">${[...Array(16).keys()].map(i=>`<button data-p="${i+1}" class="${g(CT_P.state,[i+1])===3?"has":""}" aria-pressed="${i+1===pat}" aria-label="Control pattern ${i+1}">${i+1}</button>`).join("")}</div></div>
  <div class="tbar"><label>Length <input type="number" data-a="len" min="1" max="64" value="${len}"> steps</label><span class="sep"></span><span class="pages">${[0,1,2,3].map(p=>`<button data-g="${p}" aria-pressed="${p===STU.page[4]}">${p*16+1}–${p*16+16}</button>`).join("")}</span></div>`);
 el.querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{STU.pat[4]=+b.dataset.p;STU.page[4]=0;renderPanel()});
 el.querySelectorAll("[data-g]").forEach(b=>b.onclick=()=>{STU.page[4]=+b.dataset.g;renderPanel()});
 const lIn=el.querySelector("[data-a=len]");lIn.onchange=()=>{const v=Math.round(+lIn.value);if(!(v>=1&&v<=64)){lIn.value=len;return say("Length is 1–64 steps.","bad")}edit(f=>{edSet(f,CTRL_ITEM,CT_P.len,[pat],v-1);edSet(f,CTRL_ITEM,CT_P.state,[pat],3)})};
 const grid=document.createElement("div");grid.className="cgrid";let html="";
 CT_P.knob.forEach((p,k)=>{const cc=g(p,[pat]);html+=`<div class="ln">${KNOB_NAMES[k]} <label>CC <input type="number" data-cc="${k}" min="0" max="127" value="${cc??0}" style="width:4em"></label></div>`;
  for(let s=s0;s<s0+16;s++){const v=g(p,[pat,s+1])??0,on=g(CT_P.on,[pat,s+1]);html+=`<button class="cb${on?"":" off"}${s>=len?" off":""}" data-k="${k}" data-s="${s}" title="${KNOB_NAMES[k]}, step ${s+1}: ${v}" aria-label="${KNOB_NAMES[k]} step ${s+1} value ${v}"><i style="height:${Math.round(v/127*42)}px"></i></button>`}});
 html+=`<div class="ln">Step on</div>`;for(let s=s0;s<s0+16;s++)html+=`<button class="st${g(CT_P.on,[pat,s+1])?" on":""}" data-on="${s}" aria-label="Step ${s+1} on">${s+1}</button>`;
 grid.innerHTML=html;el.appendChild(grid);
 grid.querySelectorAll("[data-cc]").forEach(c=>c.onchange=()=>{const v=Math.round(+c.value);if(!(v>=0&&v<=127))return say("CC numbers are 0–127.","bad");edit(f=>{edSet(f,CTRL_ITEM,CT_P.knob[+c.dataset.cc],[pat],v);edSet(f,CTRL_ITEM,CT_P.state,[pat],3)})});
 grid.querySelectorAll("[data-on]").forEach(b=>b.onclick=()=>edit(f=>{const s=+b.dataset.on+1;edSet(f,CTRL_ITEM,CT_P.on,[pat,s],g(CT_P.on,[pat,s])?0:1);edSet(f,CTRL_ITEM,CT_P.state,[pat],3)}));
 /* drag across the bars of a knob; one undo step per drag */
 const valAt=(b,y)=>{const r=b.getBoundingClientRect();return clamp(Math.round((1-(y-r.top)/r.height)*127),0,127)};
 grid.onpointerdown=e=>{const b=e.target.closest(".cb");if(!b)return;e.preventDefault();const k=+b.dataset.k;STU.drag={k,vals:new Map()};grid.setPointerCapture(e.pointerId);move(e)};
 const move=e=>{if(!STU.drag)return;const b=document.elementFromPoint(e.clientX,e.clientY);const bar=b&&b.closest&&b.closest(".cb");if(!bar||+bar.dataset.k!==STU.drag.k)return;
  const v=valAt(bar,e.clientY);STU.drag.vals.set(+bar.dataset.s,v);bar.firstChild.style.height=Math.round(v/127*42)+"px";bar.title=`${KNOB_NAMES[STU.drag.k]}, step ${+bar.dataset.s+1}: ${v}`};
 grid.onpointermove=move;
 grid.onpointerup=grid.onpointercancel=()=>{const d=STU.drag;STU.drag=null;if(!d||!d.vals.size)return;edit(f=>{for(const [s,v] of d.vals)edSet(f,CTRL_ITEM,CT_P.knob[d.k],[pat,s+1],v);edSet(f,CTRL_ITEM,CT_P.state,[pat],3)})}}

/* ---------- tools in a dialog: MIDI files, backup and restore, set list ---------- */
const DIALOG_TOOLS=["midifile","backup","setlist"];
function openTool(id){const host=$("#toolHost");
 for(const tid of DIALOG_TOOLS)if(!$("#feat-"+tid)){const f=FEATURES.find(x=>x.id===tid),box=document.createElement("div");box.className="feat";box.id="feat-"+tid;box.hidden=true;host.appendChild(box);f.render(box)}
 const f=FEATURES.find(x=>x.id===id);host.querySelectorAll(":scope > .feat").forEach(b=>b.hidden=b.id!=="feat-"+id);
 $("#toolDlgT").textContent=FEATURE_SHORT[id];$("#toolDlgLine").textContent=FEATURE_LINE[id]||"";
 const ab=$("#toolDlgAbout");ab.innerHTML="";const p=document.createElement("p");p.innerHTML=f.about;const m=document.createElement("p");m.textContent="Verified: "+f.verified+(f.needs?" Needs "+f.needs:"");ab.append(p,m);
 if(id==="midifile"&&DEV.midiLoad)DEV.midiLoad();$("#toolDlg").hidden=false;$("#toolDlgX").focus();emit("tool:"+id)}
function closeTool(){$("#toolDlg").hidden=true;if(STU.built)renderWork()}

/* ---------- build once ---------- */
function stuBuild(){if(STU.built)return;STU.built=true;
 try{const t=+localStorage.getItem("ksp.ptab");if(t>=0&&t<PTABS.length)STU.tab=t}catch(e){}
 drawSlots();drawLib();renderWork();
 $("#recallBtn").onclick=e=>recall(e.target);$("#emRecall").onclick=()=>recall($("#recallBtn"));
 $("#storeBtn").onclick=e=>store(e.target);$("#storeBtn2").onclick=e=>store(e.target);
 $("#openFile").onchange=$("#emOpen").onchange=openFileInput;$("#newBtn").onclick=$("#emNew").onclick=newBlankProject;
 $("#saveFileBtn").onclick=()=>{const f=DEV.project;if(!f)return;try{const n=$("#workName").value.trim();f.name=n?displayName(n):null;
  saveJSON(f,`KeyStep Pro P${STU.slot} ${fileSafe(f.name||"")} ${new Date().toISOString().slice(0,10)}.json`.replace(/\s+/g," "));devLog("saved the project as a file","ok")}catch(e){devLog("Error: "+e.message,"bad")}};
 $("#libSaveBtn").onclick=async()=>{const f=DEV.project;if(!f)return;try{const n=$("#workName").value.trim()||`P${STU.slot} (${new Date().toISOString().slice(0,10)})`;
  const id=await libAdd(JSON.parse(JSON.stringify(f)),n,STU.src);STU.libSel=id;devLog(`saved “${n}” to the library`,"ok");emit("lib:add");drawLib()}catch(e){devLog("Error: "+e.message,"bad")}};
 $("#workName").oninput=e=>{if(!DEV.project)return;DEV.project.name=e.target.value.trim()||null;STU.changed=true;$("#workChg").hidden=false};
 $("#undoBtn").onclick=undo;$("#redoBtn").onclick=redo;
 $("#libSearch").oninput=drawLib;
 $("#libImp").onchange=async e=>{let n=0;for(const file of e.target.files){try{n+=await libImport(JSON.parse(await file.text()),file.name)}catch(err){devLog(`${file.name}: ${err.message}`,"bad")}}e.target.value="";if(n)devLog(`added ${n} project(s) to the library`,"ok");drawLib()};
 $("#libAct").querySelectorAll("[data-l]").forEach(b=>b.onclick=()=>libAction(b.dataset.l,b).catch(e=>devLog("Error: "+e.message,"bad")));
 document.querySelectorAll("#vProj [data-tool]").forEach(b=>b.onclick=()=>openTool(b.dataset.tool));
 $("#toolDlgX").onclick=closeTool;$("#toolDlg").onclick=e=>{if(e.target===$("#toolDlg"))closeTool()};
 addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#toolDlg").hidden){closeTool();return}
  if(STU.mode!=="proj"||(e.target.closest&&e.target.closest("input,select,textarea"))||!(e.ctrlKey||e.metaKey)||e.key.toLowerCase()!=="z")return;e.preventDefault();e.shiftKey?redo():undo()});
 DEV.libDraw=drawLib}

/* ================= Device settings: the global settings in MCC's groups, and firmware ================= */
const SET={built:false,hidden:true};
function setBuild(){const w=$("#setWrap");if(!SET.built){SET.built=true;
  w.innerHTML=`<div class="card"><h2>KeyStep settings <span style="flex:1"></span><button class="sm" data-a="read">Read from the KeyStep</button></h2>
   <p class="pg">Each change is written to the KeyStep straight away and read back. Settings marked <b style="color:var(--accent)">*</b> are ones MCC does not show.</p>
   <label class="pg"><input type="checkbox" data-a="hid" checked> show the settings MCC hides</label><p class="pg" data-a="msg" aria-live="polite"></p><div class="ggrid" data-a="grid"></div></div>
   <div class="card" id="fwCard"></div>
   <div class="card"><h2>MIDI monitor <span style="flex:1"></span><button class="sm2" data-a="mon">Start</button> <button class="sm2" data-a="monclr">Clear</button></h2>
    <p class="pg">What the KeyStep sends over USB while you play or the sequencer runs: notes, CCs, pitch bend, program changes (clock is left out). Needs a real KeyStep connection.</p><div class="mon" data-a="monlog" aria-live="off"></div></div>`;
  const ml=w.querySelector("[data-a=monlog]"),mb=w.querySelector("[data-a=mon]");
  w.querySelector("[data-a=monclr]").onclick=()=>{ml.textContent=""};
  mb.onclick=()=>{if(DEV.mon){DEV.mon=null;mb.textContent="Start";return}DEV.mon=d=>monLine(ml,d);mb.textContent="Stop";if(!DEV.link||DEV.link.sim)monLine(ml,null)};
  w.querySelector("[data-a=read]").onclick=()=>busy(async()=>{let n=0;await quietly(DEV.link,async()=>{for(const g of GLOBALS){DEV.gvals[g.id]=await DEV.link.getGlobal(g.id);if(DEV.gvals[g.id]!=null)n++}});setMsg(`Read ${n} settings.`);emit("dev:read");setDraw()});
  w.querySelector("[data-a=hid]").onchange=e=>{SET.hidden=e.target.checked;setDraw()};DEV.globalsDraw=setDraw}
 setDraw();fwDraw()}
/* one line per message: time, channel, what */
function monLine(ml,d){const t=new Date().toISOString().slice(11,23);let s;
 if(!d)s="(not connected to a real KeyStep: connect first; the simulation sends nothing here)";
 else{const st=d[0]&0xF0,ch=(d[0]&15)+1;s=st===0x90&&d[2]?`ch ${ch}  note on   ${nm(d[1])} (${d[1]}) vel ${d[2]}`:st===0x80||st===0x90?`ch ${ch}  note off  ${nm(d[1])} (${d[1]})`:st===0xB0?`ch ${ch}  CC ${d[1]} = ${d[2]}`:st===0xC0?`ch ${ch}  program ${d[1]+1}`:st===0xE0?`ch ${ch}  pitch bend ${(d[1]|d[2]<<7)-8192}`:st===0xD0?`ch ${ch}  pressure ${d[1]}`:st===0xA0?`ch ${ch}  poly pressure ${nm(d[1])} ${d[2]}`:hex(d)}
 const atEnd=ml.scrollTop+ml.clientHeight>=ml.scrollHeight-4;ml.textContent+=`${t}  ${s}\n`;const lines=ml.textContent.split("\n");if(lines.length>400)ml.textContent=lines.slice(-400).join("\n");if(atEnd)ml.scrollTop=ml.scrollHeight}
function setMsg(s,bad){const m=$("#setWrap [data-a=msg]");if(m){m.textContent=s;m.style.color=bad?"var(--warn)":""}}
function setDraw(){const grid=$("#setWrap [data-a=grid]");if(!grid)return;grid.innerHTML="";const groups=[];
 for(const g of GLOBALS){if(g.hidden&&!SET.hidden)continue;let gr=groups.find(x=>x.n===g.g);if(!gr)groups.push(gr={n:g.g,items:[]});gr.items.push(g)}
 for(const gr of groups){const card=document.createElement("div");card.className="fld";card.innerHTML=`<span class="l">${esc(gr.n==="Not in MCC (firmware 2.5)"?"Not in MCC":gr.n)}</span>`;
  for(const g of gr.items){const v=DEV.gvals[g.id],r=document.createElement("div");r.className="r"+(g.hidden?" hid":"");
   r.innerHTML=`<span>${esc(g.n)}</span><select aria-label="${esc(g.g+": "+g.n)}" ${v==null?"disabled":""}>${v==null?"<option>–</option>":optsOf({id:g.id}).map(o=>`<option value="${o[0]}" ${o[0]===v?"selected":""}>${esc(o[1])}</option>`).join("")}</select>`;
   r.querySelector("select").onchange=async e=>{const nv=+e.target.value;await busy(async()=>{await DEV.link.setGlobal(g.id,nv);const rb=await DEV.link.getGlobal(g.id);DEV.gvals[g.id]=rb;
     const okv=rb===nv;setMsg(`${g.g}: ${g.n} ${okv?"set":"reads "+rb+", expected "+nv}.`,!okv);devLog(`global ${g.id} ${g.n} = ${rb}${okv?"":" (expected "+nv+")"}`,okv?"ok":"bad")});setDraw()};
   card.appendChild(r)}grid.appendChild(card)}
 if(!Object.keys(DEV.gvals).length)setMsg(DEV.link?"Use Read from the KeyStep to fill in the values.":"Connect to the KeyStep (the pill at the top) to see and change its settings.")}
function fwDraw(){fwBarDraw();const c=$("#fwCard");if(!c)return;
 const what=!DEV.fw?"":fwPatched()?` — KSCON build ${DEV.fwBuild} (KeyStep Con: project names, step pads, root chords, Make bass, startup screen), based on 2.5.20`:DEV.fw==="2.5.20"?" — Arturia's stock firmware, or a patched build made before the version change":"";
 c.innerHTML=`<h2>Firmware</h2><p>Running: <b>${DEV.fw?esc(DEV.fw):"not connected"}</b>${esc(what)}${DEV.link&&DEV.link.sim?" (simulation)":""}.</p><p class="pg">KSCON builds report <b>2.5.99</b> so they are not mistaken for Arturia's 2.5.20; the KeyStep's Utility &gt; FW version page says "KSCON 2.5.99 b&lt;build&gt;".</p>
  <h3>Install KSCON build ${FW_PATCH.build}</h3>
  <p class="pg">The installer makes the KSCON file from your own copy of Arturia's 2.5.20 update and walks you through flashing it with MIDI Control Center.</p>
  <p><a class="sm2" href="kscon-install.html" target="_blank" rel="noopener">Open the KSCON installer</a> <button class="sm2" data-a="bk">Back up all 16 projects</button></p>`;
 c.querySelector("[data-a=bk]").onclick=()=>{selectMode("proj");openTool("backup")};
}

/* ================= Welcome: what the site does and what it needs; shown once on the website (not when opened as a file) ================= */
const WEL_KEY="kscon.welcome.v1";
function welcomeShow(){const d=$("#welDlg");if(!d)return;const chk=d.querySelector("[data-a=chk]"),midi=!!navigator.requestMIDIAccess,phone=/iPhone|iPad|Android/i.test(navigator.userAgent);
 chk.className="welChk "+(midi&&!phone?"ok":"no");
 chk.textContent=midi&&!phone?"This browser can connect to a KeyStep: use Connect KeyStep at the top once it is plugged in.":midi?"This browser has Web MIDI, but a KeyStep connects over USB to a computer: use Chrome or Edge on a Mac, Windows or Linux computer to connect. The manual and simulation work here.":"This browser cannot connect to a KeyStep (no Web MIDI). The manual and the simulated KeyStep work here; open the page in Chrome or Edge on a computer to connect.";
 d.hidden=false;d.scrollTop=0;d.querySelector("[data-a=go]").focus({preventScroll:true})}
function welcomeClose(){$("#welDlg").hidden=true;try{localStorage.setItem(WEL_KEY,"1")}catch(e){}}
function welcomeBind(){const d=$("#welDlg");if(!d)return;d.querySelector("[data-a=go]").onclick=welcomeClose;d.querySelector("[data-a=x]").onclick=welcomeClose;
 d.onclick=e=>{if(e.target===d)welcomeClose()};addEventListener("keydown",e=>{if(e.key==="Escape"&&!d.hidden)welcomeClose()});
 const again=$("#welAgain");if(again)again.onclick=e=>{e.preventDefault();welcomeShow()};
 let seen=false;try{seen=!!localStorage.getItem(WEL_KEY)}catch(e){}if(/^https?:/.test(location.protocol)&&!seen&&location.hash!=="#backup")welcomeShow()}
queueMicrotask(welcomeBind);
/* the bar at the top: offers the KSCON installer; says when a connected KeyStep has an older build; hidden when it runs this
   build or after ×, until a newer build comes out */
const FWBAR_KEY="kscon.fwbar.hidden";
function fwBarDraw(){const b=$("#fwBar");if(!b)return;const n=FW_PATCH.build,real=DEV.link&&!DEV.link.sim&&DEV.fw;let hid=0;try{hid=+(localStorage.getItem(FWBAR_KEY)||0)}catch(e){}
 const cur=real&&fwPatched()?DEV.fwBuild:0;
 if((cur&&cur>=n)||(!cur&&hid>=n)){b.hidden=true;return}
 b.querySelector("[data-a=txt]").textContent=cur?`Update available: KSCON build ${n} (your KeyStep runs build ${cur}).`:`KSCON firmware for the KeyStep Pro: drum and chord pads on the steps, root chords, Make bass and project names. Free; made from your own copy of Arturia's 2.5.20.`;
 b.querySelector("[data-a=go]").textContent=cur?`Update to build ${n}`:"Install KSCON firmware";b.hidden=false}
function fwBarBind(){const b=$("#fwBar");if(!b)return;b.querySelector("[data-a=x]").onclick=()=>{try{localStorage.setItem(FWBAR_KEY,String(FW_PATCH.build))}catch(e){}b.hidden=true};fwBarDraw();
 if(location.hash==="#backup"){try{localStorage.setItem(WEL_KEY,"1")}catch(e){}selectMode("proj");openTool("backup")}}
queueMicrotask(fwBarBind);
/* ================= Feature popups from the top row: everything in the editor, the live manual and the KSCON firmware =================
   item: [name, what it does, where "Go" leads]; go: ["mode", project tab index | tool id] | {chap: What's new entry} | {fn} */
const FEAT={
 editor:{t:"Editor features",i:"The KeyStep Con editor talks to your KeyStep Pro over USB (Chrome or Edge on a computer). It does what MIDI Control Center does, and more. Until you connect, a simulated KeyStep Pro stands in, so you can try all of it.",groups:[
  ["Connect and projects",[
   ["One-click connect","Connect KeyStep finds the KeyStep's MIDI port and connects; the top pill shows the firmware it runs.",{fn:()=>DEV.connOpen(true)}],
   ["Recall and Store","Read any of the 16 projects off the KeyStep, edit it, and store it back with a second click to confirm; it is read back to check. Stop ends a transfer.",["proj"]],
   ["Piano roll","Notes of the sequencer tracks: add or remove notes and edit each one's pitch, length, velocity, time shift and randomness; pattern length, root and scale; steps on or off.",["proj",1]],
   ["Drum grid","Track 1 in drum mode: click hits on and off per lane and step.",["proj",0]],
   ["Steps → drums","Put a melody track's notes on the drum lanes, one lane per pitch.",["proj",0]],
   ["Make bass","A bass line from a track with chords: Root, Root + 5th, Octaves, Pulse or Follow rhythm, switchable in place.",["proj",2]],
   ["Copy, paste, undo","Copy and paste patterns; Undo and Redo every edit (Ctrl+Z, Ctrl+Shift+Z).",["proj",1]],
   ["Scenes and chains","Each scene's patterns per track, mutes and pattern chains.",["proj",4]],
   ["Project settings","Tempo, each track's chord shape and chord mode, user scales.",["proj",5]],
   ["Control track","The control track's knob CCs and step values, drawn as ramps.",["proj",6]]]],
  ["Files and many projects",[
   ["MIDI import and export","Turn .mid files (several files, several parts) into patterns, or export patterns as .mid.",["proj","midifile"]],
   ["New empty project","Start from a blank project without a KeyStep, for instance to import MIDI.",["proj"]],
   ["Library","Keep projects in this browser, search them, import and export them.",["proj"]],
   ["Backup and restore","All 16 projects and the settings in one file; restore only the ones you pick.",["proj","backup"]],
   ["Set list","Names, chord shapes and keys for many projects in one go.",["proj","setlist"]],
   ["Chord & key","Set one track's chord shape, root and scale on a slot.",["proj","trackkey"]],
   ["Project names","Give a slot a name it shows on the display (KSCON firmware).",["proj","names"]]]],
  ["Device and synths",[
   ["Device settings","All 158 global settings in MCC's groups, written and read back, including 12 MCC never shows: Program Change send and Fixed Velocity per track, Brightness, Transpose Latch.",["set"]],
   ["MIDI monitor","See what the KeyStep sends: notes, CCs, pitch bend, program changes.",["set"]],
   ["Firmware","What the KeyStep runs, and the KSCON installer (also the bar at the top).",["set"]],
   ["Synth CC","Map your synth's parameters to the five knobs, from the MIDI Guide catalogue of 447 instruments.",["cc"]]]]]},
 manual:{t:"Manual features",i:"A live, playable KeyStep Pro built from Arturia's user manual and the decoded firmware. Click anything on it. Everything here runs in the browser, and no KeyStep is needed.",groups:[
  ["Play it",[
   ["Playable KeyStep Pro","Every button, key, encoder and the touch strip works: sequencer, drum sequencer, arpeggiators, scales, chord mode, scenes, Shift functions and the Utility menu, with the display.",["man"]],
   ["Sound and MIDI out","Synthesized stand-in sounds, or send the simulation's notes to a real synth (MIDI).",["man"]],
   ["Computer keyboard","Keys A–K play notes, Z/X octave, Space play, R record, Shift is Shift; right-click (or long-press) latches a button for two-handed combos.",["man"]],
   ["KSCON pads in the simulation","Drum pads, chord pads and root chords work in the simulation too; Show in What's new turns them on.",{chap:"fwChordPads"}]]],
  ["Learn it",[
   ["Help on every control","Hover any control for a short description; click it for the details.",["man"]],
   ["The manual, chapter by chapter","Arturia's chapters with Show: the simulation jumps to that state and explains it.",["man"]],
   ["Guided tours","13 tours step you through recording, arpeggiators, scales, chords, scenes and more.",{fn:()=>{selectTab("man");$("#tourSel").focus()}}],
   ["Demos","Load a demo project and press Play.",{fn:()=>{selectTab("man");$("#exSel").focus()}}],
   ["Firmware notes","Blue notes where the real firmware 2.5.20 differs from the manual: scale quantizer ties, chord-mode snapping, the Save confirm trap, hidden settings.",{chap:"fwQuirks"}],
   ["What's new from this project","Every KSCON firmware and editor feature, each with Show or Open it.",{chap:"fwBass"}],
   ["Panel view","The drawing zooms to the part in use; or pick Whole, Transport, Tracks, Steps, Knobs or Keys.",["man"]]]]]},
 fw:{t:"Firmware features",i:"KSCON is Arturia's KeyStep Pro firmware 2.5.20 with features added on the device itself. Everything else works as before. Install it from your own copy of Arturia's update with the installer, and flash it with MIDI Control Center.",groups:[
  ["On the KeyStep",[
   ["Make bass","Hold Seq on the bass track and press the chord track's Track button: a bass line that follows the chords. Still holding Seq, steps 1–5 pick Root, Root + 5th, Octaves, Pulse or Follow rhythm. Works while playing.",{chap:"fwBass"}],
   ["Drum pads","Hold Drum and press Seq: steps 1–16 play the drum lanes while the keys play another track.",{chap:"fwDrumPads"}],
   ["Chord pads","Hold Seq and press Arp on track 2–4: steps play chords of the track's scale; hold a chord and tap a step to keep it there. Erase + step clears it, Shift + Exit undoes. Saved with the project.",{chap:"fwChordPads"}],
   ["Root chords","Hold Seq and press Mute: a key sets the root silently, steps 1–16 play 16 chord types on it.",{chap:"fwRootChords"}],
   ["Key lights and recording","Pad notes light the keys they play and are recorded like key presses, drum hits included.",{chap:"fwLightsRec"}],
   ["Project names","Projects show a name (up to 16 characters) instead of \"Project N\"; set it from the editor.",{chap:"fwNames"}],
   ["Startup screen and version","KEYSTEP CON at power-on; reports 2.5.99 and shows \"KSCON 2.5.99 bN\" on the FW version page.",{chap:"fwVersion"}],
   ["Stock combos stay stock","Seq, Arp and Mute on their own, Shift + Control and Shift + Drum work as before; one pad mode at a time.",{chap:"fwRules"}]]],
  ["Getting it",[
   ["Installer","Makes the KSCON file in your browser from Arturia's 2.5.20 update, checked against the tested build; nothing uploaded, no Arturia firmware shipped.",{fn:()=>open("kscon-install.html","_blank","noopener")}],
   ["Arturia bugs found","Save + Track never stores chords, the Save confirm trap, SysEx stores flipping patterns, values SysEx cannot read, and settings MCC hides.",{chap:"fwQuirks"}]]]]}};
function featShowChap(fn){selectTab("man");const i=NEW_CHAPTERS.findIndex(c=>c[2]===fn),li=$("#newChapList").children[i];if(li)li.querySelector("button").click()}
function featGo(g){featClose();if(Array.isArray(g)){selectTab(g[0]);if(typeof g[1]==="number"){STU.tab=g[1];renderWork()}else if(g[1])openTool(g[1])}else if(g.chap)featShowChap(g.chap);else if(g.fn)g.fn()}
function featOpen(k){const f=FEAT[k],d=$("#featDlg");d.querySelector("#featT").textContent=f.t;d.querySelector("[data-a=intro]").textContent=f.i;const L=d.querySelector("[data-a=list]");L.innerHTML="";
 for(const [h,items] of f.groups){const h3=document.createElement("h3");h3.textContent=h;L.appendChild(h3);
  for(const [n,txt,g] of items){const r=document.createElement("div");r.className="fi";r.innerHTML=`<div><b>${esc(n)}</b><span>${esc(txt)}</span></div>`;
   const b=document.createElement("button");b.textContent=g.chap?"Show in the manual":g.fn&&k==="fw"?"Open the installer":"Go there";b.onclick=()=>featGo(g);r.appendChild(b);L.appendChild(r)}}
 document.querySelectorAll(".featBtns button").forEach(b=>b.setAttribute("aria-expanded",b.dataset.feat===k));d.hidden=false;d.scrollTop=0;d.querySelector("[data-a=x]").focus({preventScroll:true})}
function featClose(){$("#featDlg").hidden=true;document.querySelectorAll(".featBtns button").forEach(b=>b.setAttribute("aria-expanded","false"))}
function featBind(){const d=$("#featDlg");if(!d)return;document.querySelectorAll(".featBtns button").forEach(b=>b.onclick=()=>featOpen(b.dataset.feat));
 d.querySelector("[data-a=x]").onclick=featClose;d.onclick=e=>{if(e.target===d)featClose()};addEventListener("keydown",e=>{if(e.key==="Escape"&&!d.hidden)featClose()})}
queueMicrotask(featBind);
