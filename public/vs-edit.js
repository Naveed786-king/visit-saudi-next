/* Dubai Visa Portal — visual page editor (Admin → Pages → Visual editor).
   Loaded only for the team, on a page opened with ?vs-edit=1. Click any part of the page to change its text,
   picture, link, colours, sizes and spacing, or hide it. Changes are saved for the website at once. */
(function () {
  'use strict';
  if (window.__vsEdit) return;
  window.__vsEdit = true;
  // the website's other languages (sent by the server with the script)
  var me = document.currentScript;
  var LANGS = ((me && me.getAttribute('data-langs')) || 'ar,ru,de,es,fr,tr,zh,ur,hi').split(',');
  var m = location.pathname.match(/^\/([a-z]{2})(\/.*|$)/);
  var LANG = m && LANGS.indexOf(m[1]) >= 0 ? m[1] : 'en';
  var PATH = LANG === 'en' ? location.pathname : m[2] || '/';
  if (PATH !== '/' && PATH.slice(-1) === '/') PATH = PATH.slice(0, -1);
  var INLINE = { A: 1, B: 1, STRONG: 1, I: 1, EM: 1, U: 1, BR: 1, SPAN: 1, SMALL: 1, SUP: 1, SUB: 1, MARK: 1 };
  var items = {};
  var sel = null;
  var editing = false;
  var lastX = 0;
  var lastY = 0;

  function api(method, body) {
    return fetch('/api/admin/visual' + (method === 'GET' || method === 'DELETE' ? '?path=' + encodeURIComponent(PATH) : ''), {
      method: method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    }).then(function (r) {
      return r.json().then(function (d) {
        if (!r.ok || d.ok === false) throw new Error(d.error || 'Could not save');
        return d;
      });
    });
  }

  /* ---------- overlay boxes ---------- */
  var host = document.createElement('div');
  host.id = 'vs-edit-host';
  host.style.cssText = 'all:initial';
  document.documentElement.appendChild(host);
  var root = host.attachShadow({ mode: 'open' });
  root.innerHTML =
    '<style>' +
    ':host{all:initial}*{box-sizing:border-box;direction:ltr;text-align:left;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}' +
    '.box{position:fixed;pointer-events:none;z-index:2147483600;border:2px dashed #3b82f6;border-radius:4px;display:none}' +
    '.sel{border:2px solid #d4a72c;box-shadow:0 0 0 4000px rgba(0,0,0,.04)}' +
    '.tag{position:absolute;top:-22px;left:-2px;background:#d4a72c;color:#1a1406;font-size:11px;font-weight:700;padding:3px 7px;border-radius:5px 5px 5px 0;white-space:nowrap}' +
    '.hov .tag{background:#3b82f6;color:#fff}' +
    '.panel{position:fixed;top:12px;right:12px;bottom:12px;width:320px;z-index:2147483647;background:#fff;color:#1f2937;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.25);display:flex;flex-direction:column;overflow:hidden;font-size:13px}' +
    '.panel.left{right:auto;left:12px}' +
    '.hd{padding:12px 14px;background:#0b3d2a;color:#fff;display:flex;align-items:center;gap:8px}' +
    '.hd b{flex:1;font-size:14px}.hd button{background:rgba(255,255,255,.15);color:#fff;border:0;border-radius:8px;padding:5px 8px;cursor:pointer;font-size:12px}' +
    '.bd{flex:1;overflow:auto;padding:12px 14px}' +
    '.muted{color:#6b7280;font-size:12px;line-height:1.5}' +
    'h4{margin:14px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280}' +
    '.row{display:flex;align-items:center;gap:8px;margin:6px 0}.row label{flex:1;color:#374151}' +
    'input[type=text],input[type=number],input[type=url]{width:100%;border:1px solid #e5e7eb;border-radius:8px;padding:7px 9px;font-size:13px;color:#111}' +
    'input[type=number]{width:84px}input[type=color]{width:42px;height:30px;border:1px solid #e5e7eb;border-radius:8px;padding:2px;background:#fff}' +
    'input[type=range]{flex:1}' +
    '.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:0;border-radius:10px;padding:8px 12px;font-weight:700;font-size:13px;cursor:pointer;background:#0b3d2a;color:#fff}' +
    '.btn.gold{background:#d4a72c;color:#1a1406}.btn.ghost{background:#f3f4f6;color:#111}.btn.red{background:#fee2e2;color:#991b1b}' +
    '.btn:disabled{opacity:.5;cursor:default}.btns{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}' +
    '.seg{display:flex;gap:4px}.seg button{flex:1;border:1px solid #e5e7eb;background:#fff;border-radius:8px;padding:6px;cursor:pointer;font-size:12px}.seg button.on{background:#0b3d2a;color:#fff;border-color:#0b3d2a}' +
    '.thumb{width:100%;max-height:140px;object-fit:contain;background:#f9fafb;border-radius:10px;border:1px solid #eee}.pics{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:6px 0}.pics button{padding:0;border:2px solid #e5e7eb;border-radius:10px;overflow:hidden;cursor:pointer;background:#f9fafb;height:64px}.pics button:hover{border-color:#d4a72c}.pics img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.note{margin-top:10px;padding:8px 10px;border-radius:10px;background:#fef3c7;color:#92400e;font-size:12px}' +
    '.ok{background:#d1fae5;color:#065f46}.err{background:#fee2e2;color:#991b1b}' +
    '.crumb{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px}.crumb button{border:1px solid #e5e7eb;background:#fff;border-radius:999px;padding:3px 8px;font-size:11px;cursor:pointer}' +
    '.empty{padding:24px 6px;text-align:center}' +
    '</style>' +
    '<div class="box hov"><span class="tag"></span></div><div class="box sel"><span class="tag"></span></div>' +
    '<div class="panel"><div class="hd"><b>Visual editor</b><button data-a="use" title="Use the page normally (menus, cookie notice), then come back to editing">▶ Use page</button><button data-a="side" title="Move the panel">⇆</button></div><div class="bd"></div></div>';
  var hov = root.querySelector('.hov');
  var selBox = root.querySelector('.sel');
  var panel = root.querySelector('.panel');
  var bd = root.querySelector('.bd');
  root.querySelector('[data-a=side]').onclick = function () {
    panel.classList.toggle('left');
  };
  var using = false;
  var useBtn = root.querySelector('[data-a=use]');
  useBtn.onclick = function () {
    if (editing) stopText(false);
    using = !using;
    useBtn.textContent = using ? '✎ Edit' : '▶ Use page';
    useBtn.style.background = using ? '#d4a72c' : '';
    useBtn.style.color = using ? '#1a1406' : '';
    if (using) {
      sel = null;
      place(selBox, null);
      place(hov, null);
      bd.innerHTML = '';
      bd.appendChild(h('div', { class: 'empty' }, [h('p', { style: 'font-weight:700', text: 'Using the page' }), h('p', { class: 'muted', text: 'Click menus, buttons or the cookie notice as a visitor would. Press ✎ Edit to change things again.' })]));
    } else intro();
  };

  function kind(el) {
    var t = el.tagName;
    if (t === 'IMG') return 'Picture';
    if (t === 'A') return 'Link / button';
    if (t === 'BUTTON') return 'Button';
    if (/^H[1-6]$/.test(t)) return 'Heading';
    if (t === 'P') return 'Paragraph';
    if (t === 'SECTION' || t === 'HEADER' || t === 'FOOTER' || t === 'MAIN') return 'Section';
    if (t === 'LI') return 'List item';
    if (t === 'UL' || t === 'OL') return 'List';
    if (INLINE[t]) return 'Text';
    return 'Box';
  }
  function place(box, el) {
    if (!el) {
      box.style.display = 'none';
      return;
    }
    var r = el.getBoundingClientRect();
    box.style.display = 'block';
    box.style.left = r.left - 2 + 'px';
    box.style.top = r.top - 2 + 'px';
    box.style.width = r.width + 4 + 'px';
    box.style.height = r.height + 4 + 'px';
    box.querySelector('.tag').textContent = kind(el) + (items[el.getAttribute('data-vsp')] ? ' · changed' : '');
  }
  function target(e) {
    var el = e.target;
    if (!el || el === host) return null;
    while (el && el.nodeType === 1 && !el.hasAttribute('data-vsp')) el = el.parentElement;
    return el && el.nodeType === 1 ? el : null;
  }
  document.addEventListener(
    'mouseover',
    function (e) {
      if (editing || using) return;
      var el = target(e);
      place(hov, el && el !== sel ? el : null);
    },
    true
  );
  ['click', 'submit', 'mousedown', 'mouseup', 'touchstart'].forEach(function (ev) {
    document.addEventListener(
      ev,
      function (e) {
        if (e.composedPath && e.composedPath()[0] && root.contains(e.composedPath()[0])) return;
        if (using) return;
        if (editing && sel && sel.contains(e.target)) return; // typing inside the text being edited
        e.preventDefault();
        e.stopPropagation();
        if (ev === 'click') {
          lastX = e.clientX;
          lastY = e.clientY;
          var el = target(e);
          if (el) select(el);
        }
      },
      true
    );
  });
  window.addEventListener('scroll', redraw, true);
  window.addEventListener('resize', redraw);
  function redraw() {
    place(selBox, sel);
    place(hov, null);
  }

  /* ---------- helpers ---------- */
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === 'on') for (var ev in attrs.on) el.addEventListener(ev, attrs.on[ev]);
      else if (k === 'text') el.textContent = attrs[k];
      else el.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) {
      if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }
  function note(msg, cls) {
    var n = bd.querySelector('.note');
    if (!n) {
      n = h('div', { class: 'note' });
      bd.appendChild(n);
    }
    n.className = 'note ' + (cls || '');
    n.textContent = msg;
  }
  function toHex(c) {
    var mm = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(c || '');
    if (!mm || mm[4] === '0') return '';
    return '#' + [mm[1], mm[2], mm[3]].map(function (x) { return ('0' + (+x).toString(16)).slice(-2); }).join('');
  }
  function textOnly(el) {
    if (el.tagName === 'IMG' || el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') return false;
    if (!el.textContent.trim()) return false;
    var all = el.getElementsByTagName('*');
    for (var i = 0; i < all.length; i++) if (!INLINE[all[i].tagName]) return false;
    return true;
  }
  function upload(file) {
    var fd = new FormData();
    fd.append('files', file);
    return fetch('/api/admin/upload', { method: 'POST', body: fd, credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.items || !d.items[0]) throw new Error(d.error || 'Upload failed');
        return d.items[0].url;
      });
  }
  function save(body, msg) {
    body.path = PATH;
    body.lang = LANG;
    body.key = sel.getAttribute('data-vsp');
    note('Saving…');
    return api('POST', body)
      .then(function (d) {
        if (d.item) items[body.key] = d.item;
        else delete items[body.key];
        note(msg || 'Saved — live on the website', 'ok');
        place(selBox, sel);
        return d;
      })
      .catch(function (e) {
        note(e.message, 'err');
        throw e;
      });
  }

  /* ---------- the panel for the selected element ---------- */
  function select(el) {
    if (editing) stopText(false);
    sel = el;
    place(selBox, el);
    place(hov, null);
    render();
  }
  function intro() {
    bd.innerHTML = '';
    bd.appendChild(
      h('div', { class: 'empty' }, [
        h('p', { style: 'font-size:15px;font-weight:700;margin:0 0 8px', text: 'Click anything on the page' }),
        h('p', { class: 'muted', text: 'A heading, a text, a picture, a button or a whole section. Then change its text, picture, colours, sizes and spacing here.' }),
        h('p', { class: 'muted', text: LANG === 'en' ? 'Texts you change in English are translated into the other ' + LANGS.length + ' languages automatically. Pictures, colours and sizes change in every language.' : 'You are on the ' + LANG.toUpperCase() + ' page: a text you change here is only for this language. Pictures, colours and sizes change in every language.' }),
      ])
    );
  }
  function render() {
    var el = sel;
    var key = el.getAttribute('data-vsp');
    var it = items[key] || {};
    bd.innerHTML = '';
    // where it is: the bigger areas around it
    var crumbs = h('div', { class: 'crumb' });
    var p = el.parentElement;
    var chain = [];
    while (p && chain.length < 4) {
      if (p.hasAttribute && p.hasAttribute('data-vsp')) chain.push(p);
      p = p.parentElement;
    }
    chain.reverse().forEach(function (a) {
      crumbs.appendChild(h('button', { type: 'button', text: '↑ ' + kind(a), on: { click: function () { select(a); } } }));
    });
    bd.appendChild(h('p', { style: 'margin:0 0 4px;font-weight:800;font-size:15px', text: kind(el) + (it.tag ? ' (changed)' : '') }));
    if (chain.length) bd.appendChild(crumbs);

    // pictures at the place clicked or inside this part (a picture is often behind texts and colours)
    if (el.tagName !== 'IMG') {
      var near = [];
      var all = document.querySelectorAll('img[data-vsp]');
      for (var i = 0; i < all.length; i++) {
        var r = all[i].getBoundingClientRect();
        if (r.width > 8 && lastX >= r.left && lastX <= r.right && lastY >= r.top && lastY <= r.bottom) near.push(all[i]);
      }
      Array.prototype.forEach.call(el.querySelectorAll('img[data-vsp]'), function (n) {
        if (near.length < 9 && near.indexOf(n) < 0) near.push(n);
      });
      if (near.length) {
        bd.appendChild(h('h4', { text: near.length === 1 ? 'Picture here' : 'Pictures here (' + near.length + ')' }));
        var grid = h('div', { class: 'pics' });
        near.forEach(function (n) {
          grid.appendChild(h('button', { type: 'button', title: 'Change this picture', on: { click: function () { select(n); } } }, [h('img', { src: n.currentSrc || n.src, alt: '' })]));
        });
        bd.appendChild(grid);
        bd.appendChild(h('p', { class: 'muted', text: 'Click a picture to change it.' }));
      }
      var bgi = getComputedStyle(el).backgroundImage;
      if (bgi && bgi !== 'none' && /url\(/.test(bgi)) bd.appendChild(h('p', { class: 'muted', text: 'This part has a background picture: change it under Design → Background picture.' }));
    }

    // text
    if (textOnly(el)) {
      bd.appendChild(h('h4', { text: 'Text' }));
      var tb = h('div', { class: 'btns' });
      var edit = h('button', { class: 'btn gold', type: 'button', text: '✎ Edit text on the page' });
      edit.onclick = function () {
        startText();
      };
      tb.appendChild(edit);
      if (it.text && it.text[LANG] !== undefined)
        tb.appendChild(
          h('button', {
            class: 'btn ghost',
            type: 'button',
            text: 'Original text',
            on: { click: function () { save({ text: '' }, 'Back to the original text').then(function () { location.reload(); }); } },
          })
        );
      bd.appendChild(tb);
      bd.appendChild(h('p', { class: 'muted', text: 'Type straight on the page. Ctrl+B bold, Ctrl+I italic.' }));
    }
    // picture
    if (el.tagName === 'IMG') {
      bd.appendChild(h('h4', { text: 'Picture' }));
      bd.appendChild(h('img', { class: 'thumb', src: el.currentSrc || el.src, alt: '' }));
      var file = h('input', { type: 'file', accept: 'image/*', style: 'display:none' });
      var src = h('input', { type: 'url', placeholder: 'or paste a picture address (https://… or /media/…)', value: it.img ? it.img.src : '' });
      var alt = h('input', { type: 'text', placeholder: 'Picture text (description for Google and blind visitors)', value: it.img && it.img.alt !== undefined ? it.img.alt : el.alt || '' });
      file.onchange = function () {
        if (!file.files[0]) return;
        note('Uploading…');
        upload(file.files[0]).then(function (url) {
          src.value = url;
          el.removeAttribute('srcset');
          el.src = url;
          return save({ img: { src: url, alt: alt.value } }, 'New picture saved — live on the website');
        }).catch(function (e) { note(e.message, 'err'); });
      };
      bd.appendChild(file);
      var lib = h('div', { class: 'pics', style: 'display:none' });
      function usePic(url) {
        src.value = url;
        el.removeAttribute('srcset');
        el.src = url;
        save({ img: { src: url, alt: alt.value } }, 'New picture saved — live on the website');
      }
      bd.appendChild(
        h('div', { class: 'btns' }, [
          h('button', { class: 'btn gold', type: 'button', text: '⬆ Upload a new picture', on: { click: function () { file.click(); } } }),
          h('button', {
            class: 'btn ghost',
            type: 'button',
            text: '🖼 My pictures',
            on: {
              click: function () {
                if (lib.style.display !== 'none') {
                  lib.style.display = 'none';
                  return;
                }
                lib.style.display = 'grid';
                lib.innerHTML = '';
                lib.appendChild(h('p', { class: 'muted', text: 'Loading…' }));
                fetch('/api/admin/media?take=60', { credentials: 'same-origin' })
                  .then(function (r) { return r.json(); })
                  .then(function (d) {
                    lib.innerHTML = '';
                    var list = (d.items || []).filter(function (m) { return !m.mime || /^image\//.test(m.mime); });
                    if (!list.length) lib.appendChild(h('p', { class: 'muted', text: 'No pictures yet: upload one.' }));
                    list.forEach(function (m) {
                      lib.appendChild(h('button', { type: 'button', title: m.filename || '', on: { click: function () { usePic(m.url); } } }, [h('img', { src: m.url, alt: '' })]));
                    });
                  })
                  .catch(function () { lib.innerHTML = ''; lib.appendChild(h('p', { class: 'muted', text: 'Could not load the pictures.' })); });
              },
            },
          }),
        ])
      );
      bd.appendChild(lib);
      bd.appendChild(h('div', { class: 'row' }, [src]));
      bd.appendChild(h('div', { class: 'row' }, [alt]));
      bd.appendChild(
        h('div', { class: 'btns' }, [
          h('button', {
            class: 'btn',
            type: 'button',
            text: 'Save picture',
            on: {
              click: function () {
                if (src.value) {
                  el.removeAttribute('srcset');
                  el.src = src.value;
                }
                save({ img: { src: src.value, alt: alt.value } });
              },
            },
          }),
        ])
      );
    }
    // link
    if (el.tagName === 'A') {
      bd.appendChild(h('h4', { text: 'Link' }));
      var href = h('input', { type: 'text', value: it.href || el.getAttribute('href') || '' });
      bd.appendChild(h('div', { class: 'row' }, [href]));
      bd.appendChild(h('div', { class: 'btns' }, [h('button', { class: 'btn', type: 'button', text: 'Save link', on: { click: function () { save({ href: href.value.trim() }); } } })]));
    }
    design(el, it);
  }

  /* ---------- design: colours, sizes, spacing ---------- */
  var FIELDS = [
    ['Text colour', 'color', 'color'],
    ['Background colour', 'background-color', 'color'],
    ['Text size', 'font-size', 'px', 8, 120],
    ['Line height', 'line-height', 'num', 0.8, 3, 0.05],
    ['Letter spacing', 'letter-spacing', 'px', -2, 20, 0.5],
    ['Space inside', 'padding', 'px', 0, 200],
    ['Space above', 'margin-top', 'px', -100, 300],
    ['Space below', 'margin-bottom', 'px', -100, 300],
    ['Rounded corners', 'border-radius', 'px', 0, 200],
    ['Width (%)', 'width', '%', 5, 100],
    ['Minimum height', 'min-height', 'px', 0, 1200],
    ['Border width', 'border-width', 'px', 0, 20],
    ['Border colour', 'border-color', 'color'],
    ['See-through', 'opacity', 'num', 0, 1, 0.05],
  ];
  function design(el, it) {
    var cs = getComputedStyle(el);
    var st = {};
    for (var k in it.style || {}) st[k] = it.style[k];
    bd.appendChild(h('h4', { text: 'Design' }));
    function live(prop, val) {
      if (val === '' || val === null) {
        delete st[prop];
        el.style.removeProperty(prop);
      } else {
        st[prop] = val;
        el.style.setProperty(prop, val, 'important');
      }
      if (prop === 'border-width' && val && !st['border-style']) el.style.setProperty('border-style', 'solid', 'important');
      place(selBox, el);
    }
    // bold, italic, alignment
    var segs = h('div', { class: 'row' });
    var bold = h('button', { type: 'button', text: 'B', style: 'font-weight:800' });
    var ital = h('button', { type: 'button', text: 'I', style: 'font-style:italic' });
    var isBold = (st['font-weight'] || cs.fontWeight) >= 600;
    var isIt = (st['font-style'] || cs.fontStyle) === 'italic';
    bold.className = isBold ? 'on' : '';
    ital.className = isIt ? 'on' : '';
    bold.onclick = function () { isBold = !isBold; bold.className = isBold ? 'on' : ''; live('font-weight', isBold ? '700' : '400'); };
    ital.onclick = function () { isIt = !isIt; ital.className = isIt ? 'on' : ''; live('font-style', isIt ? 'italic' : 'normal'); };
    var al = st['text-align'] || cs.textAlign;
    var aligns = ['left', 'center', 'right'].map(function (a) {
      var b = h('button', { type: 'button', text: a === 'left' ? '⟸' : a === 'center' ? '≡' : '⟹', title: 'Align ' + a });
      b.className = al === a || (a === 'left' && al === 'start') ? 'on' : '';
      b.onclick = function () {
        aligns.forEach(function (x) { x.className = ''; });
        b.className = 'on';
        live('text-align', a);
      };
      return b;
    });
    segs.appendChild(h('div', { class: 'seg', style: 'flex:1' }, [bold, ital].concat(aligns)));
    bd.appendChild(segs);
    FIELDS.forEach(function (f) {
      var prop = f[1];
      var cur = st[prop] !== undefined ? st[prop] : cs.getPropertyValue(prop);
      var row = h('div', { class: 'row' }, [h('label', { text: f[0] })]);
      if (f[2] === 'color') {
        var hex = st[prop] !== undefined ? st[prop] : toHex(cur);
        var c = h('input', { type: 'color', value: hex || '#ffffff' });
        c.oninput = function () { live(prop, c.value); };
        var clr = h('button', { type: 'button', class: 'btn ghost', text: '×', title: 'No change', style: 'padding:4px 8px' });
        clr.onclick = function () { live(prop, ''); };
        row.appendChild(c);
        row.appendChild(clr);
      } else {
        var num = parseFloat(cur);
        if (f[2] === '%' && st[prop] === undefined) num = Math.round((el.getBoundingClientRect().width / ((el.parentElement && el.parentElement.getBoundingClientRect().width) || 1)) * 100);
        if (prop === 'line-height' && st[prop] === undefined) num = parseFloat(cs.lineHeight) / parseFloat(cs.fontSize) || 1.4;
        var n = h('input', { type: 'number', step: String(f[5] || 1), min: String(f[3]), max: String(f[4]), value: isNaN(num) ? '' : String(Math.round(num * 100) / 100) });
        n.oninput = function () {
          var v = n.value === '' ? '' : f[2] === 'num' ? n.value : n.value + f[2];
          live(prop, v);
        };
        row.appendChild(n);
      }
      bd.appendChild(row);
    });
    // background picture for sections and boxes
    if (el.tagName !== 'IMG' && !INLINE[el.tagName]) {
      var bgf = h('input', { type: 'file', accept: 'image/*', style: 'display:none' });
      bgf.onchange = function () {
        if (!bgf.files[0]) return;
        note('Uploading…');
        upload(bgf.files[0]).then(function (url) {
          live('background-image', 'url("' + url + '")');
          live('background-size', 'cover');
          live('background-position', 'center');
          note('Background picture ready — press Save design', 'ok');
        }).catch(function (e) { note(e.message, 'err'); });
      };
      bd.appendChild(bgf);
      bd.appendChild(
        h('div', { class: 'btns' }, [
          h('button', { class: 'btn ghost', type: 'button', text: '🖼 Background picture', on: { click: function () { bgf.click(); } } }),
          st['background-image'] ? h('button', { class: 'btn ghost', type: 'button', text: 'No background picture', on: { click: function () { live('background-image', ''); live('background-size', ''); live('background-position', ''); } } }) : null,
        ])
      );
    }
    var hidden = !!it.hidden;
    bd.appendChild(
      h('div', { class: 'btns', style: 'margin-top:14px' }, [
        h('button', {
          class: 'btn',
          type: 'button',
          text: '✓ Save design',
          on: { click: function () { if (st['border-width'] && !st['border-style']) st['border-style'] = 'solid'; save({ style: st }); } },
        }),
        h('button', {
          class: 'btn ghost',
          type: 'button',
          text: hidden ? 'Show it again' : 'Hide it',
          on: {
            click: function () {
              hidden = !hidden;
              el.style.setProperty('opacity', hidden ? '.25' : '', hidden ? 'important' : '');
              save({ hidden: hidden }, hidden ? 'Hidden on the website (shown faded here)' : 'Shown again').then(function () { render(); });
            },
          },
        }),
        items[el.getAttribute('data-vsp')]
          ? h('button', {
              class: 'btn red',
              type: 'button',
              text: 'Undo all changes of this',
              on: { click: function () { save({ reset: true }, 'Back to the original').then(function () { location.reload(); }); } },
            })
          : null,
      ])
    );
    bd.appendChild(h('p', { class: 'muted', style: 'margin-top:10px', text: 'Colours and sizes show here while you change them; Save design puts them on the website in every language.' }));
  }

  /* ---------- typing a text on the page ---------- */
  var before = '';
  function startText() {
    if (!sel) return;
    editing = true;
    before = sel.innerHTML;
    sel.setAttribute('contenteditable', 'true');
    sel.style.outline = '2px solid #d4a72c';
    sel.focus();
    bd.innerHTML = '';
    bd.appendChild(h('p', { style: 'margin:0 0 6px;font-weight:800;font-size:15px', text: 'Editing the text' }));
    bd.appendChild(h('p', { class: 'muted', text: 'Type on the page. Ctrl+B bold, Ctrl+I italic, Enter for a new line.' }));
    bd.appendChild(
      h('div', { class: 'btns' }, [
        h('button', { class: 'btn', type: 'button', text: '✓ Save text', on: { click: function () { stopText(true); } } }),
        h('button', { class: 'btn ghost', type: 'button', text: 'Cancel', on: { click: function () { stopText(false); } } }),
      ])
    );
    if (LANG === 'en') bd.appendChild(h('p', { class: 'muted', text: 'The other ' + LANGS.length + ' languages are translated automatically after saving (takes a minute or two).' }));
  }
  function stopText(keep) {
    var el = sel;
    editing = false;
    el.removeAttribute('contenteditable');
    el.style.outline = '';
    if (!keep) {
      el.innerHTML = before;
      render();
      return;
    }
    var html = el.innerHTML.replace(/<div>/gi, '<br>').replace(/<\/div>/gi, '').replace(/&nbsp;/g, ' ');
    save({ text: html }, LANG === 'en' ? 'Text saved — live; the other languages follow in a minute' : 'Text saved for this language').then(function () { render(); }, function () {});
  }
  document.addEventListener('keydown', function (e) {
    if (editing && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.execCommand('insertLineBreak');
    }
    if (editing && e.key === 'Escape') stopText(false);
  });

  api('GET')
    .then(function (d) {
      items = d.items || {};
    })
    .catch(function () {});
  // hidden parts show faded in the editor, so they can be found and shown again
  Array.prototype.forEach.call(document.querySelectorAll('[data-vsp]'), function (el) {
    if (el.style.getPropertyValue('display') === 'none' && el.style.getPropertyPriority('display') === 'important') {
      el.style.removeProperty('display');
      el.style.setProperty('opacity', '.25', 'important');
    }
  });
  intro();
})();
