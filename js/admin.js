// صفحة الأدمن: تأكيد الكلاسات + الترتيب الكامل + سجل الجلسات (حذف المشبوه).
// كل دالة في قاعدة البيانات تتأكد إن الحساب أدمن، فهذي الصفحة ما تقدر تتجاوز شي.
(function () {
  var sb = window.sb;

  /* ---------- أدوات ---------- */
  function $(id) { return document.getElementById(id); }
  function t(key) { return I18N.t(key); }
  function lang() { return I18N.getLang(); }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function fmt(key, vars) {
    var s = t(key);
    Object.keys(vars || {}).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }

  function dateText(d, withTime) {
    if (!d) return '';
    var loc = lang() === 'ar' ? 'ar-u-ca-gregory-nu-latn' : 'en-GB';
    var opts = { weekday: 'short', day: 'numeric', month: 'short' };
    var date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      var p = d.split('-');
      date = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
      opts.timeZone = 'UTC';
    } else {
      date = new Date(d);
      opts.timeZone = 'Asia/Riyadh';
      if (withTime) { opts.hour = 'numeric'; opts.minute = '2-digit'; }
    }
    try { return new Intl.DateTimeFormat(loc, opts).format(date); } catch (e) { return String(d); }
  }

  function chip(text, cls) { return el('span', 'a-chip' + (cls ? ' ' + cls : ''), text); }

  /* ---------- الحالة ---------- */
  var state = { tab: 'classes', pending: null, board: null, logs: null, days: 14, query: '', confirmId: null,
                members: null, mQuery: '', editCode: null, editMode: null, mMsg: null };
  var timer = null;

  /* =====================================================================
     البوابة
     ===================================================================== */
  var statusEl = $('a-status'), loginForm = $('a-login'), notAdmin = $('a-notadmin'),
      app = $('a-app'), logoutBtn = $('a-logout');

  function setStatus(key) {
    if (!key) { statusEl.hidden = true; statusEl.textContent = ''; statusEl.removeAttribute('data-i18n'); return; }
    statusEl.hidden = false;
    statusEl.setAttribute('data-i18n', key);
    statusEl.textContent = t(key);
  }

  function hideAll() { loginForm.hidden = true; notAdmin.hidden = true; app.hidden = true; logoutBtn.hidden = true; setStatus(null); }

  function showLogin() {
    hideAll();
    loginForm.hidden = false;
    setTimeout(function () { $('a-email').focus(); }, 30);
  }

  function check() {
    hideAll();
    setStatus('a.loading');
    return Auth.getSession().then(function (session) {
      if (!session) { showLogin(); return; }
      return sb.rpc('is_admin').then(function (r) {
        hideAll();
        logoutBtn.hidden = false;
        if (r.error) { setStatus('a.error'); return; }
        if (r.data !== true) { notAdmin.hidden = false; return; }
        app.hidden = false;
        renderTabs();
        loadPending();
        startPolling();
      });
    });
  }

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = $('a-login-msg');
    var email = $('a-email').value.trim(), pass = $('a-password').value;
    msg.hidden = true;
    if (!email || !pass) { msg.textContent = t('a.loginEmpty'); msg.hidden = false; return; }
    var btn = loginForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = t('a.loginWait');
    sb.auth.signInWithPassword({ email: email, password: pass }).then(function (r) {
      btn.disabled = false;
      btn.textContent = t('a.loginBtn');
      if (r.error) { msg.textContent = t('a.loginBad'); msg.hidden = false; return; }
      $('a-password').value = '';
      check();
    });
  });

  logoutBtn.addEventListener('click', function () {
    stopPolling();
    sb.auth.signOut().then(function () { location.reload(); });
  });

  /* =====================================================================
     التبويبات
     ===================================================================== */
  var TABS = ['classes', 'board', 'logs', 'members'];

  function renderTabs() {
    TABS.forEach(function (name) {
      var on = name === state.tab;
      var tab = $('tab-' + name);
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      $('panel-' + name).hidden = !on;
    });
  }

  function selectTab(name, focus) {
    state.tab = name;
    state.confirmId = null;
    state.editCode = null;
    state.mMsg = null;
    renderTabs();
    if (focus) $('tab-' + name).focus();
    if (name === 'classes') loadPending();
    if (name === 'board') loadBoard();
    if (name === 'logs') loadLogs();
    if (name === 'members') loadMembers();
  }

  $('a-tabs').addEventListener('click', function (e) {
    var b = e.target.closest('[role="tab"]');
    if (b) selectTab(b.id.replace('tab-', ''));
  });

  $('a-tabs').addEventListener('keydown', function (e) {
    var keys = { ArrowRight: -1, ArrowLeft: 1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    var dir = keys[e.key] * (document.documentElement.dir === 'ltr' ? -1 : 1);
    var i = TABS.indexOf(state.tab);
    selectTab(TABS[(i + dir + TABS.length) % TABS.length], true);
  });

  function panelHead(host, titleKey, hintKey, extra) {
    var head = el('div', 'a-panel-head');
    head.appendChild(el('h2', null, t(titleKey)));
    if (extra) head.appendChild(extra);
    host.appendChild(head);
    if (hintKey) host.appendChild(el('p', 'a-hint', t(hintKey)));
  }

  function panelMessage(host, key) { host.appendChild(el('p', 'a-empty', t(key))); }

  function errorBox(host, retry) {
    var box = el('div', 'a-empty');
    box.appendChild(el('p', null, t('a.error')));
    var b = el('button', 'btn-secondary', t('a.retry'));
    b.type = 'button';
    b.addEventListener('click', retry);
    box.appendChild(b);
    host.appendChild(box);
  }

  /* =====================================================================
     1) الكلاسات
     ===================================================================== */
  function updateBadge() {
    var badge = $('a-badge');
    var n = state.pending ? state.pending.length : 0;
    badge.hidden = n === 0;
    badge.textContent = String(n);
  }

  function loadPending() {
    return sb.rpc('admin_pending_classes').then(function (r) {
      if (r.error) throw r.error;
      state.pending = r.data || [];
      state.pendingError = false;
    }).catch(function () {
      state.pendingError = true;
    }).then(function () {
      updateBadge();
      if (state.tab === 'classes') renderPending();
    });
  }

  function renderPending() {
    var host = $('panel-classes');
    host.textContent = '';
    var live = el('span', 'a-live', t('a.autoRefresh'));
    panelHead(host, 'a.classesTitle', 'a.classesHint', live);

    if (state.pendingError && !state.pending) { errorBox(host, loadPending); return; }
    if (!state.pending) { panelMessage(host, 'a.loading'); return; }
    if (!state.pending.length) { panelMessage(host, 'a.classesEmpty'); return; }

    var list = el('ul', 'a-list');
    state.pending.forEach(function (c) {
      var li = el('li', 'a-card a-item');
      var top = el('div', 'a-item-top');
      var name = el('strong', 'a-name');
      name.appendChild(el('bdi', null, c.display_name));
      top.appendChild(name);
      if (c.member_code) top.appendChild(chip(c.member_code, 'is-code'));
      li.appendChild(top);

      var dl = el('dl', 'a-dl');
      [['a.class', c.class_name], ['a.coach', c.coach_name]].forEach(function (row) {
        var d = el('div');
        d.appendChild(el('dt', null, t(row[0])));
        var dd = el('dd');
        dd.appendChild(el('bdi', null, row[1]));
        d.appendChild(dd);
        dl.appendChild(d);
      });
      li.appendChild(dl);
      li.appendChild(el('p', 'a-when', dateText(c.created_at, true)));

      var actions = el('div', 'a-actions');
      var ok = el('button', 'btn-primary a-approve', t('a.approve'));
      ok.type = 'button';
      var no = el('button', 'btn-secondary a-reject', t('a.reject'));
      no.type = 'button';
      function review(approve) {
        ok.disabled = true; no.disabled = true;
        sb.rpc('admin_review_class', { p_log: c.id, p_approve: approve }).then(function (r) {
          if (r.error) throw r.error;
          li.classList.add('is-gone');
          actions.textContent = '';
          actions.appendChild(el('p', 'a-done', t(approve ? 'a.approved' : 'a.rejected')));
          setTimeout(loadPending, 900);
        }).catch(function () {
          ok.disabled = false; no.disabled = false;
          actions.appendChild(el('p', 'a-msg', t('a.actionError')));
        });
      }
      ok.addEventListener('click', function () { review(true); });
      no.addEventListener('click', function () { review(false); });
      actions.appendChild(ok);
      actions.appendChild(no);
      li.appendChild(actions);
      list.appendChild(li);
    });
    host.appendChild(list);
  }

  /* =====================================================================
     2) الترتيب الكامل
     ===================================================================== */
  function loadBoard() {
    var host = $('panel-board');
    if (!state.board) { host.textContent = ''; panelHead(host, 'a.boardTitle', 'a.boardHint'); panelMessage(host, 'a.loading'); }
    return sb.rpc('admin_challenge_board').then(function (r) {
      if (r.error) throw r.error;
      state.board = r.data || [];
      renderBoard();
    }).catch(function () {
      host.textContent = '';
      panelHead(host, 'a.boardTitle', 'a.boardHint');
      errorBox(host, loadBoard);
    });
  }

  function renderBoard() {
    var host = $('panel-board');
    host.textContent = '';
    panelHead(host, 'a.boardTitle', 'a.boardHint');
    if (!state.board.length) { panelMessage(host, 'a.boardEmpty'); return; }

    var medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
    var list = el('ol', 'a-board');
    state.board.forEach(function (r) {
      var li = el('li', 'a-card a-brow');
      li.appendChild(el('span', 'a-rank', medals[r.rank] || String(r.rank)));
      var mid = el('div', 'a-bmid');
      var name = el('strong', 'a-name');
      name.appendChild(el('bdi', null, r.display_name));
      mid.appendChild(name);
      var chips = el('div', 'a-chips');
      if (r.member_code) chips.appendChild(chip(r.member_code, 'is-code'));
      chips.appendChild(chip(t('a.days') + ': ' + r.days));
      chips.appendChild(chip(t('a.workouts') + ': ' + r.workouts));
      chips.appendChild(chip(t('a.classes') + ': ' + r.classes));
      if (Number(r.pending) > 0) chips.appendChild(chip(t('a.pending') + ': ' + r.pending, 'is-warn'));
      mid.appendChild(chips);
      li.appendChild(mid);
      var pts = el('span', 'a-pts');
      pts.appendChild(el('strong', null, String(r.points)));
      pts.appendChild(el('span', null, t('a.points')));
      li.appendChild(pts);
      list.appendChild(li);
    });
    host.appendChild(list);
  }

  /* =====================================================================
     3) السجل
     ===================================================================== */
  function loadLogs() {
    var host = $('panel-logs');
    if (!state.logs) { host.textContent = ''; panelHead(host, 'a.logsTitle', 'a.logsHint'); panelMessage(host, 'a.loading'); }
    return sb.rpc('admin_challenge_logs', { p_days: state.days }).then(function (r) {
      if (r.error) throw r.error;
      state.logs = r.data || [];
      renderLogs();
    }).catch(function () {
      host.textContent = '';
      panelHead(host, 'a.logsTitle', 'a.logsHint');
      errorBox(host, loadLogs);
    });
  }

  function renderLogs(keepFocus) {
    var host = $('panel-logs');
    host.textContent = '';
    panelHead(host, 'a.logsTitle', 'a.logsHint');

    // أدوات: بحث + الفترة
    var tools = el('div', 'a-tools');
    var search = el('input', 'a-input');
    search.type = 'search';
    search.placeholder = t('a.search');
    search.setAttribute('aria-label', t('a.search'));
    search.value = state.query;
    search.addEventListener('input', function () { state.query = search.value; renderLogs(true); });
    tools.appendChild(search);

    var sel = el('select', 'a-input a-select');
    sel.setAttribute('aria-label', t('a.period'));
    [[7, 'a.last7'], [14, 'a.last14'], [30, 'a.last30']].forEach(function (o) {
      var op = el('option', null, t(o[1]));
      op.value = String(o[0]);
      if (o[0] === state.days) op.selected = true;
      sel.appendChild(op);
    });
    sel.addEventListener('change', function () { state.days = Number(sel.value); state.logs = null; loadLogs(); });
    tools.appendChild(sel);
    host.appendChild(tools);

    var q = state.query.trim().toLowerCase();
    var rows = (state.logs || []).filter(function (r) {
      if (!q) return true;
      return String(r.display_name).toLowerCase().indexOf(q) !== -1 ||
             String(r.member_code || '').toLowerCase().indexOf(q) !== -1;
    });

    if (!rows.length) { panelMessage(host, 'a.logsEmpty'); }
    else {
      var list = el('ul', 'a-list');
      rows.forEach(function (r) { list.appendChild(logItem(r)); });
      host.appendChild(list);
    }

    if (keepFocus) {
      var s = host.querySelector('input[type="search"]');
      s.focus();
      s.setSelectionRange(s.value.length, s.value.length);
    }
  }

  function logItem(r) {
    var li = el('li', 'a-card a-item' + (Number(r.same_day) > 1 ? ' is-flag' : ''));

    var top = el('div', 'a-item-top');
    var name = el('strong', 'a-name');
    name.appendChild(el('bdi', null, r.display_name));
    top.appendChild(name);
    if (r.member_code) top.appendChild(chip(r.member_code, 'is-code'));
    top.appendChild(chip(t('a.status.' + r.status), 'is-' + r.status));
    li.appendChild(top);

    var what = r.kind === 'class'
      ? fmt('a.classOf', { c: r.class_name, coach: r.coach_name })
      : fmt('a.workout', { n: r.duration_min }) + (r.level ? ' · ' + t('a.level.' + r.level) : '');
    li.appendChild(el('p', 'a-what', what));

    var meta = el('div', 'a-chips');
    meta.appendChild(chip(dateText(r.log_date)));
    if (r.points && (r.status === 'done' || r.status === 'approved')) { var pc = chip('+' + r.points); pc.dir = 'ltr'; meta.appendChild(pc); }
    if (r.actual_min != null) meta.appendChild(chip(fmt('a.actual', { n: r.actual_min })));
    if (Number(r.same_day) > 1) meta.appendChild(chip(fmt('a.sameDay', { n: r.same_day }), 'is-warn'));
    li.appendChild(meta);

    var actions = el('div', 'a-actions');
    if (state.confirmId === r.id) {
      actions.className += ' is-confirm';
      actions.appendChild(el('p', 'a-confirm-q', t('a.deleteQ')));
      var yes = el('button', 'btn-secondary a-danger', t('a.deleteYes'));
      yes.type = 'button';
      var no = el('button', 'btn-secondary', t('a.cancel'));
      no.type = 'button';
      no.addEventListener('click', function () { state.confirmId = null; renderLogs(); });
      yes.addEventListener('click', function () {
        yes.disabled = true; no.disabled = true;
        sb.rpc('admin_delete_log', { p_log: r.id }).then(function (res) {
          if (res.error) throw res.error;
          state.confirmId = null;
          state.logs = state.logs.filter(function (x) { return x.id !== r.id; });
          state.board = null;   // يتحدث الترتيب لما تفتحين التبويب
          renderLogs();
          if (r.status === 'pending') loadPending();
        }).catch(function () {
          yes.disabled = false; no.disabled = false;
          actions.appendChild(el('p', 'a-msg', t('a.actionError')));
        });
      });
      actions.appendChild(no);
      actions.appendChild(yes);
      setTimeout(function () { no.focus(); }, 0);
    } else {
      var del = el('button', 'btn-secondary a-del', t('a.delete'));
      del.type = 'button';
      del.addEventListener('click', function () { state.confirmId = r.id; renderLogs(); });
      actions.appendChild(del);
    }
    li.appendChild(actions);
    return li;
  }

  /* =====================================================================
     4) العضوات + تعديل اللقب
     ===================================================================== */
  function loadMembers() {
    var host = $('panel-members');
    if (!state.members) { host.textContent = ''; panelHead(host, 'a.membersTitle', 'a.membersHint'); panelMessage(host, 'a.loading'); }
    return sb.rpc('admin_list_members').then(function (r) {
      if (r.error) throw r.error;
      state.members = r.data || [];
      renderMembers();
    }).catch(function () {
      host.textContent = '';
      panelHead(host, 'a.membersTitle', 'a.membersHint');
      errorBox(host, loadMembers);
    });
  }

  function renderMembers(keepFocus) {
    var host = $('panel-members');
    host.textContent = '';
    var count = el('span', 'a-live', fmt('a.membersCount', { n: state.members.length }));
    panelHead(host, 'a.membersTitle', 'a.membersHint', count);

    var tools = el('div', 'a-tools a-tools-one');
    var search = el('input', 'a-input');
    search.type = 'search';
    search.placeholder = t('a.search');
    search.setAttribute('aria-label', t('a.search'));
    search.value = state.mQuery;
    search.addEventListener('input', function () { state.mQuery = search.value; renderMembers(true); });
    tools.appendChild(search);
    host.appendChild(tools);

    var q = state.mQuery.trim().toLowerCase();
    var rows = state.members.filter(function (m) {
      if (!q) return true;
      return String(m.display_name).toLowerCase().indexOf(q) !== -1 ||
             String(m.member_code).toLowerCase().indexOf(q) !== -1;
    });

    if (!rows.length) {
      panelMessage(host, state.members.length ? 'a.logsEmpty' : 'a.membersEmpty');
    } else {
      var list = el('ul', 'a-list');
      rows.forEach(function (m) { list.appendChild(memberItem(m)); });
      host.appendChild(list);
    }

    if (keepFocus) {
      var s = host.querySelector('input[type="search"]');
      s.focus();
      s.setSelectionRange(s.value.length, s.value.length);
    }
  }

  function memberItem(m) {
    var li = el('li', 'a-card a-item');
    var top = el('div', 'a-item-top');
    var name = el('strong', 'a-name');
    name.appendChild(el('bdi', null, m.display_name));
    top.appendChild(name);
    top.appendChild(chip(m.member_code, 'is-code'));
    li.appendChild(top);
    if (m.claimed_at) li.appendChild(el('p', 'a-when', fmt('a.joined', { date: dateText(m.claimed_at) })));

    // رسالة بعد الحفظ
    if (state.mMsg && state.mMsg.code === m.member_code) {
      var note = el('p', state.mMsg.ok ? 'a-done' : 'a-msg', state.mMsg.text);
      if (state.mMsg.secret) {
        var sec = el('strong', 'a-secret', state.mMsg.secret);
        sec.dir = 'ltr';
        note.appendChild(document.createTextNode(' '));
        note.appendChild(sec);
      }
      li.appendChild(note);
    }

    if (state.editCode !== m.member_code) {
      var actions = el('div', 'a-actions');
      var edit = el('button', 'btn-secondary a-edit', t('a.editName'));
      edit.type = 'button';
      edit.addEventListener('click', function () { state.editCode = m.member_code; state.editMode = 'name'; state.mMsg = null; renderMembers(); });
      actions.appendChild(edit);
      var pw = el('button', 'btn-secondary a-edit', t('a.resetPw'));
      pw.type = 'button';
      pw.addEventListener('click', function () { state.editCode = m.member_code; state.editMode = 'pw'; state.mMsg = null; renderMembers(); });
      actions.appendChild(pw);
      li.appendChild(actions);
      return li;
    }

    if (state.editMode === 'pw') { li.appendChild(passwordForm(m)); return li; }

    // نموذج التعديل
    var form = el('form', 'a-edit-form');
    form.noValidate = true;
    var id = 'a-name-' + m.member_code;
    var lab = el('label', null, t('a.newName'));
    lab.htmlFor = id;
    form.appendChild(lab);
    var inp = el('input', 'a-input');
    inp.id = id;
    inp.type = 'text';
    inp.maxLength = 30;
    inp.value = m.display_name === '—' ? '' : m.display_name;
    inp.autocomplete = 'off';
    form.appendChild(inp);
    form.appendChild(el('p', 'a-hint a-hint-sm', t('a.nameHint')));
    var err = el('p', 'a-msg');
    err.hidden = true;
    err.setAttribute('role', 'alert');
    form.appendChild(err);

    var row = el('div', 'a-actions');
    var cancel = el('button', 'btn-secondary', t('a.cancel'));
    cancel.type = 'button';
    cancel.addEventListener('click', function () { state.editCode = null; renderMembers(); });
    var save = el('button', 'btn-primary', t('a.save'));
    save.type = 'submit';
    row.appendChild(save);
    row.appendChild(cancel);
    form.appendChild(row);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = inp.value.trim().replace(/\s+/g, ' ');
      var len = Array.from(v).length;
      if (len < 2 || len > 30) { err.textContent = t('a.nameBad'); err.hidden = false; inp.focus(); return; }
      save.disabled = true; cancel.disabled = true;
      save.textContent = t('a.loginWait');
      sb.rpc('admin_set_display_name', { p_member_code: m.member_code, p_name: v }).then(function (r) {
        if (r.error) throw r.error;
        if (r.data !== 'ok') throw new Error(r.data);
        m.display_name = v;
        state.editCode = null;
        state.mMsg = { code: m.member_code, ok: true, text: t('a.nameSaved') };
        state.board = null;   // الترتيب يتحدث باللقب الجديد
        state.logs = null;
        renderMembers();
      }).catch(function (ex) {
        save.disabled = false; cancel.disabled = false;
        save.textContent = t('a.save');
        err.textContent = ex && ex.message === 'bad_name' ? t('a.nameBad') : t('a.actionError');
        err.hidden = false;
      });
    });

    li.appendChild(form);
    setTimeout(function () { inp.focus(); inp.select(); }, 0);
    return li;
  }


  // كلمة مرور مقترحة سهلة القراءة (بدون الحروف المتشابهة مثل O و 0 و l و 1)
  function suggestPassword() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    var out = '', buf = new Uint32Array(10);
    crypto.getRandomValues(buf);
    for (var i = 0; i < 10; i++) out += chars[buf[i] % chars.length];
    return out;
  }

  function passwordForm(m) {
    var form = el('form', 'a-edit-form');
    form.noValidate = true;
    var id = 'a-pw-' + m.member_code;
    var lab = el('label', null, t('a.newPw'));
    lab.htmlFor = id;
    form.appendChild(lab);

    var row1 = el('div', 'a-pw-row');
    var inp = el('input', 'a-input');
    inp.id = id;
    inp.type = 'text';             // نص ظاهر عشان المدربة تقرأه للعضوة
    inp.dir = 'ltr';
    inp.maxLength = 72;
    inp.autocomplete = 'off';
    inp.spellcheck = false;
    row1.appendChild(inp);
    var gen = el('button', 'btn-secondary a-gen', t('a.pwSuggest'));
    gen.type = 'button';
    gen.addEventListener('click', function () { inp.value = suggestPassword(); err.hidden = true; inp.focus(); });
    row1.appendChild(gen);
    form.appendChild(row1);
    form.appendChild(el('p', 'a-hint a-hint-sm', t('a.pwHint')));

    var err = el('p', 'a-msg');
    err.hidden = true;
    err.setAttribute('role', 'alert');
    form.appendChild(err);

    var row = el('div', 'a-actions');
    var save = el('button', 'btn-primary', t('a.save'));
    save.type = 'submit';
    var cancel = el('button', 'btn-secondary', t('a.cancel'));
    cancel.type = 'button';
    cancel.addEventListener('click', function () { state.editCode = null; renderMembers(); });
    row.appendChild(save);
    row.appendChild(cancel);
    form.appendChild(row);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = inp.value;
      if (v.length < 8 || v.length > 72) { err.textContent = t('a.pwBad'); err.hidden = false; inp.focus(); return; }
      save.disabled = true; cancel.disabled = true; gen.disabled = true;
      save.textContent = t('a.loginWait');
      sb.functions.invoke('admin-reset-password', { body: { member_code: m.member_code, new_password: v } })
        .then(function (r) {
          var data = r.data;
          if (r.error) {
            // الدالة ترجع 401/403 لغير الأدمن
            var status = r.error.context && r.error.context.status;
            throw new Error(status === 401 || status === 403 ? 'not_admin' : 'error');
          }
          if (!data || data.ok !== true) throw new Error((data && data.reason) || 'error');
          state.editCode = null;
          state.mMsg = { code: m.member_code, ok: true, text: t('a.pwSaved'), secret: v };
          renderMembers();
        })
        .catch(function (ex) {
          save.disabled = false; cancel.disabled = false; gen.disabled = false;
          save.textContent = t('a.save');
          var reason = ex && ex.message;
          err.textContent = t(reason === 'bad_password' ? 'a.pwBad'
                            : reason === 'not_found' ? 'a.pwNotFound'
                            : reason === 'not_admin' ? 'a.pwNotAdmin' : 'a.actionError');
          err.hidden = false;
        });
    });

    setTimeout(function () { inp.focus(); }, 0);
    return form;
  }

  /* =====================================================================
     التحديث التلقائي (الكلاسات كل دقيقة)
     ===================================================================== */
  function startPolling() {
    stopPolling();
    timer = setInterval(function () {
      if (document.visibilityState === 'visible' && !app.hidden) loadPending();
    }, 60000);
  }

  function stopPolling() { if (timer) { clearInterval(timer); timer = null; } }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && !app.hidden) loadPending();
  });

  document.addEventListener('langchange', function () {
    if (app.hidden) return;
    if (state.tab === 'classes') renderPending();
    if (state.tab === 'board' && state.board) renderBoard();
    if (state.tab === 'logs' && state.logs) renderLogs();
    if (state.tab === 'members' && state.members) { state.mMsg = null; renderMembers(); }
  });

  /* ---------- البداية ---------- */
  if (!sb || !window.Auth) { setStatus('a.error'); return; }
  check();
})();
