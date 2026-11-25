/* Visit Saudi - apply page in steps.
The website's own apply form, shown one part at a time with step tabs on top (Visa & travel, Applicant,
Contact & account, Documents, Review), a password for the client dashboard, and an "Open your dashboard"
button once the application is in. The form itself, its fields and its design stay the website's own. */
(function () {
  'use strict';
  var wiz = document.getElementById('wizard');
  if (!wiz || wiz.getAttribute('data-steps')) return;
  wiz.setAttribute('data-steps', '1');

  var LANG = (document.documentElement.getAttribute('lang') || 'en').slice(0, 2);
  var T = {
    en: ['Next', 'Back', 'Step', 'of', 'Your client dashboard', 'Follow every stage, send documents and pay online, with your email and this password.', 'Create a password', 'Repeat the password', 'At least 8 characters.', 'Please use at least 8 characters.', 'The passwords do not match.', 'Open your dashboard', 'Applied with us before? Type the password of your account.', 'This email belongs to our team. Please use your own email.', 'Your application could not be sent. Please check your connection and try again, or contact us on WhatsApp.', 'Your application is added to your existing account. Sign in with your password, or use "Forgot password".'],
    ar: ['التالي', 'رجوع', 'الخطوة', 'من', 'لوحة العميل الخاصة بك', 'تابع كل مرحلة وأرسل المستندات وادفع عبر الإنترنت باستخدام بريدك الإلكتروني وكلمة المرور هذه.', 'أنشئ كلمة مرور', 'أعد كتابة كلمة المرور', '8 أحرف على الأقل.', 'يرجى استخدام 8 أحرف على الأقل.', 'كلمتا المرور غير متطابقتين.', 'افتح لوحتك', 'قدّمت معنا من قبل؟ اكتب كلمة مرور حسابك.', 'هذا البريد الإلكتروني يخص فريقنا. يرجى استخدام بريدك الخاص.', 'تعذّر إرسال طلبك. تحقق من اتصالك وحاول مرة أخرى، أو تواصل معنا عبر واتساب.', 'أُضيف طلبك إلى حسابك الحالي. سجّل الدخول بكلمة مرورك أو استخدم "نسيت كلمة المرور".'],
    ru: ['Далее', 'Назад', 'Шаг', 'из', 'Ваш личный кабинет', 'Следите за каждым этапом, отправляйте документы и оплачивайте онлайн с этим email и паролем.', 'Придумайте пароль', 'Повторите пароль', 'Не менее 8 символов.', 'Используйте не менее 8 символов.', 'Пароли не совпадают.', 'Открыть личный кабинет', 'Уже подавали заявку? Введите пароль своего аккаунта.', 'Этот email принадлежит нашей команде. Укажите свой email.', 'Не удалось отправить заявку. Проверьте подключение и попробуйте снова или напишите нам в WhatsApp.', 'Заявка добавлена в ваш аккаунт. Войдите со своим паролем или нажмите «Забыли пароль».'],
    de: ['Weiter', 'Zurück', 'Schritt', 'von', 'Ihr Kundenbereich', 'Verfolgen Sie jeden Schritt, senden Sie Dokumente und bezahlen Sie online – mit Ihrer E-Mail und diesem Passwort.', 'Passwort erstellen', 'Passwort wiederholen', 'Mindestens 8 Zeichen.', 'Bitte mindestens 8 Zeichen verwenden.', 'Die Passwörter stimmen nicht überein.', 'Kundenbereich öffnen', 'Schon einmal bei uns beantragt? Geben Sie das Passwort Ihres Kontos ein.', 'Diese E-Mail gehört unserem Team. Bitte verwenden Sie Ihre eigene E-Mail.', 'Ihr Antrag konnte nicht gesendet werden. Prüfen Sie Ihre Verbindung und versuchen Sie es erneut oder schreiben Sie uns auf WhatsApp.', 'Ihr Antrag wurde Ihrem bestehenden Konto hinzugefügt. Melden Sie sich mit Ihrem Passwort an oder nutzen Sie „Passwort vergessen“.'],
    es: ['Siguiente', 'Atrás', 'Paso', 'de', 'Tu panel de cliente', 'Sigue cada etapa, envía documentos y paga en línea con tu email y esta contraseña.', 'Crea una contraseña', 'Repite la contraseña', 'Al menos 8 caracteres.', 'Usa al menos 8 caracteres.', 'Las contraseñas no coinciden.', 'Abrir tu panel', '¿Ya solicitaste con nosotros? Escribe la contraseña de tu cuenta.', 'Este email pertenece a nuestro equipo. Usa tu propio email.', 'No se pudo enviar tu solicitud. Revisa tu conexión e inténtalo de nuevo, o escríbenos por WhatsApp.', 'Tu solicitud se añadió a tu cuenta existente. Inicia sesión con tu contraseña o usa «Olvidé mi contraseña».'],
    fr: ['Suivant', 'Retour', 'Étape', 'sur', 'Votre espace client', 'Suivez chaque étape, envoyez vos documents et payez en ligne avec votre e-mail et ce mot de passe.', 'Créez un mot de passe', 'Répétez le mot de passe', 'Au moins 8 caractères.', 'Veuillez utiliser au moins 8 caractères.', 'Les mots de passe ne correspondent pas.', 'Ouvrir votre espace', 'Déjà client ? Saisissez le mot de passe de votre compte.', 'Cet e-mail appartient à notre équipe. Veuillez utiliser votre propre e-mail.', 'Votre demande n’a pas pu être envoyée. Vérifiez votre connexion et réessayez, ou contactez-nous sur WhatsApp.', 'Votre demande a été ajoutée à votre compte existant. Connectez-vous avec votre mot de passe ou utilisez « Mot de passe oublié ».'],
    tr: ['İleri', 'Geri', 'Adım', '/', 'Müşteri paneliniz', 'Her aşamayı takip edin, belge gönderin ve e-postanız ile bu şifreyle online ödeme yapın.', 'Şifre oluşturun', 'Şifreyi tekrar yazın', 'En az 8 karakter.', 'Lütfen en az 8 karakter kullanın.', 'Şifreler eşleşmiyor.', 'Panelinizi açın', 'Daha önce başvurdunuz mu? Hesabınızın şifresini yazın.', 'Bu e-posta ekibimize ait. Lütfen kendi e-postanızı kullanın.', 'Başvurunuz gönderilemedi. Bağlantınızı kontrol edip tekrar deneyin veya WhatsApp’tan bize yazın.', 'Başvurunuz mevcut hesabınıza eklendi. Şifrenizle giriş yapın veya “Şifremi unuttum”u kullanın.'],
    zh: ['下一步', '上一步', '第', '步，共', '您的客户中心', '使用您的邮箱和此密码，查看每个阶段、发送文件并在线付款。', '设置密码', '再次输入密码', '至少 8 个字符。', '请至少使用 8 个字符。', '两次输入的密码不一致。', '打开客户中心', '以前申请过？请输入您账户的密码。', '此邮箱属于我们的团队，请使用您自己的邮箱。', '申请未能发送。请检查网络后重试，或通过 WhatsApp 联系我们。', '您的申请已添加到现有账户。请用密码登录，或使用“忘记密码”。'],
    ur: ['اگلا', 'واپس', 'مرحلہ', 'از', 'آپ کا کلائنٹ ڈیش بورڈ', 'اپنی ای میل اور اس پاس ورڈ سے ہر مرحلہ دیکھیں، دستاویزات بھیجیں اور آن لائن ادائیگی کریں۔', 'پاس ورڈ بنائیں', 'پاس ورڈ دوبارہ لکھیں', 'کم از کم 8 حروف۔', 'براہ کرم کم از کم 8 حروف استعمال کریں۔', 'دونوں پاس ورڈ ایک جیسے نہیں ہیں۔', 'اپنا ڈیش بورڈ کھولیں', 'پہلے ہمارے ساتھ اپلائی کیا ہے؟ اپنے اکاؤنٹ کا پاس ورڈ لکھیں۔', 'یہ ای میل ہماری ٹیم کی ہے۔ براہ کرم اپنی ای میل استعمال کریں۔', 'آپ کی درخواست نہیں بھیجی جا سکی۔ کنکشن چیک کر کے دوبارہ کوشش کریں، یا واٹس ایپ پر رابطہ کریں۔', 'آپ کی درخواست آپ کے موجودہ اکاؤنٹ میں شامل کر دی گئی ہے۔ اپنے پاس ورڈ سے سائن اِن کریں یا "پاس ورڈ بھول گئے" استعمال کریں۔'],
    hi: ['आगे', 'पीछे', 'चरण', 'में से', 'आपका क्लाइंट डैशबोर्ड', 'अपने ईमेल और इस पासवर्ड से हर चरण देखें, दस्तावेज़ भेजें और ऑनलाइन भुगतान करें।', 'पासवर्ड बनाएं', 'पासवर्ड दोबारा लिखें', 'कम से कम 8 अक्षर।', 'कृपया कम से कम 8 अक्षर रखें।', 'दोनों पासवर्ड मेल नहीं खाते।', 'अपना डैशबोर्ड खोलें', 'पहले हमारे साथ आवेदन किया है? अपने खाते का पासवर्ड लिखें।', 'यह ईमेल हमारी टीम का है। कृपया अपना ईमेल इस्तेमाल करें।', 'आपका आवेदन नहीं भेजा जा सका। कनेक्शन जांचें और फिर कोशिश करें, या WhatsApp पर संपर्क करें।', 'आपका आवेदन आपके मौजूदा खाते में जोड़ दिया गया है। अपने पासवर्ड से साइन इन करें या "पासवर्ड भूल गए" इस्तेमाल करें।'],
    it: ['Avanti', 'Indietro', 'Passo', 'di', 'La tua area clienti', 'Segui ogni fase, invia documenti e paga online con la tua email e questa password.', 'Crea una password', 'Ripeti la password', 'Almeno 8 caratteri.', 'Usa almeno 8 caratteri.', 'Le password non coincidono.', 'Apri la tua area', 'Hai già fatto richiesta con noi? Inserisci la password del tuo account.', 'Questa email appartiene al nostro team. Usa la tua email.', 'Impossibile inviare la richiesta. Controlla la connessione e riprova, oppure scrivici su WhatsApp.', 'La richiesta è stata aggiunta al tuo account. Accedi con la tua password o usa «Password dimenticata».'],
    ro: ['Înainte', 'Înapoi', 'Pasul', 'din', 'Contul tău de client', 'Urmărește fiecare etapă, trimite documente și plătește online cu emailul tău și această parolă.', 'Creează o parolă', 'Repetă parola', 'Cel puțin 8 caractere.', 'Folosește cel puțin 8 caractere.', 'Parolele nu coincid.', 'Deschide contul tău', 'Ai mai aplicat la noi? Scrie parola contului tău.', 'Acest email aparține echipei noastre. Folosește emailul tău.', 'Cererea nu a putut fi trimisă. Verifică conexiunea și încearcă din nou sau scrie-ne pe WhatsApp.', 'Cererea a fost adăugată în contul tău existent. Conectează-te cu parola ta sau folosește „Am uitat parola”.'],
    pt: ['Seguinte', 'Voltar', 'Passo', 'de', 'A sua área de cliente', 'Acompanhe cada etapa, envie documentos e pague online com o seu email e esta palavra-passe.', 'Crie uma palavra-passe', 'Repita a palavra-passe', 'Pelo menos 8 caracteres.', 'Use pelo menos 8 caracteres.', 'As palavras-passe não coincidem.', 'Abrir a sua área', 'Já fez um pedido connosco? Escreva a palavra-passe da sua conta.', 'Este email pertence à nossa equipa. Use o seu próprio email.', 'Não foi possível enviar o pedido. Verifique a ligação e tente novamente, ou fale connosco no WhatsApp.', 'O pedido foi adicionado à sua conta. Entre com a sua palavra-passe ou use «Esqueci-me da palavra-passe».'],
    pl: ['Dalej', 'Wstecz', 'Krok', 'z', 'Twój panel klienta', 'Śledź każdy etap, wysyłaj dokumenty i płać online, używając e-maila i tego hasła.', 'Utwórz hasło', 'Powtórz hasło', 'Co najmniej 8 znaków.', 'Użyj co najmniej 8 znaków.', 'Hasła nie są takie same.', 'Otwórz swój panel', 'Składałeś już u nas wniosek? Wpisz hasło do swojego konta.', 'Ten e-mail należy do naszego zespołu. Użyj własnego e-maila.', 'Nie udało się wysłać wniosku. Sprawdź połączenie i spróbuj ponownie lub napisz do nas na WhatsApp.', 'Wniosek dodano do Twojego konta. Zaloguj się swoim hasłem lub użyj „Nie pamiętam hasła”.'],
    hu: ['Tovább', 'Vissza', 'Lépés', '/', 'Az ügyfélfiókja', 'Kövesse az egyes lépéseket, küldjön dokumentumokat és fizessen online az e-mail címével és ezzel a jelszóval.', 'Hozzon létre jelszót', 'Ismételje meg a jelszót', 'Legalább 8 karakter.', 'Kérjük, legalább 8 karaktert használjon.', 'A jelszavak nem egyeznek.', 'Fiók megnyitása', 'Korábban már igényelt nálunk? Írja be fiókja jelszavát.', 'Ez az e-mail a csapatunké. Kérjük, a saját e-mail címét használja.', 'A kérelmet nem sikerült elküldeni. Ellenőrizze a kapcsolatot és próbálja újra, vagy írjon nekünk WhatsAppon.', 'A kérelmet hozzáadtuk meglévő fiókjához. Lépjen be jelszavával, vagy használja az „Elfelejtett jelszó” lehetőséget.'],
    hr: ['Dalje', 'Natrag', 'Korak', 'od', 'Vaše korisničko sučelje', 'Pratite svaki korak, šaljite dokumente i plaćajte online svojim e-mailom i ovom lozinkom.', 'Izradite lozinku', 'Ponovite lozinku', 'Najmanje 8 znakova.', 'Koristite najmanje 8 znakova.', 'Lozinke se ne podudaraju.', 'Otvorite svoje sučelje', 'Već ste se prijavljivali kod nas? Upišite lozinku svog računa.', 'Ovaj e-mail pripada našem timu. Koristite vlastiti e-mail.', 'Zahtjev nije poslan. Provjerite vezu i pokušajte ponovno ili nam pišite na WhatsApp.', 'Zahtjev je dodan vašem postojećem računu. Prijavite se lozinkom ili koristite „Zaboravljena lozinka”.'],
    sk: ['Ďalej', 'Späť', 'Krok', 'z', 'Váš klientsky panel', 'Sledujte každý krok, posielajte dokumenty a plaťte online pomocou e-mailu a tohto hesla.', 'Vytvorte si heslo', 'Zopakujte heslo', 'Aspoň 8 znakov.', 'Použite aspoň 8 znakov.', 'Heslá sa nezhodujú.', 'Otvoriť panel', 'Už ste u nás žiadali? Zadajte heslo svojho účtu.', 'Tento e-mail patrí nášmu tímu. Použite svoj vlastný e-mail.', 'Žiadosť sa nepodarilo odoslať. Skontrolujte pripojenie a skúste to znova, alebo nám napíšte na WhatsApp.', 'Žiadosť bola pridaná do vášho účtu. Prihláste sa heslom alebo použite „Zabudnuté heslo“.'],
    cs: ['Další', 'Zpět', 'Krok', 'z', 'Váš klientský panel', 'Sledujte každý krok, posílejte dokumenty a plaťte online pomocí e-mailu a tohoto hesla.', 'Vytvořte si heslo', 'Zopakujte heslo', 'Alespoň 8 znaků.', 'Použijte alespoň 8 znaků.', 'Hesla se neshodují.', 'Otevřít panel', 'Už jste u nás žádali? Zadejte heslo svého účtu.', 'Tento e-mail patří našemu týmu. Použijte svůj vlastní e-mail.', 'Žádost se nepodařilo odeslat. Zkontrolujte připojení a zkuste to znovu, nebo nám napište na WhatsApp.', 'Žádost byla přidána k vašemu účtu. Přihlaste se heslem nebo použijte „Zapomenuté heslo“.'],
    id: ['Lanjut', 'Kembali', 'Langkah', 'dari', 'Dasbor klien Anda', 'Pantau setiap tahap, kirim dokumen, dan bayar online dengan email Anda dan kata sandi ini.', 'Buat kata sandi', 'Ulangi kata sandi', 'Minimal 8 karakter.', 'Gunakan minimal 8 karakter.', 'Kata sandi tidak sama.', 'Buka dasbor Anda', 'Pernah mengajukan bersama kami? Ketik kata sandi akun Anda.', 'Email ini milik tim kami. Gunakan email Anda sendiri.', 'Permohonan tidak dapat dikirim. Periksa koneksi Anda dan coba lagi, atau hubungi kami di WhatsApp.', 'Permohonan Anda ditambahkan ke akun Anda. Masuk dengan kata sandi Anda atau gunakan "Lupa kata sandi".'],
  };
  var t = T[LANG] || T.en;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  var secs = $$('.asec', wiz);
  if (secs.length < 3) return;

  /* ---------- styles: the website's own colours and type ---------- */
  var css =
    '.vsa-steps{display:flex;gap:8px;margin:0 0 18px;padding:8px;background:#fff;border:1px solid #eee5cb;border-radius:20px;box-shadow:0 14px 34px rgba(4,33,21,.06);overflow-x:auto;scrollbar-width:none}' +
    '.vsa-steps::-webkit-scrollbar{display:none}' +
    '.vsa-tab{flex:1 1 0;min-width:118px;display:flex;align-items:center;gap:9px;padding:10px 12px;border:0;border-radius:14px;background:transparent;font:inherit;color:var(--muted);text-align:start;cursor:pointer;transition:.2s}' +
    '.vsa-tab:hover{background:var(--sand,#faf6ea)}' +
    '.vsa-tab .vsa-n{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;flex:none;font-family:Marcellus,serif;font-size:.95rem;color:var(--gold-d);background:#fdf8ea;border:1.6px solid #e8d9a8}' +
    '.vsa-tab b{display:block;font-size:.86rem;line-height:1.2;color:inherit;font-weight:700}' +
    '.vsa-tab.on{background:var(--green);color:#fff}.vsa-tab.on .vsa-n{background:#fff;border-color:#fff;color:var(--green)}' +
    '.vsa-tab.done .vsa-n{background:var(--gold);border-color:var(--gold);color:#241a02}.vsa-tab.done{color:var(--green)}' +
    '.vsa-tab[disabled]{cursor:default;opacity:.55}.vsa-tab[disabled]:hover{background:transparent}' +
    '.vsa-bar{height:4px;border-radius:9px;background:#f1ead3;margin:-10px 6px 18px;overflow:hidden}.vsa-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--gold),var(--green));transition:width .3s}' +
    '.asec.vsa-off{display:none}' +
    '.vsa-nav{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:22px;padding-top:18px;border-top:1px dashed #eee5cb}' +
    '.vsa-nav .vsa-count{color:var(--muted);font-size:.85rem}' +
    '.vsa-acct{margin-top:20px;padding:18px;border-radius:16px;background:var(--sand,#faf6ea);border:1px solid #eee5cb}' +
    '.vsa-acct h4{margin:0 0 4px;font-size:1.02rem}.vsa-acct>p{margin:0 0 14px;color:var(--muted);font-size:.88rem}' +
    '.vsa-pw{position:relative}.vsa-pw input{padding-inline-end:46px}' +
    '.vsa-eye{position:absolute;inset-inline-end:6px;top:50%;transform:translateY(-50%);width:36px;height:36px;border:0;background:transparent;color:var(--muted);cursor:pointer;display:grid;place-items:center;border-radius:10px}' +
    '.vsa-note{font-size:.82rem;color:var(--muted);margin:8px 0 0}' +
    '.vsa-err{display:none;margin:14px 0 0;padding:12px 14px;border-radius:12px;background:#fdecea;color:#b3261e;font-size:.9rem}' +
    '.vsa-dash{margin:18px auto 0;max-width:520px;padding:16px;border-radius:16px;background:var(--sand,#faf6ea);border:1px solid #eee5cb}' +
    '.vsa-dash p{margin:8px 0 0;color:var(--muted);font-size:.88rem}' +
    '@media(max-width:700px){.vsa-tab{min-width:auto;flex:0 0 auto}.vsa-tab b{display:none}.vsa-tab.on b{display:block}}';
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- the password, in the contact part ---------- */
  var contact = $('#f-email') ? $('#f-email').closest('.asec') : secs[2];
  var eye = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var acct = document.createElement('div');
  acct.className = 'vsa-acct';
  acct.innerHTML =
    '<h4>' + esc(t[4]) + '</h4><p>' + esc(t[5]) + '</p>' +
    '<div class="grid2">' +
    '<div class="field"><label class="f" for="f-pw">' + esc(t[6]) + '</label><div class="vsa-pw"><input id="f-pw" type="password" autocomplete="new-password" minlength="8" required><button type="button" class="vsa-eye" aria-label="show">' + eye + '</button></div><span class="err" data-def="' + esc(t[9]) + '">' + esc(t[9]) + '</span></div>' +
    '<div class="field"><label class="f" for="f-pw2">' + esc(t[7]) + '</label><div class="vsa-pw"><input id="f-pw2" type="password" autocomplete="new-password" required><button type="button" class="vsa-eye" aria-label="show">' + eye + '</button></div><span class="err">' + esc(t[10]) + '</span></div>' +
    '</div><p class="vsa-note">' + esc(t[8]) + ' ' + esc(t[12]) + '</p>';
  contact.appendChild(acct);
  var pw = $('#f-pw');
  var pw2 = $('#f-pw2');
  $$('.vsa-eye', acct).forEach(function (b) {
    b.addEventListener('click', function () {
      var i = b.parentNode.querySelector('input');
      i.type = i.type === 'password' ? 'text' : 'password';
    });
  });
  [pw, pw2].forEach(function (i) {
    i.addEventListener('input', function () { i.closest('.field').classList.remove('invalid'); });
  });

  /* ---------- the step tabs ---------- */
  var nav = document.createElement('div');
  nav.className = 'vsa-steps';
  nav.setAttribute('role', 'tablist');
  var bar = document.createElement('div');
  bar.className = 'vsa-bar';
  bar.innerHTML = '<i></i>';
  var tabs = secs.map(function (s, k) {
    var h = s.querySelector('.asec-head h3');
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'vsa-tab';
    b.setAttribute('role', 'tab');
    b.innerHTML = '<span class="vsa-n">' + (k + 1) + '</span><b>' + esc(h ? h.textContent : t[2] + ' ' + (k + 1)) + '</b>';
    b.addEventListener('click', function () { go(k, true); });
    nav.appendChild(b);
    return b;
  });
  secs[0].parentNode.insertBefore(nav, secs[0]);
  secs[0].parentNode.insertBefore(bar, secs[0]);

  secs.forEach(function (s, k) {
    var n = document.createElement('div');
    n.className = 'vsa-nav';
    var back = k ? '<button type="button" class="btn ghost small vsa-back">&larr; ' + esc(t[1]) + '</button>' : '<span></span>';
    var count = '<span class="vsa-count">' + esc(t[2]) + ' ' + (k + 1) + ' ' + esc(t[3]) + ' ' + secs.length + '</span>';
    var next = k < secs.length - 1 ? '<button type="button" class="btn gold vsa-next">' + esc(t[0]) + ' &rarr;</button>' : '<span></span>';
    n.innerHTML = back + count + next;
    s.appendChild(n);
    var nb = n.querySelector('.vsa-next');
    if (nb) nb.addEventListener('click', function () { go(k + 1, true); });
    var bb = n.querySelector('.vsa-back');
    if (bb) bb.addEventListener('click', function () { go(k - 1, false); });
  });

  /* ---------- checks (the same rules as the form's own, plus the password) ---------- */
  function mark(inp, bad) {
    var f = inp.closest('.field');
    if (f) f.classList.toggle('invalid', bad);
    return !bad;
  }
  function checkSec(k) {
    var ok = true;
    var first = null;
    $$('[required]', secs[k]).forEach(function (inp) {
      var bad = !inp.value || (inp.type === 'email' && !/^\S+@\S+\.\S+$/.test(inp.value));
      if (!mark(inp, bad)) { ok = false; first = first || inp; }
    });
    var nat = $('#f-nat');
    if (nat && secs[k].contains(nat) && !mark(nat, !nat.value)) { ok = false; first = first || nat.closest('.field'); }
    if (secs[k].contains(pw)) {
      var es = pw.closest('.field').querySelector('.err');
      if (pw.value && pw.value.length < 8) { mark(pw, true); ok = false; first = first || pw; if (es) es.textContent = t[9]; }
      if (pw.value && pw2.value !== pw.value) { mark(pw2, true); ok = false; first = first || pw2; }
    }
    if (first) {
      var el = first.scrollIntoView ? first : null;
      if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    return ok;
  }

  var cur = 0;
  var reached = 0;
  function show(k) {
    cur = k;
    reached = Math.max(reached, k);
    secs.forEach(function (s, i) { s.classList.toggle('vsa-off', i !== k); });
    tabs.forEach(function (b, i) {
      b.classList.toggle('on', i === k);
      b.classList.toggle('done', i < k);
      b.setAttribute('aria-selected', i === k ? 'true' : 'false');
      b.disabled = i > reached + 1;
    });
    bar.firstChild.style.width = Math.round(((k + 1) / secs.length) * 100) + '%';
    if (tabs[k].scrollIntoView) tabs[k].scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  function go(k, check) {
    if (k < 0 || k >= secs.length || k === cur) return;
    if (k > cur && check) {
      for (var i = cur; i < k; i++) {
        if (!checkSec(i)) { show(i); return; }
      }
    }
    var rc = $('#reviewCard');
    if (rc && k !== secs.length - 1) rc.hidden = true;
    show(k);
    var top = nav.getBoundingClientRect().top + window.pageYOffset - 110;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }
  function checkAll() {
    for (var i = 0; i < secs.length; i++) {
      if (!checkSec(i)) { show(i); return false; }
    }
    return true;
  }

  /* the form's own review and submit buttons check every step first */
  var submit = $('#submitApp');
  var submitText = submit ? submit.textContent : '';
  ['#reviewBtn', '#submitApp'].forEach(function (id) {
    var b = $(id);
    if (b) b.addEventListener('click', function (e) {
      hideErr();
      if (!checkAll()) { e.stopImmediatePropagation(); e.preventDefault(); }
    }, true);
  });
  var editBtn = $('#editBtn');
  if (editBtn) editBtn.addEventListener('click', function () { setTimeout(function () { show(0); }, 0); });

  /* ---------- sending: the password goes with the application; errors stay on the form ---------- */
  var errBox = document.createElement('p');
  errBox.className = 'vsa-err';
  var rcard = $('#reviewCard');
  (rcard || secs[secs.length - 1]).appendChild(errBox);
  function hideErr() { errBox.style.display = 'none'; }
  function fail(j) {
    if (submit) { submit.disabled = false; submit.textContent = submitText; }
    var msg = t[14];
    if (j && j.code === 'staff_email') msg = t[13];
    else if (j && j.code === 'pw_short') msg = t[9];
    else if (j && j.error && LANG === 'en') msg = j.error;
    if (j && (j.field === 'email' || j.field === 'password')) {
      var inp = j.field === 'email' ? $('#f-email') : pw;
      var k = secs.indexOf(inp.closest('.asec'));
      var es = inp.closest('.field').querySelector('.err');
      if (es) es.textContent = msg;
      mark(inp, true);
      if (k >= 0) { show(k); inp.focus(); }
    }
    errBox.textContent = msg;
    errBox.style.display = 'block';
  }
  var dash = null;
  var origFetch = window.fetch;
  window.fetch = function (u, o) {
    if (u === '/api/apply' && o && String(o.method).toUpperCase() === 'POST' && typeof o.body === 'string') {
      try {
        var b = JSON.parse(o.body);
        b.password = pw.value;
        o = Object.assign({}, o, { body: JSON.stringify(b) });
      } catch (e) {}
      return origFetch.call(window, u, o).then(function (r) {
        return r.clone().json().then(function (j) {
          if (j && j.ok) {
            dash = j;
            setTimeout(addDash, 0);
            return r;
          }
          fail(j);
          return new Promise(function () {}); // stays on the form (no offline copy)
        }, function () {
          fail(null);
          return new Promise(function () {});
        });
      }, function () {
        fail(null);
        return new Promise(function () {});
      });
    }
    return origFetch.apply(window, arguments);
  };

  /* ---------- after sending: "Open your dashboard" ---------- */
  function addDash() {
    var done = $('#applyDone');
    if (!done || !dash || !dash.dashboard || $('.vsa-dash', done)) return;
    var track = $('#trackLink', done);
    var box = document.createElement('div');
    box.className = 'vsa-dash';
    box.innerHTML = '<a class="btn gold big" href="' + esc(dash.dashboard) + '" style="width:100%;justify-content:center">' + esc(t[11]) + ' &rarr;</a>' + '<p>' + esc(dash.account === 'existing' ? t[15] : t[5]) + '</p>';
    var row = track ? track.parentNode : null;
    if (row) row.parentNode.insertBefore(box, row);
    else done.firstChild.appendChild(box);
  }

  show(0);
})();
