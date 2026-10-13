/* ================= reference data ================= */
const $=s=>document.querySelector(s);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const NN=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const noteName=m=>NN[((m%12)+12)%12]+(Math.floor(m/12)-1);
const pct=v=>v.toFixed(1)+"%";
const dbg=db=>db<=-96?0:Math.pow(10,db/20);
// musical lengths in beats (quarter notes); T = triplet, D = dotted
const QB={"1/64":1/16,"1/32T":1/12,"1/32":1/8,"1/16T":1/6,"1/16":1/4,"1/16D":3/8,"1/8T":1/3,"1/8":1/2,"1/8D":3/4,"1/4T":2/3,"1/4":1,"1/2T":4/3,"1/2":2,"1 bar":4,"2 bars":8,"4 bars":16,"8 bars":32,"16 bars":64,"32 bars":128,"64 bars":256,"128 bars":512};
const STEPLENS=["1/64","1/32T","1/32","1/16T","1/16","1/8T","1/8","1/4T","1/4","1/2T","1/2","1 bar","2 bars","4 bars","8 bars"];
const SEQQ=["1/64","1/32T","1/32","1/16T","1/16","1/8T","1/8","1/4T","1/4","1/2T","1/2","1 bar","2 bars"];
const CH16=["None",...Array.from({length:16},(_,i)=>"Ch"+(i+1))];
const OUTS=["Out 1","Out 2","Out 3","Out1L","Out1R","Out2L","Out2R","Out3L","Out3R"];
const POLY=["Mono","Poly 2","Poly 4","Poly 6","Poly 8"];
const LFOB=["8","4","2","1","1/2","1/2T","1/4","1/4T","1/8","1/8T","1/16","1/16T","1/32","1/32T","1/64"]; // bars
const SCALES={Major:[0,2,4,5,7,9,11],Minor:[0,2,3,5,7,8,10],Dorian:[0,2,3,5,7,9,10],Phrygian:[0,1,3,5,7,8,10],Lydian:[0,2,4,6,7,9,11],Mixolydian:[0,2,4,5,7,9,10],Locrian:[0,1,3,5,6,8,10],
  "Harm Min":[0,2,3,5,7,8,11],"Mel Min":[0,2,3,5,7,9,11],"Maj Pent":[0,2,4,7,9],"Min Pent":[0,3,5,7,10],Blues:[0,3,5,6,7,10],Chromatic:[0,1,2,3,4,5,6,7,8,9,10,11]};
// blackbox-mod 3.1.n chord shapes for the Keys screen (diatonic ones stack scale degrees)
const CHORDS={Off:null,Tri:"d024",["7th"]:"d0246",["9th"]:"d02468",Su2:"d014",Su4:"d034",["6th"]:"d0245",Ad9:"d0248",Pwr:"d047",Oct:"d07",Opn:"d049",Shl:"d026",Qrt:"d036",m7:[0,3,7,10],m9:[0,3,7,10,14],Mj7:[0,4,7,11]};
const FIDELITY=["Normal","High Q","SP1200","SP-12","S950","MPC60","SP Raw","16k","12k","10k","8k","6k","4k","2k"];
const COMPS=["Off","Stock","Glue","Punch","Opto","Squash","Limit"];
const MODSRC=["None","LFO","VEL","PTCH","MODW","MVOL","MPAN"];
const MODSRC_MOD=["EXP1","EXP2","PUMP","LINR"];

/* pad parameters: n name, r range, st knob step, o options, f format, mod = modulation target */
const PP={
 level:{n:"Level",r:[-96,12],st:.5,f:v=>(v>0?"+":"")+v.toFixed(1)+"dB",mod:1,d:"Loudness of the pad, −96 to +12 dB. Velocity modulates it by default."},
 pitch:{n:"Pitch",r:[-24,24],st:1,f:v=>(v>0?"+":"")+v.toFixed(1)+"st",mod:1,d:"Pitch up or down, ±24 semitones."},
 filter:{n:"Filter",r:[-100,100],st:1,f:v=>v<0?"LP "+(-v).toFixed(0)+"%":v>0?"HP "+v.toFixed(0)+"%":"Off",mod:1,d:"Negative = low-pass, positive = high-pass; the value sets the cutoff."},
 res:{n:"Res",r:[0,100],st:1,f:pct,mod:1,d:"Boost around the filter cutoff."},
 att:{n:"Attack",r:[0,100],st:1,f:pct,mod:1,d:"Time to reach full level; logarithmic, 0 to 9 s."},
 dec:{n:"Decay",r:[0,100],st:1,f:pct,mod:1,d:"Time from the peak down to the sustain level; 0 to 38 s."},
 sus:{n:"Sustain",r:[0,100],st:1,f:pct,d:"Level held while the note is held."},
 rel:{n:"Release",r:[0,100],st:1,f:pct,mod:1,d:"Fade-out after the note ends; 0 to 38 s. In Trigger mode it starts at the end point (or loop end)."},
 loopMode:{n:"Loop Mode",o:["None","Forward","Bidirect"],d:"None plays Start→Start+Length once. Forward loops Loop Start→Loop End. Bidirect ping-pongs."},
 fade:{n:"Loop Fade",r:[0,100],st:1,f:pct,d:"Cross-fades audio from just before Loop Start into the end of the loop (Forward only)."},
 rev:{n:"Reverse",o:["OFF","ON"],d:"Play the sample backwards."},
 start:{n:"Start",samp:1,mod:1,d:"Sample number where playback begins."},
 len:{n:"Length",samp:1,mod:1,d:"How many samples play past Start when not looping."},
 ls:{n:"Loop Start",samp:1,mod:1,d:"Where looping begins. Read from and saved to the WAV file."},
 le:{n:"Loop End",samp:1,mod:1,d:"Where looping ends."},
 loopOn:{n:"Loop Mode",o:["Off","On"],d:"Clips loop the whole file. Slicers loop the slice (needs Gate or Toggle launch)."},
 beats:{n:"Beat Count",r:[0,512],st:1,f:v=>v?String(v):"Auto",d:"Beats in the file; Auto reads an ACID tag or guesses a power of two near the tempo."},
 quant:{n:"Quant Size",o:["None","1/16","1/8","1/4","1/2","1 bar","2 bars","4 bars","8 bars"],d:"Start and stop snap to the next boundary of this size."},
 sync:{n:"Sync",o:["None","1/16","1/8","1/4","1/2","1 bar","Slice"],d:"Re-aligns the clip to the clock every unit so it can't drift. Small units for drums, large for drones."},
 ssync:{n:"Sync",o:["Off","1/64","1/32T","1/32","1/16T","1/16","1/8T","1/8","1/4T","1/4","1/2T","1/2","1 bar","2 bars"],d:"Slicer timing sync (shown only in this simulation)."},
 playthru:{n:"PlayThru",o:["OFF","ON"],d:"ON keeps playing past the end of the slice to the end of the file."},
 slice:{n:"Slice",r:[1,64],st:1,f:v=>String(Math.round(v)),mod:1,d:"Which slice plays when the pad is triggered."},
 sliceSeq:{n:"Slice Seq",o:["None","Backwards","Forward","Random","Stagger"],d:"Each trigger advances to another slice in this order."},
 gsize:{n:"Grain Size",r:[0,100],st:1,f:pct,d:"Grain length, about 20 ms to 1 s."},
 dens:{n:"Density",r:[0,100],st:1,f:pct,d:"Grains per second; above 50% they overlap constantly."},
 scat:{n:"Scatter",r:[0,100],st:1,f:pct,d:"Below 50% density: how unevenly grains are spaced."},
 speed:{n:"Speed",r:[0,200],st:1,f:v=>v.toFixed(0)+"%",mod:1,d:"How fast the play position moves through the file. 0% freezes it."},
 win:{n:"Window",r:[0,100],st:1,f:pct,d:"How far around the play position grains are picked from."},
 panr:{n:"Pan Rnd",r:[0,100],st:1,f:pct,d:"Random stereo spread of the grains."},
 lfoWave:{n:"Waveform",o:["Saw","Rev Saw","Triangle","Pos Tri","Sine","Pos Sine","Square","Pos Square","Random"],d:"Shape of the pad's LFO."},
 lfoRate:{n:"Rate",r:[0,100],st:1,mod:1,d:"About 0.1 to 12 Hz, or a note length when Beat is On."},
 lfoDepth:{n:"Depth",r:[0,100],st:1,f:pct,mod:1,d:"Amplitude of the LFO."},
 lfoBeat:{n:"Beat",o:["Off","On"],d:"Sync the LFO rate to the clock."},
 lfoTrig:{n:"Trig",o:["Off","On"],d:"Restart the LFO on every note."},
 launch:{n:"Launch",o:["Trigger","Gate","Toggle"],d:"Trigger plays to the end. Gate stops when you let go. Toggle starts, and the next trigger stops it."},
 out:{n:"Output",o:OUTS,d:"Which rear output jack (stereo, or one side). PHONES always gets everything."},
 pan:{n:"Pan",r:[-100,100],st:1,f:pct,mod:1,d:"Position in the stereo field."},
 poly:{n:"Poly Mode",o:POLY,d:"Maximum voices for this pad, drawn from the shared pool. Use the lowest you need."},
 excl:{n:"Excl Group",o:["Excl X","Excl A","Excl B","Excl C","Excl D"],d:"Pads in the same group cut each other off (open/closed hats). Excl X = none."},
 midiIn:{n:"MIDI In",o:CH16,d:"MIDI channel that plays this pad chromatically (or its slices)."},
 padNote:{n:"Pad Note",r:[0,127],st:1,f:v=>v?noteName(v):"Default",d:"Which note on the Global In channel triggers this pad."},
 sat:{n:"Saturation",r:[0,100],st:1,f:pct,d:"blackbox-mod: replaces Overdrive with a warm soft saturation (second harmonic, darker as it rises). In a Fidelity machine mode it drives the converter input instead: hitting the SP's inputs hot."},
 interp:{n:"Interp",o:["Normal","High Q"],d:"High Q reduces aliasing when pitch-shifting, at a CPU cost."},
 root:{n:"Root Note",r:[0,127],st:1,f:v=>v?noteName(v):"None",d:"The note that plays the sample unshifted (None = C4)."},
};
const MAINK=["level","pitch","filter","res","att","dec","sus","rel"];
function posKeys(p){return p.mode==="clip"?["loopOn","beats","quant","sync"]:p.mode==="slicer"?["loopOn","playthru","beats","quant","ssync","slice","sliceSeq"]
  :p.mode==="gran"?["loopMode","rev","start","len","ls","le","gsize","dens","scat","speed","win","panr"]:["loopMode","fade","rev","start","len","ls","le"]}
const LFOK=["lfoWave","lfoRate","lfoDepth","lfoBeat","lfoTrig"];
function confKeys(p){return ["launch","out","pan","poly","excl","midiIn","padNote",...(MOD()?["sat"]:[]),...(["sample","gran"].includes(p.mode)?["interp","root"]:[])]}
function padTabs(p){return p.multi?["Main","LFO","Conf"]:["Main","Pos","LFO","Conf"]}

/* effects */
const DLV=["1/64","1/32","1/16","1/8T","1/16D","1/8","1/4T","1/8D","1/4","1/2T","1/2","1 bar"];
const FXP={
 dtime:{n:"Delay",r:[0,100],st:1,mod:1,d:"Delay length: a note value when Beat is on, else 0–100%."},
 fb:{n:"Feedback",r:[0,100],st:1,f:pct,mod:1,d:"Repeats. 0% = a single echo."},
 cut:{n:"Cutoff",r:[-100,100],st:1,f:v=>v<0?"LP "+(-v).toFixed(0)+"%":"HP "+v.toFixed(0)+"%",d:"Delay filter cutoff when Filter is on (− low-pass, + high-pass)."},
 width:{n:"Width",r:[0,100],st:1,f:pct,d:"Width of the filter band."},
 beat:{n:"Beat",o:["Off","On"],btn:1,d:"Sync the delay time to the clock."},
 filt:{n:"Filter",o:["Off","On"],btn:1,d:"Filter the echoes."},
 ping:{n:"Ping",o:["Off","On"],btn:1,d:"Echoes alternate left and right."},
 dtype:{n:"Type",o:["Delay","Munchi"],btn:1,mod3:1,d:"blackbox-mod: Munchi is a port of the CHOMPI TEMPO granular delay."},
 decay:{n:"Decay",r:[0,100],st:1,f:pct,mod:1,d:"Reverb length, from dry to fully wet."},
 damp:{n:"Damping",r:[0,100],st:1,f:pct,mod:1,d:"Highs die away sooner, like a room with soft walls."},
 pre:{n:"Predelay",r:[0,100],st:1,f:pct,d:"Gap before the reverb starts."},
 rtype:{n:"Type",o:["Plate","Room"],btn:1,mod3:1,d:"blackbox-mod: Plate (stock) or Room, an 8-line feedback-delay-network room after the Mutable Instruments one."},
 wand:{n:"Wand",r:[0,100],st:1,f:pct,mod:1,d:"blackbox-mod Munchi: 50% = off. Left = glitch repeats (retrigger, reverse, octave up/down), right = the delay feeds a diffusion reverb. The farther from the middle, the shorter the note length."},
 mrnd:{n:"Random",r:[0,100],st:1,f:pct,mod:1,d:"blackbox-mod Munchi: how often a random glitch event fires."},
 mfrz:{n:"Freeze",o:["Off","On"],btn:1,mod3:1,d:"blackbox-mod Munchi: hold what's in the buffer and loop it; new input is ignored."},
 mclk:{n:"Clock",o:["1x","1/2x","2x"],btn:1,mod3:1,d:"blackbox-mod Munchi: the delay follows the tempo; 1/2x doubles the time, 2x halves it."},
 mwid:{n:"Width",o:["TEMPO","Mono","Wide","Huge"],btn:1,mod3:1,d:"blackbox-mod Munchi: stereo spread of the repeats (TEMPO = as on the CHOMPI TEMPO)."},
 mduck:{n:"Duck",o:["Auto","Off","Light","Heavy"],btn:1,mod3:1,d:"blackbox-mod Munchi: repeats duck under new material once the feedback is high. (Not simulated.)"},
 rsize:{n:"Size",r:[0,100],st:1,f:pct,d:"blackbox-mod Room: line lengths ×0.5 … ×2 (50% = as designed)."},
 rmod:{n:"Mod",r:[0,100],st:1,f:pct,d:"blackbox-mod Room: wobble depth inside the tail. (Shown only; not simulated.)"},
 rearly:{n:"Early",r:[0,100],st:1,f:pct,d:"blackbox-mod Room: level of the early reflections (50% = as designed)."},
 rwid:{n:"Width",r:[0,100],st:1,f:pct,d:"blackbox-mod Room: stereo width of the tail (100% = as designed)."},
};
const EQT=["None","L Cut","L Shelf","Param","H Shelf","H Cut"];

/* tools (global) parameters */
const TP={
 Main:[["hp","Headphone",[-60,6,.5],v=>v.toFixed(1)+"dB"],["compModel","Compressor",COMPS,null,1],["compTh","Comp Thresh",[-24,12,1],v=>(v>0?"+":"")+v+"dB",1],["o1","Out 1 Vol",[-60,6,.5],v=>v.toFixed(1)+"dB"],["o2","Out 2 Vol",[-60,6,.5],v=>v.toFixed(1)+"dB"],["o3","Out 3 Vol",[-60,6,.5],v=>v.toFixed(1)+"dB"],
   ["bright","Brightness",[10,100,5],pct],["metro","Metronome",["Off","Play","Rec"]],["metroOut","Metro Out",["HP","Out1","Out2","Out3"]],["metroGain","Metro Gain",[-96,20,1],v=>v.toFixed(0)+"dB"],
   ["comp","Compressor",["OFF","ON"],null,-1],["sd","SD Mode",["High Speed","Compatible"]]],
 Rec:[["recToPlay","RecToPlay",["OFF","ON"]],["recConfig","RecConfig",["Global","Per Pad"]],["leadIn","Lead In",["OFF","ON"]]],
 MIDI:[["globalIn","Global In",["None","Omni",...CH16.slice(1)]],["midiSeq","MIDI Seq",CH16],["pgmIn","PGM In",["OFF","ON"]],["padRec","Pad Record",["OFF","ON"]],["midiOut","MIDI Out",["Enabled","MIDI In Thru","USB Dvc Thru"]],["usbOut","USB Dev Out",["OFF","ON"]]],
 Clock:[["clkRx","Receive",["Off","USB Device","MIDI In","All"]],["clkTx","Send",["Off","MIDI Out","USB Device","All"]],["anaIn","Analog In",["1","2","4","8","12","24"]],["anaOut","Analog Out",["1","2","4","8","12","24"]]],
};
const TOOLDEF={hp:-6,o1:0,o2:0,o3:0,bright:100,metro:"Rec",metroOut:"HP",metroGain:-12,comp:"ON",compModel:"Stock",compTh:0,sd:"High Speed",recToPlay:"OFF",recConfig:"Global",leadIn:"ON",
  globalIn:"Omni",midiSeq:"None",pgmIn:"OFF",padRec:"OFF",midiOut:"Enabled",usbOut:"ON",clkRx:"All",clkTx:"All",anaIn:"4",anaOut:"4"};
const RECP=[["recIn","Rec Input",["L+R","Left","Right","Resam"]],["gain","Gain",[-96,20,.5],v=>v.toFixed(2)+" dB"],["recToPlay","RecToPlay",["Off","On"]],
  ["length","Length",["Custom","1/4","1/2","1 bar","2 bars","4 bars","8 bars","16 bars","32 bars","64 bars","128 bars"]],["recQuant","Rec Quant",["None","1/16","1/8","1/4","1/2","1 bar","2 bars","4 bars","8 bars"]],
  ["recMon","Rec Mon",["Off","Auto","On"]],["monOut","Mon Output",OUTS],["recThresh","RecThresh",["Off","On"]],["thresh","Threshold",[-96,0,1],v=>v.toFixed(2)+" dB"]];

/* ================= sound library: synthesized in OfflineAudioContexts ================= */
const SR=44100;
let NZ=null;
function ren(dur,fn){const c=new OfflineAudioContext(1,Math.ceil(dur*SR),SR);if(!NZ){NZ=new Float32Array(SR*2);for(let i=0;i<NZ.length;i++)NZ[i]=Math.random()*2-1}
  const nb=c.createBuffer(1,NZ.length,SR);nb.copyToChannel(NZ,0);const out=c.createGain();out.gain.value=.9;out.connect(c.destination);fn({c,nb,out});return c.startRendering()}
function O(K,type,f,t,e){const o=K.c.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);o.start(t);o.stop(e);return o}
function NOI(K,t,e){const n=K.c.createBufferSource();n.buffer=K.nb;n.loop=true;n.start(t,Math.random());n.stop(e);return n}
function FL(K,type,f,q=1){const b=K.c.createBiquadFilter();b.type=type;b.frequency.value=f;b.Q.value=q;return b}
function HT(K,src,t,peak,dec,...fx){let x=src;fx.forEach(f=>{x.connect(f);x=f});const g=K.c.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(peak,.0002),t+.002);g.gain.exponentialRampToValueAtTime(.0001,t+.002+dec);x.connect(g).connect(K.out);return g}
const hz=m=>440*Math.pow(2,(m-69)/12);
const DR={
 kick(K,t,a){const o=O(K,"sine",150,t,t+.7);o.frequency.exponentialRampToValueAtTime(45,t+.12);HT(K,o,t,a,.45);HT(K,O(K,"triangle",1000,t,t+.03),t,.25*a,.012)},
 k808(K,t,a){const o=O(K,"sine",70,t,t+1.6);o.frequency.exponentialRampToValueAtTime(43,t+.08);HT(K,o,t,a,1.3);HT(K,O(K,"square",900,t,t+.02),t,.1*a,.008)},
 snare(K,t,a){HT(K,O(K,"triangle",190,t,t+.2),t,.45*a,.09);HT(K,NOI(K,t,t+.35),t,.55*a,.18,FL(K,"highpass",1200))},
 snlo(K,t,a){HT(K,O(K,"triangle",230,t,t+.15),t,.4*a,.07);HT(K,NOI(K,t,t+.3),t,.6*a,.14,FL(K,"bandpass",1900,.8),FL(K,"lowpass",5200))},
 clap(K,t,a){[0,.011,.023].forEach(d=>HT(K,NOI(K,t+d,t+d+.03),t+d,.5*a,.012,FL(K,"bandpass",1200,2)));HT(K,NOI(K,t+.03,t+.4),t+.03,.45*a,.17,FL(K,"bandpass",1200,2))},
 rim(K,t,a){HT(K,O(K,"triangle",1700,t,t+.06),t,.4*a,.03);HT(K,NOI(K,t,t+.06),t,.25*a,.02,FL(K,"highpass",2500))},
 hhc(K,t,a){HT(K,NOI(K,t,t+.2),t,.35*a,.045,FL(K,"highpass",7000),FL(K,"peaking",10000,1))},
 hho(K,t,a){HT(K,NOI(K,t,t+.6),t,.3*a,.35,FL(K,"highpass",7000),FL(K,"peaking",10000,1))},
 ride(K,t,a){HT(K,NOI(K,t,t+1.2),t,.2*a,.8,FL(K,"bandpass",8000,3));HT(K,O(K,"square",520,t,t+.6),t,.05*a,.4,FL(K,"highpass",3000))},
 crash(K,t,a){HT(K,NOI(K,t,t+2),t,.32*a,1.5,FL(K,"highpass",4500))},
 tomL(K,t,a){const o=O(K,"sine",150,t,t+.6);o.frequency.exponentialRampToValueAtTime(90,t+.1);HT(K,o,t,.8*a,.38)},
 tomH(K,t,a){const o=O(K,"sine",240,t,t+.5);o.frequency.exponentialRampToValueAtTime(150,t+.08);HT(K,o,t,.75*a,.3)},
 shaker(K,t,a){const g=HT(K,NOI(K,t,t+.15),t,.3*a,.06,FL(K,"bandpass",6500,1.2));g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.3*a,t+.035);g.gain.exponentialRampToValueAtTime(.0001,t+.11)},
 cow(K,t,a){const f=FL(K,"bandpass",800,3);HT(K,O(K,"square",540,t,t+.35),t,.3*a,.25,f);HT(K,O(K,"square",800,t,t+.35),t,.3*a,.25,f)},
 blip(K,t,a){const o=O(K,"sine",1300,t,t+.12);o.frequency.exponentialRampToValueAtTime(500,t+.08);HT(K,o,t,.6*a,.08)},
 snap(K,t,a){HT(K,NOI(K,t,t+.1),t,.6*a,.04,FL(K,"bandpass",2600,2));HT(K,O(K,"triangle",1100,t,t+.04),t,.2*a,.015)},
};
const TONE={ // oscillators [type, detune], lowpass [base, env peak, env decay, Q], level, attack, release
 bass:{o:[["sawtooth",0],["square",-1200]],f:[220,1600,.2,6],l:.35,a:.004,r:.08},
 sub:{o:[["sine",0],["triangle",1200]],f:[600,900,.3,1],l:.6,a:.004,r:.1},
 pluck:{o:[["triangle",0],["sawtooth",0]],f:[500,5200,.12,2],l:.3,a:.002,r:.25},
 lead:{o:[["square",0],["sawtooth",7]],f:[1200,4200,.3,2],l:.22,a:.004,r:.15},
 pad:{o:[["sawtooth",-9],["sawtooth",9],["triangle",1200]],f:[700,2200,1.2,1],l:.12,a:.5,r:1},
 stab:{o:[["sawtooth",-6],["sawtooth",6]],f:[400,3800,.18,3],l:.12,a:.003,r:.2},
 ep:{o:[["sine",0],["sine",1200],["triangle",0]],f:[1800,3200,.4,.7],l:.28,a:.003,r:.4},
};
function TN(K,inst,m,t,dur,a=1){const P=TONE[inst],f=hz(m),end=t+dur+P.r;
  const lp=FL(K,"lowpass",P.f[0],P.f[3]);lp.frequency.setValueAtTime(P.f[0],t);lp.frequency.linearRampToValueAtTime(P.f[1],t+.005+P.a*.5);lp.frequency.exponentialRampToValueAtTime(P.f[0],t+.005+P.a+P.f[2]);
  const g=K.c.createGain(),l=P.l*a;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(l,t+P.a);g.gain.setValueAtTime(l,t+dur);g.gain.exponentialRampToValueAtTime(.0001,end);
  P.o.forEach(([type,det])=>{const o=O(K,type,f,t,end+.05);o.detune.value=det;o.connect(lp)});lp.connect(g).connect(K.out)}
function BELL(K,m,t,dur,a=1){[[1,.5,dur],[2.76,.2,dur*.5],[5.4,.1,dur*.25],[8.9,.05,dur*.12]].forEach(([r,l,d])=>HT(K,O(K,"sine",hz(m)*r,t,t+d+.1),t,l*a,d))}
function VOX(K,m,t,dur,a=1,vow=[800,1150,2900]){const s=O(K,"sawtooth",hz(m),t,t+dur+.3),vib=O(K,"sine",5.2,t,t+dur+.3),vg=K.c.createGain();vg.gain.value=hz(m)*.012;vib.connect(vg).connect(s.frequency);
  const g=K.c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.5*a,t+.25);g.gain.setValueAtTime(.5*a,t+dur);g.gain.linearRampToValueAtTime(0,t+dur+.3);
  vow.forEach((f,i)=>{const b=FL(K,"bandpass",f,f/90);const bg=K.c.createGain();bg.gain.value=[1,.5,.25][i];s.connect(b).connect(bg).connect(g)});g.connect(K.out)}
// a loop from a step string per drum: "x" hit, "o" soft
function LOOP(K,bpm,bars,lines,swing=0){const st=60/bpm/4;lines.forEach(([d,s])=>[...s].forEach((c,i)=>{if(c==="."||c===" ")return;DR[d](K,i*st+(i%2?swing*st:0),c==="x"?1:.5)}))}
const LIBDEF=[
 ...[["Kick 1","kick"],["Kick 808","k808",1.7],["Snare 1","snare"],["Snare Lofi","snlo"],["Clap","clap",.6],["Rim","rim",.2],["HH Closed","hhc",.25],["HH Open","hho",.6],
   ["Ride","ride",1.3],["Crash","crash",2],["Tom Lo","tomL"],["Tom Hi","tomH"],["Shaker","shaker",.2],["Cowbell","cow",.4],["Blip","blip",.2],["Snap","snap",.2]]
   .map(([n,d,len])=>({f:"Drums",n,len:len||.7,g:K=>DR[d](K,.002,1)})),
 {f:"Synth",n:"Bass C2",len:1.2,root:36,g:K=>TN(K,"bass",36,0,.8)},
 {f:"Synth",n:"Sub C1",len:1.4,root:24,g:K=>TN(K,"sub",24,0,1.1)},
 {f:"Synth",n:"Pluck C3",len:1,root:48,g:K=>TN(K,"pluck",48,0,.2)},
 {f:"Synth",n:"Lead C4",len:1.4,root:60,g:K=>TN(K,"lead",60,0,1)},
 {f:"Synth",n:"Stab Cm7",len:1,root:48,g:K=>[48,51,55,58].forEach(m=>TN(K,"stab",m,0,.25))},
 {f:"Synth",n:"Stab Fmaj7",len:1,root:53,g:K=>[53,57,60,64].forEach(m=>TN(K,"stab",m,0,.25))},
 {f:"Synth",n:"Bell C4",len:2.5,root:60,g:K=>BELL(K,60,0,2.2)},
 {f:"Synth",n:"Vox Ah C3",len:2.4,root:48,g:K=>VOX(K,48,0,1.9)},
 {f:"Loops",n:"Drums 90 2bar",len:16/3,beats:8,g:K=>LOOP(K,90,2,[["kick","x.......x.x.....x.......x..x...."],["snlo","....x.......x.......x.......x..."],["hhc","x.x.x.x.x.x.x.xox.x.x.x.x.x.x.xo"]],.2)},
 {f:"Loops",n:"Break 95",len:60/95*4,beats:4,g:K=>LOOP(K,95,1,[["kick","x.........x....."],["snare","....x..o.o..x..."],["hhc","x.x.x.x.x.x.x.x."],["ride","..............x."]])},
 {f:"Loops",n:"Perc 124",len:60/124*4,beats:4,g:K=>LOOP(K,124,1,[["shaker","xoxoxoxoxoxoxoxo"],["rim","...x..x....x..x."],["cow","..........x....."]])},
 {f:"Loops",n:"Arp Am 124",len:60/124*4,beats:4,root:57,g:K=>[57,60,64,69,72,69,64,60,57,60,64,67,72,67,64,60].forEach((m,i)=>TN(K,"pluck",m,i*60/124/4,.08,.8))},
 {f:"Loops",n:"Keys 90 2bar",len:16/3,beats:8,g:K=>{const b=60/90;[[0,[57,60,64,67]],[2.5,[57,60,64,67]],[4,[53,57,60,64]],[6.5,[55,59,62,65]]].forEach(([at,ch])=>ch.forEach(m=>TN(K,"ep",m,at*b,b*1.2,.7)))}},
 {f:"Textures",n:"Pad Wash C3",len:4.5,root:48,g:K=>[48,55,60,63,67].forEach(m=>TN(K,"pad",m,0,3.2,.9))},
 {f:"Textures",n:"Glass Drone",len:4.5,root:60,g:K=>[60,67,72,79,84].forEach((m,i)=>BELL(K,m,i*.6,3.5,.7))},
 {f:"Textures",n:"Vox Choir",len:3.4,root:48,g:K=>[48,55,60,63].forEach((m,i)=>VOX(K,m,i*.05,2.8,.5,i%2?[400,1600,2700]:[800,1150,2900]))},
 ...[36,48,60,72].map(m=>({f:"Multi\\EP Keys",n:"EP "+noteName(m),len:2.2,root:m,g:K=>TN(K,"ep",m,0,1.4)})),
];
const LIB=new Map(); // id -> {id,f,n,buf,root,beats}
let libReady=null;
function buildLib(){libReady=Promise.all(LIBDEF.map(d=>ren(d.len,d.g).then(buf=>{const id=d.f+"\\"+d.n;LIB.set(id,{id,f:d.f,n:d.n,buf,root:d.root||0,beats:d.beats||0})})));return libReady}
const B=id=>LIB.get(id)?.buf;
