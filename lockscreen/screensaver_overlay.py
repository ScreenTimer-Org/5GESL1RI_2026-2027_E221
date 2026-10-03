"""
Ecran de verrouillage pour Linux : fond flouté + horloge.
---------------------------------------------------------------------------
Ce script ne fait QUE l'affichage. Le verrouillage clavier/souris et la
verification du mot de passe sont faits par xsecurelock (voir lock.sh).

Dependances :
    sudo apt install python3 python3-tk python3-pil python3-pil.imagetk scrot x11-utils

Utilisation (mode autonome, pour tester l'affichage) :
    python3 screensaver_overlay.py --timeout 10
    python3 screensaver_overlay.py --fond capture.png --blur 8 --dim 0.4

Mode embarque : si la variable XSCREENSAVER_WINDOW est definie (c'est
xsecurelock qui la fournit), le script s'affiche DANS cette fenetre au lieu
de creer une fenetre plein ecran.
"""

import argparse
import locale
import os
import subprocess
import tempfile
import tkinter as tk
from datetime import datetime

from PIL import Image, ImageEnhance, ImageFilter, ImageGrab, ImageTk


def regler_locale():
    # Adapte la langue de la date à celle du système (ex: français si le système est en français).
    # Si la locale demandée n'existe pas, on continue sans erreur.
    try:
        locale.setlocale(locale.LC_TIME, "")
    except locale.Error:
        pass


def capturer_ecran():
    # Prend une photo du bureau avec Pillow.
    # Si Pillow échoue (ex: Wayland), on essaie scrot à la place.
    try:
        return ImageGrab.grab().convert("RGB")
    except Exception:
        pass

    # Repli scrot : on crée un dossier temporaire privé (droits 700)
    # pour y mettre la capture, puis on le supprime dans tous les cas.
    dossier = tempfile.mkdtemp(prefix="lockscreen.")
    chemin = os.path.join(dossier, "capture.png")
    try:
        subprocess.run(["scrot", chemin], check=True, timeout=10,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        with Image.open(chemin) as img:
            return img.convert("RGB")
    finally:
        # Nettoyage garanti, même si une erreur s'est produite.
        try:
            os.remove(chemin)
        except OSError:
            pass
        try:
            os.rmdir(dossier)
        except OSError:
            pass


def preparer_fond(chemin=None, flou=6.0, luminosite=0.5):
    # Charge une image (fournie par lock.sh via --fond, ou capturée à l'instant),
    # la floute et l'assombrit. Renvoie None si impossible : l'écran affichera
    # alors un fond uni à la place.
    try:
        if chemin:
            # lock.sh a déjà pris la capture et nous passe son chemin.
            with Image.open(chemin) as img:
                img = img.convert("RGB")
        else:
            # Mode autonome : on capture le bureau nous-mêmes.
            img = capturer_ecran()
        img = img.filter(ImageFilter.GaussianBlur(flou))
        return ImageEnhance.Brightness(img).enhance(luminosite)
    except Exception:
        return None


def taille_fenetre_hote(fenetre_hote):
    # En mode embarqué, xsecurelock nous fournit l'identifiant de sa fenêtre.
    # Tkinter ne détecte pas automatiquement sa taille, donc on la lit
    # avec xwininfo. Sans ça, le canvas reste à 378x264 (taille par défaut de Tk)
    # et l'image s'affiche toute petite en haut à gauche.
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
    def __init__(self, alpha=1.0, bg_color="black", fg_color="white",
                 fond=None, timeout=None):

        # Si xsecurelock a lancé ce script, il définit XSCREENSAVER_WINDOW.
        # On s'attache à cette fenêtre pour dessiner dedans.
        # Sinon, on crée notre propre fenêtre plein écran (mode test).
        fenetre_hote = os.environ.get("XSCREENSAVER_WINDOW")
        self.embarque = bool(fenetre_hote)

        if self.embarque:
            self.root = tk.Tk(use=fenetre_hote)
        else:
            self.root = tk.Tk()
            self.root.attributes("-fullscreen", True)
            self.root.attributes("-topmost", True)
            try:
                self.root.attributes("-alpha", alpha)
            except tk.TclError:
                pass

        self.root.configure(bg=bg_color)
        self.root.config(cursor="none")
        # Empêche la fermeture de la fenêtre par le gestionnaire de bureau.
        self.root.protocol("WM_DELETE_WINDOW", lambda: None)

        self.fond = fond
        self.taille = (0, 0)  # mémorise la dernière taille dessinée
        self.photo = None     # référence à garder pour éviter que Tk efface l'image

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

        # On crée les éléments visuels à la position (0,0) pour l'instant.
        # redessiner() les placera correctement une fois la taille connue.
        self.image_id = self.canvas.create_image(0, 0, anchor="nw")
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
        # Appelée à chaque changement de taille de la fenêtre.
        # On ne redessine que si la taille a vraiment changé.
        w, h = self.canvas.winfo_width(), self.canvas.winfo_height()
        if (w, h) == self.taille or w <= 1 or h <= 1:
            return
        self.taille = (w, h)

        if os.environ.get("LOCKSCREEN_DEBUG"):
            print(f"lockscreen: taille fenetre {w}x{h}", flush=True)

        # Redimensionne le fond à la taille exacte de la fenêtre.
        if self.fond is not None:
            self.photo = ImageTk.PhotoImage(self.fond.resize((w, h)))
            self.canvas.itemconfig(self.image_id, image=self.photo)

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
    p = argparse.ArgumentParser(description="Ecran de verrouillage : fond flouté + horloge")
    p.add_argument("--alpha", type=float, default=1.0,
                   help="Opacite de la fenetre (mode autonome, necessite un compositeur). Defaut: 1.0")
    p.add_argument("--bg", default="black", help="Couleur de fond (repli). Defaut: black")
    p.add_argument("--fg", default="white", help="Couleur du texte. Defaut: white")
    p.add_argument("--blur", type=float, default=6.0, help="Rayon du flou. Defaut: 6")
    p.add_argument("--dim", type=float, default=0.5,
                   help="Luminosite du fond (0 = noir, 1 = inchange). Defaut: 0.5")
    p.add_argument("--fond", default=None,
                   help="Image de capture deja prise (fournie par lock.sh). "
                        "Sans cette option, le script capture lui-meme l'ecran.")
    p.add_argument("--timeout", type=int, default=None,
                   help="Ferme l'affichage apres N secondes (tests uniquement)")
    return p.parse_args(argv)


if __name__ == "__main__":
    args = parse_args()
    regler_locale()
    # La capture se fait AVANT la création de la fenêtre Tkinter.
    # Si on attendait après, on photographierait notre propre écran noir.
    fond = preparer_fond(args.fond, args.blur, args.dim)
    ScreenOverlay(alpha=args.alpha, bg_color=args.bg, fg_color=args.fg,
                  fond=fond, timeout=args.timeout)