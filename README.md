# Projet lockscreen

**But** : écran de verrouillage transparent pour Linux, qui ne se déverrouille
pas au clavier/souris. L'utilisateur tape son mot de passe, l'outil ne le lit
ni ne le stocke.

**Branche** : `lockscreen`

## Avancement

### Ranya
- À faire : ...

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

### Betul
- ...

### Souleymane

- ...