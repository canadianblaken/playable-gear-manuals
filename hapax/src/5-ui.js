/* ================= front panel ================= */
const PX=c=>105+c*48,PY=r=>236+(7-r)*48;
const LEFTC=["2nd","algo","copy","paste","delete","rec","stop","play"],RBLK=[["live","step"],["pattern","autom"],["settings","effects"],["fill","bpm"],["snapshot","undo"],["minus","plus"]];
const LBL={"2nd":"2ND",algo:"algo",copy:"copy",paste:"paste",delete:"delete",rec:"",stop:"",play:"",live:"live",step:"step",pattern:"pattern",autom:"autom",settings:"settings",effects:"effects",fill:"fill",bpm:"bpm",snapshot:"snapshot",undo:"undo",minus:"–",plus:"+",mute:"mute",all:"all",proA:"proA",proB:"proB"};
const SEC={settings:"REC",effects:"LFO",fill:"ASSIGN",undo:"REDO"};
const MODECOL={live:"#ff5a6a",step:"#5fe0a0",pattern:"#ffd84a",autom:"#3fa9ff"};
const C=[];
[["e1",60,72],["e2",122,72],["e3",60,148],["e4",122,148],["e5",490,72],["e6",552,72],["e7",490,148],["e8",552,148]].forEach(([id,x,y])=>C.push({id,t:"enc",x,y,r:22}));C.push({id:"enc",t:"enc",x:958,y:108,r:32});
C.push({id:"mute",t:"sm",x:17,y:200,w:46,h:22});for(let i=0;i<16;i++)C.push({id:"t"+i,t:"sm",x:PX(i),y:200,w:40,h:22,label:String(i+1)});
C.push({id:"all",t:"sm",x:885,y:200,w:40,h:22},{id:"proA",t:"sm",x:945,y:200,w:40,h:22},{id:"proB",t:"sm",x:995,y:200,w:40,h:22});
LEFTC.forEach((id,j)=>C.push({id,t:"btn",x:17,y:236+j*48,w:46,h:40}));
for(let r=0;r<8;r++)C.push({id:"row"+r,t:"btn",x:885,y:PY(r),w:40,h:40,label:"←"});
RBLK.forEach(([a,b],j)=>{C.push({id:a,t:"btn",x:945,y:236+j*48,w:40,h:40},{id:b,t:"btn",x:995,y:236+j*48,w:40,h:40})});
[["up","M990 566 L952 528 L1028 528Z"],["down","M990 572 L952 610 L1028 610Z"],["left","M987 569 L948 531 L948 607Z"],["right","M993 569 L1032 531 L1032 607Z"]].forEach(([id,d])=>C.push({id,t:"arrow",d}));
for(let r=0;r<8;r++)for(let c=0;c<16;c++)C.push({id:`p${c}_${r}`,t:"pad",x:PX(c),y:PY(r),w:40,h:40,c,r});
const CI=Object.fromEntries(C.map(c=>[c.id,c]));
const svg=$("#device"),ctlEls={},NS="http://www.w3.org/2000/svg";
function el(t,a,p=svg){const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);p.appendChild(e);return e}
function stxt(s,x,y,sz,fill,anchor="middle",p=svg,w="700"){const t=el("text",{x,y,"font-size":sz,fill,"text-anchor":anchor,"font-family":"system-ui,Arial,sans-serif","font-weight":w,"pointer-events":"none"},p);t.textContent=s;return t}
const KL={};let padG;
function buildPanel(){svg.innerHTML="";el("rect",{x:2,y:2,width:1048,height:624,rx:18,fill:"#111214",stroke:"#3a3a3a","stroke-width":2});
 stxt("HAPAX",318,28,16,"#e8e8e8","middle",svg,"800");stxt("unofficial simulation · not affiliated with Squarp",748,28,10,"#666","middle",svg,"400");
 [["L",160],["R",592]].forEach(([k,x])=>{el("rect",{x:x-4,y:32,width:298,height:153,rx:4,fill:"#000",stroke:"#3a3a3a","stroke-width":2,id:"bez"+k,class:"bez"});const fo=el("foreignObject",{x,y:36,width:290,height:145});const d=document.createElement("div");d.style.cssText="width:100%;height:100%";fo.appendChild(d);KL[k]=d});
 padG=el("g",{id:"padG"});
 C.forEach(c=>{const par=c.t==="pad"?padG:svg,g=el("g",{class:"ctl",tabindex:c.t==="pad"?-1:0,role:"button","aria-label":ctlName(c.id)},par);ctlEls[c.id]=g;
  if(c.t==="enc"){el("circle",{cx:c.x,cy:c.y,r:c.r,fill:"#1b1b1d",stroke:"#555","stroke-width":2,class:"face"},g);el("circle",{cx:c.x,cy:c.y,r:c.r-6,fill:"#0c0c0d"},g);c.ind=el("line",{x1:c.x,y1:c.y-4,x2:c.x,y2:c.y-c.r+7,stroke:"#ddd","stroke-width":3,"stroke-linecap":"round"},g);c.rot=0;
   if(c.id!=="enc"){const n={e1:1,e2:2,e3:3,e4:4,e5:5,e6:6,e7:7,e8:8}[c.id];stxt(n,c.x+(c.x<300?-c.r-6:c.r+6),c.y+4,9,"#555","middle",g,"600")}}
  else if(c.t==="pad"){c.face=el("rect",{x:c.x,y:c.y,width:c.w,height:c.h,rx:5,fill:"#151515",stroke:"#2a2a2a","stroke-width":1,class:"face"},g)}
  else if(c.t==="arrow"){c.face=el("path",{d:c.d,fill:"#141416",stroke:"#777","stroke-width":2,class:"face","stroke-linejoin":"round"},g)}
  else{c.face=el("rect",{x:c.x,y:c.y,width:c.w,height:c.h,rx:4,fill:"#141416",stroke:"#666","stroke-width":1.5,class:"face"},g);const lb=c.label||LBL[c.id]||"";
   if(c.id==="rec")el("circle",{cx:c.x+c.w/2,cy:c.y+c.h/2,r:10,fill:"none",stroke:"#ddd","stroke-width":2.5,class:"lamp"},g);else if(c.id==="stop")el("rect",{x:c.x+c.w/2-9,y:c.y+c.h/2-9,width:18,height:18,fill:"none",stroke:"#ddd","stroke-width":2.5,class:"lamp"},g);
   else if(c.id==="play")el("path",{d:`M${c.x+c.w/2-7} ${c.y+c.h/2-10}l16 10l-16 10z`,fill:"none",stroke:"#ddd","stroke-width":2.5,class:"lamp"},g);
   else{const col=c.id==="proA"?"#ffd84a":c.id==="proB"?"#6fa8ff":"#ddd";stxt(lb,c.t==="sm"?c.x+5:c.x+4,c.t==="sm"?c.y+15:c.y+13,c.id==="minus"||c.id==="plus"?16:lb.length>6?9:11,col,"start",g,"700");if(c.id==="t15")stxt("TRSP",c.x+33,c.y+10,6,"#aaa","end",g,"700")}
   if(SEC[c.id]){el("rect",{x:c.x+3,y:c.y+c.h-12,width:SEC[c.id].length*5.6+6,height:9,rx:1.5,fill:"#ddd"},g);stxt(SEC[c.id],c.x+6,c.y+c.h-5,7,"#111","start",g,"800")}}});
 initScreens(KL.L,KL.R);bindAll()}
/* ---------- panel refresh ---------- */
const lastFill={};
function setFill(c,col){if(lastFill[c.id]!==col){lastFill[c.id]=col;c.face.setAttribute("fill",col)}}
function refreshPanel(){const now=performance.now(),P=P_(),T=T_(),blink=now%500<250;
 for(let r=0;r<8;r++)for(let c=0;c<16;c++)setFill(CI[`p${c}_${r}`],padColor(c,r));
 P.tracks.forEach((U,i)=>{const has=U.pats.some(q=>q.notes.length||Object.values(q.aut).some(a=>a.length)),sel=i===P.sel,mg=S.ui.mg&&S.ui.mg.has(S.ap+":"+i);let col=sel?"#f0f0f0":has?"#6a6a6a":"#18181a";
  if(trackSilent(P,U)&&!sel)col=now%1200<600?"#4a4a4a":"#2a2a2a";if(mg)col=blink?"#ff8080":"#401010";if(isLeader(P,U)&&blink&&!sel)col="#8a7a30";setFill(CI["t"+i],col)});
 setFill(CI.proA,S.ap===0?"#4a4020":S.P[0].muted?"#300":"#141416");setFill(CI.proB,S.ap===1?"#203050":S.P[1].muted?"#300":"#141416");
 ["live","step","pattern","autom"].forEach(m=>setFill(CI[m],S.ui.mode===m?MODECOL[m]:hex2(MODECOL[m],.18)));
 [["settings","settings"],["effects","fx"],["fill","assign"],["algo","algo"],["mute","mix"]].forEach(([b,s])=>setFill(CI[b],(S.ui.sub===s||S.ui.mode===s)?"#5a5a5a":b==="fill"&&S.fill?"#806020":"#141416"));
 setFill(CI.bpm,S.ui.page==="bpm"?"#5a5a5a":"#141416");setFill(CI["2nd"],isHeld("2nd")?"#5a5a5a":"#141416");setFill(CI.snapshot,S.snap?(S.snap.showing==="cap"?"#803030":"#2f6a3a"):"#141416");
 const rl=CI.rec,rc=S.rec?"#ff3b3b":(S.recArm||S.countEnd!=null)&&blink?"#ff3b3b":"#141416";setFill(rl,rc);setFill(CI.play,S.playing?"#1f7a3a":"#141416");
 for(let r=0;r<8;r++){let col="#141416";if(S.ui.mode==="pattern"){const k=patAt(r);if(k<16&&P.tracks.every(U=>U.cur===k))col="#7a7a7a"}else if(S.ui.mode==="step"&&T.type==="DRUM"&&T.velView===T.dpage*8+r)col="#5a5a5a";setFill(CI["row"+r],col)}
 ["e1","e2","e3","e4","e5","e6","e7","e8","enc","all","minus","plus","copy","paste","delete","stop","undo","up","down","left","right"].forEach(id=>{const c=CI[id];if(!c.face||c.t==="enc")return;setFill(c,isHeld(id)?"#4a4a4a":"#141416")});
 ["L","R"].forEach(k=>$("#bez"+k).classList.toggle("tourTarget",!!(tour&&curStep()&&curStep()[0]===(k==="L"?"lscreen":"rscreen"))));padG.classList.toggle("tourTarget",!!(tour&&curStep()&&curStep()[0]==="pads"))}
/* ================= input ================= */
// HELD: controls currently held down (or latched with right-click / long-press)
const HELD=new Map();let tipTimer=null,lpT=null;
const isHeld=id=>HELD.has(id);
const heldLong=id=>{const h=HELD.get(id);return!!h&&(h.latched||performance.now()-h.t0>=holdMs())};
const holdMs=()=>({FASTER:200,FAST:280,NORMAL:HOLDMS,SLOW:550,"EXTRA SLOW":800}[S.set.holdt]||HOLDMS);
const MODS=["2nd","copy","paste","delete","mute","left","right","up","down","all","fill","rec","pattern","live","step"];
function heldTrack(){if(MODS.some(m=>m!=="fill"&&isHeld(m)))return null;for(let i=0;i<16;i++){const h=HELD.get("t"+i);if(h&&heldLong("t"+i)&&!h.used)return i}return null}
function heldProj(){if(isHeld("mute"))return null;for(const[i,id]of[[0,"proA"],[1,"proB"]]){const h=HELD.get(id);if(h&&heldLong(id)&&!h.used)return i}return null}
function heldPads(){const o=[];HELD.forEach((h,id)=>{if(id[0]==="p"&&id[1]!=="r"&&CI[id]&&CI[id].t==="pad"&&(h.latched||performance.now()-h.t0>=holdMs()||h.sel))o.push({c:CI[id].c,r:CI[id].r})});return o}
function heldPadsAny(){const o=[];HELD.forEach((h,id)=>{if(CI[id]&&CI[id].t==="pad")o.push({c:CI[id].c,r:CI[id].r,h})});return o}
function heldRows(){const o=[];for(let r=0;r<8;r++)if(heldLong("row"+r))o.push(r);return o}
function encHeld(j){const id=Object.keys(ENC2SLOT).find(k=>ENC2SLOT[k]===j);return heldLong(id)}
function markUsed(except){HELD.forEach((h,id)=>{if(id!==except)h.used=true})}
// encoders used while a page is held (track, project, pattern pad, row) keep that page open
const PAGEHOLD=id=>/^t\d|^pro[AB]$|^row|^p\d/.test(id);
function markEnc(id){HELD.forEach((h,k)=>{if(k===id)return;if(PAGEHOLD(k))h.enc=true;else h.used=true})}
// selection = held pads / rows / all, recomputed every frame
function computeSel(){const T=T_(),p=PAT(T),m=S.ui.mode;if(m!=="step")return null;const two=isHeld("2nd");
 if(isHeld("all")){const pl=pageLen(T);return new Set(p.notes.filter(n=>!two||(n.s>=T.page*pl&&n.s<(T.page+1)*pl)))}
 const rows=heldRows();if(rows.length&&T.type!=="DRUM"){const lo=rowPitch(T,Math.min(...rows)),hi=rowPitch(T,Math.max(...rows)),pl=pageLen(T);return new Set(p.notes.filter(n=>n.n>=lo&&n.n<=hi&&(!two||(n.s>=T.page*pl&&n.s<(T.page+1)*pl))))}
 const hp=heldPads();if(!hp.length)return null;if(hp.length===1){const ns=notesAt(T,hp[0].c,hp[0].r);return ns.length?new Set(ns):new Set()}
 const c0=Math.min(...hp.map(x=>x.c)),c1=Math.max(...hp.map(x=>x.c)),r0=Math.min(...hp.map(x=>x.r)),r1=Math.max(...hp.map(x=>x.r)),t0=colT(T,c0),t1=colT(T,c1)+stepSpp(T),D=T.type==="DRUM";
 const lo=D?T.dpage*8+r0:rowPitch(T,r0),hi=D?T.dpage*8+r1:rowPitch(T,r1),con=two||D;return new Set(p.notes.filter(n=>n.s+n.u/100>=t0-1e-6&&n.s+n.u/100<t1-1e-6&&(!con||(n.n>=lo&&n.n<=hi))))}
let selVer=0,frameNo=0;
function selNotes(){if(S._selV!==selVer||S._selF!==frameNo){S._sel=computeSel();S._selV=selVer;S._selF=frameNo}return S._sel}
function autLane(T){return clamp(T.rt.lane??0,0,T.lanes.length)}
function autSelEv(){if(S.ui.mode!=="autom")return[];const T=T_(),hp=heldPads();if(!hp.length)return[];const p=PAT(T),li=autLane(T),ev=p.aut[li]||[],c0=Math.min(...hp.map(x=>x.c)),c1=Math.max(...hp.map(x=>x.c)),t0=colT(T,c0),t1=colT(T,c1)+stepSpp(T);return ev.filter(e=>e.t>=t0-1e-6&&e.t<t1-1e-6)}
function bindAll(){C.forEach(c=>{const g=ctlEls[c.id];
 g.addEventListener("pointerdown",e=>{e.preventDefault();try{g.setPointerCapture(e.pointerId)}catch(_){}firstGesture();if(c.t!=="pad")showInfo(c.id);
  if(e.pointerType!=="mouse"){showTip(c.id,e);clearTimeout(tipTimer);tipTimer=setTimeout(hideTip,2500)}
  if(c.t==="enc"){encDown(c,e);return}
  if(e.button===2){toggleLatch(c.id);return}
  if(HELD.get(c.id)&&HELD.get(c.id).latched){toggleLatch(c.id);return}
  down(c.id);if(e.pointerType!=="mouse"){clearTimeout(lpT);lpT=setTimeout(()=>{const h=HELD.get(c.id);if(h&&!h.used){h.latched=true;h.skipUp=true;g.classList.add("latched")}},650)}});
 g.addEventListener("pointermove",e=>{if(c.t==="enc")encMove(c,e)});
 g.addEventListener("pointerup",e=>{clearTimeout(lpT);if(c.t==="enc"){encUp(c,e);return}const h=HELD.get(c.id);if(!h||h.latched)return;up(c.id)});
 g.addEventListener("pointercancel",()=>{if(c.t==="enc"){drag=null;HELD.delete(c.id);return}const h=HELD.get(c.id);if(h&&!h.latched)up(c.id)});
 g.addEventListener("contextmenu",e=>e.preventDefault());g.style.touchAction="none";
 g.addEventListener("wheel",e=>{if(c.t!=="enc")return;e.preventDefault();const hold=(drag&&drag.c===c)||e.altKey||heldLong(c.id);if(drag&&drag.c===c)drag.turned=true;turnEnc(c.id,e.deltaY<0?1:-1,{hold})},{passive:false});
 g.addEventListener("pointerenter",e=>{g.classList.add("hl");if(e.pointerType==="mouse")showTip(c.id,e)});g.addEventListener("pointerleave",()=>{g.classList.remove("hl");hideTip()});g.addEventListener("mousemove",moveTip);
 g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();e.stopPropagation();if(c.t==="enc")pressEnc(c.id);else{down(c.id);up(c.id)}}else if(c.t==="enc"&&(e.key==="ArrowUp"||e.key==="ArrowDown")){e.preventDefault();turnEnc(c.id,e.key==="ArrowUp"?1:-1,{})}})})}
function toggleLatch(id){const g=ctlEls[id],h=HELD.get(id);if(h&&h.latched){g.classList.remove("latched");HELD.get(id).latched=false;up(id);return}if(!h)down(id);const hh=HELD.get(id);hh.latched=true;hh.t0-=10000;g.classList.add("latched");emit("latch:"+id)}
let drag=null;
function encDown(c,e){if(e.button===2){if(HELD.get(c.id)&&HELD.get(c.id).latched){HELD.delete(c.id);ctlEls[c.id].classList.remove("latched")}else{HELD.set(c.id,{t0:-1e9,latched:true});ctlEls[c.id].classList.add("latched")}return}
 drag={c,y:e.clientY,acc:0,t0:performance.now(),turned:false};if(!HELD.has(c.id))HELD.set(c.id,{t0:performance.now()})}
function encMove(c,e){if(!drag||drag.c!==c)return;drag.acc+=drag.y-e.clientY;drag.y=e.clientY;while(Math.abs(drag.acc)>=8){const d=Math.sign(drag.acc);drag.acc-=d*8;drag.turned=true;turnEnc(c.id,d,{hold:heldLong(c.id)&&HELD.get(c.id).latched})}}
function encUp(c){if(!drag||drag.c!==c)return;const dur=performance.now()-drag.t0,turned=drag.turned;drag=null;const h=HELD.get(c.id);if(h&&!h.latched)HELD.delete(c.id);if(turned)return;if(dur<500)pressEnc(c.id);else resetEnc(c.id)}
let gestured=false;function firstGesture(){if(gestured&&AC&&AC.state==="running")return;gestured=true;if(sound){ensureAC();AC.resume()}}
/* ---------- encoders ---------- */
function turnEnc(id,d,o){const c=CI[id];c.rot=(c.rot+d*15)%360;c.ind.setAttribute("transform",`rotate(${c.rot} ${c.x} ${c.y})`);o.fast=isHeld("2nd");markEnc(id);
 if(id==="enc")mainTurn(d,o);else{const s=slots(view())[ENC2SLOT[id]];if(s&&s.t)s.t(d,o)}emit("enc:"+id)}
function pressEnc(id){markEnc(id);if(id==="enc")return mainPress();const s=slots(view())[ENC2SLOT[id]];if(s&&s.p)s.p();else if(s&&s.t&&s.v&&/^(ON|OFF)$/.test(s.v))s.t(1,{});emit("encp:"+id)}
function resetEnc(id){if(id==="enc")return mainHold();const s=slots(view())[ENC2SLOT[id]];if(s&&s.h){s.h();toast("RESET "+s.l)}else if(s&&s.l==="VELOCITY"){const T=T_(),sel=selNotes();if(sel&&sel.size){mark1();sel.forEach(n=>n.v=100)}else T.def.v=100;toast("VELOCITY 100")}emit("encr:"+id)}
function mainTurn(d,o){const v=view(),T=T_(),P=P_();
 if(S.ov){if(S.ov.t==="list")S.ov.sel=clamp(S.ov.sel+d,0,S.ov.items.length-1);return}
 if(isHeld("step")&&v!=="ttype"||v==="ttype"){S.ui.tt=true;const i=clamp(TTYPES.indexOf(T.type)+d,0,TTYPES.length-1);if(TTYPES[i]!==T.type){setType(T,TTYPES[i])}HELD.get("step")&&(HELD.get("step").used=true);return}
 if(isHeld("live")&&T.type!=="DRUM"){S.ui.lm=true;T.live.mode=LIVEMODES[clamp(LIVEMODES.indexOf(T.live.mode)+d,0,1)];HELD.get("live").used=true;emit("lmode:"+T.live.mode);return}
 switch(v){case"step":T.view=clamp(T.view+d,0,120);break;case"autom":T.rt.lane=clamp(autLane(T)+d,0,T.lanes.length);emit("aut:lane");break;
  case"pattern":if(P.tab==="SECTIONS")P.secSel=clamp(P.secSel+d,0,P.sections.length);else P.songSel=clamp(P.songSel+d,0,P.song.length);emit("sec:scroll");break;
  case"fx":if(o.hold&&T.fx[S.ui.fxSel]&&S.ui.fxSel>0){const j=clamp(S.ui.fxSel+d,1,T.fx.length-1);[T.fx[S.ui.fxSel],T.fx[j]]=[T.fx[j],T.fx[S.ui.fxSel]];S.ui.fxSel=j;emit("fx:move")}else{S.ui.fxSel=clamp(S.ui.fxSel+d,0,7);S.ui.fxSec=null;emit("fx:sel")}break;
  case"settings":{const items=SETTINGS[S.ui.setTab][1];if(S.ui.setEdit){const it=items[S.ui.setRow];S.set[it[0]]=it[2][clamp(it[2].indexOf(S.set[it[0]])+d,0,it[2].length-1)];emit("set:"+it[0])}else S.ui.setRow=clamp(S.ui.setRow+d,0,items.length-1);break}
  case"proj":S.ui.projRow=clamp(S.ui.projRow+d,0,4);HELD.forEach((h,id)=>{if(id==="proA"||id==="proB")h.keep=true});break;
  case"bpm":{const f=S.ui.bpmF;if(f===0)setBpm(S.bpm+d*(o.fast?10:1));else if(f===1)setBpm(S.bpm+d*.01);else if(f===2)setEl(T,clamp(T.el+d*(o.fast?10:1),1,400));else setEl(T,clamp(Math.round((T.el+d*.01)*100)/100,1,400));emit(f>=2?"el":"bpm:set");break}
  default:break}}
function mainPress(){const v=view(),T=T_(),P=P_();
 if(S.ov){const o=S.ov;if(o.t==="list"){S.ov=null;o.enter&&o.enter(o.sel)}else if(o.t==="kbd"){const val=o.val.trim();S.ov=null;if(val)o.enter(val)}return}
 switch(v){case"pattern":if(P.tab==="SECTIONS"){if(P.secSel>=P.sections.length)saveSection(P);else if(isHeld("2nd"))sectionMenu(P,P.secSel);else{launchSection(P,P.secSel);toast("LAUNCH "+P.sections[P.secSel].name)}}
   else{if(P.songSel>=P.song.length){if(!P.sections.length){toast("SAVE A SECTION FIRST");return}listPopup("ADD SECTION",P.sections.map(s=>s.name),0,i=>listPopup("DURATION",[1,2,4,8,16,32].map(b=>b+" BAR"+(b>1?"S":"")),2,j=>{P.song.splice(P.songSel,0,{sec:i,bars:[1,2,4,8,16,32][j]});P.songSel++;emit("song:add")}))}else songMenu(P,P.songSel)}break;
  case"fx":fxMenu(T);break;case"settings":S.ui.setEdit=!S.ui.setEdit;break;case"bpm":S.ui.bpmF=(S.ui.bpmF+1)%4;break;
  case"proj":{const pi=heldProj(),Q=S.P[pi];HELD.forEach((h,id)=>{if(id==="proA"||id==="proB")h.used=true});projAction(pi,S.ui.projRow);break}
  case"autom":autLaneMenu(T);break;default:break}}
function mainHold(){if(view()==="fx")toast("HOLD THE MAIN ENCODER AND TURN TO MOVE THE EFFECT")}
/* ---------- buttons ---------- */
const SOLO_INSTANT=new Set(["play","stop","rec","fill","undo"]);
function down(id){selVer++;const h={t0:performance.now(),used:false};const others=[...HELD.keys()].filter(k=>k!==id);HELD.set(id,h);emit("press:"+id);
 const c=CI[id];if(c&&c.t==="pad"){padDown(c.c,c.r);return}
 if(combo(id,others)){h.used=true;markUsed(id);return}
 if(others.length&&id!=="2nd")markUsed(id);
 if(id==="play"){if(S.playing&&(S.ui.mode==="step"||S.ui.mode==="autom")&&T_().page>0){const s=T_().page*pageLen(T_());S.P.forEach(P=>P.tracks.forEach(U=>{U.rt.b0=tpos();U.rt.s0=s}));emit("play:page")}else play()}
 else if(id==="stop")stop();else if(id==="rec")recPress();else if(id==="fill"){S.fill=true;emit("fill")}
 else if(id==="bpm"){if(isHeld("2nd")){tapTempo();h.used=true}}
 else if(id==="undo"){undo(isHeld("2nd"))}
 if(id==="snapshot"){clearTimeout(S._snapT);S._snapT=setTimeout(()=>{const hh=HELD.get("snapshot");if(hh&&!hh.used){hh.used=true;hh.capt=true;snapCapture()}},holdMs()+150)}}
function up(id){selVer++;const h=HELD.get(id);HELD.delete(id);ctlEls[id]&&ctlEls[id].classList.remove("latched");if(!h)return;const c=CI[id];
 if(c&&c.t==="pad"){padUp(c.c,c.r,h);return}
 if(id==="fill")S.fill=false;if(id==="step"||id==="live"){S.ui.tt=false;S.ui.lm=false}
 if(id==="mute"&&S.ui.mg&&S.ui.mg.size){S.ui.mg.forEach(k=>{const[pi,i]=k.split(":").map(Number);S.P[pi].tracks[i].mute=!S.P[pi].tracks[i].mute});S.ui.mg=new Set();emit("mute:group");return}
 if(h.used||h.enc||SOLO_INSTANT.has(id)||h.skipUp)return;const long=performance.now()-h.t0>=holdMs();if(long&&!["minus","plus","left","right","up","down","undo","all"].includes(id))return;tap(id)}
// a button pressed while another is held
function combo(id,held){const H=k=>held.includes(k),P=P_(),T=T_(),tm=/^t(\d+)$/.exec(id);
 if(tm){const i=+tm[1],U=P.tracks[i];
  if(H("delete")){P.tracks[i]=Object.assign(newTrack(i),{name:U.name,leader:U.leader,rt:trackRT()});toast("TRACK "+(i+1)+" DELETED");emit("track:del");return true}
  if(H("copy")){S.clip={k:"track",d:deep(stripTrack(U))};toast("TRACK "+(i+1)+" COPIED");emit("copy");return true}
  if(H("paste")&&S.clip&&S.clip.k==="track"){P.tracks[i]=reviveTrack(deep(S.clip.d),U.leader);toast("PASTED ON TRACK "+(i+1));emit("paste");return true}
  if(H("mute")){if(H("2nd")||S.set.mgroup==="OFF"){U.mute=!U.mute;emit("mute:instant")}else{S.ui.mg=S.ui.mg||new Set();const k=S.ap+":"+i;S.ui.mg.has(k)?S.ui.mg.delete(k):S.ui.mg.add(k);emit("mute:pend")}return true}
  if(H("left")||H("right")){const p=PAT(T),a=Math.round(colT(T,i)),sp=Math.max(1,Math.round(stepSpp(T)));mark();p.loop=p.loop||[0,p.len-1];if(H("left"))p.loop[0]=a;else p.loop[1]=a+sp-1;if(p.loop[1]<p.loop[0])p.loop=[p.loop[1],p.loop[0]];toast(`LOOP ${p.loop[0]+1}–${p.loop[1]+1}`);emit("loop:set");return true}
  if(H("2nd")){P.sel=i;S.ui.page=S.ui.page==="trk2"?null:"trk2";emit("page:trk2");return true}return false}
 if((id==="left"||id==="right")&&(H("left")||H("right"))){mark();PAT(T).loop=null;toast("LOOP POINTS CLEARED");emit("loop:clear");return true}
 if(id==="left"||id==="right"){const ti=[...Array(16).keys()].find(i=>H("t"+i));if(ti!=null){const j=ti+(id==="left"?-1:1);if(j>=0&&j<16){[P.tracks[ti],P.tracks[j]]=[P.tracks[j],P.tracks[ti]];P.sel=j;HELD.delete("t"+ti);toast(`TRACKS ${ti+1} ⇄ ${j+1}`);emit("track:swap")}return true}}
 if((id==="proA"||id==="proB")&&H("mute")){const Q=S.P[id==="proA"?0:1];if(H("2nd")||!S.playing){Q.muted=!Q.muted;if(!Q.muted)sendPCs(Q)}else Q.rt.muteAt={at:nextQ(parseInt(S.set.psync)*barB(Q),tpos()),to:!Q.muted};toast((Q.muted?"UNMUTE ":"MUTE ")+(id==="proA"?"proA":"proB"));emit("proj:mute:"+id);return true}
 if(id==="step"&&H("delete")){mark();PAT(T).notes=[];toast("NOTES DELETED");emit("del:notes");return true}
 if(id==="autom"&&H("delete")){mark();PAT(T).aut={};toast("AUTOMATION DELETED");emit("del:aut");return true}
 if((id==="step"&&H("live"))||(id==="live"&&H("step"))){S.srec={seq:[],rate:"1/16",mono:"OFF",chord:[]};S.ui.mode="live";S.ui.sub="steprec";emit("steprec");return true}
 if(id==="fill"&&H("2nd")){S.ui.sub=S.ui.sub==="assign"?null:"assign";emit("sub:assign");return true}
 if((id==="minus"&&H("plus"))||(id==="plus"&&H("minus"))){T.tz=!T.tz;T.zoom=T.tz?1:4;T.page=0;toast(T.tz?"TRIPLET ZOOM":"REGULAR ZOOM");emit("zoom:t");return true}
 if(id.startsWith("row")&&H("2nd")&&S.ui.mode==="step"&&T.type==="DRUM"){const l=T.dpage*8+(+id.slice(3));T.velView=T.velView===l?null:l;emit("velview");return true}
 if(id.startsWith("row")&&S.ui.mode==="pattern"&&(H("copy")||H("paste"))){const k=patAt(+id.slice(3));if(H("copy")){S.clip={k:"row",d:P.tracks.map(U=>deep(U.pats[k]))};toast("ROW COPIED")}else if(S.clip&&S.clip.k==="row"){P.tracks.forEach((U,i)=>U.pats[k]=deep(S.clip.d[i]));toast("ROW PASTED")}emit(H("copy")?"copy":"paste");return true}
 // a selection is held (step mode): edit it
 const sel=selNotes();if(sel&&sel.size&&S.ui.mode==="step"){
  if(id==="delete"){mark();PAT(T).notes=PAT(T).notes.filter(n=>!sel.has(n));toast("DELETED");emit("sel:del");return true}
  if(id==="mute"){mark();const m=![...sel].every(n=>n.mute);sel.forEach(n=>n.mute=m);emit("sel:mute");return true}
  if(id==="copy"){const ns=[...sel];S.clip={k:"notes",d:deep(ns),t0:Math.min(...ns.map(n=>n.s)),p0:Math.min(...ns.map(n=>n.n))};toast(ns.length+" NOTES COPIED");emit("copy");return true}
  if(["left","right","up","down"].includes(id)){mark();const sp=Math.max(1,Math.round(stepSpp(T))),L=PAT(T).len;sel.forEach(n=>{if(id==="left")n.s=(n.s-sp+L)%L;else if(id==="right")n.s=(n.s+sp)%L;else n.n=clamp(n.n+(id==="up"?1:-1)*(P.psc.on&&T.psc?0:1),0,127);if(P.psc.on&&T.psc&&(id==="up"||id==="down")){const iv=scaleOf(P.psc.ci,P.psc.si).iv;let k=n.n;do{k+=id==="up"?1:-1}while(!iv.includes(((k-P.psc.key)%12+12)%12)&&k>0&&k<127);n.n=k}});emit("sel:move");return true}
  if(id==="minus"||id==="plus"){if((T.type==="AFTR"||T.type==="MPE")&&id==="plus"&&sel.size&&heldPads().length===1){T.cyc++;emit("step:cyc");return true}
   mark();const ns=[...sel],sp=stepSpp(T),c0=Math.min(...ns.map(n=>n.s)),c1=Math.max(...ns.map(n=>n.s)),hp=heldPads(),span=hp.length>1?Math.round((Math.max(...hp.map(x=>x.c))-Math.min(...hp.map(x=>x.c))+1)*sp):Math.max(1,c1-c0+1),st=hp.length>1?Math.round(colT(T,Math.min(...hp.map(x=>x.c)))):c0;
   if(S.set.selpm==="WARP"){const f=(span+(id==="plus"?sp:-sp))/span;ns.forEach(n=>{const t=st+(n.s+n.u/100-st)*f,s=Math.round(t);n.s=s;n.u=clamp(Math.round((t-s)*100),-50,50)});toast("WARP "+(id==="plus"?"+":"–"))}
   else{ns.forEach(n=>{n.s=st+(((n.s-st+(id==="plus"?1:-1))%span)+span)%span});toast("ROTATE")}emit("warp");return true}}
 if(id.startsWith("row")&&S.ui.mode==="pattern"&&H("mute")){const k=patAt(+id.slice(3));P.tracks.forEach(U=>U.pats[k].mute=!U.pats[k].mute);return true}
 return false}
function tap(id){const P=P_(),T=T_(),two=isHeld("2nd"),m=S.ui.mode;const tm=/^t(\d+)$/.exec(id);
 if(tm){const i=+tm[1];if(T.rt.loopRec&&i===P.sel){endLoop(T);return}P.sel=i;S.ui.page=null;emit("track:sel");emit("track:sel:"+i);return}
 const rw=/^row(\d)$/.exec(id);if(rw){const r=+rw[1];if(m==="pattern"){const k=patAt(r);if(k<16){P.tracks.forEach(U=>launchPat(P,U,k,"row"));emit("pat:row")}}return}
 switch(id){
  case"proA":case"proB":S.ap=id==="proA"?0:1;emit("proj:sel");break;
  case"mute":setMode(m==="mix"?S.ui.prev||"live":"mix");break;
  case"live":if(two){S.ui.sub=S.ui.sub==="monitor"?null:"monitor";emit("monitor")}else setMode("live");break;
  case"step":if(two){T.mono=!T.mono;toast("MONO EDIT "+(T.mono?"ON":"OFF"));emit("mono")}else if(m==="step"&&!S.ui.sub)focusNote(T);else setMode("step");break;
  case"autom":setMode("autom");break;
  case"pattern":if(m==="pattern"&&!S.ui.sub){P.tab=P.tab==="SECTIONS"?"SONG":"SECTIONS";emit("tab:"+P.tab)}else setMode("pattern");break;
  case"settings":if(two){S.ui.page=S.ui.page==="recset"?null:"recset";emit("page:recset")}else{S.ui.sub=S.ui.sub==="settings"?null:"settings";emit("sub:settings")}break;
  case"effects":if(two){S.ui.sub=S.ui.sub==="lfo"?null:"lfo";emit("sub:lfo")}else{S.ui.sub=S.ui.sub==="fx"?null:"fx";emit("sub:fx")}break;
  case"fill":break;
  case"bpm":S.ui.page=S.ui.page==="bpm"?null:"bpm";S.ui.bpmF=0;emit("bpm:open");break;
  case"snapshot":if(!HELD.get("snapshot"))snapToggle();break;
  case"algo":if(m==="step"||m==="autom"){S.ui.sub=S.ui.sub==="algo"?null:"algo";const av=Object.keys(ALGODEF).filter(x=>ALGODEF[x].where.includes(m==="autom"?"AUTOM":T.type==="DRUM"?"DRUM":"POLY"));if(!av.includes(S.ui.algo))S.ui.algo=av[0];emit("sub:algo")}else toast("ALGO: STEP OR AUTOM MODE");break;
  case"minus":case"plus":{const d=id==="plus"?1:-1;if(two){mark();const p=PAT(T);p.len=clamp(d>0?p.len*2:Math.max(1,Math.round(p.len/2)),1,512);toast("LENGTH "+lenName(p.len));emit("len:x2")}
   else if(m==="step"||m==="autom"||(m==="live"&&false)){const Z=T.tz?TZOOMS:ZOOMS;T.zoom=clamp(T.zoom+d,0,Z.length-1);T.page=clamp(T.page,0,pages(T)-1);toast("ZOOM "+Z[T.zoom][0]);emit("zoom")}break}
  case"left":case"right":{const d=id==="right"?1:-1;
   if(view()==="settings"){S.ui.setTab=clamp(S.ui.setTab+d,0,SETTINGS.length-1);S.ui.setRow=0;S.ui.setEdit=false;break}
   if(two&&(m==="step"||m==="live"||m==="autom")){mark();const p=PAT(T);if(d>0&&p.len<=256){const L=p.len;p.notes=p.notes.concat(p.notes.map(n=>newNote({...n,s:n.s+L})));Object.keys(p.aut).forEach(k=>p.aut[k]=p.aut[k].concat(p.aut[k].map(e=>({t:e.t+L,v:e.v}))));p.len=L*2}
    else if(d<0&&p.len>1){p.len=Math.max(1,Math.round(p.len/2));p.notes=p.notes.filter(n=>n.s<p.len);Object.keys(p.aut).forEach(k=>p.aut[k]=p.aut[k].filter(e=>e.t<p.len))}toast((d>0?"DUPLICATED · ":"HALVED · ")+lenName(p.len));emit("dup");break}
   if(m==="step"||m==="autom"){T.page=clamp(T.page+d,0,pages(T)-1);T.lockPage=S.playing;emit("pagenav")}else if(m==="pattern"){const hp=heldPads();if(hp.length){}else S.ui.poff=clamp(S.ui.poff+d*8,0,8)}break}
  case"up":case"down":{const d=id==="up"?1:-1;
   if(m==="pattern"){S.ui.poff=clamp(S.ui.poff-d*(two?8:1),0,8);emit("pat:scroll")}
   else if(m==="step"){if(T.type==="DRUM"){T.dpage=clamp(T.dpage+d,0,1)}else T.view=clamp(T.view+d*(two?1:12),0,120);emit("oct")}
   else if(m==="autom"){T.rt.lane=clamp(autLane(T)-d,0,T.lanes.length);emit("aut:lane")}
   else{if(T.type==="DRUM")T.dpage=clamp(T.dpage+d,0,1);else T.live.oct=clamp(T.live.oct+d,0,9);emit("oct")}break}}}
function setMode(m){if(m!=="mix")S.ui.prev=m;S.ui.mode=m;S.ui.sub=null;S.ui.page=null;S.ov=null;emit("mode:"+m)}
function setType(T,t){allNotesOff();if((T.type==="DRUM")!==(t==="DRUM")){T.pats.forEach(p=>p.notes=[])}T.type=t;T.cyc=0;S.ui.livePlay.clear();emit("type:"+t)}
function focusNote(T){const p=PAT(T);if(!p.notes.length)return;const pl=pageLen(T),n=p.notes.slice().sort((a,b)=>Math.abs(a.n-T.view-4)-Math.abs(b.n-T.view-4))[0];if(T.type!=="DRUM")T.view=clamp(n.n-3,0,120);T.page=Math.floor(n.s/pl);toast("FOCUS "+nm(n.n));emit("focus")}
/* ---------- pads ---------- */
function padDown(c,r){const P=P_(),T=T_(),m=S.ui.mode,id=`p${c}_${r}`,h=HELD.get(id);
 [...HELD.keys()].forEach(k=>{if(k!==id&&!(CI[k]&&CI[k].t==="pad"))HELD.get(k).used=true});emit("pad");
 if(isHeld("pattern")&&m!=="pattern"){const k=patAt(r);P.sel=c;if(k<16){const U=P.tracks[c];if(S.playing){switchPat(P,U,k,tpos(),null)}else U.cur=k;toast(`TR${c+1} P${k+1}`);emit("pat:instant")}h.used=true;return}
 if(m==="mix"){const pi=r>=4?0:1,row=3-(r%4),U=S.P[pi].tracks[c];
  if(row===0){U.mute=!U.mute;emit("mix:mute")}else if(row===1){const others=heldPadsAny().filter(x=>x.r===r&&x.c!==c);if(!others.length&&!U.solo)S.P[pi].tracks.forEach(x=>x.solo=false);U.solo=!U.solo;emit("mix:solo")}
  else if(row===2){U.tog=true;emit("mix:tog")}else{U.arm=!U.arm;emit("mix:arm")}return}
 if(m==="pattern"){const U=P.tracks[c],k=patAt(r);if(k>15)return;
  if(isHeld("delete")){U.pats[k]=newPat();toast("PATTERN DELETED");h.used=true;emit("pat:del")}else if(isHeld("copy")){S.clip={k:"pat",d:deep(U.pats[k])};toast(`TR${c+1} P${k+1} COPIED`);h.used=true;emit("copy")}
  else if(isHeld("paste")&&S.clip&&S.clip.k==="pat"){U.pats[k]=deep(S.clip.d);toast("PASTED");h.used=true;emit("paste")}else if(isHeld("mute")){U.pats[k].mute=!U.pats[k].mute;h.used=true;emit("pat:mute")}return}
 if(m==="autom")return autPadDown(T,c,r,h);
 if(m==="step")return stepPadDown(T,c,r,h);
 livePadDown(T,c,r,h)}
function padUp(c,r,h){const P=P_(),T=T_(),m=S.ui.mode,long=performance.now()-h.t0>=holdMs()||h.latched||h.sel;
 if(m==="mix"){const pi=r>=4?0:1,row=3-(r%4);if(row===2)S.P[pi].tracks[c].tog=false;return}
 if(h.enc)return;
 if(m==="pattern"){if(h.used||long)return;const U=P.tracks[c],k=patAt(r);if(k>15)return;P.sel=c;launchPat(P,U,k,"pad");return}
 if(m==="autom")return autPadUp(T,c,r,h,long);
 if(m==="step")return stepPadUp(T,c,r,h,long);
 livePadUp(T,c,r)}
// step mode
function stepPadDown(T,c,r,h){const p=PAT(T),t0=colT(T,c);if(t0>=p.len)return;const D=T.type==="DRUM",pitch=D?T.dpage*8+r:rowPitch(T,r),ns=notesAt(T,c,r);
 if(isHeld("delete")){if(ns.length){mark();p.notes=p.notes.filter(n=>!ns.includes(n));emit("step:del")}h.used=true;return}
 if(isHeld("mute")){if(ns.length){mark();ns.forEach(n=>n.mute=!n.mute);emit("step:mute")}h.used=true;return}
 if(isHeld("paste")&&S.clip&&S.clip.k==="notes"){mark();const dt=Math.round(t0)-S.clip.t0,dp=isHeld("2nd")?pitch-S.clip.p0:0;S.clip.d.forEach(n=>{const q=newNote({...n,s:n.s+dt,n:clamp(n.n+dp,0,127)});if(q.s<p.len)p.notes.push(q)});toast("PASTED");h.used=true;emit("paste");return}
 const first=heldPadsAny().find(x=>!(x.c===c&&x.r===r)&&!x.h.used);
 if(first){h.second={c:first.c,r:first.r};clearTimeout(h.tm);h.tm=setTimeout(()=>{const hh=HELD.get(`p${c}_${r}`);if(hh){hh.sel=true;const f=HELD.get(`p${first.c}_${first.r}`);if(f)f.sel=true;emit("sel")}},holdMs());return}
 if(ns.length){h.had=true;clearTimeout(h.tm);h.tm=setTimeout(()=>{const hh=HELD.get(`p${c}_${r}`);if(hh&&!hh.used){hh.sel=true;captureDefaults(T,ns[0]);emit("sel")}},holdMs());return}
 // empty pad: add a note (or the learned chord)
 mark();const L=T.rt.learn;let pitches=[pitch];if(!D&&L&&L.on&&S.recset.learn==="ON"){const lo=Math.min(...L.notes);pitches=r===0?L.notes.map(n=>n-lo+pitch):[pitch];if(L.notes.length>1){p.notes=p.notes.filter(n=>!(n.s===Math.round(t0)));pitches=L.notes.slice()}}
 if(T.mono&&!D)p.notes=p.notes.filter(n=>n.s!==Math.round(t0));
 const sp=stepSpp(T),s=sp>=1?Math.round(t0):Math.floor(t0),u=sp>=1?0:Math.round((t0-s)*100);
 const made=pitches.map(n=>newNote({s,u,n,v:T.def.v,l:sp<1?Math.max(.25,T.def.l*sp):T.def.l,ch:T.def.ch,roll:T.def.roll,math:S.fill?"FILL":T.def.math,pr:T.type==="AFTR"?T.def.pr:0,tb:64,pb:0}));p.notes.push(...made);h.made=made;h.used=false;
 if(!S.playing&&S.set.preview==="ON")preview(T,made);emit("step:add")}
function stepPadUp(T,c,r,h,long){clearTimeout(h.tm);const p=PAT(T);
 if(h.second&&!h.sel){const f=h.second,fns=notesAt(T,f.c,f.r),fh=HELD.get(`p${f.c}_${f.r}`),a=colT(T,f.c),b=colT(T,c),L=p.len;const targets=fns.length?fns:(fh&&fh.made)||[];
  if(targets.length){mark();const len=c===f.c?Math.max(.25,stepSpp(T)):b>a?b-a+stepSpp(T):L-a+b+stepSpp(T);targets.forEach(n=>n.l=Math.max(.25,Math.round(len*4)/4));if(fh)fh.used=true;toast("LENGTH "+Math.round(len*100)/100);emit("step:len")}
  const mine=h.made;if(mine&&!h.sel)p.notes=p.notes.filter(n=>!mine.includes(n));return}
 if(h.used||long||h.sel)return;if(h.had){const ns=notesAt(T,c,r);if(ns.length){mark();p.notes=p.notes.filter(n=>!ns.includes(n));emit("step:del")}}}
function captureDefaults(T,n){if(S.set.capture!=="ON")return;Object.assign(T.def,{v:n.v,l:n.l,ch:n.ch,roll:n.roll,math:n.math})}
function preview(T,ns){ns.forEach(n=>{const ev={n:T.type==="DRUM"?T.drum[n.n].note+(n.tr||0):n.n,v:n.v,at:S.clk,len:.25,lane:T.type==="DRUM"?n.n:undefined,pr:n.pr};out(P_(),T,ev)})}
function previewSel(sel){if(S.playing||S.set.preview!=="ON")return;clearTimeout(S._pv);S._pv=setTimeout(()=>preview(T_(),[...sel].slice(0,6)),40)}
// automation mode
function autPadDown(T,c,r,h){const p=PAT(T),t0=colT(T,c);if(t0>=p.len)return;let li=autLane(T);
 if(isHeld("delete")){const ev=p.aut[li]||[];p.aut[li]=ev.filter(e=>!(e.t>=t0-1e-6&&e.t<t0+stepSpp(T)-1e-6));h.used=true;emit("aut:del");return}
 if(li>=T.lanes.length){T.lanes.push({dest:"VOID",interp:true,def:null,rate:"192PPQN",lock:false,rows:null});li=T.lanes.length-1;T.rt.lane=li;toast("VOID LANE");emit("aut:void")}
 const Ln=T.lanes[li];if(Ln.lock){toast("LANE LOCKED");return}const rows=Ln.rows||Array.from({length:8},(_,i)=>i/7),ev=p.aut[li]=p.aut[li]||[],sp=stepSpp(T);
 const e=ev.find(x=>x.t>=t0-1e-6&&x.t<t0+sp-1e-6);if(e){const near=rows.reduce((b,x,i)=>Math.abs(x-e.v)<Math.abs(rows[b]-e.v)?i:b,0);h.had=near===r;if(near!==r){mark();e.v=rows[r];emit("aut:event")}else{h.tm=setTimeout(()=>{const hh=HELD.get(`p${c}_${r}`);if(hh)hh.sel=true},holdMs())}return}
 mark();ev.push({t:isHeld("2nd")?t0+sp-1/48:t0,v:rows[r]});h.made=true;emit("aut:event")}
function autPadUp(T,c,r,h,long){clearTimeout(h.tm);if(h.used||long||!h.had)return;const p=PAT(T),li=autLane(T),t0=colT(T,c),sp=stepSpp(T);mark();p.aut[li]=(p.aut[li]||[]).filter(e=>!(e.t>=t0-1e-6&&e.t<t0+sp-1e-6));emit("aut:del")}
function autLaneMenu(T){const li=autLane(T),p=PAT(T);if(li>=T.lanes.length)return listPopup("NEW LANE · DESTINATION",destList(T).slice(1).map(x=>destLabel(T,x)),74,i=>{T.lanes.push({dest:destList(T)[i+1],interp:true,def:null,rate:"192PPQN",lock:false,rows:null});T.rt.lane=T.lanes.length-1;emit("aut:add")});
 const Ln=T.lanes[li];listPopup(laneName(T,Ln),[p.autMute[li]?"UNMUTE LANE":"MUTE LANE","CLEAR EVENTS","DELETE LANE","CHANGE DESTINATION","COPY","PASTE","MAXIMUM RATE: "+Ln.rate,"LOCK: "+(Ln.lock?"ON":"OFF")],0,i=>{
  if(i===0){p.autMute[li]=!p.autMute[li];emit("aut:mute")}else if(i===1){mark();p.aut[li]=[]}else if(i===2){T.lanes.splice(li,1);T.pats.forEach(q=>{const a={};Object.keys(q.aut).forEach(k=>{const n=+k;if(n<li)a[n]=q.aut[k];else if(n>li)a[n-1]=q.aut[k]});q.aut=a})}
  else if(i===3)listPopup("DESTINATION",destList(T).slice(1).map(x=>destLabel(T,x)),0,j=>{Ln.dest=destList(T)[j+1];emit("aut:dest")});else if(i===4){S.clip={k:"lane",d:deep(p.aut[li]||[])};toast("LANE COPIED")}else if(i===5&&S.clip&&S.clip.k==="lane"){mark();p.aut[li]=deep(S.clip.d)}
  else if(i===6){const R=["192PPQN","96PPQN","48PPQN","24PPQN","12PPQN","4PPQN","1PPQN"];Ln.rate=R[(R.indexOf(Ln.rate)+1)%R.length];toast("MAX RATE "+Ln.rate)}else if(i===7)Ln.lock=!Ln.lock})}
function quickLane(T,dest){const i=laneFor(T,dest);T.rt.lane=i;HELD.get("rec")&&(HELD.get("rec").used=true);setMode("autom");toast("LANE "+destLabel(T,dest));emit("aut:quick")}
// live mode
function livePadDown(T,c,r,h){const P=P_(),L=T.live,key=c+","+r;S.ui.livePads.add(key);
 if(S.ui.sub==="steprec"&&T.type!=="DRUM"){const n=liveNote(T,c,r);S.srec.chord.push(n);const id=liveOn(P,T,n,L.vel,"srec");S.ui.livePlay.set(key,{n,ids:[id],T});return}
 if(T.type==="DRUM"){const z=drumZone(T,c,r);if(!z)return;const d=T.drum[z.lane],id=liveOn(P,T,d.note,z.vel,"pad",z.lane);S.ui.livePlay.set(key,{n:d.note,ids:[id],T});emit("drum:hit");return}
 if(L.mode==="CHORD"){if(r>=3){const mi=CHMOD_GRID[7-r]&&CHMOD_GRID[7-r][c];if(c>=8||mi==null)return;if(isHeld("2nd")){const k=L.mods.indexOf(mi);if(k>=0)L.mods.splice(k,1);else if(L.mods.length<8)L.mods.push(mi);emit("chord:latch")}else emit("chord:mod");retrigChords(T);return}
  if(r<=1){const deg=c-4,iv=chordScale(T);if(deg<0||deg>=iv.length)return;const notes=buildChord(T,deg,r);const ids=notes.map(n=>liveOn(P,T,n,L.vel,"chord"));S.ui.livePlay.set(key,{n:notes[0],notes,ids,T,deg,row:r});emit("chord");return}return}
 const n=liveNote(T,c,r);
 if(L.play==="HOLD"){if(L.latched.has(n)){liveOff(P,T,L.latched.get(n),n);L.latched.delete(n)}else L.latched.set(n,liveOn(P,T,n,L.vel));emit("hold");return}
 if(L.play==="RELATCH"){const physical=[...S.ui.livePlay.keys()].length;if(!physical&&!L._relatchGesture){L.latched.forEach((id,nn)=>liveOff(P,T,id,nn));L.latched.clear()}L.latched.set(n,liveOn(P,T,n,L.vel));S.ui.livePlay.set(key,{n,ids:[],T,relatch:true});emit("relatch");return}
 const id=liveOn(P,T,n,L.vel);S.ui.livePlay.set(key,{n,ids:[id],T,pr:L.pres})}
function livePadUp(T,c,r){const key=c+","+r;S.ui.livePads.delete(key);const lp=S.ui.livePlay.get(key);if(T.live.mode==="CHORD"&&r>=3&&c<8)retrigChords(T);if(!lp)return;S.ui.livePlay.delete(key);lp.ids.forEach((id,i)=>liveOff(P_(),lp.T,id,lp.notes?lp.notes[i]:lp.n));
 if(S.ui.sub==="steprec"&&![...S.ui.livePlay.keys()].length&&S.srec.chord.length){const ch=[...new Set(S.srec.chord)];S.srec.chord=[];if(S.srec.mono!=="OFF")ch.forEach(n=>S.srec.seq.push([n]));else S.srec.seq.push(ch);emit("srec:note")}}
function releaseLatched(T){T.live.latched.forEach((id,n)=>liveOff(P_(),T,id,n));T.live.latched.clear()}
let lastChord=null;
function buildChord(T,deg,row){const iv=chordScale(T),root=chordRoot(T)+12*T.live.oct+12*row;let ch=[0,2,4,6].slice(0,iv.length>=7?4:3).map(k=>degNote(root,iv,deg+k));
 const mods=[...T.live.mods,...[...S.ui.livePads].map(k=>k.split(",").map(Number)).filter(([c,r])=>r>=3&&c<8).map(([c,r])=>CHMOD_GRID[7-r][c]).filter(x=>x!=null&&!T.live.mods.includes(x))].slice(0,8);
 mods.forEach(mi=>{if(CHMODS[mi][1]==="auto"&&lastChord){let best=ch,bd=1e9;for(let k=-4;k<=4;k++){let c=ch.slice().sort((a,b)=>a-b);if(k>0)c=rot(c,k);else for(let i=0;i<-k;i++){const n=c.pop();c.unshift(n-12)}const d=c.reduce((s,n,i)=>s+Math.abs(n-(lastChord[i]??lastChord[0])),0);if(d<bd){bd=d;best=c}}ch=best}else ch=CHMODS[mi][2](ch)});
 ch=ch.map(n=>clamp(n,0,127));lastChord=ch.slice().sort((a,b)=>a-b);return ch}
function retrigChords(T){S.ui.livePlay.forEach((lp,key)=>{if(lp.deg==null)return;lp.ids.forEach((id,i)=>liveOff(P_(),T,id,lp.notes[i]));const notes=buildChord(T,lp.deg,lp.row);lp.notes=notes;lp.ids=notes.map(n=>liveOn(P_(),T,n,T.live.vel,"chord"))})}
function srecApply(){const T=T_(),p=PAT(T),R=S.srec,st=rateBeats(R.rate)*4;mark();let s=0,last=null;R.seq.forEach(x=>{if(x==="REST"){s+=st;last=null;return}if(x==="TIE"){if(last)last.forEach(n=>n.l+=st);s+=st;return}
 last=x.map(n=>newNote({s:Math.round(s)%p.len,n,v:T.live.vel,l:R.mono==="MONO+LEGATO"?st*1.1:st*(R.mono==="MONO"?.9:1)}));p.notes.push(...last);s+=st});toast("APPLIED "+R.seq.length+" STEPS");emit("srec:apply")}
/* ---------- popups and menus ---------- */
function listPopup(title,items,sel,enter){S.ov={t:"list",title,items,sel:clamp(sel||0,0,items.length-1),enter};emit("popup")}
function kbd(title,val,enter){S.ov={t:"kbd",title,val,enter}}
function toast(msg,ms=1500){S.toast={msg,until:performance.now()+ms}}
function fxMenu(T){const i=S.ui.fxSel,fx=T.fx[i];
 if(!fx){if(i>T.fx.length){S.ui.fxSel=T.fx.length;}return listPopup("ADD EFFECT",FXLIST.map(k=>FXDEF[k].n+(FXDEF[k].ui?" ·":"")),0,j=>{if(T.fx.length>=9){toast("RACK FULL");return}T.fx.push(fxNew(FXLIST[j]));S.ui.fxSel=T.fx.length-1;emit("fx:add");emit("fx:add:"+FXLIST[j])})}
 if(fx.t==="MM")return toast("MODMATRIX: ALWAYS FIRST, CAN'T BE DELETED");
 listPopup(FXDEF[fx.t].n,[(isHeld("2nd")?"LOCK ":"")+"TOGGLE ON/OFF","DELETE","REPLACE","COPY","PASTE"],0,j=>{if(j===0){fx.on=!fx.on;emit("fx:toggle")}else if(j===1){T.fx.splice(i,1);S.ui.fxSel=Math.min(i,T.fx.length-1)}else if(j===2)listPopup("REPLACE WITH",FXLIST.map(k=>FXDEF[k].n),0,k=>{T.fx[i]=fxNew(FXLIST[k])});else if(j===3){S.clip={k:"fx",d:deep({t:fx.t,p:fx.p,on:fx.on})};toast("EFFECT COPIED")}else if(j===4&&S.clip&&S.clip.k==="fx"){T.fx[i]={...deep(S.clip.d),st:{},ov:{}}}});emit("fx:menu")}
function sectionMenu(P,i){const sc=P.sections[i];listPopup(sc.name,["LAUNCH >","OVERRIDE","RENAME...","DELETE"],0,j=>{if(j===0)launchSection(P,i);else if(j===1){sc.pats=P.tracks.map(T=>T.cur);toast("OVERRIDDEN")}else if(j===2)kbd("SECTION NAME",sc.name,v=>sc.name=v.toUpperCase());else{P.sections.splice(i,1);P.song=P.song.filter(s=>s.sec!==i).map(s=>({...s,sec:s.sec>i?s.sec-1:s.sec}));P.secSel=Math.max(0,i-1)}})}
function songMenu(P,i){const it=P.song[i];listPopup((P.sections[it.sec]||{}).name||"?",["LAUNCH","SET TIME","MOVE UP","MOVE DOWN","DELETE"],0,j=>{if(j===0){if(S.playing)songLaunch(P,i,syncAt(P,T_(),P.sync));else P.songSel=i;emit("song:launch")}else if(j===1)listPopup("DURATION",[1,2,4,8,16,32].map(b=>b+" BARS"),2,k=>it.bars=[1,2,4,8,16,32][k]);
 else if(j===2&&i>0){[P.song[i-1],P.song[i]]=[P.song[i],P.song[i-1]];P.songSel--}else if(j===3&&i<P.song.length-1){[P.song[i+1],P.song[i]]=[P.song[i],P.song[i+1]];P.songSel++}else if(j===4)P.song.splice(i,1)})}
function pcPopup(P,T,ps){const q=ps[0];listPopup("PROGRAM CHANGE",[">APPLY&SEND","PC: "+(q.pc??"--"),"MSB: "+(q.msb??"--"),"LSB: "+(q.lsb??"--"),">CLEAR"],0,j=>{if(j===0){sendPC(P,T,"popup");toast("PC SENT")}else if(j===4){ps.forEach(x=>{x.pc=x.msb=x.lsb=null})}else if(j===2)ps.forEach(x=>x.msb=((x.msb??-1)+1)%128);else if(j===3)ps.forEach(x=>x.lsb=((x.lsb??-1)+1)%128)})}
const IDEFS={"Generic synth":{cc:{1:"MOD",7:"VOLUME",71:"RESO",72:"RELEASE",73:"ATTACK",74:"CUTOFF"},lanes:["CC74","CC71"]},"Drum machine (GM)":{drum:1},"Sim stand-in POLY SYNTH":{cc:{74:"CUTOFF",71:"RESONANCE",73:"ATTACK",72:"RELEASE",1:"VIBRATO",7:"VOLUME",10:"PAN"},lanes:["CC74"]}};
function idefPopup(T){const k=Object.keys(IDEFS);listPopup("INSTRUMENT DEFINITION",k,0,i=>{const d=IDEFS[k[i]];T.idef=k[i];if(d.cc)T.ccNames=d.cc;if(d.lanes)d.lanes.forEach(x=>laneFor(T,x));if(d.drum){if(T.type!=="DRUM")setType(T,"DRUM")}toast("LOADED "+k[i]);emit("idef")})}
/* ---------- projects ---------- */
function stripTrack(T){const o={...T,rt:null,fx:T.fx.map(f=>({...f,st:{},ov:{}})),live:{...T.live,held:[],latched:[]}};return o}
function reviveTrack(o,leader){o.rt=trackRT();o.fx=o.fx.map(f=>({...f,st:{},ov:{}}));o.live.held=new Set();o.live.latched=new Map();if(leader!=null)o.leader=leader;return o}
function serial(P){return JSON.parse(JSON.stringify({...P,rt:null,tracks:P.tracks.map(stripTrack)}))}
function revive(o){o.rt=projRT();o.tracks=o.tracks.map((t,i)=>reviveTrack(Object.assign(newTrack(i),t)));return o}
function userProjects(){try{return JSON.parse(localStorage.getItem("hpx.projects")||"{}")}catch(_){return{}}}
function storeUser(u){try{localStorage.setItem("hpx.projects",JSON.stringify(u))}catch(_){toast("COULDN'T SAVE (STORAGE BLOCKED)")}}
function loadInto(pi,P){const old=S.P[pi];old.tracks.forEach(T=>{T.rt&&T.rt.open&&cutOpen(T,T.rt.open,S.clk)});const other=S.P[1-pi],playingOther=S.playing&&!other.muted&&other.tracks.some(t=>PAT(t).notes.length);
 S.P[pi]=P;initRT();if(S.playing){P.tracks.forEach(T=>{T.rt.b0=Math.floor(tpos()/barB(P))*barB(P);T.rt.s0=0});if(playingOther)P.muted=true}
 if(P.bpm&&Math.abs(P.bpm-S.bpm)>.01){if(!S.playing)setBpm(P.bpm);else listPopup(`TEMPO ${P.bpm} ≠ ${S.bpm}`,["KEEP CURRENT TEMPO","UPDATE TO "+P.bpm],0,i=>{if(i)setBpm(P.bpm)})}
 toast(`${pi?"proB":"proA"}: ${P.name}${P.muted?" (MUTED)":""}`);emit("proj:load")}
function projAction(pi,row){const P=S.P[pi];
 if(row===0||row===1){const save=n=>{P.name=n.toUpperCase().slice(0,16);P.bpm=S.bpm;const u=userProjects();u[P.name]=serial(P);storeUser(u);toast("SAVED "+P.name);emit("proj:save")};if(row===0)save(P.name);else kbd("SAVE AS",P.name,save)}
 else if(row===2){const u=userProjects();if(u.DEFAULT)listPopup("NEW PROJECT",["LOAD DEFAULT TEMPLATE","BLANK PROJECT"],0,i=>loadInto(pi,i?newProject("NEW PROJECT"):revive(deep(u.DEFAULT))));else loadInto(pi,newProject("NEW PROJECT"))}
 else if(row===3){const u=userProjects(),k=Object.keys(u);if(!k.length){toast("NO SAVED PROJECTS YET");return}listPopup("LOAD",k,0,i=>{if(isHeld("delete")){delete u[k[i]];storeUser(u);toast("DELETED");return}loadInto(pi,revive(deep(u[k[i]])))})}
 else listPopup("LOAD DEMO",Object.keys(DEMOS),0,i=>loadInto(pi,DEMOS[Object.keys(DEMOS)[i]]()))}
/* ---------- demo projects ---------- */
const N=(s,n,o={})=>newNote({s,n,...o});
function D_(name,bpm,f){const P=newProject(name);P.bpm=bpm;f(P);P.tracks.forEach(T=>{const ns=T.pats[0].notes;if(ns.length&&T.type!=="DRUM")T.view=Math.max(0,Math.min(...ns.map(n=>n.n))-1)});return revive(serial(P))}
const DEMOS={
 "HAPAX TOUR":()=>D_("HAPAX TOUR",118,P=>{const[d,b,c,l,pl,bl]=P.tracks;
  Object.assign(d,{name:"DRUMS",type:"DRUM"});d.out.ch=10;const dp=(q,lane,str,v=105,o={})=>[...str].forEach((x,i)=>{if(x==="x")q.notes.push(N(i,lane,{v,...o}));if(x==="o")q.notes.push(N(i,lane,{v:Math.round(v*.55),...o}))});
  let q=d.pats[0];dp(q,0,"x...x...x...x...");dp(q,1,"....x.......x...");dp(q,2,"x.x.x.x.x.x.x.x.",80);dp(q,3,"..............x.",70);dp(q,6,"............x...",90,{math:"FILL"});
  q=d.pats[1];dp(q,0,"x...x...x...x.x.");dp(q,1,"....x..o....x..o");dp(q,2,"xxxxxxxxxxxxxxxx",70);dp(q,3,"..x...x...x...x.",70);dp(q,9,"x...............",90,{math:"1:2"});dp(q,4,"...........x.x.x",90,{math:"FILL"});
  q=d.pats[2];dp(q,2,"x.x.x.x.x.x.x.x.",60);dp(q,11,"xxxxxxxxxxxxxxxx",50);
  Object.assign(b,{name:"BASS"});b.out.ch=2;q=b.pats[0];[[0,45,2],[3,45,1],[6,57,1],[8,45,2],[11,52,1],[12,55,2],[14,57,1]].forEach(([s,n,l])=>q.notes.push(N(s,n,{l,v:110})));q.notes.push(N(15,48,{l:1,v:90,ch:50}));
  b.lanes=[{dest:"CC74",interp:true,def:null,rate:"192PPQN",lock:false,rows:null}];q.aut={0:[{t:0,v:.25},{t:8,v:.7},{t:15,v:.3}]};
  b.pats[1]=deep(q);b.pats[1].notes=b.pats[1].notes.map(n=>({...n,n:n.n-4}));
  Object.assign(c,{name:"PADS"});c.out.ch=3;q=c.pats[0];q.len=64;[[0,[57,60,64]],[16,[53,57,60]],[32,[48,52,55]],[48,[55,59,62]]].forEach(([s,ns])=>ns.forEach(n=>q.notes.push(N(s,n,{l:15,v:80}))));
  Object.assign(l,{name:"ARP LEAD"});l.out.ch=4;l.fx.push(fxNew("ARP"));Object.assign(l.fx[1].p,{style:"UP/DOWN",rate:"1/16",oct:1,gate:45});q=l.pats[0];q.len=64;[[0,[69,72,76]],[16,[65,69,72]],[32,[64,67,72]],[48,[67,71,74]]].forEach(([s,ns])=>ns.forEach(n=>q.notes.push(N(s,n,{l:16,v:90}))));l.mute=true;
  Object.assign(pl,{name:"PLUCK ECHO"});pl.out.ch=5;pl.fx.push(fxNew("ECHO"));Object.assign(pl.fx[1].p,{rate:"3/16",rep:5});q=pl.pats[0];q.len=32;[[0,76],[6,79],[10,81],[16,74],[22,72]].forEach(([s,n])=>q.notes.push(N(s,n,{v:95})));pl.mute=true;
  Object.assign(bl,{name:"EUCLID BELL"});bl.out.ch=6;bl.fx.push(fxNew("EUCLID"));Object.assign(bl.fx[1].p,{note:84,steps:13,pulses:5,vel:70});bl.mute=true;
  const tr=P.tracks[15];Object.assign(tr,{name:"TRANSPOSE"});tr.out.ch=16;q=tr.pats[0];q.len=64;[[0,60],[16,60],[32,65],[48,58]].forEach(([s,n])=>q.notes.push(N(s,n,{l:16})));
  P.sections=[{name:"INTRO",pats:P.tracks.map((t,i)=>i===0?2:0),mutes:[]},{name:"GROOVE",pats:P.tracks.map(()=>0),mutes:[]},{name:"BUSY",pats:P.tracks.map((t,i)=>i<2?1:0),mutes:[]}];P.song=[{sec:0,bars:4},{sec:1,bars:8},{sec:2,bars:4},{sec:1,bars:8}]}),
 "PIANO PHASE":()=>D_("PIANO PHASE",144,P=>{const seq=[64,66,71,73,74,66,64,73,71,66,74,73];[0,1].forEach(i=>{const T=P.tracks[i];T.name="PIANO "+(i+1);T.out.ch=i?6:5;const q=T.pats[0];q.len=12;seq.forEach((n,s)=>q.notes.push(N(s,n+(i?12:0),{v:i?80:95})))});P.tracks[1].el=100.5;
  P.tracks[2].name="(SET ME 100.5% IN BPM)"}),
 "PSCALE GARDEN":()=>D_("PSCALE GARDEN",84,P=>{Object.assign(P.psc,{on:true,key:2,ci:2,si:0});const[a,b,c]=P.tracks;a.name="REGISTER";a.out.ch=5;a.fx.push(fxNew("REGISTER"),fxNew("ECHO"));Object.assign(a.fx[1].p,{rate:"1/8",span:14,center:62,toggle:8,bits:12});Object.assign(a.fx[2].p,{rate:"1/4",rep:3});
  b.name="EUCLID";b.out.ch=6;b.fx.push(fxNew("EUCLID"));Object.assign(b.fx[1].p,{note:74,steps:7,pulses:3,rate:"1/8",vel:60});c.name="DRONE";c.out.ch=3;c.pats[0].len=32;[38,45,50].forEach(n=>c.pats[0].notes.push(N(0,n,{l:32,v:70})))}),
 "EMPTY":()=>newProject("NEW PROJECT")};
/* ================= MIDI in (Web MIDI) ================= */
async function midiInit(){try{MIDIACC=await navigator.requestMIDIAccess();const hook=()=>{MIDIO=[...MIDIACC.outputs.values()];MIDIACC.inputs.forEach(i=>i.onmidimessage=onMidi)};hook();MIDIACC.onstatechange=hook;
  $("#midiBtn").setAttribute("aria-pressed","true");emit("midi:on");toast(`MIDI: ${MIDIACC.inputs.size} IN, ${MIDIACC.outputs.size} OUT`,2500);renderStudio()}catch(e){toast("WEB MIDI ISN'T AVAILABLE IN THIS BROWSER",2500)}}
const extOn=new Map();
function inTracks(ch){const P=P_(),o=[];P.tracks.forEach(T=>{const ip=T.inp;if(ip.port==="ALL ACTIVE"&&T===T_()&&(!ip.ch||ip.ch===ch))o.push(T);else if(ip.port==="USB HOST"&&(!ip.ch||ip.ch===ch))o.push(T)});if(S.set.atPort==="USB HOST"&&!o.includes(T_())&&(S.set.atCh.startsWith("ALL")||+S.set.atCh===ch))o.push(T_());return o}
function onMidi(e){const[st,d1,d2=0]=e.data,typ=st&0xf0,ch=(st&15)+1;if(!AC)return;if(st===0xF8||st===0xFE)return;
 monLog("in",typ===0x90?`${nm(d1)} v${d2} ch${ch}`:typ===0xB0?`CC${d1} ${d2} ch${ch}`:typ===0xE0?`PB ${((d2<<7|d1)-8192)} ch${ch}`:typ===0xA0?`POLY AT ${nm(d1)} ${d2}`:typ===0xD0?`AT ${d1}`:`0x${st.toString(16)}`);
 const P=P_(),Ts=inTracks(ch);
 if(typ===0x90&&d2>0){if(S.set.inNotes==="IGNORE")return;emit("midi:note");Ts.forEach(T=>{const id=liveOn(P,T,d1,d2,"ext");extOn.set(T.name+"|"+P.tracks.indexOf(T)+"|"+d1,{T,id})});return}
 if(typ===0x80||(typ===0x90&&d2===0)){Ts.forEach(T=>{const k=T.name+"|"+P.tracks.indexOf(T)+"|"+d1,x=extOn.get(k);if(x){liveOff(P,x.T,x.id,d1);extOn.delete(k)}});return}
 if(typ===0xB0){emit("midi:cc");Ts.forEach(T=>{T.rt.ccIn[d1]=d2;const mm=T.fx[0];const consumed=mm.mods.some(m=>m.src==="CC"+d1&&m.consume==="ON");if(!consumed&&S.set.inCC!=="IGNORE"){sendDest(P,T,"CC"+d1,d2/127,S.clk,null)}if(S.set.inCC!=="IGNORE")recAut(T,"CC"+d1,d2/127)});return}
 if(typ===0xE0){const v=((d2<<7|d1))/16383;emit("midi:cc");Ts.forEach(T=>{T.rt.ccIn.pb=v*2-1;sendDest(P,T,"PITCHBEND",v,S.clk,null);recAut(T,"PITCHBEND",v)});return}
 if(typ===0xD0){Ts.forEach(T=>{T.rt.ccIn.at=d1/127;if(T.type==="AFTR"){T.rt.open.forEach(h=>{polyAt(h.k,h.n,d1/127,AC.currentTime);midiSend([0xA0|(h.ch-1),h.n,d1],AC.currentTime)});recPressure(T,null,d1)}else{sendDest(P,T,"AFTERTOUCH",d1/127,S.clk,null);recAut(T,"AFTERTOUCH",d1/127)}});return}
 if(typ===0xA0){Ts.forEach(T=>{T.rt.open.filter(h=>h.n===d1).forEach(h=>{polyAt(h.k,h.n,d2/127,AC.currentTime);midiSend([0xA0|(h.ch-1),h.n,d2],AC.currentTime)});if(T.type==="AFTR")recPressure(T,d1,d2)});return}}
function recPressure(T,n,v){T.rt.rec.forEach(r=>{if(n==null||r.note.n===n)r.note.pr=Math.max(r.note.pr,v)})}
function monLog(dir,s){const L=S.mon[dir];const f=S.set.monitor;if(f==="ONLY NOTES"&&!/v\d/.test(s))return;if(f==="ONLY CC"&&!s.startsWith("CC"))return;if(f==="ONLY PC"&&!s.startsWith("PC"))return;if(f==="ONLY PRESSURE"&&!/AT/.test(s))return;L.push(s);if(L.length>40)L.shift()}
/* ================= help: tooltips, info card ================= */
function ctlName(id){if(/^p\d/.test(id))return"Pad";if(/^t\d/.test(id))return"Track "+(+id.slice(1)+1);if(/^row/.test(id))return"Row button";if(/^e\d/.test(id))return"Encoder "+id.slice(1);return(INFO[id]||[id])[0]}
const INFO={
 enc:["Main encoder","Controls the right screen: scrolls lists, the piano roll note, sections/songs, the effect rack, settings, save/load and the BPM popup. Press = select/enter. Hold Step + turn = track type (POLY, DRUM, MPE, AFTR). Hold Live + turn = live mode (SCALE / CHORD). In the effect rack, hold it and turn to move an effect.","p. 14, 20, 36"],
 mute:["mute","Press: Mixmute mode (mute, solo, temporary toggle and rec-arm the 32 tracks of proA + proB). Hold + press tracks: a mute group, applied when you release mute (or instantly with 2ND, or with MUTE GROUP off). Hold + proA/proB: mute/unmute that project in sync. Hold + a step pad: mute that note. Hold + pattern pad: mute that pattern.","p. 18–19, 117–121"],
 all:["all","Hold: select every note of the pattern (all pages); add 2ND for the current page only. Then turn encoders, move with the arrows, delete, copy, warp…","p. 49, 156"],
 proA:["proA","Press: make project A active (the tracks and pads edit it). Hold: project settings on the left (pScale, key, scale, TR16 transpose, pQuant, time signature) and SAVE / SAVE AS / NEW / LOAD on the right.","p. 13, 22"],proB:["proB","Second project, playing at the same time as proA. Load the next song here while proA plays, then mute/unmute in sync for seamless transitions.","p. 13, 19"],
 "2nd":["2ND","Shift. 2ND + track = secondary track settings; + settings = REC settings; + effects = project LFOs; + fill = ASSIGN; + undo = redo; + bpm = tap tempo; + live = MIDI monitor; + step = mono edit; + +/– = double/halve length; + ◀▶ = halve/double and copy events; + encoder = scroll faster. Hold Shift on your keyboard for 2ND.","p. 14, 152–154"],
 algo:["algo","Step or Autom mode: offline algorithms on the pattern (or the held selection): GENERATOR, CURVES, SHUFFLE, SYMMETRY, EVERY N. Choose with encoder 1, press it to apply.","p. 110–116"],
 copy:["copy","Hold + press a track, a pattern pad, or a row button (pattern mode) to copy it. With notes selected in Step mode, press copy to copy them.","p. 49, 83, 93"],paste:["paste","Hold + press where it goes: a track, a pattern pad, a row, or a step pad (pasted notes keep their pitch; add 2ND to transpose to that row).","p. 49, 83, 93"],
 delete:["delete","Hold + press: a track (reset it), a pad (note, event, pattern), Step (all notes of the pattern), Autom (all automation). With a selection: press delete.","p. 19"],
 rec:["rec ○","Press while playing to record into the active track (or the armed tracks in Mixmute). Stopped: arms recording, then play starts it (with countdown / punch-in per REC settings). Looper on an empty track: rec starts the loop, rec again sets its length. Hold rec + touch an effect parameter = quick automation lane.","p. 16, 29–31, 103"],
 stop:["stop □","Stops and resets playback (sends MIDI stop and default automation values). 2nd press: all notes off + pattern program changes; 3rd: all sound off; 4th: resends assign values and clears the MIDI cache. In a song: 1st press back to the current section, 2nd to the first.","p. 12"],
 play:["play ▷","Starts both projects. While playing it restarts all tracks (in sync with RESTART SYNC). In Step/Autom on a later page it restarts from that page.","p. 12, 135"],
 live:["live","Live mode: play the 128 pads as an isomorphic keyboard (SCALE), a chord generator (CHORD: hold live + turn the main encoder) or, on DRUM tracks, drum zones with 16 velocities. Press live + step together: Step-rec mode. 2ND + live: MIDI monitor.","p. 15, 29–43, 58"],
 step:["step","Step mode: the pads are a piano roll / drum grid. Press a pad = add a note, press it again = delete. Hold a pad = edit its parameters. Hold step + turn the main encoder = track type. Press step again = focus on the nearest note. 2ND + step = mono edit. Delete + step = clear the notes.","p. 17, 44–61"],
 pattern:["pattern","Pattern mode: columns = 16 tracks, rows = patterns. Press a pad to launch (in sync), a row button to launch a whole row. Hold a pad = pattern settings (PC, trig, colour, length, run, follow actions). Press pattern again = SECTIONS ⇄ SONG tab. From any mode: hold pattern + a pad = instant launch.","p. 16, 73–88"],
 autom:["autom","Automation mode: up to 64 lanes per track (CC, pitchbend, aftertouch, PC, velocity, NRPN, CC pairs, CV out, effect parameters). Pads = steps × value rows. Delete + autom = clear the pattern's automation.","p. 16, 62–72"],
 settings:["settings / REC","Press: global settings (sync in/out, misc, CV/gate + pedal, MIDI in, MIDI thru, compensation). 2ND + settings: REC settings (learn, hard rec/overdub, countdown, metronome, punch-in, looper, rec off, quantize).","p. 30, 130–149"],
 effects:["effects / LFO","Press: the track's effect rack (modMatrix + up to 8 effects). 2ND + effects: the two project LFOs.","p. 100–109"],
 fill:["fill / ASSIGN","Hold: fill is on (notes with MATH = FILL play, !FILL ones don't; notes you add get MATH = FILL). 2ND + fill: ASSIGN — the 8 encoders become MIDI/CV/effect controllers for this track.","p. 25, 56–57"],
 bpm:["bpm","Press: BPM popup (main encoder; press it for decimals and the active track's ELASTICITY, i.e. its own playback speed for phasing). 2ND + tap in time: tap tempo.","p. 26"],
 snapshot:["snapshot","Hold: capture the current state of the project's patterns and effect values. Press: switch between the captured version (red) and your working version (green) — a safety net and a performance trick.","p. 24"],
 undo:["undo / REDO","Undo the last edit (notes, recording, parameters). 2ND + undo = redo. Cleared by a pattern change on the hardware.","p. 23"],
 minus:["–","Step/Autom: zoom out. Press – and + together: triplet zooms. 2ND + –: halve the pattern length. With a selection: warp (compress) or rotate it (Settings → SELECT +/-).","p. 51–52"],plus:["+","Step/Autom: zoom in (up to ×48). 2ND + +: double the length. With a selection: warp (expand) or rotate. (3.22) On an AFTR track, + while holding a note switches the velocity encoder between VELOCITY and PRESSUR.","p. 51–52"],
 left:["◀","Previous page. Hold ◀ + press a track button = loop start; ◀ + ▶ together = clear loop points. 2ND + ◀ = halve and delete. Hold a track + ◀ = swap with the track on its left. With a selection: move it left.","p. 52–53"],right:["▶","Next page. Hold ▶ + track button = loop end. 2ND + ▶ = double the pattern and copy its events. With a selection: move it right.","p. 52–53"],
 up:["▲","Octave up (live, step), next drum lanes, previous patterns in pattern mode, previous automation lane. With a selection: move it up.","p. 34, 46"],down:["▼","Octave down, drum lanes 1–8, next patterns, next lane. With a selection: move it down.","p. 34, 46"]};
function ctlText(id){if(/^t\d/.test(id)){const i=+id.slice(1);return[`Track ${i+1}${i===15?" (TRSP)":""}`,`Press: select track ${i+1}. Hold: its settings (output, channel, input, length, run, trig, PC). 2ND + press: secondary settings (quantize, pTRSP, pSCALE, name, mono edit, instrument definition, MIDI file). Mute + press: mute group. ◀/▶ held: loop start/end on this step position.${i===15?" Track 16 can lead the transposition of the others (pTRSP in the project settings).":""}`,"p. 14, 89–93"]}
 if(/^row/.test(id))return["Row button (←)","Pattern mode: launch this row of patterns on all 16 tracks (copy/paste rows too). Step mode, drum track: hold = lane settings (input note, output note, channel); 2ND + press = velocity view of that lane. POLY step: hold = select that row's notes. Autom: hold = set the row's snap value.","p. 60, 65, 75"];
 if(/^e\d/.test(id)){const j=ENC2SLOT[id],s=slots(view())[j];return[`Encoder ${id.slice(1)}`,s&&s.l?`<b style="display:inline">${s.l} = ${s.v}</b>. ${s.tip||""}`:"Does nothing on this page.","p. 14"]}
 if(/^p\d/.test(id)){const c=CI[id];return["Pad "+(c.c+1)+"·"+(c.r+1),padTip(c.c,c.r),"p. 15"]}
 return INFO[id]||[id,"",""]}
function padTip(c,r){const m=S.ui.mode,T=T_();if(m==="step"){const t=colT(T,c);return T.type==="DRUM"?`Step ${Math.floor(t)+1}, lane ${T.drum[T.dpage*8+r].name}. Press = add/remove, hold = edit.`:`Step ${Math.floor(t)+1}, ${nm(rowPitch(T,r))}. Press = add/remove a note; hold = edit it; hold + tap another pad = set its length; hold two pads = select a range.`}
 if(m==="pattern")return`Track ${c+1}, pattern ${patAt(r)+1}. Press = launch (SYNC), hold = settings.`;if(m==="autom")return`Step ${Math.floor(colT(T,c))+1}, value row ${r+1}. Press = place an event, press it again = remove, hold = fine-tune.`;
 if(m==="mix")return`${r>=4?"proA":"proB"} track ${c+1}: ${["MUTE","SOLO","TOGGLE (hold)","REC ARM"][3-(r%4)]}.`;
 if(T.type==="DRUM"){const z=drumZone(T,c,r);return z?`${T.drum[z.lane].name}, velocity ${z.vel}.`:""}if(T.live.mode==="CHORD")return r>=3&&c<8&&CHMOD_GRID[7-r][c]!=null?`Modifier: ${CHMODS[CHMOD_GRID[7-r][c]][0]}. 2ND + press to latch.`:r<=1&&c>=4?"Chord degree "+(c-3)+(r?" (octave up)":""):"";return nm(liveNote(T,c,r))}
function showTip(id,e){const[n,d]=ctlText(id);tipHtml(`<b>${n}</b>${d}`,e)}
function tipHtml(h,e){const tip=$("#tip");tip.innerHTML=h;tip.hidden=false;moveTip(e)}
function moveTip(e){const tip=$("#tip");if(tip.hidden)return;const w=tip.offsetWidth,h=tip.offsetHeight;let x=e.clientX+14,y=e.clientY+16;if(e.pointerType&&e.pointerType!=="mouse"){x=e.clientX-w/2;y=e.clientY-h-36;if(y<8)y=e.clientY+36}
 if(x+w>innerWidth-8)x=innerWidth-w-8;if(y+h>innerHeight-8)y=e.clientY-h-12;tip.style.left=Math.max(8,x)+"px";tip.style.top=Math.max(8,y)+"px"}
function hideTip(){$("#tip").hidden=true}
function showInfo(id){if(/^p\d/.test(id))return;const[n,d,pg]=ctlText(id);$("#info").innerHTML=`<div class="crumb">Control</div><h2>${n}</h2><p>${d}</p><p class="pg">Manual ${pg}</p>`;infoSig="ctl"}
const VINFO={live:["Live mode","Play and record with the pads. Encoders set key, hold/relatch, scale colour and scale, velocity and the pad view. ▲▼ = octave."],step:["Step mode","Piano roll on the pads. Encoders = parameters of new notes, or of the notes you hold. +/– zoom, ◀▶ pages, ▲▼ octave."],autom:["Automation mode","Draw automation: columns = steps, rows = values. Encoder 1 picks the lane (press it for + ADD / the lane menu)."],pattern:["Pattern mode","Launch patterns per track; sections and songs on the right screen."],mix:["Mixmute","Rows top to bottom: proA MUTE, SOLO, TOGGLE, REC; then the same for proB."],fx:["Effects","The track's MIDI effect rack."],lfo:["Project LFOs","LFO A and B of the project, for the modMatrix."],assign:["Assign","The 8 encoders as controllers."],settings:["Settings","Global settings."],algo:["Algorithms","Offline pattern generators/transformers."],steprec:["Step-rec","Enter notes one step at a time from the pads, then APPLY."],monitor:["MIDI monitor","Incoming (left) and outgoing (right) MIDI."],
 trk:["Track settings","Held track: routing and pattern parameters."],trk2:["Secondary track settings","Quantize, pTRSP, pSCALE, name, mono edit, instrument definition, MIDI files."],proj:["Project settings","Scale, transpose, quantize, signature, save/load."],bpm:["BPM / elasticity","Tempo and per-track speed."],recset:["REC settings","How recording behaves."],patp:["Pattern settings","Settings of the held pattern(s)."],lane:["Drum lane","Routing of the held drum lane."],row:["Row snap values","Values of the automation pad rows."],ttype:["Track type","POLY, DRUM, MPE or AFTR (3.20)."],lmode:["Live mode type","SCALE or CHORD."]};
let infoSig="",infoLock=null;
function renderViewInfo(){const v=view(),[t,d]=VINFO[v]||[v,""],s=slots(v),names=["1","2","5","6","3","4","7","8"];
 $("#info").innerHTML=`<div class="crumb">You are here: <b>${t}</b>${S.P[S.ap].name?" · "+(S.ap?"proB":"proA")+" · track "+(P_().sel+1)+" ("+T_().type+")":""}</div><h2>${t}</h2><p>${d}</p>
 ${s.some(x=>x.l&&x.l!=="_prog")?`<div class="kmap">${s.map((x,j)=>`<div><b>Encoder ${names[j]}</b>${x.l&&x.l!=="_prog"?`${x.l}: ${x.v}`:"—"}</div>`).join("")}</div>`:""}<p class="pg">Hover the screens and pads for details.</p>`;infoSig=v+s.map(x=>x.l+x.v).join()}
function maybeInfo(){const v=view(),sig=v+slots(v).map(x=>x.l+x.v).join();if(infoLock){if(infoLock!==v)infoLock=null;else return}if(sig!==infoSig&&infoSig!=="ctl")renderViewInfo();else if(infoSig==="ctl"&&!HELD.size&&S._lastV!==v)renderViewInfo();S._lastV=v}
/* ================= chapters ================= */
const tb=rows=>`<table class="t">${rows.map(r=>`<tr>${r.map((c,j)=>j?`<td>${c}</td>`:`<th>${c}</th>`).join("")}</tr>`).join("")}</table>`;
const YT=id=>`<p><a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">Watch the Squarp tutorial ↗</a></p>`;
const CHAP=[
 ["Sequencer workflow and architecture","9–10",()=>setMode("pattern"),`<p>Hapax plays two projects at once (<b>proA</b>, <b>proB</b>). Each has 16 tracks; each track has its own inputs, outputs, effect rack and 16 patterns. A pattern is a loop of notes and/or automation with its own length, run mode, effect values and follow actions.</p>${tb([["Project","scale, time signature, mutes/solos, playing patterns, sections and song, TRSP on track 16"],["Track","type (POLY/DRUM/MPE/AFTR), input, output, elasticity, modMatrix + effects, quantize"],["Pattern","length (1 step…32 bars), run mode, trig, PC, zoom, loop points, colour, follow actions, events"]])}`],
 ["Connecting a synth: track input and output","11, 90",()=>{setMode("step");holdTrackDemo()},`<p>Hold a track button: OUTPUT port + CHANNEL send everything the track plays (pads, steps, external keyboard) there. INPUT: <b>ALL ACTIVE</b> listens to every port, but only while the track is selected; a named port listens all the time.</p><p>In this simulation every MIDI channel has a stand-in instrument (Virtual studio card). Click <b>MIDI</b> to also send to real gear.</p>`],
 ["Play / stop","12",()=>{},`<p>play starts; while playing it restarts all tracks. stop: 1st press stops (MIDI stop, default automation values), 2nd all notes off + pattern PCs, 3rd all sound off, 4th resends assign values and clears the MIDI cache.</p>`],
 ["Projects, save and load","13, proj. chapter",()=>{},`<p>Hold proA or proB: the right screen has SAVE, SAVE AS, NEW, LOAD (here also LOAD DEMO). Name a project <b>DEFAULT</b> to make it the template for NEW. Projects you save here live in this browser.</p>`],
 ["Select and configure a track","14",()=>{},`<p>Press a track to select it (bright white). Hold it for track settings. 2ND + press for the secondary settings. The 8 encoders always control the left screen, the main encoder the right screen. Hold an encoder to reset a parameter; hold 2ND and turn to scroll faster.</p>`],
 ["Upper and lower bars","15",()=>setMode("step"),`<p>Upper bar: pattern, track name, mute icon, MIDI meters, project name. Lower bar: position (bar.beat), number of pages, TRSP amount.</p>`],
 ["Live recording","16, 29–31",()=>{setMode("live");S.ui.page="recset"},`<p>Press rec while playing to record the selected track (or the armed tracks of Mixmute). REC settings (2ND + settings): ${tb([["LEARN","note learn in Step mode"],["NOTES","HARD REC replaces, OVERDUB merges"],["COUNTDOWN","1–4 bars (arm rec first)"],["METRONOME","click while recording"],["PUNCH IN","waits for the first note"],["LOOPER","on an empty track: rec starts, rec again sets the length"],["REC OFF","stop at pattern end"],["QUANTIZE","destructive"]])}`+YT("olx8ZA2Sq_o")],
 ["Step mode essentials","17, 44–47",()=>setMode("step"),`<p>Press a pad to add a note, press again to delete. The left screen holds the defaults new notes inherit. NOTE/OCTAVE scroll the piano roll (bottom row). Hold a note to edit it; hold an empty pad and turn an encoder to create one with that value.</p>`],
 ["Pattern length","18, 51",()=>{},`<p>Hold a track: LENGTH (bars; hold + turn = steps, 1–512). 2ND + +/– doubles/halves; 2ND + ▶/◀ doubles with a copy of the events / halves and deletes.</p>`],
 ["Mute tracks and projects","18–19",()=>{},`<p>Hold mute, press tracks (they flash), release mute: all toggled together. 2ND + mute + track = instant. Hold mute + proA/proB: project (un)mute in sync at the end of the bar (PROJECT SYNC setting).</p>`],
 ["Delete tracks and patterns","19",()=>{},`<p>delete + track = reset the track; delete + step = notes of the pattern; delete + autom = its automation; delete + a pattern pad in Pattern mode = that pattern.</p>`],
 ["Track types","20",()=>{setMode("step")},`<p>Hold step and turn the main encoder: <b>POLY</b> (synths), <b>DRUM</b> (16 lanes, each with its own note/channel), <b>MPE</b> (per-note pitch/timbre/pressure), and since 3.20 <b>AFTR</b> (polyphonic aftertouch on one channel, any synth).</p>`],
 ["Quantize","20–21, 109",()=>{S.ui.page="trk2"},`<p>2ND + track: QUANTIZE (–, 1/64, 1/32, 1/24, 1/16) and STRENGTH. It's non-destructive. pQUANT in the project overrides it for all tracks. For destructive: REC settings QUANTIZE, or select notes and hold uTIME.</p>`],
 ["Project scale (pScale)","22, 54",()=>{},`<p>Hold proA/proB: pSCALE ON, KEY, COLOR, SCALE, STICK. All tracks (except drums, and tracks with pSCALE off in 2ND + track) are constrained. The step piano roll then only shows in-scale notes, octave by octave.</p>`+YT("J7i69JogkPE")],
 ["Undo / redo and snapshot","23–24",()=>{},`<p>undo; 2ND + undo = redo. Hold snapshot to capture, press to flip between captured (red) and working (green).</p>`+YT("NMZk7XgcP54")],
 ["Assign","25",()=>{S.ui.sub="assign"},`<p>2ND + fill: each encoder sends a MIDI CC, CV or effect parameter of your choice (press it to choose). It counts as an external controller, so with REC on it records automation.</p>`+YT("AhJ5KF67iac")],
 ["Tempo, tap and elasticity","26",()=>{S.ui.page="bpm"},`<p>bpm opens the popup. 2ND + bpm repeatedly = tap. ELASTICITY sets one track's speed: 50% = half, 200% = double, 100.5% = slowly drifts out of phase (Steve Reich's Piano Phase). Try the PIANO PHASE demo.</p>`+YT("ea0OKpoAdYA")],
 ["Connectivity","27–28",()=>{},`<p>Inputs: MIDI A, B (TRS), USB host, USB device = 64 channels, plus 2 CV inputs. Outputs: MIDI A–D, USB host, USB device = 96 channels, plus 4 CV/Gate pairs. USB ports carry 16 virtual cables each (3.00).</p>`],
 ["Livemode Scale","33–36",()=>{setMode("live");T_().live.mode="SCALE"},`<p>An isomorphic keyboard: right = next note, up = JUMP notes higher (default 3 semitones). With a scale, steps are scale degrees. Encoders: KEY, PLAY (HOLD / RELATCH), COLOR, SCALE, VELOCITY, VIEW (press for JUMP). 72 scales in colour families (scales of one colour share 3rd/7th). Chord recognition under the mini keyboard.</p>`+YT("4_Gqy6OJkY8")],
 ["Livemode Chord","36–41",()=>{setMode("live");T_().live.mode="CHORD"},`<p>Hold live + turn the main encoder. Bottom rows (right hand): one pad per scale degree, harmonised by stacking thirds. Left area: modifiers (octave, spread, rotate, voicings, extensions, bass drops, transpose, AUTO INVERSION in red). Up to 8 stack, in order; 2ND + pad latches one.</p>`+YT("Y1Er_OtbhSA")],
 ["Livemode Drum","42–43",()=>{setMode("live");setType(T_(),"DRUM")},`<p>On a DRUM track the pads become zones (8 lanes × 16 velocities by default; 3.10 adds 8-, 4- and 1-velocity layouts in Settings → Misc → Live Drum Pads). Encoders = each lane's output note; hold + turn = channel.</p>`+YT("g4UY_zFv7Pc")],
 ["Piano roll, navigation","45, 51–52",()=>setMode("step"),`<p>The right screen shows the whole pattern; the grey viewport is what the pads show. Zooms /16 … ×48 (+/–), triplet zooms (+ and – together). Pages with ◀▶. Press step to focus on the nearest note.</p>`+YT("B1Ad7jgngYQ")],
 ["Note parameters","46–48",()=>setMode("step"),`${tb([["NOTE / OCT","C0 (0) … G10 (127)"],["VELOCITY","0–127"],["LENGTH","1/16 … INFINITY (hold + turn: ticks)"],["uTIME","–50% … +50% of a step"],["CHANCE","0–100%"],["ROLL","ratchet 1/8 … 1/256"],["MATH","conditional trig"]])}<p>Two-finger length: hold a pad, tap another. Hold a note pad = copy its parameters as the defaults (HOLD STEP CAPTURE).</p>`],
 ["Selections, copy/paste, warp","48–51",()=>setMode("step"),`<p>Hold two pads = a range (all pitches; add 2ND to constrain). Hold all = everything; hold a row = that note. Then: encoders edit, arrows move, mute, delete, copy; hold paste + pad pastes (2ND = at that pitch). + / – warp: 3 steps → 4 = triplets, 5 → 4 = quintuplets (or ROTATE, Settings → SELECT +/-).</p>`],
 ["Loop points","53",()=>setMode("step"),`<p>Hold ◀ and press a track button (= a step position of the page): loop start. Hold ▶ + track: loop end. ◀ + ▶ together: remove. Each pattern has its own.</p>`+YT("w5gsc5uHkoQ")],
 ["Mono edit and note learn","55–56",()=>setMode("step"),`<p>2ND + step: MONO EDIT, adding a note removes the others at that step. NOTE LEARN: play a note or chord (pads or keyboard), press the NOTE encoder, then press pads to drop the learned chord in.</p>`],
 ["Math (conditional trigs)","56–58",()=>setMode("step"),`${tb([["FILL / !FILL","only while fill is held / not held"],["1ST / !1ST","first playback of the pattern"],["PRE / !PRE","last condition of the track was true"],["SYNC","on the first step of a beat"],["NT<n","fewer than n notes playing (project)"],["PS<n / PB<n","last step / beat played fewer than n notes"],["X:Y","plays the X-th time every Y loops"],["NO FX","bypasses effects, pScale and pTRSP"]])}`],
 ["Step-rec mode","58–59",()=>{},`<p>Press live and step together. Play notes or chords (released together = one step), add REST and TIE with the encoders, then APPLY. RATE sets the grid; MONO and MONO + LEGATO for monosynths.</p>`],
 ["Drum tracks: lanes","60–61",()=>{setMode("step");setType(T_(),"DRUM")},`<p>Hold a row button: INPUT (LINK = same as output), OUTPUT note, CHANNEL (track channel, any channel, or a Gate/CV output for triggers and accents). 16 lanes since 3.10 (▲▼). 2ND + row: velocity view.</p>`+YT("g4UY_zFv7Pc")],
 ["Automation","62–72",()=>setMode("autom"),`<p>Encoder 1: lane (+ ADD, then a destination). Pads: columns = steps, rows = values (each row's value can be set by holding the row, 3.10). INTERPOL, DEFAULT, PING (2ND + press, 3.10). Lane menu: mute, clear, delete, change destination, copy/paste, max rate, lock. With rec on, incoming CC/PB/AT create lanes automatically.</p>`+YT("l6fR5ir1lIg")],
 ["Patterns: launch, sync, mute","73–76",()=>setMode("pattern"),`<p>Each column is a track. Press a pad to launch at the next SYNC (instant, 1/16, beat, bars, PTRN = end of the pattern, TRACK n = end of track n's pattern, 3.00). Row buttons launch a row. mute + pad mutes a pattern.</p>`],
 ["Pattern parameters and PC","76–80",()=>setMode("pattern"),`<p>Hold a pattern pad: PC (MSB/LSB in the popup), TRIG (FREE keeps the position, RESTART), COLOR, LENGTH, RUN (reverse, ping-pong, random bar/beat/1/16), FOLLOW LEN, FOLLOW 1, FOLLOW 2.</p>`],
 ["Follow actions","81–83",()=>setMode("pattern"),`<p>At the end of a pattern (or FOLLOW LEN): STOP, NEXT, PREVIOUS, ANY, OTHER, FIRST, LAST, RSTR. They work inside a contiguous group of patterns that have actions. Press FOLLOW 1 for its probability; FOLLOW 2 gets the remainder.</p>`+YT("lOTs0Zrqeeg")],
 ["Sections and songs","84–88",()=>setMode("pattern"),`<p>Right screen, main encoder: + SAVE SECTION stores which pattern each track plays. Press a section to launch it (in sync); 2ND + press for its menu. Press pattern for the SONG tab: add sections with durations, then MODE = PLAY SONG or LOOP SONG and press play.</p>`+YT("atZpXI0-4qc")],
 ["Copy, paste, swap tracks","93",()=>{},`<p>copy + track, paste + track. Hold a track + ◀/▶ to swap it with its neighbour (the TRSP role stays with the track that has it).</p>`],
 ["Instrument definitions","93–95",()=>{S.ui.page="trk2"},`<p>Text files in the HAPAX folder: name CCs, set ports/channels, drum lanes, PC names, empty automation lanes. 2ND + track → INSTRUM. A few examples are built in here.</p>`],
 ["MIDI import / export","95–99",()=>{S.ui.page="trk2"},`<p>2ND + track → MIDI FILE: EXPORT saves the pattern as a type-1 .mid (notes + automation tracks); IMPORT replaces the pattern with a track of a .mid (type 0/1, up to 32 bars). Drum patterns map lane 1 from note 36 on export.</p>`+YT("Ri-F0EjGWDE")],
 ["Effects: rack, locking, quick lanes","100–103",()=>{S.ui.sub="fx"},`<p>effects: the rack. The modMatrix is always first; then up to 8 effects, in order. Main encoder press: add / TOGGLE, DELETE, REPLACE, COPY, PASTE; hold + turn = move. 2ND + press a parameter encoder: lock its value to the pattern. Hold rec + touch a parameter: instant automation lane.</p>`+YT("kw8zrQjzpoc")],
 ["The effects","104–109 + online",()=>{S.ui.sub="fx"},`${tb(FXLIST.map(k=>[FXDEF[k].n,FXDEF[k].d]))}<p>· = parameters shown, not processed by the simulation.</p>`],
 ["modMatrix","online FX chapter",()=>{S.ui.sub="fx";S.ui.fxSel=0},`<p>Sources: CC 0–119, pitchbend, aftertouch, CV in 1/2, project LFO A/B, KEYTRACK, VELOCITY, FILL. Destinations: CC, pitchbend, aftertouch, PC, velocity, NRPN, CC pair, CV out, any effect parameter. DEPTH, OFFSET, POLARITY, CONSUME.</p>`+YT("vngcBiTkJjk")],
 ["Project LFOs","108",()=>{S.ui.sub="lfo"},`<p>2ND + effects. Two LFOs per project: SINE, TRIANGLE, RAMP, SQUARE, RANDOM, FLAT (3.10), sync on/off, rate 64 bars … 1/128, phase.</p>`],
 ["Algorithms","110–116",()=>{setMode("step");S.ui.sub="algo"},`${tb([["GENERATOR","new random notes on a grid, with pitch/velocity/length ranges, density, polyphony"],["CURVES","shape velocity, keys, length, chance… with a waveform"],["SHUFFLE","shuffle notes, parameters, or segments"],["SYMMETRY","mirror in time or pitch, keep or replace"],["EVERY N","drum accents/ghosts every N"]])}`+YT("hdfoq2Z3mDU")],
 ["Mixmute","117–121",()=>setMode("mix"),`<p>press mute. 32 tracks at once: MUTE, SOLO (hold one solo and press others for several), TOGGLE (momentary), REC (arm several tracks for multitrack recording, then press rec from any mode).</p>`+YT("bgPseYG1PYU")],
 ["Dual projects and transitions","project chapter",()=>{},`<p>Load the next project into proB while proA plays (it comes in muted). Prepare its mutes, then mute + proB to bring it in at the end of the bar, mute + proA to take A out. Different tempo: you choose to keep or update.</p>`+YT("IQZ9i-ynYn8")],
 ["Transpose track (TRSP / match chord)","project chapter",()=>{},`<p>Hold proA: TR16 TRSP. <b>TRSP</b>: track 16's notes transpose tracks 1–15 (C5 = +0, Settings → TRANSPOSE ROOT). <b>CHRD</b>: their notes are pulled into the chord track 16 plays. TRANSPOSE SYNC delays the change to the beat/bar. Drum tracks never follow; 2ND + track → pTRSP OFF excludes a track.</p>`+YT("ZIlI2B1iduE")],
 ["Time signatures","project chapter",()=>{},`<p>Hold proA: pSIGNATURE. Turn = beats per bar, hold + turn = beat unit. With SPLIT BARS on, each bar starts a new page (7/4 = 28 steps over 2 pages).</p>`],
 ["MPE","122–129",()=>{},`<p>MPE tracks record per-note pitchbend, timbre (CC74) and pressure from an MPE controller and keep them with each note. Output zones (lower/upper), up to 4 MPE tracks per output, virtual cables, MCM. The simulation plays MPE tracks like POLY tracks.</p>`],
 ["Settings","130–149",()=>{S.ui.sub="settings"},`<p>Sync in (clock source, start/stop, CV reset, CV clock rate), sync out, misc (follow playhead, hold step capture, transpose root/sync, restart sync, project sync, pattern trig, sustain, note chasing, unison, select +/-, split bars, mute group, hold time, background RGB, live drum pads…), CV/gate + pedal, MIDI in, MIDI thru, compensation, palette, MIDI monitor.</p>`],
 ["What changed since the manual (3.20–3.22)","firmware page",()=>{setMode("live");setType(T_(),"AFTR")},`<p>The manual covers hapaxOS 3.10. Since then:</p><ul class="tight"><li><b>3.20</b>: new <b>AFTR</b> track type (poly aftertouch on one channel; every note keeps a pressure curve that moves with it). Poly aftertouch passes through every track type. Channel aftertouch on an AFTR track applies to all held notes. Instrument definitions accept TYPE = POLYAT/AFTR. MIDI monitor shows poly AT. Sync in: CV CLOCK RATE up to 96 ppqn, CLOCK TIMEOUT (fall back to internal clock), CV FOLLOW TEMPO. Faster automation playback. Projects saved by 3.20 don't open in 3.10.</li><li><b>3.21</b>: AFTR hotfixes (channel routing, MCM hidden).</li><li><b>3.22</b>: AFTR live mode gets a <b>PRESSUR</b> encoder (sent as poly AT right after each note) and a pressure-aware mini keyboard; in Step mode + cycles VELOCITY/PRESSUR only, notes placed by hand now send their pressure; ALGO says “NOT AVAILABLE FOR AFTR”.</li></ul>`]];
function holdTrackDemo(){}
function chapterShow(i){const[t,pg,fn,html]=CHAP[i];fn();infoLock=view();$("#info").innerHTML=`<div class="crumb">Manual chapter · p. ${pg}</div><h2>${t}</h2>${html}<p><button class="sm" id="scrInfo">What's on the screens now?</button></p>`;$("#scrInfo").onclick=()=>{infoLock=null;renderViewInfo()};$("#info").scrollIntoView({behavior:"smooth",block:"nearest"})}
/* ================= guided tours ================= */
// [name, video id, steps: [target control, text, event that completes the step]]
const TOURS=[
 ["Quick start: play the demo",null,[["play","Press play ▷. The HAPAX TOUR demo plays: drums, bass, pads (stand-in instruments in your browser).","play"],["mute","Press mute for Mixmute: the top 4 pad rows are proA (mute, solo, toggle, rec).","mode:mix"],["pads","Press pads in the top row to unmute the ARP LEAD (track 4) or PLUCK ECHO (track 5).","mix:mute"],["live","Press live. Track 2 (bass) is…","mode:live"],["t2","…press track 3 (PADS) to select it, then play the pads: an isomorphic keyboard.","track:sel:2"],["pads","Play some pads. Right = next note, up = a minor third.","live:note"],["step","Press step: the same pattern as a piano roll.","mode:step"],["pattern","Press pattern: columns = tracks, rows = patterns. Press a dim pad of track 1 to queue another pattern.","mode:pattern"],["stop","Press stop.","stop"]]],
 ["EP01 · Live recording","olx8ZA2Sq_o",[["settings","Hold 2ND (Shift on your keyboard, or right-click 2ND to latch it), then press settings: REC SETTINGS.","page:recset"],["e6","The 8 encoders are the 8 REC settings. Turn encoder 6 (METRONOME) to ON.","recset:metro"],["e5","Encoder 5 (COUNTDOWN): ON (1 BAR).","recset:count"],["live","Press live, select a track with no notes (track 7) and pick a KEY/SCALE you like.","mode:live"],["rec","Press rec ○ (it blinks: armed)…","rec:arm"],["play","…then play ▷: one bar of countdown, then recording.","play"],["pads","Play pads. Notes appear on the piano roll.","rec:note"],["rec","Press rec again to stop recording (playback continues).","rec:stop"],["e4","Looper: stop, select another empty track, open REC settings again (2ND + settings) and set encoder 4 (LOOPER) to 1 BAR…","recset:looper"],["rec","…press rec, play a phrase, press rec again: the length snaps to whole bars and loops.","rec:loop"]]],
 ["EP02 · Drum tracks","g4UY_zFv7Pc",[["t0","Select track 1 (DRUMS, a DRUM track).","track:sel:0"],["step","Press step: 8 lanes on the pads (▲ for lanes 9–16).","mode:step"],["row0","Hold the bottom row button (right-click to latch it): lane settings. Encoder 2 changes the output note.","lane:edit"],["pads","Release it. Press empty pads to add hits, press again to remove.","step:add"],["algo","Press algo, choose EVERY N with encoder 1, press encoder 1 to apply on the lane.","algo:EVERYN"],["row1","2ND + a row button: velocity view of that lane.","velview"],["live","Press live: drum zones, brighter = harder. Record some hits with rec.","drum:hit"]]],
 ["EP03 · Follow actions","lOTs0Zrqeeg",[["pattern","Press pattern.","mode:pattern"],["pads","Hold track 1's first pattern pad (right-click to latch). Turn encoder 7 (FOLLOW 1) to NEXT.","fol:set"],["pads","Release, then hold pattern 2 and 3 of track 1 and set FOLLOW 1 = NEXT too (a contiguous group).","fol:set"],["play","Press play: patterns 1 → 2 → 3 → 1… change at their ends.","play"],["pads","Set one to ANY or OTHER for random jumps; press encoder 7 for its probability and set FOLLOW 2.","follow"],["stop","Press stop.","stop"]]],
 ["EP04 · Chords","Y1Er_OtbhSA",[["t2","Select track 3 (PADS).","track:sel:2"],["live","Hold live (right-click to latch) and turn the main encoder to CHORD.","lmode:CHORD"],["live","Release live (click it again if latched).","press:live"],["pads","Bottom two rows, middle: one pad per scale degree. Play some chords.","chord"],["pads","Hold a coloured modifier pad on the left and play a chord: it is modified (name on the right screen).","chord:mod"],["2nd","Hold 2ND + press a modifier pad to latch it (● on the right screen).","chord:latch"],["rec","Record a progression: rec, play, chords…","rec:note"]]],
 ["EP05 · Transpose","ZIlI2B1iduE",[["proA","Hold proA (right-click to latch): project settings.","press:proA"],["e3","Turn encoder 3 (TR16 TRSP) to TRSP. Track 16 blinks: it leads.","trsp:TRSP"],["proA","Release proA.","press:proA"],["play","Press play. Track 16 (TRANSPOSE) holds a sequence C5 C5 F4 A#4: the bass and pads follow it.","play"],["t15","Select track 16 and press live: play pads to transpose live (C5 = no change).","track:sel:15"],["pads","Play a pad.","trsp"],["proA","Hold proA again and set TR16 TRSP to CHRD: now tracks are pulled into the notes/chord track 16 plays.","trsp:CHRD"]]],
 ["EP06 · Piano roll","B1Ad7jgngYQ",[["t1","Select track 2 (BASS).","track:sel:1"],["step","Press step.","mode:step"],["pads","Hold a note (right-click to latch). The left screen shows its parameters.","sel"],["e1","Turn NOTE / OCTAVE, VELOCITY, LENGTH, uTIME, CHANCE, ROLL, MATH (encoders 1,2,5,6,3,4,7,8).","enc:*"],["plus","Release the pad. Press + to zoom in, – to zoom out (try both together for triplets).","zoom"],["right","◀ ▶ change pages, ▲▼ octaves.","pagenav"],["all","Hold all (right-click) to select every note, then press ▶ to move them.","sel:move"],["undo","Press undo.","undo"],["right","2ND + ▶: double the pattern and copy its notes.","dup"]]],
 ["EP07 · Effects","kw8zrQjzpoc",[["t3","Select track 4 (ARP LEAD); unmute it in Mixmute if needed.","track:sel:3"],["effects","Press effects: the rack. Slot 2 has an ARPEGGIATOR.","sub:fx"],["enc","Turn the main encoder to select slot 2.","fx:sel"],["e1","Turn STYLE, RATE, GATE, OCTAVE…","fx:param"],["enc","Select an empty slot and press the main encoder: add ECHO.","fx:add:ECHO"],["enc","Press the main encoder on an effect: TOGGLE ON/OFF (mute it) or move it (hold + turn).","fx:menu"],["rec","Hold rec and turn an effect parameter: a lane for it is created in Autom mode.","aut:quick"]]],
 ["EP08 · Algorithms","hdfoq2Z3mDU",[["t6","Select an empty track (7).","track:sel:6"],["step","Press step.","mode:step"],["algo","Press algo: GENERATOR.","sub:algo"],["e5","Set QUANTIZE, LENGTH, VELOCITY, DENSITY, PITCH (press an encoder for its ⊕ min value).","enc:*"],["e1","Press encoder 1 to apply. Press again for another result; undo goes back.","algo:GENERATR"],["e1","Turn encoder 1 to CURVES (velocity by default) and apply.","algo:CURVES"],["e1","Try SYMMETRY.","algo:SYMMETRY"]]],
 ["EP09 · Mixmute","bgPseYG1PYU",[["mute","Press mute.","mode:mix"],["play","Press play.","play"],["pads","Top row = proA MUTE: press pads.","mix:mute"],["pads","Row 2 = SOLO (hold one and press others to solo several).","mix:solo"],["pads","Row 3 = TOGGLE: inverts while held.","mix:tog"],["proB","Hold proB (right-click), main encoder to LOAD DEMO, press it, choose PIANO PHASE: it loads into proB, muted.","proj:load"],["mute","Hold mute (right-click) and press proB: it comes in at the end of the bar.","proj:mute:proB"]]],
 ["EP10 · Assign","AhJ5KF67iac",[["t1","Select track 2 (BASS).","track:sel:1"],["fill","2ND + fill: ASSIGN.","sub:assign"],["e1","Turn encoder 1: CC74 CUTOFF of the bass stand-in synth.","assign:turn"],["e2","Press encoder 2 and pick a destination (e.g. an effect parameter or CC71).","assign:dest"],["play","Press play, then rec.","play"],["rec","Press rec and turn encoder 1: the movement is recorded as automation.","aut:rec"],["autom","Press autom to see the lane.","mode:autom"]]],
 ["EP11 · Project transitions","IQZ9i-ynYn8",[["play","Press play (proA plays HAPAX TOUR).","play"],["proB","Hold proB, choose LOAD DEMO → PSCALE GARDEN. It arrives muted.","proj:load"],["mute","Hold mute and press proB: proB comes in in sync.","proj:mute:proB"],["mute","Hold mute and press proA: proA leaves at the end of the bar.","proj:mute:proA"],["proA","Press proA/proB to choose which project the pads and tracks edit.","proj:sel"]]],
 ["EP12 · Snapshot","NMZk7XgcP54",[["snapshot","Hold snapshot (long-press, or right-click then click again) to capture.","snap:take"],["step","Press step and change some notes, or effect parameters.","step:add"],["snapshot","Press snapshot: back to the captured version (red).","snap:toggle"],["snapshot","Press again: your working version (green).","snap:toggle"]]],
 ["EP13 · Isomorphic keyboard","4_Gqy6OJkY8",[["live","Press live on a POLY track.","mode:live"],["pads","Play pads: right = +1, up = +3 semitones.","live:note"],["e4","Press encoder 4 (VIEW) to get JUMP, turn it (e.g. 5 = fourths, like a bass).","jump"],["e5","Turn COLOR and SCALE (encoders 5 and 6): the keyboard now moves in scale degrees.","enc:*"],["e2","Turn PLAY (encoder 2) to HOLD, then play pads: notes stay on until you play them again.","hold"],["effects","Add an ARP in effects and play held notes.","fx:add:ARP"]]],
 ["EP14 · Project scale","J7i69JogkPE",[["proA","Hold proA (right-click to latch).","press:proA"],["e1","Encoder 1: pSCALE ON.","psc:on"],["e2","KEY and SCALE (encoders 2, 5, 6).","psc:scale"],["proA","Release proA. Press play: every melodic track is in the scale.","play"],["proA","Hold proA and change the scale while it plays: the whole project re-harmonises.","psc:scale"],["t1","2ND + a track → pSCALE OFF excludes it.","trk:psc"]]],
 ["EP15 · Loop points","w5gsc5uHkoQ",[["t0","Select track 1, press step, press play.","play"],["left","Hold ◀ (right-click) and press track button 5: loop start at step 5.","loop:set"],["right","Release ◀, hold ▶ and press track button 8: loop end.","loop:set"],["left","Press ◀ and ▶ together (latch one, press the other): loop cleared.","loop:clear"],["minus","Zoom out (–) and set loops across bars.","zoom"]]],
 ["EP16 · Automations","l6fR5ir1lIg",[["t1","Select track 2 (BASS), press autom.","mode:autom"],["pads","It has a CC74 lane. Press pads to add events (columns = steps, rows = values).","aut:event"],["e2","INTERPOL on/off: lines or steps.","aut:interp"],["e1","Turn encoder 1 to + ADD and press it: choose a destination (e.g. CC71 RESONANCE).","aut:add"],["e5","Encoder 5 (DEFAULT): value sent when the pattern has no events.","aut:def"],["e1","Press encoder 1 on a lane: menu (mute, clear, lock…).","aut:mute"],["algo","algo → CURVES draws a shape.","algo:CURVES"]]],
 ["EP17 · modMatrix","vngcBiTkJjk",[["t1","Select track 2, press effects. Slot 1 = MODMATRIX.","sub:fx"],["e2","Encoder 2 (SOURCE): LFO A.","mm:src"],["e5","Encoder 5 (DEST): CC74 (or press for the list).","mm:dest"],["e3","DEPTH and OFFSET (encoders 3, 4). Press play: the cutoff moves.","mm:depth"],["effects","2ND + effects: project LFOs, change LFO A's rate or waveform.","plfo"]]],
 ["EP18 · Sections & songs","atZpXI0-4qc",[["pattern","Press pattern. Launch some patterns.","mode:pattern"],["enc","Turn the main encoder to + SAVE SECTION and press: a section stores the current patterns.","sec:save"],["enc","Select a section and press: it launches (in sync).","sec:launch"],["pattern","Press pattern: SONG tab (the demo has a song).","tab:SONG"],["e1","Encoder 1 (MODE): LOOP SONG.","pmode:LOOP SONG"],["play","Press play: sections follow each other.","play"],["stop","stop.","stop"]]],
 ["EP19 · Import / export","Ri-F0EjGWDE",[["t1","Select track 2.","track:sel:1"],["2nd","2ND + track 2: secondary settings.","page:trk2"],["e8","Encoder 8 (MIDI FILE): EXPORT; press it: the pattern downloads as a .mid.","mid:export"],["e8","Turn it to IMPORT and press: choose a .mid; pick a track; it replaces the pattern.","mid:import"]]],
 ["EP20 · Phasing","ea0OKpoAdYA",[["proA","Hold proA, LOAD DEMO → PIANO PHASE.","proj:load"],["play","Press play: two pianos play the same 12-note figure.","play"],["t1","Select track 2.","track:sel:1"],["bpm","Press bpm, press the main encoder twice (ELASTICITY). It's 100.5%: track 2 slowly drifts ahead.","el"],["enc","Try 150% or 75% for polyrhythms.","el"]]],
 ["MIDI external: controller in, synth out",null,[["lscreen","Connect a USB MIDI keyboard (and/or a synth), click MIDI in the toolbar and allow access (Chrome/Edge).","midi:on"],["t1","Select a track. Its INPUT is ALL ACTIVE: whatever you play goes to the selected track.","track:sel"],["lscreen","Play your keyboard: the track's stand-in synth sounds; Hapax effects and pScale apply.","midi:note"],["t1","Hold the track: OUTPUT and CHANNEL. Notes also go out to every connected MIDI output on that channel.","trk:ch"],["rec","Press play, then rec, and play your keyboard: it records.","rec:note"],["lscreen","Move a knob (CC) while recording: a lane is created.","aut:rec"],["live","2ND + live: MIDI monitor shows in/out.","monitor"]]],
 ["MIDI internal: everything inside, no gear",null,[["t4","Select track 5. In the Virtual studio card, channel 5 = PLUCK.","track:sel:4"],["t4","Hold track 5 and change CHANNEL to 1: it now plays the POLY SYNTH stand-in.","trk:ch"],["step","Press step and add notes.","step:add"],["effects","effects → add HARMONIZER: one track drives several notes.","fx:add:HARMO"],["play","Press play.","play"]]],
 ["3.20–3.22 · AFTR (poly aftertouch) tracks",null,[["t6","Select an empty track (7).","track:sel:6"],["step","Hold step (right-click) and turn the main encoder to AFTR.","type:AFTR"],["step","Release step, press live.","mode:live"],["e7","Encoder 7: PRESSUR (3.22). Turn it up.","aftr:pres"],["pads","Play pads: each note gets that pressure as poly aftertouch (brighter keys on the mini keyboard; brighter sound here).","live:note"],["step","Press step, hold a note: press + (or press encoder 5) to switch VELOCITY ⇄ PRESSUR, set its pressure.","step:cyc"]]]];
let tour=null;const curStep=()=>tour&&TOURS[tour.i][2][tour.k];
function startTour(i){tour={i,k:0};renderTour()}
function renderTour(){document.querySelectorAll(".ctl.tourTarget").forEach(e=>e.classList.remove("tourTarget"));const box=$("#tourBox");if(!tour){box.hidden=true;return}
 const[name,vid,steps]=TOURS[tour.i];box.hidden=false;
 if(tour.k>=steps.length){box.innerHTML=`<h2>${name}</h2><p class="done">Done.</p>${vid?YT(vid):""}<div class="nav"><button id="tClose">Close</button></div>`;$("#tClose").onclick=()=>{tour=null;renderTour();$("#tourSel").value=""};return}
 const[target,text]=steps[tour.k];if(ctlEls[target])ctlEls[target].classList.add("tourTarget");
 box.innerHTML=`<h2>${name}</h2><p class="pg">Step ${tour.k+1} of ${steps.length}${vid?` · <a href="https://www.youtube.com/watch?v=${vid}" target="_blank" rel="noopener">video ↗</a>`:""}</p><p class="step">${text}</p><div class="nav"><button id="tPrev">Back</button><button id="tNext">Skip</button><button id="tClose">Close</button></div>`;
 $("#tPrev").onclick=()=>{tour.k=Math.max(0,tour.k-1);renderTour()};$("#tNext").onclick=()=>{tour.k++;renderTour()};$("#tClose").onclick=()=>{tour=null;renderTour();$("#tourSel").value=""}}
function emit(ev){if(!tour)return;const st=curStep();if(!st)return;const w=st[2];if(w===ev||(w.endsWith("*")&&ev.startsWith(w.slice(0,-1)))){tour.k++;setTimeout(renderTour,200)}}
/* ================= virtual studio card ================= */
function renderStudio(){const c=$("#studio");c.innerHTML=`<h2>Virtual studio</h2><p class="pg">Hapax makes no sound: it sends MIDI. Here each MIDI channel has a stand-in instrument; CV/Gate outputs drive a mono synth. ${MIDIO.length?`<b>Also sending to ${MIDIO.length} MIDI output(s).</b>`:"Click MIDI to send to real gear too."}</p><div class="studio">${S.studio.map((s,i)=>`<label>CH${("0"+(i+1)).slice(-2)} <select data-ch="${i}">${INSTS.map(x=>`<option${x===s?" selected":""}>${x}</option>`).join("")}</select></label>`).join("")}</div>`;
 c.querySelectorAll("select").forEach(s=>s.onchange=e=>{S.studio[+e.target.dataset.ch]=e.target.value;try{localStorage.setItem("hpx.studio",JSON.stringify(S.studio))}catch(_){}emit("studio")})}
/* ================= keyboard ================= */
const PKEYS={a:0,w:1,s:2,e:3,d:4,f:5,t:6,g:7,y:8,h:9,u:10,j:11,k:12,o:13,l:14,p:15};const kbOn=new Map();
document.addEventListener("keydown",e=>{if(e.target.closest&&e.target.closest("input,select,textarea"))return;const k=e.key;
 if(S.ov&&S.ov.t==="kbd"){e.preventDefault();const o=S.ov;if(k==="Enter"){const v=o.val.trim();S.ov=null;if(v)o.enter(v)}else if(k==="Backspace")o.val=o.val.slice(0,-1);else if(k==="Escape")S.ov=null;else if(k.length===1)o.val=(o.val+k).slice(0,16);return}
 if(e.metaKey||e.ctrlKey||e.altKey)return;if(e.target.closest&&e.target.closest("button"))return;
 if(k==="Shift"){if(!isHeld("2nd")){down("2nd")}return}
 if(S.ov&&S.ov.t==="list"){if(k==="ArrowUp"||k==="ArrowDown"){e.preventDefault();mainTurn(k==="ArrowDown"?1:-1,{});return}if(k==="Enter"){e.preventDefault();mainPress();return}if(k==="Escape"){S.ov=null;return}}
 if(S.ui.mode==="live"&&PKEYS[k.toLowerCase()]!=null&&!e.repeat){firstGesture();const T=T_(),n=clamp(T.live.key+12*T.live.oct+PKEYS[k.toLowerCase()],0,127);kbOn.set(k.toLowerCase(),{T,id:liveOn(P_(),T,n,T.live.vel),n});return}
 const map={" ":"play",".":"stop",r:"rec",ArrowLeft:"left",ArrowRight:"right",ArrowUp:"up",ArrowDown:"down","+":"plus","=":"plus","-":"minus",Delete:"delete",Backspace:"delete",m:"mute",z:"undo","1":"live","2":"step","3":"autom","4":"pattern",x:"effects",c:"settings",b:"bpm"};
 const id=map[k];if(id&&!e.repeat){e.preventDefault();firstGesture();down(id)}if(k==="Escape")S.ov=null});
document.addEventListener("keyup",e=>{const k=e.key;if(k==="Shift"){if(isHeld("2nd")&&!HELD.get("2nd").latched)up("2nd");return}
 const kk=kbOn.get(k.toLowerCase());if(kk){kbOn.delete(k.toLowerCase());liveOff(P_(),kk.T,kk.id,kk.n);return}
 const map={" ":"play",".":"stop",r:"rec",ArrowLeft:"left",ArrowRight:"right",ArrowUp:"up",ArrowDown:"down","+":"plus","=":"plus","-":"minus",Delete:"delete",Backspace:"delete",m:"mute",z:"undo","1":"live","2":"step","3":"autom","4":"pattern",x:"effects",c:"settings",b:"bpm"};
 const id=map[k];if(id&&isHeld(id)&&!HELD.get(id).latched)up(id)});
/* ================= boot ================= */
function UI0(){return{mode:"live",prev:"live",sub:null,page:null,tt:false,lm:false,poff:0,fxSel:0,fxSec:null,setTab:0,setRow:0,setEdit:false,projRow:0,bpmF:0,algo:"GENERATR",algoSec:null,livePads:new Set(),livePlay:new Map(),mg:new Set()}}
S={P:[DEMOS["HAPAX TOUR"](),newProject("PROJECT B")],ap:0,bpm:118,clk:0,clk0:0,playing:false,rec:false,recArm:false,countEnd:null,count:0,fill:false,set:{...SET0},recset:{...REC0},
 studio:(()=>{try{const s=JSON.parse(localStorage.getItem("hpx.studio"));if(Array.isArray(s)&&s.length===16)return s}catch(_){}return[...STUDIO0]})(),undo:[],redo:[],snap:null,mon:{in:[],out:[]},
 algoP:Object.fromEntries(Object.entries(ALGODEF).map(([k,d])=>[k,Object.fromEntries(d.p.flatMap(x=>[[x[0],x[3]],...(x[4]?[[x[4][0],x[4][3]]]:[])]))])),srec:null,toast:null,ov:null,ui:UI0(),_sel:null};
S.studio[15]=S.studio[15]||"SILENT";if(!localStorage.getItem||true){}
initRT();buildPanel();renderStudio();
try{const w=new Worker(URL.createObjectURL(new Blob(["setInterval(()=>postMessage(0),10)"],{type:"text/javascript"})));w.onmessage=()=>advance(performance.now())}catch(_){setInterval(()=>advance(performance.now()),10)}
function loop(){advance(performance.now());frameNo++;drawScreens();if(S.toast&&performance.now()<S.toast.until){const X=RX;box(X,0,LH-24,LW,13,"#ffd84a");tx(X,S.toast.msg,LW/2,LH-14,9,"#000","center")}refreshPanel();maybeInfo();requestAnimationFrame(loop)}
renderViewInfo();requestAnimationFrame(loop);
TOURS.forEach((t,i)=>{const o=document.createElement("option");o.value=i;o.textContent=t[0];$("#tourSel").appendChild(o)});
CHAP.forEach((c,i)=>{const li=document.createElement("li");li.innerHTML=`<span>${c[0]}</span><i>p. ${c[1]}</i><button>Show</button>`;li.querySelector("button").onclick=()=>chapterShow(i);$("#chapList").appendChild(li)});
Object.keys(DEMOS).forEach(n=>{const o=document.createElement("option");o.value=n;o.textContent=n;$("#exSel").appendChild(o)});
$("#exSel").onchange=e=>{if(e.target.value){firstGesture();loadInto(S.ap,DEMOS[e.target.value]());e.target.value=""}};
$("#tourSel").onchange=e=>{if(e.target.value!==""){firstGesture();startTour(+e.target.value);$("#sideCol").scrollTop=0}};
$("#soundBtn").onclick=e=>{sound=!sound;e.currentTarget.setAttribute("aria-pressed",sound);if(sound){ensureAC().resume()}else allSoundOff()};
$("#midiBtn").onclick=()=>{firstGesture();midiInit()};
$("#resetBtn").onclick=()=>{if(S.playing)stop();allNotesOff();S.P=[DEMOS["HAPAX TOUR"](),newProject("PROJECT B")];S.ap=0;setBpm(118);S.ui=UI0();initRT();tour=null;renderTour();renderViewInfo()};
$("#midIn").onchange=async e=>{const f=e.target.files[0];e.target.value="";if(!f)return;try{const m=parseMid(await f.arrayBuffer());if(!m.tracks.length){toast("NO NOTES IN THAT FILE");return}const T=T_();
 const go=i=>importMid(T,m.tracks[i],m.ppq,null);if(m.tracks.length===1)go(0);else listPopup("IMPORT · CHOOSE TRACK",m.tracks.map(t=>`${t.name} (${t.notes.length})`),0,go)}catch(_){toast("COULDN'T READ THAT .MID")}};
function applyAlgo(){const T=T_(),a=S.ui.algo,pr=S.algoP[a];if(T.type==="AFTR"||T.type==="MPE"){toast("ALGO NOT AVAILABLE FOR "+T.type);return}
 if(S.ui.mode==="autom"){const li=autLane(T);if(li>=T.lanes.length){toast("SELECT A LANE");return}mark();const p=PAT(T),n=pr.steps||p.len,ev=[];
  for(let i=0;i<n;i++){const f=i/n*pr.rep+pr.phase/360;let w=pr.wave==="RAND"||pr.wave==="PERLI"?Math.abs((Math.sin((i+1)*12.9898*pr.seed)*43758.5453)%1):lfoVal(pr.wave==="SQUA"?"SQUARE":pr.wave,f,0,{});ev.push({t:i*p.len/n,v:(pr.amin+(pr.amp-pr.amin)*w)/127})}
  p.aut[li]=ev;emit("algo:CURVES");toast("CURVES APPLIED");return}
 runAlgo(T,a,pr,selNotes());toast(ALGODEF[a].n+" APPLIED")}
document.querySelectorAll(".vsw button").forEach(b=>b.onclick=()=>{svg.setAttribute("viewBox",b.dataset.vb);document.querySelectorAll(".vsw button").forEach(x=>x.setAttribute("aria-pressed",x===b))});
