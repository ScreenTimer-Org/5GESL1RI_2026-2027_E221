# Screen Timer

Écran de minuterie pour les examens (et les pauses de cours). Chaque local affiche son propre
compte à rebours, et **la FAQ est commune à tous les locaux qui passent la même épreuve** :
les profs notent les questions des élèves et leurs réponses dans un pad Etherpad dont ils s'échangent le lien,
et tous les écrans se mettent à jour en quelques secondes.

Inspiré de [ExamHours](https://horaires.esi-bru.be/ExamHours/).

## Démarrage (en local)

```bash
python3 server.py
```

Puis ouvrir <http://localhost:8000>. Le panneau de configuration s'ouvre automatiquement.

`server.py` n'utilise que la bibliothèque standard de Python : il n'y a rien à installer.
Sans lui (par exemple en double-cliquant sur `index.html`), le minuteur fonctionne, mais pas la FAQ.

---

## Comment ça marche

```
    Profs                         Serveur (server.py)                  Écrans des locaux
 ┌──────────────────┐   lit   ┌─────────────────────────┐   lit    ┌──────────────────────┐
 │ pad Etherpad     │ ◄────── │ 1 lecture du pad / 10 s │ ◄─────── │ L408, A014, B120 ... │
 │ (lien partagé    │  /10 s  │ (cache partagé par tous │  /10 s   │ lien surveillants    │
 │  entre profs)    │         │  les écrans)            │          │ ?…&faq=<id>          │
 └──────────────────┘         └─────────────────────────┘          └──────────────────────┘
```

- Les profs écrivent la FAQ dans un **pad Etherpad** (par défaut sur framapad), un document modifiable à plusieurs.
  Le titulaire **envoie le lien du pad aux autres profs**, c'est tout.
- C'est **le serveur** qui lit le pad, pas chaque écran. Quel que soit le nombre de locaux, framapad ne reçoit
  qu'une lecture toutes les 10 s (il bloque au-delà d'une dizaine de lectures par minute et demie).
- Le lien des surveillants ne contient que l'identifiant `faq=<id>`, jamais le lien du pad. Un élève qui voit
  l'écran ne peut donc pas modifier la FAQ.

## Guide du titulaire (préparer l'épreuve)

1. Ouvrir la page (<http://localhost:8000>).
2. Remplir **Épreuve** (titre, mnémonique, début, fin, sortie autorisée) et **Consignes**.
3. Dans **FAQ partagée**, cliquer **Créer un nouveau pad**. Il est créé sur `quotidien.framapad.org` (effacé après
   24 h d'inactivité) et s'ouvre dans un nouvel onglet. Pour un pad existant, coller son lien puis cliquer **Utiliser ce lien**.
4. **Copier** le lien du pad et l'envoyer aux profs de l'épreuve.
5. Copier le **lien à partager aux surveillants** et l'envoyer aux surveillants.

Le panneau indique si le pad est bien lu (« ✓ Pad lu à 13:54 · 3 questions ») ou pourquoi il ne l'est pas.

## Guide prof : écrire dans le pad

Une question par paragraphe : la **1re ligne, terminée par « ? »**, est la question, et les lignes suivantes forment la
réponse. Laisser une ligne vide entre deux questions.

```text
Peut-on utiliser une calculatrice ?
Non.

Question 3 : faut-il gérer une liste vide ?
Oui, renvoyez **0**.
```

- On peut écrire la question tout de suite et la réponse plus tard. En attendant, l'écran affiche « Réponse à venir ».
- La réponse accepte le Markdown (`**gras**`, `- liste`) et plusieurs paragraphes.
- Le texte d'accueil du pad est ignoré. Les préfixes `Q:` / `R:` sont aussi acceptés.
- Les écrans affichent chaque nouveauté immédiatement, avec un badge pendant 5 minutes :
  **Nouveau**, **Réponse** (réponse ajoutée) ou **Mis à jour**.

## Guide surveillant (dans le local)

1. Ouvrir le lien reçu sur le PC du local, puis appuyer sur **F** pour passer en plein écran.
2. Appuyer sur **C** (ou cliquer) pour ouvrir la configuration si besoin :
   - **Nom du local** (affiché dans le bandeau),
   - **Décalage de l'horloge** si l'heure du PC est fausse,
   - **Zoom** selon la taille de l'écran,
   - n'importe quel autre réglage (par exemple l'heure de fin + 15 min pour un tiers-temps).

Les modifications faites dans un local sont marquées « modifié ici ✕ » : cliquer dessus pour revenir à la valeur partagée.
Elles restent sur ce PC et ne changent rien dans les autres locaux.

Raccourcis : `C` configurer · `F` plein écran · `←` `→` parcourir la FAQ · `Échap` fermer le panneau.

---

## Paramètres du lien

| Paramètre | Défaut | Description |
|---|---|---|
| `title` | `Examen` | Titre de l'épreuve |
| `code` | | Mnémonique du cours (badge) |
| `mode` | `exam` | `exam` ou `break` (pause de cours) |
| `start` / `end` | | Heures de début et de fin `HH:MM` |
| `leave` | | Sortie autorisée à partir de `HH:MM` |
| `consignes` | 3 consignes | Consignes en Markdown |
| `faq` | | Identifiant de la FAQ partagée (créé par le panneau) |
| `logo` | `assets/logo-esi.png` | Logo (chemin, URL http(s) ou `data:image`) |
| `theme` | `light` | `light` ou `dark` |
| `seconds` | `0` | `1` pour afficher les secondes |
| `room`, `offset`, `zoom` | | Nom du local, décalage de l'horloge (minutes), zoom *(propres au local, exclus du lien de partage)* |

Priorité (le dernier gagne) : valeurs par défaut → lien partagé → modifications du local.

---

## Architecture

```
server.py          serveur : fichiers statiques + 2 routes API + lecture des pads avec cache
index.html         l'écran et son panneau de configuration
css/style.css      styles (écran en unités cqmin : s'adapte à toute taille d'écran)

js/  (JavaScript sans build ni dépendance ; chaque module s'enregistre dans window.ST)
  markdown.js      ┐
  faq.js           │ modules purs, sans DOM, testés : Markdown sûr, lecture du pad,
  timer.js         │ calculs horaires, configuration (lien + modifications du local)
  config.js        ┘
  screen.js        dessine l'écran (compte à rebours, consignes, rotation de la FAQ)
  panel.js         panneau de configuration (formulaire, pad, lien des surveillants)
  main.js          état + synchronisation de la FAQ ; relie screen et panel

tests/             tests JS (http://localhost:8000/tests/) et tests du serveur
legacy/            ancienne version (copie d'ExamHours, Vue 1), pour référence
```

Flux des données :

```
lien + localStorage ──► config ──► main ──► screen.render / panel.update
panel (saisie)      ──► main.setValue ──► localStorage
main (toutes les 10 s) ──► GET api/faqs/<id> ──► faq.parse ──► screen.setFaq
```

### API

```
POST /api/faqs          {"padUrl": "https://…/p/nom"}   -> {"id": "…"}          enregistre un pad
GET  /api/faqs/<id>                                     -> {text, fetchedAt, error}   texte du pad (cache)
```

### Serveur

| Variable d'environnement | Défaut | Rôle |
|---|---|---|
| `PORT` | `8000` | Port d'écoute (`python3 server.py`) |
| `SCREENTIMER_DB` | `data/screentimer.sqlite3` | Base SQLite (table id → lien du pad) |
| `SCREENTIMER_PAD_HOSTS` | `framapad.org` | Hébergeurs de pads autorisés (ex. ajouter l'Etherpad de l'école) |
| `SCREENTIMER_RETENTION_HOURS` | `72` | Suppression des FAQ inutilisées depuis N heures |

Garde-fous du serveur :
- **Budget de lecture** : au plus 8 lectures par 90 s par hébergeur, et une pause de 60 s si l'hébergeur est surchargé. La dernière version lue reste servie.
- **Adresses filtrées** : seuls les hébergeurs autorisés sont interrogés, et les redirections ne sont pas suivies.
- **Fichiers exposés** : seuls `index.html`, `css/`, `js/`, `assets/` et `tests/` sont servis.

En production (Azure), lancer un seul processus pour que le cache soit partagé :
`gunicorn --workers 1 --threads 8 server:app`. Il faut aussi placer la base sur un stockage persistant
(sur Azure App Service : sous `/home`).

### Tests

```bash
python3 -m unittest discover -s tests -v
```

Puis ouvrir <http://localhost:8000/tests/> pour les tests JavaScript.
