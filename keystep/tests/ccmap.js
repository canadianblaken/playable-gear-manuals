// Synth CC mapper: catalog conversion, filtering, suggestions, channel encoding, ranges, persistence, import/export, isolation.
const W=ms=>new Promise(r=>setTimeout(r,ms));const tap=id=>{down(id);up(id)};const R={};
const ok=(name,c,info)=>{R[name]=c?"ok":"FAIL "+JSON.stringify(info)};
try{localStorage.removeItem(CCMAP_KEY);localStorage.removeItem(CCMAP_DRAFT)}catch(e){}
/* nothing in the mapper may reach the device link or ask for MIDI access */
let touched=[];const realLink=Object.getOwnPropertyDescriptor(DEV,"link");
Object.defineProperty(DEV,"link",{get(){touched.push("DEV.link");return null},set(){touched.push("DEV.link=")},configurable:true});
const realRMA=navigator.requestMIDIAccess;navigator.requestMIDIAccess=()=>{touched.push("requestMIDIAccess");return Promise.reject(new Error("blocked"))};
/* catalog */
const C=await loadCatalog();const dev=id=>C.byId.get(id);
ok("catalog: 447 devices, row counts match the importer",C.devices.length===447&&Object.entries(MIDIGUIDE_META.counts).every(([k,n])=>C.devices.reduce((s,d)=>s+d.params.filter(p=>p.kind===k).length,0)===n),MIDIGUIDE_META.counts);
const xd=dev("KORG/minilogue xd"),eg=xd&&xd.cc.find(p=>p.name==="EG target");
ok("conversion keeps CC, range, section and value meanings",eg&&eg.cc===23&&eg.min===0&&eg.max===127&&eg.section==="EG"&&eg.usage==="0-42: Cutoff; 43-85: Pitch2; 86-127: Pitch",eg);
ok("only single 7-bit CCs (0-119, no LSB) are offered",C.devices.every(d=>d.cc.every(p=>p.kind==="cc"&&Number.isInteger(p.cc)&&p.cc<=119&&p.lsb===null)));
const s37=dev("Moog/Subsequent 37"),cut=s37.params.find(p=>p.name==="Filter cutoff");
ok("14-bit pair is listed as unsupported, not offered as CC 19",cut.kind==="cc14"&&cut.cc===19&&cut.lsb===51&&!s37.cc.includes(cut)&&/14-bit CC pair, CC 19 \+ LSB 51/.test(unsupportedText(cut)),unsupportedText(cut));
const one=dev("Moog/One");ok("NRPN-only synth has no knob parameters",one.cc.length===0&&one.unsupported.length>0&&one.unsupported.every(p=>p.kind==="nrpn"),{cc:one.cc.length});
ok("channel mode CCs 120-127 are not offered",C.devices.some(d=>d.unsupported.some(p=>p.kind==="mode"))&&C.devices.every(d=>d.cc.every(p=>p.cc<120)));
/* suggestions come from each synth's own rows */
const mf=suggestKnobs(dev("Arturia/MicroFreak")),mn=suggestKnobs(dev("Arturia/MiniFreak"));
ok("MicroFreak suggestions: cutoff CC 23, resonance CC 83",mf[0]&&mf[0].cc===23&&mf[1]&&mf[1].cc===83&&mf[0].suggested,mf);
ok("MiniFreak suggestions differ: cutoff CC 74, resonance CC 71",mn[0]&&mn[0].cc===74&&mn[1]&&mn[1].cc===71,mn);
ok("every suggestion is a real single-CC row of that synth",C.devices.every(d=>suggestKnobs(d).every(k=>!k||d.cc.some(p=>p.cc===k.cc&&p.name===k.label))));
ok("no suggestions for a synth with no knob parameters",suggestKnobs(one).every(k=>k===null));
/* mapping -> globals 28-57, channel encoding */
const map={name:"Test",device:"Arturia/MicroFreak",channel:9,port:3,knobs:[{cc:23,min:20,max:40,label:"Cutoff",section:"Filter"},{cc:83,min:0,max:127,label:"Resonance"},null,null,null]};
ok("mapping globals: CC 28, port 33, channel 38, min 48, max 53",JSON.stringify(mappingGlobals(checkMapping(map)))==='{"28":23,"29":83,"33":3,"34":3,"38":9,"39":9,"48":20,"49":0,"53":40,"54":127}',mappingGlobals(map));
$("#resetBtn").onclick();const before31=S.globals[31];applyMappingToSim(map);
ok("apply sets the simulation; unassigned knobs keep their settings",S.globals[28]===23&&S.globals[38]===9&&S.globals[31]===before31&&knobLabel(0)==="Cutoff"&&knobLabel(2)===null);
ok("channel 10 shows as 10, encoded 9",channelText(9)==="10"&&knobChannel(0)===9);
applyMappingToSim({...map,channel:GLOBAL_CH});S.globals[80]=4;ok("Global channel = 127, sends on ID 80's channel",S.globals[38]===127&&knobChannel(0)===4&&channelText(127)==="Global (now 5)");
/* ranges: live knob moves and recorded automation use the same scaling */
const sent=[];MOUT={send:b=>sent.push([...b])};applyMappingToSim(map);
tap("control");S.cc[0]=0;turnEnc(0,127);ok("live move: position 127 sends Max (40)",sent.at(-1).join()==="185,23,40"&&S.cc[0]===127,sent.at(-1));
turnEnc(0,-127);ok("live move: position 0 sends Min (20)",sent.at(-1)[2]===20,sent.at(-1));
ok("display shows the parameter name and the sent value",/Cutoff\nCC23 20/.test(S.msg||""),S.msg);
const cp=proj().ctrl.pats[proj().ctrl.cur];cp.st[0].cc[0]=127;cp.st[0].cc[1]=64;const p4=P[4];p4.idx=0;S.playing=true;sent.length=0;playCtrlStep(cp,p4);S.playing=false;
ok("automation step 127 sends 40 too, step 64 on a 0-127 knob sends 64",sent.some(b=>b.join()==="185,23,40")&&sent.some(b=>b.join()==="185,83,64"),sent);
applyMappingToSim({...map,knobs:[{cc:23,min:100,max:10,label:"Cutoff"},null,null,null,null]});sent.length=0;S.cc[0]=0;turnEnc(0,0);ok("Min above Max reverses the knob",sent.at(-1)[2]===100,sent.at(-1));
applyMappingToSim({...map,port:1});sent.length=0;turnEnc(0,5);ok("port MIDI 1: the USB stand-in mirror sends nothing",sent.length===0,sent);
MOUT=null;tap("control");
/* validation, import/export, persistence */
const bad=[{...map,name:""},{...map,channel:16},{...map,port:4},{...map,knobs:[{cc:120,min:0,max:127,label:"x"},null,null,null,null]},{...map,knobs:[null]},{...map,knobs:[{cc:5,min:0,max:200,label:"x"},null,null,null,null]}];
ok("bad mappings are rejected",bad.every(m=>{try{checkMapping(m);return false}catch(e){return true}}));
ok("export/import round trip",JSON.stringify(importMaps(JSON.parse(JSON.stringify(exportMaps([checkMapping(map)])))))===JSON.stringify([checkMapping(map)]));
ok("import rejects other files",(()=>{try{importMaps({format:"x",version:1,maps:[]});return false}catch(e){return true}})());
/* the tab */
selectTab("cc");for(let i=0;i<100&&!$("#ccmList")?.options.length;i++)await W(50);
$("#ccmSearch").value="microfreak";$("#ccmSearch").oninput();ok("search filters the list",$("#ccmList").options.length===1&&$("#ccmList").options[0].value==="Arturia/MicroFreak",[...$("#ccmList").options].map(o=>o.value));
$("#ccmList").value="Arturia/MicroFreak";$("#ccmList").onchange();
ok("picking a synth fills suggested knobs",CCM.knobs[0]&&CCM.knobs[0].cc===23&&/Suggested/.test($("#ccmKnobs").textContent),CCM.knobs);
$("#ccmCh").value="1";$("#ccmCh").onchange();$("#ccmName").value='<img src=x onerror="window.__xss=1">';$("#ccmSave").onclick();
ok("saved mapping persists in local storage",loadSavedMaps().maps.some(m=>m.name.startsWith("<img")&&m.channel===1));
ok("user text is rendered as text",!document.querySelector("#paneCC img")&&!window.__xss&&[...$("#ccmSaved").options].some(o=>o.text.startsWith("<img")));
$("#ccmApply").onclick();ok("Apply to simulation from the tab",S.globals[28]===23&&S.globals[38]===1&&/Applied/.test($("#ccmStatus").textContent),$("#ccmStatus").textContent);
loadMapping(checkMapping({...map,device:"Nobody/Ghost synth"}));ok("missing catalog entry: loads with a note, keeps the CCs",/not in this catalog/.test($("#ccmStatus").textContent)&&CCM.knobs[0].cc===23,$("#ccmStatus").textContent);
loadMapping(checkMapping({...map,knobs:[{cc:23,min:0,max:127,label:"Old name"},null,null,null,null]}));ok("renamed parameter is flagged",/now called “Cutoff”/.test($("#ccmStatus").textContent),$("#ccmStatus").textContent);
$("#ccmSearch").value="";$("#ccmSearch").oninput();$("#ccmList").value="Moog/One";$("#ccmList").onchange();ok("no-compatible-parameter explanation",/None of this synth's documented parameters/.test($("#ccmDevice").textContent));
/* the 14-bit button: list only synths with pairs, offer the pairs' coarse halves, keep them marked */
const withPairs=C.devices.filter(d=>d.pairs.length).length;
$("#ccmSearch").value="";$("#ccmCoarse").click();
ok("14-bit button lists only synths with pairs",$("#ccmCoarse").getAttribute("aria-pressed")==="true"&&$("#ccmList").options.length===withPairs&&[...$("#ccmList").options].some(o=>o.value==="Moog/Subsequent 37")&&![...$("#ccmList").options].some(o=>o.value==="Arturia/MicroFreak"),{n:$("#ccmList").options.length,withPairs});
$("#ccmList").value="Moog/Subsequent 37";$("#ccmList").onchange();
ok("Sub 37 suggestion: coarse CC 19 for Filter cutoff, LSB recorded",CCM.knobs[0]&&CCM.knobs[0].cc===19&&CCM.knobs[0].coarse===true&&CCM.knobs[0].lsb===51&&CCM.knobs[0].label==="Filter cutoff",CCM.knobs[0]);
ok("coarse knob is marked in the menu and explained",/\(coarse, LSB 51\)/.test($("#ccmKnobs").textContent)&&/Coarse only: sends CC 19 without its LSB \(CC 51\)/.test($("#ccmKnobs").textContent));
ok("device box counts the pairs as offered",/14-bit pairs? offered as coarse CC/.test($("#ccmDevice").textContent),$("#ccmDevice").textContent);
$("#ccmApply").onclick();ok("coarse knob applies as a plain CC 19 setting",S.globals[28]===19);
const cm=checkMapping({...ccmDraft(),name:"Sub"});ok("coarse flag survives export/import",importMaps(JSON.parse(JSON.stringify(exportMaps([cm]))))[0].knobs[0].coarse===true);
ok("bad coarse flag rejected",(()=>{try{checkMapping({...cm,knobs:[{...cm.knobs[0],coarse:"yes"},null,null,null,null]});return false}catch(e){return true}})());
ok("button state is remembered",localStorage.getItem(CCMAP_COARSE)==="1");
$("#ccmCoarse").click();
ok("button off: all synths again, saved coarse knob stays selected, other pairs not offered",$("#ccmList").options.length===C.devices.length&&$("#ccmKnobs select").value!==""&&[...$("#ccmKnobs select").options].filter(o=>/\(coarse, LSB/.test(o.text)).length===1,{n:$("#ccmList").options.length});
ok("mapper never touched DEV.link or MIDI access",touched.length===0,touched);
Object.defineProperty(DEV,"link",realLink);navigator.requestMIDIAccess=realRMA;
try{localStorage.removeItem(CCMAP_KEY);localStorage.removeItem(CCMAP_DRAFT)}catch(e){}
selectTab("man");return R;
