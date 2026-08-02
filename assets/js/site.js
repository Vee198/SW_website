/* ==========================================================================
   SW Strategic Solutions Group — site.js
   หน้าที่: 1) สลับภาษา TH/EN  2) เมนูมือถือ  3) ส่งฟอร์มติดต่อเข้า Cloudflare Worker
   ไม่มี dependency ภายนอก — วางไฟล์นี้ท้าย <body> ของทุกหน้า
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- 1) ภาษา ---------------------------------------------------- */
  var STORE_KEY = 'sw-lang';
  var root = document.documentElement;

  function currentLang() {
    return root.getAttribute('data-lang') === 'en' ? 'en' : 'th';
  }

  function setLang(lang) {
    lang = lang === 'en' ? 'en' : 'th';
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang === 'en' ? 'en' : 'th');
    try { localStorage.setItem(STORE_KEY, lang); } catch (e) { /* โหมดส่วนตัว: ข้ามไป */ }
    document.querySelectorAll('[data-lang-btn]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-lang-btn') === lang));
    });
    // อัปเดต <title>/description ให้ตรงภาษา ถ้าหน้ามีข้อมูลกำกับไว้
    var t = document.querySelector('meta[name="sw-title-' + lang + '"]');
    if (t) document.title = t.getAttribute('content');
  }

  // เรียกครั้งแรกให้ตรงกับค่าที่ผู้ใช้เคยเลือก (สคริปต์ inline ใน <head> ตั้ง data-lang ไว้แล้ว
  // เพื่อกันจอกระพริบ — ตรงนี้แค่ซิงก์สถานะปุ่มและ title)
  setLang(currentLang());

  document.querySelectorAll('[data-lang-btn]').forEach(function (btn) {
    btn.addEventListener('click', function () { setLang(btn.getAttribute('data-lang-btn')); });
  });

  /* ---------- 2) เมนูมือถือ ---------------------------------------------- */
  var toggle = document.querySelector('[data-nav-toggle]');
  var nav = document.querySelector('[data-nav]');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- 3) ฟอร์มติดต่อ (Cloudflare Worker + D1) --------------------
     ข้อมูลวิ่งเข้า Worker ของบริษัทเอง เก็บใน D1 แล้ว Worker ส่งอีเมลแจ้งต่อ
     ตั้งค่า endpoint ที่บรรทัดล่างนี้ — ดูวิธี deploy ใน worker/README.md
     ------------------------------------------------------------------------ */
  // เว็บกับ Worker อยู่โดเมนเดียวกัน จึงใช้ path สั้น ๆ ได้ — ย้ายโดเมนก็ไม่ต้องแก้
  // (ถ้าเปิดไฟล์ .html ตรง ๆ ด้วย file:// ฟอร์มจะส่งไม่ได้ ต้องเปิดผ่าน http)
  var SW_CONTACT_ENDPOINT = '/api/contact';

  var form = document.querySelector('[data-contact-form]');
  if (form) {
    var statusEl = form.querySelector('[data-form-status]');
    var successEl = document.querySelector('[data-form-success]');
    var submitBtn = form.querySelector('button[type="submit"]');

    var MSG = {
      sending:   { th: 'กำลังส่ง...', en: 'Sending...' },
      error:     { th: 'ส่งไม่สำเร็จ กรุณาลองใหม่ หรือโทร 064-154-9955',
                   en: 'Could not send. Please try again or call +66 64-154-9955.' },
      required:  { th: 'กรุณากรอกชื่อและอีเมลให้ครบถ้วน',
                   en: 'Please fill in your name and a valid email.' },
      consent:   { th: 'กรุณาติ๊กยอมรับนโยบายความเป็นส่วนตัวก่อนส่ง',
                   en: 'Please accept the privacy policy before sending.' },
      ratelimit: { th: 'คุณส่งข้อความบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่',
                   en: 'Too many messages sent. Please wait a moment and try again.' },
      notset:    { th: 'ฟอร์มยังไม่ได้ตั้งค่าปลายทาง — ดูวิธีตั้งค่าใน worker/README.md',
                   en: 'Form endpoint is not configured yet — see worker/README.md.' }
    };
    function say(kind, state) {
      if (!statusEl) return;
      statusEl.textContent = MSG[kind][currentLang()];
      statusEl.setAttribute('data-state', state || '');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!SW_CONTACT_ENDPOINT || SW_CONTACT_ENDPOINT.indexOf('PUT-YOUR') === 0) { say('notset', 'error'); return; }

      var data = new FormData(form);
      var name = (data.get('name') || '').toString().trim();
      var email = (data.get('email') || '').toString().trim();
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { say('required', 'error'); return; }
      if (!form.querySelector('[name="consent"]').checked) { say('consent', 'error'); return; }

      say('sending', 'sending');
      if (submitBtn) submitBtn.disabled = true;

      var payload = {};
      data.forEach(function (v, k) { payload[k] = v; });
      payload.consent = true;
      payload.lang = currentLang();

      fetch(SW_CONTACT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.json().then(function (b) { return { status: r.status, body: b }; }); })
        .then(function (out) {
          if (out.body && out.body.ok) {
            form.classList.add('hidden');
            if (successEl) {
              successEl.classList.remove('hidden');
              successEl.setAttribute('tabindex', '-1');
              successEl.focus();
            }
            return;
          }
          if (out.status === 429) say('ratelimit', 'error');
          else if (out.status === 422) say('required', 'error');
          else say('error', 'error');
          if (submitBtn) submitBtn.disabled = false;
        })
        .catch(function () {
          say('error', 'error');
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }
})();
