#!/usr/bin/env bash
# Verrouille l'écran SANS le masquer : le bureau reste visible en direct
# (une vidéo continue de jouer). Quand une touche est pressée, seule la boîte
# de mot de passe de xsecurelock apparaît ; le reste du bureau reste visible.
#
# Usage : ./lock.sh [--timeout N]
#   --timeout N : arrête le verrou après N secondes (POUR LES TESTS UNIQUEMENT).
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------------------------------------------------------------- arguments --
TIMEOUT=""
while [ $# -gt 0 ]; do
    case "$1" in
        --timeout)
            [ $# -ge 2 ] && [[ "$2" =~ ^[0-9]+$ ]] \
                || { echo "Erreur : --timeout attend un nombre de secondes." >&2; exit 2; }
            TIMEOUT="$2"; shift 2 ;;
        *) echo "Usage : $0 [--timeout N]" >&2; exit 2 ;;
    esac
done

# ------------------------------------------------------------ vérifications --
erreur() { echo "Erreur : $*" >&2; exit 1; }

for cmd in python3 xsecurelock; do
    command -v "$cmd" >/dev/null 2>&1 \
        || erreur "'$cmd' manquant. Lancer ./install.sh (ou : sudo apt install $cmd)."
done
python3 -c "import Xlib" 2>/dev/null \
    || erreur "module Python Xlib manquant. Lancer ./install.sh (ou : sudo apt install python3-xlib)."
[ "${XDG_SESSION_TYPE:-}" != "wayland" ] \
    || erreur "session Wayland non supportée par xsecurelock. Choisir une session X11."
[ -n "${DISPLAY:-}" ] \
    || erreur "DISPLAY non défini (pas de session graphique X11)."

# ------------------------------------------------- fenêtre du terminal (X11) --
# On minimise le terminal qui lance le verrou, pour que le bureau soit
# entièrement visible. Facultatif : ignoré sans xdotool ou sans terminal.
FENETRE_TERMINAL=""

trouver_fenetre_terminal() {
    command -v xdotool >/dev/null 2>&1 || return 0
    if [ -n "${WINDOWID:-}" ]; then
        FENETRE_TERMINAL="$WINDOWID"                  # posé par la plupart des terminaux
    elif [ -t 0 ]; then
        FENETRE_TERMINAL="$(xdotool getactivewindow 2>/dev/null || true)"
    fi
}

minimiser_terminal() {
    [ -n "$FENETRE_TERMINAL" ] || return 0
    xdotool windowminimize "$FENETRE_TERMINAL" 2>/dev/null || return 0
    sleep 0.5                                         # laisse finir l'animation
}

restaurer_terminal() {
    [ -n "$FENETRE_TERMINAL" ] || return 0
    xdotool windowactivate "$FENETRE_TERMINAL" 2>/dev/null || true
}

# ------------------------------------------------------ réglage de xsecurelock --
# Un gestionnaire de composition (xfwm4 avec composition, picom, muffin...)
# est-il actif ? Il se signale en possédant la sélection X11 _NET_WM_CM_S<écran>.
compositeur_actif() {
    python3 -c '
import sys
from Xlib import display
d = display.Display()
atome = d.intern_atom("_NET_WM_CM_S%d" % d.get_default_screen())
sys.exit(0 if d.get_selection_owner(atome) else 1)
' 2>/dev/null
}

configurer_xsecurelock() {
    # Avec compositeur : xsecurelock se place dans la fenêtre « overlay » du
    # compositeur (mode par défaut). Sans compositeur, cette fenêtre serait
    # noire et opaque : on la désactive pour garder le vrai bureau visible.
    if compositeur_actif; then
        export XSECURELOCK_NO_COMPOSITE=0
    else
        export XSECURELOCK_NO_COMPOSITE=1
    fi
    # Notre « saver » rend la fenêtre de couverture transparente.
    export XSECURELOCK_SAVER="$DIR/saver.sh"
    # Désactive la fenêtre blanche « obscurer », qui serait visible sinon.
    export XSECURELOCK_COMPOSITE_OBSCURER=0
    # Ne jamais éteindre l'écran (DPMS) : il doit rester visible.
    export XSECURELOCK_BLANK_TIMEOUT="${XSECURELOCK_BLANK_TIMEOUT:--1}"
    # Saisie : "asterisks" (longueur visible) ou "cursor" (défaut xsecurelock).
    export XSECURELOCK_PASSWORD_PROMPT="${XSECURELOCK_PASSWORD_PROMPT:-asterisks}"
}

# xsecurelock écrit en continu des messages de diagnostic inoffensifs
# (déclenchés par la fenêtre transparente, ou par un mot de passe refusé).
# On les retire ; tout autre message (vraie erreur) reste affiché.
filtrer_messages() {
    grep --line-buffered -v \
        -e 'XComposite extension detected but disabled' \
        -e 'Someone overlapped the' \
        -e 'MaybeRaiseWindow miss' \
        -e 'auth child failed' \
        -e 'authproto child failed' || true
}

lancer_xsecurelock() {
    if [ -n "$TIMEOUT" ]; then
        timeout "$TIMEOUT" xsecurelock 2> >(filtrer_messages >&2) || true
    else
        xsecurelock 2> >(filtrer_messages >&2)
    fi
}

# --------------------------------------------------------------- exécution --
configurer_xsecurelock
trouver_fenetre_terminal
trap restaurer_terminal EXIT
minimiser_terminal
lancer_xsecurelock
