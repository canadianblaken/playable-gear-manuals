/* ================= transport, sequencer, song ================= */
let lastT=performance.now(),tickNow=0;
const spb=()=>60/S.bpm;
const b2a=b=>Math.max(AC.currentTime,acAt(tickNow)+(b-S.pos)*spb()+LAT); // beat -> audio time
const patBeats=(sq,k=sq.cur)=>sq.pats[k].steps*QB[sq.pats[k].len];
const nextQ=(q,b)=>Math.ceil((b-1e-6)/q)*q;
const CONT=["LFO","PTCH","MODW","MVOL","MPAN",...MODSRC_MOD];
const contMods=(p,k)=>slots(p,k).some(([s])=>CONT.includes(s)||s.startsWith("CC"));
const metroOn=()=>TOOLS.metro==="Play"||(TOOLS.metro==="Rec"&&(S.recording||S.leadIn||S.srec));
function modTick(at){
 S.voices.forEach(v=>{if(v.rel)return;const p=S.pads[v.pad];
  if(contMods(p,"level"))v.mg.gain.setTargetAtTime(levelMul(p,v),at,.01);
  if(contMods(p,"filter")||contMods(p,"res"))setFilt(v,p,at);
  if(contMods(p,"pitch")&&!v.clip){const r=Math.pow(2,((v.mode==="slicer"?0:v.note-(p.root||60))+pv(p,"pitch",v))/12);v.srcs.forEach(s=>s.playbackRate.setTargetAtTime(r,at,.01));if(v.gran)v.gran.rate=r}});
 S.pads.forEach((p,i)=>{if(contMods(p,"pan"))applyPad(i)});
 if(Object.values(S.fx.mods||{}).some(a=>a.some(s=>s[0]!=="None"&&s[1])))applyFX()}
function advance(now){const dt=Math.min(now-lastT,100);if(dt<=0)return;lastT=now;tickNow=now;
 if(!AC)return;const at=AC.currentTime;
 modTick(at);
 S.voices=S.voices.filter(v=>{if(v.relAt!=null&&!v.rel&&at+LAT>=v.relAt)rel(v,v.relAt);return!(v.end<at-.05)});
 S.voices.forEach(v=>v.gran&&grains(v,at+.12));
 if(irDirty){irDirty=false;makeIR()}
 if(!S.playing)return;
 const b0=S.pos,b1=b0+dt/1000*S.bpm/60;S.pos=b1;
 for(let k=Math.floor(b0)+1;k<=Math.floor(b1);k++)if(metroOn())click(b2a(k),((k%4)+4)%4===0);
 if(S.leadIn&&b1>=0){S.leadIn=false;if(S.srec)sampleRecGo(0);else beginRec()}
 if(S.srec&&REC){if(S.srec.at!=null&&b1>=S.srec.at){REC.on=true;REC.wait=S.recp.recThresh==="On";S.srec.at=null;S.srec.t0=b1}
  if(S.srec.stopAt!=null&&b1>=S.srec.stopAt)recFinish()}
 if(S.songMode&&S.song)songAdvance(b0,b1);
 S.clipQ=S.clipQ.filter(c=>{if(c.at>b1)return true;play(c.i,{clipGo:true,when:b2a(c.at),atBeat:c.at,vel:c.vel??1});return false});
 S.voices.forEach(v=>{if(!v.clip||v.rel)return;if(v.stopAt!=null&&v.stopAt<=b1){rel(v,b2a(v.stopAt));return}
  const p=S.pads[v.pad],u=p.sync==="None"?0:p.sync==="Slice"?1:QB[p.sync],C=v.clip;if(!u)return;
  for(let k=Math.floor((b0-C.at)/u)+1;k<=Math.floor((b1-C.at)/u);k++){if(k<=0||(p.loopOn!=="On"&&k*u>=C.beats))continue;
   const T=b2a(C.at+k*u),exp=((k*u)%C.beats)/C.beats*C.dur,nat=((C.anchorOff+(T-C.anchorT))%C.dur+C.dur)%C.dur;let dr=nat-exp;if(dr>C.dur/2)dr-=C.dur;if(dr<-C.dur/2)dr+=C.dur;
   if(Math.abs(dr)>.006){const old=v.srcs[v.srcs.length-1];try{old.stop(T)}catch(_){}const s=AC.createBufferSource();s.buffer=B(p.w);s.loop=p.loopOn==="On";s.connect(v.cr||v.f1);s.start(T,exp);v.srcs.push(s);C.anchorT=T;C.anchorOff=exp;if(v.srcs.length>4)v.srcs.shift()}}});
 S.seqs.forEach((sq,si)=>{const pe=sq.pending;
  if(pe&&pe.at<=b1){if(sq.run)fireSeq(sq,si,b0,pe.at-1e-7);sq.pending=null;if(pe.on){if(pe.pat!=null)sq.cur=pe.pat;sq.run=true;sq.start=pe.at;fireSeq(sq,si,pe.at-1e-7,b1)}else sq.run=false}
  else if(sq.run)fireSeq(sq,si,b0,b1)})}
function fireSeq(sq,si,b0,b1){const P=sq.pats[sq.cur],sb=QB[P.len],L=P.steps*sb;if(!L||!P.notes.length)return;
 const l0=b0-sq.start,l1=b1-sq.start;if(l1<0)return;const sw=sb<=.25?(S.swing/100*2-1)*sb:0;
 for(let c=Math.max(0,Math.floor(l0/L));c<=Math.floor(l1/L);c++)for(const n of P.notes){
  if(n.skip!=null&&c>n.skip)delete n.skip;
  const abs=c*L+n.t*sb+(sw&&Math.round(n.t)%2===1?sw:0);
  if(abs>l0&&abs<=l1&&n.t<P.steps&&c!==n.skip)fireNote(sq,si,n,c,sb,sq.start+abs)}}
function fireNote(sq,si,n,c,sb,beat){
 if(n.prob<100&&Math.random()*100>=n.prob)return;
 if(n.cond&&MOD()){const[a,b]=n.cond.split(":").map(Number);if(c%b!==a-1)return}
 const when=b2a(beat),dur=Math.max(.02,n.len*sb*spb()*sq.duty/100),vel=n.v/127;S.flash["s"+si]=performance.now()+(when-AC.currentTime)*1000;
 if(sq.duty<=0)return;
 if(sq.mode==="pads"){play(n.p,{vel,when,dur,atBeat:beat});midiNote(sq.midiOut,S.pads[n.p].padNote||36+n.p,vel,when,dur)}
 else if(sq.mode==="keys"){play(sq.pad,{note:n.p,key:n.p,vel,when,dur,atBeat:beat});midiNote(sq.midiOut,n.p,vel,when,dur)}
 else{if(MIDIO.length&&sq.midiOut!=="None")midiNote(sq.midiOut,n.p,vel,when,dur);else vsynth(n.p,when,dur,vel)}}
// stand-in for an external instrument when no MIDI output is connected
function vsynth(m,t,dur,vel){if(!sound)return;ensureAC();t=Math.max(t,AC.currentTime);const f=hz(m),o1=AC.createOscillator(),o2=AC.createOscillator(),lp=AC.createBiquadFilter(),g=G(0);
 o1.type="sawtooth";o2.type="square";o1.frequency.value=f;o2.frequency.value=f*1.003;lp.frequency.setValueAtTime(400,t);lp.frequency.linearRampToValueAtTime(400+3000*vel,t+.01);lp.frequency.exponentialRampToValueAtTime(600,t+.3);
 o1.connect(lp);o2.connect(lp);lp.connect(g).connect(M.outs[0]);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.12*vel,t+.005);g.gain.setValueAtTime(.12*vel,t+dur);g.gain.exponentialRampToValueAtTime(.0001,t+dur+.15);
 [o1,o2].forEach(o=>{o.start(t);o.stop(t+dur+.2)})}
function toggleSeq(si){const sq=S.seqs[si];sq.active=!sq.active;
 if(S.playing){if(sq.active===sq.run&&!sq.pending){}else if(sq.active===sq.run)sq.pending=null;else sq.pending={at:nextQ(QB[sq.quant],S.pos),on:sq.active}}
 emit("seq:toggle")}
function seqsOff(){S.seqs.forEach(sq=>{sq.active=false;if(S.playing&&(sq.run||sq.pending))sq.pending={at:nextQ(QB[sq.quant],S.pos),on:false}})}
function setPattern(si,k){S.seqs[si].cur=k;emit("pat")}

/* ---------- recording into sequences ---------- */
function beginRec(){const sq=S.seqs[S.seq];S.recording=true;S.undo={si:S.seq,k:sq.cur,notes:JSON.parse(JSON.stringify(sq.pats[sq.cur].notes))};
 if(!sq.run&&!(sq.pending&&sq.pending.on)){sq.active=true;sq.run=true;sq.pending=null;sq.start=Math.max(0,Math.floor(S.pos/4)*4)}emit("rec:start")}
function recHit(kind,i,note,vel){if(!S.recording||S.leadIn)return;const sq=S.seqs[S.seq],P=sq.pats[sq.cur],sb=QB[P.len],L=P.steps*sb;if(!sq.run)return;
 if(sq.pats.every(p=>!p.notes.length)&&!sq.touched){if(kind==="pad")sq.mode="pads";else if(sq.mode==="pads"){sq.mode="keys";sq.pad=i}}
 if(kind==="pad"&&sq.mode!=="pads")return;if(kind==="key"&&!(sq.mode==="midi"||(sq.mode==="keys"&&sq.pad===i)))return;
 sq.touched=true;const lp=S.pos-sq.start,loop=Math.floor(lp/L),raw=((lp%L)+L)%L;let t=raw/sb,wrap=false;
 if(sq.stepMode==="ON"){t=Math.round(t);if(t>=P.steps){t=0;wrap=true}}
 const n={t,p:kind==="pad"?i:note,len:1,v:Math.round(vel*127),prob:100};n.skip=wrap?loop+1:t*sb>raw?loop:undefined;
 P.notes.push(n);if(kind==="key")S.recHeld.set(note,{n,lp});emit("rec:note")}
function recRelease(note){const h=S.recHeld.get(note);if(!h)return;S.recHeld.delete(note);const sq=S.seqs[S.seq],sb=QB[sq.pats[sq.cur].len];
 let l=(S.pos-sq.start-h.lp)/sb;h.n.len=sq.stepMode==="ON"?Math.max(1,Math.round(l)):Math.max(.1,l)}

/* ---------- song ---------- */
function sceneLen(sc){let L=0;Object.entries(sc.seqs).forEach(([j,v])=>{if(v!=="keep")L=Math.max(L,patBeats(S.seqs[+j],v))});return(L||4)*sc.count}
function songStart(idx,at){const sc=S.scenes[idx];if(!sc)return;S.scene=idx;S.song={idx,start:at,end:at+sceneLen(sc),queued:null};
 S.seqs.forEach((sq,j)=>{const v=sc.seqs[j];if(v==="keep")return;
  if(v==null){sq.active=false;if(sq.run||sq.pending)sq.pending={at,on:false};return}
  sq.active=true;sq.pending={at,on:true,pat:v}});
 S.voices.forEach(v=>{const k=sc.pads[v.pad];if(!k&&(v.clip||v.srcs.some(s=>s.loop)))rel(v,b2a(at))});
 S.clipQ=S.clipQ.filter(c=>sc.pads[c.i]==="keep");
 Object.entries(sc.pads).forEach(([k,v])=>{if(v==="on")play(+k,{when:b2a(at),atBeat:at,vel:1})});emit("scene")}
function songAdvance(b0,b1){const sg=S.song;
 if(sg.queued!=null){const bar=Math.ceil(b0/4-1e-9)*4;if(bar>b0&&bar<=b1){songStart(sg.queued,bar);return}}
 if(sg.end>b0&&sg.end<=b1){let nx=S.loop===1?sg.idx:sg.idx+1;if(nx>=S.scenes.length){if(S.loop===2)nx=0;else{transportStop();return}}songStart(nx,sg.end)}}

/* ---------- transport buttons ---------- */
function transportPlay(){ensureAC();if(AC.state!=="running")AC.resume();
 if(S.scr==="load"&&S.recArm)return sampleRecStart();
 if(S.playing&&S.recArm){S.recArm=false;beginRec();return}
 const rec=S.recArm;S.recArm=false;const lead=rec&&TOOLS.leadIn==="ON";
 S.playing=true;S.pos=lead?-4-1e-6:-1e-6;S.leadIn=lead;S.clipQ=[];S.song=null;
 S.seqs.forEach(sq=>{sq.run=false;sq.pending=null});
 if(S.songMode){S.armed.clear();S.seqs.forEach(sq=>sq.active=false);songStart(S.scene,0)}
 else{S.seqs.forEach(sq=>{if(sq.active)sq.pending={at:0,on:true}});S.armed.forEach(i=>S.clipQ.push({i,at:0}));S.armed.clear()}
 if(rec){const sq=S.seqs[S.seq];if(!S.songMode){sq.active=true;sq.pending={at:0,on:true}}if(!lead){S.recording=true;S.undo={si:S.seq,k:sq.cur,notes:JSON.parse(JSON.stringify(sq.pats[sq.cur].notes))};emit("rec:start")}}
 emit("play")}
function transportStop(){
 if(S.srec){recFinish();if(!S.playing)return}
 if(!S.playing){stopAll(true);S.armed.clear();S.clipQ=[];S.recArm=false;emit("stop2");return}
 S.playing=false;S.recording=false;S.leadIn=false;S.recArm=false;S.song=null;S.clipQ=[];S.recHeld.clear();
 S.seqs.forEach(sq=>{sq.run=false;sq.pending=null;sq.pats.forEach(p=>p.notes.forEach(n=>delete n.skip))});
 if(AC)S.voices.filter(v=>v.clip).forEach(v=>rel(v,AC.currentTime));emit("stop")}
function recPress(){
 if(S.scr==="load"){if(S.srec){recFinish();return}S.recArm=!S.recArm;if(S.recArm&&S.playing)sampleRecStart();else if(S.recArm)recArm();emit("rec:arm");return}
 if(S.playing){if(S.recording){S.recording=false;S.recHeld.clear();emit("rec:stop")}else{S.recArm=false;beginRec()}return}
 S.recArm=!S.recArm;emit("rec:arm")}
/* sample recording on the Load & Record screen */
async function sampleRecStart(){S.recArm=false;const r=await recArm();if(!r)return;const rp=S.recp;
 S.srec={at:null,stopAt:null};
 if(!S.playing){const lead=TOOLS.leadIn==="ON";S.playing=true;S.pos=lead?-4-1e-6:-1e-6;S.leadIn=lead;S.seqs.forEach(sq=>{if(sq.active&&!S.songMode)sq.pending={at:0,on:true}});S.armed.forEach(i=>S.clipQ.push({i,at:0}));S.armed.clear();
  if(S.songMode)songStart(S.scene,0);if(!lead)sampleRecGo(0)}
 else sampleRecGo(rp.recQuant==="None"||rp.recThresh==="On"?S.pos:nextQ(QB[rp.recQuant],S.pos));emit("rec:sample:start")}
function sampleRecGo(at){S.srec.at=at;const L=S.recp.length;S.srec.stopAt=L==="Custom"?null:at+QB[L]}

/* ---------- small helpers ---------- */
function toast(msg,ms=1800){S.toast={msg,until:performance.now()+ms}}
function tapTempo(){const now=performance.now();S.taps=S.taps.filter(t=>now-t<2000);S.taps.push(now);
 if(S.taps.length>=3){const iv=(S.taps[S.taps.length-1]-S.taps[0])/(S.taps.length-1);setBpm(Math.round(60000/iv*10)/10)}emit("tap")}
function setBpm(b){S.bpm=clamp(b,30,300);if(M)applyFX()}
function loadWav(i,id){const e=LIB.get(id);if(!e)return;const p=S.pads[i],N=e.buf.length;
 Object.assign(p,{w:id,multi:null,name:e.n,start:0,len:N,ls:0,le:N,root:e.root||0,slices:p.mode==="slicer"&&p.w===id?p.slices:[],_wz:null});
 if(p.mode==="slicer"&&!p.slices.length)p.slices=gridSlices(e.buf,8);BC.clear();applyPad(i);S.dirty=true;emit("wav:load")}
function loadAll(i,folder){const fs=[...LIB.values()].filter(e=>e.f===folder).sort((a,b)=>a.n.localeCompare(b.n)).slice(0,64);if(!fs.length)return;
 const p=S.pads[i];let n=36;p.multi=fs.map(e=>({id:e.id,root:e.root||n++}));Object.assign(p,{mode:"sample",w:fs[0].id,name:folder.split("\\").pop(),start:0,len:fs[0].buf.length,ls:0,le:fs[0].buf.length});
 applyPad(i);emit("wav:loadall")}
function setPadMode(i,m){const p=S.pads[i];if(m==="new"){Object.assign(p,{w:null,multi:null,name:""});S.voices.filter(v=>v.pad===i).forEach(v=>kill(v));return}
 if(p.multi&&m!=="sample"){p.multi=null}p.mode=m;p.launch=m==="clip"?"Toggle":p.launch==="Toggle"&&m!=="clip"?"Trigger":p.launch;
 if(m==="slicer"&&p.w&&!p.slices.length)p.slices=gridSlices(B(p.w),8);BC.clear();emit("mode:"+m)}
function gridSlices(buf,n){return Array.from({length:n-1},(_,k)=>Math.round(buf.length*(k+1)/n))}
function scanSlices(buf,th){const d=buf.getChannelData(0),hop=512,E=[];for(let i=0;i<d.length;i+=hop){let s=0;for(let j=i;j<Math.min(d.length,i+hop);j++)s+=d[j]*d[j];E.push(Math.sqrt(s/hop))}
 const mx=Math.max(...E)||1,pts=[],k=.02+th/100*.45;let last=-1e9;for(let i=1;i<E.length;i++)if(E[i]-E[i-1]>k*mx&&(i-last)*hop>buf.sampleRate*.06){if(i>1)pts.push(Math.max(0,(i-1)*hop));last=i}return pts}
