/* ================= data model ================= */
const newStep=()=>({n:[],on:false,skip:[0,0,0,0]});
const newDStep=()=>({on:false,g:.5,v:100,t:0,r:100,skip:[0,0,0,0]});
const newPat=()=>({valid:false,len:16,div:2,trip:false,dir:0,poly:true,scale:0,root:0,arp:0,arpOct:0,swOff:0,st:Array.from({length:64},newStep),raw:{}});
const newDrumPat=()=>({valid:false,len:16,div:2,trip:false,dir:0,poly:false,swOff:0,lanes:Array.from({length:24},()=>({len:16,st:Array.from({length:64},newDStep)})),raw:{}});
const newCtrlPat=()=>({valid:false,len:16,st:Array.from({length:64},()=>({cc:[null,null,null,null,null]})),raw:{}});
const newTrack=t=>({mode:"seq",pats:Array.from({length:16},newPat),cur:0,chain:[],chord:{root:null,off:[]},chordOn:false,oct:0,valid:false,raw:{}});
function newProject(){return {name:null,bpm:120,swing:50,tracks:[0,1,2,3].map(newTrack),drum:{pats:Array.from({length:16},newDrumPat),cur:0,chain:[]},
 ctrl:{pats:Array.from({length:16},newCtrlPat),cur:0},scenes:Array.from({length:16},()=>null),user:[0xFFF,0xFFF],raw:{}}}
const GDEF=new Int16Array(160);GLOBALS.forEach(g=>GDEF[g.id]=g.d);GDEF[153]=1;GDEF[152]=1;GDEF[143]=1;GDEF[144]=1;GDEF[145]=1;GDEF[146]=1;GDEF[142]=1;
[0,1,2,3,4].forEach(i=>GDEF[28+i]=74+i); // the manual's defaults: Pitch 74 … Randomness 78
GDEF[82]=36; // Drum Map low note: a MIDI note, 36 on a KeyStep Pro (live read 2026-10-18; the MCC file says 0)
GDEF[74]=GDEF[79]=9; // drum channel 10 (0-based 9, as the device reports; the MCC file says 10)

/* track defaults (what the encoders set when no step is held) */
const newDefaults=()=>({p:60,g:.5,v:100,t:0,r:100});
const newArpParams=()=>({g:.5,vo:0,t:0,r:0});
let S,P,HELD,LATCH;
function baseState(){
 S={proj:0,ram:Array.from({length:16},newProject),flash:null,globals:Int16Array.from(GDEF),cur:0,
  playing:false,paused:false,rec:false,quant:true,metro:false,stepEdit:false,overdub:false,sel:null,selNotes:null,
  hold:[0,0,0,0],arpHeld:[[],[],[],[]],arpLatched:[[],[],[],[]],mute:[0,0,0,0],solo:-1,drumMute:Array(24).fill(0),drumMuteMode:false,
  trans:[0,1,2,3].map(()=>({semi:0,on:false})),tgroup:new Set(),transMode:false,
  view:[0,0,0,0,0],follow:true,control:false,ctrlTrack:0,cc:[64,64,64,64,64],knobLabels:[null,null,null,null,null],mod:[0,0,0,0],
  defs:[0,1,2,3].map(newDefaults),drumDefs:newDefaults(),arpP:[0,1,2,3].map(newArpParams),
  menu:null,confirm:null,msg:null,msgT:0,copy:null,undo:null,globalBpm:false,gbpm:120,waitLoad:true,looper:null,looperOn:true,
  lane:0,chordEntry:null,taps:[],stopTaps:[],cvr:[1,2,4,8],split:null,lastNote:60,rootSel:false,userEdit:null,stepRecPos:0,patMode:null,
  sceneCur:-1,keysDown:new Map(),recPending:new Map()};
 S.flash=S.ram.map(deep);
 P=[0,1,2,3,4].map(()=>({idx:0,cnt:0,next:0,pend:null,chainPos:0,lanes:Array(24).fill(0).map(()=>({idx:0,cnt:0}))}));
 HELD=new Map();LATCH=new Set();
}
const proj=()=>S.ram[S.proj];
const trk=(t=S.cur)=>proj().tracks[t];
const isDrum=(t=S.cur)=>t===0&&trk(0).mode==="drum";
const curPat=(t=S.cur)=>isDrum(t)?proj().drum.pats[proj().drum.cur]:trk(t).pats[trk(t).cur];
const patIdx=(t=S.cur)=>isDrum(t)?proj().drum.cur:trk(t).cur;
const bpm=()=>S.globalBpm?S.gbpm:proj().bpm;
const held=id=>HELD.has(id);
const fvId=t=>t===0?(isDrum(0)?154:155):155+t;
const pcId=t=>t===0?(isDrum(0)?142:143):143+t;
const outCh=t=>{const c=isDrum(t)?S.globals[79]:S.globals[75+t];return c>15?null:c};

/* ---------- scale maps ---------- */
const mapCache=new Map();
function scaleMask(t=S.cur){const p=curPat(t);if(isDrum(t))return 0;const s=p.scale;if(s===8)return proj().user[0];if(s===9)return proj().user[1];return SCALES[s]?SCALES[s][1]:0xFFF}
function noteMap(t=S.cur){if(isDrum(t))return null;const m=scaleMask(t),r=curPat(t).root,k=m+"/"+r;let v=mapCache.get(k);if(!v){v=buildMap(m===0xFFF?0:m,r);mapCache.set(k,v)}return v}
const q=(t,n)=>{n=clamp(n,0,127);const m=noteMap(t);return m?m[n]:n};
/* scale-aware step: move a note to the next/previous note of the scale */
function scaleStep(t,n,d){const mask=scaleMask(t),r=curPat(t).root;if(!mask||mask===0xFFF)return clamp(n+d,0,127);
 const inS=x=>(mask>>(((x-r)%12+12)%12))&1;let x=n;for(let i=0;i<Math.abs(d);i++){do{x+=Math.sign(d)}while(x>0&&x<127&&!inS(x))}return clamp(x,0,127)}

/* ---------- messages / events ---------- */
function msg(t,ms=1200){S.msg=t;S.msgT=performance.now()+ms;dirty()}
const LISTEN=[];function emit(ev){for(const f of LISTEN)f(ev)}

/* ---------- timing ---------- */
const stepTicks=p=>DIVS[p.div][1]*(p.trip?2/3:1);
const stepDur=p=>60/bpm()*stepTicks(p)/96;
function swingDelay(t,p,cnt){const sw=clamp(proj().swing+(p.swOff||0),50,75);return cnt%2?(sw-50)/50*stepDur(p):0}
let T0=0;const now=()=>performance.now()/1000;

function play(){ensureAC();if(S.playing&&!S.paused){S.paused=true;allOff();emit("pause");dirty();return}
 if(S.paused){S.paused=false;const t=now()+.03;P.forEach(p=>p.next=t);metroNext=t;emit("play");dirty();return}
 S.playing=true;S.paused=false;const t=now()+.05;T0=t;P.forEach(p=>{p.idx=0;p.cnt=0;p.next=t;p.chainPos=0;p.lanes.forEach(l=>{l.idx=0;l.cnt=0})});
 [0,1,2,3].forEach(i=>{const c=i===0&&isDrum(0)?proj().drum.chain:trk(i).chain;if(c.length)setPat(i,c[0],true)});
 metroNext=t;metroCnt=0;arpStartAll(t);emit("play");dirty()}
function stop(){const t=performance.now();S.stopTaps=S.stopTaps.filter(x=>t-x<700);S.stopTaps.push(t);if(S.stopTaps.length>=3){allOff(true);msg("All Notes Off");S.stopTaps=[]}
 S.playing=false;S.paused=false;if(S.rec==="rt")S.rec=false;P.forEach(p=>{p.idx=0;p.cnt=0;p.pend=null});S.looper=null;allOff();emit("stop");dirty()}
function restart(){if(!S.playing){play();return}const t=now()+.03;P.forEach(p=>{p.idx=0;p.cnt=0;p.next=t;p.lanes.forEach(l=>{l.idx=0;l.cnt=0})});metroNext=t;metroCnt=0;emit("restart")}

/* scheduled notes so stop / pause can cut them */
const SCHED=[];
function playNote(t,midi,vel,t0,t1){const v=voice(t,midi,vel,t0,t1);if(v)SCHED.push({v,end:t1});midiNote(t,midi,vel,t0,t1);flash(t,midi,t0,t1)}
function allOff(midiToo){for(const s of SCHED)s.v.stop(AC?AC.currentTime:0);SCHED.length=0;for(const v of LIVE)liveOff(v);NOTEFLASH.length=0;if(midiToo)midiAllOff()}
const NOTEFLASH=[];function flash(t,midi,t0,t1){NOTEFLASH.push({t,midi,t0,t1})}

/* ---------- the clock: a Blob worker ticks every 10 ms, rAF also calls advance() ---------- */
let metroNext=0,metroCnt=0;
const metroDivs=[[96,1],[64,1],[48,1],[32,1],[24,1],[16,1],[12,1],[8,1]];
function advance(){const n=now(),la=n+.12;
 for(let i=SCHED.length-1;i>=0;i--)if(SCHED[i].end<n-1)SCHED.splice(i,1);
 for(let i=NOTEFLASH.length-1;i>=0;i--)if(NOTEFLASH[i].t1<n)NOTEFLASH.splice(i,1);
 arpAdvance(la);
 if(!S.playing||S.paused)return;
 for(let t=0;t<4;t++){const p=P[t];let guard=0;while(p.next<la&&guard++<64){playTrackStep(t,p.next);p.next+=stepDur(curPat(t))}}
 {const p=P[4],cp=proj().ctrl.pats[proj().ctrl.cur];let guard=0;while(p.next<la&&guard++<64){playCtrlStep(cp,p);p.next+=60/bpm()/4}}
 if(S.metro){const md=metroDivs[S.globals[116]]||[24];const d=60/bpm()*md[0]/96;let g=0;while(metroNext<la&&g++<64){const beats=S.globals[115]+1;click(metroCnt%beats===0,metroNext);metroCnt++;metroNext+=d}}
 else metroNext=Math.max(metroNext,n);
}
function nextIdx(p,idx,len){if(p.dir===1)return rnd(len);if(p.dir===2){const r=Math.random();return r<.5?(idx+1)%len:r<.75?idx:(idx-1+len)%len}return (idx+1)%len}
function patEnd(t){const p=P[t];// end of a pattern pass: chains and wait-to-load
 const tr=trk(t),chain=t===0&&isDrum(0)?proj().drum.chain:tr.chain;
 if(p.pend!=null){setPat(t,p.pend,true);p.pend=null;return}
 if(chain.length>1){p.chainPos=(p.chainPos+1)%chain.length;setPat(t,chain[p.chainPos],true)}}
function playTrackStep(t,time){const p=P[t],pat=curPat(t);
 if(S.looper&&S.looper.start[t]!=null){const L=S.looper,len=Math.max(1,Math.round(L.beats*96/stepTicks(pat)));if(p.cnt-L.start[t]>=len){p.idx=L.idx[t];p.cnt=L.start[t]}}
 const cnt=p.cnt,idx=p.idx,tt=time+swingDelay(t,pat,cnt),dur=stepDur(pat),pageIt=Math.floor(cnt/16)%4;
 const audible=!(S.solo>=0?S.solo!==t:S.mute[t]);
 if(isDrum(t))playDrumStep(pat,tt,dur,audible);
 else if(trk(t).mode==="seq"){const st=pat.st[idx];
  if(st.on&&st.n.length&&!st.skip[pageIt]&&audible){let notes=st.n;if(!pat.poly)notes=[notes.reduce((a,b)=>b.p<a.p?b:a)];
   const tr=S.trans[t].on?S.trans[t].semi:0;
   for(const nt of notes){if(Math.random()*100>=nt.r)continue;const pitch=q(t,nt.p+tr),t0=tt+nt.t/100*dur;playNote(t,pitch,nt.v,t0,t0+Math.max(.03,nt.g*dur*.98))}}
  if(S.rec==="rt"&&held("tie")){pat.st[idx]=newStep();pat.valid=true}}
 /* advance */
 p.idx=nextIdx(pat,idx,pat.len);p.cnt++;if(pat.dir===0?p.idx===0:p.cnt%pat.len===0)patEnd(t);
 if(t===S.cur&&S.follow&&!isDrum(t))S.view[t]=Math.floor(p.idx/16);if(t===0&&isDrum(0)&&S.follow)S.view[4]=Math.floor(p.idx/16);
 S.playIdx=S.playIdx||[];S.playIdx[t]={idx,time:tt};
}
function playDrumStep(pat,tt,dur,audible){const p=P[0];
 for(let l=0;l<24;l++){const lane=pat.lanes[l],ls=p.lanes[l],len=pat.poly?lane.len:pat.len,idx=pat.poly?ls.idx%len:p.idx,st=lane.st[idx],pageIt=Math.floor((pat.poly?ls.cnt:p.cnt)/16)%4;
  if(st.on&&!st.skip[pageIt]&&audible&&!S.drumMute[l]&&Math.random()*100<st.r){const t0=tt+st.t/100*dur;drum(l,st.v,t0);midiDrum(l,st.v,t0,t0+st.g*dur);NOTEFLASH.push({t:0,drum:l,t0,t1:t0+.08})}
  if(pat.poly){ls.idx=nextIdx(pat,ls.idx,len);ls.cnt++}}
 if(S.rec==="rt"&&held("tie")){for(const l of pat.lanes)l.st[p.idx]=newDStep()}}
function playCtrlStep(cp,p){const idx=p.idx,st=cp.st[idx];if(S.playing){st.cc.forEach((v,i)=>{if(v!=null){S.cc[i]=v;midiCC(i,v)}})}p.idx=(p.idx+1)%cp.len;p.cnt++}

/* ---------- arpeggiators (run whenever notes are held, even when stopped) ---------- */
const ARP=[0,1,2,3].map(()=>({next:0,i:0,seq:[],dirn:1,running:false}));
function arpNotes(t){return S.hold[t]?S.arpLatched[t]:S.arpHeld[t]}
function arpSeq(t){const pat=curPat(t),base=arpNotes(t).slice();if(!base.length)return [];
 const oct=pat.arpOct-1;// -1..+3
 const sorted=base.slice().sort((a,b)=>a.p-b.p);let list=[];
 const octs=oct<0?[-1,0]:Array.from({length:oct+1},(_,i)=>i);
 const mode=ARPS[pat.arp];
 const src=mode==="Order"?base:sorted;
 for(const o of octs)for(const n of src)list.push({p:n.p+12*o,v:n.v});
 if(mode==="Down")list.reverse();
 if(mode==="Exclu"&&list.length>2)list=list.concat(list.slice(1,-1).reverse());
 if(mode==="Inclu")list=list.concat(list.slice().reverse());
 if(mode==="Poly")list=octs.map(o=>({chord:src.map(n=>({p:n.p+12*o,v:n.v}))}));
 return list}
function arpStartAll(t0){ARP.forEach((a,t)=>{if(a.running){a.next=t0;a.i=0}})}
function arpAdvance(la){for(let t=1;t<4;t++){const tr=trk(t);const a=ARP[t];if(tr.mode!=="arp"||!arpNotes(t).length){a.running=false;continue}
  const pat=curPat(t),dur=stepDur(pat),ap=S.arpP[t];
  if(!a.running){a.running=true;a.i=0;a.cnt=0;a.next=S.playing&&!S.paused?Math.max(now()+.01,P[t].next):now()+.01}
  let g=0;while(a.next<la&&g++<32){const list=arpSeq(t);if(!list.length)break;const it=list[a.i%list.length];a.i++;
   const audible=!(S.solo>=0?S.solo!==t:S.mute[t]),tt=a.next+swingDelay(t,pat,a.cnt||0)+ap.t/100*dur;a.cnt=(a.cnt||0)+1;
   const tr2=S.trans[t].on?S.trans[t].semi:0,notes=it.chord||[it];
   for(const n of notes){let pitch=n.p+tr2;if(ap.r>0&&Math.random()*100<ap.r)pitch+=[-12,-7,-5,5,7,12][rnd(6)];
    const v=clamp(n.v+ap.vo,0,127);if(v<=0)continue;pitch=q(t,pitch);if(audible)playNote(t,pitch,v,tt,tt+Math.max(.03,ap.g*dur));
    if(S.rec==="rt"&&S.playing&&t===S.cur)recordNote(t,pitch,v,tt,ap.g)}
   if(S.playing&&S.rec!=="rt"&&!S.paused){}
   a.next+=dur}}}

/* ---------- patterns, chains ---------- */
function setPat(t,i,now_){if(isDrum(t)&&t===0)proj().drum.cur=i;else trk(t).cur=i;mapCache.clear&&0;emit(`pattern:${t}:${i}`);dirty();
 const pc=curPatPC(t);if(pc!=null&&S.globals[pcId(t)])midiPC(t,pc)}
function curPatPC(t){const p=curPat(t);return p.pc==null?null:p.pc}
function choosePat(t,i){const tr=trk(t);if(t===0&&isDrum(0))proj().drum.chain=[];else tr.chain=[];
 if(S.playing&&S.waitLoad)P[t].pend=i;else setPat(t,i,true)}

/* ---------- recording ---------- */
function curDefaults(t=S.cur){const d=isDrum(t)?S.drumDefs:S.defs[t];return d}
function noteFromDefaults(t,p,v){const d=curDefaults(t);const vel=S.globals[fvId(t)]?d.v:v;return {p,g:d.g,v:vel,t:d.t,r:d.r}}
function recordNote(t,pitch,vel,time,gate){const pat=curPat(t),p=P[t],dur=stepDur(pat);
 // position relative to the step that is playing now
 const last=S.playIdx&&S.playIdx[t];let idx,ts;if(!last){idx=0;ts=0}else{const rel=(time-last.time)/dur;let k=Math.round(rel);ts=Math.round((rel-k)*100);idx=((last.idx+k)%pat.len+pat.len)%pat.len}
 if(S.quant)ts=0;ts=clamp(ts,-49,50);
 const st=pat.st[idx];if(!S.overdub&&!S.recTouched.has(idx)){st.n=[]}S.recTouched.add(idx);
 if(st.n.length>=16){msg("16 notes limit in\na step reached");return null}
 const n=noteFromDefaults(t,pitch,vel);n.t=ts;if(gate!=null)n.g=gate;if(!pat.poly)st.n=[];st.n.push(n);st.on=true;pat.valid=true;emit("recnote");dirty();return {n,time,dur}}

/* ---------- step edits & shift functions ---------- */
function snapshotUndo(){S.undo={t:S.cur,drum:isDrum(),i:patIdx(),pat:deep(curPat())};}
function doUndo(){if(!S.undo){msg("Nothing to undo");return}const u=S.undo;if(u.drum)proj().drum.pats[u.i]=u.pat;else proj().tracks[u.t].pats[u.i]=u.pat;S.undo=null;msg("Undo");dirty()}
function shiftStep(i){const pat=curPat(),name=STEPFN[i],t=S.cur,dr=isDrum();
 const lane=dr?pat.lanes[S.lane]:null,steps=dr?lane.st:pat.st,len=dr&&pat.poly?lane.len:pat.len;
 const rot=d=>{const a=steps.slice(0,len);const b=d>0?[a[len-1],...a.slice(0,len-1)]:[...a.slice(1),a[0]];b.forEach((s,k)=>steps[k]=s)};
 const eachNote=f=>{if(!dr)pat.st.slice(0,pat.len).forEach(s=>s.n.forEach(f))};
 if(S.control&&[2,3,4,10].includes(i)){const cp=proj().ctrl.pats[proj().ctrl.cur],a=cp.st.slice(0,cp.len);let b;
  if(i===2)b=[...a.slice(1),a[0]];else if(i===3)b=[a[cp.len-1],...a.slice(0,-1)];else if(i===4)b=a.slice().reverse();else b=a.slice().sort(()=>Math.random()-.5);b.forEach((s,k)=>cp.st[k]=s);msg(name);emit("shiftfn:"+name);dirty();return}
 switch(i){
  case 0:snapshotUndo();if(dr)proj().drum.pats[proj().drum.cur]=newDrumPat();else trk().pats[trk().cur]=newPat();curPat().valid=true;break;
  case 1:snapshotUndo();if(dr)lane.st=Array.from({length:64},newDStep);else pat.st=Array.from({length:64},newStep);break;
  case 2:rot(-1);break;case 3:rot(1);break;
  case 4:{const a=steps.slice(0,len).reverse();a.forEach((s,k)=>steps[k]=s);break}
  case 5:eachNote(n=>n.p=scaleStep(t,n.p,1));break;case 6:eachNote(n=>n.p=scaleStep(t,n.p,-1));break;
  case 7:eachNote(n=>n.p=clamp(n.p+12,0,127));break;case 8:eachNote(n=>n.p=clamp(n.p-12,0,127));break;
  case 9:case 10:{const f=i===9?.5:0;if(dr)steps.forEach(s=>s.t=Math.round(s.t*f));else eachNote(n=>n.t=Math.round(n.t*f));break}
  case 11:{const a=steps.slice(0,len).sort(()=>Math.random()-.5);a.forEach((s,k)=>steps[k]=s);break}
  case 12:eachNote(n=>n.p=q(t,clamp(n.p+rnd(13)-6,0,127)));break;
  case 13:eachNote(n=>n.p=clamp(n.p+12*(rnd(3)-1),0,127));break;
  case 14:S.globalBpm=!S.globalBpm;msg(S.globalBpm?`Global BPM\n${S.gbpm.toFixed(2)}`:`Project BPM\n${proj().bpm.toFixed(2)}`);emit("shiftfn:"+name);dirty();return;
  case 15:S.waitLoad=!S.waitLoad;msg(S.waitLoad?"Wait Load\nON":"Wait Load\nOFF");emit("shiftfn:"+name);dirty();return}
 pat.valid=true;msg(name);emit("shiftfn:"+name);dirty()}

/* ---------- copy / paste ---------- */
function copySteps(list){const pat=curPat(),dr=isDrum();const v=S.view[dr?4:S.cur];S.copy={kind:"steps",drum:dr,base:Math.min(...list.map(i=>v*16+i)),items:list.map(i=>v*16+i).map(i=>({off:i,d:deep(dr?pat.lanes[S.lane].st[i]:pat.st[i])}))};S.copy.items.forEach(x=>x.off-=S.copy.base);msg(list.length>1?"Steps\nCopied":"Step\nCopied")}
function pasteSteps(i){const c=S.copy,dr=isDrum();if(!c||c.kind!=="steps"){msg("Nothing to\npaste");return}if(c.drum!==dr){msg("Can't Paste step\nbetween\nSeq and Drum");return}
 snapshotUndo();const pat=curPat(),at=S.view[dr?4:S.cur]*16+i;let part=false;
 c.items.forEach(x=>{const k=at+x.off;if(k>63){part=true;return}if(dr)pat.lanes[S.lane].st[k]=deep(x.d);else pat.st[k]=deep(x.d)});pat.valid=true;msg(part?"Steps partially\nPasted":c.items.length>1?"Steps\nPasted":"Step\nPasted");dirty()}

/* ---------- projects ---------- */
function loadProject(n){S.proj=n;mapCache.clear();P.forEach(p=>p.pend=null);S.sceneCur=-1;msg("Project\nLoaded");emit("project:"+n);dirty()}
function saveProject(){const p=S.proj,r=S.ram[p];r.tracks.forEach(t=>t.valid=true);const name=S.flash[p].name;S.flash[p]=deep(r);S.flash[p].name=name;r.name=name;msg("Project\nSaved");emit("save:project");dirty()}
function eraseProject(){const p=S.proj;S.ram[p]=newProject();S.flash[p]=newProject();msg("Project\nErased");emit("erase:project");dirty()}
function copyProject(){const src=S.proj,dst=(src+1)%16,name=S.flash[dst].name;S.flash[dst]=deep(S.ram[src]);S.flash[dst].name=name;S.ram[dst]=deep(S.flash[dst]);msg("Project\nCopied");emit("copy:project");dirty()}
function recallProject(){S.ram[S.proj]=deep(S.flash[S.proj]);mapCache.clear();msg("Load Project\nfrom FLASH");emit("recall");dirty()}
function savePattern(t,i){const fl=S.flash[S.proj];if(t===0&&isDrum(0)){fl.drum.pats[i]=deep(proj().drum.pats[i]);fl.drum.pats[i].valid=true;proj().drum.pats[i].valid=true}
 else{fl.tracks[t].pats[i]=deep(trk(t).pats[i]);fl.tracks[t].pats[i].valid=true;trk(t).pats[i].valid=true}}
function patDirty(t,i){const fl=S.flash[S.proj];const a=t===0&&isDrum(0)?proj().drum.pats[i]:trk(t).pats[i],b=t===0&&isDrum(0)?fl.drum.pats[i]:fl.tracks[t].pats[i];return JSON.stringify(a)!==JSON.stringify(b)}
function patHasContent(t,i){const a=t===0&&isDrum(0)?proj().drum.pats[i]:trk(t).pats[i];return a.lanes?a.lanes.some(l=>l.st.some(s=>s.on)):a.st.some(s=>s.on&&s.n.length)}

/* ---------- scenes ---------- */
function saveScene(i){const pr=proj();pr.scenes[i]={pat:[0,1,2,3].map(t=>trk(t).cur),dpat:pr.drum.cur,chain:[0,1,2,3].map(t=>trk(t).chain.slice()),dchain:pr.drum.chain.slice(),mute:S.mute.slice(),solo:S.solo,track:S.cur,valid:true};msg("Scene\nSaved");emit("scene:save:"+i);dirty()}
function loadScene(i){const sc=proj().scenes[i];if(!sc)return;const pr=proj();[0,1,2,3].forEach(t=>{trk(t).cur=sc.pat[t];trk(t).chain=sc.chain[t].slice()});pr.drum.cur=sc.dpat;pr.drum.chain=sc.dchain.slice();
 S.mute=sc.mute.slice();S.solo=sc.solo;S.cur=sc.track;S.sceneCur=i;P.forEach(p=>{p.idx=0;p.cnt=0;p.chainPos=0});emit("scene:load:"+i);dirty()}

/* ---------- transpose ---------- */
function setTranspose(semi){const ts=new Set([S.cur,...S.tgroup]);for(const t of ts){if(isDrum(t)){msg("Drum Track can't\nbe transposed");continue}S.trans[t]={semi,on:semi!==0}}
 msg(semi?`Transpose\n${semi>0?"+":""}${semi} semi`:"Transpose\nNo Transposition");emit(`trans:${S.cur}:${semi}`);dirty()}
