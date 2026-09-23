/*
 * Panneau de configuration : formulaire, FAQ partagée (pad) et lien des surveillants.
 * Il affiche l'état que lui donne main.js et lui signale les actions (callbacks) ;
 * il ne fait aucun appel réseau.
 */
(function (ST) {
  'use strict';

  const { config } = ST;
  const $ = (id) => document.getElementById(id);

  /** `local: true` = propre au local, jamais dans le lien de partage. `form` : où le champ est rangé. */
  const FIELDS = [
    { group: 'Ce local', key: 'room', label: 'Nom du local', type: 'text', local: true, placeholder: 'ex. L408' },
    { group: 'Ce local', key: 'offset', label: "Décalage de l'horloge du PC (minutes)", type: 'number', step: 'any', local: true },
    { group: 'Ce local', key: 'zoom', label: 'Zoom', type: 'range', min: 0.5, max: 2, step: 0.05, local: true },
    { group: 'Épreuve', key: 'mode', label: 'Type', type: 'select', options: [['exam', 'Examen'], ['break', 'Pause de cours']] },
    { group: 'Épreuve', key: 'title', label: "Titre de l'épreuve", type: 'text' },
    { group: 'Épreuve', key: 'code', label: 'Mnémonique du cours', type: 'text', placeholder: 'ex. DEV1' },
    { group: 'Épreuve', key: 'start', label: 'Début', type: 'time' },
    { group: 'Épreuve', key: 'end', label: 'Fin', type: 'time' },
    { group: 'Épreuve', key: 'leave', label: 'Sortie autorisée dès (vide = pas affiché)', type: 'time' },
    { group: 'Consignes', key: 'consignes', label: 'Consignes (Markdown : - liste, **gras**)', type: 'textarea' },
    { group: 'Affichage', key: 'theme', label: 'Thème', type: 'select', options: [['light', 'Clair'], ['dark', 'Sombre']], form: 'formMore' },
    { group: 'Affichage', key: 'seconds', label: 'Afficher les secondes', type: 'checkbox', form: 'formMore' },
    { group: 'Affichage', key: 'logo', label: 'Logo (URL ou chemin, vide = aucun)', type: 'text', form: 'formMore' },
  ];

  let actions = {};
  let last = null; // dernier état reçu : { cfg, overrides, padUrl, faqStatus }

  // ---------------------------------------------------------------- construction

  function buildField(f) {
    const wrap = document.createElement('label');
    wrap.className = 'field field-' + f.type;
    wrap.dataset.key = f.key;

    const head = document.createElement('span');
    head.className = 'field-label';
    head.textContent = f.label + ' ';
    if (f.local) head.insertAdjacentHTML('beforeend', '<span class="tag">local</span> ');
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'reset-field';
    reset.title = 'Revenir à la valeur du lien partagé';
    reset.textContent = 'modifié ici ✕';
    reset.addEventListener('click', (e) => {
      e.preventDefault();
      actions.onReset([f.key]);
    });
    head.appendChild(reset);

    let input;
    if (f.type === 'textarea') {
      input = document.createElement('textarea');
      input.rows = 5;
    } else if (f.type === 'select') {
      input = document.createElement('select');
      for (const [value, text] of f.options) input.add(new Option(text, value));
    } else {
      input = document.createElement('input');
      input.type = f.type;
      for (const attr of ['min', 'max', 'step']) if (f[attr] != null) input.setAttribute(attr, f[attr]);
    }
    input.name = f.key;
    if (f.placeholder) input.placeholder = f.placeholder;
    const changed = () => actions.onChange(f.key, f.type === 'checkbox' ? input.checked : config.coerce(f.key, input.value));
    input.addEventListener('input', changed);
    input.addEventListener('change', changed);

    if (f.type === 'checkbox') wrap.append(input, head);
    else wrap.append(head, input);
    if (f.type === 'range') wrap.appendChild(document.createElement('output'));
    return wrap;
  }

  function buildForm() {
    const fieldsets = {};
    for (const f of FIELDS) {
      if (!fieldsets[f.group]) {
        const fieldset = document.createElement('fieldset');
        fieldset.innerHTML = '<legend></legend>';
        fieldset.firstChild.textContent = f.group;
        $(f.form || 'form').appendChild(fieldset);
        fieldsets[f.group] = fieldset;
      }
      fieldsets[f.group].appendChild(buildField(f));
    }
  }

  function init(callbacks) {
    actions = callbacks;
    buildForm();
    $('closePanel').addEventListener('click', () => toggle(false));
    $('createPad').addEventListener('click', () => actions.onCreatePad());
    $('usePad').addEventListener('click', () => actions.onUsePad($('padUrl').value));
    $('copyPad').addEventListener('click', (e) => copy('padUrl', e.currentTarget));
    $('copyLink').addEventListener('click', (e) => copy('shareLink', e.currentTarget));
    $('fullscreen').addEventListener('click', () => actions.onFullscreen());
    $('resetLocal').addEventListener('click', () => {
      if (Object.keys(last.overrides).length && confirm('Revenir aux réglages du lien partagé pour ce local ?')) actions.onReset(null);
    });
  }

  // ---------------------------------------------------------------- affichage

  /** Met le panneau à jour. `fillInputs` : réécrire aussi les champs (pas pendant la frappe). */
  function update(state, fillInputs) {
    last = state;
    if ($('panel').hidden) return;
    const { cfg, overrides } = state;

    for (const f of FIELDS) {
      const input = document.querySelector('.form [name="' + f.key + '"]');
      if (fillInputs) {
        if (f.type === 'checkbox') input.checked = !!cfg[f.key];
        else input.value = cfg[f.key];
      }
      input.closest('.field').classList.toggle('overridden', Object.prototype.hasOwnProperty.call(overrides, f.key));
    }
    document.querySelector('.field-range output').textContent = '×' + Number(cfg.zoom).toFixed(2);

    // FAQ partagée : le lien du pad n'est connu que du navigateur qui l'a enregistré.
    const padInput = $('padUrl');
    if (fillInputs || document.activeElement !== padInput) padInput.value = state.padUrl;
    $('openPad').href = state.padUrl || '#';
    $('openPad').hidden = !state.padUrl;
    $('copyPad').hidden = !state.padUrl;
    const status = state.faqStatus;
    $('faqStatus').textContent = status ? status.text
      : cfg.faq ? '' : 'Pas encore de FAQ partagée pour cette épreuve.';
    $('faqStatus').classList.toggle('warn-text', !!(status && status.error));

    const url = location.href.split(/[?#]/)[0] + (config.toQuery(cfg) ? '?' + config.toQuery(cfg) : '');
    $('shareLink').value = url;
    $('openLink').href = url;
    $('shareWarning').hidden = location.protocol !== 'file:';
  }

  function showError(message) {
    $('faqError').textContent = message;
    $('faqError').hidden = !message;
  }

  function toggle(show) {
    const willOpen = show == null ? $('panel').hidden : show;
    $('panel').hidden = !willOpen;
    document.body.classList.toggle('panel-open', willOpen);
    if (willOpen && last) update(last, true);
  }

  async function copy(fieldId, button) {
    const field = $(fieldId);
    try {
      await navigator.clipboard.writeText(field.value);
    } catch (e) {
      field.select();
      document.execCommand('copy');
    }
    const label = button.textContent;
    button.textContent = 'Copié ✓';
    setTimeout(() => { button.textContent = label; }, 1500);
  }

  ST.panel = { init, update, toggle, showError, isOpen: () => !$('panel').hidden };
})(window.ST = window.ST || {});
