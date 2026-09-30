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
- Aucune modification du code pour l'instant.

**Prochaines étapes**
1. Retirer la fermeture au clavier/souris et ajouter `--timeout`.
2. Remplacer `-alpha` par un fond capturé et flouté.
3. Date en français.
4. Verrouillage réel avec xsecurelock (test en VM, session X11).

**IA utilisée** : Claude (Anthropic, Sonnet 5.5), 2026-09-30, pour l'analyse du script, le plan technique et les commandes Git. Conversation conservée.

### Betul
- ...

### Souleymane

- ...