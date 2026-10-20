/* ================= Device tools: SysEx to a real KeyStep Pro (Web MIDI) or to this simulation =================
   Protocol notes are from the firmware 2.5.20 study (~/keysteppro/findings.md) and were checked on hardware.
   Frame: F0 00 20 6B <dev 7F> 42 <cmd> <project 0=current|1..16> <param> ...
   To add a feature once it is solved: append an entry to FEATURES (title, verified, needs, render). */
const PREFIX=[0xF0,0x00,0x20,0x6B,0x7F,0x42];
const frame=(...b)=>[...PREFIX,...b,0xF7];
const hex=a=>[...a].map(x=>x.toString(16).padStart(2,"0").toUpperCase()).join(" ");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const TRACK_ITEMS=[0x7B,0x7C,0x7D,0x7E],STATE_ITEMS=[0x7A,...TRACK_ITEMS];
const P_PATTERN_STATE=0x28,P_MODE=0x56,P_CHORD=0x57,SCENE_ITEM=0x79,P_SCENE_STATE=0x26,CHORD_MODE_BIT=0x10,P_ROOT=0x6B,P_SCALE=0x6C,PROJECT_ITEM=0x78,P_USER1=[0x65,0x66,0x67],P_NAME=0x7C;
const SCALE_IDS={chromatic:0,major:1,minor:2,dorian:3,mixolydian:4,harmonic:5,blues:6,user1:8,user2:9};
/* pattern parameters a default pattern needs before it is marked valid (index shapes from 08009102 / 080093e6) */
const PSINGLE={0x7B:[0x14,0x15,0x16,0x17,0x19,0x1A,0x1B,0x1C,0x61,0x62,0x63,0x64,0x6D,0x6E,0x6F,0x70,0x71,0x72,0x73,0x74,0x75,0x76,0x77,0x78,0x79],other:[0x14,0x15,0x16,0x17,0x61,0x62,0x63,0x64,0x6D,0x6E,0x6F,0x70,0x71]};
const PSTEP={0x7B:[0x30,0x31,0x33,0x34,0x35,0x36],other:[0x30,0x31]},PVOICESTEP=[0x32,0x6D,0x6E,0x6F,0x70,0x71];

class Link{
 async open(p){await this.send(frame(0x05,p))}
 async commit(p){await this.send(frame(0x06,p),{commit:true})}
 async set(p,param,item,idx,data){data=[...data];await this.send(frame(0x0C,p,param,1,item,idx,data.length,...data))}
 async setMany(p,param,item,idxs,data){await this.send(frame(0x0C,p,param,idxs.length,item,...idxs,data.length,...data))}
 async get(p,param,item,idx){const r=await this.getMany(p,param,item,[idx],1);return r?r[0]:null}
 async getMany(p,param,item,idxs,n){const k=idxs.length;for(let tr=0;tr<3;tr++){const rs=await this.send(frame(0x0B,p,param,k,item,...idxs,n),{reply:r=>r[6]===0x0C&&r[7]===p&&r[8]===param&&r[9]===k&&r[10]===item});
   for(const r of rs)if(r[6]===0x0C&&r[7]===p&&r[8]===param&&r[9]===k&&r[10]===item&&idxs.every((x,i)=>r[11+i]===x)&&r[11+k]===n)return [...r.slice(12+k,12+k+n)]}return null}
 async getGlobal(id){const hi=id>=128,cmd=hi?0x31:0x01,ix=hi?id-128:id;for(let tr=0;tr<3;tr++){const rs=await this.send(frame(cmd,0x00,0x41,ix),{reply:r=>r[6]===cmd+1&&r[8]===0x41&&r[9]===ix});
   const r=rs.find(r=>r[6]===cmd+1&&r[8]===0x41&&r[9]===ix);if(r)return r[10]}return null}
 async setGlobal(id,v){const hi=id>=128;await this.send(frame(hi?0x32:0x02,0x00,0x41,hi?id-128:id,v&127))}
 async setName(p,name){const b=[...name].map(c=>c.charCodeAt(0));while(b.length<16)b.push(0);await this.open(p);await this.send(frame(0x0C,p,P_NAME,0x01,PROJECT_ITEM,0x01,0x10,...b))}
 async identity(){const rs=await this.send([0xF0,0x7E,0x7F,0x06,0x01,0xF7],{reply:r=>r[1]===0x7E&&r[3]===0x06&&r[4]===0x02});return rs.find(r=>r[1]===0x7E&&r[4]===0x02)||null}
}
class WebMidiLink extends Link{
 constructor(out,inp){super();this.out=out;this.inp=inp;this.inbox=[];this.part=[];this.sim=false;
  inp.onmidimessage=e=>{const d=e.data;for(const b of d){if(b===0xF0)this.part=[b];else if(this.part.length){this.part.push(b);if(b===0xF7){this.inbox.push(this.part);this.part=[];if(this.wake)this.wake()}}}}}
 /* quiet: skip the per-frame log during whole-project transfers (thousands of frames) */
 async send(bytes,o={}){this.inbox=[];if(!this.quiet)devLog("→ "+hex(bytes),"tx");this.out.send(bytes);
  if(o.commit){await sleep(3000);return this.inbox}
  if(o.reply){await new Promise(res=>{const t=setTimeout(()=>{this.wake=null;res()},500);this.wake=()=>{if(this.inbox.some(o.reply)){clearTimeout(t);this.wake=null;res()}}});
   if(!this.quiet)this.inbox.forEach(r=>devLog("← "+hex(r),"tx"));return this.inbox}
  await sleep(12);return this.inbox}
 close(){this.inp.onmidimessage=null}
}
class SimLink extends Link{constructor(){super();this.sim=true}
 async send(bytes,o={}){if(!this.quiet)devLog("→ "+hex(bytes),"tx");const out=SIMDEV.handle(bytes);if(!this.quiet){out.forEach(r=>devLog("← "+hex(r),"tx"));dirty()}if(o.commit){await sleep(150);dirty()}return out}}
/* the stored chord bytes: root, then signed offsets as 8-bit bytes (a note below the root is 0xF7..0xFF) */
const chordRaw=tr=>{const c=tr.chord;return c.root==null?Array(16).fill(0x7F):[c.root,...c.off.map(o=>o&255),...Array(15-c.off.length).fill(0x7F)]};

/* ---------- the simulated device: answers the same frames from the panel's state ---------- */
/* what a fresh pattern reads on the hardware (backup of 2026-10-20): empty note slots are 0x7F in all six fields;
   step pass mask 0x31 is 15 (plays on all four passes); pattern defaults: swing 25 (= 0), step count 15 (= 16 steps), bits 20, mode 26, pitch 60, gate 7, velocity 100, time shift 49 (= 0), randomness 100 */
const SIM_SLOT_PARAMS=[0x32,0x6D,0x6E,0x6F,0x70,0x71],SIM_STEP_DEFAULTS={0x31:15},SIM_PAT_DEFAULTS={0x61:25,0x62:15,0x63:20,0x64:26,0x6D:60,0x6E:7,0x6F:100,0x70:49,0x71:100};
const SIMDEV={namesFw:true,sess:null,
 handle(b){const out=[];
  if(b[1]===0x7E&&b[3]===0x06&&b[4]===0x01)return [[0xF0,0x7E,0x7F,0x06,0x02,0x00,0x20,0x6B,0x02,0x00,0x09,0x00,0x25,0x14,0x05,0x02,0xF7]];
  if(b.slice(0,6).some((x,i)=>i!==4&&x!==PREFIX[i]))return out;
  const cmd=b[6],p=b[7];
  if((cmd===0x01||cmd===0x31)&&b[8]===0x41){const id=b[9]+(cmd===0x31?128:0);out.push([...PREFIX,cmd+1,0x00,0x41,b[9],S.globals[id]&127,0xF7],[...PREFIX,0x1C,0x00,0xF7]);return out}
  if((cmd===0x02||cmd===0x32)&&b[8]===0x41){const id=b[9]+(cmd===0x32?128:0);if(id>=1&&id<=158){S.globals[id]=b[10];emit("global:"+id)}return out}
  const pn=p===0?S.proj:p-1;
  if(cmd===0x05){this.sess={p:pn,buf:deep(S.flash[pn]),touched:new Set()};return out}
  if(cmd===0x06){this.commit(pn);return out}
  if(cmd===0x0B||cmd===0x0C){const param=b[8],k=b[9],item=b[10],idxs=[...b.slice(11,11+k)],n=b[11+k];
   if(item===PROJECT_ITEM&&param===P_NAME&&cmd===0x0C){if(this.namesFw){const s=String.fromCharCode(...b.slice(12+k,12+k+16)).replace(/\0+$/,"");S.flash[pn].name=s||null;S.ram[pn].name=s||null;emit("dev:name");dirty()}return out}
   if(!this.sess||this.sess.p!==pn)this.sess={p:pn,buf:deep(S.flash[pn]),touched:new Set()};
   const buf=this.sess.buf;
   /* like the device, stored bytes go out unmasked; on the wire 0xF7 ends the SysEx and 0xF8-0xFF are split off as real-time bytes */
   if(cmd===0x0B){const vals=[];for(let j=0;j<n;j++){const ix=idxs.slice();ix[k-1]+=j;vals.push(this.getv(buf,item,param,ix)&255)}
    const wire=[];for(const x of [...PREFIX,0x0C,p,param,k,item,...idxs,n,...vals,0xF7]){if(x>=0xF8)continue;wire.push(x);if(x===0xF7)break}
    out.push(wire,[...PREFIX,0x1C,0x00,0xF7]);return out}
   const data=[...b.slice(12+k,12+k+n)];data.forEach((v,j)=>{const ix=idxs.slice();ix[k-1]+=j;this.setv(buf,item,param,ix,v);this.sess.touched.add(`${item}/${param}/${ix.join(",")}`)});return out}
  return out},
 track(buf,item){return buf.tracks[TRACK_ITEMS.indexOf(item)]},
 /* p0x57: root, then semitone offsets from the root, 0x7F padding (16 bytes) */
 getv(buf,item,param,ix){const [i0]=ix;
  if(item===PROJECT_ITEM){if(P_USER1.includes(param)){const m=buf.user[0],j=P_USER1.indexOf(param);return [m&127,m>>7,0][j]}if([0x68,0x69,0x6A].includes(param)){const m=buf.user[1],j=param-0x68;return [m&127,m>>7,0][j]}return buf.raw[param]||0}
  if(item===SCENE_ITEM&&param===P_SCENE_STATE)return buf.scenes[i0-1]?3:2;
  if(item===0x7A&&param===P_PATTERN_STATE)return buf.ctrl.pats[i0-1].valid?3:2;
  const tr=this.track(buf,item);if(!tr)return buf.raw[item+"/"+param+"/"+ix.join(",")]||0;
  if(param===0x27)return tr.valid?3:2;
  if(param===P_MODE)return (clamp(tr.oct+3,0,7))|(tr.chordOn?CHORD_MODE_BIT:0);
  if(param===P_CHORD)return chordRaw(tr)[i0-1];
  const pat=tr.pats[i0-1];if(!pat)return 0;
  if(param===P_PATTERN_STATE)return pat.valid?3:2;if(param===P_ROOT)return pat.root;if(param===P_SCALE)return pat.scale;
  const key=param+"/"+ix.join(",");if(pat.raw[key]!=null)return pat.raw[key];
  return ix.length===3&&SIM_SLOT_PARAMS.includes(param)?0x7F:ix.length===3&&SIM_STEP_DEFAULTS[param]!=null?SIM_STEP_DEFAULTS[param]:ix.length===1&&SIM_PAT_DEFAULTS[param]!=null?SIM_PAT_DEFAULTS[param]:0},
 setv(buf,item,param,ix,v){const [i0]=ix;
  if(item===PROJECT_ITEM){if(P_USER1.includes(param)){const j=P_USER1.indexOf(param),m=buf.user[0];buf.user[0]=j===0?(m&~127)|v:j===1?(m&127)|((v&31)<<7):m}else if([0x68,0x69,0x6A].includes(param)){const j=param-0x68,m=buf.user[1];buf.user[1]=j===0?(m&~127)|v:j===1?(m&127)|((v&31)<<7):m}else buf.raw[param]=v;return}
  if(item===SCENE_ITEM&&param===P_SCENE_STATE){if(v===3&&!buf.scenes[i0-1])buf.scenes[i0-1]={pat:[0,0,0,0],dpat:0,chain:[[],[],[],[]],dchain:[],mute:[0,0,0,0],solo:-1,track:0};if(v===2)buf.scenes[i0-1]=null;return}
  if(item===0x7A&&param===P_PATTERN_STATE){buf.ctrl.pats[i0-1].valid=v===3;return}
  const tr=this.track(buf,item);if(!tr){buf.raw[item+"/"+param+"/"+ix.join(",")]=v;return}
  if(param===0x27){tr.valid=v===3;return}
  if(param===P_MODE){tr.oct=clamp((v&7)-3,-3,2);tr.chordOn=!!(v&CHORD_MODE_BIT);tr.valid=true;return}
  /* the setter stores the 7-bit value as is, so SysEx can only write offsets above the root */
  if(param===P_CHORD){const raw=chordRaw(tr);raw[i0-1]=v;const end=raw.indexOf(0x7F,1);tr.chord=raw[0]===0x7F?{root:null,off:[]}:{root:raw[0],off:raw.slice(1,end<0?16:end).map(o=>o>127?o-256:o)};tr.valid=true;return}
  const pat=tr.pats[i0-1];if(!pat)return;
  if(param===P_PATTERN_STATE){pat.valid=v===3;return}if(param===P_ROOT){pat.root=v%12;return}if(param===P_SCALE){pat.scale=v;return}
  pat.raw[param+"/"+ix.join(",")]=v},
 /* cmd 06: stock firmware decides every scene/pattern marker from the session header bits, so each marker
    the session did not set flips (valid <-> default). Then the project is reloaded from flash. */
 commit(pn){const s=this.sess&&this.sess.p===pn?this.sess:{p:pn,buf:deep(S.flash[pn]),touched:new Set()},buf=s.buf,T=s.touched;
  for(let i=1;i<=16;i++){const k=`${SCENE_ITEM}/${P_SCENE_STATE}/${i}`;if(!T.has(k))this.setv(buf,SCENE_ITEM,P_SCENE_STATE,[i],buf.scenes[i-1]?2:3)}
  for(const item of STATE_ITEMS)for(let i=1;i<=16;i++){const k=`${item}/${P_PATTERN_STATE}/${i}`;if(T.has(k))continue;
   if(item===0x7A)buf.ctrl.pats[i-1].valid=!buf.ctrl.pats[i-1].valid;else{const pat=this.track(buf,item).pats[i-1];pat.valid=!pat.valid}}
  for(const tr of buf.tracks)tr.pats.forEach((pt,i)=>{if(!pt.valid){const d=newPat();d.raw=pt.raw;tr.pats[i]=d}});
  buf.name=S.flash[pn].name;S.flash[pn]=buf;S.ram[pn]=deep(buf);this.sess=null;mapCache.clear();emit("dev:commit");dirty()}};

/* ---------- write one project: name, chord shape + chord mode, root/scale on all patterns (port of ksp_setlist.py) ---------- */
function chordBytes(shape){const root=shape[0],offs=shape.slice(1).map(n=>n-root);if(root<0||root>127||offs.some(o=>!(o>0&&o<0x7F))||shape.length>16)throw new Error("bad chord shape "+shape.join(" "));return [root,...offs,...Array(16-shape.length).fill(0x7F)]}
function userMaskParts(iv){const mask=[...new Set(iv)].reduce((m,i)=>m|1<<i,0);if(!(mask>0&&mask<0x1000&&mask&1))throw new Error("bad user scale");return [mask&0x7F,mask>>7,0]}
async function readStates(link,p){const keys=[];for(let i=1;i<=16;i++)keys.push([SCENE_ITEM,P_SCENE_STATE,i]);for(const it of STATE_ITEMS)for(let i=1;i<=16;i++)keys.push([it,P_PATTERN_STATE,i]);
 const m=new Map();for(const k of keys)m.set(k.join("/"),await link.get(p,k[1],k[0],k[2]));return m}
async function readPatternDefaults(link,p,item,pat){const key=item===0x7B?0x7B:"other",out=[];
 for(const pr of PSINGLE[key])out.push([pr,[pat],await link.getMany(p,pr,item,[pat],1)]);
 for(const pr of PSTEP[key])out.push([pr,[pat,1],await link.getMany(p,pr,item,[pat,1],64)]);
 for(const pr of PVOICESTEP)for(let v=1;v<=3;v++)out.push([pr,[pat,v,1],await link.getMany(p,pr,item,[pat,v,1],64)]);
 return out.some(x=>x[2]==null)?null:out}
async function writeProject(link,song){const p=song.project,problems=[],tracks=song.tracks.map(t=>t.n),chord=song.shape?chordBytes(song.shape):null;
 await link.open(p);const states=await readStates(link,p);if([...states.values()].includes(null))return ["no reply reading pattern states"];
 const modes={};for(const t of tracks){modes[t]=await link.get(p,P_MODE,TRACK_ITEMS[t-1],1);if(modes[t]==null)return ["no reply reading track modes"]}
 const keyed=song.tracks.filter(t=>t.scale&&t.scale!=="chromatic"),defaults={};
 for(const t of keyed){const item=TRACK_ITEMS[t.n-1];const pat=[...Array(16).keys()].map(i=>i+1).find(i=>states.get(`${item}/${P_PATTERN_STATE}/${i}`)===2);
  if(pat!=null){defaults[item]=await readPatternDefaults(link,p,item,pat);if(!defaults[item])return [`no reply reading default pattern content (track ${t.n})`]}}
 if(chord)for(const t of tracks){const item=TRACK_ITEMS[t-1];for(let i=0;i<16;i++)await link.set(p,P_CHORD,item,i+1,[chord[i]]);await link.set(p,P_MODE,item,1,[modes[t]|CHORD_MODE_BIT])}
 const target=new Map(states);
 for(const t of keyed){const item=TRACK_ITEMS[t.n-1];for(let pat=1;pat<=16;pat++){if(states.get(`${item}/${P_PATTERN_STATE}/${pat}`)===2&&defaults[item])for(const [pr,path,vals] of defaults[item])await link.setMany(p,pr,item,[pat,...path.slice(1)],vals);
   await link.set(p,P_ROOT,item,pat,[t.root]);await link.set(p,P_SCALE,item,pat,[SCALE_IDS[t.scale]]);target.set(`${item}/${P_PATTERN_STATE}/${pat}`,3)}
  if(t.scale==="user1"){const parts=userMaskParts(t.userMask);for(let j=0;j<3;j++)await link.set(p,P_USER1[j],PROJECT_ITEM,1,[parts[j]])}}
 for(const [k,v] of target){const [item,param,i]=k.split("/").map(Number);await link.set(p,param,item,i,[v])}
 await link.commit(p);
 await link.open(p);
 if(chord)for(const t of tracks){const item=TRACK_ITEMS[t-1];const got=[];for(let i=1;i<=16;i++)got.push(await link.get(p,P_CHORD,item,i));if(got.join()!==chord.join())problems.push(`track ${t} chord reads ${got.join(" ")}`);
  const md=await link.get(p,P_MODE,item,1);if(md==null||!(md&CHORD_MODE_BIT))problems.push(`track ${t} chord mode reads ${md}`)}
 for(const t of keyed){const item=TRACK_ITEMS[t.n-1];for(let pat=1;pat<=16;pat++){const r=await link.get(p,P_ROOT,item,pat),s=await link.get(p,P_SCALE,item,pat);if(r!==t.root||s!==SCALE_IDS[t.scale])problems.push(`track ${t.n} pattern ${pat} root/scale reads ${r}/${s}`)}}
 const after=await readStates(link,p);for(const [k,v] of after)if(v!==target.get(k))problems.push(`state ${k} reads ${v}, expected ${target.get(k)}`);
 if(song.title)await link.setName(p,displayName(song.title));
 return problems}
const NAME_OVERRIDES={"Friday I'm in Love":"Friday In Love","World Loves Violence":"World Loves Viol"};
function displayName(t){const n=NAME_OVERRIDES[t]||t;if(n.length<1||n.length>16||!/^[\x20-\x7E]+$/.test(n))throw new Error(`name “${n}” must be 1–16 printable ASCII characters`);return n}

/* ---------- whole project: MCC's recall plan (BULK, 1c-bulk.js), read and written value for value ----------
   One request at a time: the device drops replies with 4 or more GETs in flight (2026-10-20). Reads return the
   saved project. Store sends every scene/pattern state from the file, so the commit quirk flips nothing. */
const PROJECT_FORMAT="keystep-pro-project";
function bulkPlan(){const out=[];for(const [lo,hi,item,dims,n,params] of BULK)for(let I=lo;I<=hi;I++){
  let paths=[[]];for(const d of dims)paths=paths.flatMap(p=>d.map(x=>[...p,x==="I"?I:x]));
  for(const path of paths)for(const prm of params)out.push([item,prm,path,n])}return out}
/* Stop: checked between requests; a store stopped before its commit leaves the slot unchanged */
const stopCheck=()=>{if(DEV.stop)throw new Error("stopped")};
async function quietly(link,fn){link.quiet=true;try{return await fn()}finally{link.quiet=false;dirty()}}
async function readProject(link,p,prog=()=>{}){const plan=bulkPlan(),data=[];
 return quietly(link,async()=>{await link.open(p);
  const fail=(prm,item,path)=>new Error(`no reply reading project ${p} (item ${item}, param ${prm}, index ${path.join(",")})`);
  for(let i=0;i<plan.length;i++){stopCheck();const [item,prm,path,n]=plan[i];let v=await link.getMany(p,prm,item,path,n);if(v==null)throw fail(prm,item,path);
   /* the getter sends stored bytes unmasked: 0xF7 ends the frame early and 0xF8-0xFF are split off as real-time bytes.
      Re-read such a block value by value and keep what cannot be read as null (seen: chord notes below the root). */
   if(v.length<n||v.some(x=>x>127)){const one=[];for(let j=0;j<n;j++){const ix=path.slice();ix[ix.length-1]+=j;const r=n===1?v:await link.getMany(p,prm,item,ix,1);if(r==null)throw fail(prm,item,ix);one.push(r.length===1&&r[0]<=127?r[0]:null)}v=one}
   data.push([item,prm,path,v]);if(i%64===0)prog(i/plan.length)}
  prog(1);return {format:PROJECT_FORMAT,version:1,firmware:"2.5.20",project:p,name:null,saved:new Date().toISOString(),data}})}
function checkProjectFile(f){if(!f||f.format!==PROJECT_FORMAT||f.version!==1||!Array.isArray(f.data))throw new Error("not a KeyStep Pro project file from this page");
 const plan=bulkPlan();if(f.data.length!==plan.length)throw new Error(`project file has ${f.data.length} blocks, expected ${plan.length}`);
 f.data.forEach(([item,prm,path,v],i)=>{const q=plan[i];if(item!==q[0]||prm!==q[1]||path.join()!==q[2].join()||!Array.isArray(v)||v.length!==q[3]||v.some(x=>x!==null&&!(x>=0&&x<=127)))throw new Error(`project file block ${i+1} does not match the recall plan`)});return f}
/* Data-state flags (project/scene/track/pattern) go last. A track sent over SysEx always reads back valid (3) even when
   the file says default (2); its values are the file's, so verify accepts that (hardware, 2026-10-20).
   MCC lists params 55 and 56 for indexes past the last track; the firmware does not store those and reads back filler. */
const STATE_PARAMS=[0x25,P_SCENE_STATE,0x27,P_PATTERN_STATE],UNSTORED=new Set(["120/55/5","120/56/4","120/56/5"]);
/* returns a list of problems; empty = every value read back as written.
   Values the recall could not read (null) are not sent. A chord with an unreadable byte is not sent at all: the SET
   stores 7 bits, so a note below the root cannot be written over SysEx either (emulated 2026-10-20). */
async function storeProject(link,p,f,{verify=true,prog=()=>{}}={}){checkProjectFile(f);const N=f.data.length,problems=[];
 const badChord=new Set(f.data.filter(e=>e[1]===P_CHORD&&e[3].includes(null)).map(e=>e[0]));
 for(const item of badChord)problems.push(`${item===0x7A?"control track":"track "+(TRACK_ITEMS.indexOf(item)+1)} chord not sent: it has a note below its root, which SysEx cannot carry. Enter it again on the device.`);
 const skip=e=>e[1]===P_CHORD&&badChord.has(e[0]);
 const order=[...f.data.filter(e=>!STATE_PARAMS.includes(e[1])),...f.data.filter(e=>STATE_PARAMS.includes(e[1]))];
 await quietly(link,async()=>{await link.open(p);
  for(let i=0;i<N;i++){stopCheck();const e=order[i],[item,prm,path,v]=e;if(i%64===0)prog(verify?i/N/2:i/N);if(skip(e))continue;
   if(!v.includes(null)){await link.setMany(p,prm,item,path,v);continue}
   for(let j=0;j<v.length;j++)if(v[j]!==null){const ix=path.slice();ix[ix.length-1]+=j;await link.setMany(p,prm,item,ix,[v[j]])}}
  await link.commit(p)});
 if(f.name)await link.setName(p,displayName(f.name));
 if(!verify){prog(1);return problems}
 const back=await readProject(link,p,x=>prog(.5+x/2));
 back.data.forEach(([item,prm,path,v],i)=>{const w=f.data[i][3];if(skip(f.data[i])||v.every((x,j)=>x===w[j]||w[j]===null)||prm===0x27&&w[0]===2&&v[0]===3||UNSTORED.has(`${item}/${prm}/${path.join(",")}`))return;problems.push(`item ${item} param ${prm} [${path.join(",")}] reads ${v.join(" ")}, wrote ${f.data[i][3].join(" ")}`)});
 return problems}
/* a short description of a project file: which patterns and scenes hold data, chords */
function projectSummary(f){const get=(item,prm,i0)=>{const e=f.data.find(([it,pr,path])=>it===item&&pr===prm&&path[0]===i0);return e?e[3][0]:null};
 const pats=t=>[...Array(16).keys()].filter(i=>get(TRACK_ITEMS[t],P_PATTERN_STATE,i+1)===3).length;
 const scenes=[...Array(16).keys()].filter(i=>get(SCENE_ITEM,P_SCENE_STATE,i+1)===3).length;
 /* offsets end at 0 (entered on the device) or 0x7F (written over SysEx); null = a note below the root, unreadable */
 const chord=t=>{const item=TRACK_ITEMS[t],c=[...Array(16).keys()].map(i=>get(item,P_CHORD,i+1));if(c[0]==null||c[0]===0x7F)return "";
  const offs=[];for(const o of c.slice(1)){if(o===0||o===0x7F)break;offs.push(o)}
  return " chord "+[nm(c[0]),...offs.map(o=>o==null?"(below root)":nm(c[0]+o))].join(" ")+(get(item,P_MODE,1)&CHORD_MODE_BIT?" (on)":" (off)")};
 return [0,1,2,3].map(t=>`track ${t+1}: ${pats(t)} pattern${pats(t)===1?"":"s"}${chord(t)}`).join("; ")+`; ${scenes} scene${scenes===1?"":"s"}`}
function saveJSON(obj,fname){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(obj)],{type:"application/json"}));a.download=fname;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000)}
const fileSafe=s=>s.replace(/[^\w .-]+/g,"").trim()||"project";

/* ---------- backup: several projects (and the global settings) in one file ---------- */
const BACKUP_FORMAT="keystep-pro-backup";
async function readBackup(link,projects,{globals=true,prog=()=>{}}={}){
 const b={format:BACKUP_FORMAT,version:1,firmware:"2.5.20",saved:new Date().toISOString(),globals:null,projects:[]},parts=projects.length+(globals?.05:0);
 if(globals){b.globals={};await quietly(link,async()=>{for(const [i,g] of GLOBALS.entries()){stopCheck();b.globals[g.id]=await link.getGlobal(g.id);prog(i/GLOBALS.length*.05/parts)}})}
 const base=globals?.05:0;
 for(const [i,p] of projects.entries())b.projects.push(await readProject(link,p,x=>prog((base+i+x)/parts)));
 prog(1);return b}
function checkBackupFile(b){if(!b||b.format!==BACKUP_FORMAT||b.version!==1||!Array.isArray(b.projects))throw new Error("not a KeyStep Pro backup file from this page");
 b.projects.forEach(checkProjectFile);if(new Set(b.projects.map(f=>f.project)).size!==b.projects.length)throw new Error("backup lists a project twice");return b}
/* restores the chosen projects to their own slots; returns {project: problems[]} plus "globals" if asked */
async function restoreBackup(link,b,projects,{globals=false,verify=true,prog=()=>{}}={}){checkBackupFile(b);const res={},list=b.projects.filter(f=>projects.includes(f.project));
 const parts=list.length+(globals&&b.globals?.05:0);
 for(const [i,f] of list.entries())res[f.project]=await storeProject(link,f.project,f,{verify,prog:x=>prog((i+x)/parts)});
 if(globals&&b.globals){const bad=[];await quietly(link,async()=>{const ids=Object.keys(b.globals).map(Number).filter(id=>b.globals[id]!=null);
  for(const [i,id] of ids.entries()){stopCheck();await link.setGlobal(id,b.globals[id]);if(verify){const rb=await link.getGlobal(id);if(rb!==b.globals[id])bad.push(`global ${id} reads ${rb}, wrote ${b.globals[id]}`)}prog((list.length+i/ids.length*.05)/parts)}});res.globals=bad}
 prog(1);return res}

/* ---------- project library: project files kept in this browser (IndexedDB; a project file is ~0.5 MB) ---------- */
const LIB={db:null};
function libOpen(){if(LIB.db)return Promise.resolve(LIB.db);return new Promise((res,rej)=>{if(!window.indexedDB)return rej(new Error("this browser has no IndexedDB here"));
 const r=indexedDB.open("ksp-library",1);r.onupgradeneeded=()=>r.result.createObjectStore("projects",{keyPath:"id",autoIncrement:true});
 r.onsuccess=()=>res(LIB.db=r.result);r.onerror=()=>rej(new Error("the library could not be opened: "+(r.error&&r.error.message)))})}
async function libTx(mode,fn){const db=await libOpen();return new Promise((res,rej)=>{const t=db.transaction("projects",mode),st=t.objectStore("projects"),r=fn(st);
 t.oncomplete=()=>res(r&&r.result);t.onerror=t.onabort=()=>rej(new Error("library: "+(t.error&&t.error.message)))})}
const libList=()=>libTx("readonly",st=>st.getAll());
const libGet=id=>libTx("readonly",st=>st.get(id));
/* entries: {id, name, added, source, file}; the file is checked before it goes in */
const libAdd=async(file,name,source)=>{checkProjectFile(file);return libTx("readwrite",st=>st.add({name:String(name).slice(0,60)||"Untitled",added:new Date().toISOString(),source:String(source||"").slice(0,120),file}))};
const libRename=async(id,name)=>{const e=await libGet(id);if(!e)throw new Error("not in the library");e.name=String(name).slice(0,60)||e.name;return libTx("readwrite",st=>st.put(e))};
const libDelete=id=>libTx("readwrite",st=>st.delete(id));
/* a project file adds one entry, a backup file one per project */
async function libImport(obj,fname){if(obj&&obj.format===BACKUP_FORMAT){checkBackupFile(obj);for(const f of obj.projects)await libAdd(f,`P${f.project}${f.name?" "+f.name:""} (backup ${obj.saved.slice(0,10)})`,fname);return obj.projects.length}
 checkProjectFile(obj);await libAdd(obj,obj.name||`P${obj.project} (${obj.saved.slice(0,10)})`,fname);return 1}

/* ---------- feature registry ---------- */
const FEATURES=[
 {id:"globals",title:"Global settings (all 158 IDs)",verified:"2026-10-18: full read of all globals on hardware; writes tested with Brightness (152).",needs:null,
  about:"Every Utility setting, including the ones MCC does not show: Program Change Send and Fixed Velocity per track, Brightness and Transpose Latch. A SET gets no reply, so the tool reads the value back.",
  render(el){el.innerHTML=`<p class="pg">The values are read from the KeyStep Pro when you connect; until then the menus are empty.</p><div class="row"><button class="sm" data-a="readall">Read all</button><label><input type="checkbox" data-a="hid"> only the settings MCC hides</label></div><div class="gtab"><table class="t"><thead><tr><th>ID</th><th>Setting</th><th>Value</th></tr></thead><tbody></tbody></table></div>`;
   const tb=el.querySelector("tbody"),hidBox=el.querySelector("[data-a=hid]");
   const draw=()=>{tb.innerHTML="";let grp="";for(const g of GLOBALS){if(hidBox.checked&&!g.hidden)continue;if(g.g!==grp){grp=g.g;tb.insertAdjacentHTML("beforeend",`<tr><th colspan="3">${grp}</th></tr>`)}
     const tr=document.createElement("tr");const v=DEV.gvals[g.id];const opts=optsOf({id:g.id});
     tr.innerHTML=`<td>${g.id}</td><td>${g.n}</td><td><select ${v==null?"disabled":""}>${v==null?"<option>–</option>":opts.map(o=>`<option value="${o[0]}" ${o[0]===v?"selected":""}>${o[1]}</option>`).join("")}</select></td>`;
     tr.querySelector("select").onchange=async e=>{const nv=+e.target.value;await busy(async()=>{await DEV.link.setGlobal(g.id,nv);const rb=await DEV.link.getGlobal(g.id);DEV.gvals[g.id]=rb;devLog(`global ${g.id} ${g.n} = ${rb}${rb===nv?"":" (expected "+nv+")"}`,rb===nv?"ok":"bad")});draw()};tb.appendChild(tr)}};
   DEV.globalsDraw=draw;hidBox.onchange=draw;el.querySelector("[data-a=readall]").onclick=()=>busy(async()=>{let n=0;for(const g of GLOBALS){if(hidBox.checked&&!g.hidden)continue;DEV.gvals[g.id]=await DEV.link.getGlobal(g.id);if(DEV.gvals[g.id]!=null)n++}devLog(`read ${n} settings`,"ok");emit("dev:read");draw()});draw()}},
 {id:"names",title:"Project names",verified:"2026-10-19: the name shows on the device, survives a power cycle and Save Project; Erase Project clears it.",needs:"the project-names firmware (KeyStepPro_2.5.20_project_names.kspf). Stock 2.5.20 ignores this message.",
  about:"Writes a 1–16 character name for one project slot. The name belongs to the slot: saving another project into it keeps the slot's name.",
  render(el){el.innerHTML=`<div class="row">Project <select data-a="p">${[...Array(16).keys()].map(i=>`<option value="${i+1}">${i+1}</option>`).join("")}</select><input type="text" data-a="n" maxlength="16" placeholder="Name (16 max)"><button class="sm" data-a="go">Send</button></div>`;
   el.querySelector("[data-a=go]").onclick=()=>busy(async()=>{const p=+el.querySelector("[data-a=p]").value,n=displayName(el.querySelector("[data-a=n]").value.trim());await DEV.link.setName(p,n);devLog(`project ${p} named “${n}”`,"ok");if(!DEV.link.sim)emit("dev:name")})}},
 {id:"trackkey",title:"Chord and key per track",verified:"2026-10-19: chords, chord mode and root/scale written and read back on projects 2–15; played by ear on project 15.",needs:null,
  about:"Writes a track's chord shape and turns chord mode on, and sets root and scale on all 16 of its patterns. It re-sends every pattern's state first, because a stock SysEx commit flips every state it was not given, and fills default patterns with clean default content before marking them valid. Then it reads everything back. The device reloads the project from flash afterwards, so save any panel edits on that project first.",
  render(el){el.innerHTML=`<div class="row">Project <select data-a="p">${[...Array(16).keys()].map(i=>`<option value="${i+1}">${i+1}</option>`).join("")}</select> Track <select data-a="t"><option>1</option><option selected>2</option><option>3</option><option>4</option></select></div>
   <div class="row">Chord <input type="text" data-a="c" value="E3 G#3 B3" title="Note names, the first is the root; empty = leave the chord alone"> Root <select data-a="r">${NN.map((n,i)=>`<option value="${i}" ${i===4?"selected":""}>${n}</option>`).join("")}</select> Scale <select data-a="s">${["chromatic","major","minor","dorian","mixolydian","harmonic","blues"].map(s=>`<option ${s==="major"?"selected":""}>${s}</option>`).join("")}</select></div>
   <div class="row"><button class="sm" data-a="go">Write and verify</button><button class="sm" data-a="rd">Read saved chord</button></div>`;
   const parse=s=>s.trim()?s.trim().split(/[\s,]+/).map(x=>{const m=x.match(/^([A-Ga-g])(#|b)?(-?\d)$/);if(!m)throw new Error("note “"+x+"” (use e.g. E3, G#3)");return 12*(+m[3]+1)+NN.indexOf(m[1].toUpperCase())+(m[2]==="#"?1:m[2]==="b"?-1:0)}):null;
   el.querySelector("[data-a=go]").onclick=()=>busy(async()=>{const p=+el.querySelector("[data-a=p]").value,t=+el.querySelector("[data-a=t]").value,shape=parse(el.querySelector("[data-a=c]").value),sc=el.querySelector("[data-a=s]").value;
    const song={project:p,shape,tracks:[{n:t,root:+el.querySelector("[data-a=r]").value,scale:sc}]};const pr=await writeProject(DEV.link,song);
    devLog(pr.length?"PROBLEM: "+pr.join("; "):`project ${p} track ${t}: written and verified`,pr.length?"bad":"ok");if(!pr.length)emit("dev:trackkey")});
   el.querySelector("[data-a=rd]").onclick=()=>busy(async()=>{const p=+el.querySelector("[data-a=p]").value,t=+el.querySelector("[data-a=t]").value,item=TRACK_ITEMS[t-1];await DEV.link.open(p);
    const c=[];for(let i=1;i<=16;i++)c.push(await DEV.link.get(p,P_CHORD,item,i));const md=await DEV.link.get(p,P_MODE,item,1);
    const notes=c[0]===0x7F||c[0]==null?"none":[c[0],...c.slice(1).filter(x=>x!==0x7F).map(o=>c[0]+(o>63?o-128:o))].map(nm).join(" ");devLog(`saved chord P${p} T${t}: ${notes}; chord mode ${md!=null&&md&CHORD_MODE_BIT?"ON":"OFF"} (bytes ${c.map(x=>x==null?"--":x.toString(16)).join(" ")})`,"ok")})}},
 {id:"setlist",title:"Set list writer",verified:"2026-10-19: 14 Band Keys songs written to projects 1–14 (names, chords, keys) and verified by readback.",needs:"names need the project-names firmware; chords and keys work on stock 2.5.20.",
  about:"Paste or load a plan exported by tools/bandkeys_plans.js (a list of {project, title, shape, tracks:[{n, root, scale}]}) and write every project in it.",
  render(el){el.innerHTML=`<div class="row"><input type="file" accept=".json,application/json" data-a="f"><button class="sm" data-a="go">Write all</button></div><textarea data-a="j" placeholder='[{"project":15,"title":"Test","shape":[64,68,71],"tracks":[{"n":1,"root":4,"scale":"major"}]}]'></textarea>`;
   el.querySelector("[data-a=f]").onchange=async e=>{const f=e.target.files[0];if(f)el.querySelector("[data-a=j]").value=await f.text()};
   el.querySelector("[data-a=go]").onclick=()=>busy(async()=>{const songs=JSON.parse(el.querySelector("[data-a=j]").value||"[]");let bad=0;
    for(const s of songs){if(!(s.project>=1&&s.project<=16))throw new Error(`${s.title}: project ${s.project} out of range`);const pr=await writeProject(DEV.link,s);bad+=!!pr.length;devLog(`P${s.project} ${s.title?displayName(s.title):""}: ${pr.length?"PROBLEM: "+pr.join("; "):"OK"}`,pr.length?"bad":"ok")}
    devLog(bad?`${bad} project(s) had problems`:`${songs.length} project(s) written and verified`,bad?"bad":"ok")})}},
 {id:"projects",title:"Projects: recall, save to file, send",verified:"2026-10-20: project 15 recalled (36 s) and matched an independent read; sent to project 16 and played the same; project 16 restored from its file.",needs:null,
  about:"What MIDI Control Center does with a project, value for value: Recall reads a saved project from the device using MCC's own list of parameters (under a minute over USB). Save it as a file, open it later, and send it to any project slot. Sending replaces everything in that slot and reads it all back to check (about three minutes). The name is kept in the file and sent with it if the project-names firmware is installed. One limit of the firmware's SysEx, so MCC has it too: a chord entered on the device with a note below its first note cannot be read or written over SysEx. Such a chord is marked in the file and not sent, and the target slot keeps its own chord on that track.",
  render(el){const opts=[...Array(16).keys()].map(i=>`<option value="${i+1}">${i+1}</option>`).join("");
   el.innerHTML=`<div class="row">Project <select data-a="p">${opts}</select><button class="sm" data-a="rc">Recall from device</button> or open a file <input type="file" accept=".json,application/json" data-a="f"></div>
   <div class="row"><progress data-a="pg" max="1" value="0"></progress><span data-a="st"></span></div>
   <div class="row" data-a="sum">No project loaded.</div>
   <div class="row">Name <input type="text" data-a="nm" maxlength="16" placeholder="(optional)"><button class="sm" data-a="sv">Save to file</button></div>
   <div class="row">Send to project <select data-a="to">${opts}</select><label><input type="checkbox" data-a="vf" checked> read back to verify</label><button class="sm" data-a="go">Send to device</button></div>`;
   const q=a=>el.querySelector(`[data-a=${a}]`),go=q("go");let cur=null,armT=0;
   const prog=x=>{q("pg").value=x;q("st").textContent=` ${Math.round(x*100)}%`};
   const show=(f,src)=>{cur=DEV.project=f;q("nm").value=f.name||"";q("to").value=f.project;q("sum").textContent=`${src}: ${projectSummary(f)}`;if(DEV.editorLoad)DEV.editorLoad();if(DEV.midiLoad)DEV.midiLoad()};
   DEV.showProject=show; /* the library loads into this tool */
   q("rc").onclick=()=>busy(async()=>{const p=+q("p").value,t0=performance.now();prog(0);const f=await readProject(DEV.link,p,prog);
    show(f,`Project ${p}, recalled`);devLog(`project ${p} recalled: ${f.data.length} blocks in ${((performance.now()-t0)/1000).toFixed(1)} s`,"ok");emit("dev:recall")});
   q("f").onchange=async e=>{const file=e.target.files[0];if(!file)return;try{show(checkProjectFile(JSON.parse(await file.text())),file.name);devLog(`opened ${file.name}`,"ok")}catch(err){devLog("Error: "+err.message,"bad")}};
   q("sv").onclick=()=>{if(!cur){devLog("Recall a project or open a file first.","bad");return}try{const n=q("nm").value.trim();cur.name=n?displayName(n):null;
    saveJSON(cur,`KeyStep Pro P${cur.project} ${fileSafe(cur.name||"")} ${cur.saved.slice(0,10)}.json`.replace(/\s+/g," "))}catch(err){devLog("Error: "+err.message,"bad")}};
   /* two clicks to overwrite a slot, no browser dialog */
   const disarm=()=>{clearTimeout(armT);armT=0;go.textContent="Send to device"};
   go.onclick=()=>{if(!cur){devLog("Recall a project or open a file first.","bad");return}const to=+q("to").value;
    if(!armT){go.textContent=`Click again to replace project ${to}`;armT=setTimeout(disarm,4000);return}disarm();
    busy(async()=>{const n=q("nm").value.trim();cur.name=n?displayName(n):null;prog(0);const t0=performance.now();
     const pr=await storeProject(DEV.link,to,cur,{verify:q("vf").checked,prog});const s=((performance.now()-t0)/1000).toFixed(1);
     devLog(pr.length?`PROBLEM: ${pr.length} value(s) differ after sending to project ${to}: ${pr.slice(0,5).join("; ")}${pr.length>5?" …":""}`:`project ${to} written${q("vf").checked?" and verified":""} in ${s} s`,pr.length?"bad":"ok");if(!pr.length)emit("dev:store")})}}},
 {id:"library",title:"Project library (this browser)",verified:"Browser only, no device messages; tested in the simulation.",needs:null,
  about:"Keeps project files in this browser so they are at hand without file dialogs. Add the project loaded in the Projects tool above, or import project and backup files (a backup adds each of its projects). Load puts an entry back into the Projects tool, ready to send. The library lives in this browser profile only: export important projects as files too.",
  render(el){el.innerHTML=`<div class="row"><input type="text" data-a="nm" maxlength="60" placeholder="Name for the entry"><button class="sm2" data-a="add">Add the loaded project</button><label class="sm2 filebtn">Import files<input type="file" data-a="f" accept=".json,application/json" multiple hidden></label></div>
   <div data-a="list" class="pg">Opening the library…</div>`;
   const q=a=>el.querySelector(`[data-a=${a}]`),list=q("list");
   const draw=async()=>{let items;try{items=await libList()}catch(e){list.textContent="The library is not available: "+e.message;return}
    list.innerHTML="";if(!items.length){list.textContent="The library is empty.";return}
    items.sort((a,b)=>b.added.localeCompare(a.added));const t=document.createElement("table");t.className="t";list.appendChild(t);
    for(const it of items){const tr=t.insertRow(),c1=tr.insertCell(),c2=tr.insertCell(),c3=tr.insertCell();
     const b=document.createElement("b");b.textContent=it.name;c1.append(b,document.createElement("br"),`P${it.file.project} · added ${it.added.slice(0,16).replace("T"," ")}${it.source?" · "+it.source:""}`);
     c2.textContent=projectSummary(it.file);c2.className="pg";
     for(const [label,fn] of [["Load",()=>{if(!DEV.showProject)return devLog("Open the Device tools tab first.","bad");DEV.showProject(it.file,`Library “${it.name}”`);devLog(`loaded “${it.name}” into Projects`,"ok");emit("lib:load")}],
       ["Rename",async()=>{const n=q("nm").value.trim();if(!n)return devLog("Type the new name in the name box first.","bad");await libRename(it.id,n);q("nm").value="";draw()}],
       ["Save file",()=>saveJSON(it.file,`KeyStep Pro ${fileSafe(it.name)}.json`)],
       ["Delete",async()=>{await libDelete(it.id);devLog(`deleted “${it.name}” from the library`);draw()}]]){
      const bt=document.createElement("button");bt.className="sm2";bt.textContent=label;bt.onclick=()=>Promise.resolve(fn()).catch(e=>devLog("Error: "+e.message,"bad"));c3.append(bt," ")}}};
   q("add").onclick=async()=>{if(!DEV.project)return devLog("Recall a project or open a file in the Projects tool first.","bad");
    try{const n=q("nm").value.trim()||DEV.project.name||`P${DEV.project.project} (${DEV.project.saved.slice(0,10)})`;await libAdd(DEV.project,n,"Projects tool");q("nm").value="";devLog(`added “${n}” to the library`,"ok");emit("lib:add");draw()}catch(e){devLog("Error: "+e.message,"bad")}};
   q("f").onchange=async e=>{let n=0;for(const file of e.target.files){try{n+=await libImport(JSON.parse(await file.text()),file.name)}catch(err){devLog(`${file.name}: ${err.message}`,"bad")}}e.target.value="";if(n)devLog(`added ${n} project(s) to the library`,"ok");draw()};
   DEV.libDraw=draw;draw()}},
 {id:"backup",title:"Backup: all projects in one file",verified:"2026-10-20: all 16 projects and the settings backed up in 9.7 min; project 16 restored from it and verified. Restoring global settings is tested only in the simulation.",needs:null,
  about:"Recalls all 16 projects, plus the global settings, into one file (about ten minutes; Stop ends it early with nothing saved). Restore sends the projects you tick back to their own slots and checks each one, about three minutes per project. Global settings are restored only if you ask. Project names are not in the backup: the firmware has no way to read them back. A few stored bytes cannot be read over SysEx (seen in never-used parts of a project); restore leaves those as they are in the slot.",
  render(el){el.innerHTML=`<div class="row"><button class="sm" data-a="bk">Back up all 16</button><label><input type="checkbox" data-a="gl" checked> include global settings</label></div>
   <div class="row"><progress data-a="pg" max="1" value="0"></progress><span data-a="st"></span></div>
   <div class="row">Open a backup <input type="file" accept=".json,application/json" data-a="f"></div>
   <div data-a="sum" class="pg">No backup loaded.</div>
   <div class="row"><span class="pick" data-a="pick"></span></div>
   <div class="row"><button class="sm" data-a="all">All</button><button class="sm" data-a="none">None</button><label><input type="checkbox" data-a="rg"> restore global settings</label><label><input type="checkbox" data-a="vf" checked> read back to verify</label><button class="sm" data-a="go">Restore ticked projects</button></div>`;
   const q=a=>el.querySelector(`[data-a=${a}]`),go=q("go");let cur=null,armT=0;
   const prog=x=>{q("pg").value=x;q("st").textContent=` ${Math.round(x*100)}%`};
   const show=(b,src)=>{cur=b;q("sum").innerHTML="";const h=document.createElement("div");h.textContent=`${src}: ${b.projects.length} projects${b.globals?" and the global settings":""}, saved ${b.saved.slice(0,16).replace("T"," ")}`;q("sum").appendChild(h);
    for(const f of b.projects){const d=document.createElement("div");d.textContent=`P${f.project}: ${projectSummary(f)}`;q("sum").appendChild(d)}
    q("pick").innerHTML=b.projects.map(f=>`<label><input type="checkbox" value="${f.project}" checked> ${f.project}</label>`).join("")};
   const ticked=()=>[...q("pick").querySelectorAll("input:checked")].map(i=>+i.value);
   q("all").onclick=()=>q("pick").querySelectorAll("input").forEach(i=>i.checked=true);q("none").onclick=()=>q("pick").querySelectorAll("input").forEach(i=>i.checked=false);
   q("bk").onclick=()=>busy(async()=>{const t0=performance.now();prog(0);const b=await readBackup(DEV.link,[...Array(16).keys()].map(i=>i+1),{globals:q("gl").checked,prog});
    show(b,"Backup");saveJSON(b,`KeyStep Pro backup ${b.saved.slice(0,16).replace("T"," ").replace(":","-")}.json`);
    const nul=b.projects.filter(f=>f.data.some(e=>e[3].includes(null))).map(f=>f.project);
    devLog(`backup of 16 projects saved in ${((performance.now()-t0)/60000).toFixed(1)} min${nul.length?`; projects ${nul.join(", ")} have a chord with a note below its root, which cannot be restored over SysEx`:""}`,nul.length?"bad":"ok");emit("dev:backup")});
   q("f").onchange=async e=>{const file=e.target.files[0];if(!file)return;try{show(checkBackupFile(JSON.parse(await file.text())),file.name);devLog(`opened ${file.name}`,"ok")}catch(err){devLog("Error: "+err.message,"bad")}};
   const disarm=()=>{clearTimeout(armT);armT=0;go.textContent="Restore ticked projects"};
   go.onclick=()=>{if(!cur){devLog("Back up or open a backup first.","bad");return}const ps=ticked();if(!ps.length&&!q("rg").checked){devLog("Tick at least one project.","bad");return}
    if(!armT){go.textContent=`Click again to replace ${ps.length} project${ps.length===1?"":"s"}${q("rg").checked?" and the settings":""}`;armT=setTimeout(disarm,4000);return}disarm();
    busy(async()=>{const t0=performance.now();prog(0);const res=await restoreBackup(DEV.link,cur,ps,{globals:q("rg").checked,verify:q("vf").checked,prog});let bad=0;
     for(const [k,pr] of Object.entries(res)){bad+=!!pr.length;devLog(`${k==="globals"?"global settings":"P"+k}: ${pr.length?"PROBLEM: "+pr.slice(0,3).join("; ")+(pr.length>3?" …":""):"OK"}`,pr.length?"bad":"ok")}
     devLog(`restore finished in ${((performance.now()-t0)/60000).toFixed(1)} min${bad?`, ${bad} with problems`:""}`,bad?"bad":"ok");if(!bad)emit("dev:restore")})}}},
];

/* ---------- the tab ---------- */
const DEV={link:null,gvals:{},busy:false,stop:false,ports:null};
function devLog(s,cls=""){const box=$("#devLog");if(!box)return;const d=document.createElement("div");d.className=cls;d.textContent=s;box.appendChild(d);while(box.childNodes.length>400)box.firstChild.remove();box.scrollTop=box.scrollHeight}
async function busy(fn){if(!DEV.link){devLog("Connect first.","bad");return}if(DEV.busy)return;DEV.busy=true;DEV.stop=false;document.querySelectorAll("#paneDev button.sm").forEach(b=>b.disabled=true);
 try{await fn()}catch(e){devLog("Error: "+e.message,"bad")}finally{DEV.busy=false;document.querySelectorAll("#paneDev button.sm").forEach(b=>b.disabled=false)}}
/* the connection controls live in the top bar, so they work before Device tools is opened */
function devBindBar(){$("#devScanBtn").onclick=devScan;$("#devStopBtn").onclick=()=>{if(DEV.busy){DEV.stop=true;devLog("Stopping…")}};
 $("#devConnBtn").onclick=()=>devConnect().catch(e=>{devLog("Error: "+e.message,"bad");devStatus("Error: "+e.message,"bad")})}
function devStatus(text,cls){const st=$("#devState");st.innerHTML="";const p=document.createElement("span");p.className="pill "+cls;p.textContent=text;st.appendChild(p)}
async function devConnect(){const sel=$("#devPort").value;if(DEV.link&&DEV.link.close)DEV.link.close();DEV.link=null;DEV.gvals={};
 if(sel==="sim"){DEV.link=new SimLink();if($("#simNames"))SIMDEV.namesFw=$("#simNames").checked}
 else{const [oi,ii]=sel.split("|");const out=[...DEV.ports.outputs.values()].find(o=>o.id===oi),inp=[...DEV.ports.inputs.values()].find(i=>i.id===ii);if(!out||!inp){devLog("Port not found.","bad");return}DEV.link=new WebMidiLink(out,inp)}
 const id=await DEV.link.identity();if(id){const v=id.slice(12,16);devLog(`Connected: Arturia family ${id[8]}, firmware ${v[3]}.${v[2]}.${v[1]} (build byte 0x${v[0].toString(16)})${DEV.link.sim?" — simulated":""}`,"ok");devStatus(DEV.link.sim?"simulation":`KeyStep Pro ${v[3]}.${v[2]}.${v[1]}`,DEV.link.sim?"sim":"real");
  await busy(async()=>{devLog("Reading the global settings…");let n=0;await quietly(DEV.link,async()=>{for(const g of GLOBALS){DEV.gvals[g.id]=await DEV.link.getGlobal(g.id);if(DEV.gvals[g.id]!=null)n++}});devLog(`read ${n} global settings`,"ok")});
  if(DEV.globalsDraw)DEV.globalsDraw();emit("dev:connect")}
 else{devLog("No identity reply. Check the ports and that SysEx permission was granted.","bad");devStatus("no reply","bad");DEV.link=null}}
async function devScan(){const s=$("#devPort");s.innerHTML='<option value="sim">Simulated KeyStep Pro</option>';
 if(!navigator.requestMIDIAccess){devLog("This browser has no Web MIDI (use Chrome or Edge; Firefox needs the site permission add-on).","bad");return}
 try{DEV.ports=await navigator.requestMIDIAccess({sysex:true})}catch(e){devLog("SysEx access was refused: "+e.message,"bad");return}
 const outs=[...DEV.ports.outputs.values()],ins=[...DEV.ports.inputs.values()];
 for(const o of outs){const i=ins.find(x=>x.name===o.name)||ins.find(x=>/keystep/i.test(x.name))||ins[0];if(!i)continue;const opt=new Option(o.name===i.name?o.name:`${o.name} ⇄ ${i.name}`,o.id+"|"+i.id);s.add(opt);if(/keystep/i.test(o.name))s.value=opt.value}
 devLog(`${outs.length} MIDI output(s) found`)}
/* Device tools open under the keyboard (#devWide, the wide left column); the right column keeps a jump list */
/* tools shown in the right-column box with the instructions instead of under the keyboard */
const FEATURE_SIDE=new Set(["midifile"]);
const FEATURE_ORDER=["projects","midifile","editor","library","backup","setlist","trackkey","names","globals"],FEATURE_KEY=new Set(["midifile"]);
const FEATURE_SHORT={projects:"Projects",midifile:"MIDI file import / export",editor:"Step editor",library:"Library",backup:"Backup",setlist:"Set list",trackkey:"Chord & key",names:"Names",globals:"Global settings"};
function featJump(id){const box=$("#feat-"+id);if(!box)return;const c=$("#devCol").contains(box)?$("#devCol"):$("#sideCol");if(c&&c.contains(box)&&c.scrollTo)c.scrollTo({top:Math.max(0,box.offsetTop-c.offsetTop-8),behavior:"smooth"});else box.scrollIntoView({behavior:"smooth"})}
function featNav(){const nav=document.createElement("div");nav.className="featNav";nav.setAttribute("role","navigation");nav.setAttribute("aria-label","Device tools");
 for(const f of FEATURES){const b=document.createElement("button");b.type="button";b.textContent=FEATURE_SHORT[f.id]||f.title.split(":")[0];if(FEATURE_KEY.has(f.id))b.className="hi";b.onclick=()=>featJump(f.id);nav.appendChild(b)}return nav}
function renderDevice(){const pane=$("#paneDev");if(pane.dataset.built)return;pane.dataset.built=1;
 FEATURES.sort((a,b)=>FEATURE_ORDER.indexOf(a.id)-FEATURE_ORDER.indexOf(b.id));$("#devWide").appendChild(pane);
 pane.innerHTML=`<div class="card"><h2>Device tools</h2>
  <p class="pg">Talks SysEx to a KeyStep Pro on USB (Chrome/Edge, Web MIDI with SysEx permission) or to the simulated one in this page. Everything here was worked out from firmware 2.5.20 and tested on hardware; new tools are added as they are solved. Unofficial: back up your projects with MIDI Control Center before writing.</p>
  <div class="feat"><div class="row small">Connect with the KeyStep controls in the top bar (pick a port, then Connect).</div>
  <div class="row small"><label><input type="checkbox" id="simNames" checked> simulation runs the project-names firmware</label></div></div>
  <div data-a="nav"></div><div id="featList"></div><h3>Log</h3><div id="devLog"></div></div>`;
 pane.querySelector("[data-a=nav]").appendChild(featNav());
 const note=$("#paneDevNote");note.innerHTML=`<h2>Device tools</h2><p class="pg">MIDI file import and export are right here. The other tools are open under the keyboard, where there is room to edit.</p>`;
 $("#simNames").onchange=e=>{SIMDEV.namesFw=e.target.checked};
 const list=$("#featList");for(const f of FEATURES){const box=document.createElement("div");box.className="feat"+(FEATURE_KEY.has(f.id)?" key":"");box.id="feat-"+f.id;box.innerHTML=`<h3>${f.title}</h3><div class="meta"><b>Verified</b> ${f.verified}${f.needs?` <span class="need">Needs ${f.needs}</span>`:""}</div><p class="pg">${f.about}</p><div class="body"></div>`;(FEATURE_SIDE.has(f.id)?note:list).appendChild(box);f.render(box.querySelector(".body"))}
 const jp=document.createElement("p");jp.className="pg";jp.textContent="Jump to a tool under the keyboard:";note.append(jp,featNav())}
