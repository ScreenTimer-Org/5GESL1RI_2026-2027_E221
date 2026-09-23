/*
 * Configuration de l'écran.
 *
 * Priorité (le dernier gagne) :  défauts  <  lien partagé (?param=…)  <  modifications du local
 *
 * - Le lien partagé est préparé par le titulaire et envoyé à tous les surveillants.
 * - Les modifications du local (heure décalée, nom du local, zoom…) restent dans le navigateur
 *   de ce local (localStorage) et ne sont jamais partagées.
 */
(function (ST) {
  'use strict';

  const DEFAULTS = Object.freeze({
    mode: 'exam', // exam | break
    title: 'Examen',
    code: '', // mnémonique du cours
    room: '', // local
    start: '',
    end: '',
    leave: '',
    consignes: '- Éteignez et rangez votre téléphone.\n- Seul le matériel autorisé est sur la table.\n- Levez la main pour poser une question.',
    faq: '', // identifiant de la FAQ partagée (pad enregistré sur server.py)
    logo: 'assets/logo-esi.png',
    theme: 'light', // light | dark
    seconds: false,
    offset: 0, // minutes de décalage de l'horloge du PC
    zoom: 1,
  });

  /** Réglages propres à un local : jamais mis dans le lien de partage. */
  const LOCAL_ONLY = ['room', 'offset', 'zoom'];

  const TRUE_WORDS = ['1', 'true', 'yes', 'oui', 'on'];

  function coerce(key, value) {
    const def = DEFAULTS[key];
    if (typeof def === 'number') {
      const n = parseFloat(String(value).replace(',', '.'));
      return Number.isFinite(n) ? n : def;
    }
    if (typeof def === 'boolean') {
      return typeof value === 'boolean' ? value : TRUE_WORDS.includes(String(value).trim().toLowerCase());
    }
    return value == null ? '' : String(value);
  }

  /** Objet quelconque -> uniquement les clés connues, typées. */
  function sanitize(obj) {
    const out = {};
    for (const [key, value] of Object.entries(obj || {})) {
      if (Object.prototype.hasOwnProperty.call(DEFAULTS, key)) out[key] = coerce(key, value);
    }
    return out;
  }

  function fromQuery(search) {
    return sanitize(Object.fromEntries(new URLSearchParams(search || '')));
  }

  /** Lien de partage : seulement les valeurs différentes des défauts, hors réglages du local. */
  function toQuery(cfg) {
    const params = new URLSearchParams();
    for (const key of Object.keys(DEFAULTS)) {
      if (LOCAL_ONLY.includes(key)) continue;
      const value = coerce(key, cfg[key] ?? DEFAULTS[key]);
      if (value === DEFAULTS[key]) continue;
      params.set(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
    }
    return params.toString();
  }

  function merge(...layers) {
    return Object.assign({}, DEFAULTS, ...layers);
  }

  /**
   * Clé de stockage des modifications du local : dépend du lien ouvert (épreuve, et local
   * s'il est dans le lien), pas du zoom ni du décalage.
   */
  function storageKey(search) {
    const shared = fromQuery(search);
    const canonical = Object.keys(shared)
      .filter((k) => k !== 'offset' && k !== 'zoom')
      .sort()
      .map((k) => k + '=' + shared[k])
      .join('&');
    let hash = 5381;
    for (let i = 0; i < canonical.length; i++) hash = ((hash << 5) + hash + canonical.charCodeAt(i)) >>> 0;
    return 'screentimer:v2:' + hash.toString(36);
  }

  function loadOverrides(key) {
    try {
      return sanitize(JSON.parse(localStorage.getItem(key) || '{}'));
    } catch (e) {
      return {};
    }
  }

  function saveOverrides(key, overrides) {
    try {
      if (Object.keys(overrides).length) localStorage.setItem(key, JSON.stringify(overrides));
      else localStorage.removeItem(key);
    } catch (e) {
      // Stockage indisponible (navigation privée…) : les modifications restent en mémoire.
    }
  }

  /** Logo : chemin relatif, http(s) ou image data: uniquement. */
  function safeImageUrl(url) {
    const u = String(url || '').trim();
    if (!u) return '';
    if (/^(https?:)?\/\//i.test(u) || /^data:image\//i.test(u)) return u;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return ''; // javascript:, file:, etc.
    return u;
  }

  ST.config = { DEFAULTS, LOCAL_ONLY, coerce, fromQuery, toQuery, merge, storageKey, loadOverrides, saveOverrides, safeImageUrl };
})(window.ST = window.ST || {});
