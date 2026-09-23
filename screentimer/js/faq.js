/*
 * Lecture de la FAQ écrite par les profs dans le pad, en texte libre :
 *
 *   Peut-on utiliser une calculatrice ?
 *   Non, aucune calculatrice n'est autorisée.
 *
 *   Question 3 : faut-il gérer une liste vide ?
 *   Oui, renvoyez 0.
 *
 * - Un paragraphe dont la 1re ligne se termine par « ? » est une question ; les lignes suivantes
 *   sont la réponse (Markdown). Une ligne vide sépare deux questions.
 * - Préfixes explicites aussi acceptés : "Q:", "Question:", "## " pour la question,
 *   "R:", "A:", "Réponse:" pour la réponse.
 * - Le texte avant la première question (texte d'accueil du pad…) et les lignes "//" sont ignorés.
 */
(function (ST) {
  'use strict';

  const QUESTION = /^\s*(?:Q\s*[:.]|Question\s*:|#{2,3}\s)\s*(.*)$/i;
  const ANSWER = /^\s*(?:R|A|Réponse|Reponse|Answer)\s*:\s?(.*)$/i;

  function parse(text) {
    const items = [];
    let current = null;
    let paragraphStart = true;
    for (const raw of String(text || '').replace(/\r\n?/g, '\n').split('\n')) {
      const line = raw.replace(/\s+$/, '');
      if (/^\s*\/\//.test(line)) continue;
      if (!line.trim()) {
        paragraphStart = true;
        if (current) current.a.push(''); // une réponse peut avoir plusieurs paragraphes
        continue;
      }
      const q = line.match(QUESTION);
      const a = line.match(ANSWER);
      const isQuestion = (q && q[1].trim()) || (paragraphStart && !a && /\?$/.test(line));
      paragraphStart = false;
      if (isQuestion) {
        current = { q: (q && q[1].trim()) || line.trim(), a: [] };
        items.push(current);
      } else if (current) {
        current.a.push(a ? a[1] : line);
      }
    }
    return items.map((item) => ({ q: item.q, a: item.a.join('\n').trim() }));
  }

  /**
   * Repère ce qui a changé depuis la lecture précédente (les profs ajoutent des questions
   * pendant l'examen, et souvent la réponse un peu plus tard).
   *
   * `seen` : Map question -> { a, at, kind }, mise à jour sur place.
   * `baseline` : true pour la première lecture (rien n'est signalé comme nouveau).
   * Retourne l'index du premier élément nouveau ou modifié, ou -1.
   * kind : 'new' (nouvelle question), 'answered' (réponse ajoutée), 'updated' (réponse modifiée).
   */
  function track(seen, items, now, baseline) {
    let changed = -1;
    items.forEach((item, i) => {
      const prev = seen.get(item.q);
      if (prev && prev.a === item.a) return;
      const kind = !prev ? 'new' : prev.a ? 'updated' : 'answered';
      seen.set(item.q, { a: item.a, at: baseline ? 0 : now, kind });
      if (!baseline && changed < 0) changed = i;
    });
    return changed;
  }

  ST.faq = { parse, track };
})(window.ST = window.ST || {});
