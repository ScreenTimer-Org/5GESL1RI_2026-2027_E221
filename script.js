
// Bloc Matricule + Statut (Maxime)
function initMatricule(){
    // à completer 
    //- écouter la saisie/validation du matricule
    //- vérifier si le matricule est autorisé
    // - afficher vert/rouge dans bloc-statut
    // - appeler logEvent(...) à chaque validation 

}


// Bloc Horaires (Cyril)
function initHoraires() {

    document.getElementById("btn-debut").addEventListener("click", () => {
        const heure = new Date().toLocaleTimeString();
        logEvent(matricule,"Debut", heure);
    });

    document.getElementById("btn-fin").addEventListener("click", () => {
        const heure = new Date().toLocaleTimeString();
        logEvent(matricule,"Fin", heure);
    });

    document.getElementById("btn-toilette").addEventListener("click", () => {
        const heure = new Date().toLocaleTimeString();
        logEvent(matricule,"Toilette", heure);
    });

    document.getElementById("btn-triche").addEventListener("click", () => {
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

document.addEventListener('DOMContentLoaded', () => {
    initMatricule();
    initHoraires();
});
