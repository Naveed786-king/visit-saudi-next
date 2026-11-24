/* Visit Saudi admin - full console (dashboard, board, content, prices, settings) */
(function(){
"use strict";
var $=function(s){return document.querySelector(s)};
var $$=function(s){return Array.prototype.slice.call(document.querySelectorAll(s))};
var STAGES=[]; var APPS=[]; var ENQS=[]; var ROLE='admin'; var SETTINGS=null;
var PRICE_VISAS=[['one-year-multiple','1 Year Multiple Entry - FEATURED'],['ninety-day-multiple','90 Days Multiple Entry - FEATURED'],['tourist','Tourist eVisa'],['family','Family & Friends Visit'],['umrah','Umrah'],['business','Business Visit'],['personal','Personal Visit'],['transit','Stopover Transit'],['medical','Medical Treatment'],['work','Employment Guidance'],['hajj','Hajj Guidance']];
var LANGS=[['en','English'],['ar','Arabic'],['ur','Urdu'],['hi','Hindi'],['id','Indonesian'],['tr','Turkish'],['ru','Russian'],['zh','Chinese'],['de','German'],['es','Spanish'],['fr','French'],['it','Italian'],['pt','Portuguese'],['pl','Polish'],['ro','Romanian'],['hu','Hungarian'],['hr','Croatian'],['sk','Slovak'],['cs','Czech']];
function api(path, opts){
  return fetch(path, Object.assign({headers:{'Content-Type':'application/json'}}, opts||{})).then(function(r){return r.json().then(function(j){return {status:r.status, j:j}})});
}
function esc(s){var d=document.createElement('div'); d.textContent=String(s==null?'':s); return d.innerHTML}
function fmtDate(iso){ if(!iso) return '-'; var d=new Date(iso); return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'}) + ' ' + d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}); }
function daysAgo(iso){ return Math.floor((Date.now()-new Date(iso).getTime())/86400000); }
function unreadClient(a){ var m=a.messages||[]; return m.length && m[m.length-1].from==='client'; }

/* ---------- auth ---------- */
function applyRole(){
  var b=$('#roleBadge'); b.style.display='inline-block'; b.textContent = ROLE==='admin' ? 'Administrator' : 'Staff';
  $('#teamRole').textContent = ROLE;
  if(ROLE!=='admin'){ $$('[data-adminonly]').forEach(function(el){ el.style.display='none'; }); }
}
function showDash(){ $('#loginView').style.display='none'; $('#dashView').style.display='block'; applyRole(); loadData(); }
function showLogin(){ $('#dashView').style.display='none'; $('#loginView').style.display='block'; }
$('#loginBtn').addEventListener('click', function(){
  var err=$('#loginErr'); err.style.display='none';
  api('/api/admin/login', {method:'POST', body: JSON.stringify({user:$('#a-user').value, password:$('#a-pass').value})}).then(function(r){
    if(r.j.ok){ ROLE=r.j.role||'admin'; showDash(); }
    else { err.textContent=r.j.error||'Sign-in failed.'; err.style.display='block'; }
  });
});
$('#a-pass').addEventListener('keydown', function(e){ if(e.key==='Enter') $('#loginBtn').click(); });
$('#logoutBtn').addEventListener('click', function(){ api('/api/admin/logout',{method:'POST',body:'{}'}).then(showLogin); });
$('#refreshBtn').addEventListener('click', function(){ loadData(); var t=currentTab; if(t==='blog') loadBlog(); if(t==='reviews') loadReviews(); if(t==='customers') loadCustomers(); if(t==='stats') loadStats(); if(t==='media') loadMedia(); });

/* ---------- tabs ---------- */
var currentTab='dash';
var LAZY={blog:loadBlog, reviews:loadReviews, prices:loadPrices, media:loadMedia, customers:loadCustomers, stats:loadStats, settings:loadSettingsForm, quick:loadQuick};
function pane(name){
  currentTab=name;
  ['dash','quick','board','apps','enq','new','customers','stats','blog','reviews','prices','content','media','settings','backup'].forEach(function(k){
    var el=$('#pane-'+k); if(el) el.style.display = k===name ? 'block':'none';
  });
  $$('#sideNav button').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-tab')===name); });
  if(LAZY[name]) LAZY[name]();
  if(name==='enq') renderEnq();
}
$$('#sideNav button').forEach(function(b){ b.addEventListener('click', function(){ pane(b.getAttribute('data-tab')); }); });

/* ---------- data ---------- */
function loadData(){
  api('/api/admin/apps').then(function(r){
    if(r.status===401) return showLogin();
    APPS=r.j.apps||[]; STAGES=r.j.stages||[];
    api('/api/admin/enquiries').then(function(r2){ ENQS=r2.j.enquiries||[]; renderAll(); });
  });
}
function renderAll(){ renderDash(); renderBoard(); renderApps(); renderEnq(); }

/* ---------- dashboard ---------- */
function renderDash(){
  var today=new Date().toDateString();
  var nToday=APPS.filter(function(a){return new Date(a.created).toDateString()===today}).length;
  var nWeek=APPS.filter(function(a){return daysAgo(a.created)<7}).length;
  var nProg=APPS.filter(function(a){return a.stage>0 && a.stage<5}).length;
  var nDone=APPS.filter(function(a){return a.stage===5}).length;
  var nUnread=APPS.filter(unreadClient).length;
  var counts={}; APPS.forEach(function(a){counts[a.stage]=(counts[a.stage]||0)+1});
  $('#kpiRow').innerHTML =
    '<div class="kpi"><b>'+APPS.length+'</b><span>Total applications</span></div>'
    + '<div class="kpi"><b>'+nToday+'</b><span>New today</span></div>'
    + '<div class="kpi"><b>'+nWeek+'</b><span>Last 7 days</span></div>'
    + '<div class="kpi"><b>'+nProg+'</b><span>In progress</span></div>'
    + '<div class="kpi"><b>'+nDone+'</b><span>eVisa ready</span></div>'
    + '<div class="kpi'+(nUnread?' hot':'')+'"><b>'+nUnread+'</b><span>Client messages waiting</span></div>'
    + '<div class="kpi"><b>'+ENQS.length+'</b><span>Enquiries</span></div>';
  var maxC=Math.max(1, Math.max.apply(null, STAGES.map(function(_,i){return counts[i]||0})));
  $('#funnelBox').innerHTML = STAGES.map(function(s,i){
    return '<div class="frow"><span>'+esc(s)+'</span><div class="fbar"><i style="width:'+Math.round((counts[i]||0)/maxC*100)+'%"></i></div><b>'+(counts[i]||0)+'</b></div>';
  }).join('');
  var items=[];
  APPS.forEach(function(a){
    if(unreadClient(a)) items.push({t:'<b>'+esc(a.name)+'</b> ('+a.ref+') sent a message that has no team reply yet.', tab:'apps', ref:a.ref});
    else if(a.stage<5 && daysAgo(a.updated||a.created)>=2) items.push({t:'<b>'+esc(a.name)+'</b> ('+a.ref+') has had no update for '+daysAgo(a.updated||a.created)+' days - currently at "'+esc(STAGES[a.stage]||'')+'".', tab:'apps', ref:a.ref});
  });
  var recentEnq=ENQS.filter(function(e){return daysAgo(e.at)<7}).length;
  if(recentEnq) items.push({t:'<b>'+recentEnq+'</b> enquiries arrived in the last 7 days - check none are waiting for a reply.', tab:'enq'});
  if(!items.length) items.push({t:'All clear - nothing is waiting on the team right now.'});
  $('#attnList').innerHTML = items.slice(0,10).map(function(it,i){
    return '<div class="aitem"><span>'+it.t+'</span>'+(it.ref? '<button class="pill-btn" data-attn="'+i+'">Open</button>' : (it.tab? '<button class="pill-btn" data-attntab="'+it.tab+'">View</button>':''))+'</div>';
  }).join('');
  $$('#attnList [data-attn]').forEach(function(b){ b.addEventListener('click', function(){ gotoApp(items[+b.getAttribute('data-attn')].ref); }); });
  $$('#attnList [data-attntab]').forEach(function(b){ b.addEventListener('click', function(){ pane(b.getAttribute('data-attntab')); }); });
  $('#latestApps').innerHTML = APPS.length ? APPS.slice(0,6).map(function(a){
    return '<div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)"><b>'+a.ref+'</b><span>'+esc(a.name)+'</span><span class="stage-chip">'+esc(STAGES[a.stage]||'')+'</span><span style="color:var(--muted);margin-left:auto">'+fmtDate(a.created)+'</span><button class="pill-btn" data-latest="'+a.ref+'">Open</button></div>';
  }).join('') : '<p class="small-note">No applications yet.</p>';
  $$('#latestApps [data-latest]').forEach(function(b){ b.addEventListener('click', function(){ gotoApp(b.getAttribute('data-latest')); }); });
  $('#enqCount').textContent = ENQS.length ? '('+ENQS.length+')' : '';
}
function gotoApp(ref){
  pane('apps');
  var idx=APPS.findIndex(function(a){return a.ref===ref});
  if(idx<0) return;
  var row=$('#detail-'+idx);
  if(row){ row.style.display='table-row'; row.scrollIntoView({behavior:'smooth', block:'center'}); }
}

/* ---------- pipeline board ---------- */
function boardVisas(){
  var sel=$('#boardVisa'); var cur=sel.value;
  var seen={}; APPS.forEach(function(a){ seen[a.visa]=1; });
  sel.innerHTML='<option value="">All visa types</option>'+Object.keys(seen).sort().map(function(v){return '<option value="'+esc(v)+'">'+esc(v)+'</option>'}).join('');
  sel.value=cur;
}
function renderBoard(){
  boardVisas();
  var q=($('#boardQ').value||'').toLowerCase(); var vf=$('#boardVisa').value;
  var list=APPS.filter(function(a){
    if(vf && a.visa!==vf) return false;
    if(q && (a.name+' '+a.ref+' '+a.pass+' '+a.nat).toLowerCase().indexOf(q)<0) return false;
    return true;
  });
  $('#boardWrap').innerHTML = STAGES.map(function(s,si){
    var cards=list.filter(function(a){return a.stage===si});
    return '<div class="bcol" data-col="'+si+'"><h4>'+esc(s)+'<span class="cnt">'+cards.length+'</span></h4>'
      + cards.map(function(a){
        return '<div class="bcard" draggable="true" data-ref="'+a.ref+'">'
        + '<div class="r">'+a.ref+(a.express?' <span style="color:#a07d1f">EXPRESS</span>':'')+(unreadClient(a)?'<span class="unread" title="Client message waiting"></span>':'')+'</div>'
        + '<div class="n">'+esc(a.name)+'</div>'
        + '<div class="m">'+esc(a.nat)+' - '+esc(a.visa)+'<br>Entry '+(esc(a.entry||'-'))+' - '+fmtDate(a.created)+'</div>'
        + '<div class="ft"><button class="mv" data-mv="-1" title="Move back">&#8249;</button><button class="mv" data-mv="1" title="Move forward">&#8250;</button><button class="pill-btn" data-open2="'+a.ref+'" style="margin-left:auto;padding:3px 11px">Open</button></div></div>';
      }).join('') + '</div>';
  }).join('');
  $$('#boardWrap .bcard').forEach(function(card){
    card.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain', card.getAttribute('data-ref')); });
    card.querySelectorAll('[data-mv]').forEach(function(b){ b.addEventListener('click', function(e){ e.stopPropagation(); moveApp(card.getAttribute('data-ref'), +b.getAttribute('data-mv')); }); });
    var ob=card.querySelector('[data-open2]'); if(ob) ob.addEventListener('click', function(e){ e.stopPropagation(); gotoApp(ob.getAttribute('data-open2')); });
  });
  $$('#boardWrap .bcol').forEach(function(col){
    col.addEventListener('dragover', function(e){ e.preventDefault(); col.classList.add('dragover'); });
    col.addEventListener('dragleave', function(){ col.classList.remove('dragover'); });
    col.addEventListener('drop', function(e){
      e.preventDefault(); col.classList.remove('dragover');
      var ref=e.dataTransfer.getData('text/plain'); var a=APPS.find(function(x){return x.ref===ref});
      var target=+col.getAttribute('data-col');
      if(a && a.stage!==target) setStage(ref, target);
    });
  });
}
function setStage(ref, stage){
  api('/api/admin/status', {method:'POST', body: JSON.stringify({ref:ref, stage:stage})}).then(function(r){ if(r.j.ok) loadData(); });
}
function moveApp(ref, dir){
  var a=APPS.find(function(x){return x.ref===ref}); if(!a) return;
  var t=Math.max(0, Math.min(STAGES.length-1, a.stage+dir));
  if(t!==a.stage) setStage(ref, t);
}
$('#boardQ').addEventListener('input', renderBoard);
$('#boardVisa').addEventListener('change', renderBoard);

/* ---------- applications (full detail) ---------- */
function renderApps(){
  var counts={}; APPS.forEach(function(a){counts[a.stage]=(counts[a.stage]||0)+1});
  $('#statRow').innerHTML = '<div class="stat"><b>'+APPS.length+'</b>Total applications</div>' + STAGES.map(function(s,i){return '<div class="stat"><b>'+(counts[i]||0)+'</b>'+esc(s)+'</div>'}).join('');
  $('#appsEmpty').style.display = APPS.length? 'none':'block';
  $('#appsBody').innerHTML = APPS.map(function(a,idx){
    var docs=(a.docs||[]).map(function(d){
      var url='/api/admin/download?ref='+a.ref+'&file='+encodeURIComponent(d.name);
      var isImg=/\.(jpe?g|png|webp)$/i.test(d.name);
      return (isImg? '<a href="'+url+'&inline=1" target="_blank"><img class="docprev" src="'+url+'&inline=1" alt=""></a>' : '') + '<a href="'+url+'" target="_blank">'+esc(d.kind)+': '+esc(d.name)+'</a>';
    }).join('<br>') || 'No documents uploaded';
    var hist=(a.history||[]).map(function(h){return '<li>'+fmtDate(h.at)+' - <b>'+esc(STAGES[h.stage]||h.stage)+'</b>'+(h.note? ' - '+esc(h.note):'')+(h.clientNote? ' - Client note: '+esc(h.clientNote):'')+(h.officialRef? ' - Official ref: '+esc(h.officialRef):'')+'</li>'}).join('');
    var opts=STAGES.map(function(s,i){return '<option value="'+i+'"'+(i===a.stage?' selected':'')+'>'+esc(s)+'</option>'}).join('');
    var waDigits=String(a.phone||'').replace(/[^0-9]/g,'');
    var quick='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">'
      + (waDigits? '<a class="pill-btn" style="text-decoration:none" target="_blank" rel="noopener" href="https://wa.me/'+waDigits+'?text='+encodeURIComponent('Hello '+a.name+', this is Visit Saudi about your application '+a.ref+' (currently: '+(STAGES[a.stage]||'')+').')+'">WhatsApp client</a>' : '')
      + (a.email? '<a class="pill-btn" style="text-decoration:none" href="mailto:'+esc(a.email)+'?subject='+encodeURIComponent('Your Saudi visa application '+a.ref)+'">Email client</a>' : '')
      + '</div>';
    var payChip=a.paid?'<span class="stage-chip" style="background:#e6f4ea;color:#137333;margin-left:6px">Paid '+(a.amount_paid?esc(a.amount_paid):'')+'</span>':(a.ziina_intent?'<span class="stage-chip" style="background:#fdf3e0;color:#8a6d1f;margin-left:6px">Payment pending</span>':'');
    return '<tr><td><b>'+a.ref+'</b>'+(unreadClient(a)?'<span class="unread" title="Client message waiting"></span>':'')+payChip+'</td><td>'+esc(a.name)+'<br><span style="color:var(--muted)">'+esc(a.nat)+' - '+esc(a.pass)+'</span></td><td>'+esc(a.visa)+(a.express?' <b style="color:#a07d1f">EXPRESS</b>':'')+'</td><td>'+esc(a.entry||'-')+'</td><td><span class="stage-chip">'+esc(STAGES[a.stage]||a.stage)+'</span></td><td>'+fmtDate(a.created)+'</td><td><button class="pill-btn" data-open="'+idx+'">Open</button></td></tr>'
    + '<tr class="detail-row" id="detail-'+idx+'" style="display:none"><td colspan="7">'
    + '<div class="grid2"><div><b>Contact</b><br>'+esc(a.email)+'<br>'+esc(a.phone)+ quick +'<br><b>Documents</b><br>'+docs+'<br><br><b>History</b><ul class="hist">'+hist+'</ul></div>'
    + '<div><label class="f">Move to stage</label><select id="stage-'+idx+'">'+opts+'</select>'
    + '<label class="f" style="margin-top:10px">Message shown to the client</label><input id="cnote-'+idx+'" placeholder="e.g. Your visa has been submitted">'
    + '<label class="f" style="margin-top:10px">Internal note</label><input id="note-'+idx+'" placeholder="Team note (not shown to client)">'
    + '<label class="f" style="margin-top:10px">Official reference</label><input id="oref-'+idx+'" placeholder="Authority application no.">'
    + '<button class="btn small" style="margin-top:14px" data-save="'+idx+'">Save Update</button> <span id="saved-'+idx+'" style="color:var(--green);font-weight:700"></span></div></div>'
    + '<div style="margin-top:22px;border-top:1px dashed var(--line);padding-top:16px"><b>Payment</b>'
    + (a.paid ? '<p style="margin:8px 0">Paid <b>'+esc(a.amount_paid||'')+'</b>'+(a.paid_at?' on '+fmtDate(a.paid_at):'')+' via Ziina.</p>'
      : (a.ziina_intent ? '<p style="margin:8px 0;color:var(--muted)">Payment started but not confirmed yet (Ziina intent '+esc(a.ziina_intent)+'). If the client paid and closed the browser, check the status here.</p><button class="pill-btn" data-paycheck="'+idx+'">Check payment status</button> <span id="pay-saved-'+idx+'" style="color:var(--green);font-weight:700"></span>'
      : '<p style="margin:8px 0;color:var(--muted)">No online payment for this application.</p>'))
    + '</div>'
    + '<div style="margin-top:22px;border-top:1px dashed var(--line);padding-top:16px"><b>Conversation with the client</b>'
    + '<div id="msgs-'+idx+'" style="margin:10px 0;display:flex;flex-direction:column;gap:7px">' + msgHtml(a.messages) + '</div>'
    + '<div style="display:flex;gap:8px"><input id="msg-'+idx+'" placeholder="Reply to the client..." style="flex:1"><button class="pill-btn" data-msg="'+idx+'">Send reply</button></div></div>'
    + '<div style="margin-top:22px;border-top:1px dashed var(--line);padding-top:16px"><b>Case resolution (shown on the client tracking page)</b>'
    + '<div class="grid2" style="margin-top:10px"><div><label class="f">Status</label><select id="res-status-'+idx+'">' + ['', 'Refund approved','Refund processed','Additional documents requested','Case resolved','Other update'].map(function(s){return '<option value="'+s+'"'+(a.resolution&&a.resolution.status===s?' selected':'')+'>'+(s||'None - no resolution shown')+'</option>'}).join('') + '</select></div>'
    + '<div><label class="f">Amount (if any)</label><input id="res-amount-'+idx+'" value="'+esc(a.resolution?a.resolution.amount||'':'')+'" placeholder="e.g. AED 450"></div></div>'
    + '<div class="grid2"><div><label class="f">Date (if any)</label><input id="res-date-'+idx+'" type="date" value="'+esc(a.resolution?a.resolution.date||'':'')+'"></div>'
    + '<div><label class="f">Proof document (optional)</label><input id="res-proof-'+idx+'" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"></div></div>'
    + '<label class="f" style="margin-top:8px">Comment shown to the client</label><input id="res-comment-'+idx+'" value="'+esc(a.resolution?a.resolution.comment||'':'')+'" placeholder="Client-facing explanation">'
    + '<button class="pill-btn" style="margin-top:10px" data-res="'+idx+'">Save resolution</button> <span id="res-saved-'+idx+'" style="color:var(--green);font-weight:700"></span></div>'
    + '<div style="margin-top:22px;border-top:1px dashed var(--line);padding-top:16px"><b>Issued eVisa document</b>'
    + '<p style="margin:8px 0;color:var(--muted)">'+(a.issuedDoc? 'Current file: <b>'+esc(a.issuedDoc.name)+'</b> - the client can download it from their tracking page.' : 'No issued document uploaded yet. Upload the final eVisa PDF and the client can download it from their tracking page.')+'</p>'
    + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><input id="iss-file-'+idx+'" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"><button class="pill-btn" data-iss="'+idx+'">Upload issued document</button> <span id="iss-saved-'+idx+'" style="color:var(--green);font-weight:700"></span></div></div>'
    + '</td></tr>';
  }).join('');
  $$('[data-open]').forEach(function(b){ b.addEventListener('click', function(){
    var row=$('#detail-'+b.getAttribute('data-open'));
    row.style.display = row.style.display==='none' ? 'table-row':'none';
  });});
  function readFile(inp, cb){
    var f=inp.files && inp.files[0]; if(!f) return cb(null);
    var rd=new FileReader(); rd.onload=function(){ cb({data: rd.result, name: f.name}); }; rd.readAsDataURL(f);
  }
  $$('[data-msg]').forEach(function(b){ b.addEventListener('click', function(){
    var i=b.getAttribute('data-msg'); var a=APPS[i]; var text=$('#msg-'+i).value.trim(); if(!text) return;
    api('/api/admin/message', {method:'POST', body: JSON.stringify({ref:a.ref, text:text})}).then(function(r){
      if(r.j.ok){ $('#msg-'+i).value=''; $('#msgs-'+i).innerHTML=msgHtml(r.j.messages); a.messages=r.j.messages; }
    });
  });});
  $$('[data-res]').forEach(function(b){ b.addEventListener('click', function(){
    var i=b.getAttribute('data-res'); var a=APPS[i];
    var body={ref:a.ref, status: $('#res-status-'+i).value, amount: $('#res-amount-'+i).value, date: $('#res-date-'+i).value, comment: $('#res-comment-'+i).value};
    readFile($('#res-proof-'+i), function(fd){
      if(fd){ body.proofData=fd.data; body.proofName=fd.name; }
      api('/api/admin/resolution', {method:'POST', body: JSON.stringify(body)}).then(function(r){
        if(r.j.ok) $('#res-saved-'+i).textContent = body.status ? 'Saved - visible on the client tracking page.' : 'Resolution cleared.';
      });
    });
  });});
  $$('[data-iss]').forEach(function(b){ b.addEventListener('click', function(){
    var i=b.getAttribute('data-iss'); var a=APPS[i];
    readFile($('#iss-file-'+i), function(fd){
      if(!fd){ $('#iss-saved-'+i).textContent='Choose a file first.'; return; }
      api('/api/admin/issued', {method:'POST', body: JSON.stringify({ref:a.ref, data: fd.data, name: fd.name})}).then(function(r){
        if(r.j.ok){ $('#iss-saved-'+i).textContent='Uploaded - the client can now download it.'; loadData(); }
        else $('#iss-saved-'+i).textContent = r.j.error || 'Upload failed.';
      });
    });
  });});
  $$('[data-save]').forEach(function(b){ b.addEventListener('click', function(){
    var i=b.getAttribute('data-save'); var a=APPS[i];
    api('/api/admin/status', {method:'POST', body: JSON.stringify({ref:a.ref, stage: $('#stage-'+i).value, clientNote: $('#cnote-'+i).value, note: $('#note-'+i).value, officialRef: $('#oref-'+i).value})}).then(function(r){
      if(r.j.ok){ $('#saved-'+i).textContent='Saved - the client tracking page now shows this stage.'; loadData(); }
    });
  });});
  $$('[data-paycheck]').forEach(function(b){ b.addEventListener('click', function(){
    var i=b.getAttribute('data-paycheck'); var a=APPS[i]; var out=$('#pay-saved-'+i);
    b.disabled=true; b.textContent='Checking...';
    api('/api/admin/pay/check', {method:'POST', body: JSON.stringify({ref:a.ref})}).then(function(r){
      if(r.j && r.j.ok){ a.paid=r.j.paid; a.pay_status=r.j.pay_status; a.amount_paid=r.j.amount_paid; renderApps(); if(out) out.textContent = r.j.paid ? 'Payment confirmed.' : 'Still unpaid.'; }
      else { b.disabled=false; b.textContent='Check payment status'; if(out) out.textContent='Could not check - try again.'; }
    }).catch(function(){ b.disabled=false; b.textContent='Check payment status'; });
  });});
}
function msgHtml(msgs){
  return (msgs||[]).length ? msgs.map(function(m){return '<div style="max-width:88%;padding:8px 11px;border-radius:11px;font-size:.9rem;'+(m.from==='team'?'background:#eef6ea;align-self:flex-start':'background:#fdf6e0;align-self:flex-end')+'"><b>'+(m.from==='team'?'Team':'Client')+'</b> - '+esc(m.text)+'<br><span style="color:var(--muted);font-size:.76rem">'+fmtDate(m.at)+'</span></div>'}).join('') : '<span style="color:var(--muted)">No messages yet.</span>';
}

/* ---------- enquiries ---------- */
function renderEnq(){
  $('#enqEmpty').style.display=ENQS.length? 'none':'block';
  $('#enqList').innerHTML=ENQS.map(function(e){
    var digits=String(e.phone||'').replace(/[^0-9]/g,'');
    return '<div style="border:1px solid var(--line);border-radius:13px;padding:16px 18px;margin-bottom:11px"><b>'+esc(e.name)+'</b> <span style="color:var(--muted)">'+esc(e.email||'')+(e.phone?' - '+esc(e.phone):'')+' - '+esc(e.topic||'')+' - '+fmtDate(e.at)+'</span><p style="margin-top:6px">'+esc(e.msg)+'</p>'
    + (digits.length>=7? '<a class="pill-btn" style="text-decoration:none" target="_blank" rel="noopener" href="https://wa.me/'+digits+'?text='+encodeURIComponent('Hello '+e.name+', this is Visit Saudi replying to your enquiry.')+'">Reply on WhatsApp</a>' : '')
    + '</div>';
  }).join('');
}

/* ---------- new application ---------- */
$('#createBtn').addEventListener('click', function(){
  var err=$('#newErr'); err.style.display='none'; $('#newDone').textContent='';
  api('/api/admin/create', {method:'POST', body: JSON.stringify({name:$('#n-name').value, pass:$('#n-pass').value, nat:$('#n-nat').value, visa:$('#n-visa').value, email:$('#n-email').value, phone:$('#n-phone').value, entry:$('#n-entry').value})}).then(function(r){
    if(r.j.ok){ $('#newDone').textContent='Created - reference ' + r.j.ref + '. The client can track with this reference and their passport number.'; loadData(); }
    else { err.textContent=r.j.error||'Could not create.'; err.style.display='block'; }
  });
});

/* ---------- customers ---------- */
function loadCustomers(){
  api('/api/admin/customers').then(function(r){
    if(r.status===401) return showLogin();
    var list=r.j.customers||[];
    $('#custList').innerHTML = list.length ? list.map(function(c,ci){
      return '<div class="panelbox" style="margin-bottom:13px"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:baseline"><b style="font-size:1.05rem">'+esc(c.name)+'</b><span style="color:var(--muted)">'+esc(c.nat||'')+' - '+esc(c.email||'')+' - '+esc(c.phone||'')+' - Passport '+esc(c.pass||'')+'</span><span style="margin-left:auto" class="tagchip">'+c.apps.length+' application'+(c.apps.length>1?'s':'')+'</span></div>'
      + '<div style="margin:10px 0">' + c.apps.map(function(a){ return '<span class="tagchip">'+a.ref+' - '+esc(a.visa)+' - '+esc(STAGES[a.stage]||'')+'</span>'; }).join('') + '</div>'
      + '<div style="display:flex;gap:8px"><input id="cnote2-'+ci+'" placeholder="Private team note about this customer..." value="'+esc(c.note||'')+'" style="flex:1"><button class="pill-btn" data-cnote="'+ci+'">Save note</button> <span class="okmsg" id="cnote2ok-'+ci+'"></span></div></div>';
    }).join('') : '<p class="small-note">No customers yet - they appear here after the first application.</p>';
    $$('[data-cnote]').forEach(function(b){ b.addEventListener('click', function(){
      var ci=+b.getAttribute('data-cnote'); var c=list[ci];
      api('/api/admin/customers/note', {method:'POST', body: JSON.stringify({key:c.key, note:$('#cnote2-'+ci).value})}).then(function(r){ if(r.j.ok) $('#cnote2ok-'+ci).textContent='Saved'; });
    });});
  });
}

/* ---------- analytics ---------- */
function loadStats(){
  api('/api/admin/stats').then(function(r){
    if(!r.j.ok) return;
    var f=r.j.funnel||{};
    $('#statsKpis').innerHTML =
      '<div class="kpi"><b>'+(f.view||0)+'</b><span>Page views (all time)</span></div>'
      + '<div class="kpi"><b>'+(f.checker||0)+'</b><span>Eligibility checks</span></div>'
      + '<div class="kpi"><b>'+(f.apply_start||0)+'</b><span>Applications started</span></div>'
      + '<div class="kpi"><b>'+(f.apply_done||0)+'</b><span>Applications submitted</span></div>'
      + '<div class="kpi"><b>'+(f.whatsapp||0)+'</b><span>WhatsApp clicks</span></div>';
    var days=r.j.days||{}; var arr=[]; var max=1;
    for(var i=13;i>=0;i--){ var d=new Date(); d.setDate(d.getDate()-i); var k=d.toISOString().slice(0,10); var v=days[k]||0; if(v>max)max=v; arr.push({k:k.slice(5), v:v}); }
    $('#dayBars').innerHTML = arr.map(function(x){ return '<div class="db" style="height:'+Math.max(3, Math.round(x.v/max*100))+'%" title="'+x.k+': '+x.v+'"><span>'+x.k+'</span></div>'; }).join('');
    var tbl=function(rows){ return rows.length? '<table class="apps"><tbody>'+rows.map(function(x){ return '<tr><td>'+esc(x.k)+'</td><td style="text-align:right"><b>'+x.v+'</b></td></tr>'; }).join('')+'</tbody></table>' : '<p class="small-note">No data yet.</p>'; };
    $('#topPages').innerHTML = tbl(r.j.topPages||[]);
    $('#topNats').innerHTML = tbl(r.j.topNats||[]);
  });
}

/* ---------- blog: WordPress-style list + editor ---------- */
var BLOGPOSTS=[]; var GUIDES=[]; var blogMode=null; var BFILTER='all';
function showBlogList(){ $('#blogListView').style.display='block'; $('#blogEditorView').style.display='none'; }
function showBlogEditor(){ $('#blogListView').style.display='none'; $('#blogEditorView').style.display='block'; window.scrollTo({top:0, behavior:'smooth'}); }
function loadBlog(){
  api('/api/admin/blog').then(function(r1){
    BLOGPOSTS=r1.j.posts||[];
    api('/api/admin/guides').then(function(r2){ GUIDES=r2.j.guides||[]; renderBlogList(); });
  });
}
function blogRowMeta(badges, url, cat, excerpt){
  return '<div><b>'+badges.t+'</b> '+badges.b+'<br><span class="small-note">'+url+(cat?' - '+esc(cat):'')+'</span>'+(excerpt? '<br><span class="small-note">'+esc(excerpt.length>130? excerpt.slice(0,130)+'...' : excerpt)+'</span>':'')+'</div>';
}
function renderBlogList(){
  var q=(($('#g-q')||{}).value||'').toLowerCase();
  var rows=[];
  BLOGPOSTS.forEach(function(p){
    if(BFILTER==='guide'||BFILTER==='edited') return;
    if(BFILTER==='hidden' && p.published!==false) return;
    if(q && (p.title+' '+p.slug).toLowerCase().indexOf(q)<0) return;
    rows.push('<div style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--line)">'
      + blogRowMeta({t:esc(p.title), b:'<span class="tagchip">Team post</span>'+(p.published===false?' <span class="tagchip">Draft</span>':'')}, '/blog-post?slug='+esc(p.slug), p.cat, p.excerpt)
      + '<span style="margin-left:auto;display:flex;gap:7px;flex:none"><a class="pill-btn" style="text-decoration:none" target="_blank" href="/blog-post?slug='+esc(p.slug)+'">View</a><button class="pill-btn" data-bed="'+esc(p.slug)+'">Edit</button><button class="pill-btn" data-bdel="'+esc(p.slug)+'">Delete</button></span></div>');
  });
  GUIDES.forEach(function(g){
    if(BFILTER==='team') return;
    if(BFILTER==='edited' && !g.edited) return;
    if(BFILTER==='hidden' && g.published!==false) return;
    if(q && (g.title+' '+g.slug).toLowerCase().indexOf(q)<0) return;
    rows.push('<div style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--line)">'
      + blogRowMeta({t:esc(g.title), b:'<span class="tagchip">Guide</span>'+(g.edited?' <span class="tagchip">Edited</span>':'')+(g.published===false?' <span class="tagchip">Hidden</span>':'')}, '/guides/'+esc(g.slug), g.cat, g.excerpt)
      + '<span style="margin-left:auto;display:flex;gap:7px;flex:none"><a class="pill-btn" style="text-decoration:none" target="_blank" href="/guides/'+esc(g.slug)+'">View</a><button class="pill-btn" data-ged="'+esc(g.slug)+'">Edit</button></span></div>');
  });
  $('#blogList').innerHTML = rows.length ? rows.join('') : '<p class="small-note">Nothing matches. Try another filter or search.</p>';
  $$('[data-bed]').forEach(function(b){ b.addEventListener('click', function(){ openTeamPost(b.getAttribute('data-bed')); }); });
  $$('[data-bdel]').forEach(function(b){ b.addEventListener('click', function(){
    var slug=b.getAttribute('data-bdel'); var p=BLOGPOSTS.filter(function(x){return x.slug===slug})[0];
    if(!confirm('Delete the post "'+(p? p.title : slug)+'"?')) return;
    api('/api/admin/blog/delete', {method:'POST', body: JSON.stringify({slug:slug})}).then(loadBlog);
  });});
  $$('[data-ged]').forEach(function(b){ b.addEventListener('click', function(){ loadGuideEdit(b.getAttribute('data-ged')); }); });
}
function blogPermalink(){
  var el=$('#b-permalink'), v=$('#b-view');
  if(blogMode && blogMode.type==='guide'){ el.textContent='On the website: /guides/'+blogMode.slug; v.href='/guides/'+blogMode.slug; v.style.display='inline-block'; }
  else if(blogMode && blogMode.type==='team'){ el.textContent='On the website: /blog-post?slug='+blogMode.slug; v.href='/blog-post?slug='+blogMode.slug; v.style.display='inline-block'; }
  else { el.textContent='A new team post - it will open at /blog-post once saved.'; v.style.display='none'; }
}
function updateImgPrev(){ var u=$('#b-image').value.trim(); var im=$('#b-imgprev'); if(u){ im.src=u; im.style.display='block'; im.onerror=function(){ im.style.display='none'; }; } else im.style.display='none'; }
function updateWords(){ var t=$('#b-body').value.trim(); $('#b-words').textContent = t? (t.split(/\s+/).length+' words') : ''; }
function fillBlogForm(o){
  $('#b-title').value=o.title||''; $('#b-cat').value=o.cat||''; $('#b-slug').value=o.slug||''; $('#b-image').value=o.image||''; $('#b-excerpt').value=o.excerpt||''; $('#b-body').value=o.body||''; $('#b-published').checked=o.published!==false;
  updateImgPrev(); updateWords(); blogPermalink();
}
function openTeamPost(slug){
  var p=BLOGPOSTS.filter(function(x){return x.slug===slug})[0]; if(!p) return;
  blogMode={type:'team', slug:p.slug};
  $('#blogFormTitle').textContent='Edit post';
  $('#b-slug').disabled=false; $('#blogReset').style.display='none'; $('#blogSaved').textContent='';
  fillBlogForm(p);
  showBlogEditor();
}
function loadGuideEdit(slug){
  var g=GUIDES.filter(function(x){return x.slug===slug})[0]; if(!g) return;
  api('/api/admin/guides?slug='+encodeURIComponent(slug)).then(function(r){
    if(!r.j.ok){ return; }
    blogMode={type:'guide', slug:slug};
    $('#blogFormTitle').textContent='Edit guide';
    $('#b-slug').disabled=true; $('#blogReset').style.display='inline-block';
    $('#blogSaved').textContent='Editing the built-in guide /guides/'+slug+'. Untick Published to hide it from the site.';
    fillBlogForm({ title:r.j.guide.title, cat:r.j.guide.cat, slug:slug, image:r.j.guide.image, excerpt:r.j.guide.excerpt, body:r.j.bodyText, published:r.j.guide.published });
    showBlogEditor();
  });
}
function resetBlogForm(){
  blogMode=null; $('#blogFormTitle').textContent='Write a post';
  $('#b-slug').disabled=false; $('#blogReset').style.display='none'; $('#blogSaved').textContent='';
  fillBlogForm({});
}
$('#blogBack').addEventListener('click', showBlogList);
$('#blogAddNew').addEventListener('click', function(){ resetBlogForm(); showBlogEditor(); });
$('#blogClear').addEventListener('click', resetBlogForm);
$$('#blogFilters .bfbtn').forEach(function(b){ b.addEventListener('click', function(){
  BFILTER=b.getAttribute('data-bf');
  $$('#blogFilters .bfbtn').forEach(function(x){ x.classList.toggle('on', x===b); });
  renderBlogList();
});});
$('#g-q').addEventListener('input', renderBlogList);
$('#b-image').addEventListener('input', updateImgPrev);
$('#b-uploadBtn').addEventListener('click', function(){ $('#b-file').click(); });
$('#b-file').addEventListener('change', function(){
  var f=this.files && this.files[0]; this.value=''; if(!f) return;
  $('#b-upmsg').textContent='Uploading...';
  var rd=new FileReader();
  rd.onload=function(){
    api('/api/admin/media', {method:'POST', body: JSON.stringify({data: rd.result, name: f.name})}).then(function(r){
      if(r.j.ok){ $('#b-image').value=r.j.url; updateImgPrev(); $('#b-upmsg').textContent='Uploaded - the photo is set.'; }
      else $('#b-upmsg').textContent=r.j.error||'Upload failed.';
    });
  };
  rd.readAsDataURL(f);
});
$('#b-body').addEventListener('input', updateWords);
$$('[data-ins]').forEach(function(b){ b.addEventListener('click', function(){
  var ta=$('#b-body'); var kind=b.getAttribute('data-ins');
  var st=ta.selectionStart||0, en=ta.selectionEnd||0;
  if(kind==='para'){ ta.value=ta.value.slice(0,st)+'\n\n'+ta.value.slice(en); ta.focus(); ta.selectionStart=ta.selectionEnd=st+2; }
  else {
    var lineStart=ta.value.lastIndexOf('\n', st-1)+1;
    var mark=kind==='h2'? '## ' : '### ';
    var cur=ta.value.slice(lineStart, lineStart+4);
    if(cur.indexOf(mark)!==0){ ta.value=ta.value.slice(0,lineStart)+mark+ta.value.slice(lineStart); }
    ta.focus(); ta.selectionStart=ta.selectionEnd=st+mark.length;
  }
  updateWords();
});});
$('#blogReset').addEventListener('click', function(){
  if(!blogMode || blogMode.type!=='guide') return;
  if(!confirm('Reset this guide to its original built-in version? Your edits to it will be removed.')) return;
  api('/api/admin/guides/reset', {method:'POST', body: JSON.stringify({slug:blogMode.slug})}).then(function(r){
    if(r.j.ok){ $('#blogSaved').textContent='Guide reset to the original.'; loadBlog(); }
  });
});
$('#blogSave').addEventListener('click', function(){
  var common={ title:$('#b-title').value, cat:$('#b-cat').value, image:$('#b-image').value, excerpt:$('#b-excerpt').value, body:$('#b-body').value, published:$('#b-published').checked };
  if(!common.title.trim()){ $('#blogSaved').textContent='A title is required.'; return; }
  if(blogMode && blogMode.type==='guide'){
    api('/api/admin/guides/edit', {method:'POST', body: JSON.stringify(Object.assign({}, common, {slug:blogMode.slug}))}).then(function(r){
      if(r.j.ok){ $('#blogSaved').textContent='Guide saved - live on the website now.'; blogPermalink(); loadBlog(); }
      else $('#blogSaved').textContent=r.j.error||'Could not save.';
    });
    return;
  }
  var body=Object.assign({}, common, {slug:$('#b-slug').value || (blogMode? blogMode.slug : '')});
  api('/api/admin/blog', {method:'POST', body: JSON.stringify(body)}).then(function(r){
    if(r.j.ok){ $('#blogSaved').textContent='Saved - live on the Guides page.'; blogMode={type:'team', slug:r.j.slug}; $('#b-slug').value=r.j.slug; blogPermalink(); loadBlog(); }
    else $('#blogSaved').textContent=r.j.error||'Could not save.';
  });
});

/* ---------- reviews ---------- */
function loadReviews(){
  api('/api/admin/reviews').then(function(r){
    if(!r.j.ok) return;
    var list=r.j.reviews||[];
    $('#revList').innerHTML = list.length ? list.map(function(rv,i){
      return '<div style="padding:11px 0;border-bottom:1px solid var(--line)"><div style="display:flex;gap:9px;align-items:baseline;flex-wrap:wrap"><b>'+esc(rv.name)+'</b><span style="color:#b98a1c">'+'★'.repeat(rv.rating||5)+'</span><span class="small-note">'+esc(rv.visa||'')+' - '+esc(rv.country||'')+' - '+esc(rv.date||'')+'</span><span style="margin-left:auto;display:flex;gap:7px;align-items:center"><label style="font-weight:700;font-size:.86rem"><input type="checkbox" data-rvis="'+i+'"'+(rv.visible===false?'':' checked')+' style="width:auto"> Visible</label><button class="pill-btn" data-rdel="'+i+'">Delete</button></span></div><p style="margin-top:5px">'+esc(rv.text)+'</p></div>';
    }).join('') : '<p class="small-note">No reviews yet - the homepage section appears when the first visible review is added.</p>';
    $$('[data-rvis]').forEach(function(c){ c.addEventListener('change', function(){
      api('/api/admin/reviews/visible', {method:'POST', body: JSON.stringify({index:+c.getAttribute('data-rvis'), visible:c.checked})}).then(loadReviews);
    });});
    $$('[data-rdel]').forEach(function(b){ b.addEventListener('click', function(){
      if(!confirm('Delete this review?')) return;
      api('/api/admin/reviews/delete', {method:'POST', body: JSON.stringify({index:+b.getAttribute('data-rdel')})}).then(loadReviews);
    });});
  });
}
$('#revSave').addEventListener('click', function(){
  var body={ name:$('#r-name').value, country:$('#r-country').value, visa:$('#r-visa').value, rating:$('#r-rating').value, text:$('#r-text').value, visible:true };
  if(!body.name.trim() || !body.text.trim()){ $('#revSaved').textContent='Name and review text are required.'; return; }
  api('/api/admin/reviews', {method:'POST', body: JSON.stringify(body)}).then(function(r){
    if(r.j.ok){ $('#revSaved').textContent='Added - now showing on the homepage.'; ['r-name','r-country','r-visa','r-text'].forEach(function(id){ $('#'+id).value=''; }); loadReviews(); }
  });
});

/* ---------- prices ---------- */
function loadPrices(){
  loadSettings(function(s){
    var prices=(s&&s.prices)||{};
    $('#priceRows').innerHTML = PRICE_VISAS.map(function(v){
      var p=prices[v[0]]||{};
      return '<div style="display:grid;grid-template-columns:1fr 130px 100px;gap:10px;align-items:center;padding:7px 0;border-bottom:1px solid var(--line)"><span><b>'+esc(v[1])+'</b><br><span class="small-note">/visa/'+v[0]+'</span></span>'
      + '<input class="inp" type="number" min="0" step="any" id="pr-'+v[0]+'" value="'+(p.amount!==undefined?p.amount:'')+'" placeholder="No price">'
      + '<input class="inp" id="pc-'+v[0]+'" value="'+esc(p.currency||'AED')+'" maxlength="5"></div>';
    }).join('');
  });
}
$('#priceSave').addEventListener('click', function(){
  var prices={};
  PRICE_VISAS.forEach(function(v){
    var amt=parseFloat($('#pr-'+v[0]).value);
    if(!isNaN(amt) && amt>0) prices[v[0]]={amount:amt, currency:($('#pc-'+v[0]).value||'AED').toUpperCase()};
  });
  api('/api/admin/settings', {method:'POST', body: JSON.stringify({prices:prices})}).then(function(r){
    if(r.j.ok){ $('#priceSaved').textContent='Saved - prices are live on the site.'; SETTINGS=null; }
    else $('#priceSaved').textContent='Could not save.';
  });
});

/* ---------- content editor ---------- */
var clSel=$('#c-lang');
clSel.innerHTML = LANGS.map(function(l){ return '<option value="'+l[0]+'">'+l[1]+'</option>'; }).join('');
function loadContent(){
  var lang=clSel.value; var q=$('#c-q').value.trim();
  $('#contentList').innerHTML='<p class="small-note">Searching...</p>';
  api('/api/admin/content?lang='+encodeURIComponent(lang)+'&q='+encodeURIComponent(q)).then(function(r){
    if(!r.j.ok){ $('#contentList').innerHTML='<p class="small-note">Could not load.</p>'; return; }
    $('#contentList').innerHTML = '<p class="small-note">'+r.j.strings.length+' shown of '+r.j.total+' texts - language: '+esc(lang)+'</p>' + r.j.strings.map(function(it,i){
      return '<div style="padding:11px 0;border-bottom:1px solid var(--line)"><div class="small-note" style="margin-bottom:6px">Original: '+esc(it.src)+(it.edited?' <span class="tagchip">edited</span>':'')+'</div>'
      + '<div style="display:flex;gap:8px"><textarea class="ta" rows="2" id="ct-'+i+'">'+esc(it.current)+'</textarea><button class="pill-btn" data-csave="'+i+'" style="flex:none">Save</button></div></div>';
    }).join('');
    $$('[data-csave]').forEach(function(b){ b.addEventListener('click', function(){
      var i=+b.getAttribute('data-csave'); var it=r.j.strings[i];
      api('/api/admin/content', {method:'POST', body: JSON.stringify({lang:lang, src:it.src, value:$('#ct-'+i).value})}).then(function(rr){
        if(rr.j.ok){ b.textContent='Saved'; setTimeout(function(){ b.textContent='Save'; }, 1500); }
      });
    });});
  });
}
$('#c-search').addEventListener('click', loadContent);
clSel.addEventListener('change', loadContent);
$('#c-q').addEventListener('keydown', function(e){ if(e.key==='Enter') loadContent(); });

/* ---------- media ---------- */
function loadMedia(){
  api('/api/admin/media').then(function(r){
    if(!r.j.ok) return;
    var files=r.j.files||[];
    var ups=files.filter(function(f){return !f.builtin}), blt=files.filter(function(f){return f.builtin});
    var card=function(f, canDel){
      return '<figure><img src="'+esc(f.url)+'" alt="" loading="lazy"><figcaption>'+esc(f.url)+'</figcaption><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="pill-btn" data-mcopy="'+esc(f.url)+'">Copy link</button><button class="pill-btn" data-muse="'+esc(f.url)+'">Use in blog</button>'+(canDel? '<button class="pill-btn" data-mdel="'+esc(f.name)+'">Delete</button>':'')+'</div></figure>';
    };
    $('#mediaGrid').innerHTML = ups.length ? ups.map(function(f){return card(f,true)}).join('') : '<p class="small-note">No uploads yet.</p>';
    var bg=$('#mediaBuiltin'); if(bg) bg.innerHTML = blt.length ? blt.map(function(f){return card(f,false)}).join('') : '<p class="small-note">No built-in photos found.</p>';
    $$('[data-mcopy]').forEach(function(b){ b.addEventListener('click', function(){
      var u=b.getAttribute('data-mcopy');
      if(navigator.clipboard) navigator.clipboard.writeText(u); b.textContent='Copied'; setTimeout(function(){ b.textContent='Copy link'; }, 1300);
    });});
    $$('[data-muse]').forEach(function(b){ b.addEventListener('click', function(){ pane('blog'); if(!blogMode) resetBlogForm(); showBlogEditor(); $('#b-image').value=b.getAttribute('data-muse'); updateImgPrev(); }); });
    $$('[data-mdel]').forEach(function(b){ b.addEventListener('click', function(){
      if(!confirm('Delete this photo? Blog posts using it will lose the image.')) return;
      api('/api/admin/media/delete', {method:'POST', body: JSON.stringify({name:b.getAttribute('data-mdel')})}).then(loadMedia);
    });});
  });
}
$('#m-upload').addEventListener('click', function(){
  var inp=$('#m-file'); var f=inp.files && inp.files[0];
  if(!f){ $('#m-saved').textContent='Choose a photo first.'; return; }
  var rd=new FileReader();
  rd.onload=function(){
    api('/api/admin/media', {method:'POST', body: JSON.stringify({data: rd.result, name: f.name})}).then(function(r){
      if(r.j.ok){ $('#m-saved').textContent='Uploaded: '+r.j.url; loadMedia(); }
      else $('#m-saved').textContent=r.j.error||'Upload failed.';
    });
  };
  rd.readAsDataURL(f);
});

/* ---------- settings ---------- */
function loadSettings(cb){
  if(SETTINGS) { cb && cb(SETTINGS); return; }
  api('/api/admin/settings').then(function(r){ if(r.j.ok){ SETTINGS=r.j.settings; cb && cb(SETTINGS); } });
}
function loadSettingsForm(){
  loadSettings(function(s){
    $('#s-whatsapp').value=s.whatsapp||''; $('#s-email').value=s.email||''; $('#s-notify').value=s.notifyEmail||'';
    $('#s-host').value=s.smtp.host||''; $('#s-port').value=s.smtp.port||587; $('#s-user').value=s.smtp.user||''; $('#s-from').value=s.smtp.from||'';
    $('#s-pass').placeholder = s.smtp.hasPass ? 'A password is saved - leave empty to keep it' : 'SMTP password / app password';
    var pm=s.payments||{};
    $('#pay-enabled').checked=!!pm.enabled; $('#pay-provider').value=pm.provider||''; $('#pay-mode').value=pm.mode||'test'; $('#pay-pub').value=pm.pubKey||'';
    $('#pay-secret').placeholder = pm.hasSecret ? 'A secret key is saved - leave empty to keep it' : 'Secret key';
    $('#pay-webhook').placeholder = pm.hasWebhook ? 'A webhook secret is saved - leave empty to keep it' : 'Webhook secret';
  });
}
$('#setSave').addEventListener('click', function(){
  var body={ whatsapp:$('#s-whatsapp').value, email:$('#s-email').value, notifyEmail:$('#s-notify').value,
    smtp:{ host:$('#s-host').value, port:$('#s-port').value, user:$('#s-user').value, from:$('#s-from').value, pass:$('#s-pass').value } };
  api('/api/admin/settings', {method:'POST', body: JSON.stringify(body)}).then(function(r){
    if(r.j.ok){ $('#setSaved').textContent='Saved.'; SETTINGS=null; }
    else $('#setSaved').textContent='Could not save.';
  });
});
$('#paySave').addEventListener('click', function(){
  var body={ payments:{ enabled:$('#pay-enabled').checked, provider:$('#pay-provider').value, mode:$('#pay-mode').value, pubKey:$('#pay-pub').value, secretKey:$('#pay-secret').value, webhookSecret:$('#pay-webhook').value } };
  api('/api/admin/settings', {method:'POST', body: JSON.stringify(body)}).then(function(r){
    if(r.j.ok){ $('#paySaved').textContent='Saved.'; $('#pay-secret').value=''; $('#pay-webhook').value=''; SETTINGS=null; }
    else $('#paySaved').textContent='Could not save.';
  });
});
$('#testBtn').addEventListener('click', function(){
  var to=$('#s-test').value.trim(); if(!to){ $('#testRes').textContent='Enter an email address.'; return; }
  $('#testRes').textContent='Sending...';
  api('/api/admin/test-email', {method:'POST', body: JSON.stringify({to:to})}).then(function(r){
    $('#testRes').textContent = r.j.ok ? 'Test email sent - check the inbox.' : 'Failed - check the SMTP settings are saved and correct.';
    $('#testRes').style.color = r.j.ok ? 'var(--green)' : '#b3541e';
  });
});

/* ---------- backup restore ---------- */
$('#bkRestore').addEventListener('click', function(){
  var inp=$('#bk-file'); var f=inp.files && inp.files[0];
  if(!f){ $('#bkRes').textContent='Choose a backup file first.'; return; }
  if(!confirm('Restore this backup? It REPLACES the current applications, enquiries, blog, reviews and settings.')) return;
  var rd=new FileReader();
  rd.onload=function(){
    var data; try { data=JSON.parse(rd.result); } catch(e){ $('#bkRes').textContent='That file is not valid JSON.'; return; }
    api('/api/admin/restore', {method:'POST', body: JSON.stringify({data:data})}).then(function(r){
      $('#bkRes').textContent = r.j.ok ? 'Restored - refreshing...' : 'Restore failed.';
      if(r.j.ok) setTimeout(function(){ location.reload(); }, 900);
    });
  };
  rd.readAsText(f);
});


/* ---------- quick edits ---------- */
var QUICK_TICKER=['Tourist eVisa for 72 countries','Free eligibility check - takes about 10 seconds','Checked by a specialist before submission','Track your application at every stage','No payment to start - your total is confirmed in writing first','Umrah on a tourist eVisa outside Hajj season','Here in 19 languages'];
var QUICK_TEXTS=[['Offer pop-up heading','Not sure which Saudi visa fits you?'],['Offer pop-up text','A specialist checks your route free and replies on WhatsApp - no payment to start.'],['Homepage headline','Your Saudi visa, sorted properly.'],['Homepage sub-headline','Tourist eVisas, family visits, Umrah, business and stopovers - checked by a specialist before submission, tracked at every stage, with the full cost confirmed before you pay.']];
function quickRows(el, items, prefix){
  el.innerHTML = items.map(function(it,i){ var src=Array.isArray(it)? it[1]: it; var label=Array.isArray(it)? it[0]: ('Ticker line '+(i+1));
    return '<div class="field"><label class="f">'+esc(label)+'</label><input class="inp" id="'+prefix+'-'+i+'"></div>'; }).join('');
  items.forEach(function(it,i){ $('#'+prefix+'-'+i).value = Array.isArray(it)? it[1]: it; });
}
function quickFill(items, prefix){
  items.forEach(function(it,i){ var src=Array.isArray(it)? it[1]: it;
    api('/api/admin/content?lang=en&q='+encodeURIComponent(src.slice(0,24))).then(function(r){
      var row=(r.j.strings||[]).filter(function(x){return x.src===src})[0];
      if(row) $('#'+prefix+'-'+i).value=row.current;
    });
  });
}
function quickSave(items, prefix, statusEl){
  var chain=Promise.resolve(); var n=0;
  items.forEach(function(it,i){ var src=Array.isArray(it)? it[1]: it; var val=$('#'+prefix+'-'+i).value;
    chain=chain.then(function(){ return api('/api/admin/content', {method:'POST', body: JSON.stringify({lang:'en', src:src, value:val})}).then(function(r){ if(r.j.ok) n++; }); });
  });
  chain.then(function(){ statusEl.textContent='Saved - live on the website now.'; });
}
function loadQuick(){
  loadSettings(function(s){ $('#q-whatsapp').value=s.whatsapp||''; $('#q-email').value=s.email||''; });
  quickRows($('#qTickerRows'), QUICK_TICKER, 'q-tk'); quickFill(QUICK_TICKER, 'q-tk');
  quickRows($('#qOfferRows'), QUICK_TEXTS, 'q-tx'); quickFill(QUICK_TEXTS, 'q-tx');
}
$('#qSaveContacts').addEventListener('click', function(){
  api('/api/admin/settings', {method:'POST', body: JSON.stringify({whatsapp:$('#q-whatsapp').value, email:$('#q-email').value})}).then(function(r){
    if(r.j.ok){ $('#qContactsSaved').textContent='Saved - the whole site now uses these.'; SETTINGS=null; }
    else $('#qContactsSaved').textContent='Could not save.';
  });
});
$('#qSaveTicker').addEventListener('click', function(){ quickSave(QUICK_TICKER, 'q-tk', $('#qTickerSaved')); });
$('#qSaveTexts').addEventListener('click', function(){ quickSave(QUICK_TEXTS, 'q-tx', $('#qTextsSaved')); });

/* ---------- init ---------- */
api('/api/admin/me').then(function(r){
  if(r.status===200 && r.j.ok){ ROLE=r.j.role||'admin'; showDash(); }
});
})();

/* keep the browser from spraying saved entries across the admin's forms */
Array.prototype.slice.call(document.querySelectorAll('input, textarea, select')).forEach(function(el){ el.setAttribute('autocomplete','off'); });
