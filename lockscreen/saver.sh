#!/usr/bin/env bash
# Lance l'affichage Python comme "saver" de xsecurelock.
# xsecurelock lance ce script sans argument et lui fournit XSCREENSAVER_WINDOW.
set -eu
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

exec python3 "$DIR/screensaver_overlay.py"