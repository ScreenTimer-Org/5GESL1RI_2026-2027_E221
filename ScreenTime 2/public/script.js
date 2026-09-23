const params = new URLSearchParams(window.location.search)
const configId = params.get('config')

const elTitre = document.getElementById('titre')
const elCurrent = document.getElementById('currentTimer')
const elEnd = document.getElementById('endTimer')
const elRemaining = document.getElementById('remainingTimer')
const elDepartMsg = document.getElementById('departMsg')
const elConsignes = document.getElementById('consignesList')
const elFaq = document.getElementById('faqList')
const panelConsignes = document.getElementById('panelConsignes')
const panelFaq = document.getElementById('panelFaq')
const elError = document.getElementById('error')

const settingsBtn = document.getElementById('settingsBtn')
const settingsPanel = document.getElementById('settingsPanel')
const ovTitre = document.getElementById('ovTitre')
const ovFin = document.getElementById('ovFin')
const ovDepart = document.getElementById('ovDepart')
const ovOffset = document.getElementById('ovOffset')
const ovConsignes = document.getElementById('ovConsignes')

let serverConfig = null     // ce que renvoie l'API
let effectiveConfig = null  // serverConfig + overrides appliqués
let overrides = {}          // {titre, heure_fin, heure_depart, offset_min, consignes}

let intervalTimer = null
let intervalPolling = null
let intervalRotation = null
let currentPanel = 'consignes'

const OVERRIDES_KEY = 'overrides-' + configId

// ---------- Utilitaires ----------
function timeToMinutes(t) {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
}

function formatMinutes(total) {
    total = ((total % 1440) + 1440) % 1440
    const h = Math.floor(total / 60)
    const m = total % 60
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
}

// ---------- Overrides ----------
function loadOverrides() {
    try {
        overrides = JSON.parse(localStorage.getItem(OVERRIDES_KEY) || '{}')
    } catch {
        overrides = {}
    }
}

function saveOverrides() {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides))
}

function clearOverrides() {
    overrides = {}
    localStorage.removeItem(OVERRIDES_KEY)
}

// Fusionne serverConfig + overrides. La FAQ n'est jamais surchargée.
function applyOverrides() {
    if (!serverConfig) return null
    return {
        ...serverConfig,
        titre: overrides.titre ?? serverConfig.titre,
        heure_fin: overrides.heure_fin ?? serverConfig.heure_fin,
        heure_depart: overrides.heure_depart ?? serverConfig.heure_depart,
        offset_min: overrides.offset_min ?? serverConfig.offset_min,
        consignes: overrides.consignes ?? serverConfig.consignes,
        faq: serverConfig.faq  // toujours du serveur
    }
}

// ---------- Rendu ----------
function renderConfig(c) {
    elTitre.textContent = c.titre
    elEnd.textContent = c.heure_fin

    elConsignes.innerHTML = ''
    ;(c.consignes || []).forEach(texte => {
        const li = document.createElement('li')
        li.textContent = texte
        elConsignes.appendChild(li)
    })

    elFaq.innerHTML = ''
    ;(c.faq || []).forEach(item => {
        const li = document.createElement('li')
        const q = document.createElement('div')
        q.className = 'q'
        q.textContent = item.question
        const r = document.createElement('div')
        r.className = 'r'
        r.textContent = item.reponse
        li.appendChild(q)
        li.appendChild(r)
        elFaq.appendChild(li)
    })
}

// ---------- Timer ----------
function startTimer() {
    if (intervalTimer) clearInterval(intervalTimer)

    const endMin = timeToMinutes(effectiveConfig.heure_fin)
    const offset = effectiveConfig.offset_min || 0

    function tick() {
        const now = new Date()
        const curMin = now.getHours() * 60 + now.getMinutes() + offset
        const remaining = ((endMin - curMin) % 1440 + 1440) % 1440

        elCurrent.textContent = formatMinutes(curMin)
        elRemaining.textContent = formatMinutes(remaining)

        if (effectiveConfig.heure_depart) {
            const departMin = timeToMinutes(effectiveConfig.heure_depart)
            const curMinAbs = now.getHours() * 60 + now.getMinutes() + offset
            if (curMinAbs >= departMin) {
                elDepartMsg.textContent = 'Vous êtes libres de partir.'
            } else {
                elDepartMsg.textContent = `Vous ne pouvez partir qu'après ${effectiveConfig.heure_depart}.`
            }
        } else {
            elDepartMsg.textContent = ''
        }

        if (remaining === 0) {
            clearInterval(intervalTimer)
            intervalTimer = null
        }
    }

    tick()
    intervalTimer = setInterval(tick, 1000)
}

// ---------- Rotation ----------
function startRotation() {
    if (intervalRotation) clearInterval(intervalRotation)
    intervalRotation = setInterval(() => {
        currentPanel = currentPanel === 'consignes' ? 'faq' : 'consignes'
        if (currentPanel === 'consignes') {
            panelConsignes.classList.remove('hidden')
            panelFaq.classList.add('hidden')
        } else {
            panelConsignes.classList.add('hidden')
            panelFaq.classList.remove('hidden')
        }
    }, 60000)
}

// ---------- Polling ----------
async function fetchConfig() {
    const res = await fetch('/api/config/' + configId)
    if (!res.ok) throw new Error('Config introuvable')
    return res.json()
}

async function refresh() {
    try {
        const fresh = await fetchConfig()
        const freshStr = JSON.stringify(fresh)
        const currentServerStr = JSON.stringify(serverConfig)

        if (freshStr !== currentServerStr) {
            serverConfig = fresh
            effectiveConfig = applyOverrides()
            renderConfig(effectiveConfig)
            startTimer()  // relance avec les nouvelles heures
        }
    } catch (e) {
        console.error('Polling error :', e)
    }
}

// ---------- Panneau paramètres ----------
function openSettings() {
    if (!effectiveConfig) return
    ovTitre.value = effectiveConfig.titre || ''
    ovFin.value = effectiveConfig.heure_fin || ''
    ovDepart.value = effectiveConfig.heure_depart || ''
    ovOffset.value = effectiveConfig.offset_min || 0
    ovConsignes.value = (effectiveConfig.consignes || []).join('\n')
    settingsPanel.classList.remove('hidden')
}

function closeSettings() {
    settingsPanel.classList.add('hidden')
}

settingsBtn.addEventListener('click', openSettings)
document.getElementById('closeSettings').addEventListener('click', closeSettings)

document.getElementById('saveOverrides').addEventListener('click', () => {
    overrides = {
        titre: ovTitre.value.trim() || undefined,
        heure_fin: ovFin.value || undefined,
        heure_depart: ovDepart.value || null,
        offset_min: parseInt(ovOffset.value, 10) || 0,
        consignes: ovConsignes.value.split('\n').map(l => l.trim()).filter(Boolean)
    }
    // Nettoie les undefined (pour ne pas écraser avec rien)
    Object.keys(overrides).forEach(k => overrides[k] === undefined && delete overrides[k])
    saveOverrides()
    effectiveConfig = applyOverrides()
    renderConfig(effectiveConfig)
    startTimer()
    closeSettings()
})

document.getElementById('resetOverrides').addEventListener('click', () => {
    if (!confirm('Réinitialiser toutes les modifications locales ?')) return
    clearOverrides()
    effectiveConfig = applyOverrides()
    renderConfig(effectiveConfig)
    startTimer()
    closeSettings()
})

// ---------- Init ----------
async function init() {
    if (!configId) {
        elError.textContent = 'Aucune config spécifiée. Ajoutez ?config=xxx dans l\'URL.'
        elError.classList.remove('hidden')
        return
    }

    loadOverrides()

    try {
        serverConfig = await fetchConfig()
        effectiveConfig = applyOverrides()
        renderConfig(effectiveConfig)
        startTimer()
        startRotation()
        intervalPolling = setInterval(refresh, 10000)
    } catch (e) {
        elError.textContent = 'Config introuvable : ' + configId
        elError.classList.remove('hidden')
    }
}

init()