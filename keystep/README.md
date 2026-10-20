# KeyStep Pro interactive manual

`keystep-interactive-manual.html` is a single-file, playable KeyStep Pro (firmware 2.5) with three tabs in the right column:

- **Manual**: hover/click help for every control, chapters keyed to the 2.5.1 user manual, demos and 14 guided tours.
- **Device tools**: SysEx tools that talk to a real KeyStep Pro over Web MIDI (Chrome/Edge, SysEx permission), or to the simulated one in the page. Includes whole-project recall/send, backups of all 16 projects, and a project library kept in the browser (IndexedDB).
- **Synth CC**: pick a synth from the MIDI Guide catalog (447 devices) and assign its parameters to the five Control-mode knobs of the simulation (global settings 28–57). Only single 7-bit CCs are offered; NRPN, 14-bit pairs, channel mode CCs and other messages are listed separately. The “14-bit synths” button narrows the list to the 46 synths with 14-bit pairs and offers each pair's coarse half (MSB only), marked as such. Mappings are saved in the browser and export/import as JSON. Nothing is sent to a device yet.

Places where the simulation follows the decoded 2.5.20 firmware instead of the manual carry a blue **Firmware** note in the help text (scale quantizer ties, chord-mode snapping, chord persistence, the Save confirm trap, hidden settings).

## Build and test

```
./build.sh                                                   # cats src/ into the HTML
node tests/cdp.mjs "file://$PWD/keystep-interactive-manual.html" tests/tour-walk.js    # every tour reaches Done
node tests/cdp.mjs "file://$PWD/keystep-interactive-manual.html" tests/functional.js   # firmware behaviour + SysEx tools vs the simulation
node tests/cdp.mjs "file://$PWD/keystep-interactive-manual.html" tests/ccmap.js        # Synth CC mapper: catalog, filtering, ranges, storage, isolation
```

`src/1b-globals.js` is generated from the MIDI Control Center device file plus the firmware findings (`~/keysteppro/tools/gen_globals_js.py`, not in this repo). `src/1c-bulk.js` comes from the same file's recall plan (`~/keysteppro/tools/gen_bulk_js.py`).

On macOS, set `CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`. `MIDI=1` grants Web MIDI with SysEx to the headless page, so a script can drive a real KeyStep Pro; `TIMEOUT` (ms) raises the 120 s evaluation limit for whole-project transfers.

| part | contents |
|---|---|
| `0-head.html` | page, styles |
| `1-data.js` | panel layout (MCC coordinates), scales, help text, chapters, tours |
| `1b-globals.js` | generated table of the 158 global settings |
| `1c-bulk.js` | generated project recall plan: every block MCC reads for a project (8951 requests) |
| `1d-midiguide.js` | generated MIDI Guide catalog, gzip + base64 (CC BY-SA 4.0, see below) |
| `2-audio.js` | stand-in instruments |
| `3-seq.js` | projects, patterns, playback, recording, Shift functions |
| `4-screens.js` | OLED and the Utility menu |
| `5-ui.js` | panel drawing, input, LEDs, tours, chapters, demos, Web MIDI mirror |
| `6-device.js` | SysEx link (Web MIDI / simulation), the simulated device, the `FEATURES` registry |
| `7-ccmap.js` | Synth CC mapper: catalog loading, mapping model (`checkMapping`, `mappingGlobals`), the tab |

## Adding a device feature once it is solved

The Device tools tab only lists things that were worked out and then checked on hardware. To add one:

1. Append an entry to `FEATURES` in `src/6-device.js`:
   `{id, title, verified: "date: what was checked on the device", needs: null | "firmware or condition", about, render(el)}`.
   `render` builds the controls; wrap device work in `busy(async()=>{…})` and use `DEV.link` (`get/getMany/set/setMany/open/commit/getGlobal/setGlobal/setName`).
2. If it uses a message the simulation does not answer yet, teach `SIMDEV` (`handle`, `getv`, `setv`) so the tool works offline and can be tested.
3. Add an assertion to `tests/functional.js` that runs the tool against the simulation.
4. If the finding changes how the instrument behaves, add a firmware note (fifth field) to the matching `INFO` entry in `src/1-data.js`, and a tour step if it deserves one.

Protocol reminders: the byte after the command is the project (0 = current, 1–16). Item data is only answered inside a session (`05 <proj>`), and reads return what is saved in flash. A stock `06 <proj>` commit flips every scene/pattern state it was not given, so writers must re-send all 96 states (see `writeProject`). Global IDs 128+ use commands 31/32 with `id-128`. A global SET gets no reply, so read it back. The getter sends stored bytes unmasked, so a byte of 0xF7 or above (a chord note below the root) breaks the reply frame, and the SET keeps only 7 bits. One GET at a time: with 4 or more in flight the device drops replies.

## Synth CC catalog (MIDI Guide)

`src/1d-midiguide.js` is generated from [MIDI Guide](https://midi.guide) by Pencil Research ([github.com/pencilresearch/midi](https://github.com/pencilresearch/midi)), licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). That file is an adaptation of the dataset and is shared under CC BY-SA 4.0, not the MIT license of the rest of this repository. Parts that describe a specific device may be owned by its manufacturer. The snapshot's revision and retrieval date are in the file header and shown in the Synth CC tab.

To update it:

```
git clone --depth 1 https://github.com/pencilresearch/midi.git /tmp/midi-guide
python3 -I tools/import_midiguide.py /tmp/midi-guide > src/1d-midiguide.js && ./build.sh
```

The importer keeps every CC/NRPN row (section, name, description, CC/NRPN numbers, ranges, defaults, orientation, notes, usage) and classifies each as single CC (offered), 14-bit CC pair, channel mode CC 120–127, NRPN, or other. The mapping a user builds is plain data (`checkMapping` / `mappingGlobals` in `src/7-ccmap.js`): a later Device tools action can write it to a KeyStep Pro with `DEV.link.setGlobal`.
