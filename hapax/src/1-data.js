/* ================= reference data ================= */
const $=s=>document.querySelector(s);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const NN=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const nm=m=>NN[((m%12)+12)%12]+Math.floor(m/12); // Hapax naming: C0 = 0, C5 = 60
const hz=m=>440*Math.pow(2,(m-69)/12);
const rnd=n=>Math.floor(Math.random()*n);
const deep=o=>JSON.parse(JSON.stringify(o));
const HOLDMS=380;
// scales by colour family (manual 2.7, 3.00 added the Lydians)
const SCALE_COLORS=[
 ["CHROMATIC",[["CHROMATIC",[0,1,2,3,4,5,6,7,8,9,10,11]]]],
 ["MAJOR",[["MAJOR",[0,2,4,5,7,9,11]],["HARMONIC",[0,2,4,5,7,8,11]],["AUGMENTED",[0,3,4,7,8,11]],["PENTATONIC",[0,2,4,7,9]],["PENTATONIC (V)",[0,2,5,7,9]],["PENTATONIC (ION)",[0,4,5,7,11]],["ARABIC",[0,1,4,5,7,8,11]],["LYDIAN",[0,2,4,6,7,9,11]],["LYDIAN AUGMENTED",[0,2,4,6,8,9,11]]]],
 ["MINOR",[["DORIAN",[0,2,3,5,7,9,10]],["AEOLIAN",[0,2,3,5,7,8,10]],["PHRYGIAN",[0,1,3,5,7,8,10]],["JAPANESE",[0,1,5,7,8]],["SPANISH",[0,1,3,4,5,7,8,10]],["PENTATONIC",[0,3,5,7,10]],["PENTA (DORIAN)",[0,2,3,7,9]],["PENTA (PELOG)",[0,1,3,7,8]],["BLUES",[0,3,5,6,7,10]],["ROMANIAN",[0,2,3,6,7,9,10]],["GYPSY b7",[0,1,4,5,7,8,10]],["HAWAIIAN",[0,2,3,5,7,9,11]],["MELODIC",[0,2,3,5,7,9,11]],["HARMONIC",[0,2,3,5,7,8,11]],["DIMINISHED",[0,2,3,5,6,8,9,11]],["GYPSY",[0,2,3,6,7,8,10]],["LYDIAN b6",[0,2,3,6,7,8,11]]]],
 ["DOMINANT",[["MIXOLIDIAN",[0,2,4,5,7,9,10]],["ARABIC (7)",[0,1,4,5,7,8,10]],["BLUES",[0,2,3,4,7,9,10]],["PENTATONIC",[0,2,4,7,10]],["PENTA (IV)",[0,2,5,7,10]],["PENTA (D II)",[0,1,4,7,10]],["LYDIAN DOMINANT",[0,2,4,6,7,9,10]],["MELODIC MAJOR",[0,2,4,5,7,8,10]],["PHRYGIAN DOM",[0,1,4,5,7,8,10]],["DIMINISHED",[0,1,3,4,6,7,9,10]],["TRITONE",[0,1,4,6,7,10]],["ALTERED",[0,1,3,4,6,8,10]],["ROCK N ROLL",[0,3,4,5,7,9,10]],["WHOLE TONE",[0,2,4,6,8,10]],["INVERTED (AUG)",[0,1,4,5,8,9]]]],
 ["SUSPENDED",[["MIXOLIDIAN",[0,2,5,7,9,10]],["PENTATONIC",[0,2,5,7,10]],["RITUSEN",[0,2,5,7,9]],["DORIAN (b2)",[0,1,3,5,7,9,10]]]],
 ["HALF-DIMINISHED",[["HALF-DIMINISHED",[0,2,3,5,6,8,10]],["LOCRIAN",[0,1,3,5,6,8,10]],["PENTA MINOR b5",[0,3,5,6,10]]]],
 ["DIMINISHED",[["DIMINISHED",[0,2,3,5,6,8,9,11]],["HALF TONE",[0,1,3,4,6,7,9,10]],["ROMANIAN",[0,1,4,6,7,9,10]],["ULTRALOCRIAN",[0,1,3,4,6,8,9]],["BLUES HEPTATONIC",[0,2,3,5,6,9,10]]]],
 ["MESSIAN",[["2ND MODE T",[0,1,3,4,6,7,9,10]],["3RD MODE",[0,2,3,4,6,7,8,10]],["4TH MODE",[0,1,2,5,6,7,8,11]],["4TH I MODE",[0,1,4,5,6,7,10,11]],["5TH MODE",[0,1,5,6,7,11]],["5TH I MODE",[0,4,5,6,10,11]],["6TH MODE",[0,2,4,5,6,8,10,11]],["6TH I MODE",[0,1,2,4,6,7,8,10]]]],
 ["INTERVALS",[["MINOR THIRDS",[0,3,6,9]],["MAJOR THIRDS",[0,4,8]],["FOURTHS",[0,5,10]],["FIFTH OCTAVE",[0,7]],["OCTAVE",[0]]]]];
const SCALE_FLAT=SCALE_COLORS.flatMap(([c,l],ci)=>l.map(([n,iv],si)=>({c,n,iv,ci,si}))).filter(s=>s.c!=="CHROMATIC");
const scaleOf=(ci,si)=>{const l=SCALE_COLORS[ci][1];const s=l[clamp(si,0,l.length-1)];return{n:s[0],iv:s[1]}};
// quantise a note into a scale (key 0..11); stick DOWN/UP/FILTER (null = filtered)
function quantScale(n,key,iv,stick="DOWN"){const pc=((n-key)%12+12)%12;if(iv.includes(pc))return n;if(stick==="FILTER")return null;
 for(let d=1;d<12;d++){const p=stick==="UP"?pc+d:pc-d;if(iv.includes(((p%12)+12)%12))return n+(stick==="UP"?d:-d)}return n}
// n-th degree of a scale from a root note (degrees can be negative)
const degNote=(root,iv,d)=>root+Math.floor(d/iv.length)*12+iv[((d%iv.length)+iv.length)%iv.length];
// chord naming for the live-mode chord recognition
const CHN=[["",[0,4,7]],["m",[0,3,7]],["dim",[0,3,6]],["aug",[0,4,8]],["sus2",[0,2,7]],["sus4",[0,5,7]],["maj7",[0,4,7,11]],["m7",[0,3,7,10]],["7",[0,4,7,10]],["m7b5",[0,3,6,10]],["dim7",[0,3,6,9]],["6",[0,4,7,9]],["m6",[0,3,7,9]],["mMaj7",[0,3,7,11]],["5",[0,7]],["add9",[0,2,4,7]],["9",[0,2,4,7,10]],["maj9",[0,2,4,7,11]],["m9",[0,2,3,7,10]]];
function chordName(notes){if(!notes.length)return"";const s=[...new Set(notes)].sort((a,b)=>a-b),pcs=[...new Set(s.map(n=>n%12))];if(pcs.length===1)return nm(s[0]);
 const out=[];for(const r of pcs){const rel=pcs.map(p=>(p-r+12)%12).sort((a,b)=>a-b).join();const f=CHN.find(([,iv])=>iv.slice().sort((a,b)=>a-b).join()===rel);
  if(f){const inv=s.map(n=>n%12).indexOf(s.find(n=>n%12===s[0]%12)%12),bassIdx=f[1].map(i=>(r+i)%12).indexOf(s[0]%12);out.push(NN[r]+(f[0]||"maj")+(bassIdx>0?` (${bassIdx})`:""))}}
 return out.slice(0,2).join("  ")||pcs.map(p=>NN[p]).join(" ")}
// chord-mode modifiers (manual 2.12), grouped by pad colour
const CHMODS=[
 ["OCTAVE +1","oct",c=>c.map(n=>n+12)],["OCTAVE -1","oct",c=>c.map(n=>n-12)],["OCTAVE +2","oct",c=>c.map(n=>n+24)],["OCTAVE -2","oct",c=>c.map(n=>n-24)],
 ["SPREAD UP","spr",c=>c.map((n,i)=>i%2?n+12:n)],["SPREAD UP ++","spr",c=>c.map((n,i)=>i%2?n+24:n)],["SPREAD DOWN","spr",c=>c.map((n,i)=>i%2?n-12:n)],["SPREAD DOWN ++","spr",c=>c.map((n,i)=>i%2?n-24:n)],
 ["ROTATE +1","rot",c=>rot(c,1)],["ROTATE +2","rot",c=>rot(c,2)],["ROTATE +3","rot",c=>rot(c,3)],["ROTATE +4","rot",c=>rot(c,4)],
 ["SPREAD UP+DOWN","voi",c=>c.map((n,i)=>i%2?n+12:i%4===2?n-12:n)],["WIDER INTERVAL DOWN","voi",c=>{let s=c.slice().sort((a,b)=>a-b);for(let k=0;k<s.length;k++){let w=0,wi=0;for(let i=0;i<s.length-1;i++)if(s[i+1]-s[i]>w){w=s[i+1]-s[i];wi=i}if(wi===0)break;s=rot(s,1)}return s}],["QUARTAL VOICING","voi",c=>c.map((n,i)=>c[0]+i*5)],
 ["POWER CHORD","ext",c=>[c[0],c[0]+7]],["SUS2","ext",c=>c.map((n,i)=>i===1?c[0]+2+Math.floor((n-c[0])/12)*12:n)],["SUS4","ext",c=>c.map((n,i)=>i===1?c[0]+5:n)],["ADD 6TH","ext",c=>c.length>3?c.map((n,i)=>i===3?c[0]+9:n):[...c,c[0]+9]],["ADD 6/9","ext",c=>[...(c.length>3?c.slice(0,3):c),c[0]+9,c[0]+14]],["KENNY BARRON","ext",c=>[...c,c[0]+14,c[0]+17]],
 ["BASS ROOT","bas",c=>c.map((n,i)=>i===0?n-12:n)],["BASS THIRD","bas",c=>c.map((n,i)=>i===1?n-12:n)],["BASS FIFTH","bas",c=>c.map((n,i)=>i===2?n-12:n)],["BASS SEVENTH","bas",c=>c.map((n,i)=>i===3?n-12:n)],
 ["TRANSPOSE +1","trs",c=>c.map(n=>n+1)],["TRANSPOSE +2","trs",c=>c.map(n=>n+2)],["TRANSPOSE +3","trs",c=>c.map(n=>n+3)],["TRANSPOSE +4","trs",c=>c.map(n=>n+4)],["TRANSPOSE +5","trs",c=>c.map(n=>n+5)],["TRANSPOSE +7","trs",c=>c.map(n=>n+7)],
 ["AUTO INVERSION","auto",c=>c]];
function rot(c,k){let s=c.slice().sort((a,b)=>a-b);for(let i=0;i<k;i++){const n=s.shift();s.push(n+12)}return s}
const CHMOD_COL={oct:"#f59e5b",spr:"#fde3b0",rot:"#7ef0b4",voi:"#33e0a8",ext:"#a49bf5",bas:"#f5a3b5",trs:"#b7b5e8",auto:"#ff4d6a"};
// 5 rows × 8 columns of modifier pads, top-left first (left hand)
const CHMOD_GRID=(()=>{const g=[],by=k=>CHMODS.map((m,i)=>m[1]===k?i:-1).filter(i=>i>=0);
 const rows=[[...by("oct"),...by("spr")],[...by("rot"),...by("voi"),null],[...by("ext"),null,null],[...by("bas"),null,null,null,null],[...by("trs"),null,by("auto")[0]]];
 rows.forEach(r=>{while(r.length<8)r.push(null);g.push(r.slice(0,8))});return g})();
// math conditions (manual 3.11)
const MATHS=["--","FILL","!FILL","1ST","!1ST","PRE","!PRE","SYNC","!SYNC","NT=0","NT<2","NT<3","NT<4","NT<5","PS=0","PS<2","PS<3","PS<4","PS<5","PB=0","PB<2","PB<3","PB<4","PB<5",
 ...[2,3,4,5,6,7,8].flatMap(y=>Array.from({length:y},(_,x)=>`${x+1}:${y}`)),...[2,3,4,5,6,7,8].flatMap(y=>Array.from({length:y},(_,x)=>`!${x+1}:${y}`)),"NO FX IF FILL","FX IF FILL","NO FX"];
const ROLLS=["--","1/8","1/12","1/16","1/24","1/32","1/48","1/64","1/96","1/128","1/192","1/256"];
const rollSteps=r=>r==="--"?0:16/(+r.split("/")[1]); // in 16th steps
// zoom: steps (16ths) per pad column
const ZOOMS=[["/16",16],["/8",8],["/4",4],["/2",2],["×1",1],["×2",.5],["×4",.25],["×8",.125],["×16",1/16],["×48",1/48]];
const TZOOMS=[["3/2",4/3],["×3",2/3],["×6",1/3],["×12",1/6]];
const PSYNC=["INSTANT","1/16","1/8","BEAT","1 BAR","2 BARS","4 BARS","8 BARS","PTRN",...Array.from({length:16},(_,i)=>"TRACK "+(i+1))];
const PSYNC_B={"INSTANT":0,"1/16":.25,"1/8":.5,"BEAT":1,"1 BAR":4,"2 BARS":8,"4 BARS":16,"8 BARS":32};
const RUNS=["--","REVERSE","PING-PONG","RANDOM BAR","RANDOM BEAT","RANDOM 1/16"];
const FOLLOWS=["--","STOP","NEXT","PREVIOUS","ANY","OTHER","FIRST","LAST","RSTR"];
const OUTPORTS=["MIDI A","MIDI B","MIDI C","MIDI D","USB DEVICE","USB HOST","CV/GATE 1","CV/GATE 2","CV/GATE 3","CV/GATE 4"];
const INPORTS=["--","ALL ACTIVE","MIDI A","MIDI B","USB DEVICE","USB HOST","CV/GATE"];
const TTYPES=["POLY","DRUM","MPE","AFTR"];
const LIVEMODES=["SCALE","CHORD"];
const QUANTS=["--","1/64","1/32","1/24","1/16"];
const QSTEP={"1/64":.25,"1/32":.5,"1/24":2/3,"1/16":1};
const DRUMNAMES=["KICK","SNARE","CLOSED HH","OPEN HH","LOW TOM","HI TOM","HAND CLAP","COWBELL","RIMSHOT","CRASH","RIDE","SHAKER","CONGA","CLAVE","TAMBOURINE","BLIP"];
const PALETTE=["#ff6b6b","#ffb36b","#ffe36b","#9be86b","#4fe0a0","#4fd4e8","#6b9bff","#a07bff","#e77bff","#ff7bc0","#c8c8c8","#ffd0a0","#a0ffd0","#a0d0ff","#ffa0d0","#d0ffa0"];
// note colours (12 pitch classes, Hapax default palette feel)
const NOTECOL=["#ff4d4d","#ff8a3d","#ffc83d","#f5f53d","#9ef03d","#3df07a","#3df0d8","#3db4f0","#3d6ff0","#8a4df0","#d04df0","#f04db4"];
const lenName=st=>st%16===0?(st/16)+(st===16?" BAR":" BARS"):(st>=16?Math.floor(st/16)+"B+"+(st%16):st+" STEP"+(st>1?"S":""));
// time-division lists used by effects
const RATES=["1/1","1/2","1/3","1/4","1/6","1/8","1/12","1/16","1/24","1/32","1/48","1/64"];
const rateBeats=r=>4/+r.split("/")[1]*(+r.split("/")[0]);
const LFORATES=["64 BARS","32 BARS","16 BARS","8 BARS","4 BARS","2 BARS","1 BAR","1/2","1/4","1/8","1/16","1/32","1/64","1/128"];
const lfoBeats=r=>r.includes("BAR")?parseInt(r)*4:rateBeats(r);
const CCDEST=[...Array.from({length:120},(_,i)=>"CC"+i),"PITCHBEND","AFTERTOUCH","VELOCITY","CV OUT 1","CV OUT 2","CV OUT 3","CV OUT 4","FX PARAM"];
const CC_NAMES={1:"MOD WHEEL",7:"VOLUME",10:"PAN",71:"RESONANCE",72:"RELEASE",73:"ATTACK",74:"CUTOFF"};
/* ---------- effects (manual ch. 7 + online FX chapter) ----------
 param: [key, label, spec, default]; spec = array of choices, or [min,max,fmt]
 sec: hidden parameter reached by clicking the encoder of the param it follows */
const pctf=v=>v+"%",sgn=v=>(v>0?"+":"")+v;
const FXDEF={
 ARP:{n:"ARPEGGIATOR",d:"Generates looping arpeggiated patterns from incoming notes.",p:[["style","STYLE",["ORDER","UP","DOWN","UP/DOWN","DOWN/UP","UP+DOWN","DOWN+UP","RANDOM","VELOCITY UP","VELOCITY DOWN","CONVERGE UP","CONVERGE DOWN","DIVERGE UP","DIVERGE DOWN","PINKY UP","PINKY DOWN","THUMB UP","THUMB DOWN","DOUBLE 1:2","SILENCE 1:2"],"UP"],["rate","RATE",RATES,"1/16",["sync","SYNC",["OFF","ON","ON (LOCKED)"],"ON"]],["gate","GATE",[1,200,pctf],50],["human","HUMAN",[0,100,pctf],0],["oct","OCTAVE",[-5,5,sgn],0],["chord","CHORD",[-2,2,sgn],0],["retrig","RE-TRIG",["--","NOTE","1BAR","1/2","1/4","1/8","1/16"],"--"],["repeat","REPEAT",["--","x1","x2","x3","x4","x6","x8","x12","x16"],"--"]]},
 ARPOLY:{n:"ARPOLY",d:"Programmable polyphonic arpeggiator: 8 steps T1–T8 played by 3 loops (1st, 2nd, 3rd held note), each with its own speed and length. Shown here, not processed by the simulation.",ui:1,p:[["t1","T1",[-64,64,sgn],0],["t2","T2",[-64,64,sgn],0],["t3","T3",[-64,64,sgn],0],["t4","T4",[-64,64,sgn],0],["sp1","SPEED I",RATES,"1/16"],["l1","LOOP I",[0,8,v=>v||"OFF"],4],["gate","GATE",[0,8,v=>v||"OFF"],2],["shift","SHIFT",[0,512,v=>v?"+"+v:"OFF"],0]]},
 CHANCE:{n:"CHANCE",d:"Plays or skips each note by probability.",p:[["chance","CHANCE",[0,100,pctf],50,["usevel","USE VELOCITY",["OFF","ON"],"OFF"]],["lot","LOT",["--","BAR","1/4","1/8","1/16","1/32"],"--"],["sync","SYNC",["--","BAR","1/4","1/8","1/16","1/32"],"--"],["sch","SYNC CHANCE",[0,100,pctf],100]]},
 ECHO:{n:"ECHO",d:"MIDI echo: repeats incoming notes with fading velocity.",p:[["sync","SYNC",["ON","OFF"],"ON"],["rate","RATE",["1/64","1/32","1/24","1/16","1/12","1/8","3/16","1/6","1/4","3/8","1/3","1/2","2/3","3/4","1/1"],"1/8"],["rep","REPEATS",[1,63,v=>v],4],["voices","VOICES",["RELATCH","1","2","3","4","6","8","12"],"RELATCH"],["vcurve","VELOCITY CURVE",["--","LIN","EXP","LOG"],"LIN",["vend","VELOCITY END",[1,127,v=>v],20]],["gcurve","GATE CURVE",["--","LIN","EXP","LOG"],"--",["gend","GATE END",[1,100,pctf],30]],["nplus","NOTE +",[0,60,v=>v?"+"+v:"--"],0],["nminus","NOTE -",[0,60,v=>v?"-"+v:"--"],0]]},
 ENV:{n:"ENVELOPE",d:"AHDSR envelope sent to a destination each time a note passes. Shown here, not processed by the simulation.",ui:1,p:[["a","ATTACK",[0,3072,v=>v],0],["d","DECAY",[0,3072,v=>v],96],["s","SUSTAIN",[0,100,pctf],50],["r","RELEASE",[0,3072,v=>v],96],["depth","DEPTH",[-100,100,pctf],100],["off","OFFSET",[0,100,pctf],0],["h","HOLD",[0,3072,v=>v],0],["dest","DEST",CCDEST,"CC74"]]},
 EUCLID:{n:"EUCLID",d:"Euclidean rhythm generator.",p:[["note","NOTE",[-1,127,v=>v<0?"IN":nm(v)],-1],["rate","RATE",["1/1","1/2","1/3","1/4","1/6","1/8","1/12","1/16","1/24","1/32","1/64"],"1/16"],["steps","STEPS",[1,32,v=>v],16],["pulses","PULSES",[1,32,v=>v],5],["rot","ROTATE",[0,31,v=>v],0],["gate","GATE",[0,200,pctf],50],["vel","VELOCITY",[1,127,v=>v],100]]},
 FILTER:{n:"FILTER",d:"Lets a range of notes, velocities or CCs through, or drops them.",p:[["nmin","NOTE MIN",[0,127,nm],0],["nmax","NOTE MAX",[0,127,nm],127],["cmin","CC MIN",[0,119,v=>"CC"+v],0],["cmax","CC MAX",[0,119,v=>"CC"+v],119],["vmin","VELOCITY MIN",[0,127,v=>v],0],["vmax","VELOCITY MAX",[0,127,v=>v],127],["dpb","DROP PB",["OFF","ON"],"OFF"],["dat","DROP AFT",["OFF","ON"],"OFF"]]},
 HARMO:{n:"HARMONIZER",d:"Creates a chord from each incoming note.",p:[["origin","ORIGIN",["ON","OFF"],"ON"],["n2","NOTE 2",[-36,36,v=>v?sgn(v):"--"],7],["n3","NOTE 3",[-36,36,v=>v?sgn(v):"--"],12],["n4","NOTE 4",[-36,36,v=>v?sgn(v):"--"],0],["n5","NOTE 5",[-36,36,v=>v?sgn(v):"--"],0],["n6","NOTE 6",[-36,36,v=>v?sgn(v):"--"],0],["n7","NOTE 7",[-36,36,v=>v?sgn(v):"--"],0],["n8","NOTE 8",[-36,36,v=>v?sgn(v):"--"],0]]},
 LFO:{n:"LFO",d:"High-resolution LFO sent to a CC, pitchbend, aftertouch, CV or an effect parameter.",p:[["wave","WAVEFORM",["SINE","TRI","RAMP","SQUARE","RAND"],"SINE"],["sync","SYNC",["ON","OFF"],"ON"],["rate","RATE",LFORATES,"1 BAR"],["phase","PHASE",[-180,180,v=>v+"°"],0],["depth","DEPTH",[-100,100,pctf],50],["off","OFFSET",[0,100,pctf],50],["mode","MODE",["LOOP","RLOOP","ONCE","2x","4x","8x","16x"],"LOOP"],["dest","DEST",CCDEST,"CC74"]]},
 MONO:{n:"MONO",d:"Converts polyphony to monophony.",p:[["mode","MODE",["FIRST","LAST","RANDOM","LOW","HIGH"],"LAST"],["legato","LEGATO",["OFF","ON"],"OFF"],["retrig","RETRIG",["OFF","ON"],"OFF"]]},
 OUTPUT:{n:"OUTPUT",d:"Sends the notes to a second output/channel too (or only there, with CONSUME).",p:[["out","OUT",["--","A","B","C","D","DEVICE","HOST"],"--"],["ch","CHANNEL",[1,16,v=>("0"+v).slice(-2)],2],["consume","CONSUME",["OFF","ON"],"OFF"],["retrig","RETRIGGER",["OFF","ON"],"OFF"]]},
 RANDOM:{n:"RANDOMIZER",d:"Randomly alters pitch, octave, velocity and length.",p:[["nm","NOTE–",[-36,0,v=>v],0],["np","NOTE+",[0,36,sgn],0],["om","OCTAVE–",[-5,0,v=>v],0],["op","OCTAVE+",[0,5,sgn],0],["vm","VELO–",[0,100,pctf],0],["vp","VELO+",[0,100,pctf],0],["len","LENGTH",[0,100,pctf],0],["chance","CHANCE",[0,100,pctf],100,["usevel","USE VELOCITY",["OFF","ON"],"OFF"]]]},
 REGISTER:{n:"REGISTER",d:"Turing-machine style looping random sequence (16-bit shift register).",p:[["seed","SEED",[0,65535,v=>v],40503],["rate","RATE",RATES,"1/16"],["bits","BITS",[1,16,v=>v],8],["toggle","TOGGLE",[0,100,pctf],0],["center","CENTER",[0,127,nm],60],["span","SPAN",[0,60,v=>v],12],["gate","GATE",[0,800,pctf],50],["steady","STEADY",["OFF","ON"],"OFF"]]},
 SCALER:{n:"SCALER",d:"Quantises notes to a scale.",p:[["scale","SCALE",["pSCALE",...SCALE_FLAT.map(s=>s.n)],"pSCALE"],["key","KEY",NN,"C"],["stick","STICK",["DOWN","UP","FILTER"],"DOWN"],["trsp","TRSP",[-36,36,sgn],0]]},
 SHAPER:{n:"SHAPER",d:"Non-linear curve applied to keys, velocity, pitchbend, aftertouch or a CC.",p:[["what","RESHAPE",["KEYS","VELOCITY","PITCHBEND","AFT",...Array.from({length:120},(_,i)=>"CC"+i)],"VELOCITY"],["curve","CURVE",["EXP","SIGMO"],"EXP"],["bend","BEND",[-100,100,pctf],50,["offin","OFFS IN",[-100,100,pctf],0]],["spanin","SPAN IN",[0,400,pctf],100],["offout","OFFS OUT",[-100,100,pctf],0],["spanout","SPAN OUT",[0,400,pctf],100]]},
 SPRING:{n:"SPRING",d:"(3.10) Slew limiter / spring model for an incoming CC, pitchbend or aftertouch, with overshoot and preshot. Shown here, not processed by the simulation.",ui:1,p:[["tgt","TARGET",["PITCHBEND","AFTERTOUCH",...Array.from({length:120},(_,i)=>"CC"+i)],"CC1"],["freq","FREQUENCY",[1,200,v=>(v/10).toFixed(1)],20],["damp","DAMPING",[1,200,v=>(v/100).toFixed(2)],70],["pre","PRESHOT",[-100,100,pctf],0],["scale","SCALE",[0,100,pctf],100]]},
 SWING:{n:"SWING",d:"Shifts off-grid notes for swing.",p:[["groove","GROOVE",[0,100,pctf],58],["sync","SYNC",["1/3","1/4","1/6","1/8","1/12","1/16","1/24","1/32","1/64"],"1/16"],["accent","ACCENT",[0,100,pctf],0],["human","HUMAN",[0,100,pctf],0]]}};
const FXLIST=["ARP","ARPOLY","CHANCE","ECHO","ENV","EUCLID","FILTER","HARMO","LFO","MONO","OUTPUT","RANDOM","REGISTER","SCALER","SHAPER","SPRING","SWING"];
const MMSRC=["--",...Array.from({length:120},(_,i)=>"CC"+i),"PITCHBEND","AFTERTOUCH","CV IN 1","CV IN 2","LFO A","LFO B","KEYTRACK","VELOCITY","FILL"];
// algorithms (manual ch. 8)
const ALGODEF={
 GENERATR:{n:"GENERATOR",where:["POLY","DRUM"],p:[["q","QUANTIZE",["1/1","1/2","1/4","1/8","1/16","1/32","1/64"],"1/16"],["len","LENGTH",[1,64,v=>v],2,["lmin","MIN LENGTH",[1,64,v=>v],1]],["vel","VELOCITY",[0,127,v=>v],120,["vmin","MIN VELOCITY",[0,127,v=>v],70]],["dens","DENSITY",[0,100,pctf],40,["poly","POLYPHONY",["MONO","POLY 2","POLY 3","POLY 4"],"MONO"]],["pmax","PITCH",[0,127,nm],72,["pmin","MIN PITCH",[0,127,nm],55]]]},
 CURVES:{n:"CURVES",where:["POLY","DRUM","AUTOM"],p:[["wave","WAVE",["SINE","TRI","RAMP","SQUA","RAND","PERLI"],"RAMP"],["amp","AMPLITUDE",[0,127,v=>v],127,["amin","MIN AMPLITUDE",[0,127,v=>v],20]],["dest","DEST",["VELO","KEYS","LENG","CHAN","ROLL","MATH","uTIME"],"VELO"],["rep","REPEAT",[1,128,v=>"x"+v],1,["phase","PHASE",[-180,180,v=>v+"°"],0]],["steps","STEPS",[0,256,v=>v||"INF"],0,["seed","SEED",[0,9999,v=>v],1]]]},
 SHUFFLE:{n:"SHUFFLE",where:["POLY"],p:[["mode","MODE",["STEP","PART"],"STEP"],["proba","PROBA",[0,100,pctf],100],["dest","DEST",["ALL","KEYS","VELO","LENG","CHAN","ROLL","MATH"],"KEYS"],["int","INTERVAL",["8BARS","4BARS","2BARS","1BAR","1/2","1/4","1/8","1/16","1/32","1/64"],"1/4"]]},
 SYMMETRY:{n:"SYMMETRY",where:["POLY"],p:[["mode","MODE",["TIME","KEYS"],"TIME"],["dup","DUPLICATE",["OFF","ON"],"OFF"]]},
 EVERYN:{n:"EVERY N",where:["DRUM"],p:[["grid","GRID",["1/1","1/2","1/4","1/8","1/16","1/32","1/64"],"1/16"],["n","N",[1,16,v=>v],4],["acc","ACCENT",[0,127,v=>v],120,["amin","ACCENT MIN",[0,127,v=>v],100]],["ghost","GHOST",[0,127,v=>v],50,["gmin","GHOST MIN",[0,127,v=>v],30]]]}};
// settings (manual ch. 11) — [key, label, choices, default]
const SETTINGS=[
 ["SYNC IN",[["clk","CLOCK SOURCE",["INTERNAL","MIDI IN A","MIDI IN B","USB HOST","USB DEVICE","CV IN 1","CV IN 2","MIDI AUTO"],"INTERNAL"],["ss","MIDI START/STOP",["INTERNAL","= CLOCK SOURCE","ANY MIDI INPUT"],"= CLOCK SOURCE"],["cvreset","CV RESET",["--","CV IN 1","CV IN 2","AUTO"],"--"],["cvrate","CV CLOCK RATE",["1/384 = 96 PPQN","1/192 = 48 PPQN","1/96 = 24 PPQN","1/64 = 16 PPQN","1/48 = 12 PPQN","1/32 = 8 PPQN","1/16 = 4 PPQN","1/8 = 2 PPQN","1/4 = 1 PPQN"],"1/16 = 4 PPQN"],["timeout","CLOCK TIMEOUT",["OFF","ON"],"OFF"],["cvfollow","CV FOLLOW TEMPO",["OFF","ON"],"OFF"]]],
 ["SYNC OUT",[["soA","MIDI A",["--","CLOCK+TRANSPORT","CLOCK","TRANSPORT"],"--"],["soB","MIDI B",["--","CLOCK+TRANSPORT","CLOCK","TRANSPORT"],"--"],["soUD","USB DEVICE",["--","CLOCK+TRANSPORT","CLOCK","TRANSPORT"],"--"],["clkstop","CLOCK ON STOP",["--","SEND","SEND (ONLY MIDI)","SEND (ONLY GATE)"],"--"],["dinsync","DIN SYNC",["--","1/96","1/48","1/16","1/8","1/4"],"--"],["gateclk","GATE CLOCK",["--","GATE 1","GATE 2","GATE 3","GATE 4"],"--"]]],
 ["MISC",[["info","INFO",["hapaxOS 3.22 (sim)"],"hapaxOS 3.22 (sim)"],["autoload","AUTOLOAD",["OFF","ON"],"OFF"],["follow","FOLLOW PLAYHEAD",["OFF","ON"],"ON"],["capture","HOLD STEP CAPTURE",["OFF","ON"],"ON"],["troot","TRANSPOSE ROOT",Array.from({length:11},(_,i)=>"C"+i),"C5"],["tsync","TRANSPOSE SYNC",["INSTANT","BEAT","1 BAR","2 BARS","4 BARS"],"INSTANT"],["rsync","RESTART SYNC",["INSTANT","BEAT","1 BAR","2 BARS","4 BARS"],"INSTANT"],["psync","PROJECT SYNC",["1 BAR","2 BARS","4 BARS","8 BARS","16 BARS"],"1 BAR"],["ptrig","PATTERN TRIG",["FREE","RESTART"],"FREE"],["sustain","APPLY SUSTAIN",["OFF","ON"],"OFF"],["chase","NOTE CHASING",["OFF","ON"],"OFF"],["unison","UNISON",["OFF","ON"],"OFF"],["monitor","MIDI MONITOR",["ALL MESSAGES","ONLY NOTES","ONLY CC","ONLY PITCHBEND","ONLY PRESSURE","ONLY PC","ONLY REAL TIME"],"ALL MESSAGES"],["nanotune","BPM NANOTUNE",["-0.05","-0.02","0","+0.02","+0.05"],"0"],["metro","METRONOME",["MIDI","CV OUT 1 (AUDIO)"],"CV OUT 1 (AUDIO)"],["preview","STEP NOTE PREVIEW",["OFF","ON"],"ON"],["selpm","SELECT +/-",["WARP","ROTATE"],"WARP"],["split","SPLIT BARS",["OFF","ON"],"ON"],["mgroup","MUTE GROUP",["OFF","ON"],"ON"],["holdt","HOLD TIME",["FASTER","FAST","NORMAL","SLOW","EXTRA SLOW"],"NORMAL"],["bgl","BACKGROUND RGB LIVE",["0%","25%","50%","75%","100%"],"25%"],["bgs","BACKGROUND RGB STEP",["0%","25%","50%","75%","100%"],"0%"],["ldp","LIVE DRUM PADS",["16–VELOCITY","8–VELOCITY","4–VELOCITY","1–VELOCITY"],"16–VELOCITY"]]],
 ["CV/GATE + PEDAL",[["cvin","CV IN RANGE",["-5.0v > +5.0v","0.0v > +5.0v","-1.0v > +1.0v"],"-5.0v > +5.0v"],["cvout","CV OUT RANGE",["-5.0v > +5.0v","0.0v > +5.0v"],"-5.0v > +5.0v"],["cvtype","CV OUT TYPE",["1V/OCTAVE","1.2V/OCTAVE","HZ/V"],"1V/OCTAVE"],["gpol","GATE POLARITY",["HIGH=5V","HIGH=0V"],"HIGH=5V"],["gretrig","GATE OUT RETRIG",["ON","OFF"],"ON"],["pedal","PEDAL (TIP)",["--","TAKE SNAPSHOT","TOGGLE SNAPSHOT","REC","PLAY/STOP","PLAY/RESTART","FILL","TAP BPM","NEXT SECTION","STEP-REC REST","STEP-REC TIE"],"--"],["ptype","PEDAL TYPE",["MOMENTARY","LATCHING"],"MOMENTARY"]]],
 ["MIDI IN",[["inNotes","NOTES",["--","IGNORE","REC ONLY"],"--"],["inCC","CC MESSAGES",["--","IGNORE","REC ONLY"],"--"],["inPB","PITCHBEND",["--","IGNORE","REC ONLY"],"--"],["inAT","PRESSURE",["--","IGNORE","REC ONLY"],"--"],["inPC","PROGRAM CHANGE",["--","IGNORE"],"--"],["atPort","ACTIVE TRACK PORT",["--","MIDI A","MIDI B (TRS)","USB DEVICE","USB HOST"],"--"],["atCh","ACTIVE TRACK CHANNEL",[...Array.from({length:16},(_,i)=>("0"+(i+1)).slice(-2)),"ALL (MPE MODE 1)","ALL (MPE MODE 2)"],"01"]]],
 ["MIDI THRU",[["thruA","MIDI IN > MIDI OUT A",["--","ON"],"--"],["thruUD","USB DEVICE > MIDI A",["--","ON"],"--"],["thruUH","USB HOST > USB DEVICE",["--","ON"],"--"]]],
 ["COMPENSATION",[["compA","MIDI OUT A CH01",["-20MS","-10MS","-5MS","0MS","+5MS","+10MS","+20MS"],"0MS"],["compAclk","MIDI OUT A CLOCK",["-20MS","-10MS","-5MS","0MS","+5MS","+10MS","+20MS"],"0MS"]]]];
const SET0=Object.fromEntries(SETTINGS.flatMap(([,l])=>l.map(([k,,,d])=>[k,d])));
const RECSET=[["learn","LEARN",["OFF","ON"],"ON"],["notes","NOTES",["HARD REC","OVERDUB"],"OVERDUB"],["count","COUNTDOWN",["OFF","ON (1 BAR)","ON (2 BARS)","ON (3 BARS)","ON (4 BARS)"],"OFF"],["metro","METRONOME",["OFF","ON"],"OFF"],["punch","PUNCH IN",["OFF","ON"],"OFF"],["looper","LOOPER",["OFF","1 BAR","1/16"],"OFF"],["recoff","REC OFF",["OFF","END PATTERN"],"OFF"],["quant","QUANTIZE",["OFF","1/64","1/32","1/24","1/16"],"OFF"]];
const REC0=Object.fromEntries(RECSET.map(([k,,,d])=>[k,d]));
// the simulation's stand-in instruments, one per MIDI channel (what you'd have plugged in)
const INSTS=["POLY SYNTH","MONO BASS","PAD","LEAD","PLUCK","BELL","DRUM MACHINE","SILENT"];
const STUDIO0=Array.from({length:16},(_,i)=>["POLY SYNTH","MONO BASS","PAD","LEAD","PLUCK","BELL"][i]||(i===9?"DRUM MACHINE":"POLY SYNTH"));
