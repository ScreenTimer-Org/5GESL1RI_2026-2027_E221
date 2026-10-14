# Installation et lancement du Lockscreen sur Kali Linux

## 1. Objectif

Ce document explique comment installer et utiliser notre écran de verrouillage sur Kali Linux.

Le programme permet de verrouiller l'ordinateur tout en gardant le bureau visible en direct. Par exemple, une vidéo peut continuer à jouer pendant le verrouillage.

Le clavier et la souris restent bloqués. Le déverrouillage nécessite le mot de passe de l'utilisateur.

## 2. Prérequis

Pour utiliser le programme, il faut :

- VirtualBox installé sur l'ordinateur.
- Une machine virtuelle Kali Linux.
- Une session X11.
- Une connexion Internet pour télécharger les dépendances.
- Un compte utilisateur avec un mot de passe.

## 3. Installation de Kali Linux

1. Télécharger et installer [VirtualBox](https://www.virtualbox.org/wiki/Downloads).
2. Aller sur le site officiel de [Kali Linux](https://www.kali.org/get-kali/#kali-virtual-machines).
3. Télécharger l'image Kali Linux pour VirtualBox.
4. Extraire l'archive téléchargée.
5. Ouvrir le fichier `.vbox` avec VirtualBox.
6. Démarrer la machine virtuelle Kali Linux.

## 4. Vérification de la session X11

Ouvrir un terminal dans Kali Linux et exécuter :

```bash
echo $XDG_SESSION_TYPE
```

Le résultat doit être `x11`, car le programme ne fonctionne pas sous Wayland.

## 5. Récupération du projet

Installer Git si nécessaire :

```bash
sudo apt update
sudo apt install git
```

Cloner le dépôt GitLab :

```bash
git clone URL_DU_DEPOT
```

Remplacer `URL_DU_DEPOT` par l'adresse du dépôt GitLab du projet.

Se placer dans le dossier `lockscreen` :

```bash
cd NOM_DU_DEPOT/lockscreen
```

## 6. Installation des dépendances

Donner les droits d'exécution au script :

```bash
chmod +x install_dependencies.sh
```

Lancer l'installation :

```bash
./install_dependencies.sh
```

## 7. Lancement du programme

Donner les droits d'exécution aux scripts :

```bash
chmod +x lock.sh saver.sh
```

Lancer le verrouillage :

```bash
./lock.sh
```

Le bureau reste visible, mais le clavier et la souris sont bloqués.

Pour déverrouiller la session, entrer le mot de passe de l'utilisateur.