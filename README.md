# Playable gear manuals

Unofficial, playable recreations of three pieces of music hardware. Each one is a single HTML file you open in a browser. You can play the front panel, hover over anything for help, and follow guided tours built from each instrument's manual and tutorial videos. All sound is synthesized in the browser.

| Folder | Instrument | Covers |
|---|---|---|
| `squid/` | Pioneer DJ Toraiz SQUID | manual + firmware 1.13 |
| `blackbox/` | 1010music Blackbox (original) | manual 3.0, plus an optional layer for the community [blackbox-mod 3.1.n](https://github.com/j3threejay/blackbox-mod) firmware, with a tour for each chapter of its [walkthrough video](https://www.youtube.com/watch?v=XQJCY2Asl0s) |
| `hapax/` | Squarp Hapax | hapaxOS 3.10 manual + 3.20–3.22 firmware notes, a tour for each of the 20 Squarp tutorial videos |
| `combined/` | all three as tabs | `playable-gear-manuals.html`. The Blackbox tab has a blackbox-mod checkbox |

## Use

Open any of the `.html` files in Chrome or Edge. Firefox works, but Web MIDI needs Chrome or Edge; Safari has no Web MIDI. Nothing needs to be installed or served.

## Build

`blackbox/` and `hapax/` are built by concatenating the parts in `src/`. `squid/` is a single file that is edited directly.

```
./build.sh             # rebuilds blackbox, hapax, then combined/playable-gear-manuals.html
blackbox/build.sh      # just one
```

## Tests

The tests drive headless Chrome over the DevTools protocol (Node 22+, no dependencies). See `hapax/tests/README.txt` and `blackbox/tests/README.txt`. The tour walkers carry out every tour step with real inputs and check that each tour reaches Done.

## Not affiliated

This project is not affiliated with, endorsed by, or connected to Pioneer DJ / AlphaTheta, 1010music, or Squarp Instruments. Product names are trademarks of their owners and are used only to say what each simulation is of. No manuals, firmware, samples or artwork from those companies are included. The explanations are written from scratch, with page references to the official manuals.

## License

MIT, see [LICENSE](LICENSE). It covers the code and text in this repository only, not the instruments, their names or their manuals.
