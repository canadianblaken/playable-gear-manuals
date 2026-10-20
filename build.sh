#!/bin/sh
# rebuilds blackbox, hapax and keystep, then the combined tabbed page (squid is a single hand-edited file)
exec "$(dirname "$0")/combined/build.sh"
