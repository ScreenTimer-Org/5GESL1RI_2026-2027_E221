/*
 * Mini-rendu Markdown sûr (sous-ensemble) pour les consignes et la FAQ.
 * Tout le texte est échappé AVANT la mise en forme : un lien partagé ne peut
 * donc pas injecter de HTML/JS dans l'écran d'un autre local.
 *
 * Supporté : # titres, listes - / 1., **gras**, *italique*, _italique_,
 * ~~barré~~, `code`, [lien](https://...). Une ligne vide sépare les blocs.
 */
(function (ST) {
  'use strict';

  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (c) => ESCAPES[c]);
  }

  function inline(text) {
    // Le code et les liens sont mis de côté pour ne pas être reformatés.
    const stash = [];
    const keep = (html) => '\u0000' + (stash.push(html) - 1) + '\u0000';

    let s = escapeHtml(String(text).replace(/\u0000/g, ''));
    s = s.replace(/`([^`]+)`/g, (_, code) => keep('<code>' + code + '</code>'));
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      (_, label, url) => keep('<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + label + '</a>'));
    s = s.replace(/\*\*(?=\S)(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*(?=\S)([^*]+?)\*/g, '<em>$1</em>');
    s = s.replace(/(^|[^\w])_(?=\S)([^_]+?)_(?![\w])/g, '$1<em>$2</em>');
    s = s.replace(/~~(?=\S)(.+?)~~/g, '<del>$1</del>');
    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[i]);
  }

  function render(markdown) {
    const lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n');
    let html = '';
    let para = [];
    let list = null; // { tag: 'ul' | 'ol', items: [] }

    const flushPara = () => {
      if (para.length) html += '<p>' + para.map(inline).join('<br>') + '</p>';
      para = [];
    };
    const flushList = () => {
      if (list) {
        html += '<' + list.tag + '>' + list.items.map((i) => '<li>' + inline(i) + '</li>').join('') + '</' + list.tag + '>';
      }
      list = null;
    };
    const pushItem = (tag, text) => {
      flushPara();
      if (!list || list.tag !== tag) {
        flushList();
        list = { tag, items: [] };
      }
      list.items.push(text);
    };

    for (const raw of lines) {
      const line = raw.replace(/\s+$/, '');
      let m;
      if (!line.trim()) {
        flushPara();
        flushList();
      } else if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
        flushPara();
        flushList();
        const level = m[1].length + 2; // # -> h3 : les titres restent sous le titre de l'écran
        html += '<h' + level + '>' + inline(m[2]) + '</h' + level + '>';
      } else if ((m = line.match(/^\s*[-*+]\s+(.*)$/))) {
        pushItem('ul', m[1]);
      } else if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
        pushItem('ol', m[1]);
      } else if (list && /^\s+/.test(line)) {
        list.items[list.items.length - 1] += ' ' + line.trim();
      } else {
        flushList();
        para.push(line.trim());
      }
    }
    flushPara();
    flushList();
    return html;
  }

  ST.markdown = { render, inline, escapeHtml };
})(window.ST = window.ST || {});
