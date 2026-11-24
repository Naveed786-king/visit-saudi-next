if(!window.fetch){ window.fetch=function(){ return Promise.reject(new Error('fetch unavailable')); }; }
/* Visit Saudi - shared behaviour */
var $=function(s,c){return (c||document).querySelector(s)};
var $$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]})};
(function(){
"use strict";

/* footer year */
$$('.yr').forEach(function(e){e.textContent=new Date().getFullYear()});

/* mobile nav */
var burger=$('.burger'), nav=$('#mainnav');
if(burger&&nav){burger.addEventListener('click',function(){nav.classList.toggle('open')});}
/* ---------- mega menus ---------- */
function closeMegas(){ $$('.has-mega.open').forEach(function(x){ x.classList.remove('open'); var b=x.querySelector('.mega-btn'); if(b) b.setAttribute('aria-expanded','false'); }); }
$$('.mega-btn').forEach(function(btn){ btn.addEventListener('click',function(e){ e.stopPropagation(); var w=btn.closest('.has-mega'); var was=w.classList.contains('open'); closeMegas(); if(typeof closeDDs==='function') closeDDs(); if(!was){ w.classList.add('open'); btn.setAttribute('aria-expanded','true'); } }); });
$$('.mega a').forEach(function(a){ a.addEventListener('click',function(){ closeMegas(); if(nav) nav.classList.remove('open'); }); });
document.addEventListener('click',function(e){ if(!e.target.closest('.has-mega')) closeMegas(); });
document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeMegas(); });
if(window.matchMedia && matchMedia('(hover:hover)').matches){ $$('.has-mega').forEach(function(w){ var t; var btn=w.querySelector('.mega-btn');
  w.addEventListener('mouseenter',function(){ if(window.innerWidth<1441) return; clearTimeout(t); t=setTimeout(function(){ closeMegas(); if(typeof closeDDs==='function') closeDDs(); w.classList.add('open'); if(btn) btn.setAttribute('aria-expanded','true'); },140); });
  w.addEventListener('mouseleave',function(){ clearTimeout(t); t=setTimeout(function(){ w.classList.remove('open'); if(btn) btn.setAttribute('aria-expanded','false'); },240); });
}); }

/* visa finder tabs */
var tabs=$$('.tab');
if(tabs.length){
  tabs.forEach(function(t){t.addEventListener('click',function(){
    tabs.forEach(function(x){x.classList.remove('active')}); t.classList.add('active');
    var cat=t.getAttribute('data-cat');
    $$('.vcard').forEach(function(c){
      var show = cat==='all' || c.getAttribute('data-cat')===cat;
      c.classList.toggle('hide',!show);
    });
  });});
}

/* ---------- eligibility data (official eVisa list, 72 countries) ---------- */
var ELIGIBLE=["Bahamas","Barbados","Canada","Grenada","Panama","Saint Kitts and Nevis","United States","Mexico","Guyana","Albania","Andorra","Austria","Belgium","Bulgaria","Croatia","Cyprus","Czech Republic","Denmark","Estonia","Finland","France","Georgia","Germany","Greece","Netherlands","Hungary","Iceland","Ireland","Italy","Kosovo","Latvia","Liechtenstein","Lithuania","Luxembourg","Malta","Monaco","Montenegro","Norway","Poland","Portugal","Romania","Russia","San Marino","Slovakia","Slovenia","Spain","Sweden","Switzerland","Ukraine","United Kingdom","Bosnia and Herzegovina","Serbia","North Macedonia","Azerbaijan","Brunei","China","Japan","Kazakhstan","Kyrgyzstan","Malaysia","Maldives","Singapore","South Korea","Tajikistan","Thailand","Turkey","Uzbekistan","Mauritius","Seychelles","South Africa","Australia","New Zealand"];
var GCC=["United Arab Emirates","Qatar","Kuwait","Bahrain","Oman"];
var ALLNATS=["Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hong Kong", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"];
var NATISO={"Afghanistan":"af","Albania":"al","Algeria":"dz","Andorra":"ad","Angola":"ao","Antigua and Barbuda":"ag","Argentina":"ar","Armenia":"am","Australia":"au","Austria":"at","Azerbaijan":"az","Bahamas":"bs","Bahrain":"bh","Bangladesh":"bd","Barbados":"bb","Belarus":"by","Belgium":"be","Belize":"bz","Benin":"bj","Bhutan":"bt","Bolivia":"bo","Bosnia and Herzegovina":"ba","Botswana":"bw","Brazil":"br","Brunei":"bn","Bulgaria":"bg","Burkina Faso":"bf","Burundi":"bi","Cambodia":"kh","Cameroon":"cm","Canada":"ca","Cape Verde":"cv","Central African Republic":"cf","Chad":"td","Chile":"cl","China":"cn","Colombia":"co","Comoros":"km","Congo":"cg","Costa Rica":"cr","Croatia":"hr","Cuba":"cu","Cyprus":"cy","Czech Republic":"cz","Denmark":"dk","Djibouti":"dj","Dominica":"dm","Dominican Republic":"do","Ecuador":"ec","Egypt":"eg","El Salvador":"sv","Equatorial Guinea":"gq","Eritrea":"er","Estonia":"ee","Eswatini":"sz","Ethiopia":"et","Fiji":"fj","Finland":"fi","France":"fr","Gabon":"ga","Gambia":"gm","Georgia":"ge","Germany":"de","Ghana":"gh","Greece":"gr","Grenada":"gd","Guatemala":"gt","Guinea":"gn","Guinea-Bissau":"gw","Guyana":"gy","Haiti":"ht","Honduras":"hn","Hong Kong":"hk","Hungary":"hu","Iceland":"is","India":"in","Indonesia":"id","Iran":"ir","Iraq":"iq","Ireland":"ie","Israel":"il","Italy":"it","Ivory Coast":"ci","Jamaica":"jm","Japan":"jp","Jordan":"jo","Kazakhstan":"kz","Kenya":"ke","Kiribati":"ki","Kosovo":"xk","Kuwait":"kw","Kyrgyzstan":"kg","Laos":"la","Latvia":"lv","Lebanon":"lb","Lesotho":"ls","Liberia":"lr","Libya":"ly","Liechtenstein":"li","Lithuania":"lt","Luxembourg":"lu","Madagascar":"mg","Malawi":"mw","Malaysia":"my","Maldives":"mv","Mali":"ml","Malta":"mt","Marshall Islands":"mh","Mauritania":"mr","Mauritius":"mu","Mexico":"mx","Micronesia":"fm","Moldova":"md","Monaco":"mc","Mongolia":"mn","Montenegro":"me","Morocco":"ma","Mozambique":"mz","Myanmar":"mm","Namibia":"na","Nauru":"nr","Nepal":"np","Netherlands":"nl","New Zealand":"nz","Nicaragua":"ni","Niger":"ne","Nigeria":"ng","North Korea":"kp","North Macedonia":"mk","Norway":"no","Oman":"om","Pakistan":"pk","Palau":"pw","Palestine":"ps","Panama":"pa","Papua New Guinea":"pg","Paraguay":"py","Peru":"pe","Philippines":"ph","Poland":"pl","Portugal":"pt","Qatar":"qa","Romania":"ro","Russia":"ru","Rwanda":"rw","Saint Kitts and Nevis":"kn","Saint Lucia":"lc","Saint Vincent and the Grenadines":"vc","Samoa":"ws","San Marino":"sm","Sao Tome and Principe":"st","Saudi Arabia":"sa","Senegal":"sn","Serbia":"rs","Seychelles":"sc","Sierra Leone":"sl","Singapore":"sg","Slovakia":"sk","Slovenia":"si","Solomon Islands":"sb","Somalia":"so","South Africa":"za","South Korea":"kr","South Sudan":"ss","Spain":"es","Sri Lanka":"lk","Sudan":"sd","Suriname":"sr","Sweden":"se","Switzerland":"ch","Syria":"sy","Taiwan":"tw","Tajikistan":"tj","Tanzania":"tz","Thailand":"th","Timor-Leste":"tl","Togo":"tg","Tonga":"to","Trinidad and Tobago":"tt","Tunisia":"tn","Turkey":"tr","Turkmenistan":"tm","Tuvalu":"tv","Uganda":"ug","Ukraine":"ua","United Arab Emirates":"ae","United Kingdom":"gb","United States":"us","Uruguay":"uy","Uzbekistan":"uz","Vanuatu":"vu","Vatican City":"va","Venezuela":"ve","Vietnam":"vn","Yemen":"ye","Zambia":"zm","Zimbabwe":"zw"};
window.VSA_ELIGIBLE=ELIGIBLE; window.VSA_ALLNATS=ALLNATS;

function fillNat(sel){
  if(!sel) return;
  var cur=sel.getAttribute('data-value')||'';
  sel.innerHTML='<option value="">Select your nationality</option>'+ALLNATS.map(function(n){return '<option'+(n===cur?' selected':'')+'>'+n+'</option>'}).join('');
}
$$('select.nat-list').forEach(fillNat);

/* ---------- eligibility checker ---------- */
function routeResult(nat, route){
    if(!nat) return {cls:'result show alt', html:'<b>Choose your nationality first</b>Pick the country on your passport and we will show your route.'};
    try{ var _ck=nat+'|'+route; var _nw=Date.now(); if(window.__vsaCk!==_ck || _nw-(window.__vsaCkT||0)>5000){ window.__vsaCk=_ck; window.__vsaCkT=_nw; vsaEvent('checker', nat); } }catch(e){}
    var html='';
    if(ELIGIBLE.indexOf(nat)>-1){
      html='<b>You can apply for the Saudi tourist eVisa online</b>'+nat+' passport holders are on the official eVisa list. One year, multiple entry, up to 90 days per visit - and Umrah is allowed outside Hajj season.<div class="result-ctas"><a class="btn gold small" href="/apply?visa=tourist">Start your application</a><a class="btn small wa" href="https://wa.me/'+(window.VSA_WA||'971566556645')+'" target="_blank" rel="noopener">Ask on WhatsApp</a></div>';
      return {cls:'result show good', html:html};
    } else if(route==='gcc'){
      html='<b>You can apply online as a GCC resident</b>Residents of the UAE, Qatar, Kuwait, Bahrain and Oman can apply for a Saudi eVisa on their residency, whatever passport they hold. Your residence permit must be valid for at least 3 months and your passport for at least 6 months.<div class="result-ctas"><a class="btn gold small" href="/apply?visa=tourist">Start your application</a><a class="btn small wa" href="https://wa.me/'+(window.VSA_WA||'971566556645')+'" target="_blank" rel="noopener">Ask on WhatsApp</a></div>';
      return {cls:'result show good', html:html};
    } else if(route==='visa-holder'){
      html='<b>You likely qualify for visa on arrival or an eVisa</b>Holders of a valid US, UK or Schengen visa that has already been used to enter that country can usually obtain a Saudi visa on arrival, and can also be assessed for an eVisa. We check your exact case before you pay anything.<div class="result-ctas"><a class="btn gold small" href="/apply?visa=tourist">Start your application</a><a class="btn small wa" href="https://wa.me/'+(window.VSA_WA||'971566556645')+'" target="_blank" rel="noopener">Ask on WhatsApp</a></div>';
      return {cls:'result show mid', html:html};
    } else {
      html='<b>Your route is a sponsored visit visa - we can still help</b>'+nat+' passport holders are not on the standard eVisa list, so most travel on a sponsored family, personal or business visit visa, or through an embassy. Send us your details and we will tell you honestly which route fits - before any payment.<div class="result-ctas"><a class="btn gold small" href="/apply">Start an enquiry</a><a class="btn small wa" href="https://wa.me/'+(window.VSA_WA||'971566556645')+'" target="_blank" rel="noopener">Ask on WhatsApp</a></div>';
      return {cls:'result show alt', html:html};
    }
}
var checkBtn=$('#checkBtn');
if(checkBtn){
  checkBtn.addEventListener('click',function(){
    var r=routeResult($('#nat').value, ($('input[name="route"]:checked')||{}).value||'passport');
    var out=$('#checkResult'); out.className=r.cls; out.innerHTML=r.html;
  });
}
var checkBtnH=$('#checkBtnH');
if(checkBtnH){
  checkBtnH.addEventListener('click',function(){
    var r=routeResult($('#natH').value, ($('input[name="routeH"]:checked')||{}).value||'passport');
    var out=$('#checkResultH'); out.className=r.cls; out.innerHTML=r.html;
    out.scrollIntoView({block:'nearest',behavior:'smooth'});
  });
}

/* ---------- article sidebar checker + share ---------- */
var checkBtnA=$('#checkBtnA');
if(checkBtnA){
  checkBtnA.addEventListener('click',function(){
    var r=routeResult($('#natA').value, ($('#routeA')||{}).value||'passport');
    var out=$('#checkResultA'); out.className=r.cls; out.innerHTML=r.html;
    out.scrollIntoView({block:'nearest',behavior:'smooth'});
  });
}
$$('[data-share]').forEach(function(el){
  var u=encodeURIComponent(location.href), tx=encodeURIComponent(document.title);
  var map={ wa:'https://wa.me/?text='+tx+'%20'+u, x:'https://twitter.com/intent/tweet?text='+tx+'&url='+u, fb:'https://www.facebook.com/sharer/sharer.php?u='+u };
  if(map[el.getAttribute('data-share')]) el.href=map[el.getAttribute('data-share')];
});
var cpBtn=$('#copyLink');
if(cpBtn){ cpBtn.addEventListener('click',function(){ var done=function(){ var m=$('#copiedMsg'); if(m){ m.hidden=false; setTimeout(function(){ m.hidden=true; },2200); } };
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(location.href).then(done,done); } else { done(); } }); }

/* ---------- application form (single page) ---------- */
var wiz=$('#wizard');
if(wiz){
  var visaSel=$('#f-visa');
  var params=new URLSearchParams(location.search);
  if(visaSel&&params.get('visa')) visaSel.value=params.get('visa');
  if(params.get('express')){ var exb=$('#expressBanner'); if(exb) exb.style.display='block'; var exc=$('#f-express'); if(exc) exc.checked=true; }
  function val(id){var e=$(id);return e?e.value.trim():''}
  function valid(scope){
    var ok=true, first=null;
    $$('[required]',scope).forEach(function(inp){
      var f=inp.closest('.field'); var bad=!inp.value || (inp.type==='email' && !/^\S+@\S+\.\S+$/.test(inp.value));
      if(f) f.classList.toggle('invalid',bad);
      if(bad){ ok=false; if(!first) first=inp; }
    });
    if(first) first.scrollIntoView({block:'center',behavior:'smooth'});
    return ok;
  }
  function buildSummary(){
    var rows=[['Visa type',($('#f-visa option:checked')||{}).textContent||''],['Full name',val('#f-name')],['Nationality',val('#f-nat')],['Date of birth',val('#f-dob')],['Profession',val('#f-prof')],['Passport no.',val('#f-pass')],['Passport expiry',val('#f-pass-exp')],['Email',val('#f-email')],['Mobile / WhatsApp',val('#f-phone')],['Destination',val('#f-city')],['Entry date',val('#f-entry')],['Exit date',val('#f-exit')],['Purpose',val('#f-purpose')],['Express handling',($('#f-express')&&$('#f-express').checked)?'Yes':'No']];
    $('#summary').innerHTML=rows.filter(function(r){return r[1]}).map(function(r){return '<div><span>'+r[0]+'</span><b>'+esc(r[1])+'</b></div>'}).join('');
  }
  function readFile(input, kind){
    return new Promise(function(resolve){
      if(!input || !input.files || !input.files[0]) return resolve(null);
      var f=input.files[0];
      if(f.size>5*1024*1024) return resolve(null);
      var r=new FileReader();
      r.onload=function(){resolve({kind:kind, name:f.name, data:r.result})};
      r.onerror=function(){resolve(null)};
      r.readAsDataURL(f);
    });
  }
  var reviewBtn=$('#reviewBtn');
  if(reviewBtn) reviewBtn.addEventListener('click',function(){
    if(!valid(wiz)) return;
    buildSummary();
    var rc=$('#reviewCard'); rc.hidden=false;
    rc.scrollIntoView({block:'center',behavior:'smooth'});
  });
  var editBtn=$('#editBtn');
  if(editBtn) editBtn.addEventListener('click',function(){ $('#reviewCard').hidden=true; wiz.scrollIntoView({block:'start',behavior:'smooth'}); });
  $$('.upload-tile input[type="file"]',wiz).forEach(function(inp){
    inp.addEventListener('change',function(){
      var tile=inp.closest('.upload-tile'); if(!tile) return;
      var tag=tile.querySelector('.u-file');
      if(inp.files && inp.files[0]){ if(!tag){ tag=document.createElement('span'); tag.className='u-file'; tile.appendChild(tag); } tag.textContent='\u2713 '+inp.files[0].name; tile.classList.add('filled'); }
      else { if(tag) tag.remove(); tile.classList.remove('filled'); }
    });
  });
  var submit=$('#submitApp');
  if(submit){submit.addEventListener('click',function(){
    if(!valid(wiz)) return;
    vsaEvent('apply_start'); submit.disabled=true; submit.textContent='Submitting...';
    var payload={visa:val('#f-visa'),name:val('#f-name'),nat:val('#f-nat'),pass:val('#f-pass').toUpperCase(),dob:val('#f-dob'),prof:val('#f-prof'),passexp:val('#f-pass-exp'),email:val('#f-email'),phone:val('#f-phone'),entry:val('#f-entry'),exit:val('#f-exit'),city:val('#f-city'),purpose:val('#f-purpose'),express:($('#f-express')&&$('#f-express').checked)?true:false};
    Promise.all([readFile($('#doc-passport'),'Passport'), readFile($('#doc-photo'),'Photo'), readFile($('#doc-extra'),'Supporting document')]).then(function(docs){
      payload.docs=docs.filter(Boolean);
      fetch('/api/apply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(function(r){return r.json()}).then(function(j){
        if(!j.ok) throw new Error(j.error||'failed');
        vsaEvent('apply_done'); finishApply(j.ref, payload, true);
      }).catch(function(){
        var ref='VSA-'+Math.random().toString(36).slice(2,8).toUpperCase();
        payload.ref=ref; payload.stage=0;
        var apps=[]; try{apps=JSON.parse(localStorage.getItem('vsa_apps')||'[]')}catch(e){}
        apps.push(payload); localStorage.setItem('vsa_apps',JSON.stringify(apps));
        finishApply(ref, payload, false);
      });
    });
    function finishApply(ref, app, serverOk){
      $('#confRef').textContent=ref;
      $('#trackLink').href='/track?ref='+ref;
      var wa='https://wa.me/'+(window.VSA_WA||'971566556645')+'?text='+encodeURIComponent('Hello, I just applied on visit-saudi.ae. My reference is '+ref+' ('+app.name+').');
      $('#waLink').href=wa;
      var grid=$('#applyGrid'); if(grid) grid.style.display='none';
      var done=$('#applyDone'); done.hidden=false;
      done.scrollIntoView({block:'center',behavior:'smooth'});
      if(serverOk) showPayBox(ref, app.visa);
    }
  });}
}

/* ---------- Ziina checkout (pay-after-apply) ---------- */
function startPay(ref, btn, errEl){
  if(!btn || btn.disabled) return;
  btn.disabled=true; var old=btn.textContent; btn.textContent='Redirecting to secure checkout...';
  var lang=(document.documentElement.lang||'en').split('-')[0];
  fetch('/api/pay',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ref:ref,lang:lang})}).then(function(r){return r.json()}).then(function(j){
    if(j.ok && j.url){ location.href=j.url; return; }
    if(j.paid){ location.href='/track?ref='+encodeURIComponent(ref); return; }
    throw new Error(j.error||'failed');
  }).catch(function(){
    if(errEl){ errEl.style.display='block'; errEl.textContent='The payment page could not be opened - please try again or contact us on WhatsApp.'; }
    btn.disabled=false; btn.textContent=old;
  });
}
function showPayBox(ref, visa){
  var box=$('#payBox'); if(!box) return;
  var p=(window.VSA_PRICES||{})[visa];
  var pm=window.VSA_PAYMENTS||{};
  if(!p||!p.amount||!pm.enabled||String(pm.provider||'').toLowerCase()!=='ziina'||!pm.configured){ box.hidden=true; return; }
  var tot=$('#payTotal'); if(tot) tot.textContent=fmtPrice(p);
  box.hidden=false;
  var btn=$('#payNowBtn');
  if(btn && !btn._wired){ btn._wired=true; btn.addEventListener('click', function(){ startPay(ref, btn, $('#payErr')); }); }
}

/* ---------- tracking ---------- */
var trackForm=$('#trackForm');
var STAGES=[['Application received','We have your application and documents.'],['Expert document check','Our team checks every document against the official requirements.'],['Submitted to the authority','Your application is lodged through the official Saudi visa channel.'],['With the authority','The Saudi authority is reviewing your application.'],['Decision received','A decision has been issued on your application.'],['eVisa ready','Your visa is issued. Download it, print a copy and travel.']];
function renderTrack(app,isDemo,creds){
  var box=$('#trackResult'); if(!box) return;
  var lis=STAGES.map(function(s,i){
    var cls=i<app.stage?'done':(i===app.stage?'now':'');
    var mark=i<app.stage?'&#10003;':(i===app.stage?'!':'');
    return '<li class="'+cls+'"><span class="dot">'+mark+'</span><div><b>'+s[0]+'</b><span>'+s[1]+'</span></div></li>';
  }).join('');
  var pct=Math.round(app.stage/(STAGES.length-1)*100);
  var html='<div class="summary" style="margin-bottom:8px"><div><span>Reference</span><b>'+esc(app.ref)+'</b></div><div><span>Applicant</span><b>'+esc(app.name)+'</b></div>'
    +(app.officialRef?'<div><span>Official reference</span><b>'+esc(app.officialRef)+'</b></div>':'')
    +'<div><span>Current stage</span><b>'+STAGES[app.stage][0]+'</b></div></div>'
    +(isDemo?'<div class="notice">This is a sample application so you can see how tracking works. Real applications appear here the moment they are submitted on this device, and our team updates each stage as it happens.</div>':'')
    +'<div class="pbar-wrap"><div class="pbar"><div class="pbar-fill" style="width:'+pct+'%"></div></div><span class="pbar-label">'+pct+'% complete - stage '+(app.stage+1)+' of '+STAGES.length+'</span></div>'
    +'<ul class="timeline">'+lis+'</ul>';
  var notes=(app.history||[]).filter(function(h){return h.note});
  if(notes.length){
    html+='<div class="track-block"><h3>Updates from our team</h3>'+notes.map(function(h){return '<div class="upd"><b>'+esc(STAGES[h.stage]?STAGES[h.stage][0]:'')+'</b> <span>'+new Date(h.at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})+'</span><p>'+esc(h.note)+'</p></div>';}).join('')+'</div>';
  }
  if(app.issuedDoc){
    html+='<div class="rescard good"><h3>Your eVisa is ready</h3><p>Download your issued visa document and keep a copy on your phone and a printed copy for travel.</p><button class="btn gold" id="dlDoc" type="button">Download my eVisa</button></div>';
  }
  if(app.paid){
    html+='<div class="rescard good"><h3>Payment received</h3><p>Paid '+(app.amount_paid?esc(app.amount_paid):'')+(app.paid_at?' on '+new Date(app.paid_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'')+'. Our team will proceed with your application.</p></div>';
  } else if(app.payable && app.pay_total){
    html+='<div class="rescard"><h3>Pay for this application</h3><p>Your total is <b>'+esc(fmtPrice(app.pay_total))+'</b>. Pay securely by card, Apple Pay or Google Pay - we never see your card details.</p><button class="btn gold" id="trackPayBtn" type="button">Pay now - secure checkout</button><p id="trackPayErr" style="color:#b3261e;display:none;margin-top:8px"></p></div>';
  }
  if(app.resolution){
    var r=app.resolution;
    html+='<div class="rescard"><h3>Case update: '+esc(r.status||'Update')+'</h3>'
      +(r.amount?'<p><b>Amount:</b> '+esc(r.amount)+(r.date?' &nbsp; <b>Date:</b> '+esc(r.date):'')+'</p>':(r.date?'<p><b>Date:</b> '+esc(r.date)+'</p>':''))
      +(r.comment?'<p>'+esc(r.comment)+'</p>':'')
      +(r.proof?'<button class="btn ghost" id="dlProof" type="button">Download supporting document</button>':'')
      +'</div>';
  }
  if(!isDemo && creds){
    var msgs=app.messages||[];
    html+='<div class="track-block"><h3>Conversation with our team</h3><div class="thread" id="threadBox">'
      +(msgs.length? msgs.map(function(m){return '<div class="tmsg '+(m.from==='team'?'team':'client')+'"><b>'+(m.from==='team'?'Visit Saudi team':'You')+'</b><p>'+esc(m.text)+'</p><span>'+new Date(m.at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' '+new Date(m.at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+'</span></div>';}).join('') : '<p style="color:var(--muted)">No messages yet. Ask us anything about this application below.</p>')
      +'</div><form id="replyForm" class="replyrow"><input id="replyText" placeholder="Write a message to our team..." autocomplete="off"><button class="btn" type="submit">Send</button></form></div>';
  }
  box.innerHTML=html;
  box.style.display='block';
  function download(kind){
    fetch('/api/doc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ref:creds.ref,pass:creds.pass,kind:kind||''})})
      .then(function(r){ if(!r.ok) throw new Error('x'); return r.blob(); })
      .then(function(b){ var a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=(kind==='resolution'?'supporting-document':'my-evisa'); document.body.appendChild(a); a.click(); a.remove(); })
      .catch(function(){ alert('The document could not be downloaded - please contact us on WhatsApp and we will send it.'); });
  }
  var tp=$('#trackPayBtn'); if(tp && creds) tp.addEventListener('click', function(){ startPay(creds.ref, tp, $('#trackPayErr')); });
  var dl=$('#dlDoc'); if(dl) dl.addEventListener('click', function(){ download(''); });
  var dp=$('#dlProof'); if(dp) dp.addEventListener('click', function(){ download('resolution'); });
  var rf=$('#replyForm');
  if(rf) rf.addEventListener('submit', function(ev){ ev.preventDefault();
    var text=$('#replyText').value.trim(); if(!text) return;
    fetch('/api/message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ref:creds.ref,pass:creds.pass,text:text})})
      .then(function(r){return r.json()}).then(function(j){ if(j.ok){ app.messages=j.messages; renderTrack(app,false,creds); } });
  });
}
if(trackForm){
  var DEMO={ref:'VSA-DEMO26',name:'Sample Applicant',pass:'X1234567',stage:2};
  var qp=new URLSearchParams(location.search);
  if(qp.get('ref')){$('#t-ref').value=qp.get('ref')}
  trackForm.addEventListener('submit',function(ev){
    ev.preventDefault();
    var ref=$('#t-ref').value.trim().toUpperCase(), pass=$('#t-pass').value.trim().toUpperCase();
    var err=$('#trackErr'); err.style.display='none';
    fetch('/api/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ref:ref,pass:pass})}).then(function(r){return r.json()}).then(function(j){
      if(!j.ok) throw new Error('not found');
      renderTrack(j, !!j.demo, {ref:ref, pass:pass});
    }).catch(function(){
      /* fallback for static hosting */
      var apps=[]; try{apps=JSON.parse(localStorage.getItem('vsa_apps')||'[]')}catch(e){}
      var found=null;
      apps.forEach(function(a){if(a.ref===ref&&a.pass===pass)found=a});
      if(!found&&ref===DEMO.ref&&pass===DEMO.pass) {renderTrack(DEMO,true);return;}
      if(!found){err.style.display='block';$('#trackResult').style.display='none';}
      else renderTrack(found,false);
    });
  });
}

/* ---------- contact form ---------- */
var cform=$('#contactForm');
if(cform){cform.addEventListener('submit',function(ev){ev.preventDefault();
  var payload={name:val2('#c-name'),email:val2('#c-email'),topic:val2('#c-topic'),msg:val2('#c-msg')};
  fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).catch(function(){}).then(function(){
    cform.style.display='none'; $('#contactDone').style.display='block';
  });
});}
function val2(id){var e=$(id);return e?e.value.trim():''}

/* ---------- hero slider ---------- */
var slides=$$('.hero .bg img.slide');
var capEl=document.getElementById('heroCap'), dotsBox=document.getElementById('heroDots');
if(slides.length>1){
  var si=0, timer=null, dots=[];
  slides.forEach(function(s,i){ if(!dotsBox) return; var b=document.createElement('button'); b.type='button'; b.className='hdot'+(i?'':' on'); b.setAttribute('aria-label','Show photo '+(i+1)); b.addEventListener('click',function(){go(i); restart();}); dotsBox.appendChild(b); dots.push(b); });
  function go(n){ slides[si].classList.remove('on'); if(dots[si]) dots[si].classList.remove('on'); si=n; slides[si].classList.add('on'); if(dots[si]) dots[si].classList.add('on'); if(capEl) capEl.textContent=slides[si].getAttribute('data-cap')||''; }
  function restart(){ if(timer) clearInterval(timer); timer=setInterval(function(){go((si+1)%slides.length);},5600); }
  restart();
  var heroSec=document.querySelector('.hero');
  if(heroSec){ heroSec.addEventListener('mouseenter',function(){ if(timer) clearInterval(timer); }); heroSec.addEventListener('mouseleave',restart); }
}

/* ---------- animated counters ---------- */
$$('[data-count]').forEach(function(el){
  var target=parseInt(el.getAttribute('data-count'),10); var t0=null;
  function tick(ts){ if(!t0)t0=ts; var p=Math.min((ts-t0)/1400,1); el.textContent=Math.round(target*(0.2+0.8*p)); if(p<1) requestAnimationFrame(tick); }
  requestAnimationFrame(tick);
});

/* ---------- header shadow + back to top ---------- */
var hdr=$('header.site');
var toTop=document.createElement('button'); toTop.id='toTop'; toTop.innerHTML='&#8593;'; toTop.setAttribute('aria-label','Back to top');
document.body.appendChild(toTop);
toTop.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'})});
window.addEventListener('scroll',function(){
  if(hdr) hdr.classList.toggle('scrolled', window.scrollY>10);
  toTop.classList.toggle('show', window.scrollY>600);
},{passive:true});

/* ---------- staggered reveals ---------- */
$$('.cards,.glance,.steps,.dests,.postgrid,.regions').forEach(function(grid){
  $$('.rv',grid).forEach(function(el,i){ el.style.transitionDelay=(Math.min(i,8)*0.08)+'s'; });
});

/* ---------- reveal on scroll ---------- */
if('IntersectionObserver' in window){
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in'); io.unobserve(e.target);}})},{threshold:0.12});
  $$('.rv').forEach(function(el){io.observe(el)});
} else { $$('.rv').forEach(function(el){el.classList.add('in')}); }
setTimeout(function(){ $$('.rv:not(.in)').forEach(function(el){ var r=el.getBoundingClientRect(); if(r.top<innerHeight+300&&r.bottom>-50) el.classList.add('in'); }); },2800);

/* ---------- Arabic toggle (main UI strings) ---------- */
var I18N={
 nav_home:{en:'Home',ar:'الرئيسية',ru:'Главная',de:'Startseite',es:'Inicio',fr:'Accueil',tr:'Ana Sayfa',zh:'首页',ur:'ہوم',hi:'होम',it:'Home',ro:'Acasă',pt:'Início',pl:'Strona główna',hu:'Főoldal',hr:'Početna',sk:'Domov',cs:'Domů',id:'Beranda'}, nav_eservices:{en:'eServices',ar:'الخدمات الإلكترونية',ru:'Электронные услуги',de:'eServices',es:'Servicios en línea',fr:'Services en ligne',tr:'e-Hizmetler',zh:'电子服务',ur:'ای سروسز',hi:'ई-सेवाएं',it:'Servizi online',ro:'Servicii online',pt:'Serviços online',pl:'Usługi online',hu:'Online szolgáltatások',hr:'Online usluge',sk:'Online služby',cs:'Online služby',id:'Layanan Online'}, nav_applylink:{en:'Apply',ar:'قدّم طلبك',ru:'Подать заявку',de:'Beantragen',es:'Solicitar',fr:'Demander',tr:'Başvur',zh:'申请',ur:'درخواست دیں',hi:'आवेदन करें',it:'Richiedi',ro:'Aplică',pt:'Solicitar',pl:'Złóż wniosek',hu:'Jelentkezés',hr:'Prijavi se',sk:'Požiadať',cs:'Požádat',id:'Ajukan'}, nav_visas:{en:'Visa Types',ar:'أنواع التأشيرات',ru:'Типы виз',de:'Visa-Arten',es:'Tipos de visa',fr:'Types de visa',tr:'Vize Türleri',zh:'签证类型',ur:'ویزا کی اقسام',hi:'वीज़ा के प्रकार',it:'Tipi di visto',ro:'Tipuri de viză',pt:'Tipos de visto',pl:'Rodzaje wiz',hu:'Vízumtípusok',hr:'Vrste viza',sk:'Typy víz',cs:'Typy víz',id:'Jenis Visa'}, nav_express:{en:'Express Visa',ar:'التأشيرة السريعة',ru:'Экспресс-виза',de:'Express-Visum',es:'Visa exprés',fr:'Visa express',tr:'Ekspres Vize',zh:'快速签证',ur:'ایکسپریس ویزا',hi:'एक्सप्रेस वीज़ा',it:'Visto express',ro:'Viză expres',pt:'Visto expresso',pl:'Wiza ekspresowa',hu:'Expressz vízum',hr:'Ekspresna viza',sk:'Expresné vízum',cs:'Expresní vízum',id:'Visa Ekspres'}, nav_elig:{en:'Eligibility',ar:'الأهلية',ru:'Право на визу',de:'Voraussetzungen',es:'Elegibilidad',fr:'Éligibilité',tr:'Uygunluk',zh:'资格',ur:'اہلیت',hi:'पात्रता',it:'Idoneità',ro:'Eligibilitate',pt:'Elegibilidade',pl:'Kwalifikowalność',hu:'Jogosultság',hr:'Uvjeti',sk:'Spôsobilosť',cs:'Způsobilost',id:'Kelayakan'}, nav_discover:{en:'Discover',ar:'اكتشف',ru:'Откройте для себя',de:'Entdecken',es:'Descubrir',fr:'Découvrir',tr:'Keşfet',zh:'探索',ur:'دریافت کریں',hi:'जानें',it:'Scopri',ro:'Descoperă',pt:'Descobrir',pl:'Odkryj',hu:'Fedezze fel',hr:'Otkrijte',sk:'Objavte',cs:'Objevte',id:'Jelajahi'}, nav_guides:{en:'Blog',ar:'المدونة',ru:'Блог',de:'Blog',es:'Blog',fr:'Blog',tr:'Blog',zh:'博客',ur:'بلاگ',hi:'ब्लॉग',it:'Blog',ro:'Blog',pt:'Blog',pl:'Blog',hu:'Blog',hr:'Blog',sk:'Blog',cs:'Blog',id:'Blog'}, nav_track:{en:'Track Application',ar:'تتبع الطلب',ru:'Отследить заявку',de:'Antrag verfolgen',es:'Rastrear solicitud',fr:'Suivre ma demande',tr:'Başvuru Takibi',zh:'查询申请',ur:'درخواست ٹریک کریں',hi:'आवेदन ट्रैक करें',it:'Traccia la domanda',ro:'Urmărește cererea',pt:'Acompanhar solicitação',pl:'Śledź wniosek',hu:'Kérelem nyomon követése',hr:'Prati prijavu',sk:'Sledovať žiadosť',cs:'Sledovat žádost',id:'Lacak Pengajuan'}, nav_about:{en:'About',ar:'من نحن',ru:'О нас',de:'Über uns',es:'Nosotros',fr:'À propos',tr:'Hakkımızda',zh:'关于我们',ur:'ہمارے بارے میں',hi:'हमारे बारे में',it:'Chi siamo',ro:'Despre noi',pt:'Sobre nós',pl:'O nas',hu:'Rólunk',hr:'O nama',sk:'O nás',cs:'O nás',id:'Tentang Kami'}, nav_contact:{en:'Contact',ar:'اتصل بنا',ru:'Контакты',de:'Kontakt',es:'Contacto',fr:'Contact',tr:'İletişim',zh:'联系我们',ur:'رابطہ',hi:'संपर्क करें',it:'Contatti',ro:'Contact',pt:'Contato',pl:'Kontakt',hu:'Kapcsolat',hr:'Kontakt',sk:'Kontakt',cs:'Kontakt',id:'Kontak'}, nav_faqs:{en:'FAQs',ar:'الأسئلة الشائعة',ru:'Вопросы и ответы',de:'Häufige Fragen',es:'Preguntas frecuentes',fr:'FAQ',tr:'SSS',zh:'常见问题',ur:'عام سوالات',hi:'सामान्य प्रश्न',it:'Domande frequenti',ro:'Întrebări frecvente',pt:'Perguntas frequentes',pl:'Częste pytania',hu:'Gyakori kérdések',hr:'Česta pitanja',sk:'Časté otázky',cs:'Časté dotazy',id:'Pertanyaan Umum'}, nav_apply:{en:'Apply Now',ar:'قدّم الآن',ru:'Подать заявку',de:'Jetzt beantragen',es:'Solicitar ahora',fr:'Demander',tr:'Hemen Başvur',zh:'立即申请',ur:'ابھی درخواست دیں',hi:'अभी आवेदन करें',it:'Richiedi ora',ro:'Aplică acum',pt:'Solicitar agora',pl:'Złóż wniosek teraz',hu:'Jelentkezz most',hr:'Prijavi se sada',sk:'Požiadať teraz',cs:'Požádat nyní',id:'Ajukan Sekarang'},
 hero_h1:{en:'Your Saudi visa, sorted properly.',ar:'تأشيرتك السعودية، جاهزة بشكل صحيح.',ru:'Ваша саудовская виза — оформлена как следует.',de:'Ihr Saudi-Visum, ordentlich erledigt.',es:'Tu visa saudí, bien gestionado.',fr:'Votre visa saoudien, en toute simplicité.',tr:'Suudi vizeniz, düzgün şekilde halledildi.',zh:'您的沙特签证，妥善办好。',ur:'آپ کا سعودی ویزا، درست طریقے سے مکمل۔',hi:'आपका सऊदी वीज़ा, सही तरीके से तैयार।',it:'Il tuo visto saudita, fatto come si deve.',ro:'Viza ta saudită, rezolvată ca la carte.',pt:'O seu visto saudita, tratado como deve ser.',pl:'Twoja wiza saudyjska, załatwiona jak należy.',hu:'Szaúdi vízuma, rendben elintézve.',hr:'Vaša saudijska viza, riješena kako treba.',sk:'Vaše saudské vízum, vybavené ako sa patrí.',cs:'Vaše saúdské vízum, vyřízené jak má být.',id:'Visa Saudi Anda, beres dengan benar.'},
 hero_p:{en:'Tourist eVisas, family visits, Umrah, business and stopovers - checked by a specialist before submission, tracked at every stage, with the full cost confirmed before you pay.',ar:'التأشيرات السياحية الإلكترونية وزيارات العائلة والعمرة والأعمال والترانزيت - يراجعها مختص قبل التقديم، ويمكنك تتبعها في كل مرحلة، مع تأكيد التكلفة الكاملة قبل الدفع.',ru:'Туристические электронные визы, семейные визиты, умра, бизнес и транзит — специалист проверяет документы перед подачей, статус отслеживается на каждом этапе, а полная стоимость подтверждается до оплаты.',de:'Touristische e-Visa, Familienbesuche, Umrah, Geschäftsreisen und Stopover — vor der Einreichung von einem Spezialisten geprüft, in jeder Phase nachverfolgbar, und die Gesamtkosten werden vor der Zahlung bestätigt.',es:'Visas electrónicas de turista, visitas familiares, Umrah, negocios y escalas: un especialista las revisa antes de enviarlas, puedes seguir cada etapa y el coste total se confirma antes de pagar.',fr:'Visas électroniques touristiques, visites familiales, Omra, affaires et escales : vérifiés par un spécialiste avant envoi, suivis à chaque étape, et coût total confirmé avant paiement.',tr:'Turist e-Vizeleri, aile ziyaretleri, Umre, iş ve aktarmalar — gönderilmeden önce bir uzman tarafından kontrol edilir, her aşamada takip edilir ve toplam ücret ödemeden önce onaylanır.',zh:'旅游电子签、家庭访问、副朝觐、商务和中途停留——提交前由专员审核，全程可追踪，付款前确认全部费用。',ur:'سیاحتی ای ویزا، خاندانی وزٹ، عمرہ، کاروبار اور اسٹاپ اوور — جمع کرانے سے پہلے ماہر کی جانچ، ہر مرحلے پر ٹریکنگ، اور ادائیگی سے پہلے مکمل لاگت کی تصدیق۔',hi:'टूरिस्ट ई-वीज़ा, पारिवारिक यात्रा, उमराह, व्यापार और स्टॉपओवर — सबमिट करने से पहले विशेषज्ञ द्वारा जांच, हर चरण पर ट्रैकिंग, और भुगतान से पहले पूरी लागत की पुष्टि।',it:'Visti turistici elettronici, visite familiari, Umrah, affari e scali - controllati da uno specialista prima dell\'invio, tracciabili in ogni fase, con il costo totale confermato prima del pagamento.',ro:'Vize turistice electronice, vizite de familie, Umrah, afaceri și escale - verificate de un specialist înainte de trimitere, urmărite în fiecare etapă, cu costul total confirmat înainte de plată.',pt:'Vistos eletrónicos de turismo, visitas familiares, Umrah, negócios e escalas - revistos por um especialista antes do envio, acompanhados em cada etapa, com o custo total confirmado antes de pagar.',pl:'Turystyczne e-wizy, wizyty rodzinne, Umrah, podróże służbowe i międzylądowania — sprawdzane przez specjalistę przed złożeniem, śledzone na każdym etapie, z całkowitym kosztem potwierdzonym przed płatnością.',hu:'Turista e-vízumok, családi látogatások, Umrah, üzleti utak és megállók – szakember ellenőrzi benyújtás előtt, minden szakaszban nyomon követhető, a teljes költség fizetés előtt visszaigazolva.',hr:'Turističke e-vize, obiteljski posjeti, Umrah, poslovna putovanja i zaustavljanja - stručnjak ih provjerava prije slanja, prate se u svakoj fazi, a ukupni trošak potvrđuje se prije plaćanja.',sk:'Turistické e-víza, rodinné návštevy, Umrah, obchodné cesty a medzipristátia - pred odoslaním ich skontroluje špecialista, sledujete každý krok a celková cena je potvrdená pred platbou.',cs:'Turistická e-víza, rodinné návštěvy, Umra, obchodní cesty a mezipřistání — před odesláním je zkontroluje specialista, každý krok můžete sledovat a celková cena je potvrzena před platbou.',id:'E-Visa turis, kunjungan keluarga, Umrah, bisnis, dan singgah - diperiksa oleh spesialis sebelum dikirim, terlacak di setiap tahap, dengan total biaya dikonfirmasi sebelum Anda membayar.'},
 hero_apply:{en:'Start Your Application',ar:'ابدأ طلبك',ru:'Начать заявку',de:'Antrag starten',es:'Iniciar tu solicitud',fr:'Commencer ma demande',tr:'Başvuruyu Başlat',zh:'开始申请',ur:'اپنی درخواست شروع کریں',hi:'अपना आवेदन शुरू करें',it:'Inizia la tua domanda',ro:'Începe cererea',pt:'Iniciar sua solicitação',pl:'Rozpocznij wniosek',hu:'Kérelem indítása',hr:'Započni prijavu',sk:'Začať žiadosť',cs:'Zahájit žádost',id:'Mulai Pengajuan Anda'}, hero_check:{en:'Check Eligibility',ar:'تحقق من الأهلية',ru:'Проверить право на визу',de:'Voraussetzungen prüfen',es:'Comprobar elegibilidad',fr:'Vérifier l’éligibilité',tr:'Uygunluğu Kontrol Et',zh:'查看资格',ur:'اہلیت چیک کریں',hi:'पात्रता जांचें',it:'Verifica l\'idoneità',ro:'Verifică eligibilitatea',pt:'Verificar elegibilidade',pl:'Sprawdź kwalifikowalność',hu:'Jogosultság ellenőrzése',hr:'Provjeri uvjete',sk:'Skontrolovať spôsobilosť',cs:'Ověřit způsobilost',id:'Periksa Kelayakan'},
 finder_h2:{en:'What brings you to Saudi Arabia?',ar:'ما الذي يجلبك إلى السعودية؟',ru:'Что привело вас в Саудовскую Аравию?',de:'Was führt Sie nach Saudi-Arabien?',es:'¿Qué te trae a Arabia Saudí?',fr:'Qu’est-ce qui vous amène en Arabie Saoudite ?',tr:'Sizi Suudi Arabistan’a getiren nedir?',zh:'您为何前往沙特阿拉伯？',ur:'آپ سعودی عرب کیوں آ رہے ہیں؟',hi:'आप सऊदी अरब क्यों आ रहे हैं?',it:'Cosa ti porta in Arabia Saudita?',ro:'Ce te aduce în Arabia Saudită?',pt:'O que o traz à Arábia Saudita?',pl:'Co Cię sprowadza do Arabii Saudyjskiej?',hu:'Mi hozza Önt Szaúd-Arábiába?',hr:'Što vas dovodi u Saudijsku Arabiju?',sk:'Čo vás privádza do Saudskej Arábie?',cs:'Co vás přivádí do Saúdské Arábie?',id:'Apa yang membawa Anda ke Arab Saudi?'},
 glance_h2:{en:'The Saudi tourist eVisa at a glance',ar:'التأشيرة السياحية السعودية في لمحة',ru:'Туристическая электронная виза Саудовской Аравии вкратце',de:'Das saudi-arabische Touristen-e-Visum im Überblick',es:'La visa electrónica de turista saudí de un vistazo',fr:'Le visa électronique touristique saoudien en bref',tr:'Suudi turist e-Vizesi özetle',zh:'沙特旅游电子签一览',ur:'سعودی سیاحتی ای ویزا ایک نظر میں',hi:'सऊदी टूरिस्ट ई-वीज़ा एक नज़र में',it:'Il visto turistico saudita in sintesi',ro:'Viza turistică saudită pe scurt',pt:'O visto de turismo saudita num relance',pl:'Saudyjska wiza turystyczna w skrócie',hu:'A szaúdi turista e-vízum röviden',hr:'Saudijska turistička e-viza ukratko',sk:'Saudské turistické e-vízum v skratke',cs:'Saúdské turistické e-vízum ve zkratce',id:'Sekilas e-Visa turis Saudi'},
 steps_h2:{en:'Three steps to your Saudi visa',ar:'ثلاث خطوات للحصول على تأشيرتك',ru:'Три шага к вашей саудовской визе',de:'In drei Schritten zu Ihrem Saudi-Visum',es:'Tres pasos para tu visa saudí',fr:'Votre visa saoudien en trois étapes',tr:'Suudi vizenize üç adım',zh:'三步获得沙特签证',ur:'آپ کے سعودی ویزا کے لیے تین مراحل',hi:'आपके सऊदी वीज़ा के लिए तीन चरण',it:'Tre passi per il tuo visto saudita',ro:'Trei pași către viza ta saudită',pt:'Três passos para o seu visto saudita',pl:'Trzy kroki do Twojej wizy saudyjskiej',hu:'Három lépés a szaúdi vízumáig',hr:'Tri koraka do vaše saudijske vize',sk:'Tri kroky k vášmu saudskému vízu',cs:'Tři kroky k vašemu saúdskému vízu',id:'Tiga langkah menuju visa Saudi Anda'},
 check_h2:{en:'Can you apply online?',ar:'هل يمكنك التقديم عبر الإنترنت؟',ru:'Можно ли подать заявку онлайн?',de:'Können Sie online beantragen?',es:'¿Puedes solicitarlo en línea?',fr:'Pouvez-vous faire votre demande en ligne ?',tr:'Çevrimiçi başvurabilir misiniz?',zh:'您可以在线申请吗？',ur:'کیا آپ آن لائن درخواست دے سکتے ہیں؟',hi:'क्या आप ऑनलाइन आवेदन कर सकते हैं?',it:'Puoi fare domanda online?',ro:'Poți aplica online?',pt:'Você pode solicitar online?',pl:'Czy możesz złożyć wniosek online?',hu:'Jelentkezhet online?',hr:'Možete li se prijaviti online?',sk:'Môžete požiadať online?',cs:'Můžete požádat online?',id:'Bisakah Anda mengajukan secara online?'},
 dest_h2:{en:'Where your visa takes you',ar:'إلى أين تأخذك تأشيرتك',ru:'Куда вас приведёт ваша виза',de:'Wohin Ihr Visum Sie bringt',es:'A dónde te lleva tu visa',fr:'Où votre visa vous emmène',tr:'Vizenizin sizi götüreceği yerler',zh:'您的签证能带您去哪里',ur:'آپ کا ویزا آپ کو کہاں لے جاتا ہے',hi:'आपका वीज़ा आपको कहाँ ले जाता है',it:'Dove ti porta il tuo visto',ro:'Unde te duce viza ta',pt:'Para onde o seu visto o leva',pl:'Dokąd zaprowadzi Cię Twoja wiza',hu:'Ahová a vízuma elviszi',hr:'Kamo vas vodi vaša viza',sk:'Kam vás vaše vízum zavedie',cs:'Kam vás vaše vízum zavede',id:'Ke mana visa Anda membawa Anda'},
 guides_h2:{en:'Read before you apply',ar:'اقرأ قبل التقديم',ru:'Прочитайте перед подачей заявки',de:'Vor der Beantragung lesen',es:'Lee antes de solicitar',fr:'À lire avant de faire votre demande',tr:'Başvurmadan önce okuyun',zh:'申请前请阅读',ur:'درخواست دینے سے پہلے پڑھیں',hi:'आवेदन करने से पहले पढ़ें',it:'Leggi prima di fare domanda',ro:'Citește înainte de a aplica',pt:'Leia antes de solicitar',pl:'Przeczytaj przed złożeniem wniosku',hu:'Olvassa el jelentkezés előtt',hr:'Pročitajte prije prijave',sk:'Prečítajte si pred podaním žiadosti',cs:'Přečtěte si před podáním žádosti',id:'Baca sebelum mengajukan'},
 nav_tools:{en:'Tools',ar:'الأدوات',ru:'Инструменты',de:'Tools',es:'Herramientas',fr:'Outils',tr:'Araçlar',zh:'工具',ur:'ٹولز',hi:'टूल्स',it:'Strumenti',ro:'Instrumente',pt:'Ferramentas',pl:'Narzędzia',hu:'Eszközök',hr:'Alati',sk:'Nástroje',cs:'Nástroje',id:'Alat'},
};
var RTL_LANGS={ar:1,ur:1};
var LANGS_OK={en:1,ar:1,ru:1,de:1,es:1,fr:1,tr:1,zh:1,ur:1,hi:1,it:1,ro:1,pt:1,pl:1,hu:1,hr:1,sk:1,cs:1,id:1};
var LANG_SHORT={en:'EN',ar:'\u0627\u0644\u0639\u0631\u0628\u064a\u0629',ru:'\u0420\u0443\u0441\u0441\u043a\u0438\u0439',de:'Deutsch',es:'Espa\u00f1ol',fr:'Fran\u00e7ais',tr:'T\u00fcrk\u00e7e',zh:'\u4e2d\u6587',ur:'\u0627\u0631\u062f\u0648',hi:'\u0939\u093f\u0928\u094d\u0926\u0940',it:'Italiano',ro:'Rom\u00e2n\u0103',pt:'Portugu\u00eas',pl:'Polski',hu:'Magyar',hr:'Hrvatski',sk:'Sloven\u010dina',cs:'\u010ce\u0161tina',id:'Indonesia'};
function setLang(l){
  if(!LANGS_OK[l]) l='en';
  document.documentElement.lang=l; document.documentElement.dir=(RTL_LANGS[l]?'rtl':'ltr');
  $$('[data-i18n]').forEach(function(el){var k=el.getAttribute('data-i18n'); if(I18N[k]) el.textContent=I18N[k][l]||I18N[k].en;});
  var lc=$('#langCur'); if(lc) lc.textContent=LANG_SHORT[l];
  $$('#langDD .dd-opt').forEach(function(o){ o.classList.toggle('sel', o.getAttribute('data-lang')===l); });
  try{localStorage.setItem('vsa_lang',l)}catch(e){}
  if(window.vsaLangCur) window.vsaLangCur(l);
}
/* ---------- custom dropdowns (header language + currency) ---------- */
function closeDDs(){ $$('.dd.open').forEach(function(x){ x.classList.remove('open'); var b=x.querySelector('.dd-btn'); if(b) b.setAttribute('aria-expanded','false'); }); }
$$('.dd').forEach(function(dd){
  var btn=dd.querySelector('.dd-btn'); if(!btn) return;
  btn.addEventListener('click',function(e){ e.stopPropagation();
    var was=dd.classList.contains('open'); closeDDs();
    if(!was){ dd.classList.add('open'); btn.setAttribute('aria-expanded','true'); var si=dd.querySelector('.dd-search input'); if(si){ si.value=''; dd.querySelectorAll('.dd-opt').forEach(function(o){ o.style.display=''; }); } }
  });
  dd.addEventListener('click',function(e){ e.stopPropagation(); });
});
document.addEventListener('click',closeDDs);
document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeDDs(); });
function vsaPathLang(){ var m=location.pathname.match(/^\/(ar|ru|de|es|fr|tr|zh|ur|hi|it|ro|pt|pl|hu|hr|sk|cs|id)(\/|$)/); return m?m[1]:'en'; }
function vsaGotoLang(l){ var cur=vsaPathLang(); var rest=location.pathname; if(cur!=='en'){ rest=rest.slice(cur.length+1); if(!rest) rest='/'; } var target=(l==='en')?rest:('/'+l+(rest==='/'?'':rest)); try{localStorage.setItem('vsa_lang',l)}catch(e){} location.href=target+location.search+location.hash; }
$$('#langDD .dd-opt').forEach(function(o){ o.addEventListener('click',function(){ var l=o.getAttribute('data-lang'); closeDDs(); if(l!==vsaPathLang()) vsaGotoLang(l); }); });
(function(){ var pl=vsaPathLang(); var saved=null; try{saved=localStorage.getItem('vsa_lang')}catch(e){}
  if(pl!=='en'){ try{localStorage.setItem('vsa_lang',pl)}catch(e){} var lc=$('#langCur'); if(lc) lc.textContent=LANG_SHORT[pl]; $$('#langDD .dd-opt').forEach(function(o){ o.classList.toggle('sel', o.getAttribute('data-lang')===pl); }); document.documentElement.lang=pl; if(RTL_LANGS[pl]) document.documentElement.dir='rtl'; }
  else if(saved && saved!=='en' && LANGS_OK[saved]){ vsaGotoLang(saved); }
  else $$('#langDD .dd-opt').forEach(function(o){ o.classList.toggle('sel', o.getAttribute('data-lang')==='en'); });
})();
/* ---------- currency (converts any price tagged data-usd) ---------- */
var RATES={USD:1,AED:3.6725,SAR:3.75,EUR:0.878,GBP:0.79,PKR:279.9,INR:88.1,RUB:84.4,TRY:49.0,CNY:6.72,RON:4.47,PLN:3.66,HUF:336,CZK:21.6,IDR:16650};
var SYM={USD:'$',AED:'AED ',SAR:'SAR ',EUR:'\u20ac',GBP:'\u00a3',PKR:'Rs ',INR:'\u20b9',RUB:'\u20bd',TRY:'\u20ba',CNY:'\u00a5'};
var LANG_CUR={en:'USD',ar:'AED',ru:'RUB',de:'EUR',es:'EUR',fr:'EUR',tr:'TRY',zh:'CNY',ur:'PKR',hi:'INR'};
var CUR='USD';
function convertPrices(){ var c=CUR; var r=RATES[c]||1; if(window.vsaRenderPrices) window.vsaRenderPrices();
  $$('[data-usd]').forEach(function(el){ var v=parseFloat(el.getAttribute('data-usd')); if(!isNaN(v)) el.textContent=SYM[c]+Math.round(v*r).toLocaleString('en-US'); });
}
function setCur(c,save){ if(!RATES[c]) c='USD'; CUR=c;
  var cc=$('#curCur'); if(cc) cc.textContent=c;
  $$('#curDD .dd-opt').forEach(function(o){ o.classList.toggle('sel', o.getAttribute('data-cur')===c); });
  if(save){ try{localStorage.setItem('vsa_cur',c)}catch(e){} }
  convertPrices();
}
window.vsaLangCur=function(l){ var sv=null; try{sv=localStorage.getItem('vsa_cur')}catch(e){}
  if(sv) return; var c=LANG_CUR[l]; if(c) setCur(c,false); };
$$('#curDD .dd-opt').forEach(function(o){ o.addEventListener('click',function(){ setCur(o.getAttribute('data-cur'),true); closeDDs(); }); });
$$('.dd-search input').forEach(function(inp){ inp.addEventListener('input',function(){ var q=inp.value.trim().toLowerCase(); var menu=inp.closest('.dd-menu'); if(!menu) return; menu.querySelectorAll('.dd-opt').forEach(function(o){ o.style.display=(!q||o.textContent.toLowerCase().indexOf(q)>=0)?'':'none'; }); }); });
(function(){ var sc=null; try{sc=localStorage.getItem('vsa_cur')}catch(e){}
  if(sc&&RATES[sc]) setCur(sc,false);
  else setCur(LANG_CUR[document.documentElement.lang||'en']||'USD',false);
})();
/* ---------- hero headline: word-by-word reveal ---------- */
function splitH1(){
  var h=document.querySelector('.hero h1'); if(!h || h.querySelector('.w')) return;
  var words=h.textContent.trim().split(/\s+/);
  h.innerHTML=words.map(function(w,i){ return '<span class="w"><span class="wi" style="animation-delay:'+(0.12+i*0.09).toFixed(2)+'s">'+esc(w)+'</span></span>'; }).join(' ');
}
splitH1();
var _h1el=document.querySelector('.hero h1');
if(_h1el && window.MutationObserver){ new MutationObserver(function(){ if(!_h1el.querySelector('.w')) splitH1(); }).observe(_h1el,{childList:true}); }

/* ---------- tools: hijri calendar math (tabular Islamic calendar) ---------- */
var HMONTHS=['Muharram','Safar','Rabi al-Awwal','Rabi al-Thani','Jumada al-Ula','Jumada al-Akhirah','Rajab','Shaban','Ramadan','Shawwal','Dhul Qadah','Dhul Hijjah'];
function g2jd(y,m,d){ var a=Math.floor((14-m)/12), y2=y+4800-a, m2=m+12*a-3; return d+Math.floor((153*m2+2)/5)+365*y2+Math.floor(y2/4)-Math.floor(y2/100)+Math.floor(y2/400)-32045; }
function jd2g(jd){ var a=jd+32044, b=Math.floor((4*a+3)/146097), c=a-Math.floor(146097*b/4), d2=Math.floor((4*c+3)/1461), e=c-Math.floor(1461*d2/4), mm=Math.floor((5*e+2)/153); return [100*b+d2-4800+Math.floor(mm/10), mm+3-12*Math.floor(mm/10), e-Math.floor((153*mm+2)/5)+1]; }
function i2jd(y,m,d){ return d+Math.ceil(29.5*(m-1))+(y-1)*354+Math.floor((3+11*y)/30)+1948439; }
function jd2i(jd){ var y=Math.floor((30*(jd-1948440))/10631); if(y<1)y=1; while(jd<i2jd(y,1,1)) y--; while(jd>=i2jd(y+1,1,1)) y++; var m=Math.ceil((jd-i2jd(y,1,1)+1)/29.5); if(m<1)m=1; if(m>12)m=12; while(jd<i2jd(y,m,1)) m--; while(m<12&&jd>=i2jd(y,m+1,1)) m++; return [y,m,jd-i2jd(y,m,1)+1]; }
function fmtG(jd){ var g=jd2g(jd); var dt=new Date(Date.UTC(g[0],g[1]-1,g[2])); return dt.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}); }
function fmtH(h){ return h[2]+' '+HMONTHS[h[1]-1]+' '+h[0]+' AH'; }
function todayJd(){ var n=new Date(); return g2jd(n.getFullYear(), n.getMonth()+1, n.getDate()); }
var gDate=$('#gDate');
if(gDate){
  var tj=todayJd();
  var tl=$('#todayLine'); if(tl) tl.innerHTML='Today is <b>'+fmtG(tj)+'</b> - <b>'+fmtH(jd2i(tj))+'</b> in the Hijri calendar.';
  var nowD=new Date(); gDate.value=nowD.getFullYear()+'-'+('0'+(nowD.getMonth()+1)).slice(-2)+'-'+('0'+nowD.getDate()).slice(-2);
  var showG=function(){ if(!gDate.value) return; var parts=gDate.value.split('-'); var jd=g2jd(+parts[0],+parts[1],+parts[2]); var r=$('#gResult'); if(r) r.innerHTML='<b>'+fmtH(jd2i(jd))+'</b>'; };
  gDate.addEventListener('change', showG); showG();
  var hBtn=$('#hBtn');
  if(hBtn) hBtn.addEventListener('click',function(){ var d=+($('#hDay').value||0), m=+$('#hMonth').value, y=+($('#hYear').value||0); var r=$('#hResult'); if(!(d>=1&&d<=30&&y>=1)){ r.textContent='Enter a day between 1 and 30 and a Hijri year.'; return; } r.innerHTML='<b>'+fmtG(i2jd(y,m,d))+'</b>'; });
  var list=$('#islamicDates');
  if(list){ var evs=[[1,1,'Islamic New Year'],[1,10,'Day of Ashura'],[9,1,'Ramadan begins'],[10,1,'Eid al-Fitr'],[12,9,'Day of Arafat'],[12,10,'Eid al-Adha']]; var hy=jd2i(tj)[0]; var rows=[];
    [hy,hy+1].forEach(function(yy){ evs.forEach(function(ev){ var jd=i2jd(yy,ev[0],ev[1]); if(jd>=tj) rows.push([jd, ev[2]+' - '+ev[1]+' '+HMONTHS[ev[0]-1]+' '+yy+' AH', fmtG(jd)]); }); });
    rows.sort(function(a,b){return a[0]-b[0]}); rows=rows.slice(0,6);
    list.innerHTML=rows.map(function(r){ return '<li><span>'+r[1]+'</span><b>'+r[2]+'</b></li>'; }).join(''); }
}
var CURNAMES={USD:'US Dollar',AED:'UAE Dirham',SAR:'Saudi Riyal',EUR:'Euro',GBP:'British Pound',PKR:'Pakistani Rupee',INR:'Indian Rupee',RUB:'Russian Ruble',TRY:'Turkish Lira',CNY:'Chinese Yuan',RON:'Romanian Leu',PLN:'Polish Zloty',HUF:'Hungarian Forint',CZK:'Czech Koruna',IDR:'Indonesian Rupiah'};
var curFrom=$('#curFrom'), curTo=$('#curTo');
if(curFrom&&curTo){
  var opts=Object.keys(RATES).map(function(c){ return '<option value="'+c+'">'+c+' - '+CURNAMES[c]+'</option>'; }).join('');
  curFrom.innerHTML=opts; curTo.innerHTML=opts; var _sc=null; try{_sc=localStorage.getItem('vsa_cur')}catch(e){} curFrom.value=(_sc&&RATES[_sc])?_sc:'USD'; curTo.value='SAR';
  var fmtAmt=function(v){ return v.toLocaleString('en-US',{maximumFractionDigits:(v!==0&&Math.abs(v)<10)?4:2}); };
  var conv=function(){ var amt=parseFloat($('#curAmt').value)||0; var f=curFrom.value, tt=curTo.value; var out=amt*(RATES[tt]/RATES[f]); var r=$('#curResult'); if(r) r.innerHTML='<b>'+fmtAmt(amt)+' '+f+' = '+fmtAmt(out)+' '+tt+'</b>'; var rl=$('#curRate'); if(rl) rl.textContent='Rate: 1 '+f+' = '+fmtAmt(RATES[tt]/RATES[f])+' '+tt+' (snapshot rate, for guidance)'; };
  $('#curAmt').addEventListener('input', conv);
  curFrom.addEventListener('change', conv); curTo.addEventListener('change', conv);
  var sw=$('#curSwap'); if(sw) sw.addEventListener('click',function(){ var v=curFrom.value; curFrom.value=curTo.value; curTo.value=v; conv(); });
  conv();
  var tb=$('#sarTable tbody');
  var FXFLAG={USD:'us',AED:'ae',EUR:'eu',GBP:'gb',PKR:'pk',INR:'in',RUB:'ru',TRY:'tr',CNY:'cn',RON:'ro',PLN:'pl',HUF:'hu',CZK:'cz',IDR:'id'};
  var FXSEL=null; try{FXSEL=localStorage.getItem('vsa_cur')}catch(e){}
  function trimNum(v,d){ var s=v.toFixed(d); if(s.indexOf('.')>-1) s=s.replace(/0+$/,'').replace(/\.$/,''); return s; }
  function fmtFx(v){ if(v>=1000) return Math.round(v).toLocaleString('en-US'); if(v>=10) return trimNum(v,2); if(v>=0.001) return trimNum(v,4); return trimNum(v,6); }
  if(tb) tb.innerHTML=Object.keys(RATES).filter(function(c){ return c!=='SAR'; }).map(function(c){ var per=RATES.SAR/RATES[c]; var inv=RATES[c]/RATES.SAR; var peg=(c==='USD')?'<span class="fxpeg">pegged</span>':''; return '<tr'+(c===FXSEL?' class="fxsel"':'')+'><td><span class="fxcur"><img class="fxflag" src="https://flagcdn.com/w80/'+FXFLAG[c]+'.png" alt="" loading="lazy" onerror="this.remove()"><span class="fxcode">'+c+'</span><span class="fxname">'+CURNAMES[c]+'</span>'+peg+'</span></td><td class="fxnum"><b>'+fmtFx(per)+'</b> SAR</td><td class="fxnum">'+fmtFx(inv)+' '+c+'</td></tr>'; }).join('');
}
var ramCount=$('#ramCount');
if(ramCount){
  var tj2=todayJd(); var hi=jd2i(tj2); var target=null, tYear=hi[0];
  if(hi[1]===9){ target=i2jd(hi[0],9,1); }
  else { var cand=i2jd(hi[0],9,1); if(cand>tj2){ target=cand; } else { target=i2jd(hi[0]+1,9,1); tYear=hi[0]+1; } }
  if(hi[1]===9){ ramCount.innerHTML='We are in <b>Ramadan</b> - today is day '+hi[2]+' of the holy month.'; }
  else { var days=target-tj2; ramCount.innerHTML='<b>'+days+'</b> '+(days===1?'day':'days')+' until Ramadan'; }
  var rs=$('#ramStart'); if(rs) rs.textContent='Ramadan '+tYear+' AH is expected to begin on '+fmtG(i2jd(tYear,9,1))+'.';
  var rd=$('#ramDates');
  if(rd){ var items=[[i2jd(tYear,9,1),'Ramadan begins (1 Ramadan '+tYear+' AH)'],[i2jd(tYear,9,27),'Laylat al-Qadr - the 27th night is widely observed'],[i2jd(tYear,10,1),'Eid al-Fitr (1 Shawwal '+tYear+' AH)']];
    rd.innerHTML=items.map(function(x){ return '<li><span>'+x[1]+'</span><b>'+fmtG(x[0])+'</b></li>'; }).join(''); }
}
var NAME_DICT={muhammad:'محمد',mohammed:'محمد',mohamed:'محمد',ahmad:'أحمد',ahmed:'أحمد',ali:'علي',omar:'عمر',umar:'عمر',osman:'عثمان',ibrahim:'إبراهيم',yusuf:'يوسف',yousef:'يوسف',joseph:'يوسف',bilal:'بلال',khalid:'خالد',khaled:'خالد',hassan:'حسن',hussain:'حسين',hussein:'حسين',hamza:'حمزة',tariq:'طارق',tarek:'طارق',samir:'سمير',sameer:'سمير',karim:'كريم',kareem:'كريم',nadia:'نادية',fatima:'فاطمة',fatimah:'فاطمة',aisha:'عائشة',ayesha:'عائشة',maryam:'مريم',mariam:'مريم',mary:'مريم',zainab:'زينب',layla:'ليلى',laila:'ليلى',leila:'ليلى',noor:'نور',nur:'نور',nour:'نور',hana:'هناء',sara:'سارة',sarah:'سارة',sana:'سناء',rania:'رانيا',dina:'دينا',yasmin:'ياسمين',jasmine:'ياسمين',amina:'أمينة',latifa:'لطيفة',salma:'سلمى',huda:'هدى',amal:'أمل',iman:'إيمان',eman:'إيمان',rima:'ريما',reema:'ريما',lama:'لمى',rana:'رنا',farah:'فرح',maya:'مايا',nora:'نورة',norah:'نورة',john:'جون',david:'داود',michael:'مايكل',james:'جيمس',robert:'روبرت',william:'وليام',richard:'ريتشارد',thomas:'توماس',charles:'تشارلز',daniel:'دانيال',matthew:'ماثيو',anthony:'أنطوني',mark:'مارك',paul:'بول',steven:'ستيفن',andrew:'أندرو',kevin:'كيفن',brian:'برايان',george:'جورج',ronald:'رونالد',edward:'إدوارد',ryan:'ريان',jacob:'جاكوب',nicholas:'نيكولاس',eric:'إريك',jonathan:'جوناثان',stephen:'ستيفن',justin:'جاستن',scott:'سكوت',brandon:'براندون',benjamin:'بنيامين',samuel:'صامويل',alexander:'ألكسندر',patrick:'باتريك',frank:'فرانك',jack:'جاك',dennis:'دينيس',jerry:'جيري',tyler:'تايلر',aaron:'آرون',jose:'خوسيه',nathan:'ناثان',adam:'آدم',kyle:'كايل',noah:'نوح',ethan:'إيثان',jeremy:'جيريمي',walter:'والتر',christian:'كريستيان',keith:'كيث',roger:'روجر',terry:'تيري',austin:'أوستن',sean:'شون',carl:'كارل',harold:'هارولد',dylan:'ديلان',arthur:'آرثر',lawrence:'لورانس',jordan:'جوردان',bryan:'برايان',billy:'بيلي',bruce:'بروس',gabriel:'غابرييل',logan:'لوغان',alan:'آلان',juan:'خوان',albert:'ألبرت',philip:'فيليب',eugene:'يوجين',randy:'راندي',vincent:'فينسنت',russell:'راسل',elijah:'إليجا',louis:'لويس',bobby:'بوبي',johnny:'جوني',emma:'إيما',olivia:'أوليفيا',ava:'آفا',sophia:'صوفيا',isabella:'إيزابيلا',mia:'ميا',evelyn:'إيفلين',harper:'هاربر',camila:'كاميلا',abigail:'أبيغيل',ella:'إيلا',elizabeth:'إليزابيث',sofia:'صوفيا',emily:'إميلي',avery:'أفيري',mila:'ميلا',scarlett:'سكارليت',grace:'غريس',chloe:'كلوي',victoria:'فيكتوريا',riley:'رايلي',aria:'آريا',lily:'ليلي',aubrey:'أوبري',zoey:'زوي',penelope:'بينيلوبي',hannah:'هانا',nina:'نينا',julia:'جوليا',anna:'آنا',laura:'لورا',marie:'ماري',helen:'هيلين',helena:'هيلينا',catherine:'كاثرين',katherine:'كاثرين',jessica:'جيسيكا',jennifer:'جينيفر',michelle:'ميشيل',linda:'ليندا',barbara:'باربرا',susan:'سوزان',karen:'كارين',lisa:'ليزا',nancy:'نانسي',betty:'بيتي',margaret:'مارغريت',sandra:'ساندرا',ashley:'آشلي',kimberly:'كيمبرلي',donna:'دونا',carol:'كارول',amanda:'أماندا',dorothy:'دوروثي',melissa:'ميليسا',deborah:'ديبورا',rebecca:'ريبيكا',sharon:'شارون',cynthia:'سينثيا',kathleen:'كاثلين',amy:'إيمي',angela:'أنجيلا',shirley:'شيرلي',ann:'آن',brenda:'بريندا',pamela:'باميلا',nicole:'نيكول',samantha:'سامانثا',christine:'كريستين',debra:'ديبرا',rachel:'راشيل',carolyn:'كارولين',virginia:'فيرجينيا',janet:'جانيت',ruth:'روث',maria:'ماريا',heather:'هيذر',diane:'ديان',julie:'جولي',joyce:'جويس',kelly:'كيلي',christina:'كريستينا',lauren:'لورين',joan:'جوان',judith:'جوديث',andrea:'أندريا',megan:'ميغان',cheryl:'شيريل',jacqueline:'جاكلين',martha:'مارثا',madison:'ماديسون',teresa:'تيريزا',gloria:'غلوريا',janice:'جانيس',judy:'جودي',theresa:'تيريزا',rose:'روز',beverly:'بيفرلي',denise:'دينيس',marilyn:'مارلين',amber:'أمبر',danielle:'دانييل',brittany:'بريتاني',diana:'ديانا',natalie:'ناتالي',alexis:'أليكسيس',lori:'لوري',kayla:'كايلا'};
function translitWord(w){
  var dig={'sh':'ش','kh':'خ','gh':'غ','th':'ث','dh':'ذ','ch':'تش','ph':'ف'};
  var cm={b:'ب',t:'ت',d:'د',r:'ر',z:'ز',s:'س',f:'ف',q:'ق',k:'ك',l:'ل',m:'م',n:'ن',h:'ه',j:'ج',p:'ب',v:'ف',g:'ج',x:'كس',w:'و',y:'ي',c:'ك'};
  var out='', i=0; w=w.toLowerCase();
  while(i<w.length){
    var two=w.substr(i,2);
    if(dig[two]){ out+=dig[two]; i+=2; continue; }
    var ch=w[i];
    if(ch==='a'){ out+='ا'; i++; continue; }
    if(ch==='e'||ch==='i'){ out+='ي'; i++; continue; }
    if(ch==='o'||ch==='u'){ out+='و'; i++; continue; }
    if(cm[ch]){ if(!(i>0&&w[i-1]===ch)) out+=cm[ch]; i++; continue; }
    i++;
  }
  return out;
}
function nameToArabic(raw){
  return raw.trim().split(/\s+/).map(function(w){
    var k=w.toLowerCase().replace(/[^a-z]/g,'');
    if(NAME_DICT[k]) return NAME_DICT[k];
    return translitWord(w.replace(/[^a-zA-Z]/g,''));
  }).join(' ');
}
/* legal pages: scroll-spy for the contents sidebar */
var tocLinks=$$('.legal-toc a');
if(tocLinks.length && 'IntersectionObserver' in window){
  var tocMap={}; tocLinks.forEach(function(a){ tocMap[a.getAttribute('data-toc')]=a; });
  var spy=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ tocLinks.forEach(function(a){a.classList.remove('on');}); var l=tocMap[e.target.id]; if(l) l.classList.add('on'); } }); }, { rootMargin:'-20% 0px -70% 0px' });
  $$('.legal-sec').forEach(function(s){ spy.observe(s); });
}
/* cookie consent */
  var ckBar=$('#cookieBar');
  if(ckBar){ var ckv=null; try{ckv=localStorage.getItem('vsa_consent')}catch(e){}
    if(!ckv){ setTimeout(function(){ ckBar.hidden=false; requestAnimationFrame(function(){ requestAnimationFrame(function(){ ckBar.classList.add('show'); }); }); },900); }
    function ckSet(v){ try{localStorage.setItem('vsa_consent',v)}catch(e){} ckBar.classList.remove('show'); setTimeout(function(){ ckBar.hidden=true; },380); }
    var ca=$('#ckAccept'), cd=$('#ckDecline');
    if(ca) ca.addEventListener('click',function(){ ckSet('accepted'); });
    if(cd) cd.addEventListener('click',function(){ ckSet('declined'); });
  }

/* client dictionary sweep: translates JS-rendered text on language pages */
  (function(){
    var pl=(typeof vsaPathLang==='function')?vsaPathLang():'en';
    if(pl==='en'||!window.fetch) return;
    fetch('/i18n/'+pl+'.json').then(function(r){ return r.ok?r.json():null; }).then(function(dict){
      if(!dict) return;
      var upper={};
      Object.keys(dict).forEach(function(k){ var u=k.toUpperCase(); if(u!==k&&!(u in dict)) upper[u]=dict[k]; });
      function tr(s){ if(!s) return null; var c=s.trim(); if(!c) return null; return dict[c]||upper[c]||null; }
      function sweepText(root){
        var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(n){
          if(!n.nodeValue||!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          var par=n.parentElement; if(!par) return NodeFilter.FILTER_REJECT;
          var tg=par.tagName; if(tg==='SCRIPT'||tg==='STYLE'||tg==='TEXTAREA') return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT; }});
        var nodes=[]; while(w.nextNode()) nodes.push(w.currentNode);
        nodes.forEach(function(n){ var tv=tr(n.nodeValue); if(tv&&tv!==n.nodeValue.trim()){ var v=n.nodeValue; n.nodeValue=v.match(/^\s*/)[0]+tv+v.match(/\s*$/)[0]; } });
      }
      function sweepAttrs(root){
        if(!root.querySelectorAll) return;
        root.querySelectorAll('[placeholder],[title],[alt]').forEach(function(el){ ['placeholder','title','alt'].forEach(function(a){ if(el.hasAttribute(a)){ var tv=tr(el.getAttribute(a)); if(tv) el.setAttribute(a,tv); } }); });
        root.querySelectorAll('option').forEach(function(o){ var tv=tr(o.textContent); if(tv) o.textContent=tv; });
      }
      function sweep(root){ try{ sweepText(root); sweepAttrs(root); }catch(e){} }
      sweep(document.body);
      var pending=false;
      new MutationObserver(function(){ if(pending) return; pending=true; setTimeout(function(){ pending=false; sweep(document.body); },350); }).observe(document.body,{childList:true,subtree:true,characterData:true});
    }).catch(function(){});
  })();

/* top strip: rotating messages */
(function(){
  var rot=document.getElementById('topRot'); if(!rot) return;
  var msgs=rot.querySelectorAll('.topmsg'); if(msgs.length<2) return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var ti=0; setInterval(function(){ msgs[ti].classList.remove('on'); ti=(ti+1)%msgs.length; msgs[ti].classList.add('on'); },4200);
})();
/* band video: lazy-load near viewport, pause off-screen, respect reduced motion */
(function(){
  var v=document.querySelector('.bandvid'); if(!v) return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var loaded=false;
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(e.isIntersecting){
        if(!loaded){ loaded=true; v.src=v.getAttribute('data-src'); }
        var pr=v.play(); if(pr&&pr.catch) pr.catch(function(){});
      } else { v.pause(); }
    });
  },{rootMargin:'300px 0px'});
  io.observe(v);
})();
/* hero parallax: the photo backdrop drifts slower than the page */
(function(){
  var hbg = document.querySelector('.hero .bg');
  if (!hbg || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var ticking = false;
  function par(){ ticking = false; var y = window.scrollY || 0; if (y < 1100) hbg.style.transform = 'translateY(' + Math.min(y * 0.18, 115) + 'px)'; }
  window.addEventListener('scroll', function(){ if (!ticking) { ticking = true; requestAnimationFrame(par); } }, { passive: true });
  par();
})();

/* embassies: interactive map - click a country (or search) to open its page; region chips zoom the map */
(function(){
  var map = document.getElementById('embMap'), embS = document.getElementById('embSearch'), sugg = document.getElementById('embSugg');
  if (!map) return;
  var paths = Array.prototype.slice.call(map.querySelectorAll('.cty'));
  paths.forEach(function(p){
    p.addEventListener('click', function(){ window.location.href = 'countries/' + p.getAttribute('data-slug'); });
  });
  /* region zoom (animated viewBox) */
  var FULL = [0, 0, 960, 500], cur = FULL.slice(), anim = null;
  var ZOOM = { all: FULL, europe: [415, 45, 165, 125], asia: [505, 35, 450, 215], africa: [385, 135, 230, 225], namerica: [0, 40, 390, 205], samerica: [220, 205, 155, 210], oceania: [730, 220, 230, 180] };
  var dots = paths.filter(function(p){ return p.tagName === 'circle'; });
  function zoomTo(target){
    if (anim) cancelAnimationFrame(anim);
    var from = cur.slice(), t0 = null;
    function step(ts){
      if (!t0) t0 = ts;
      var k = Math.min(1, (ts - t0) / 450), e = 1 - Math.pow(1 - k, 3);
      cur = from.map(function(v, i){ return v + (target[i] - v) * e; });
      map.setAttribute('viewBox', cur.join(' '));
      var s = cur[2] / 960;
      dots.forEach(function(d){ d.setAttribute('r', (6.5 * s).toFixed(2)); d.style.strokeWidth = (1.4 * s).toFixed(2) + 'px'; });
      if (k < 1) anim = requestAnimationFrame(step);
    }
    anim = requestAnimationFrame(step);
  }
  document.querySelectorAll('.embchip').forEach(function(ch){
    ch.addEventListener('click', function(){
      document.querySelectorAll('.embchip').forEach(function(x){ x.classList.remove('active'); });
      ch.classList.add('active');
      zoomTo(ZOOM[ch.getAttribute('data-region')] || FULL);
    });
  });
  /* search: suggestions navigate straight to the country page */
  if (embS && sugg) {
    var items = paths.map(function(p){ return { name: p.getAttribute('data-name'), slug: p.getAttribute('data-slug'), iso: p.getAttribute('data-iso') }; });
    function go(it){ if (it) window.location.href = 'countries/' + it.slug; }
    function render(){
      var q = embS.value.trim().toLowerCase();
      if (!q) { sugg.hidden = true; sugg.innerHTML = ''; return; }
      var hits = items.filter(function(it){ return it.name.toLowerCase().indexOf(q) >= 0; }).slice(0, 8);
      if (!hits.length) { sugg.hidden = true; sugg.innerHTML = ''; return; }
      sugg.innerHTML = hits.map(function(it, i){ return '<button type="button" data-i="' + items.indexOf(it) + '"><img src="https://flagcdn.com/w80/' + it.iso + '.png" alt="">' + it.name + '</button>'; }).join('');
      sugg.hidden = false;
      sugg.querySelectorAll('button').forEach(function(b){ b.addEventListener('click', function(){ go(items[+b.getAttribute('data-i')]); }); });
    }
    embS.addEventListener('input', render);
    embS.addEventListener('keydown', function(ev){
      if (ev.key === 'Enter') {
        var q = embS.value.trim().toLowerCase();
        var hit = items.filter(function(it){ return it.name.toLowerCase().indexOf(q) >= 0; })[0];
        if (hit) { ev.preventDefault(); go(hit); }
      }
    });
    document.addEventListener('click', function(ev){ if (!sugg.hidden && ev.target !== embS && !sugg.contains(ev.target)) sugg.hidden = true; });
  }
})();


/* ---------- admin-driven prices + analytics events ---------- */
function vsaEvent(t, nat){ try{ fetch('/api/event', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({t:t, nat:nat||'', path:location.pathname})}); }catch(e){} }
document.addEventListener('click', function(e){ var a=e.target && e.target.closest ? e.target.closest('a[href*="wa.me"]') : null; if(a) vsaEvent('whatsapp'); });
var PRICE_NAMES={'one-year-multiple':'1 Year Multiple Entry','ninety-day-multiple':'90 Days Multiple Entry','tourist':'Tourist eVisa','family':'Family & Friends','umrah':'Umrah','business':'Business Visit','personal':'Personal Visit','transit':'Stopover Transit','medical':'Medical Treatment','work':'Employment Guidance','hajj':'Hajj Guidance'};
function fmtPrice(p){ var from=(p.currency&&RATES[p.currency])?p.currency:'USD'; var amt=Number(p.amount); if(!isFinite(amt)) return ''; var conv=amt*(RATES[CUR]||1)/(RATES[from]||1); var v=conv>=1000? Math.round(conv/10)*10 : Math.round(conv); return CUR+' '+v.toLocaleString('en-US'); }
fetch('/api/config').then(function(r){ return r.json(); }).then(function(j){
  if(!j) return;
  window.VSA_PAYMENTS = j.payments || {};
  if(j.whatsapp && j.whatsapp!=='971566556645'){
    window.VSA_WA=j.whatsapp;
    $$('a[href*="wa.me/971566556645"]').forEach(function(a){ a.href=a.href.split('971566556645').join(j.whatsapp); });
    if(j.whatsapp.length===12 && j.whatsapp.indexOf('971')===0){ var fmt='+971 '+j.whatsapp.slice(3,5)+' '+j.whatsapp.slice(5,8)+' '+j.whatsapp.slice(8); $$('.ltrnum').forEach(function(el){ if(el.textContent.replace(/[^0-9]/g,'')==='971566556645') el.textContent=fmt; }); }
  }
  if(j.email && j.email!=='info@visit-saudi.ae'){ $$('a[href="mailto:info@visit-saudi.ae"]').forEach(function(a){ a.href='mailto:'+j.email; if(a.textContent.indexOf('@')>-1) a.textContent=j.email; }); }
  if(!j.prices || !Object.keys(j.prices).length) return;
  window.VSA_PRICES=j.prices;
  $$('a[href*="/visa/"]').forEach(function(a){
    var mm=(a.getAttribute('href')||'').match(/visa\/([a-z-]+)/); if(!mm) return;
    var p=j.prices[mm[1]]; if(!p || !p.amount) return;
    var fs=a.closest('.fspot');
    if(fs){ var fte=fs.querySelector('.ftotal'); var fp=fte? fte.querySelector('.ft-price') : null; if(fp){ fp.setAttribute('data-pid', mm[1]); fp.setAttribute('data-pfmt','amt'); fte.classList.add('priced'); } return; }
    var card=a.closest('.vcard'); if(!card || card.querySelector('.pricebar')) return;
    var bar=document.createElement('div'); bar.className='pricebar'; bar.innerHTML='Total <b></b>'; var pb=bar.querySelector('b'); pb.setAttribute('data-pid', mm[1]); pb.setAttribute('data-pfmt','amt'); pb.textContent=fmtPrice(p);
    var cta=card.querySelector('.vcta'); if(cta) cta.parentNode.insertBefore(bar, cta); else card.appendChild(bar);
  });
  var vm=location.pathname.match(/\/visa\/([a-z-]+)\/?$/);
  if(vm){ var p2=j.prices[vm[1]]; if(p2 && p2.amount){
    var ft=document.querySelector('.ftotal');
    if(ft){ ft.setAttribute('data-pid', vm[1]); ft.setAttribute('data-pfmt','full'); }
    else { var tb=document.querySelector('.tb-total'); if(tb){ tb.setAttribute('data-pid', vm[1]); tb.setAttribute('data-pfmt','tb'); } }
  }}
  window.vsaRenderPrices=function(){ if(!window.VSA_PRICES) return; $$('[data-pid]').forEach(function(el){ var p=window.VSA_PRICES[el.getAttribute('data-pid')]; if(!p || !p.amount) return; var f=el.getAttribute('data-pfmt'); if(f==='amt') el.textContent=fmtPrice(p); else if(f==='tb') el.innerHTML='<b>'+esc(fmtPrice(p))+'</b> - confirmed in writing before payment'; else el.innerHTML='Total: <b>'+esc(fmtPrice(p))+'</b> - confirmed in writing before payment'; }); };
  window.vsaRenderPrices();
}).catch(function(){});

/* mega/hub tool cards: live one-liners */
$$('[data-live]').forEach(function(el){
  var k=el.getAttribute('data-live');
  try{
    if(k==='hijri'){ el.textContent=fmtH(jd2i(todayJd())).replace(/ AH$/,''); }
    else if(k==='fx'){ el.textContent='1 USD = '+(RATES.SAR/RATES.USD).toFixed(2)+' SAR'; }
    else if(k==='ramadan'){ var tj3=todayJd(), hi3=jd2i(tj3); if(hi3[1]===9){ el.textContent='Ramadan · day '+hi3[2]; } else { var c3=i2jd(hi3[0],9,1); if(c3<=tj3) c3=i2jd(hi3[0]+1,9,1); el.textContent='Ramadan in '+(c3-tj3)+' days'; } }
  }catch(e){}
});
var nameBtn=$('#nameBtn');
if(nameBtn){
  var doName=function(){ var v=$('#nameIn').value||''; var out=$('#nameOut'); if(!v.trim()){ out.textContent='...'; return; } out.textContent=nameToArabic(v); var c=$('#nameCopy'); if(c) c.hidden=false; };
  nameBtn.addEventListener('click', doName);
  $('#nameIn').addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); doName(); } });
  var cp=$('#nameCopy');
  if(cp) cp.addEventListener('click',function(){ var txt=$('#nameOut').textContent; if(navigator.clipboard) navigator.clipboard.writeText(txt).then(function(){ cp.textContent='Copied'; setTimeout(function(){ cp.textContent='Copy the Arabic'; },1600); }); });
}

/* ---------- country grid search ---------- */
var csEl=$('#countrySearch');
if(csEl){
  var cchips=$$('#countryGrid .cchip'), ccnt=$('#countryCount'), cnone=$('#countryNone'), cwrap=$('#countryWrap'), ctog=$('#countryToggle');
  var cExpanded=false;
  var cLabel=function(){ if(!ctog) return; ctog.querySelector('span').textContent = cExpanded ? 'Show less' : 'View all '+cchips.length+' countries'; ctog.setAttribute('aria-expanded', cExpanded?'true':'false'); ctog.classList.toggle('open', cExpanded); };
  var cClip=function(){ if(cwrap) cwrap.classList.toggle('clipped', !cExpanded && !csEl.value.trim()); };
  if(ctog) ctog.addEventListener('click',function(){ cExpanded=!cExpanded; cClip(); cLabel(); if(ccnt && !csEl.value.trim()) ccnt.textContent = cExpanded ? 'All '+cchips.length+' countries' : cchips.length+' countries'; if(!cExpanded && csEl) csEl.scrollIntoView({behavior:'smooth', block:'center'}); });
  csEl.addEventListener('input',function(){
    var q=csEl.value.trim().toLowerCase(), n=0;
    cchips.forEach(function(c){ var hit=!q || c.getAttribute('data-name').indexOf(q)>-1; c.style.display=hit?'':'none'; if(hit) n++; });
    if(q){ if(ccnt) ccnt.textContent=n+' of '+cchips.length+' countries'; }
    else if(ccnt){ ccnt.textContent = cExpanded ? 'All '+cchips.length+' countries' : cchips.length+' countries'; }
    if(cnone) cnone.hidden=n>0;
    if(ctog) ctog.parentElement.style.display = q ? 'none' : '';
    cClip();
  });
  cClip(); cLabel();
}

/* ---------- custom country dropdown (styled panel, search, keyboard) ---------- */
$$('[data-dd]').forEach(function(dd){
  var btn=dd.querySelector('.dd-btn'), val=dd.querySelector('.dd-val'), panel=dd.querySelector('.dd-panel'),
      search=dd.querySelector('.dd-search'), list=dd.querySelector('.dd-list'), hidden=dd.querySelector('input[type=hidden]');
  var bf=document.createElement('img'); bf.className='dd-btnflag'; bf.alt=''; bf.hidden=true; btn.insertBefore(bf, val);
  function setBtnFlag(n){ if(NATISO[n]){ bf.src='https://flagcdn.com/w80/'+NATISO[n]+'.png'; bf.hidden=false; } else { bf.hidden=true; } }
  function render(q){
    var items=ALLNATS.filter(function(n){ return !q || n.toLowerCase().indexOf(q.toLowerCase())>-1; });
    list.innerHTML = items.length ? items.map(function(n){ return '<div class="dd-item'+(n===hidden.value?' on':'')+'" role="option" data-v="'+n+'">'+((NATISO[n])?'<img class="dd-flag" src="https://flagcdn.com/w80/'+NATISO[n]+'.png" alt="" loading="lazy">':'')+n+'</div>'; }).join('')
                                  : '<div class="dd-none">No match - try another spelling</div>';
  }
  function open(){ $$('[data-dd] .dd-panel').forEach(function(p){ if(p!==panel) p.hidden=true; });
    panel.hidden=false; btn.setAttribute('aria-expanded','true'); render(''); search.value=''; setTimeout(function(){ try{search.focus();}catch(e){} },30); }
  function close(){ panel.hidden=true; btn.setAttribute('aria-expanded','false'); }
  btn.addEventListener('click',function(e){ e.stopPropagation(); panel.hidden?open():close(); });
  panel.addEventListener('click',function(e){ e.stopPropagation(); });
  document.addEventListener('click',function(){ if(!panel.hidden) close(); });
  search.addEventListener('input',function(){ render(search.value); });
  search.addEventListener('keydown',function(e){
    var items=$$('.dd-item',list); if(!items.length) return;
    var act=list.querySelector('.dd-item.act'), i=act?items.indexOf(act):-1;
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); i=e.key==='ArrowDown'?Math.min(i+1,items.length-1):Math.max(i-1,0);
      items.forEach(function(x){x.classList.remove('act')}); items[i].classList.add('act'); items[i].scrollIntoView({block:'nearest'}); }
    else if(e.key==='Enter'){ e.preventDefault(); var pick=list.querySelector('.dd-item.act')||items[0]; if(pick) pick.click(); }
    else if(e.key==='Escape'){ close(); }
  });
  list.addEventListener('click',function(e){
    var it=e.target.closest('.dd-item'); if(!it) return;
    hidden.value=it.getAttribute('data-v'); val.textContent=hidden.value; setBtnFlag(hidden.value); dd.classList.add('has'); close();
  });
  if(hidden.value){ val.textContent=hidden.value; setBtnFlag(hidden.value); dd.classList.add('has'); }
});

})();

/* ---------- blog: search, category filter, team posts, reader ---------- */
var blogGrid = $('#blogGrid');
if (blogGrid) {
  var bcat = 'All', bq = '';
  function blogFilter(){
    var visible = 0;
    $$('#blogGrid .post').forEach(function(card){
      var okCat = bcat === 'All' || card.getAttribute('data-cat') === bcat;
      var okQ = !bq || (card.getAttribute('data-q') || '').indexOf(bq) >= 0;
      var show = okCat && okQ;
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    var empty = $('#blogEmpty'); if (empty) empty.style.display = visible ? 'none' : 'block';
  }
  var bs = $('#blogSearch');
  if (bs) bs.addEventListener('input', function(){ bq = bs.value.trim().toLowerCase(); blogFilter(); });
  $$('[data-bcat]').forEach(function(chip){
    chip.addEventListener('click', function(){
      $$('[data-bcat]').forEach(function(c){ c.classList.remove('on'); });
      chip.classList.add('on'); bcat = chip.getAttribute('data-bcat'); blogFilter();
    });
  });
  fetch('/api/blog').then(function(r){ return r.json(); }).then(function(j){
    (j.posts || []).forEach(function(post){
      var el = document.createElement('article');
      el.className = 'post rv in'; el.setAttribute('data-cat', post.cat || 'News');
      el.setAttribute('data-q', (post.title + ' ' + (post.excerpt || '') + ' ' + (post.cat || '')).toLowerCase());
      el.innerHTML = '<div class="body"><span class="pill"></span><h3><a style="color:inherit"></a></h3><p></p><span class="meta"></span></div>';
      el.querySelector('.pill').textContent = post.cat || 'News';
      var a = el.querySelector('h3 a'); a.textContent = post.title; a.href = '/blog-post?slug=' + encodeURIComponent(post.slug);
      el.querySelector('p').textContent = post.excerpt || '';
      el.querySelector('.meta').textContent = (post.cat || 'News') + ' · Team update · ' + (post.date || '');
      blogGrid.insertBefore(el, blogGrid.firstChild);
    });
    blogFilter();
  }).catch(function(){});
}
var blogPostEl = $('#blogPost');
if (blogPostEl) {
  var slug = new URLSearchParams(location.search).get('slug') || '';
  fetch('/api/blog?slug=' + encodeURIComponent(slug)).then(function(r){ return r.json(); }).then(function(j){
    if (!j.ok || !j.post) { blogPostEl.innerHTML = '<p class="note">That article could not be found. <a href="/guides">Browse all articles</a>.</p>'; return; }
    var p = j.post;
    document.title = p.title + ' | visit-saudi.ae';
    var paras = String(p.body || '').split(/\n\s*\n/).map(function(x){ return '<p>' + esc(x).replace(/\n/g, '<br>') + '</p>'; }).join('');
    blogPostEl.innerHTML = '<span class="pill"></span><h1 style="margin:14px 0 8px"></h1><p class="note" style="margin-bottom:20px"></p><div class="article">' + paras + '</div>';
    blogPostEl.querySelector('.pill').textContent = p.cat || 'News';
    blogPostEl.querySelector('h1').textContent = p.title;
    blogPostEl.querySelector('.note').textContent = 'Published ' + (p.date || '') + ' · visit-saudi.ae team';
  }).catch(function(){ blogPostEl.innerHTML = '<p class="note">This article loads from the live site. <a href="/guides">Browse all articles</a>.</p>'; });
}

/* ---------- reviews (shown only when the team has published real ones) ---------- */
var revSec = $('#reviewsSec');
if (revSec) {
  fetch('/api/reviews').then(function(r){ return r.json(); }).then(function(j){
    var list = j.reviews || [];
    if (!list.length) return;
    revSec.style.display = '';
    $('#reviewsGrid').innerHTML = list.slice(0, 6).map(function(r){
      return '<div class="revcard rv in"><div class="stars">' + '★★★★★'.slice(0, r.rating || 5) + '</div><p></p><div class="who"><span class="rn"></span><small></small></div></div>';
    }).join('');
    $$('#reviewsGrid .revcard').forEach(function(card, i){
      var r = list[i];
      card.querySelector('p').textContent = r.text;
      card.querySelector('.rn').textContent = r.name;
      card.querySelector('small').textContent = [r.visa, r.country].filter(Boolean).join(' · ');
    });
  }).catch(function(){});
}

/* ---------- free consultation form ---------- */
var cForm=$('#consultForm');
if(cForm){ cForm.addEventListener('submit', function(e){ e.preventDefault();
  var nEl=$('#c-name'), pEl=$('#c-phone'), natEl=$('#c-nat');
  var name=nEl.value.trim(), phone=pEl.value.trim(), nat=natEl.value, visa=$('#c-visa').value;
  var badN=!name, badP=phone.replace(/\D/g,'').length<7, badNat=!nat;
  nEl.style.borderColor=badN?'#d9534f':''; pEl.style.borderColor=badP?'#d9534f':''; natEl.style.borderColor=badNat?'#d9534f':'';
  if(badN||badP||badNat){ (badN?nEl:(badP?pEl:natEl)).focus(); return; }
  var msg='Free consultation request\nName: '+name+'\nWhatsApp: '+phone+'\nNationality: '+nat+'\nVisa type: '+visa;
  if(window.fetch){ fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,phone:phone,topic:'Free consultation',msg:msg})}).catch(function(){}); }
  var done=$('#consultDone'); if(done) done.style.display='block';
  var text=encodeURIComponent("Hi, I'm "+name+". I'd like a free consultation for a Saudi visa ("+visa+"). Nationality: "+nat+".");
  window.open('https://wa.me/'+(window.VSA_WA||'971566556645')+'?text='+text,'_blank');
}); }

/* ---------- assistant chatbot ---------- */
var chatBtn=$('#chatBtn'), chatPanel=$('#chatPanel'), chatBody=$('#chatBody'), chatChips=$('#chatChips'), chatForm=$('#chatForm'), chatText=$('#chatText');
if(chatBtn && chatPanel){
  var botState=null, botOpened=false;
  var BOT_VISAS=[['Tourist eVisa','1 year, multiple entry, up to 90 days per visit'],['Family & Friends Visit Visa','Sponsored by your host in Saudi Arabia - single or multiple entry'],['Umrah Visa','For Umrah outside Hajj season - Nusuk permit required'],['Business Visit Visa','Invitation based - meetings and conferences'],['Personal Visit Visa','Invitation based - your host is a Saudi citizen'],['Medical Treatment Visa','Invitation based - companions can be included'],['Stopover Transit Visa','48 or 96 hours, issued with your Saudia or flynas ticket'],['Employment Visa Guidance','Employer sponsored - not self-applied'],['Hajj Visa Guidance','Seasonal - official Nusuk Hajj channels only']];
  function botSay(html){ var d=document.createElement('div'); d.className='cmsg bot'; d.innerHTML=html; chatBody.appendChild(d); chatBody.scrollTop=chatBody.scrollHeight; }
  function userSay(text){ var d=document.createElement('div'); d.className='cmsg user'; d.textContent=text; chatBody.appendChild(d); chatBody.scrollTop=chatBody.scrollHeight; }
  function setChips(list){ chatChips.innerHTML=''; list.forEach(function(c){ var b=document.createElement('button'); b.type='button'; b.className='chip'; b.textContent=c[0]; b.addEventListener('click',function(){ userSay(c[0]); botAnswer(c[1]); }); chatChips.appendChild(b); }); }
  var MAIN_CHIPS=[['Check my eligibility','elig'],['Visa types','types'],['What does it cost?','price'],['Documents needed','docs'],['Processing time','time'],['Track my application','track'],['Umrah','umrah'],['WhatsApp a specialist','wa']];
  function botAnswer(key){
    botState=null;
    if(key==='elig'){ botState='nat'; botSay('Happy to check. <b>Which passport do you hold?</b> Type your nationality below - for example India, Pakistan, United Kingdom or Egypt.'); setChips([]); chatText.focus(); return; }
    if(key==='types'){ botSay('We handle all nine Saudi visit routes:<br>' + BOT_VISAS.map(function(v){ return '<br><b>' + v[0] + '</b> - ' + v[1]; }).join('') + '<br><br>Full details: <a href="/visa-types">compare all visa types</a>, or tell me your nationality and I will point you to the right one.'); }
    else if(key==='price'){ botSay('Your total has two parts: the <b>official Saudi fee</b> (which includes the mandatory medical insurance) and our <b>service fee</b> for the specialist check and handling. We confirm the full total <b>in writing before you pay anything</b> - no hidden charges. For an exact figure for your case, a specialist can quote you free on WhatsApp.'); if(window.VSA_PRICES){ var _ks=Object.keys(window.VSA_PRICES).filter(function(k){return window.VSA_PRICES[k]&&window.VSA_PRICES[k].amount}); if(_ks.length) botSay('Current totals:<br>'+_ks.map(function(k){ return '<b>'+(PRICE_NAMES[k]||k)+'</b> - '+fmtPrice(window.VSA_PRICES[k]); }).join('<br>')); } }
    else if(key==='docs'){ botSay('For most applications you need:<br><br>- Passport valid at least <b>6 months</b><br>- A recent photo on a <b>plain white background</b><br>- Your travel dates<br><br>Sponsored visas (family, personal, business) also need the host or invitation details. Our photo guide explains the rules that get photos rejected: <a href="/guides/saudi-visa-photo-requirements">photo requirements</a>.'); }
    else if(key==='time'){ botSay('Most straightforward eVisas are decided <b>within a few working days</b> once submitted. Sponsored and embassy routes take longer and depend on the host side. Either way, you can follow every stage with your reference on the <a href="/track">tracking page</a>.'); }
    else if(key==='track'){ botSay('You can follow your application stage by stage here: <a href="/track">track your application</a> - you will need your reference (it looks like VSA-XXXXXX) and the passport number you applied with.'); }
    else if(key==='umrah'){ botSay('Umrah is allowed on the <b>tourist eVisa</b> outside the Hajj season - most UAE residents never need a separate Umrah visa. You book your Umrah and Rawdah slots in the <b>Nusuk</b> app once the visa is issued. Hajj itself always needs the official Hajj route. Full guide: <a href="/guides/umrah-on-tourist-visa">Umrah on a tourist visa</a>.'); }
    else if(key==='family'){ botSay('The <b>family visit visa</b> starts with your host in Saudi Arabia - a citizen or resident relative applies for the visit request, then we handle your side. It is issued single or multiple entry. Details: <a href="/guides/saudi-family-visit-visa-guide">family visit guide</a>.'); }
    else if(key==='business'){ botSay('Business visit visas are <b>invitation-led</b>: the Saudi company issues an official invitation in your name first, then your application follows. It covers meetings, training and conferences - not hands-on employment. Guide: <a href="/guides/saudi-business-visit-visa-guide">business visit visa</a>.'); }
    else if(key==='transit'){ botSay('The <b>stopover visa</b> (48 or 96 hours) is issued during the Saudia or flynas booking flow when your ticket includes a Saudi stop. If you are booking through us, tell a specialist your flights and we will line it up.'); }
    else if(key==='gcc'){ botSay('Good news: residents of the UAE, Qatar, Kuwait, Bahrain and Oman can apply for the Saudi eVisa <b>on their residency</b>, whatever passport they hold. Your passport needs 6+ months and your residency 3+ months of validity.'); }
    else if(key==='wa'){ botSay('Of course - a specialist will take it from there: <a href="https://wa.me/'+(window.VSA_WA||'971566556645')+'" target="_blank" rel="noopener"><b>chat on WhatsApp <span class="ltrnum">+971 56 655 6645</span></b></a>. Mention your nationality and where you want to go.'); }
    else { botSay('I don\'t want to guess on that one. A specialist can answer properly on <a href="https://wa.me/'+(window.VSA_WA||'971566556645')+'" target="_blank" rel="noopener">WhatsApp</a>, or try one of the topics below.'); }
    if(key!=='elig') setChips(MAIN_CHIPS);
  }
  function botNationality(raw){
    var q=raw.trim().toLowerCase();
    var EL=window.VSA_ELIGIBLE||[], AN=window.VSA_ALLNATS||[];
    var hit=EL.filter(function(n){ return n.toLowerCase()===q; })[0] || EL.filter(function(n){ return n.toLowerCase().indexOf(q)>-1 && q.length>2; })[0];
    var known=AN.filter(function(n){ return n.toLowerCase()===q; })[0];
    botState=null;
    if(hit){ botSay('<b>Good news:</b> ' + hit + ' passport holders can apply for the Saudi tourist eVisa online - 1 year, multiple entry, up to 90 days per visit, Umrah included outside Hajj. <a href="/apply?visa=tourist">Start your application</a> when you are ready.'); }
    else if(known){ botSay(known + ' is not on the standard eVisa list, so your route is usually a <b>sponsored visit visa</b> (family, personal or business) - or the eVisa if you hold a GCC residency or a used US, UK or Schengen visa. A specialist can confirm your exact route free on <a href="https://wa.me/'+(window.VSA_WA||'971566556645')+'" target="_blank" rel="noopener">WhatsApp</a>.'); }
    else { botSay('I could not match that nationality to the list. Check the spelling, or use the full checker: <a href="/eligibility">eligibility checker</a>.'); }
    setChips(MAIN_CHIPS);
  }
  chatBtn.addEventListener('click', function(){
    var open = chatPanel.hidden;
    chatPanel.hidden = !open;
    if(open && !botOpened){ botOpened=true; botSay('Assalamu alaikum, and welcome to Visit Saudi. I can check your eligibility, explain the visa types, documents and timing, or help you track an application. What would you like to do?'); setChips(MAIN_CHIPS); }
    if(open) chatText.focus();
  });
  $('#chatClose').addEventListener('click', function(){ chatPanel.hidden=true; });
  chatForm.addEventListener('submit', function(e){ e.preventDefault();
    var v=chatText.value.trim(); if(!v) return; chatText.value=''; userSay(v);
    if(botState==='nat'){ botNationality(v); return; }
    var s=v.toLowerCase();
    if(/\b(hi|hello|hey|salam|assalam)\b/.test(s)) { botSay('Hello - good to meet you. I can check your eligibility, explain visa types, documents and timing, or help with tracking.'); setChips(MAIN_CHIPS); }
    else if(/price|cost|fee|charge|much/.test(s)) botAnswer('price');
    else if(/document|photo|passport|need for|required/.test(s)) botAnswer('docs');
    else if(/track|status|reference|where is my/.test(s)) botAnswer('track');
    else if(/umrah|umra|makkah|mecca|madinah|hajj/.test(s)) botAnswer('umrah');
    else if(/family|wife|husband|parents|visit my/.test(s)) botAnswer('family');
    else if(/business|meeting|conference|work|job|employ/.test(s)) botAnswer('business');
    else if(/transit|stopover|layover|connecting/.test(s)) botAnswer('transit');
    else if(/gcc|resident|residency|dubai|uae|emirates id/.test(s)) botAnswer('gcc');
    else if(/long|time|days|fast|urgent|express/.test(s)) botAnswer('time');
    else if(/eligib|qualify|can i apply|which visa/.test(s)) botAnswer('elig');
    else if(/type|kind|option/.test(s)) botAnswer('types');
    else if(/whatsapp|human|person|agent|call/.test(s)) botAnswer('wa');
    else botAnswer('other');
  });
}

/* ---------- one-time offer pop ---------- */
var offerPop=$('#offerPop');
if(offerPop && !/apply|track/.test(location.pathname)){
  var offerSeen=false; try{ offerSeen=!!sessionStorage.getItem('vsa_offer'); }catch(e){}
  if(!offerSeen){
    setTimeout(function(){
      if(chatPanel && !chatPanel.hidden) return;
      offerPop.hidden=false;
      try{ sessionStorage.setItem('vsa_offer','1'); }catch(e){}
    }, 26000);
    $('#offerClose').addEventListener('click', function(){ offerPop.hidden=true; });
  }
}

/* ---------- mark the current page in the menu ---------- */
(function(){ try{
  var p=location.pathname.replace(/\/+$/,'')||'/';
  document.querySelectorAll('.nav nav a').forEach(function(a){
    var h=a.getAttribute('href'); if(!h) return;
    var q; try{ q=new URL(h, location.origin).pathname.replace(/\/+$/,'')||'/'; }catch(e){ return; }
    if(q===p || (q!=='/' && p.indexOf(q+'/')===0)) a.classList.add('on');
  });
}catch(e){} })();
