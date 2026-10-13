/* ================= state ================= */
function newPad(){return{name:"",w:null,multi:null,mode:"sample",level:0,pitch:0,filter:0,res:0,att:0,dec:50,sus:100,rel:5,
 loopMode:"None",fade:0,rev:"OFF",start:0,len:0,ls:0,le:0,loopOn:"On",beats:0,quant:"1 bar",sync:"1/4",ssync:"Off",playthru:"OFF",slices:[],slice:1,sliceSeq:"None",
 gsize:30,dens:55,scat:0,speed:100,win:10,panr:20,lfoWave:"Sine",lfoRate:40,lfoDepth:0,lfoBeat:"Off",lfoTrig:"Off",
 launch:"Trigger",out:"Out 1",pan:0,poly:"Poly 4",excl:"Excl X",midiIn:"None",padNote:0,interp:"Normal",sat:0,root:0,fx1:0,fx2:0,mute:false,solo:false,
 mods:{level:[["VEL",100],["None",0],["None",0]]},rec:null}}
function newPat(){return{len:"1/16",steps:16,notes:[]}}
function newSeq(){return{mode:"pads",pad:0,duty:100,quant:"1 bar",stepMode:"ON",midiOut:"None",cur:0,pats:[0,1,2,3].map(newPat),active:false,run:false,start:0,pending:null,nextPat:null}}
let sceneNo=0;
function newScene(){sceneNo++;return{name:"Scene "+sceneNo,num:sceneNo,pads:{},seqs:{},count:1}}
function newFX(){return{d:{dtime:58,fb:35,cut:0,width:50,beat:"On",filt:"Off",ping:"On",dtype:"Delay",wand:50,mrnd:30,mfrz:"Off",mclk:"1x",mwid:"TEMPO",mduck:"Auto"},r:{decay:45,damp:40,pre:10,rtype:"Plate",rsize:50,rmod:30,rearly:50,rwid:100},mods:{}}}
function newEQ(){return[{type:"L Shelf",gain:0,freq:100,q:.7},{type:"Param",gain:0,freq:500,q:1},{type:"Param",gain:0,freq:2500,q:1},{type:"H Shelf",gain:0,freq:9000,q:.7}]}
function newRecP(){return{recIn:"L+R",gain:0,recToPlay:"Off",length:"Custom",recQuant:"None",recMon:"Auto",monOut:"Out 1",recThresh:"Off",thresh:-30}}
let S;
const UI0=()=>({scr:"pads",hist:[],pad:0,seq:0,scene:0,vel:100,padPanel:"vel",seqPanel:"quick",ptab:"Main",psel:0,pfocus:0,prow:0,ptop:0,modRow:0,modKey:null,modFx:false,learn:false,
 wz:null,wcur:.5,slMenu:false,fxSel:0,fxfocus:0,fxpsel:0,eqBand:0,mixMode:"mix",roll:{x:0,top:60,zoom:0,sel:-1,ev:false},seqTab:"Seq",seqRow:0,
 keys:{base:48,root:0,scale:"Minor",grid:false,seq:false,chord:"Off",goct:2,held:new Map()},browse:{path:"",sel:0,top:0,prev:false,prevT:0},
 psetSel:0,psetTop:0,toolTab:"Main",toolRow:0,toolTop:0,recRow:0,recTop:0,sceneTop:0,scnRow:0,scnPat:0,
 playing:false,pos:0,recArm:false,recording:false,leadIn:false,voices:[],armed:new Set(),clipQ:[],song:null,flash:{},toast:null,ov:null,sleep:false,
 midi:{pb:0,mw:0,vol:1,pan:0,cc:{}},clip:null,undo:null,duckT:-9,recHeld:new Map(),srec:null,taps:[],stopOnce:false});
function blankPreset(name){return{name,bpm:120,swing:50,pads:Array.from({length:16},newPad),seqs:Array.from({length:16},newSeq),scenes:[newScene()],fx:newFX(),eq:newEQ(),songMode:false,loop:0,recp:newRecP(),dirty:false}}
let TOOLS={...TOOLDEF};
const MOD=()=>document.getElementById("modBtn").getAttribute("aria-pressed")==="true";

/* ================= audio graph ================= */
let AC=null,M=null,sound=true;
const LAT=.05; // s of lookahead: events are scheduled at their exact time + LAT, hiding timer jitter
function ensureAC(){if(AC)return AC;AC=new (window.AudioContext||window.webkitAudioContext)({latencyHint:"interactive"});graph();return AC}
let acOff=-1e9; // perf ms -> audio seconds; currentTime moves in chunks so keep the running max of the offset
function acAt(pt){const cur=AC.currentTime-performance.now()/1000;acOff=Math.max(cur,acOff-.00002);return pt/1000+acOff}
const G=(v=1)=>{const g=AC.createGain();g.gain.value=v;return g};
function graph(){const c=AC;M={};
 M.hp=G();M.hp.connect(c.destination);
 M.eqIn=G();M.eq=[0,1,2,3].map(()=>c.createBiquadFilter());M.eqIn.connect(M.eq[0]);M.eq.reduce((a,b)=>(a.connect(b),b)).connect(M.hp);
 M.outs=[0,1,2].map(()=>G());M.comp=c.createDynamicsCompressor();M.compIn=G();M.dry1=G();M.post1=G();
 M.outs[0].connect(M.compIn).connect(M.comp).connect(M.post1);M.outs[0].connect(M.dry1).connect(M.post1);M.post1.connect(M.eqIn);M.outs[1].connect(M.eqIn);M.outs[2].connect(M.eqIn);
 // FX1 delay (stereo, ping-pong capable); wet returns to Out 1
 M.fx1=G();M.dflt=c.createBiquadFilter();M.split=c.createChannelSplitter(2);M.merge=c.createChannelMerger(2);M.dl=c.createDelay(4);M.dr=c.createDelay(4);M.fbl=G(0);M.fbr=G(0);
 M.fx1.connect(M.dflt).connect(M.split);M.dl.connect(M.merge,0,0);M.dr.connect(M.merge,0,1);M.merge.connect(M.outs[0]);M.d2r=G(0);M.merge.connect(M.d2r);M.dl.connect(M.fbl);M.dr.connect(M.fbr);M.ping=null;
 // FX2 reverb
 M.fx2=G();M.d2r.connect(M.fx2);M.pre=c.createDelay(1);M.conv=c.createConvolver();M.rwet=G(.6);M.fx2.connect(M.pre).connect(M.conv).connect(M.rwet).connect(M.outs[0]);
 M.pads=Array.from({length:16},()=>{const s={in:G(),pan:c.createStereoPanner(),lvl:G(),s1:G(0),s2:G(0),o:-1};s.in.connect(s.pan).connect(s.lvl);s.lvl.connect(s.s1).connect(M.fx1);s.lvl.connect(s.s2).connect(M.fx2);return s});
 M.an=c.createAnalyser();M.an.fftSize=1024;M.post1.connect(M.an);
 M.sink=G(0);M.sink.connect(c.destination);
 applyAll();
}
function applyAll(){if(!M)return;S.pads.forEach((_,i)=>applyPad(i));applyFX();applyEQ();applyTools();irDirty=true}
function audible(i){const p=S.pads[i];return S.pads.some(x=>x.solo)&&MOD()?p.solo:!p.mute}
function applyPad(i){if(!M)return;const p=S.pads[i],s=M.pads[i],t=AC.currentTime;
 s.lvl.gain.setTargetAtTime(audible(i)?dbg(p.level):0,t,.01);s.s1.gain.setTargetAtTime(p.fx1/100,t,.01);s.s2.gain.setTargetAtTime(p.fx2/100,t,.01);
 const o=+p.out.match(/\d/)[0]-1,side=p.out.endsWith("L")?-1:p.out.endsWith("R")?1:null;s.pan.pan.setTargetAtTime(side??clamp(pv(p,"pan")/100,-1,1),t,.01);
 if(s.o!==o){s.lvl.disconnect();s.lvl.connect(s.s1);s.lvl.connect(s.s2);s.lvl.connect(M.outs[o]);s.o=o}}
function fxDelaySec(){const d=S.fx.d,v=fxv("d","dtime");return d.beat==="On"?QB[DLV[Math.round(v/100*(DLV.length-1))]]*60/S.bpm:Math.max(.01,v/100*2)}
const munchi=()=>MOD()&&S.fx.d.dtype==="Munchi";
// ponytail: Munchi stand-in = tempo delay (1 bar / Clock, shorter as Wand leaves the middle), Wand right feeds the reverb,
// Wand left = random retrigger jumps, Freeze = closed input + full feedback. No reverse/octave glitches, no ducking.
function munchiSec(){const d=S.fx.d,dist=Math.abs(fxv("d","wand")-50)/50;return 4*60/S.bpm/{"1x":1,"1/2x":.5,"2x":2}[d.mclk]/Math.pow(2,Math.min(3,Math.floor(dist*4.99)))}
let mGl=0;function munchiTick(){if(!M||!munchi())return;const dist=(50-fxv("d","wand"))/50,now=AC.currentTime;if(dist<=0||now<mGl)return;mGl=now+60/S.bpm/4;
 if(Math.random()<fxv("d","mrnd")/100*dist){const s=Math.min(3.9,munchiSec()*[.5,.25,.75,.125][Math.floor(Math.random()*4)]);[M.dl,M.dr].forEach(n=>{n.delayTime.setValueAtTime(s,now);n.delayTime.setValueAtTime(Math.min(3.9,munchiSec()),now+60/S.bpm)})}}
function applyFX(){if(!M)return;const d=S.fx.d,r=S.fx.r,t=AC.currentTime,mu=munchi(),frz=mu&&d.mfrz==="On";
 const sec=Math.min(3.9,mu?munchiSec():fxDelaySec());M.fx1.gain.setTargetAtTime(frz?0:1,t,.01);M.d2r.gain.setTargetAtTime(mu?Math.max(0,fxv("d","wand")-50)/50*.9:0,t,.02);M.dl.delayTime.setTargetAtTime(sec,t,.02);M.dr.delayTime.setTargetAtTime(sec,t,.02);
 const fb=frz?.999:fxv("d","fb")/100*.92;M.fbl.gain.setTargetAtTime(fb,t,.02);M.fbr.gain.setTargetAtTime(fb,t,.02);
 if(d.filt==="On"&&!mu){M.dflt.type=d.cut<0?"lowpass":"highpass";M.dflt.frequency.value=d.cut<0?20000*Math.pow(150/20000,-d.cut/100):20*Math.pow(400,d.cut/100);M.dflt.Q.value=.3+(100-d.width)/100*6}else{M.dflt.type="allpass";M.dflt.frequency.value=20000}
 const ping=mu?d.mwid!=="Mono":d.ping==="On";if(M.ping!==ping){M.ping=ping;try{M.split.disconnect();M.fbl.disconnect();M.fbr.disconnect()}catch(_){}
  M.split.connect(M.dl,0);if(ping){M.fbl.connect(M.dr);M.fbr.connect(M.dl)}else{M.split.connect(M.dr,1);M.fbl.connect(M.dl);M.fbr.connect(M.dr)}}
 M.pre.delayTime.setTargetAtTime(r.pre/100*.25,t,.02);M.rwet.gain.setTargetAtTime(Math.min(1.1,fxv("r","decay")/55),t,.05)}
let irDirty=true,irKey="";
function makeIR(){const r=S.fx.r,room=MOD()&&r.rtype==="Room",key=[Math.round(fxv("r","decay")/5),Math.round(fxv("r","damp")/5),room,r.rsize,r.rearly,r.rwid].join();if(key===irKey)return;irKey=key;
 const dec=fxv("r","decay")/100,damp=fxv("r","damp")/100,len=room?(.2+dec*1.3)*Math.pow(2,(r.rsize-50)/50):.4+dec*5,n=Math.floor(AC.sampleRate*len),b=AC.createBuffer(2,n,AC.sampleRate);
 for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);let y=0;for(let i=0;i<n;i++){const tt=i/n,a=.95-(.9*damp)*tt;y+=a*(Math.random()*2-1-y);d[i]=y*Math.pow(1-tt,room?3:2)}
  if(room)[.007,.013,.019,.029,.037].forEach((s,k)=>{const j=Math.floor((s+ch*.002)*AC.sampleRate);if(j<n)d[j]+=(.6-k*.1)*(k%2?-1:1)*r.rearly/50})}
 if(room){const L=b.getChannelData(0),R=b.getChannelData(1),w=r.rwid/100;for(let i=0;i<n;i++){const m=(L[i]+R[i])/2,s=(L[i]-R[i])/2*w;L[i]=m+s;R[i]=m-s}}
 M.conv.buffer=b}
function eqNode(n,b){const ty={None:"peaking","L Cut":"highpass","L Shelf":"lowshelf",Param:"peaking","H Shelf":"highshelf","H Cut":"lowpass"}[b.type];n.type=ty;n.frequency.value=b.freq;n.gain.value=b.type==="None"?0:b.gain;n.Q.value=ty==="highpass"||ty==="lowpass"?b.q*4-3:b.q}
function applyEQ(){if(M)S.eq.forEach((b,i)=>eqNode(M.eq[i],b))}
const COMPSET={Stock:[-12,4,.003,.25],Glue:[-18,2,.01,.35],Punch:[-20,4,.03,.08],Opto:[-22,3,.01,.8],Squash:[-35,20,.0005,.06],Limit:[-6.3,20,.0005,.06]};
function applyTools(){if(!M)return;const t=AC.currentTime;M.hp.gain.setTargetAtTime(dbg(TOOLS.hp+6),t,.02);[TOOLS.o1,TOOLS.o2,TOOLS.o3].forEach((v,i)=>M.outs[i].gain.setTargetAtTime(dbg(v),t,.02));
 TOOLS.compTh=clamp(+TOOLS.compTh||0,-24,12);if(!COMPS.includes(TOOLS.compModel))TOOLS.compModel="Stock";
 const on=MOD()?TOOLS.compModel!=="Off":TOOLS.comp==="ON";M.compIn.gain.value=on?1:0;M.dry1.gain.value=on?0:1;const cs=COMPSET[MOD()&&on?TOOLS.compModel:"Stock"];
 M.comp.threshold.value=cs[0]+(MOD()?TOOLS.compTh:0);M.comp.ratio.value=cs[1];M.comp.attack.value=cs[2];M.comp.release.value=cs[3];M.comp.knee.value=6}

/* ================= modulation ================= */
const pctT=(p,max)=>max*Math.pow(p/100,3);
const barsOf=s=>{const tr=s.endsWith("T");s=s.replace("T","");const v=s.includes("/")?1/+s.split("/")[1]:+s;return tr?v*2/3:v};
function wave(name,ph,seed){switch(name){case"Saw":return 1-2*ph;case"Rev Saw":return 2*ph-1;case"Triangle":return 1-4*Math.abs(ph-.5);case"Pos Tri":return 1-2*Math.abs(ph-.5)*2;
 case"Sine":return Math.sin(2*Math.PI*ph);case"Pos Sine":return .5+.5*Math.sin(2*Math.PI*ph);case"Square":return ph<.5?1:-1;case"Pos Square":return ph<.5?1:0;default:return Math.sin(seed*12.9898)*43758.5453%1}}
function lfoVal(p,v){const now=performance.now()/1000,t0=p.lfoTrig==="On"&&v?v.pt0/1000:0;
 const hzr=p.lfoBeat==="On"?1/(barsOf(LFOB[Math.round(p.lfoRate/100*(LFOB.length-1))])*240/S.bpm):.1*Math.pow(120,p.lfoRate/100),c=(now-t0)*hzr;
 return wave(p.lfoWave,c%1,Math.floor(c)+1)*pv(p,"lfoDepth",v,true)/100}
const DUCK={EXP1:[1,0,250,"e"],EXP2:[1,0,500,"e"],PUMP:[5,100,300,"p"],LINR:[4,25,300,"l"]};
// ponytail: closed-form fits of duck.c's 33-point release tables (exp 99% done, pump ~(1-x)^4, linear in dB)
function duckVal(s){if(!MOD())return 0;const dt=((AC?AC.currentTime:0)-S.duckT)*1000;if(dt<0)return 0;const[a,h,r,sh]=DUCK[s];if(dt<a)return dt/a;if(dt<a+h)return 1;const x=(dt-a-h)/r;if(x>=1)return 0;
 return sh==="e"?Math.exp(-4.6*x)-.01*x:sh==="p"?Math.pow(1-x,4):1-x}
function srcVal(s,p,v){if(s==="LFO")return p?lfoVal(p,v):0;if(s==="PTCH")return S.midi.pb;if(s==="MODW")return S.midi.mw;if(s==="MPAN")return S.midi.pan;
 if(MODSRC_MOD.includes(s))return duckVal(s);if(s.startsWith("CC"))return(S.midi.cc[s]??64)/63.5-1;return 0}
const slots=(p,k)=>((p.mods||{})[k]||[]).filter(x=>x[0]!=="None"&&x[1]);
const nSamp=p=>(B(p.w)||{length:1}).length;
function uni(s,v){return s==="VEL"?(v?v.vel:1)-1:s==="MVOL"?S.midi.vol-1:null}
function pv(p,k,v,noLfo){const D=PP[k],span=D.samp?nSamp(p):D.r[1]-D.r[0];let x=p[k];
 slots(p,k).forEach(([s,a])=>{if(noLfo&&s==="LFO")return;const u=uni(s,v);x+=a/100*(u!=null?u*span:srcVal(s,p,v)*span/2)});
 return D.samp?clamp(x,0,nSamp(p)):clamp(x,D.r[0],D.r[1])}
function levelMul(p,v){let g=1;slots(p,"level").forEach(([s,a])=>{const u=uni(s,v);g*=u!=null?Math.max(0,1+a/100*u):MODSRC_MOD.includes(s)?dbg(a*.65*srcVal(s,p,v)):dbg(a/100*24*srcVal(s,p,v))});return g}
function fxv(e,k){const D=FXP[k];let x=S.fx[e][k];((S.fx.mods||{})[e+"."+k]||[]).filter(s=>s[0]!=="None").forEach(([s,a])=>{const u=uni(s,null);x+=a/100*(u!=null?u*100:srcVal(s,null,null)*50)});return clamp(x,D.r[0],D.r[1])}

/* ================= voices ================= */
const BC=new Map(); // derived buffers: reversed, ping-pong loop, loop-faded
function mirror(p){const N=nSamp(p),r=p.rev==="ON";return r?{st:N-(p.start+p.len),ls:N-p.le,le:N-p.ls}:{st:p.start,ls:p.ls,le:p.le}}
function derived(p){const buf=B(p.w);if(!buf)return null;const lm=p.loopMode,m=mirror(p),ls=Math.round(m.ls),le=Math.round(m.le);
 const bidi=lm==="Bidirect"&&le>ls,fade=lm==="Forward"&&p.fade>0&&p.mode==="sample"&&le>ls;
 if(p.rev!=="ON"&&!bidi&&!fade)return buf;const key=[p.w,p.rev,bidi&&"b",fade&&"f",ls,le,p.fade].join("|");if(BC.has(key))return BC.get(key);if(BC.size>40)BC.clear();
 const N=buf.length,out=new AudioBuffer({numberOfChannels:buf.numberOfChannels,length:bidi?le+(le-ls):N,sampleRate:buf.sampleRate});
 for(let ch=0;ch<buf.numberOfChannels;ch++){let d=buf.getChannelData(ch);if(p.rev==="ON")d=d.slice().reverse();const o=out.getChannelData(ch);
  if(bidi){o.set(d.subarray(0,le));for(let j=0;j<le-ls;j++)o[le+j]=d[le-1-j]}else o.set(d);
  if(fade){const F=Math.floor((le-ls)*p.fade/100);for(let j=0;j<F;j++){const i=le-F+j,s=ls-F+j;if(s<0)continue;const w=j/F;o[i]=d[i]*Math.cos(w*Math.PI/2)+d[s]*Math.sin(w*Math.PI/2)}}}
 BC.set(key,out);return out}
function setFilt(v,p,t){const fv=pv(p,"filter",v),rs=pv(p,"res",v),mod=MOD();
 [v.f1,v.f2].forEach(f=>{if(!f)return;if(fv<0){f.type="lowpass";f.frequency.setTargetAtTime(20000*Math.pow(40/20000,-fv/100),t,.008)}else if(fv>0){f.type="highpass";f.frequency.setTargetAtTime(20*Math.pow(500,fv/100),t,.008)}else{f.type="lowpass";f.frequency.setTargetAtTime(22000,t,.008)}
  f.Q.value=fv?(mod?-1+rs*.16:-3+rs*.23):-3})}
// od.c: gain 1+24d², soft clip with headroom 2-d, + k·c² warmth, level 1/sqrt(gain). Machine modes: 1+7d² into a hard clip.
const SATC=new Map();function satCurve(d,mach){const key=Math.round(d*50)+(mach?"m":"");if(SATC.has(key))return SATC.get(key);const n=1024,c=new Float32Array(n),g=mach?1+7*d*d:1+24*d*d,h=2-d,k=.3*Math.min(1,4*d);
 for(let i=0;i<n;i++){const x=(i/(n-1)*2-1)*g;let y;if(mach)y=clamp(x,-1,1)/(1+1.1*d*d);else{const u=clamp(x/h,-1.5,1.5),s=u-u*u*u*4/27;y=(s*h+k*s*s)/Math.sqrt(g)}c[i]=y}SATC.set(key,c);return c}
function crushCurve(bits){const n=2048,c=new Float32Array(n),q=Math.pow(2,bits-1);for(let i=0;i<n;i++){const x=i/(n-1)*2-1;c[i]=Math.round(x*q)/q}return c}
// ponytail: crunch = 12-bit curve + low-pass at the hold rate's Nyquist, not a real zero-order hold (no aliasing)
const FID={"16k":[12,8000],"12k":[12,6000],"10k":[12,5000],"8k":[12,4000],"6k":[12,3000],"4k":[12,2000],"2k":[12,1000],SP1200:[12,11000],"SP-12":[12,12500],S950:[12,9000],MPC60:[12,16000],"SP Raw":[12,20000]};
function play(i,o={}){
 const p=S.pads[i];if(!p||(!p.w&&!p.multi)||!sound)return null;ensureAC();
 if(p.mode==="clip"&&!o.clipGo)return clipTrig(i,o);
 const now=AC.currentTime,t=Math.max(o.when||0,now);
 if(p.launch==="Toggle"&&p.mode!=="clip"){const live=S.voices.filter(v=>v.pad===i&&!v.rel);if(live.length){live.forEach(v=>rel(v,t));return null}}
 if(p.excl!=="Excl X")S.voices.forEach(v=>{if(v.pad!==i&&S.pads[v.pad].excl===p.excl)kill(v,t)});
 const maxv=p.mode==="slicer"||p.mode==="clip"?2:p.mode==="gran"?1:(+p.poly.split(" ")[1]||1);
 const mine=S.voices.filter(v=>v.pad===i);while(mine.length>=maxv)kill(mine.shift(),t);
 if(S.voices.length>=32)kill(S.voices[0],t);
 const v={pad:i,t0:t,pt0:performance.now()+(t-now)*1000,note:o.note??(p.root||60),vel:o.vel??S.vel/127,srcs:[],mode:p.mode,end:Infinity,rel:false,key:o.key};
 v.mg=G(levelMul(p,v));v.env=G(0);v.f1=AC.createBiquadFilter();let head=v.f1;
 if(MOD()){v.f2=AC.createBiquadFilter();v.f1.connect(v.f2);head=v.f2;
  const fid=FID[p.interp];if(fid&&["sample","gran"].includes(p.mode)){v.cr=AC.createWaveShaper();v.cr.curve=crushCurve(fid[0]);v.lpf=AC.createBiquadFilter();v.lpf.frequency.value=fid[1];v.cr.connect(v.lpf).connect(v.f1)}
  if(p.sat>0){v.sat=AC.createWaveShaper();v.sat.oversample="2x";v.sat.curve=satCurve(p.sat/100,!!fid&&!/k$/.test(p.interp));v.sat.connect(v.cr||v.f1)}}
 head.connect(v.env).connect(v.mg).connect(M.pads[i].in);setFilt(v,p,t);
 const into=v.sat||v.cr||v.f1,src=(buf,rate=1)=>{const s=AC.createBufferSource();s.buffer=buf;s.playbackRate.value=rate;s.connect(into);v.srcs.push(s);return s};
 if(i===0)S.duckT=t;
 S.flash["p"+i]=v.pt0;
 if(p.mode==="clip"){const buf=B(p.w),s=src(buf);s.loop=p.loopOn==="On";s.start(t,o.offset||0);v.clip={beats:clipBeats(p),at:o.atBeat??S.pos,anchorT:t,anchorOff:o.offset||0,dur:buf.duration};if(!s.loop)v.end=t+buf.duration-(o.offset||0)}
 else if(p.mode==="slicer"){const buf=B(p.w),sr=buf.sampleRate,P=[0,...[...p.slices].sort((a,b)=>a-b),buf.length],n=P.length-1;let k;
  if(o.key!=null){if(o.key<36)return null;k=Math.min(n-1,o.key-36)}else k=pickSlice(p,v,n);
  const a=P[k],b=p.playthru==="ON"?buf.length:P[k+1],s=src(buf,Math.pow(2,pv(p,"pitch",v)/12));v.slice=k;v.sl=[a,b];
  if(p.loopOn==="On"&&p.launch!=="Trigger"){s.loop=true;s.loopStart=a/sr;s.loopEnd=b/sr;s.start(t,a/sr)}else{s.start(t,a/sr,(b-a)/sr);v.end=t+(b-a)/sr/s.playbackRate.value}}
 else if(p.mode==="gran"){const buf=derived(p),sr=buf.sampleRate,m=mirror(p);v.gran={buf,next:t,st:pv(p,"start",v)/sr,len:Math.max(p.len,sr*.05)/sr,ls:m.ls/sr,le:m.le/sr,rate:Math.pow(2,(v.note-(p.root||60)+pv(p,"pitch",v))/12)};
  if(p.launch==="Trigger")v.relAt=t+Math.min(30,v.gran.len/Math.max(.05,p.speed/100))}
 else{let buf,root=p.root||60;if(p.multi){const pk=p.multi.reduce((a,b)=>Math.abs(b.root-v.note)<Math.abs(a.root-v.note)?b:a);buf=B(pk.id);root=pk.root||60}else buf=derived(p);
  if(!buf)return null;const sr=buf.sampleRate,rate=Math.pow(2,(v.note-root+pv(p,"pitch",v))/12),s=src(buf,rate);
  if(p.multi){s.start(t);v.end=t+buf.duration/rate}
  else{const m=mirror(p),st=(p.rev==="ON"?nSamp(p)-pv(p,"start",v)-p.len:pv(p,"start",v)),ln=pv(p,"len",v);
   if(p.loopMode!=="None"&&m.le>m.ls){s.loop=true;s.loopStart=m.ls/sr;s.loopEnd=(p.loopMode==="Bidirect"?m.le+(m.le-m.ls):m.le)/sr;s.start(t,Math.max(0,st)/sr);
    if(p.launch==="Trigger")v.relAt=t+Math.max(.01,(m.le-st)/sr/rate)}
   else{s.start(t,Math.max(0,st)/sr,Math.max(.001,ln/sr));v.end=t+ln/sr/rate}}}
 const A=pctT(pv(p,"att",v),9),D=pctT(pv(p,"dec",v),38),Su=p.sus/100,g=v.env.gain;
 g.setValueAtTime(0,t);g.linearRampToValueAtTime(1,t+A+.003);if(Su<1)g.setTargetAtTime(Su,t+A+.003,Math.max(D,.004)/3);
 if(o.dur!=null&&p.launch==="Gate")v.relAt=t+o.dur;
 S.voices.push(v);return v}
function pickSlice(p,v,n){const base=Math.round(pv(p,"slice",v))-1;if(p.sliceSeq==="None")return clamp(base,0,n-1);
 let k=p._ss??base-1;k=p.sliceSeq==="Forward"?k+1:p.sliceSeq==="Backwards"?k-1:p.sliceSeq==="Random"?Math.floor(Math.random()*n):k+[2,2,-1,2,-3][(p._st=(p._st||0)+1)%5];
 k=((k%n)+n)%n;p._ss=k;return k}
function rel(v,t){if(v.rel)return;v.rel=true;const p=S.pads[v.pad],R=pctT(pv(p,"rel",v),38)+.006,g=v.env.gain;
 t=Math.max(t,AC.currentTime);g.cancelScheduledValues(t);g.setTargetAtTime(0,t,R/4);v.end=t+R;v.srcs.forEach(s=>{try{s.stop(t+R*1.3+.05)}catch(_){}})}
function kill(v,t){t=Math.max(t||0,AC.currentTime);v.rel=true;v.end=t;const g=v.env.gain;g.cancelScheduledValues(t);g.setTargetAtTime(0,t,.004);v.srcs.forEach(s=>{try{s.stop(t+.03)}catch(_){}});
 S.voices=S.voices.filter(x=>x!==v)}
function keyOff(i,note){S.voices.forEach(v=>{if(v.pad===i&&(note==null||v.note===note||v.key===note)&&S.pads[i].launch==="Gate")rel(v,AC.currentTime)})}
function clipBeats(p){if(p.beats)return p.beats;const e=LIB.get(p.w);if(e&&e.beats)return e.beats;const d=B(p.w).duration*S.bpm/60;return Math.pow(2,Math.max(0,Math.round(Math.log2(d))))}
function clipTrig(i,o){const p=S.pads[i],live=S.voices.find(v=>v.pad===i&&v.clip&&!v.rel);
 if(!S.playing){S.armed.has(i)?S.armed.delete(i):S.armed.add(i);emit("clip:arm");return null}
 const q=QB[p.quant]||0,at=o.atBeat??S.pos,Bt=q?Math.ceil((at-1e-6)/q)*q:at;
 if(live){if(live.stopAt==null){live.stopAt=Bt;if(!q){kill(live,AC.currentTime)}}else live.stopAt=null;return null}
 const k=S.clipQ.findIndex(c=>c.i===i);if(k>=0){S.clipQ.splice(k,1);return null}
 S.clipQ.push({i,at:Bt,vel:o.vel});emit("clip:queue");return null}
function stopAll(hard){if(!AC)return;S.voices.slice().forEach(v=>hard?kill(v):(v.clip||v.gran||v.srcs.some(s=>s.loop))&&rel(v,AC.currentTime))}
function grains(v,until){const p=S.pads[v.pad],g=v.gran;if(!g)return;
 while(g.next<until&&!(v.rel&&g.next>v.end)){const gd=.02+Math.pow(p.gsize/100,2)*.98,ov=.15*Math.pow(20,p.dens/100),
   ivl=gd/ov*(p.dens<50?1+(Math.random()*2-1)*p.scat/100*.9:1),el=g.next-v.t0,sp=pv(p,"speed",v)/100;
  let pos=g.st+el*sp;const a=p.loopMode!=="None"?g.ls:g.st,b=p.loopMode!=="None"?g.le:g.st+g.len;if(b-a>.01&&pos>=b)pos=a+((pos-a)%(b-a));
  pos=clamp(pos+(Math.random()*2-1)*p.win/100*1.5,0,Math.max(0,g.buf.duration-gd));
  const s=AC.createBufferSource(),e=G(0),pn=AC.createStereoPanner();s.buffer=g.buf;s.playbackRate.value=g.rate;pn.pan.value=(Math.random()*2-1)*p.panr/100;
  s.connect(e).connect(pn).connect(v.cr||v.f1);const at=Math.max(g.next,AC.currentTime);e.gain.setValueAtTime(0,at);e.gain.linearRampToValueAtTime(.7/Math.sqrt(Math.max(1,ov)),at+gd/2);e.gain.linearRampToValueAtTime(0,at+gd);
  s.start(at,pos);s.stop(at+gd+.01);g.next+=ivl}}

/* ================= metronome, MIDI out ================= */
function click(t,acc){if(TOOLS.metroGain<=-96)return;const o=AC.createOscillator(),g=G(0);o.type="square";o.frequency.value=acc?1800:1100;o.connect(g).connect(TOOLS.metroOut==="HP"?M.hp:M.outs[+TOOLS.metroOut[3]-1]);
 g.gain.setValueAtTime(dbg(TOOLS.metroGain)*.25,t);g.gain.exponentialRampToValueAtTime(.0001,t+.03);o.start(t);o.stop(t+.04)}
let MIDIO=[];
function midiNote(ch,n,vel,when,dur){if(!MIDIO.length||!ch||ch==="None"||TOOLS.midiOut!=="Enabled")return;const c=+ch.slice(2)-1,ts=performance.now()+(when-AC.currentTime)*1000;
 MIDIO.forEach(o=>{try{o.send([0x90|c,n&127,Math.max(1,Math.round(vel*127))],ts);o.send([0x80|c,n&127,0],ts+Math.max(10,dur*1000))}catch(_){}})}

/* ================= sample recording (mic or resample) ================= */
let REC=null;
async function recArm(){ensureAC();const rp=S.recp;if(REC)return REC;REC={chunks:[[],[]],peak:[0,0],on:false,len:0};
 try{let src;if(rp.recIn==="Resam")src=M.post1;else{REC.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});src=AC.createMediaStreamSource(REC.stream)}
  REC.g=G(dbg(rp.gain));REC.sp=AC.createScriptProcessor(4096,2,2);src.connect(REC.g).connect(REC.sp);REC.sp.connect(M.sink);REC.src=src;
  if(rp.recIn!=="Resam"&&(rp.recMon==="On"||rp.recMon==="Auto")){REC.mon=G(1);REC.g.connect(REC.mon).connect(M.outs[0])}
  REC.sp.onaudioprocess=e=>{const ib=e.inputBuffer,ch=[0,1].map(c=>ib.getChannelData(Math.min(c,ib.numberOfChannels-1)));
   const pk=ch.map(d=>{let m=0;for(let k=0;k<d.length;k+=4)m=Math.max(m,Math.abs(d[k]));return m});REC.peak=pk.map((m,k)=>Math.max(m,REC.peak[k]*.9));
   if(REC.wait&&20*Math.log10(Math.max(...pk)+1e-9)>=rp.thresh)REC.wait=false;
   if(REC.on&&!REC.wait){const sel=rp.recIn==="Left"?[ch[0],ch[0]]:rp.recIn==="Right"?[ch[1],ch[1]]:ch;sel.forEach((d,k)=>REC.chunks[k].push(d.slice()));REC.len+=ch[0].length}}}
 catch(err){toast("No audio input: "+err.message);REC=null}
 return REC}
function recDispose(){if(!REC)return;try{REC.sp.disconnect();REC.g.disconnect();REC.mon&&REC.mon.disconnect();REC.src.disconnect(REC.g)}catch(_){}REC.stream&&REC.stream.getTracks().forEach(t=>t.stop());REC=null}
let recNo=0;
function recFinish(){if(!REC)return;const n=REC.len,i=S.pad;if(n<256){recDispose();toast("Nothing recorded");return}
 const buf=new AudioBuffer({numberOfChannels:2,length:n,sampleRate:AC.sampleRate});[0,1].forEach(c=>{let o=0;REC.chunks[c].forEach(d=>{buf.copyToChannel(d.subarray(0,Math.min(d.length,n-o)),c,o);o+=d.length})});
 recDispose();recNo++;const nm="RC"+String(recNo).padStart(6,"0"),id="Presets\\"+S.name+"\\"+nm;LIB.set(id,{id,f:"Presets\\"+S.name,n:nm,buf,root:0,beats:0,user:1});
 loadWav(i,id);S.srec=null;S.scr="pads";S.hist=[];emit("rec:sample");if(S.recp.recToPlay==="On"&&S.recp.length!=="Custom")play(i,{vel:1})}
