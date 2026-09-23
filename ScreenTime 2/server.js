import express from 'express'
import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const db = new DatabaseSync('data.db')

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'dev-token'

// ---------- Création des tables ----------
db.exec(`
  CREATE TABLE IF NOT EXISTS configs (
    id           TEXT PRIMARY KEY,
    matiere      TEXT NOT NULL,
    titre        TEXT NOT NULL,
    heure_fin    TEXT NOT NULL,
    heure_depart TEXT,
    offset_min   INTEGER DEFAULT 0,
    updated_at   TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS consignes (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    config_id TEXT NOT NULL REFERENCES configs(id) ON DELETE CASCADE,
    ordre     INTEGER NOT NULL,
    texte     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS faq (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    matiere    TEXT NOT NULL,
    question   TEXT NOT NULL,
    reponse    TEXT NOT NULL,
    ordre      INTEGER NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`)

// ---------- Middleware ----------
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

function requireAdmin(req, res, next) {
    const token = req.headers['authorization'] || req.query.token
    if (token !== ADMIN_TOKEN) {
        return res.status(401).json({ error: 'Token invalide' })
    }
    next()
}

// ---------- ROUTES PUBLIQUES ----------

app.get('/api/config/:id', (req, res) => {
    const config = db.prepare('SELECT * FROM configs WHERE id = ?').get(req.params.id)
    if (!config) return res.status(404).json({ error: 'Config introuvable' })

    const consignes = db.prepare(
        'SELECT texte FROM consignes WHERE config_id = ? ORDER BY ordre'
    ).all(req.params.id).map(c => c.texte)

    const faq = db.prepare(
        'SELECT question, reponse FROM faq WHERE matiere = ? ORDER BY ordre'
    ).all(config.matiere)

    res.json({ ...config, consignes, faq })
})

app.get('/api/time', (req, res) => {
    res.json({ now: new Date().toISOString() })
})

// ---------- ROUTES ADMIN ----------

app.post('/api/admin/config', requireAdmin, (req, res) => {
    const { id, matiere, titre, heure_fin, heure_depart, offset_min, consignes } = req.body
    if (!id || !matiere || !titre || !heure_fin) {
        return res.status(400).json({ error: 'Champs manquants' })
    }

    db.prepare(`
      INSERT INTO configs (id, matiere, titre, heure_fin, heure_depart, offset_min)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        matiere = excluded.matiere,
        titre = excluded.titre,
        heure_fin = excluded.heure_fin,
        heure_depart = excluded.heure_depart,
        offset_min = excluded.offset_min,
        updated_at = CURRENT_TIMESTAMP
    `).run(id, matiere, titre, heure_fin, heure_depart || null, offset_min || 0)

    if (Array.isArray(consignes)) {
        db.prepare('DELETE FROM consignes WHERE config_id = ?').run(id)
        const insert = db.prepare('INSERT INTO consignes (config_id, ordre, texte) VALUES (?, ?, ?)')
        consignes.forEach((texte, i) => insert.run(id, i, texte))
    }

    res.json({ ok: true })
})

app.post('/api/admin/faq', requireAdmin, (req, res) => {
    const { matiere, question, reponse } = req.body
    if (!matiere || !question || !reponse) {
        return res.status(400).json({ error: 'Champs manquants' })
    }
    const row = db.prepare('SELECT COALESCE(MAX(ordre), -1) AS m FROM faq WHERE matiere = ?').get(matiere)
    db.prepare('INSERT INTO faq (matiere, question, reponse, ordre) VALUES (?, ?, ?, ?)')
        .run(matiere, question, reponse, row.m + 1)
    res.json({ ok: true })
})

app.delete('/api/admin/faq/:id', requireAdmin, (req, res) => {
    db.prepare('DELETE FROM faq WHERE id = ?').run(req.params.id)
    res.json({ ok: true })
})

app.get('/api/admin/configs', requireAdmin, (req, res) => {
    const configs = db.prepare('SELECT * FROM configs ORDER BY updated_at DESC').all()
    res.json(configs)
})

app.get('/api/admin/faq/:matiere', requireAdmin, (req, res) => {
    const rows = db.prepare('SELECT * FROM faq WHERE matiere = ? ORDER BY ordre').all(req.params.matiere)
    res.json(rows)
})

// ---------- DÉMARRAGE ----------
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`Serveur sur http://localhost:${PORT}`)
    console.log(`Admin token : ${ADMIN_TOKEN}`)
})