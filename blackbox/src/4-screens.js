/* ================= touchscreen (320×240 canvas, drawn every frame, hit regions rebuilt each draw) ================= */
const W=320,H=240,PINK="#ff4fd8",BLUE="#1fc6f5",GRAY="#5b5b5b",DARK="#262626",RED="#ff3b3b",GREEN="#2bb24c",YEL="#ffd60a",BTN="#3a3a3a";
let cv,X,R=[];
const reg=(x,y,w,h,o)=>R.push({x,y,w,h,...o});
function box(x,y,w,h,c){X.fillStyle=c;X.fillRect(x,y,w,h)}
function fr(x,y,w,h,c,lw=1){X.strokeStyle=c;X.lineWidth=lw;X.strokeRect(x+lw/2,y+lw/2,w-lw,h-lw)}
function tx(s,x,y,c="#fff",sz=10,al="left",wt="bold"){X.fillStyle=c;X.font=`${wt} ${sz}px ui-monospace,Menlo,Consolas,monospace`;X.textAlign=al;X.textBaseline="middle";X.fillText(s,x,y)}
function btn(x,y,w,h,label,on,o,dis){box(x,y,w,h,on?BLUE:BTN);tx(label,x+w/2,y+h/2+.5,dis?"#777":"#fff",9,"center");if(!dis)reg(x,y,w,h,o)}
const lab2=n=>{const w=(n||"").split(/[\s_]+/);return[w[0].slice(0,5),w.slice(1).join(" ").slice(0,5)]};
const go=s=>{S.hist.push(S.scr);S.scr=s;S.ov=null;emit("scr:"+s)};
const tabs=(names,cur,set,tip)=>{const w=W/names.length;names.forEach((n,j)=>btn(j*w+1,222,w-2,17,n,n===cur,{down:()=>set(n),tip:tip||"Parameter pages: touch to switch."}))};
function gridIcon(x,y,sel,fn,tip){box(x,y,18,17,"#000");for(let k=0;k<16;k++)box(x+1+(k%4)*4,y+1+Math.floor(k/4)*4,3,3,k===sel?PINK:"#777");reg(x,y,18,17,{down:fn,tip})}
function modBar(x,y,used,h=12){[0,1,2].forEach(j=>box(x,y+j*(h/3),4,h/3-1,used[j]?BLUE:"#444"))}
function voiceProg(v){const now=AC?AC.currentTime:0;if(v.clip){const C=v.clip;return((C.anchorOff+(now-C.anchorT))%C.dur+C.dur)%C.dur/C.dur}
 if(isFinite(v.end)&&!v.rel)return clamp((now-v.t0)/(v.end-v.t0),0,1);return((now-v.t0)%2)/2}

/* ---------- generic parameter targets (pads, effects) ---------- */
function pdef(k){return k==="interp"&&MOD()?{n:"Fidelity",o:FIDELITY,d:"blackbox-mod: Normal, HighQ, then machine modes SP1200, SP-12, S950, MPC60, SP Raw (12-bit, drop-sample pitching, each with its output filter; SP Raw has none), then plain crunch 16k down to 2k (sample-rate hold + 12 bits). In a machine mode the Saturation knob becomes the converter input drive."}:PP[k]}
function padT(){const p=S.pads[S.pad];return{obj:p,defs:pdef,N:nSamp(p),slots:k=>pdef(k).mod?(p.mods[k]||(p.mods[k]=[["None",0],["None",0],["None",0]])):null,
 used:k=>((p.mods||{})[k]||[]).map(s=>s[0]!=="None"),changed:k=>{BC.clear();applyPad(S.pad);if(k==="lfoBeat"||k==="lfoRate"){}S.dirty=true;emit("param:"+k)},label:k=>pdef(k).n}}
function fxT(e){const o=S.fx[e];return{obj:o,defs:k=>FXP[k],N:1,slots:k=>FXP[k].mod?(S.fx.mods[e+"."+k]||(S.fx.mods[e+"."+k]=[["None",0],["None",0],["None",0]])):null,
 used:k=>((S.fx.mods||{})[e+"."+k]||[]).map(s=>s[0]!=="None"),changed:k=>{applyFX();if(e==="r")irDirty=true;S.dirty=true;emit("fxparam:"+k)},label:k=>FXP[k].n}}
function fmtv(T,k){const D=T.defs(k),v=T.obj[k];if(k==="lfoRate")return T.obj.lfoBeat==="On"?LFOB[Math.round(v/100*(LFOB.length-1))]+" bar":(.1*Math.pow(120,v/100)).toFixed(2)+"Hz";
 if(k==="dtime")return T.obj.beat==="On"?DLV[Math.round(v/100*(DLV.length-1))]:pct(v);if(D.o)return v;if(D.samp)return String(Math.round(v));return D.f?D.f(v):String(v)}
function frac(T,k){const D=T.defs(k),v=T.obj[k];return D.o?Math.max(0,D.o.indexOf(v))/(D.o.length-1):D.samp?v/T.N:(v-D.r[0])/(D.r[1]-D.r[0])}
function turnP(T,k,d){const D=T.defs(k),o=T.obj;
 if(D.o)o[k]=D.o[clamp(Math.max(0,D.o.indexOf(o[k]))+d,0,D.o.length-1)];
 else if(D.samp){const N=T.N;o[k]=clamp(Math.round(o[k]+d*Math.max(1,Math.round(N/400))),0,N);if(k==="start"||k==="len")o.len=clamp(o.len,0,N-o.start);if(k==="ls")o.ls=Math.min(o.ls,o.le);if(k==="le")o.le=Math.max(o.le,o.ls)}
 else{let hi=D.r[1];if(k==="slice")hi=o.slices.length+1;o[k]=clamp(Math.round((o[k]+d*D.st)*100)/100,D.r[0],hi)}
 T.changed(k)}
function knobArr(T,keys,sel,focus,onSel,y0=35){const cw=80,ch=keys.length>4?90:110;
 keys.forEach((k,j)=>{const c=j%4,r=Math.floor(j/4),x=c*cw,y=y0+r*ch,D=T.defs(k),cx=x+36,cy=y+ch/2;
  if(D.btn){const on=T.obj[k]!==D.o[0];btn(x+8,cy-12,64,24,D.n+(D.o.length>2||D.mod3?": "+T.obj[k]:""),on,{down:()=>{onSel(j);T.obj[k]=D.o[(D.o.indexOf(T.obj[k])+1)%D.o.length];T.changed(k)},tip:`${D.n}: ${D.d}`});if(j===sel)fr(x+6,cy-14,68,28,"#fff");return}
  tx(D.n,cx,y+12,"#ddd",9,"center");const f=frac(T,k),a0=Math.PI*.75,a1=Math.PI*2.25,bip=D.r&&D.r[0]<0;
  X.lineWidth=4;X.strokeStyle="#444";X.beginPath();X.arc(cx,cy,15,a0,a1);X.stroke();X.strokeStyle=BLUE;X.beginPath();const am=bip?(a0+a1)/2:a0,av=a0+(a1-a0)*f;X.arc(cx,cy,15,Math.min(am,av),Math.max(am,av));X.stroke();
  X.lineWidth=2;X.strokeStyle="#fff";X.beginPath();X.moveTo(cx,cy);X.lineTo(cx+Math.cos(av)*11,cy+Math.sin(av)*11);X.stroke();
  tx(fmtv(T,k),cx,y+ch-14,"#fff",9,"center");if(T.slots(k))modBar(x+66,cy-8,T.used(k),18);if(j===sel)fr(x+2,y+2,cw-4,ch-4,"#fff");
  reg(x,y,cw,ch,{down:(px,py,G)=>{onSel(j);G.acc=0},move:(px,py,G)=>{G.acc+=-(G.dy||0)-(G.dx||0)*.5;while(Math.abs(G.acc)>=5){const s=Math.sign(G.acc);G.acc-=s*5;turnP(T,k,s)}},
   tip:`<b>${D.n}</b> ${D.d}${T.slots(k)?"<div class='s'>Blue segments on the bar = modulation slots in use. Select it and push <em>INFO</em> to modulate.</div>":""}<div class='s'>Drag up/down on the screen, or turn the hardware knob in the same corner of the pink frame.</div>`})});
 if(focus!=null&&keys.length>4)fr(focus*160,y0-1,160,ch*2+2,PINK,2)}
function plist(T,keys,row,setRow,topKey,y0=35,h=185,rowH=18.5){const vis=Math.floor(h/rowH);let top=clamp(S[topKey]||0,row-vis+1,row);top=clamp(top,0,Math.max(0,keys.length-vis));S[topKey]=top;
 for(let j=top;j<Math.min(keys.length,top+vis);j++){const y=y0+(j-top)*rowH,k=keys[j],D=T.defs(k);if(j===row)box(0,y,W,rowH-1,PINK);
  tx(D.n,5,y+rowH/2,"#fff",10);tx(fmtv(T,k),300,y+rowH/2,"#fff",10,"right");if(T.slots(k))modBar(307,y+3,T.used(k));
  reg(0,y,W,rowH,{down:(px,py,G)=>{setRow(j);G.acc=0},move:(px,py,G)=>{G.acc+=-(G.dy||0);while(Math.abs(G.acc)>=6){const s=Math.sign(G.acc);G.acc-=s*6;turnP(T,k,s)}},tip:`<b>${D.n}</b> ${D.d}<div class='s'>Top knobs pick a row, bottom knobs change the value.${T.slots(k)?" Push <em>INFO</em> on a row with a bar to modulate it.":""}</div>`})}
 if(keys.length>vis){const sh=h*vis/keys.length;box(317,y0+h*top/keys.length,3,sh,"#888")}}
function simpleList(rows,row,setRow,topKey,y0=35,h=185,rowH=18.5){ // rows: [label, value, turn(d), tip]
 const vis=Math.floor(h/rowH);let top=clamp(S[topKey]||0,row-vis+1,row);top=clamp(top,0,Math.max(0,rows.length-vis));S[topKey]=top;
 for(let j=top;j<Math.min(rows.length,top+vis);j++){const y=y0+(j-top)*rowH,[l,v,turn,tip]=rows[j];if(j===row)box(0,y,W,rowH-1,PINK);tx(l,5,y+rowH/2,"#fff",10);tx(v,312,y+rowH/2,"#fff",10,"right");
  reg(0,y,W,rowH,{down:(px,py,G)=>{setRow(j);G.acc=0},move:(px,py,G)=>{G.acc+=-(G.dy||0);while(Math.abs(G.acc)>=6){const s=Math.sign(G.acc);G.acc-=s*6;turn&&turn(s)}},tip})}
 if(rows.length>vis){const sh=h*vis/rows.length;box(317,y0+h*top/rows.length,3,sh,"#888")}}

/* ---------- header (status bar) ---------- */
function header(){box(0,0,W,14,"#000");const bt=S.pos<0?String(Math.floor(S.pos)):S.playing?(Math.floor(S.pos/4)+1)+":"+(Math.floor(S.pos%4)+1):"1:1";
 tx(bt,3,7.5,S.pos<0?YEL:"#fff",10);reg(0,0,46,14,{tip:"<b>Clock</b> bar:beat of playback. During the record lead-in it counts up from −4."});
 const sc=S.scenes[S.scene],ctx=S.songMode?(sc?sc.name:"—"):"Seq "+(S.seq+1);tx((S.recording||S.srec?"● ":"")+ctx,150,7.5,S.recording||S.srec?RED:"#fff",10,"center");
 reg(60,0,180,14,{tip:"<b>Recording context</b> In Song mode the scene being played/recorded; otherwise the sequence your playing will be recorded into."});
 fr(262,2,56,10,"#fff");let pr=0;if(S.songMode&&S.song)pr=(S.pos-S.song.start)/(S.song.end-S.song.start);else{const sq=S.seqs[S.seq];if(sq.run){const L=patBeats(sq);pr=((S.pos-sq.start)%L+L)%L/L}}
 box(264,4,52*clamp(pr,0,1),6,BLUE);reg(262,0,58,14,{tip:"<b>Progress</b> through the current sequence (or scene in Song mode)."})}

/* ---------- pad bar used by the pad editors ---------- */
const MODECODE={sample:"SMP",clip:"CLP",slicer:"SLC",gran:"GRN"};
function padBar(extra){const p=S.pads[S.pad];
 gridIcon(2,16,S.pad,()=>S.ov={t:"pads",pick:i=>{S.pad=i;S.wz=null;if(!S.pads[i].w&&!S.pads[i].multi&&S.scr!=="load"){S.scr="load"}else if(S.scr==="load"&&(S.pads[i].w||S.pads[i].multi))S.scr="wave";S.ov=null}},"<b>Pad selector</b> Pick which pad to edit. The coloured square is the current pad.");
 const code=!p.w&&!p.multi?"REC":p.multi?"MLT":MODECODE[p.mode];box(22,16,26,17,"#000");fr(22,16,26,17,"#888");tx(code,35,25,"#fff",9,"center");
 reg(22,16,26,17,{down:()=>S.ov={t:"menu",x:22,y:34,w:110,items:[["Sample",()=>setPadMode(S.pad,"sample")],["Clip",()=>setPadMode(S.pad,"clip")],["Slicer",()=>setPadMode(S.pad,"slicer")],["Granular",()=>setPadMode(S.pad,"gran")],
  ["New Recording",()=>{setPadMode(S.pad,"new");S.scr="load"}],["New Multi",()=>toast("New Multi records a multi-sample bank via MIDI/CV (not simulated)",2500)]]},tip:"<b>Pad Mode selector</b> Sample, Clip, Slicer or Granular, or New Recording to clear the pad and record (p. 21–23)."});
 const nw=extra?212:244;box(50,16,nw,17,"#1b1b1b");tx((p.name||"(empty)").slice(0,Math.floor(nw/6.2)),54,25,"#fff",10);
 reg(50,16,nw,17,{down:()=>{S.browse.path=p.w?(LIB.get(p.w)||{f:""}).f:S.browse.path;S.browse.sel=0;go("browse")},tip:"<b>WAV selector</b> Touch to choose a different WAV file for this pad."});
 if(extra)extra(264);
 box(296,16,22,17,"#000");fr(296,16,22,17,"#888");tx("▶",307,25,"#fff",10,"center");reg(296,16,22,17,{down:()=>{play(S.pad,{});emit("pad")},up:()=>keyOff(S.pad),tip:"<b>Trigger button</b> Touch to play the pad."})}

/* ================= screens ================= */
const SCR={};
SCR.pads={t:"Pads screen",pg:"14, 21–22, 58",path:"PADS",
 d:"The 4×4 grid of pads. Touch a pad to play it; the pink pad is the selected one (it's what INFO, KEYS and the editors work on). A blue bar = playing, white bar = clip queued for the next bar, black bar = clip finishing after being toggled off.",
 k:()=>[["◀▶ pad","Move the pink selection left/right."],["◀▶ pad","Move the selection left/right."],["▲▼ pad","Move the selection up/down."],[S.padPanel==="vel"?"→ Clipboard":"→ Velocity","Swap the side panel: Velocity slider ↔ Cut/Copy/Paste/Clear."]],
 i:"Open the WAV (waveform) screen of the selected pad, or Load & Record if it's empty.",b:"—",
 draw(){const cw=64,ch=56.25;for(let i=0;i<16;i++){const x=(i%4)*cw,y=15+Math.floor(i/4)*ch;padCell(i,x,y,cw,ch);reg(x,y,cw,ch,{down:()=>padDown(i),up:()=>padUp(i),tip:()=>padTip(i)})}
  if(S.padPanel==="vel"){box(258,15,62,225,DARK);const h=221*S.vel/127;box(260,238-h,58,h,BLUE);tx("VEL",289,200,"#fff",11,"center");tx(String(S.vel),289,30,"#fff",10,"center");
   reg(258,15,62,225,{down:(x,y)=>{S.vel=clamp(Math.round((238-y)/221*127),1,127);emit("vel")},move:(x,y)=>{S.vel=clamp(Math.round((238-y)/221*127),1,127)},tip:"<b>Velocity slider</b> Sets how hard on-screen pad touches play (and what gets recorded). Velocity modulates Level by default."})}
  else["CUT","COPY","PSTE","CLR"].forEach((l,j)=>btn(259,16+j*56,60,54,l,false,{down:()=>clip(l),tip:{CUT:"Copy the selected pad (WAV + all parameters) and clear it.",COPY:"Copy the selected pad to the clipboard.",PSTE:"Paste the clipboard onto the selected pad.",CLR:"Clear the selected pad."}[l]}))},
 turn(k,d){if(k===3){S.padPanel=S.padPanel==="vel"?"clip":"vel";emit("panel");return}const c=S.pad%4,r=Math.floor(S.pad/4);S.pad=k<2?r*4+clamp(c+d,0,3):clamp(r+d,0,3)*4+c;emit("sel")},
 info(){go(S.pads[S.pad].w||S.pads[S.pad].multi?"wave":"load")}};
function padCell(i,x,y,w,h,o={}){const p=S.pads[i],fl=performance.now()-(S.flash["p"+i]||-1e9),on=fl>=0&&fl<90,loaded=p.w||p.multi;
 let bg=i===S.pad?PINK:loaded?(on?"#8d8d8d":GRAY):DARK;
 if(o.mute){bg=p.mute?RED:GREEN}if(o.solo)bg=p.solo?YEL:loaded?GRAY:DARK;if(o.mute||o.solo){box(x+1,y+1,w-2,h-2,bg);if(i===S.pad)fr(x+1,y+1,w-2,h-2,PINK,2)}else box(x+1,y+1,w-2,h-2,bg);
 const[a,b]=lab2(p.name||"");if(!o.mix){tx(a,x+w/2,y+h/2-(b?7:0)-(o.fx?3:0),o.solo&&p.solo?"#000":"#fff",11,"center");if(b)tx(b,x+w/2,y+h/2+7-(o.fx?3:0),o.solo&&p.solo?"#000":"#fff",11,"center")}
 const vs=S.voices.filter(v=>v.pad===i&&!(v.rel&&!v.clip));
 if(S.armed.has(i)||S.clipQ.some(c=>c.i===i))box(x+5,y+h-8,w-10,4,"#fff");
 else if(vs.length){const v=vs[vs.length-1];if(v.stopAt!=null)box(x+5,y+h-8,w-10,4,"#000");else box(x+5,y+h-8,(w-10)*voiceProg(v),4,BLUE)}}
function padTip(i){const p=S.pads[i];if(!p.w&&!p.multi)return`<b>Pad ${i+1}: empty</b> Select it and push INFO to load a WAV or record one.`;
 return`<b>Pad ${i+1}: ${p.name}</b> ${p.multi?"Multi-sample":{sample:"Sample",clip:"Clip",slicer:"Slicer",gran:"Granular"}[p.mode]} pad, ${p.launch} launch.${p.mode==="clip"?" Clips only run while the clock plays: before PLAY a touch arms it (white bar).":""}<div class='s'>Touch to play · pink = selected · blue bar = playing</div>`}
function padDown(i){S.pad=i;S.wz=null;play(i,{});recHit("pad",i,null,S.vel/127);emit("pad");emit("pad:"+i)}
function padUp(i){const p=S.pads[i];if(p.mode==="clip"&&p.launch==="Gate"){const v=S.voices.find(v=>v.pad===i&&v.clip);if(v&&S.playing)v.stopAt=nextQ(QB[p.quant]||1e-9,S.pos)}else keyOff(i)}
let CLIP=null;
function clip(op){const i=S.pad;if(op==="COPY"||op==="CUT")CLIP=JSON.parse(JSON.stringify(S.pads[i]));if(op==="PSTE"&&CLIP){S.pads[i]=JSON.parse(JSON.stringify(CLIP));toast("Pasted")}
 if(op==="CUT"||op==="CLR"){S.pads[i]=newPad();S.voices.filter(v=>v.pad===i).forEach(v=>kill(v))}applyPad(i);emit("clip:"+op)}

SCR.wave={t:"Waveform screen",pg:"23–24, 43–44, 57",path:"PADS → INFO",
 d:"Top: the whole file (blue box = the part shown below). Below: the zoomable detail. The pink bracket is Start + Length (what plays); the white bracket is Loop Start → Loop End. Slicer pads show their slice points as pink lines. Wheel to zoom, drag to scroll.",
 k:()=>{const p=S.pads[S.pad],m=MOD();if(p.mode==="slicer")return[["Scroll","Move the waveform under the fixed cursor (for Split / Join)."],["Zoom","Zoom the detail view."],m?["Slice start","blackbox-mod: move the start of the current slice."]:["—",""],m?["Slice end","blackbox-mod: move the end of the current slice."]:["—",""]];
  if(p.mode==="clip"||p.multi)return[["Scroll","Scroll the detail view."],["Zoom","Zoom the detail view."],["—",""],["—",""]];
  return[["Start","Sample where playback begins (pink bracket, left edge)."],["Length","How much plays after Start (pink bracket)."],["Loop Start","Start of the loop (white bracket)."],["Loop End","End of the loop (white bracket)."]]},
 i:"Open the pad's parameter pages.",b:"Back to the previous screen.",
 draw(){const p=S.pads[S.pad];padBar(p.mode==="slicer"&&!p.multi?x=>{box(x,16,30,17,S.slMenu?BLUE:BTN);tx("...",x+15,24,"#fff",10,"center");reg(x,16,30,17,{down:()=>{S.slMenu=!S.slMenu;if(S.slMenu)S.ov={t:"menu",x:186,y:34,w:110,items:[["Split",slSplit],["Join",slJoin],["Scan",()=>S.ov={t:"val",title:"Scan threshold",v:50,min:0,max:100,unit:"%",ok:v=>{p.slices=scanSlices(B(p.w),v);toast(p.slices.length+1+" slices")}}],["Grid",()=>S.ov={t:"val",title:"Slices",v:8,min:2,max:64,unit:"",ok:v=>{p.slices=gridSlices(B(p.w),v);emit("grid")}}],["Close",()=>{S.slMenu=false}]],keep:1};emit("slmenu")},tip:"<b>Waveform Slicing menu</b> Split, Join, Scan (auto-detect) or Grid (even slices)."})}:null);
  const buf=B(p.w);if(!buf){tx("WAV file not found",160,120,"#aaa",11,"center");return}
  const N=buf.length;let[a,b]=p._wz||[0,N];a=clamp(a,0,N-16);b=clamp(b,a+16,N);p._wz=[a,b];
  box(2,35,316,20,"#111");drawWave(buf,0,N,2,35,316,20,"#ddd");fr(2+316*a/N,35,Math.max(3,316*(b-a)/N),20,BLUE);
  reg(2,35,316,20,{down:(x)=>{const c=(x-2)/316*N,h=(b-a)/2;p._wz=[clamp(c-h,0,N-2*h),clamp(c-h,0,N-2*h)+2*h]},tip:"<b>WAV overview</b> The whole file. The blue box is the part shown below; touch to jump there."});
  const y0=58,hh=158,xs=s=>2+(s-a)/(b-a)*316;box(2,y0,316,hh,"#0b0b0b");
  if(p.mode==="sample"||p.mode==="gran"){const s0=xs(p.start),s1=xs(p.start+p.len);X.fillStyle="rgba(255,79,216,.13)";X.fillRect(s0,y0,s1-s0,hh)}
  drawWave(buf,a,b,2,y0+12,316,hh-24,"#fff");
  if(p.mode==="sample"||p.mode==="gran"){const s0=xs(p.start),s1=xs(p.start+p.len),l0=xs(p.ls),l1=xs(p.le);X.strokeStyle=PINK;X.lineWidth=2;X.beginPath();X.moveTo(s0,y0+10);X.lineTo(s0,y0+2);X.lineTo(s1,y0+2);X.lineTo(s1,y0+10);X.stroke();
   X.strokeStyle=p.loopMode==="None"?"#777":"#fff";X.beginPath();X.moveTo(l0,y0+hh-10);X.lineTo(l0,y0+hh-2);X.lineTo(l1,y0+hh-2);X.lineTo(l1,y0+hh-10);X.stroke();
   tx("St "+Math.round(p.start),6,y0+18,PINK,9);tx("Len "+Math.round(p.len),314,y0+18,PINK,9,"right");tx("LpS "+Math.round(p.ls),6,y0+hh-16,"#fff",9);tx("LpE "+Math.round(p.le),314,y0+hh-16,"#fff",9,"right")}
  if((p.mode==="slicer"||p.mode==="clip")&&p.slices.length){const P=[...p.slices].sort((x,y)=>x-y),cur=p.slice-1;P.forEach(s=>{const x=xs(s);if(x<2||x>318)return;box(x,y0,1.5,hh,PINK);box(x-3,y0+hh-12,7,7,PINK)});
   if(p.mode==="slicer"){const B2=[0,...P,N],s0=xs(B2[cur]),s1=xs(B2[cur+1]??N);X.fillStyle="rgba(31,198,245,.15)";X.fillRect(s0,y0,s1-s0,hh);tx("Slice "+p.slice+"/"+(P.length+1),6,y0+18,BLUE,9)}}
  if(p.mode==="clip")tx(`${clipBeats(p)} beats · Quant ${p.quant} · Sync ${p.sync}`,6,y0+hh-16,"#fff",9);
  if(S.slMenu&&p.mode==="slicer"){box(160,y0,1.5,hh,"#fff")}
  S.voices.filter(v=>v.pad===S.pad&&!v.rel).forEach(v=>{const now=AC.currentTime,el=Math.max(0,now-v.t0);let pos=null;
   if(v.clip)pos=((v.clip.anchorOff+(now-v.clip.anchorT))%v.clip.dur)*buf.sampleRate;else if(v.sl)pos=v.sl[0]+el*buf.sampleRate*(v.srcs[0]?.playbackRate.value||1);else if(p.mode==="sample"&&!p.multi&&p.rev!=="ON"){const r=v.srcs[0]?.playbackRate.value||1;pos=p.start+el*buf.sampleRate*r;if(p.loopMode==="Forward"&&pos>p.le&&p.le>p.ls)pos=p.ls+(pos-p.ls)%(p.le-p.ls)}
   if(pos!=null&&pos<N){const x=xs(pos);if(x>=2&&x<=318)box(x,y0,1,hh,YEL)}});
  reg(2,y0,316,hh,{down:(x,y,G)=>{G.a=a;G.b=b},move:(x,y,G)=>{const d=-(G.tx||0)/316*(G.b-G.a);const na=clamp(G.a+d,0,N-(G.b-G.a));p._wz=[na,na+(G.b-G.a)]},
   wheel:(x,y,dy)=>{const c=a+(x-2)/316*(b-a),f=dy>0?1.25:.8,nl=clamp((b-a)*f,64,N);let na=clamp(c-(c-a)*f,0,N-nl);p._wz=[na,na+nl]},
   tip:"<b>Detailed WAV view</b> Wheel = zoom (pinch on the device), drag = scroll. Pink bracket = Start/Length, white bracket = loop points."+(p.mode==="slicer"?" Pink lines = slice points; the blue band is the current slice.":"")})},
 turn(k,d){const p=S.pads[S.pad],buf=B(p.w);if(!buf)return;const N=buf.length,[a,b]=p._wz||[0,N],st=Math.max(1,Math.round((b-a)/150));
  const zoom=()=>{const c=(a+b)/2,nl=clamp((b-a)*(d>0?.8:1.25),64,N),na=clamp(c-nl/2,0,N-nl);p._wz=[na,na+nl]},scroll=()=>{const na=clamp(a+d*st*4,0,N-(b-a));p._wz=[na,na+(b-a)]};
  if(p.mode==="slicer"){if(k===0&&MOD()){p.slice=clamp((p.slice||1)+d,1,p.slices.length+1);emit("slice:sel")}else if(k===0)scroll();else if(k===1){zoom();if(MOD())emit("slice:zoom")}else if(MOD()){const P=[...p.slices].sort((x,y)=>x-y),c=p.slice-1,j=k===2?c-1:c;if(j<0||j>=P.length)return;P[j]=clamp(P[j]+d*st,(P[j-1]??0)+64,(P[j+1]??N)-64);p.slices=P;emit(k===2?"slice:start":"slice:end")}return}
  if(p.mode==="clip"||p.multi){if(k===0)scroll();else if(k===1)zoom();return}
  const key=["start","len","ls","le"][k];p[key]=clamp(Math.round(p[key]+d*st),0,N);if(key==="start"||key==="len")p.len=clamp(p.len,0,N-p.start);if(key==="ls")p.ls=Math.min(p.ls,p.le);if(key==="le")p.le=Math.max(p.le,p.ls);BC.clear();emit("knob:wave")},
 info(){S.slMenu=false;go("params")}};
function slSplit(){const p=S.pads[S.pad],[a,b]=p._wz,c=Math.round((a+b)/2);if(!p.slices.some(s=>Math.abs(s-c)<64))p.slices.push(c);S.ov=null;S.slMenu=true;emit("split")}
function slJoin(){const p=S.pads[S.pad],[a,b]=p._wz,c=(a+b)/2;let best=-1,bd=(b-a)/8;p.slices.forEach((s,j)=>{if(Math.abs(s-c)<bd){bd=Math.abs(s-c);best=j}});if(best>=0)p.slices.splice(best,1);else toast("Move a slice line under the cursor");S.ov=null;S.slMenu=true}
const PK=new Map();
function drawWave(buf,a,b,x,y,w,h,col){a=Math.floor(a);b=Math.floor(b);const key=buf.length+"|"+a+"|"+b+"|"+w+"|"+(buf._v||0);let pk=PK.get(key);
 if(!pk){const d=buf.getChannelData(0),st=(b-a)/w;pk=new Float32Array(w*2);for(let k=0;k<w;k++){let mn=0,mx=0;const s=Math.floor(a+k*st),e=Math.min(d.length,Math.floor(a+(k+1)*st)+1),j0=Math.max(1,Math.floor((e-s)/96));for(let j=s;j<e;j+=j0){const v=d[j];if(v<mn)mn=v;if(v>mx)mx=v}pk[2*k]=mn;pk[2*k+1]=mx}if(PK.size>24)PK.clear();PK.set(key,pk)}
 X.fillStyle=col;for(let k=0;k<w;k++){const mn=pk[2*k],mx=pk[2*k+1];X.fillRect(x+k,y+h/2-mx*h/2,1,Math.max(1,(mx-mn)*h/2))}}

SCR.params={t:"Pad parameters",pg:"25–45",path:"PADS → INFO → INFO",
 d:"Pages along the bottom: Main (level, pitch, filter, envelope), Pos (mode-specific: loop, start/length, clip sync, slices, grains), LFO and Conf (launch mode, output, pan, polyphony, choke group, MIDI). Knob pages use the pink focus frame; list pages use top knobs to pick a row and bottom knobs for the value.",
 k:()=>S.ptab==="Main"?[0,1,2,3].map(j=>{const kk=MAINK[(j<2?0:4)+S.pfocus*2+(j%2)];return[PP[kk].n,"Adjust "+PP[kk].n+" (inside the pink focus frame)."]})
  :[["▲▼ row","Select a parameter row."],["▲▼ row","Select a parameter row."],["Value","Change the selected value."],["Value","Change the selected value."]],
 i:"With a modulatable parameter selected: open its Modulation screen. Otherwise back to the waveform.",b:"Back.",
 keys(){const p=S.pads[S.pad];return S.ptab==="Main"?MAINK:S.ptab==="Pos"?posKeys(p):S.ptab==="LFO"?LFOK:confKeys(p)},
 draw(){padBar();const p=S.pads[S.pad],T=padT(),tb=padTabs(p);if(!tb.includes(S.ptab))S.ptab="Main";const keys=this.keys();
  if(S.ptab==="Main")knobArr(T,keys,S.psel,S.pfocus,j=>{S.psel=j;S.pfocus=Math.floor((j%4)/2);emit("knob:param")},35);else{S.prow=clamp(S.prow,0,keys.length-1);plist(T,keys,S.prow,j=>S.prow=j,"ptop")}
  tabs(tb,S.ptab,n=>{S.ptab=n;S.prow=0;S.ptop=0;emit("tab:"+n)})},
 turn(k,d){const T=padT(),keys=this.keys();if(S.ptab==="Main"){const j=(k<2?0:4)+S.pfocus*2+(k%2);S.psel=j;turnP(T,keys[j],d)}else if(k<2){S.prow=clamp(S.prow+d,0,keys.length-1)}else turnP(T,keys[S.prow],d);emit("knob:param")},
 info(){const keys=this.keys(),k=S.ptab==="Main"?keys[S.psel]:keys[S.prow];if(pdef(k).mod){S.modKey=k;S.modFx=null;S.modRow=0;go("mod")}else go("wave")}};

SCR.mod={t:"Modulation parameters",pg:"26, 83, 98–100",path:"… parameter → INFO",
 d:"Three modulation slots, each a Source and an Amount (−100…+100%). Sources: the pad's LFO, VEL (velocity), MIDI pitch bend (PTCH), mod wheel (MODW), volume (MVOL), pan (MPAN), or any MIDI CC via Learn. A source with 0% amount does nothing.",
 k:()=>[["▲▼ row","Select Source or Amount row."],["▲▼ row","Select a row."],["Value","Change the source or amount."],["Value","Change the source or amount."]],
 i:"—",b:"Back to the parameter page.",
 tgt(){return S.modFx?fxT(S.modFx):padT()},
 draw(){const T=this.tgt(),k=S.modKey,sl=T.slots(k);box(0,15,W,19,"#111");tx("MOD: "+T.label(k),5,25,"#fff",10);btn(250,16,66,17,"Learn",S.learn,{down:()=>{S.learn=!S.learn;emit("learn")},tip:"<b>Learn</b> Select a Source row, touch Learn, then move a control on your MIDI controller: the slot becomes that CC."});
  const srcs=[...MODSRC,...(MOD()?MODSRC_MOD:[])],rows=[];
  sl.forEach((s,j)=>{const opts=s[0].startsWith("CC")?[...srcs,s[0]]:srcs;rows.push(["Source "+(j+1),s[0],d=>{s[0]=opts[clamp(opts.indexOf(s[0])+d,0,opts.length-1)];T.changed(k);emit("modsrc")},MODSRC_MOD.includes(s[0])?"<b>blackbox-mod ducker source</b> Fires when pad 1 plays. Use a negative amount on Level for sidechain pumping (≈0.65 dB per 1%).":"<b>Source</b> What moves this parameter."]);
   rows.push(["Amount",(s[1]>0?"+":"")+s[1].toFixed(1)+"%",d=>{s[1]=clamp(s[1]+d,-100,100);T.changed(k);emit("modamt")},"<b>Amount</b> How far the source moves the parameter; negative inverts it."])});
  S.modRow=clamp(S.modRow,0,5);simpleList(rows,S.modRow,j=>S.modRow=j,"modTop",36,185,24);this._rows=rows},
 turn(k,d){if(k<2)S.modRow=clamp(S.modRow+d,0,5);else this._rows&&this._rows[S.modRow][2](d)}};

SCR.load={t:"Load and Record screen",pg:"22, 46–50",path:"PADS → (empty pad) INFO",
 d:"Shown for an empty pad. Touch Load to pick a WAV file, or record a new one: set the recording parameters, then REC + PLAY. Rec Input L+R/Left/Right records the audio input (your microphone here); Resam records what's playing on Out 1, effects included.",
 k:()=>[["▲▼ row","Select a recording parameter."],["▲▼ row","Select a recording parameter."],["Value","Change the value."],["Value","Change the value."]],
 i:"—",b:"Back.",
 draw(){const rp=S.recp;gridIcon(2,16,S.pad,()=>S.ov={t:"pads",pick:i=>{S.pad=i;S.ov=null;if(S.pads[i].w||S.pads[i].multi)S.scr="wave"}},"<b>Pad selector</b>");
  btn(22,16,40,17,"1x ▾",false,{down:()=>S.ov={t:"menu",x:22,y:34,w:150,items:[["1x  single WAV",()=>{}],["MX  multi-sample (MIDI/CV)",()=>toast("Automated multi-sample recording isn't simulated",2500)]]},tip:"<b>Recording mode</b> 1x records one WAV. MX automates recording a multi-sample bank via MIDI or CV."});
  btn(64,16,52,17,"Load",false,{down:()=>{S.browse.sel=0;go("browse")},tip:"<b>Load</b> Pick a WAV file (or a folder for a multi-sample)."});
  const st=S.srec?(S.srec.at!=null||REC&&REC.wait?"waiting…":"REC "+(REC?(REC.len/AC.sampleRate).toFixed(1):"0.0")+"s"):S.recArm?"armed: press PLAY":"REC + PLAY to record";tx(st,312,25,S.srec?RED:S.recArm?YEL:"#aaa",9,"right");
  let pk=REC?REC.peak:[0,0];if(!REC&&rp.recIn==="Resam"&&M){const d=new Float32Array(M.an.fftSize);M.an.getFloatTimeDomainData(d);let m=0;d.forEach(v=>m=Math.max(m,Math.abs(v)));pk=[m,m]}
  [0,1].forEach(c=>{const db=20*Math.log10(pk[c]+1e-6),f=clamp((db+60)/60,0,1);box(4,37+c*8,280,6,"#222");box(4,37+c*8,280*f*dbg(rp.gain)**.2,6,db>-1?RED:GREEN);tx(c?"R":"L",290,40+c*8,"#aaa",8)});
  reg(0,35,W,17,{tip:"<b>Level meters</b> Input level (they move once the input is open: arm REC or start recording). Red = clipping."});
  const rows=RECP.map(([k,n,o,f])=>[n,f?f(rp[k]):rp[k],d=>{if(Array.isArray(o)&&typeof o[0]==="string")rp[k]=o[clamp(o.indexOf(rp[k])+d,0,o.length-1)];else rp[k]=clamp(rp[k]+d*o[2],o[0],o[1]);if(k==="gain"&&REC)REC.g.gain.value=dbg(rp.gain);if(k==="recIn")recDispose()},RECTIP[k]]);
  S.recRow=clamp(S.recRow,0,rows.length-1);simpleList(rows,S.recRow,j=>S.recRow=j,"recTop",55,185,18.5);this._rows=rows},
 turn(k,d){if(k<2)S.recRow=clamp(S.recRow+d,0,RECP.length-1);else this._rows[S.recRow][2](d)}};
const RECTIP={recIn:"<b>Rec Input</b> L+R, Left or Right of the audio input, or Resam to record Out 1.",gain:"<b>Gain</b> Input gain; leave a few dB below 0.",recToPlay:"<b>RecToPlay</b> Play the new sample when a timed recording ends.",
 length:"<b>Length</b> Custom = until you press STOP; otherwise stops after this many bars.",recQuant:"<b>Rec Quant</b> Start/stop on the next boundary of this size.",recMon:"<b>Rec Mon</b> Hear the input while recording (Auto) or always (On).",
 monOut:"<b>Mon Output</b> Where the monitored input plays.",recThresh:"<b>RecThresh</b> Wait for the input to reach Threshold before recording.",thresh:"<b>Threshold</b> Level that starts a threshold recording."};

SCR.browse={t:"WAV file selection",pg:"22–23, 35, 57–61",path:"WAV screen → touch file name",
 d:"Folders (shown as \\Name) come first, then files. Turn a knob to scroll, touch Load to open a folder or assign a file to the pad. Play turns on auto-preview. File → Load All loads every WAV in the folder as a multi-sample; Trim, Save As, Rename and Delete manage files.",
 k:()=>[["Scroll","Move the blue highlight."],["Scroll","Move the blue highlight."],["Scroll","Move the blue highlight."],["Scroll","Move the blue highlight."]],
 i:"—",b:"Back without loading.",
 items(){const p=S.browse.path,sub=new Set(),files=[];LIB.forEach(e=>{if(e.f===p)files.push(e);else if(p===""||e.f.startsWith(p+"\\")){const rest=p===""?e.f:e.f.slice(p.length+1);sub.add(rest.split("\\")[0])}});
  return[...[...sub].sort().map(n=>({dir:1,n,path:p?p+"\\"+n:n})),...files.sort((a,b)=>a.n.localeCompare(b.n)).map(e=>({n:e.n,id:e.id}))]},
 draw(){const it=this.items(),bs=S.browse;bs.sel=clamp(bs.sel,0,Math.max(0,it.length-1));
  btn(2,16,22,17,"←",false,{down:()=>back(),tip:"Back to the previous screen."});btn(26,16,18,17,"^",false,{down:()=>{const p=bs.path.split("\\");p.pop();bs.path=p.join("\\");bs.sel=0},tip:"<b>Caret</b> Up one folder."});
  tx("\\"+bs.path,48,25,"#ccc",9);btn(176,16,40,17,"Play",bs.prev,{down:()=>{bs.prev=!bs.prev;emit("preview")},tip:"<b>Play</b> Auto-preview: each file plays once as you stop on it."});
  btn(218,16,46,17,"File",false,{down:()=>fileMenu(it[bs.sel]),tip:"<b>File</b> Load All, Save As, Rename, Delete, Trim."});btn(266,16,52,17,"Load",false,{down:()=>browseLoad(it[bs.sel]),tip:"<b>Load</b> Open the folder, or put the file on the pad."});
  const vis=11,top=clamp(bs.top,bs.sel-vis+1,bs.sel);bs.top=Math.max(0,top);
  it.slice(bs.top,bs.top+vis).forEach((e,j)=>{const k=bs.top+j,y=36+j*18.5;if(k===bs.sel)box(0,y,W,18,"#1d7fb0");tx((e.dir?"\\":"")+e.n,6,y+9.5,"#fff",10);if(e.id&&LIB.get(e.id).user)tx("user",312,y+9.5,"#9cf",8,"right");
   reg(0,y,W,18,{down:()=>{if(bs.sel===k&&e.dir)browseLoad(e);bs.sel=k;bs.prevT=performance.now()},tip:e.dir?"<b>Folder</b> Touch again or Load to open it.":"<b>WAV file</b> Load assigns it to the pad."})});
  if(!it.length)tx("(empty folder)",160,120,"#888",10,"center")},
 turn(k,d){const bs=S.browse;bs.sel=Math.max(0,bs.sel+d);bs.prevT=performance.now();emit("knob:browse")}};
function browseLoad(e){if(!e)return;const bs=S.browse;if(e.dir){bs.path=e.path;bs.sel=0;bs.top=0;return}
 const p=S.pads[S.pad],was=!!(p.w||p.multi);loadWav(S.pad,e.id);S.hist.pop();S.hist.push("pads");S.scr="wave";if(!was)S.hist=["pads"];emit("load")}
function fileMenu(e){const bs=S.browse,ent=e&&e.id&&LIB.get(e.id);S.ov={t:"menu",x:150,y:34,w:120,items:[
 ["Load All",()=>{loadAll(S.pad,bs.path);S.scr="wave";toast("Loaded folder as multi-sample")},!bs.path],
 ["Save As",()=>ent&&kbd("Save As",ent.n+" 2",n=>{const id=ent.f+"\\"+n;LIB.set(id,{...ent,id,n,user:1});toast("Saved "+n)}),!ent],
 ["Rename",()=>ent&&(ent.user?kbd("Rename",ent.n,n=>{LIB.delete(ent.id);const id=ent.f+"\\"+n;LIB.set(id,{...ent,id,n});S.pads.forEach(p=>{if(p.w===ent.id)p.w=id})}):toast("Factory files are read-only here")),!ent],
 ["Delete",()=>ent&&(ent.user?S.ov={t:"confirm",msg:"Delete "+ent.n+"?",ok:()=>LIB.delete(ent.id)}:toast("Factory files are read-only here")),!ent],
 ["Trim",()=>{const p=S.pads[S.pad];if(!ent||p.w!==ent.id){toast("Select the pad's own file to trim");return}S.ov={t:"confirm",msg:"Trim and Save?",ok:()=>trimPad(S.pad)}},!ent]]}}
function trimPad(i){const p=S.pads[i],e=LIB.get(p.w),b=e.buf,a=Math.round(p.start),n=Math.max(64,Math.round(p.len)),nb=new AudioBuffer({numberOfChannels:b.numberOfChannels,length:n,sampleRate:b.sampleRate});
 for(let c=0;c<b.numberOfChannels;c++)nb.copyToChannel(b.getChannelData(c).subarray(a,a+n),c);e.buf=nb;e.user=1;Object.assign(p,{start:0,len:n,ls:0,le:n});BC.clear();PK.clear();toast("Trimmed (destructive)")}

/* ---------- KEYS ---------- */
const keysPad=()=>{const k=S.keys;if(k.seq){const sq=S.seqs[S.seq];return sq.mode==="keys"?sq.pad:null}return S.pad};
function chordify(n){const c=MOD()?CHORDS[S.keys.chord]:null;if(!c)return[n];if(Array.isArray(c))return c.map(i=>n+i);
 const sc=SCALES[S.keys.scale],r=S.keys.root,rel=((n-r)%12+12)%12;let deg=sc.length<12?sc.indexOf(rel):-1;const s2=deg<0?SCALES.Major:sc,r2=deg<0?0:rel;if(deg<0)deg=0;
 return[...c.slice(1)].map(ch=>{const k=deg+ +ch,o=Math.floor(k/s2.length);return n-r2+s2[k%s2.length]+12*o})}
function keyOn(n,src="key"){const ns=chordify(n);S.keys.held.set(n,ns);const i=keysPad(),sq=S.seqs[S.seq];
 ns.forEach(m=>{if(S.keys.seq&&sq.mode==="midi"){if(MIDIO.length&&sq.midiOut!=="None")midiNote(sq.midiOut,m,S.vel/127,AC?AC.currentTime:0,.3);else vsynth(m,0,.3,S.vel/127);recHit("key",null,m,S.vel/127)}
  else if(i!=null){play(i,{note:m,key:m,vel:S.vel/127});recHit("key",i,m,S.vel/127)}});emit("keys:note")}
function keyUp(n){const ns=S.keys.held.get(n)||[n];S.keys.held.delete(n);const i=keysPad();ns.forEach(m=>{if(i!=null)keyOff(i,m);recRelease(m)})}
SCR.keys={get t(){return S.keys.grid?"Keys: grid keyboard":"Keys: piano keyboard"},pg:"15, 62–65",path:"KEYS (push again for the grid)",
 get d(){return S.keys.grid?"Four octaves of the chosen scale, so you can't hit a wrong note. Root and Scale buttons at the top right; any knob also changes the root. A Slicer pad shows numbered slices instead.":"Plays the selected pad chromatically: C4 plays the sample at its own pitch (or its Root Note). Slicer pads map slices to keys from C2 up. The arrows (or knobs) move by a note or an octave; C keys show their octave."},
 k:()=>S.keys.grid?Array(4).fill(["Root","Change the root note of the grid scale."]):[["± note","Scroll the keyboard by one note."],MOD()?["Chord","blackbox-mod: pick a chord shape (Tri, 7th, 9th, Su2…). In-scale shapes follow the grid's Scale/Root."]:["± octave","Scroll by one octave."],["± note","Scroll by one note."],["± octave","Scroll by one octave."]],
 i:"—",b:"Back.",
 draw(){const k=S.keys,i=keysPad(),p=i!=null?S.pads[i]:null;
  gridIcon(2,16,i??-1,()=>S.ov={t:"pads",seq:true,pick:j=>{k.seq=false;S.pad=j;S.ov=null},pickSeq:()=>{k.seq=true;S.ov=null;emit("keys:seq")}},"<b>Pad selector</b> Choose which pad the keys play, or SEQ to play into the selected sequence.");
  const lbl=k.seq?"SEQ "+(S.seq+1)+(S.seqs[S.seq].mode==="midi"?" MIDI":""):p?p.name:"";
  if(!k.grid){[["<<",-12],["<",-1],[">",1],[">>",12]].forEach(([l,d],j)=>btn(22+j*24,16,22,17,l,false,{down:()=>shiftKeys(d),tip:"Scroll the keyboard by "+(Math.abs(d)===12?"an octave.":"a note.")}));tx(lbl.slice(0,20),122,25,"#fff",10);
   if(MOD())btn(258,16,60,17,"♪ "+k.chord,k.chord!=="Off",{down:()=>{const o=Object.keys(CHORDS);k.chord=o[(o.indexOf(k.chord)+1)%o.length]},tip:"<b>Chord (blackbox-mod)</b> Each key plays a chord shape; chords record into sequences."});
   drawPiano(p)}
  else{btn(22,16,22,17,"<",false,{down:()=>{k.goct=clamp(k.goct-1,0,6)},tip:"Octave down."});btn(46,16,22,17,">",false,{down:()=>{k.goct=clamp(k.goct+1,0,6)},tip:"Octave up."});
   if(p&&p.mode==="slicer"){btn(176,16,70,17,"STOP",false,{down:()=>S.voices.filter(v=>v.pad===i).forEach(v=>kill(v)),tip:"Stop all slices."});btn(248,16,70,17,"SLICE",false,{tip:"Just a reminder that this is a slicer pad (it does nothing)."});drawSliceGrid(p,i)}
   else{tx(lbl.slice(0,14),72,25,"#fff",10);btn(206,16,34,17,NN[k.root],false,{down:()=>S.ov={t:"list",title:"Root",items:NN,sel:k.root,pick:j=>{k.root=j;emit("keys:root")}},tip:"<b>Root</b> Key of the grid."});
    btn(242,16,76,17,k.scale,false,{down:()=>S.ov={t:"list",title:"Scale",items:Object.keys(SCALES),sel:Object.keys(SCALES).indexOf(k.scale),pick:j=>{k.scale=Object.keys(SCALES)[j];emit("keys:scale")}},tip:"<b>Scale</b> Scale or mode of the grid."});drawGrid()}}},
 turn(kk,d){const k=S.keys;if(k.grid){k.root=(k.root+d+12)%12;emit("keys:root");return}if(kk===1&&MOD()){const o=Object.keys(CHORDS);k.chord=o[clamp(o.indexOf(k.chord)+d,0,o.length-1)];emit("keys:chord");return}shiftKeys(kk%2?d*12:d)}};
function shiftKeys(d){const k=S.keys;let b=k.base+d;if(Math.abs(d)===1)while([1,3,6,8,10].includes(((b%12)+12)%12))b+=d;k.base=clamp(b,12,96)}
function whiteKeys(){const out=[];let n=S.keys.base;while(out.length<15){if(![1,3,6,8,10].includes(n%12))out.push(n);n++}return out}
function drawPiano(p){const wk=whiteKeys(),kw=W/15,y0=35,h=205,held=new Set([...S.keys.held.values()].flat()),blacks=[];
 wk.forEach((n,j)=>{const x=j*kw;box(x+.5,y0,kw-1,h,held.has(n)?BLUE:"#eee");if(n%12===0)tx("C"+(n/12-1),x+kw/2,y0+h-10,"#333",9,"center");if([0,2,5,7,9].includes(n%12)&&j<14)blacks.push([n+1,x+kw*.62])});
 blacks.forEach(([n,x])=>box(x,y0,kw*.76,h*.58,held.has(n)?BLUE:"#111"));
 const noteAt=(x,y)=>{if(y<y0+h*.58)for(const[n,bx]of blacks)if(x>=bx&&x<bx+kw*.76)return n;return wk[clamp(Math.floor(x/kw),0,14)]};
 reg(0,y0,W,h,{down:(x,y,G)=>{G.n=noteAt(x,y);keyOn(G.n)},move:(x,y,G)=>{const n=noteAt(x,y);if(n!==G.n){keyUp(G.n);G.n=n;keyOn(n)}},up:(x,y,G)=>keyUp(G.n),
  tip:p&&p.mode==="slicer"?"<b>Keyboard</b> C2 plays slice 1, C#2 slice 2… Notes below C2 are silent; above the last slice repeat it.":"<b>Keyboard</b> Touch or slide to play. C4 plays the sample at its root pitch."})}
function gridNote(c,r){const k=S.keys,sc=SCALES[k.scale],L=sc.length;return 12*(k.goct+1+r+Math.floor(c/L))+k.root+sc[c%L]+12}
function drawGrid(){const cw=40,ch=51.25,held=new Set([...S.keys.held.values()].flat());for(let r=0;r<4;r++)for(let c=0;c<8;c++){const n=gridNote(c,3-r),x=c*cw,y=35+r*ch,root=((n-S.keys.root)%12+12)%12===0;
 box(x+1,y+1,cw-2,ch-2,held.has(n)?BLUE:root?"#1d5f80":GRAY);tx(noteName(n),x+cw/2,y+ch/2,"#fff",9,"center");
 reg(x,y,cw,ch,{down:(px,py,G)=>{G.n=n;keyOn(n)},up:(px,py,G)=>keyUp(G.n),tip:"<b>Grid key</b> In-scale notes only; darker blue = the root."})}}
function drawSliceGrid(p,i){const n=p.slices.length+1,cw=40,ch=51.25;for(let k=0;k<Math.min(32,n);k++){const x=(k%8)*cw,y=35+Math.floor(k/8)*ch,act=S.voices.some(v=>v.pad===i&&v.slice===k&&!v.rel);
 box(x+1,y+1,cw-2,ch-2,act?BLUE:GRAY);tx(String(k+1),x+cw/2,y+ch/2,"#fff",11,"center");reg(x,y,cw,ch,{down:()=>{play(i,{key:36+k,note:36+k});recHit("key",i,36+k,S.vel/127)},up:()=>{keyOff(i,36+k);recRelease(36+k)},tip:"<b>Slice "+(k+1)+"</b> Touch to play this slice."})}}

/* ---------- SEQS ---------- */
SCR.seqs={t:"Sequences grid",pg:"15–16, 66–69, 74",path:"SEQS",
 d:"16 sequence cells, each holding 4 patterns (A–D, letter at bottom right). Touch a cell to select it (pink) and toggle it active (white frame). PLAY runs the active ones; changes wait for the sequence's Quant Size. Blue bar = playing, white bar = waiting for the quantize point.",
 k:()=>[["◀▶ seq","Move the selection left/right."],["◀▶ seq","Move the selection left/right."],["▲▼ seq","Move the selection up/down."],[S.seqPanel==="quick"?"→ Patterns":"→ Quick","Swap the side panel: UNDO/CLEAR/OFF ↔ pattern selector A–D."]],
 i:"Open the piano roll of the selected sequence.",b:"—",
 draw(){const cw=64,ch=56.25;for(let i=0;i<16;i++){const x=(i%4)*cw,y=15+Math.floor(i/4)*ch;seqCell(i,x,y,cw,ch);reg(x,y,cw,ch,{down:()=>{S.seq=i;toggleSeq(i)},tip:()=>seqTip(i)})}
  if(S.seqPanel==="quick")[["UNDO",()=>{if(S.undo){const sq=S.seqs[S.undo.si];sq.pats[S.undo.k].notes=S.undo.notes;S.undo=null;toast("Undone")}},"Remove what you added since you last pressed REC."],["CLEAR",()=>{S.seqs[S.seq].pats.forEach(p=>p.notes=[]);emit("seq:clear")},"Clear all four patterns of the selected sequence (settings stay)."],["OFF",()=>{seqsOff();emit("seq:off")},"Deactivate all sequences."]].forEach(([l,f,t],j)=>btn(259,16+j*75,60,73,l,false,{down:f,tip:"<b>"+l+"</b> "+t}));
  else["A","B","C","D"].forEach((l,j)=>{const sq=S.seqs[S.seq];btn(259,16+j*56,60,54,l+(sq.pats[j].notes.length?" •":""),sq.cur===j,{down:()=>setPattern(S.seq,j),tip:"<b>Pattern "+l+"</b> Play and edit this pattern of the selected sequence. • = has notes."})})},
 turn(k,d){if(k===3){S.seqPanel=S.seqPanel==="quick"?"pat":"quick";emit("panel");return}const c=S.seq%4,r=Math.floor(S.seq/4);S.seq=k<2?r*4+clamp(c+d,0,3):clamp(r+d,0,3)*4+c;emit("seqsel")},
 info(){go("roll")}};
function seqCell(i,x,y,w,h){const sq=S.seqs[i],P=sq.pats[sq.cur],fl=performance.now()-(S.flash["s"+i]||-1e9);box(x+1,y+1,w-2,h-2,i===S.seq?PINK:P.notes.length?"#3d3d3d":DARK);
 if(fl>=0&&fl<70)box(x+1,y+1,w-2,h-2,"rgba(255,255,255,.12)");
 tx(String(i+1),x+4,y+8,"#bbb",8);tx("ABCD"[sq.cur],x+w-6,y+h-8,"#fff",9,"center");tx(sq.mode==="pads"?"":sq.mode==="keys"?"K":"M",x+w-6,y+8,"#bbb",8,"center");
 if(P.notes.length){const ps=P.notes.map(n=>n.p),lo=Math.min(...ps),hi=Math.max(...ps);P.notes.forEach(n=>{const nx=x+6+n.t/P.steps*(w-16),ny=sq.mode==="pads"?y+12+n.p/15*(h-26):y+h-14-(hi>lo?(n.p-lo)/(hi-lo):.5)*(h-26);box(nx,ny,Math.max(2,n.len/P.steps*(w-16)),2,"#fff")})}
 if(sq.active)fr(x+1,y+1,w-2,h-2,"#fff",2);
 if(sq.pending)box(x+5,y+h-6,w-20,3,"#fff");else if(sq.run){const L=patBeats(sq);box(x+5,y+h-6,(w-20)*(((S.pos-sq.start)%L+L)%L/L),3,BLUE)}
 if(S.recording&&i===S.seq){X.fillStyle=RED;X.beginPath();X.arc(x+w-16,y+8,3,0,7);X.fill()}}
function seqTip(i){const sq=S.seqs[i],n=sq.pats.reduce((a,p)=>a+p.notes.length,0);return`<b>Sequence ${i+1}</b> ${sq.mode==="pads"?"Pads":sq.mode==="keys"?"Keys (pad "+(sq.pad+1)+")":"MIDI"} sequence, pattern ${"ABCD"[sq.cur]}, ${n} events.${sq.active?" Active.":""}<div class='s'>Touch = select + toggle active · INFO = piano roll</div>`}

SCR.roll={t:"Piano roll",pg:"67, 70–76",path:"SEQS → INFO",
 get d(){return"Steps run left to right. "+(S.seqs[S.seq].mode==="pads"?"In PADS mode each row is a pad (1–16).":"In KEYS/MIDI mode rows are notes; C rows are labelled.")+" Touch an empty spot to add a note, touch a note to select it (pink), touch it again to delete it. Event mode edits velocity (VEL) and play probability (PLAY) of the selected note."},
 k:()=>S.roll.ev?[["Select","Select the previous/next note."],["Length","Change the selected note's length."],["Velocity","Velocity of the selected note."],["Play %",MOD()?"Play probability; past 100% blackbox-mod adds conditions 1:2 … 8:8.":"Play probability of the selected note."]]
  :[["Select","Select the previous/next note."],["Length","Change the selected note's length."],["Move","Move the selected note earlier/later."],["Pitch",S.seqs[S.seq].mode==="pads"?"Moves the note up/down (KEYS view only, per the manual).":"Move the selected note up/down."]],
 i:"Open the sequence/pattern parameters.",b:"Back to the sequences grid.",
 draw(){const sq=S.seqs[S.seq],P=sq.pats[sq.cur],r=S.roll,ev=r.ev;
  const vk=S.seq+"/"+sq.cur;if(r.vk!==vk){r.vk=vk;r.x=0;r.sel=-1;if(sq.mode!=="pads"){const ps=P.notes.map(n=>n.p);r.top=ps.length?clamp(Math.round((Math.max(...ps)+Math.min(...ps))/2)+8,16,127):72}}
  gridIcon(2,16,S.seq,()=>S.ov={t:"seqs",pick:i=>{S.seq=i;r.sel=-1;S.ov=null}},"<b>Sequence selector</b> Jump to another sequence's piano roll.");
  btn(22,16,18,17,"ABCD"[sq.cur],true,{down:()=>{setPattern(S.seq,(sq.cur+1)%4);r.sel=-1},tip:"<b>Pattern</b> Touch to switch between patterns A–D."});
  btn(42,16,38,17,sq.mode.toUpperCase(),false,{down:()=>S.ov={t:"menu",x:42,y:34,w:80,items:["pads","keys","midi"].map(m=>[m.toUpperCase(),()=>{if((m==="pads")!==(sq.mode==="pads")&&sq.pats.some(p=>p.notes.length)){sq.pats.forEach(p=>p.notes=[]);toast("All 4 patterns cleared")}sq.mode=m;emit("mode:"+m)}])},tip:"<b>Sequence mode</b> PADS (rows = pads), KEYS (one pad, chromatic) or MIDI (notes to MIDI Out). Switching to or from PADS clears all four patterns."});
  btn(82,16,34,17,"Edit",false,{down:()=>rollEdit(),tip:"<b>Edit</b> Cut, Copy, Paste (adds), Clear, Double, Import."});btn(118,16,40,17,"Event",ev,{down:()=>{r.ev=!r.ev;emit("event")},tip:"<b>Event</b> Edit velocity and play probability of the selected note."});
  tx(P.steps+"×"+P.len,164,25,"#aaa",9);
  if(sq.mode==="keys")gridIcon(300,16,sq.pad,()=>S.ov={t:"pads",pick:i=>{sq.pad=i;S.ov=null}},"<b>Keys pad selector</b> Which pad this Keys sequence plays.");
  const gx=24,gy=35,gh=ev?170:204,vis=Math.min(P.steps,r.zoom||32),cw=(W-gx)/vis,rows=16,rh=gh/rows;r.x=clamp(r.x,0,Math.max(0,P.steps-vis));
  const rowOf=n=>sq.mode==="pads"?n.p:r.top-n.p,valOf=row=>sq.mode==="pads"?row:r.top-row;
  for(let j=0;j<rows;j++){const v=valOf(j),y=gy+j*rh,black=sq.mode!=="pads"&&[1,3,6,8,10].includes(((v%12)+12)%12);box(0,y,gx-1,rh-.5,sq.mode==="pads"?"#333":black?"#111":"#ddd");
   tx(sq.mode==="pads"?String(v+1):v%12===0?"C"+(v/12-1):"",gx/2,y+rh/2,sq.mode==="pads"?"#fff":"#333",7,"center");box(gx,y,W-gx,rh-.5,black?"#151515":"#1d1d1d")}
  for(let s=0;s<=vis;s++){const st=s+r.x;box(gx+s*cw,gy,st%4===0?1:.5,gh,st%4===0?"#555":"#2c2c2c")}
  P.notes.forEach((n,j)=>{const row=rowOf(n);if(row<0||row>=rows)return;const x=gx+(n.t-r.x)*cw,w=Math.max(2,n.len*cw-1);if(x+w<gx||x>W)return;X.globalAlpha=.45+.55*n.v/127;box(x,gy+row*rh+1,w,rh-2,j===r.sel?PINK:n.prob<100||n.cond?"#7fd8f5":BLUE);X.globalAlpha=1});
  if(sq.run){const L=patBeats(sq),st=(((S.pos-sq.start)%L+L)%L)/QB[P.len];box(gx+(st-r.x)*cw,gy,1,gh,"#fff")}
  const hit=(x,y)=>{const st=r.x+(x-gx)/cw,row=Math.floor((y-gy)/rh);return{st,row,j:P.notes.findIndex(n=>rowOf(n)===row&&st>=n.t&&st<n.t+Math.max(n.len,.3))}};
  reg(gx,gy,W-gx,gh,{down:(x,y,G)=>{G.x0=r.x;G.t0=r.top},move:(x,y,G)=>{if(Math.abs(G.tx)>4)r.x=clamp(Math.round(G.x0-G.tx/cw),0,Math.max(0,P.steps-vis));if(sq.mode!=="pads"&&Math.abs(G.ty)>4)r.top=clamp(Math.round(G.t0+G.ty/rh),rows,127)},
   up:(x,y,G)=>{if(G.moved)return;const h=hit(x,y);if(h.j>=0){if(h.j===r.sel){P.notes.splice(h.j,1);r.sel=-1;emit("roll:del")}else{r.sel=h.j;emit("roll:sel")}}
    else if(h.row>=0&&h.row<rows){const t=sq.stepMode==="ON"?Math.floor(h.st):Math.floor(h.st*4)/4;if(t<P.steps){P.notes.push({t,p:valOf(h.row),len:1,v:100,prob:100});r.sel=P.notes.length-1;
     if(sq.mode==="pads")play(valOf(h.row),{});else if(sq.mode==="keys")play(sq.pad,{note:valOf(h.row),key:valOf(h.row)});emit("roll:add")}}},
   wheel:(x,y,dy)=>{if(sq.mode!=="pads")r.top=clamp(r.top+(dy>0?-2:2),rows,127);else r.x=clamp(r.x+(dy>0?2:-2),0,Math.max(0,P.steps-vis))},
   tip:"<b>Piano roll</b> Touch empty = add · touch note = select · touch selected = delete · drag = scroll · wheel = scroll"+(sq.mode!=="pads"?" notes":" steps")+"."});
  if(ev){const n=P.notes[r.sel];box(0,206,W,34,"#111");tx("VEL "+(n?n.v:"—"),8,223,"#fff",11);tx("PLAY "+(n?(n.cond||n.prob+"%"):"—"),312,223,"#fff",11,"right");reg(0,206,W,34,{tip:"<b>Event editor</b> Bottom-left knob = velocity, bottom-right = play probability of the selected (pink) note."})}},
 turn(k,d){const sq=S.seqs[S.seq],P=sq.pats[sq.cur],r=S.roll,ord=P.notes.map((n,j)=>j).sort((a,b)=>P.notes[a].t-P.notes[b].t||P.notes[a].p-P.notes[b].p);
  if(k===0){if(!P.notes.length)return;let o=ord.indexOf(r.sel);o=clamp(o+d,0,ord.length-1);r.sel=ord[o];const n=P.notes[r.sel],vis=r.zoom||32;if(n.t<r.x||n.t>=r.x+vis)r.x=Math.max(0,Math.floor(n.t/4)*4-4);if(sq.mode!=="pads"&&(n.p>r.top||n.p<=r.top-16))r.top=n.p+8;return}
  const n=P.notes[r.sel];if(!n)return;const f=sq.stepMode==="ON"?1:.25;
  if(k===1)n.len=clamp(n.len+d*f,f,P.steps);else if(r.ev){if(k===2)n.v=clamp(n.v+d*2,1,127);else{const C=MOD()?CONDS:[];if(n.cond){const j=C.indexOf(n.cond)+d;if(j<0){delete n.cond;n.prob=100}else n.cond=C[Math.min(j,C.length-1)]}else{const p=n.prob+d*5;if(p>100&&C.length){n.cond=C[0];n.prob=100}else n.prob=clamp(p,0,100)}}emit("evt")}
  else if(k===2)n.t=clamp(Math.round((n.t+d*(sq.stepMode==="ON"?1:.1))*100)/100,0,P.steps-f);else if(sq.mode!=="pads")n.p=clamp(n.p+d,0,127);emit("knob:roll")},
 info(){go("seqp")}};
const CONDS=[];for(let b=2;b<=8;b++)for(let a=1;a<=b;a++)CONDS.push(a+":"+b);
let SEQCLIP=null;
function rollEdit(){const sq=S.seqs[S.seq],P=sq.pats[sq.cur];S.ov={t:"menu",x:82,y:34,w:90,items:[
 ["Cut",()=>{SEQCLIP=JSON.parse(JSON.stringify(P));P.notes=[]}],["Copy",()=>{SEQCLIP=JSON.parse(JSON.stringify(P));toast("Copied")}],
 ["Paste",()=>{if(!SEQCLIP)return;P.notes.push(...JSON.parse(JSON.stringify(SEQCLIP.notes)));P.len=SEQCLIP.len;P.steps=Math.max(P.steps,SEQCLIP.steps);toast("Pasted (added)")},!SEQCLIP],
 ["Clear",()=>{P.notes=[];S.roll.sel=-1}],["Double",()=>{if(P.steps>128)return toast("Already at the 256-step maximum");P.notes.push(...P.notes.map(n=>({...n,t:n.t+P.steps})));P.steps*=2;emit("double")}],
 ["Import",()=>toast("Import reads the first track of a .MID file from the card (not simulated)",2500)]]}}

SCR.seqp={t:"Sequence & pattern parameters",pg:"72–73, 109",path:"SEQS → INFO → INFO",
 d:"Seq tab: settings for the whole cell (all 4 patterns): Duty Cycle (note length), Quant Size (when it starts/stops), Step Mode (quantize while recording) and MIDI OUT channel. A–D tabs: Step Len and Step Count (1–256) of each pattern. Changes take effect at the next loop.",
 k:()=>[["▲▼ row","Select a row."],["▲▼ row","Select a row."],["Value","Change the value."],["Value","Change the value."]],i:"—",b:"Back to the piano roll.",
 rows(){const sq=S.seqs[S.seq],t=S.seqTab,cyc=(o,k,arr)=>d=>{o[k]=arr[clamp(arr.indexOf(o[k])+d,0,arr.length-1)];emit("seqp:"+k)};
  if(t==="Seq")return[["Duty Cycle",pct(sq.duty),d=>sq.duty=clamp(sq.duty+d*5,0,100),"<b>Duty Cycle</b> Note duration: 0% silent, 100% full length."],["Quant Size",sq.quant,cyc(sq,"quant",SEQQ),"<b>Quant Size</b> Starting/stopping waits for this boundary."],
   ["Step Mode",sq.stepMode,cyc(sq,"stepMode",["OFF","ON"]),"<b>Step Mode</b> ON snaps recorded notes to steps; OFF keeps your timing."],["MIDI OUT",sq.midiOut,cyc(sq,"midiOut",CH16),"<b>MIDI OUT</b> Channel this sequence sends notes on."]];
  const P=sq.pats["ABCD".indexOf(t)];return[["Step Len",P.len,cyc(P,"len",STEPLENS),"<b>Step Len</b> Time per step."],["Step Count",String(P.steps),d=>P.steps=clamp(P.steps+d,1,256),"<b>Step Count</b> Number of steps."]]},
 draw(){box(0,15,W,19,"#111");tx("Seq "+(S.seq+1)+" · "+(S.seqTab==="Seq"?"all patterns":"pattern "+S.seqTab),5,25,"#fff",10);const rows=this.rows();S.seqRow=clamp(S.seqRow,0,rows.length-1);
  simpleList(rows,S.seqRow,j=>S.seqRow=j,"seqTop");tabs(["Seq","A","B","C","D"],S.seqTab,n=>{S.seqTab=n;S.seqRow=0},"<b>Seq</b> = whole cell, <b>A–D</b> = per pattern.")},
 turn(k,d){const rows=this.rows();if(k<2)S.seqRow=clamp(S.seqRow+d,0,rows.length-1);else rows[S.seqRow][2](d)}};

/* ---------- SONG ---------- */
SCR.song={t:"Song scenes",pg:"16–17, 77–80, 114",path:"SONG",
 d:"A song is up to 32 scenes played in order. Each row: name, the pads fired at the start of the scene, the sequence patterns that play, and M × N (length of the longest sequence in 16-step units × Play Count). The Song button turns Song Mode on (blue); Loop cycles off / Loop1 (repeat this scene) / LoopA (whole song). Tap the tempo box to tap a tempo.",
 k:()=>[["Tempo","BPM of the internal clock."],["Swing","Swing (affects steps of 1/16 or shorter)."],["▲▼ scene","Select a scene."],["▲▼ scene","Select a scene."]],
 i:"Open the selected scene's parameters (Play Count).",b:"—",
 draw(){box(2,16,56,24,"#111");tx(S.bpm.toFixed(S.bpm%1?1:0),30,25,"#fff",13,"center");tx("BPM",30,35,"#999",7,"center");reg(2,16,56,24,{down:()=>tapTempo(),tip:"<b>Tempo</b> Top-left knob sets it; tap here in time to tap a tempo."});
  box(60,16,50,24,"#111");tx(S.swing+"%",85,25,"#fff",12,"center");tx("SWING",85,35,"#999",7,"center");reg(60,16,50,24,{tip:"<b>Swing</b> Top-right knob. 50% is straight; only affects steps of 1/16 or smaller."});
  btn(166,18,40,20,"Edit",false,{down:()=>songEdit(),tip:"<b>Edit</b> Cut, Copy, Paste, Clear, Add, Rename, Delete, Grab."});
  btn(210,18,50,20,["Loop","Loop1","LoopA"][S.loop],S.loop>0,{down:()=>{S.loop=(S.loop+1)%3;emit("loop")},tip:"<b>Loop</b> Gray = play once, Loop1 = repeat the current scene, LoopA = loop the whole song."});
  btn(264,18,54,20,"Song",S.songMode,{down:()=>{S.songMode=!S.songMode;emit(S.songMode?"song:on":"song:off")},tip:"<b>Song</b> Song Mode on (blue): PLAY plays scenes. Off: PLAY plays the active sequences."});
  const rh=28,vis=7;S.sceneTop=clamp(S.sceneTop,S.scene-vis+1,S.scene);S.sceneTop=clamp(S.sceneTop,0,Math.max(0,S.scenes.length-vis));
  S.scenes.slice(S.sceneTop,S.sceneTop+vis).forEach((sc,j)=>{const k=S.sceneTop+j,y=42+j*rh,play=S.song&&S.song.idx===k;box(0,y,W,rh-2,k===S.scene?PINK:"#222");if(play)box(0,y,4,rh-2,BLUE);if(S.song&&S.song.queued===k)fr(0,y,W,rh-2,"#fff",2);
   tx(sc.name.slice(0,14),8,y+rh/2-1,"#fff",10);reg(0,y,112,rh-2,{down:()=>{S.scene=k;if(S.playing&&S.songMode&&S.song){S.song.queued=k;emit("scene:queue")}},tip:"<b>Scene</b> Touch to select it; during song playback it's queued for the next bar."});
   mini(118,y+2,(i)=>sc.pads[i]==="on"?BLUE:sc.pads[i]==="keep"?"#fff":"#444");reg(116,y,26,rh-2,{down:()=>{S.scene=k;S.scnPat="on";S.ov={t:"scnpads",k}},tip:"<b>Pad events</b> Pads fired once at the start of the scene. Touch to edit."});
   mini(150,y+2,(i)=>sc.seqs[i]==="keep"?"#fff":sc.seqs[i]!=null?BLUE:"#444");reg(148,y,26,rh-2,{down:()=>{S.scene=k;S.scnPat=0;S.ov={t:"scnseqs",k}},tip:"<b>Sequences</b> Which pattern of each sequence plays in this scene (white = Keep). Touch to edit."});
   tx(Math.max(1,Math.round(sceneLen(sc)/sc.count/4))+" x "+sc.count,312,y+rh/2-1,"#fff",10,"right");reg(176,y,144,rh-2,{down:()=>{S.scene=k},tip:"<b>M x N</b> Longest sequence (in 16-step units) × Play Count. INFO sets the Play Count."})})},
 turn(k,d){if(k===0){setBpm(Math.round(S.bpm+d));emit("tempo")}else if(k===1){S.swing=clamp(S.swing+d,50,75);emit("swing")}else S.scene=clamp(S.scene+d,0,S.scenes.length-1)},
 info(){go("scene")}};
function mini(x,y,col){for(let i=0;i<16;i++)box(x+(i%4)*6,y+Math.floor(i/4)*6,5,5,col(i))}
let SCNCLIP=null;
function songEdit(){const k=S.scene,sc=S.scenes[k];S.ov={t:"menu",x:150,y:40,w:100,items:[
 ["Cut",()=>{SCNCLIP=JSON.parse(JSON.stringify(sc));if(S.scenes.length>1)S.scenes.splice(k,1);else S.scenes[0]=newScene();S.scene=Math.min(k,S.scenes.length-1)}],
 ["Copy",()=>{SCNCLIP=JSON.parse(JSON.stringify(sc));toast("Copied")}],["Paste",()=>{if(SCNCLIP)S.scenes[k]=JSON.parse(JSON.stringify(SCNCLIP))},!SCNCLIP],
 ["Clear",()=>{sc.seqs={};sc.pads={};sc.count=1}],["Add",()=>{if(S.scenes.length>=32)return toast("32 scenes maximum");S.scenes.splice(k+1,0,newScene());S.scene=k+1;emit("scene:add")}],
 ["Rename",()=>kbd("Rename scene",sc.name,n=>sc.name=n)],["Delete",()=>{if(S.scenes.length>1){S.scenes.splice(k,1);S.scene=Math.min(k,S.scenes.length-1)}}],
 ["Grab",()=>{sc.seqs={};S.seqs.forEach((sq,j)=>{if(sq.run||sq.pending&&sq.pending.on)sc.seqs[j]=sq.pending?.pat??sq.cur});toast("Grabbed playing patterns");emit("grab")}]]}}
SCR.scene={t:"Scene parameters",pg:"16, 78",path:"SONG → INFO",d:"Play Count: how many times the longest sequence in the scene repeats before the song moves on.",
 k:()=>[["Play Count","How many times the scene repeats."],["—",""],["—",""],["—",""]],i:"—",b:"Back to the song.",
 draw(){const sc=S.scenes[S.scene];box(0,15,W,19,"#111");tx(sc.name,5,25,"#fff",10);simpleList([["Play Count",String(sc.count),d=>sc.count=clamp(sc.count+d,1,99),"<b>Play Count</b>"],["Name",sc.name,null,"Rename it with Edit → Rename on the song screen."]],0,()=>{},"scnTop")},
 turn(k,d){if(k===0){const sc=S.scenes[S.scene];sc.count=clamp(sc.count+d,1,99);emit("count")}}};

/* ---------- FX, EQ ---------- */
SCR.fx={t:"Effects sends",pg:"81",path:"FX",
 d:"Two shared effects: FX1 = Delay, FX2 = Reverb. Each pad sends some of its signal to them (blue triangles: top-left = FX1, top-right = FX2). The wet signal comes out of Out 1. Touch FX1 or FX2 at the bottom to select it, then INFO to edit it. Push FX again for the EQ.",
 k:()=>[["FX1 send","Delay send of the selected pad."],["FX2 send","Reverb send of the selected pad."],["▲▼ pad","Select a pad."],["◀▶ pad","Select a pad."]],
 i:"Edit the selected effect (pink box).",b:"—",
 draw(){const cw=64,ch=44;for(let i=0;i<16;i++){const x=(i%4)*cw,y=15+Math.floor(i/4)*ch,p=S.pads[i];padCell(i,x,y,cw,ch,{fx:1});
   if(p.fx1>0){X.fillStyle=BLUE;X.beginPath();X.moveTo(x+2,y+2);X.lineTo(x+14,y+2);X.lineTo(x+2,y+14);X.fill()}if(p.fx2>0){X.fillStyle=BLUE;X.beginPath();X.moveTo(x+cw-2,y+2);X.lineTo(x+cw-14,y+2);X.lineTo(x+cw-2,y+14);X.fill()}
   reg(x,y,cw,ch,{down:()=>{S.pad=i;play(i,{});emit("pad")},up:()=>keyOff(i),tip:`<b>Pad ${i+1}</b> FX1 ${p.fx1}% · FX2 ${p.fx2}%. Touch to select and audition.`})}
  [["FX1","DELAY"],["FX2","REVERB"]].forEach(([a,b],j)=>{const x=2+j*128;box(x,193,124,45,S.fxSel===j?PINK:"#333");tx(a+" "+b,x+62,207,"#fff",10,"center");tx("send "+S.pads[S.pad]["fx"+(j+1)]+"%",x+62,225,"#fff",9,"center");
   reg(x,193,124,45,{down:()=>{S.fxSel=j;emit("fxsel")},tip:`<b>${a}: ${b}</b> Touch to select, then INFO for its parameters. All pads share the same settings.`})});
  [0,1].forEach(j=>{const x=260+j*30,v=S.pads[S.pad]["fx"+(j+1)];box(x,16,27,222,DARK);box(x,238-218*v/100,27,218*v/100,BLUE);tx("FX"+(j+1),x+13.5,28,"#fff",8,"center");
   reg(x,16,27,222,{down:(px,py)=>{S.pads[S.pad]["fx"+(j+1)]=clamp(Math.round((238-py)/218*100),0,100);applyPad(S.pad);emit("fx:send")},move:(px,py)=>{S.pads[S.pad]["fx"+(j+1)]=clamp(Math.round((238-py)/218*100),0,100);applyPad(S.pad)},tip:`<b>FX${j+1} send</b> How much of the selected pad goes to ${j?"the reverb":"the delay"}. Drag, or turn the top-${j?"right":"left"} knob.`})})},
 turn(k,d){const p=S.pads[S.pad];if(k<2){const key="fx"+(k+1);p[key]=clamp(p[key]+d*2,0,100);applyPad(S.pad);emit("fx:send")}else if(k===2)S.pad=clamp(S.pad+d*4,0,15);else S.pad=clamp(S.pad+d,0,15)},
 info(){S.fxpsel=0;go("fxp")}};
SCR.fxp={get t(){return S.fxSel?"FX2: Reverb parameters":"FX1: Delay parameters"},pg:"81–83",path:"FX → touch FX1/FX2 → INFO",
 get d(){return S.fxSel?"Decay sets the length (0% dry … 100% fully wet), Damping makes highs die sooner, Predelay adds a gap before the reverb. The reverb is CPU-hungry on the real unit.":"Delay time (a note value when Beat is on), Feedback (repeats), and an optional filter (Cutoff: − low-pass, + high-pass; Width). Ping bounces echoes left/right."},
 keys(){const m=MOD();if(S.fxSel)return m?["rtype","decay","damp","pre",...(S.fx.r.rtype==="Room"?["rsize","rmod","rearly","rwid"]:[])]:["decay","damp","pre"];
  return m?S.fx.d.dtype==="Munchi"?["dtype","wand","mrnd","fb","mfrz","mclk","mwid","mduck"]:["dtype","dtime","fb","cut","width","beat","filt","ping"]:["dtime","fb","cut","width","beat","filt","ping"]},
 k:()=>{const ks=SCR.fxp.keys().filter(k=>!FXP[k].btn);return[0,1,2,3].map(j=>ks[j]?[FXP[ks[j]].n,FXP[ks[j]].d]:["—",""])},
 i:"With a modulatable knob selected: open its Modulation screen.",b:"Back to the sends.",
 draw(){const e=S.fxSel?"r":"d",T=fxT(e);box(0,15,W,19,"#111");tx(this.t,5,25,"#fff",10);knobArr(T,this.keys(),S.fxpsel,null,j=>S.fxpsel=j,36)},
 turn(k,d){const e=S.fxSel?"r":"d",ks=this.keys().filter(k=>!FXP[k].btn);if(ks[k]){S.fxpsel=this.keys().indexOf(ks[k]);turnP(fxT(e),ks[k],d)}},
 info(){const k=this.keys()[S.fxpsel];if(FXP[k]&&FXP[k].mod){S.modKey=k;S.modFx=S.fxSel?"r":"d";S.modRow=0;go("mod")}}};
let EQC=null,EQN=null;const EQF=new Float32Array(150).map((_,i)=>20*Math.pow(1000,i/149));
SCR.eq={t:"Parametric EQ",pg:"84–85",path:"FX → FX",
 d:"A 4-band EQ on the master output. The curve shows the combined response. INFO selects the next band (pink point). Knobs: top-left Gain (±24 dB), top-right Frequency (20 Hz–20 kHz), bottom-left Q, bottom-right Type (None, L Cut, L Shelf, Param, H Shelf, H Cut). Drag in the grid to move the selected point.",
 k:()=>[["Gain","Gain of the selected band (±24 dB)."],["Freq","Frequency of the selected band."],["Q","Width / resonance / shelf shape."],["Type","None, L Cut, L Shelf, Param, H Shelf, H Cut."]],
 i:"Select the next filter band.",b:"Back.",
 draw(){if(!EQC){EQC=new OfflineAudioContext(1,1,44100);EQN=[0,1,2,3].map(()=>EQC.createBiquadFilter())}
  const gx=0,gy=15,gw=W,gh=225,fx=f=>gx+Math.log(f/20)/Math.log(1000)*gw,gyv=g=>gy+gh/2-g/24*(gh/2-8);box(gx,gy,gw,gh,"#0c0c0c");
  [100,1000,10000].forEach(f=>box(fx(f),gy,1,gh,"#333"));[-12,0,12].forEach(g=>box(gx,gyv(g),gw,1,g?"#2a2a2a":"#444"));
  const tot=new Float32Array(150),mag=new Float32Array(150),ph=new Float32Array(150);S.eq.forEach((b,i)=>{eqNode(EQN[i],b);EQN[i].getFrequencyResponse(EQF,mag,ph);mag.forEach((m,j)=>tot[j]+=20*Math.log10(m+1e-9))});
  X.strokeStyle=BLUE;X.lineWidth=2;X.beginPath();tot.forEach((g,j)=>{const x=fx(EQF[j]),y=gyv(clamp(g,-26,26));j?X.lineTo(x,y):X.moveTo(x,y)});X.stroke();
  S.eq.forEach((b,i)=>{const x=fx(b.freq),y=gyv(["L Cut","H Cut"].includes(b.type)?0:b.gain);X.fillStyle=i===S.eqBand?PINK:b.type==="None"?"#555":"#fff";X.beginPath();X.arc(x,y,i===S.eqBand?6:4,0,7);X.fill();tx(String(i+1),x,y-11,"#aaa",8,"center")});
  const b=S.eq[S.eqBand];tx("Gain "+(b.gain>0?"+":"")+b.gain.toFixed(1)+"dB",4,24,"#fff",9);tx((b.freq<1000?Math.round(b.freq)+"Hz":(b.freq/1000).toFixed(2)+"kHz"),316,24,"#fff",9,"right");tx("Q "+b.q.toFixed(2),4,232,"#fff",9);tx(b.type,316,232,"#fff",9,"right");
  const set=(x,y)=>{b.freq=clamp(20*Math.pow(1000,(x-gx)/gw),20,20400);b.gain=clamp(Math.round(-(y-gy-gh/2)/(gh/2-8)*24*2)/2,-24,24);if(b.type==="None")b.type="Param";applyEQ();emit("eq")};
  reg(gx,gy+12,gw,gh-24,{down:(x,y)=>set(x,y),move:(x,y)=>set(x,y),tip:"<b>EQ grid</b> X = frequency, Y = gain. Touch or drag to move the selected (pink) point; INFO selects another band."})},
 turn(k,d){const b=S.eq[S.eqBand];if(k===0)b.gain=clamp(b.gain+d*.5,-24,24);else if(k===1)b.freq=clamp(b.freq*Math.pow(2,d/12),20,20400);else if(k===2)b.q=clamp(Math.round(b.q*Math.pow(1.08,d)*100)/100,.1,18.4);else b.type=EQT[clamp(EQT.indexOf(b.type)+d,0,EQT.length-1)];applyEQ();emit("eq")},
 info(){S.eqBand=(S.eqBand+1)%4;emit("eqband")}};

/* ---------- MIX ---------- */
SCR.mix={get t(){return S.mixMode==="mute"?"Mixer: Mute mode":S.mixMode==="solo"?"Mixer: Solo mode (blackbox-mod)":"Mixer"},pg:"86",path:"MIX",
 get d(){return S.mixMode==="mute"?"Touch pads to mute (red) or unmute (green). Mute state isn't saved with the preset. Push MIX or INFO to go back.":S.mixMode==="solo"?"blackbox-mod: touch pads to solo them (yellow); only soloed pads are heard.":"Level (dB) and pan for each pad. The line at the bottom shows the pan position; a blue bar means it's playing, a red bar on top means it's muted. Push MIX or INFO for Mute mode."},
 k:()=>[["Level","Level of the selected pad."],["Level","Level of the selected pad."],["Pan","Pan of the selected pad (stereo outputs only)."],["Pan","Pan of the selected pad."]],
 get i(){return MOD()?"Cycle Mixer → Mute → Solo.":"Toggle Mute mode."},b:"—",
 draw(){const cw=64,ch=56.25,mm=S.mixMode;for(let i=0;i<16;i++){const x=(i%4)*cw,y=15+Math.floor(i/4)*ch,p=S.pads[i];padCell(i,x,y,cw,ch,{mix:1,mute:mm==="mute",solo:mm==="solo"});
   tx(lab2(p.name)[0]||"—",x+cw/2,y+12,"#ddd",8,"center");tx((p.level>0?"+":"")+p.level.toFixed(1),x+cw/2,y+ch/2,mm==="solo"&&p.solo?"#000":"#fff",11,"center");
   if(mm==="mix"){box(x+8,y+ch-9,cw-16,1,"#bbb");box(x+cw/2+p.pan/100*(cw/2-8)-1.5,y+ch-12,3,7,BLUE);if(p.mute)box(x+2,y+2,cw-4,3,RED);if(MOD()&&p.solo)box(x+2,y+6,cw-4,2,YEL)}
   reg(x,y,cw,ch,{down:()=>{S.pad=i;if(mm==="mute"){p.mute=!p.mute;S.pads.forEach((_,j)=>applyPad(j));emit("mix:mute")}else if(mm==="solo"){p.solo=!p.solo;S.pads.forEach((_,j)=>applyPad(j));emit("mix:solo")}},
    tip:`<b>Pad ${i+1}</b> ${p.level.toFixed(1)} dB, pan ${p.pan}%${p.mute?", muted":""}.`})}
  ["MIX","MUTE",...(MOD()?["SOLO"]:[])].forEach((l,j)=>btn(259,16+j*56,60,54,l,mm===l.toLowerCase(),{down:()=>{S.mixMode=l.toLowerCase();emit("mix:"+S.mixMode)},tip:"Mixer mode."+(l==="SOLO"?" (blackbox-mod)":"")}))},
 turn(k,d){const p=S.pads[S.pad];if(k<2)p.level=clamp(p.level+d*.5,-96,12);else p.pan=clamp(p.pan+d*2,-100,100);applyPad(S.pad);emit("mix:knob")},
 info(){mixCycle()}};
function mixCycle(){const L=MOD()?["mix","mute","solo"]:["mix","mute"];S.mixMode=L[(L.indexOf(S.mixMode)+1)%L.length];emit("mix:"+S.mixMode)}

/* ---------- PSET ---------- */
SCR.pset={t:"Preset management",pg:"14, 18–19, 87–93",path:"PSET",
 d:"Every preset on the card. Turn a knob to highlight one and touch Load. Save writes your changes to the loaded preset; nothing is saved automatically. File: New, Save As, Rename, Delete, Pack (copy all its WAVs into the preset's folder), Clean (delete unused WAVs from it).",
 k:()=>Array(4).fill(["Scroll","Highlight a preset."]),i:"—",b:"—",
 draw(){const L=presetNames();S.psetSel=clamp(S.psetSel,0,L.length-1);const sel=L[S.psetSel];
  btn(2,16,48,17,"File",false,{down:()=>psetFile(sel),tip:"<b>File</b> New, Save As, Rename, Delete, Pack, Clean."});btn(52,16,48,17,"Save",false,{down:()=>{savePreset(S.name);toast("Saved "+S.name);emit("pset:save")},tip:"<b>Save</b> Store your changes to the loaded preset (in this browser)."});
  btn(102,16,48,17,"Load",false,{down:()=>{loadPreset(sel);emit("preset:load")},tip:"<b>Load</b> Load the highlighted preset (disabled if already loaded)."},sel===S.name);tx(S.name.slice(0,22)+(S.dirty?"*":""),314,25,"#aaa",9,"right");
  const vis=11;S.psetTop=clamp(S.psetTop,S.psetSel-vis+1,S.psetSel);S.psetTop=Math.max(0,S.psetTop);
  L.slice(S.psetTop,S.psetTop+vis).forEach((n,j)=>{const k=S.psetTop+j,y=36+j*18.5;if(k===S.psetSel)box(0,y,W,18,"#1d7fb0");tx(n,6,y+9.5,"#fff",10);if(n===S.name)tx("loaded",312,y+9.5,"#9cf",8,"right");if(userPresets()[n])tx("user",270,y+9.5,"#fc9",8,"right");
   reg(0,y,W,18,{down:()=>{S.psetSel=k},tip:"<b>Preset</b> Touch to highlight, then Load."})})},
 turn(k,d){S.psetSel=Math.max(0,S.psetSel+d);emit("knob")}};
function psetFile(sel){S.ov={t:"menu",x:2,y:34,w:110,items:[
 ["New",()=>kbd("New Preset","New Preset",n=>{applyPreset(blankPreset(n));S.scr="pads"})],["Save As",()=>kbd("Save As",S.name,n=>{S.name=n;savePreset(n);S.scr="pads"})],
 ["Rename",()=>userPresets()[sel]?kbd("Rename",sel,n=>{const u=userPresets();u[n]=u[sel];u[n].name=n;delete u[sel];storeUser(u);if(S.name===sel)S.name=n}):toast("Factory presets can't be renamed here")],
 ["Delete",()=>userPresets()[sel]?S.ov={t:"confirm",msg:"Delete "+sel+"?",ok:()=>{const u=userPresets();delete u[sel];storeUser(u)}}:toast("Factory presets can't be deleted here")],
 ["Pack",()=>toast("Pack copies every WAV the preset uses into \\Presets\\"+S.name,2500)],["Clean",()=>toast("Clean deletes WAVs in the preset folder that no pad uses",2500)]]}}

/* ---------- TOOLS ---------- */
SCR.tools={t:"Tools (global settings)",pg:"11, 94–95, 112–113",path:"TOOLS",
 d:"Settings that apply to every preset: volumes, brightness, metronome, master compressor (Main); recording options and the 4-beat Lead In (Rec); MIDI channels and routing (MIDI); clock source and outputs (Clock).",
 k:()=>[["▲▼ row","Select a setting."],["▲▼ row","Select a setting."],["Value","Change the value."],["Value","Change the value."]],i:"—",b:"—",
 rows(){return TP[S.toolTab].filter(r=>!r[4]||(r[4]>0)===MOD()).map(([k,n,o,f,m])=>[n+(m>0?" ·mod":""),f?f(TOOLS[k]):TOOLS[k],d=>{if(typeof o[0]==="string")TOOLS[k]=o[clamp(o.indexOf(TOOLS[k])+d,0,o.length-1)];else TOOLS[k]=clamp(TOOLS[k]+d*o[2],o[0],o[1]);if(k==="comp")TOOLS.compModel=TOOLS.comp==="OFF"?"Off":TOOLS.compModel==="Off"?"Stock":TOOLS.compModel;if(k==="compModel")TOOLS.comp=TOOLS.compModel==="Off"?"OFF":"ON";applyTools();storeTools();emit("tool:"+k)},TOOLTIP[k]||("<b>"+n+"</b>")])},
 draw(){box(0,15,W,19,"#111");tx("TOOLS",5,25,"#fff",10);tx("v "+(MOD()?"3.1.n (mod)":"3.0"),314,25,MOD()?YEL:"#aaa",9,"right");const rows=this.rows();S.toolRow=clamp(S.toolRow,0,rows.length-1);
  simpleList(rows,S.toolRow,j=>S.toolRow=j,"toolTop");tabs(["Main","Rec","MIDI","Clock"],S.toolTab,n=>{S.toolTab=n;S.toolRow=0;emit("tab:"+n)})},
 turn(k,d){const rows=this.rows();if(k<2)S.toolRow=clamp(S.toolRow+d,0,rows.length-1);else rows[S.toolRow][2](d)}};
const TOOLTIP={hp:"<b>Headphone</b> Volume of the PHONES jack (here: everything you hear).",bright:"<b>Brightness</b> Screen brightness.",metro:"<b>Metronome</b> Play = whenever playing, Rec = only while recording, Off.",
 metroOut:"<b>Metro Out</b> Where the click goes; anything but HP keeps it out of the headphones.",metroGain:"<b>Metro Gain</b> Click volume (−96 to +20 dB).",comp:"<b>Compressor</b> Master compressor on Out 1.",
 compModel:"<b>Compressor (blackbox-mod)</b> The On/Off switch becomes a list: Off, Stock, then five models: Glue (SSL-style bus, 2:1), Punch (slow attack lets hits through, 4:1), Opto (LA-2A-style, slow release), Squash (1176 all-buttons, blended 50/50), Limit (+6 dB into a −0.3 dB ceiling).",compTh:"<b>Comp Thresh (blackbox-mod)</b> −24 to +12 dB: moves every model's threshold (for Limit, how hard it is pushed).",sd:"<b>SD Mode</b> Troubleshooting for cards that aren't recognised.",
 leadIn:"<b>Lead In</b> Count 4 beats before recording starts (shown as −4…−1 at top left).",recConfig:"<b>RecConfig</b> Global = recording settings apply to all empty pads; Per Pad = each pad keeps its own.",
 globalIn:"<b>Global In</b> MIDI channel for pad hits, sequences, scenes and recording notes (see the note map in the MIDI chapter).",midiSeq:"<b>MIDI Seq</b> Channel whose notes record into the selected Keys/MIDI sequence.",
 pgmIn:"<b>PGM In</b> Program Change loads presets (alphabetical order).",padRec:"<b>Pad Record</b> Enables MIDI-triggered recording/clearing of pads.",clkRx:"<b>Receive</b> Which MIDI port the clock is taken from.",clkTx:"<b>Send</b> Where MIDI clock is sent."};

/* ================= overlays ================= */
function kbd(title,val,enter){S.ov={t:"kbd",title,val,enter,caps:true,num:false}}
function drawOv(){const o=S.ov;if(!o)return;reg(0,0,W,H,{down:()=>{if(o.t!=="kbd")S.ov=null}});
 if(o.t==="menu"){const h=o.items.length*19;box(o.x,o.y,o.w,h+2,"#000");fr(o.x,o.y,o.w,h+2,"#888");o.items.forEach(([l,f,dis],j)=>{const y=o.y+1+j*19;box(o.x+1,y,o.w-2,18,BTN);tx(l,o.x+8,y+9.5,dis?"#666":"#fff",10);if(!dis)reg(o.x,y,o.w,19,{down:()=>{S.ov=null;f()}})})}
 else if(o.t==="pads"||o.t==="seqs"){box(0,15,W,225,"#000");const cw=o.seq?64:80,ch=o.seq?56.25:56.25;for(let i=0;i<16;i++){const x=(i%4)*cw,y=15+Math.floor(i/4)*ch,n=o.t==="pads"?(S.pads[i].name||"—"):"Seq "+(i+1);const sel=o.t==="pads"?i===S.pad:i===S.seq;
   box(x+1,y+1,cw-2,ch-2,sel?PINK:"#444");const[a,b]=lab2(n);tx(a,x+cw/2,y+ch/2-6,"#fff",10,"center");tx(b,x+cw/2,y+ch/2+7,"#fff",10,"center");reg(x,y,cw,ch,{down:()=>o.pick(i)})}
  if(o.seq)btn(259,16,60,222,"SEQ",S.keys.seq,{down:()=>o.pickSeq(),tip:"<b>SEQ</b> Keys play into the selected sequence (its pad, or MIDI out for a MIDI sequence)."})}
 else if(o.t==="list"){box(40,20,240,214,"#000");fr(40,20,240,214,"#888");tx(o.title,50,30,"#aaa",9);const vis=10;o.top=clamp(o.top||0,o.sel-vis+1,o.sel);o.top=Math.max(0,o.top);
  o.items.slice(o.top,o.top+vis).forEach((l,j)=>{const k=o.top+j,y=40+j*19;box(42,y,236,18,k===o.sel?"#1d7fb0":BTN);tx(l,50,y+9.5,"#fff",10);reg(42,y,236,18,{down:()=>{o.pick(k);S.ov=null}})})}
 else if(o.t==="val"||o.t==="confirm"){box(50,70,220,100,"#000");fr(50,70,220,100,"#888");tx(o.t==="val"?o.title:o.msg,160,90,"#fff",11,"center");if(o.t==="val")tx(o.v+o.unit,160,118,BLUE,16,"center");
  btn(70,140,80,22,"OK",true,{down:()=>{S.ov=null;o.t==="val"?o.ok(o.v):o.ok()}});btn(170,140,80,22,"Cancel",false,{down:()=>S.ov=null});if(o.t==="val")reg(50,95,220,40,{down:(x,y,G)=>G.acc=0,move:(x,y,G)=>{G.acc+=-(G.dy||0);while(Math.abs(G.acc)>=5){const s=Math.sign(G.acc);G.acc-=s*5;o.v=clamp(o.v+s,o.min,o.max)}},tip:"Turn any knob (or drag) to set the value."})}
 else if(o.t==="kbd"){box(0,15,W,225,"#000");tx(o.title,6,26,"#aaa",9);box(4,34,312,22,"#1b1b1b");tx(o.val+(performance.now()%1000<500?"_":""),8,45,"#fff",11);
  const rows=o.num?["1234567890","-_.()&!#+","@=,'"]:["QWERTYUIOP","ASDFGHJKL","ZXCVBNM"];rows.forEach((r,ri)=>[...r].forEach((c,j)=>{const w=31,x=4+j*w+ri*12,y=62+ri*34,ch=o.caps?c:c.toLowerCase();btn(x,y,w-2,31,ch,false,{down:()=>o.val=(o.val+ch).slice(0,40)})}));
  btn(4,164,46,31,o.num?"ABC":"123",false,{down:()=>o.num=!o.num});btn(52,164,30,31,"^",o.caps,{down:()=>o.caps=!o.caps});btn(84,164,120,31,"space",false,{down:()=>o.val+=" "});btn(206,164,50,31,"<–",false,{down:()=>o.val=o.val.slice(0,-1)});btn(258,164,58,31,"Clear",false,{down:()=>o.val=""});
  btn(4,200,150,34,"Cancel",false,{down:()=>S.ov=null});btn(166,200,150,34,"Enter",true,{down:()=>{const v=o.val.trim().replace(/["/\\?*<>:|]/g,"");if(!v)return;S.ov=null;o.enter(v)}})}
 else if(o.t==="scnpads"||o.t==="scnseqs"){const sc=S.scenes[o.k],isP=o.t==="scnpads";box(0,15,W,225,"#000");const cw=64,ch=56.25;
  for(let i=0;i<16;i++){const x=(i%4)*cw,y=15+Math.floor(i/4)*ch,v=isP?sc.pads[i]:sc.seqs[i];box(x+1,y+1,cw-2,ch-2,v==="keep"?"#ddd":v!=null?BLUE:"#333");
   tx(isP?(lab2(S.pads[i].name)[0]||"—"):"Seq "+(i+1),x+cw/2,y+ch/2-6,v==="keep"?"#000":"#fff",10,"center");tx(v==="keep"?"Keep":v==="on"?"fire":v!=null?"ABCD"[v]:"",x+cw/2,y+ch/2+8,v==="keep"?"#000":"#fff",10,"center");
   reg(x,y,cw,ch,{down:()=>{const want=S.scnPat,tgt=isP?sc.pads:sc.seqs;if(tgt[i]===want)delete tgt[i];else tgt[i]=want;emit("scn:edit")},tip:isP?"Toggle: fire this pad at the start of the scene (or Keep it playing across the scene change).":"Toggle: play the chosen pattern of this sequence in the scene (or Keep its current on/off state)."})}
  const opts=isP?[["on","Fire"],["keep","Keep"]]:[[0,"A"],[1,"B"],[2,"C"],[3,"D"],["keep","Keep"]],bh=(222-24)/opts.length;opts.forEach(([v,l],j)=>btn(259,16+j*bh,60,bh-2,l,S.scnPat===v,{down:()=>S.scnPat=v,tip:l==="Keep"?"<b>Keep</b> New in 3.0: leave this pad/sequence playing (or not) across the scene change instead of resetting it.":"Choose what touching a cell assigns."}));
  btn(259,216,60,22,"Done",false,{down:()=>S.ov=null})}}

/* ================= frame ================= */
function drawScreen(){X.setTransform(3,0,0,3,0,0);R=[];box(0,0,W,H,"#000");if(S.sleep||!libOK){if(!libOK&&!S.sleep)tx("loading sounds…",160,120,"#888",11,"center");return}
 header();(SCR[S.scr]||SCR.pads).draw();drawOv();
 if(S.toast){if(performance.now()>S.toast.until)S.toast=null;else{X.font="bold 10px ui-monospace,monospace";const w=Math.min(310,X.measureText(S.toast.msg).width+16);box(160-w/2,200,w,22,"#000");fr(160-w/2,200,w,22,YEL);tx(S.toast.msg,160,211,"#fff",10,"center")}}
 cv.style.filter=TOOLS.bright<100?`brightness(${.25+.75*TOOLS.bright/100})`:""}
