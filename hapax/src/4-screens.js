/* ================= screens: two OLEDs, 8 encoders + main encoder ================= */
const LW=256,LH=128,WH="#f2f2f2",GR="#8c8c8c",DM="#3a3a3a",DK="#1b1b1b";
let LCV,RCV,LX,RX,LR=[],RR=[];
function initScreens(dl,dr){[[dl,"L"],[dr,"R"]].forEach(([d,k])=>{const c=document.createElement("canvas");c.width=LW*3;c.height=LH*3;c.className="oled";d.appendChild(c);if(k==="L"){LCV=c;LX=c.getContext("2d")}else{RCV=c;RX=c.getContext("2d")}});bindScreens()}
const box=(X,x,y,w,h,c)=>{X.fillStyle=c;X.fillRect(x,y,w,h)};
const frame=(X,x,y,w,h,c)=>{X.strokeStyle=c;X.lineWidth=1;X.strokeRect(x+.5,y+.5,w-1,h-1)};
function tx(X,s,x,y,sz,c=WH,al="left",w=700){X.font=`${w} ${sz}px "Arial Narrow","Roboto Condensed",Arial,sans-serif`;X.fillStyle=c;X.textAlign=al;X.textBaseline="alphabetic";X.fillText(String(s).toUpperCase(),x,y)}
function fit(X,s,max,sz){s=String(s);X.font=`700 ${sz}px "Arial Narrow",Arial,sans-serif`;while(sz>7&&X.measureText(s.toUpperCase()).width>max){sz--;X.font=`700 ${sz}px "Arial Narrow",Arial,sans-serif`}return sz}
const reg=(R,x,y,w,h,tip)=>R.push({x,y,w,h,tip});
/* ---------- slot helpers ---------- */
const ENC2SLOT={e1:0,e2:1,e5:2,e6:3,e3:4,e4:5,e7:6,e8:7};
const sl=(l,v,t,o={})=>({l,v:String(v),t,...o});
const nz=(get,set,a,b,step=1)=>(d,o)=>set(clamp(get()+d*step*(o&&o.fast?10:1),a,b));
const chz=(list,get,set,wrap)=>(d)=>{let i=list.indexOf(get());i=wrap?((i+d)%list.length+list.length)%list.length:clamp(i+d,0,list.length-1);set(list[i])};
const BL=()=>sl("","",null);
/* ---------- which page is on screen ---------- */
function view(){const u=S.ui;
 if(u.tt)return"ttype";if(u.lm)return"lmode";
 const ht=heldTrack();if(ht!=null)return"trk";if(u.page)return u.page;
 if(heldProj()!=null)return"proj";
 if(u.mode==="pattern"&&heldPads().length)return"patp";
 if(u.mode==="step"&&T_().type==="DRUM"&&heldRows().length)return"lane";
 if(u.mode==="autom"&&heldRows().length)return"row";
 if(u.sub)return u.sub;return u.mode}
const SUBS=["fx","lfo","assign","settings","algo","monitor"];
/* ---------- left-screen pages ---------- */
function slots(v){const P=P_(),T=T_(),p=PAT(T),L=T.live;
 switch(v){
 case"live":{if(T.type==="DRUM")return T.drum.slice(T.dpage*8,T.dpage*8+8).map((d,j)=>{const i=T.dpage*8+j;return sl(d.name,`${nm(d.note)} ${d.ch==="TRACK"?"CH"+T.out.ch:d.ch}`,(dd,o)=>{if(o.hold){const C=["TRACK",...Array.from({length:16},(_,k)=>k+1),"GATE 1","GATE 2","GATE 3","GATE 4"];d.ch=C[clamp(C.indexOf(d.ch)+dd,0,C.length-1)]}else d.note=clamp(d.note+dd*(o.fast?12:1),0,127);if(d.inn==="LINK"){} emit("lane:edit")},{sec:"HOLD+TURN: CHANNEL",tip:`Lane ${i+1}: turn = output note, hold + turn = output channel or a Gate output.`})});
  const ps=P.psc.on&&T.psc,s=[sl("KEY",NN[L.key],nz(()=>L.key,x=>L.key=x,0,11),{tip:"Lowest note of the pad matrix (the root). ▲▼ change its octave."}),
   sl("PLAY",L.play,chz(["--","HOLD","RELATCH"],()=>L.play,x=>{L.play=x;releaseLatched(T)}),{tip:"HOLD: notes stay on until played again. RELATCH: held notes are replaced by the next notes you play."}),
   sl("COLOR",ps?"pSCALE":SCALE_COLORS[L.ci][0],ps?null:nz(()=>L.ci,x=>{L.ci=x;L.si=0},0,SCALE_COLORS.length-1),{tip:"Scale family. Scales of a colour share their 3rd and/or 7th. Project scale overrides it when on."}),
   sl("SCALE",ps?scaleOf(P.psc.ci,P.psc.si).n:scaleOf(L.ci,L.si).n,ps?null:nz(()=>L.si,x=>L.si=x,0,SCALE_COLORS[L.ci][1].length-1),{tip:"Scale within the colour. The isomorphic keyboard moves by scale degrees instead of semitones."}),
   sl("VELOCITY",L.vel,nz(()=>L.vel,x=>L.vel=x,1,127),{tip:"Velocity of notes played on the pads."}),
   L.jumpEdit?sl("JUMP",L.jump,nz(()=>L.jump,x=>L.jump=x,1,12),{p:()=>{L.jumpEdit=false},tip:"How many notes (degrees) one row is above the row below. Press to go back to VIEW."}):sl("VIEW",L.view,chz(["KEY","NOTES IN","CHROM+SCALE"],()=>L.view,x=>L.view=x),{p:()=>{L.jumpEdit=true;emit("jump")},tip:"KEY: root positions. NOTES IN: only notes of the current pattern. CHROM+SCALE: all 12 notes, scale highlighted. Press for JUMP."})];
  if(L.mode==="CHORD")s.push(sl("MODIFIERS",L.mods.length+"/8",null,{tip:"Modifiers latched with 2ND + pad. Up to 8 are stacked."}),BL());
  else if(T.type==="AFTR")s.push(sl("PRESSUR",L.pres,nz(()=>L.pres,x=>{L.pres=x;emit("aftr:pres")},0,127),{tip:"(3.22) Pressure of the notes you play on the pads, sent as poly aftertouch on the track channel right after each note starts. Turning it while a note is held doesn't change that note."}),BL());
  else if(T.type==="MPE")s.push(sl("PRESSURE",L.pres,nz(()=>L.pres,x=>L.pres=x,0,127),{tip:"Initial pressure sent with each MPE note."}),sl("TIMBRE",L.tmb,nz(()=>L.tmb,x=>L.tmb=x,0,127),{tip:"Initial timbre (CC74) sent with each MPE note."}));
  else s.push(BL(),BL());return s}
 case"step":{const sel=selNotes(),one=sel&&sel.size?[...sel][0]:null,D=T.type==="DRUM";
  const edit=(k,d,a,b)=>{if(sel&&sel.size){mark1();sel.forEach(n=>n[k]=clamp(n[k]+d,a,b));previewSel(sel)}else T.def[k]=clamp(T.def[k]+d,a,b)};
  const val=k=>one?one[k]:T.def[k];
  const lenStr=l=>l>=INF?"INF":Number.isInteger(l)?l:l.toFixed(2);
  const velK=T.type==="AFTR"?["v","pr"][T.cyc%2]:T.type==="MPE"?["v","pr","tb","pb"][T.cyc%4]:"v",velL={v:"VELOCITY",pr:"PRESSUR",tb:"TIMBRE",pb:"PITCHBEND"}[velK];
  const first=D?[sl("TRSP",one?sgn(one.tr||0):"--",sel&&sel.size?(d=>{mark1();sel.forEach(n=>n.tr=clamp((n.tr||0)+d,-48,48))}):null,{tip:"Drum events: transposes the selected events from their lane's output note."}),
    sl("LANES",T.dpage?"9–16":"1–8",d=>{T.dpage=clamp(T.dpage+d,0,1)},{tip:"Which 8 of the 16 drum lanes are on the pads (also ▲▼)."})]:
   [sl(one?"NOTE":"NOTE",one?NN[one.n%12]:NN[T.view%12],(d,o)=>{if(sel&&sel.size){mark1();sel.forEach(n=>n.n=clamp(n.n+d,0,127));previewSel(sel)}else{T.view=clamp(T.view+d*(P.psc.on&&T.psc?12:1),0,120);T.rt.learn&&(T.rt.learn.on=false)}},{p:()=>{if(T.rt.learn){T.rt.learn.on=!T.rt.learn.on;emit("learn")}},tip:"Without a held note: the note of the bottom pad row (scrolls the piano roll; the main encoder does too). Holding notes: their pitch. Press: NOTE LEARN once you've played a note or chord."}),
    sl("OCTAVE",one?Math.floor(one.n/12):Math.floor(T.view/12),d=>{if(sel&&sel.size){mark1();sel.forEach(n=>n.n=clamp(n.n+12*d,0,127));previewSel(sel)}else T.view=clamp(T.view+12*d,0,120)},{tip:"Octave of the bottom row (or of the held notes). ▲▼ do the same."})];
  return[...first,
   sl(velL,val(velK)??0,d=>edit(velK,d,0,127),{p:()=>{if(T.type==="AFTR"||T.type==="MPE"){T.cyc++;emit("step:cyc")}},tip:T.type==="AFTR"?"(3.22) Velocity, or PRESSUR: the poly aftertouch of the note (press the encoder or + while holding notes to switch). Placed notes now send it.":"Velocity of new notes, or of the held notes. Hold the encoder to reset to 100."}),
   sl("LENGTH",lenStr(val("l")),(d,o)=>{const step=o.hold?.25:1;if(sel&&sel.size){mark1();sel.forEach(n=>n.l=n.l>=INF?(d<0?512:INF):clamp(n.l+d*step,.25,512)>=512&&d>0?INF:clamp(n.l+d*step,.25,512))}else T.def.l=clamp(T.def.l+d*step,.25,512)},{sec:"HOLD+TURN: FINE (TICKS)",tip:"Note length in steps (1 step = 1/16 at ×1 zoom), up to INFINITY (plays until STOP). Hold + turn for fine values. Shortcut: hold a pad and tap another pad."}),
   sl("uTIME",(val("u")>0?"+":"")+val("u")+"%",(d)=>edit("u",d,-50,50),{h:()=>{if(sel&&sel.size){mark1();sel.forEach(n=>{const t=n.s+n.u/100,z=stepSpp(T),g=Math.round(t/Math.max(z,1))*Math.max(z,1);n.s=Math.round(g);n.u=0});toast("QUANTIZED");emit("quantize")}else T.def.u=0},tip:"Micro-timing: moves the note up to half a step early (–) or late (+). Holding notes: hold this encoder to quantize them to the grid."}),
   sl("CHANCE",val("ch")+"%",d=>edit("ch",d,0,100),{tip:"Probability the note plays."}),
   sl("ROLL",val("roll"),d=>{const f=n=>ROLLS[clamp(ROLLS.indexOf(n.roll)+d,0,ROLLS.length-1)];if(sel&&sel.size){mark1();sel.forEach(n=>n.roll=f(n))}else T.def.roll=f(T.def)},{tip:"Ratchet: the note repeats at this rate through its length."}),
   sl("MATH",val("math"),d=>{const f=n=>MATHS[clamp(MATHS.indexOf(n.math)+d,0,MATHS.length-1)];if(sel&&sel.size){mark1();sel.forEach(n=>n.math=f(n))}else T.def.math=f(T.def);S.ui.mathHi=performance.now()},{tip:"Conditional trig: FILL, 1ST, PRE, SYNC, NT/PS/PB note counts, X:Y loops, NO FX…"})]}
 case"lane":{const L=T.drum[heldRows()[0]+T.dpage*8],C=["TRACK",...Array.from({length:16},(_,k)=>k+1),"GATE 1","GATE 2","GATE 3","GATE 4","CV 1","CV 2","CV 3","CV 4"],rows=heldRows().map(r=>T.drum[r+T.dpage*8]);
  return[sl("INPUT",L.inn==="LINK"?"LINK":nm(L.inn),d=>{const v=L.inn==="LINK"?(d>0?0:127):L.inn+d;L.inn=v<0||v>127?"LINK":v},{h:()=>L.inn="LINK",tip:"Note that triggers this lane when recording from a controller. LINK = same as the output note."}),
   sl("OUTPUT",nm(L.note)+` (${L.note})`,(d,o)=>{rows.forEach(x=>x.note=clamp(x.note+d*(o.fast?12:1),0,127));emit("lane:edit")},{tip:"Note this lane sends. Hold several rows to move them all at once."}),
   sl("CHANNEL",L.ch==="TRACK"?"TRACK CH":L.ch,d=>{rows.forEach(x=>x.ch=C[clamp(C.indexOf(x.ch)+d,0,C.length-1)]);emit("lane:edit")},{tip:"TRACK CH = the track's channel. A Gate or CV output turns the lane into a trigger."}),sl("NAME",L.name,null),BL(),BL(),BL(),BL()]}
 case"autom":{const li=autLane(T),Ln=T.lanes[li],sel=autSelEv(),ev=p.aut[li]||[];const lab=li>=T.lanes.length?"+ ADD":laneName(T,Ln);
  const vs=v=>Ln?fmtDest(Ln.dest,v):"--";
  const s=[sl("LANE",lab,d=>{T.rt.lane=clamp(li+d,0,T.lanes.length);emit("aut:lane")},{p:()=>autLaneMenu(T),tip:"Scroll through the track's automation lanes. Press: + ADD a lane, or open the lane menu (mute, clear, delete, change destination, copy/paste, max rate, lock)."}),
   sl("INTERPOL",Ln?(Ln.interp?"ON":"OFF"):"--",Ln?(()=>{Ln.interp=!Ln.interp;emit("aut:interp")}):null,{tip:"ON: lines/curves between events. OFF: stepped values held until the next event."}),
   sl("DEFAULT",Ln&&Ln.def!=null?vs(Ln.def):"--",Ln?(d=>{Ln.def=Ln.def==null?(d>0?0:null):Ln.def+d/127;if(Ln.def!=null&&(Ln.def<0||Ln.def>1))Ln.def=Ln.def<0?null:1;emit("aut:def")}):null,{h:()=>Ln&&(Ln.def=null),tip:"Value sent when the lane has no events in this pattern; also resets the parameter after a pattern change."}),
   sl("PING",Ln?"2ND+PRESS":"--",null,{p:()=>{if(Ln&&isHeld("2nd")){const v=Ln.def!=null?Ln.def:ev.length?ev[0].v:0;sendDest(P,T,Ln.dest,v,S.clk,null);T.rt.lastAut={};toast("PING "+laneName(T,Ln));emit("aut:ping")}},tip:"(3.10) Hold 2ND and press: sends the lane's value once, for MIDI learn in a DAW or synth."})];
  if(sel.length){const mn=Math.min(...sel.map(e=>e.v)),mx=Math.max(...sel.map(e=>e.v));
   s.push(sl("VALUE",vs(sel[0].v),d=>{mark1();sel.forEach(e=>e.v=clamp(e.v+d/127,0,1))},{h:()=>{mark1();sel.forEach(e=>e.v=Ln&&Ln.def!=null?Ln.def:.5)},tip:"Value of the held event(s)."}),
    sl("MIN",vs(mn),sel.length>1?(d=>{mark1();sel.forEach(e=>e.v=clamp(mx-(mx-e.v)*((mx-mn-d/127)/Math.max(1e-6,mx-mn)),0,1))}):null,{tip:"Multiple events: rescale towards a new minimum."}),
    sl("MAX",vs(mx),sel.length>1?(d=>{mark1();sel.forEach(e=>e.v=clamp(mn+(e.v-mn)*((mx-mn+d/127)/Math.max(1e-6,mx-mn)),0,1))}):null,{tip:"Multiple events: rescale towards a new maximum."}),
    sl("CENTROID",sel.length>1?vs((mn+mx)/2):"--",sel.length>1?(d=>{mark1();sel.forEach(e=>e.v=clamp(e.v+d/127,0,1))}):null,{tip:"Moves the whole curve section up or down."}))}
  else s.push(BL(),BL(),BL(),BL());return s}
 case"row":{const li=autLane(T),Ln=T.lanes[li];if(!Ln)return[sl("ROW VALUE","SELECT A LANE",null),BL(),BL(),BL(),BL(),BL(),BL(),BL()];Ln.rows=Ln.rows||Array.from({length:8},(_,i)=>i/7);const rs=heldRows();
  return[sl("ROW "+(rs[0]+1),fmtDest(Ln.dest,Ln.rows[rs[0]]),d=>{rs.forEach(r=>Ln.rows[r]=clamp(Ln.rows[r]+d/127,0,1));emit("aut:row")},{tip:"(3.10) Snap value of this pad row. New events placed on the row use it. Hold two rows for a range."}),BL(),BL(),BL(),BL(),BL(),BL(),BL()]}
 case"pattern":return[sl("MODE",P.pmode,chz(["PERFORM","PLAY SONG","LOOP SONG"],()=>P.pmode,x=>{P.pmode=x;if(x==="PERFORM"&&P.rt.song)P.rt.song=null;else if(x!=="PERFORM"&&S.playing&&!P.rt.song&&P.song.length)songLaunch(P,P.songSel,syncAt(P,T,P.sync));emit("pmode:"+x)}),{tip:"PERFORM: launch patterns by hand. PLAY SONG / LOOP SONG: play the song (song tab) once or forever."}),
   sl("SYNC",P.sync,chz(PSYNC,()=>P.sync,x=>P.sync=x),{tip:"When a launched pattern actually starts: instantly, next 1/16, beat, bar(s), end of the current pattern (PTRN) or end of track N's pattern."}),{l:"_prog"},{l:"_prog"},{l:"_prog"},{l:"_prog"},{l:"_prog"},{l:"_prog"}];
 case"patp":{const pads=heldPads(),tr=P.tracks[pads[0].c],pk=pats=>pads.filter(x=>x.c===pads[0].c).map(x=>tr.pats[patAt(x.r)]),ps=pk(),q=ps[0];const all=f=>ps.forEach(f);
  return[sl("PC",q.pc==null?"--":q.pc,d=>all(x=>x.pc=x.pc==null?(d>0?1:null):x.pc+d<1?null:Math.min(128,x.pc+d)),{p:()=>pcPopup(P,tr,ps),tip:"Program change sent when this pattern launches. Press for MSB/LSB, APPLY&SEND, CLEAR."}),
   sl("TRIG",q.trig||S.set.ptrig,chz(["FREE","RESTART"],()=>q.trig||S.set.ptrig,x=>all(y=>y.trig=x)),{tip:"FREE keeps the playhead position when switching patterns; RESTART starts the new one from its beginning."}),
   sl("COLOR","RGB"+(q.color+1),d=>all(x=>x.color=clamp(x.color+d,0,15)),{tip:"Pad colour of the pattern (16 palette colours since 3.00)."}),
   sl("LENGTH",lenName(q.len),(d,o)=>all(x=>x.len=clamp(o.hold?x.len+d:Math.max(16,Math.round(x.len/16)*16+16*d),1,512)),{sec:"HOLD+TURN: STEPS",tip:"Pattern length, 1 step to 32 bars. Hold + turn for odd lengths."}),
   sl("RUN",q.run,chz(RUNS,()=>q.run,x=>all(y=>y.run=x)),{tip:"Forward, reverse, ping-pong, or random jumps every bar / beat / 1/16."}),
   sl("FOLL LEN",q.fol.len?lenName(q.fol.len):"PTRN",(d,o)=>all(x=>x.fol.len=clamp((x.fol.len||x.len)+(o.hold?d:16*d),0,512)),{sec:"HOLD+TURN: STEPS",tip:"When the follow action fires. Default = the pattern length."}),
   sl(S.ui.fpct?"FOLLOW 1 %":"FOLLOW 1",S.ui.fpct?q.fol.p1+"%":q.fol.a1,S.ui.fpct?(d=>all(x=>x.fol.p1=clamp(x.fol.p1+d,0,100))):chz(FOLLOWS,()=>q.fol.a1,x=>{all(y=>y.fol.a1=x);emit("fol:set")}),{p:()=>{S.ui.fpct=!S.ui.fpct},tip:"Action at the end: STOP, NEXT, PREVIOUS, ANY, OTHER, FIRST, LAST (within the contiguous group of patterns that have actions), RSTR (restart). Press for its probability; FOLLOW 2 gets the rest."}),
   sl("FOLLOW 2",q.fol.a2+(q.fol.a2!=="--"?` ${100-q.fol.p1}%`:""),chz(FOLLOWS.filter(x=>x!=="STOP"&&x!=="RSTR"),()=>q.fol.a2,x=>all(y=>y.fol.a2=x)),{tip:"Second action; plays with the remaining probability."})]}
 case"trk":{const ti=heldTrack(),U=P.tracks[ti],q=PAT(U),mpe=U.type==="MPE";
  return[sl("P"+(U.cur+1)+" PC",q.pc==null?"--":q.pc,d=>q.pc=q.pc==null?(d>0?1:null):q.pc+d<1?null:Math.min(128,q.pc+d),{p:()=>pcPopup(P,U,[q]),tip:"Program change of the active pattern. Press for the Program Change popup."}),
   sl("TRIG",q.trig||S.set.ptrig,chz(["FREE","RESTART"],()=>q.trig||S.set.ptrig,x=>q.trig=x),{tip:"FREE / RESTART on pattern change."}),
   sl("OUTPUT",U.out.port,chz(OUTPORTS,()=>U.out.port,x=>{U.out.port=x;emit("trk:out")}),{tip:"Output port: MIDI A–D (C doubles as DIN sync), USB device (computer), USB host (16 virtual cables each since 3.00), or a CV/Gate pair."}),
   sl("CHANNEL",mpe?`2..${U.out.mpe||15} LOWER Z`:("0"+U.out.ch).slice(-2),d=>{if(mpe)U.out.mpe=clamp((U.out.mpe||15)+d,2,16);else{U.out.ch=clamp(U.out.ch+d,1,16);emit("trk:ch")}},{tip:mpe?"MPE zone: lower zone uses ch 1 as master and notes on 2..N.":"MIDI channel of everything this track sends. In the simulation every channel has a stand-in instrument (see Virtual studio)."}),
   sl("LENGTH",lenName(q.len),(d,o)=>{q.len=clamp(o.hold?q.len+d:Math.max(16,Math.round(q.len/16)*16+16*d),1,512);emit("trk:len")},{sec:"HOLD+TURN: STEPS",tip:"Length of the active pattern, 1 step to 32 bars."}),
   sl("RUN",q.run,chz(RUNS,()=>q.run,x=>{q.run=x;emit("trk:run")}),{tip:"Playback direction / random mode of the pattern."}),
   sl("INPUT",U.inp.port,chz(INPORTS,()=>U.inp.port,x=>U.inp.port=x),{tip:"Where the track listens. ALL ACTIVE = every port, but only while the track is selected. A named port listens all the time."}),
   sl("CHANNEL",U.inp.ch?("0"+U.inp.ch).slice(-2):U.inp.port==="ALL ACTIVE"?"--":"ALL",d=>U.inp.ch=clamp(U.inp.ch+d,0,16),{tip:"Input channel; ALL = any channel on the port."})]}
 case"trk2":{const U=T;return[sl("QUANTIZE",U.q,chz(QUANTS,()=>U.q,x=>{U.q=x;emit("trk:q")}),{tip:"Real-time, non-destructive quantize grid. Overridden by the project pQUANT."}),
   sl("STRENGTH",U.str+"%",nz(()=>U.str,x=>U.str=x,0,100),{tip:"How far notes move towards the grid."}),
   sl("pTRSP",P.trsp==="OFF"?"(OFF)":U.trsp?"ON":"OFF",P.trsp==="OFF"?null:(()=>U.trsp=!U.trsp),{tip:"Let track 16 transpose this track (only when pTRSP is on in the project)."}),
   sl("pSCALE",!P.psc.on?"(OFF)":U.psc?"ON":"OFF",!P.psc.on?null:(()=>{U.psc=!U.psc;emit("trk:psc")}),{tip:"Follow the project scale (only when pSCALE is on in the project)."}),
   sl("NAME",U.name,null,{p:()=>kbd("TRACK NAME",U.name,v=>U.name=v.toUpperCase().slice(0,12)),tip:"Press, then type a name on your computer keyboard and press Enter."}),
   sl("MONO EDIT",U.mono?"ON":"OFF",()=>{U.mono=!U.mono;emit("mono")},{tip:"Adding a note removes the other notes of the same step (2ND + Step toggles it too)."}),
   sl(U.type==="MPE"?"MCM":"INSTRUM",U.type==="MPE"?"CLICK TO SEND":U.idef||"--",null,{p:()=>U.type==="MPE"?toast("MCM SENT (LOWER ZONE)"):idefPopup(U),tip:U.type==="MPE"?"Sends the MPE Configuration Message.":"Load an instrument definition: names CCs, sets ports/channels, drum lanes, preset names, empty lanes."}),
   sl("MIDI FILE",S.ui.mf||"EXPORT",chz(["EXPORT","IMPORT"],()=>S.ui.mf||"EXPORT",x=>S.ui.mf=x),{p:()=>{if((S.ui.mf||"EXPORT")==="EXPORT")exportMid(P,U);else $("#midIn").click()},tip:"EXPORT saves the active pattern as a .mid (downloads here). IMPORT replaces the active pattern with a track of a .mid file."})]}
 case"proj":{const pi=heldProj(),Q=S.P[pi],ps=Q.psc;return[sl("pSCALE",ps.on?"ON":"OFF",()=>{ps.on=!ps.on;emit("psc:"+(ps.on?"on":"off"))},{tip:"Constrain all tracks to the project scale."}),
   sl("KEY",NN[ps.key],nz(()=>ps.key,x=>{ps.key=x;emit("psc:key")},0,11),{tip:"Key of the project scale."}),
   sl("COLOR",SCALE_COLORS[ps.ci][0],nz(()=>ps.ci,x=>{ps.ci=x;ps.si=0;emit("psc:scale")},1,SCALE_COLORS.length-1),{tip:"Scale family."}),
   sl("SCALE",scaleOf(ps.ci,ps.si).n,nz(()=>ps.si,x=>{ps.si=x;emit("psc:scale")},0,SCALE_COLORS[ps.ci][1].length-1),{tip:"Scale. Change it live to re-colour the whole project."}),
   sl("TR16 TRSP",Q.trsp,chz(["OFF","TRSP","CHRD"],()=>Q.trsp,x=>{Q.trsp=x;Q.rt.trAmt=0;Q.rt.chord=null;emit("trsp:"+x)}),{tip:"Track 16 leads: TRSP transposes tracks 1–15 by its notes (C5 = no change); CHRD (match chord) forces their notes into the chord track 16 plays. Drum tracks never follow."}),
   sl("pQUANT",Q.pq,chz(QUANTS,()=>Q.pq,x=>Q.pq=x),{tip:"Quantize all 16 tracks (overrides each track's quantizer)."}),
   sl("pSIGNATURE",Q.sig.join("/"),(d,o)=>{if(o.hold){const L=[1,2,4,8,16];Q.sig[1]=L[clamp(L.indexOf(Q.sig[1])+d,0,4)]}else Q.sig[0]=clamp(Q.sig[0]+d,1,32)},{sec:"HOLD+TURN: BEAT UNIT",tip:"Time signature: turn = beats per bar, hold + turn = beat unit."}),
   sl("STICK",ps.stick,chz(["DOWN","UP","FILTER"],()=>ps.stick,x=>ps.stick=x),{tip:"Out-of-scale notes go down, up, or are dropped."})]}
 case"fx":{const fx=T.fx[S.ui.fxSel];if(!fx)return Array.from({length:8},BL);if(fx.t==="MM"){const m=fx.mods[fx.sel]||(fx.mods[fx.sel]=newMod());const dl=destList(T);
   return[sl("MOD",(fx.sel+1)+"/"+fx.mods.length,d=>{fx.sel=clamp(fx.sel+d,0,Math.min(7,fx.mods.length));if(!fx.mods[fx.sel])fx.mods.push(newMod())},{tip:"Which modulation row of the matrix (up to 8). Turn past the last to add one."}),
    sl("SOURCE",m.src,(d,o)=>{m.src=MMSRC[clamp(MMSRC.indexOf(m.src)+d*(o.fast?10:1),0,MMSRC.length-1)];emit("mm:src")},{p:()=>listPopup("SOURCE",MMSRC,MMSRC.indexOf(m.src),i=>{m.src=MMSRC[i];emit("mm:src")}),tip:"Incoming CC/pitchbend/aftertouch/CV, a project LFO, or the played notes' key or velocity, or FILL."}),
    sl("DEST",destLabel(T,m.dest),d=>{m.dest=dl[clamp(dl.indexOf(m.dest)+d,0,dl.length-1)];emit("mm:dest")},{p:()=>listPopup("DESTINATION",dl.map(x=>destLabel(T,x)),dl.indexOf(m.dest),i=>{m.dest=dl[i];emit("mm:dest")}),tip:"A CC, pitchbend, aftertouch, CV out, or any effect parameter of this track. Press for the list."}),
    sl("OUT",m.out!=null?Math.round(m.out*100)+"%":"--",null,{tip:"Current modulation output."}),
    sl("DEPTH",m.depth+"%",nz(()=>m.depth,x=>{m.depth=x;emit("mm:depth")},-100,100),{tip:"Amplifies, attenuates or inverts the source."}),sl("OFFSET",m.off+"%",nz(()=>m.off,x=>m.off=x,-100,100),{tip:"Centre value of the modulation (0.1% steps since 3.00 on hardware)."}),
    sl("POLARITY",m.pol,chz(["UNI","BI"],()=>m.pol,x=>m.pol=x),{tip:"UNI: above the offset. BI: around it."}),sl("CONSUME",m.consume,chz(["OFF","ON"],()=>m.consume,x=>m.consume=x),{tip:"ON drops the source message so it isn't passed on."})]}
  const D=FXDEF[fx.t],ps=D.p.slice(0,8);return ps.map((d,j)=>{const useSec=d[4]&&S.ui.fxSec===j,pd=useSec?d[4]:d,k=pd[0],lk=PAT(T).lock[S.ui.fxSel],locked=lk&&lk[k]!=null;
   return sl((useSec?"⊕ ":"")+pd[1]+(locked?" 🔒":""),fmtParam(pd,fv(T,fx,k)),(dd,o)=>{const set=v=>{if(locked)lk[k]=v;else fx.p[k]=v;if(S.rec&&S.playing){const di=laneFor(T,`FX:${S.ui.fxSel}:${k}`);recAut(T,`FX:${S.ui.fxSel}:${k}`,toNorm(pd,v))}};const sp=pd[2],cur=fv(T,fx,k);
     if(typeof sp[0]==="number")set(clamp(cur+dd*(o.fast?10:1),sp[0],sp[1]));else set(sp[clamp(sp.indexOf(cur)+dd,0,sp.length-1)]);if(isHeld("rec"))quickLane(T,`FX:${S.ui.fxSel}:${k}`);emit("fx:param");emit("fx:"+fx.t+":"+k)},
    {p:()=>{if(isHeld("2nd")){const L=PAT(T).lock;L[S.ui.fxSel]=L[S.ui.fxSel]||{};if(L[S.ui.fxSel][k]!=null)delete L[S.ui.fxSel][k];else L[S.ui.fxSel][k]=fx.p[k];emit("fx:lock");return}if(isHeld("rec")){quickLane(T,`FX:${S.ui.fxSel}:${k}`);return}if(d[4])S.ui.fxSec=S.ui.fxSec===j?null:j},h:()=>{fx.p[k]=pd[3]},tip:`${pd[1]}. ${d[4]?"Press the encoder for the hidden ⊕ "+d[4][1]+". ":""}2ND + press locks the value to this pattern. Hold REC + press/turn: quick automation lane. Hold to reset.`})})}
 case"lfo":{const L=P.lfo;return[0,1].flatMap(j=>{const l=L[j],n="AB"[j];return[sl("LFO "+n,l.wave,chz(["SINE","TRIANGLE","RAMP","SQUARE","RANDOM","FLAT"],()=>l.wave,x=>{l.wave=x;emit("plfo")}),{tip:`Project LFO ${n} waveform. FLAT (3.10) = a fixed value, a macro through the modMatrix.`}),
  sl("SYNC",l.sync,chz(["ON","OFF"],()=>l.sync,x=>l.sync=x)),l.wave==="FLAT"?sl("LEVEL",l.flat+"%",nz(()=>l.flat,x=>l.flat=x,0,100)):sl("RATE",l.rate,chz(LFORATES,()=>l.rate,x=>l.rate=x)),sl("PHASE",l.phase+"°",nz(()=>l.phase,x=>l.phase=x,-180,180,5))]})}
 case"assign":return T.assign.map((a,j)=>sl(destLabel(T,a.dest),fmtDest(a.dest,a.v/127),(d,o)=>{a.v=clamp(a.v+d*(o.fast?8:1),0,127);sendDest(P,T,a.dest,a.v/127,S.clk,null);T.rt.ccIn[+a.dest.slice(2)]=a.v;if(a.dest.startsWith("CC"))recAut(T,a.dest,a.v/127);else if(a.dest.startsWith("FX:"))recAut(T,a.dest,a.v/127);emit("assign:turn")},{p:()=>{const dl=destList(T);listPopup("ASSIGN "+(j+1),dl.map(x=>destLabel(T,x)),Math.max(0,dl.indexOf(a.dest)),i=>{a.dest=dl[i];emit("assign:dest")})},tip:"Assigned encoder: sends its destination as if from an external controller, so with REC on it records into an automation lane. Press to choose the destination."}));
 case"recset":return RECSET.map(([k,l,c])=>sl(l,S.recset[k],chz(c,()=>S.recset[k],x=>{S.recset[k]=x;emit("recset:"+k)}),{tip:{learn:"Note learn in Step mode on/off.",notes:"HARD REC replaces the pattern's notes when you record; OVERDUB merges.",count:"Count-in bars before recording (arm with REC first).",metro:"Metronome while recording.",punch:"Armed REC waits for the first note you play, then starts.",looper:"On an empty track: REC starts, REC again sets the length (nearest bar or 1/16) and loops.",recoff:"Stop recording at the end of the pattern.",quant:"Destructive quantize of recorded notes."}[k]}));
 case"settings":{const[tab,items]=SETTINGS[S.ui.setTab],it=items[S.ui.setRow];return[sl(tab,it[1],null),sl("VALUE",S.set[it[0]],chz(it[2],()=>S.set[it[0]],x=>{S.set[it[0]]=x;emit("set:"+it[0])}),{tip:"Turn to change the highlighted setting (or press the main encoder)."}),BL(),BL(),BL(),BL(),BL(),BL()]}
 case"algo":{const k=Object.keys(ALGODEF),a=S.ui.algo,D=ALGODEF[a],pr=S.algoP[a];
  const s=[sl("ALGO",D.n,d=>{const av=k.filter(x=>ALGODEF[x].where.includes(S.ui.mode==="autom"?"AUTOM":T.type==="DRUM"?"DRUM":"POLY"));S.ui.algo=av[clamp(av.indexOf(a)+d,0,av.length-1)]||a;S.ui.algoSec=null},{p:()=>{applyAlgo();},tip:"Choose the algorithm; PRESS this encoder to apply it to the pattern (or to the held selection). Undo reverts it."})];
  D.p.forEach((d,j)=>{const useSec=d[4]&&S.ui.algoSec===j,pd=useSec?d[4]:d;s.push(sl((useSec?"⊕ ":"")+pd[1],fmtParam(pd,pr[pd[0]]),(dd,o)=>{const sp=pd[2];pr[pd[0]]=typeof sp[0]==="number"?clamp(pr[pd[0]]+dd*(o.fast?10:1),sp[0],sp[1]):sp[clamp(sp.indexOf(pr[pd[0]])+dd,0,sp.length-1)]},{p:()=>{if(d[4])S.ui.algoSec=S.ui.algoSec===j?null:j},tip:pd[1]+(d[4]?". Press for ⊕ "+d[4][1]:"")}))});
  while(s.length<8)s.push(BL());return s}
 case"steprec":{const R=S.srec;return[sl("APPLY",R.seq.length+" STEPS",null,{p:()=>srecApply(),tip:"Write the sequence into the pattern."}),sl("REST","",null,{p:()=>{R.seq.push("REST");emit("srec:rest")}}),sl("TIE","",null,{p:()=>{R.seq.push("TIE");emit("srec:tie")}}),sl("BACK","",null,{p:()=>R.seq.pop()}),
  sl("CLEAR","",null,{p:()=>R.seq=[]}),sl("RATE",R.rate,chz(["1/32","1/16","1/8","1/4"],()=>R.rate,x=>R.rate=x)),sl("MONO",R.mono,chz(["OFF","MONO","MONO+LEGATO"],()=>R.mono,x=>R.mono=x)),BL()]}
 default:return Array.from({length:8},BL)}}
let mark1Sig=null;function mark1(){const sig=view()+"|"+heldPads().map(x=>x.c+","+x.r).join(";");if(sig!==mark1Sig){mark();mark1Sig=sig}}
function fmtParam(d,v){const sp=d[2];if(typeof sp[0]==="number"&&typeof sp[2]==="function")return sp[2](v);return v}
function fmtDest(dest,v){if(v==null)return"--";if(dest==="PITCHBEND")return Math.round(v*200-100)+"%";if(dest&&dest.startsWith("CV OUT"))return(v*10-5).toFixed(2)+"V";if(dest&&dest.startsWith("FX:"))return Math.round(v*100)+"%";return Math.round(v*127)}
function destList(T){const fxs=T.fx.flatMap((fx,i)=>fx.t==="MM"?[]:FXDEF[fx.t].p.flatMap(d=>[d,...(d[4]?[d[4]]:[])]).filter(d=>typeof d[2][0]==="number"||d[2].length>1).map(d=>`FX:${i}:${d[0]}`));return["--",...CCDEST.filter(x=>x!=="FX PARAM"),...fxs]}
function destLabel(T,d){if(!d||d==="--")return"--";if(d.startsWith("FX:")){const[,i,k]=d.split(":"),fx=T.fx[+i];if(!fx)return"FX?";const pd=fxParamDef(fx.t,k);return`${fx.t} ${pd?pd[1]:k}`}if(d.startsWith("CC")){const n=+d.slice(2),nm2=T.ccNames&&T.ccNames[n]||CC_NAMES[n];return nm2?`CC${n} ${nm2}`:d}return d}
const laneName=(T,L)=>L.dest==="VOID"?"VOID":destLabel(T,L.dest);
/* ---------- pads ⇄ time/pitch ---------- */
const stepSpp=T=>(T.tz?TZOOMS:ZOOMS)[T.tz?Math.min(T.zoom,3):T.zoom][1];
const pageLen=T=>16*stepSpp(T);
const pages=T=>Math.max(1,Math.ceil(PAT(T).len/pageLen(T)));
const colT=(T,c)=>T.page*pageLen(T)+c*stepSpp(T);
function rowPitch(T,r){const P=P_();if(P.psc.on&&T.psc){const iv=scaleOf(P.psc.ci,P.psc.si).iv,base=P.psc.key+12*Math.floor((T.view-P.psc.key)/12);return degNote(base,iv,r)}return T.view+r}
function notesAt(T,c,r){const p=PAT(T),t0=colT(T,c),sp=stepSpp(T),D=T.type==="DRUM",pitch=D?T.dpage*8+r:rowPitch(T,r);return p.notes.filter(n=>{const t=n.s+n.u/100;return n.n===pitch&&(sp>=1?n.s>=t0&&n.s<t0+sp:t>=t0-1e-6&&t<t0+sp-1e-6)})}
function liveNote(T,c,r){const P=P_(),L=T.live,ps=P.psc.on&&T.psc,iv=ps?scaleOf(P.psc.ci,P.psc.si).iv:scaleOf(L.ci,L.si).iv,key=ps?P.psc.key:L.key;return clamp(degNote(key+12*L.oct,iv,c+r*L.jump),0,127)}
function drumZone(T,c,r){const lay=S.set.ldp,[zw,zh]=lay.startsWith("16")?[4,4]:lay.startsWith("8")?[4,2]:lay.startsWith("4")?[2,2]:[4,2];const per=16/zw,band=Math.floor(r/zh),z=band*per+Math.floor(c/zw);
 const lane=lay.startsWith("16")?T.dpage*8+z:z;if(lane>15)return null;const nv=lay.startsWith("1")?1:zw*zh,idx=(r%zh)*zw+(c%zw);return{lane,vel:nv===1?127:Math.round(16+idx/(nv-1)*111),idx,nv}}
const patAt=r=>S.ui.poff+(7-r);
/* ---------- pad colours ---------- */
const hex2=(h,a)=>{const n=parseInt(h.slice(1),16),r=(n>>16)&255,g=(n>>8)&255,b=n&255,f=x=>Math.round(x*a);return`rgb(${f(r)},${f(g)},${f(b)})`};
const OFF="#151515";
function padColor(c,r){const P=P_(),T=T_(),p=PAT(T),m=S.ui.mode,now=performance.now();
 if(m==="mix"){const pi=r>=4?0:1,row=3-(r%4),U=S.P[pi].tracks[c],k=["mute","solo","tog","arm"][row],on=U[k],col=["#ff5a5a","#ffd84a","#58b8ff","#ff3b6b"][row];const act=U.rt&&U.rt.act>0&&row===0&&!on&&now%400<200;return on?col:act?hex2(col,.5):hex2(col,.14)}
 if(m==="pattern"){const U=P.tracks[c],k=patAt(r);if(k>15)return OFF;const q=U.pats[k],has=q.notes.length||Object.values(q.aut).some(a=>a.length),col=PALETTE[q.color];
  if(q.mute)return k===U.cur?"#802020":"#401010";if(U.next&&U.next.pat===k&&now%300<150)return"#ffffff";if(k===U.cur)return U.stopped?hex2(col,.3):col;return has?hex2(col,.28):"#202020"}
 if(m==="autom"){const li=autLane(T),Ln=T.lanes[li],ev=Ln?p.aut[li]||[]:[],t0=colT(T,c),sp=stepSpp(T),rows=Ln&&Ln.rows||Array.from({length:8},(_,i)=>i/7);
  const e=ev.find(x=>x.t>=t0-1e-6&&x.t<t0+sp-1e-6),ph=playCol(T)===c;if(t0>=p.len)return"#0a0a0a";const near=v=>rows.reduce((b,x,i)=>Math.abs(x-v)<Math.abs(rows[b]-v)?i:b,0);
  if(e){const rr=near(e.v);const held=heldPads().some(h=>h.c===c);if(rr===r)return held?"#ffffff":Ln.dest==="VOID"?"#b58cff":"#3fa9ff";if(r<rr)return ph?"#244a70":"#123050"}
  if(!e&&Ln&&Ln.def!=null&&near(Ln.def)===r)return"#3a3a20";return ph?"#2a2a2a":OFF}
 if(m==="step"||(SUBS.includes(S.ui.sub)&&m==="step")){if(T.type==="DRUM"&&T.velView!=null){const t0=colT(T,c),n=p.notes.find(x=>x.n===T.velView&&x.s>=t0&&x.s<t0+Math.max(1,stepSpp(T)));if(t0>=p.len)return"#0a0a0a";if(n&&r<=Math.floor(n.v/16))return hex2(NOTECOL[T.velView%12],r===Math.floor(n.v/16)?1:.4);return playCol(T)===c?"#2a2a2a":OFF}
  const t0=colT(T,c);if(t0>=p.len)return"#0a0a0a";const[a,b]=loopRange(p),inLoop=t0>=a&&t0<=b;
  const ns=notesAt(T,c,r),sel=selNotes();const pitch=T.type==="DRUM"?T.dpage*8+r:rowPitch(T,r),col=T.type==="DRUM"?PALETTE[(pitch*3)%16]:NOTECOL[pitch%12];
  if(ns.length){const n=ns[0];if(sel&&sel.has(n))return"#ffffff";if(n.mute)return hex2(col,.18);if(S.ui.mathHi&&now-S.ui.mathHi<1500){const hn=selNotes()&&[...selNotes()][0];if(hn&&n.math!==hn.math)return hex2(col,.2)}return inLoop?col:hex2(col,.35)}
  const tail=p.notes.some(n=>n.n===pitch&&n.s<t0&&n.s+Math.min(n.l,512)>t0);if(tail)return hex2(col,.22);
  if(playCol(T)===c&&S.playing)return"#2c2c2c";if(!inLoop)return"#0b0b0b";const bg=parseInt(S.set.bgs)/100;if(bg&&T.type!=="DRUM")return hex2(col,bg*.15);if(t0%(4)===0&&stepSpp(T)<=1)return"#1c1c1c";return OFF}
 // live (and every sub-mode on top of it)
 if(T.type==="DRUM"){const z=drumZone(T,c,r);if(!z)return OFF;const col=PALETTE[(z.lane*3)%16],lit=S.ui.livePads.has(c+","+r);return lit?"#ffffff":hex2(col,.1+.9*Math.pow(z.vel/127,1.7))}
 if(T.live.mode==="CHORD"){if(r>=3){const mi=CHMOD_GRID[7-r]&&CHMOD_GRID[7-r][c];if(c<8&&mi!=null){const g=CHMODS[mi][1],on=T.live.mods.includes(mi)||S.ui.livePads.has(c+","+r);return on?"#ffffff":hex2(CHMOD_COL[g],.8)}return OFF}
  if(r<=1){const deg=c-4,iv=chordScale(T);if(deg>=0&&deg<iv.length)return S.ui.livePads.has(c+","+r)?"#ffffff":hex2(NOTECOL[(chordRoot(T)+iv[deg])%12],r?0.6:.9);return"#202030"}return OFF}
 const n=liveNote(T,c,r),L=T.live,ps=P.psc.on&&T.psc,key=ps?P.psc.key:L.key,held=L.latched.has(n)||[...S.ui.livePlay.values()].some(x=>x.n===n);
 if(held)return"#ffffff";const pc=((n-key)%12+12)%12,bg=parseInt(S.set.bgl)/100;
 if(L.view==="NOTES IN"){return p.notes.some(x=>x.n===n)?NOTECOL[n%12]:OFF}
 if(L.view==="CHROM+SCALE"){const iv=ps?scaleOf(P.psc.ci,P.psc.si).iv:scaleOf(L.ci,L.si).iv;return pc===0?"#e0e0e0":iv.includes(pc)?hex2(NOTECOL[n%12],.55):"#222"}
 return pc===0?"#d8d8d8":bg?hex2(NOTECOL[n%12],bg*.5):"#2a2a2a"}
function playCol(T){if(!S.playing)return-1;const p=PAT(T),x=stepsAt(T,tpos());const[pos]=mapStep(p,Math.floor(x));const t=pos+(x%1),pl=pageLen(T);if(t<T.page*pl||t>=(T.page+1)*pl)return-1;return Math.floor((t-T.page*pl)/stepSpp(T))}
function chordScale(T){const P=P_();return P.psc.on&&T.psc?scaleOf(P.psc.ci,P.psc.si).iv:T.live.ci===0?scaleOf(1,0).iv:scaleOf(T.live.ci,T.live.si).iv}
const chordRoot=T=>{const P=P_();return P.psc.on&&T.psc?P.psc.key:T.live.key};
/* ---------- drawing ---------- */
function drawScreens(){LX.setTransform(3,0,0,3,0,0);RX.setTransform(3,0,0,3,0,0);LR=[];RR=[];box(LX,0,0,LW,LH,"#000");box(RX,0,0,LW,LH,"#000");
 const v=view();drawLeft(v);drawRight(v)}
function drawLeft(v){const X=LX;if(v==="mix")return drawMix(X,0);if(v==="monitor")return drawMon(X,"in");
 const s=slots(v);s.forEach((o,j)=>{const col=j%4,row=Math.floor(j/4),x=col*64,y=row*(v==="live"&&T_().type!=="DRUM"?54:64),h=v==="live"&&T_().type!=="DRUM"?54:64;if(o.l==="_prog")return;
  if(o.l){box(X,x+1,y+1,62,10,o.t||o.p?"#2c2c2c":"#151515");const lz=fit(X,o.l,60,8);tx(X,o.l,x+3,y+9,lz,o.t||o.p?WH:GR);const vz=fit(X,o.v,60,v==="live"&&T_().type==="DRUM"?11:15);tx(X,o.v,x+3,y+(h>54?34:31),vz,o.t||o.p?WH:GR);
   if(o.sec&&encHeld(j))tx(X,o.sec,x+3,y+h-6,7,"#ffd84a");
   reg(LR,x,y,64,h,`<b>${o.l} = ${o.v}</b>${o.tip||""}<div class="s">Encoder ${["1","2","5","6","3","4","7","8"][j]} (${j<4?"top":"bottom"} row). Drag or wheel to turn${o.p?", click to press":""}${o.h?", long-press to reset":""}.</div>`)}});
 if(v==="pattern")drawProgress(X);
 if(v==="live"&&T_().type!=="DRUM")drawKeyStrip(X);
 if(v==="step"&&T_().mono)tx(X,"MONO EDIT",250,124,8,"#ffd84a","right");
 if(v==="step"&&T_().rt.learn&&T_().rt.learn.on){box(X,0,0,128,12,"#ffd84a");tx(X,"LEARN [+] "+chordName(T_().rt.learn.notes),3,9,8,"#000")}}
function drawKeyStrip(X){const T=T_(),y=110,held=new Map();[...S.ui.livePlay.values()].forEach(x=>held.set(x.n,x.pr));T.live.latched.forEach((id,n)=>held.set(n,T.live.pres));
 const base=Math.floor(T.live.oct)*12;for(let i=0;i<24;i++){const n=base+i,bk=[1,3,6,8,10].includes(n%12),x=2+i*6.5,pr=held.get(n);let c=bk?"#555":"#bbb";if(pr!=null)c=T.type==="AFTR"?hex2("#ffffff",.35+.65*(pr/127)):"#ffffff";box(X,x,bk?y:y+4,5.5,bk?10:14,c);if(pr!=null&&T.type==="AFTR")box(X,x,y+18,5.5,1,"#ffd84a")}
 const nn=[...held.keys()];tx(X,chordName(nn),252,122,10,WH,"right");reg(LR,0,y,256,18,"<b>Mini keyboard</b>Notes being played. Below it, chord recognition: the chord name and, in brackets, its inversion."+(T.type==="AFTR"?" (3.22) On an AFTR track, keys get brighter with pressure.":""))}
function drawProgress(X){const P=P_();P.tracks.forEach((T,i)=>{const y=70+Math.floor(i/8)*28,x=128+(i%8)*16,p=PAT(T);let f=0;if(S.playing){const L=loopRange(p)[1]-loopRange(p)[0]+1,s=stepsAt(T,tpos());f=((s%L)+L)%L/L}
  const has=T.pats.some(q=>q.notes.length),aut=T.pats.some(q=>Object.values(q.aut).some(a=>a.length));box(X,x+2,y,12,22,"#1a1a1a");box(X,x+2,y+22-22*f,12,22*f,T===T_()?WH:GR);tx(X,i+1,x+8,y+30-2,6,has||aut?WH:DM,"center");if(T.next)frame(X,x+1,y-1,14,24,"#ffd84a")});
 tx(X,"P"+(S.ui.poff+1)+"–"+(S.ui.poff+8),130,66,8,GR);reg(LR,128,60,128,68,"<b>Pattern progress</b>One bar per track: how far its current pattern has played (patterns can have different lengths → polymeters). Yellow frame = a pattern is waiting to launch. Above: which patterns the pads show.")}
function drawMix(X,_){[0,1].forEach(pi=>{const Y=pi?RX:LX,P=S.P[pi];tx(Y,P.name+(P.muted?" (MUTED)":""),4,10,9,P.muted?"#ff6060":WH);P.tracks.forEach((T,i)=>{const x=4+i*15.7,y=18;box(Y,x,y+60-Math.min(60,(T.rt?T.rt.act:0)*12),12,Math.min(60,(T.rt?T.rt.act:0)*12),"#5a5a5a");
  ["M","S","T","R"].forEach((k,j)=>{const on=[T.mute,T.solo,T.tog,T.arm][j];box(Y,x,y+64+j*11,12,10,on?WH:"#1a1a1a");tx(Y,k,x+6,y+72+j*11,8,on?"#000":DM,"center")});tx(Y,i+1,x+6,y+-2+0,6,GR,"center")});
  reg(pi?RR:LR,0,0,256,128,`<b>${pi?"proB":"proA"} mixer</b>Vertical bars = MIDI activity per track. M mute, S solo, T temporary toggle, R armed for multitrack recording. The pad rows mirror this: top 4 rows proA, bottom 4 rows proB.`)})}
function drawMon(X,which){const L=S.mon[which];tx(X,which==="in"?"MIDI IN":"MIDI OUT",4,10,9,"#ffd84a");L.slice(-10).forEach((l,i)=>tx(X,l,4,22+i*10.5,9,WH));reg(which==="in"?LR:RR,0,0,256,128,"<b>MIDI monitor</b>2ND + Live. Left: incoming messages; right: outgoing. Filter in Settings → Misc → MIDI MONITOR.")}
function bars(X){const P=P_(),T=T_(),p=PAT(T);box(X,0,0,LW,11,"#222");tx(X,"P"+(T.cur+1),3,9,8,WH);tx(X,T.name,24,9,8,GR);if(trackSilent(P,T))tx(X,"M",86,9,8,"#ff6060");
 [0,1].forEach(j=>box(X,100+j*7,10-Math.min(9,(T.rt.act||0)*3),5,Math.min(9,(T.rt.act||0)*3),WH));tx(X,P.name,252,9,8,S.ap?"#6fa8ff":"#ffd84a","right");
 box(X,0,LH-11,LW,11,"#222");const b=S.playing?tpos():0,bb=barB(P);tx(X,(b<0?"-":"▶")+(Math.floor(Math.abs(b)/bb)+1)+"."+(Math.floor(((b%bb)+bb)%bb)+1),3,LH-3,8,S.rec?"#ff5050":WH);
 tx(X,"⋯ "+pages(T),60,LH-3,8,GR);if(P.trsp!=="OFF")tx(X,"TRSP "+(P.trsp==="TRSP"?sgn(P.rt.trAmt):(P.rt.chord?P.rt.chord.map(x=>NN[x]).join(""):"--")),110,LH-3,8,"#ffd84a");tx(X,S.bpm.toFixed(2)+" BPM",252,LH-3,8,GR,"right");
 reg(RR,0,0,LW,11,"<b>Upper bar</b>Selected pattern, track name, M if the track is muted, MIDI in/out meters, project name (yellow proA, blue proB).");
 reg(RR,0,LH-11,LW,11,"<b>Lower bar</b>Player position (bar.beat, red while recording), number of piano-roll pages, the TRSP amount when track 16 transposes, tempo.")}
function drawRight(v){const X=RX,T=T_(),P=P_(),p=PAT(T);
 if(v==="mix")return;if(v==="monitor")return drawMon(X,"out");
 if(S.ov)return drawOv(X);
 if(v==="ttype"||v==="lmode"){const L=v==="ttype"?TTYPES:LIVEMODES,cur=v==="ttype"?T.type:T.live.mode;tx(X,v==="ttype"?"TRACK TYPE":"LIVE MODE",8,20,10,GR);L.forEach((x,i)=>{if(x===cur)box(X,6,30+i*20,140,17,WH);tx(X,x,10,43+i*20,13,x===cur?"#000":WH)});tx(X,"turn the main encoder",8,120,8,GR);return}
 bars(X);
 if(v==="bpm"){const f=S.ui.bpmF;tx(X,"BPM",10,36,10,GR);tx(X,Math.floor(S.bpm),10,70,30,f===0?WH:GR);tx(X,"."+S.bpm.toFixed(2).split(".")[1],70,70,20,f===1?WH:GR);
  tx(X,"ELASTICITY TR"+(P.sel+1),140,36,10,GR);tx(X,T.el.toFixed(2)+"%",140,70,18,f>=2?WH:GR);tx(X,"press: next field · 2ND + bpm: tap",10,100,8,GR);reg(RR,0,12,256,100,"<b>BPM popup</b>Main encoder turns the selected value; press it to move between BPM, its decimals and the active track's ELASTICITY (playback speed of just that track: 50% half speed, 200% double, 100.5% slowly drifts out of phase).");return}
 if(v==="proj"){const items=["SAVE","SAVE AS","NEW","LOAD","LOAD DEMO"];tx(X,(heldProj()?"proB":"proA")+" — "+S.P[heldProj()].name,6,24,9,GR);items.forEach((x,i)=>{if(i===S.ui.projRow)box(X,4,30+i*15,120,14,WH);tx(X,x,8,41+i*15,11,i===S.ui.projRow?"#000":WH)});tx(X,"main encoder: choose · press",130,110,7,GR);reg(RR,0,12,256,104,"<b>Save / load</b>Hold proA or proB: the right screen is the project menu. Turn the main encoder and press. Projects are kept in this browser; demos are built in.");return}
 if(v==="recset"||v==="trk"||v==="trk2"||v==="patp"||v==="lane"||v==="row"||v==="assign"){const t={recset:"REC SETTINGS",trk:"TRACK "+(heldTrack()+1)+" SETTINGS",trk2:"TRACK "+(P.sel+1)+" · SECONDARY",patp:"PATTERN SETTINGS",lane:"DRUM LANE",row:"ROW SNAP VALUES",assign:"ASSIGN · 8 ENCODERS"}[v];tx(X,t,8,30,12,WH);
  const U=v==="trk"?P.tracks[heldTrack()]:T;if(v==="trk"||v==="trk2")tx(X,`${U.type} · ${U.name}`,8,48,10,GR),tx(X,`virtual studio: ch${U.out.ch} = ${U.out.port.startsWith("CV")?"CV mono synth":S.studio[U.out.ch-1]}`,8,64,9,GR);
  if(v==="assign")tx(X,"turn = send · press = choose destination",8,48,9,GR);if(v==="patp")tx(X,"track "+(heldPads()[0].c+1)+" · pattern "+(patAt(heldPads()[0].r)+1),8,48,10,GR);drawRoll(X,T,70,40);return}
 if(v==="pattern")return drawSections(X,P);
 if(v==="fx")return drawRack(X,T);
 if(v==="settings")return drawSettings(X);
 if(v==="lfo"){[0,1].forEach(j=>{const L=P.lfo[j];tx(X,"LFO "+"AB"[j],8,26+j*48,9,GR);X.strokeStyle=WH;X.beginPath();for(let x=0;x<200;x++){const val=L.wave==="FLAT"?L.flat/100:lfoVal(L.wave,x/200*2,L.phase,{});const y=58+j*48-val*28;x?X.lineTo(40+x,y):X.moveTo(40+x,y)}X.stroke();const now=projLfo(P,j);box(X,246,58+j*48-now*28-2,4,4,"#ffd84a")});reg(RR,0,12,256,104,"<b>Project LFOs</b>Two LFOs per project, available as LFO A / LFO B sources in every track's modMatrix.");return}
 if(v==="algo"){tx(X,"ALGO: "+ALGODEF[S.ui.algo].n,8,26,10,"#ffd84a");tx(X,selNotes()&&selNotes().size?"applies to the selection":"applies to the whole pattern",8,40,8,GR);drawRoll(X,T,48,64);return}
 if(v==="steprec"){tx(X,"STEP-REC",8,26,10,"#ffd84a");S.srec.seq.slice(-24).forEach((st,i)=>{const x=6+(i%12)*20,y=36+Math.floor(i/12)*34;frame(X,x,y,18,30,GR);tx(X,st==="REST"?"—":st==="TIE"?"~":st.length>1?st.length:nm(st[0]).replace(/\d/,""),x+9,y+19,9,WH,"center")});return}
 if(v==="autom")return drawAutom(X,T);
 if(v==="live"&&T.live.mode==="CHORD"&&T.type!=="DRUM"){tx(X,"CHORD · "+NN[chordRoot(T)]+" "+(P.psc.on&&T.psc?scaleOf(P.psc.ci,P.psc.si).n:scaleOf(T.live.ci||1,T.live.si).n),8,26,9,GR);const ms=[...T.live.mods,...[...S.ui.livePads].map(k=>k.split(",").map(Number)).filter(([c,r])=>r>=3&&c<8).map(([c,r])=>CHMOD_GRID[7-r][c]).filter(x=>x!=null&&!T.live.mods.includes(x))];
  ms.slice(0,8).forEach((mi,i)=>tx(X,(i+1)+". "+CHMODS[mi][0]+(T.live.mods.includes(mi)?" ●":""),8,42+i*9.5,8.5,T.live.mods.includes(mi)?WH:"#ffd84a"));if(!ms.length)tx(X,"hold a modifier (left pads)",8,46,8,GR),tx(X,"while playing chords (bottom)",8,57,8,GR);
  reg(RR,0,12,256,104,"<b>Modifier stack</b>Modifiers apply in this order. ● = latched with 2ND + pad.");return}
 drawRoll(X,T,13,102)}
function drawRoll(X,T,y0,h){const p=PAT(T),L=p.len,D=T.type==="DRUM",ns=p.notes;let lo,hi;if(D){lo=0;hi=15}else{const ps=ns.map(n=>n.n).concat([T.view,T.view+8]);lo=Math.min(...ps)-1;hi=Math.max(...ps)+1}
 const W=250,x0=3,sx=W/L,sy=h/Math.max(1,hi-lo+1);box(X,x0,y0,W,h,"#090909");
 const pl=pageLen(T),vx=x0+T.page*pl*sx,vw=Math.min(W,pl*sx);if(!D){const yb=y0+h-(T.view-lo+1)*sy;box(X,vx,yb-sy*7,vw,sy*8,"#2a2a2a")}else box(X,vx,y0+h-(T.dpage*8+8)*sy,vw,8*sy,"#2a2a2a");
 for(let b=0;b<L;b+=16)box(X,x0+b*sx,y0,.6,h,"#333");if(p.loop){const[a,b]=loopRange(p);frame(X,x0+a*sx,y0,(b-a+1)*sx,h,"#ffd84a")}
 const sel=selNotes();ns.forEach(n=>{const x=x0+(n.s+n.u/100)*sx,y=y0+h-(n.n-lo+1)*sy;box(X,x,y,Math.max(1.5,Math.min(n.l,L)*sx-.5),Math.max(1.5,sy-.5),sel&&sel.has(n)?"#ffd84a":n.mute?DM:D?PALETTE[(n.n*3)%16]:WH)});
 if(S.playing){const s=stepsAt(T,tpos()),[pos]=mapStep(p,Math.floor(s));box(X,x0+(pos+(s%1))*sx,y0,1,h,"#ff5050")}
 reg(RR,0,y0,256,h,`<b>Piano roll</b>The whole current pattern (${lenName(L)}). The grey rectangle is the viewport: the part shown on the pads. Red line = playhead${p.loop?", yellow frame = loop points":""}.`)}
function drawAutom(X,T){const p=PAT(T),li=autLane(T),Ln=T.lanes[li],W=250,y0=14,h=100,x0=3;tx(X,Ln?laneName(T,Ln)+(p.autMute[li]?" (M)":"")+(Ln.lock?" 🔒":""):"+ ADD",6,24,9,"#3fa9ff");
 T.lanes.slice(0,6).forEach((L,i)=>{const ev=p.aut[i]||[];tx(X,(i===li?"▸":" ")+laneName(T,L).slice(0,14)+" "+(p.autMute[i]?"M":ev.length?"●":L.def!=null?"····":"")+(L.interp?"":" ⌐"),150,24+i*10,7.5,i===li?WH:GR)});
 if(!Ln)return;const ev=(p.aut[li]||[]).slice().sort((a,b)=>a.t-b.t),sx=W/p.len,Y=v=>y0+20+(1-v)*(h-24);const pl=pageLen(T);box(X,x0+T.page*pl*sx,y0+18,Math.min(W,pl*sx),h-20,"#1e1e1e");
 X.strokeStyle="#3fa9ff";X.beginPath();for(let x=0;x<=W;x+=1){const v=autVal(ev,x/sx,p.len,Ln.interp);const vv=v==null?Ln.def:v;if(vv==null)continue;x?X.lineTo(x0+x,Y(vv)):X.moveTo(x0+x,Y(vv))}X.stroke();ev.forEach(e=>box(X,x0+e.t*sx-1,Y(e.v)-1,3,3,WH));
 if(S.playing){const s=stepsAt(T,tpos())%p.len;box(X,x0+s*sx,y0+18,1,h-20,"#ff5050")}reg(RR,0,12,256,104,"<b>Automation</b>Lane list (● events, ···· default value, M muted, ⌐ no interpolation) and the selected lane's curve over the whole pattern.")}
function drawSections(X,P){const tab=P.tab;tx(X,"SECTIONS",8,24,10,tab==="SECTIONS"?WH:DM);tx(X,"SONG",90,24,10,tab==="SONG"?WH:DM);tx(X,"(press pattern)",140,24,7,GR);
 if(tab==="SECTIONS"){const it=[...P.sections.map(s=>s.name),"+ SAVE SECTION"];it.forEach((x,i)=>{const y=36+(i-Math.max(0,P.secSel-6))*11;if(y<30||y>112)return;if(i===P.secSel)box(X,4,y-8,180,10,WH);tx(X,x,8,y,9,i===P.secSel?"#000":WH)})}
 else{const it=[...P.song.map(s=>`${P.sections[s.sec]?P.sections[s.sec].name:"?"}  ×${s.bars} BAR${s.bars>1?"S":""}`),"+ ADD SECTION"];it.forEach((x,i)=>{const y=36+(i-Math.max(0,P.songSel-6))*11;if(y<30||y>112)return;if(i===P.songSel)box(X,4,y-8,200,10,WH);const playing=P.rt.song&&P.rt.song.i===i;tx(X,(playing?"▶ ":"")+x,8,y,9,i===P.songSel?"#000":playing?"#9be86b":WH)});tx(X,P.pmode,250,24,8,"#ffd84a","right")}
 reg(RR,0,12,256,104,"<b>Sections and song</b>A section stores which pattern every track plays. Main encoder: choose; press: launch (or add); 2ND + press: section menu (launch, override, rename, delete). Press Pattern to switch to the SONG tab: a list of sections with durations.")}
function drawRack(X,T){T.fx.slice(0,8).forEach((fx,i)=>{});for(let i=0;i<8;i++){const fx=T.fx[i],y=16+i*12.5,on=i===S.ui.fxSel;if(on)box(X,4,y,180,11,WH);const nmx=fx?(fx.t==="MM"?"MODMATRIX":FXDEF[fx.t].n)+(fx.on?"":" (OFF)")+(fx.t!=="MM"&&FXDEF[fx.t].ui?" ·":""):"– empty –";tx(X,(i+1)+" "+nmx,8,y+9,9,on?"#000":fx?WH:DM)}
 const fx=T.fx[S.ui.fxSel];if(fx&&fx.t!=="MM"){const d=FXDEF[fx.t].d;wrap(X,d,190,22,62,8)}else if(fx)wrap(X,"Sources → destinations with depth, offset, polarity, consume. Always first in the rack.",190,22,62,8);
 reg(RR,0,12,256,104,"<b>Effect rack</b>Up to 8 MIDI effects after the modMatrix, processed top to bottom (order matters). Main encoder: select; press: add (empty slot) or the menu: TOGGLE ON/OFF, DELETE, REPLACE, COPY, PASTE; hold the main encoder and turn to move the effect. · = parameters only, not processed by the simulation.")}
function wrap(X,s,x,y,w,sz){X.font=`400 ${sz}px Arial`;const words=s.split(" ");let line="",yy=y;words.forEach(wd=>{if(X.measureText(line+wd).width>w){tx(X,line,x,yy,sz,GR,"left",400);line="";yy+=sz+2}line+=wd+" "});tx(X,line,x,yy,sz,GR,"left",400)}
function drawSettings(X){const[tab,items]=SETTINGS[S.ui.setTab];tx(X,"◂ "+tab+" ▸",8,24,10,"#ffd84a");tx(X,(S.ui.setTab+1)+"/"+SETTINGS.length,250,24,8,GR,"right");
 items.forEach((it,i)=>{const y=36+(i-Math.max(0,S.ui.setRow-7))*10;if(y<30||y>116)return;const on=i===S.ui.setRow;if(on)box(X,3,y-8,250,10,S.ui.setEdit?"#ffd84a":WH);tx(X,it[1],6,y,8,on?"#000":WH);tx(X,S.set[it[0]],250,y,8,on?"#000":GR,"right")});
 reg(RR,0,12,256,104,"<b>Settings</b>Global settings shared by proA and proB. Main encoder scrolls; press it to edit the value (turn), press again to leave. ◀ ▶ change tab. Encoder 2 also edits the value.")}
function drawOv(X){const o=S.ov;box(X,0,0,LW,LH,"#000");frame(X,1,1,LW-2,LH-2,GR);tx(X,o.title||"",8,14,9,"#ffd84a");
 if(o.t==="list"){const top=Math.max(0,o.sel-8);o.items.slice(top,top+10).forEach((x,i)=>{const k=top+i,y=26+i*10;if(k===o.sel)box(X,4,y-8,248,10,WH);tx(X,x,8,y,8.5,k===o.sel?"#000":WH)});tx(X,"main encoder: choose · press: ok · any mode button: cancel",8,124,6.5,GR)}
 else if(o.t==="kbd"){tx(X,o.val+(performance.now()%800<400?"_":""),8,60,16,WH);tx(X,"type on your keyboard · Enter = ok · Esc = cancel",8,110,7,GR)}
 reg(RR,0,0,256,128,"<b>"+(o.title||"Popup")+"</b>Turn the main encoder to choose, press it to confirm.")}
/* ---------- screen hover tips ---------- */
function bindScreens(){[[LCV,()=>LR],[RCV,()=>RR]].forEach(([cv,R])=>{const pt=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left)/r.width*LW,(e.clientY-r.top)/r.height*LH]};
 cv.addEventListener("pointermove",e=>{if(e.pointerType!=="mouse")return;const[x,y]=pt(e),h=R().slice().reverse().find(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h);h?tipHtml(h.tip,e):hideTip()});
 cv.addEventListener("pointerdown",e=>{const[x,y]=pt(e),h=R().slice().reverse().find(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h);if(h){tipHtml(h.tip,e);clearTimeout(tipTimer);tipTimer=setTimeout(hideTip,3000)}});
 cv.addEventListener("pointerleave",hideTip)})}
