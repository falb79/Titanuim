// صفحة التغذية: تجلب الدليل والتحدي والنصائح والمراجع من Supabase وتعرضها.
// الحماية الحقيقية في قاعدة البيانات: بدون عضوية ما يرجع أي محتوى.
(function () {
  var sb = window.sb;

  /* =====================================================================
     إعدادات
     ===================================================================== */
  var IMAGE_DIR = 'assets/nutrition/';   // صور اختيارية: hero.jpg و cutting.jpg و bulking.jpg و maintenance.jpg
  var IMAGE_EXT = 'jpg';
  var BOOK_BUCKET = 'guides';            // مخزن الكتب الخاص في Supabase Storage
  var BOOK_LINK_SECONDS = 300;           // مدة صلاحية رابط الكتاب (5 دقائق)

  var CATEGORIES = ['basics', 'goals', 'training', 'tools'];
  var GOAL_SLUGS = ['cutting', 'bulking', 'maintenance'];

  /* =====================================================================
     أيقونات (SVG بسيطة بنفس الأسلوب)
     ===================================================================== */
  var ICONS = {
    leaf: '<path d="M12 8c-2.6-2-6.5-1-6.5 3.2 0 4.4 3 9 6.5 9s6.5-4.6 6.5-9C18.5 7 14.6 6 12 8z"/><path d="M12 8c0-2 1-3.5 3-4.5"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
    pie: '<circle cx="12" cy="12" r="9"/><path d="M12 3v9h9"/>',
    flame: '<path d="M12 2.500c.5 3-3.500 4.500-3.500 9a3.500 3.500 0 0 0 7 0c0-1.700-.8-2.800-1.600-3.600.1 1.600-.6 2.600-1.700 2.600 0-2.900.3-5-.2-8z"/>',
    dumbbell: '<path d="M6.500 6.500v11M17.500 6.500v11M3.500 9v6M20.500 9v6M6.500 12h11"/>',
    scale: '<path d="M12 4v16M6 20h12M5 8h14"/><path d="M5 8l-2.500 6h5L5 8zM19 8l-2.500 6h5L19 8z"/>',
    bolt: '<path d="M13 3L5 13.500h6L10 21l8-10.500h-6L13 3z"/>',
    recover: '<path d="M20 12a8 8 0 1 1-2.500-5.800"/><path d="M20 4v5h-5"/>',
    drop: '<path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z"/>',
    label: '<path d="M4 5v14M7 5v14M10.500 5v14M14 5v14M17 5v14M20 5v14"/>',
    plate: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>',
    warn: '<path d="M12 4l9 16H3L12 4z"/><path d="M12 10v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    lightbulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.500c.7.7 1 1.500 1 2.500h6c0-1 .3-1.800 1-2.500A6 6 0 0 0 12 3z"/>',
    check: '<path d="M5 13l4 4L19 7"/>',
    cross: '<path d="M6 6l12 12M18 6L6 18"/>',
    book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    star: '<path d="M12 3l2.700 5.600 6.100.9-4.400 4.300 1 6.100L12 17l-5.400 2.900 1-6.100L3.200 9.500l6.100-.9L12 3z"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1"/><path d="M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1"/>'
  };

  function icon(name, size) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', String(size || 24));
    svg.setAttribute('height', String(size || 24));
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.innerHTML = ICONS[name] || ICONS.leaf;   // نصوص ثابتة من الكود، مو من المستخدم
    return svg;
  }

  /* =====================================================================
     أدوات
     ===================================================================== */
  function $(id) { return document.getElementById(id); }
  function lang() { return I18N.getLang(); }
  function t(key) { return I18N.t(key); }
  function L(row, base) { return row[base + '_' + lang()] || row[base + '_ar'] || ''; }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function fmt(key, vars) {
    var s = t(key);
    Object.keys(vars).forEach(function (k) { s = s.replace('{' + k + '}', vars[k]); });
    return s;
  }

  var state = { topics: [], weeks: [], days: [], tips: [], refs: [], books: [], list: [], idx: -1 };

  /* =====================================================================
     عارض النص (الصيغة المبسّطة ← عناصر آمنة، بدون innerHTML)
     ===================================================================== */
  var INLINE = /(\*\*[^*]+\*\*|\[\[[^\]]+\]\]|\[[^\]]+\]\(https:\/\/[^)\s]+\))/g;

  function inline(parent, text) {
    var last = 0, m;
    INLINE.lastIndex = 0;
    while ((m = INLINE.exec(text)) !== null) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      var tok = m[0];
      if (tok.indexOf('**') === 0) {
        parent.appendChild(el('strong', null, tok.slice(2, -2)));
      } else if (tok.indexOf('[[') === 0) {
        parent.appendChild(el('span', 'chip', tok.slice(2, -2)));
      } else {
        var mm = /^\[([^\]]+)\]\((https:\/\/[^)\s]+)\)$/.exec(tok);
        var a = el('a', null, mm[1]);
        a.href = mm[2];
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        parent.appendChild(a);
      }
      last = m.index + tok.length;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }

  function isSpecial(line) {
    return /^(## |```|\d+\.\s|✓ |✗ |- |> |>! |~ |@ |\|)/.test(line);
  }

  function renderBody(md) {
    var root = el('div', 'n-body');
    var lines = String(md || '').replace(/\r/g, '').split('\n');
    var i = 0, j, node;

    while (i < lines.length) {
      var line = lines[i];
      if (!line.trim()) { i++; continue; }

      // عنوان فرعي
      if (line.indexOf('## ') === 0) {
        root.appendChild(el('h3', null, line.slice(3).trim()));
        i++; continue;
      }

      // معادلة (كتلة بين ```)
      if (line.indexOf('```') === 0) {
        var code = [];
        j = i + 1;
        while (j < lines.length && lines[j].indexOf('```') !== 0) { code.push(lines[j]); j++; }
        node = el('div', 'formula');
        node.setAttribute('dir', 'ltr');
        node.appendChild(el('code', null, code.join('\n')));
        root.appendChild(node);
        i = j + 1; continue;
      }

      // خطوات مرقمة: 1. عنوان :: وصف
      if (/^\d+\.\s/.test(line)) {
        node = el('ol', 'steps');
        while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
          var mnum = /^(\d+)\.\s+(.*)$/.exec(lines[i]);
          var parts = mnum[2].split(' :: ');
          var li = el('li');
          li.appendChild(el('span', 'step-num', mnum[1]));
          var box = el('div', 'step-text');
          var title = el('strong'); inline(title, parts[0]); box.appendChild(title);
          if (parts.length > 1) { var d = el('p'); inline(d, parts.slice(1).join(' :: ')); box.appendChild(d); }
          li.appendChild(box);
          node.appendChild(li);
          i++;
        }
        root.appendChild(node); continue;
      }

      // قوائم ✓ أو ✗
      if (line.indexOf('✓ ') === 0 || line.indexOf('✗ ') === 0) {
        var good = line.indexOf('✓ ') === 0;
        node = el('ul', 'marks ' + (good ? 'do' : 'dont'));
        while (i < lines.length && lines[i].indexOf(good ? '✓ ' : '✗ ') === 0) {
          var item = el('li');
          item.appendChild(icon(good ? 'check' : 'cross', 18));
          var span = el('span'); inline(span, lines[i].slice(2).trim()); item.appendChild(span);
          node.appendChild(item);
          i++;
        }
        root.appendChild(node); continue;
      }

      // قائمة نقاط
      if (line.indexOf('- ') === 0) {
        node = el('ul', 'bullets');
        while (i < lines.length && lines[i].indexOf('- ') === 0) {
          var b = el('li'); inline(b, lines[i].slice(2).trim()); node.appendChild(b);
          i++;
        }
        root.appendChild(node); continue;
      }

      // تنبيه (>!) أو نصيحة (>)
      if (line.indexOf('>! ') === 0 || line.indexOf('> ') === 0) {
        var warn = line.indexOf('>! ') === 0;
        node = el('div', 'callout ' + (warn ? 'warn' : 'tip'));
        node.appendChild(icon(warn ? 'info' : 'lightbulb', 22));
        var ctext = el('p'); inline(ctext, line.slice(warn ? 3 : 2).trim()); node.appendChild(ctext);
        root.appendChild(node);
        i++; continue;
      }

      // بطاقات خطأ / صحيح
      if (line.indexOf('~ ') === 0) {
        node = el('div', 'myths');
        while (i < lines.length && lines[i].indexOf('~ ') === 0) {
          var pair = lines[i].slice(2).split(' || ');
          var card = el('div', 'myth');
          var bad = el('div', 'myth-row bad');
          bad.appendChild(el('span', 'tag', t('nutrition.myth')));
          var badText = el('p'); inline(badText, pair[0].trim()); bad.appendChild(badText);
          var okay = el('div', 'myth-row good');
          okay.appendChild(el('span', 'tag', t('nutrition.fact')));
          var okText = el('p'); inline(okText, (pair[1] || '').trim()); okay.appendChild(okText);
          card.appendChild(bad); card.appendChild(okay);
          node.appendChild(card);
          i++;
        }
        root.appendChild(node); continue;
      }

      // خط زمني (وجبات اليوم)
      if (line.indexOf('@ ') === 0) {
        node = el('ol', 'timeline');
        while (i < lines.length && lines[i].indexOf('@ ') === 0) {
          var tp = lines[i].slice(2).split(' | ');
          var ti = el('li');
          ti.appendChild(el('span', 'tl-label', tp[0].trim()));
          var tt = el('span', 'tl-text'); inline(tt, (tp[1] || '').trim()); ti.appendChild(tt);
          node.appendChild(ti);
          i++;
        }
        root.appendChild(node); continue;
      }

      // جدول
      if (line.indexOf('|') === 0) {
        var rows = [];
        while (i < lines.length && lines[i].indexOf('|') === 0) {
          if (!/^\|[\s:|-]+\|$/.test(lines[i])) {
            rows.push(lines[i].replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); }));
          }
          i++;
        }
        var wrap = el('div', 'table-wrap');
        var table = el('table');
        rows.forEach(function (r, ri) {
          var tr = el('tr');
          r.forEach(function (c) { var cell = el(ri === 0 ? 'th' : 'td'); inline(cell, c); tr.appendChild(cell); });
          table.appendChild(tr);
        });
        wrap.appendChild(table);
        root.appendChild(wrap); continue;
      }

      // فقرة عادية (أسطر متتالية)
      var para = [];
      while (i < lines.length && lines[i].trim() && !isSpecial(lines[i])) { para.push(lines[i].trim()); i++; }
      if (!para.length) { i++; continue; }   // أمان: ما نعلق
      var p = el('p'); inline(p, para.join(' ')); root.appendChild(p);
    }
    return root;
  }

  /* =====================================================================
     صور اختيارية (لو الملف غير موجود تختفي بدون أخطاء)
     ===================================================================== */
  function optionalImage(parent, name, cls) {
    var img = document.createElement('img');
    img.alt = '';
    img.className = cls;
    img.decoding = 'async';
    img.loading = 'lazy';
    img.addEventListener('error', function () { img.remove(); parent.classList.remove('has-img'); });
    img.src = IMAGE_DIR + name + '.' + IMAGE_EXT;
    parent.classList.add('has-img');
    parent.insertBefore(img, parent.firstChild);
  }

  /* =====================================================================
     العرض
     ===================================================================== */
  function sectionHead(titleKey, textKey, ic) {
    var head = el('div', 'n-head n-reveal');
    var badge = el('span', 'n-head-icon'); badge.appendChild(icon(ic, 22));
    head.appendChild(badge);
    var box = el('div');
    box.appendChild(el('h2', null, t(titleKey)));
    if (textKey) box.appendChild(el('p', null, t(textKey)));
    head.appendChild(box);
    return head;
  }

  function topicBySlug(slug) {
    for (var k = 0; k < state.topics.length; k++) if (state.topics[k].slug === slug) return state.topics[k];
    return null;
  }

  function renderNav() {
    var nav = $('n-nav');
    nav.textContent = '';
    var inner = el('div', 'n-nav-inner');
    [['n-goals', 'nutrition.navGoals'], ['n-guide', 'nutrition.navGuide'], ['n-challenge', 'nutrition.navChallenge'],
     ['n-tips', 'nutrition.navTips'], ['n-book', 'nutrition.navBook'], ['n-refs', 'nutrition.navRefs']].forEach(function (s) {
      var a = el('a', null, t(s[1]));
      a.href = '#' + s[0];
      a.setAttribute('data-target', s[0]);
      inner.appendChild(a);
    });
    nav.appendChild(inner);
    nav.setAttribute('aria-label', t('nutrition.navLabel'));
  }

  function renderNotice() {
    var host = $('n-notice');
    host.textContent = '';
    var box = el('div', 'n-notice n-reveal');
    box.appendChild(icon('info', 22));
    var text = el('div', 'n-notice-text');
    var strong = el('strong', null, t('nutrition.noticeTitle') + ': ');
    text.appendChild(strong);
    text.appendChild(document.createTextNode(t('nutrition.noticeShort') + ' '));
    if (topicBySlug('disclaimer')) {
      var btn = el('button', 'link-btn', t('nutrition.noticeLink'));
      btn.type = 'button';
      btn.addEventListener('click', function () { openTopic('disclaimer'); });
      text.appendChild(btn);
    }
    box.appendChild(text);
    host.appendChild(box);
  }

  function renderGoals() {
    var host = $('n-goals');
    host.textContent = '';
    host.appendChild(sectionHead('nutrition.goalsTitle', 'nutrition.goalsText', 'star'));
    var grid = el('div', 'goal-grid');
    GOAL_SLUGS.forEach(function (slug, k) {
      var topic = topicBySlug(slug);
      if (!topic) return;
      var card = el('button', 'goal-card n-reveal');
      card.type = 'button';
      card.style.setProperty('--d', (k * 0.08) + 's');
      var badge = el('span', 'goal-icon'); badge.appendChild(icon(topic.icon, 30));
      card.appendChild(badge);
      card.appendChild(el('h3', null, L(topic, 'title')));
      card.appendChild(el('p', null, L(topic, 'summary')));
      var go = el('span', 'goal-go');
      go.appendChild(document.createTextNode(t('nutrition.read') + ' '));
      var ar = icon('arrow', 18); ar.setAttribute('class', 'arrow'); go.appendChild(ar);
      card.appendChild(go);
      card.addEventListener('click', function () { openTopic(slug); });
      optionalImage(card, slug, 'goal-bg');
      grid.appendChild(card);
    });
    host.appendChild(grid);
  }

  function renderGuide() {
    var host = $('n-guide');
    host.textContent = '';
    host.appendChild(sectionHead('nutrition.guideTitle', 'nutrition.guideText', 'book'));
    // أدلة الأهداف (التنشيف والتضخيم والمحافظة) تظهر أصلاً في قسم الأهداف، فما نكررها هنا
    CATEGORIES.filter(function (c) { return c !== 'goals'; }).forEach(function (cat) {
      var topics = state.topics.filter(function (x) { return x.category === cat; });
      if (!topics.length) return;
      var group = el('div', 'cat');
      group.appendChild(el('h3', 'cat-title n-reveal', t('nutrition.cat.' + cat)));
      var grid = el('div', 'topic-grid');
      topics.forEach(function (topic, k) {
        var card = el('button', 'topic-card n-reveal');
        card.type = 'button';
        card.style.setProperty('--d', (k % 3) * 0.06 + 's');
        card.setAttribute('aria-haspopup', 'dialog');
        var badge = el('span', 'topic-icon'); badge.appendChild(icon(topic.icon, 26));
        card.appendChild(badge);
        var box = el('span', 'topic-text');
        box.appendChild(el('strong', null, L(topic, 'title')));
        box.appendChild(el('span', null, L(topic, 'summary')));
        card.appendChild(box);
        var ar = icon('arrow', 18); ar.setAttribute('class', 'arrow'); card.appendChild(ar);
        card.addEventListener('click', function () { openTopic(topic.slug); });
        grid.appendChild(card);
      });
      group.appendChild(grid);
      host.appendChild(group);
    });
  }

  function renderChallenge() {
    var host = $('n-challenge');
    host.textContent = '';
    host.appendChild(sectionHead('nutrition.challengeTitle', 'nutrition.challengeGoal', 'calc'));
    host.appendChild(el('p', 'n-note n-reveal', t('nutrition.challengeNote')));

    var weeks = el('div', 'weeks');
    state.weeks.forEach(function (w, k) {
      var days = state.days.filter(function (d) { return d.week_number === w.week_number; });
      if (!days.length) return;
      var det = el('details', 'week n-reveal');
      if (k === 0) det.open = true;
      var sum = el('summary');
      var num = el('span', 'week-num', String(w.week_number <= 4 ? w.week_number : '★'));
      sum.appendChild(num);
      var tx = el('span', 'week-title');
      tx.appendChild(el('strong', null, L(w, 'title')));
      tx.appendChild(el('span', null, fmt('nutrition.daysRange', { a: days[0].day_number, b: days[days.length - 1].day_number })));
      sum.appendChild(tx);
      sum.appendChild(icon('arrow', 18)).setAttribute('class', 'chev');
      det.appendChild(sum);

      var ol = el('ol', 'days');
      days.forEach(function (d) {
        var li = el('li');
        var dn = el('span', 'day-num', String(d.day_number));
        dn.setAttribute('aria-label', fmt('nutrition.dayN', { n: d.day_number }));
        li.appendChild(dn);
        var body = el('div', 'day-body');
        body.appendChild(el('p', null, L(d, 'task')));
        if (d.topic_slug && topicBySlug(d.topic_slug)) {
          var more = el('button', 'link-btn', t('nutrition.readTopic'));
          more.type = 'button';
          more.addEventListener('click', function () { openTopic(d.topic_slug); });
          body.appendChild(more);
        }
        li.appendChild(body);
        ol.appendChild(li);
      });
      det.appendChild(ol);
      weeks.appendChild(det);
    });
    host.appendChild(weeks);

    var msg = el('div', 'n-quote n-reveal');
    msg.appendChild(icon('lightbulb', 22));
    msg.appendChild(el('p', null, t('nutrition.challengeMessage')));
    host.appendChild(msg);
  }

  function renderTips() {
    var host = $('n-tips');
    host.textContent = '';
    host.appendChild(sectionHead('nutrition.tipsTitle', 'nutrition.tipsText', 'lightbulb'));
    var grid = el('div', 'tip-grid');
    state.tips.forEach(function (tip, k) {
      var card = el('div', 'tip-card n-reveal');
      card.style.setProperty('--d', (k % 2) * 0.06 + 's');
      card.appendChild(el('span', 'tip-num', String(tip.sort_order).padStart(2, '0')));
      card.appendChild(el('h3', null, L(tip, 'title')));
      card.appendChild(el('p', null, L(tip, 'body')));
      grid.appendChild(card);
    });
    host.appendChild(grid);
  }

  function renderBook() {
    var host = $('n-book');
    host.textContent = '';
    var book = state.books[0];   // أول كتاب منشور (الجدول nutrition_books)
    var card = el('div', 'book-card n-reveal');
    var cover = el('div', 'book-cover'); cover.appendChild(icon('book', 54));
    card.appendChild(cover);
    var box = el('div', 'book-text');
    box.appendChild(el('h2', null, t('nutrition.bookTitle')));
    box.appendChild(el('p', null, t('nutrition.bookText')));

    if (!book) {
      box.appendChild(el('span', 'badge', t('nutrition.bookSoon')));
    } else {
      var btn = el('button', 'btn-primary book-open');
      btn.type = 'button';
      btn.appendChild(icon('book', 20));
      btn.appendChild(document.createTextNode(' ' + t('nutrition.bookOpen')));
      var msg = el('p', 'book-msg');
      msg.hidden = true;
      msg.setAttribute('role', 'alert');
      btn.addEventListener('click', function () { openBook(book, btn, msg); });
      box.appendChild(btn);
      box.appendChild(msg);
    }
    card.appendChild(box);
    host.appendChild(card);
  }

  // يطلب من Supabase رابطاً مؤقتاً للملف (المخزن يعطيه للمشتركات فقط) ويفتحه في تبويب جديد
  function openBook(book, btn, msg) {
    // نفتح التبويب فوراً داخل الضغطة، عشان متصفحات الجوال ما تمنعه، ثم نحط فيه الرابط
    var win = window.open('', '_blank');
    if (win) { try { win.opener = null; } catch (e) { /* */ } }
    var label = btn.lastChild;
    btn.disabled = true;
    label.textContent = ' ' + t('nutrition.bookOpening');
    msg.hidden = true;

    sb.storage.from(BOOK_BUCKET).createSignedUrl(book.file_path, BOOK_LINK_SECONDS).then(function (r) {
      var url = r && r.data && r.data.signedUrl;
      if (r.error || !url) throw r.error || new Error('no url');
      if (win && !win.closed) win.location.href = url;
      else window.location.href = url;              // لو المتصفح منع التبويب الجديد نفتحه في نفس الصفحة
    }).catch(function () {
      if (win && !win.closed) win.close();
      msg.textContent = t('nutrition.bookError');
      msg.hidden = false;
    }).then(function () {
      btn.disabled = false;
      label.textContent = ' ' + t('nutrition.bookOpen');
    });
  }

  // الكتب تنجاب لحالها، فلو صار فيها خطأ ما يتأثر باقي الدليل
  function loadBooks() {
    return sb.from('nutrition_books').select('id, sort_order, file_path').order('sort_order')
      .then(function (r) { state.books = r.error ? [] : (r.data || []); })
      .catch(function () { state.books = []; })
      .then(function () { if (!content.hidden) { renderBook(); observeReveal(); } });
  }

  function renderRefs() {
    var host = $('n-refs');
    host.textContent = '';
    var det = el('details', 'refs n-reveal');
    var sum = el('summary');
    var badge = el('span', 'n-head-icon'); badge.appendChild(icon('link', 22));
    sum.appendChild(badge);
    sum.appendChild(el('h2', null, t('nutrition.refsTitle')));
    sum.appendChild(icon('arrow', 18)).setAttribute('class', 'chev');
    det.appendChild(sum);
    det.appendChild(el('p', 'n-note', t('nutrition.refsText')));
    var ul = el('ul', 'ref-list');
    state.refs.forEach(function (r) {
      var li = el('li');
      li.appendChild(el('strong', null, r.org));
      li.appendChild(el('span', 'ref-title', r.title));
      var detail = L(r, 'detail');
      if (detail) li.appendChild(el('span', 'ref-detail', detail));
      if (/^https:\/\//.test(r.url)) {
        var a = el('a', null, t('nutrition.openSource'));
        a.href = r.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        li.appendChild(a);
      }
      ul.appendChild(li);
    });
    det.appendChild(ul);
    host.appendChild(det);
  }

  /* =====================================================================
     نافذة القراءة
     ===================================================================== */
  var reader = $('n-reader');

  function buildReaderList() {
    var order = {};
    CATEGORIES.forEach(function (c, k) { order[c] = k; });
    order.notice = 99;
    state.list = state.topics.slice().sort(function (a, b) {
      return (order[a.category] - order[b.category]) || (a.sort_order - b.sort_order);
    });
  }

  function fillReader() {
    var topic = state.list[state.idx];
    if (!topic) return;
    $('n-reader-icon').textContent = '';
    $('n-reader-icon').appendChild(icon(topic.icon, 26));
    $('n-reader-title').textContent = L(topic, 'title');
    var body = $('n-reader-body');
    body.textContent = '';
    body.appendChild(renderBody(L(topic, 'body')));
    body.scrollTop = 0;

    var prev = $('n-reader-prev'), next = $('n-reader-next');
    prev.textContent = '';
    next.textContent = '';
    var pa = icon('arrow', 18); pa.setAttribute('class', 'arrow back');
    prev.appendChild(pa); prev.appendChild(document.createTextNode(' ' + t('nutrition.prev')));
    next.appendChild(document.createTextNode(t('nutrition.next') + ' '));
    var na = icon('arrow', 18); na.setAttribute('class', 'arrow'); next.appendChild(na);
    prev.disabled = state.idx <= 0;
    next.disabled = state.idx >= state.list.length - 1;
    $('n-reader-close').textContent = '✕';
    $('n-reader-close').setAttribute('aria-label', t('nutrition.close'));
  }

  function openTopic(slug) {
    var k = state.list.findIndex(function (x) { return x.slug === slug; });
    if (k < 0) return;
    state.idx = k;
    fillReader();
    if (typeof reader.showModal === 'function') {
      if (!reader.open) reader.showModal();
    } else {
      reader.setAttribute('open', '');
    }
    document.body.classList.add('n-lock-scroll');
  }

  function closeReader() {
    if (reader.open) reader.close();
  }

  reader.addEventListener('close', function () { document.body.classList.remove('n-lock-scroll'); });
  reader.addEventListener('click', function (e) { if (e.target === reader) closeReader(); });   // الضغط خارج النافذة
  $('n-reader-close').addEventListener('click', closeReader);
  $('n-reader-prev').addEventListener('click', function () { if (state.idx > 0) { state.idx--; fillReader(); } });
  $('n-reader-next').addEventListener('click', function () { if (state.idx < state.list.length - 1) { state.idx++; fillReader(); } });

  /* =====================================================================
     الظهور عند التمرير + تمييز القسم الحالي في الشريط
     ===================================================================== */
  var revealObserver = null, spyObserver = null;

  function observeReveal() {
    var items = document.querySelectorAll('#n-content .n-reveal');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!('IntersectionObserver' in window) || reduce) { items.forEach(function (n) { n.classList.add('in'); }); return; }
    document.documentElement.classList.add('n-reveal-on');
    if (revealObserver) revealObserver.disconnect();
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); revealObserver.unobserve(en.target); } });
    }, { threshold: 0.12 });
    items.forEach(function (n) { revealObserver.observe(n); });
  }

  function observeSpy() {
    if (!('IntersectionObserver' in window)) return;
    if (spyObserver) spyObserver.disconnect();
    spyObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        document.querySelectorAll('#n-nav a').forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('data-target') === en.target.id);
        });
      });
    }, { rootMargin: '-35% 0px -55% 0px' });
    ['n-goals', 'n-guide', 'n-challenge', 'n-tips', 'n-book', 'n-refs'].forEach(function (id) { spyObserver.observe($(id)); });
  }

  /* =====================================================================
     البوابة: تحميل / قفل / عضوية
     ===================================================================== */
  var statusEl = $('n-status'), retryBtn = $('n-retry'), lock = $('n-lock'), noMember = $('n-nomember'), content = $('n-content');

  function setStatus(key) {
    if (!key) { statusEl.hidden = true; statusEl.removeAttribute('data-i18n'); statusEl.textContent = ''; return; }
    statusEl.hidden = false;
    statusEl.setAttribute('data-i18n', key);
    statusEl.textContent = t(key);
  }

  function hideAll() { content.hidden = true; lock.hidden = true; noMember.hidden = true; retryBtn.hidden = true; setStatus(null); }
  function showLocked() { hideAll(); lock.hidden = false; }
  function showNoMember() { hideAll(); noMember.hidden = false; }

  function renderAll() {
    renderNav(); renderNotice(); renderGoals(); renderGuide(); renderChallenge(); renderTips(); renderBook(); renderRefs();
    observeReveal(); observeSpy();
    if (reader.open) fillReader();
  }

  function load() {
    hideAll();
    setStatus('nutrition.loading');
    return Promise.all([
      sb.from('nutrition_topics').select('*').order('sort_order'),
      sb.from('nutrition_challenge_weeks').select('*').order('week_number'),
      sb.from('nutrition_challenge_days').select('*').order('day_number'),
      sb.from('nutrition_tips').select('*').order('sort_order'),
      sb.from('nutrition_references').select('*').order('sort_order')
    ]).then(function (r) {
      var failed = r.map(function (x) { return x.error; }).filter(Boolean)[0];
      if (failed) {
        if (failed.status === 401 || failed.code === 'PGRST301') { showLocked(); return; }
        throw failed;
      }
      state.topics = r[0].data || []; state.weeks = r[1].data || []; state.days = r[2].data || [];
      state.tips = r[3].data || []; state.refs = r[4].data || [];

      if (!state.topics.length) {          // ما رجع شي: يمكن عضويتها انفكت للتو
        return Auth.isMember().then(function (member) {
          if (member === false) { showNoMember(); return; }
          throw new Error('empty');
        });
      }
      buildReaderList();
      setStatus(null);
      content.hidden = false;
      renderAll();
      loadBooks();
    }).catch(function () {
      hideAll();
      setStatus('nutrition.error');
      retryBtn.hidden = false;
    });
  }

  retryBtn.addEventListener('click', load);
  document.addEventListener('langchange', function () { if (!content.hidden) renderAll(); });

  /* ---------- الصورة الاختيارية للواجهة ---------- */
  optionalImage($('n-hero'), 'hero', 'n-hero-img');

  /* ---------- البداية ---------- */
  if (!sb || !window.Auth) { setStatus('nutrition.error'); return; }

  Auth.getSession().then(function (session) {
    if (!session) { showLocked(); return; }
    return Auth.isMember().then(function (member) {
      if (member === false) { showNoMember(); return; }
      load();
    });
  });
})();
