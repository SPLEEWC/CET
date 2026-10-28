/*
  SP CET Portal – applications.js (course document applications and approvals)
  ----------------------------------------------------------------------
  WHERE TO UPDATE CONTENT (no programming needed):
    * Required documents, schools, course types, example applications: data/applications.json
    * Page wording: applications/index.html
  PROTOTYPE: records live in this browser only (localStorage); files are not uploaded.
  ----------------------------------------------------------------------
*/
(function () {
  'use strict';

  var DATA_URL = '../data/applications.json';
  var STORE_KEY = 'cetApplications';
  var ROLE_KEY = 'cetRole';
  var MAX_BYTES = 10 * 1024 * 1024;
  var EXTS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
  var STATUS = {
    submitted: 'Submitted',
    review: 'Under review',
    returned: 'Returned for changes',
    approved: 'Approved',
    rejected: 'Rejected'
  };

  var cfg = { schools: [], courseTypes: [], documents: [] };
  var seeds = [];
  var local = [];                 // new or modified records stored in this browser
  var filter = 'all';
  var role = 'submitter';
  var pendingFiles = {};          // file names chosen in the new-application form
  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(iso) {
    var d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short' });
  }

  /* ---- storage ---- */
  function loadLocal() {
    try { var v = JSON.parse(localStorage.getItem(STORE_KEY)); local = Array.isArray(v) ? v : []; }
    catch (e) { local = []; }
  }
  function saveLocal() { try { localStorage.setItem(STORE_KEY, JSON.stringify(local)); } catch (e) { /* unavailable */ } }
  function all() {
    var ids = {};
    local.forEach(function (x) { ids[x.id] = true; });
    return local.concat(seeds.filter(function (x) { return !ids[x.id]; }));
  }
  function update(rec) {           // store a changed record (copies seeds into local on first change)
    var i = local.findIndex(function (x) { return x.id === rec.id; });
    if (i >= 0) local[i] = rec; else local.unshift(rec);
    saveLocal();
  }
  function find(id) {
    return all().filter(function (x) { return x.id === id; })[0];
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ---- helpers ---- */
  function missingRequired(rec) {
    return cfg.documents.filter(function (d) { return d.required && !(rec.files && rec.files[d.key]); });
  }
  function checkFile(file) {
    if (!file) return '';
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    if (EXTS.indexOf(ext) < 0) return 'Unsupported file type: ' + file.name + '. Use PDF, Word, Excel or PowerPoint.';
    if (file.size > MAX_BYTES) return file.name + ' is larger than 10 MB.';
    return '';
  }
  function newId() {
    var n = 1000 + all().length + 1;
    return 'APP-' + n + '-' + Date.now().toString(36).slice(-3).toUpperCase();
  }

  /* ---- rendering ---- */
  function options(list) { return list.map(function (s) { return '<option>' + esc(s) + '</option>'; }).join(''); }

  function buildForm() {
    $('fType').innerHTML = options(cfg.courseTypes);
    $('fSchool').innerHTML = options(cfg.schools);
    $('docFields').innerHTML = cfg.documents.map(function (d) {
      return '<div class="doc-row"><label for="doc-' + esc(d.key) + '">' + esc(d.label) + (d.required ? ' <span class="req">(required)</span>' : ' <span class="opt">(optional)</span>') + '</label>' +
        '<input type="file" id="doc-' + esc(d.key) + '" data-doc="' + esc(d.key) + '" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"></div>';
    }).join('');
  }

  function renderStats() {
    var items = all(), c = { all: items.length };
    Object.keys(STATUS).forEach(function (k) { c[k] = items.filter(function (x) { return x.status === k; }).length; });
    var pending = c.submitted + c.review;
    var tiles = [['Total applications', c.all], ['Awaiting decision', pending], ['Approved', c.approved], ['Returned / rejected', c.returned + c.rejected]];
    $('appStats').innerHTML = tiles.map(function (t) { return '<li class="stat"><span>' + t[0] + '</span><b>' + t[1] + '</b></li>'; }).join('');
  }

  function renderFilters() {
    var items = all();
    var keys = ['all'].concat(Object.keys(STATUS));
    $('statusFilters').innerHTML = keys.map(function (k) {
      var n = k === 'all' ? items.length : items.filter(function (x) { return x.status === k; }).length;
      var on = filter === k;
      return '<button type="button" class="chip' + (on ? ' active' : '') + '" data-status="' + k + '" aria-pressed="' + on + '">' + (k === 'all' ? 'All' : STATUS[k]) + ' (' + n + ')</button>';
    }).join('');
  }

  function docsHtml(rec) {
    return '<ul class="doc-list">' + cfg.documents.map(function (d) {
      var f = rec.files && rec.files[d.key];
      return '<li>' + (f ? '<span class="ok" aria-hidden="true">✓</span> ' : '<span class="miss" aria-hidden="true">–</span> ') + esc(d.label) + ': ' +
        (f ? '<b>' + esc(f) + '</b>' : '<i>' + (d.required ? 'missing (required)' : 'not provided') + '</i>') + '</li>';
    }).join('') + '</ul>';
  }

  function actionsHtml(rec) {
    var id = esc(rec.id);
    if (role === 'approver' && (rec.status === 'submitted' || rec.status === 'review')) {
      return '<div class="decision"><label for="note-' + id + '">Decision comment (required to return or reject)</label>' +
        '<textarea id="note-' + id + '" maxlength="500"></textarea><p class="form-error" id="err-' + id + '" role="alert"></p>' +
        '<div class="actions">' + (rec.status === 'submitted' ? '<button type="button" class="secondary" data-act="review" data-id="' + id + '">Start review</button>' : '') +
        '<button type="button" class="secondary" data-act="reject" data-id="' + id + '">Reject</button>' +
        '<button type="button" class="secondary" data-act="return" data-id="' + id + '">Return for changes</button>' +
        '<button type="button" class="primary" data-act="approve" data-id="' + id + '">Approve</button></div></div>';
    }
    if (role === 'submitter' && rec.status === 'returned') {
      var missing = cfg.documents.filter(function (d) { return !(rec.files && rec.files[d.key]) && d.required; });
      return '<div class="decision"><p><b>Update and resubmit.</b> Attach any missing documents, then resubmit.</p>' +
        missing.map(function (d) {
          return '<div class="doc-row"><label for="re-' + id + '-' + esc(d.key) + '">' + esc(d.label) + ' <span class="req">(required)</span></label>' +
            '<input type="file" id="re-' + id + '-' + esc(d.key) + '" data-redoc="' + esc(d.key) + '" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"></div>';
        }).join('') +
        '<p class="form-error" id="err-' + id + '" role="alert"></p>' +
        '<div class="actions"><button type="button" class="primary" data-act="resubmit" data-id="' + id + '">Resubmit for approval</button></div></div>';
    }
    return '';
  }

  function cardHtml(rec) {
    var hist = (rec.history || []).map(function (h) {
      return '<li><b>' + esc(h.action) + '</b> · ' + esc(h.by) + ' · <time>' + esc(fmt(h.at)) + '</time>' + (h.note ? '<br><span class="note">' + esc(h.note) + '</span>' : '') + '</li>';
    }).join('');
    return '<article class="card app-card" id="' + esc(rec.id) + '"><div class="card-top"><div class="tag">' + esc(rec.courseType) + ' · ' + esc(rec.school) + '</div>' +
      '<span class="pill s-' + esc(rec.status) + '">' + esc(STATUS[rec.status] || rec.status) + '</span></div>' +
      '<h3>' + esc(rec.title) + '</h3>' +
      '<p>' + esc(rec.summary) + '</p><p class="meta-line">Ref ' + esc(rec.id) + ' · Submitted by ' + esc(rec.submittedBy) + '</p>' +
      docsHtml(rec) +
      '<details><summary>History (' + (rec.history || []).length + ')</summary><ol class="history">' + hist + '</ol></details>' +
      actionsHtml(rec) + '</article>';
  }

  function render() {
    var list = all().filter(function (x) { return filter === 'all' || x.status === filter; });
    $('appList').innerHTML = list.length ? list.map(cardHtml).join('') : '<p class="empty">No applications with this status.</p>';
    $('appStatus').textContent = list.length + ' application' + (list.length === 1 ? '' : 's') + ' shown';
    $('roleHint').textContent = role === 'approver' ? 'Review submitted applications and record a decision.' : 'Track the status of your applications and resubmit when changes are requested.';
    renderFilters();
    renderStats();
  }

  /* ---- actions ---- */
  function act(kind, id) {
    var rec = find(id);
    if (!rec) return;
    rec = clone(rec);
    var el = $('err-' + id), note = '';
    var noteEl = $('note-' + id);
    if (noteEl) note = noteEl.value.trim();
    if (el) el.textContent = '';
    var by = role === 'approver' ? 'Approver' : 'Submitter';

    if (kind === 'resubmit') {
      var card = $(id), bad = '';
      rec.files = rec.files || {};
      card.querySelectorAll('[data-redoc]').forEach(function (inp) {
        var f = inp.files[0];
        bad = bad || checkFile(f);
        if (f && !bad) rec.files[inp.getAttribute('data-redoc')] = f.name;
      });
      if (bad) { el.textContent = bad; return; }
      var miss = missingRequired(rec);
      if (miss.length) { el.textContent = 'Still missing: ' + miss.map(function (d) { return d.label; }).join(', ') + '.'; return; }
      rec.status = 'submitted';
      rec.history.push({ at: new Date().toISOString(), by: by, action: 'Resubmitted', note: '' });
    } else {
      if (kind === 'approve') {
        var m = missingRequired(rec);
        if (m.length) { el.textContent = 'Cannot approve: missing ' + m.map(function (d) { return d.label; }).join(', ') + '.'; return; }
      }
      if ((kind === 'return' || kind === 'reject') && !note) { el.textContent = 'Please add a comment explaining the decision.'; noteEl.focus(); return; }
      var map = { review: ['review', 'Review started'], approve: ['approved', 'Approved'], 'return': ['returned', 'Returned for changes'], reject: ['rejected', 'Rejected'] };
      rec.status = map[kind][0];
      rec.history.push({ at: new Date().toISOString(), by: by, action: map[kind][1], note: note });
    }
    update(rec);
    render();
    var again = $(id);
    if (again) again.scrollIntoView({ block: 'nearest' });
  }

  function submitForm(e) {
    e.preventDefault();
    var err = $('appError'); err.textContent = '';
    var title = $('fTitle').value.trim(), by = $('fBy').value.trim(), summary = $('fSummary').value.trim();
    if (!title || !by || !summary) { err.textContent = 'Please complete the course title, submitted by and summary.'; return; }
    var files = {}, bad = '';
    document.querySelectorAll('#docFields [data-doc]').forEach(function (inp) {
      var f = inp.files[0];
      bad = bad || checkFile(f);
      if (f) files[inp.getAttribute('data-doc')] = f.name;
    });
    if (bad) { err.textContent = bad; return; }
    var rec = { id: newId(), title: title, courseType: $('fType').value, school: $('fSchool').value, submittedBy: by, summary: summary, status: 'submitted', files: files,
      history: [{ at: new Date().toISOString(), by: 'Submitter', action: 'Submitted', note: '' }] };
    var miss = missingRequired(rec);
    if (miss.length) { err.textContent = 'Please attach the required documents: ' + miss.map(function (d) { return d.label; }).join(', ') + '.'; return; }
    update(rec);
    $('appForm').reset();
    filter = 'all';
    render();
    var card = $(rec.id);
    if (card) { card.scrollIntoView({ block: 'center' }); }
    $('appStatus').textContent = 'Application ' + rec.id + ' submitted for approval.';
  }

  /* ---- wiring ---- */
  function bind() {
    $('appForm').addEventListener('submit', submitForm);
    $('appForm').addEventListener('reset', function () { $('appError').textContent = ''; });
    $('appList').addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (b) act(b.getAttribute('data-act'), b.getAttribute('data-id'));
    });
    $('statusFilters').addEventListener('click', function (e) {
      var b = e.target.closest('[data-status]');
      if (b) { filter = b.getAttribute('data-status'); render(); }
    });
    $('role').addEventListener('change', function () {
      role = $('role').value;
      try { localStorage.setItem(ROLE_KEY, role); } catch (x) { /* ignore */ }
      render();
    });
    $('resetBtn').addEventListener('click', function () {
      if (!confirm('Remove all applications and decisions saved in this browser and restore the original data?')) return;
      try { localStorage.removeItem(STORE_KEY); } catch (x) { /* ignore */ }
      local = []; filter = 'all'; render();
    });
    var nav = $('siteNav'), btn = $('menuBtn');
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  function init() {
    bind();
    loadLocal();
    try { role = localStorage.getItem(ROLE_KEY) === 'approver' ? 'approver' : 'submitter'; } catch (e) { role = 'submitter'; }
    $('role').value = role;
    fetch(DATA_URL)
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) {
        cfg.schools = d.schools || []; cfg.courseTypes = d.courseTypes || []; cfg.documents = d.documents || [];
        seeds = Array.isArray(d.items) ? d.items : [];
        buildForm();
        render();
      })
      .catch(function () {
        $('appList').innerHTML = '<p class="error">Applications could not be loaded from data/applications.json. If you opened the page by double-clicking it, use a local web server (see README.md). Otherwise check the JSON file for a missing comma or quotation mark.</p>';
      });
  }

  init();
})();
