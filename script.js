let matricule = '';
let statutActuel = false;

// Liste d’exemple : remplace ces valeurs par la vrai liste une fois communiqué par les suppérieurs.
const matriculesAutorises = [ '65033','65717', '65243','66100'];


// Bloc Matricule + Statut (Maxime)
function initMatricule(){
    // à completer 
    //- écouter la saisie/validation du matricule
    //- vérifier si le matricule est autorisé
    // - afficher vert/rouge dans bloc-statut
    // - appeler logEvent(...) à chaque validation 

    const formulaire = document.getElementById('form-matricule');
    const champMatricule = document.getElementById('matricule');

    formulaire.addEventListener('submit', (event) => {
        // Empêcher le rechargement de la page.
        event.preventDefault();

        // Stocker la saisie dans la variable.
        matricule = champMatricule.value.trim();

        // Afficher la valeur pour vérifier le fonctionnement.
        const autorise = matriculesAutorises.includes(matricule);
        
        afficherStatut(autorise)

        console.log('Matricule enregistré :', matricule);
        console.log('Autorisé :', autorise);

        // Enregistrer la vérification dans l’historique.
        const heure = new Date().toLocaleTimeString('fr-BE');

        logEvent(
            matricule,
            autorise ? 'Vérification : autorisé' : 'Vérification : non autorisé', 
            heure
        );
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
