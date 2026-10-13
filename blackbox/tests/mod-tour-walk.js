const sl=ms=>new Promise(r=>setTimeout(r,ms));ensureAC();
const tipT=r=>String(typeof r.tip==="function"?r.tip():r.tip||"").replace(/<[^>]+>/g,"");
const find=re=>{drawScreen();return R.find(r=>r.down&&re.test(tipT(r)))};
const touchAll=(re,ok)=>{drawScreen();for(const r of R.filter(r=>r.down&&re.test(tipT(r)))){for(let x=r.x+2;x<r.x+r.w;x+=10){r.down(x,r.y+r.h/2,{});drawScreen();if(ok())return}}};
const touch=(re,dx)=>{const r=find(re);if(!r)throw"no region "+re;const G={};r.down(dx!=null?r.x+dx:r.x+r.w/2,r.y+r.h/2,G);r.up&&r.up(r.x+r.w/2,r.y+r.h/2,G);drawScreen()};
const drag=(re,dy)=>{const r=find(re);if(!r)throw"no region "+re;const G={};r.down(r.x+r.w/2,r.y+r.h/2,G);for(let i=0;i<4;i++){G.dy=dy;G.dx=0;r.move(r.x+r.w/2,r.y+r.h/2,G)}r.up&&r.up(0,0,G);drawScreen()};
const res={};const ti=TOURS.map((t,i)=>i).filter(i=>TOURS[i][0].startsWith("Mod: "));
for(const i of ti){const name=TOURS[i][0];startTour(i);let fail=null;
 for(let k=0;k<TOURS[i][1].length&&!fail;k++){const[tg,txt,ev]=TOURS[i][1][k];const adv=()=>tour&&tour.k>k;
  const tries=async(fn,n=40)=>{for(let j=0;j<n&&!adv();j++){fn(j);drawScreen();await sl(5)}};
  try{
   if(ev==="scr:pads"){press(tg);release(tg);const m=txt.match(/Break 95|Pad Wash|Stab Cm7|Bass C2/);if(m)touch(new RegExp(m[0].split(" ")[0]))}
   else if(ev.startsWith("scr:")||ev==="play"||ev==="stop"||(ev==="mix:solo"&&tg==="mix")){await tries(()=>{press(tg);release(tg)},4)}
   else if(ev==="mix:solo")touch(/^Pad 9\b/);
   else if(ev==="keys:chord")turn("k2",1);
   else if(ev==="keys:note"){if(tg==="keys"&&S.scr!=="keys"){press("keys");release("keys")}const r=find(/^(Grid key|Piano key|Key |White key|Black key|C\d|Keyboard)/);r.down(r.x+r.w/2,r.y+r.h/2,{});r.up&&r.up(0,0,{})}
   else if(ev==="keys:scale"){if(!S.keys.grid){press("keys");release("keys")}touch(/^Scale/);drawScreen();R.find(r=>r.x===42&&r.y===59).down()}
   else if(ev==="event")touch(/^Event/);
   else if(ev==="knob*")turn(tg,1);
   else if(ev==="evt")await tries(()=>turn("k4",1));
   else if(ev==="roll:add"){const r=find(/^Piano roll/);for(let x=r.x+5;x<r.x+r.w&&!adv();x+=7)for(let y=r.y+5;y<r.y+r.h&&!adv();y+=9){r.down(x,y,{});r.up&&r.up(x,y,{})}}
   else if(ev.startsWith("tab:")){touchAll(/^Parameter pages/,()=>S.ptab===ev.slice(4))}
   else if(ev==="param:filter"||ev==="param:res")drag(new RegExp("^"+(ev==="param:filter"?"Filter":"Res")),10);
   else if(ev.startsWith("param:")){const key=ev.slice(6),ks=SCR.params.keys();for(let j=0;j<30&&ks[S.prow]!==key;j++)turn("k1",ks.indexOf(key)>S.prow?1:-1);if(!adv()){if(ks[S.prow]!==key)throw"row "+key;turn("k3",1)}}
   else if(ev==="pad"){if(S.scr==="pads")touch(/Kick|Bass|Pad 1\b|Snare/);else touch(/Trigger button/)}
   else if(ev==="knob:param")touch(/^Level/);
   else if(ev==="modsrc")await tries(()=>turn("k3",1));
   else if(ev==="modamt"){turn("k2",1);await tries(()=>turn("k4",-1),10);if(!adv())await tries(()=>turn("k3",-1),10)}
   else if(ev==="slice:sel")turn("k1",1);else if(ev==="slice:start")turn("k3",1);else if(ev==="slice:end")turn("k4",-1);else if(ev==="slice:zoom")turn("k2",1);
   else if(ev.startsWith("tool:")){const key=ev.slice(5),lab=TP.Main.find(r=>r[0]===key)[1];const idx=()=>SCR.tools.rows().findIndex(r=>r[0].startsWith(lab+(key==="compModel"?" ·mod":"")));for(let j=0;j<20&&idx()!==S.toolRow;j++)turn("k1",idx()>S.toolRow?1:-1);if(!adv())await tries(()=>turn("k3",1),3)}
   else if(ev==="fx:send"){touch(/^Pad 9\b/);turn(name.includes("Room")?"k2":"k1",1)}
   else if(ev==="fxsel")touch(name.includes("Room")?/^FX2: REVERB/:/^FX1: DELAY/);
   else if(ev==="fxparam:dtype")await tries(()=>touch(/^Type:/),3);else if(ev==="fxparam:rtype")await tries(()=>touch(/^Type:/),3);else if(ev==="fxparam:mfrz")touch(/^Freeze/);
   else if(ev.startsWith("fxparam:"))drag(new RegExp("^"+{wand:"Wand",mrnd:"Random",rsize:"Size"}[ev.slice(8)]),10);
   else throw"no action for "+ev;
  }catch(e){fail=`step ${k+1} (${ev}): ${e}`}
  await sl(30);if(!fail&&!adv())fail=`step ${k+1} (${ev}) did not advance; scr=${S.scr}`;if(fail&&!/advance/.test(fail))fail+=" | tips: "+[...new Set(R.filter(r=>r.down).map(r=>tipT(r).slice(0,20)))].join(" / ")}
 res[name]=fail||(tour&&tour.k>=TOURS[i][1].length?"Done":"?");tour=null;press("stop");release("stop")}
res.state={fx:S.fx.d.dtype+"/"+S.fx.r.rtype,comp:TOOLS.compModel,chord:S.keys.chord,mod:MOD()};
return res;
