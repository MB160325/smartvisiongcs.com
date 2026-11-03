/* SMART VISION — public layer: staff link, live news/projects, request form, chatbot */
(function () {
  var C = window.SV || {}, live = C.url && C.key && !/YOUR-/.test(C.url);
  var H = { apikey: C.key, Authorization: 'Bearer ' + C.key };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var get = function (t) { return fetch(C.url + '/rest/v1/' + t + '?select=*&published=eq.true&order=created_at.desc', { headers: H }).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }); };

  /* ---- Staff login entry (icon only, keeps the header untouched) ---- */
  var ul = $('.nav-links');
  if (ul) ul.insertAdjacentHTML('beforeend', '<li><a href="staff-login.html" title="Staff Login" aria-label="Staff Login"><i class="fa-solid fa-user-lock"></i></a></li>');
  var grid = $('.overlay-nav-grid');
  if (grid) grid.insertAdjacentHTML('beforeend', '<a href="staff-login.html" class="overlay-nav-item" style="grid-column:span 2"><i class="fa-solid fa-user-lock"></i><span>Staff Login</span></a>');

  /* ---- Requests (contact form → Supabase → email to all admins) ---- */
  C.sendRequest = function (row) {
    if (!live) return Promise.reject(new Error('not configured'));
    var id = crypto.randomUUID();
    return fetch(C.url + '/rest/v1/requests', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }, H), body: JSON.stringify(Object.assign({ id: id }, row)) })
      .then(function (r) { if (!r.ok) throw new Error('save failed'); fetch(C.url + '/functions/v1/notify-admins', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, H), body: JSON.stringify({ id: id }) }).catch(function () {}); });
  };
  var cs = $('.contact-section');
  if (cs) {
    var st = document.createElement('style');
    st.textContent = '.rq{padding:100px 8%;background:var(--bg-rich-dark);position:relative;z-index:2}.rq-box{max-width:820px;margin:0 auto;background:var(--bg-glass-card);border:1px solid var(--gold-alpha);border-radius:16px;padding:44px;position:relative;overflow:hidden}.rq-box:before{content:"";position:absolute;top:0;left:0;width:100%;height:4px;background:var(--grad-gold)}.rq h2{text-align:center;text-transform:uppercase;letter-spacing:4px;margin-bottom:10px;font-size:clamp(1.6rem,3vw,2.4rem)}.rq h2 span{background:var(--grad-gold);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.rq p.sub{text-align:center;color:var(--text-muted);margin-bottom:30px;font-size:.9rem}.rq-row{display:grid;grid-template-columns:1fr 1fr;gap:18px}.rq label{display:block;color:var(--gold-primary);font-size:.72rem;letter-spacing:2px;text-transform:uppercase;font-weight:600;margin:0 0 7px}.rq input,.rq select,.rq textarea{width:100%;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.1);padding:14px 16px;border-radius:8px;color:#fff;font:inherit;margin-bottom:18px;outline:0}.rq textarea{min-height:130px;resize:vertical}.rq input:focus,.rq select:focus,.rq textarea:focus{border-color:var(--gold-primary);box-shadow:0 0 15px rgba(212,175,55,.15)}.rq select option{background:#0a0a0a}.rq button{width:100%;padding:16px;border:0;border-radius:8px;background:var(--grad-gold);color:#000;font:700 .85rem Inter,sans-serif;letter-spacing:2px;text-transform:uppercase;cursor:pointer}.rq button:disabled{opacity:.6}.rq .msg{margin-top:16px;text-align:center;font-size:.9rem;min-height:1.2em}@media(max-width:600px){.rq-row{grid-template-columns:1fr}.rq-box{padding:28px 20px}.rq{padding:70px 5%}}';
    document.head.appendChild(st);
    cs.insertAdjacentHTML('afterend', '<section class="rq" id="request"><div class="rq-box"><h2>Send Us A <span>Request</span></h2><p class="sub">Tell us about your project — our team replies promptly.</p><form id="rqForm"><div class="rq-row"><div><label>Full Name</label><input name="name" required minlength="2" maxlength="120"></div><div><label>Email</label><input name="email" type="email" required maxlength="160"></div></div><div class="rq-row"><div><label>Phone</label><input name="phone" type="tel" maxlength="40"></div><div><label>Request Type</label><select name="kind"><option value="consultation">Engineering Consultation</option><option value="quote">Price Quote</option><option value="partnership">Partnership</option><option value="contact">General Inquiry</option></select></div></div><label>Subject</label><input name="subject" maxlength="160"><label>Message</label><textarea name="message" required maxlength="4000"></textarea><button type="submit">Send Request</button><div class="msg" id="rqMsg"></div></form></div></section>');
    $('#rqForm').addEventListener('submit', function (e) {
      e.preventDefault(); var f = e.target, b = $('button', f), m = $('#rqMsg'), d = {};
      new FormData(f).forEach(function (v, k) { d[k] = String(v).trim(); }); b.disabled = true; m.style.color = '';
      C.sendRequest(d).then(function () { f.reset(); m.style.color = '#7bd88f'; m.textContent = 'Thank you! Your request was received.'; })
        .catch(function () { m.style.color = '#ff8a80'; m.innerHTML = 'Could not send now. Please email <a href="mailto:info@smartvisiongcs.com" style="color:var(--gold-primary)">info@smartvisiongcs.com</a>.'; })
        .then(function () { b.disabled = false; });
    });
  }

  /* ---- Live NEWS (newest first, same card design + modal) ---- */
  var ng = $('.news-grid');
  if (ng && live) get('news').then(function (items) {
    var first = ng.firstElementChild;
    items.forEach(function (n) {
      var d = new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();
      var a = document.createElement('article'); a.className = 'news-card'; a.setAttribute('data-dyn', '1');
      a.innerHTML = '<div class="news-img-wrapper"><img src="' + esc(n.image_url) + '" alt="' + esc(n.title) + '"><div class="news-date">' + d + '</div></div><div class="news-content"><div class="news-category"><i class="fa-solid fa-newspaper"></i> ' + esc(n.category || 'News') + '</div><h3 class="news-title">' + esc(n.title) + '</h3><p class="news-desc">' + esc((n.body || '').slice(0, 180)) + '</p><div class="news-full-text">' + (n.body || '').split(/\n+/).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div><a href="#" class="read-more-btn">Read Article <i class="fa-solid fa-arrow-right-long"></i></a></div>';
      ng.insertBefore(a, first);
    });
    ng.addEventListener('click', function (e) {
      var b = e.target.closest('.read-more-btn'), c = b && b.closest('[data-dyn]'); if (!c) return; e.preventDefault();
      $('#modalImg').src = $('img', c).src; $('#modalDate').innerText = $('.news-date', c).innerText; $('#modalCategory').innerHTML = $('.news-category', c).innerHTML;
      $('#modalTitle').innerText = $('.news-title', c).innerText; $('#modalFullText').innerHTML = $('.news-full-text', c).innerHTML;
      $('#newsModal').classList.add('active'); document.body.classList.add('modal-open');
    });
  });

  /* ---- Live PROJECTS (same card design, filters + lightbox) ---- */
  var pg = $('#portfolio-grid');
  if (pg && live) get('projects').then(function (items) {
    var first = pg.firstElementChild, lb = $('#lightbox'), li = $('#lb-img');
    items.forEach(function (p) {
      var c = document.createElement('div'); c.className = 'project-card in-view'; c.setAttribute('data-dyn', '1'); c.dataset.category = p.category;
      c.innerHTML = '<img src="' + esc(p.image_url) + '" alt="' + esc(p.title) + '" class="project-img"><div class="category-badge">' + esc(p.category) + '</div><div class="project-info"><span class="proj-category">' + esc(p.category) + '</span><div class="proj-title">' + esc(p.title) + '</div></div><div class="view-btn"><i class="fa-solid fa-expand"></i></div>';
      c.addEventListener('click', function () {
        li.src = p.image_url; li.style.opacity = '1'; li.style.transform = 'none'; lb.classList.add('open'); document.body.style.overflow = 'hidden';
        ['lb-prev', 'lb-next', 'lb-counter'].forEach(function (i) { var x = document.getElementById(i); if (x) x.style.display = 'none'; });
        new MutationObserver(function (m, o) { if (!lb.classList.contains('open')) { ['lb-prev', 'lb-next', 'lb-counter'].forEach(function (i) { var x = document.getElementById(i); if (x) x.style.display = ''; }); o.disconnect(); } }).observe(lb, { attributes: true });
      });
      pg.insertBefore(c, first);
    });
    document.querySelectorAll('.filter-btn[data-filter]').forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.dataset.filter; pg.querySelectorAll('[data-dyn]').forEach(function (c) { var m = f === 'all' || c.dataset.category === f; c.classList.toggle('is-hidden', !m); c.classList.toggle('in-view', m); });
      });
    });
  });

  /* ---- Chatbot (company knowledge base, Arabic + English) ---- */
  var wa = 'https://wa.me/' + (C.whatsapp || '201021501250');
  var KB = [
    [['hello', 'hi', 'hey', 'مرحبا', 'السلام', 'اهلا', 'أهلا', 'هلا'], 'Hello! 👋 I\'m the SMART VISION assistant. Ask me about our services, projects, team, careers or how to reach us.', 'أهلاً بك! 👋 أنا مساعد SMART VISION. اسألني عن خدماتنا ومشاريعنا وفريقنا والوظائف وطرق التواصل.'],
    [['about', 'who are', 'company', 'founded', 'history', 'عن الشركة', 'من انتم', 'من أنتم', 'الشركة', 'تأسيس', 'تاسيس'], 'SMART VISION is an engineering consultancy founded in 2004 by Dr. Eng. Mohamed Osama Hassaan and Arch. Ahmed Amin, registered with GAFI. We specialise in geotechnical, civil, architectural and structural design, MEP, and site supervision — with 20+ years of experience and 15+ engineering professionals.', 'SMART VISION شركة استشارات هندسية تأسست عام 2004 على يد د.م. محمد أسامة حسان والمعماري أحمد أمين، ومسجلة بهيئة الاستثمار (GAFI). نتخصص في الهندسة الجيوتقنية والمدنية والمعمارية والإنشائية وتصميم الـMEP والإشراف على التنفيذ، بخبرة تتجاوز 20 عاماً وأكثر من 15 مهندساً.'],
    [['service', 'offer', 'do you do', 'mep', 'structur', 'architect', 'خدمات', 'خدمة', 'تقدمون', 'تصميم', 'إنشائ', 'انشائ', 'معماري'], 'Our services: Parametric Architecture, Heavy Structural Engineering (load calculations, seismic modelling, strengthening & repair), MEP Design, Luxury Interior Architecture, Urban Masterplanning and Sustainable Green Tech — plus site supervision with multi-point quality assurance. See <a href="services.html">Services</a>.', 'خدماتنا: العمارة البارامترية، الهندسة الإنشائية الثقيلة (الأحمال والزلازل والتدعيم والإصلاح)، تصميم MEP، العمارة الداخلية الفاخرة، التخطيط العمراني، والتقنيات المستدامة، إضافة إلى الإشراف على التنفيذ وضبط الجودة. التفاصيل في <a href="services.html">صفحة الخدمات</a>.'],
    [['project', 'portfolio', 'work', 'مشاريع', 'مشروع', 'اعمال', 'أعمال'], 'Browse our work by sector — Architecture, Structure, MEP and Site Supervision — in the <a href="projects.html">Portfolio</a>.', 'يمكنك تصفح أعمالنا حسب القطاع (معماري، إنشائي، MEP، إشراف) في <a href="projects.html">معرض المشاريع</a>.'],
    [['contact', 'phone', 'call', 'email', 'address', 'location', 'office', 'where', 'تواصل', 'اتصال', 'رقم', 'هاتف', 'ايميل', 'إيميل', 'عنوان', 'مكتب', 'فين', 'موقع'], 'Head Office: IZAR Mall, Palm Hills Square, Zayed, Giza. Branch: Villa 7m, Pyramids Gardens, Giza. Phone: (+20) 01000076056 / 01021501250. Email: info@smartvisiongcs.com. <a href="' + wa + '" target="_blank">WhatsApp us</a> or use the <a href="contact.html#request">request form</a>.', 'المقر الرئيسي: مول إيزار، بالم هيلز سكوير، الشيخ زايد، الجيزة. الفرع: فيلا 7m، حدائق الأهرام، الجيزة. الهاتف: 01000076056 / 01021501250 (+20). البريد: info@smartvisiongcs.com. <a href="' + wa + '" target="_blank">راسلنا على واتساب</a> أو استخدم <a href="contact.html#request">نموذج الطلبات</a>.'],
    [['quote', 'price', 'consult', 'request', 'طلب', 'عرض سعر', 'استشارة', 'سعر', 'تكلفة'], 'To request a consultation or quote, fill the <a href="contact.html#request">request form</a> — our team gets notified immediately.', 'لطلب استشارة أو عرض سعر املأ <a href="contact.html#request">نموذج الطلبات</a> وسيصل فريقنا إشعار فوري.'],
    [['team', 'ceo', 'chairman', 'founder', 'engineer', 'فريق', 'مدير', 'رئيس', 'المؤسس'], 'Leadership: Dr. Eng. Mohamed Osama Hassaan (Founder, Chairman & CEO), Arch. Ahmed Amin (Co-Founder & CFO), Michel Mounir (Head of MEP), Heba Abd AlHamid (Head of Cost Control), Eslam Fares (Structural Team Leader). See <a href="team.html">Team</a>.', 'القيادة: د.م. محمد أسامة حسان (المؤسس ورئيس مجلس الإدارة والرئيس التنفيذي)، م. أحمد أمين (شريك مؤسس والمدير المالي)، ميشيل منير (رئيس قسم MEP)، هبة عبد الحميد (رئيس مراقبة التكاليف)، إسلام فارس (قائد الفريق الإنشائي). <a href="team.html">صفحة الفريق</a>.'],
    [['partner', 'client', 'alliance', 'شركاء', 'شريك', 'عملاء', 'عملائكم'], 'We work with leading developers such as Palm Hills Development, Orascom Development, Majra, Gird Consult, The Three Corners, Vantage, Country Homes, UECC, Zaro and Centruy. See <a href="partnerships.html">Partnerships</a>.', 'نعمل مع كبرى شركات التطوير مثل بالم هيلز، أوراسكوم للتنمية، مجرى، جيرد كونسلت، ذا ثري كورنرز، فانتج، كانتري هومز، UECC، زارو وسنتري. <a href="partnerships.html">الشراكات</a>.'],
    [['career', 'job', 'hire', 'hiring', 'vacanc', 'apply', 'cv', 'وظيف', 'توظيف', 'عمل معكم', 'تقديم', 'سيرة'], 'We\'re always looking for exceptional engineers and architects. Apply through the <a href="career.html">Careers</a> page.', 'نبحث دائماً عن مهندسين ومعماريين متميزين. قدّم عبر صفحة <a href="career.html">الوظائف</a>.'],
    [['news', 'award', 'big 5', 'big5', 'أخبار', 'اخبار', 'جائزة', 'جوائز'], 'Smart Vision reached the final of the Impact Leadership Award at Big 5 Egypt 2025 and was selected to represent Egypt at Big 5 Global in Dubai. More in <a href="news.html">News</a>.', 'وصلت SMART VISION إلى نهائيات جائزة Impact Leadership في Big 5 Egypt 2025 واختيرت لتمثيل مصر في Big 5 Global بدبي. المزيد في <a href="news.html">الأخبار</a>.'],
    [['staff', 'employee', 'login', 'portal', 'موظف', 'تسجيل الدخول', 'دخول'], 'Employees can sign in from the <a href="staff-login.html">Staff Login</a> page.', 'يمكن للموظفين تسجيل الدخول من صفحة <a href="staff-login.html">دخول الموظفين</a>.']
  ];
  var cst = document.createElement('style');
  cst.textContent = '#svc-btn{position:fixed;right:22px;bottom:22px;width:58px;height:58px;border-radius:50%;border:1px solid var(--gold-border,#C9A227);background:#0a0a0a;color:var(--gold-primary,#D4AF37);font-size:1.4rem;cursor:pointer;z-index:9000;box-shadow:0 0 18px rgba(212,175,55,.35);transition:.3s}#svc-btn:hover{background:var(--gold-primary,#D4AF37);color:#000}#svc-box{position:fixed;right:22px;bottom:92px;width:350px;max-width:calc(100vw - 28px);height:480px;max-height:calc(100dvh - 130px);background:rgba(8,8,8,.97);backdrop-filter:blur(16px);border:1px solid var(--gold-alpha,rgba(212,175,55,.25));border-radius:14px;display:none;flex-direction:column;z-index:9000;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.8);font-family:Inter,sans-serif}#svc-box.on{display:flex}.svc-h{padding:14px 16px;background:linear-gradient(90deg,#8B6B15,#D4AF37);color:#000;font-weight:700;letter-spacing:1px;font-size:.85rem;display:flex;justify-content:space-between;align-items:center}.svc-h button{background:none;border:0;font-size:1rem;cursor:pointer;color:#000}#svc-log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}.svc-m{max-width:86%;padding:10px 13px;border-radius:12px;font-size:.84rem;line-height:1.6;color:#ddd;background:rgba(255,255,255,.06)}.svc-m a{color:var(--gold-primary,#D4AF37)}.svc-m.u{align-self:flex-end;background:var(--gold-primary,#D4AF37);color:#000}.svc-q{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 8px}.svc-q button{background:none;border:1px solid var(--gold-alpha,rgba(212,175,55,.3));color:var(--gold-primary,#D4AF37);border-radius:20px;padding:5px 11px;font-size:.72rem;cursor:pointer}.svc-q button:hover{background:rgba(212,175,55,.12)}.svc-f{display:flex;border-top:1px solid rgba(212,175,55,.15)}.svc-f input{flex:1;background:none;border:0;padding:14px;color:#fff;font:inherit;font-size:.85rem;outline:0}.svc-f button{background:none;border:0;color:var(--gold-primary,#D4AF37);padding:0 16px;font-size:1.1rem;cursor:pointer}@media(max-width:900px){#svc-btn{bottom:92px;right:14px;width:52px;height:52px}#svc-box{right:14px;bottom:154px;height:min(460px,calc(100dvh - 190px))}}';
  document.head.appendChild(cst);
  var box = document.createElement('div');
  box.innerHTML = '<button id="svc-btn" aria-label="Chat"><i class="fa-solid fa-comments"></i></button><div id="svc-box"><div class="svc-h"><span>SMART VISION · مساعد الشركة</span><button id="svc-x" aria-label="Close">✕</button></div><div id="svc-log"></div><div class="svc-q" id="svc-q"></div><form class="svc-f" id="svc-f"><input id="svc-i" placeholder="Ask · اسأل..." autocomplete="off"><button aria-label="Send"><i class="fa-solid fa-paper-plane"></i></button></form></div>';
  document.body.appendChild(box);
  var log = $('#svc-log'), opened = false;
  function say(t, u) { var m = document.createElement('div'); m.className = 'svc-m' + (u ? ' u' : ''); m.setAttribute('dir', 'auto'); if (u) m.textContent = t; else m.innerHTML = t; log.appendChild(m); log.scrollTop = log.scrollHeight; }
  function reply(q) {
    var ar = /[\u0600-\u06FF]/.test(q), s = q.toLowerCase(), hit = null;
    KB.forEach(function (k) { if (!hit && k[0].some(function (w) { return s.indexOf(w) > -1; })) hit = k; });
    say(hit ? (ar ? hit[2] : hit[1]) : (ar ? 'لم أجد إجابة دقيقة. يمكنك مراسلتنا عبر <a href="contact.html#request">نموذج الطلبات</a> أو <a href="' + wa + '" target="_blank">واتساب</a>.' : 'I couldn\'t find an exact answer. Please use the <a href="contact.html#request">request form</a> or <a href="' + wa + '" target="_blank">WhatsApp</a> and our team will help.'));
  }
  [['Services', 'ما هي خدماتكم؟'], ['Projects', 'مشاريعكم'], ['Contact', 'طرق التواصل'], ['Careers', 'الوظائف']].forEach(function (c) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = c[0] + ' · ' + c[1].split(' ')[0];
    b.onclick = function () { say(c[0], 1); reply(c[0] === 'Services' ? 'services' : c[0] === 'Projects' ? 'projects' : c[0] === 'Contact' ? 'contact' : 'career'); }; $('#svc-q').appendChild(b);
  });
  $('#svc-btn').onclick = function () { $('#svc-box').classList.toggle('on'); if (!opened) { opened = true; reply('hello'); } };
  $('#svc-x').onclick = function () { $('#svc-box').classList.remove('on'); };
  $('#svc-f').onsubmit = function (e) { e.preventDefault(); var i = $('#svc-i'), v = i.value.trim(); if (!v) return; say(v, 1); i.value = ''; setTimeout(function () { reply(v); }, 350); };
})();
