#!/usr/bin/env bash
# Installation pour Debian/Ubuntu.
# Arrêter le script si une commande échoue.
set -e

# Se placer dans le dossier contenant install.sh.
cd "$(dirname "$0")"

# Vérifier que la session est en X11.
if [ "${XDG_SESSION_TYPE:-}" != "x11" ]; then
    echo "Erreur : utilise une session X11, par exemple Debian XFCE."
    exit 1
fi

# Vérifier la présence d'une session graphique.
if [ -z "${DISPLAY:-}" ]; then
    echo "Erreur : aucune session graphique X11 détectée."
    exit 1
fi

# Vérifier les outils nécessaires pour installer les paquets.
for commande in apt sudo; do
    if ! command -v "$commande" >/dev/null 2>&1; then
        echo "Erreur : la commande $commande est nécessaire."
        exit 1
    fi
done

# Vérifier que les fichiers du projet sont présents.
for fichier in lock.sh saver.sh screensaver_overlay.py; do
    if [ ! -f "$fichier" ]; then
        echo "Erreur : le fichier $fichier est manquant."
        exit 1
    fi
done

# Actualiser la liste des paquets disponibles.
sudo apt update

# Installer les dépendances.
# picom est le compositeur : c'est lui qui rend l'écran translucide pour
# laisser voir le bureau en direct derrière.
sudo apt install -y \
    python3 \
    python3-tk \
    xsecurelock \
    x11-utils \
    picom \
    coreutils

# Vérifier que les commandes du projet sont disponibles.
for commande in python3 xsecurelock xwininfo timeout; do
    if ! command -v "$commande" >/dev/null 2>&1; then
        echo "Erreur : la commande $commande est manquante."
        exit 1
    fi
done

# Vérifier la bibliothèque Python nécessaire à l'affichage.
if ! python3 -c "import tkinter"; then
    echo "Erreur : le module tkinter est manquant."
    exit 1
fi

# Rendre les scripts de lancement exécutables.
chmod +x lock.sh saver.sh

echo "Installation terminée."
echo "Tu peux maintenant lancer ./lock.sh depuis ce dossier."
echo "Pour la transparence, picom doit tourner (par exemple : picom &)."