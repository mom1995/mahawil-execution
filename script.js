/* ===== مديرية تنفيذ المحاويل — السكربت الرئيسي ===== */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} }
};

/* ---------- البيانات (يمكن تعديلها بسهولة) ---------- */
const SERVICES = [
  { cat: 'family', ico: '👨‍👩‍👧', title: 'تنفيذ أحكام النفقة', desc: 'تنفيذ أحكام نفقة الزوجة والأولاد والأقارب واستيفاؤها بشكل دوري.',
    docs: ['حكم النفقة الأصلي', 'البطاقة الوطنية الموحدة للمستحق', 'بطاقة السكن', 'عنوان المحكوم عليه وجهة عمله'], time: 'يتم فتح الإضبارة في نفس يوم التقديم' },
  { cat: 'family', ico: '🧒', title: 'الحضانة والمشاهدة', desc: 'تنفيذ أحكام حضانة الأطفال وتنظيم مشاهدتهم وفق قرار المحكمة.',
    docs: ['قرار الحكم بالحضانة أو المشاهدة', 'المستمسكات الثبوتية للطرفين', 'بطاقة السكن'], time: 'حسب الموعد المحدد في القرار' },
  { cat: 'money', ico: '💰', title: 'تنفيذ الديون', desc: 'تحصيل الديون المحكوم بها قضائياً وإيصالها للدائن.',
    docs: ['الحكم المكتسب الدرجة القطعية', 'المستمسكات الثبوتية', 'عنوان المدين'], time: 'من يوم إلى ثلاثة أيام لفتح الإضبارة' },
  { cat: 'money', ico: '📜', title: 'السندات والكمبيالات', desc: 'تنفيذ السندات التنفيذية والكمبيالات والمحررات الرسمية.',
    docs: ['السند أو الكمبيالة الأصلية', 'المستمسكات الثبوتية', 'عنوان المدين'], time: 'حسب نوع السند' },
  { cat: 'property', ico: '🔒', title: 'الحجز التنفيذي', desc: 'إيقاع الحجز على أموال المدين المنقولة وغير المنقولة ورفعه.',
    docs: ['طلب الحجز', 'رقم الإضبارة التنفيذية', 'ما يثبت ملكية المدين للمال'], time: 'بعد انتهاء مدة الإخطار' },
  { cat: 'property', ico: '🏷️', title: 'البيع بالمزايدة العلنية', desc: 'بيع الأموال المحجوزة بالمزايدة العلنية ونشر إعلانات البيع.',
    docs: ['التأمينات القانونية للمشاركة', 'المستمسكات الثبوتية للمزايد'], time: 'وفق مواعيد الإعلان' },
  { cat: 'property', ico: '🏠', title: 'إخلاء وتسليم العقار', desc: 'تنفيذ أحكام إخلاء المأجور وتسليم العقارات لأصحابها.',
    docs: ['حكم الإخلاء أو التسليم', 'سند العقار', 'المستمسكات الثبوتية'], time: 'حسب الإجراءات القانونية' },
  { cat: 'admin', ico: '✈️', title: 'منع السفر ورفعه', desc: 'إصدار قرارات منع السفر بحق المدين الممتنع، ورفعها بعد التسديد.',
    docs: ['طلب الدائن', 'رقم الإضبارة', 'ما يثبت التسديد عند طلب الرفع'], time: 'خلال يوم عمل' },
  { cat: 'money', ico: '🏦', title: 'الاستقطاع من الراتب', desc: 'مفاتحة دوائر الموظفين لاستقطاع المبالغ المحكوم بها من رواتبهم.',
    docs: ['رقم الإضبارة', 'اسم دائرة المدين وعنوانها'], time: 'حسب رد الدائرة المعنية' },
  { cat: 'admin', ico: '📨', title: 'التبليغات القضائية', desc: 'تبليغ أطراف الإضبارة بالإخطارات والقرارات التنفيذية.',
    docs: ['عنوان المطلوب تبليغه بشكل دقيق'], time: 'خلال المدد القانونية' },
  { cat: 'admin', ico: '📑', title: 'تصوير ونسخ الأوراق', desc: 'إعطاء صور مصدقة من أوراق الإضبارة لأطرافها.',
    docs: ['طلب تحريري', 'ما يثبت صفة طالب النسخة'], time: 'في نفس اليوم' },
  { cat: 'admin', ico: '✅', title: 'براءة الذمة وغلق الإضبارة', desc: 'إصدار ما يثبت تسديد المبالغ وغلق الإضبارة التنفيذية.',
    docs: ['وصولات التسديد', 'رقم الإضبارة'], time: 'بعد تدقيق الحسابات' }
];

/* أخبار منشورة على صفحة المديرية في فيسبوك (المصدر: إعلام وزارة العدل) */
const NEWS = [
  { tag: 'دائرة التنفيذ', ico: '🤝', bg: 'linear-gradient(135deg,#13315c,#1d4e89)', date: '2026-11-12',
    title: 'مدير عام دائرة التنفيذ يستقبل المواطنين ويستمع إلى طلباتهم ومشكلاتهم',
    text: 'استقبل مدير عام دائرة التنفيذ السيد راستي يوسف حميد عدداً من المواطنين والمراجعين، ووجّه بمتابعة طلباتهم وتذليل المعوقات والإسراع في إنجاز معاملاتهم وفق السياقات القانونية والإدارية المعتمدة.' },
  { tag: 'وزارة العدل', ico: '🏛️', bg: 'linear-gradient(135deg,#1b7f5b,#2fa37a)', date: '2026-11-03',
    title: 'وزير العدل يوجّه بتسريع التحول الرقمي وتطوير البنى التحتية لدائرة إصلاح الأحداث',
    text: 'ترأس معالي وزير العدل الدكتور خالد شواني اجتماعاً لمتابعة تنفيذ البرنامج الوزاري، ووجّه برقمنة الإجراءات الإدارية والفنية وربطها إلكترونياً بالجهات المعنية بالتنسيق مع وزارة الاقتصاد والتحول الرقمي.' }
];

const TICKER = [
  'الدوام الرسمي من الأحد إلى الخميس 8:30 صباحاً – 2:00 ظهراً (الجمعة والسبت عطلة)',
  'العنوان: المحاويل – حي 17 تموز – شارع روضة المحاويل قرب مركز شباب المحاويل',
  'خدمة الاستعلام الإلكتروني عن الأضابير متاحة الآن عبر الموقع',
  'يرجى جلب المستمسكات الأصلية عند المراجعة',
  'مدير عام دائرة التنفيذ يستقبل المواطنين ويستمع إلى طلباتهم ومشكلاتهم',
  'تابعوا صفحتنا الرسمية على فيسبوك: تعليمات وزارة العدل / دائرة التنفيذ والإعلانات المهمة والإجابة عن الاستفسارات'
];

/* ---------- العرض ---------- */
function fmtDate(d) {
  return new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' });
}

$('#servicesGrid').innerHTML = SERVICES.map((s, i) => `
  <button class="service reveal" data-cat="${s.cat}" data-i="${i}">
    <div class="ico">${s.ico}</div>
    <h4>${s.title}</h4>
    <p>${s.desc}</p>
    <span class="more">التفاصيل والمستمسكات ←</span>
  </button>`).join('');

const FB_PAGE = 'https://www.facebook.com/executionalmahawil';
const FB_FEED = 'fb-news.php'; // وسيط المزامنة مع فيسبوك (انظر fb-news.php)
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const GRADS = ['linear-gradient(135deg,#13315c,#1d4e89)', 'linear-gradient(135deg,#1b7f5b,#2fa37a)', 'linear-gradient(135deg,#c9a227,#e6c35c)'];

function newsCard(n, i) {
  const thumb = n.image
    ? `<div class="thumb"><img src="${esc(n.image)}" alt="" loading="lazy"><em class="tag">${esc(n.tag)}</em></div>`
    : `<div class="thumb" style="background:${n.bg || GRADS[i % GRADS.length]}"><span>${n.ico || '📰'}</span><em class="tag">${esc(n.tag)}</em></div>`;
  return `<article class="news reveal visible">${thumb}
    <div class="body"><time>${fmtDate(n.date)}</time><h4>${esc(n.title)}</h4><p>${esc(n.text)}</p>
      <a class="more" href="${esc(n.link || FB_PAGE)}" target="_blank" rel="noopener">قراءة الخبر على فيسبوك ←</a></div>
  </article>`;
}
function renderNews(list, live) {
  $('#newsGrid').innerHTML = list.map(newsCard).join('');
  $('#syncStatus').innerHTML = live
    ? `<span class="dot live"></span> متزامن مع صفحة فيسبوك — آخر تحديث ${new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}`
    : `<span class="dot"></span> آخر الأخبار المنشورة على صفحة المديرية`;
}
renderNews(NEWS, false);

// تحويل منشور فيسبوك إلى بطاقة خبر: السطر الأول عنوان، والباقي نص مختصر
function postToNews(p) {
  const lines = (p.message || '').split('\n').map(s => s.trim()).filter(Boolean);
  const title = (lines[0] || 'منشور جديد من صفحة المديرية').slice(0, 140);
  let text = lines.slice(1).join(' ').replace(/للإطلاع على اخر الاخبار[\s\S]*/, '').trim();
  if (text.length > 220) text = text.slice(0, 220).replace(/\s\S*$/, '') + '…';
  return { tag: 'فيسبوك', title, text, date: p.date, image: p.image, link: p.link };
}
async function syncNews() {
  try {
    const r = await fetch(FB_FEED, { cache: 'no-store' });
    if (!r.ok) throw 0;
    const d = await r.json();
    if (!d.posts || !d.posts.length) throw 0;
    const items = d.posts.map(postToNews);
    renderNews(items, true);
    const tickerItems = [...TICKER.slice(0, 2), ...items.slice(0, 4).map(n => n.title)].map(t => `<span>◆ ${esc(t)}</span>`).join('');
    $('#tickerMove').innerHTML = tickerItems + tickerItems;
  } catch { /* الإبقاء على الأخبار الحالية وصندوق فيسبوك المباشر */ }
}
syncNews();
setInterval(syncNews, 10 * 60 * 1000);

const tick = TICKER.map(t => `<span>◆ ${t}</span>`).join('');
$('#tickerMove').innerHTML = tick + tick;

$('#year').textContent = new Date().getFullYear();
$('#today').textContent = new Date().toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

/* ---------- صندوق فيسبوك: إظهار البديل إن لم يُحمَّل خلال 8 ثوانٍ ---------- */
/* على الحاسوب يُحمَّل الصندوق تلقائياً بارتفاع كامل.
   على الهاتف يظهر مختصراً، ويُفتح بارتفاع أصغر عند الضغط على "عرض المنشورات هنا"،
   حتى لا يحجز الشاشة ويمنع المستخدم من النزول في الصفحة. */
const fbBox = $('.fb-embed'), fbFrame = $('#fbFrame');
const isPhone = () => matchMedia('(max-width: 900px)').matches;
let fbLoaded = false, fbStarted = false;
function fbStart() {
  if (fbStarted) return;
  fbStarted = true;
  const w = Math.max(180, Math.min(500, Math.floor(fbBox.clientWidth)));
  const h = isPhone() ? 460 : 640;
  fbFrame.src = 'https://www.facebook.com/plugins/page.php?href=' + encodeURIComponent(FB_PAGE) +
    `&tabs=timeline&width=${w}&height=${h}&small_header=${isPhone()}&adapt_container_width=true&hide_cover=${isPhone()}&show_facepile=false&locale=ar_AR`;
  fbFrame.addEventListener('load', () => { fbLoaded = true; fbBox.classList.remove('fb-off'); }, { once: true });
  setTimeout(() => { if (!fbLoaded) fbBox.classList.add('fb-off'); }, 8000);
}
$('#fbToggle').onclick = () => { fbBox.classList.add('open'); fbStart(); };
$('#fbClose').onclick = () => { fbBox.classList.remove('open'); fbBox.scrollIntoView({ block: 'nearest' }); };
if (!isPhone()) {
  fbBox.classList.add('open');
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); fbStart(); } }).observe(fbBox);
}

/* ---------- الظهور عند التمرير ---------- */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
}, { threshold: .12 });
$$('.reveal').forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 80}ms`; io.observe(el); });

/* ---------- العدادات ---------- */
const counterIO = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, to = +el.dataset.to, suf = el.dataset.suffix || '', start = performance.now();
    const step = now => {
      const p = Math.min((now - start) / 1800, 1), v = Math.floor(to * (1 - Math.pow(1 - p, 3)));
      el.textContent = v.toLocaleString('ar-IQ') + suf;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    counterIO.unobserve(el);
  });
}, { threshold: .5 });
$$('.count').forEach(c => counterIO.observe(c));

/* ---------- الترويسة، التقدم، الرابط النشط ---------- */
const sections = $$('main section[id]');
const navLinks = $$('.nav a');
function onScroll() {
  const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
  $('#header').classList.toggle('scrolled', y > 10);
  $('#progress').style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
  $('#toTop').classList.toggle('show', y > 600);
  let cur = 'home';
  sections.forEach(s => { if (y + 140 >= s.offsetTop) cur = s.id; });
  navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();
$('#toTop').onclick = () => scrollTo({ top: 0 });

/* ---------- القائمة للجوال ---------- */
const nav = $('#nav'), menuBtn = $('#menuBtn');
menuBtn.onclick = () => { nav.classList.toggle('open'); menuBtn.classList.toggle('open'); };
navLinks.forEach(a => a.addEventListener('click', () => { nav.classList.remove('open'); menuBtn.classList.remove('open'); }));

/* ---------- الوضع الليلي وحجم الخط ---------- */
const root = document.documentElement;
function setTheme(t) { root.dataset.theme = t; $('#themeToggle').textContent = t === 'dark' ? '☀️' : '🌙'; store.set('theme', t); }
setTheme(store.get('theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
$('#themeToggle').onclick = () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
let fs = +(store.get('fs') || 16);
const applyFs = () => { root.style.setProperty('--fs', fs + 'px'); store.set('fs', fs); };
applyFs();
$('#fontUp').onclick = () => { fs = Math.min(fs + 1, 20); applyFs(); };
$('#fontDown').onclick = () => { fs = Math.max(fs - 1, 13); applyFs(); };

/* ---------- التبويبات ---------- */
$$('.tab').forEach(t => t.onclick = () => {
  $$('.tab').forEach(x => x.classList.toggle('active', x === t));
  $$('.tab-panel').forEach(p => p.classList.toggle('active', p.id === t.dataset.tab));
});

/* ---------- تصفية الخدمات ---------- */
$$('.chip').forEach(c => c.onclick = () => {
  $$('.chip').forEach(x => x.classList.toggle('active', x === c));
  $$('.service').forEach(s => s.classList.toggle('hidden', c.dataset.filter !== 'all' && s.dataset.cat !== c.dataset.filter));
});

/* ---------- نافذة تفاصيل الخدمة ---------- */
const modal = $('#modal');
function openModal(html) { $('#modalBody').innerHTML = html; modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); }
function closeModal() { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); }
$('#servicesGrid').addEventListener('click', e => {
  const card = e.target.closest('.service'); if (!card) return;
  const s = SERVICES[card.dataset.i];
  openModal(`<h3><span>${s.ico}</span>${s.title}</h3><p class="muted">${s.desc}</p>
    <h5>المستمسكات المطلوبة</h5><ul class="check-list">${s.docs.map(d => `<li>${d}</li>`).join('')}</ul>
    <h5>المدة المتوقعة</h5><p>${s.time}</p>
    <a href="#inquiry" class="btn btn-primary full" style="margin-top:18px" onclick="closeModal()">الاستعلام عن إضبارة</a>`);
});
$('#modalClose').onclick = closeModal;
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ---------- إشعار ---------- */
let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3500);
}

/* ---------- البحث عن رقم الإضبارة باسم الدائن أو المدين ----------
   البيانات في data/meta.json و data/idx/00.json … 63.json، وتُولَّد من قواعد Access بالأداة tools/access_to_json.py.
   لا تُخزَّن الأسماء. من الاسم المكتوب يُشتق بـ PBKDF2-SHA256 (100,000 تكرار) مُعرِّف للبحث ومفتاح AES-256،
   ونتيجة كل اسم (رقم الإضبارة والسنة والنوع) مشفّرة بـ AES-256-GCM بذلك المفتاح، فلا يقرؤها إلا من كتب الاسم الصحيح.
   يجب أن تطابق norm() و SALT وطريقة الاشتقاق هنا ما في أداة التحويل حرفياً. */
const DATA_DIR = 'data/';
const SALT = 'mahawil-v2';
let metaP = null;
const shardP = {};
const getJSON = url => fetch(url, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null);
const loadMeta = () => metaP || (metaP = getJSON(DATA_DIR + 'meta.json'));
const loadShard = n => shardP[n] || (shardP[n] = getJSON(`${DATA_DIR}idx/${String(n).padStart(2, '0')}.json`).then(d => { if (!d) delete shardP[n]; return d; }));
loadMeta().then(m => { if (m && m.demo) $('#demoNote').hidden = false; });
const enc = new TextEncoder();

// يشتق من الاسم: المُعرِّف (أول 8 بايت) ومفتاح فك التشفير (البايتات 16–48)
async function deriveName(role, name, iterations) {
  const base = await crypto.subtle.importKey('raw', enc.encode(name), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(`${SALT}|${role}`), iterations }, base, 384));
  const id = [...bits.slice(0, 8)].map(b => b.toString(16).padStart(2, '0')).join('');
  const key = await crypto.subtle.importKey('raw', bits.slice(16, 48), 'AES-GCM', false, ['decrypt']);
  return { id, key };
}
async function openEntries(key, blob) {
  try {
    const data = Uint8Array.from(atob(blob), c => c.charCodeAt(0));
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(12) }, key, data);
    return JSON.parse(new TextDecoder().decode(plain));
  } catch { return []; }
}

function norm(s) {
  return s.replace(/[ً-ْٰـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/[^ء-يa-zA-Z\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

$$('input[name="role"]').forEach(r => r.addEventListener('change', () => {
  const who = r.value === 'creditor' ? 'الدائن' : 'المدين';
  $('#nameLabel').textContent = `اسم ${who} (ثلاثي أو رباعي)`;
}));

$('#inquiryForm').addEventListener('submit', async e => {
  e.preventDefault();
  const input = $('#personName'), btn = e.submitter || $('#inquiryForm button'), res = $('#inquiryResult');
  const role = $('input[name="role"]:checked').value, who = role === 'creditor' ? 'الدائن' : 'المدين';
  const name = norm(input.value);
  if (name.split(' ').length < 3) { input.classList.add('invalid'); toast('يرجى كتابة الاسم الثلاثي على الأقل'); return; }
  input.classList.remove('invalid');
  btn.classList.add('loading'); btn.disabled = true;
  const words = name.split(' ');
  const variants = [...new Set([name, words.slice(0, 3).join(' ')])];
  const fail = () => { btn.classList.remove('loading'); btn.disabled = false;
    res.innerHTML = `<div class="res-box"><h5>⚠️ خدمة البحث غير متاحة حالياً</h5><p class="muted">يرجى المحاولة لاحقاً أو مراجعة شعبة الاستعلامات في المديرية.</p></div>`; };
  const meta = await loadMeta();
  if (!meta || !meta.iter) return fail();
  const derived = await Promise.all(variants.map(v => deriveName(role, v, meta.iter)));
  const parts = await Promise.all(derived.map(d => loadShard(parseInt(d.id.slice(0, 2), 16) >> 2)));
  if (parts.some(p => !p)) return fail();
  const seen = new Set(), hits = [];
  for (const [i, d] of derived.entries()) {
    const blob = parts[i][d.id];
    if (!blob) continue;
    (await openEntries(d.key, blob)).forEach(h => { const id = h[0] + '/' + h[1]; if (!seen.has(id)) { seen.add(id); hits.push(h); } });
  }
  btn.classList.remove('loading'); btn.disabled = false;
  const db = meta;
  hits.sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  res.innerHTML = hits.length
    ? `<div class="res-box"><h5>📂 تم العثور على ${hits.length === 1 ? 'إضبارة واحدة' : hits.length + ' أضابير'} باسم ${who} <span class="badge ok">نتيجة البحث</span></h5>
        <div class="hits">${hits.map(h => `<div class="hit"><div><small>رقم الإضبارة</small><b>${esc(h[0])}</b></div><div><small>السنة</small><b>${esc(h[1])}</b></div>${h[2] ? `<div><small>نوع القرار</small><b>${esc(h[2])}</b></div>` : ''}</div>`).join('')}</div>
        <p class="muted" style="margin-top:10px">احتفظ برقم الإضبارة وسنتها، فهما مطلوبان عند التقديم على بطاقة الماستر كارد وعند المراجعة.</p>
        ${db.updated ? `<small class="muted">آخر تحديث للبيانات: ${fmtDate(db.updated)}</small>` : ''}</div>`
    : `<div class="res-box"><h5>🔍 لا توجد نتيجة <span class="badge err">غير موجود</span></h5>
        <p class="muted">تأكد من كتابة اسم ${who} الثلاثي أو الرباعي كما هو في الإضبارة، أو راجع شعبة الاستعلامات في المديرية.</p></div>`;
});

/* ---------- نموذج الشكاوى ----------
   تُرسل الرسائل إلى جدول Google Sheets الخاص بالمديرية عبر Google Apps Script.
   ضع رابط تطبيق الويب (ينتهي بـ /exec) في COMPLAINTS_URL. خطوات الإعداد في COMPLAINTS-SETUP.md.
   ما دام الرابط فارغاً لا يُرسل النموذج شيئاً، ويُبلَّغ المستخدم بذلك بوضوح. */
const COMPLAINTS_URL = '';
const cMsg = $('#cMsg'), cResult = $('#cResult');
cMsg.addEventListener('input', () => { $('#cCount').textContent = `${cMsg.value.length} / 600`; });
if (!COMPLAINTS_URL) $('#cNote').textContent = '⚠️ الإرسال الإلكتروني غير مفعّل بعد. لتقديم شكوى يرجى مراجعة المديرية خلال أوقات الدوام.';
const toLatin = s => s.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));

$('#complaintForm').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target, btn = form.querySelector('button[type=submit]');
  const name = $('#cName'), phone = $('#cPhone'), msg = $('#cMsg');
  phone.value = toLatin(phone.value).replace(/[\s-]/g, '');
  let ok = true;
  [name, phone, msg].forEach(f => { const bad = !f.value.trim(); f.classList.toggle('invalid', bad); if (bad) ok = false; });
  if (phone.value && !/^07\d{9}$/.test(phone.value)) { phone.classList.add('invalid'); ok = false; }
  if (!ok) { toast('يرجى إكمال الحقول بشكل صحيح (رقم الهاتف يبدأ بـ 07 ومكوّن من 11 رقماً)'); return; }
  if (!COMPLAINTS_URL) {
    cResult.innerHTML = `<div class="res-box"><h5>⚠️ لم تُرسل الرسالة <span class="badge warn">الخدمة غير مفعّلة</span></h5><p class="muted">الإرسال الإلكتروني غير مفعّل حالياً. يرجى مراجعة المديرية خلال أوقات الدوام، أو مراسلتنا عبر صفحة فيسبوك.</p></div>`;
    return;
  }
  btn.classList.add('loading'); btn.disabled = true;
  try {
    // نص عادي (text/plain) حتى لا يحتاج المتصفح طلب إذن مسبق (CORS preflight) لا يدعمه Apps Script
    const r = await fetch(COMPLAINTS_URL, {
      method: 'POST',
      body: JSON.stringify({ name: name.value.trim(), phone: phone.value, kind: $('#cKind').value, message: msg.value.trim(), website: $('#cWebsite').value })
    });
    const d = await r.json();
    if (!d.ok) throw new Error(d.error || 'failed');
    form.reset(); $('#cCount').textContent = '0 / 600';
    cResult.innerHTML = `<div class="res-box"><h5>✅ تم استلام رسالتك <span class="badge ok">تم الإرسال</span></h5><p>الرقم المرجعي: <b>${esc(d.ref)}</b></p><p class="muted">احتفظ بالرقم المرجعي لمتابعة رسالتك عند مراجعة المديرية.</p></div>`;
  } catch {
    cResult.innerHTML = `<div class="res-box"><h5>⚠️ تعذّر الإرسال <span class="badge err">خطأ</span></h5><p class="muted">تحقق من اتصال الإنترنت وحاول مرة أخرى، أو راجع المديرية مباشرة.</p></div>`;
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
});

/* ---------- التقييم ---------- */
const stars = $$('#stars button');
const paint = n => stars.forEach(s => s.classList.toggle('on', +s.dataset.v <= n));
let rating = +(store.get('rating') || 0); paint(rating);
stars.forEach(s => {
  s.onmouseenter = () => paint(+s.dataset.v);
  s.onmouseleave = () => paint(rating);
  s.onclick = () => { rating = +s.dataset.v; store.set('rating', rating); paint(rating); $('#ratingMsg').textContent = 'شكراً لتقييمك!'; };
});

/* ---------- النشرة البريدية ---------- */
$('#newsletter').addEventListener('submit', e => { e.preventDefault(); e.target.reset(); toast('تم الاشتراك في النشرة البريدية ✓'); });
