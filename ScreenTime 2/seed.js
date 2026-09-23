import { DatabaseSync } from 'node:sqlite'

const db = new DatabaseSync('data.db')

db.exec(`
  CREATE TABLE IF NOT EXISTS configs (
    id TEXT PRIMARY KEY, matiere TEXT NOT NULL, titre TEXT NOT NULL,
    heure_fin TEXT NOT NULL, heure_depart TEXT, offset_min INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS consignes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_id TEXT NOT NULL REFERENCES configs(id) ON DELETE CASCADE,
    ordre INTEGER NOT NULL, texte TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS faq (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matiere TEXT NOT NULL, question TEXT NOT NULL, reponse TEXT NOT NULL,
    ordre INTEGER NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`)

db.exec('DELETE FROM consignes; DELETE FROM faq; DELETE FROM configs;')

db.prepare(`
  INSERT INTO configs (id, matiere, titre, heure_fin, heure_depart, offset_min)
  VALUES (?, ?, ?, ?, ?, ?)
`).run('maths-bac1', 'maths', 'Examen de Mathématiques - BAC1', '16:00', '15:30', 0)

const insertConsigne = db.prepare('INSERT INTO consignes (config_id, ordre, texte) VALUES (?, ?, ?)')
;[
    'Éteignez vos téléphones.',
    'Aucun document autorisé.',
    'La calculatrice est interdite.',
    'Écrivez votre nom sur chaque feuille.'
].forEach((t, i) => insertConsigne.run('maths-bac1', i, t))

const insertFaq = db.prepare('INSERT INTO faq (matiere, question, reponse, ordre) VALUES (?, ?, ?, ?)')
;[
    ['Puis-je sortir avant la fin ?', 'Oui, à partir de 15h30.'],
    ['Puis-je utiliser une calculatrice ?', 'Non, aucune calculatrice autorisée.'],
    ["Que faire si j'ai une question ?", 'Levez la main, un surveillant viendra.']
].forEach((row, i) => insertFaq.run('maths', row[0], row[1], i))

db.prepare(`
  INSERT INTO configs (id, matiere, titre, heure_fin, heure_depart, offset_min)
  VALUES (?, ?, ?, ?, ?, ?)
`).run('maths-bac2', 'maths', 'Examen de Mathématiques - BAC2', '18:00', '17:30', 0)

console.log('Seed OK')
console.log('Teste : http://localhost:3000/?config=maths-bac1')