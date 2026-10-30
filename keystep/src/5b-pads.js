/* ================= Step pads, as in KSCON firmware (~/kscon tools/pad_hooks.S) =================
   Drum + Seq (track 1 row): drum pads. Seq + Arp on track 2-4: chord pads for that track. Seq + Mute on any track: root chords.
   One mode at a time; the same combo turns it off. While a mode is on, the steps are pads: they sound while held, light the keys
   of the selected track, and record like keys when the sequencer records. Chord pads keep the chord held on the keys when a step is
   tapped (it moves with the octave buttons) (Erase + step forgets it, Shift + Exit undoes the last change); empty pads play the scale's chords. Root-chord keys only
   pick the root, silently. The device shows no message for these; the simulation does, so the mode is visible.
   Also simulated: note/chord names (build 7), step lights (build 8), mod strip lock (build 9), pads into the arp (build 10). */
const PADS={mode:0,root:null,down:new Map(),undo:null};
const PAD_CHORD_NOTES=5,PAD_U=0x40,PAD_D=0x20;
/* root chords, by step: scale degrees above the root (0 = root), +U one octave up, +D one octave down */
const ROOT_CHORDS=[[0,PAD_U],[0,1,4],[0,2,4],[0,3,4],[0,4,PAD_U],[0,2,4,5],[0,2,4,6],[PAD_U,2|PAD_U,4|PAD_U],[0,2,4,6,8],[0,2,4,8],[0,2,6,8,10],[2,4,PAD_U],[0,2,6,8,12],[4,PAD_U,2|PAD_U],[0,3,4,6],[PAD_D,2|PAD_D,4|PAD_D]];
const ROOT_CHORD_NAMES=["root + octave","sus2","triad","sus4","power","6th","7th","triad +8va","9th","add9","11th","1st inversion","13th","2nd inversion","7sus4","triad -8va"];
function resetPads(){padsReleaseAll();PADS.mode=0;PADS.root=null;PADS.undo=null}
const padTrack=()=>PADS.mode>=5?PADS.mode-5:PADS.mode>=2?PADS.mode-1:0;
const padLow=t=>48+12*trk(t).oct;                      // lowest key shown for track t
/* the track's scale as a mask from its root; Chromatic (and drum mode) count as major */
function padScale(t){let m=isDrum(t)?0:scaleMask(t);if(!m||m===0xFFF)m=SCALES[1][1];return {mask:m,root:isDrum(t)?0:curPat(t).root}}
const inScale=(sc,p)=>sc.mask>>(((p-sc.root)%12+12)%12)&1;
function padsSet(mode){padsReleaseAll();PADS.mode=PADS.mode===mode?0:mode;if(PADS.mode>=5)PADS.root=null;
 const t=padTrack();msg(!PADS.mode?"Step pads\nOFF":PADS.mode===1?"Drum pads\nON":PADS.mode<5?`Chord pads\nTrack ${t+1}`:`Root chords\nTrack ${t+1}`,1400);emit("pads:mode:"+PADS.mode);dirty()}
function padsReleaseAll(){for(const i of [...PADS.down.keys()])padRelease(i)}
/* chords kept by chord pads live with the project, like the device keeps them with Save Project */
function padChords(t){const pj=proj();pj.padChords=pj.padChords||{};return pj.padChords[t]=pj.padChords[t]||Array(16).fill(null)}
function scaleChord(t,pad){const sc=padScale(t),low=padLow(t),deg=[];let p=low+((sc.root-low)%12+12)%12;
 for(;deg.length<14&&p<128;p++)if(inScale(sc,p))deg.push(p);
 const k=pad<8?pad:pad-8,n=pad<8?3:4;return [...Array(n).keys()].map(i=>deg[k+2*i]).filter(x=>x!=null)}
function rootChord(t,pad){const sc=padScale(t),low=padLow(t);let r=PADS.root!=null?PADS.root:low+((sc.root-low)%12+12)%12;
 const deg=[r];for(let p=r+1;deg.length<13&&p<128;p++)if(inScale(sc,p))deg.push(p);
 const out=[];for(const c of ROOT_CHORDS[pad]){const d=c&0x1f;if(d>=deg.length)continue;const p=deg[d]+(c&PAD_U?12:0)-(c&PAD_D?12:0);if(p>=0&&p<=127)out.push(p)}
 /* move by whole octaves onto the 37 keys shown, as far as the chord fits */
 if(out.length){let lo=Math.min(...out),hi=Math.max(...out),s=0;const top=Math.min(low+36,127);
  while(hi>top&&lo-12>=low){lo-=12;hi-=12;s-=12}while(lo<low&&hi+12<=top){lo+=12;hi+=12;s+=12}return out.map(p=>p+s)}
 return out}
/* a step pressed while a mode is on */
function padPress(i){if(PADS.down.has(i))return;const m=PADS.mode,rec=S.rec==="rt"&&S.playing;
 if(m===1){const ch=S.globals[79];const e={drum:i,lit:[i],rec:null};PADS.down.set(i,e);if(ch>15){dirty();return}
  drum(i,100,now());midiDrum(i,100,now(),now()+.1);if(!S.menu&&!S.confirm)msg(`Drum ${i+1}\n${nm(S.globals[81]?S.globals[83+i]:S.globals[82]+i)}`,1000);if(rec&&isDrum())e.rec=padRecordDrum(i,100);emit("pads:press");dirty();return}
 const t=padTrack();let notes;
 if(m<5){const slots=padChords(t);
  if(held("erase")){PADS.undo={t,pad:i,prev:slots[i]};slots[i]=null;msg(`Pad ${i+1}\nforgotten`,900);PADS.down.set(i,{lit:[]});emit("pads:erase");dirty();return}
  if(S.cur===t&&S.keysDown.size){const keys=[...new Set([...S.keysDown.values()].map(kd=>kd.notes&&kd.notes[0]).filter(x=>x!=null))].sort((a,b)=>a-b).slice(0,PAD_CHORD_NOTES);
   if(keys.length){PADS.undo={t,pad:i,prev:slots[i]};slots[i]=keys.map(p=>p-12*trk(t).oct);msg(`Pad ${i+1}\n${keys.map(nm).join(" ")}`,1200);PADS.down.set(i,{lit:[]});emit("pads:capture");dirty();return}}
  /* a kept chord is stored as played at octave 0 and moves with the octave buttons */
  notes=slots[i]?slots[i].map(p=>p+12*trk(t).oct).filter(p=>p>=0&&p<=127):scaleChord(t,i)}
 else notes=rootChord(t,i);
 const show=()=>{if(m>=5)msg(`${i+1} ${ROOT_CHORD_NAMES[i]}\n${notes.map(nm).join(" ")}`,900);else nsShow(notes)};
 /* KSCON build 10: on a track in Arp mode the pad's notes go to its arpeggiator, as if held on the keys (Chord mode not applied) */
 if(t>0&&trk(t).mode==="arp"){const L=S.hold[t]?S.arpLatched[t]:S.arpHeld[t];
  if(S.hold[t]&&!S.keysDown.size&&![...PADS.down.values()].some(e=>e.arp&&e.t===t))L.length=0;
  for(const p of notes){if(L.length>=16)break;if(!L.some(x=>x.p===p))L.push({p,v:100})}
  PADS.down.set(i,{t,arp:notes,lit:notes});show();emit("pads:arp");emit("arp:note:"+t);dirty();return}
 const vs=notes.map(p=>liveOn(t,p,100));notes.forEach(p=>midiOn(t,p,100));
 const recs=rec&&S.cur===t&&!isDrum(t)?notes.map(p=>recordNote(t,p,100,now())):null;
 PADS.down.set(i,{t,notes,v:vs,lit:notes,rec:recs});show();emit("pads:press");dirty()}
function padRelease(i){const e=PADS.down.get(i);PADS.down.delete(i);if(!e)return;
 (e.v||[]).forEach(liveOff);if(e.arp&&!S.hold[e.t])S.arpHeld[e.t]=S.arpHeld[e.t].filter(x=>!e.arp.includes(x.p));if(e.notes)e.notes.forEach(p=>midiOff(e.t,p));
 if(e.rec&&e.rec.forEach){const pat=curPat(e.t),dur=stepDur(pat);e.rec.forEach(r=>{if(r)r.n.g=clamp((now()-r.time)/dur,.06,64)})}
 else if(e.rec&&e.rec.st){e.rec.st.g=clamp((now()-e.rec.time)/stepDur(curPat()),.06,64)}
 dirty()}
/* a drum hit recorded like a key in drum mode */
function padRecordDrum(k,vel){const pat=curPat(),last=S.playIdx&&S.playIdx[0];if(!last)return null;const dur=stepDur(pat),rel=(now()-last.time)/dur,kk=Math.round(rel),idx=((last.idx+kk)%pat.len+pat.len)%pat.len,st=pat.lanes[k].st[idx];
 Object.assign(st,{on:true,v:S.globals[fvId(0)]?S.drumDefs.v:vel,g:S.drumDefs.g,t:S.quant?0:clamp(Math.round((rel-kk)*100),-49,50),r:S.drumDefs.r});pat.valid=true;emit("recnote");return {st,time:now()}}
/* button hooks: true = taken */
function padDown(id){let m;
 if(id==="t0seq"&&held("t0alt")){HELD.get("t0alt").used=true;padsSet(1);return true}
 if((m=id.match(/^t([1-3])alt$/))&&held(`t${m[1]}seq`)){padsSet(+m[1]+1);return true}
 if((m=id.match(/^t([0-3])mute$/))&&held(`t${m[1]}seq`)){HELD.get(id).used=true;padsSet(5+(+m[1]));return true}
 if(id==="exit"&&held("shift")&&PADS.mode>=2&&PADS.mode<5&&PADS.undo){const u=PADS.undo,slots=padChords(u.t),cur=slots[u.pad];slots[u.pad]=u.prev;u.prev=cur;
  msg(`Pad ${u.pad+1}\n${slots[u.pad]?slots[u.pad].map(nm).join(" "):"scale chord"}`,1000);emit("pads:undo");dirty();return true}
 if(PADS.mode&&(m=id.match(/^s(\d+)$/))){HELD.delete(id);padPress(+m[1]);return true}
 return false}
function padUp(id){const m=id.match(/^s(\d+)$/);if(!m||!PADS.down.has(+m[1]))return false;padRelease(+m[1]);return true}
/* root chords: a key on that track picks the root and makes no sound */
function padKey(k){if(PADS.mode<5||S.cur!==PADS.mode-5||held("shift"))return false;PADS.root=q(S.cur,keyMidi(k));S.keysDown.set(k,{});msg(`Root\n${nm(PADS.root)}`,700);emit("pads:root");dirty();return true}
/* key lights for what the pads play, on the selected track (drum hits while track 1 shows drums) */
function padLights(kled,t,base,dr,col){for(const e of PADS.down.values()){if(e.drum!=null){if(dr&&e.drum<37)kled[e.drum]=col;continue}
  if(e.t!==t||dr)continue;for(const p of e.lit){const k=p-base;if(k>=0&&k<37)kled[k]=TCOL[t]}}}
/* note and chord names on the screen (KSCON build 7, note_show.c): one note "E3"; several: the chord name (root position first,
   else a slash chord over the lowest note; no known chord: the pitch classes) over the notes, cut at 16 characters */
const NS_SHAPES=[[0x091,""],[0x089,"m"],[0x081,"5"],[0x0A1,"sus4"],[0x085,"sus2"],[0x049,"dim"],[0x111,"aug"],[0x491,"7"],[0x891,"maj7"],[0x489,"m7"],
 [0x449,"m7b5"],[0x249,"dim7"],[0x889,"mMaj7"],[0x291,"6"],[0x289,"m6"],[0x4A1,"7sus4"],[0x095,"add9"],[0x08D,"madd9"],[0x495,"9"],[0x895,"maj9"],
 [0x48D,"m9"],[0x4B5,"11"],[0x4AD,"m11"],[0x695,"13"],[0x68D,"m13"],[0x411,"7"],[0x811,"maj7"],[0x409,"m7"],[0x415,"9"],[0x815,"maj9"],
 [0x40D,"m9"],[0x435,"11"],[0x42D,"m11"],[0x615,"13"],[0x60D,"m13"]];
const pcMask=ns=>ns.reduce((m,p)=>m|1<<(((p%12)+12)%12),0);
function nsChord(mask,bass){for(let k=0;k<12;k++){const r=(bass+k)%12;if(!(mask>>r&1))continue;const rel=((mask>>r)|(mask<<(12-r)))&0xFFF,s=NS_SHAPES.find(x=>x[0]===rel);
  if(s)return NN[r]+s[1]+(r!==bass?"/"+NN[bass]:"")}return null}
function nsText(notes){const ns=[...new Set(notes.filter(p=>p>=0&&p<=127))].slice(0,12).sort((a,b)=>a-b);if(!ns.length)return null;if(ns.length===1)return nm(ns[0]);
 const mask=pcMask(ns);let top=mask&(mask-1)?nsChord(mask,ns[0]%12):null;
 if(!top){top="";for(const pc of [...new Set(ns.map(p=>p%12))]){if(top.length+3>16)break;top+=(top?" ":"")+NN[pc]}}
 let line="";for(let i=0;i<ns.length;i++){if(line.length+(i?5:4)>16){line+="..";break}line+=(i?" ":"")+nm(ns[i])}
 return top+"\n"+line}
function nsShow(notes){if(S.menu||S.confirm)return;const tx=nsText(notes);if(tx){msg(tx,1000);emit("names")}}
/* step lights while a pad mode is on (KSCON build 8, ns_leds): held pad bright white, the chord pad matching the chord on its track's
   keys bright in the track colour, kept chord / drum / root-chord pads dim track colour, empty chord pads dim white */
function padStepLight(i){const m=PADS.mode,t=padTrack(),col=TCOL[t];if(PADS.down.has(i))return "#ffffff";
 if(m>=2&&m<5){const kept=padChords(t)[i];
  if(S.cur===t&&S.keysDown.size){const km=pcMask([...S.keysDown.values()].filter(kd=>kd.tt==null).flatMap(kd=>kd.notes||kd.arp||[]));
   const pm=pcMask(kept?kept:scaleChord(t,i));if(km&&km===pm)return col}
  if(!kept)return dim("#ffffff",.35)}
 return dim(col,.35)}
/* mod strip lock (KSCON build 9): Shift + touch the mod strip toggles it, once per Shift press; locked, the strip sends nothing */
function modStripLock(){const h=HELD.get("shift");if(!h)return S.modLock;h.used=true;
 if(!h.ml){h.ml=1;S.modLock=!S.modLock;msg(S.modLock?"Mod strip\nlocked":"Mod strip\nunlocked",1000);emit(S.modLock?"modlock:on":"modlock:off")}return true}
