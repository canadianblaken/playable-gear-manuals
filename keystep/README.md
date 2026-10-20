# KeyStep Pro interactive manual

`keystep-interactive-manual.html` is a single-file, playable KeyStep Pro (firmware 2.5) with two tabs in the right column:

- **Manual**: hover/click help for every control, chapters keyed to the 2.5.1 user manual, demos and 14 guided tours.
- **Device tools**: SysEx tools that talk to a real KeyStep Pro over Web MIDI (Chrome/Edge, SysEx permission), or to the simulated one in the page.

Places where the simulation follows the decoded 2.5.20 firmware instead of the manual carry a blue **Firmware** note in the help text (scale quantizer ties, chord-mode snapping, chord persistence, the Save confirm trap, hidden settings).

## Build and test

```
./build.sh                                                   # cats src/ into the HTML
node tests/cdp.mjs "file://$PWD/keystep-interactive-manual.html" tests/tour-walk.js    # every tour reaches Done
node tests/cdp.mjs "file://$PWD/keystep-interactive-manual.html" tests/functional.js   # firmware behaviour + SysEx tools vs the simulation
```

`src/1b-globals.js` is generated from the MIDI Control Center device file plus the firmware findings (`~/keysteppro/tools/gen_globals_js.py`, not in this repo).

| part | contents |
|---|---|
| `0-head.html` | page, styles |
| `1-data.js` | panel layout (MCC coordinates), scales, help text, chapters, tours |
| `1b-globals.js` | generated table of the 158 global settings |
| `2-audio.js` | stand-in instruments |
| `3-seq.js` | projects, patterns, playback, recording, Shift functions |
| `4-screens.js` | OLED and the Utility menu |
| `5-ui.js` | panel drawing, input, LEDs, tours, chapters, demos, Web MIDI mirror |
| `6-device.js` | SysEx link (Web MIDI / simulation), the simulated device, the `FEATURES` registry |

## Adding a device feature once it is solved

The Device tools tab only lists things that were worked out and then checked on hardware. To add one:

1. Append an entry to `FEATURES` in `src/6-device.js`:
   `{id, title, verified: "date: what was checked on the device", needs: null | "firmware or condition", about, render(el)}`.
   `render` builds the controls; wrap device work in `busy(async()=>{…})` and use `DEV.link` (`get/getMany/set/setMany/open/commit/getGlobal/setGlobal/setName`).
2. If it uses a message the simulation does not answer yet, teach `SIMDEV` (`handle`, `getv`, `setv`) so the tool works offline and can be tested.
3. Add an assertion to `tests/functional.js` that runs the tool against the simulation.
4. If the finding changes how the instrument behaves, add a firmware note (fifth field) to the matching `INFO` entry in `src/1-data.js`, and a tour step if it deserves one.

Protocol reminders: the byte after the command is the project (0 = current, 1–16). Item data is only answered inside a session (`05 <proj>`), and reads return what is saved in flash. A stock `06 <proj>` commit flips every scene/pattern state it was not given, so writers must re-send all 96 states (see `writeProject`). Global IDs 128+ use commands 31/32 with `id-128`. A global SET gets no reply, so read it back.
