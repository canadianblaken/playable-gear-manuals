/* ================= OLED and the Utility menu ================= */
const GBY=Object.fromEntries(GLOBALS.map(g=>[g.id,g]));
const L=(n,id,extra={})=>({n,id,...extra});
const MENU_TS=()=>({n:"Track Settings",c:[L("MIDI Channel IN",()=>isDrum()?74:70+S.cur),L("MIDI Channel OUT",()=>isDrum()?79:75+S.cur),
 L("PC Send",()=>pcId(S.cur),{o:[[0,"OFF"],[1,"ON"]]}),{n:"PC Assign",pc:1},L("Fixed Velocity",()=>fvId(S.cur),{o:[[0,"OFF"],[1,"ON"]]})]});
const MENU=()=>({n:"Utility",c:[MENU_TS(),
 {n:"Sync",c:[L("Source",122),L("Clock rate",123),L("Output",124)]},
 {n:"Metronome",c:[L("Count In",114),L("Time Div",116),L("Time Sig",115)]},
 {n:"Launch Quant",c:[L("Wait Load Project",3),L("Wait Load Scene",2),L("Wait Load Pattern",4)]},
 {n:"CV Settings",c:[...[0,1,2,3].map(v=>({n:"Voice "+(v+1),c:[L("Pitch format",6+v),L("Base note",10+v),L("Gate format",14+v),L("Mod type",18+v),L("Mod max Voltage",22+v),L("Pitch Bend range",138+v)]})),
  {n:"DrumGates",c:[...Array(8).keys()].map(i=>L(`Gate ${i+1} format`,128+i))}]},
 {n:"Controller",c:[L("Global MIDI chan",80),...[0,1,2,3,4].map(k=>({n:"Knob "+(k+1),c:[L("MIDI CC",28+k),L("Port",33+k),L("Channel",38+k),L("Min",48+k),L("Max",53+k)]}))]},
 {n:"MIDI Settings",c:[L("Knob Acceleration",59),L("Aftertouch Curve",60),L("Velocity Curve",61),L("Transport Send",62),L("Transport Receive",63),L("Clock Send",64),L("Clock Receive",65),L("MIDI Out 2",136)]},
 {n:"Touch Strip",c:[L("MIDI Send/Receive",67),L("MIDI CC",68)]},
 {n:"MIDI Channels",c:[0,1,2,3].map(t=>L(`Track ${t+1} input`,70+t)).concat([L("Drum input",74)],[0,1,2,3].map(t=>L(`Track ${t+1} output`,75+t)),[L("Drum output",79)])},
 {n:"Drum Map",c:[L("Mode",81),L("Chromatic Low Note",82),...Array(24).keys()].map((x,i)=>typeof x==="object"?x:L(`Custom Note ${x+1}`,83+x))},
 {n:"Misc",c:[L("Vegas mode time",108),L("Screen saver time",109),L("Step Listen",110),L("Transpose Latch",153,{o:[[1,"OFF"],[0,"ON"]]}),L("Brightness",152)]},
 {n:"FW version",info:"Firmware version :\n2.5.20\nbuild 2085"}]});
const gidOf=it=>typeof it.id==="function"?it.id():it.id;
function optsOf(it){const id=gidOf(it),g=GBY[id]||{};if(it.o)return it.o;if(g.o)return g.o;
 if(g.ch)return [...Array(16).keys()].map(i=>[i,String(i+1)]).concat(g.ch);
 if(g.note)return [...Array(128).keys()].map(i=>[i,nm(i)]);
 const r=g.r||[0,127];return Array.from({length:r[1]-r[0]+1},(_,i)=>[r[0]+i,String(r[0]+i)])}
function valStr(it){if(it.pc){const p=curPat();return p.pc==null?"OFF":String(p.pc+1)}const id=gidOf(it),v=S.globals[id],o=optsOf(it).find(x=>x[0]===v);return o?o[1]:String(v)}
function openMenu(root){S.menu={stack:[root],i:0,edit:false};emit("menu:"+root.n);dirty()}
function menuNode(){const m=S.menu;return m.stack[m.stack.length-1]}
function menuTurn(d){const m=S.menu,node=menuNode(),it=node.c[m.i];
 if(m.edit){if(it.pc){const p=curPat();p.pc=p.pc==null?(d>0?0:null):(p.pc+d<0?null:clamp(p.pc+d,0,127));p.valid=true;if(p.pc!=null)midiPC(S.cur,p.pc);dirty();return}
  const o=optsOf(it),id=gidOf(it),k=o.findIndex(x=>x[0]===S.globals[id]);const nk=clamp((k<0?0:k)+d,0,o.length-1);S.globals[id]=o[nk][0];emit("global:"+id);dirty();return}
 m.i=clamp(m.i+d,0,node.c.length-1);dirty()}
function menuPush(){const m=S.menu,node=menuNode(),it=node.c[m.i];
 if(it.c){m.stack.push(it);m.i=0;emit("menu:"+it.n)}else if(it.info){msg(it.info,2500)}else{m.edit=!m.edit;if(m.edit)emit("menu:item:"+it.n)}dirty()}
function menuExit(){const m=S.menu;if(m.edit){m.edit=false}else if(m.stack.length>1){const prev=m.stack.pop();m.i=Math.max(0,menuNode().c.indexOf(prev))}else S.menu=null;dirty()}

/* ---------- OLED rendering (128x32 panel, drawn at 4x) ---------- */
const OLED=$("#oledBig"),octx=OLED.getContext("2d");
let oledImg="";
function oledLines(){
 if(S.confirm)return {lines:S.confirm.text.split("\n")};
 if(S.msg&&performance.now()<S.msgT)return {lines:S.msg.split("\n")};
 if(S.menu){const m=S.menu,node=menuNode(),it=node.c[m.i];const path=m.stack.map(n=>n.n).join("/");
  if(it.c||it.info)return {lines:[path,"> "+it.n],small:true};
  return {lines:[path,it.n+" :",(m.edit?"[ ":"")+valStr(it)+(m.edit?" ]":"")],small:true,inv:m.edit?2:-1}}
 if(S.userEdit!=null)return {lines:[`User ${S.userEdit+1} scale`,"Toggle notes in the","lowest octave"],small:true};
 if(S.rootSel)return {lines:["Select Root",NN[curPat().root]]};
 if(held("project")){const p=S.ram[S.proj];return {lines:[p.name||`Project ${S.proj+1}`,"Hold + step: load"],small:true}}
 if(S.control)return {lines:[`CTRL ${S.ctrlTrack+1}`,`Ptn ${proj().ctrl.cur+1}`],big:true};
 const t=S.cur,tr=trk(t),mode=isDrum()?"DRUM":tr.mode==="arp"?"ARP "+(t+1):"SEQ "+(t+1);
 const ch=outCh(t);return {lines:[mode,`PORT: USB`,`CHAN: ${ch==null?"OFF":ch+1}`],home:true}}
let oledSig="";
function drawOLED(){const o=oledLines(),W=512,H=128,c=octx;
 const sig=JSON.stringify(o)+(o.home?[S.trans[S.cur].semi,S.trans[S.cur].on,curPat().scale,curPat().root,trk().chordOn].join():"");if(sig===oledSig)return;oledSig=sig;c.fillStyle="#000";c.fillRect(0,0,W,H);c.fillStyle="#e8f4ff";c.textBaseline="top";
 if(o.home){c.font="bold 44px ui-monospace,monospace";c.fillText(o.lines[0],18,36);c.font="22px ui-monospace,monospace";c.fillText(o.lines[1],300,28);c.fillText(o.lines[2],300,62);
  const tr=S.trans[S.cur];if(tr.on){c.font="18px ui-monospace,monospace";c.fillText(`T${tr.semi>0?"+":""}${tr.semi}`,18,92)}
  const p=curPat();if(!isDrum()&&p.scale){c.font="18px ui-monospace,monospace";c.fillText(`${NN[p.root]} ${SCALES[p.scale][0]}`,90,92)}
  if(trk().chordOn){c.font="18px ui-monospace,monospace";c.fillText("CHORD",300,96)}}
 else{const n=o.lines.length,fs=o.small?(n>2?26:30):(n>2?28:36),lh=fs*1.15,y0=(H-lh*n)/2+2;c.font=`${o.big?"bold ":""}${fs}px ui-monospace,monospace`;
  o.lines.forEach((l,i)=>{const w=c.measureText(l).width,x=o.small?12:Math.max(8,(W-w)/2);if(o.inv===i){c.fillRect(x-6,y0+i*lh-2,w+12,lh);c.fillStyle="#000";c.fillText(l,x,y0+i*lh);c.fillStyle="#e8f4ff"}else c.fillText(l,x,y0+i*lh)})}
 const url=OLED.toDataURL();if(url!==oledImg){oledImg=url;const im=document.getElementById("oledSvg");if(im)im.setAttribute("href",url)}}
