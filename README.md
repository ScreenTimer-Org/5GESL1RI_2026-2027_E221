# Projet lockscreen

**But** : écran de verrouillage transparent pour Linux, qui ne se déverrouille
pas au clavier/souris. L'utilisateur tape son mot de passe, l'outil ne le lit
ni ne le stocke.

**Branche** : `lockscreen`

## Avancement

### Ranya
- À faire : ...

### Zackary
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

### Betul
- ...

### Souleymane

- ...