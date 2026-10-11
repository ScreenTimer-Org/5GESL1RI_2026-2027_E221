#!/usr/bin/env bash
# Verrouille l'ecran avec xsecurelock et notre affichage (voile + horloge).
# Le bureau continue de tourner en direct derriere : plus aucune capture.
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
for cmd in python3 xsecurelock; do
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

# Sans compositeur actif (picom), la transparence est impossible : l'ecran
# sera simplement opaque. C'est le repli prevu, on previent juste l'utilisateur.
if ! pgrep -x picom >/dev/null 2>&1; then
    echo "Avertissement : aucun compositeur (picom) detecte, l'ecran sera opaque." >&2
fi

export XSECURELOCK_SAVER="$DIR/saver.sh"
# Saisie du mot de passe : "cursor" (defaut xsecurelock, curseur qui saute a chaque
# touche, masque la longueur) ou "asterisks" (plus lisible, longueur visible).
export XSECURELOCK_PASSWORD_PROMPT="${XSECURELOCK_PASSWORD_PROMPT:-asterisks}"
# xsecurelock pose par defaut une fenetre noire supplementaire pour empecher
# un compositeur de laisser voir le bureau. On la desactive, sinon la
# transparence demandee par le client est impossible.
export XSECURELOCK_COMPOSITE_OBSCURER="${XSECURELOCK_COMPOSITE_OBSCURER:-0}"

if [ -n "$TIMEOUT" ]; then
    timeout "$TIMEOUT" xsecurelock || true
else
    xsecurelock
fi