"""
Ecran de verrouillage transparent pour Linux
---------------------------------------------------------------------------

Dependances :
    - python3 ('sudo apt install python3')
    - tkinter ('sudo apt install python3-tk')
    - pillow ('sudo apt install python3-pil python3-pil.imagetk')

Utilisation :
    python3 screensaver_overlay.py --timeout 10
    python3 screensaver_overlay.py --fg white --bg black --timeout 10
"""

import argparse
import tkinter as tk
from PIL import ImageEnhance, ImageFilter, ImageGrab, ImageTk
from datetime import datetime


def capture_fond(flou=6, luminosite=0.5):
    img = ImageGrab.grab()                          # photo du bureau
    img = img.filter(ImageFilter.GaussianBlur(flou))
    return ImageEnhance.Brightness(img).enhance(luminosite)


class ScreenOverlay:
    def __init__(self, alpha=1.0, bg_color="black", fg_color="white", fond=None, timeout=None):
        self.root = tk.Tk()
        self.root.attributes("-fullscreen", True)
        self.root.attributes("-topmost", True)

        try:
            self.root.attributes("-alpha", alpha)
        except tk.TclError:
            pass

        self.root.configure(bg=bg_color)
        self.root.config(cursor="none")

        self.root.protocol("WM_DELETE_WINDOW", lambda: None)

        w = self.root.winfo_screenwidth()
        h = self.root.winfo_screenheight()

        self.canvas = tk.Canvas(self.root, bg=bg_color, highlightthickness=0)
        self.canvas.pack(fill="both", expand=True)

        if fond is not None:
            self.photo = ImageTk.PhotoImage(fond.resize((w, h)))   # garder la reference
            self.canvas.create_image(0, 0, image=self.photo, anchor="nw")

        self.clock = self.canvas.create_text(
            w // 2, h // 2, fill=fg_color, font=("DejaVu Sans", 90, "bold"))
        self.date = self.canvas.create_text(
            w // 2, h // 2 + 100, fill=fg_color, font=("DejaVu Sans", 28))

        if timeout:
            self.root.after(timeout * 1000, self.close)

        self.update_clock()
        self.root.focus_force()
        self.root.mainloop()

    def update_clock(self):
        now = datetime.now()
        self.canvas.itemconfig(self.clock, text=now.strftime("%H:%M:%S"))
        self.canvas.itemconfig(self.date, text=now.strftime("%A %d %B %Y").capitalize())
        self.root.after(1000, self.update_clock)

    def close(self, event=None):
        self.root.destroy()


def parse_args():
    parser = argparse.ArgumentParser(description="Ecran de verrouillage transparent pour Linux")
    parser.add_argument("--alpha", type=float, default=1.0,
                        help="Opacite de la fenetre (necessite un compositeur sous Linux). Defaut: 1.0")
    parser.add_argument("--bg", type=str, default="black", help="Couleur de fond. Defaut: black")
    parser.add_argument("--fg", type=str, default="white", help="Couleur du texte. Defaut: white")
    parser.add_argument("--timeout", type=int, default=None,
                        help="Ferme l'ecran apres N secondes (pour les tests)")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    try:
        fond = capture_fond()      # AVANT la creation de la fenetre
    except Exception:
        fond = None                # repli : fond uni
    ScreenOverlay(alpha=args.alpha, bg_color=args.bg, fg_color=args.fg,
                  fond=fond, timeout=args.timeout)