let matricule = '65243';

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
function initHoraires(){
    // à completer 
    // - gérer les actions début/fin/toilette/triche
    // - afficher les heures dans bloc-horaires
    // - appeler logEvent(...) à chaque action 

}


// Bloc Historique (Sila)
function logEvent(matricule, typeEvenement, heure){
    // à completr
    // - ajouter une ligne dans le tableau/liste du bloc-historique

}

// Recevoir le résultat de la vérification et afficher le statut.
function afficherStatut(autorise) {
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