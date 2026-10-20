// Assertions on behaviour taken from the firmware study and on the SysEx tools against the simulated device.
const W=ms=>new Promise(r=>setTimeout(r,ms));const tap=id=>{down(id);up(id)};const two=(a,b)=>{down(a);tap(b);up(a)};const R={};
const ok=(name,c,info)=>{R[name]=c?"ok":"FAIL "+JSON.stringify(info)};
const reset=()=>{stop();$("#resetBtn").onclick();loadDemo("Quick tour")};
/* scale map: ties snap down */
reset();tap("t1trk");const p=curPat(1);p.scale=1;p.root=0;
ok("C major: C#->C, F#->F, A#->A",q(1,61)===60&&q(1,66)===65&&q(1,70)===69,[q(1,61),q(1,66),q(1,70)]);
p.scale=5;ok("harmonic minor mask = C D Eb F G Ab B",maskIv(SCALES[5][1]).join()==="0,2,3,5,7,8,11",maskIv(SCALES[5][1]));
/* chord mode: each chord note snapped on its own */
reset();tap("t2trk");trk(2).chord={root:64,off:[4,7]};trk(2).chordOn=true;Object.assign(curPat(2),{scale:1,root:4});
const ch=n=>liveNotes(2,n).map(nm).join(" ");
ok("E major shape: F# -> F#m",ch(66)==="F#4 A4 C#5",ch(66));ok("E major shape: G# -> G#m",ch(68)==="G#4 B4 D#5",ch(68));ok("E major shape: D# -> D# F# A",ch(63)==="D#4 F#4 A4",ch(63));
/* the Save Project confirm trap: a step pad loads a project instead */
reset();const before=JSON.stringify(S.flash[0]);tap("t1trk");tap("s15");two("save","project");tap("s2");
ok("pad at Save confirm loads project 3, nothing saved",S.proj===2&&JSON.stringify(S.flash[0])===before&&!S.confirm,{proj:S.proj});
reset();tap("t1trk");tap("s15");two("save","project");clickKnob("sel");ok("encoder confirms Save Project",JSON.stringify(S.flash[0])!==before&&S.flash[0].tracks[1].pats[0].st[15].on);
/* step record: note, rest, note */
reset();tap("stop");tap("t2trk");curPat(2).st=Array.from({length:64},newStep);tap("rec");down("k12");up("k12");tap("tie");down("k16");up("k16");tap("rec");
const st=curPat(2).st;ok("step record fills 1, rests 2, fills 3",st[0].n[0]?.p===60&&!st[1].on&&st[2].n[0]?.p===64,st.slice(0,3).map(s=>s.n.map(x=>x.p)));
/* real-time record while playing */
reset();tap("t2trk");trk(2).pats[0]=newPat();down("rec");tap("play");up("rec");await W(400);down("k12");await W(150);up("k12");await W(100);tap("stop");
ok("real-time record stored a note",curPat(2).st.some(s=>s.n.some(n=>n.p===60)));
/* drum lanes in poly mode keep their own length */
reset();loadDemo("Polymeter drums");tap("play");await W(1200);tap("stop");ok("polymeter demo plays",true);
/* ---- SysEx tools against the simulated device ---- */
reset();selectTab("dev");$("#devPort").value="sim";await devConnect();const L=DEV.link;
ok("identity reply",!!(await L.identity()));
await L.setGlobal(152,2);ok("global SET 152 (cmd 32) then GET reads 2",(await L.getGlobal(152))===2&&S.globals[152]===2);
ok("global GET 80 (cmd 01)",(await L.getGlobal(80))===S.globals[80]);
/* the commit quirk: a bare open+commit flips every untouched pattern state */
saveProject();const validBefore=S.flash[0].tracks[1].pats[0].valid;await L.open(1);await L.commit(1);
ok("bare commit flips states (valid pattern becomes default and loses content)",validBefore&&!S.flash[0].tracks[1].pats[0].valid&&!S.ram[0].tracks[1].pats[0].st.some(s=>s.on),{validBefore});
/* the writer re-sends states: content survives */
reset();saveProject();const keep=JSON.stringify(S.flash[0].tracks[1].pats[0].st);
const pr=await writeProject(L,{project:1,title:"Quick Tour",shape:[64,68,71],tracks:[{n:2,root:4,scale:"major"}]});
ok("writeProject verifies with no problems",pr.length===0,pr.slice(0,3));
ok("existing pattern content survives the write",JSON.stringify(S.flash[0].tracks[1].pats[0].st)===keep);
ok("root/scale on all 16 patterns",S.flash[0].tracks[1].pats.every(p=>p.root===4&&p.scale===1));
ok("chord + chord mode written",S.flash[0].tracks[1].chord.root===64&&S.flash[0].tracks[1].chord.off.join()==="4,7"&&S.flash[0].tracks[1].chordOn);
ok("name written (names firmware)",S.flash[0].name==="Quick Tour"&&S.ram[0].name==="Quick Tour");
SIMDEV.namesFw=false;await L.setName(3,"Ignored");ok("stock firmware ignores the name",S.flash[2].name==null);SIMDEV.namesFw=true;
const pr2=await writeProject(L,{project:4,shape:[60,64,67],tracks:[{n:1,root:0,scale:"user1",userMask:[0,1,3,5,7,8,10]}]});
ok("user 1 scale mask written",pr2.length===0&&S.flash[3].user[0]===[0,1,3,5,7,8,10].reduce((m,i)=>m|1<<i,0),{pr2:pr2.slice(0,2),u:S.flash[3].user[0]});
ok("bad name rejected",(()=>{try{displayName("this name is far too long");return false}catch(e){return true}})());
/* whole project: recall, send to another slot, read back */
ok("recall plan matches MCC (8951 blocks)",bulkPlan().length===8951,bulkPlan().length);
reset();saveProject();S.flash[0].raw["121/76/3"]=5;S.flash[0].raw["122/95/2,17"]=1;
const f1=await readProject(L,1);ok("recall reads project 1",f1.data.length===8951&&f1.project===1&&/track 2: \d+ pattern/.test(projectSummary(f1)),projectSummary(f1));
f1.name="Copy Test";const pr3=await storeProject(L,9,f1);
ok("store to project 9 verifies",pr3.length===0,pr3.slice(0,3));
const nz=r=>Object.keys(r).sort().filter(k=>r[k]).map(k=>k+"="+r[k]);
const sysexView=pj=>JSON.stringify(pj.tracks.map(t=>[t.valid,t.chord,t.chordOn,t.oct,t.pats.map(p=>[p.valid,p.root,p.scale,nz(p.raw)])]));
ok("project 9 equals project 1 after store (SysEx-visible state)",sysexView(S.flash[8])===sysexView(S.flash[0])&&S.flash[8].raw["121/76/3"]===5&&S.flash[8].raw["122/95/2,17"]===1&&S.flash[8].name==="Copy Test");
const f9=await readProject(L,9);ok("recall of the copy is identical",JSON.stringify(f9.data)===JSON.stringify(f1.data));
/* chords entered with a note below the root: 0xF7 cuts the reply, 0xF8-0xFF vanish; neither can be written back */
reset();saveProject();Object.assign(S.flash[0].tracks[0],{chord:{root:56,off:[-9,3]},chordOn:true,valid:true});Object.assign(S.flash[0].tracks[2],{chord:{root:60,off:[-2]},chordOn:true,valid:true});
const f2=await readProject(L,1),cb=(it,i)=>f2.data.find(e=>e[0]===it&&e[1]===0x57&&e[2][0]===i)[3][0];
ok("unreadable chord bytes recalled as null",cb(0x7B,2)===null&&cb(0x7B,3)===3&&cb(0x7D,2)===null&&cb(0x7B,1)===56,[cb(0x7B,2),cb(0x7B,3),cb(0x7D,2)]);
ok("summary marks the note below the root",/track 1: .*chord G#3 \(below root\) B3/.test(projectSummary(f2)),projectSummary(f2));
const pr4=await storeProject(L,10,f2);
ok("store skips those chords and reports them, the rest verifies",pr4.length===2&&pr4.every(s=>/chord not sent/.test(s)),pr4);
ok("file check rejects a damaged file",(()=>{const b=deep(f1);b.data[5][3]=[200];try{checkProjectFile(b);return false}catch(e){return true}})());
selectTab("man");return R;
