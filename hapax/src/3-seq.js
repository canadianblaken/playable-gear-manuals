/* ================= state ================= */
const INF=9999; // note length "INFINITY"
function newPat(){return{len:16,run:"--",trig:null,pc:null,msb:null,lsb:null,color:0,notes:[],aut:{},autMute:{},loop:null,fol:{len:0,a1:"--",p1:100,a2:"--"},lock:{},mute:false}}
function newNote(o){return Object.assign({s:0,u:0,n:60,v:100,l:1,ch:100,roll:"--",math:"--",pr:0,tb:64,pb:0,mute:false},o)}
function newTrack(i){return{name:"TRACK "+(i+1),type:"POLY",out:{port:"MIDI A",ch:i+1},inp:{port:"ALL ACTIVE",ch:0},el:100,q:"--",str:100,trsp:true,psc:true,mono:false,idef:null,
 fx:[{t:"MM",mods:[newMod()],sel:0,on:true,p:{},st:{},ov:{}}],assign:Array.from({length:8},(_,j)=>({dest:"CC"+[74,71,73,72,1,7,10,91][j],v:[80,20,0,40,0,100,64,0][j]})),
 lanes:[],drum:DRUMNAMES.map((n,j)=>({name:n,inn:"LINK",note:[36,38,42,46,41,43,39,56,37,49,51,70,64,75,54,76][j],ch:"TRACK"})),
 pats:Array.from({length:16},(_,k)=>Object.assign(newPat(),{color:k})),cur:0,next:null,mute:false,solo:false,tog:false,arm:false,
 live:{mode:"SCALE",key:0,oct:3,ci:0,si:0,play:"--",vel:100,view:"KEY",jump:3,pres:64,tmb:64,mods:[],held:new Set(),latched:new Map()},
 def:{v:100,l:1,u:0,ch:100,roll:"--",math:"--",pr:0},leader:i===15,view:48,zoom:4,tz:false,page:0,lockPage:false,dpage:0,velView:false,cyc:0,rt:null}}
function newMod(){return{src:"--",dest:"--",depth:100,off:0,pol:"UNI",consume:"OFF"}}
function newProject(name){return{name,tracks:Array.from({length:16},(_,i)=>newTrack(i)),sel:0,psc:{on:false,key:0,ci:1,si:0,stick:"DOWN"},trsp:"OFF",pq:"--",sig:[4,4],muted:false,
 sections:[],song:[],pmode:"PERFORM",sync:"1 BAR",lfo:[{wave:"SINE",sync:"ON",rate:"1 BAR",phase:0,flat:50},{wave:"TRI",sync:"ON",rate:"4 BARS",phase:0,flat:50}],tab:"SECTIONS",secSel:0,songSel:0,rt:null}}
function trackRT(){return{b0:0,s0:0,lastCond:true,open:[],act:0,actT:0,velOv:null,ccIn:{},lastN:60,lastV:100,learn:null,lastAut:{},rec:new Map(),hardDone:false,loopRec:null}}
function projRT(){return{trAmt:0,chord:null,pend:null,hist:[],sounding:[],song:null,muteAt:null}}
let S,uid=0;
const P_=()=>S.P[S.ap],T_=()=>P_().tracks[P_().sel],PAT=T=>T.pats[T.cur];
const spb=()=>60/S.bpm;
const barB=P=>P.sig[0]*4/P.sig[1];
const nextQ=(q,b)=>q?Math.ceil((b-1e-6)/q)*q:b;
let tickNow=performance.now(),lastT=tickNow;
// clock beats (S.clk, always running) -> audio time
const b2a=b=>Math.max(AC.currentTime,acAt(tickNow)+(b-S.clk)*spb()+LAT);
const tpos=()=>S.clk-S.clk0; // transport position in beats
const toClk=b=>b+S.clk0;
function initRT(){S.P.forEach(P=>{P.rt=P.rt||projRT();P.tracks.forEach(T=>T.rt=T.rt||trackRT())})}
const isLeader=(P,T)=>P.trsp!=="OFF"&&T.leader;

/* ================= player ================= */
const stepsAt=(T,b)=>T.rt.s0+(b-T.rt.b0)*4*T.el/100;
function setEl(T,v){if(S.playing){const s=stepsAt(T,tpos());T.rt.s0=s;T.rt.b0=tpos()}T.el=v}
const hash=k=>{let h=Math.imul(k^0x5bd1e995,0x27d4eb2d);h^=h>>>15;return(h>>>0)};
function loopRange(p){const L=p.len;if(!p.loop)return[0,L-1];return[clamp(p.loop[0],0,L-1),clamp(Math.max(p.loop[0],p.loop[1]),0,L-1)]}
// step counter k (since the track's anchor) -> pattern step played, and the loop index
function mapStep(p,k){const[a,b]=loopRange(p),n=b-a+1,md=(x,m)=>((x%m)+m)%m;let pos,loop=Math.floor(k/n);
 switch(p.run){case"REVERSE":pos=b-md(k,n);break;
  case"PING-PONG":{const per=Math.max(1,2*n-2),m=md(k,per);pos=n<2?a:m<n?a+m:a+per-m;loop=Math.floor(k/per);break}
  case"RANDOM BAR":case"RANDOM BEAT":case"RANDOM 1/16":{const B={"RANDOM BAR":16,"RANDOM BEAT":4,"RANDOM 1/16":1}[p.run],blk=Math.floor(k/B),nb=Math.max(1,Math.ceil(n/B));pos=a+md((hash(blk)%nb)*B+md(k,B),n);break}
  default:pos=a+md(k,n)}
 return[pos,loop]}
function trackSilent(P,T){if(P.muted)return true;const any=P.tracks.some(t=>t.solo);let on=any?T.solo:!T.mute;if(T.tog)on=!on;return!on||PAT(T).mute}
function advance(now){const dt=Math.min(now-lastT,100);if(dt<=0)return;lastT=now;tickNow=now;if(!AC)return;
 const c0=S.clk,c1=c0+dt/1000*S.bpm/60;S.clk=c1;
 genTick(c0,c1);
 if(!S.playing){autTick(false);return}
 const b0=c0-S.clk0,b1=c1-S.clk0;
 for(let k=Math.floor(b0)+1;k<=Math.floor(b1);k++)if(metroOn()&&k>=-S.count*barB(P_())+0)click(b2a(toClk(k)),((k%barB(P_()))+barB(P_()))%barB(P_())===0);
 if(S.countEnd!=null&&b1>=S.countEnd){S.countEnd=null;S.rec=true;emit("rec:start")}
 S.P.forEach(P=>{const r=P.rt;
  if(r.muteAt&&b1>=r.muteAt.at){P.muted=r.muteAt.to;r.muteAt=null;if(!P.muted)sendPCs(P);emit("proj:mute")}
  if(r.pend&&b1>=r.pend.at){applyTrsp(P,r.pend.v);r.pend=null}
  if(r.song)songTick(P,b0,b1);
  P.tracks.forEach((T,ti)=>playTrack(P,T,ti,b0,b1))});
 autTick(true)}
function playTrack(P,T,ti,b0,b1){if(b1<0)return;b0=Math.max(b0,-1e-9);
 for(let g=0;g<6;g++){const nx=T.next;
  if(nx&&nx.at<=b1){runSeg(P,T,ti,b0,Math.max(b0,nx.at-1e-9));b0=Math.max(b0,nx.at-1e-9);switchPat(P,T,nx.pat,nx.at,nx.trig);T.next=null;continue}
  const fb=runSeg(P,T,ti,b0,b1);if(fb==null)return;b0=Math.max(b0,fb-1e-9)}}
function switchPat(P,T,k,at,trig){if(trig==="STOP"){T.stopped=true;return}T.stopped=false;const tr=trig||T.pats[k].trig||S.set.ptrig;T.cur=k;
 if(tr==="RESTART"){T.rt.b0=at;T.rt.s0=0}T.rt.hardDone=false;sendPC(P,T,"launch");emit("pat:launch")}
function runSeg(P,T,ti,b0,b1){if(T.stopped||b1<=b0)return null;const p=PAT(T);
 const x0=stepsAt(T,b0),x1=stepsAt(T,b1),q=P.pq!=="--"?P.pq:T.q,qs=QSTEP[q]||0,str=P.pq!=="--"?100:T.str;
 const fl=p.fol.len||(loopRange(p)[1]-loopRange(p)[0]+1);
 for(let k=Math.ceil(x0-.5);k<=Math.floor(x1+.5);k++){
  if(k>0&&k%fl===0&&k>x0&&k<=x1&&!T.next&&(p.fol.a1!=="--"||p.fol.a2!=="--")){const fb=b0+(k-x0)/(4*T.el/100);if(!(Math.abs(fb-(T.rt.lastFol??-9))<1e-4)&&follow(P,T,ti,fb)){T.rt.lastFol=fb;return fb}}
  if(S.rec&&S.recset.recoff==="END PATTERN"&&k>x0&&k<=x1&&k%p.len===0&&k>0&&P===P_()&&T===T_()){S.rec=false;emit("rec:stop")}
  const[pos,loop]=mapStep(p,k);
  for(const n of p.notes){if(n.s!==pos)continue;let t=k+n.u/100;
   if(qs){const g=Math.round(t/qs)*qs;t+=(g-t)*str/100}
   if(t>x0&&t<=x1)fireNote(P,T,n,loop,toClk(b0+(t-x0)/(4*T.el/100)),pos)}}
 return null}
function follow(P,T,ti,at){const p=PAT(T),f=p.fol;let a=f.a1;if(f.a2!=="--"&&Math.random()*100>=f.p1)a=f.a2;if(a==="--")return false;
 if(a==="RSTR"){T.rt.b0=at;T.rt.s0=0;return true}
 if(a==="STOP"){T.next={pat:T.cur,at,trig:"STOP"};return true}
 let g0=T.cur,g1=T.cur;const set=k=>T.pats[k].fol.a1!=="--"||T.pats[k].fol.a2!=="--";while(g0>0&&set(g0-1))g0--;while(g1<15&&set(g1+1))g1++;
 const n=g1-g0+1,i=T.cur-g0;let j=i;
 if(a==="NEXT")j=(i+1)%n;else if(a==="PREVIOUS")j=(i-1+n)%n;else if(a==="ANY")j=rnd(n);else if(a==="OTHER")j=n>1?(i+1+rnd(n-1))%n:i;else if(a==="FIRST")j=0;else if(a==="LAST")j=n-1;
 T.next={pat:g0+j,at};emit("follow");return true}
// conditional trigs
function mathOK(P,T,n,loop){const m=n.math;if(m==="--"||m.includes("FX"))return true;let ok=true;const neg=m[0]==="!",c=neg?m.slice(1):m;
 if(c==="FILL")ok=S.fill;else if(c==="1ST")ok=loop===0;else if(c==="PRE")ok=T.rt.lastCond;else if(c==="SYNC")ok=n.s%4===0;
 else if(c.startsWith("NT")){const now=S.clk,cnt=P.rt.sounding.filter(e=>e>now).length;ok=c==="NT=0"?cnt===0:cnt<+c.slice(3)}
 else if(c.startsWith("PS")||c.startsWith("PB")){const w=c.startsWith("PS")?.25:1,now=S.clk,st=Math.floor(now/w)*w,cnt=P.rt.hist.filter(h=>h>=st-w&&h<st).length;ok=c.endsWith("=0")?cnt===0:cnt<+c.slice(3)}
 else if(c.includes(":")){const[x,y]=c.split(":").map(Number);ok=loop%y===x-1}
 if(neg)ok=!ok;if(c!=="FILL")T.rt.lastCond=ok;return ok}
function fireNote(P,T,n,loop,at,pos){if(n.mute)return;if(!mathOK(P,T,n,loop))return;if(n.ch<100&&Math.random()*100>=n.ch)return;
 const bps=.25*100/T.el,len=n.l>=INF?1e5:n.l*bps,rs=rollSteps(n.roll),nofx=n.math==="NO FX"||(n.math==="NO FX IF FILL"&&S.fill)||(n.math==="FX IF FILL"&&!S.fill);
 const ev=o=>Object.assign({n:n.n,v:T.rt.velOv!=null?T.rt.velOv:n.v,at,len,pr:n.pr,nofx,src:"seq"},o);
 if(T.type==="DRUM"){const base=ev({lane:n.n,n:T.drum[n.n].note+(n.tr||0)});if(rs){const r=Math.max(1,Math.floor(n.l/rs));for(let j=0;j<r;j++)emitT(P,T,{...base,at:at+j*rs*bps,len:rs*bps*.6})}else emitT(P,T,base);return}
 if(rs){const r=Math.max(1,Math.floor(n.l/rs));for(let j=0;j<r;j++)emitT(P,T,ev({at:at+j*rs*bps,len:rs*bps*.6}))}else emitT(P,T,ev({}))}
// everything a track plays passes here: sequenced notes, the pads, external MIDI
function emitT(P,T,ev){P.rt.hist.push(ev.at);if(P.rt.hist.length>64)P.rt.hist.shift();if(ev.len!=null){P.rt.sounding.push(ev.at+ev.len);if(P.rt.sounding.length>64)P.rt.sounding.shift()}
 if(isLeader(P,T))leaderNote(P,T,ev);if(trackSilent(P,T))return;
 T.rt.lastN=ev.n;T.rt.lastV=ev.v;route(P,T,ev)}
function route(P,T,ev){if(!ev.nofx&&T.type!=="DRUM"){
  if(P.trsp!=="OFF"&&T.trsp&&!isLeader(P,T)){if(P.trsp==="TRSP")ev.n+=P.rt.trAmt;else if(P.rt.chord&&P.rt.chord.length){const pcs=P.rt.chord;let best=ev.n,bd=99;for(let d=-6;d<=6;d++){if(pcs.includes(((ev.n+d)%12+12)%12)&&Math.abs(d)<bd){bd=Math.abs(d);best=ev.n+d}}ev.n=best}}
  if(P.psc.on&&T.psc){const q=quantScale(ev.n,P.psc.key,scaleOf(P.psc.ci,P.psc.si).iv,P.psc.stick);if(q==null)return;ev.n=q}}
 if(ev.nofx)return out(P,T,ev);fxRun(P,T,0,ev)}
/* ---------- transpose track (TRSP / match chord) ---------- */
function leaderNote(P,T,ev){const root=+S.set.troot.slice(1)*12;let v;
 if(P.trsp==="TRSP")v=ev.n-root;else{const now=ev.at,held=(P.rt.ldr=(P.rt.ldr||[]).filter(e=>e.end>now));held.push({n:ev.n,end:ev.len==null?1e9:ev.at+ev.len,id:ev.id});v=[...new Set(held.map(e=>e.n%12))]}
 const q=S.set.tsync==="INSTANT"?0:S.set.tsync==="BEAT"?1:parseInt(S.set.tsync)*barB(P);
 if(!q||!S.playing)applyTrsp(P,v);else P.rt.pend={v,at:nextQ(q,ev.at-S.clk0)}}
function applyTrsp(P,v){if(P.trsp==="TRSP")P.rt.trAmt=v;else P.rt.chord=v;emit("trsp")}
/* ---------- effects ---------- */
function fv(T,fx,k){if(fx.ov&&fx.ov[k]!=null)return fx.ov[k];const lk=PAT(T).lock[T.fx.indexOf(fx)];if(lk&&lk[k]!=null)return lk[k];return fx.p[k]}
function fxNew(t){const p={};FXDEF[t].p.forEach(d=>{p[d[0]]=d[3];if(d[4])p[d[4][0]]=d[4][3]});return{t,p,on:true,st:{},ov:{}}}
function fxRun(P,T,i,ev){if(i>=T.fx.length)return out(P,T,ev);const fx=T.fx[i];if(fx.t==="MM"||!fx.on||FXDEF[fx.t].ui)return fxRun(P,T,i+1,ev);
 const v=k=>fv(T,fx,k),nx=e=>fxRun(P,T,i+1,e);
 switch(fx.t){
  case"ARP":case"EUCLID":{if(fx.t==="EUCLID"&&v("note")>=0)return nx(ev);const h=fx.st.held=(fx.st.held||[]).filter(e=>e.end>ev.at);h.push({n:ev.n,v:ev.v,at:ev.at,end:ev.len==null?1e9:ev.at+ev.len,id:ev.id,pr:ev.pr});if(v("retrig")==="NOTE")fx.st.k=0;return}
  case"CHANCE":{let c=v("chance");if(v("sync")!=="--"){const g=v("sync")==="BAR"?barB(P):rateBeats(v("sync")),ph=((ev.at-S.clk0)/g)%1;if(Math.abs(ph)<.02||Math.abs(ph-1)<.02)c=v("sch")}if(v("usevel")==="ON")c*=ev.v/127;if(Math.random()*100<c)nx(ev);return}
  case"ECHO":{nx(ev);const rb=(()=>{const r=v("rate").split("/");return 4*+r[0]/+r[1]})(),R=v("rep"),vc=v("vcurve"),gc=v("gcurve"),np=v("nplus"),nmn=v("nminus");
   for(let j=1;j<=R;j++){const f=j/R,cur=c=>c==="EXP"?f*f:c==="LOG"?Math.sqrt(f):f;let vel=vc==="--"?ev.v:Math.round(ev.v+(v("vend")-ev.v)*cur(vc));
    const len=(ev.len==null?rb*.5:ev.len)*(gc==="--"?1:1+(v("gend")/100-1)*cur(gc));let n=ev.n;if(np&&nmn)n+=Math.round((j%2?np:-nmn)*f);else if(np)n+=Math.round(np*f);else if(nmn)n-=Math.round(nmn*f);
    nx({...ev,n,v:clamp(vel,1,127),at:ev.at+j*rb,len:Math.max(.02,len),id:null})}return}
  case"FILTER":{const a=v("nmin"),b=v("nmax"),inR=a<=b?ev.n>=a&&ev.n<=b:ev.n>=a||ev.n<=b;if(inR&&ev.v>=v("vmin")&&ev.v<=v("vmax"))nx(ev);return}
  case"HARMO":{if(v("origin")==="ON")nx(ev);["n2","n3","n4","n5","n6","n7","n8"].forEach(k=>{const d=v(k);if(d)nx({...ev,n:ev.n+d})});if(v("origin")==="OFF"&&!["n2","n3","n4","n5","n6","n7","n8"].some(k=>v(k)))nx(ev);return}
  case"MONO":{const c=fx.st.cur,busy=c&&c.end>ev.at,m=v("mode");
   if(busy&&(m==="FIRST"||(m==="RANDOM"&&Math.random()<.5)||(m==="LOW"&&ev.n>c.n)||(m==="HIGH"&&ev.n<c.n)))return;
   if(busy)cutOpen(T,c.h,ev.at+(v("legato")==="ON"?.03:0));const h=[];fx.st.cur={n:ev.n,end:ev.len==null?1e9:ev.at+ev.len,h};S._cap=h;nx(ev);S._cap=null;return}
  case"OUTPUT":{if(v("out")==="--")return nx(ev);const port={A:"MIDI A",B:"MIDI B",C:"MIDI C",D:"MIDI D",DEVICE:"USB DEVICE",HOST:"USB HOST"}[v("out")];if(v("consume")==="OFF")nx(ev);nx({...ev,dst:{port,ch:v("ch")}});return}
  case"RANDOM":{let c=v("chance");if(v("usevel")==="ON")c*=ev.v/127;if(Math.random()*100>=c)return nx(ev);const r=(a,b)=>a+Math.random()*(b-a);
   const e={...ev,n:ev.n+Math.round(r(v("nm"),v("np")))+12*Math.round(r(v("om"),v("op"))),v:clamp(Math.round(ev.v*(1+r(-v("vm"),v("vp"))/100)),1,127)};if(e.len!=null)e.len*=1+Math.random()*v("len")/100*4/Math.max(e.len,.25);return nx(e)}
  case"REGISTER":return nx(ev);
  case"SCALER":{const sc=v("scale"),iv=sc==="pSCALE"?scaleOf(P.psc.ci,P.psc.si).iv:SCALE_FLAT.find(s=>s.n===sc).iv,key=sc==="pSCALE"?P.psc.key:NN.indexOf(v("key"));const q=quantScale(ev.n+v("trsp"),key,iv,v("stick"));if(q!=null)nx({...ev,n:q});return}
  case"SHAPER":{const w=v("what"),b=v("bend")/100,f=x=>{x=clamp(x*v("spanin")/100+v("offin")/100,0,1);const y=v("curve")==="EXP"?(b>=0?Math.pow(x,1+b*3):1-Math.pow(1-x,1-b*3)):1/(1+Math.exp(-(x-.5)*(2+Math.abs(b)*14)));return clamp(y*v("spanout")/100+v("offout")/100,0,1)};
   if(w==="VELOCITY")return nx({...ev,v:clamp(Math.round(f(ev.v/127)*127),1,127)});if(w==="KEYS")return nx({...ev,n:Math.round(f(ev.n/127)*127)});return nx(ev)}
  case"SWING":{const g=rateBeats(v("sync")),rel=(ev.at-S.clk0)/g,idx=Math.round(rel),near=Math.abs(rel-idx)<.15,gr=v("groove");let at=ev.at,vel=ev.v;
   if(near){if(idx%2===1&&gr>50)at+=(gr-50)/50*g;else if(idx%2===0&&gr<50)at+=(50-gr)/50*g;if(idx%2===0)vel=clamp(Math.round(vel*(1+v("accent")/200)),1,127)}
   if(v("human"))at+=(Math.random()-.5)*g*v("human")/400;return nx({...ev,at,v:vel})}}
 return nx(ev)}
const EUC=(steps,pulses,rot)=>Array.from({length:steps},(_,i)=>Math.floor(((i+rot)%steps)*pulses/steps)!==Math.floor((((i+rot)%steps)-1)*pulses/steps)||(((i+rot)%steps)===0&&pulses>0));
function arpOrder(h,style,k){let s=h.map(e=>e).sort((a,b)=>a.n-b.n);const n=s.length;if(!n)return null;
 switch(style){case"ORDER":s=h.slice();break;case"DOWN":s.reverse();break;case"UP/DOWN":s=n>1?[...s,...s.slice(1,-1).reverse()]:s;break;case"DOWN/UP":{const d=s.slice().reverse();s=n>1?[...d,...d.slice(1,-1).reverse()]:d;break}
  case"UP+DOWN":s=[...s,...s.slice().reverse()];break;case"DOWN+UP":s=[...s.slice().reverse(),...s];break;case"RANDOM":return s[rnd(n)];case"VELOCITY UP":s.sort((a,b)=>a.v-b.v);break;case"VELOCITY DOWN":s.sort((a,b)=>b.v-a.v);break;
  case"CONVERGE UP":case"CONVERGE DOWN":{const o=[];let a=0,b=n-1;while(a<=b){o.push(s[a++]);if(a<=b)o.push(s[b--])}s=style.endsWith("DOWN")?o.reverse():o;break}
  case"DIVERGE UP":case"DIVERGE DOWN":{const o=[];let a=0,b=n-1;while(a<=b){o.push(s[a++]);if(a<=b)o.push(s[b--])}s=o.reverse();if(style.endsWith("DOWN"))s.reverse();break}
  case"PINKY UP":case"PINKY DOWN":{const top=s[n-1],r=s.slice(0,-1);s=(style.endsWith("UP")?r:r.reverse()).flatMap(e=>[e,top]);break}
  case"THUMB UP":case"THUMB DOWN":{const b=s[0],r=s.slice(1);s=(style.endsWith("UP")?r:r.reverse()).flatMap(e=>[b,e]);break}
  case"DOUBLE 1:2":s=s.flatMap(e=>[e,e]);break;case"SILENCE 1:2":s=s.flatMap(e=>[e,null]);break}
 return s.length?s[((k%s.length)+s.length)%s.length]:null}
// time-based effects: arpeggiator, euclid, register, LFO, modMatrix
function genTick(c0,c1){S.P.forEach(P=>P.tracks.forEach((T,ti)=>{T.fx.forEach((fx,i)=>{if(!fx.on)return;const v=k=>fv(T,fx,k),base=S.playing?S.clk0:0;
  const grid=(r,f)=>{for(let g=Math.floor((c0-base)/r)+1;g<=Math.floor((c1-base)/r);g++)f(base+g*r,g)};
  if(fx.t==="ARP"){const h=(fx.st.held||[]);if(!h.length)return;const r=rateBeats(v("rate"));
   grid(r,(at,g)=>{const act=h.filter(e=>e.at<=at+1e-6&&e.end>at);fx.st.held=h.filter(e=>e.end>at);if(!act.length){fx.st.k=0;return}
    const o=v("oct"),span=Math.abs(o)+1,cnt=act.length*(v("style").includes("+")||v("style").includes("/")?2:1),k=fx.st.k=(fx.st.k||0)+1,rep=v("repeat");
    if(rep!=="--"&&Math.floor((k-1)/(cnt*span))>=+rep.slice(1))return;
    const pick=arpOrder(act,v("style"),(k-1)%Math.max(1,cnt));if(!pick)return;const oc=Math.floor(((k-1)/Math.max(1,cnt)))%span*Math.sign(o||1);
    const hu=v("human")/100,gate=r*v("gate")/100*(1+(Math.random()-.5)*hu);
    fxRun(P,T,i+1,{n:pick.n+12*oc,v:clamp(Math.round(pick.v*(1-Math.random()*hu*.4)),1,127),at,len:Math.max(.02,gate),pr:pick.pr,src:"fx"});
    if(v("chord")&&(k-1)%Math.max(1,cnt)===0)act.forEach(e=>fxRun(P,T,i+1,{n:e.n+12*v("chord"),v:e.v,at,len:gate,src:"fx"}))})}
  else if(fx.t==="EUCLID"){const r=rateBeats(v("rate")),pat=EUC(v("steps"),Math.min(v("pulses"),v("steps")),v("rot"));
   grid(r,(at,g)=>{if(!pat[((g%pat.length)+pat.length)%pat.length])return;const len=r*v("gate")/100;
    if(v("note")>=0){if(S.playing&&!trackSilent(P,T))fxRun(P,T,i+1,{n:v("note"),v:v("vel"),at,len:Math.max(.02,len),src:"fx"})}
    else{const h=fx.st.held=(fx.st.held||[]).filter(e=>e.end>at);h.filter(e=>e.at<=at+1e-6).forEach(e=>fxRun(P,T,i+1,{n:e.n,v:e.v,at,len:Math.max(.02,len),src:"fx"}))}})}
  else if(fx.t==="REGISTER"&&S.playing){const r=rateBeats(v("rate"));if(fx.st.seed!==v("seed")){fx.st.seed=v("seed");fx.st.reg=v("seed")}
   grid(r,at=>{const bits=v("bits");let reg=fx.st.reg;const last=(reg>>(bits-1))&1;let nb=last;if(Math.random()*100<v("toggle"))nb^=1;reg=((reg<<1)|nb)&((1<<bits)-1);fx.st.reg=reg;
    if(trackSilent(P,T))return;if(v("steady")==="ON"||(reg&1)){const n=clamp(Math.round(v("center")+((reg&255)/255*2-1)*v("span")),0,127);fxRun(P,T,i+1,{n,v:100,at,len:Math.max(.02,r*v("gate")/100),src:"fx"})}})}
  else if(fx.t==="LFO"){const ph=lfoVal(v("wave"),v("sync")==="ON"?(c1-base)/lfoBeats(v("rate")):tickNow/1000*.1*Math.pow(2,LFORATES.indexOf(v("rate"))/2),v("phase"),fx.st);
   const val=clamp(v("off")/100+(ph-.5)*v("depth")/100,0,1);sendDest(P,T,v("dest"),val,c1,fx)}});
  mmTick(P,T,c1)}))}
function lfoVal(w,x,ph,st){x=x+ph/360;const f=((x%1)+1)%1;if(w==="SINE")return.5-.5*Math.cos(f*2*Math.PI);if(w==="TRI"||w==="TRIANGLE")return f<.5?f*2:2-f*2;if(w==="RAMP")return f;if(w==="SQUARE")return f<.5?1:0;
 if(w==="FLAT")return null;const c=Math.floor(x);if(st.rc!==c){st.rc=c;st.rv=Math.random()}return st.rv}
function projLfo(P,j){const L=P.lfo[j];if(L.wave==="FLAT")return L.flat/100;return lfoVal(L.wave,L.sync==="ON"?tpos()/lfoBeats(L.rate):tickNow/1000*.1*Math.pow(2,LFORATES.indexOf(L.rate)/2),L.phase,L)}
function mmTick(P,T,at){const mm=T.fx[0];if(!mm||mm.t!=="MM")return;mm.mods.forEach(m=>{if(m.src==="--"||m.dest==="--")return;let s=0;const r=T.rt;
 if(m.src.startsWith("CC"))s=(r.ccIn[+m.src.slice(2)]||0)/127;else if(m.src==="PITCHBEND")s=((r.ccIn.pb||0)+1)/2;else if(m.src==="AFTERTOUCH")s=(r.ccIn.at||0);else if(m.src==="LFO A")s=projLfo(P,0);else if(m.src==="LFO B")s=projLfo(P,1);
 else if(m.src==="KEYTRACK")s=r.lastN/127;else if(m.src==="VELOCITY")s=r.lastV/127;else if(m.src==="FILL")s=S.fill?1:0;
 const d=m.depth/100,o=m.off/100,val=clamp(m.pol==="BI"?o+(s-.5)*d:o+s*d,0,1);m.out=val;sendDest(P,T,m.dest,val,at,null)})}
// send a 0..1 value to an automation/modulation destination
function sendDest(P,T,dest,val,at,from){const r=T.rt,key=dest+(from?"@"+T.fx.indexOf(from):"");
 if(dest.startsWith("FX:")){const[,i,k]=dest.split(":"),fx=T.fx[+i];if(!fx)return;const d=fxParamDef(fx.t,k);if(!d)return;fx.ov[k]=fromNorm(d,val);return}
 if(dest==="VELOCITY"){r.velOv=Math.round(val*126)+1;return}
 const q=dest==="PITCHBEND"?Math.round(val*16383):Math.round(val*127);if(r.lastAut[key]===q)return;r.lastAut[key]=q;if(trackSilent(P,T))return;
 const k=T.out.port.startsWith("CV")?"cv"+T.out.port.slice(-1):String(T.out.ch),t=b2a(at),ch=T.out.ch-1;
 if(dest.startsWith("CC")){const n=+dest.slice(2);ccIn(k,n,q,t);midiSend([0xB0|ch,n,q],t);monLog("out",`CC${n} ${q} ch${T.out.ch}`)}
 else if(dest==="PITCHBEND"){pbIn(k,val*2-1,t);midiSend([0xE0|ch,q&127,q>>7],t)}else if(dest==="AFTERTOUCH"){atIn(k,val,t);midiSend([0xD0|ch,q],t)}}
const fxParamDef=(t,k)=>{for(const d of FXDEF[t].p){if(d[0]===k)return d;if(d[4]&&d[4][0]===k)return d[4]}return null};
function fromNorm(d,x){const sp=d[2];if(Array.isArray(sp)&&typeof sp[0]==="number")return Math.round(sp[0]+x*(sp[1]-sp[0]));return sp[clamp(Math.round(x*(sp.length-1)),0,sp.length-1)]}
function toNorm(d,v){const sp=d[2];if(Array.isArray(sp)&&typeof sp[0]==="number")return(v-sp[0])/(sp[1]-sp[0]);return Math.max(0,sp.indexOf(v))/Math.max(1,sp.length-1)}
/* ---------- output ---------- */
function out(P,T,ev){const dst=ev.dst||T.out;let n=ev.n,ch=dst.ch,port=dst.port;
 if(T.type==="DRUM"&&ev.lane!=null){const L=T.drum[ev.lane];if(L.ch!=="TRACK"){if(String(L.ch).startsWith("GATE")||String(L.ch).startsWith("CV")){port="CV/GATE "+L.ch.slice(-1)}else ch=+L.ch}}
 n=clamp(Math.round(n),0,127);const vel=clamp(Math.round(ev.v),1,127),k=port.startsWith("CV")?"cv"+port.slice(-1):String(ch),t=b2a(ev.at),dur=ev.len==null?3600:Math.max(.01,ev.len*spb());
 if(!AC)return;const vo=synthNote(k,n,vel/127,t,dur,(ev.pr||0)/127);
 if(!port.startsWith("CV")){midiSend([0x90|(ch-1),n,vel],t);if(T.type==="AFTR"&&ev.pr)midiSend([0xA0|(ch-1),n,ev.pr],t+.001);if(ev.len!=null)midiSend([0x80|(ch-1),n,0],t+dur)}
 const h={k,vo,n,ch,port,id:ev.id};if(ev.len==null)T.rt.open.push(h);if(S._cap)S._cap.push(h);
 T.rt.act++;setTimeout(()=>T.rt.act=Math.max(0,T.rt.act-1),Math.min(4000,(t-AC.currentTime+Math.min(dur,2))*1000));
 monLog("out",`${nm(n)} v${vel} ch${port.startsWith("CV")?port:ch}`);return h}
function cutOpen(T,hs,at){const t=b2a(at);(hs||[]).forEach(h=>{if(h.vo)vOff(h.vo,t);if(!h.port.startsWith("CV"))midiSend([0x80|(h.ch-1),h.n,0],t)})}
// a live/external note-off: closes everything that note produced, and lets generators drop it
function releaseId(P,T,id){const at=S.clk;T.fx.forEach(fx=>{if(fx.st.held)fx.st.held.forEach(e=>{if(e.id===id)e.end=at});if(fx.st.cur&&fx.st.cur.id===id)fx.st.cur.end=at});
 const o=T.rt.open.filter(h=>h.id===id);T.rt.open=T.rt.open.filter(h=>h.id!==id);cutOpen(T,o,at);if(P.rt.ldr)P.rt.ldr.forEach(e=>{if(e.id===id)e.end=at})}
function allNotesOff(){S.P.forEach(P=>P.tracks.forEach(T=>{T.rt.open=[];T.fx.forEach(fx=>{fx.st.held=[];fx.st.cur=null})}));allSoundOff();for(let c=0;c<16;c++)midiSend([0xB0|c,123,0],AC?AC.currentTime:0)}
function sendPC(P,T,why){const p=PAT(T);if(p.pc==null)return;if(trackSilent(P,T))return;const ch=T.out.ch-1,t=AC?AC.currentTime:0;if(p.msb!=null)midiSend([0xB0|ch,0,p.msb],t);if(p.lsb!=null)midiSend([0xB0|ch,32,p.lsb],t);midiSend([0xC0|ch,p.pc-1],t);monLog("out",`PC ${p.pc} ch${T.out.ch}`)}
function sendPCs(P){P.tracks.forEach(T=>sendPC(P,T,"unmute"))}
/* ---------- automation ---------- */
function autVal(ev,x,L,interp){if(!ev.length)return null;const s=ev.slice().sort((a,b)=>a.t-b.t);let i=s.findIndex(e=>e.t>x);
 if(!interp){const p=i<0?s[s.length-1]:i===0?s[s.length-1]:s[i-1];return p.v}
 const a=i<=0?s[s.length-1]:s[i-1],b=i<0?s[0]:s[i];let ta=a.t,tb=b.t;if(tb<=ta)tb+=L;let xx=x;if(xx<ta)xx+=L;return a.v+(b.v-a.v)*clamp((xx-ta)/Math.max(1e-6,tb-ta),0,1)}
function autTick(playing){S.P.forEach(P=>P.tracks.forEach(T=>{const p=PAT(T);if(!T.lanes.length)return;T.rt.velOv=null;
 const x=playing?((stepsAt(T,tpos())%p.len)+p.len)%p.len:null;
 T.lanes.forEach((L,li)=>{if(L.dest==="VOID"||p.autMute[li])return;const ev=p.aut[li]||[];let v=null;
  if(ev.length&&x!=null)v=autVal(ev,x,p.len,L.interp);if(v==null&&L.def!=null)v=L.def;if(v==null)return;
  if(L.rate!=="192PPQN"&&playing){const ppq=parseInt(L.rate),g=1/ppq;const slot=Math.floor(tpos()/g);if(L._slot===slot)return;L._slot=slot}
  sendDest(P,T,L.dest,v,S.clk,null)})}))}
function laneFor(T,dest){let i=T.lanes.findIndex(l=>l.dest===dest);if(i<0){T.lanes.push({dest,interp:true,def:null,rate:"192PPQN",lock:false,rows:null});i=T.lanes.length-1}return i}
function recAut(T,dest,val){if(!S.rec||!S.playing)return;const i=T.lanes.findIndex(l=>l.dest===dest);let li=i;if(li<0){li=laneFor(T,dest);T.lanes[li].interp=false}if(T.lanes[li].lock)return;
 const p=PAT(T),x=((stepsAt(T,tpos())%p.len)+p.len)%p.len,ev=p.aut[li]=p.aut[li]||[],t=Math.round(x*12)/12;const near=ev.findIndex(e=>Math.abs(e.t-t)<1/12);if(near>=0)ev[near].v=val;else ev.push({t,v:val});emit("aut:rec")}

/* ================= transport ================= */
const metroOn=()=>(S.recset.metro==="ON"&&(S.rec||S.countEnd!=null))||S.metroAlways;
function play(){ensureAC();if(AC.state!=="running")AC.resume();
 if(S.playing){const rs=S.set.rsync,q=rs==="INSTANT"?0:rs==="BEAT"?1:parseInt(rs)*barB(P_());if(q)S.restartAt=nextQ(q,tpos());else restartAll(0);emit("play:restart");return}
 S.playing=true;S.clk0=S.clk;const cnt=S.recArm&&S.recset.count!=="OFF"?parseInt(S.recset.count.match(/\d/)[0]):0;S.count=cnt;
 if(cnt){S.clk0=S.clk+cnt*barB(P_());S.countEnd=0}else if(S.recArm&&S.recset.punch!=="ON"){S.rec=true;emit("rec:start")}
 S.recArm=false;initRT();S.P.forEach(P=>{P.rt.song=P.pmode!=="PERFORM"&&P.song.length?{i:P.songSel,start:0}:null;if(P.rt.song)songLaunch(P,P.rt.song.i,0);P.tracks.forEach(T=>{T.rt.b0=0;T.rt.s0=0;T.stopped=false;T.rt.lastCond=true;if(T.next&&!P.rt.song){T.cur=T.next.pat;T.next=null}})});
 S.stops=0;emit("play")}
function restartAll(at){S.P.forEach(P=>P.tracks.forEach(T=>{T.rt.b0=at;T.rt.s0=0;T.stopped=false}))}
function stop(){S.stops=(S.stops||0)+1;
 if(S.playing){S.playing=false;S.rec=false;S.countEnd=null;S.recArm=false;allNotesOff();S.P.forEach(P=>{P.rt.pend=null;P.rt.muteAt=null;if(P.rt.song)P.songSel=P.rt.song.i;P.rt.song=null;P.tracks.forEach(T=>{T.next=null;T.lanes.forEach((L,li)=>{if(L.def!=null)sendDest(P,T,L.dest,L.def,S.clk,null)})})});S.stops=1;emit("stop");return}
 if(S.stops===2){allNotesOff();S.P.forEach(P=>{P.songSel=0;sendPCs(P)});toast("ALL NOTES OFF");if(P_().pmode==="PERFORM")P_().tracks.forEach(T=>{});emit("stop2")}
 else if(S.stops===3){allNotesOff();toast("ALL SOUND OFF");emit("stop3")}else if(S.stops>=4){S.P.forEach(P=>P.tracks.forEach(T=>T.rt.lastAut={}));toast("ASSIGN VALUES SENT · CACHE CLEARED");S.stops=0}}
function recPress(){const T=T_(),p=PAT(T);
 if(S.recset.looper!=="OFF"&&!p.notes.length&&!Object.values(p.aut).some(a=>a.length)){
  if(!T.rt.loopRec){if(!S.playing)play();T.rt.loopRec={b0:tpos()};p.len=512;T.rt.b0=tpos();T.rt.s0=0;S.rec=true;emit("rec:start");toast("LOOPER: RECORDING");return}}
 if(T.rt.loopRec){endLoop(T);return}
 if(S.playing){S.rec=!S.rec;T.rt.hardDone=false;emit(S.rec?"rec:start":"rec:stop");return}
 S.recArm=!S.recArm;emit("rec:arm")}
function endLoop(T){const lr=T.rt.loopRec,p=PAT(T),st=(tpos()-lr.b0)*4*T.el/100;let len=S.recset.looper==="1 BAR"?Math.max(16,Math.round(st/16)*16):Math.max(1,Math.round(st));p.len=clamp(len,1,512);T.rt.loopRec=null;p.notes=p.notes.filter(n=>n.s<p.len);toast("LOOP: "+lenName(p.len));emit("rec:loop")}
function setBpm(b){S.bpm=clamp(Math.round(b*100)/100,20,300)}
function tapTempo(){const now=performance.now();S.taps=(S.taps||[]).filter(t=>now-t<2200);S.taps.push(now);if(S.taps.length>=3){const iv=(S.taps[S.taps.length-1]-S.taps[0])/(S.taps.length-1);setBpm(60000/iv)}emit("tap")}
/* ---------- patterns, sections and songs ---------- */
function launchPat(P,T,k,why){if(!S.playing){T.cur=k;T.next=null;sendPC(P,T,why);emit("pat:launch");return}
 const at=syncAt(P,T,P.sync);if(at<=tpos()+1e-6){switchPat(P,T,k,tpos(),null);T.next=null;return}T.next={pat:k,at};emit("pat:queue")}
function syncAt(P,T,sync){const b=tpos();if(sync==="INSTANT")return b;if(sync==="PTRN"||sync.startsWith("TRACK")){const U=sync==="PTRN"?T:P.tracks[+sync.split(" ")[1]-1],p=PAT(U),x=stepsAt(U,b),L=loopRange(p)[1]-loopRange(p)[0]+1,rest=L-((x%L)+L)%L;return b+rest/(4*U.el/100)}
 const q=sync==="BEAT"?1:sync.includes("BAR")?parseInt(sync)*barB(P):PSYNC_B[sync];return nextQ(q,b)}
function saveSection(P,name){P.sections.push({name:name||"SECTION "+String.fromCharCode(65+P.sections.length%26),pats:P.tracks.map(T=>T.cur),mutes:P.tracks.map(T=>PAT(T).mute)});P.secSel=P.sections.length-1;emit("sec:save")}
function launchSection(P,i,at){const sc=P.sections[i];if(!sc)return;P.tracks.forEach((T,ti)=>{const k=sc.pats[ti];if(at!=null){T.next={pat:k,at}}else launchPat(P,T,k,"section")});emit("sec:launch")}
function songLaunch(P,i,at){const it=P.song[i];if(!it)return;P.rt.song={i,start:at,end:at+it.bars*barB(P)};const sc=P.sections[it.sec];if(!sc)return;P.tracks.forEach((T,ti)=>{if(at<=tpos()+1e-6&&!S.playing){T.cur=sc.pats[ti]}else T.next={pat:sc.pats[ti],at}});P.songSel=i;emit("song:sec")}
function songTick(P,b0,b1){const sg=P.rt.song;if(P.pmode==="PERFORM")return;if(sg.end>b0&&sg.end<=b1+.5&&!sg.q){sg.q=true;let n=sg.i+1;if(n>=P.song.length){if(P.pmode==="LOOP SONG")n=0;else{const e=sg.end;setTimeout(()=>{if(S.playing&&tpos()>=e-.01)stop()},Math.max(0,(e-b1)*spb()*1000));return}}songLaunch(P,n,sg.end)}}
/* ---------- snapshot, undo ---------- */
function snapCapture(){S.snap={cap:deep(P_().tracks.map(T=>({pats:T.pats,fx:T.fx.map(f=>({p:f.p,on:f.on,mods:f.mods}))}))),showing:"work",work:null};toast("SNAPSHOT CAPTURED");emit("snap:take")}
function snapToggle(){const s=S.snap;if(!s){toast("HOLD SNAPSHOT TO CAPTURE");return}const P=P_(),cur=deep(P.tracks.map(T=>({pats:T.pats,fx:T.fx.map(f=>({p:f.p,on:f.on,mods:f.mods}))})));
 const src=s.showing==="work"?s.cap:s.work;if(s.showing==="work")s.work=cur;else s.cap=cur;
 P.tracks.forEach((T,i)=>{T.pats=deep(src[i].pats);src[i].fx.forEach((f,j)=>{if(T.fx[j]){T.fx[j].p=f.p;T.fx[j].on=f.on;if(f.mods)T.fx[j].mods=f.mods}})});s.showing=s.showing==="work"?"cap":"work";sendPCs(P);emit("snap:toggle")}
function mark(){const P=P_(),T=T_();S.undo.push({ap:S.ap,ti:P.sel,pi:T.cur,d:deep(PAT(T))});if(S.undo.length>60)S.undo.shift();S.redo=[]}
function undo(redo){const from=redo?S.redo:S.undo,to=redo?S.undo:S.redo;const u=from.pop();if(!u){toast(redo?"NOTHING TO REDO":"NOTHING TO UNDO");return}
 const T=S.P[u.ap].tracks[u.ti];to.push({...u,d:deep(T.pats[u.pi])});T.pats[u.pi]=u.d;toast(redo?"REDO":"UNDO");emit(redo?"redo":"undo")}
/* ---------- live notes (pads, external MIDI) ---------- */
function liveOn(P,T,n,v,src,lane){ensureAC();const id=++uid,ev={n,v,at:S.clk,len:null,id,lane,pr:T.type==="AFTR"||T.type==="MPE"?T.live.pres:0,src:src||"live"};
 T.rt.ccIn.lastNote=n;emitT(P,T,ev);recNoteOn(P,T,n,v,id);T.rt.lastLive=performance.now();learnNote(T,n);monLog("in",`${nm(n)} v${v}`);emit("live:note");return id}
function liveOff(P,T,id,n){releaseId(P,T,id);recNoteOff(P,T,id)}
function learnNote(T,n){const now=performance.now(),L=T.rt.learn;if(L&&now-L.t<60)L.notes.push(n);else T.rt.learn={t:now,notes:[n],on:T.rt.learn&&T.rt.learn.on}}
function recTracks(P){const armed=P.tracks.filter(t=>t.arm);return armed.length?armed:[P.tracks[P.sel]]}
function recNoteOn(P,T,n,v,id){if(S.recArm&&S.recset.punch==="ON"&&!S.playing){play();S.rec=true;emit("rec:start")}
 if(!S.rec||!S.playing||P!==P_()||!recTracks(P).includes(T))return;if(S.set.inNotes==="IGNORE")return;const p=PAT(T);
 if(S.recset.notes==="HARD REC"&&!T.rt.hardDone){mark();p.notes=[];T.rt.hardDone=true}else if(!T.rt.hardDone){mark();T.rt.hardDone=true}
 let x=stepsAt(T,tpos());const L=T.rt.loopRec?1e9:p.len;x=((x%L)+L)%L;const qz=S.recset.quant!=="OFF"?QSTEP[S.recset.quant]:0;if(qz)x=Math.round(x/qz)*qz;
 let s=Math.round(x),u=Math.round((x-s)*100);if(s>=L)s=0;if(T.type==="DRUM"){const lane=T.drum.findIndex(d=>(d.inn==="LINK"?d.note:d.inn)===n);if(lane<0)return;n=lane}
 const note=newNote({s,u:clamp(u,-50,50),n,v,l:1,pr:T.type==="AFTR"?T.live.pres:0});p.notes.push(note);T.rt.rec.set(id,{note,x0:stepsAt(T,tpos())});emit("rec:note")}
function recNoteOff(P,T,id){const r=T.rt.rec.get(id);if(!r)return;T.rt.rec.delete(id);r.note.l=Math.max(.25,Math.round((stepsAt(T,tpos())-r.x0)*4)/4)}
/* ---------- algorithms (offline, on the pattern or the selection) ---------- */
function runAlgo(T,a,pr,sel){mark();const p=PAT(T),inSel=n=>!sel||sel.has(n),D=T.type==="DRUM";
 const r0=sel&&sel.size?Math.min(...[...sel].map(n=>n.s)):0,r1=sel&&sel.size?Math.max(...[...sel].map(n=>n.s)):p.len-1;
 if(a==="GENERATR"){const q=rateBeats(pr.q)*4;p.notes=p.notes.filter(n=>!(n.s>=r0&&n.s<=r1&&(!sel||sel.has(n))));const poly=pr.poly==="MONO"?1:+pr.poly.slice(-1),pv=scaleNotes(T,pr.pmin,pr.pmax);
  for(let s=r0;s<=r1;s+=Math.max(1,q))if(Math.random()*100<pr.dens)for(let j=0;j<(D?1:1+rnd(poly));j++){const n=D?T.dpage*8+rnd(8):pv[rnd(pv.length)]||60;
   p.notes.push(newNote({s:Math.round(s),n,v:pr.vmin+rnd(Math.max(1,pr.vel-pr.vmin+1)),l:pr.lmin+rnd(Math.max(1,pr.len-pr.lmin+1))}))}}
 else if(a==="CURVES"){const ns=p.notes.filter(inSel).sort((x,y)=>x.s-y.s),span=Math.max(1,r1-r0+1),key={VELO:"v",KEYS:"n",LENG:"l",CHAN:"ch",ROLL:"roll",MATH:"math",uTIME:"u"}[pr.dest];
  ns.forEach(n=>{let f=((n.s-r0)/span)*pr.rep+pr.phase/360;if(pr.steps)f=Math.floor(f*pr.steps)/pr.steps;let w=lfoVal(pr.wave==="SQUA"?"SQUARE":pr.wave==="RAND"||pr.wave==="PERLI"?"RAND":pr.wave,f,0,{});if(pr.wave==="RAND"||pr.wave==="PERLI")w=(Math.sin((n.s+1)*12.9898*pr.seed)*43758.5453)%1,w=Math.abs(w);
   const val=pr.amin+(pr.amp-pr.amin)*w;if(key==="v")n.v=clamp(Math.round(val),1,127);else if(key==="n")n.n=clamp(Math.round(val),0,127);else if(key==="l")n.l=Math.max(1,Math.round(val/8));else if(key==="ch")n.ch=clamp(Math.round(val/1.27),0,100);
   else if(key==="u")n.u=clamp(Math.round(val/1.27-50),-50,50);else if(key==="roll")n.roll=ROLLS[clamp(Math.round(val/127*(ROLLS.length-1)),0,ROLLS.length-1)];else if(key==="math")n.math=MATHS[clamp(Math.round(val/127*30),0,MATHS.length-1)]})}
 else if(a==="SHUFFLE"){const ns=p.notes.filter(inSel);if(pr.mode==="STEP"){const k=pr.dest==="ALL"?["n","v","l","ch","roll","math"]:[{KEYS:"n",VELO:"v",LENG:"l",CHAN:"ch",ROLL:"roll",MATH:"math"}[pr.dest]];
   const vals=ns.map(n=>k.map(x=>n[x]));for(let i=vals.length-1;i>0;i--){if(Math.random()*100>=pr.proba)continue;const j=rnd(i+1);[vals[i],vals[j]]=[vals[j],vals[i]]}ns.forEach((n,i)=>k.forEach((x,j)=>n[x]=vals[i][j]))}
  else{const iv={"8BARS":128,"4BARS":64,"2BARS":32,"1BAR":16,"1/2":8,"1/4":4,"1/8":2,"1/16":1,"1/32":.5,"1/64":.25}[pr.int],nP=Math.floor((r1-r0+1)/iv),ord=[...Array(nP).keys()];
   for(let i=nP-1;i>0;i--){if(Math.random()*100>=pr.proba)continue;const j=rnd(i+1);[ord[i],ord[j]]=[ord[j],ord[i]]}ns.forEach(n=>{const pi=Math.floor((n.s-r0)/iv);if(pi<nP)n.s=Math.round(r0+ord[pi]*iv+(n.s-r0-pi*iv))})}}
 else if(a==="SYMMETRY"){const ns=p.notes.filter(inSel),lo=Math.min(...ns.map(n=>n.n)),hi=Math.max(...ns.map(n=>n.n));const m=ns.map(n=>pr.mode==="TIME"?{...n,s:r1-(n.s-r0)-Math.max(0,Math.round(n.l)-1)}:{...n,n:hi-(n.n-lo)});
  if(pr.dup==="ON")p.notes.push(...m.map(x=>newNote(x)));else ns.forEach((n,i)=>Object.assign(n,m[i]))}
 else if(a==="EVERYN"){const g=rateBeats(pr.grid)*4,lanes=sel&&sel.size?[...new Set([...sel].map(n=>n.n))]:[T.rt.lane??T.dpage*8];
  lanes.forEach(l=>{p.notes=p.notes.filter(n=>!(n.n===l&&n.s>=r0&&n.s<=r1));let j=0;for(let s=r0;s<=r1;s+=Math.max(1,g),j++){const acc=j%pr.n===0;p.notes.push(newNote({s:Math.round(s),n:l,v:acc?pr.amin+rnd(Math.max(1,pr.acc-pr.amin+1)):pr.gmin+rnd(Math.max(1,pr.ghost-pr.gmin+1))}))}})}
 p.notes=p.notes.filter(n=>n.s>=0&&n.s<p.len);emit("algo:"+a)}
function scaleNotes(T,lo,hi){const P=P_(),o=[];for(let n=lo;n<=hi;n++){if(P.psc.on&&T.psc){const iv=scaleOf(P.psc.ci,P.psc.si).iv;if(!iv.includes(((n-P.psc.key)%12+12)%12))continue}o.push(n)}return o.length?o:[lo]}
/* ---------- MIDI files ---------- */
function exportMid(P,T){const p=PAT(T),ppq=96,ev=[];p.notes.forEach(n=>{if(n.mute)return;const t=Math.round((n.s+n.u/100)*ppq/4),nn=T.type==="DRUM"?36+n.n:n.n,d=Math.max(1,Math.round(Math.min(n.l,512)*ppq/4));ev.push([Math.max(0,t),0x90,nn,n.v],[Math.max(0,t)+d,0x80,nn,0])});
 ev.sort((a,b)=>a[0]-b[0]||(a[1]===0x80?-1:1));const vlq=v=>{const b=[v&127];while(v>>=7)b.unshift((v&127)|128);return b};
 const name=T.type==="DRUM"?T.drum.map(d=>d.name).join("."):T.name;let last=0;const trk=[0,0xFF,3,name.length,...[...name].map(c=>c.charCodeAt(0)&127)];ev.forEach(e=>{trk.push(...vlq(e[0]-last),e[1],e[2],e[3]);last=e[0]});trk.push(0,0xFF,0x2F,0);
 const tempo=Math.round(6e7/S.bpm),t0=[0,0xFF,0x51,3,tempo>>16,(tempo>>8)&255,tempo&255,0,0xFF,0x58,4,P.sig[0],Math.log2(P.sig[1]),24,8,0,0xFF,0x2F,0];
 const chunk=(id,d)=>[...id].map(c=>c.charCodeAt(0)).concat([d.length>>>24,(d.length>>16)&255,(d.length>>8)&255,d.length&255],d);
 const bytes=new Uint8Array([...chunk("MThd",[0,1,0,2,0,ppq]),...chunk("MTrk",t0),...chunk("MTrk",trk)]);
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([bytes],{type:"audio/midi"}));a.download=`${P.name}_TR${String(P.tracks.indexOf(T)+1).padStart(2,"0")}_P${T.cur+1}.mid`;a.click();emit("mid:export")}
function parseMid(buf){const d=new DataView(buf);let o=0;const str=n=>{let s="";for(let i=0;i<n;i++)s+=String.fromCharCode(d.getUint8(o+i));o+=n;return s};
 if(str(4)!=="MThd")throw 0;const hl=d.getUint32(o);o+=4;const ntr=d.getUint16(o+2),ppq=d.getUint16(o+4);o+=hl;const tracks=[];
 for(let t=0;t<ntr&&o<buf.byteLength;t++){if(str(4)!=="MTrk")break;const len=d.getUint32(o);o+=4;const end=o+len;let time=0,rs=0,name="",on={},notes=[];
  const vlq=()=>{let v=0,b;do{b=d.getUint8(o++);v=(v<<7)|(b&127)}while(b&128);return v};
  while(o<end){time+=vlq();let st=d.getUint8(o);if(st<128)st=rs;else o++;rs=st;const ty=st&0xF0;
   if(st===0xFF){const mt=d.getUint8(o++),l=vlq();if(mt===3)name=str(l);else o+=l}else if(st===0xF0||st===0xF7){o+=vlq()}
   else if(ty===0x90||ty===0x80){const n=d.getUint8(o++),v=d.getUint8(o++);if(ty===0x90&&v>0)on[n]={t:time,v};else if(on[n]){notes.push({t:on[n].t,n,v:on[n].v,l:time-on[n].t});delete on[n]}}
   else if(ty===0xC0||ty===0xD0)o+=1;else o+=2}
  o=end;if(notes.length)tracks.push({name:name||"TRACK "+(t+1),notes})}return{ppq,tracks}}
function importMid(T,trk,ppq,mapTo){mark();const p=PAT(T),D=T.type==="DRUM",lo=mapTo!=null?mapTo:Math.min(...trk.notes.map(n=>n.n));p.notes=[];let maxS=0;
 trk.notes.forEach(n=>{const x=n.t/ppq*4,s=Math.round(x);if(s>=512)return;const nn=D?n.n-lo:n.n;if(D&&(nn<0||nn>15))return;p.notes.push(newNote({s,u:clamp(Math.round((x-s)*100),-50,50),n:nn,v:n.v,l:Math.max(.25,Math.round(n.l/ppq*16)/4)}));maxS=Math.max(maxS,s)});
 p.len=clamp(Math.ceil((maxS+1)/16)*16,16,512);emit("mid:import");toast(`IMPORTED ${p.notes.length} NOTES`)}
