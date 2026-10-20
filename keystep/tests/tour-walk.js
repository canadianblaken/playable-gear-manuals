// Performs every tour step's real action and checks the tour reaches Done.
const W=ms=>new Promise(r=>setTimeout(r,ms));const tap=id=>{down(id);up(id)};const res={};
const two=(a,b)=>{down(a);tap(b);up(a)};
const key=async(k,ms=40)=>{down("k"+k);await W(ms);up("k"+k)};
const A=[
 [()=>tap("t1trk"),()=>tap("t1seq"),()=>{down("rec");tap("play");up("rec")},async()=>{await W(300);await key(12,120)},()=>tap("rec"),()=>two("shift","s5"),()=>tap("stop")],
 [()=>tap("t2trk"),()=>tap("rec"),()=>key(12),()=>tap("tie"),()=>key(16),()=>{tap("rec");tap("play")}],
 [()=>{tap("stop");tap("t3trk")},()=>{down("s0");down("k12");down("k16");up("k12");up("k16")},()=>{turnEnc(1,1);up("s0")},()=>tap("s4"),()=>tap("play")],
 [()=>{tap("stop");tap("t1trk")},()=>tap("t1alt"),()=>tap("hold"),()=>key(12),()=>two("shift","k8"),()=>two("shift","k14"),()=>turnEnc(1,-1)],
 [async()=>{tap("t1alt");tap("hold");await key(12)},async()=>{tap("t2alt");tap("hold");await key(16)},()=>two("shift","k18"),()=>tap("t1mute")],
 [()=>{loadDemo("Quick tour");tap("play")},()=>{tap("t1trk");two("shift","k23")},()=>two("shift","k24"),async()=>{two("shift","k29");await key(2)}],
 [()=>{tap("stop");tap("t2trk")},async()=>{down("shift");down("tie");await key(16);await key(20);await key(23);up("tie");up("shift")},()=>key(16),()=>two("shift","k23"),()=>{down("shift");tap("tie");up("shift")}],
 [()=>tap("t0alt"),()=>key(0),()=>tap("s0"),()=>key(2),()=>tap("play")],
 [()=>{tap("stop");loadDemo("Quick tour");tap("t1trk")},()=>two("pattern","s1"),()=>{down("chain");tap("s0");tap("s0");tap("s1");up("chain")},()=>tap("play"),()=>tap("t1up")],
 [()=>{tap("stop");tap("s0")},()=>two("save","project"),()=>clickKnob("sel"),()=>{down("project");tap("shift");up("project");clickKnob("sel")}],
 [()=>{loadDemo("Quick tour");tap("play")},()=>{tap("t1trk");down("trans");down("k19");up("k19");up("trans")},()=>tap("trans"),()=>{down("trans");tap("t2trk");up("trans")},()=>two("shift","trans")],
 [()=>{tap("stop");tap("t3trk");tap("control")},()=>turnEnc(1,1),()=>{tap("stepedit");tap("s0");turnEnc(0,1)},()=>{tap("stepedit");tap("t3trk")}],
 [()=>{tap("t1trk");two("shift","t1trk")},()=>{for(let i=0;i<4;i++)turnKnob("sel",1);clickKnob("sel")},()=>{turnKnob("sel",1);clickKnob("sel")},async()=>{selectTab("dev");$("#devPort").value="sim";await devConnect();document.querySelector("[data-a=readall]").click();await W(1500)}],
 [()=>selectTab("dev"),async()=>{$("#devPort").value="sim";await devConnect()},async()=>{const f=$("#feat-names");f.querySelector("[data-a=p]").value="2";f.querySelector("[data-a=n]").value="Song Two";f.querySelector("[data-a=go]").click();await W(300)},
  async()=>{const f=$("#feat-trackkey");f.querySelector("[data-a=p]").value="2";f.querySelector("[data-a=go]").click();for(let i=0;i<100&&DEV.busy;i++)await W(100);await W(100)},()=>{selectTab("man");two("project","s1")}],
];
for(let i=0;i<TOURS.length;i++){const T=TOURS[i],acts=A[i];stop();$("#resetBtn").onclick();loadDemo("Quick tour");startTour(i);if(!acts){res[T.n]="NO ACTIONS";continue}
 for(let k=0;k<acts.length;k++){const before=tour.k;try{await acts[k]()}catch(e){res[T.n]=`step ${k+1} threw ${e.message}`;break}await W(80);if(tour.k===before){res[T.n]=`stuck at step ${k+1}: ${T.steps[k].s.slice(0,70)}`;break}}
 if(!res[T.n])res[T.n]=tour.k>=T.steps.length?"OK":"ended at "+tour.k;stop();for(const id of [...HELD.keys()])up(id)}
return res;
