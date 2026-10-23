/* Synths added by hand for the Synth CC mapper, in the catalog's row format (see mgParam in 7-ccmap.js):
   [section, name, description, kind, cc, lsb, nrpn msb, nrpn lsb, cc min, cc max, cc default, nrpn min, nrpn max, nrpn default, centered, notes, usage].
   A usage without "~" marks a switch or a list, which works on a knob but is not suggested. Each synth names its source in src.
   M-VAVE FM-1 rows: Baud Girl's FM-1+VA firmware manual, Version 102, sections 11.8 and 11.9 (https://baudgirl.com/work/FM-1+VA/manual).
   M-VAVE's own firmware does not answer these CCs. The synth CCs and the effect CCs arrive on two different channels, so each is its own entry.
   1010music Blackbox rows: Blackbox 3.0 User Manual (2023-05-04), "Mod Target?" columns of the pad, LFO, sample, granular and FX tables, and "Use MIDI Devices".
   The Blackbox has no fixed CC chart: CC 1, 7 and 10 are its MODW, MVOL and MPAN sources, and every other CC is MIDI-learned per parameter,
   so its CC numbers here are this page's own suggestion (free CCs, the usual synth numbers where there is one). */
const EXTRA_SYNTHS=(()=>{
 const src={name:"Baud Girl's FM-1+VA manual (Version 102)",url:"https://baudgirl.com/work/FM-1+VA/manual",
  note:"Needs the FM-1+VA firmware by Baud Girl; M-VAVE's own firmware does not answer these CCs."};
 const r=(s,name,desc,cc,max,usage,notes)=>[s,name,desc,"cc",cc,null,null,null,0,max??127,null,null,null,null,0,notes||"",usage||""];
 const press="0-63: release; 64-127: press",step="64-127: steps (held: repeats)",bands="choices split 0-127 into equal bands",onOff="0: off; 1-127: on";
 const synth={m:"M-VAVE",d:"FM-1 (FM-1+VA firmware, MIDI Channel)",src:{...src,note:src.note+" Send on the FM-1's MIDI Channel (All by default), not its FX Channel."},
  s:["Volume","All presets","FM preset","Virtual Analog preset","Knob bank","Buttons"],p:[
  r(0,"Volume","Volume over the MASTER knob's whole range; stays until MASTER is turned",7,127,"","Only while the MIDI Channel and FX Channel differ; Ext Ctrl CC7 Vol Off ignores it"),
  r(1,"Cutoff (VA) / Brightness (FM)","VA: filter cutoff. FM: every modulating operator's Output Level",74,127,"","Nothing on 8-Bit presets or FM algorithm 32"),
  r(1,"Resonance (VA) / Feedback (FM)","VA: filter resonance. FM: operator feedback",71,127,"","Nothing on 8-Bit presets"),
  r(1,"Attack","Envelope attack; switches Envelope on first",73),
  r(1,"Decay","Envelope decay; switches Envelope on first",75),
  r(1,"Sustain","Envelope sustain; switches Envelope on first",70),
  r(1,"Release","Envelope release; switches Envelope on first",72),
  r(1,"LFO Speed","LFO speed",76),
  r(1,"LFO Pitch Mod Depth","LFO pitch modulation depth",77),
  r(1,"LFO Delay","LFO delay",78),
  r(2,"Algorithm","FM algorithm 1-32; heard from the next note",58,127,bands),
  r(3,"Waveform","Sine, Saw, Tri, Square",24,127,bands),
  r(3,"Super","Stacked voices, 0-100",25),
  r(3,"Detune","Detune of the stacked voices, 0-100",26),
  r(3,"Drift","Analog drift, 0-100",27),
  r(3,"Sub","Sub oscillator level, 0-100",28),
  r(3,"Noise","Noise level, 0-100",29),
  r(3,"PWM","Pulse width modulation, 0-100; only on Square",30),
  r(3,"Filter Type","LP12, LP24, BP, HP",31,127,bands),
  r(3,"Filter Envelope","Filter envelope amount",52),
  r(3,"Filter Decay","Filter envelope decay",53),
  r(3,"Filter Shape","Filter envelope shape",54),
  r(3,"Filter Velocity","Velocity to filter",55),
  r(3,"Filter Key Tracking","Keyboard tracking of the cutoff",56),
  r(3,"LFO to Cutoff","LFO amount on the cutoff",57),
  ...[1,2,3,4].map(i=>r(4,`KNOB${i}`,`Sets whatever the current knob bank puts on KNOB${i}, over that setting's range`,84+i)),
  r(5,"ALGORITHM down","Panel ALGORITHM down",89,127,step),r(5,"ALGORITHM up","Panel ALGORITHM up",90,127,step),
  r(5,"PRESETS previous","Panel PRESETS previous",116,127,step),r(5,"PRESETS next","Panel PRESETS next",117,127,step),
  r(5,"SELECT up","Panel SELECT up",118,127,step),r(5,"SELECT down","Panel SELECT down",119,127,step),
  ...["FX","SEL","ENV","LFO","EDIT","GLO","HOME"].map((b,i)=>r(5,b,`Panel ${b} button`,102+i,127,press)),
  ...["ARP","SEQ","PLAY","REC"].map((b,i)=>r(5,b,`Panel ${b} button`,110+i,127,press)),
  r(5,"OCT-","Panel OCT- button",114,127,press),r(5,"OCT+","Panel OCT+ button",115,127,press)]};
 const fx={m:"M-VAVE",d:"FM-1 (FM-1+VA firmware, FX Channel)",src:{...src,note:src.note+" Send on the FM-1's FX Channel (2 by default). The FM-1 caps each value at the maximum shown, so the knob range is set to match."},
  s:["Filter","Reverb","Delay","Distortion","Chorus","Phaser"],p:[
  r(0,"Filter on/off","",0,127,onOff),r(0,"Filter Type","0 Low Pass, 1 Band Pass, 2 High Pass",1,2,"0: Low Pass; 1: Band Pass; 2: High Pass"),
  r(0,"Filter Cutoff","",2,107),r(0,"Filter Resonance","",3,10),
  r(1,"Reverb on/off","",4,127,onOff),r(1,"Reverb Type","0 Room, 1 Hall, 2 Plate",5,2,"0: Room; 1: Hall; 2: Plate"),
  r(1,"Reverb Decay","",6,100),r(1,"Reverb Mix","",7,100,"","CC 7 on the FX Channel is Reverb Mix, not volume"),
  r(2,"Delay on/off","",8,127,onOff),r(2,"Delay Feedback","",9,100),r(2,"Delay Rate","",10,100),r(2,"Delay Mix","",11,100,"","CC 11 on the FX Channel is Delay Mix, not expression"),
  r(3,"Distortion on/off","",12,127,onOff),r(3,"Distortion Gain","",13,100),r(3,"Distortion Tone","",14,100),r(3,"Distortion Level","",15,100),
  r(4,"Chorus on/off","",16,127,onOff),r(4,"Chorus Rate","",17,100),r(4,"Chorus Depth","",18,100),r(4,"Chorus Mix","",19,100),
  r(5,"Phaser on/off","",20,127,onOff),r(5,"Phaser Rate","",21,100),r(5,"Phaser Depth","",22,100),r(5,"Phaser Mix","",23,100)]};
 const L="Learn: on the Blackbox select the parameter, push INFO, pick a Source row, touch Learn, turn this knob; then set Amount (the knob moves the on-screen value by up to ±Amount)";
 const b=(s,name,desc,cc,centered,notes)=>[s,name,desc,"cc",cc,null,null,null,0,127,null,null,null,null,centered?1:0,notes??L,""];
 const bb={m:"1010music",d:"Blackbox (MIDI Learn)",src:{name:"1010music Blackbox 3.0 User Manual",url:"https://1010music.com/product/blackbox",
  note:"The Blackbox has no fixed CC chart: you MIDI-learn each CC onto a parameter, and the mapping is saved in the Blackbox preset with its channel. The CC numbers here are a suggested layout, not Blackbox defaults. A pad takes at most eight CC mappings; a ninth is dropped. CCs are not recorded into sequences."},
  s:["Fixed MIDI sources","Pad","Pad LFO","Sample position","Granular","Effects"],p:[
  b(0,"Mod wheel (MODW)","Choose MODW as a parameter's mod Source; follows the pad's MIDI In channel",1,0,"No Learn needed: pick MODW in a mod slot and set Amount"),
  b(0,"Volume (MVOL)","Choose MVOL as a parameter's mod Source; follows the pad's MIDI In channel",7,0,"No Learn needed: pick MVOL in a mod slot and set Amount"),
  b(0,"Pan (MPAN)","Choose MPAN as a parameter's mod Source; follows the pad's MIDI In channel",10,1,"No Learn needed: pick MPAN in a mod slot and set Amount"),
  b(1,"Level","Pad level, -96 to +12 dB",20),b(1,"Pitch","Pad pitch, -24 to +24 semitones",21,1),
  b(1,"Filter (cutoff)","One knob: negative is low pass, positive is high pass",74,1),b(1,"Resonance","Boost around the filter cutoff",71),
  b(1,"Attack","Envelope attack, 0 to 9 s (log)",73),b(1,"Decay","Envelope decay, 0 to 38 s (log)",75),b(1,"Release","Envelope release, 0 to 38 s (log)",72),
  b(1,"Pan","Pad pan on a stereo output",22,1),
  b(2,"LFO Rate","The pad's LFO rate",76),b(2,"LFO Depth","The pad's LFO depth",77),
  b(3,"Start","Sample start point",23),b(3,"Length","Sample length when Loop Mode is None",24),b(3,"Loop Start","Loop start point",25),b(3,"Loop End","Loop end point",26),
  b(4,"Speed","Granular pads: how fast playback moves through the grains, 0-200 %",27),
  b(5,"Delay time","FX1 Delay length (in steps when Beat Sync is on)",85,0,L+". Effects: push FX, touch FX1 or FX2, push INFO, select the parameter, push INFO"),
  b(5,"Delay Feedback","FX1 Delay feedback",86,0,L+". Effects: push FX, touch FX1 or FX2, push INFO, select the parameter, push INFO"),
  b(5,"Reverb Decay","FX2 Reverb decay",87,0,L+". Effects: push FX, touch FX1 or FX2, push INFO, select the parameter, push INFO"),
  b(5,"Reverb Damping","FX2 Reverb high-frequency damping",88,0,L+". Effects: push FX, touch FX1 or FX2, push INFO, select the parameter, push INFO")]};
 return [synth,fx,bb]})();
