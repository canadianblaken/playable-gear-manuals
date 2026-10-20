/* ================= reference data ================= */
const $=s=>document.querySelector(s);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const NN=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const nm=m=>NN[((m%12)+12)%12]+(Math.floor(m/12)-1); // middle C (60) = C4
const hz=m=>440*Math.pow(2,(m-69)/12);
const rnd=n=>Math.floor(Math.random()*n);
const deep=o=>JSON.parse(JSON.stringify(o));
const HOLDMS=450;
const TCOL=["#22b573","#f26b21","#f2c418","#e5175e"];      // track 1-4 default colours
const TNAME=["Track 1","Track 2","Track 3","Track 4"];

/* Scales: index = the pattern's scale value in firmware (masks at 0x0805CB60; bit n = n semitones above the root).
   7 is an unused slot; 8 and 9 are User 1 / User 2, read from the project. */
const SCALES=[["Chromatic",0xFFF],["Major",0xAB5],["Minor",0x5AD],["Dorian",0x6AD],["Mixolydian",0x6B5],["Harmonic minor",0x9AD],["Blues",0x4E9],["(unused)",0],["User 1",0xFFF],["User 2",0xFFF]];
const maskIv=m=>[...Array(12).keys()].filter(i=>m>>i&1);
/* Firmware note map (0800e3a8): in-scale notes map to themselves; an out-of-scale note snaps to the nearest
   in-scale note, checking DOWN before UP at each distance, so ties resolve down. */
function buildMap(mask,root){const m=new Int16Array(128);if(!mask){for(let n=0;n<128;n++)m[n]=n;return m}
 const inS=n=>(mask>>(((n-root)%12+12)%12))&1;
 for(let n=0;n<128;n++){if(inS(n)){m[n]=n;continue}let r=n;for(let d=1;d<12;d++){if(n-d>=0&&inS(n-d)){r=n-d;break}if(n+d<128&&inS(n+d)){r=n+d;break}}m[n]=r}
 return m}

const DIVS=[["1/4",96],["1/8",48],["1/16",24],["1/32",12]]; // ticks at 96 per quarter
const ARPS=["Up","Down","Exclu","Inclu","Rand","Order","Poly"];
const SEQDIRS=["Fwd","Rand","Walk"];

/* key shift functions above the keyboard (left to right, 37 keys; 36 = top C has none) */
const KEYFN=["Fwd","Rand","Walk","Mono","Poly","Up","Down","Exclu","Inclu","Rand","Order","Poly","-1","0","+1","+2","+3","1/4","1/8","1/16","1/32","Triplet","Chrom","Major","Minor","Dorian","Mixo","H.Min","Blues","Root","User 1","User 2","1","2","3","4",""];
const KEYGRP=[[0,2,"Seq Pattern"],[3,4,"Seq / Drum Mode"],[5,11,"Arp Pattern"],[12,16,"Arp Octave"],[17,21,"Time Division"],[22,31,"Scale"],[32,35,"CV Routing"]];
/* scale keys -> firmware scale value */
const KEYSCALE={22:0,23:1,24:2,25:3,26:4,27:5,28:6,30:8,31:9};
const STEPFN=["Clr Ptn","Clr Steps","‹Nudge","Nudge›","Invert","Semi Up","Semi Down","Oct Up","Oct Down","Qnt 50%","Qnt 100%","Rand Order","Rand Notes","Rand Oct","Global BPM","Wait Load"];

/* ---------- panel controls (coordinates from the MCC panel layout) ---------- */
const C=[];
const btn=(id,x,y,w,h,label,sec,kind="btn")=>C.push({id,t:kind,x,y,w,h,label,sec});
const knob=(id,cx,cy,r,label,sec,ring)=>C.push({id,t:"knob",cx,cy,r,label,sec,ring});
knob("tempo",99,223,18,"Tempo","Fine");btn("tap",135,207,32,32,"Tap\nTempo","Metronome");knob("swing",202,223,18,"Swing","Offset");
knob("sel",336,223,17,"","");
btn("shift",68,280,32,32,"Shift","");btn("rec",113,280,32,32,"●","Quant");btn("stop",158,280,32,32,"■","");btn("play",202,280,40,32,"▶❙❙","Restart");
btn("project",273,259,31,15,"Project","Utility");btn("exit",307,259,31,15,"Exit","Undo");
btn("copy",273,282,31,15,"Copy","");btn("paste",307,282,31,15,"Paste","");btn("save",273,298,31,15,"Save","");btn("erase",307,298,31,15,"Erase","");
btn("control",273,323,65,15,"Control","");
[362,439,516,592].forEach((x,t)=>{btn(`t${t}dn`,x,259,30,15,"←","");btn(`t${t}up`,x+35,259,30,15,"→","");
 btn(`t${t}seq`,x,275,30,15,"Seq","");btn(`t${t}alt`,x+35,275,30,15,t?"Arp":"Drum","");btn(`t${t}mute`,x+35,298,30,15,"Mute","");btn(`t${t}trk`,x,323,65,14,TNAME[t],"")});
btn("scene",678,193,34,15,"Scene","");btn("chain",678,216,34,15,"Chain","");btn("pattern",678,238,34,15,"Pattern","");
const ENCN=["Pitch","Gate","Velocity","Time Shift","Randomness"];
[754,822,890,958,1026].forEach((cx,i)=>knob("enc"+i,cx,223,18,ENCN[i],"",1));
btn("lst",1079,216,30,14,"Lst Step","Follow");["16","32","48","64"].forEach((l,i)=>btn("pg"+i,[1115,1147,1180,1212][i],216,30,14,l,""));
btn("stepedit",670,289,34,15,"Step Edit","");
for(let i=0;i<16;i++)btn("s"+i,707+34*i,280,26,32,String(i+1),STEPFN[i],"step");
btn("octdn",79,375,34,14,"←","");btn("octup",125,375,34,14,"→","");
btn("hold",191,405,30,14,"Hold","Clear");btn("trans",191,442,30,14,"Trans","Clear");btn("tie",191,478,30,14,"Tie/Rest","Chord");btn("overdub",191,515,30,14,"Overdub","");
C.push({id:"pbend",t:"strip",x:62,y:405,w:55,h:127},{id:"modw",t:"strip",x:120,y:405,w:55,h:127},{id:"looper",t:"looper",x:62,y:542,w:165,h:26});
const KX0=255,KX1=1258,WW=(KX1-KX0)/22,KY=382,KH=206;
const BLK=[1,3,6,8,10];
{let wi=0;for(let k=0;k<37;k++){const pc=k%12;if(BLK.includes(pc)){C.push({id:"k"+k,t:"key",k,black:1,x:KX0+wi*WW-13,y:KY,w:26,h:122})}else{C.push({id:"k"+k,t:"key",k,black:0,x:KX0+wi*WW,y:KY,w:WW,h:KH});wi++}}}
const CI=Object.fromEntries(C.map(c=>[c.id,c]));
const keyX=k=>{const c=CI["k"+k];return c.x+c.w/2};

/* ---------- help text: [name, what it does, Shift function, manual section, firmware note] ---------- */
const INFO={
 tempo:["Tempo / Fine","Sets the tempo from 30 to 240 BPM, rounded to whole BPM.","Shift + turn: fine tempo in 0.01 BPM steps.","4.2.1, 7.1"],
 tap:["Tap Tempo / Metronome","Tap at least twice to set the tempo; after 4 taps it estimates, after 8 it averages. Hold Tap and press a Time Division key to set the metronome division.","Shift + Tap: metronome on/off.","4.2.1, 7.1.3"],
 swing:["Swing / Offset","Swing from 50% (straight) to 75%, for all tracks at once. Press or touch it to see the global and track values.","Shift + turn: swing offset for the selected track only.","4.2.1, 7.1.1"],
 sel:["Selection encoder","Turn to scroll menus and values on the OLED; push to enter a submenu or confirm. Confirming Save, Copy and Erase Project is a push of this encoder.","","4.2.5.1, 6.1.3","On hardware, pressing a step pad at the “Save Project / Confirm ?” screen does not confirm: it loads that project and the unsaved edits are gone. Push this encoder."],
 shift:["Shift","Gives access to the blue functions printed under buttons, under the steps and above the keys. While held, the LEDs above the keys show which key functions are active and the steps dim.","","4.2.4, 4.2.14"],
 rec:["Record / Quantize","Stopped: Step Record (each key press fills a step and advances). Hold Record and press Play: Real-time Record.","Shift + Rec: quantized recording on/off.","5.3.2"],
 stop:["Stop","Stops all sequencers and returns them to step 1. Press three times quickly to send All Notes Off.","","4.2.2"],
 play:["Play / Pause","Starts the sequencers; press again to pause and again to resume.","Shift + Play: restart from step 1.","4.2.2, 5.3.1.1"],
 project:["Project / Utility","Hold Project and press a step to load that project (1–16), or hold and turn the selection encoder. Save + Project saves, Copy + Project copies to the next slot, Erase + Project erases.","Shift + Project: the Utility menu. Hold Project and press Shift: recall the project from flash.","6.1, 9.1"],
 exit:["Exit / Undo","Leaves menus and cancels confirmations. Blinks when an undo is available.","Shift + Exit: undo the last paste, erase or recording.","4.2.5.2, 6.3.6"],
 copy:["Copy","Copy + step(s): copy steps. Copy + page button: copy a page. Copy + Pattern, then a step: copy a pattern. Copy + Scene, then a step: copy a scene. Copy + Project: copy the project to the next slot.","","5.3.7, 6.3.3"],
 paste:["Paste","Paste + step: paste the copied steps from that step. Paste + page: paste a page. Paste + Pattern, then steps: paste a pattern.","","5.3.7, 6.3.3"],
 save:["Save","Hold Save: unsaved patterns of this track show red, saved ones blue. Save + step: save that pattern. Save + Track button: save all patterns of the track. Save + Scene + step: save a scene. Save + Project: save the whole project (confirm with the encoder).","Shift + Save: reload the current pattern from memory (“Pattern Reloaded”).","5.3.9, 6.1.3, 6.3.2"],
 erase:["Erase","Erase + step: erase steps. Erase + page: erase a page. Erase + Pattern, then steps: erase patterns. Erase + Scene, then a step. Erase + Project: erase the project (confirm). Erase + Trans: delete the transpose group.","","5.3.7, 6.3.5"],
 control:["Control","Control mode: the five main encoders send MIDI CC instead of editing steps, and the selected track's patterns can record and play CC automation. Press the blinking track button to leave.","","8"],
 scene:["Scene","Hold Scene and press a step to load a scene: the pattern, chain and mute state of every track. Save + Scene + step stores one.","","6.5.2"],
 chain:["Chain","Hold Chain and press steps in order to build a chain of up to 16 patterns for the selected track. Leave the chain with the track arrows.","","6.5.1"],
 pattern:["Pattern","Hold Pattern and press a step to choose one of the 16 patterns of the selected track.","","6.3.1"],
 lst:["Lst Step / Follow","Hold Lst Step and press a step to set the pattern length, or a page button (16/32/48/64) to set it in whole pages.","Shift + Lst Step: follow the playing page.","4.2.15, 5.3.1.2"],
 pg0:["Page 16","Shows steps 1–16. Hold a step and press page buttons to skip that step on those pages.","Shift + page: extend the pattern by copying page 1 to it.","4.2.15, 6.5.4"],
 stepedit:["Step Edit","Step Edit mode: press a step to select it (it blinks), play keys to replace its notes and use the encoders to edit it. When stopped, pressing a step also plays it (step listen).","","5.3.3.1"],
 enc0:["Pitch encoder","Step Edit / holding a step: moves the step's notes up or down along the current scale. In Control mode: sends Knob 1 CC.","Shift + turn: offset all steps of the pattern.","4.2.10.1"],
 enc1:["Gate encoder","Gate length from 0.06 to 64 steps (default 0.5). No step held: sets the track default for new notes. Arp mode: gate of the whole arpeggio.","Shift + turn: offset all steps.","4.2.10.2, 5.3.5.1"],
 enc2:["Velocity encoder","Velocity 0–127 (default 100). Arp mode: bipolar offset added to the played velocity. With Fixed Velocity ON for the track, new notes use this value.","Shift + turn: offset all steps.","4.2.10.3"],
 enc3:["Time Shift encoder","Moves notes from −49% to +50% of a step. Arp mode: shifts the whole held arpeggio in time.","Shift + turn: offset all steps.","4.2.10.4"],
 enc4:["Randomness encoder","Probability that a note plays, 0–100%. Arp mode: inserts random notes.","Shift + turn: offset all steps.","4.2.10.5"],
 octdn:["Octave −","Keyboard octave down (to −3). Press both octave buttons to reset.","","4.2.11.2"],
 octup:["Octave +","Keyboard octave up (to +2). Press both octave buttons to reset.","","4.2.11.2"],
 hold:["Hold / Clear","Arpeggio keeps playing after you lift your fingers; while one key is down you can add notes (up to 16). In chord mode it acts as a sustain pedal.","Shift + Hold: release all held arpeggios.","4.2.11.3, 5.2.2"],
 trans:["Trans / Clear","Hold Trans and press a key: transpose the selected track's sequence or arpeggio (middle C = no transposition). Press Trans to toggle the transposition off and on. While holding Trans, press other track buttons to build a transpose group. With Utility > Misc > Transpose Latch ON, Trans latches.","Shift + Trans: clear all transpositions.","4.2.11.4, 4.2.14.1"],
 tie:["Tie / Rest / Chord","Step Record: enter a rest or extend the last notes. Real-time record: hold to erase the steps you pass. Step Edit: clear the selected step.","Shift + Tie: chord mode. Hold Shift + Tie and play notes to store a chord; then each key plays that chord. Shift + Tie again turns chord mode off.","4.2.11.5, 5.5.2","Each chord note is snapped through the track's scale on its own (ties snap down), so one stored shape turns diatonic: in E major an E-G#-B shape plays F#m on F#, G#m on G# and D#dim on D#. The chord shape and chord-mode state are part of the track block written by Save Project, so they survive a power cycle (the manual says they don't)."],
 overdub:["Overdub","ON: notes you record are added to the step. OFF: they replace it. With a step held, pressing keys of its chord selects those notes for editing.","","4.2.11.6, 5.3.4"],
 pbend:["Pitch strip","Pitch bend, springs back to the centre. Range 2 semitones by default.","","4.2.11.1"],
 modw:["Mod strip","Mod wheel (CC 1). Holds its value, remembered per track.","","4.2.11.1"],
 looper:["Looper touch strip","Touch during playback to loop all tracks from that moment: 1/4 (left, longest) to 1/32 (right, shortest). Release to continue.","Shift + strip: disable / enable the strip.","4.2.12"],
 key:["Keyboard","37 velocity-sensitive keys. Plays the selected track; with Shift, the blue functions printed above each key.","","4.2.13"],
 step:["Step button","Quick Edit: toggle the step, or hold it and play keys to fill it. Step Edit: select the step. Hold Pattern/Scene/Project/Chain and press a step to choose that item.","","4.2.9"],
 trk:["Track button","Selects the track: keyboard, encoders and steps now act on it. Hold two track buttons and press a key to make a split.","Shift + Track: Track Settings (MIDI channels, Program Change, Fixed Velocity).","4.2.6.1, 1.3.1"],
 seq:["Seq","Sequencer mode for this track.","","4.2.6.4"],
 arp:["Arp","Arpeggiator mode (tracks 2–4).","","4.2.6.6, 5.2"],
 drum:["Drum","Drum sequencer on track 1: 24 lanes on the lowest 24 keys, lowest 8 also on the Drum Gate outputs.","Shift + Drum: unmute all drum lanes.","4.2.6.7, 5.4"],
 mute:["Mute","Mutes the track's sequencer/arpeggio (the keyboard still plays it).","Shift + Mute: solo (exclusive).","4.2.6.2, 6.2.3"],
 dn:["Previous pattern","Selects the previous pattern of the track (and leaves a chain).","","6.3.1"],
 up:["Next pattern","Selects the next pattern of the track (and leaves a chain).","","6.3.1"],
};
const infoFor=id=>{if(INFO[id])return INFO[id];if(/^k\d+$/.test(id))return INFO.key;if(/^s\d+$/.test(id))return INFO.step;
 if(/^pg\d$/.test(id))return [`Page ${["16","32","48","64"][+id[2]]}`,...INFO.pg0.slice(1)];
 const m=id.match(/^t(\d)(dn|up|seq|alt|mute|trk)$/);if(m){const k=m[2]==="alt"?(m[1]==="0"?"drum":"arp"):m[2];const i=INFO[k];return [`${TNAME[m[1]]} ${i[0]}`,...i.slice(1)]}return null};

/* ---------- chapters ---------- */
const CHAPTERS=[
 ["1.3","What's new in 2.5: Track Settings, Program Change, Transpose Latch, Fixed Velocity","trackSettings"],
 ["3.2","Record and play a sequence","recordBasics"],
 ["3.3","Using the arpeggiator","arpBasics"],
 ["3.4","Scales and chords","scaleBasics"],
 ["4.2.1","Tempo, tap tempo, swing","tempo"],
 ["4.2.10","The five main encoders and track defaults","encoders"],
 ["4.2.12","The looper touch strip","looper"],
 ["4.2.14","Shift functions (keys and steps)","shiftFns"],
 ["5.2","The three arpeggiators","arpBasics"],
 ["5.3.1","Sequence length, pages, mono/poly, directions","seqLength"],
 ["5.3.2","Recording: quick, step and real-time","recordBasics"],
 ["5.3.3","Step Edit and Quick Edit","stepEdit"],
 ["5.3.7","Copy, paste and erase steps and pages","copyPaste"],
 ["5.3.9","Saving patterns","saving"],
 ["5.4","The drum sequencer","drum"],
 ["5.5.1","Scales, roots and user scales","scaleBasics"],
 ["5.5.2","Chord mode","chordMode"],
 ["6.1","Projects: load, save, copy, erase, recall","projects"],
 ["6.2","Tracks: mute, solo, splits","tracks"],
 ["6.3","Patterns","patterns"],
 ["6.5","Arranging: chains, scenes, wait to load, step skip","arranging"],
 ["8","Control mode","controlMode"],
 ["9.1","The Utility menu","utility"],
 ["Device","Device tools: talk to a real KeyStep Pro","deviceTools"],
];

/* ---------- guided tours: each step waits for an emitted event (string or RegExp) ---------- */
const TOURS=[
 {n:"First sequence (real-time recording)",steps:[
  {s:"Select Track 2.",t:"t1trk",ev:"track:1"},
  {s:"Make sure it is in Seq mode.",t:"t1seq",ev:/^mode:1:seq|^track:1/},
  {s:"Hold Record (right-click to latch it) and press Play: real-time recording starts.",t:"rec",ev:"rec:rt"},
  {s:"Play a few notes on the keyboard (mouse or A S D F… keys). They are added to the loop.",t:"k12",ev:/^recnote/},
  {s:"Press Record again to stop recording; the pattern keeps playing.",t:"rec",ev:"rec:off"},
  {s:"Hold Shift and press step 6 (Semi Up) to transpose the pattern a semitone.",t:"s5",ev:"shiftfn:Semi Up"},
  {s:"Press Stop. Done: that is the basic recording loop.",t:"stop",ev:"stop"}]},
 {n:"Step recording",steps:[
  {s:"Select Track 3 and Seq.",t:"t2trk",ev:"track:2"},
  {s:"With the sequencer stopped, press Record: Step Record mode.",t:"rec",ev:"rec:step"},
  {s:"Play a note: it fills step 1 and the cursor moves on.",t:"k12",ev:"steprec:note"},
  {s:"Press Tie/Rest to leave a rest.",t:"tie",ev:"steprec:rest"},
  {s:"Play two or three more notes.",t:"k16",ev:"steprec:note"},
  {s:"Press Record to leave Step Record, then Play.",t:"play",ev:"play"}]},
 {n:"Quick edit: hold a step, play a chord",steps:[
  {s:"Select Track 4.",t:"t3trk",ev:"track:3"},
  {s:"Hold step 1 (right-click latches it) and play a chord: all notes go into the step with the current encoder values.",t:"s0",ev:"quick:fill"},
  {s:"Still holding the step, turn the Gate encoder: only that step changes.",t:"enc1",ev:"enc:enc1"},
  {s:"Release the step, then press steps 5, 9 and 13 to switch them on (an empty step gets the last note).",t:"s4",ev:/^step:on/},
  {s:"Press Play.",t:"play",ev:"play"}]},
 {n:"Arpeggiator with Hold",steps:[
  {s:"Select Track 2.",t:"t1trk",ev:"track:1"},
  {s:"Press Arp.",t:"t1alt",ev:"mode:1:arp"},
  {s:"Press Hold.",t:"hold",ev:"hold:on"},
  {s:"Play a chord. It keeps playing after you let go (the arp runs even when the sequencer is stopped).",t:"k12",ev:"arp:note"},
  {s:"Hold Shift and press the Inclu key (G# in the lower octave) to change the arp pattern.",t:"k8",ev:"arpmode:Inclu"},
  {s:"Hold Shift and press +1 (D in the middle octave) for a two-octave arp.",t:"k14",ev:"arpoct:1"},
  {s:"Turn the Gate encoder to shorten or lengthen the whole arpeggio.",t:"enc1",ev:"enc:enc1"}]},
 {n:"Three arpeggiators at once",steps:[
  {s:"Track 2 → Arp → Hold → play a chord.",t:"t1alt",ev:/arp:note:1/},
  {s:"Track 3 → Arp → Hold → play another chord.",t:"t2alt",ev:/arp:note:2/},
  {s:"On Track 3, hold Shift and press 1/8 (F# middle octave): it runs at half the speed of Track 2.",t:"k18",ev:/^div:2/},
  {s:"Mute Track 2 for a moment.",t:"t1mute",ev:"mute:1"}]},
 {n:"Scales and the root note",steps:[
  {s:"Load the “Quick tour” demo (or record a pattern on Track 2) and press Play.",t:"play",ev:"play"},
  {s:"Select Track 2. Hold Shift and press the Major key (B in the middle octave).",t:"k23",ev:"scale:1"},
  {s:"Notice the black keys now play scale notes too. Hold Shift and press Minor (top octave C).",t:"k24",ev:"scale:2"},
  {s:"Hold Shift and keep holding the Root key (F, top octave), then press a key in the lowest octave to change the root.",t:"k29",ev:/^root:/}]},
 {n:"Chord mode",steps:[
  {s:"Select Track 3 and stop everything.",t:"t2trk",ev:"track:2"},
  {s:"Hold Shift and Tie/Rest (right-click latches both) and play a chord, e.g. E G# B.",t:"tie",ev:"chord:stored"},
  {s:"Release Shift and Tie: Tie/Rest blinks, chord mode is on. Play any single key.",t:"k16",ev:"chord:play"},
  {s:"Hold Shift and press Major (B, middle octave): each chord note is now snapped into the scale, so the shape becomes diatonic.",t:"k23",ev:"scale:1"},
  {s:"Play other keys: the chord quality follows the scale. Shift + Tie/Rest turns chord mode off.",t:"tie",ev:"chord:off"}]},
 {n:"A drum pattern",steps:[
  {s:"Select Track 1 and press Drum.",t:"t0alt",ev:"mode:0:drum"},
  {s:"Press the lowest C to select drum lane 1 (kick).",t:"k0",ev:"drum:lane:0"},
  {s:"Press steps 1, 5, 9 and 13.",t:"s0",ev:/^drum:step/},
  {s:"Press D (lane 3, snare) and then steps 5 and 13.",t:"k2",ev:"drum:lane:2"},
  {s:"Press F# (lane 7, hat) and some off-beat steps, then Play.",t:"play",ev:"play"}]},
 {n:"Patterns and a chain",steps:[
  {s:"Load the “Quick tour” demo and select Track 2.",t:"t1trk",ev:"track:1"},
  {s:"Hold Pattern and press step 2: the second pattern of Track 2.",t:"pattern",ev:"pattern:1:1"},
  {s:"Now hold Chain and press steps 1, 1, 2: a chain of three patterns.",t:"chain",ev:"chain:set"},
  {s:"Press Play and watch the track display change pattern.",t:"play",ev:"play"},
  {s:"Press a track arrow to jump off the chain.",t:"t1up",ev:/^pattern:1/}]},
 {n:"Save a project (and confirm it properly)",steps:[
  {s:"Make an edit (for example, toggle step 1).",t:"s0",ev:/^step:/},
  {s:"Hold Save (right-click to latch) and press Project.",t:"project",ev:"save:project:ask"},
  {s:"The OLED asks “Save Project / Confirm ?”. Push the selection encoder (click it). Do not press a step pad: that would load a project instead.",t:"sel",ev:"save:project"},
  {s:"Saved. Change something, then hold Project, press Shift and push the encoder: the project is recalled from flash.",t:"project",ev:"recall"}]},
 {n:"Transpose, groups and latch",steps:[
  {s:"Load the “Quick tour” demo and press Play.",t:"play",ev:"play"},
  {s:"Select Track 2. Hold Trans (right-click latches it) and press the G above middle C: +7 semitones.",t:"trans",ev:/^trans:1:/},
  {s:"Press Trans: the transposition toggles off. Press again: back on.",t:"trans",ev:/^transtoggle/},
  {s:"Hold Trans and press the Track 3 button: Track 3 joins the transpose group (white).",t:"t2trk",ev:"transgroup"},
  {s:"Shift + Trans clears all transpositions.",t:"trans",ev:"trans:clear"}]},
 {n:"Control mode: CC automation",steps:[
  {s:"Select Track 4, then press Control. The track button blinks.",t:"control",ev:"control:on"},
  {s:"Turn the Gate encoder: it sends Knob 2's CC (see Utility > Controller).",t:"enc1",ev:"cc"},
  {s:"Press Step Edit, press step 1 and turn the Pitch encoder: that value is stored in step 1.",t:"stepedit",ev:"cc:step"},
  {s:"Press the blinking Track 4 button to leave Control mode.",t:"t3trk",ev:"control:off"}]},
 {n:"Hidden settings: Fixed Velocity",steps:[
  {s:"Select Track 2. Hold Shift and press the Track 2 button: Track Settings.",t:"t1trk",ev:"menu:Track Settings"},
  {s:"Turn the selection encoder to “Fixed Velocity” and push it.",t:"sel",ev:"menu:item:Fixed Velocity"},
  {s:"Turn to ON and push. New notes on Track 2 now use the Velocity encoder value.",t:"sel",ev:"global:156"},
  {s:"Open the Device tools tab: this setting is global ID 156, which MCC does not show. Read it from the simulated device.",t:null,ev:"dev:read"}]},
 {n:"Device tools: write a song setup to the simulated KeyStep",steps:[
  {s:"Open the Device tools tab (top of the right column). The tools open under the keyboard.",t:null,ev:"tab:dev"},
  {s:"In the top bar, choose “Simulated KeyStep Pro” next to KeyStep and press Connect.",t:null,ev:"dev:connect"},
  {s:"In “Project names”, name project 2 and send it (the simulation runs the project-names firmware).",t:null,ev:"dev:name"},
  {s:"In “Chord and key per track”, write a chord and scale to project 2, track 2.",t:null,ev:"dev:trackkey"},
  {s:"Load project 2 on the panel (hold Project, press step 2) and play a key on Track 2.",t:"project",ev:"project:1"}]},
];
