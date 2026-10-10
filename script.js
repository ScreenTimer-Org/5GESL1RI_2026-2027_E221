// Attention pour lancer le projet il faut télécharger l'extention VS Code Live Server pour simuler un déploiement sinon le chargement du csv ne s'effectue pas.

let matricule = '';
let statutActuel = false;
let coursExamen = '';
let listeEtudiants = [];

// Chargement du CSV
async function chargerListe() {
    try {
        const reponse = await fetch('pae_etudiants.csv');

        if (!reponse.ok) {
            throw new Error('Impossible de charger le fichier CSV');
        }

        const texte = await reponse.text();

        listeEtudiants = texte
            .split(/\r?\n/)
            .slice(1) // Ignore la première ligne : matricule,courses
            .filter(ligne => ligne.trim() !== '')
            .map(ligne => {
                const [id, listeCours] = ligne.trim().split(',');

                return {
                    matricule: id.trim(),
                    cours: listeCours
                        .split('|')
                        .map(cours => cours.trim())
                        .filter(Boolean)
                };
            });
        remplirMenuCours();
        console.log('PAE chargés :', listeEtudiants);

    } catch (erreur) {
        console.error('Erreur CSV :', erreur);
        alert('Le fichier pae_etudiants.csv n’a pas pu être chargé.');
    }
}

function trouverEtudiant(matricule, cours) {
    return listeEtudiants.find(etudiant =>
        etudiant.matricule === matricule &&
        etudiant.cours.includes(cours)
    ) || null;
}

function remplirMenuCours() {
    const menu = document.getElementById('cours');

    // Récupère chaque cours une seule fois.
    const coursUniques = [...new Set(
        listeEtudiants.flatMap(etudiant => etudiant.cours)
    )].sort();

    // Garde uniquement l'option de départ.
    menu.innerHTML = '<option value="">-- Choisir le cours de l\'examen --</option>';

    coursUniques.forEach(cours => {
        const option = document.createElement('option');
        option.value = cours;
        option.textContent = cours;
        menu.appendChild(option);
    });
}

// Bloc Matricule + Statut
function initMatricule(){

    const formulaire = document.getElementById('form-matricule');
    const champMatricule = document.getElementById('matricule');
    const champCours = document.getElementById('cours');

    formulaire.addEventListener('submit', (event) => {
        event.preventDefault();

        matricule = champMatricule.value.trim();

        const cours = champCours.value.trim().toUpperCase();
        coursExamen = cours;
        localStorage.setItem('dernierCours', coursExamen);

        const etudiant = trouverEtudiant(matricule, cours);
        const autorise = etudiant !== null;
        afficherStatut(autorise);
        traiterScan(matricule, cours, autorise);

        console.log('Matricule enregistré :', matricule);
        console.log('Autorisé :', autorise);
    });

    champCours.addEventListener('change', () => {
        coursExamen = champCours.value.trim().toUpperCase();
        localStorage.setItem('dernierCours', coursExamen);
        historique = chargerHistorique(coursExamen);
        afficherHistorique();
    });
}


// Bloc Horaires
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


// Partie Van Vo : sauvegarde / chargement / export (localStorage)
// ============================================================

function cleHistorique(cours) {
    return 'historique_' + cours;
}

function sauvegarderHistorique(cours, historique){
    if (!cours) {
        console.warn('sauvegarderHistorique : aucun cours sélectionné, rien sauvegardé.');
        return;
    }
    try {
        localStorage.setItem(cleHistorique(cours), JSON.stringify(historique));
        console.log('Historique sauvegardé pour', cours, historique);
    } catch (e) {
        console.error('Erreur sauvegarde localStorage :', e);
    }
}

function chargerHistorique(cours){
    if (!cours) return {};
    try {
        const brut = localStorage.getItem(cleHistorique(cours));
        return brut ? JSON.parse(brut) : {};
    } catch (e) {
        console.error('Erreur chargement localStorage :', e);
        return {};
    }
}

function exporterCSV(cours){
    if (!cours) {
        alert('Aucun cours sélectionné, impossible d\'exporter.');
        return;
    }

    const hist = chargerHistorique(cours);
    const lignes = ['cours;matricule;debut;fin;toilette;triche'];

    // Pour chaque historique dans le cours, exporter les attributs de ces historiques
    for (const mat in hist) {
        const e = hist[mat];
        lignes.push([
            cours,
            mat,
            e.debut || '',
            e.fin || '',
            e.toilette || 'Non',
            e.triche || 'Non'
        ].join(';'));
    }

    // Pour télécharger le .csv en évitant la sécurité du navigateur
    const contenu = '\uFEFF' + lignes.join('\n');
    const blob = new Blob([contenu], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const lien = document.createElement('a');
    lien.href = url;
    lien.download = 'historique-' + cours + '.csv';
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);
    URL.revokeObjectURL(url);
}


// Ajouté par Jaouad
function afficherPhotoParDefaut() {
    this.onerror = null;
    this.src = 'photos/default.jpg';
}


function afficherEleve(etudiant) {
    const photo = document.getElementById('photo-eleve');
    const texteMatricule = document.getElementById('matricule-eleve');

    if (!etudiant || !etudiant.matricule) {
        viderEleve();
        return;
    }

    const matriculeEleve = String(etudiant.matricule).trim();

    texteMatricule.textContent = 'Matricule : '+ matriculeEleve;

    photo.hidden = false;
    photo.alt = 'Photo de l\'étudiant ' + matriculeEleve;

    photo.onerror = afficherPhotoParDefaut;
    photo.src = 'photos/' + matriculeEleve + '.jpg';
}


function viderEleve(){
    const photo = document.getElementById('photo-eleve');
    const texteMatricule = document.getElementById('matricule-eleve');

    photo.hidden = true;
    photo.onerror = null;
    photo.src = 'photos/default.jpg';
    photo.alt = 'Photo de l\'étudiant par défaut';

    texteMatricule.textContent = '';
}


function traiterScan(matricule, cours, autorise){
    if (!autorise) {
        viderEleve();
        return;
    }

    afficherEleve({matricule: matricule});
    const heure = new Date().toLocaleTimeString();
    const fiche = historique[matricule];

    if (!fiche || fiche.debut === '') {
        logEvent(matricule, 'Debut', heure);
    } else if (fiche.fin === '') {
        logEvent(matricule, 'Fin', heure);
    } else {
        alert('Cet étudiant est déjà sorti');
    }
}


// Bloc Historique
let historique = {};
function logEvent(matricule, typeEvenement, heure){
    if (!historique[matricule]) {
        historique[matricule] = { debut:'', fin:'', toilette:'Non', triche:'Non' };
    }
    if (typeEvenement==='Debut')        historique[matricule].debut = heure;
    else if (typeEvenement==='Fin')     historique[matricule].fin = heure;
    else if (typeEvenement==='Toilette') historique[matricule].toilette = 'Oui';
    else if (typeEvenement==='Triche')   historique[matricule].triche = 'Oui';

    sauvegarderHistorique(coursExamen, historique);
    afficherHistorique();
}

function afficherHistorique(){
    const tableau = document.getElementById('tableau-historique');

    tableau.innerHTML = '<tr><th>Matricule</th><th>Heure Debut</th><th>Heure Fin</th><th>Toilette</th><th>Triche</th></tr>';

    for (const mat in historique) {
        const etudiant = historique[mat];
        tableau.innerHTML += '<tr><td>' + mat + '</td><td>' + etudiant.debut +'</td><td>' + etudiant.fin + '</td><td>' + etudiant.toilette + '</td><td>' + etudiant.triche + '</td></tr>';
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

document.addEventListener('DOMContentLoaded', async () => {
    await chargerListe();
    initMatricule();
    initHoraires();

    // Van Vo : restaurer le dernier cours utilisé + recharger son historique
    const champCours = document.getElementById('cours');
    const dernierCours = localStorage.getItem('dernierCours');
    if (dernierCours) {
        champCours.value = dernierCours;
        coursExamen = dernierCours;
        historique = chargerHistorique(coursExamen);
        afficherHistorique();
    }

    // Bouton export
    document.getElementById('btn-export')
        .addEventListener('click', () => exporterCSV(coursExamen));
});