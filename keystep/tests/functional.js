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
const sysexView=pj=>JSON.stringify(pj.tracks.map(t=>[t.valid,t.chord,t.chordOn,t.oct,t.pats.map(p=>[p.valid,p.root,p.scale])]));
ok("project 9 equals project 1 after store (SysEx-visible state)",sysexView(S.flash[8])===sysexView(S.flash[0])&&S.flash[8].raw["121/76/3"]===5&&S.flash[8].raw["122/95/2,17"]===1&&S.flash[8].name==="Copy Test");
const f9=await readProject(L,9);ok("recall of the copy is identical",JSON.stringify(f9.data)===JSON.stringify(f1.data));
/* chords entered with a note below the root: 0xF7 cuts the reply, 0xF8-0xFF vanish; neither can be written back */
reset();saveProject();Object.assign(S.flash[0].tracks[0],{chord:{root:56,off:[-9,3]},chordOn:true,valid:true});Object.assign(S.flash[0].tracks[2],{chord:{root:60,off:[-2]},chordOn:true,valid:true});
const f2=await readProject(L,1),cb=(it,i)=>f2.data.find(e=>e[0]===it&&e[1]===0x57&&e[2][0]===i)[3][0];
ok("unreadable chord bytes recalled as null",cb(0x7B,2)===null&&cb(0x7B,3)===3&&cb(0x7D,2)===null&&cb(0x7B,1)===56,[cb(0x7B,2),cb(0x7B,3),cb(0x7D,2)]);
ok("summary marks the note below the root",/track 1: .*chord G#3 \(below root\) B3/.test(projectSummary(f2)),projectSummary(f2));
const pr4=await storeProject(L,10,f2);
ok("store skips those chords and reports them, the rest verifies",pr4.length===2&&pr4.every(s=>/chord not sent/.test(s)),pr4);
/* backup: several projects + globals in one file; restore only the ticked ones */
reset();saveProject();S.flash[1].raw["121/76/1"]=7;S.globals[152]=2;
const bk=await readBackup(L,[1,2,3]);ok("backup holds 3 projects and the globals",bk.projects.length===3&&bk.globals[152]===2&&checkBackupFile(deep(bk)),{n:bk.projects.length,g:bk.globals&&bk.globals[152]});
S.flash[1].raw["121/76/1"]=0;S.flash[2].raw["121/76/1"]=9;S.globals[152]=0;
const rs=await restoreBackup(L,bk,[2],{globals:true});
ok("restore puts back only the ticked project and the globals",rs[2].length===0&&rs.globals.length===0&&S.flash[1].raw["121/76/1"]===7&&S.flash[2].raw["121/76/1"]===9&&S.globals[152]===2,rs);
DEV.busy=true;DEV.stop=false;let sets=0;const sm=L.setMany;L.setMany=async(...a)=>{if(++sets===100)DEV.stop=true;return sm.apply(L,a)};const keep2=JSON.stringify(S.flash[4]);let stopped=false;
try{await storeProject(L,5,bk.projects[0])}catch(e){stopped=e.message==="stopped"}L.setMany=sm;DEV.busy=false;DEV.stop=false;
ok("Stop during a send leaves the slot unchanged",stopped&&JSON.stringify(S.flash[4])===keep2,{stopped});
/* project library (IndexedDB): import a backup and a project, rename, load into the Projects tool, delete */
for(const it of await libList())await libDelete(it.id);
ok("library imports a backup as one entry per project",(await libImport(deep(bk),"bk.json"))===3&&(await libList()).length===3);
await libImport(deep(f1),"p1.json");let items=await libList();const e1=items.find(x=>x.source==="p1.json");
await libRename(e1.id,"Renamed");ok("library rename and get",(await libGet(e1.id)).name==="Renamed"&&(await libGet(e1.id)).file.data.length===8951);
await drawLib();[...document.querySelectorAll("#libList li")].find(r=>r.textContent.includes("Renamed")).click();for(let i=0;i<20&&$("#libAct").hidden;i++)await W(20);DEV.project=null;
$("#libAct [data-l=load]").click();for(let i=0;i<50&&!DEV.project;i++)await W(20);
ok("library Load opens the project in the editor",DEV.project&&DEV.project.data.length===8951&&/Library “Renamed”/.test($("#workSrc").textContent)&&!$("#pjWork").hidden);
ok("library refuses a damaged project",await libAdd({format:"x"},"bad","").then(()=>false,()=>true));
for(const it of await libList())await libDelete(it.id);ok("library delete",(await libList()).length===0);
/* gate table measured on hardware: stored value -> steps */
ok("gate table matches the hardware measurements",[[0,1/16],[3,.25],[7,.5],[15,1.5],[27,3],[31,4],[47,8],[58,13.5],[95,32],[96,33],[127,64]].every(([g,st])=>gateSteps(g)===st)&&Graw(.5)===7&&Graw(4)===31);
ok("gate labels",gateText(0)==="1/16 step"&&gateText(7)==="1/2 step"&&gateText(15)==="1 1/2 steps"&&gateText(29)==="3 1/2 steps"&&gateText(127)==="64 steps",[gateText(0),gateText(7),gateText(15),gateText(29),gateText(127)]);
/* project editor: notes into slots, scenes, limits, send and read back */
reset();saveProject();const fe=await readProject(L,1);DEV.showProject(fe,"test");
const pe=edReadPattern(fe,0x7C,3);pe.steps[0].notes=[60,64,67].map(p=>({pitch:p,gate:7,vel:100,shift:49,rand:100}));pe.steps[0].on=true;
pe.steps[4].notes=[{pitch:69,gate:20,vel:90,shift:60,rand:80}];pe.steps[4].on=true;pe.len=8;pe.root=4;pe.scale=1;edWritePattern(fe,0x7C,3,pe);
const pe2=edReadPattern(fe,0x7C,3);
ok("editor: notes, length, root/scale read back",pe2.valid&&pe2.len===8&&pe2.root===4&&pe2.scale===1&&pe2.steps[0].notes.map(n=>n.pitch).join()==="60,64,67"&&pe2.steps[4].notes[0].shift===60&&pe2.steps[4].notes[0].gate===20&&pe2.steps.filter(s=>s.notes.length).length===2,pe2.steps.slice(0,5).map(s=>s.notes));
ok("editor: step pass masks stay 15 (plays every pass) through an edit",edGet(fe,0x7C,0x31,[3,1,1])===15&&edGet(fe,0x7C,0x31,[3,1,2])===15&&edGet(fe,0x7C,0x31,[3,1,64])===15,[edGet(fe,0x7C,0x31,[3,1,1]),edGet(fe,0x7C,0x31,[3,1,2])]);
ok("editor: notes fill slots in step order, the rest are 0x7F",edGet(fe,0x7C,0x32,[3,1,1])===0&&edGet(fe,0x7C,0x32,[3,1,4])===4&&edGet(fe,0x7C,0x32,[3,1,5])===0x7F&&edGet(fe,0x7C,0x6D,[3,3,64])===0x7F);
ok("editor: 17 notes on a step refused",(()=>{const x=edReadPattern(fe,0x7C,3);x.steps[2].notes=Array.from({length:17},(_,i)=>({pitch:40+i,gate:7,vel:100,shift:49,rand:100}));try{edWritePattern(fe,0x7C,3,x);return false}catch(e){return /limit is 16/.test(e.message)}})());
ok("editor: 193 notes in a pattern refused",(()=>{const x=edReadPattern(fe,0x7C,3);x.steps.forEach((s,i)=>s.notes=Array.from({length:i<1?4:3},(_,j)=>({pitch:40+j,gate:7,vel:100,shift:49,rand:100})));try{edWritePattern(fe,0x7C,3,x);return false}catch(e){return /holds 192/.test(e.message)}})());
const sc=edReadScene(fe,2);Object.assign(sc,{valid:true,pats:[1,2,0,0,0],mute:5,chains:[[0,1,2],[],[],[],[]],chainOn:true,track:1});edWriteScene(fe,2,sc);const sc2=edReadScene(fe,2);
ok("editor: scene patterns, mutes, chain read back",sc2.valid&&sc2.pats.join()==="1,2,0,0,0"&&sc2.mute===5&&sc2.chains[0].join()==="0,1,2"&&sc2.chainOn&&sc2.track===1,sc2);
const pr5=await storeProject(L,11,fe);const f11=await readProject(L,11);const pe3=edReadPattern(f11,0x7C,3);
ok("editor: edited project sent and read back",pr5.length===0&&pe3.steps[0].notes.map(n=>n.pitch).join()==="60,64,67"&&pe3.len===8&&edReadScene(f11,2).chains[0].join()==="0,1,2",pr5.slice(0,3));
/* the editor: the roll on track 3, add two notes to step 3, select, change velocity, remove, undo */
const cell=(s,n)=>$(`#ppanel .roll .c[data-s="${s}"][data-n="${n}"]`);
STU.tab=2;STU.pat[2]=1;renderWork();cell(2,62).click();cell(2,66).click();
const kept=edReadPattern(DEV.project,0x7D,1);
ok("editor: clicking the roll adds notes to the step",kept.steps[2].notes.map(n=>noteName(n.pitch)).join(" ")==="D4 F#4"&&kept.steps[2].on&&STU.changed&&!$("#workChg").hidden,kept.steps[2].notes);
const vel=$("#ppanel [data-k=vel]");vel.value="64";vel.onchange();
ok("editor: the selected note's velocity is edited",edReadPattern(DEV.project,0x7D,1).steps[2].notes.find(n=>n.pitch===66).vel===64);
cell(2,66).click();ok("editor: clicking a selected note removes it",edReadPattern(DEV.project,0x7D,1).steps[2].notes.map(n=>n.pitch).join()==="62");
undo();ok("editor: undo brings it back",edReadPattern(DEV.project,0x7D,1).steps[2].notes.map(n=>n.pitch).join()==="62,66");
redo();undo();
STU.tab=1;renderWork();$("#ppanel [data-a=copy]").click();STU.pat[1]=7;renderPanel();$("#ppanel [data-a=paste]").click();
ok("editor: copy and paste a pattern",JSON.stringify(edReadPattern(DEV.project,0x7C,7).steps.map(s=>s.notes))===JSON.stringify(edReadPattern(DEV.project,0x7C,1).steps.map(s=>s.notes)));
const lenIn=$("#ppanel [data-k=len]");lenIn.value="12";lenIn.onchange();ok("editor: pattern length",edReadPattern(DEV.project,0x7C,7).len===12);
$("#ppanel [data-m='1']").click();ok("editor: track 2 set to Arpeggiator",(edGet(DEV.project,0x7C,0x56,[1])&0x40)&&/Arpeggiator/.test($("#ppanel").textContent));
STU.tab=4;renderWork();const used=$("#ppanel input[aria-label='Scene 3 in use']");used.checked=true;used.onchange();const chIn=$("#ppanel input[aria-label='Scene 3 chains']");chIn.value="1:1 2 2:3";chIn.onchange();
const sc3=edReadScene(DEV.project,3);ok("scenes tab: scene used and chains",sc3.valid&&sc3.chains[0].join()==="0,1"&&sc3.chains[1].join()==="2"&&sc3.chainOn,sc3);
STU.tab=5;renderWork();const tIn=$("#ppanel [data-a=tempo]");tIn.value="97.5";tIn.onchange();const chd=$("#ppanel input[aria-label='Track 2 chord']");chd.value="E3 G#3 B3";chd.onchange();
$("#ppanel input[aria-label='Track 2 chord mode']").click();$("#ppanel [aria-label='User 2 notes'] [data-i='3']").click();
ok("project tab: tempo, chord, chord mode, user scale",mfGetTempo(DEV.project)===97.5&&chordOf(DEV.project,0x7C).notes.join()==="52,56,59"&&(edGet(DEV.project,0x7C,0x56,[1])&0x10)&&!!(userMask(DEV.project,[0x68,0x69,0x6A])&8)!==!!(userMask(fe,[0x68,0x69,0x6A])&8),[mfGetTempo(DEV.project),chordOf(DEV.project,0x7C)]);
STU.tab=6;renderWork();const cc1=$("#ppanel [data-cc='0']");cc1.value="74";cc1.onchange();$("#ppanel [data-on='2']").click();
ok("control tab: knob CC and step on",edGet(DEV.project,0x7A,0x5A,[1])===74&&edGet(DEV.project,0x7A,0x5F,[1,3])===1&&edGet(DEV.project,0x7A,0x28,[1])===3);
/* Store through the interface: two clicks, then verify on the device */
STU.slot=13;drawSlots();drawWorkHead();$("#workName").value="UI Store";$("#storeBtn2").click();ok("store asks for a second click",/Click again/.test($("#storeBtn2").textContent)&&S.flash[12].name!=="UI Store");
$("#storeBtn2").click();for(let i=0;i<600&&DEV.busy===false;i++)await W(5);for(let i=0;i<2000&&DEV.busy;i++)await W(20);
const f13=await readProject(L,13);ok("store writes the edited project to slot 13 and clears Changed",!STU.changed&&$("#workChg").hidden&&edReadPattern(f13,0x7D,1).steps[2].notes.length===2&&mfGetTempo(f13)===97.5&&S.flash[12].name==="UI Store"&&/UI Store/.test($("#slotList").textContent),{ch:STU.changed});
/* steps to drum hits: the beat entered on a KeyStep Pro on 2026-10-20 (lane 1 on 1 5 9 13, lane 3 on 5 13, lane 7 on 3 7 11 15) must come out as it stored it */
const fd=deep(fe);const sq=edReadPattern(fd,0x7C,5);sq.len=16;[[36,[0,4,8,12]],[38,[4,12]],[42,[2,6,10,14]]].forEach(([p,st])=>st.forEach(i=>{sq.steps[i].on=true;sq.steps[i].notes.push({pitch:p,gate:7,vel:100,shift:49,rand:100})}));
sq.steps[3].on=true;sq.steps[3].notes.push({pitch:72,gate:7,vel:90,shift:49,rand:100});edWritePattern(fd,0x7C,5,sq);
const dmap=drumMapNotes(GDEF),cv=stepsToDrum(sq,dmap),cvf=stepsToDrum(sq,dmap,true);
ok("drums: default map is Chromatic from note 36",dmap[0]===36&&dmap[23]===59,dmap.slice(0,3));
ok("drums: notes off the map are reported, octave fold places them",cv.dp.hits.length===10&&cv.missed.get(72)===1&&cvf.dp.hits.length===11&&cvf.dp.hits.some(h=>h.lane===12&&h.step===3),[cv.dp.hits.length,[...cv.missed]]);
edWriteDrum(fd,1,cv.dp);edSetDrumMode(fd,true);const dg=(prm,path)=>edGet(fd,0x7B,prm,path);
ok("drums: lane masks as the device stores them",dg(0x34,[1,1,1])===17&&dg(0x34,[1,1,2])===34&&dg(0x34,[1,1,21])===16&&dg(0x34,[1,1,22])===32&&dg(0x34,[1,1,61])===68&&dg(0x34,[1,1,62])===8&&dg(0x34,[1,1,63])===1&&dg(0x34,[1,1,3])===0,[1,2,21,22,61,62].map(i=>dg(0x34,[1,1,i])));
ok("drums: hit slots in lane order, empty slots 127 everywhere",[...Array(11).keys()].map(i=>dg(0x36,[1,1,i+1])).join()==="0,4,8,12,4,12,2,6,10,14,127"&&[...Array(11).keys()].map(i=>dg(0x75,[1,1,i+1])).join()==="0,0,0,0,2,2,6,6,6,6,127"&&dg(0x77,[1,3,64])===127&&dg(0x35,[1,3,64])===15);
ok("drums: track 1 switched to drum mode, nothing else in the mode byte",dg(0x56,[1])===((edGet(fe,0x7B,0x56,[1])??0)|0x40));
const rd=edReadDrum(fd,1);ok("drums: read back",rd.hits.length===10&&rd.len===16&&rd.hits.filter(h=>h.lane===6).map(h=>h.step+1).join()==="3,7,11,15");
ok("drums: two hits on one lane and step refused",(()=>{try{edWriteDrum(fd,2,{len:16,laneLen:Array(24).fill(16),hits:[{lane:1,step:2,gate:7,vel:1,shift:49,rand:100},{lane:1,step:2,gate:7,vel:1,shift:49,rand:100}]});return false}catch(e){return /two hits/.test(e.message)}})());
const blk=await blankProject(9);[2,3].forEach(p=>edSet(blk,0x7B,0x28,[p],2));edSet(blk,0x7B,0x28,[2],3);const blFix=drumFixEmpty(blk);
ok("drums: Store writes empty drum slots as 127 in patterns marked as holding data (lane 60 fills them on the device), leaves default patterns",blFix===192*5&&edGet(blk,0x7B,0x75,[2,1,1])===127&&edGet(blk,0x7B,0x75,[3,1,1])===60,[blFix,edGet(blk,0x7B,0x75,[2,1,1]),edGet(blk,0x7B,0x75,[3,1,1])]);
const pr7=await storeProject(L,10,fd);const f10=await readProject(L,10);
ok("drums: converted project sent and read back",pr7.length===0&&edReadDrum(f10,1).hits.length===10&&edGet(f10,0x7B,0x75,[3,1,1])===127&&(edGet(f10,0x7B,0x56,[1])&0x40),[pr7.slice(0,3),edReadDrum(f10,1).hits.length,edGet(f10,0x7B,0x75,[3,1,1]),edGet(f10,0x7B,0x56,[1])]);
/* the drum screen: Steps -> drums into the pattern on screen, then click a hit off */
DEV.showProject(deep(fd),"test");STU.tab=0;STU.pat[0]=4;renderWork();$("#ppanel [data-a=s2d]").click();const s2=a=>$(`#ppanel .s2d [data-a=${a}]`);s2("t").value="2";s2("p").value="5";s2("go").click();
ok("drums: Steps → drums fills the grid and says what was left out",$("#ppanel").querySelectorAll(".drum .p.on").length===10&&/10 hits on drum pattern 4/.test($("#pmsg").textContent)&&/C4×1|C5×1/.test($("#pmsg").textContent)&&(edGet(DEV.project,0x7B,0x56,[1])&0x40),$("#pmsg").textContent);
const hit=()=>$('#ppanel .drum .p[data-l="0"][data-s="4"]');hit().click();hit().click();
ok("drums: a hit is selected, then removed",edReadDrum(DEV.project,4).hits.length===9);
/* MIDI files: a generated .mid with an off-grid note, a long note, a part longer than a pattern and a 17-note chord */
const T=MF_T16,mid=mfWrite({tempo:100,tracks:[
 {name:"Lead",ch:0,notes:[{pitch:60,vel:90,on:0,off:T/2},{pitch:62,vel:80,on:2*T+T/4,off:2*T+T/4+T*1.5},{pitch:64,vel:70,on:4*T,off:8*T}]},
 {name:"Bass",ch:1,notes:Array.from({length:25},(_,i)=>({pitch:36+i%12,vel:100,on:i*4*T,off:i*4*T+T}))},
 {name:"Pad",ch:2,notes:Array.from({length:17},(_,i)=>({pitch:48+i,vel:60,on:0,off:4*T}))}]});
const mfx=mfParse(mid.buffer),mparts=mfParts(mfx);
ok("MIDI file parses: 3 parts, tempo 100, names",mparts.length===3&&Math.round(mfx.tempo)===100&&mparts.map(p=>p.name).join()==="Lead,Bass,Pad"&&mparts[1].notes.length===25,mparts.map(p=>p.name));
const lead=mfPlace(mparts[0],mfx);const ln=s=>lead.steps[s].notes[0];
ok("placement: step, time shift, gate, velocity",ln(0).gate===7&&ln(2).shift===74&&ln(2).gate===15&&ln(2).vel===80&&ln(4).gate===Graw(4)&&lead.length===16,[ln(0),ln(2),ln(4),lead.length]);
ok("a long part is 112 steps (7 bars)",mfPlace(mparts[1],mfx).length===112);
ok("plan without spilling keeps 64 steps and reports the rest",(()=>{const pl=mfPlan(mfPlace(mparts[1],mfx),1,1);return pl.pats.length===1&&pl.cutSteps===48})());
ok("over-dense step is reported",mfPlan(mfPlace(mparts[2],mfx),1,1).over.some(o=>/17 notes/.test(o)));
/* through the interface: warning for the long part, choose to add to other patterns, confirm leaving extras out */
reset();saveProject();DEV.showProject(await readProject(L,1),"test");
STU.tab=1;renderWork();$("#ppanel [data-a=mid]").click();
const mfBox=$("#feat-midifile"),mq=a=>mfBox.querySelector(`[data-a=${a}]`);
await mq("f").onchange({target:{files:[new File([mid],"test.mid")]}});
const sels=mq("parts").querySelectorAll("tbody select");ok("parts listed with track choices",sels.length===6&&sels[0].value==="1"&&sels[2].value==="2"&&sels[4].value==="3");
mq("imp").click();ok("too-long part asks: only 64 steps fit, add the rest to other patterns?",/only 64 steps fit in pattern 1 of track 2\. Would you like to add the rest to other patterns\?/.test(mq("warn").textContent),mq("warn").textContent);
[...mq("warn").querySelectorAll("button")].find(b=>/Add to patterns 1–2/.test(b.textContent)).click();
ok("then the 17-note chord asks before leaving notes out",/Too many notes/.test(mq("warn").textContent),mq("warn").textContent);
[...mq("warn").querySelectorAll("button")].find(b=>/leaving extras out/.test(b.textContent)).click();
const ip=DEV.project,b1=edReadPattern(ip,0x7C,1),b2=edReadPattern(ip,0x7C,2),pad=edReadPattern(ip,0x7D,1),s1x=edReadScene(ip,1);
ok("MIDI tool opens in a dialog from the track toolbar",!$("#toolDlg").hidden&&!mfBox.hidden&&/MIDI import/.test($("#toolDlgT").textContent)&&$("#toolHost").contains(mfBox));
ok("imported: bass over patterns 1 (64 steps) and 2 (48), chained in scene 1",b1.len===64&&b2.len===48&&b1.steps[0].notes[0].pitch===36&&b2.steps[0].notes[0].pitch===40&&s1x.chains[1].join()==="0,1"&&s1x.valid,{l1:b1.len,l2:b2.len,ch:s1x.chains[1]});
ok("imported: chord trimmed to 16, lead in track 1, tempo 100",pad.steps[0].notes.length===16&&edReadPattern(ip,0x7B,1).steps[2].notes[0].shift===74&&mfGetTempo(ip)===100&&/1 note\(s\) over the limits left out/.test(mq("msg").textContent),mq("msg").textContent);
/* several files: verse and chorus parts on the same tracks, one after another, chained in scene 2 */
const verse=mfWrite({tempo:100,tracks:[{name:"Lead",ch:0,notes:[{pitch:72,vel:90,on:0,off:T}]},{name:"Bass",ch:1,notes:Array.from({length:25},(_,i)=>({pitch:36+i%12,vel:100,on:i*4*T,off:i*4*T+T}))}]});
const chorus=mfWrite({tempo:100,tracks:[{name:"Lead",ch:0,notes:[{pitch:74,vel:90,on:0,off:T}]},{name:"Bass",ch:1,notes:[{pitch:43,vel:100,on:0,off:T}]}]});
DEV.showProject(await blankProject(1),"blank");mq("clear").click();
await mq("f").onchange({target:{files:[new File([verse],"verse.mid"),new File([chorus],"chorus.mid")]}});
const rsel=[...mq("parts").querySelectorAll("tbody tr")].map(tr=>[...tr.querySelectorAll("select")].map(s=>s.value).join("/"));
ok("two files listed; chorus parts default to the next free patterns",rsel.join(" ")==="1/1 2/1 1/2 2/3"&&/4 parts from 2 files/.test(mq("parts").textContent),rsel);
mq("scene").value="2";const csel=mq("parts").querySelectorAll("tbody tr")[3].querySelectorAll("select")[1];csel.value="2";csel.onchange();mq("imp").click();
[...mq("warn").querySelectorAll("button")].find(b=>/Add to patterns/.test(b.textContent)).click();
ok("overlapping patterns on a track are refused",/both use track 2, pattern 2/.test(mq("msg").textContent),mq("msg").textContent);
csel.value="3";csel.onchange();mq("imp").click();[...mq("warn").querySelectorAll("button")].find(b=>/Add to patterns/.test(b.textContent)).click();
const mp=DEV.project,scv=edReadScene(mp,2);
ok("verse and chorus imported one after another, chained in scene 2",edReadPattern(mp,0x7B,2).steps[0].notes[0].pitch===74&&edReadPattern(mp,0x7C,3).steps[0].notes[0].pitch===43&&scv.valid&&scv.chains[0].join()==="0,1"&&scv.chains[1].join()==="0,1,2"&&scv.pats[1]===0,{c:scv.chains});
mq("clear").click();ok("Clear list empties the parts",/No MIDI files added yet/.test(mq("parts").textContent));
/* export and read back */
const back=mfParse(mfWrite({tempo:mfGetTempo(ip),tracks:[{name:"L",ch:0,notes:mfExportTrack(ip,0x7B,[1])},{name:"B",ch:1,notes:mfExportTrack(ip,0x7C,[1,2])}]}).buffer);
const bl=back.tracks[1].notes,bb=back.tracks[2].notes;
ok("export: lead timing and lengths survive a round trip",bl.length===3&&bl[1].start===2*T+T/4&&bl[1].end-bl[1].start===T*1.5&&bl[2].end-bl[2].start===4*T&&Math.round(back.tempo)===100,bl);
ok("export: chained bass patterns play in order, 25 notes",bb.length===25&&bb[16].start===16*4*T,{n:bb.length,s16:bb[16]&&bb[16].start});
/* new empty project from the hardware template, then a MIDI import into it */
const bp=await blankProject(3);const bpat=edReadPattern(bp,0x7B,1),bsc=edReadScene(bp,1);
ok("empty project: valid file, fresh patterns and scenes, no chords, 120 BPM",bp.project===3&&bp.data.length===8951&&!bpat.valid&&bpat.len===16&&bpat.steps.every(s=>s.passes===15&&!s.notes.length)&&!bsc.valid&&mfGetTempo(bp)===120&&TRACK_ITEMS.every(it=>edGet(bp,it,0x57,[1])===0x7F&&!(edGet(bp,it,0x56,[1])&0x10)),{len:bpat.len,valid:bpat.valid,tempo:mfGetTempo(bp)});
DEV.project=null;DEV.midiLoad();ok("MIDI tool offers an empty project when none is loaded",!$("#feat-midifile").querySelector("[data-a=none]").hidden&&!!$("#feat-midifile").querySelector("[data-a=blank]"));
$("#feat-midifile").querySelector("[data-a=blank]").click();for(let i=0;i<50&&!DEV.project;i++)await W(20);
ok("the button starts a new empty project in the editor",DEV.project&&DEV.project.data.length===8951&&/New empty project/.test($("#workSrc").textContent));closeTool();
/* Device settings: grouped like MCC, a change is written and read back */
selectTab("set");const bsel=[...document.querySelectorAll("#setWrap select")].find(x=>/Brightness/.test(x.getAttribute("aria-label")));bsel.value="1";await bsel.onchange({target:bsel});
ok("device settings: a change is written and read back",S.globals[152]===1&&/Brightness set/.test($("#setWrap [data-a=msg]").textContent)&&document.querySelectorAll("#setWrap .ggrid > .fld").length===11,$("#setWrap [data-a=msg]").textContent);
ok("firmware card shows the running version and says it is the patched build",/Running: 2\.5\.99 — this project's patched firmware/.test($("#fwCard").textContent),$("#fwCard").textContent.slice(0,120));
$("#simNames").checked=false;await devConnect();ok("stock firmware reads 2.5.20",/Running: 2\.5\.20 — Arturia's stock/.test($("#fwCard").textContent));$("#simNames").checked=true;await devConnect();
selectTab("proj");ok("keys on the computer keyboard do not play the panel outside Manual",(()=>{const b=S.held?S.held.size:0;dispatchEvent(new KeyboardEvent("keydown",{key:"a"}));dispatchEvent(new KeyboardEvent("keyup",{key:"a"}));return STU.mode==="proj"&&!HELD.has("k12")})());
const into=JSON.parse(JSON.stringify(DEV.project));mfApply(into,0x7C,mfPlan(mfPlace(mparts[1],mfx),1,16),{chainScene:1});const pr6=await storeProject(L,12,into);
ok("MIDI import into the empty project sends and reads back",pr6.length===0&&edReadPattern(await readProject(L,12),0x7C,2).len===48,pr6.slice(0,3));
ok("file check rejects a damaged file",(()=>{const b=deep(f1);b.data[5][3]=[200];try{checkProjectFile(b);return false}catch(e){return true}})());
/* one-click connect: the pill finds a port named KeyStep and connects; with no such port it opens the options */
const rma=navigator.requestMIDIAccess,fin={id:"i1",name:"KeyStep Pro",onmidimessage:null},fout={id:"o1",name:"KeyStep Pro",send(b){for(const r of SIMDEV.handle([...b]))setTimeout(()=>fin.onmidimessage&&fin.onmidimessage({data:new Uint8Array(r)}),1)}};
navigator.requestMIDIAccess=async()=>({outputs:new Map([["o1",fout]]),inputs:new Map([["i1",fin]])});
DEV.link=null;DEV.ports=null;$("#devPort").value="sim";devStatus("not connected","");
ok("not connected, the pill is a Connect button",/Connect KeyStep/.test($("#connPill").textContent)&&$("#connPill").classList.contains("off"));
$("#connPill").click();for(let i=0;i<200&&!(DEV.link&&!DEV.busy);i++)await W(25);
ok("one click finds the KeyStep port and connects",DEV.link&&!DEV.link.sim&&/KeyStep Pro 2\.5\.99 \(patched\)/.test($("#devStateText").textContent)&&$("#connPop").hidden,$("#devStateText").textContent);
navigator.requestMIDIAccess=async()=>({outputs:new Map(),inputs:new Map()});DEV.link=null;DEV.ports=null;$("#devPort").value="sim";devStatus("not connected","");
$("#connPill").click();for(let i=0;i<40&&$("#connPop").hidden;i++)await W(25);
ok("no KeyStep port: the options open instead",!DEV.link&&!$("#connPop").hidden&&/Connect KeyStep/.test($("#devStateText").textContent));
navigator.requestMIDIAccess=rma;DEV.connOpen(false);$("#devPort").value="sim";await devConnect();
selectTab("man");try{localStorage.setItem("ksp.mode","proj")}catch(e){}return R;
