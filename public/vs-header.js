/* Visit Saudi - header controls: the flag of the chosen language and the symbol of the chosen currency
in the two buttons, and the account icon (signed in: the client dashboard, otherwise the sign-in page). */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };

  function ico(btn) {
    var i = btn.querySelector('.vs-ico');
    if (!i) {
      i = document.createElement('span');
      i.className = 'vs-ico';
      btn.insertBefore(i, btn.firstChild);
      btn.classList.add('vs-has-ico');
    }
    return i;
  }
  function lang() {
    var dd = $('#langDD');
    if (!dd) return;
    var btn = dd.querySelector('.dd-btn');
    var code = (document.documentElement.getAttribute('lang') || 'en').slice(0, 2);
    var opt = dd.querySelector('.dd-opt.sel') || dd.querySelector('.dd-opt[data-lang="' + code + '"]') || dd.querySelector('.dd-opt');
    var img = opt && opt.querySelector('img');
    var i = ico(btn);
    if (img && i.getAttribute('data-src') !== img.src) {
      i.setAttribute('data-src', img.src);
      i.innerHTML = '<img src="' + img.src + '" alt="">';
    }
  }
  function cur() {
    var dd = $('#curDD');
    if (!dd) return;
    var btn = dd.querySelector('.dd-btn');
    var code = ($('#curCur') || {}).textContent || 'USD';
    var opt = dd.querySelector('.dd-opt.sel') || dd.querySelector('.dd-opt[data-cur="' + code + '"]');
    var sym = opt && opt.querySelector('.dd-sym');
    var i = ico(btn);
    var s = sym ? sym.textContent : '$';
    if (i.textContent !== s) i.textContent = s;
    i.style.fontSize = s.length > 2 ? '.66rem' : s.length > 1 ? '.76rem' : '';
  }
  function watch(sel, fn) {
    var el = $(sel);
    if (!el || !window.MutationObserver) return;
    new MutationObserver(fn).observe(el, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class'] });
  }
  lang();
  cur();
  watch('#langDD', lang);
  watch('#curDD', cur);

  /* the account icon: signed-in clients go to their dashboard, the team to the admin */
  var a = $('.vs-acct');
  if (a && window.fetch) {
    fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var u = d && d.user;
        if (!u) return;
        a.classList.add('in');
        if (u.role === 'ADMIN' || u.role === 'EDITOR') a.href = '/admin';
        if (u.name) a.setAttribute('title', u.name);
      })
      .catch(function () {});
  }
})();
