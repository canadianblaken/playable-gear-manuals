const W=ms=>new Promise(r=>setTimeout(r,ms));const R={};const log=[];
const _out=out;out=function(P,T,ev){log.push({t:P.tracks.indexOf(T),n:ev.n,p:S.P.indexOf(P),at:ev.at,len:ev.len,src:ev.src});return _out(P,T,ev)};
const tap=id=>{down(id);up(id)};
// zoom fixed?
tap("t6");tap("step");tap("plus");R.zoom=ZOOMS[T_().zoom][0];tap("minus");
// live recording on empty track 8 (overdub), quantize 1/16
tap("t7");tap("live");S.recset.quant="1/16";tap("rec");R.armed=S.recArm;tap("play");R.recOn=S.rec;
for(let i=0;i<4;i++){down("p"+i+"_0");await W(120);up("p"+i+"_0");await W(250)}
tap("rec");R.recOff=!S.rec;R.recNotes=PAT(T_()).notes.map(n=>[n.s,n.n,n.l]);
// arp on track 8: add effect via fx menu
tap("effects");S.ui.fxSel=1;mainPress();R.ov=S.ov&&S.ov.title;S.ov.sel=FXLIST.indexOf("ARP");mainPress();R.fx=T_().fx.map(f=>f.t);
log.length=0;tap("live");down("p0_0");down("p2_0");await W(1200);up("p0_0");up("p2_0");R.arpOut=log.filter(x=>x.t===7&&x.src==="fx").length;
// echo
const T=T_();T.fx[1]=fxNew("ECHO");log.length=0;down("p4_1");await W(100);up("p4_1");await W(1500);R.echo=log.filter(x=>x.t===7).length;
// euclid fixed note
T.fx[1]=fxNew("EUCLID");T.fx[1].p.note=72;T.fx[1].p.steps=8;T.fx[1].p.pulses=3;log.length=0;await W(2100);R.eucl=log.filter(x=>x.t===7&&x.n===72).length;T.fx.splice(1,1);
// automation: bass lane CC74 sends
let ccs=0;const _cc=ccIn;ccIn=function(k,n,v,t){if(n===74)ccs++;return _cc(k,n,v,t)};await W(800);R.ccSends=ccs;ccIn=_cc;
// modMatrix LFO A -> CC71 on track 3
const T3=P_().tracks[2];Object.assign(T3.fx[0].mods[0],{src:"LFO A",dest:"CC71",depth:100,off:0});await W(500);R.mmOut=T3.fx[0].mods[0].out;
tap("stop");
// sections & song
tap("pattern");const P=P_();R.secs=P.sections.length;P.pmode="LOOP SONG";P.songSel=0;tap("play");await W(300);R.song=P.rt.song&&P.rt.song.i;R.trk1=P.tracks[0].cur;tap("stop");P.pmode="PERFORM";
// load demo into proB while playing; mute transition
tap("play");loadInto(1,DEMOS["PIANO PHASE"]());R.bMuted=S.P[1].muted;down("mute");down("proB");up("proB");up("mute");R.muteAt=!!S.P[1].rt.muteAt;await W(2300);R.bNow=S.P[1].muted;
log.length=0;await W(1500);R.bPlays=log.filter(x=>x.p===1).length;
// elasticity phasing
R.el=S.P[1].tracks[1].el;tap("stop");
// snapshot
S.ap=0;snapCapture();const n0=P_().tracks[0].pats[0].notes.length;P_().tracks[0].pats[0].notes=[];snapToggle();R.snapBack=P_().tracks[0].pats[0].notes.length===n0;snapToggle();R.snapWork=P_().tracks[0].pats[0].notes.length;
snapToggle();
// loop points: hold left + track 5, right + track 8
tap("step");tap("t0");down("left");down("t4");up("t4");up("left");down("right");down("t7");up("t7");up("right");R.loop=PAT(T_()).loop;down("left");down("right");up("right");up("left");R.loopCleared=PAT(T_()).loop;
// export mid
let dl=null;HTMLAnchorElement.prototype.click=function(){dl=this.download};exportMid(P_(),P_().tracks[1]);R.mid=dl;
// parse roundtrip
const ptr=P_().tracks[1],bytes=await (await fetch(document.querySelector?URL.createObjectURL(new Blob([])):"")).arrayBuffer().catch(()=>null);
// copy/paste track
down("copy");down("t1");up("t1");up("copy");down("paste");down("t9");up("t9");up("paste");R.pasted=P_().tracks[9].pats[0].notes.length===P_().tracks[1].pats[0].notes.length;
// AFTR pressure
tap("t10");setType(T_(),"AFTR");tap("live");T_().live.pres=99;log.length=0;let pres=null;const _pa=synthNote;synthNote=function(k,n,v,t,d,pr){pres=pr;return _pa(k,n,v,t,d,pr)};down("p0_0");await W(100);up("p0_0");synthNote=_pa;R.aftrPr=pres&&+pres.toFixed(2);
// chord mode
tap("t11");T_().live.mode="CHORD";log.length=0;down("p5_0");await W(60);up("p5_0");R.chord=log.filter(x=>x.t===11).map(x=>x.n);
// drum live velocity
tap("t0");tap("live");log.length=0;down("p3_3");up("p3_3");R.drum=log.map(x=>x.n);
return R;
