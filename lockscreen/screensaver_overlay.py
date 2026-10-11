"""
Ecran de verrouillage pour Linux : voile sombre + horloge, par-dessus le
bureau qui continue de tourner en direct.
---------------------------------------------------------------------------
Ce script ne fait QUE l'affichage. Le verrouillage clavier/souris et la
verification du mot de passe sont faits par xsecurelock (voir lock.sh).

Plus aucune capture d'ecran : le fond visible est le vrai bureau, en direct.
C'est le compositeur (picom) qui rend la fenetre translucide. Sans
compositeur, l'ecran est simplement opaque (repli accepte par le client).

Dependances :
    sudo apt install python3 python3-tk x11-utils

Utilisation (mode autonome, pour tester l'affichage) :
    python3 screensaver_overlay.py --timeout 10
    python3 screensaver_overlay.py --alpha 0.6 --timeout 10

Mode embarque : si la variable XSCREENSAVER_WINDOW est definie (c'est
xsecurelock qui la fournit), le script s'affiche DANS cette fenetre au lieu
de creer une fenetre plein ecran.
"""

import argparse
import locale
import os
import subprocess
import tkinter as tk
from datetime import datetime


def regler_locale():
    # Adapte la langue de la date à celle du système.
    # Si la locale demandée n'existe pas, on continue sans erreur.
    try:
        locale.setlocale(locale.LC_TIME, "")
    except locale.Error:
        pass


def taille_fenetre_hote(fenetre_hote):
    # En mode embarqué, xsecurelock nous fournit l'identifiant de sa fenêtre.
    # Tkinter ne détecte pas automatiquement sa taille, donc on la lit
    # avec xwininfo. Sans ça, le canvas reste à 378x264 (défaut de Tk)
    # et l'horloge se retrouve coincée en haut à gauche.
    try:
        sortie = subprocess.run(
            ["xwininfo", "-id", fenetre_hote], capture_output=True,
            text=True, timeout=5, check=True).stdout
        largeur = hauteur = 0
        for ligne in sortie.splitlines():
            ligne = ligne.strip()
            if ligne.startswith("Width:"):
                largeur = int(ligne.split()[1])
            elif ligne.startswith("Height:"):
                hauteur = int(ligne.split()[1])
        if largeur > 1 and hauteur > 1:
            return largeur, hauteur
    except Exception:
        pass
    return None  # repli : on utilisera la taille de l'écran


class ScreenOverlay:
    def __init__(self, alpha=0.75, bg_color="black", fg_color="white",
                 timeout=None):

        # Si xsecurelock a lancé ce script, il définit XSCREENSAVER_WINDOW.
        # On dessine dans sa fenêtre. Sinon, on crée notre propre fenêtre
        # plein écran (mode test, sans verrouillage).
        fenetre_hote = os.environ.get("XSCREENSAVER_WINDOW")
        self.embarque = bool(fenetre_hote)

        if self.embarque:
            # Mode xsecurelock : l'opacité ne se règle PAS ici. C'est le
            # compositeur qui rend translucide la fenêtre de xsecurelock
            # (voir la règle picom dans le README).
            self.root = tk.Tk(use=fenetre_hote)
        else:
            self.root = tk.Tk()
            self.root.attributes("-fullscreen", True)
            self.root.attributes("-topmost", True)
            try:
                # Nécessite un compositeur actif. Sans lui, l'option est
                # ignorée et la fenêtre reste opaque.
                self.root.attributes("-alpha", alpha)
            except tk.TclError:
                pass

        # Le voile : une couleur unie que le compositeur rendra translucide.
        self.root.configure(bg=bg_color)
        self.root.config(cursor="none")
        # Empêche la fermeture de la fenêtre par le gestionnaire de bureau.
        self.root.protocol("WM_DELETE_WINDOW", lambda: None)

        self.taille = (0, 0)  # mémorise la dernière taille dessinée

        options_canvas = {}
        if self.embarque:
            # On impose la taille de la fenêtre xsecurelock au canvas,
            # car Tk ne la détecte pas seul en mode embarqué.
            w, h = (taille_fenetre_hote(fenetre_hote)
                    or (self.root.winfo_screenwidth(),
                        self.root.winfo_screenheight()))
            options_canvas = {"width": w, "height": h}

        self.canvas = tk.Canvas(self.root, bg=bg_color, highlightthickness=0,
                                **options_canvas)
        self.canvas.pack(fill="both", expand=True)

        # Créés en (0,0) pour l'instant : redessiner() les place correctement
        # une fois la vraie taille de la fenêtre connue.
        self.clock = self.canvas.create_text(
            0, 0, fill=fg_color, font=("DejaVu Sans", 90, "bold"))
        self.date = self.canvas.create_text(
            0, 0, fill=fg_color, font=("DejaVu Sans", 28))

        # <Configure> se déclenche quand la fenêtre est prête et à chaque
        # redimensionnement : c'est là qu'on connaît la vraie taille.
        self.canvas.bind("<Configure>", self.redessiner)

        # Fermeture automatique après N secondes (utile pour les tests).
        # En usage réel, c'est xsecurelock qui ferme le saver au déverrouillage.
        if timeout:
            self.root.after(timeout * 1000, self.close)

        self.update_clock()
        if not self.embarque:
            self.root.focus_force()
        self.root.mainloop()

    def redessiner(self, event=None):
        # Appelée à chaque changement de taille : on recentre le texte.
        w, h = self.canvas.winfo_width(), self.canvas.winfo_height()
        if (w, h) == self.taille or w <= 1 or h <= 1:
            return
        self.taille = (w, h)

        if os.environ.get("LOCKSCREEN_DEBUG"):
            print(f"lockscreen: taille fenetre {w}x{h}", flush=True)

        # Horloge dans le quart supérieur pour ne pas être cachée
        # par la boîte de saisie du mot de passe de xsecurelock (centrée).
        self.canvas.coords(self.clock, w // 2, h // 4)
        self.canvas.coords(self.date, w // 2, h // 4 + 100)

    def update_clock(self):
        # Met à jour l'heure et la date toutes les secondes.
        now = datetime.now()
        self.canvas.itemconfig(self.clock, text=now.strftime("%H:%M:%S"))
        self.canvas.itemconfig(self.date, text=now.strftime("%A %d %B %Y").capitalize())
        self.root.after(1000, self.update_clock)

    def close(self, event=None):
        self.root.destroy()


def parse_args(argv=None):
    p = argparse.ArgumentParser(description="Ecran de verrouillage : voile + horloge")
    p.add_argument("--alpha", type=float, default=0.75,
                   help="Opacite du voile en mode autonome (necessite un compositeur). Defaut: 0.75")
    p.add_argument("--bg", default="black", help="Couleur du voile. Defaut: black")
    p.add_argument("--fg", default="white", help="Couleur du texte. Defaut: white")
    p.add_argument("--timeout", type=int, default=None,
                   help="Ferme l'affichage apres N secondes (tests uniquement)")
    return p.parse_args(argv)


if __name__ == "__main__":
    args = parse_args()
    regler_locale()
    ScreenOverlay(alpha=args.alpha, bg_color=args.bg, fg_color=args.fg,
                  timeout=args.timeout)