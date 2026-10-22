#!/bin/sh
cd "$(dirname "$0")" && { cat src/0-head.html src/1-data.js src/1b-globals.js src/1c-bulk.js src/1d-midiguide.js src/1e-blank.js src/1f-fwpatch.js src/2-audio.js src/3-seq.js src/4-screens.js src/5-ui.js src/5b-pads.js src/6-device.js src/6b-editor.js src/6c-midifile.js src/6d-fwmake.js src/7-ccmap.js src/8-studio.js; printf "boot();\n</script>\n</body>\n</html>\n"; } > keystep-interactive-manual.html
cd "$(dirname "$0")" && { cat install/0-head.html src/1f-fwpatch.js src/6d-fwmake.js install/9-install.js; printf "</script>\n</body>\n</html>\n"; } > kscon-install.html
