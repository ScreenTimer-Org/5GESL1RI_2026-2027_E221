#!/usr/bin/env bash
# Lance le saver "transparent" comme module de xsecurelock.
# xsecurelock lance ce script sans argument et lui fournit XSCREENSAVER_WINDOW.
set -eu
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec python3 "$DIR/transparent_saver.py"
