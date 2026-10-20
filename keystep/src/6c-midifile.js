/* ================= MIDI files: import a song part per track into patterns, export patterns as a .mid =================
   Works on the project loaded in the Projects tool, like the editor, and sends nothing itself. Placement follows the
   step format measured on hardware (2026-10-20): notes go on 16th-note steps, the offset from the step is kept as
   time shift (±49% of a step), note length becomes the nearest gate (gateSteps), velocity is copied.
   A pattern holds 64 steps, 16 notes per step and 192 notes; a longer part continues on the following patterns. */
const MF_STEPS=64,MF_PPQ=96,MF_T16=MF_PPQ/4;
/* ---------- Standard MIDI File reading ---------- */
function mfParse(buf){const d=new Uint8Array(buf);let p=0;const u32=()=>(d[p++]<<24|d[p++]<<16|d[p++]<<8|d[p++])>>>0,u16=()=>d[p++]<<8|d[p++];
 const str=n=>{const s=String.fromCharCode(...d.subarray(p,p+n));p+=n;return s};
 const vlq=()=>{let v=0,b;do{if(p>=d.length)throw new Error("the file ends in the middle of an event");b=d[p++];v=v*128+(b&127)}while(b&128);return v};
 if(d.length<14||str(4)!=="MThd")throw new Error("not a MIDI file (no MThd header)");
 const hl=u32(),format=u16(),ntrk=u16(),div=u16();p=8+hl;
 if(div&0x8000)throw new Error("SMPTE-timed MIDI files are not supported; export with bars and beats");
 const tracks=[];let tempo=null,timesig=null;
 for(let t=0;t<ntrk&&p<d.length;t++){if(p+8>d.length)break;const id=str(4),len=u32(),end=p+len;if(id!=="MTrk"){p=end;t--;continue}
  let tick=0,run=0,name="";const notes=[],open=new Map();
  while(p<end){tick+=vlq();let s=d[p];if(s<0x80){if(!run)throw new Error("running status without a status byte");s=run}else p++;
   if(s===0xFF){const ty=d[p++],l=vlq(),start=p;
    if(ty===0x03&&!name)name=new TextDecoder().decode(d.subarray(start,start+l)).trim();
    if(ty===0x51&&l===3&&tempo==null)tempo=60e6/(d[start]<<16|d[start+1]<<8|d[start+2]);
    if(ty===0x58&&l>=2&&!timesig)timesig=[d[start],2**d[start+1]];p=start+l;continue}
   if(s===0xF0||s===0xF7){p+=vlq();continue}
   run=s;const ty=s&0xF0,ch=s&15;
   if(ty===0xC0||ty===0xD0){p++;continue}
   const a=d[p++],b=d[p++];
   if(ty===0x90&&b>0){const k=ch*128+a;if(!open.has(k))open.set(k,[]);open.get(k).push({ch,pitch:a,vel:b,start:tick})}
   else if(ty===0x80||ty===0x90){const q=open.get(ch*128+a);if(q&&q.length){const n=q.shift();n.end=tick;notes.push(n)}}}
  for(const q of open.values())for(const n of q){n.end=tick;notes.push(n)} /* hanging notes end with the track */
  p=end;tracks.push({name,notes:notes.sort((x,y)=>x.start-y.start||x.pitch-y.pitch),endTick:tick})}
 return {format,ppq:div,tempo,timesig:timesig||[4,4],tracks}}
/* one part per track and channel that has notes */
function mfParts(mf){const parts=[];mf.tracks.forEach((t,ti)=>{const chs=[...new Set(t.notes.map(n=>n.ch))];
 for(const ch of chs){const notes=t.notes.filter(n=>n.ch===ch);parts.push({id:`${ti}/${ch}`,name:(t.name||`Track ${ti+1}`)+(chs.length>1?` (channel ${ch+1})`:""),ch,notes})}});return parts}
/* ---------- placing a part onto steps ---------- */
/* returns {steps:[{notes}] over the whole part, length in steps, problems} with every note placed; nothing is dropped here */
function mfPlace(part,mf){const t16=mf.ppq/4,barSteps=Math.max(1,Math.round(mf.timesig[0]*16/mf.timesig[1]));
 const placed=part.notes.map(n=>{const pos=n.start/t16,step=Math.round(pos),shift=clamp(Math.round((pos-step)*100),-49,50);
  return {step,pitch:n.pitch,vel:clamp(n.vel,1,127),gate:Graw(Math.max(1/16,(n.end-n.start)/t16)),shift:shift+49,rand:100}});
 const lastEnd=Math.max(1,...part.notes.map(n=>n.end/t16),...placed.map(n=>n.step+1));const length=Math.ceil(lastEnd/barSteps)*barSteps;
 const steps=Array.from({length},()=>({notes:[]}));placed.forEach(n=>{if(n.step<length)steps[n.step].notes.push(n)});
 return {steps,length,barSteps}}
/* split into patterns from pattern `first` (1-based); counts what cannot fit */
function mfPlan(placed,first,maxPatterns){const need=Math.ceil(placed.length/MF_STEPS),use=Math.min(need,maxPatterns,17-first);
 const pats=[];for(let i=0;i<use;i++){const st=placed.steps.slice(i*MF_STEPS,(i+1)*MF_STEPS);pats.push({pat:first+i,len:st.length,steps:st})}
 const over=[];pats.forEach(p=>{p.steps.forEach((s,i)=>{if(s.notes.length>ED_MAX_STEP_NOTES)over.push(`pattern ${p.pat} step ${i+1}: ${s.notes.length} notes (16 max)`)});
  const tot=p.steps.reduce((a,s)=>a+Math.min(s.notes.length,ED_MAX_STEP_NOTES),0);if(tot>ED_SLOTS)over.push(`pattern ${p.pat}: ${tot} notes (192 max)`)});
 const cutSteps=Math.max(0,placed.length-use*MF_STEPS);return {pats,need,use,cutSteps,over}}
/* write a plan into a project file; trims notes over the limits when allowed and says how many */
function mfApply(f,item,plan,{trim=false,chainScene=0}={}){let dropped=0;
 if(plan.over.length&&!trim)throw new Error("too many notes: "+plan.over.join("; "));
 for(const p of plan.pats){const pt=edReadPattern(f,item,p.pat);if(pt.unreadable)throw new Error(`pattern ${p.pat} has unreadable note slots; pick another pattern`);
  pt.len=p.len;let total=0;
  pt.steps.forEach((s,i)=>{const src=p.steps[i]?p.steps[i].notes:[];const keep=[];for(const n of src.slice(0,ED_MAX_STEP_NOTES)){if(total>=ED_SLOTS)break;keep.push(n);total++}dropped+=src.length-keep.length;
   s.notes=keep.map(n=>({pitch:n.pitch,gate:n.gate,vel:n.vel,shift:n.shift,rand:n.rand}));s.on=keep.length>0;s.passes=15});
  edWritePattern(f,item,p.pat,pt)}
 if(chainScene&&plan.pats.length){const t=TRACK_ITEMS.indexOf(item),sc=edReadScene(f,chainScene);sc.valid=true;sc.pats[t]=plan.pats[0].pat-1;
  sc.chains[t]=plan.pats.length>1?plan.pats.map(p=>p.pat-1):[];sc.chainOn=sc.chains.some(c=>c.length);edWriteScene(f,chainScene,sc)}
 return dropped}
/* project tempo: params 0x46-0x48 = value x100 in three 7-bit parts, LSB first (12000 = 120.00 BPM, read on hardware) */
function mfSetTempo(f,bpm){const v=Math.round(clamp(bpm,30,240)*100);edSet(f,PROJECT_ITEM,0x46,[1],v&127);edSet(f,PROJECT_ITEM,0x47,[1],v>>7&127);edSet(f,PROJECT_ITEM,0x48,[1],v>>14&127)}
function mfGetTempo(f){const a=edGet(f,PROJECT_ITEM,0x46,[1]),b=edGet(f,PROJECT_ITEM,0x47,[1]),c=edGet(f,PROJECT_ITEM,0x48,[1]);return a==null||b==null||c==null?120:(c<<14|b<<7|a)/100}
/* ---------- writing a .mid: format 1, a tempo track, then one track per KeyStep track ---------- */
function mfWrite({tempo,tracks}){const out=[],vlq=v=>{const b=[v&127];while(v>>=7)b.unshift(v&127|128);return b},u32=v=>[v>>>24&255,v>>>16&255,v>>>8&255,v&255];
 const chunk=(id,body)=>{out.push(...[...id].map(c=>c.charCodeAt(0)),...u32(body.length),...body)};
 chunk("MThd",[0,1,0,tracks.length+1,MF_PPQ>>8,MF_PPQ&255]);
 const us=Math.round(60e6/tempo);chunk("MTrk",[0,0xFF,0x51,3,us>>16&255,us>>8&255,us&255,0,0xFF,0x58,4,4,2,24,8,0,0xFF,0x2F,0]);
 for(const t of tracks){const ev=[];const nm=new TextEncoder().encode(t.name);
  t.notes.forEach(n=>{ev.push([n.on,0x90|t.ch,n.pitch,n.vel]);ev.push([n.off,0x80|t.ch,n.pitch,0])});
  ev.sort((a,b)=>a[0]-b[0]||(a[1]&0xF0)-(b[1]&0xF0)); /* note-offs before note-ons at the same tick */
  const body=[0,0xFF,0x03,...vlq(nm.length),...nm];let last=0;for(const [t0,s,a,b] of ev){body.push(...vlq(t0-last),s,a,b);last=t0}body.push(0,0xFF,0x2F,0);chunk("MTrk",body)}
 return new Uint8Array(out)}
/* the notes of a chain of patterns, in ticks; steps play on their first pass (pass mask bit 0) */
function mfExportTrack(f,item,patList){const notes=[];let at=0;
 for(const pat of patList){const pt=edReadPattern(f,item,pat);
  pt.steps.slice(0,pt.len).forEach((s,i)=>{if(!s.on||!(s.passes&1))return;
   for(const n of s.notes){const on=Math.max(0,Math.round((at+i+(n.shift-49)/100)*MF_T16));notes.push({pitch:n.pitch,vel:Math.max(1,n.vel),on,off:on+Math.max(1,Math.round(gateSteps(n.gate)*MF_T16))})}});
  at+=pt.len}
 return notes}

/* ---------- the feature ---------- */
const MIDIFILE_FEATURE={id:"midifile",title:"MIDI files: import a part per track, export",verified:"Tested in the simulation (import, too-long and too-dense warnings, export round trip); the step format it writes was measured on a KeyStep Pro on 2026-10-20.",needs:null,
 about:"Import: open a .mid (for example a song part exported from Logic), choose which KeyStep track each part goes to and the pattern to start on. Notes snap to 16th-note steps; small timing offsets are kept as time shift, note lengths become gate lengths, velocity is kept. One pattern holds 64 steps (4 bars of 4/4); a longer part can continue on the following patterns and be chained in a scene. The result goes into the project loaded in the Projects tool: check it in the editor, then Send. Export: writes the chosen patterns of each track as a .mid.",
 render(el){el.innerHTML=`<div class="row" data-a="none">Load a project in the Projects tool first.</div><div data-a="ui" hidden>
   <h3>Import</h3><div class="row small"><input type="file" accept=".mid,.midi,audio/midi" data-a="f"><label><input type="checkbox" data-a="tempo"> use the file's tempo</label></div>
   <div data-a="parts" class="pg"></div><div data-a="warn"></div>
   <div class="row"><button class="sm2" data-a="imp">Import into the loaded project</button></div>
   <h3>Export</h3><div data-a="exp"></div><div class="row"><button class="sm2" data-a="ex">Save .mid</button></div>
   <p class="pg" data-a="msg" aria-live="polite"></p></div>`;
  const q=a=>el.querySelector(`[data-a=${a}]`);let mf=null,parts=[],rows=[],decision=null;
  const say=(s,cls="")=>{q("msg").textContent=s;q("msg").className="pg "+cls};
  const load=()=>{const f=DEV.project;q("none").hidden=!!f;q("ui").hidden=!f;if(f)drawExport()};
  const drawParts=()=>{const box=q("parts");box.innerHTML="";rows=[];decision=null;q("warn").innerHTML="";if(!mf)return;
   const head=document.createElement("div");head.textContent=`${parts.length} part${parts.length===1?"":"s"} with notes · ${mf.tempo?mf.tempo.toFixed(2)+" BPM":"no tempo in file (120)"} · ${mf.timesig[0]}/${mf.timesig[1]}`;box.appendChild(head);
   const t=document.createElement("table");t.className="t";t.innerHTML="<thead><tr><th>Part</th><th>Notes</th><th>Length</th><th>To track</th><th>From pattern</th></tr></thead>";const tb=document.createElement("tbody");t.appendChild(tb);
   parts.forEach((p,i)=>{const pl=mfPlace(p,mf),tr=tb.insertRow();tr.insertCell().textContent=p.name;tr.insertCell().textContent=String(p.notes.length);
    tr.insertCell().textContent=`${pl.length} steps (${pl.length/pl.barSteps} bar${pl.length/pl.barSteps===1?"":"s"})`;
    const ts=document.createElement("select");ts.add(new Option("— skip —",""));[1,2,3,4].forEach(n=>ts.add(new Option(`Track ${n}`,n)));if(i<4)ts.value=String(i+1);
    const ps=document.createElement("select");for(let k=1;k<=16;k++)ps.add(new Option(String(k),k));
    ts.onchange=ps.onchange=()=>{decision=null;q("warn").innerHTML=""};tr.insertCell().append(ts);tr.insertCell().append(ps);rows.push({part:p,placed:pl,ts,ps})});
   box.appendChild(t)};
  q("f").onchange=async e=>{const file=e.target.files[0];if(!file)return;try{mf=mfParse(await file.arrayBuffer());parts=mfParts(mf);q("tempo").checked=!!mf.tempo;
    drawParts();say(parts.length?`Opened ${file.name}.`:`${file.name} has no notes.`,parts.length?"ok":"bad")}catch(err){mf=null;parts=[];drawParts();say("Could not read the file: "+err.message,"bad")}};
  /* checks first; a part that does not fit asks before it spills onto more patterns, too many notes ask before trimming */
  const ask=(text,choices)=>{const w=q("warn");w.innerHTML="";const box=document.createElement("div");box.className="feat";const p=document.createElement("p");p.className="need";p.textContent=text;box.appendChild(p);
   const r=document.createElement("div");r.className="row";for(const [label,fn] of choices){const b=document.createElement("button");b.className="sm2";b.textContent=label;b.onclick=fn;r.append(b)}box.appendChild(r);w.appendChild(box)};
  const run=()=>{if(!mf||!DEV.project)return say("Open a MIDI file and load a project first.","bad");
   const chosen=rows.filter(r=>r.ts.value);if(!chosen.length)return say("Choose a track for at least one part.","bad");
   const tracks=chosen.map(r=>+r.ts.value);if(new Set(tracks).size!==tracks.length)return say("Two parts are going to the same track; pick different tracks.","bad");
   decision=decision||{spill:{},trim:false};
   for(const r of chosen){const id=r.part.id,first=+r.ps.value,free=(17-first)*MF_STEPS;
    if(r.placed.length>MF_STEPS&&decision.spill[id]==null){const n=Math.ceil(r.placed.length/MF_STEPS),avail=Math.min(n,17-first);
     ask(`“${r.part.name}” is ${r.placed.length} steps, but only ${MF_STEPS} steps fit in pattern ${first} of track ${r.ts.value}. Would you like to add the rest to other patterns? It needs patterns ${first}–${first+avail-1}${n>avail?` and still ${r.placed.length-free} steps will not fit (patterns run out at 16)`:""}, chained in scene 1.`,
      [[`Add to patterns ${first}–${first+avail-1}`,()=>{decision.spill[id]=true;run()}],[`Only the first ${MF_STEPS} steps`,()=>{decision.spill[id]=false;run()}],["Cancel",()=>{decision=null;q("warn").innerHTML="";say("Import cancelled.")}]]);return}}
   const plans=chosen.map(r=>({r,plan:mfPlan(r.placed,+r.ps.value,r.placed.length>MF_STEPS&&decision.spill[r.part.id]?16:1)}));
   const over=plans.flatMap(x=>x.plan.over.map(o=>`track ${x.r.ts.value} ${o}`));
   if(over.length&&!decision.trim){ask(`Too many notes for the KeyStep Pro: ${over.slice(0,4).join("; ")}${over.length>4?` and ${over.length-4} more`:""}. Import anyway and leave the extra notes out?`,
     [["Import, leaving extras out",()=>{decision.trim=true;run()}],["Cancel",()=>{decision=null;q("warn").innerHTML="";say("Import cancelled.")}]]);return}
   const work=JSON.parse(JSON.stringify(DEV.project));let dropped=0;const done=[];
   try{for(const {r,plan} of plans){const item=TRACK_ITEMS[+r.ts.value-1];dropped+=mfApply(work,item,plan,{trim:decision.trim,chainScene:plan.pats.length>1?1:0});
     done.push(`“${r.part.name}” → track ${r.ts.value}, pattern${plan.pats.length>1?"s":""} ${plan.pats.map(p=>p.pat).join(", ")}${plan.cutSteps?` (last ${plan.cutSteps} steps left out)`:""}`)}
    if(q("tempo").checked&&mf.tempo)mfSetTempo(work,mf.tempo)}catch(err){return say("Import failed: "+err.message,"bad")}
   delete work.__ix;work.saved=new Date().toISOString();q("warn").innerHTML="";decision=null;DEV.showProject(work,"MIDI import");
   say(`Imported: ${done.join("; ")}${dropped?`; ${dropped} note(s) over the limits left out`:""}${q("tempo").checked&&mf.tempo?`; tempo ${mf.tempo.toFixed(2)} BPM`:""}. Check it in the editor, then Send.`,"ok");emit("midifile:import")};
  q("imp").onclick=run;
  const drawExport=()=>{const f=DEV.project,box=q("exp");box.innerHTML="";const t=document.createElement("table");t.className="t";
   t.innerHTML="<thead><tr><th>Track</th><th>Patterns (in order)</th><th>MIDI channel</th></tr></thead>";const tb=document.createElement("tbody");t.appendChild(tb);
   const s1=edReadScene(f,1);
   for(let ti=0;ti<4;ti++){const tr=tb.insertRow();tr.insertCell().textContent=`Track ${ti+1}`;const inp=document.createElement("input");inp.type="text";inp.style.width="9em";inp.dataset.track=ti;
    const used=[...Array(16).keys()].filter(p=>edReadPattern(f,TRACK_ITEMS[ti],p+1).steps.some(s=>s.notes.length));
    inp.value=(s1.valid&&s1.chains[ti].length?s1.chains[ti].map(x=>x+1):used.length?[used[0]+1]:[]).join(" ");inp.placeholder="e.g. 1 2 3";
    const ch=document.createElement("select");ch.dataset.track=ti;for(let c=0;c<16;c++)ch.add(new Option(String(c+1),c));ch.value=String(ti);tr.insertCell().append(inp);tr.insertCell().append(ch)}
   box.appendChild(t)};
  q("ex").onclick=()=>{const f=DEV.project;if(!f)return;const tracks=[];
   for(const inp of q("exp").querySelectorAll("input")){const ti=+inp.dataset.track,toks=inp.value.trim().split(/[\s,]+/).filter(Boolean);if(!toks.length)continue;
    const pats=toks.map(Number);if(pats.some(p=>!(Number.isInteger(p)&&p>=1&&p<=16)))return say(`Track ${ti+1}: patterns are numbers 1–16.`,"bad");
    tracks.push({name:`KeyStep track ${ti+1}`,ch:+q("exp").querySelector(`select[data-track="${ti}"]`).value,notes:mfExportTrack(f,TRACK_ITEMS[ti],pats)})}
   if(!tracks.length)return say("List patterns for at least one track.","bad");
   const blob=new Blob([mfWrite({tempo:mfGetTempo(f),tracks})],{type:"audio/midi"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);
   a.download=`KeyStep Pro P${f.project}${f.name?" "+fileSafe(f.name):""}.mid`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);
   say(`Saved ${tracks.reduce((s,t)=>s+t.notes.length,0)} notes on ${tracks.length} track(s) at ${mfGetTempo(f).toFixed(2)} BPM.`,"ok");emit("midifile:export")};
  DEV.midiLoad=load;load()}};
FEATURES.splice(FEATURES.findIndex(f=>f.id==="editor")+1,0,MIDIFILE_FEATURE);
