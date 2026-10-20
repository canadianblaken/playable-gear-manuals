/* ================= Project editor: steps, notes, pattern settings and scenes of a project file =================
   Works on the project loaded in the Projects tool (DEV.project, a file from readProject) and sends nothing itself:
   Send in the Projects tool writes the edited file. Layout from the firmware setter 0800d3c0 and MCC's recall plan:
   a sequencer pattern has 192 note slots (param 0x6D-0x71 pitch/gate/velocity/time shift/randomness, 0x32 the step
   the slot belongs to, 0x7F = unused), addressed [pattern, voice 1-3, slot 1-64], at most 16 notes per step;
   per step [pattern, 1, step]: on bit 0x30, and 0x31, which is not a skip flag but a 4-bit mask of the passes the step
   plays on (15 = every pass, the hardware default; 0 = never: writing 0 silenced whole patterns on 2026-10-20). Seq-mode data only; drum lanes and arpeggio settings are left as they are. */
const ED_P={state:0x28,swing:0x61,len:0x62,root:P_ROOT,scale:P_SCALE,pitch:0x6D,gate:0x6E,vel:0x6F,shift:0x70,rand:0x71,on:0x30,skip:0x31,step:0x32};
const ED_NOTE=["pitch","gate","vel","shift","rand"],ED_EMPTY=0x7F,ED_SLOTS=192,ED_MAX_STEP_NOTES=16;
const SC_P={state:P_SCENE_STATE,track:0x4C,mute:0x4D,solo:0x4E,pat:0x53,chain:0x54};
const SCALE_NAMES=[[0,"Chromatic"],[1,"Major"],[2,"Minor"],[3,"Dorian"],[4,"Mixolydian"],[5,"Harmonic minor"],[6,"Blues"],[8,"User 1"],[9,"User 2"]];
/* value access on a project file: blocks are [item, param, path, values]; a value inside a block is found by the last index */
function edIndex(f){if(f.__ix)return f.__ix;const m=new Map();f.data.forEach(e=>m.set(`${e[0]}/${e[1]}/${e[2].slice(0,-1).join(",")}`,(m.get(`${e[0]}/${e[1]}/${e[2].slice(0,-1).join(",")}`)||[]).concat([e])));
 Object.defineProperty(f,"__ix",{value:m,enumerable:false,configurable:true});return m}
function edCell(f,item,param,path){const pre=path.slice(0,-1).join(","),last=path[path.length-1];
 for(const e of edIndex(f).get(`${item}/${param}/${pre}`)||[]){const s=e[2][e[2].length-1];if(last>=s&&last<s+e[3].length)return [e[3],last-s]}return null}
function edGet(f,item,param,path){const c=edCell(f,item,param,path);return c?c[0][c[1]]:undefined}
function edSet(f,item,param,path,v){const c=edCell(f,item,param,path);if(!c)throw new Error(`no value ${item}/${param}/${path.join(",")} in the project`);c[0][c[1]]=v}
const slotPath=(pat,s)=>[pat,Math.floor(s/64)+1,s%64+1];
/* read one pattern of a track (item 0x7B-0x7E) into plain objects */
function edReadPattern(f,item,pat){const g=(p,path)=>edGet(f,item,p,path);
 const pt={valid:g(ED_P.state,[pat])===3,len:(g(ED_P.len,[pat])??15)+1,root:g(ED_P.root,[pat])??0,scale:g(ED_P.scale,[pat])??0,swing:(g(ED_P.swing,[pat])??25)-25,
  def:Object.fromEntries(ED_NOTE.map(k=>[k,g(ED_P[k],[pat])])),steps:Array.from({length:64},(_,i)=>({on:!!g(ED_P.on,[pat,1,i+1]),passes:g(ED_P.skip,[pat,1,i+1])??15,notes:[]})),unreadable:0};
 for(let s=0;s<ED_SLOTS;s++){const st=g(ED_P.step,slotPath(pat,s));if(st===null){pt.unreadable++;continue}if(st===ED_EMPTY||st==null||st>63)continue;
  const n=Object.fromEntries(ED_NOTE.map(k=>[k,g(ED_P[k],slotPath(pat,s))]));if(ED_NOTE.some(k=>n[k]==null)){pt.unreadable++;continue}pt.steps[st].notes.push(n)}
 return pt}
/* write it back: notes go into slots in step order, the rest of the slots are cleared; an edited pattern becomes valid */
function edWritePattern(f,item,pat,pt){const s=(p,path,v)=>edSet(f,item,p,path,v),total=pt.steps.reduce((a,st)=>a+st.notes.length,0);
 if(total>ED_SLOTS)throw new Error(`${total} notes in the pattern; the KeyStep Pro holds ${ED_SLOTS}`);
 pt.steps.forEach((st,i)=>{if(st.notes.length>ED_MAX_STEP_NOTES)throw new Error(`step ${i+1} has ${st.notes.length} notes; the limit is ${ED_MAX_STEP_NOTES}`)});
 if(!(pt.len>=1&&pt.len<=64))throw new Error("pattern length is 1–64 steps");
 s(ED_P.state,[pat],3);s(ED_P.len,[pat],pt.len-1);s(ED_P.root,[pat],pt.root);s(ED_P.scale,[pat],pt.scale);
 pt.steps.forEach((st,i)=>{if(!(st.passes>=0&&st.passes<=15))throw new Error(`step ${i+1}: pass mask must be 0–15`);s(ED_P.on,[pat,1,i+1],st.on?1:0);s(ED_P.skip,[pat,1,i+1],st.passes)});
 let slot=0;pt.steps.forEach((st,i)=>st.notes.forEach(n=>{const path=slotPath(pat,slot++);s(ED_P.step,path,i);ED_NOTE.forEach(k=>s(ED_P[k],path,n[k]))}));
 for(;slot<ED_SLOTS;slot++){const path=slotPath(pat,slot);s(ED_P.step,path,ED_EMPTY);ED_NOTE.forEach(k=>s(ED_P[k],path,ED_EMPTY))}}
/* scenes: data state, current pattern per track (1-4, 5 = control track), mutes, current track, chain */
function edReadScene(f,sc){const g=(p,path)=>edGet(f,SCENE_ITEM,p,path),tb=g(SC_P.track,[sc])??0;
 return {valid:g(SC_P.state,[sc])===3,pats:[1,2,3,4,5].map(t=>g(SC_P.pat,[sc,t])??0),mute:g(SC_P.mute,[sc])??0,solo:g(SC_P.solo,[sc])??0,track:tb&7,chainOn:!!(tb&8),
  chains:[1,2,3,4,5].map(t=>{const c=[];for(let i=1;i<=16;i++){const v=g(SC_P.chain,[sc,t,i]);if(v==null||v===ED_EMPTY||v>15)break;c.push(v)}return c})}}
function edWriteScene(f,sc,s){const w=(p,path,v)=>edSet(f,SCENE_ITEM,p,path,v),old=edGet(f,SCENE_ITEM,SC_P.track,[sc])??0;
 w(SC_P.state,[sc],s.valid?3:2);s.pats.forEach((p,t)=>{if(!(p>=0&&p<=15))throw new Error("scene patterns are 1–16");w(SC_P.pat,[sc,t+1],p)});
 w(SC_P.mute,[sc],s.mute&15);w(SC_P.track,[sc],old&~0xF|s.track&7|(s.chainOn?8:0));
 s.chains.forEach((c,t)=>{if(c.length>16||c.some(p=>!(p>=0&&p<=15)))throw new Error("a chain is up to 16 patterns, 1–16");for(let i=0;i<16;i++)w(SC_P.chain,[sc,t+1,i+1],i<c.length?c[i]:ED_EMPTY)})}
const noteName=p=>p==null?"?":nm(p);
function parseNote(s){const m=String(s).trim().match(/^([A-Ga-g])(#|b)?(-?\d)$/);if(!m)return null;const v=12*(+m[3]+1)+NN.indexOf(m[1].toUpperCase())+(m[2]==="#"?1:m[2]==="b"?-1:0);return v>=0&&v<=127?v:null}

/* ---------- the editor (a Device tools feature; needs no connection) ---------- */
const EDITOR_FEATURE={id:"editor",title:"Project editor: steps, notes, scenes",verified:"2026-10-20: patterns written to project 16 and recorded over USB MIDI while playing: notes land on their steps, time shift +25% plays 31 ms late at 120 BPM, gate measured for all 128 values. Randomness and scenes not yet checked by ear.",needs:null,
 about:"Edits the project loaded in the Projects tool above: the notes of each step, pattern length, root and scale, and the scenes (which pattern each track plays, mutes, chains). Nothing is sent until you use Send in the Projects tool. Sequencer-mode data only; drum lanes and arpeggio settings are kept as they are. Gate lengths, time shift and step positions were measured on a KeyStep Pro.",
 render(el){el.innerHTML=`<div class="row" data-a="none">Load a project in the Projects tool first.</div><div data-a="ui" hidden>
   <div class="row">Track <select data-a="t">${[1,2,3,4].map(t=>`<option value="${t}">${t}</option>`).join("")}</select> Pattern <select data-a="pat">${[...Array(16).keys()].map(i=>`<option value="${i+1}">${i+1}</option>`).join("")}</select><span class="pg" data-a="pst"></span></div>
   <div class="row small">Length <input type="number" data-a="len" min="1" max="64" style="width:4em"> Root <select data-a="root">${NN.map((n,i)=>`<option value="${i}">${n}</option>`).join("")}</select> Scale <select data-a="scale">${SCALE_NAMES.map(([v,n])=>`<option value="${v}">${n}</option>`).join("")}</select></div>
   <div class="edGrid" data-a="grid" role="grid" aria-label="Steps"></div>
   <div data-a="step" class="edStep"></div>
   <h3>Scenes</h3><div data-a="scenes" class="gtab"></div>
   <div class="row"><button class="sm2" data-a="apply">Keep these edits in the loaded project</button><button class="sm2" data-a="revert">Undo unsaved edits</button></div>
   <p class="pg" data-a="msg" aria-live="polite"></p></div>`;
  const q=a=>el.querySelector(`[data-a=${a}]`);let f=null,work=null,pt=null,selStep=0,dirtyEd=false;
  const say=(s,cls="")=>{q("msg").textContent=s;q("msg").className="pg "+cls};
  const item=()=>TRACK_ITEMS[+q("t").value-1],pat=()=>+q("pat").value;
  /* edits go to a working copy; "Keep" puts it in the Projects tool, ready for Send */
  const load=()=>{f=DEV.project;q("none").hidden=!!f;q("ui").hidden=!f;if(!f)return;work=JSON.parse(JSON.stringify(f));dirtyEd=false;loadPat();drawScenes();say("")};
  const loadPat=()=>{pt=edReadPattern(work,item(),pat());q("len").value=pt.len;q("root").value=pt.root;q("scale").value=pt.scale;
   const mode=edGet(work,item(),P_MODE,[1])??0;
   q("pst").textContent=` ${pt.valid?"holds data":"default (empty)"}${mode&0x40?(item()===0x7B?" · track 1 is in drum mode: this edits its sequencer-mode patterns":" · this track is in arpeggio mode: its steps play when it is switched back to sequencer"):""}${pt.unreadable?` · ${pt.unreadable} note slot(s) could not be read, so this pattern is read-only`:""}`;drawGrid();drawStep()};
  const commitPat=()=>{if(pt.unreadable){say("This pattern has note slots the recall could not read; editing it would lose them, so it is read-only.","bad");loadPat();return}try{edWritePattern(work,item(),pat(),pt);dirtyEd=true;q("pst").textContent=" holds data (edited)"}catch(e){say(e.message,"bad")}};
  const drawGrid=()=>{const g=q("grid");g.innerHTML="";pt.steps.forEach((st,i)=>{const b=document.createElement("button");b.type="button";b.className="edCell"+(st.on?" on":"")+(st.passes!==15?" skip":"")+(i>=pt.len?" out":"")+(i===selStep?" sel":"");
   b.setAttribute("aria-label",`Step ${i+1}${st.notes.length?": "+st.notes.map(n=>noteName(n.pitch)).join(" "):""}${st.on?"":" (off)"}`);
   const n=document.createElement("span");n.className="n";n.textContent=String(i+1);const t=document.createElement("span");t.className="v";t.textContent=st.notes.length?st.notes.map(x=>noteName(x.pitch)).join(" "):"·";
   b.append(n,t);b.onclick=()=>{selStep=i;drawGrid();drawStep()};g.appendChild(b)})};
  const drawStep=()=>{const box=q("step"),st=pt.steps[selStep];box.innerHTML="";const h=document.createElement("div");h.className="row";
   const title=document.createElement("b");title.textContent=`Step ${selStep+1}`;const on=document.createElement("label"),onb=document.createElement("input");onb.type="checkbox";onb.checked=st.on;on.append(onb," on");
   const sk=document.createElement("span");sk.append("plays on pass");for(let k=0;k<4;k++){const l=document.createElement("label"),c=document.createElement("input");c.type="checkbox";c.checked=!!(st.passes&1<<k);
    c.onchange=()=>{st.passes=c.checked?st.passes|1<<k:st.passes&~(1<<k);commitPat();drawGrid()};l.append(c,String(k+1));sk.append(" ",l)}
   onb.onchange=()=>{st.on=onb.checked;commitPat();drawGrid()};
   const add=document.createElement("input");add.type="text";add.placeholder="Add notes: C4 E4 G4";add.style.width="10em";const ab=document.createElement("button");ab.className="sm2";ab.textContent="Add";
   ab.onclick=()=>{const ps=add.value.trim().split(/[\s,]+/).filter(Boolean).map(parseNote);if(!ps.length||ps.includes(null))return say("Notes are like C4, F#3, Bb2.","bad");
    if(st.notes.length+ps.length>ED_MAX_STEP_NOTES)return say(`A step holds at most ${ED_MAX_STEP_NOTES} notes.`,"bad");
    for(const p of ps)st.notes.push({pitch:p,gate:pt.def.gate??7,vel:pt.def.vel??100,shift:pt.def.shift??49,rand:pt.def.rand??100});st.on=true;if(!st.passes)st.passes=15;commitPat();drawGrid();drawStep()};
   h.append(title,on,sk,add,ab);box.appendChild(h);
   if(st.notes.length){const t=document.createElement("table");t.className="t";t.innerHTML="<thead><tr><th>Note</th><th>Velocity</th><th>Gate</th><th>Time shift (% of a step)</th><th>Randomness %</th><th></th></tr></thead>";const tb=document.createElement("tbody");t.appendChild(tb);
    st.notes.forEach((n,j)=>{const tr=tb.insertRow();const fld=(k,lo,hi,off=0)=>{const i=document.createElement("input");i.type="number";i.min=lo;i.max=hi;i.value=n[k]-off;i.style.width="4.5em";
      i.onchange=()=>{const v=Math.round(+i.value)+off;if(!(v-off>=lo&&v-off<=hi)){i.value=n[k]-off;return say(`${lo} to ${hi}.`,"bad")}n[k]=v;commitPat()};return i};
     const pi=document.createElement("input");pi.type="text";pi.value=noteName(n.pitch);pi.style.width="4em";pi.onchange=()=>{const v=parseNote(pi.value);if(v==null){pi.value=noteName(n.pitch);return say("Notes are like C4, F#3, Bb2.","bad")}n.pitch=v;commitPat();drawGrid()};
     const del=document.createElement("button");del.className="sm2";del.textContent="Remove";del.onclick=()=>{st.notes.splice(j,1);if(!st.notes.length)st.on=false;commitPat();drawGrid();drawStep()};
     const gs=document.createElement("select");for(let g=0;g<128;g++)gs.add(new Option(gateText(g),g));gs.value=n.gate;gs.onchange=()=>{n.gate=+gs.value;commitPat()};
     [pi,fld("vel",0,127),gs,fld("shift",-49,50,49),fld("rand",0,100),del].forEach(x=>tr.insertCell().append(x))});box.appendChild(t)}
   else{const p=document.createElement("p");p.className="pg";p.textContent="No notes on this step.";box.appendChild(p)}};
  const drawScenes=()=>{const box=q("scenes");box.innerHTML="";const t=document.createElement("table");t.className="t";
   t.innerHTML="<thead><tr><th>Scene</th><th>Used</th><th>T1</th><th>T2</th><th>T3</th><th>T4</th><th>Ctrl</th><th>Muted</th><th>Chains (patterns)</th></tr></thead>";const tb=document.createElement("tbody");t.appendChild(tb);
   for(let sc=1;sc<=16;sc++){const s=edReadScene(work,sc),tr=tb.insertRow();tr.insertCell().textContent=String(sc);
    const save=()=>{try{edWriteScene(work,sc,s);dirtyEd=true}catch(e){say(e.message,"bad")}};
    const used=document.createElement("input");used.type="checkbox";used.checked=s.valid;used.setAttribute("aria-label",`Scene ${sc} in use`);used.onchange=()=>{s.valid=used.checked;save()};tr.insertCell().append(used);
    s.pats.forEach((p,ti)=>{const sel=document.createElement("select");sel.setAttribute("aria-label",`Scene ${sc} ${ti<4?"track "+(ti+1):"control track"} pattern`);for(let i=0;i<16;i++)sel.add(new Option(String(i+1),i));sel.value=p;sel.onchange=()=>{s.pats[ti]=+sel.value;s.valid=used.checked=true;save()};tr.insertCell().append(sel)});
    const mu=tr.insertCell();for(let ti=0;ti<4;ti++){const l=document.createElement("label"),c=document.createElement("input");c.type="checkbox";c.checked=!!(s.mute&1<<ti);c.onchange=()=>{s.mute=c.checked?s.mute|1<<ti:s.mute&~(1<<ti);s.valid=used.checked=true;save()};l.append(c,String(ti+1));mu.append(l," ")}
    const ch=document.createElement("input");ch.type="text";ch.style.width="12em";ch.placeholder="e.g. 1:1 2 3  2:4";ch.title="track:patterns, for example 1:1 2 3 2:4 (track 5 = control)";
    ch.value=s.chains.map((c,ti)=>c.length?`${ti+1}:${c.map(x=>x+1).join(" ")}`:"").filter(Boolean).join("  ");
    ch.onchange=()=>{const chains=[[],[],[],[],[]];let cur=-1;for(const tok of ch.value.trim().split(/\s+/).filter(Boolean)){const m=tok.match(/^([1-5]):(\d+)?$/);if(m){cur=+m[1]-1;if(m[2])chains[cur].push(+m[2]-1)}else if(/^\d+$/.test(tok)&&cur>=0)chains[cur].push(+tok-1);else return say(`Chains look like 1:1 2 3 2:4; “${tok}” is not understood.`,"bad")}
     s.chains=chains;s.chainOn=chains.some(c=>c.length);s.valid=used.checked=true;save()};tr.insertCell().append(ch)}
   box.appendChild(t)};
  q("t").onchange=q("pat").onchange=()=>{selStep=0;loadPat()};
  q("len").onchange=()=>{const v=Math.round(+q("len").value);if(!(v>=1&&v<=64)){q("len").value=pt.len;return say("Length is 1–64 steps.","bad")}pt.len=v;commitPat();drawGrid()};
  q("root").onchange=()=>{pt.root=+q("root").value;commitPat()};q("scale").onchange=()=>{pt.scale=+q("scale").value;commitPat()};
  q("apply").onclick=()=>{if(!work)return;delete work.__ix;work.saved=new Date().toISOString();DEV.showProject(work,"Edited in the editor");say("Kept. Send it with the Projects tool above, or add it to the library.","ok");emit("editor:keep");load()};
  q("revert").onclick=()=>{load();say("Back to the loaded project.")};
  DEV.editorLoad=load;load()}};
FEATURES.splice(FEATURES.findIndex(f=>f.id==="projects")+1,0,EDITOR_FEATURE);
