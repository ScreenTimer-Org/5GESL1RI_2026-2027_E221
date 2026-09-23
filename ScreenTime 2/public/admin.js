// ---------- Token ----------
const tokenInput = document.getElementById('tokenInput')
const saveToken = document.getElementById('saveToken')
const tokenStatus = document.getElementById('tokenStatus')

let token = localStorage.getItem('adminToken') || ''

tokenInput.value = token
updateTokenStatus()

saveToken.addEventListener('click', () => {
    token = tokenInput.value.trim()
    localStorage.setItem('adminToken', token)
    updateTokenStatus()
    loadConfigs()
})

function updateTokenStatus() {
    if (token) {
        tokenStatus.textContent = '✓ Enregistré'
        tokenStatus.style.color = 'green'
    } else {
        tokenStatus.textContent = '✗ Aucun'
        tokenStatus.style.color = 'red'
    }
}

// ---------- Helper fetch ----------
async function api(path, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': token,
        ...(options.headers || {})
    }
    const res = await fetch(path, { ...options, headers })
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error || 'Erreur API')
    }
    return res.json()
}

// ---------- Message ----------
const elMessage = document.getElementById('message')
function showMessage(text, ok = true) {
    elMessage.textContent = text
    elMessage.className = 'message ' + (ok ? 'ok' : 'err')
    setTimeout(() => { elMessage.textContent = ''; elMessage.className = 'message' }, 3000)
}

// ---------- Configs ----------
const configsList = document.getElementById('configsList')
const configFormSection = document.getElementById('configFormSection')
const configFormTitle = document.getElementById('configFormTitle')
const configForm = document.getElementById('configForm')
const newConfigBtn = document.getElementById('newConfigBtn')
const cancelConfig = document.getElementById('cancelConfig')

async function loadConfigs() {
    if (!token) {
        configsList.textContent = 'Entre un token pour charger les configs.'
        return
    }
    try {
        const configs = await api('/api/admin/configs')
        configsList.innerHTML = ''
        if (configs.length === 0) {
            configsList.textContent = 'Aucune config.'
            return
        }
        configs.forEach(c => {
            const div = document.createElement('div')
            div.className = 'item'
            div.innerHTML = `
                <div class="info">
                    <strong>${c.titre}</strong><br>
                    <small>ID: ${c.id} — Matière: ${c.matiere} — Fin: ${c.heure_fin}</small>
                </div>
                <div>
                    <button class="edit" data-id="${c.id}">Éditer</button>
                    <button data-view="${c.id}">Voir</button>
                </div>
            `
            div.querySelector('.edit').addEventListener('click', () => openConfigForm(c))
            div.querySelector('[data-view]').addEventListener('click', () => {
                window.open('/?config=' + c.id, '_blank')
            })
            configsList.appendChild(div)
        })
    } catch (e) {
        configsList.textContent = 'Erreur: ' + e.message
    }
}

function openConfigForm(config = null) {
    configFormSection.classList.remove('hidden')
    configFormTitle.textContent = config ? 'Éditer config' : 'Nouvelle config'

    document.getElementById('cfgId').value = config?.id || ''
    document.getElementById('cfgId').disabled = !!config
    document.getElementById('cfgMatiere').value = config?.matiere || ''
    document.getElementById('cfgTitre').value = config?.titre || ''
    document.getElementById('cfgFin').value = config?.heure_fin || ''
    document.getElementById('cfgDepart').value = config?.heure_depart || ''
    document.getElementById('cfgOffset').value = config?.offset_min || 0

    // Charger les consignes via la route publique
    if (config) {
        fetch('/api/config/' + config.id)
            .then(r => r.json())
            .then(data => {
                document.getElementById('cfgConsignes').value = (data.consignes || []).join('\n')
            })
            .catch(() => { document.getElementById('cfgConsignes').value = '' })
    } else {
        document.getElementById('cfgConsignes').value = ''
    }
}

newConfigBtn.addEventListener('click', () => openConfigForm(null))
cancelConfig.addEventListener('click', () => configFormSection.classList.add('hidden'))

configForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const consignes = document.getElementById('cfgConsignes').value
        .split('\n').map(l => l.trim()).filter(Boolean)

    const body = {
        id: document.getElementById('cfgId').value.trim(),
        matiere: document.getElementById('cfgMatiere').value.trim(),
        titre: document.getElementById('cfgTitre').value.trim(),
        heure_fin: document.getElementById('cfgFin').value,
        heure_depart: document.getElementById('cfgDepart').value || null,
        offset_min: parseInt(document.getElementById('cfgOffset').value, 10) || 0,
        consignes
    }

    try {
        await api('/api/admin/config', { method: 'POST', body: JSON.stringify(body) })
        showMessage('Config enregistrée.')
        configFormSection.classList.add('hidden')
        loadConfigs()
    } catch (e) {
        showMessage(e.message, false)
    }
})

// ---------- FAQ ----------
const faqMatiere = document.getElementById('faqMatiere')
const loadFaqBtn = document.getElementById('loadFaq')
const faqForm = document.getElementById('faqForm')
const faqList = document.getElementById('faqList')

async function loadFaq() {
    const matiere = faqMatiere.value.trim()
    if (!matiere) return showMessage('Entre une matière.', false)
    if (!token) return showMessage('Entre un token.', false)

    try {
        const items = await api('/api/admin/faq/' + encodeURIComponent(matiere))
        faqList.innerHTML = ''
        if (items.length === 0) {
            faqList.textContent = 'Aucune question pour cette matière.'
            return
        }
        items.forEach(item => {
            const div = document.createElement('div')
            div.className = 'item'
            const info = document.createElement('div')
            info.className = 'info'
            const q = document.createElement('strong')
            q.textContent = item.question
            const r = document.createElement('small')
            r.textContent = item.reponse
            info.appendChild(q)
            info.appendChild(document.createElement('br'))
            info.appendChild(r)

            const btn = document.createElement('button')
            btn.textContent = 'Supprimer'
            btn.addEventListener('click', async () => {
                if (!confirm('Supprimer cette question ?')) return
                try {
                    await api('/api/admin/faq/' + item.id, { method: 'DELETE' })
                    showMessage('Question supprimée.')
                    loadFaq()
                } catch (e) {
                    showMessage(e.message, false)
                }
            })

            div.appendChild(info)
            div.appendChild(btn)
            faqList.appendChild(div)
        })
    } catch (e) {
        showMessage(e.message, false)
    }
}

loadFaqBtn.addEventListener('click', loadFaq)

faqForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const body = {
        matiere: faqMatiere.value.trim(),
        question: document.getElementById('faqQuestion').value.trim(),
        reponse: document.getElementById('faqReponse').value.trim()
    }
    try {
        await api('/api/admin/faq', { method: 'POST', body: JSON.stringify(body) })
        showMessage('Question ajoutée.')
        document.getElementById('faqQuestion').value = ''
        document.getElementById('faqReponse').value = ''
        loadFaq()
    } catch (e) {
        showMessage(e.message, false)
    }
})

// ---------- Init ----------
loadConfigs()