/* Visit Saudi - AI website assistant.
   Loaded only when the assistant is switched on in Admin -> Website chat. It turns the website's own
   "Chat with us" panel into the AI assistant (same design), with the advisor's picture, an "online" dot,
   a short typing pause, and a WhatsApp hand-over to a specialist. Chats are kept in this browser only. */
(function () {
  'use strict';
  var CFG = window.VS_CHAT;
  var btn0 = document.getElementById('chatBtn');
  var panel = document.getElementById('chatPanel');
  if (!CFG || !btn0 || !panel) return;

  var LANG = (document.documentElement.getAttribute('lang') || 'en').slice(0, 2);
  var RTL = LANG === 'ar' || LANG === 'ur';
  var T = {
    en: ['Online now', 'is typing…', 'Continue on WhatsApp', 'Our virtual assistant replies first; a specialist can take over on WhatsApp. Please do not share passport, ID or card numbers.', 'Sorry, something went wrong. Please try again.', 'Which visa do I need?', 'What does it cost?', 'Talk to a specialist', 'New chat'],
    ar: ['متصل الآن', 'يكتب…', 'تابع عبر واتساب', 'يرد مساعدنا الافتراضي أولاً، ويمكن لأحد المختصين المتابعة عبر واتساب. لا تشارك أرقام الجواز أو الهوية أو البطاقات.', 'عذراً، حدث خطأ. حاول مرة أخرى.', 'ما التأشيرة التي أحتاجها؟', 'كم التكلفة؟', 'تحدث مع مختص', 'محادثة جديدة'],
    ru: ['В сети', 'печатает…', 'Продолжить в WhatsApp', 'Сначала отвечает виртуальный помощник, затем специалист может продолжить в WhatsApp. Не сообщайте номера паспорта, удостоверений или карт.', 'Извините, произошла ошибка. Попробуйте ещё раз.', 'Какая виза мне нужна?', 'Сколько это стоит?', 'Связаться со специалистом', 'Новый чат'],
    de: ['Jetzt online', 'schreibt…', 'Weiter auf WhatsApp', 'Zuerst antwortet unser virtueller Assistent; ein Spezialist kann auf WhatsApp übernehmen. Bitte keine Pass-, Ausweis- oder Kartennummern teilen.', 'Entschuldigung, etwas ist schiefgelaufen. Bitte erneut versuchen.', 'Welches Visum brauche ich?', 'Was kostet es?', 'Mit einem Spezialisten sprechen', 'Neuer Chat'],
    es: ['En línea', 'está escribiendo…', 'Seguir en WhatsApp', 'Primero responde nuestro asistente virtual; un especialista puede continuar por WhatsApp. No compartas números de pasaporte, documento o tarjeta.', 'Lo sentimos, algo salió mal. Inténtalo de nuevo.', '¿Qué visado necesito?', '¿Cuánto cuesta?', 'Hablar con un especialista', 'Nuevo chat'],
    fr: ['En ligne', 'écrit…', 'Continuer sur WhatsApp', 'Notre assistant virtuel répond d’abord ; un spécialiste peut prendre le relais sur WhatsApp. Ne partagez pas de numéro de passeport, d’identité ou de carte.', 'Désolé, une erreur s’est produite. Veuillez réessayer.', 'De quel visa ai-je besoin ?', 'Combien ça coûte ?', 'Parler à un spécialiste', 'Nouvelle discussion'],
    tr: ['Çevrimiçi', 'yazıyor…', 'WhatsApp’ta devam et', 'Önce sanal asistanımız yanıtlar; bir uzman WhatsApp’ta devam edebilir. Lütfen pasaport, kimlik veya kart numarası paylaşmayın.', 'Üzgünüz, bir hata oluştu. Lütfen tekrar deneyin.', 'Hangi vizeye ihtiyacım var?', 'Ücreti ne kadar?', 'Bir uzmanla konuş', 'Yeni sohbet'],
    zh: ['在线', '正在输入…', '在 WhatsApp 上继续', '虚拟助手先回复，专员可在 WhatsApp 上接手。请勿发送护照、证件或银行卡号码。', '抱歉，出了点问题，请重试。', '我需要哪种签证？', '费用是多少？', '联系专员', '新对话'],
    ur: ['ابھی آن لائن', 'لکھ رہی ہیں…', 'واٹس ایپ پر جاری رکھیں', 'پہلے ہمارا ورچوئل اسسٹنٹ جواب دیتا ہے؛ ماہر واٹس ایپ پر بات آگے بڑھا سکتا ہے۔ پاسپورٹ، شناختی یا کارڈ نمبر شیئر نہ کریں۔', 'معذرت، کچھ غلط ہو گیا۔ دوبارہ کوشش کریں۔', 'مجھے کون سا ویزا چاہیے؟', 'خرچ کتنا ہے؟', 'ماہر سے بات کریں', 'نئی چیٹ'],
    hi: ['अभी ऑनलाइन', 'लिख रही हैं…', 'WhatsApp पर जारी रखें', 'पहले हमारा वर्चुअल असिस्टेंट जवाब देता है; विशेषज्ञ WhatsApp पर बात आगे बढ़ा सकते हैं। पासपोर्ट, आईडी या कार्ड नंबर साझा न करें।', 'माफ़ करें, कुछ गड़बड़ हुई। फिर कोशिश करें।', 'मुझे कौन सा वीज़ा चाहिए?', 'खर्च कितना है?', 'विशेषज्ञ से बात करें', 'नई चैट'],
    it: ['Online ora', 'sta scrivendo…', 'Continua su WhatsApp', 'Prima risponde il nostro assistente virtuale; uno specialista può continuare su WhatsApp. Non condividere numeri di passaporto, documento o carta.', 'Spiacenti, qualcosa è andato storto. Riprova.', 'Di quale visto ho bisogno?', 'Quanto costa?', 'Parla con uno specialista', 'Nuova chat'],
    ro: ['Online acum', 'scrie…', 'Continuă pe WhatsApp', 'Mai întâi răspunde asistentul virtual; un specialist poate continua pe WhatsApp. Nu trimiteți numere de pașaport, act de identitate sau card.', 'Ne pare rău, a apărut o eroare. Încercați din nou.', 'De ce viză am nevoie?', 'Cât costă?', 'Vorbește cu un specialist', 'Conversație nouă'],
    pt: ['Online agora', 'está a escrever…', 'Continuar no WhatsApp', 'Primeiro responde o nosso assistente virtual; um especialista pode continuar no WhatsApp. Não partilhe números de passaporte, documento ou cartão.', 'Desculpe, algo correu mal. Tente novamente.', 'De que visto preciso?', 'Quanto custa?', 'Falar com um especialista', 'Nova conversa'],
    pl: ['Teraz online', 'pisze…', 'Kontynuuj na WhatsApp', 'Najpierw odpowiada wirtualny asystent; specjalista może przejąć rozmowę na WhatsApp. Nie podawaj numerów paszportu, dowodu ani karty.', 'Przepraszamy, coś poszło nie tak. Spróbuj ponownie.', 'Jakiej wizy potrzebuję?', 'Ile to kosztuje?', 'Porozmawiaj ze specjalistą', 'Nowy czat'],
    hu: ['Most elérhető', 'ír…', 'Folytatás WhatsAppon', 'Először virtuális asszisztensünk válaszol; egy szakértő WhatsAppon folytathatja. Ne ossza meg útlevél-, igazolvány- vagy kártyaszámát.', 'Elnézést, hiba történt. Próbálja újra.', 'Milyen vízumra van szükségem?', 'Mennyibe kerül?', 'Beszélek egy szakértővel', 'Új csevegés'],
    hr: ['Sada na mreži', 'piše…', 'Nastavi na WhatsAppu', 'Prvo odgovara naš virtualni asistent; stručnjak može nastaviti na WhatsAppu. Ne dijelite brojeve putovnice, osobne ili kartice.', 'Žao nam je, nešto nije u redu. Pokušajte ponovno.', 'Koja mi viza treba?', 'Koliko košta?', 'Razgovor sa stručnjakom', 'Novi razgovor'],
    sk: ['Teraz online', 'píše…', 'Pokračovať na WhatsAppe', 'Najprv odpovedá virtuálny asistent; špecialista môže pokračovať na WhatsAppe. Neposielajte čísla pasu, dokladu ani karty.', 'Prepáčte, niečo sa pokazilo. Skúste to znova.', 'Aké vízum potrebujem?', 'Koľko to stojí?', 'Hovoriť so špecialistom', 'Nový chat'],
    cs: ['Nyní online', 'píše…', 'Pokračovat na WhatsAppu', 'Nejprve odpovídá virtuální asistent; specialista může pokračovat na WhatsAppu. Neposílejte čísla pasu, dokladu ani karty.', 'Omlouváme se, něco se pokazilo. Zkuste to znovu.', 'Jaké vízum potřebuji?', 'Kolik to stojí?', 'Mluvit se specialistou', 'Nový chat'],
    id: ['Online sekarang', 'sedang mengetik…', 'Lanjutkan di WhatsApp', 'Asisten virtual kami menjawab lebih dulu; spesialis dapat melanjutkan di WhatsApp. Jangan bagikan nomor paspor, identitas, atau kartu.', 'Maaf, terjadi kesalahan. Silakan coba lagi.', 'Visa apa yang saya perlukan?', 'Berapa biayanya?', 'Bicara dengan spesialis', 'Obrolan baru'],
  };
  var t = T[LANG] || T.en;
  var STORE = 'vsa-ai-chat-v1';
  var color = CFG.color || '#0a5c36';

  /* ---------- styles (scoped to the chat panel) ---------- */
  var css =
    '.vsc-face{position:relative;display:inline-block;flex:none;border-radius:50%;line-height:0}' +
    '#chatPanel .vsc-face img,#chatBtn .vsc-face img{width:100%;height:100%;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px #fff;display:block}' +
    '.vsc-face .vsc-dot{position:absolute;right:-1px;bottom:-1px;width:28%;height:28%;min-width:9px;min-height:9px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 2px #fff}' +
    '[dir=rtl] .vsc-face .vsc-dot{right:auto;left:-1px}' +
    '#chatPanel .chat-head{gap:10px}#chatPanel .vsc-head-txt{flex:1;min-width:0}#chatPanel .vsc-head-txt b{display:block}' +
    '#chatPanel .vsc-online{display:inline-flex;align-items:center;gap:6px}#chatPanel .vsc-online:before{content:"";width:7px;height:7px;border-radius:50%;background:#22c55e;display:inline-block}' +
    '#chatPanel .vsc-row{display:flex;align-items:flex-end;gap:8px;align-self:flex-start;max-width:92%}#chatPanel .vsc-row .cmsg{max-width:100%}' +
    '#chatPanel .cmsg.user{background:' + color + '}' +
    '#chatPanel .cmsg{white-space:pre-line}' +
    '#chatPanel .vsc-wa{display:inline-flex;align-items:center;gap:7px;margin-top:9px;background:#25d366;color:#fff!important;border-radius:99px;padding:8px 14px;font-size:.82rem;font-weight:800;text-decoration:none}' +
    '#chatPanel .vsc-typing{display:inline-flex;gap:4px;padding:13px 14px}#chatPanel .vsc-typing i{width:6px;height:6px;border-radius:50%;background:rgba(0,0,0,.4);animation:vscb 1s infinite ease-in-out}' +
    '#chatPanel .vsc-typing i:nth-child(2){animation-delay:.15s}#chatPanel .vsc-typing i:nth-child(3){animation-delay:.3s}' +
    '#chatPanel .vsc-who{font-size:.68rem;color:rgba(0,0,0,.45);margin-top:3px}' +
    '@keyframes vscb{0%,80%,100%{transform:translateY(0);opacity:.5}40%{transform:translateY(-4px);opacity:1}}' +
    '#chatPanel .vsc-note{font-size:.68rem;line-height:1.35;color:rgba(0,0,0,.5);padding:7px 14px 0;margin:0;border-top:1px solid rgba(0,0,0,.06)}' +
    '#chatPanel .vsc-new{background:none;border:0;color:inherit;opacity:.75;font:inherit;font-size:.7rem;text-decoration:underline;cursor:pointer;padding:0;margin-inline-start:8px}' +
    '#chatBtn .vsc-face{width:26px;height:26px}#chatBtn .vsc-face img{box-shadow:0 0 0 2px rgba(255,255,255,.85)}';
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function face(size, dot) {
    return '<span class="vsc-face" style="width:' + size + 'px;height:' + size + 'px"><img src="' + esc(CFG.avatar || '/brand/advisor.svg') + '" alt="" width="' + size + '" height="' + size + '">' + (dot ? '<span class="vsc-dot"></span>' : '') + '</span>';
  }
  /* links to our own pages inside the AI's plain text (no HTML from the AI) */
  function linkify(text) {
    var pre = LANG !== 'en' ? '/' + LANG : '';
    return esc(text).replace(/(^|[\s(])(\/[a-z][a-z0-9-]{1,}(?:\/[a-z0-9-]+)*)/gi, function (m, a, p) {
      var href = /^\/(ar|ru|de|es|fr|tr|zh|ur|hi|it|ro|pt|pl|hu|hr|sk|cs|id)(\/|$)/.test(p) ? p : pre + p;
      return a + '<a href="' + href + '">' + p + '</a>';
    });
  }
  function load() {
    try {
      var v = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (v && v.visitorId) return v;
    } catch (e) {}
    return { visitorId: Math.random().toString(36).slice(2) + Date.now().toString(36), messages: [] };
  }
  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify({ sessionId: state.sessionId, visitorId: state.visitorId, messages: state.messages.slice(-40) }));
    } catch (e) {}
  }
  var state = load();

  /* ---------- the button: the advisor's picture (old click handlers are removed with the clone) ---------- */
  var btn = btn0.cloneNode(true);
  btn0.parentNode.replaceChild(btn, btn0);
  var svg = btn.querySelector('svg');
  var f = document.createElement('span');
  f.innerHTML = face(26, true);
  if (svg) svg.parentNode.replaceChild(f.firstChild, svg);
  else btn.insertBefore(f.firstChild, btn.firstChild);
  btn.setAttribute('aria-label', (CFG.botName || 'Assistant') + ' - chat');

  /* ---------- the panel's head ---------- */
  var head = panel.querySelector('.chat-head');
  if (head) {
    var img = head.querySelector('img');
    var ff = document.createElement('span');
    ff.innerHTML = face(40, true);
    if (img) img.parentNode.replaceChild(ff.firstChild, img);
    var txt = head.querySelector('div');
    if (txt) {
      txt.className = 'vsc-head-txt';
      txt.innerHTML = '<b>' + esc(CFG.botName || 'Assistant') + '</b><span class="vsc-online">' + (CFG.role ? esc(CFG.role) + ' · ' : '') + esc(t[0]) + '</span><button type="button" class="vsc-new">' + esc(t[8]) + '</button>';
      txt.querySelector('.vsc-new').addEventListener('click', function () {
        state = { visitorId: state.visitorId, messages: [] };
        save();
        render();
      });
    }
  }
  var body = document.getElementById('chatBody');
  var chips = document.getElementById('chatChips');
  var form0 = document.getElementById('chatForm');
  var form = form0.cloneNode(true);
  form0.parentNode.replaceChild(form, form0);
  var input = form.querySelector('input');
  var note = document.createElement('p');
  note.className = 'vsc-note';
  note.textContent = t[3];
  form.parentNode.insertBefore(note, form);
  var closeBtn = document.getElementById('chatClose');
  if (closeBtn) {
    var c2 = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(c2, closeBtn);
    c2.addEventListener('click', function () {
      panel.hidden = true;
    });
  }

  var busy = false;
  function bubble(m) {
    if (m.role === 'user') return '<div class="cmsg user">' + esc(m.text) + '</div>';
    return '<div class="vsc-row">' + face(26, false) + '<div class="cmsg bot">' + linkify(m.text) + (m.wa ? '<br><a class="vsc-wa" href="' + esc(m.wa) + '" target="_blank" rel="noopener">' + esc(t[2]) + '</a>' : '') + '</div></div>';
  }
  function render() {
    var html = bubble({ role: 'bot', text: CFG.greeting || '' });
    for (var i = 0; i < state.messages.length; i++) html += bubble(state.messages[i]);
    if (busy) html += '<div class="vsc-row">' + face(26, false) + '<div><div class="cmsg bot vsc-typing"><i></i><i></i><i></i></div><div class="vsc-who">' + esc(CFG.botName || '') + ' ' + esc(t[1]) + '</div></div></div>';
    body.innerHTML = html;
    chips.innerHTML = '';
    if (!state.messages.length && !busy) {
      [t[5], t[6], t[7]].forEach(function (s) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip';
        b.textContent = s;
        b.addEventListener('click', function () {
          send(s);
        });
        chips.appendChild(b);
      });
    }
    body.scrollTop = body.scrollHeight;
  }
  function pause(reply) {
    return new Promise(function (r) {
      setTimeout(r, Math.min(2600, 700 + String(reply).length * 9));
    });
  }
  function send(text) {
    var msg = String(text || '').trim();
    if (!msg || busy) return;
    input.value = '';
    state.messages.push({ role: 'user', text: msg });
    busy = true;
    render();
    var ok = false;
    fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: msg, sessionId: state.sessionId, visitorId: state.visitorId, locale: LANG, page: location.pathname }) })
      .then(function (r) {
        ok = r.ok;
        return r.json();
      })
      .then(function (d) {
        return (ok && d.reply ? pause(d.reply) : Promise.resolve()).then(function () {
          if (d.masked) {
            var last = state.messages[state.messages.length - 1];
            last.text = last.text.replace(/\b(?:\d[ -]?){9,19}\b|\b[A-Z]{1,2}\d{6,9}\b/g, '••••');
          }
          if (d.sessionId) state.sessionId = d.sessionId;
          state.messages.push(ok ? { role: 'bot', text: d.reply, wa: d.handover && d.handover.url } : { role: 'bot', text: d.error || t[4] });
        });
      })
      .catch(function () {
        state.messages.push({ role: 'bot', text: t[4] });
      })
      .then(function () {
        busy = false;
        save();
        render();
      });
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    send(input.value);
  });
  btn.addEventListener('click', function () {
    var open = panel.hidden;
    panel.hidden = !open;
    if (open) {
      render();
      input.focus();
    }
  });
  if (RTL) panel.setAttribute('dir', 'rtl');

  /* a chat the team deleted in the admin disappears here too */
  if (state.sessionId) {
    fetch('/api/chat?sessionId=' + encodeURIComponent(state.sessionId) + '&visitorId=' + encodeURIComponent(state.visitorId), { cache: 'no-store' })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (d) {
        if (d && d.active === false) {
          state = { visitorId: state.visitorId, messages: [] };
          save();
        }
      })
      .catch(function () {});
  }
})();
