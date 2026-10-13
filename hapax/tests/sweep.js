const errs=[];const tryit=(n,f)=>{try{f()}catch(e){errs.push(n+": "+e.message)}};
const views=["live","step","autom","pattern","mix","fx","lfo","assign","settings","algo","monitor","trk2","bpm","recset"];
for(const ty of TTYPES){const T=T_();setType(T,ty);for(const v of views){S.ui.mode=["live","step","autom","pattern","mix"].includes(v)?v:"step";S.ui.sub=["fx","lfo","assign","settings","algo","monitor"].includes(v)?v:null;S.ui.page=["trk2","bpm","recset"].includes(v)?v:null;
 for(let f=0;f<T.fx.length+2;f++){S.ui.fxSel=f;tryit(ty+"/"+v+"/fx"+f,()=>{slots(view());drawScreens();refreshPanel()})}}}
S.ui.page=null;S.ui.sub=null;
T_().fx.push(...FXLIST.map(fxNew));for(let f=0;f<T_().fx.length;f++){S.ui.fxSel=f;S.ui.sub="fx";tryit("fx "+f,()=>{slots("fx");drawScreens()})}
C.forEach(c=>tryit("tip "+c.id,()=>ctlText(c.id)));CHAP.forEach((c,i)=>tryit("chap "+i,()=>chapterShow(i)));
Object.keys(ALGODEF).forEach(a=>{S.ui.algo=a;tryit("algo "+a,()=>{setType(T_(),ALGODEF[a].where.includes("POLY")?"POLY":"DRUM");runAlgo(T_(),a,S.algoP[a],null)})});
return {errs,n:errs.length};
