#!/usr/bin/env bash
# Verrouille l'ecran : capture du bureau, puis xsecurelock avec notre affichage.
# Usage : ./lock.sh [--timeout N]
#   --timeout N : tue xsecurelock apres N secondes (SECURITE POUR LES TESTS,
#                 a ne pas utiliser en usage reel).
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMEOUT=""

while [ $# -gt 0 ]; do
    case "$1" in
        --timeout)
            [ $# -ge 2 ] && [[ "$2" =~ ^[0-9]+$ ]] || { echo "Erreur : --timeout attend un nombre de secondes." >&2; exit 2; }
            TIMEOUT="$2"; shift 2 ;;
        *) echo "Usage : $0 [--timeout N]" >&2; exit 2 ;;
    esac
done

manquants=()
for cmd in python3 xsecurelock scrot; do
    command -v "$cmd" >/dev/null 2>&1 || manquants+=("$cmd")
done
if [ ${#manquants[@]} -gt 0 ]; then
    echo "Erreur : dependance(s) manquante(s) : ${manquants[*]}" >&2
    echo "Installer avec : sudo apt install ${manquants[*]}" >&2
    exit 1
fi

if [ "${XDG_SESSION_TYPE:-}" = "wayland" ]; then
    echo "Erreur : session Wayland non supportee par xsecurelock. Choisir une session X11." >&2
    exit 1
fi
if [ -z "${DISPLAY:-}" ]; then
    echo "Erreur : DISPLAY non defini (pas de session graphique X11)." >&2
    exit 1
fi

# Dossier prive (droits 700) ; supprime a la sortie meme en cas d'erreur.
umask 077
WORKDIR="$(mktemp -d /tmp/lockscreen.XXXXXX)"
trap 'rm -rf "$WORKDIR"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP

# Capture AVANT xsecurelock (sinon on photographierait sa fenetre noire).
if scrot "$WORKDIR/capture.png" 2>/dev/null; then
    export LOCKSCREEN_FOND="$WORKDIR/capture.png"
else
    echo "Avertissement : capture impossible, fond uni utilise." >&2
fi

export XSECURELOCK_SAVER="$DIR/saver.sh"
# Saisie du mot de passe : "cursor" (defaut xsecurelock, curseur qui saute a chaque
# touche, masque la longueur) ou "asterisks" (plus lisible, longueur visible).
export XSECURELOCK_PASSWORD_PROMPT="${XSECURELOCK_PASSWORD_PROMPT:-asterisks}"

if [ -n "$TIMEOUT" ]; then
    timeout "$TIMEOUT" xsecurelock || true
else
    xsecurelock
fi
