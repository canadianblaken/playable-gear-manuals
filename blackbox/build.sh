#!/bin/sh
cd "$(dirname "$0")" && cat src/0-head.html src/1-data.js src/2-audio.js src/3-seq.js src/4-screens.js src/5-ui.js > blackbox-interactive-manual.html
