#!/usr/bin/env bash
# Lance l'affichage Python comme "saver" de xsecurelock.
# xsecurelock lance ce script sans argument et lui fournit XSCREENSAVER_WINDOW.
# Les options arrivent par variables d'environnement (posees par lock.sh) :
#   LOCKSCREEN_FOND : chemin de l'image de capture
set -eu
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

args=()
if [ -n "${LOCKSCREEN_FOND:-}" ] && [ -f "$LOCKSCREEN_FOND" ]; then
    args+=(--fond "$LOCKSCREEN_FOND")
fi

exec python3 "$DIR/screensaver_overlay.py" "${args[@]}"
