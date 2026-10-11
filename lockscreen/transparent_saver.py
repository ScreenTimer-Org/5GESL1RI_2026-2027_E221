#!/usr/bin/env python3
"""
Saver "transparent" pour xsecurelock : le bureau reste visible EN DIRECT.
---------------------------------------------------------------------------
Principe
    xsecurelock couvre l'ecran avec une fenetre noire ("background"), qui
    contient la fenetre du saver et la fenetre de la boite de mot de passe
    ("auth"). Ce script est lance par xsecurelock comme saver ; il recoit
    l'identifiant de sa fenetre dans XSCREENSAVER_WINDOW.

    Avec l'extension X11 XShape, on "decoupe" la fenetre noire :
      * au repos          -> forme vide : la fenetre noire est invisible, on
                             voit le vrai bureau (une video continue de jouer,
                             ce n'est pas une capture d'ecran) ;
      * touche pressee    -> xsecurelock affiche la boite de mot de passe ;
                             on ne laisse visible QUE le rectangle de cette
                             boite. Le reste du bureau reste visible et vivant.

    Le clavier et la souris restent captures par xsecurelock (grab) : meme si
    la fenetre est invisible, rien n'atteint les applications en dessous. La
    verification du mot de passe (PAM) reste entierement faite par xsecurelock.

    Securite "fail closed" : si ce script plante ou est tue, la fenetre noire
    reapparait entierement (ecran noir) -> l'ecran n'est jamais deverrouille
    par erreur.

Dependance : sudo apt install python3-xlib
"""

import os
import select
import signal
import sys

from Xlib import X, display, error
from Xlib.ext import shape

# Noms WM_CLASS poses par xsecurelock sur ses fenetres.
CLASSE_FOND = "background"
CLASSES_AUTH = ("auth", "auth_x11_screen")


def classe_xsecurelock(fenetre):
    """Retourne le nom de classe ("background", "auth", ...) si la fenetre
    appartient a xsecurelock, sinon None."""
    try:
        wm = fenetre.get_wm_class()
    except error.XError:
        return None
    # WM_CLASS = (instance, classe) ; xsecurelock pose ("background", "xsecurelock").
    if wm and wm[1] == "xsecurelock":
        return wm[0]
    return None


def trouver_fenetre_fond(d, fenetre_id):
    """XSCREENSAVER_WINDOW est une fenetre descendante de la fenetre de fond
    (fond -> saver -> saver_multiplex_screen) : on remonte jusqu'a elle."""
    fenetre = d.create_resource_object("window", int(fenetre_id, 0))
    for _ in range(5):
        if classe_xsecurelock(fenetre) == CLASSE_FOND:
            return fenetre
        fenetre = fenetre.query_tree().parent
    return None


def rectangles_boite_mot_de_passe(fond):
    """Rectangles (x, y, l, h) des fenetres d'authentification visibles,
    dans le repere de la fenetre de fond."""
    rects = []
    for enfant in fond.query_tree().children:
        if classe_xsecurelock(enfant) not in CLASSES_AUTH:
            continue
        try:
            if enfant.get_attributes().map_state != X.IsViewable:
                continue
            g = enfant.get_geometry()
        except error.XError:
            continue          # fenetre detruite entre-temps
        if g.width > 1 and g.height > 1:
            rects.append((g.x, g.y, g.width, g.height))
    return rects


def appliquer_forme(fond, rects):
    """Restreint la partie visible de la fenetre de fond a `rects`
    (liste vide = completement transparente)."""
    fond.shape_rectangles(shape.SO.Set, shape.SK.Bounding, X.Unsorted,
                          0, 0, rects)


def main():
    fenetre_id = os.environ.get("XSCREENSAVER_WINDOW")
    if not fenetre_id:
        print("transparent_saver : a lancer par xsecurelock "
              "(XSCREENSAVER_WINDOW absent).", file=sys.stderr)
        return 2

    # xsecurelock peut envoyer SIGUSR1 (reset du saver) : on l'ignore.
    signal.signal(signal.SIGUSR1, signal.SIG_IGN)
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))

    d = display.Display()
    if not d.has_extension("SHAPE"):
        print("transparent_saver : extension X11 SHAPE indisponible.",
              file=sys.stderr)
        return 1

    fond = trouver_fenetre_fond(d, fenetre_id)
    if fond is None:
        print("transparent_saver : fenetre de fond xsecurelock introuvable, "
              "abandon (l'ecran reste noir).", file=sys.stderr)
        return 1

    # On veut etre prevenu quand la boite de mot de passe apparait, disparait
    # ou change de taille (enfants de la fenetre de fond).
    fond.change_attributes(event_mask=X.SubstructureNotifyMask)
    d.sync()

    derniere = None
    while True:
        try:
            rects = rectangles_boite_mot_de_passe(fond)
            if rects != derniere:
                appliquer_forme(fond, rects)
                d.sync()
                derniere = rects

            # Attend un evenement X ; reverification periodique par securite.
            if not d.pending_events():
                select.select([d.fileno()], [], [], 0.5)
            while d.pending_events():
                d.next_event()
        except error.ConnectionClosedError:
            return 0            # le serveur X ou xsecurelock s'arrete
        except error.XError:
            continue            # fenetre disparue le temps d'une requete


if __name__ == "__main__":
    sys.exit(main())
