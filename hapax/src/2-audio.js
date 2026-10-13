/* ================= audio: stand-in instruments =================
 Hapax is a MIDI sequencer and makes no sound. The simulation plugs a stand-in
 instrument into every MIDI channel (and the 4 CV/Gate outputs) so you can hear it. */
let AC=null,MS=null,sound=true;
const LAT=.05; // s of lookahead: events are scheduled at their exact time + LAT, hiding timer jitter
function ensureAC(){if(AC)return AC;AC=new (window.AudioContext||window.webkitAudioContext)({latencyHint:"interactive"});graph();return AC}
let acOff=-1e9; // perf ms -> audio seconds; currentTime moves in chunks so keep the running max of the offset
function acAt(pt){const cur=AC.currentTime-performance.now()/1000;acOff=Math.max(cur,acOff-.00002);return pt/1000+acOff}
const G=(v=1)=>{const g=AC.createGain();g.gain.value=v;return g};
let NOISE=null;
function graph(){MS={};MS.out=G(.8);const comp=AC.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;MS.out.connect(comp).connect(AC.destination);
 const b=AC.createBuffer(1,AC.sampleRate,AC.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;NOISE=b;MS.strips={}}
// one strip per destination: "1".."16" = MIDI channels, "cv1".."cv4" = CV/Gate pairs
function strip(k){if(!MS.strips[k]){const g=G(1),p=AC.createStereoPanner();g.connect(p).connect(MS.out);MS.strips[k]={g,p,cc:{1:0,7:100,10:64,71:20,72:40,73:0,74:80},pb:0,at:0,voices:[],last:null}}return MS.strips[k]}
const instOf=k=>k.startsWith("cv")?"LEAD":S.studio[+k-1];
const cutHz=(st,v)=>Math.min(16000,120*Math.pow(2,(st.cc[74]/127)*7.2)*(1+st.at*1.6+(v&&v.pr||0)*1.6));
function vUpdate(st,v,t){if(v.f)v.f.frequency.setTargetAtTime(cutHz(st,v)*v.fm,t,.02);if(v.f)v.f.Q.setTargetAtTime(.5+st.cc[71]/127*14,t,.02);
 const bend=Math.pow(2,st.pb*2/12);v.os&&v.os.forEach(([o,r])=>o.frequency.setTargetAtTime(hz(v.n)*r*bend,t,.01))}
function ccIn(k,num,val,t){if(!AC||!MS)return;const st=strip(k);st.cc[num]=val;t=Math.max(t,AC.currentTime);
 if(num===7)st.g.gain.setTargetAtTime(Math.pow(val/127,2)*1.2,t,.02);else if(num===10)st.p.pan.setTargetAtTime((val-64)/64,t,.02);else st.voices.forEach(v=>vUpdate(st,v,t))}
function pbIn(k,v,t){if(!AC||!MS)return;const st=strip(k);st.pb=v;st.voices.forEach(x=>vUpdate(st,x,Math.max(t,AC.currentTime)))}
function atIn(k,v,t){if(!AC||!MS)return;const st=strip(k);st.at=v;st.voices.forEach(x=>vUpdate(st,x,Math.max(t,AC.currentTime)))}
function polyAt(k,n,v,t){if(!AC||!MS)return;const st=strip(k);st.voices.filter(x=>x.n===n).forEach(x=>{x.pr=v;vUpdate(st,x,Math.max(t,AC.currentTime))})}
// play a note on a strip. vel 0..1, t audio time, dur s, pr = initial poly pressure 0..1
function synthNote(k,n,vel,t,dur,pr=0){if(!sound)return;ensureAC();t=Math.max(t,AC.currentTime);const inst=instOf(k);if(inst==="SILENT")return;const st=strip(k);
 if(inst==="DRUM MACHINE")return drum(st,n,vel,t);
 const P={"POLY SYNTH":{w:[["sawtooth",1],["sawtooth",1.006]],a:.005,d:.3,s:.55,r:.25,fm:1,fe:2.2,g:.11},"MONO BASS":{w:[["square",1],["sine",.5]],a:.003,d:.18,s:.6,r:.08,fm:.5,fe:3,g:.16,mono:1},
  "PAD":{w:[["sawtooth",1],["sawtooth",.996],["sawtooth",2.003]],a:.35,d:.6,s:.8,r:1.2,fm:.8,fe:.6,g:.06},"LEAD":{w:[["sawtooth",1],["square",1.004]],a:.01,d:.2,s:.7,r:.15,fm:1.4,fe:1.2,g:.09,mono:1,vib:1},
  "PLUCK":{w:[["triangle",1],["sawtooth",2]],a:.002,d:.25,s:0,r:.2,fm:1.6,fe:3,g:.14},"BELL":{fmb:1,a:.002,d:1.2,s:0,r:.8,g:.12}}[inst];
 if(P.mono){st.voices.forEach(v=>vOff(v,t));st.voices=[]}
 const v={n,pr,fm:P.fm||1,os:[],nodes:[],end:t+dur+P.r+.1},amp=G(0),mixG=st.g;const a=P.a+st.cc[73]/127*1.5,r=P.r+st.cc[72]/127*2;v.r=r;v.amp=amp;
 if(P.fmb){const car=AC.createOscillator(),mod=AC.createOscillator(),mg=G(hz(n)*3*vel);car.frequency.value=hz(n);mod.frequency.value=hz(n)*3.5;mod.connect(mg).connect(car.frequency);car.connect(amp);mg.gain.setTargetAtTime(hz(n)*.3,t,.4);
  v.os=[[car,1],[mod,3.5]];[car,mod].forEach(o=>{o.start(t);o.stop(t+dur+r+2)});v.nodes=[car,mod]}
 else{const f=AC.createBiquadFilter();f.type="lowpass";v.f=f;f.connect(amp);
  P.w.forEach(([w,ra])=>{const o=AC.createOscillator();o.type=w;o.frequency.value=hz(n)*ra*Math.pow(2,st.pb*2/12);o.connect(f);o.start(t);o.stop(t+dur+r+.3);v.os.push([o,ra]);v.nodes.push(o)});
  const fc=cutHz(st,v)*v.fm;f.Q.value=.5+st.cc[71]/127*14;f.frequency.setValueAtTime(fc,t);f.frequency.linearRampToValueAtTime(Math.min(16000,fc*(1+P.fe*vel)),t+.005+a*.5);f.frequency.setTargetAtTime(fc,t+.01+a,.15);
  if(P.vib||st.cc[1]){const l=AC.createOscillator(),lg=G(2+st.cc[1]/127*14);l.frequency.value=5.5;l.connect(lg);v.os.forEach(([o])=>lg.connect(o.detune));l.start(t);l.stop(t+dur+r+.3)}}
 amp.connect(mixG);const pk=P.g*(.35+.65*vel);amp.gain.setValueAtTime(0,t);amp.gain.linearRampToValueAtTime(pk,t+a);amp.gain.setTargetAtTime(pk*P.s+.0001,t+a,P.d/3);
 const off=t+Math.max(dur,a*.5);amp.gain.setTargetAtTime(0,off,r/4);v.off=off;st.voices.push(v);st.voices=st.voices.filter(x=>x.end>AC.currentTime);return v}
function vOff(v,t){if(v.off<=t)return;try{v.amp.gain.cancelScheduledValues(t);v.amp.gain.setTargetAtTime(0,t,.01);v.nodes.forEach(o=>o.stop(t+.08))}catch(_){}v.off=t}
function allSoundOff(){if(!MS)return;Object.values(MS.strips).forEach(st=>{st.voices.forEach(v=>vOff(v,AC.currentTime));st.voices=[]})}
// GM-compatible drum machine: KICK 36, SNARE 38, CLOSED HH 42, OPEN HH 46, LOW TOM 41, HI TOM 43, CLAP 39, COWBELL 56, RIM 37, CRASH 49, RIDE 51, SHAKER 70, CONGA 64, CLAVE 75, TAMB 54, BLIP 76
const GMDRUM={35:0,36:0,37:8,38:1,40:1,39:6,41:4,45:4,47:4,43:5,48:5,50:5,42:2,44:2,46:3,49:9,57:9,51:10,59:10,56:7,70:11,82:11,62:12,63:12,64:12,75:13,54:14,76:15,77:15};
function drum(st,n,vel,t){const k=GMDRUM[n]!=null?GMDRUM[n]:15,out=st.g,g=G(0);g.connect(out);const V=.25+.75*vel;
 const osc=(type,f0,f1,dt,gain,dec)=>{const o=AC.createOscillator(),gg=G(0);o.type=type;o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dt);o.connect(gg).connect(out);gg.gain.setValueAtTime(gain*V,t);gg.gain.exponentialRampToValueAtTime(.0001,t+dec);o.start(t);o.stop(t+dec+.05)};
 const noise=(type,f,q,gain,dec,start=0)=>{const s=AC.createBufferSource(),fl=AC.createBiquadFilter(),gg=G(0);s.buffer=NOISE;fl.type=type;fl.frequency.value=f;fl.Q.value=q;s.connect(fl).connect(gg).connect(out);gg.gain.setValueAtTime(0,t+start);gg.gain.linearRampToValueAtTime(gain*V,t+start+.001);gg.gain.exponentialRampToValueAtTime(.0001,t+start+dec);s.start(t+start,Math.random()*.5);s.stop(t+start+dec+.05)};
 [()=>{osc("sine",150,42,.12,.9,.45)},()=>{osc("triangle",220,160,.05,.35,.12);noise("highpass",1200,.7,.5,.18)},()=>noise("highpass",8000,.8,.28,.05),()=>noise("highpass",7000,.8,.25,.35),
  ()=>osc("sine",130,80,.2,.6,.35),()=>osc("sine",210,140,.15,.55,.28),()=>{[0,.011,.022].forEach(s=>noise("bandpass",1400,1.2,.5,.02,s));noise("bandpass",1300,1,.45,.16,.03)},()=>{osc("square",560,0,0,.12,.25);osc("square",845,0,0,.1,.25)},
  ()=>{osc("triangle",1700,0,0,.3,.03);noise("bandpass",3000,2,.2,.03)},()=>noise("highpass",4500,.5,.3,1.4),()=>{noise("bandpass",9000,4,.18,.8);osc("square",3200,0,0,.025,.6)},()=>noise("highpass",6000,1,.15,.07),
  ()=>osc("sine",330,250,.05,.5,.22),()=>osc("sine",2500,0,0,.4,.05),()=>{noise("bandpass",8000,3,.25,.18);noise("bandpass",11000,3,.15,.12,.004)},()=>osc("sine",n>40?hz(n+24):1600,0,0,.25,.08)][k]()}
function click(t,acc){if(!sound)return;const o=AC.createOscillator(),g=G(0);o.type="square";o.frequency.value=acc?1760:1180;o.connect(g).connect(MS.out);g.gain.setValueAtTime(.12,t);g.gain.exponentialRampToValueAtTime(.0001,t+.04);o.start(t);o.stop(t+.06)}
/* ---------- Web MIDI ---------- */
let MIDIO=[],MIDIACC=null;
function midiSend(bytes,t){if(!MIDIO.length||!AC)return;const ts=performance.now()+Math.max(0,(t-AC.currentTime))*1000;MIDIO.forEach(o=>{try{o.send(bytes,ts)}catch(_){}})}
