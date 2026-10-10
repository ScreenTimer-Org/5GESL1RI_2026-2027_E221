# Rapport technique 
 
**Projet :** QR Code Examen — Gestion de présence
 
 
## Objectif du module
 
Permettre au professeur de taper le matricule d'un étudiant, de voir immédiatement s'il est autorisé (vert) ou non (rouge), et de suivre les événements de la séance (début, fin, passage aux toilettes, suspicion de triche) dans un historique consultable.
 

## Lancer le projet

Le fichier pae_etudiants.csv est lu par JavaScript, ce qui ne marche pas si on
ouvre index.html par double-clic.

1. Ouvrir le dossier du projet dans VS Code.
2. Installer l'extension Live Server.
3. Cliquer sur « Go Live » en bas à droite.
 

## Fichiers du projet 

- index.html : la structure de la page.
- style.css : la mise en forme.
- script.js : tout le fonctionnement.
- pae_etudiants.csv : le PAE du groupe. Une ligne par étudiant : son matricule,
  une virgule, puis ses cours séparés par le caractère |.
- photos/ : une photo par étudiant, nommée avec le matricule (exemple : 65717.jpg)
 

## Fonctionnement en bref

1. Au chargement, la page lit le PAE et remplit le menu avec les cours trouvés.
2. Le professeur choisit le cours, tape le matricule et clique sur Valider.
3. Si le matricule est inscrit à ce cours : statut vert et photo affichée.
   1re validation : heure de début. 2e validation : heure de fin.
   3e validation : message « Cet étudiant est déjà sorti ».
4. Sinon : statut rouge, photo effacée, rien n'est enregistré.
5. Les boutons Toilette et Triche notent l'événement pour l'étudiant en cours,
   tant qu'il n'est pas sorti.
6. L'historique est affiché dans un tableau, sauvegardé dans le navigateur
   (un historique par cours) et exportable en CSV.


## index.html

Cinq blocs : Matricule (menu du cours, champ matricule, bouton Valider), Statut,
Étudiant (photo et matricule), Horaires (boutons Toilette et Triche) et
Historique (tableau et bouton Exporter en CSV).


## style.css

Les blocs s'alignent avec flex et passent à la ligne sur petit écran. Le tableau
a des bordures et des titres en bleu clair. Le bloc étudiant centre la photo
(120 x 150 pixels) et la cache tant qu'aucun étudiant n'est affiché.


## script.js

### Variables globales

- matricule : le dernier matricule validé.
- statutActuel : vrai si ce matricule est autorisé.
- coursExamen : le cours choisi par le professeur.
- listeEtudiants : la liste lue dans le CSV (un matricule et la liste de ses cours).
- historique : les fiches des étudiants du cours en cours (début, fin, toilette, triche).

### Lecture du PAE (Responsable : Maxime)

- chargerListe() : lit pae_etudiants.csv avec fetch, ignore la première ligne et
  les lignes vides, puis remplit listeEtudiants. Affiche un message si le fichier
  ne peut pas être chargé.
- trouverEtudiant(matricule, cours) : renvoie l'étudiant si ce matricule existe et
  que son PAE contient ce cours, sinon null.
- remplirMenuCours() : remplit le menu avec chaque cours du fichier, une seule fois,
  dans l'ordre alphabétique.

### Formulaire et statut (Responsable : Maxime)

- initMatricule() : à la validation du formulaire, récupère le cours et le matricule,
  vérifie avec trouverEtudiant(), puis appelle afficherStatut() et traiterScan().
  Quand on change de cours dans le menu, elle charge l'historique de ce cours et
  remet l'étudiant à zéro.
- afficherStatut(autorise) : affiche « Autorisé » en vert ou « Non autorisé » en rouge.

### Scan, début et fin (Responsable : Sila)

- traiterScan(matricule, cours, autorise) : si l'étudiant est refusé, elle vide le
  bloc étudiant. S'il est autorisé, elle affiche sa photo puis enregistre le début
  (1re fois) ou la fin (2e fois). À la 3e fois, elle affiche « déjà sorti ».

### Toilette et triche (Responsable : Sila)

- initHoraires() : relie les boutons Toilette et Triche. Chaque clic enregistre
  l'heure pour l'étudiant en cours.
- peutModifier() : refuse l'action si aucun étudiant autorisé n'est validé, ou si
  l'étudiant est déjà sorti (sa fiche est fermée).

### Historique (Responsable : Sila)

- logEvent(matricule, typeEvenement, heure) : crée la fiche de l'étudiant
  si besoin, y note l'événement (Debut, Fin, Toilette ou Triche), sauvegarde et
  redessine le tableau.
- afficherHistorique() : reconstruit le tableau à partir de l'objet historique.

### Sauvegarde et export (Responsable : Van Vo)

- cleHistorique(cours) : donne le nom sous lequel l'historique d'un cours est rangé
  dans le navigateur.
- sauvegarderHistorique(cours, historique) : enregistre l'historique dans le localStorage.
- chargerHistorique(cours) : relit l'historique d'un cours, ou renvoie un historique
  vide s'il n'existe pas.
- exporterCSV(cours) : télécharge le fichier historique-COURS.csv.
- Au chargement de la page, le dernier cours utilisé est remis dans le menu et son
  historique est réaffiché.

### Bloc étudiant (Responsable : Jaouad)

- afficherEleve(etudiant) : affiche la photo (photos/matricule.jpg) et le matricule.
- viderEleve() : cache la photo et efface le matricule.
- afficherPhotoParDefaut() : affiche une photo de secours si la photo est introuvable.


## Tests effectués

1. Cours 5ASR1R et matricule 65717 : vert, photo, heure de début.
2. Même validation une 2e fois : heure de fin. Une 3e fois : « déjà sorti ».
3. Cours 3ALG3A avec le même matricule : rouge, photo effacée, rien enregistré.
4. Toilette et Triche : « Oui » dans le tableau, puis bloqués après la sortie.
5. Export CSV : le fichier se télécharge avec les lignes de l'historique.
6. Rechargement de la page : le cours et l'historique reviennent.
 

## Limites et suite

- L'historique est gardé dans le navigateur du professeur, pas dans une base de
  données partagée entre plusieurs ordinateurs ou locaux.
- Le matricule est tapé à la main : la lecture du QR code par caméra reste à faire.
- Le PAE ne contient pas les noms : seuls la photo et le matricule sont affichés.
- Les photos sont fictives.