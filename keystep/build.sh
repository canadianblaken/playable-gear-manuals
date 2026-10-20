#!/bin/sh
cd "$(dirname "$0")" && { cat src/0-head.html src/1-data.js src/1b-globals.js src/1c-bulk.js src/1d-midiguide.js src/2-audio.js src/3-seq.js src/4-screens.js src/5-ui.js src/6-device.js src/6b-editor.js src/6c-midifile.js src/7-ccmap.js; printf "boot();\n</script>\n</body>\n</html>\n"; } > keystep-interactive-manual.html
