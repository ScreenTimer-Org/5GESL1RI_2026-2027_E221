/*
 * Calculs horaires purs (sans DOM) : faciles à tester.
 * Les heures sont saisies en "HH:MM" pour la journée en cours.
 */
(function (ST) {
  'use strict';

  const MINUTE = 60 * 1000;
  const DAY = 24 * 60 * MINUTE;

  /** "14:30", "14h30", "14h", "9.05" -> minutes depuis minuit, ou null. */
  function parseHM(value) {
    const m = String(value || '').trim().match(/^(\d{1,2})(?:\s*[:hH.]\s*(\d{2})?)?$/);
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2] || 0);
    if (h > 23 || min > 59) return null;
    return h * 60 + min;
  }

  function atMinutes(now, minutes) {
    const d = new Date(now.getTime());
    d.setHours(0, 0, 0, 0);
    d.setMinutes(minutes);
    return d;
  }

  const pad = (n) => String(n).padStart(2, '0');

  function formatHM(minutesOrDate) {
    if (minutesOrDate instanceof Date) return pad(minutesOrDate.getHours()) + ':' + pad(minutesOrDate.getMinutes());
    if (minutesOrDate == null) return '';
    return pad(Math.floor(minutesOrDate / 60) % 24) + ':' + pad(minutesOrDate % 60);
  }

  /**
   * Durée restante lisible.
   * Sans secondes : "1 h 05", "12 min", puis "45 s" pendant la dernière minute
   * (minutes arrondies au-dessus : on n'affiche jamais "0 min" tant qu'il reste du temps).
   * Avec secondes : "1:05:09" ou "05:09".
   */
  function formatDuration(ms, withSeconds) {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    if (withSeconds) {
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      return (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(s);
    }
    if (totalSec < 60) return totalSec + ' s';
    const totalMin = Math.ceil(totalSec / 60);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h ? h + ' h ' + pad(m) : m + ' min';
  }

  /**
   * État de l'écran à l'instant `now` (Date déjà corrigée du décalage local).
   * phase : 'unset' (pas d'heure de fin), 'before' (avant le début), 'running', 'finished'.
   */
  function computeState(cfg, now) {
    const endMin = parseHM(cfg.end);
    const startMin = parseHM(cfg.start);
    const leaveMin = parseHM(cfg.leave);
    const base = {
      phase: 'unset', remainingMs: 0, untilStartMs: 0, progress: null,
      level: 'normal', canLeave: null, start: startMin, end: endMin, leave: leaveMin,
    };
    if (endMin == null) return base;

    const start = startMin == null ? null : atMinutes(now, startMin);
    let end = atMinutes(now, endMin);
    // Épreuve à cheval sur minuit (ex. 23:00 -> 01:00).
    if (start && end <= start) end = new Date(end.getTime() + DAY);

    const state = Object.assign(base, { remainingMs: end - now });

    if (start && now < start) {
      state.phase = 'before';
      state.untilStartMs = start - now;
      state.progress = 0;
    } else if (now >= end) {
      state.phase = 'finished';
      state.remainingMs = 0;
      state.progress = 1;
      state.level = 'danger';
    } else {
      state.phase = 'running';
      if (start) state.progress = (now - start) / (end - start);
      const remainingMin = state.remainingMs / MINUTE;
      if (remainingMin <= Number(cfg.danger)) state.level = 'danger';
      else if (remainingMin <= Number(cfg.warn)) state.level = 'warn';
    }

    if (leaveMin != null && state.phase !== 'before') {
      state.canLeave = now >= atMinutes(now, leaveMin);
    }
    return state;
  }

  /** Heure courante corrigée du décalage local (minutes, décimales autorisées). */
  function nowWithOffset(offsetMinutes, realNow) {
    const t = (realNow || new Date()).getTime();
    return new Date(t + (Number(offsetMinutes) || 0) * MINUTE);
  }

  ST.timer = { parseHM, formatHM, formatDuration, computeState, nowWithOffset };
})(window.ST = window.ST || {});
