/*
 * L'écran projeté : dessine la config, le compte à rebours et la FAQ.
 * Aucun accès réseau ni au panneau : main.js lui donne les données.
 */
(function (ST) {
  'use strict';

  const { config, timer, faq, markdown } = ST;
  const $ = (id) => document.getElementById(id);

  const FAQ_ROTATE_MS = 12000; // durée d'affichage d'une question
  const FAQ_BADGE_MS = 5 * 60 * 1000; // badge « Nouveau » / « Réponse » / « Mis à jour »
  const BADGES = { new: 'Nouveau', answered: 'Réponse', updated: 'Mis à jour' };
  const LEVELS = { exam: { warn: 15, danger: 5 }, break: { warn: 2, danger: 1 } }; // minutes restantes
  const LABELS = {
    exam: { unset: 'Heure de fin non définie', before: "L'épreuve commence dans", running: 'Temps restant', finished: 'Temps écoulé' },
    break: { unset: 'Heure de reprise non définie', before: 'La pause commence dans', running: 'Reprise dans', finished: 'La pause est terminée' },
  };

  const faqState = { items: [], index: 0, shownAt: 0, seen: new Map(), baseline: true };
  let hasConsignes = false;

  // ---------------------------------------------------------------- contenu

  function setText(id, text) {
    const el = $(id);
    el.textContent = text || '';
    el.hidden = !text;
  }

  function render(cfg) {
    const root = document.documentElement;
    root.dataset.theme = cfg.theme === 'dark' ? 'dark' : 'light';
    root.style.setProperty('--zoom', Math.min(3, Math.max(0.3, cfg.zoom || 1)));

    const logo = config.safeImageUrl(cfg.logo);
    if (logo && $('logo').getAttribute('src') !== logo) $('logo').src = logo;
    $('logo').hidden = !logo;

    const title = cfg.mode === 'break' && cfg.title === config.DEFAULTS.title ? 'Pause' : cfg.title;
    $('title').textContent = title;
    setText('code', cfg.code);
    setText('room', cfg.room ? 'Local ' + cfg.room : '');
    document.title = [cfg.code, title, cfg.room].filter(Boolean).join(' · ') || 'Screen Timer';

    const consignes = markdown.render(cfg.consignes);
    $('consignes').innerHTML = consignes;
    hasConsignes = !!consignes;
    layout();
  }

  /** Colonne de gauche (consignes, FAQ) seulement si elle a du contenu. */
  function layout() {
    const hasFaq = faqState.items.length > 0;
    $('consignesCard').hidden = !hasConsignes;
    $('faqCard').hidden = !hasFaq;
    $('side').hidden = !hasConsignes && !hasFaq;
    $('body').classList.toggle('solo', !hasConsignes && !hasFaq);
  }

  function setStatus(text, isError) {
    $('syncStatus').textContent = text || '';
    $('syncStatus').classList.toggle('error', !!isError);
  }

  // ---------------------------------------------------------------- FAQ

  /** Nouvelle liste de questions. Une nouveauté est montrée tout de suite, dans tous les locaux. */
  function setFaq(items) {
    const current = faqState.items[faqState.index];
    const changed = faq.track(faqState.seen, items, Date.now(), faqState.baseline);
    faqState.baseline = false;
    faqState.items = items;
    layout();
    if (changed >= 0) {
      showFaq(changed);
    } else {
      const keep = current ? items.findIndex((it) => it.q === current.q) : -1;
      showFaq(keep >= 0 ? keep : 0, keep >= 0);
    }
  }

  function showFaq(index, keepTimer) {
    const items = faqState.items;
    if (!items.length) return;
    faqState.index = ((index % items.length) + items.length) % items.length;
    const item = items[faqState.index];

    $('faqQ').textContent = item.q;
    $('faqA').innerHTML = markdown.render(item.a || '_Réponse à venir._');
    const seen = faqState.seen.get(item.q);
    $('faqNew').hidden = !(seen && Date.now() - seen.at < FAQ_BADGE_MS);
    if (seen) $('faqNew').textContent = BADGES[seen.kind];
    $('faqCount').textContent = items.length > 1 ? faqState.index + 1 + ' / ' + items.length : '';
    $('faqDots').innerHTML = items.length > 1
      ? items.map((_, i) => '<i class="' + (i === faqState.index ? 'on' : '') + '"></i>').join('')
      : '';

    if (!keepTimer) {
      faqState.shownAt = Date.now();
      const el = $('faqItem');
      el.classList.remove('fade');
      void el.offsetWidth; // relance l'animation
      el.classList.add('fade');
    }
  }

  function nextFaq(step) {
    showFaq(faqState.index + step);
  }

  // ---------------------------------------------------------------- horloge (appelée 4 fois par seconde)

  function tick(cfg) {
    const mode = cfg.mode === 'break' ? 'break' : 'exam';
    const now = timer.nowWithOffset(cfg.offset);
    const st = timer.computeState(Object.assign({}, cfg, LEVELS[mode]), now);

    $('clock').textContent = timer.formatHM(now);
    $('phaseLabel').textContent = LABELS[mode][st.phase];

    let big = timer.formatDuration(st.remainingMs, cfg.seconds);
    if (st.phase === 'unset') big = '--';
    else if (st.phase === 'before') big = timer.formatDuration(st.untilStartMs, cfg.seconds);
    else if (st.phase === 'finished') big = mode === 'break' ? 'Reprise' : 'Terminé';
    if ($('countdown').textContent !== big) $('countdown').textContent = big;

    $('timer').dataset.phase = st.phase;
    $('timer').dataset.level = st.phase === 'running' || st.phase === 'finished' ? st.level : 'normal';

    $('progress').hidden = st.progress == null;
    if (st.progress != null) $('progressBar').style.width = (st.progress * 100).toFixed(2) + '%';

    let leave = '';
    let canLeave = false;
    if (mode === 'exam' && st.phase === 'running' && st.canLeave != null) {
      canLeave = st.canLeave;
      leave = canLeave ? 'Vous pouvez quitter le local après avoir remis votre copie.'
        : 'Sortie autorisée à partir de ' + timer.formatHM(st.leave);
    } else if (mode === 'exam' && st.phase === 'finished') {
      leave = 'Posez vos stylos et restez assis.';
    }
    setText('leaveInfo', leave);
    $('leaveInfo').classList.toggle('ok', canLeave);

    setTime('start', st.start);
    setTime('end', st.end);
    setTime('leave', mode === 'break' ? null : st.leave);
    $('endLabel').textContent = mode === 'break' ? 'Reprise' : 'Fin';

    if (faqState.items.length > 1 && Date.now() - faqState.shownAt >= FAQ_ROTATE_MS) nextFaq(1);
  }

  function setTime(name, minutes) {
    $(name + 'Box').hidden = minutes == null;
    $(name + 'Time').textContent = timer.formatHM(minutes);
  }

  ST.screen = { render, setFaq, setStatus, nextFaq, tick };
})(window.ST = window.ST || {});
