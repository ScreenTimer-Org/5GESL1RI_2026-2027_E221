# Rapport technique — Branche `qr-code`
 
**Projet :** QR Code Examen — Gestion de présence
**Fichiers couverts :** `index.html`, `style.css`, `script.js`

 
## 1. Objectif du module
 
Permettre au professeur de taper le matricule d'un étudiant, de voir immédiatement s'il est autorisé (vert) ou non (rouge), et de suivre les événements de la séance (début, fin, passage aux toilettes, suspicion de triche) dans un historique consultable.
 

## 2. `index.html` — Structure
 
- Un `<header>` avec le titre de la page.
- Un `<main>` contenant 4 blocs (`<section class="bloc">`) :
  - `#bloc-matricule` : formulaire `#form-matricule` avec un champ `#matricule` et un bouton "Valider".
  - `#bloc-statut` : un paragraphe `#statut-etudiant` qui affiche "Autorisé" ou "Non autorisé".
  - `#bloc-horaires` : 4 boutons (`#btn-debut`, `#btn-fin`, `#btn-toilette`, `#btn-triche`).
  - `#bloc-historique` : un tableau `#tableau-historique` avec les colonnes Matricule, Heure Debut, Heure Fin, Toilette, Triche.
- Un `<footer>` avec le nom du projet.
- Le fichier charge `style.css` dans le `<head>` et `script.js` juste avant la fermeture de `</body>`.


## 3. `style.css` — Mise en forme
 
- Mise en page générale en `flex` (les 4 blocs s'alignent côte à côte et passent à la ligne sur petit écran).
- Chaque bloc (`.bloc`) a un fond blanc, des coins arrondis et un padding.
- `#bloc-historique` est élargi à 400px pour laisser de la place au tableau.
- Le tableau (`table`, `th`, `td`) a des bordures nettes, un padding, un texte centré, et un fond gris-bleu clair sur les en-têtes.

## 4. `script.js` — État fonctionnel actuel
 
| Fonctionnalité | Statut |
|-----------------|--------|
| Saisie et validation du matricule | Fonctionnel |
| Affichage vert (autorisé) / rouge (non autorisé) | Fonctionnel |
| Boutons horaires (début, fin, toilette, triche) | Fonctionnel |
| Historique mis à jour dynamiquement | Fonctionnel |
| Style du tableau historique | Fonctionnel |
 

### Variables globales

- `matricule` : matricule actuellement validé (vide par défaut).
- `statutActuel` : booléen, vrai si le dernier matricule validé est autorisé.
- `matriculesAutorises` : liste des matricules valides (exemple, à remplacer par la vraie liste).
- `historique` : objet qui stocke, par matricule, les heures de début/fin et les statuts toilette/triche.


### Fonctions

- `initMatricule()` : écoute la soumission du formulaire, vérifie le matricule, appelle `afficherStatut()` et ajoute une ligne à l'historique si autorisé.
- `initHoraires()` : écoute les 4 boutons horaires ; chaque clic est bloqué si aucun matricule n'est validé ou si le dernier matricule est refusé.
- `logEvent(matricule, typeEvenement, heure)` : met à jour l'objet `historique` et redessine le tableau.
- `afficherHistorique()` : reconstruit le tableau HTML à partir de l'objet `historique`.
- `afficherStatut(autorise)` : met à jour `statutActuel` et affiche "Autorisé"/"Non autorisé" en vert/rouge.


### Bugs identifiés et corrigés en cours d'intégration
 
1. **Matricule de test codé en dur** — `let matricule = '65243';` provoquait l'enregistrement d'événements sous un matricule factice si un bouton horaire était cliqué avant toute validation. → Corrigé : valeur initialisée à vide (`''`).
2. **Boutons horaires actifs sans matricule validé** — ajout d'une vérification bloquante (`if (!matricule) { ... }`) avant chaque action.
3. **Boutons horaires actifs même pour un matricule refusé** — ajout de `statutActuel`, qui bloque les 4 boutons tant que l'étudiant n'est pas autorisé.
4. **Un matricule refusé apparaissait quand même dans l'historique** — `logEvent()` n'est désormais appelé qu'en cas de matricule autorisé lors de la soumission du formulaire.


## 5. Reste à faire
 
- [ ] Remplacer la liste `matriculesAutorises` d'exemple par la vraie liste communiquée par les responsables
- [ ] Tests finaux avec plusieurs matricules à la suite (autorisés et refusés)
- [ ] Vérification de l'affichage sur petit écran / autre navigateur si le temps le permet
