/*
  SP CET Portal – app.js
  ----------------------------------------------------------------------
  WHERE TO UPDATE CONTENT (no programming needed):
    * Cards (handbook, courses, practices, opportunities): data/content.json
    * Wording and headings: index.html
    * Colours: styles.css
  You normally do not need to edit this file.
  ----------------------------------------------------------------------
*/
(function () {
  'use strict';

  var DATA_URL = 'data/content.json';   // the file that holds all demonstration cards
  var STORE_KEY = 'cetPosts';           // browser storage key for posts made with the form

  var baseItems = [];                   // records loaded from content.json
  var posts = [];                       // records created through the form (this browser only)
  var state = { type: 'all', query: '' };
  var lastFocus = null;

  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function allItems() { return posts.concat(baseItems); }

  function loadPosts() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORE_KEY));
      posts = Array.isArray(saved) ? saved : [];
    } catch (e) { posts = []; }
  }

  function savePosts() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(posts)); } catch (e) { /* storage unavailable */ }
  }

  function safeLink(url) {
    // allow only relative links or http(s) links
    return /^(https?:\/\/|[\w./-]+$)/i.test(url || '') ? url : '';
  }

  function cardHtml(x) {
    var link = safeLink(x.link);
    return '<article class="card"><div class="card-top"><div class="tag">' + esc(x.tag) + '</div></div>' +
      '<h3>' + esc(x.title) + '</h3><p>' + esc(x.desc) + '</p>' +
      (link ? '<a class="more" href="' + esc(link) + '">Open resource →</a>' : '') +
      '<div class="meta"><span>' + esc(x.owner) + '</span><b>' + esc(x.meta) + '</b></div></article>';
  }

  function matches(x) {
    if (state.type !== 'all' && x.type !== state.type) return false;
    if (!state.query) return true;
    return [x.tag, x.title, x.desc, x.owner, x.meta, x.type].join(' ').toLowerCase().indexOf(state.query) !== -1;
  }

  function updateStats() {
    var items = allItems();
    var schools = {};
    items.forEach(function (x) { if (x.type !== 'handbook' && x.owner) schools[x.owner] = true; });
    $('schoolCount').textContent = Object.keys(schools).length;
    $('courseCount').textContent = items.filter(function (x) { return x.type === 'course'; }).length;
    $('opportunityCount').textContent = items.filter(function (x) { return x.type === 'opportunity'; }).length;
  }

  function render() {
    var list = allItems().filter(matches);
    $('contentGrid').innerHTML = list.length ? list.map(cardHtml).join('') : '<p class="empty">No matching items found. Try a different search or filter.</p>';
    var label = state.type === 'all' ? 'all content' : state.type;
    $('resultStatus').textContent = list.length + ' item' + (list.length === 1 ? '' : 's') + ' shown' +
      (state.query ? ' for “' + state.query + '”' : '') + ' (' + label + ')';
    document.querySelectorAll('.chip').forEach(function (c) {
      var on = c.getAttribute('data-filter') === state.type;
      c.classList.toggle('active', on);
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    updateStats();
  }

  function scrollToContent() {
    $('content').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  function setFilter(type) {
    state.type = type;
    render();
    scrollToContent();
  }

  /* ---- Modal ---- */
  function focusables() {
    return $('modal').querySelectorAll('input,select,textarea,button');
  }
  function openModal() {
    lastFocus = document.activeElement;
    $('formError').textContent = '';
    $('modal').hidden = false;
    $('modal').classList.add('open');
    $('postType').focus();
  }
  function closeModal() {
    $('modal').classList.remove('open');
    $('modal').hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function submitPost(e) {
    e.preventDefault();
    var title = $('postTitle').value.trim(), school = $('postSchool').value.trim(), desc = $('postDesc').value.trim();
    if (!title || !school || !desc) {
      $('formError').textContent = 'Please complete the title, school and description.';
      (!title ? $('postTitle') : !school ? $('postSchool') : $('postDesc')).focus();
      return;
    }
    posts.unshift({ id: 'post-' + Date.now(), type: 'opportunity', tag: $('postType').value, title: title, desc: desc, owner: school, meta: 'New', isPost: true });
    savePosts();
    $('postForm').reset();
    state.type = 'opportunity'; state.query = ''; $('searchBox').value = '';
    render();
    closeModal();
    scrollToContent();
  }

  /* ---- Wiring ---- */
  function bind() {
    $('searchForm').addEventListener('submit', function (e) {
      e.preventDefault();
      state.query = $('searchBox').value.toLowerCase().trim();
      state.type = 'all';
      render();
      scrollToContent();
    });
    document.querySelectorAll('[data-filter]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.query = ''; $('searchBox').value = '';
        setFilter(b.getAttribute('data-filter'));
      });
    });
    document.querySelectorAll('[data-open-modal]').forEach(function (b) { b.addEventListener('click', openModal); });
    $('cancelPost').addEventListener('click', closeModal);
    $('postForm').addEventListener('submit', submitPost);
    $('modal').addEventListener('mousedown', function (e) { if (e.target === $('modal')) closeModal(); });
    document.addEventListener('keydown', function (e) {
      if ($('modal').hidden) return;
      if (e.key === 'Escape') { closeModal(); return; }
      if (e.key === 'Tab') {            // keep keyboard focus inside the dialog
        var f = focusables(), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    var nav = $('siteNav'), btn = $('menuBtn');
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
    });
  }

  function showError(msg) {
    $('contentGrid').innerHTML = '<p class="error">' + esc(msg) + '</p>';
    $('resultStatus').textContent = '';
  }

  function init() {
    bind();
    loadPosts();
    fetch(DATA_URL)
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        baseItems = Array.isArray(data.items) ? data.items : [];
        render();
      })
      .catch(function () {
        render();
        showError('Content could not be loaded from data/content.json. If you opened index.html by double-clicking it, run a local web server instead (see README.md). Otherwise check the JSON file for a missing comma or quotation mark.');
      });
  }

  init();
})();
