/* ================= Project editor: steps, notes, pattern settings and scenes of a project file =================
   Works on the open project (DEV.project, a file from readProject) and sends nothing itself: Store writes the edited file
   (the editor screens are in 8-studio.js). Layout from the firmware setter 0800d3c0 and MCC's recall plan:
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
/* drum patterns (track 1 in drum mode), from the firmware setter 0800d900 and a beat saved on a KeyStep Pro (2026-10-20):
   per lane a 64-step on mask (0x34, index lane*10 + byte, 7 steps per byte) and a length (0x33, [pattern, 1, lane]);
   192 hit slots like the sequencer's: 0x36 step, 0x75 lane 0-23, 0x76-0x79 gate/velocity/time shift/randomness, 0x35 pass mask,
   filled from slot 0 lane by lane. An empty slot holds 127 in every field; a slot with any other lane counts as used, and with
   192 of those every new hit says "192 notes limit" until the pattern is erased on the device. Drum mode is bit 0x40 of 0x56. */
const DR_P={len:0x73,laneLen:0x33,mask:0x34,pass:0x35,step:0x36,lane:0x75,gate:0x76,vel:0x77,shift:0x78,rand:0x79};
const DR_NOTE=["lane","gate","vel","shift","rand"],DRUM_LANES=24,DRUM_MODE_BIT=0x40,DRUM_ITEM=0x7B;
function edReadDrum(f,pat){const g=(p,path)=>edGet(f,DRUM_ITEM,p,path);
 const dp={len:(g(DR_P.len,[pat])??15)+1,laneLen:Array.from({length:DRUM_LANES},(_,l)=>(g(DR_P.laneLen,[pat,1,l+1])??15)+1),hits:[],unreadable:0};
 for(let s=0;s<ED_SLOTS;s++){const path=slotPath(pat,s),st=g(DR_P.step,path);if(st===null){dp.unreadable++;continue}if(st===ED_EMPTY||st==null||st>63)continue;
  const h=Object.fromEntries(DR_NOTE.map(k=>[k,g(DR_P[k],path)]));h.step=st;h.pass=g(DR_P.pass,path)??15;
  if(DR_NOTE.some(k=>h[k]==null)||h.lane>=DRUM_LANES){dp.unreadable++;continue}dp.hits.push(h)}
 return dp}
function edWriteDrum(f,pat,dp){const s=(p,path,v)=>edSet(f,DRUM_ITEM,p,path,v),hits=dp.hits.slice().sort((a,b)=>a.lane-b.lane||a.step-b.step);
 if(hits.length>ED_SLOTS)throw new Error(`${hits.length} drum hits in the pattern; the KeyStep Pro holds ${ED_SLOTS}`);
 if(!(dp.len>=1&&dp.len<=64))throw new Error("pattern length is 1–64 steps");
 hits.forEach((h,i)=>{if(!(h.lane>=0&&h.lane<DRUM_LANES&&h.step>=0&&h.step<64))throw new Error("a drum hit is outside 24 lanes × 64 steps");
  if(i&&hits[i-1].lane===h.lane&&hits[i-1].step===h.step)throw new Error(`lane ${h.lane+1} has two hits on step ${h.step+1}`)});
 s(P_PATTERN_STATE,[pat],3);s(DR_P.len,[pat],dp.len-1);dp.laneLen.forEach((n,l)=>s(DR_P.laneLen,[pat,1,l+1],n-1));
 const mask=Array(DRUM_LANES*10).fill(0);hits.forEach(h=>{mask[h.lane*10+Math.floor(h.step/7)]|=1<<h.step%7});mask.forEach((v,i)=>s(DR_P.mask,slotPath(pat,i),v));
 hits.forEach((h,i)=>{const path=slotPath(pat,i);s(DR_P.step,path,h.step);s(DR_P.pass,path,h.pass??15);DR_NOTE.forEach(k=>s(DR_P[k],path,h[k]))});
 for(let i=hits.length;i<ED_SLOTS;i++){const path=slotPath(pat,i);s(DR_P.step,path,ED_EMPTY);s(DR_P.pass,path,15);DR_NOTE.forEach(k=>s(DR_P[k],path,ED_EMPTY))}}
function edSetDrumMode(f,on){const m=edGet(f,DRUM_ITEM,P_MODE,[1])??0;edSet(f,DRUM_ITEM,P_MODE,[1],on?m|DRUM_MODE_BIT:m&~DRUM_MODE_BIT)}
/* empty drum slots as the device writes them (127 everywhere). Untouched patterns carry lane 60 there: harmless while the
   pattern is marked default (the device resets it on load, hardware 2026-10-20), but in a pattern marked as holding data
   (track 1's sequencer patterns share the marker) every slot counts as used. */
function drumFixEmpty(f){let n=0;for(let pat=1;pat<=16;pat++)if(edGet(f,DRUM_ITEM,P_PATTERN_STATE,[pat])===3)for(let s=0;s<ED_SLOTS;s++){const path=slotPath(pat,s);
  if(edGet(f,DRUM_ITEM,DR_P.step,path)!==ED_EMPTY)continue;for(const k of DR_NOTE){const v=edGet(f,DRUM_ITEM,DR_P[k],path);if(v!==undefined&&v!==ED_EMPTY){edSet(f,DRUM_ITEM,DR_P[k],path,ED_EMPTY);n++}}}
 return n}
/* drum map (globals 81-106): Chromatic plays Low Note + lane, Custom plays Note 1-24; the stored values are MIDI notes */
const drumMapNotes=gl=>Array.from({length:DRUM_LANES},(_,l)=>gl[81]?gl[83+l]:gl[82]+l);
/* sequencer steps to drum hits: each note lands on the lane that plays it; fold moves other notes by octaves onto the map */
function stepsToDrum(pt,notes,fold=false){const lane=new Map();notes.forEach((n,l)=>{if(!lane.has(n))lane.set(n,l)});
 const find=p=>{if(lane.has(p))return lane.get(p);if(!fold)return null;for(let k=1;k<11;k++)for(const q of [p-12*k,p+12*k])if(lane.has(q))return lane.get(q);return null};
 const hits=[],missed=new Map();let doubled=0;
 pt.steps.forEach((st,i)=>{if(!st.on||i>=pt.len||!st.passes)return;for(const n of st.notes){const l=find(n.pitch);if(l==null){missed.set(n.pitch,(missed.get(n.pitch)||0)+1);continue}
  if(hits.some(h=>h.lane===l&&h.step===i)){doubled++;continue}hits.push({lane:l,step:i,gate:n.gate,vel:n.vel,shift:n.shift,rand:n.rand,pass:st.passes})}});
 return {dp:{len:pt.len,laneLen:Array(DRUM_LANES).fill(pt.len),hits},missed,doubled}}
/* bass from a recorded part (like the Orchid's bass voice, but written as steps): each step with notes is a chord; its root
   is the note with a fifth and a third above it (the lowest note wins close calls, so inversions keep their written bass).
   Root, Root + 5th, Octaves and Pulse play one bass line per chord change; Follow plays the root on every step the part plays. */
const BASS_STYLES=[["root","Root"],["fifth","Root + 5th"],["oct","Octaves"],["pulse","Pulse"],["follow","Follow rhythm"]];
function chordRoot(pitches){const ps=[...new Set(pitches)].sort((a,b)=>a-b),pcs=new Set(ps.map(p=>p%12)),has=(r,i)=>pcs.has((r+i)%12);let best=null,bs=-1;
 ps.forEach((p,k)=>{const r=p%12,sc=(has(r,7)?3:0)+(has(r,3)||has(r,4)?2:0)+(has(r,10)||has(r,11)?1:0)+(k?0:1.5);if(sc>bs){bs=sc;best=r}});
 const r=best,fifth=has(r,7)?7:has(r,6)&&has(r,3)?6:has(r,8)&&has(r,4)?8:7;return {root:r,fifth}}
function makeBass(src,style,octave=2){const ev=[];
 src.steps.forEach((st,i)=>{if(!st.on||i>=src.len||!st.passes||!st.notes.length)return;const c=chordRoot(st.notes.map(n=>n.pitch)),n0=st.notes[0];
  ev.push({step:i,...c,vel:Math.max(...st.notes.map(n=>n.vel)),gate:n0.gate,shift:n0.shift,rand:n0.rand,passes:st.passes})});
 if(!ev.length)throw new Error("That pattern has no notes to make a bass line from.");
 const chords=style==="follow"?ev:ev.filter((e,k)=>!k||e.root!==ev[k-1].root||e.fifth!==ev[k-1].fifth);
 const steps=Array.from({length:64},()=>({on:false,passes:15,notes:[]})),base=12*(octave+1);
 const put=(i,pitch,len,e)=>{const st=steps[i];st.on=true;st.passes=e.passes;st.notes.push({pitch:clamp(pitch,0,127),gate:Graw(len),vel:e.vel,shift:e.shift,rand:e.rand??100})};
 chords.forEach((e,k)=>{const span=(k+1<chords.length?chords[k+1].step:src.len)-e.step,r=base+e.root;
  if(style==="follow")return put(e.step,r,gateSteps(e.gate),e);
  if(style==="root")return put(e.step,r,span,e);
  if(style==="fifth"){const h=span>=2?Math.floor(span/2):span;put(e.step,r,h,e);if(h<span)put(e.step+h,r+e.fifth,span-h,e);return}
  for(let j=0;j<span;j++)put(e.step+j,style==="oct"&&j%2?r+12:r,.5,e)});
 return {len:src.len,root:src.root,scale:src.scale,steps,notes:steps.reduce((a,s)=>a+s.notes.length,0)}}
const noteName=p=>p==null?"?":nm(p);
function parseNote(s){const m=String(s).trim().match(/^([A-Ga-g])(#|b)?(-?\d)$/);if(!m)return null;const v=12*(+m[3]+1)+NN.indexOf(m[1].toUpperCase())+(m[2]==="#"?1:m[2]==="b"?-1:0);return v>=0&&v<=127?v:null}
