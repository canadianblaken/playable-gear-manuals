/* ================= front panel ================= */
const svg=$("#device"),NS="http://www.w3.org/2000/svg",ctlEls={};
function el(tag,a,parent){const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);(parent||svg).appendChild(e);return e}
function txt(x,y,s,a={},parent){const e=el("text",{x,y,"font-size":a.fs||7,"text-anchor":a.anchor||"middle",fill:a.fill||"#333","font-family":"system-ui,sans-serif","font-weight":a.fw||400,"pointer-events":"none"},parent);e.textContent=s;return e}
let dirtyFlag=true;const dirty=()=>{dirtyFlag=true};
function drawPanel(){svg.innerHTML="";
 el("rect",{x:30,y:140,width:1250,height:458,rx:14,fill:"#f1f0ec",stroke:"#cfcdc6"});
 el("path",{d:"M50 172 H665 V256 H50 Z",fill:"#121214"});
 el("rect",{x:50,y:256,width:198,height:92,fill:"#d8d7d3"});el("rect",{x:255,y:256,width:96,height:92,fill:"#e4e3df"});
 [357,434,511,588].forEach((x,t)=>{el("rect",{x,y:188,width:76,height:6,fill:TCOL[t]});el("rect",{x,y:256,width:76,height:92,fill:TCOL[t],opacity:.92})});
 txt(60,190,"KEYSTEP PRO",{fs:13,anchor:"start",fill:"#fff",fw:700});txt(60,200,"Controller & Sequencer",{fs:6,anchor:"start",fill:"#bbb"});
 txt(1188,197,"ARTURIA",{fs:15,fill:"#222",fw:600});
 txt(99,250,"Tempo / Fine",{fs:6,fill:"#ccc"});txt(202,250,"Swing / Offset",{fs:6,fill:"#ccc"});
 txt(1162,237,"Extend",{fs:6,fill:"#2f6fd6"});
 el("image",{id:"oledSvg",x:258,y:208,width:54,height:30,preserveAspectRatio:"none"});
 /* 7-seg track displays */
 [378,455,532,609].forEach((x,t)=>{el("rect",{x,y:212,width:34,height:23,rx:2,fill:"#000"});const e=txt(x+17,231,"1",{fs:17,fill:"#fff",fw:600});e.id="seg"+t;e.setAttribute("font-family","ui-monospace,monospace")});
 /* key groups and shift labels above the keyboard */
 KEYGRP.forEach(([a,b,n])=>{const x0=keyX(a)-10,x1=keyX(b)+10;el("line",{x1:x0,x2:x1,y1:351,y2:351,stroke:"#2f6fd6","stroke-width":.6});txt(x0,349,n,{fs:5.5,anchor:"start",fill:"#2f6fd6"})});
 for(let k=0;k<37;k++){txt(keyX(k),362,KEYFN[k],{fs:5.2,fill:"#2f6fd6"});const d=el("circle",{cx:keyX(k),cy:372,r:2.6,fill:"#ccc"});d.id="kled"+k}
 /* octave leds */
 [-2,-1,0,1,2].forEach((o,i)=>{txt(86+i*17,350,o>0?"+"+o:String(o),{fs:5.5});const d=el("circle",{cx:86+i*17,cy:358,r:2.4,fill:"#ccc"});d.id="oled_"+i});
 txt(119,371,"Octave",{fs:6});txt(119,398,"Reset",{fs:5.5,fill:"#2f6fd6"});
 for(let r=0;r<4;r++)for(let c=0;c<6;c++)el("circle",{cx:196+c*4,cy:366+r*4,r:1,fill:"#777"});
 /* strip leds */
 ["pb","md"].forEach((s,j)=>{for(let i=0;i<9;i++){const d=el("circle",{cx:j?183:55,cy:412+i*14,r:2,fill:"#ccc"});d.id=s+"led"+i}});
 C.forEach(drawCtl);
}
function drawCtl(c){const g=el("g",{class:"ctl","data-id":c.id,tabindex:-1});ctlEls[c.id]=g;
 if(c.t==="knob"){if(c.ring)for(let i=0;i<15;i++){const a=(-135+i*270/14)*Math.PI/180;el("circle",{cx:c.cx+Math.sin(a)*(c.r+7),cy:c.cy-Math.cos(a)*(c.r+7),r:1.9,fill:"#3a1010",class:"ring"},g)}
  el("circle",{cx:c.cx,cy:c.cy,r:c.r,fill:"#26272b",stroke:"#555","stroke-width":1.5,class:"face"},g);el("line",{x1:c.cx,y1:c.cy-c.r+3,x2:c.cx,y2:c.cy-c.r+9,stroke:"#ddd","stroke-width":2,class:"ptr"},g);
  if(c.label&&c.ring)txt(c.cx,c.cy+c.r+19,c.label,{fs:6.2},g)}
 else if(c.t==="key"){el("rect",{x:c.x+.4,y:c.y,width:c.w-.8,height:c.h,rx:2,fill:c.black?"#1b1b1d":"#fdfdfb",stroke:"#999","stroke-width":.6,class:"face"},g);if(c.black)g.dataset.black=1}
 else if(c.t==="strip"){el("rect",{x:c.x+4,y:c.y,width:c.w-8,height:c.h,rx:4,fill:"#fafaf8",stroke:"#bbb",class:"face"},g);if(c.id==="pbend")el("line",{x1:c.x+16,x2:c.x+c.w-16,y1:c.y+c.h/2,y2:c.y+c.h/2,stroke:"#333"},g);
  txt(c.x+c.w/2,c.y+10,"↑",{fs:7},g);txt(c.x+c.w/2,c.y+c.h-4,"↓",{fs:7},g)}
 else if(c.t==="looper"){el("rect",{x:c.x,y:c.y,width:c.w,height:c.h,rx:4,fill:"#f4f4f2",stroke:"#bbb",class:"face"},g);["1/4","1/8","1/16","1/32"].forEach((l,i)=>txt(c.x+c.w/8*(2*i+1),c.y+16,l,{fs:6,fill:"#999"},g))}
 else{const dark=["shift"].includes(c.id),big=c.t==="step"||["shift","rec","stop","play","tap"].includes(c.id);
  el("rect",{x:c.x,y:c.y,width:c.w,height:c.h,rx:big?4:3,fill:dark?"#1e1e22":"#e9e9e6",stroke:"#8d8d8a","stroke-width":1,class:"face"},g);
  el("rect",{x:c.x+2,y:c.y+2,width:c.w-4,height:c.h-4,rx:2,fill:"transparent",class:"lamp"},g);
  const lines=String(c.label).split("\n");lines.forEach((l,i)=>txt(c.x+c.w/2,c.y+c.h/2+(i-(lines.length-1)/2)*7.5+2.4,l,{fs:c.t==="step"?8:big?(c.id==="tap"?6.5:8):6,fill:dark?"#5aa0ff":"#222",fw:c.t==="step"?600:400},g).classList.add("lbl"));
  if(c.sec){txt(c.x+c.w/2,c.y+c.h+(c.t==="step"?9:7),c.sec,{fs:c.t==="step"?5.6:5.6,fill:"#2f6fd6"},g)}
  if(/^t\dmute$/.test(c.id)){const t=+c.id[1];const n=el("rect",{x:[373,450,527,603][t],y:299,width:12,height:7,rx:1.5,fill:"#555"});n.id="note"+t;txt([379,456,533,609][t],313,"Note",{fs:5.5,fill:"#222"})}}
}

/* ---------- LEDs ---------- */
const setA=(e,k,v)=>{if(e&&e.getAttribute(k)!==String(v))e.setAttribute(k,v)};
const lamp=(id,col)=>{const g=ctlEls[id];if(!g)return;const l=g.querySelector(".lamp");setA(l,"fill",col||"transparent")};
const blink=(ms=500)=>Math.floor(performance.now()/ms)%2===0;
const dim=(hex,a=.35)=>hex+Math.round(a*255).toString(16).padStart(2,"0");
function render(){
 const n=now(),t=S.cur,col=TCOL[t],pat=curPat(),dr=isDrum(),tr=trk();
 /* steps */
 const v=S.view[dr?4:t],play=S.playIdx&&S.playIdx[t];
 for(let i=0;i<16;i++){const idx=v*16+i;let c=null;
  if(held("project"))c=i===S.proj?"#ffffff":S.ram[i].tracks.some((x,j)=>x.pats.some(p=>p.valid))||S.flash[i].tracks.some(x=>x.valid)?dim("#3b82f6",.6):null;
  else if(held("pattern")||S.patMode&&!S.patMode.scene||held("save")&&!held("scene")){const cur=patIdx();c=i===cur?col:patDirty(t,i)?"#ef4444":patHasContent(t,i)?"#3b82f6":null;if(S.patMode&&blink(300)&&c)c=dim(c.slice(0,7),.4)}
  else if(held("scene")||S.patMode&&S.patMode.scene)c=proj().scenes[i]?(i===S.sceneCur?"#ffffff":"#3b82f6"):null;
  else if(held("chain")){const ch=dr?proj().drum.chain:tr.chain;c=ch.includes(i)?(blink(250)?col:null):null}
  else if(S.control){const cp=proj().ctrl.pats[proj().ctrl.cur];c=cp.st[idx].cc.some(x=>x!=null)?col:null;if(idx>=cp.len)c=null;if(S.sel===idx&&blink(250))c="#fff"}
  else if(dr){const lane=pat.lanes[S.lane],st=lane.st[idx],len=pat.poly?lane.len:pat.len;c=idx<len&&st.on?col:null;if(S.stepEdit&&S.sel===idx&&blink(250))c="#fff"}
  else{const st=pat.st[idx];c=idx<pat.len?(st.on&&st.n.length?(st.skip.every(x=>x)?dim(col,.3):col):null):null;
   if(S.stepEdit&&S.sel===idx&&blink(250))c="#fff";if(S.rec==="step"&&S.stepRecPos===idx&&blink(250))c="#fff"}
  if(S.playing&&!S.paused&&play&&play.idx===idx&&!held("project")&&!held("pattern")&&!held("scene")&&!S.control)c="#ffffff";
  if(held("shift")&&c&&c.length===7)c=dim(c,.35);
  if(S.confirm&&S.confirm.kind==="save")c=null;
  if(PADS.mode)c=padStepLight(i);
  lamp("s"+i,c)}
 /* key LEDs */
 const kled=Array(37).fill(null),base=48+12*tr.oct;
 if(held("shift")){const on=[pat.dir,pat.poly?4:3,5+(pat.arp||0),12+(pat.arpOct||0),17+(pat.div),pat.trip?21:-1];if(!dr){const sk=Object.entries(KEYSCALE).find(([k,s])=>s===pat.scale);if(sk)on.push(+sk[0])}
  [0,1,2,3].forEach(c=>{if(S.cvr[t]>>c&1)on.push(32+c)});on.forEach(k=>{if(k>=0)kled[k]="#3b82f6"})}
 else if(S.rootSel){kled[curPat().root]="#3b82f6"}
 else if(S.userEdit!=null){const m=proj().user[S.userEdit];for(let k=0;k<12;k++)kled[k]=m>>k&1?"#3b82f6":null}
 else if(held("tap")){kled[17+Math.floor(S.globals[116]/2)]="#3b82f6";if(S.globals[116]%2)kled[21]="#3b82f6"}
 else if(dr){for(let l=0;l<24;l++){if(pat.lanes[l].st.some(s=>s.on))kled[l]=dim(col,.35);if(S.drumMute[l])kled[l]="#ef4444"}kled[S.lane]=col}
 else if((S.stepEdit&&S.sel!=null)||heldStep()!=null){const st=pat.st[S.stepEdit&&S.sel!=null?S.sel:v*16+heldStep()];st.n.forEach(nt=>{const k=nt.p-base;if(k>=0&&k<37)kled[k]=col})}
 for(const f of NOTEFLASH){if(f.t0>n||f.t1<n)continue;if(f.drum!=null){if(dr&&f.drum<37)kled[f.drum]="#ffffff";continue}if(f.t!==t)continue;const k=f.midi-base;if(k>=0&&k<37)kled[k]=TCOL[f.t]}
 for(const [k] of S.keysDown){if(!kled[k])kled[k]=col}
 padLights(kled,t,base,dr,col);
 for(let k=0;k<37;k++)setA($("#kled"+k),"fill",kled[k]||"#d6d6d2");
 /* buttons */
 lamp("play",S.playing?(S.paused?(blink()?"#22c55e":null):"#22c55e"):null);lamp("rec",S.rec?(S.rec==="step"&&blink()?null:"#ef4444"):null);lamp("stop",null);
 lamp("shift",held("shift")?"#2f6fd6":null);lamp("stepedit",S.stepEdit?"#ffffff":null);lamp("overdub",S.overdub?"#ef4444":null);
 lamp("hold",S.hold[t]?col:null);lamp("trans",S.transMode?(blink(300)?"#fff":null):S.trans[t].on?(S.globals[153]===0&&blink()?null:col):null);
 lamp("tie",tr.chordOn?(blink(1000)?col:null):null);lamp("control",S.control?"#ffffff":null);
 lamp("pattern",(dr?proj().drum.chain:tr.chain).length>1?null:"#ffffff");lamp("chain",(dr?proj().drum.chain:tr.chain).length>1?"#ffffff":null);lamp("scene",S.sceneCur>=0?dim("#ffffff",.5):null);
 lamp("exit",S.undo&&blink(700)?"#ffffff":null);lamp("lst",S.follow?dim("#ffffff",.5):null);
 for(let p=0;p<4;p++){const len=dr&&pat.poly?pat.lanes[S.lane].len:pat.len;let c=p*16<len?dim(col,.4):null;if(S.playing&&play&&Math.floor(play.idx/16)===p)c=col;if(p===v&&!S.follow)c="#ffffff";lamp("pg"+p,c)}
 for(let i=0;i<4;i++){const ti=trk(i);const ci=TCOL[i];
  lamp(`t${i}trk`,S.control&&S.ctrlTrack===i?(blink(800)?"#fff":null):i===t?"#ffffff":S.tgroup.has(i)?dim("#ffffff",.6):null);
  lamp(`t${i}seq`,ti.mode==="seq"?(i===t?"#fff":dim("#ffffff",.45)):null);lamp(`t${i}alt`,ti.mode!=="seq"?(i===t?"#fff":dim("#ffffff",.45)):null);
  lamp(`t${i}mute`,S.solo===i?"#3b82f6":S.mute[i]?"#ef4444":(i===0&&S.drumMute.some(x=>x)&&blink()?"#ef4444":null));
  const act=NOTEFLASH.some(f=>(f.t===i||(i===0&&f.drum!=null))&&f.t0<=n&&f.t1>=n)||(i===t&&S.keysDown.size);setA($("#note"+i),"fill",act?"#ff4040":"#5a1a1a");
  const seg=$("#seg"+i),pi=i===0&&isDrum(0)?proj().drum.cur:ti.cur;seg.textContent=S.control&&S.ctrlTrack===i?"--":String(pi+1);
  const pend=P[i].pend;if(pend!=null&&blink(250))seg.textContent=String(pend+1)}
 /* octave leds */
 for(let i=0;i<5;i++){const o=tr.oct;setA($("#oled_"+i),"fill",(o===i-2||(o===-3&&i===0&&blink()))?"#ef4444":"#d6d6d2")}
 /* encoder rings */
 const vals=encFracs();for(let i=0;i<5;i++){const rings=ctlEls["enc"+i].querySelectorAll(".ring"),f=vals[i];rings.forEach((r,k)=>setA(r,"fill",f==null?"#3a1010":(k/14<=f?"#ff3030":"#3a1010")))}
 /* strips */
 const pb=Math.round((BEND/2+1)*4),md=Math.round(S.mod[t]/127*8);for(let i=0;i<9;i++){setA($("#pbled"+i),"fill",8-i===pb?"#ef4444":"#d6d6d2");setA($("#mdled"+i),"fill",8-i<=md&&md>0?"#ef4444":"#d6d6d2")}
 drawOLED();
 $("#ledInfo").innerHTML=statusLine()}
function statusLine(){const p=curPat(),pr=proj();return `<b>${pr.name||"Project "+(S.proj+1)}</b> · ${bpm().toFixed(2)} BPM${S.globalBpm?" (global)":""} · swing ${pr.swing}% · ${TNAME[S.cur]} pattern ${patIdx()+1} · ${isDrum()?"drum lane "+(S.lane+1):`${NN[p.root]} ${SCALES[p.scale][0]}`} · ${DIVS[p.div][0]}${p.trip?"T":""} · len ${p.len}${S.waitLoad?" · wait load":""}`}
const heldStep=()=>{for(const [id] of HELD){const m=id.match(/^s(\d+)$/);if(m)return +m[1]}return null};
const heldSteps=()=>[...HELD.keys()].filter(id=>/^s\d+$/.test(id)).map(id=>+id.slice(1));

/* ---------- encoder values ---------- */
/* gate: stored value 0-127 -> length in steps, measured on a KeyStep Pro over USB MIDI (2026-10-20, all 128 values, within 2 ms):
   0-7 in 1/16 steps (1/16..1/2), 8-27 in 1/8 (..3), 28-47 in 1/4 (..8), 48-95 in 1/2 (..32), 96-127 in whole steps (..64) */
const gateSteps=raw=>{const g=clamp(Math.round(raw),0,127);return g<=7?(g+1)/16:g<=27?.5+(g-7)/8:g<=47?3+(g-27)/4:g<=95?8+(g-47)/2:32+(g-95)};
const G=gateSteps,Graw=st=>{let best=0;for(let g=1;g<128;g++)if(Math.abs(gateSteps(g)-st)<Math.abs(gateSteps(best)-st))best=g;return best};
/* "1 1/2 steps", "1/16 step" */
const gateText=raw=>{const st=gateSteps(raw),w=Math.floor(st),n=Math.round((st-w)*16),gcd=(a,b)=>b?gcd(b,a%b):a,d=n?gcd(n,16):1;
 return `${w?w:""}${w&&n?" ":""}${n?`${n/d}/${16/d}`:""} step${st>1?"s":""}`};
function encTarget(){// what the five encoders edit right now
 if(S.control)return {kind:"cc"};const t=S.cur;
 if(isDrum()){const pat=curPat(),hs=heldStep();const idx=S.stepEdit&&S.sel!=null?S.sel:hs!=null?S.view[4]*16+hs:null;if(idx!=null)return {kind:"dstep",st:pat.lanes[S.lane].st[idx]};return {kind:"def",d:S.drumDefs}}
 if(trk().mode==="arp")return {kind:"arp",a:S.arpP[t]};
 const hs=heldStep(),pat=curPat(),idx=S.stepEdit&&S.sel!=null?S.sel:hs!=null?S.view[t]*16+hs:null;
 if(idx!=null){const st=pat.st[idx];const notes=S.selNotes&&S.selNotes.size?st.n.filter(x=>S.selNotes.has(x.p)):st.n;return {kind:"step",st,notes,idx}}
 return {kind:"def",d:S.defs[t]}}
function encFracs(){const e=encTarget();const fr=o=>[o.p!=null?o.p/127:null,Graw(o.g)/127,o.v/127,(o.t+49)/99,o.r/100];
 if(e.kind==="cc")return S.cc.map(v=>v/127);if(e.kind==="def")return fr(e.d);if(e.kind==="dstep")return [null,...fr(e.st).slice(1)];
 if(e.kind==="arp")return [null,Graw(e.a.g)/127,(e.a.vo+127)/254,(e.a.t+49)/99,e.a.r/100];
 if(e.kind==="step"&&e.notes.length)return fr(e.notes[0]);return [null,null,null,null,null]}
function encShow(i){const e=encTarget(),n=e.kind==="step"&&e.notes.length?e.notes[0]:e.kind==="dstep"?e.st:e.kind==="def"?e.d:null;
 if(e.kind==="cc"){const l=knobLabel(i);msg(`${l?l.slice(0,18):"Knob "+(i+1)}\nCC${S.globals[28+i]} ${knobValue(i,S.cc[i])}`);return}
 if(e.kind==="arp"){const a=e.a;msg([null,`Gate Length\n${a.g.toFixed(2)}`,`Velocity\n${a.vo>0?"+":""}${a.vo}`,`Time Shift\n${a.t}%`,`Randomness\n${a.r}%`][i]||"Pitch\n(no effect in Arp)");return}
 if(!n){msg("Step\nempty");return}
 msg([`Pitch\n${e.kind==="step"?e.notes.map(x=>nm(x.p)).join(" "):nm(n.p)}`,`Gate Length\n${gateText(Graw(n.g))}`,`Velocity\n${n.v}`,`Time Shift\n${n.t>0?"+":""}${n.t}%`,`Randomness\n${n.r}%`][i])}
function turnEnc(i,d){for(const h of HELD.values())h.used=true;const t=S.cur;
 if(S.control){S.cc[i]=clamp(S.cc[i]+d,0,127);midiCC(i,S.cc[i]);const cp=proj().ctrl.pats[proj().ctrl.cur];
  if(held("erase")){if(S.stepEdit&&S.sel!=null)cp.st[S.sel].cc[i]=null;else cp.st.forEach(s=>s.cc[i]=null);msg("Automation\nErased")}
  else if(S.stepEdit&&S.sel!=null){cp.st[S.sel].cc[i]=S.cc[i];cp.valid=true;emit("cc:step")}
  else if(S.rec&&S.playing){const k=(P[4].idx-1+cp.len)%cp.len;for(let j=k;j<cp.len;j++)cp.st[j].cc[i]=S.cc[i];cp.valid=true}
  encShow(i);emit("cc");dirty();return}
 if(held("shift")){const pat=curPat();snapshotUndo();const name=["Pitch","Gate","Velocity","Time Shift","Randomness"][i];
  S.offs=S.offs||[0,0,0,0,0];S.offs[i]+=d;
  if(isDrum()){if(i)pat.lanes.forEach(l=>l.st.forEach(s=>{if(s.on)edit(s,i,d)}))}else pat.st.forEach(s=>s.n.forEach(nt=>edit(nt,i,d,t)));
  pat.valid=true;msg(`${name} Offset\n${S.offs[i]>0?"+":""}${S.offs[i]}${i===0?" semi":""}`);emit("enc:"+"enc"+i);dirty();return}
 const e=encTarget();
 if(e.kind==="arp"){const a=e.a;if(i===1)a.g=G(Graw(a.g)+d);if(i===2)a.vo=clamp(a.vo+d,-127,127);if(i===3)a.t=clamp(a.t+d,-49,50);if(i===4)a.r=clamp(a.r+d,0,100)}
 else if(e.kind==="step"){e.notes.forEach(nt=>edit(nt,i,d,t));curPat().valid=true}
 else if(e.kind==="dstep"){if(i)edit(e.st,i,d);curPat().valid=true}
 else edit(e.d,i,d,t);
 encShow(i);emit("enc:enc"+i);dirty()}
function edit(o,i,d,t){if(i===0)o.p=t!=null?scaleStep(t,o.p,d):clamp(o.p+d,0,127);if(i===1)o.g=G(Graw(o.g)+d);if(i===2)o.v=clamp(o.v+d,0,127);if(i===3)o.t=clamp(o.t+d,-49,50);if(i===4)o.r=clamp(o.r+d,0,100)}

/* ---------- keyboard ---------- */
const keyMidi=k=>48+k+12*trk().oct;
function keyDown(k,vel=100){for(const h of HELD.values())h.used=true;const t=S.cur,tr=trk();
 if(padKey(k))return;
 if(held("shift")&&!S.chordEntry){keyShift(k);return}
 if(held("tap")&&k>=17&&k<=21){const cur=S.globals[116];S.globals[116]=k===21?(cur%2?cur-1:cur+1):(k-17)*2;msg(`Metronome\n${["1/4","1/4 T","1/8","1/8 T","1/16","1/16 T","1/32","1/32 T"][S.globals[116]]}`);dirty();return}
 if(S.rootSel){if(k<12){curPat().root=k;curPat().valid=true;msg(`Root\n${NN[k]}`);emit("root:"+k);S.rootChosen=true;if(!held("k29"))S.rootSel=false}dirty();return}
 if(S.userEdit!=null){if(k<12){proj().user[S.userEdit]^=1<<k;if(!proj().user[S.userEdit])proj().user[S.userEdit]=1;mapCache.clear();msg(`User ${S.userEdit+1}\n${maskIv(proj().user[S.userEdit]).map(i=>NN[i]).join(" ")}`)}dirty();return}
 if(held("trans")||S.transMode){S.transUsed=true;setTranspose(keyMidi(k)-60-12*0);return}
 const tracksHeld=[...HELD.keys()].filter(id=>/^t\dtrk$/.test(id)).map(id=>+id[1]);
 if(tracksHeld.length>=2){S.split={up:tracksHeld[0],lo:tracksHeld[1],pt:keyMidi(k)};msg(`Split at ${nm(keyMidi(k))}\nT${tracksHeld[0]+1} up / T${tracksHeld[1]+1} low`);emit("split");dirty();return}
 if(isDrum()){if(k>=24)return;if(held("t0alt")){S.lane=k;msg(`Drum ${k+1}\nselected`);emit("drum:lane:"+k);dirty();return}
  if(held("t0mute")||S.drumMuteMode){S.drumMute[k]=S.drumMute[k]?0:1;dirty();return}
  S.lane=k;drum(k,vel,now());midiDrum(k,vel,now(),now()+.1);S.keysDown.set(k,{});emit("drum:lane:"+k);
  if(S.rec==="rt"&&S.playing){const pat=curPat(),last=S.playIdx&&S.playIdx[0];if(last){const dur=stepDur(pat),rel=(now()-last.time)/dur,kk=Math.round(rel),idx=((last.idx+kk)%pat.len+pat.len)%pat.len,st=pat.lanes[k].st[idx];
   Object.assign(st,{on:true,v:S.globals[fvId(0)]?S.drumDefs.v:vel,g:S.drumDefs.g,t:S.quant?0:clamp(Math.round((rel-kk)*100),-49,50),r:S.drumDefs.r});pat.valid=true;emit("recnote")}}
  dirty();return}
 let note=keyMidi(k);S.lastNote=note;
 if(S.split&&(S.split.up===t||S.split.lo===t)){const tt=note>=S.split.pt?S.split.up:S.split.lo;if(tt!==t){const qn=q(tt,note);S.keysDown.set(k,{v:[liveOn(tt,qn,vel)],tt,notes:[qn]});midiOn(tt,qn,vel);dirty();return}}
 if(S.chordEntry){S.chordEntry.notes.push(note);const v2=liveOn(t,note,vel);S.keysDown.set(k,{v:[v2],notes:[note]});midiOn(t,note,vel);dirty();return}
 /* filling a step: quick edit (step held), step edit (selected step), step record (cursor) */
 const hs=heldStep();
 const target=hs!=null&&!S.control?S.view[t]*16+hs:S.stepEdit&&S.sel!=null&&!S.control?S.sel:S.rec==="step"?S.stepRecPos:null;
 const outNotes=liveNotes(t,note);
 if(target!=null&&tr.mode==="seq"){const pat=curPat(),st=pat.st[target];S.fillGesture=S.fillGesture||new Set();
  if(!S.fillGesture.has(target)){S.fillGesture.add(target);snapshotUndo();if(!S.overdub)st.n=[]}
  for(const pn of outNotes){if(st.n.length>=16){msg("16 notes limit in\na step reached");break}if(!pat.poly)st.n=[];if(!st.n.some(x=>x.p===pn))st.n.push(noteFromDefaults(t,pn,vel))}
  if(S.overdub&&!S.stepEdit)S.selNotes=new Set(outNotes);
  st.on=true;pat.valid=true;emit(S.rec==="step"?"steprec:note":hs!=null?"quick:fill":"stepedit:fill")}
 if(tr.mode==="arp"){const list=S.hold[t]?S.arpLatched[t]:S.arpHeld[t];
  if(S.hold[t]&&S.keysDown.size===0&&!S.arpAdding)S.arpLatched[t]=[];S.arpAdding=true;
  const L2=S.hold[t]?S.arpLatched[t]:S.arpHeld[t];for(const pn of outNotes){if(L2.length>=16){msg("16 notes limit in\nan Arp reached");break}L2.push({p:pn,v:vel})}
  S.keysDown.set(k,{arp:outNotes});emit("arp:note");emit("arp:note:"+t);if(trk().chordOn)emit("chord:play");dirty();return}
 const vs=outNotes.map(pn=>liveOn(t,pn,S.globals[fvId(t)]?S.defs[t].v:vel));outNotes.forEach(pn=>midiOn(t,pn,vel));
 const rec=S.rec==="rt"&&S.playing&&tr.mode==="seq"?outNotes.map(pn=>recordNote(t,pn,vel,now())):null;
 S.keysDown.set(k,{v:vs,notes:outNotes,rec,t0:now()});if(tr.chordOn)emit("chord:play");
 if(target==null&&!held("shift"))nsShow([...S.keysDown.values()].filter(kd=>kd.tt==null).flatMap(kd=>kd.notes||[]));dirty()}
function liveNotes(t,note){const tr=trk(t),base=q(t,note);if(!tr.chordOn||tr.chord.root==null)return [base];
 return [base,...tr.chord.off.map(o=>q(t,base+o))].filter((x,i,a)=>a.indexOf(x)===i)}
function keyUp(k){const t=S.cur,kd=S.keysDown.get(k);S.keysDown.delete(k);
 if(kd){(kd.v||[]).forEach(liveOff);(kd.notes||[]).forEach(pn=>midiOff(kd.tt!=null?kd.tt:t,pn));
  if(kd.arp&&!S.hold[t]){S.arpHeld[t]=S.arpHeld[t].filter(x=>!kd.arp.includes(x.p))}
  if(kd.rec){const pat=curPat(),dur=stepDur(pat);kd.rec.forEach(r=>{if(r)r.n.g=clamp((now()-r.time)/dur,.06,64)})}}
 if(S.keysDown.size===0){S.arpAdding=false;
  if(S.rec==="step"&&S.fillGesture&&S.fillGesture.size){S.stepRecPos=(S.stepRecPos+1)%curPat().len}
  S.fillGesture=null;if(S.chordEntry)chordEntryCheck()}
 dirty()}
function keyShift(k){const pat=curPat(),t=S.cur,f=KEYFN[k];S.shiftUsed=true;pat.valid=true;
 if(k<=2){pat.dir=k;msg(`Seq Pattern\n${SEQDIRS[k]}`);emit("seqdir:"+k)}
 else if(k<=4){pat.poly=k===4;msg(isDrum()?`Drum Mode\n${k===4?"Poly":"Mono"}`:`Seq Mode\n${k===4?"Poly":"Mono"}`);emit("poly:"+pat.poly)}
 else if(k<=11){if(isDrum())return;pat.arp=k-5;msg(`Arp Pattern\n${ARPS[k-5]}`);emit("arpmode:"+ARPS[k-5])}
 else if(k<=16){if(isDrum())return;pat.arpOct=k-12;msg(`Arp Octave\n${f}`);emit("arpoct:"+(k-13))}
 else if(k<=20){pat.div=k-17;msg(`Time Division\n${DIVS[pat.div][0]}${pat.trip?" T":""}`);emit(`div:${t}:${pat.div}`)}
 else if(k===21){pat.trip=!pat.trip;msg(`Time Division\n${DIVS[pat.div][0]}${pat.trip?" T":""}`);emit("trip")}
 else if(KEYSCALE[k]!=null){if(isDrum())return;pat.scale=KEYSCALE[k];msg(`Scale\n${SCALES[pat.scale][0]}`);emit("scale:"+pat.scale);
  if(k===30||k===31){S.userEdit=k-30;msg(`User ${k-29} scale\nedit: lowest octave`,1800)}}
 else if(k===29){if(isDrum())return;S.rootSel=true;S.rootChosen=false;emit("rootsel")}
 else if(k>=32&&k<=35){const b=1<<(k-32);S.cvr.forEach((m,i)=>{if(i!==t&&m&b)S.cvr[i]&=~b});S.cvr[t]^=b;msg(`CV Routing\nVoices ${[0,1,2,3].filter(i=>S.cvr[t]>>i&1).map(i=>i+1).join(" ")||"-"}`)}
 dirty()}
function chordEntryCheck(){if(!S.chordEntry||held("shift")||held("tie")||S.keysDown.size)return;const n=S.chordEntry.notes,tr=trk();S.chordEntry=null;
 if(n.length){tr.chord={root:n[0],off:n.slice(1).map(x=>x-n[0])};tr.chordOn=true;tr.valid=true;msg(`Chord\n${n.map(nm).join(" ")}`);emit("chord:stored")}
 else{tr.chordOn=!tr.chordOn&&tr.chord.root!=null;msg(tr.chordOn?"Chord\nON":"Chord\nOFF");emit(tr.chordOn?"chord:on":"chord:off")}dirty()}

/* ---------- button dispatch ---------- */
function down(id){const t=S.cur;for(const h of HELD.values())h.used=true;HELD.set(id,{t0:performance.now(),used:false});ensureAC();
 if(padDown(id))return;
 let m;
 if((m=id.match(/^k(\d+)$/))){keyDown(+m[1],S.padVel||100);S.padVel=null;return}
 if((m=id.match(/^s(\d+)$/))){stepDown(+m[1]);return}
 if((m=id.match(/^pg(\d)$/))){pageDown(+m[1]);return}
 if((m=id.match(/^t(\d)(dn|up|seq|alt|mute|trk)$/))){trackDown(+m[1],m[2]);return}
 if(/^enc\d$/.test(id)){encShow(+id[3]);return}
 switch(id){
  case "shift":if(held("project")){S.confirm={text:"Load Project\nfrom FLASH",fn:recallProject,kind:"recall"};HELD.get("project").used=true}break;
  case "play":if(held("shift"))restart();else if(held("rec")){HELD.get("rec").used=true;S.rec="rt";S.recTouched=new Set();if(!S.playing||S.paused)play();emit("rec:rt")}else play();break;
  case "rec":if(held("shift")){S.quant=!S.quant;msg(S.quant?"Quantize\nON":"Quantize\nOFF");HELD.get("rec").used=true}
   else if(S.playing&&!S.paused){S.rec=S.rec==="rt"?false:"rt";S.recTouched=new Set();emit(S.rec?"rec:rt":"rec:off");HELD.get("rec").used=true}break;
  case "stop":if(S.rec==="step")S.rec=false;stop();break;
  case "tap":if(held("shift")){S.metro=!S.metro;msg(S.metro?"Metronome\nON":"Metronome\nOFF")}else{const tn=performance.now();S.taps=S.taps.filter(x=>tn-x<2000).slice(-7);S.taps.push(tn);
   if(S.taps.length>=2){const iv=(S.taps[S.taps.length-1]-S.taps[0])/(S.taps.length-1);const b=clamp(60000/iv,30,240);if(S.globalBpm)S.gbpm=b;else proj().bpm=Math.round(b*100)/100;msg(`${bpm().toFixed(2)} BPM`)}}break;
  case "project":if(held("shift")){openMenu(MENU());emit("utility:open")}
   else if(held("save")){HELD.get("save").used=true;S.confirm={text:`Save Project ${S.proj+1}\nConfirm ?`,fn:saveProject,kind:"save"};emit("save:project:ask")}
   else if(held("copy")){HELD.get("copy").used=true;const d=(S.proj+1)%16;S.confirm={text:`Copy Project\nfrom ${S.proj+1} to ${d+1}\nConfirm ?`,fn:copyProject,kind:"copy"}}
   else if(held("erase")){HELD.get("erase").used=true;S.confirm={text:`Erase Project ${S.proj+1}\nConfirm ?`,fn:eraseProject,kind:"erase"}}break;
  case "exit":if(held("shift"))doUndo();else if(S.confirm){S.confirm=null;msg("Cancelled",700)}else if(S.menu)menuExit();else{S.userEdit=null;S.rootSel=false;S.patMode=null;S.drumMuteMode=false;S.transMode=false}break;
  case "save":if(held("shift")){const i=patIdx();const fl=S.flash[S.proj];if(isDrum())proj().drum.pats[i]=deep(fl.drum.pats[i]);else trk().pats[i]=deep(fl.tracks[t].pats[i]);msg("Pattern\nReloaded");HELD.get("shift").used=true}break;
  case "pattern":case "scene":{const sc=id==="scene";if(held("copy"))S.patMode={op:"copy",scene:sc};else if(held("paste"))S.patMode={op:"paste",scene:sc};else if(held("erase"))S.patMode={op:"erase",scene:sc};else if(held("save"))S.patMode={op:"save",scene:sc};
   if(S.patMode)msg(`Select ${sc?"Scene":"Pattern"}\nto ${S.patMode.op[0].toUpperCase()+S.patMode.op.slice(1)}\nPress Exit to Cancel`,2500);break}
  case "chain":S.chainBuild={t,list:[]};break;
  case "control":S.control=!S.control;S.ctrlTrack=t;S.sel=null;emit(S.control?"control:on":"control:off");msg(S.control?"Control\nmode":"Control\nOFF");break;
  case "stepedit":S.stepEdit=!S.stepEdit;S.sel=null;S.selNotes=null;emit(S.stepEdit?"stepedit:on":"stepedit:off");break;
  case "overdub":S.overdub=!S.overdub;S.selNotes=null;break;
  case "lst":if(held("shift")){S.follow=!S.follow;msg(S.follow?"Follow\nON":"Follow\nOFF")}break;
  case "octdn":case "octup":{const tr=trk();if(held(id==="octdn"?"octup":"octdn")){tr.oct=0;msg("Octave\n0")}else{tr.oct=clamp(tr.oct+(id==="octup"?1:-1),-3,2);msg(`Octave\n${tr.oct>0?"+":""}${tr.oct}`)}emit("oct");break}
  case "hold":if(held("shift")){S.hold=[0,0,0,0];S.arpLatched=[[],[],[],[]];msg("Arps\nCleared")}else{S.hold[t]=S.hold[t]?0:1;if(S.hold[t])S.arpLatched[t]=S.arpHeld[t].slice();else S.arpLatched[t]=[];emit(S.hold[t]?"hold:on":"hold:off")}break;
  case "trans":S.transUsed=false;if(held("shift")){S.trans.forEach(x=>{x.on=false;x.semi=0});S.tgroup.clear();S.transMode=false;msg("Transpose\nCleared");emit("trans:clear");S.transUsed=true}
   else if(held("erase")){S.tgroup.clear();msg("Transpose group\ndeleted");S.transUsed=true}
   else if(S.globals[153]===0){S.transMode=!S.transMode;S.transUsed=true;msg(S.transMode?"Transpose\nlatched":"Transpose\nmode off")}
   else{const tr=S.trans[t];msg(`Track ${t+1}\n${tr.semi?(tr.semi>0?"+":"")+tr.semi+" semi":"No Transposition"}`)}break;
  case "tie":if(held("shift")){S.chordEntry={notes:[]};HELD.get("shift").used=true;msg("Chord\nPlay notes");emit("chord:entry")}else tieDown();break;
  case "pbend":case "modw":case "looper":break;
 }
 dirty()}
function up(id){if(padUp(id))return;const h=HELD.get(id);HELD.delete(id);if(!h)return;let m;
 if((m=id.match(/^k(\d+)$/))){keyUp(+m[1]);if(+m[1]===29&&S.rootSel&&S.rootChosen)S.rootSel=false;dirty();return}
 if((m=id.match(/^s(\d+)$/))){stepUp(+m[1],h);return}
 if((m=id.match(/^t(\d)(mute|trk)$/))){if(m[2]==="mute"&&!h.used&&!h.sh){const t=+m[1];S.mute[t]=S.mute[t]?0:1;if(S.solo===t){S.solo=-1}emit("mute:"+t)}dirty();return}
 switch(id){
  case "rec":if(!h.used&&!S.playing){S.rec=S.rec==="step"?false:"step";S.stepRecPos=0;emit(S.rec?"rec:step":"rec:off")}break;
  case "trans":if(!S.transUsed&&S.globals[153]!==0){const ts=new Set([S.cur,...S.tgroup]);let any=false;for(const t of ts){if(S.trans[t].semi){S.trans[t].on=!S.trans[t].on;any=true}}if(any)emit("transtoggle")}break;
  case "copy":if(S.copySel&&S.copySel.length){copySteps(S.copySel)}S.copySel=null;break;
  case "shift":case "tie":chordEntryCheck();break;
  case "chain":if(S.chainBuild&&S.chainBuild.list.length)emit("chain:set");S.chainBuild=null;break;
  case "pbend":setBend(0);midiBend(0);break;
  case "looper":S.looper=null;break;
 }
 dirty()}
function tieDown(){const pat=curPat(),t=S.cur;
 if(S.rec==="step"){if(S.keysDown.size){const prev=(S.stepRecPos-1+pat.len)%pat.len;pat.st[prev].n.forEach(n=>n.g=Math.min(64,Math.floor(n.g)+1))}else{if(!S.overdub)pat.st[S.stepRecPos]=newStep();S.stepRecPos=(S.stepRecPos+1)%pat.len}pat.valid=true;emit("steprec:rest");return}
 if(S.stepEdit&&S.sel!=null){if(S.keysDown.size||S.overdub){pat.st[S.sel].n.forEach(n=>{if(!S.selNotes||S.selNotes.has(n.p))n.g=Math.min(64,Math.floor(n.g)+1)})}else{snapshotUndo();pat.st[S.sel]=newStep();S.sel=(S.sel+1)%pat.len}pat.valid=true;return}
 if(heldStep()!=null){const st=pat.st[S.view[t]*16+heldStep()];st.n.forEach(n=>n.g=Math.min(64,Math.floor(n.g)+1));return}}
function trackDown(t,k){const tr=trk(t);
 if(k==="dn"||k==="up"){const pi=t===0&&isDrum(0)?proj().drum.cur:tr.cur;choosePat(t,(pi+(k==="up"?1:15))%16);emit(`pattern:${t}:${(pi+(k==="up"?1:15))%16}`);return}
 if(k==="seq"){tr.mode="seq";S.cur=t;emit(`mode:${t}:seq`);emit("track:"+t);return}
 if(k==="alt"){if(t===0){if(held("shift")){S.drumMute.fill(0);msg("Drums\nunmuted");return}if(held("t0mute")){S.drumMuteMode=!S.drumMuteMode;HELD.get("t0mute").used=true;return}tr.mode="drum"}else tr.mode="arp";
  S.cur=t;emit(`mode:${t}:${tr.mode}`);emit("track:"+t);return}
 if(k==="mute"){if(held("shift")){S.solo=S.solo===t?-1:t;HELD.get("t"+t+"mute").sh=true;emit("solo:"+t)}return}
 if(k==="trk"){if(held("shift")){S.cur=t;openMenu(MENU_TS());return}
  if(held("save")){HELD.get("save").used=true;for(let i=0;i<16;i++)savePattern(t,i);msg("Patterns\nSaved");emit("save:track");return}
  if(held("trans")||S.transMode){S.transUsed=true;if(t!==S.cur){S.tgroup.has(t)?S.tgroup.delete(t):S.tgroup.add(t);emit("transgroup")}return}
  if(S.control){S.control=false;emit("control:off");if(t===S.ctrlTrack)return}
  if(S.split&&[...HELD.keys()].filter(id=>/^t\dtrk$/.test(id)).length>=2){const a=[...HELD.keys()].filter(id=>/^t\dtrk$/.test(id)).map(x=>+x[1]);if(a.includes(S.split.up)&&a.includes(S.split.lo)){S.split=null;msg("Split\nOFF")}}
  if(S.chainBuild)S.chainBuild={t,list:[]};
  S.cur=t;S.sel=null;emit("track:"+t)}}
function stepDown(i){const t=S.cur,dr=isDrum(),v=S.view[dr?4:t],idx=v*16+i,pat=curPat();
 if(S.confirm){if(S.confirm.kind==="save"){S.confirm=null;loadProject(i);msg("Project\nLoaded\n(not saved!)",1800)}return}
 if(held("shift")){HELD.get("shift").used=true;shiftStep(i);return}
 if(held("project")){HELD.get("project").used=true;loadProject(i);return}
 if(S.patMode){const pm=S.patMode;if(pm.scene){if(pm.op==="save")saveScene(i);else if(pm.op==="copy"){S.copy={kind:"scene",d:deep(proj().scenes[i])};msg("Scene\nCopied")}else if(pm.op==="paste"&&S.copy&&S.copy.kind==="scene"){proj().scenes[i]=deep(S.copy.d);msg("Scene\nPasted")}else if(pm.op==="erase"){proj().scenes[i]=null;msg("Scene\nErased")}}
  else{const pats=dr?proj().drum.pats:trk().pats;if(pm.op==="copy"){S.copy={kind:"pat",drum:dr,d:deep(pats[i])};msg("Pattern\nCopied")}else if(pm.op==="paste"){if(!S.copy||S.copy.kind!=="pat"||S.copy.drum!==dr){msg("Nothing to\npaste")}else{S.undo={t,drum:dr,i,pat:deep(pats[i])};pats[i]=deep(S.copy.d);pats[i].valid=true;msg("Pattern Pasted\nUndo possible")}}
   else if(pm.op==="erase"){S.undo={t,drum:dr,i,pat:deep(pats[i])};pats[i]=dr?newDrumPat():newPat();pats[i].valid=true;msg("Pattern\nErased")}else if(pm.op==="save"){savePattern(t,i);msg("Pattern\nSaved")}}
  if(!held("copy")&&!held("paste")&&!held("erase")&&!held("save"))S.patMode=pm.op==="copy"||pm.op==="paste"?S.patMode:null;dirty();return}
 if(held("pattern")){HELD.get("pattern").used=true;choosePat(t,i);return}
 if(held("scene")){if(held("save"))saveScene(i);else loadScene(i);return}
 if(held("chain")&&S.chainBuild){const cb=S.chainBuild;cb.list.push(i);if(cb.list.length>16)cb.list.shift();if(dr)proj().drum.chain=cb.list.slice();else trk(cb.t).chain=cb.list.slice();P[cb.t].chainPos=0;msg(`Chain\n${cb.list.length} pattern${cb.list.length>1?"s":""}\nin the chain`);if(cb.list.length===1)setPat(cb.t,i,true);dirty();return}
 if(held("save")){HELD.get("save").used=true;savePattern(t,patIdx());savePattern(t,i);msg("Pattern\nSaved");return}
 if(held("lst")){HELD.get("lst").used=true;if(dr&&pat.poly)pat.lanes[S.lane].len=idx+1;else pat.len=idx+1;pat.valid=true;msg(`Last Step\n${idx+1}`);return}
 if(held("copy")){S.copySel=S.copySel||[];S.copySel.push(i);return}
 if(held("paste")){pasteSteps(i);return}
 if(held("erase")){snapshotUndo();if(dr)pat.lanes[S.lane].st[idx]=newDStep();else pat.st[idx]=newStep();pat.valid=true;msg("Step\nErased");return}
 if(S.control){S.sel=S.sel===idx?null:idx;return}
 if(dr){if(S.stepEdit){S.sel=idx;return}const st=pat.lanes[S.lane].st[idx];if(st.on)st.on=false;else Object.assign(st,{on:true,g:S.drumDefs.g,v:S.drumDefs.v,t:S.drumDefs.t,r:S.drumDefs.r});pat.valid=true;emit("drum:step:"+i);return}
 if(S.stepEdit){S.sel=idx;S.selNotes=null;emit("stepedit:sel");if(!S.playing&&S.globals[110]===0){const st=pat.st[idx];const t0=now()+.01,dur=stepDur(pat);st.n.forEach(n=>playNote(t,q(t,n.p),n.v,t0+Math.max(0,n.t)/100*dur,t0+n.g*dur))}return}
 if(S.rec==="step"){S.stepRecPos=idx;return}}
function stepUp(i,h){const t=S.cur,dr=isDrum();if(dr||S.stepEdit||S.control||S.rec==="step"||h.used)return dirty();
 const pat=curPat(),idx=S.view[t]*16+i,st=pat.st[idx];
 if(st.n.length){st.on=!st.on}else{st.n=[noteFromDefaults(t,S.lastNote,S.defs[t].v)];st.on=true}pat.valid=true;emit(st.on?"step:on:"+i:"step:off:"+i);dirty()}
function pageDown(n){const t=S.cur,dr=isDrum(),pat=curPat(),hs=heldSteps();
 if(held("lst")){HELD.get("lst").used=true;if(dr&&pat.poly)pat.lanes[S.lane].len=(n+1)*16;else pat.len=(n+1)*16;S.view[dr?4:t]=n;pat.valid=true;msg(`Last Step\n${(n+1)*16}`);return}
 if(held("shift")){HELD.get("shift").used=true;const steps=dr?pat.lanes[S.lane].st:pat.st;for(let i=0;i<16;i++)steps[n*16+i]=deep(steps[i]);if(dr&&pat.poly)pat.lanes[S.lane].len=Math.max(pat.lanes[S.lane].len,(n+1)*16);else pat.len=Math.max(pat.len,(n+1)*16);pat.valid=true;msg("Page\nPasted");return}
 if(held("copy")){S.copySel=null;S.copy={kind:"page",drum:dr,d:deep((dr?pat.lanes[S.lane].st:pat.st).slice(n*16,n*16+16))};msg("Page\nCopied");return}
 if(held("paste")){if(!S.copy||S.copy.kind!=="page"){msg("Nothing to\npaste");return}snapshotUndo();const steps=dr?pat.lanes[S.lane].st:pat.st;S.copy.d.forEach((s,i)=>steps[n*16+i]=deep(s));pat.valid=true;msg("Page\nPasted");return}
 if(held("erase")){snapshotUndo();const steps=dr?pat.lanes[S.lane].st:pat.st;for(let i=0;i<16;i++)steps[n*16+i]=dr?newDStep():newStep();pat.valid=true;msg("Page\nErased");return}
 if(hs.length){hs.forEach(i=>{HELD.get("s"+i).used=true;const st=dr?pat.lanes[S.lane].st[S.view[4]*16+i]:pat.st[S.view[t]*16+i];st.skip[n]=st.skip[n]?0:1});pat.valid=true;msg(`Step Skip\npage ${n+1}`);emit("skip");return}
 S.view[dr?4:t]=n;S.follow=false;dirty()}
function turnKnob(id,d){for(const h of HELD.values())h.used=true;
 if(id==="tempo"){const f=held("shift")?.01:1;if(S.globalBpm)S.gbpm=clamp(Math.round((S.gbpm+d*f)*100)/100,30,240);else proj().bpm=clamp(Math.round(((held("shift")?proj().bpm:Math.round(proj().bpm))+d*f)*100)/100,30,240);msg(held("shift")?`${bpm().toFixed(2)} BPM`:`${Math.round(bpm())} BPM`);emit("tempo")}
 else if(id==="swing"){if(held("shift")){const p=curPat();p.swOff=clamp((p.swOff||0)+d,-25,25);p.valid=true}else proj().swing=clamp(proj().swing+d,50,75);msg(`Swing\nGlobal : ${proj().swing}%\nTrack ${S.cur+1} : ${curPat().swOff>0?"+":""}${curPat().swOff||0}%`);emit("swing")}
 else if(id==="sel"){if(S.menu)menuTurn(d);else if(held("project")){HELD.get("project").used=true;S.projPick=clamp((S.projPick==null?S.proj:S.projPick)+d,0,15);msg(`Load Project\n${S.ram[S.projPick].name||"Project "+(S.projPick+1)}`)}}
 else if(/^enc\d$/.test(id))turnEnc(+id[3],d);
 dirty()}
function clickKnob(id){if(id==="sel"){if(S.confirm){const c=S.confirm;S.confirm=null;c.fn();emit("confirm:"+c.kind)}else if(S.menu)menuPush();else if(S.projPick!=null&&held("project")){loadProject(S.projPick);S.projPick=null}dirty();return}
 if(id==="swing"){msg(`Swing\nGlobal : ${proj().swing}%\nTrack ${S.cur+1} : ${curPat().swOff||0}%`)}else if(id==="tempo")msg(`${bpm().toFixed(2)} BPM`);else encShow(+id[3]);dirty()}

/* ---------- pointer input ---------- */
let tipT=0;const tip=$("#tip");
function showTip(id,e){const inf=infoFor(id);if(!inf){tip.hidden=true;return}tip.innerHTML=`<b>${inf[0]}</b>${inf[1]}${inf[2]?`<div class="s">${inf[2]}</div>`:""}`;tip.hidden=false;
 const x=Math.min(innerWidth-330,e.clientX+14),y=Math.min(innerHeight-tip.offsetHeight-8,e.clientY+14);tip.style.left=x+"px";tip.style.top=y+"px"}
function showInfo(id){const inf=infoFor(id);if(!inf)return;$("#info").innerHTML=`<div class="crumb">Manual <b>${inf[3]}</b></div><h2>${inf[0]}</h2><p>${inf[1]}</p>${inf[2]?`<p><b>Shift:</b> ${inf[2]}</p>`:""}${inf[4]?`<div class="fw"><b>Firmware:</b> ${inf[4]}</div>`:""}`}
function toggleLatch(id){if(LATCH.has(id)){LATCH.delete(id);ctlEls[id].classList.remove("latched");up(id)}else{LATCH.add(id);ctlEls[id].classList.add("latched");down(id)}}
const stripVal=(c,e)=>{const r=svg.getScreenCTM().inverse(),p=new DOMPoint(e.clientX,e.clientY).matrixTransform(r);return c.t==="looper"?clamp((p.x-c.x)/c.w,0,.999):clamp(1-(p.y-c.y)/c.h,0,1)};
function stripInput(c,e){const v=stripVal(c,e);if(c.id==="pbend"){const b=(v-.5)*2;const bb=Math.abs(b)<.08?0:b;setBend(bb*2);midiBend(bb)}else if(c.id==="modw"){if(held("shift")?modStripLock():S.modLock)return;S.mod[S.cur]=Math.round(v*127);midiCC(-1,S.mod[S.cur])}
 else if(c.id==="looper"){if(held("shift")){S.looperOn=!S.looperOn;msg(S.looperOn?"Touch Strip\nON":"Touch Strip\nOFF");HELD.get("shift").used=true;return}if(!S.looperOn||!S.playing)return;const z=Math.floor(v*4),beats=[1,.5,.25,.125][z];
  if(!S.looper||S.looper.beats!==beats){S.looper={beats,start:P.map(p=>p.cnt),idx:P.map(p=>p.idx)};emit("looper")}}dirty()}
function bindInput(){
 let drag=null,lp=null;
 svg.addEventListener("contextmenu",e=>e.preventDefault());
 svg.addEventListener("pointerdown",e=>{const g=e.target.closest(".ctl");if(!g)return;const id=g.dataset.id,c=CI[id];e.preventDefault();tip.hidden=true;showInfo(id);
  if(e.button===2){toggleLatch(id);return}
  if(c.t==="knob"){drag={id,y:e.clientY,moved:false,acc:0};svg.setPointerCapture(e.pointerId);return}
  if(c.t==="strip"||c.t==="looper"){down(id);drag={id,strip:c};stripInput(c,e);svg.setPointerCapture(e.pointerId);return}
  if(LATCH.has(id)){toggleLatch(id);return}
  if(e.pointerType==="touch"){lp=setTimeout(()=>{lp=null;if(HELD.has(id)){LATCH.add(id);ctlEls[id].classList.add("latched")}},HOLDMS)}
  if(c.t==="key"){const pt=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());S.padVel=clamp(Math.round(45+82*(pt.y-c.y)/c.h),1,127)}
  down(id);drag={id,btn:true};svg.setPointerCapture(e.pointerId)});
 svg.addEventListener("pointermove",e=>{if(drag&&drag.strip){stripInput(drag.strip,e);return}
  if(drag&&!drag.btn){const dy=drag.y-e.clientY;drag.acc+=dy;drag.y=e.clientY;const step=held("shift")||e.shiftKey?6:4;while(Math.abs(drag.acc)>=step){const d=Math.sign(drag.acc);drag.acc-=d*step;drag.moved=true;turnKnob(drag.id,d)}return}
  if(!drag){const g=e.target.closest(".ctl");if(g){const id=g.dataset.id;g.classList.add("hl");if(svg._hl&&svg._hl!==g)svg._hl.classList.remove("hl");svg._hl=g;showTip(id,e)}else{tip.hidden=true;if(svg._hl){svg._hl.classList.remove("hl");svg._hl=null}}}});
 const end=e=>{if(lp){clearTimeout(lp);lp=null}if(!drag)return;const d=drag;drag=null;
  if(d.strip){up(d.id);return}if(!d.btn){if(!d.moved)clickKnob(d.id);return}if(!LATCH.has(d.id))up(d.id)};
 svg.addEventListener("pointerup",end);svg.addEventListener("pointercancel",end);
 svg.addEventListener("pointerleave",()=>{tip.hidden=true});
 svg.addEventListener("wheel",e=>{const g=e.target.closest(".ctl");if(!g)return;const c=CI[g.dataset.id];if(c.t!=="knob")return;e.preventDefault();turnKnob(c.id,e.deltaY<0?1:-1)},{passive:false});
 /* computer keyboard */
 const KMAP="awsedftgyhujk";
 const kmDown=new Set();
 addEventListener("keydown",e=>{if(STU.mode!=="man"||e.target.closest("input,select,textarea"))return;const k=e.key.toLowerCase();
  if(e.key==="Shift"){if(!held("shift"))down("shift");return}
  if(e.repeat)return;
  if(k===" "){e.preventDefault();down("play");up("play");return}if(k==="."){down("stop");up("stop");return}if(k==="r"){down("rec");up("rec");return}
  if(k==="z"){down("octdn");up("octdn");return}if(k==="x"){down("octup");up("octup");return}
  const i=KMAP.indexOf(k);if(i>=0){const key="k"+(12+i);kmDown.add(key);down(key)}});
 addEventListener("keyup",e=>{const k=e.key.toLowerCase();if(e.key==="Shift"){if(!LATCH.has("shift"))up("shift");return}const i=KMAP.indexOf(k);if(i>=0){const key="k"+(12+i);if(kmDown.delete(key))up(key)}});
 addEventListener("blur",()=>{for(const id of [...HELD.keys()])if(!LATCH.has(id))up(id)});
}

/* ---------- Web MIDI mirror (notes out, keyboard in) ---------- */
let MOUT=null,MIN=null;
async function toggleMidi(){const b=$("#midiBtn");if(MOUT||MIN){MOUT=null;if(MIN)MIN.onmidimessage=null;MIN=null;b.setAttribute("aria-pressed","false");b.textContent="MIDI";return}
 if(!navigator.requestMIDIAccess){alert("This browser has no Web MIDI.");return}
 try{const acc=await navigator.requestMIDIAccess();const outs=[...acc.outputs.values()],ins=[...acc.inputs.values()];
  MOUT=outs.find(o=>!/keystep/i.test(o.name))||outs[0]||null;MIN=ins.find(i=>!/keystep/i.test(i.name))||ins[0]||null;
  if(MIN)MIN.onmidimessage=ev=>{const [s,d1,d2]=ev.data;const ty=s&0xF0;const k=d1-48-12*trk().oct;if(k<0||k>36)return;if(ty===0x90&&d2>0){keyDown(k,d2)}else if(ty===0x80||ty===0x90){keyUp(k)}};
  b.setAttribute("aria-pressed","true");b.textContent=`MIDI: ${MOUT?MOUT.name:"no out"}`}catch(e){alert("MIDI access was refused.")}}
const tms=t=>t==null?undefined:Math.max(performance.now(),t*1000);
function midiNote(t,midi,vel,t0,t1){if(!MOUT)return;const ch=outCh(t);if(ch==null)return;MOUT.send([0x90|ch,midi,vel],tms(t0));MOUT.send([0x80|ch,midi,0],tms(t1))}
function midiDrum(l,vel,t0,t1){if(!MOUT)return;const ch=S.globals[79];if(ch>15)return;const n=S.globals[81]?S.globals[83+l]:S.globals[82]+l;MOUT.send([0x90|ch,n&127,vel],tms(t0));MOUT.send([0x80|ch,n&127,0],tms(t1))}
function midiOn(t,midi,vel){if(!MOUT)return;const ch=outCh(t);if(ch!=null)MOUT.send([0x90|ch,midi,vel])}
function midiOff(t,midi){if(!MOUT)return;const ch=outCh(t);if(ch!=null)MOUT.send([0x80|ch,midi,0])}
/* Control-mode knob i: S.cc and Control-track steps hold the knob position 0-127; Min/Max (48-57) scale it on the way out
   (Min > Max reverses), so live moves and recorded automation send the same values. Channel 38-42: 0-15, or Global (>15) = ID 80.
   Port 33-37: the mirror stands in for the USB port, so it sends for USB (0) or All (3); MIDI 1/2 DIN routing is not simulated. */
const knobValue=(i,pos)=>{const lo=S.globals[48+i],hi=S.globals[53+i];return clamp(Math.round(lo+(hi-lo)*pos/127),0,127)};
const knobChannel=i=>{const c=S.globals[38+i];return (c>15?S.globals[80]:c)&15};
const knobLabel=i=>{const l=S.knobLabels&&S.knobLabels[i];return l&&l.cc===S.globals[28+i]?l.name:null};
function midiCC(i,v){if(!MOUT)return;if(i<0){const ch=outCh(S.cur);if(ch!=null)MOUT.send([0xB0|ch,1,v]);return}const port=S.globals[33+i];if(port!==0&&port!==3)return;MOUT.send([0xB0|knobChannel(i),S.globals[28+i]&127,knobValue(i,v)])}
function midiPC(t,pc){if(!MOUT)return;const ch=outCh(t);if(ch!=null)MOUT.send([0xC0|ch,pc&127])}
function midiBend(b){if(!MOUT)return;const ch=outCh(S.cur);if(ch==null)return;const v=clamp(Math.round(8192+b*8191),0,16383);MOUT.send([0xE0|ch,v&127,v>>7])}
function midiAllOff(){if(!MOUT)return;for(let c=0;c<16;c++)MOUT.send([0xB0|c,123,0])}

/* ---------- tours ---------- */
let tour=null;
function startTour(i){tour={i,k:0};renderTour()}
function renderTour(){const box=$("#tourBox");document.querySelectorAll(".tourTarget").forEach(e=>e.classList.remove("tourTarget"));
 if(!tour){box.hidden=true;return}const T=TOURS[tour.i];box.hidden=false;
 if(tour.k>=T.steps.length){box.innerHTML=`<h2>${T.n}</h2><p class="done">Done. Pick another tour or keep playing.</p><div class="nav"><button id="tourClose">Close</button></div>`;$("#tourClose").onclick=()=>{tour=null;renderTour()};return}
 const st=T.steps[tour.k];box.innerHTML=`<div class="crumb">Tour · step ${tour.k+1} of ${T.steps.length}</div><h2>${T.n}</h2><p class="step">${st.s}</p><div class="nav"><button id="tourSkip">Skip step</button><button id="tourClose">End tour</button></div>`;
 if(st.t&&ctlEls[st.t])ctlEls[st.t].classList.add("tourTarget");viewFollow(viewForControl(st.t));$("#tourSkip").onclick=()=>{tour.k++;renderTour()};$("#tourClose").onclick=()=>{tour=null;renderTour()}}
LISTEN.push(ev=>{if(!tour)return;const st=TOURS[tour.i].steps[tour.k];if(!st)return;if(st.ev instanceof RegExp?st.ev.test(ev):st.ev===ev){tour.k++;renderTour()}});

/* ---------- chapters ---------- */
const SHOW={
 trackSettings(){S.cur=1;openMenu(MENU_TS());return "<p>Firmware 2.5 added a per-track settings page: <b>Shift + Track button</b>. It holds MIDI Channel IN/OUT, Program Change Send and Assign, and Fixed Velocity. Transpose Latch lives in <b>Utility &gt; Misc</b>.</p><div class='fw'><b>Firmware:</b> PC Send and Fixed Velocity are global settings 142–146 and 154–158 (track 1 has separate Seq and Drum entries). MCC does not list them; the Device tools tab can read and set them.</div>"},
 recordBasics(){S.cur=1;trk(1).mode="seq";return "<p>Three ways to fill a pattern: <b>Quick Record</b> (hold a step and play keys, Record and Step Edit off), <b>Step Record</b> (press Record while stopped; each key press fills a step and advances; Tie/Rest = rest) and <b>Real-time Record</b> (hold Record, press Play). Overdub decides whether notes add to or replace a step. Shift + Record toggles quantized recording.</p>"},
 arpBasics(){S.cur=2;trk(2).mode="arp";return "<p>Tracks 2–4 have arpeggiators. Press <b>Arp</b>, hold a chord, and it plays even when the sequencer is stopped. <b>Hold</b> latches it; while one key is held you can add notes (up to 16). Shift + the Arp Pattern keys pick Up, Down, Exclu, Inclu, Rand, Order or Poly; Shift + Arp Octave −1…+3 sets the range. Gate, Velocity (bipolar), Time Shift and Randomness act on the whole arpeggio.</p>"},
 scaleBasics(){S.cur=1;return "<p>Shift + a Scale key (Chrom, Major, Minor, Dorian, Mixo, H.Min, Blues, User 1, User 2) sets the scale of the current pattern. The keyboard, the sequence and the arpeggio of that track all play in the scale. Shift + Root, then a key in the lowest octave, sets the root. Shift + User 1/2 lets you toggle notes in the lowest octave to build your own scale.</p><div class='fw'><b>Firmware:</b> the scale is a 12-bit mask; out-of-scale notes snap to the nearest scale note and ties snap <b>down</b> (in C major C# plays C, F# plays F). The masks are Major 0xAB5, Minor 0x5AD (natural minor), Dorian 0x6AD, Mixolydian 0x6B5, Harmonic minor 0x9AD (C D Eb F G Ab B), Blues 0x4E9. Quantizing happens at play time, so recorded steps keep their raw pitch.</div>"},
 tempo(){return "<p>Tempo 30–240 BPM (Shift = fine, 0.01 BPM). Tap Tempo: tap at least twice. Swing 50–75% for all tracks; Shift + Swing sets an offset for the selected track. Shift + step 15 switches between the project tempo and a global tempo.</p>"},
 encoders(){S.cur=1;return "<p>The five encoders edit Pitch, Gate, Velocity, Time Shift and Randomness. With no step held they set the <b>track defaults</b> used for new notes. Hold a step (or select it in Step Edit) to edit that step. Shift + turn offsets every step of the pattern.</p>"},
 looper(){return "<p>Touch the looper strip while playing to loop all tracks from that moment: 1/4 at the left is the longest loop, 1/32 at the right the shortest. Shift + touch disables or enables the strip.</p>"},
 shiftFns(){return "<p>Hold <b>Shift</b>: the LEDs above the keys show what is active (sequence direction, mono/poly, arp pattern and octave, time division, scale, CV routing). Shift + a step runs the blue step functions: Clr Ptn, Clr Steps, Nudge, Invert, Semi Up/Down (scale-aware), Oct Up/Down, Qnt 50%/100%, Rand Order/Notes/Oct, Global BPM, Wait Load.</p>"},
 seqLength(){return "<p>Lst Step + a step sets the length within the viewed page; Lst Step + 16/32/48/64 sets it in pages. Shift + a page button extends the pattern by copying page 1 there. Shift + Lst Step toggles Follow. Shift + Mono/Poly keys set whether a step plays all its notes or only the lowest; Shift + Fwd/Rand/Walk sets the direction.</p>"},
 stepEdit(){S.cur=1;S.stepEdit=true;return "<p><b>Step Edit</b> on: press a step to select it (it blinks). Play keys to replace its notes, or with Overdub on to add notes. Encoders edit the step; Tie/Rest clears it. When the sequencer is stopped, pressing a step plays it (step listen). <b>Quick Edit</b> (Step Edit off): press steps to toggle them, or hold one and play keys / turn encoders.</p>"},
 copyPaste(){return "<p>Copy + steps, then Paste + a step. Copy + a page button, then Paste + another page. Erase + steps or a page. Copy/Paste/Erase + Pattern opens pattern mode: press steps to pick patterns. Shift + Exit undoes the last paste or erase.</p>"},
 saving(){return "<p>Edits live in working memory. Hold <b>Save</b>: unsaved patterns of the track show red, saved ones blue. Save + step saves that pattern; Save + Track button saves the whole track; Save + Project saves everything (confirm with the encoder). Shift + Save reloads the current pattern.</p>"},
 drum(){trk(0).mode="drum";S.cur=0;return "<p>Track 1 → Drum: 24 lanes on the lowest 24 keys. Press a key to select (and hear) a lane, then press steps to toggle hits. Hold the Drum button and press a key to select a lane silently. Hold Mute + a key to mute lanes; Shift + Drum unmutes all. Shift + Poly lets each lane have its own length (Lst Step + step while a lane is selected).</p>"},
 chordMode(){S.cur=2;return "<p>Hold <b>Shift + Tie/Rest</b> and play a chord (or play it legato): its intervals from the first note are stored. Then any key plays that chord. Shift + Tie/Rest turns chord mode off and on again; the shape stays stored. One chord per track.</p><div class='fw'><b>Firmware:</b> each chord note is snapped through the scale map individually, so a shape becomes diatonic in a scale. The shape and chord-mode flag are part of the track data that Save Project writes, so a saved chord survives a power cycle even though the manual says it doesn't.</div>"},
 projects(){return "<p>16 projects. Hold Project + a step to load one (or hold Project and turn the encoder). Save + Project, Copy + Project (to the next slot) and Erase + Project all ask for confirmation: push the selection encoder. Hold Project and press Shift to recall the saved version from flash.</p><div class='fw'><b>Firmware:</b> all 16 projects are loaded into RAM at boot and edits stay in RAM until saved. At “Save Project / Confirm ?”, a step pad does <b>not</b> confirm: it loads that project and discards the edits. The simulation reproduces this.</div>"},
 tracks(){return "<p>Mute a track with its Mute button; Shift + Mute solos it (exclusive). Hold two track buttons and press a key to split the keyboard (first button = upper part). Press the two track buttons again to remove the split.</p>"},
 patterns(){return "<p>16 patterns per track. Use the track arrows, or hold Pattern + a step. With Wait Load on (Shift + step 16) the change happens at the end of the current pattern; the track display blinks the pending number.</p>"},
 arranging(){return "<p><b>Chain</b>: hold Chain and press steps in order (up to 16). <b>Scene</b>: Save + Scene + step stores the pattern, chain and mute of all tracks; Scene + step loads it. <b>Step skip</b>: hold a step and press page buttons to skip it on those pages/bars.</p>"},
 controlMode(){S.cur=3;return "<p>Press <b>Control</b>: the selected track becomes the Live Track and its button blinks. The encoders send their CC (Utility &gt; Controller &gt; Knob 1–5). In Step Edit, select a step and turn an encoder to store a value; record while playing to capture moves. Erase + turn clears an encoder's automation.</p>"},
 utility(){openMenu(MENU());return "<p>Shift + Project opens the Utility menu: turn the selection encoder to move, push to enter or edit, Exit to go back. Settings are global and saved when you leave.</p><div class='fw'><b>Firmware:</b> every Utility setting is one of 158 global IDs, readable and writable over SysEx. Misc also has Brightness (ID 152) and Transpose Latch (ID 153, stored inverted).</div>"},
 fwNames(){return "<p>With KSCON firmware a project slot has a name of up to 16 characters, shown on the display where the KeyStep would show the project number.</p><p>Give a slot its name in <b>Projects</b> mode: type it above the tracks and <b>Store</b>, or use <b>Send the name only</b> on the Project tab. The Set list writes names for several slots at once.</p><p class='pg'>The name belongs to the slot: saving another project into it keeps the name, Erase Project clears it. The KeyStep cannot send names back, so the slot list shows the last name sent from this browser.</p>"},
 fwDrumPads(){S.cur=1;if(PADS.mode!==1)padsSet(1);return "<div class='fw'><b>Try it:</b> drum pads are on in the simulation now with track 2 selected. Click the steps (they sound while held), and play keys for track 2 at the same time. Drum + Seq on track 1 turns them off.</div>"+"<p>Hold <b>Drum</b> (track 1 row) and press <b>Seq</b> (track 1 row): the 16 step buttons become drum pads. Step 1 plays drum lane 1, step 2 lane 2 … step 16 lane 16, using the notes of the Drum Map on the drum output channel.</p><p>They work whichever track is selected, so you can play a synth on track 2 with the keys and drums on the steps at the same time. The same combo turns the pads off.</p><p class='pg'>Tested on a KeyStep Pro. The simulation shows a message when the mode changes; the KeyStep does not.</p>"},
 fwChordPads(){S.cur=1;if(PADS.mode!==2)padsSet(2);return "<div class='fw'><b>Try it:</b> chord pads for track 2 are on in the simulation. Click a step for a scale chord; hold keys (right-click latches them) and click a step to keep that chord there.</div>"+"<p>Hold <b>Seq</b> and press <b>Arp</b> on track 2, 3 or 4: the steps become chord pads for that track, played on its MIDI channel.</p><ul class='tight'><li><b>Keep a chord:</b> select the track, hold a chord on the keys and tap a step.</li><li><b>Play it:</b> press the step; the chord sounds while you hold it. A kept chord moves with the octave buttons.</li><li><b>Empty steps</b> play the chords of the track's scale: steps 1–8 triads on degrees 1–8, steps 9–16 sevenths, in the keyboard's lowest octave.</li><li><b>Erase + step</b> forgets a step's chord. <b>Shift + Exit</b> undoes the last keep or erase; again to redo.</li><li><b>Save Project</b> (Project menu) saves the chords with the project. Save + Track does not.</li></ul><p class='pg'>Up to 5 notes per pad, 16 pads per track. The same combo turns the pads off.</p>"},
 fwRootChords(){S.cur=1;if(PADS.mode!==6)padsSet(6);const T=["root + octave","sus2","triad","sus4","power (5th)","6th","7th","triad, octave up","9th","add9","11th","1st inversion","13th","2nd inversion","7sus4","triad, octave down"];
  return "<div class='fw'><b>Try it:</b> root chords for track 2 are on in the simulation. Click a key to pick the root (it stays silent), then click steps.</div><p>Hold <b>Seq</b> and press <b>Mute</b> on any track: root chords for that track. The keys on that track are silent and only pick the root; the steps play chords on that root, built from the track's scale and named by their number.</p><table class='t'><tr>"+T.map((n,i)=>`<td><b>${i+1}</b> ${n}</td>`+(i%4===3&&i<15?"</tr><tr>":"")).join("")+"</tr></table><p>Hold a key and press steps to play variations of it; the root stays after you let go. Before any key, the root is the scale's root in the keyboard's lowest octave. A chord that would run past the keys shown moves by whole octaves to fit.</p><p class='pg'>Root keys are not recorded. Chromatic counts as major. The same combo turns it off.</p>"},
 fwLightsRec(){return "<p><b>Step lights:</b> while a pad mode is on, the 16 steps show the pads instead of the pattern. Chord pads: a kept chord is dim in the track colour, an empty pad (scale chord) dim white. Drum pads and root chords: all dim in the track colour. The pad you hold is bright white, and the chord pads that hold the chord you are playing on that track's keys light up bright, so you can find it. Turn the pad mode off and the steps show the pattern again.</p><p><b>Key lights:</b> while the pad's track is selected, the keys light in the track colour for the notes a step plays, the way the KeyStep lights notes it plays itself. Drum hits light while track 1 shows drums. Notes outside the keys shown light the octave arrow.</p><p><b>Recording:</b> with the sequencer recording (Rec on and playing), what the steps play is recorded on the selected track like keys. How long you hold the step sets the note length. Chord pads and root chords record every note; drum hits record into the drum lanes while track 1 shows drums.</p><p class='pg'>If a pattern is full, the KeyStep shows its usual limit message and skips that note.</p>"},
 fwNoteNames(){return "<p>Play a key and the screen shows its name and octave for about a second: <b>E3</b> (C4 is middle C). Hold several keys on the same track and it names the chord they make, with the notes underneath: <b>C#m</b> / C#3 E3 G#3. Chords not in root position show the bass note: <b>A/C#</b>. Notes that make no known chord are listed.</p><p>On a track in <b>Chord mode</b> the name is the chord that key really plays, after the scale bends it. Chord pads and root-chord steps name their chord when pressed, drum pads their lane and note (<b>Drum 1</b> / C2); a root-chord key shows <b>Root: E</b>. The arpeggiator and the sequencer show nothing, and menus are never covered.</p><p class='pg'>Names use sharps, as the KeyStep's own screens. Known chords: major, minor, 5, sus2, sus4, dim, aug, 6, m6, 7, maj7, m7, m7b5, dim7, mMaj7, 7sus4, add9, madd9, 9, maj9, m9, 11, m11, 13, m13 (sevenths and up also without the 5th).</p>"},
 fwBass(){return "<p>Record chords on one track. Hold <b>Seq</b> on the bass track and press the <b>Track</b> button of the chord track: the bass track's current pattern becomes a bass line in C2–B2 that follows the chords, one note per chord change. The screen says <b>Bass: Root / from track N</b>.</p><p>Still holding Seq, steps <b>1–5</b> pick the style and write it again: 1 Root, 2 Root + 5th, 3 Octaves, 4 Pulse, 5 Follow rhythm (roots where the chord track plays). It works while playing; the last style is remembered. Let go of Seq and the steps are back to normal.</p><p class='pg'>Each chord's root comes from its notes (inversions keep their bass); the bass pattern gets the chord track's length, root and scale. Steps that are off on the chord track are ignored. Not with track 1 in drum mode. Seq + its own Track button stays stock. Save Project keeps the bass like any pattern. The same rules are in the page's Make bass (Track tab).</p>"},
 fwVersion(){return "<p>At power-on the screen says <b>KEYSTEP CON</b>, with the same moving dots. <b>Shift + Project &gt; Utility &gt; FW version</b> shows <b>KSCON 2.5.99 b&lt;build&gt;</b> and <b>based on 2.5.20</b>, and the KeyStep reports version 2.5.99 to MIDI Control Center and this page, so a KSCON build is never mistaken for Arturia's 2.5.20.</p>"},
 fwQuirks(){return "<p>Found while taking firmware 2.5.20 apart. They are Arturia's, in stock firmware too:</p><ul class='tight'><li><b>Save + Track never stores the chord shape or keyboard octave</b>: it writes the flash first and stages the track's chord block after. Use <b>Save Project</b>, which stores them.</li><li><b>The Save Project confirm trap</b>: at \"Save Project / Confirm ?\" pressing a step pad loads that project instead and drops your edits. Confirm with a push of the encoder next to the display.</li><li><b>A SysEx store flips untouched patterns and scenes</b> between valid and default. MCC never shows it because it sends whole projects; this page always sends every state back as read.</li><li><b>Some stored values cannot be read over SysEx</b>: bytes 0xF7 and up cut the reply short. This page re-reads such blocks value by value; a chord entered with a note below its root stays unreadable.</li><li><b>Empty drum slots must be 127 in every field</b>, or the KeyStep reports \"192 notes limit\"; this page writes them that way.</li><li><b>12 global settings MCC does not show</b> (Program Change send and Fixed Velocity per track, Brightness, Transpose Latch) are in Device settings here.</li></ul>"},
 fwRules(){return "<ul class='tight'><li>One pad mode at a time: turning drum pads, chord pads or root chords on turns the others off.</li><li>The pattern and the selected track are not changed.</li><li>The first button of each combo still does its stock job (Drum switches track 1 to drum mode, Seq to sequencer mode); only the second press, which would switch it back, is taken.</li><li>Seq alone, Arp alone, Mute alone, <b>Shift + Control</b> (Control mode) and <b>Shift + Drum</b> (unmute all drums) stay stock.</li><li>Shift + Exit is the stock undo except in chord pad mode.</li></ul>"},
 deviceTools(){return "<p><b>Projects</b> mode (top bar) does what MIDI Control Center does with projects: the 16 slots on the KeyStep on the left, <b>Recall</b> one into the editor, change it, <b>Store</b> it into any slot (two clicks, then everything is read back). Open and save project files, or start an empty project.</p><p>It talks to a real KeyStep Pro through Web MIDI (Chrome or Edge, SysEx allowed), or to this simulation: connect with the KeyStep pill at the top.</p>"},
 waTracks(){return "<p>Each track has a tab in Projects mode. Sequencer tracks show a <b>piano roll</b>: click a cell to add a note, click it to select it and set velocity, gate, time shift and randomness, click again to remove it. Patterns 1–16, the four 16-step pages, root, scale and length are above it.</p><p>Track 1 in Drum mode shows a <b>drum grid</b> of the 24 lanes instead. <b>Copy / Paste / Clear pattern</b>, and Undo/Redo (Ctrl+Z) for every edit.</p><p class='pg'>Nothing reaches the KeyStep until Store, which reads everything back to check it.</p>"},
 waDrums(){return "<p><b>Steps → drums</b> (track 1, Drum mode) takes a pattern from any track and places each note on the drum lane that plays it, using the Drum Map, then switches track 1 to Drum mode. Notes not on the map can be moved by octaves onto it, or are listed as left out.</p><p>Track 1 then plays the drums while you play a synth on tracks 2–4. Tested on a KeyStep Pro.</p>"},
 waScenes(){return "<p><b>Scenes</b>: which pattern each track plays, mutes and chains, for all 16 scenes. <b>Project</b>: tempo, the name, each track's chord for Chord mode, and both user scales. <b>Control</b>: the control track's five knob lanes, a CC value per step.</p><p class='pg'>The control track's layout comes from MCC and has not yet been checked on a KeyStep.</p>"},
 waMidi(){return "<p><b>Import</b> one or more .mid files (for example song parts from Logic): each part goes to a track from the pattern you choose, several parts can follow each other on one track, and they can be chained in a scene. Notes snap to 16th steps, keeping timing as time shift and lengths as gate. A part longer than 64 steps asks before continuing on the next patterns.</p><p><b>Export</b> a chain of patterns per track as a .mid file.</p>"},
 waBackup(){return "<p><b>My library</b> keeps projects in this browser: save the open project there, import files, rename, load. <b>Back up</b> reads all 16 projects and the global settings into one file (about ten minutes); <b>Restore</b> puts back the ones you tick and checks each.</p><p class='pg'>Project names and step-pad chords are not in backups: SysEx cannot read them.</p>"},
 waSetlist(){return "<p>Paste or load a set list (song, slot, chord, root and scale per track) and write them all: each slot gets its name, its chord with Chord mode on, and the root and scale on every pattern of the chosen tracks, then everything is read back. Tested with a 14-song set list on slots 1–14.</p>"},
 waSettings(){return "<p>All the KeyStep's global settings in MCC's groups, each written straight away and read back. It also shows the ones MCC leaves out: Program Change Send and Fixed Velocity per track, Brightness and Transpose Latch.</p><p>The <b>MIDI monitor</b> lists the notes, CCs and program changes the KeyStep sends over USB, for checking what the sequencer, the pads or the control track really output.</p>"},
 waFirmware(){return "<p><b>Install KSCON firmware</b> (the bar at the top, or Device settings &gt; Firmware) opens the installer. It takes your own copy of Arturia's 2.5.20 update, checks it is exactly that file, adds KSCON's changes in the browser and checks the result against the tested build before offering it; then you flash it with MIDI Control Center. Nothing is uploaded, and no Arturia firmware is shipped: only the few kilobytes KSCON changes.</p><p class='pg'>When a connected KeyStep runs an older KSCON build, the bar offers the update. To go back, flash Arturia's 2.5.20 file.</p>"},
 fwPadArp(){S.cur=1;if(PADS.mode!==2)padsSet(2);trk(1).mode="arp";return "<div class='fw'><b>Try it:</b> chord pads for track 2 are on and track 2 is in Arp mode in the simulation. Hold a step to hear its chord arpeggiated; press track 2's Seq button for plain chords again.</div>"+"<p>Turn on chord pads (<b>Seq + Arp</b>) or root chords (<b>Seq + Mute</b>) for track 2, 3 or 4, then press that track's <b>Arp</b> button so the track is in Arp mode. Now holding a step arpeggiates its chord instead of playing it as a block: the KeyStep's own arpeggiator plays the pad's notes, as if you held them on the keys.</p><p class='pg'>Everything is the stock arp: the rate is the Time Division (Shift + the Time Division keys), the pattern, octaves, gate, swing and Hold are as set, the looper strip works on it, and it follows the clock. Letting go of the step stops it (unless Hold is on). Press the track's <b>Seq</b> button and the pads play plain chords again. While the pads are on and the track is in Arp mode, its Chord mode is ignored so a pad's chord is not stacked into bigger chords. With Rec on, the arpeggiator records as it does for keys; the pad itself records nothing.</p>"},
 fwModLock(){return "<div class='fw'><b>Try it:</b> right-click Shift to latch it, touch the mod strip (the screen says locked), right-click Shift again; the strip now does nothing until you repeat it.</div>"+"<p>Hold <b>Shift</b> and touch the <b>mod strip</b>: the screen says <b>Mod strip locked</b>, and the strip stops sending until you do it again (<b>Mod strip unlocked</b>). Handy if you bump it while playing.</p><p class='pg'>The last mod value sent stays where it was, so a held vibrato or filter setting keeps going. While locked nothing goes out from the strip: no CC 1 and no mod CV. One toggle per Shift press; touching the strip with Shift held never sends. The pitch bend strip and the looper strip are not affected (Shift + looper strip is Arturia's own on/off for that strip). The lock is off after power-up.</p>"},
 waBass(){return "<p>Track tab &gt; <b>Make bass…</b>: pick the track and pattern with the chords and an octave, then a style (Root, Root + 5th, Octaves, Pulse, Follow rhythm). The pattern is written straight away; pick another style to switch, Undo goes back one style at a time, and Store sends it to the KeyStep. Same rules as Make bass on the KeyStep itself.</p>"},
 waCC(){return "<p>Pick your synth from the MIDI Guide catalogue (447 instruments) and map its parameters to the five encoders in Control mode. Suggestions come from each synth's own controls; mappings can be saved, imported and exported.</p><p class='pg'>Single 7-bit CCs only. It sets up the simulation; writing a mapping to the KeyStep is not done yet.</p>"},
 waView(){return "<p>The drawing of the KeyStep zooms to the part in use: Auto follows the chapter, tour step or tool, or pick Whole, Transport, Tracks, Steps &amp; encoders, Knobs or Keys above it.</p>"},
};
/* the manual's chapters, then the section that is not in Arturia's manual (its Show also lights the buttons it uses) */
function renderChapters(){for(const [id,list,label] of [["#chapList",CHAPTERS,"Manual"],["#newChapList",NEW_CHAPTERS,"What's new"]]){const ul=$(id);ul.innerHTML="";
 list.forEach(([sec,t,fn,hl])=>{const li=document.createElement("li");li.innerHTML=`<i>${sec}</i><span>${t}</span><button>Show</button>`;
  li.querySelector("button").onclick=()=>{if(!tour)document.querySelectorAll(".tourTarget").forEach(e=>e.classList.remove("tourTarget"));const html=SHOW[fn]();DEV.lastChap=fn;
   if(hl&&!tour)hl.forEach(c=>ctlEls[c]&&ctlEls[c].classList.add("tourTarget"));viewFollow(CHAP_VIEW[fn]||"whole");
   $("#info").innerHTML=`<div class="crumb">${label} <b>${sec}</b></div><h2>${t}</h2>${html}`;
   const go=NEW_OPEN[fn];if(go&&list===NEW_CHAPTERS){const b=document.createElement("button");b.className="sm";b.textContent="Open it";
    b.onclick=()=>{selectTab(go[0]);if(typeof go[1]==="number"){STU.tab=go[1];renderWork()}else if(go[1])openTool(go[1])};$("#info").appendChild(b)}
   dirty();$("#info").scrollIntoView({block:"nearest"});emit("chap:"+fn)};ul.appendChild(li)})}}

/* ---------- demos ---------- */
const DEMOS={
 "Quick tour":()=>{const pr=newProject();pr.bpm=112;pr.name=null;
  const dp=pr.drum.pats[0];[[0,[0,4,8,12]],[2,[4,12]],[6,[2,6,10,14]],[8,[15]]].forEach(([l,st])=>st.forEach(i=>Object.assign(dp.lanes[l].st[i],{on:true,v:l===6?80:110})));dp.valid=true;pr.tracks[0].mode="drum";
  const bp=pr.tracks[1].pats[0];bp.scale=2;bp.root=9;[[0,45],[3,45],[6,52],[8,48],[11,50],[14,52]].forEach(([i,p])=>{bp.st[i]={n:[{p,g:.6,v:100,t:0,r:100}],on:true,skip:[0,0,0,0]}});bp.valid=true;
  const bp2=pr.tracks[1].pats[1];Object.assign(bp2,deep(bp));bp2.st[14]={n:[{p:55,g:1.5,v:110,t:0,r:100}],on:true,skip:[0,0,0,0]};bp2.st[6].n[0].p=57;
  const ap=pr.tracks[2].pats[0];ap.scale=2;ap.root=9;ap.div=2;ap.arp=3;pr.tracks[2].mode="seq";[[0,[69,72,76]],[4,[67,71,74]],[8,[65,69,72]],[12,[64,67,71]]].forEach(([i,ch])=>{ap.st[i]={n:ch.map(p=>({p,g:3.5,v:80,t:0,r:100})),on:true,skip:[0,0,0,0]}});ap.valid=true;
  const lp=pr.tracks[3].pats[0];lp.scale=2;lp.root=9;lp.div=1;[[0,81],[2,79],[3,76],[5,72],[6,74]].forEach(([i,p])=>{lp.st[i]={n:[{p,g:.9,v:90,t:i%2?20:0,r:i===6?60:100}],on:true,skip:[0,0,0,0]}});lp.len=8;lp.valid=true;
  pr.tracks.forEach(t=>t.valid=true);return pr},
 "Polymeter drums":()=>{const pr=newProject();pr.bpm=120;pr.tracks[0].mode="drum";const dp=pr.drum.pats[0];dp.poly=true;
  [[0,3,[0]],[6,4,[0,2]],[2,5,[2]],[4,6,[0,3]],[8,16,[4,12]]].forEach(([l,len,st])=>{dp.lanes[l].len=len;st.forEach(i=>Object.assign(dp.lanes[l].st[i],{on:true,v:100}))});dp.valid=true;return pr},
 "Three arpeggiators":()=>{const pr=newProject();pr.bpm=100;[1,2,3].forEach(t=>{pr.tracks[t].mode="arp";const p=pr.tracks[t].pats[0];p.scale=3;p.root=2;p.div=[2,1,3][t-1];p.arp=[0,3,4][t-1];p.valid=true});return pr},
};
function loadDemo(name){const pr=DEMOS[name]();stop();S.ram[S.proj]=pr;S.flash[S.proj]=deep(pr);
 if(name==="Three arpeggiators"){S.hold=[0,1,1,1];S.arpLatched=[[],[{p:62,v:90},{p:65,v:80},{p:69,v:85}],[{p:50,v:100},{p:57,v:90}],[{p:74,v:70},{p:77,v:70},{p:81,v:70},{p:84,v:70}]]}
 S.cur=1;msg(name);dirty()}

/* ---------- tabs, buttons, boot ---------- */
/* the old tab names still work: dev = Projects */
function selectTab(w){selectMode(w==="dev"?"proj":w);if(w==="man")viewFollow(tour&&TOURS[tour.i].steps[tour.k]?viewForControl(TOURS[tour.i].steps[tour.k].t):(DEV.lastChap&&CHAP_VIEW[DEV.lastChap])||"whole")}
/* ---------- panel view: zoom the drawing to the part of the KeyStep in use ----------
   Each view is the box around a group of controls, widened to a short strip so the tools below get the room.
   Auto follows the tab, the Device tool in use and the tour step; picking a view by hand pins it. */
const VB_WHOLE=[30,140,1250,460],VIEW_MIN=3,VIEW_MAX=6;   // strip shape limits (width/height)
const VIEWS=[["auto","Auto"],["whole","Whole",null],["transport","Transport",["tempo","swing","tap","shift","play","project","erase","control","sel"]],
 ["tracks","Tracks",["t0dn","t3up","t3trk","scene","pattern","s15","control"]],["steps","Steps & encoders",["enc0","enc4","s0","s15","pg3","stepedit"]],
 ["knobs","Knobs",["enc0","enc4","lst","pg3"]],["keys","Keys",["k0","k36"]]];
const CHAP_VIEW={trackSettings:"tracks",recordBasics:"steps",arpBasics:"keys",scaleBasics:"keys",tempo:"transport",encoders:"steps",shiftFns:"keys",seqLength:"steps",stepEdit:"steps",
 copyPaste:"transport",saving:"transport",drum:"keys",chordMode:"keys",projects:"transport",tracks:"tracks",patterns:"tracks",arranging:"tracks",controlMode:"knobs",utility:"transport",
 fwNames:"transport",fwDrumPads:"tracks",fwChordPads:"whole",fwRootChords:"whole",fwPadArp:"whole",fwModLock:"whole",fwLightsRec:"whole",fwNoteNames:"transport",fwRules:"tracks",fwBass:"tracks",fwVersion:"transport",waCC:"knobs"};
const FEATURE_VIEW={projects:"tracks",library:"tracks",backup:"tracks",setlist:"tracks",names:"tracks",midifile:"tracks",editor:"steps",trackkey:"keys",globals:"knobs"};
let viewMode="auto",viewAuto="whole",viewCur=VB_WHOLE.slice(),viewAnim=0;
function viewBox(name){const v=VIEWS.find(x=>x[0]===name);if(!v||!v[2])return VB_WHOLE.slice();
 let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
 for(const id of v[2]){const c=CI[id];if(!c)continue;const b=c.t==="knob"?[c.cx-c.r-9,c.cy-c.r-9,c.cx+c.r+9,c.cy+c.r+16]:[c.x,c.y,c.x+c.w,c.y+c.h+10];
  x0=Math.min(x0,b[0]);y0=Math.min(y0,b[1]);x1=Math.max(x1,b[2]);y1=Math.max(y1,b[3])}
 if(name==="keys")y0-=32;   // the key function labels above the keys
 x0-=16;y0-=16;x1+=16;y1+=16;let w=x1-x0,h=y1-y0;
 if(w/h>VIEW_MAX){const nh=w/VIEW_MAX;y0-=(nh-h)/2;h=nh}else if(w/h<VIEW_MIN){const nw=h*VIEW_MIN;x0-=(nw-w)/2;w=nw}
 return [x0,y0,w,h]}
function viewApply(vb){viewCur=vb;svg.setAttribute("viewBox",vb.map(n=>n.toFixed(1)).join(" "));$("#panelViewport").style.aspectRatio=vb[2]+"/"+vb[3]}
function viewGo(name){const to=viewBox(name),from=viewCur.slice();cancelAnimationFrame(viewAnim);
 if(matchMedia("(prefers-reduced-motion: reduce)").matches||document.hidden){viewApply(to);return}
 const t0=performance.now(),T=300;const step=t=>{const k=Math.min(1,(t-t0)/T),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;viewApply(from.map((f,i)=>f+(to[i]-f)*e));if(k<1)viewAnim=requestAnimationFrame(step)};viewAnim=requestAnimationFrame(step)}
function viewDraw(){const shown=viewMode==="auto"?viewAuto:viewMode;
 document.querySelectorAll("#viewBtns button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.v===viewMode));
 $("#viewNote").textContent=viewMode==="auto"?"showing "+VIEWS.find(v=>v[0]===shown)[1].toLowerCase():"";
 viewGo(shown)}
/* what is in use right now: called on tab changes, Device tool use and tour steps */
function viewFollow(name){viewAuto=name||"whole";if(viewMode==="auto")viewDraw()}
function viewForControl(id){if(!id||!CI[id])return "whole";const c=CI[id],x=c.cx??c.x+c.w/2,y=c.cy??c.y+c.h/2;
 for(const n of ["steps","tracks","transport","keys"]){const b=viewBox(n);if(x>=b[0]&&x<=b[0]+b[2]&&y>=b[1]&&y<=b[1]+b[3])return n}return "whole"}
function initPanelView(){
 try{const m=localStorage.getItem("ksp.view");if(VIEWS.some(v=>v[0]===m))viewMode=m}catch(e){}
 const box=$("#viewBtns");VIEWS.forEach(([v,n])=>{const b=document.createElement("button");b.dataset.v=v;b.textContent=n;b.onclick=()=>{viewMode=v;try{localStorage.setItem("ksp.view",v)}catch(e){}viewDraw()};box.appendChild(b)});
 /* the Device tool being used decides the Auto view */
 const tools=$("#devCol");const pick=e=>{const f=e.target.closest&&e.target.closest(".feat");if(f&&f.id.startsWith("feat-")){DEV.lastFeat=f.id.slice(5);viewFollow(FEATURE_VIEW[f.id.slice(5)]||"whole")}};
 tools.addEventListener("focusin",pick);tools.addEventListener("pointerdown",e=>{if(!svg.contains(e.target))pick(e)});$("#sideCol").addEventListener("focusin",pick);
 viewApply(viewBox(viewMode==="auto"?viewAuto:viewMode));viewDraw()}
function boot(){baseState();drawPanel();bindInput();renderChapters();initPanelView();devBindBar();
 const ex=$("#exSel");Object.keys(DEMOS).forEach(n=>ex.add(new Option(n,n)));ex.onchange=()=>{if(ex.value)loadDemo(ex.value);ex.value=""};
 const ts=$("#tourSel");TOURS.forEach((t,i)=>ts.add(new Option(t.n,i)));ts.onchange=()=>{if(ts.value!==""){startTour(+ts.value);selectTab("man")}ts.value=""};
 $("#soundBtn").onclick=e=>{SOUND=!SOUND;e.target.setAttribute("aria-pressed",SOUND);if(!SOUND)allOff()};
 $("#midiBtn").onclick=toggleMidi;$("#resetBtn").onclick=()=>{stop();const keep=SIMDEV&&SIMDEV.namesFw;baseState();if(SIMDEV)SIMDEV.namesFw=keep;LATCH.forEach(id=>ctlEls[id]&&ctlEls[id].classList.remove("latched"));dirty();msg("Reset")};
 document.querySelectorAll(".modes button").forEach(b=>b.onclick=()=>selectTab(b.dataset.mode));
 $("#info").innerHTML=`<h2>Start here</h2><p>Hover any control for a short description; click it for the details on this card. Load the <b>Quick tour</b> demo and press Play (or <kbd>Space</kbd>), or pick a guided tour.</p><p>Right-click (long-press on touch) <b>latches</b> a button as if you were holding it, so two-handed combos like Shift + key or Save + Project work with a mouse.</p>`;
 loadDemo("Quick tour");
 let m0="proj";try{m0=localStorage.getItem("ksp.mode")||"proj"}catch(e){}selectTab(m0);
 const w=new Worker(URL.createObjectURL(new Blob(["setInterval(()=>postMessage(0),10)"],{type:"text/javascript"})));w.onmessage=advance;
 const loop=()=>{advance();if(S.msg&&performance.now()>S.msgT){S.msg=null;dirtyFlag=true}if(dirtyFlag||S.playing||NOTEFLASH.length||S.msg||ARP.some(a=>a.running)||S.trans.some(x=>x.on)||trk().chordOn||S.stepEdit||S.rec||S.patMode||S.control||P.some(p=>p.pend!=null)||S.undo||HELD.size){render();dirtyFlag=false}requestAnimationFrame(loop)};requestAnimationFrame(loop);
}
