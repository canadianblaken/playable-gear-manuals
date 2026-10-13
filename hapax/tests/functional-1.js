const W=ms=>new Promise(r=>setTimeout(r,ms));const R={};const log=[];
const _out=out;out=function(P,T,ev){log.push({t:P.tracks.indexOf(T),n:ev.n,p:S.P.indexOf(P),at:ev.at,len:ev.len});return _out(P,T,ev)};
const tap=id=>{down(id);up(id)};
// transport
tap("play");await W(2200);R.playing=S.playing;R.outsPlaying=log.length;R.tracksHeard=[...new Set(log.map(x=>x.t))].sort();
// drum lane timing: kicks every beat
const k=log.filter(x=>x.t===0&&x.n===36).map(x=>x.at);R.kickGaps=k.slice(1).map((a,i)=>+(a-k[i]).toFixed(3));
tap("stop");R.stopped=!S.playing;
// step mode: select track 7, add note, delete
tap("t6");tap("step");const T=T_();R.sel=P_().sel;down("p0_0");up("p0_0");R.added=PAT(T).notes.length;down("p0_0");up("p0_0");R.deleted=PAT(T).notes.length;
// two-finger length: hold p2_1 (latch), press p6_1
down("p2_1");down("p6_1");up("p6_1");up("p2_1");R.lenNote=PAT(T).notes.map(n=>[n.s,n.n,n.l]);
// hold pad -> selection and edit velocity with encoder 5
toggleLatch("p2_1");await W(50);S._sel=computeSel();R.selSize=selNotes()&&selNotes().size;turnEnc("e5",-10,{});R.vel=PAT(T).notes[0].v;toggleLatch("p2_1");
// zoom and pages
tap("plus");R.zoom=ZOOMS[T.zoom][0];tap("minus");tap("minus");R.zoom2=ZOOMS[T.zoom][0];tap("plus");
// undo
const before=PAT(T).notes.length;down("p5_3");up("p5_3");tap("undo");R.undo=[before,PAT(T).notes.length];
// track type via hold step + main encoder
down("step");turnEnc("enc",3,{});R.type=T.type;up("step");down("step");turnEnc("enc",-3,{});up("step");R.type2=T.type;
// pattern mode: launch pattern 2 of track 1 while playing (sync 1 bar)
tap("pattern");tap("play");await W(300);down("p0_6");up("p0_6");R.queued=P_().tracks[0].next&&P_().tracks[0].next.pat;await W(2600);R.nowPat=P_().tracks[0].cur;
// follow actions: set pattern 1 and 2 of track 2 NEXT
const B=P_().tracks[1];B.pats[0].fol.a1="NEXT";B.pats[1].fol.a1="NEXT";B.pats[1].notes=deep(B.pats[0].notes);const seen=new Set();for(let i=0;i<30;i++){seen.add(B.cur);await W(150)}R.followSeen=[...seen];
tap("stop");
// mixmute
tap("mute");R.mix=S.ui.mode;down("p3_7");up("p3_7");R.mute4=P_().tracks[3].mute;tap("mute");R.back=S.ui.mode;
// transpose
P_().trsp="TRSP";log.length=0;tap("play");await W(4500);tap("stop");R.trAmt=P_().rt.trAmt;R.bassNotes=[...new Set(log.filter(x=>x.t===1).map(x=>x.n))];P_().trsp="OFF";P_().rt.trAmt=0;
// algos
tap("step");tap("t8");tap("algo");R.algoView=view();pressEnc("e1");R.genNotes=PAT(T_()).notes.length;
return R;
