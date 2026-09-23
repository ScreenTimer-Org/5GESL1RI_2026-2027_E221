/* Tests unitaires des modules purs. Ouvrir tests/index.html (servi en http). */
(function (ST) {
  'use strict';

  const results = [];
  function test(name, fn) {
    try {
      fn();
      results.push({ name, ok: true });
    } catch (e) {
      results.push({ name, ok: false, error: e.message });
    }
  }
  function eq(actual, expected, msg) {
    const a = JSON.stringify(actual);
    const b = JSON.stringify(expected);
    if (a !== b) throw new Error((msg ? msg + ' : ' : '') + 'obtenu ' + a + ', attendu ' + b);
  }
  const at = (hh, mm, ss) => new Date(2026, 5, 15, hh, mm, ss || 0);
  const cfg = (o) => ST.config.merge(o);

  // ------------------------------------------------------------ timer
  test('parseHM accepte plusieurs formats', () => {
    eq(ST.timer.parseHM('14:30'), 870);
    eq(ST.timer.parseHM('9h05'), 545);
    eq(ST.timer.parseHM('14h'), 840);
    eq(ST.timer.parseHM(' 08.15 '), 495);
    eq(ST.timer.parseHM('00:00'), 0);
  });
  test('parseHM refuse les valeurs invalides', () => {
    eq(ST.timer.parseHM(''), null);
    eq(ST.timer.parseHM('24:00'), null);
    eq(ST.timer.parseHM('12:60'), null);
    eq(ST.timer.parseHM('midi'), null);
  });
  test('formatDuration sans secondes arrondit au-dessus', () => {
    eq(ST.timer.formatDuration(65 * 60000, false), '1 h 05');
    eq(ST.timer.formatDuration(12 * 60000 + 1, false), '13 min');
    eq(ST.timer.formatDuration(60000, false), '1 min');
    eq(ST.timer.formatDuration(59000, false), '59 s');
    eq(ST.timer.formatDuration(-5, false), '0 s');
  });
  test('formatDuration avec secondes', () => {
    eq(ST.timer.formatDuration((3600 + 5 * 60 + 9) * 1000, true), '1:05:09');
    eq(ST.timer.formatDuration(309000, true), '05:09');
  });
  test('état : pas d’heure de fin', () => {
    eq(ST.timer.computeState(cfg({}), at(10, 0)).phase, 'unset');
  });
  test('état : avant le début', () => {
    const st = ST.timer.computeState(cfg({ start: '10:00', end: '12:00' }), at(9, 30));
    eq(st.phase, 'before');
    eq(st.untilStartMs, 30 * 60000);
  });
  test('état : en cours, progression et niveau', () => {
    const c = cfg({ start: '10:00', end: '12:00', warn: 15, danger: 5 });
    let st = ST.timer.computeState(c, at(11, 0));
    eq([st.phase, st.progress, st.level, st.remainingMs], ['running', 0.5, 'normal', 3600000]);
    eq(ST.timer.computeState(c, at(11, 50)).level, 'warn');
    eq(ST.timer.computeState(c, at(11, 56)).level, 'danger');
  });
  test('état : terminé', () => {
    const st = ST.timer.computeState(cfg({ start: '10:00', end: '12:00' }), at(12, 0));
    eq([st.phase, st.remainingMs], ['finished', 0]);
  });
  test('état : sortie autorisée', () => {
    const c = cfg({ start: '10:00', end: '12:00', leave: '11:00' });
    eq(ST.timer.computeState(c, at(10, 59, 59)).canLeave, false);
    eq(ST.timer.computeState(c, at(11, 0)).canLeave, true);
    eq(ST.timer.computeState(cfg({ end: '12:00' }), at(11, 0)).canLeave, null);
  });
  test('état : épreuve à cheval sur minuit', () => {
    const st = ST.timer.computeState(cfg({ start: '23:00', end: '01:00' }), at(23, 30));
    eq([st.phase, st.remainingMs], ['running', 90 * 60000]);
  });
  test('décalage horaire', () => {
    eq(ST.timer.nowWithOffset(2, at(10, 0)).getTime(), at(10, 2).getTime());
    eq(ST.timer.nowWithOffset('-1.5', at(10, 0)).getTime(), at(9, 58, 30).getTime());
  });

  // ------------------------------------------------------------ config
  test('fromQuery : clés connues et typées', () => {
    eq(ST.config.fromQuery('?title=DEV1&zoom=1,5&seconds=oui&inconnu=x'), { title: 'DEV1', zoom: 1.5, seconds: true });
  });
  test('toQuery : seulement les valeurs non par défaut, sans réglages du local', () => {
    const q = ST.config.toQuery(cfg({ title: 'Math', end: '12:00', room: 'L408', zoom: 2, seconds: true, faq: 'abc' }));
    eq(q, 'title=Math&end=12%3A00&faq=abc&seconds=1');
  });
  test('aller-retour lien de partage', () => {
    const c = cfg({ title: 'Été & co', consignes: '- a\n- b', end: '12:00' });
    eq(ST.config.merge(ST.config.fromQuery(ST.config.toQuery(c))), c);
  });
  test('storageKey ne dépend ni de l’ordre, ni du zoom, ni du décalage', () => {
    eq(ST.config.storageKey('?a=1&title=X&end=12:00'), ST.config.storageKey('?end=12:00&title=X&zoom=2&offset=1'));
    eq(ST.config.storageKey('?title=X') === ST.config.storageKey('?title=Y'), false);
  });
  test('storageKey : un lien par local garde des réglages séparés', () => {
    eq(ST.config.storageKey('?title=X&room=L1') === ST.config.storageKey('?title=X&room=L2'), false);
  });
  test('safeImageUrl bloque les schémas dangereux', () => {
    eq(ST.config.safeImageUrl('javascript:alert(1)'), '');
    eq(ST.config.safeImageUrl('file:///etc/passwd'), '');
    eq(ST.config.safeImageUrl('assets/logo.svg'), 'assets/logo.svg');
    eq(ST.config.safeImageUrl('https://x.be/l.png'), 'https://x.be/l.png');
  });

  // ------------------------------------------------------------ faq
  test('FAQ du pad : paragraphe dont la 1re ligne finit par « ? »', () => {
    const pad = 'Bienvenue sur Framapad !\nCe pad est collaboratif.\n\nPeut-on utiliser une calculatrice ?\nNon.\n\n'
      + 'Question 3 : faut-il gérer une liste vide ?\nOui, renvoyez 0.\n\nPrécision : pas de récursivité.\n\n'
      + 'Peut-on sortir ?\n';
    eq(ST.faq.parse(pad), [
      { q: 'Peut-on utiliser une calculatrice ?', a: 'Non.' },
      { q: 'Question 3 : faut-il gérer une liste vide ?', a: 'Oui, renvoyez 0.\n\nPrécision : pas de récursivité.' },
      { q: 'Peut-on sortir ?', a: '' },
    ]);
  });
  test('FAQ du pad : préfixes Q:/R:, commentaires', () => {
    const items = ST.faq.parse('// note\nQ: Calculatrice ?\nR: Non.\n\nQ. Toilettes ?\nOui,\n**une** personne à la fois.\n## Brouillon ?\nA: Feuilles fournies');
    eq(items, [
      { q: 'Calculatrice ?', a: 'Non.' },
      { q: 'Toilettes ?', a: 'Oui,\n**une** personne à la fois.' },
      { q: 'Brouillon ?', a: 'Feuilles fournies' },
    ]);
  });
  test('FAQ du pad : une réponse qui finit par « ? » reste une réponse', () => {
    eq(ST.faq.parse('Faut-il commenter ?\nPourquoi pas ?'), [{ q: 'Faut-il commenter ?', a: 'Pourquoi pas ?' }]);
  });
  test('FAQ vide', () => {
    eq(ST.faq.parse(''), []);
    eq(ST.faq.parse(null), []);
    eq(ST.faq.parse('Welcome to Etherpad!'), []);
  });
  test('FAQ : suivi des nouvelles questions et réponses', () => {
    const seen = new Map();
    eq(ST.faq.track(seen, [{ q: 'a?', a: 'x' }], 1, true), -1, 'lecture initiale');
    eq(seen.get('a?').at, 0);
    eq(ST.faq.track(seen, [{ q: 'a?', a: 'x' }], 2, false), -1, 'rien de changé');
    eq(ST.faq.track(seen, [{ q: 'a?', a: 'x' }, { q: 'b?', a: '' }], 3, false), 1, 'nouvelle question');
    eq(seen.get('b?').kind, 'new');
    eq(ST.faq.track(seen, [{ q: 'a?', a: 'x' }, { q: 'b?', a: 'oui' }], 4, false), 1, 'réponse ajoutée');
    eq([seen.get('b?').kind, seen.get('b?').at], ['answered', 4]);
    eq(ST.faq.track(seen, [{ q: 'a?', a: 'y' }, { q: 'b?', a: 'oui' }], 5, false), 0, 'réponse modifiée');
    eq(seen.get('a?').kind, 'updated');
  });

  // ------------------------------------------------------------ markdown
  test('markdown : listes, gras, liens', () => {
    eq(ST.markdown.render('- **a**\n- *b* et `c`\n\n[site](https://esi.be)'),
      '<ul><li><strong>a</strong></li><li><em>b</em> et <code>c</code></li></ul><p><a href="https://esi.be" target="_blank" rel="noopener noreferrer">site</a></p>');
  });
  test('markdown : liste numérotée, titre, retour à la ligne', () => {
    eq(ST.markdown.render('# T\n1. un\n2. deux\nligne 1\nligne 2'), '<h3>T</h3><ol><li>un</li><li>deux</li></ol><p>ligne 1<br>ligne 2</p>');
  });
  test('markdown : pas d’injection HTML', () => {
    const html = ST.markdown.render('<img src=x onerror=alert(1)> [x](javascript:alert(1)) "quote"');
    eq(html.includes('<img'), false, 'balise img');
    eq(html.includes('href="javascript'), false, 'lien javascript');
  });
  test('markdown : les _ dans une URL ne deviennent pas de l’italique', () => {
    eq(ST.markdown.render('[a](https://x.be/a_b_c)'), '<p><a href="https://x.be/a_b_c" target="_blank" rel="noopener noreferrer">a</a></p>');
  });

  ST.testResults = results;
})(window.ST = window.ST || {});
