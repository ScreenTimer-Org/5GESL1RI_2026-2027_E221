# Projet lockscreen

**But** : écran de verrouillage transparent pour Linux, qui ne se déverrouille
pas au clavier/souris. L'utilisateur tape son mot de passe, l'outil ne le lit
ni ne le stocke.

**Branche** : `lockscreen`

## Avancement

### Ranya
- 2026-10-01 : création et test de "install.sh" sur Ubuntu
dans une VM VMware, avec le bureau GNOME et une session X11.
- installation des dépendances réussie.
- Fond flouté et horloge affichés.
- La souris et les touche simple ne déverouillent pas l'écran
- Mauvais mdp refusé et bon mdp accepté
- vérification aprés déverrouillage :aucun dossier temporaire.
- Point 11 et 14 réalisés.
**Reste à faire**

1. Ajouter la locale `fr_FR.UTF-8` dans `install.sh`.
2. Pipeline GitLab (point 13).
3. Documentation d'utilisation (point 15).
4. Retirer `--timeout` et faire la merge request vers `main` (point 17).

**IA utilisée** :
- ChatGPT (OpenAI), 2026-10-01, pour la création de `install.sh`. Conversation conservée.
- Claude (Anthropic, Sonnet 5.5), 2026-10-02, pour la relecture de `install.sh` et du README. Conversation conservée.

### Aurélien
- 2026-09-30 : création de la branche, ajout du prototype `screensaver_overlay.py`
- Analyse du script : c'est un écran de veille (heure + date), pas un écran de verrouillage. Il se ferme au moindre clavier/clic, il n'a pas d'authentification, et `--alpha` ne marche pas sous Linux (info de Zackary).
- Test sous Windows 11 / Python 3.14 : Tkinter OK, transparence `-alpha` fonctionnelle (elle exige un compositeur sous Linux, donc ce test ne valide rien pour la cible), date affichée en anglais.
- Rédaction d'un plan technique (`CAHIER_DES_CHARGES.md`) : étapes de développement, verrouillage délégué à xsecurelock, blocs de travail répartissables.
- Installation d'une VM Linux sous VirtualBox pour tester sur la vraie plateforme cible.
- Accès au dépôt depuis la VM : clone via un token d'accès en lecture seule, puis `git checkout lockscreen`.
- Test du script existant sur la VM : il s'affiche et se lance correctement. 
- Modification 1 : suppression des `bind` clavier/souris, ajout de `--timeout N` (garde-fou de test).
- Modification 2 : remplacement de `--alpha` par une capture du bureau (Pillow), floutée et assombrie, affichée dans un `Canvas` avec l'horloge par-dessus. Repli en fond uni si la capture échoue. Test Windows OK.
- **Pas encore testé sur la VM** : fond flouté, à valider (session X11 ou Wayland ?).

**2026-10-11**
- Recherche transparence en temps réel (sans capture d'écran) pour répondre à
  la demande du client de voir le bureau en direct (vidéo, jeu, etc.) derrière
  l'écran de verrouillage.
- Tests effectués sur VM Debian : GNOME natif, puis installation et test sous
  XFCE avec compositeur activé manuellement (xfconf-query).
- Diagnostic : rendu matériel disponible (glxinfo: direct rendering = Yes),
  mais transparence reste bloquée même en isolant Tkinter seul, hors script et
  hors xsecurelock.
- Cause identifiée avec Zackary : xsecurelock bloque volontairement la
  composition sur sa fenêtre (protection de sécurité par défaut).
- Test des variables officielles xsecurelock (XSECURELOCK_NO_COMPOSITE,
  XSECURELOCK_DIM_OVERRIDE_COMPOSITOR_DETECTION) : toujours opaque, testé en
  parallèle sur ma VM et sur le Linux natif de Zackary.
- Installation de picom, VirtualBox Guest Additions : sans effet, écarté.
- Zackary a ensuite trouvé une piste fonctionnelle de son côté (fond visible
  en direct avec xsecurelock), à valider avant de merger.


**Reste à faire**
1. Tester le fond flouté sur la VM (`echo $XDG_SESSION_TYPE`, puis `python3 lockscreen/screensaver_overlay.py --timeout 10`).
2. Date en français (noms de jours et de mois écrits en dur dans le script).
3. Vrai verrouillage avec mot de passe via xsecurelock (X11 obligatoire).
4. Scripts `lock.sh`, `saver.sh`, `install.sh`.
5. README du dossier `lockscreen/`, tests, pipeline GitLab.

**IA utilisée** : Claude (Anthropic, Sonnet 5.5), 2026-09-30, pour l'analyse du script, le plan technique et les commandes Git. Conversation conservée.

### Zackary
- 2026-09-30 : lecture du plan et du script.
- `screensaver_overlay.py` : ajout de `--blur`, `--dim`, `--fond`, repli `scrot`, et mode embarqué (attache à `XSCREENSAVER_WINDOW`, sinon plein écran normal).
- `lock.sh` : vérifie dépendances et X11, capture le bureau AVANT xsecurelock (dossier `/tmp` en droits 700, supprimé par `trap`), lance xsecurelock. `--timeout N` tue xsecurelock (sécurité de test, à retirer à la fin).
- `saver.sh` : lance le script Python pour xsecurelock. Il lit le chemin de la capture dans `LOCKSCREEN_FOND` et le passe à `--fond`.
- **Interface à retenir** : la capture est prise par `lock.sh` (pas par le script Python) et n'est jamais supprimée par ce dernier. `install.sh` devra installer `python3 python3-tk python3-pil python3-pil.imagetk xsecurelock scrot x11-utils` (`xwininfo`), plus la locale `fr_FR.UTF-8`.
- Tests sur VM Linux Mint (X11) : affichage seul OK, verrouillage xsecurelock OK, mot de passe OK, rien ne reste dans `/tmp` OK.
- Bug corrigé : image toute petite en haut à gauche. En mode embarqué Tk ne suit pas la taille de la fenêtre de xsecurelock (canvas à 378x264 par défaut). Correctif : taille lue avec `xwininfo -id $XSCREENSAVER_WINDOW`, repli sur la taille de l'écran.
- **Limites connues** : Ctrl+Alt+F1 ouvre une console texte. Wayland non supporté (`lock.sh` s'arrête avec un message). Plusieurs écrans non gérés (fond risque d'être déformé).
- Debug : `LOCKSCREEN_DEBUG=1` affiche la taille de fenêtre reçue par le saver.

**Reste à faire**
1. `--message`, `--logo`.
2. Test avec plusieurs écrans, plus de distributions Linux ?
3. Script `install.sh` et retirer `--timeout s` quand tout est ok.
4. Documentation d'utilisation clair, pipeline GitLab.

**IA utilisée** : Claude (Anthropic, Sonnet 5.5), 2026-09-30, pour l'analyse du plan, pour plus d'information sur le fonctionnement des différents outils utilisé et le diagnostic des bugs d'affichage. Conversation conservée.

**2026-10-11**
- Demande du client : l'écran doit rester visible **en direct** (vidéo, jeu) pendant le verrouillage, et la boîte de mot de passe n'apparaît qu'à l'appui d'une touche.
- Principe retenu : on garde xsecurelock (capture clavier/souris + PAM) mais on rend sa fenêtre de couverture noire (`background`) **transparente avec l'extension X11 XShape**. Le vrai bureau est visible, pas une capture.
  - Au repos : forme vide, donc fenêtre invisible (elle garde ses captures d'entrée, rien n'atteint les applications).
  - Touche pressée : xsecurelock affiche sa fenêtre `auth`. On découpe dans `background` uniquement le rectangle de cette boîte ; le reste du bureau continue d'être animé.
- Pourquoi l'ancienne approche (Tk + `-alpha` dans le saver) ne pouvait pas marcher : le saver est dessiné dans une fenêtre enfant de `background`, qui est noire et opaque. Le shape agit sur `background` elle-même.
- Sécurité "fail closed" : si le script plante, `background` redevient entièrement noire (écran noir, jamais déverrouillé). Le mot de passe reste vérifié par xsecurelock/PAM, rien n'est lu ni stocké par nos scripts.

**Changements dans les fichiers**
- `screensaver_overlay.py` **supprimé**, remplacé par `transparent_saver.py` (python3-xlib). Il remonte de `XSCREENSAVER_WINDOW` jusqu'à la fenêtre `background`, applique la forme vide, puis surveille l'apparition de `auth` / `auth_x11_screen` pour ne laisser visible que leur rectangle.
- `saver.sh` : simplifié, lance seulement `transparent_saver.py`.
- `lock.sh` : réécrit en fonctions.
  - Plus de capture d'écran (`scrot`, `LOCKSCREEN_FOND`, dossier `/tmp` et `trap`) : devenu inutile.
  - Détecte un compositeur actif (propriétaire de `_NET_WM_CM_S0`) : avec compositeur `XSECURELOCK_NO_COMPOSITE=0`, sans compositeur `=1` (sinon la fenêtre overlay de xsecurelock reste noire et opaque).
  - `XSECURELOCK_COMPOSITE_OBSCURER=0` (la fenêtre blanche de sécurité serait visible à travers la couverture transparente) et `XSECURELOCK_BLANK_TIMEOUT=-1` (pas d'extinction DPMS).
  - Filtre les messages de diagnostic inoffensifs de xsecurelock (« Someone overlapped… », « MaybeRaiseWindow miss… », « auth child failed »…). Les vraies erreurs restent affichées.
  - Minimise le terminal au lancement (`xdotool`) et le réaffiche au déverrouillage.
  - `--timeout N` conservé (test uniquement).
- `install.sh` : dépendances = `python3 python3-xlib xsecurelock xdotool coreutils`. Retirés : `python3-tk`, `python3-pil`, `python3-pil.imagetk`, `scrot`, `x11-utils`. Fins de ligne passées de CRLF à LF.
- `README.md` du dossier `lockscreen/` ajouté.

**Tests (Kali, Debian et Mint)**
- Touche : seule la boîte de mot de passe apparaît, le reste continue de bouger. Échap : retour au tout transparent.
- Mauvais mot de passe refusé, bon mot de passe accepté (utilisateur de test, vrai PAM).
- Sortie console vide pendant un cycle complet.

**Limites connues**
- On peut regarder le bureau mais pas cliquer dessus (entrées capturées).
- Un mouvement de souris ou un clic affiche aussi la boîte de mot de passe, pas seulement une touche : comportement interne de xsecurelock, non configurable.
- Ctrl+Alt+F1 ouvre toujours une console texte. Wayland non supporté.

**Impact sur le reste du groupe**
- Fond flouté, horloge, date en français, `--blur`, `--dim`, `--fond`, `--message`, `--logo` : n'existent plus. La locale `fr_FR.UTF-8` n'est plus nécessaire dans `install.sh`.
- L'interface « la capture est prise par `lock.sh` et passée via `LOCKSCREEN_FOND` » n'est plus d'actualité.

**IA utilisée** : Claude (Anthropic, Sonnet 5.5), 2026-10-11, pour la modification du projet (saver transparent XShape), le nettoyage du code et l'explication du fonctionnement. Conversation conservée.

### Betul
- ...

### Souleymane

- ...

