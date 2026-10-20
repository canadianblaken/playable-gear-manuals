/* ================= audio (stand-in instruments) ================= */
let AC=null,MASTER=null,SOUND=true,acOff=-1e9;
function ensureAC(){if(AC){if(AC.state==="suspended")AC.resume();return AC}
 try{AC=new (window.AudioContext||window.webkitAudioContext)();MASTER=AC.createGain();MASTER.gain.value=.5;
  const comp=AC.createDynamicsCompressor();MASTER.connect(comp);comp.connect(AC.destination)}catch(e){AC=null}return AC}
/* performance.now() seconds -> AudioContext time; currentTime advances in chunks, so keep the running max offset */
function toAC(t){if(!AC)return 0;acOff=Math.max(acOff,AC.currentTime-performance.now()/1000);return Math.max(AC.currentTime,t+acOff)}
const TIMBRE=[{w:"sawtooth",cut:900,q:6,a:.004,r:.08,lvl:.32,oct:0},{w:"sawtooth",cut:1800,q:3,a:.005,r:.12,lvl:.22,det:7},{w:"square",cut:2600,q:1,a:.003,r:.15,lvl:.16},{w:"triangle",cut:3200,q:.7,a:.02,r:.35,lvl:.3,det:5}];
let BEND=0; // semitones
const LIVE=new Set();
function voice(track,midi,vel,t0,t1){if(!SOUND||!ensureAC())return null;const T=TIMBRE[track],a=toAC(t0);
 const o=AC.createOscillator(),o2=T.det?AC.createOscillator():null,f=AC.createBiquadFilter(),g=AC.createGain();
 o.type=T.w;o.frequency.value=hz(midi);o.detune.value=BEND*100;if(o2){o2.type=T.w;o2.frequency.value=hz(midi);o2.detune.value=BEND*100+T.det;o2.connect(f)}
 f.type="lowpass";f.frequency.value=T.cut*(.6+vel/127*.8);f.Q.value=T.q;o.connect(f);f.connect(g);g.connect(MASTER);
 const lv=T.lvl*(.25+.75*vel/127);g.gain.setValueAtTime(0,a);g.gain.linearRampToValueAtTime(lv,a+T.a);g.gain.setTargetAtTime(lv*.7,a+T.a,.15);
 const v={o,o2,g,T,stop(t){const e=Math.max(AC.currentTime,t);g.gain.cancelScheduledValues(e);g.gain.setValueAtTime(g.gain.value,e);g.gain.setTargetAtTime(0,e,T.r/3);o.stop(e+T.r*2);o2&&o2.stop(e+T.r*2)}};
 o.start(a);o2&&o2.start(a);if(t1!=null)v.stop(toAC(t1));return v}
function liveOn(track,midi,vel){const v=voice(track,midi,vel,performance.now()/1000,null);if(v)LIVE.add(v);return v}
function liveOff(v){if(v&&AC){v.stop(AC.currentTime);LIVE.delete(v)}}
function setBend(semi){BEND=semi;for(const v of LIVE){v.o.detune.setTargetAtTime(semi*100,AC.currentTime,.01);v.o2&&v.o2.detune.setTargetAtTime(semi*100+v.T.det,AC.currentTime,.01)}}
let NOISE=null;function noiseBuf(){if(NOISE)return NOISE;NOISE=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const d=NOISE.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return NOISE}
/* 24 drum lanes: the lowest octave is a kit, the rest are tuned percussion */
function drum(lane,vel,t){if(!SOUND||!ensureAC())return;const a=toAC(t),g=AC.createGain(),v=.25+.75*vel/127;g.connect(MASTER);
 const env=(lv,d)=>{g.gain.setValueAtTime(lv*v,a);g.gain.exponentialRampToValueAtTime(.001,a+d)};
 const osc=(type,f0,f1,d)=>{const o=AC.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,a);if(f1)o.frequency.exponentialRampToValueAtTime(f1,a+d);o.connect(g);o.start(a);o.stop(a+d+.05)};
 const nz=(type,f,q,d)=>{const s=AC.createBufferSource();s.buffer=noiseBuf();const fl=AC.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;s.connect(fl);fl.connect(g);s.start(a);s.stop(a+d+.05)};
 switch(lane){
  case 0:env(.9,.35);osc("sine",150,42,.3);break;                 // kick
  case 1:env(.5,.06);osc("square",800,0,.04);break;              // rim
  case 2:env(.5,.18);osc("triangle",190,140,.1);nz("highpass",1500,.7,.18);break; // snare
  case 3:env(.5,.22);nz("bandpass",1200,1.2,.22);break;          // clap
  case 4:env(.6,.3);osc("sine",120,80,.3);break;                 // low tom
  case 5:env(.6,.25);osc("sine",170,110,.25);break;              // mid tom
  case 6:env(.25,.05);nz("highpass",7000,.8,.05);break;          // closed hat
  case 7:env(.6,.22);osc("sine",230,160,.22);break;              // high tom
  case 8:env(.22,.3);nz("highpass",6500,.8,.3);break;            // open hat
  case 9:env(.3,.12);osc("square",540,0,.1);osc("square",800,0,.1);break; // cowbell
  case 10:env(.2,.9);nz("highpass",5000,.5,.9);break;            // crash
  case 11:env(.4,.08);nz("bandpass",3000,3,.08);break;           // shaker
  default:env(.35,.25);osc("sine",hz(48+lane),0,.25)}             // tuned percussion
}
function click(accent,t){if(!SOUND||!ensureAC())return;const a=toAC(t),o=AC.createOscillator(),g=AC.createGain();o.frequency.value=accent?1800:1200;o.type="square";
 g.gain.setValueAtTime(.12,a);g.gain.exponentialRampToValueAtTime(.001,a+.03);o.connect(g);g.connect(MASTER);o.start(a);o.stop(a+.05)}
