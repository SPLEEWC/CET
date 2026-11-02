/*
  Handbook assistant: a simple keyword search over data/content.json.
  It is NOT an AI chatbot. A real AI assistant would need an approved back-end service.
  To change what it can find, edit the records in data/content.json (types: handbook, template, policy, practice).
*/
(function () {
  'use strict';
  var TYPES = ['handbook', 'template', 'policy', 'practice'];
  var STOP = 'a an the and or of to for in on is are how do i what where can my me with about'.split(' ');
  var items = [];
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function link(x) { return /^[\w./-]+$/.test(x.link || '') ? '../' + x.link : ''; }

  function answer(q) {
    var words = q.toLowerCase().split(/[^a-z0-9]+/).filter(function (w) { return w && STOP.indexOf(w) < 0; });
    var out = $('answer');
    if (!words.length) { out.textContent = 'Please type a question or keywords.'; return; }
    var scored = items.map(function (x) {
      var hay = [x.title, x.tag, x.desc, x.meta].join(' ').toLowerCase();
      var score = words.reduce(function (n, w) { return n + (hay.indexOf(w) >= 0 ? (x.title.toLowerCase().indexOf(w) >= 0 ? 2 : 1) : 0); }, 0);
      return { x: x, score: score };
    }).filter(function (r) { return r.score > 0; }).sort(function (a, b) { return b.score - a.score; }).slice(0, 4);
    if (!scored.length) {
      out.innerHTML = '<p>No matching handbook entries were found. Please contact your PACE account manager.</p>';
      return;
    }
    out.innerHTML = '<p>These entries may help:</p><ul>' + scored.map(function (r) {
      var l = link(r.x);
      return '<li><b>' + (l ? '<a href="' + esc(l) + '">' + esc(r.x.title) + '</a>' : esc(r.x.title)) + '</b> (' + esc(r.x.tag) + ') – ' + esc(r.x.desc) + '</li>';
    }).join('') + '</ul>';
  }

  $('askForm').addEventListener('submit', function (e) { e.preventDefault(); answer($('askBox').value); });
  fetch('../data/content.json')
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) { items = (d.items || []).filter(function (x) { return TYPES.indexOf(x.type) >= 0; }); })
    .catch(function () { $('answer').textContent = 'The assistant could not load its content. If you opened the page by double-clicking it, use a local web server (see README.md).'; });
})();
