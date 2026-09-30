"""
Ecran de veille transparent pour Linux
---------------------------------------------------------------------------

Dependances :
    - python3 ('sudo apt install python3')
    - tkinter ('sudo apt install python3-tk')

Utilisation :
    python3 screensaver_overlay.py
    python3 screensaver_overlay.py --alpha 0.6 --fg white --bg black (alpha ne fonctionne pas pour l'instant)
"""

import argparse
import tkinter as tk
from datetime import datetime


class ScreenOverlay:
    def __init__(self, alpha=0.75, bg_color="black", fg_color="white"):
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

        self.clock_label = tk.Label(
            self.root, font=("DejaVu Sans", 90, "bold"),
            fg=fg_color, bg=bg_color
        )
        self.clock_label.pack(expand=True)

        self.date_label = tk.Label(
            self.root, font=("DejaVu Sans", 28),
            fg=fg_color, bg=bg_color
        )
        self.date_label.pack(pady=(0, 60))

        self.root.bind("<Key>", self.close)
        self.root.bind("<Button>", self.close)

        self.update_clock()
        self.root.focus_force()
        self.root.mainloop()

    def update_clock(self):
        now = datetime.now()
        self.clock_label.config(text=now.strftime("%H:%M:%S"))
        self.date_label.config(text=now.strftime("%A %d %B %Y").capitalize())
        self.root.after(1000, self.update_clock)

    def close(self, event=None):
        self.root.destroy()


def parse_args():
    parser = argparse.ArgumentParser(description="Ecran de veille transparent pour Linux")
    parser.add_argument("--alpha", type=float, default=0.75,
                         help="Opacite de l'overlay entre 0 (invisible) et 1 (opaque). Defaut: 0.75")
    parser.add_argument("--bg", type=str, default="black", help="Couleur de fond. Defaut: black")
    parser.add_argument("--fg", type=str, default="white", help="Couleur du texte. Defaut: white")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    ScreenOverlay(alpha=args.alpha, bg_color=args.bg, fg_color=args.fg)
