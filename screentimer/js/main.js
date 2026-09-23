/*
 * Point d'entrée : état de l'application, synchronisation de la FAQ, liaison écran <-> panneau.
 *
 *   config (lien + modifications du local) ──► screen.render / panel.update
 *   server.py /api/faqs/<id> toutes les 10 s ──► faq.parse ──► screen.setFaq
 */
(function (ST) {
  'use strict';

  const { config, faq, screen, panel } = ST;

  const TICK_MS = 250;
  const SYNC_MS = 10000;
  const PADS_KEY = 'screentimer:pads'; // id de FAQ -> lien du pad (connu du navigateur qui l'a enregistré)
  const PAD_SERVER = 'https://quotidien.framapad.org/p/'; // pad effacé après 24 h d'inactivité

  const state = {
    urlCfg: {}, // réglages du lien partagé
    overrides: {}, // modifications de ce local
    storageKey: '',
    cfg: config.merge(),
    faqStatus: null, // { text, error } : état de la lecture du pad
  };

  // ---------------------------------------------------------------- configuration

  function recompute() {
    state.cfg = config.merge(state.urlCfg, state.overrides);
  }

  function refresh(fillInputs) {
    screen.render(state.cfg);
    panel.update({ ...state, padUrl: knownPad(state.cfg.faq) }, fillInputs);
  }

  function setValue(key, value) {
    if (value === config.merge(state.urlCfg)[key]) delete state.overrides[key];
    else state.overrides[key] = value;
    config.saveOverrides(state.storageKey, state.overrides);
    recompute();
    refresh(false);
    if (key === 'faq') syncFaq();
  }

  /** `keys` : réglages à remettre à la valeur du lien partagé (null = tous). */
  function reset(keys) {
    if (keys) keys.forEach((k) => delete state.overrides[k]);
    else state.overrides = {};
    config.saveOverrides(state.storageKey, state.overrides);
    recompute();
    refresh(true);
    syncFaq();
  }

  // ---------------------------------------------------------------- FAQ partagée

  async function api(method, path, body) {
    const res = await fetch(path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json().catch(() => null);
    if (!data) throw new Error('serveur absent (lancez « python3 server.py »)');
    if (!res.ok) throw new Error(data.error || 'erreur ' + res.status);
    return data;
  }

  function describe(pad, count) {
    const hm = (s) => ST.timer.formatHM(new Date(s * 1000));
    if (pad.error) {
      return { error: true, text: '⚠ Pad : ' + pad.error + (pad.fetchedAt ? ' (version de ' + hm(pad.fetchedAt) + ' conservée)' : '') };
    }
    return {
      error: false,
      text: '✓ Pad lu à ' + hm(pad.fetchedAt) + ' · ' + count + (count > 1 ? ' questions' : ' question')
        + (count ? '' : ' : écrivez une question terminée par « ? »'),
    };
  }

  let syncTimer = null;
  let syncRun = 0; // une synchro dépassée (FAQ changée entre-temps) est ignorée

  async function syncFaq() {
    clearTimeout(syncTimer);
    const run = ++syncRun;
    const id = state.cfg.faq;
    let status = null;
    if (!id) {
      screen.setFaq([]);
    } else {
      try {
        const pad = await api('GET', 'api/faqs/' + encodeURIComponent(id));
        if (run !== syncRun) return;
        const items = faq.parse(pad.text);
        if (pad.text != null) screen.setFaq(items);
        status = describe(pad, items.length);
      } catch (err) {
        if (run !== syncRun) return;
        status = { error: true, text: '⚠ FAQ : ' + err.message };
      }
      syncTimer = setTimeout(syncFaq, SYNC_MS);
    }
    state.faqStatus = status;
    screen.setStatus(status && status.text, status && status.error);
    panel.update({ ...state, padUrl: knownPad(id) }, false);
  }

  function knownPad(id) {
    try {
      return (id && JSON.parse(localStorage.getItem(PADS_KEY) || '{}')[id]) || '';
    } catch (e) {
      return '';
    }
  }

  function rememberPad(id, padUrl) {
    try {
      const pads = JSON.parse(localStorage.getItem(PADS_KEY) || '{}');
      pads[id] = padUrl;
      localStorage.setItem(PADS_KEY, JSON.stringify(pads));
    } catch (e) {
      // Stockage indisponible : le lien du pad reste affiché jusqu'au rechargement.
    }
  }

  /** Enregistre le pad sur le serveur ; l'écran (et le lien des surveillants) n'en garde que l'id. */
  async function usePad(padUrl) {
    const url = String(padUrl || '').trim();
    if (!url) return;
    panel.showError('');
    const { id } = await api('POST', 'api/faqs', { padUrl: url });
    rememberPad(id, url);
    screen.setFaq([]);
    setValue('faq', id);
  }

  function newPadUrl() {
    const name = String(state.cfg.code || state.cfg.title || 'examen').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'examen';
    const random = Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => (b % 36).toString(36)).join('');
    return PAD_SERVER + 'faq-' + name + '-' + random; // nom impossible à deviner pour un élève
  }

  function createPad() {
    const url = newPadUrl();
    // Onglet ouvert tout de suite (sinon bloqué comme popup) ; ouvrir le pad le crée chez l'hébergeur.
    const tab = window.open('about:blank', '_blank');
    usePad(url)
      .then(() => {
        if (!tab) return;
        tab.opener = null; // le pad ne doit pas pouvoir piloter cette page
        tab.location.href = url;
      })
      .catch((err) => {
        if (tab) tab.close();
        panel.showError('Impossible de créer la FAQ : ' + err.message + '.');
      });
  }

  // ---------------------------------------------------------------- démarrage

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }

  function bindEvents() {
    document.getElementById('screen').addEventListener('click', () => panel.toggle());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') panel.toggle(false);
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === 'c') panel.toggle();
      else if (key === 'f') toggleFullscreen();
      else if (e.key === 'ArrowRight') screen.nextFaq(1);
      else if (e.key === 'ArrowLeft') screen.nextFaq(-1);
    });

    // Curseur et aide masqués quand la souris ne bouge pas (écran projeté).
    let idle = null;
    document.addEventListener('mousemove', () => {
      document.body.classList.remove('idle');
      clearTimeout(idle);
      idle = setTimeout(() => document.body.classList.add('idle'), 2500);
    });
    document.body.classList.add('idle');

    // Un autre onglet de ce navigateur modifie les réglages de la même épreuve.
    window.addEventListener('storage', (e) => {
      if (e.key !== state.storageKey) return;
      state.overrides = config.loadOverrides(state.storageKey);
      recompute();
      refresh(true);
    });
  }

  function start() {
    state.urlCfg = config.fromQuery(location.search);
    state.storageKey = config.storageKey(location.search);
    state.overrides = config.loadOverrides(state.storageKey);
    recompute();

    panel.init({
      onChange: setValue,
      onReset: reset,
      onCreatePad: createPad,
      onUsePad: (url) => usePad(url).catch((err) => panel.showError('Impossible d’utiliser ce pad : ' + err.message + '.')),
      onFullscreen: toggleFullscreen,
    });
    bindEvents();
    refresh(true);
    screen.tick(state.cfg);
    setInterval(() => screen.tick(state.cfg), TICK_MS);
    syncFaq();

    // Première ouverture par le titulaire (pas d'heure de fin) : on ouvre la configuration.
    if (ST.timer.parseHM(state.cfg.end) == null) panel.toggle(true);
  }

  document.addEventListener('DOMContentLoaded', start);
})(window.ST = window.ST || {});
