// Attention pour lancer le projet il faut télécharger l'extention VS Code Live Server pour simuler un déploiement sinon le chargement du csv ne s'effectue pas.   

let matricule = '';
let statutActuel = false;
let pae = {};

//Chargement du csv 
fetch('pae_etudiants.csv')
    .then(reponse => reponse.text())
    .then(texte => {
        texte.split('\n').slice(1).forEach(ligne => {
            const [id, cours] = ligne.trim().split(',');

            if (id && cours) {
                pae[id] = cours.split('|');
            }
        });
    });

// Bloc Matricule + Statut (Maxime)
function initMatricule(){

    const formulaire = document.getElementById('form-matricule');
    const champMatricule = document.getElementById('matricule');
    const champCours = document.getElementById('cours');

    formulaire.addEventListener('submit', (event) => {
        // Empêcher le rechargement de la page.
        event.preventDefault();

         // Stocker la saisie dans la variable.
        matricule = champMatricule.value.trim();

        // Afficher la valeur pour vérifier le fonctionnement.
        const cours = champCours.value.trim().toUpperCase();

        const autorise = !!pae[matricule] && pae[matricule].includes(cours);
        
        afficherStatut(autorise)

        console.log('Matricule enregistré :', matricule);
        console.log('Autorisé :', autorise);

    });
}


// Bloc Horaires (Cyril)
function initHoraires() {

    document.getElementById("btn-debut").addEventListener("click", () => {
        if (!matricule || !statutActuel) {
            alert("This student doesn't have access");
            return;
        }
        const heure = new Date().toLocaleTimeString();
        logEvent(matricule,"Debut", heure);
    });

    document.getElementById("btn-fin").addEventListener("click", () => {
        if (!matricule || !statutActuel) {
            alert("This student doesn't have access");
            return;
        }
        const heure = new Date().toLocaleTimeString();
        logEvent(matricule,"Fin", heure);
    });

    document.getElementById("btn-toilette").addEventListener("click", () => {
        if (!matricule || !statutActuel) {
            alert("This student doesn't have access");
            return;
        }
        const heure = new Date().toLocaleTimeString();
        logEvent(matricule,"Toilette", heure);
    });

    document.getElementById("btn-triche").addEventListener("click", () => {
        if (!matricule || !statutActuel) {
            alert("This student doesn't have access");
            return;
        }
        const heure = new Date().toLocaleTimeString();
        logEvent(matricule,"Triche", heure);
    });
}


// Bloc Historique (Sila)
const historique = {};
function logEvent(matricule, typeEvenement, heure){
    // If it's the first time, we see this student
    if (!historique[matricule]) {
        historique[matricule] = {
            debut:'',
            fin:'',
            toilette:'Non',
            triche:'Non'
        };
    }

    if (typeEvenement==='Debut'){
        historique[matricule].debut = heure;
    } else if (typeEvenement==='Fin'){
        historique[matricule].fin = heure;
    } else if (typeEvenement==='Toilette'){
        historique[matricule].toilette = 'Oui';
    } else if (typeEvenement==='Triche'){
        historique[matricule].triche = 'Oui';
    }

    afficherHistorique();
}

function afficherHistorique(){
    const tableau = document.getElementById('tableau-historique');

    tableau.innerHTML = '<tr><th>Matricule</th><th>Heure Debut</th><th>Heure Fin</th><th>Toilette</th><th>Triche</th></tr>';

    for (const matricule in historique) {
        const etudiant = historique[matricule];
        tableau.innerHTML += '<tr><td>' + matricule + '</td><td>' + etudiant.debut +'</td><td>' + etudiant.fin + '</td><td>' + etudiant.toilette + '</td><td>' + etudiant.triche + '</td></tr>';
    }
}

// Recevoir le résultat de la vérification et afficher le statut.
function afficherStatut(autorise) {
    statutActuel = autorise;
    const statut = document.getElementById('statut-etudiant');

    if (autorise === true) {
        statut.textContent = 'Autorisé';
        statut.style.color = 'green';
    } else {
        statut.textContent = 'Non autorisé';
        statut.style.color = 'red';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initMatricule();
    initHoraires();
});
