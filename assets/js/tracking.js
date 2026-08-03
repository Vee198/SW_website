/* ==========================================================================
   SW Strategic Solutions Group — tracking.js
   จุดเดียวสำหรับฝังโค้ดติดตามโฆษณา (Meta Pixel / Google Ads / LinkedIn ฯลฯ)

   ตอนนี้ "ว่างเปล่าโดยตั้งใจ" — ยังไม่มีโค้ดติดตามใด ๆ ทำงาน
   เว็บจึงยังไม่ใช้คุกกี้ติดตาม และไม่ต้องมีแบนเนอร์ขอความยินยอม

   ┌──────────────────────────────────────────────────────────────────────┐
   │  อ่านก่อนเปิดใช้งาน — สำคัญมากตาม PDPA                                │
   │                                                                      │
   │  หน้า privacy.html ประกาศต่อสาธารณะไว้ว่า                              │
   │    "เว็บไซต์นี้ไม่ใช้คุกกี้เพื่อการติดตามหรือโฆษณา"                      │
   │                                                                      │
   │  ถ้าเปิดใช้ pixel ตัวใดตัวหนึ่งด้านล่าง ประกาศนั้นจะกลายเป็นเท็จทันที     │
   │  ต้องทำ 2 อย่างพร้อมกันเสมอ                                            │
   │    1. แก้ privacy.html หัวข้อ 1 และ 3 ให้ตรงความจริง                    │
   │       (ระบุว่าใช้คุกกี้อะไร ของใคร เพื่ออะไร)                            │
   │    2. เพิ่มแบนเนอร์ขอความยินยอมคุกกี้ก่อนยิง pixel                       │
   │  ไม่ทำ = ประกาศเท็จ ผิด พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล                    │
   └──────────────────────────────────────────────────────────────────────┘

   วิธีเปิดใช้: ลบเครื่องหมายคอมเมนต์ของบล็อกที่ต้องการ แล้วใส่ ID ของคุณ
   จากนั้น deploy ตามปกติ (publish.py จะติดเวอร์ชันไฟล์ให้เอง)
   ========================================================================== */
(function () {
  'use strict';

  /* ธงบอกสถานะ — ตั้งเป็น true เมื่อเปิดใช้ pixel ตัวใดตัวหนึ่งจริง
     tools/check.py อ่านค่านี้ ถ้าเป็น true แต่ privacy.html ยังบอกว่าไม่ใช้คุกกี้ติดตาม
     จะฟ้องเป็น ERROR และ deploy ไม่ผ่าน — กันประกาศเท็จตาม PDPA */
  var PIXELS_ENABLED = false;

  /* dataLayer กลาง — ใช้ร่วมกันได้ทุกแพลตฟอร์ม ไม่ผูกกับเจ้าใดเจ้าหนึ่ง */
  window.dataLayer = window.dataLayer || [];

  /* ---------- 1) Meta Pixel (Facebook / Instagram) ------------------------
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', 'ใส่-PIXEL-ID-ตรงนี้');
  fbq('track', 'PageView');
  ------------------------------------------------------------------------ */

  /* ---------- 2) Google Ads / Google Analytics 4 --------------------------
  var gs = document.createElement('script'); gs.async = true;
  gs.src = 'https://www.googletagmanager.com/gtag/js?id=ใส่-MEASUREMENT-ID';
  document.head.appendChild(gs);
  window.gtag = function () { dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', 'ใส่-MEASUREMENT-ID');
  ------------------------------------------------------------------------ */

  /* ---------- 3) LinkedIn Insight Tag -------------------------------------
  window._linkedin_partner_id = 'ใส่-PARTNER-ID';
  window._linkedin_data_partner_ids = [window._linkedin_partner_id];
  var ls = document.createElement('script'); ls.async = true;
  ls.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
  document.head.appendChild(ls);
  ------------------------------------------------------------------------ */

  /* ---------- 4) ยิง conversion เมื่อมีคนติดต่อเข้ามาสำเร็จ -----------------
     ทำงานอัตโนมัติเมื่อผู้ใช้มาถึงหน้า /thank-you
     ซึ่งเกิดขึ้นเฉพาะตอนส่งฟอร์มสำเร็จจริงเท่านั้น จึงนับเป็น lead ได้แม่นยำ  */
  // รองรับทั้ง /thank-you (บนเว็บจริง) และ /thank-you.html (ตอนเปิดไฟล์ทดสอบบนเครื่อง)
  var isThankYou = /\/thank-you(\.html)?\/?$/.test(window.location.pathname);

  if (isThankYou) {
    dataLayer.push({ event: 'lead_submitted', form: 'contact' });

    // Meta — เอาคอมเมนต์ออกเมื่อเปิดใช้ Pixel
    // if (window.fbq) fbq('track', 'Lead');

    // Google Ads — เอาคอมเมนต์ออกและใส่ค่าจริงจากหน้า Conversions
    // if (window.gtag) gtag('event', 'conversion', { send_to: 'AW-XXXXXXXXX/XXXXXXXXXXXXXXX' });

    // LinkedIn — เอาคอมเมนต์ออกและใส่ Conversion ID จาก Campaign Manager
    // if (window.lintrk) lintrk('track', { conversion_id: XXXXXXX });
  }

  /* ---------- 4.5) นับการกดปุ่ม LINE เป็น conversion ----------------------
     คนไทยจำนวนมากเลือกทัก LINE แทนกรอกฟอร์ม ถ้าไม่นับตรงนี้
     จะประเมินผลโฆษณาต่ำกว่าความจริงมาก                                      */
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-line-cta]') : null;
    if (!el) return;
    dataLayer.push({ event: 'line_click', location: window.location.pathname });

    // Meta — เอาคอมเมนต์ออกเมื่อเปิดใช้ Pixel
    // if (window.fbq) fbq('trackCustom', 'LineClick');

    // Google Ads — ใส่ค่าจริงจากหน้า Conversions
    // if (window.gtag) gtag('event', 'conversion', { send_to: 'AW-XXXXXXXXX/XXXXXXXXXXXXXXX' });
  }, true);

  /* ---------- 5) จุดต่อขยายสำหรับอนาคต -----------------------------------
     ส่วนอื่นของเว็บสามารถส่งสัญญาณเข้ามาได้ด้วย
       window.dispatchEvent(new CustomEvent('sw:track', { detail: { name: 'ชื่อ event' } }));
     แล้วดักที่นี่ที่เดียว ไม่ต้องกระจายโค้ดติดตามไปทั่วเว็บ                    */
  window.addEventListener('sw:track', function (e) {
    var name = (e.detail && e.detail.name) || 'unknown';
    dataLayer.push({ event: name });
  });

  if (PIXELS_ENABLED && window.console && console.info) {
    console.info('[SW] tracking เปิดใช้งานอยู่ — ตรวจว่า privacy.html อัปเดตแล้ว');
  }
})();
