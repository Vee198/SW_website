# CLAUDE.md — คู่มือโปรเจกต์เว็บไซต์ SW Strategic Solutions Group

ไฟล์นี้คือบริบทที่ Claude ต้องอ่านก่อนแตะโค้ดในโปรเจกต์นี้ทุกครั้ง
เขียนเป็นภาษาไทยโดยตั้งใจ — เจ้าของโปรเจกต์สื่อสารเป็นไทย และคอมเมนต์ในโค้ดก็เป็นไทย

---

## 1. โปรเจกต์นี้คืออะไร

เว็บไซต์บริษัท **บริษัท เอส ดับเบิลยู สแตรทีจิก โซลูชันส์ กรุ๊ป จำกัด**
(SW Strategic Solutions Group Co., Ltd.) — ที่ปรึกษาด้านข้อมูลและการเงินสำหรับธุรกิจไทย

- **เป้าหมายเดียวของเว็บ:** ให้ผู้บริหาร SME / โรงงาน / ธุรกิจคลังสินค้า อ่านแล้วเชื่อถือ แล้วกด "นัดคุยฟรี"
  ทุกหน้าจึงจบด้วย CTA ไปหน้า `contact.html` — ห้ามลบ CTA ออกจากหน้าไหน
- **กลุ่มเป้าหมาย:** เจ้าของกิจการและผู้บริหารไทย ที่ไม่ได้เป็นสาย IT → ภาษาต้องเป็นภาษาธุรกิจ ไม่ใช่ศัพท์เทคนิค
- **สองภาษา:** ไทย (ค่าเริ่มต้น) และอังกฤษ สลับด้วยปุ่ม TH/EN บน header

### ที่มาของดีไซน์

ดีไซน์ต้นทางคือไฟล์ `Data Finance Consulting Website.zip` (export จาก Claude Design)
เก็บไว้ที่ `design-source/` — **เป็นเอกสารอ้างอิงเท่านั้น ไม่ใช่โค้ดที่รันได้**
(ไฟล์ `.dc.html` ใช้ template ของ Claude Design เช่น `<sc-if>`, `{{ }}`, `<image-slot>` ซึ่งเบราว์เซอร์ไม่รู้จัก)
เว็บจริงคือไฟล์ `.html` ที่รากโปรเจกต์ ถ้าจะเทียบว่า "ดีไซน์เดิมเป็นยังไง" ให้เปิด zip ดู แต่อย่าแก้ไฟล์ในนั้น

---

## 2. เทคโนโลยีและกติกาเหล็ก

| หัวข้อ | สิ่งที่ใช้ |
|---|---|
| โครงสร้าง | HTML5 static ล้วน — 1 หน้า = 1 ไฟล์ |
| สไตล์ | CSS ธรรมดา + CSS custom properties (`assets/css/`) |
| สคริปต์ | Vanilla JavaScript ES5-friendly (`assets/js/site.js`) |
| ฟอร์ม | Cloudflare Worker + D1 (โค้ดอยู่ใน `worker/`) |
| ฐานข้อมูล | D1 ชื่อ `acc_db` **ใช้ร่วมกับโปรเจกต์อื่น** — ตารางของเว็บนี้คือ `sw_contact_submissions` |
| อีเมลแจ้งเตือน | Resend (เรียกจากฝั่ง Worker เท่านั้น) |
| โฮสต์ | **Cloudflare Worker ตัวเดียว** เสิร์ฟทั้งหน้าเว็บและ API (ไม่ได้ใช้ Pages) |
| Deploy | `.\deploy.ps1` คำสั่งเดียว — ขึ้นทั้งเว็บและ Worker พร้อมกัน |

**กติกาที่ห้ามฝ่าฝืน**

1. **ห้ามเพิ่ม framework / bundler / npm dependency** — ไม่ใช้ React, Tailwind, jQuery, Vite, Node
   จุดขายของโปรเจกต์นี้คือเจ้าของเปิดไฟล์ .html แล้วแก้ได้เอง
2. **ห้ามใส่รหัสสี hex ใหม่ที่ไหนก็ตามนอก `tokens.css`** — ใช้ `var(--...)` เสมอ
3. **ห้ามลบคอมเมนต์ภาษาไทยในไฟล์ CSS/JS** — เจ้าของใช้อ่านเพื่อแก้เอง
4. **ทุกข้อความต้องมีครบทั้ง TH และ EN** — เพิ่มไทยแล้วต้องเพิ่มอังกฤษคู่กันเสมอ (ดู §4)
5. **แก้ header หรือ footer = ต้องแก้ทั้ง 8 ไฟล์ .html** แล้วรัน `python tools/check.py` ยืนยัน
6. **รูปทุกรูปต้องมี `alt`** และรูปที่ไม่ใช่ hero ต้องมี `loading="lazy"`

---

## 3. โครงสร้างไฟล์

```
SW_Website/
├─ CLAUDE.md              ← ไฟล์นี้
├─ SKILL.md               ← ขั้นตอนลงมือแก้/ต่อเติมเว็บ (อ่านคู่กัน)
├─ README.md              ← วิธี deploy + วิธีแก้เนื้อหาสำหรับคนทั่วไป
│
├─ index.html             ← หน้าแรก (hero, บริการ, ขั้นตอน, ผลลัพธ์, แกลเลอรี, CTA)
├─ services.html          ← บริการ 6 อย่าง แบบละเอียด
├─ about.html             ← เกี่ยวกับบริษัท + ข้อมูลจดทะเบียน
├─ vision.html            ← วิสัยทัศน์/พันธกิจ + ประวัติกรรมการผู้จัดการ
├─ case-studies.html      ← ผลงาน 3 เคส
├─ contact.html           ← ฟอร์มติดต่อ + ช่องทางติดต่อ
├─ privacy.html           ← นโยบายความเป็นส่วนตัว (PDPA)
├─ 404.html               ← หน้าไม่พบ (noindex)
│
├─ assets/
│  ├─ css/tokens.css      ← สี ฟอนต์ ระยะ เงา — "แหล่งความจริงเดียว" ของดีไซน์
│  ├─ css/site.css        ← คลาสของ component ทั้งหมด
│  ├─ js/site.js          ← สลับภาษา + เมนูมือถือ + ส่งฟอร์ม
│  └─ img/                ← รูปทั้งหมด (webp เป็นหลัก, โลโก้เป็น png)
│
├─ worker/                ← Cloudflare Worker รับฟอร์ม (deploy แยกจากเว็บ)
│  ├─ src/index.js        ← โค้ด Worker: validate → เก็บ D1 → ส่งอีเมล
│  ├─ schema.sql          ← โครงสร้างตาราง D1 + คำสั่ง PDPA ที่ใช้บ่อย
│  ├─ wrangler.toml       ← ตั้ง database_id, ALLOWED_ORIGIN, MAIL_TO
│  └─ README.md           ← ขั้นตอนติดตั้งทีละข้อ
│
├─ deploy.ps1             ← ตรวจ → สร้าง dist/ → deploy → git push (คำสั่งเดียวจบ)
├─ preview.ps1            ← เปิดดูบนเครื่องเหมือนของจริงที่ localhost:8787
├─ tools/check.py         ← สคริปต์ตรวจก่อน deploy (ลิงก์/รูป/header/ภาษา/PDPA)
├─ tools/publish.py       ← คัดไฟล์ที่เผยแพร่ได้ลง dist/
├─ dist/                  ← สร้างอัตโนมัติตอน deploy (อยู่ใน .gitignore ห้ามแก้มือ)
├─ design-source/         ← zip ดีไซน์ต้นฉบับ (อ้างอิงเท่านั้น)
├─ _headers               ← security + cache headers ของ Cloudflare Pages
├─ _redirects             ← URL สวย ๆ เช่น /services → /services.html
├─ robots.txt, sitemap.xml
└─ .gitignore
```

---

## 3.5 กติกาเรื่อง URL (พลาดบ่อยที่สุด)

Cloudflare เสิร์ฟหน้าเว็บที่ URL **ไม่มี `.html`** — `services.html` ถูกเปิดที่ `/services`
ถ้าเรียก `/services.html` Cloudflare จะตอบ 307 เด้งไป `/services` เสมอ

```
✅ <a href="/services">      ✅ <a href="/">        ✅ canonical = https://.../services
❌ <a href="services.html">  ❌ <a href="index.html">  ❌ canonical = https://.../services.html
```

- **ลิงก์ทุกอันในเว็บต้องเป็นแบบไม่มี `.html`** — `check.py` จะฟ้องเป็น ERROR ถ้าเผลอใส่
- **ห้ามสร้างไฟล์ `_redirects`** ที่แมป `/services` → `/services.html`
  เพราะจะชนกับ 307 ของ Cloudflare กลายเป็น redirect วนไม่รู้จบ (เคยเกิดมาแล้ว)
- ชื่อ**ไฟล์**ยังเป็น `.html` เหมือนเดิม เปลี่ยนแค่ **ลิงก์** กับ **canonical/og:url/sitemap**

---

## 4. ระบบสองภาษาทำงานยังไง (สำคัญที่สุด)

ไม่มีไฟล์แยกภาษา — ทั้งสองภาษาอยู่ใน HTML เดียวกัน แล้วซ่อนด้วย CSS

```html
<p lang="th">ข้อความภาษาไทย</p>
<p lang="en">English text</p>
```

```css
html[data-lang="th"] [lang="en"] { display: none !important; }
html[data-lang="en"] [lang="th"] { display: none !important; }
```

- `<html data-lang="th">` คือค่าเริ่มต้น; `site.js` เปลี่ยนค่านี้เมื่อกดปุ่ม TH/EN แล้วจำไว้ใน `localStorage`
- มีสคริปต์ inline สั้น ๆ ใน `<head>` ของทุกหน้า ตั้ง `data-lang` ก่อนวาดหน้า **เพื่อกันจอกระพริบ — ห้ามลบ**
- คำที่เหมือนกันทั้งสองภาษา (เช่น `Power BI`, ตัวเลข `-62%`) เขียนครั้งเดียวไม่ต้องมี `lang`
- ประโยคที่ปนกัน ให้ห่อเฉพาะส่วนที่ต่าง: `<span lang="th">โทร</span><span lang="en">Tel</span> 064-154-9955`
- `<title>` สลับภาษาผ่าน `<meta name="sw-title-th">` / `sw-title-en` ในแต่ละหน้า

**เช็คได้ด้วย** `python tools/check.py` → ถ้าจำนวนบล็อก TH ≠ EN จะเตือนทันที

---

## 5. ระบบดีไซน์ — "Editorial Light"

อ้างอิงแนวทางจากเว็บบริษัทที่ปรึกษาระดับโลก (McKinsey · BCG · Bain)
**ไม่ได้คัดลอกงานออกแบบของเขา แต่ใช้หลักการเดียวกัน**

### 4 หลักการที่ทำให้เว็บดูเป็นสำนักที่ปรึกษา — ห้ามฝ่าฝืน

1. **หัวข้อเป็น serif เนื้อความเป็น sans** — คู่นี้คือหัวใจ ถ้าเปลี่ยนหัวข้อเป็น sans เว็บจะกลายเป็นบริษัทซอฟต์แวร์ทันที
2. **ไม่มีเงา ไม่มีมุมโค้ง** — `--shadow-*` เป็น `none` และ `--r-*` เป็น `0` ใช้**เส้นแบ่งบาง ๆ** สร้างโครงสร้างแทนกล่อง
3. **เว้นที่ว่างเยอะ** — section เว้นบน-ล่าง 96px ย่อหน้ากว้างไม่เกิน 660px (`--measure`)
4. **สีน้อย** — พื้นขาว หมึก navy เกือบดำ ทองใช้เฉพาะโลโก้กับเส้นคั่นสั้น ๆ **ห้ามเอาทองมาทำปุ่มหรือพื้นหลัง**

### ตารางสี

| บทบาท | ตัวแปร | ค่า | contrast บนขาว |
|---|---|---|---|
| หมึก/หัวข้อ/ปุ่ม | `--sw-ink` `--text-strong` | `#0E1A2B` | 17.5:1 |
| เนื้อความ | `--text-body` | `#3D4757` | 9.4:1 |
| คำอธิบายรอง | `--text-muted` | `#68717F` | 4.9:1 |
| ป้ายเล็ก | `--text-faint` | `#8C95A3` | 3.0:1 |
| เส้นแบ่ง | `--border-hairline` | `#E2E5EA` | — |
| พื้นหน้า | `--sw-paper` | `#FFFFFF` | — |
| แถบสลับสี | `--sw-paper-warm` | `#FAF9F7` | — |
| ทอง (ตัวหนังสือ) | `--sw-gold` | `#8F6C1F` | 4.9:1 |
| ทอง (เส้นตกแต่ง) | `--sw-gold-line` | `#C8A24A` | ห้ามใช้กับตัวหนังสือ |

**ทุกคู่ผ่าน WCAG AA แล้ว** — ถ้าจะแก้สีตัวหนังสือ ต้องรันสคริปต์ตรวจ contrast ใน `SKILL.md` ก่อนเสมอ

### ฟอนต์

| ใช้กับ | ตัวแปร | ฟอนต์ |
|---|---|---|
| หัวข้อ h1-h4, ตัวเลขผลลัพธ์, wordmark | `--font-display` | **Noto Serif Thai** + Source Serif 4 |
| เนื้อความ ปุ่ม ฟอร์ม เมนู | `--font-body` | **IBM Plex Sans Thai** + IBM Plex Sans |

- `h1` ใช้น้ำหนัก **400** (ไม่ใช่ตัวหนา) — ตัวใหญ่น้ำหนักปกติดูสง่ากว่า นี่คือลูกเล่นของ MBB
- `h2`-`h4` ใช้ 600
- ตัวเลขผลลัพธ์ (`.stat`) เป็น serif น้ำหนัก 400 ขนาด 56px สีหมึก **ไม่ใช่สีทอง**

### คลาสที่มีอยู่แล้ว (ใช้ซ้ำ อย่าสร้างใหม่)

`.container` `.section` `.section--sunken` `.section--card` `.page`
`.eyebrow` `.label` `.h-section` `.h-page` `.lead` `.muted` `.faint` `.rule-gold`
`.btn .btn--primary .btn--ghost .btn--sm` `.btn-row` `.link-underline`
`.card .card--lg .card--sm .card__title .card__text`
`.checklist` `.stat .stat--md .stat--sm .stat__unit .stat-row` `.pill`
`.frame .frame--16x9 .frame--16x10` `.grid .grid--2lg .grid--3 .grid--4 .grid--gallery`

**ก่อนเขียน CSS ใหม่ ให้เช็คก่อนว่ามีคลาสเดิมใช้ได้ไหม**

### สิ่งที่เป็นเอกลักษณ์แบรนด์ ห้ามเปลี่ยนโดยไม่ถาม

- โลโก้ม้าหมากรุก — สื่อถึง "การเดินเกมอย่างมีกลยุทธ์" ใช้ขนาดเล็ก (header 32px, hero 56px) ให้ตัวหนังสือนำ
- eyebrow ตัวพิมพ์ใหญ่ระยะห่างมาก เหนือหัวข้อทุก section
- โลโก้ลูกค้าและรูปผู้บริหารเป็น**ขาวดำ** (CSS `filter: grayscale(1)`) — สีจะกลับมาเมื่อเอาเมาส์ชี้

### สิ่งที่เลิกใช้แล้ว (ของธีมมืดเดิม — เจอที่ไหนให้ลบ)

- `.hero__streak` เส้นทองเฉียง
- `.card__icon` emoji บนการ์ด
- `--shadow-card` ที่มีค่าจริง, `border-radius` > 0
- ปุ่มสีทอง, พื้นหลัง navy เต็มหน้า

## 6. ฟอร์มติดต่อ — Worker + D1 (ของบริษัทเอง)

**ไม่ใช้บริการรับฟอร์มของบุคคลที่สาม** ข้อมูลลูกค้าอยู่ในบัญชี Cloudflare ของบริษัทเองทั้งหมด

```
Worker "sw-contact" ตัวเดียว ทำ 2 อย่าง
  GET  /*            → เสิร์ฟไฟล์จาก dist/ (binding ASSETS)
  POST /api/contact  → D1 acc_db ตาราง sw_contact_submissions → Resend
                                      └──────────────▶  Resend ─▶ อีเมลแจ้งทีมงาน
```

- **endpoint ฝั่งเว็บ:** `SW_CONTACT_ENDPOINT = '/api/contact'` ใน `assets/js/site.js`
  ใช้ path สั้น ๆ เพราะอยู่โดเมนเดียวกัน — ย้ายโดเมนไม่ต้องแก้
- **โค้ด Worker และวิธี deploy:** อยู่ใน `worker/` — อ่าน `worker/README.md`
- ฟอร์มส่งเป็น JSON ไปที่ `POST /api/contact` และคาดหวังคำตอบ `{ "ok": true }`
- รหัสสถานะที่ฝั่งเว็บจัดการไว้แล้ว: `422` = ข้อมูลไม่ครบ/ไม่ได้ติ๊กยินยอม, `429` = ส่งถี่เกินไป

**สิ่งที่ Worker ทำให้แล้ว — อย่าเขียนซ้ำฝั่งเว็บ**
- ตรวจ honeypot (`botcheck`), ตรวจอีเมล, บังคับ `consent`
- rate limit 3 ครั้ง/15 นาที ต่อ IP (เก็บ IP เป็นค่าแฮช ไม่เก็บ IP จริง)
- จำกัดความยาวทุกช่อง กันข้อมูลบวม
- CORS อนุญาตเฉพาะโดเมนใน `ALLOWED_ORIGIN` (มีผลน้อยแล้วเพราะ same-origin แต่คงไว้)
- หน้าที่ไม่มีจริงและไม่ใช่ `/api/*` → Worker หยิบ `404.html` จาก ASSETS มาตอบ

**กติกาความปลอดภัย**
- `RESEND_API_KEY` และ `EXPORT_TOKEN` เป็น **secret ของ Worker เท่านั้น** — ห้ามโผล่ในไฟล์ .html/.js หรือใน git
- ถ้าเพิ่มช่องใหม่ในฟอร์ม ต้องเพิ่ม 3 ที่: `contact.html`, `MAX` + `INSERT` ใน `worker/src/index.js`, และคอลัมน์ใน `worker/schema.sql`
- **`acc_db` มีตารางของโปรเจกต์อื่นอยู่ด้วย** — ทุกคำสั่ง SQL ต้องระบุตาราง `sw_contact_submissions` เสมอ
  ห้ามรัน `DROP TABLE`, `DELETE` แบบไม่ระบุตาราง หรือคำสั่งที่กระทบทั้งฐานเด็ดขาด
- เพิ่มโดเมนใหม่ที่จะใช้ฟอร์ม → ต้องเติมใน `ALLOWED_ORIGIN` ของ `wrangler.toml` แล้ว deploy Worker ใหม่

## 7. Deploy บน Cloudflare Pages

**วิธี deploy:** รัน `.\deploy.ps1` ที่รากโปรเจกต์ (Windows PowerShell)
สคริปต์จะ: ตรวจ `check.py` → สร้าง `dist/` ด้วย `tools/publish.py` → `wrangler pages deploy dist` → git commit + push

**สำคัญ: เว็บที่ deploy คือเนื้อใน `dist/` ไม่ใช่ทั้งโฟลเดอร์**
`tools/publish.py` คัดเฉพาะ 8 หน้า + `assets/` + `robots.txt` + `sitemap.xml` + `_headers` + `_redirects`
ที่เหลือ (`worker/`, `tools/`, `design-source/`, ไฟล์ .md) ตั้งใจไม่ให้ขึ้นเว็บ

**ถ้าเพิ่มไฟล์ใหม่ที่ต้องเผยแพร่** (เช่น หน้า .html ใหม่, `favicon.ico`, `ads.txt`)
ต้องเพิ่มชื่อไฟล์ในลิสต์ `PAGES` หรือ `EXTRAS` ของ `tools/publish.py` ด้วย
**ไม่งั้นไฟล์จะไม่ขึ้นเว็บทั้งที่มีอยู่ในโฟลเดอร์** — เป็นกับดักที่พลาดกันบ่อย

**Cloudflare Pages project:** `sw-website` (deploy แบบ direct upload จากเครื่อง ไม่ได้ผูกกับ GitHub)
GitHub เก็บประวัติโค้ดอย่างเดียว — `git push` ไม่ทำให้เว็บอัปเดตเอง ต้องรัน `deploy.ps1`

**Worker deploy แยกต่างหาก** (Cloudflare Pages ไม่ deploy ให้)
```bash
cd worker && npx wrangler deploy
```

**เจ้าของโปรเจกต์ใช้ Windows + PowerShell** — error `cannot be loaded because running scripts
is disabled` คือ ExecutionPolicy ของ Windows ไม่ใช่ปัญหาของโค้ด ทางแก้ตามลำดับความง่าย

1. `npm` / `npx` → ใช้ `npm.cmd` / `npx.cmd` แทน
2. สคริปต์ `.ps1` ของโปรเจกต์ → `powershell -ExecutionPolicy Bypass -File .\deploy.ps1`
3. แก้ถาวร → `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`
   **ตามด้วย `Get-ChildItem *.ps1 | Unblock-File`** เพราะไฟล์ที่ส่งมาให้เขาถูกติดป้ายว่า
   มาจากอินเทอร์เน็ต ถ้าไม่ Unblock ก็ยังรันไม่ได้อยู่ดี

**กติกาการเขียนไฟล์ `.ps1` ในโปรเจกต์นี้ — พลาดแล้วสคริปต์พังทั้งไฟล์**

| ต้องทำ | เหตุผล |
|---|---|
| บันทึกเป็น **UTF-8 with BOM** | PowerShell 5.1 บน Windows อ่านไฟล์ที่ไม่มี BOM เป็น ANSI → ภาษาไทยกลายเป็นขยะ → ขึ้น `The string is missing the terminator` |
| ขึ้นบรรทัดใหม่แบบ **CRLF** | มาตรฐาน Windows |
| ตกแต่งด้วย **ASCII เท่านั้น** (`---`, `===`) | อักขระวาดกล่อง `─ ═ │` เพิ่มความเสี่ยงเรื่องการเข้ารหัสโดยไม่จำเป็น |
| ข้อความไทยอยู่ใน string/comment ได้ | ปลอดภัยเมื่อมี BOM แล้ว |

อาการเวลาเข้ารหัสผิด: PowerShell แสดงตัวอักษรเป็น `î•î•î•` แล้วฟ้อง parser error
ที่บรรทัดสุดท้ายของไฟล์ ทั้งที่บรรทัดนั้นไม่มีอะไรผิด — **อย่าไปไล่แก้ syntax ให้เสียเวลา
ให้เขียนไฟล์ใหม่พร้อม BOM**
**เวลาเขียนคำสั่งให้เขา ให้เขียนเป็นรูปแบบ PowerShell บน Windows เสมอ**
(ใช้ `;` คั่นคำสั่งแทน `&&` ถ้าต้องต่อหลายคำสั่ง)

**เช็คลิสต์ก่อน push ทุกครั้ง**
```bash
python tools/check.py          # ต้องได้ ERROR 0
python -m http.server 8000     # เปิด http://localhost:8000 ดูด้วยตาเอง
```

**ถ้าเปลี่ยนโดเมนจริงเป็นชื่ออื่น** ต้องแก้ 3 จุด: `robots.txt`, `sitemap.xml`, และ `<link rel="canonical">` + `og:url` + JSON-LD ในทุกไฟล์ .html

---

## 8. ข้อมูลบริษัทที่ต้องตรงกันทุกที่

ถ้าข้อมูลพวกนี้เปลี่ยน ต้องไล่แก้ให้ครบทุกหน้า (grep หาก่อนแก้)

| ข้อมูล | ค่าปัจจุบัน | อยู่ในไฟล์ |
|---|---|---|
| ชื่อบริษัท (ไทย) | บริษัท เอส ดับเบิลยู สแตรทีจิก โซลูชันส์ กรุ๊ป จำกัด | about, index (JSON-LD) |
| ชื่อบริษัท (อังกฤษ) | SW Strategic Solutions Group Co., Ltd. | ทุกหน้า (footer) |
| โทรศัพท์ | 064-154-9955 (`tel:+66641549955`) | footer ทุกหน้า, about, contact |
| อีเมล | v.suwatvanich@swstrategicsol.com | footer ทุกหน้า, about, contact |
| ที่อยู่ | 90/14 หมู่บ้านเพอร์เฟคพาร์คบางใหญ่ 2 หมู่ 1 ซอย 2 ถนนทางหลวงชนบท (สายอุทิศ–วัดหลังบาง) ต.บ้านใหม่ อ.บางใหญ่ จ.นนทบุรี 11140 | about, contact, index (JSON-LD) |
| เวลาทำการ | จันทร์–ศุกร์ 9:00–18:00 | contact |
| กรรมการผู้จัดการ | วีระชัย สุวัจน์วณิช / Veerachai Suwatvanich | vision |

---

## 9. เรื่องที่ยังค้างอยู่ (ถามเจ้าของก่อนตัดสินใจ)

- [ ] **Worker ยังไม่ได้ deploy** — ต้องใส่ `database_id` ใน `worker/wrangler.toml` แล้วรัน `wrangler deploy`
- [ ] **โดเมนจริง** — โค้ดสมมติไว้ว่า `www.swstrategicsol.com` และ API ที่ `api.swstrategicsol.com` ต้องยืนยัน
- [ ] **Resend** — ต้อง verify โดเมนและตั้ง `RESEND_API_KEY` ก่อน ถึงจะมีอีเมลแจ้งเตือน
- [ ] **เลขทะเบียนนิติบุคคล 13 หลัก** — ควรใส่ใน footer/privacy เพื่อความน่าเชื่อถือและครบตาม PDPA
- [ ] **LINE Official Account** — ถ้ามี ควรเพิ่มปุ่มติดต่อ (คนไทยชอบทักไลน์มากกว่ากรอกฟอร์ม)
- [ ] **สิทธิ์ใช้โลโก้ลูกค้า** — Summit / ฟอร์ยู โฮมเดคคอร์ / ไทยซอสเทรดดิ้ง ได้ขออนุญาตแล้วหรือยัง
- [ ] **ตัวเลขใน case studies** — ยืนยันว่าเปิดเผยต่อสาธารณะได้ ไม่ผิด NDA
- [ ] **Google Analytics / Search Console** — ยังไม่ได้ติดตั้ง (ถ้าติดตั้ง ต้องอัปเดต privacy.html หัวข้อคุกกี้)
- [ ] **ลบข้อมูลเกิน 24 เดือน** — ประกาศไว้ใน privacy.html แล้ว ต้องมีคนรันคำสั่งจริงปีละครั้ง (ดู `worker/schema.sql`)

### ข้อผูกพันตาม PDPA ที่ประกาศไว้ในเว็บแล้ว — ห้ามแก้โดยไม่ตรวจสอบระบบจริง

`privacy.html` ประกาศต่อสาธารณะว่าเราทำสิ่งเหล่านี้ ถ้าจะแก้โค้ดที่ขัดกับข้อความนี้ **ต้องแก้หน้า privacy ด้วย**

| ประกาศไว้ | โค้ดที่รองรับ |
|---|---|
| ไม่เก็บ IP จริง | `hashIp()` ใน `worker/src/index.js` |
| ไม่ใช้คุกกี้ติดตาม | ทั้งเว็บใช้แค่ `localStorage` เก็บภาษา |
| ไม่ส่งข้อมูลให้บุคคลที่สาม | มีแค่ Cloudflare + Resend เท่านั้น |
| เก็บไม่เกิน 24 เดือน | คำสั่ง DELETE ท้าย `worker/schema.sql` |
| ลบให้ภายใน 30 วันเมื่อร้องขอ | คำสั่ง DELETE by email ท้าย `worker/schema.sql` |

## 10. วิธีทำงานกับโปรเจกต์นี้

1. อ่าน `SKILL.md` ก่อนลงมือทุกครั้ง — มีขั้นตอนต่อสถานการณ์ (เพิ่ม case study, เพิ่มหน้า, แก้สี ฯลฯ)
2. แก้ให้น้อยที่สุดเท่าที่โจทย์ต้องการ — อย่ารีแฟกเตอร์สิ่งที่ไม่ได้ถูกขอ
3. รัน `python tools/check.py` ทุกครั้งก่อนบอกว่าเสร็จ
4. รายงานผลเป็นภาษาไทย สั้น ๆ ว่าแก้ไฟล์ไหนไปบ้าง
5. ถ้าโจทย์กระทบเรื่องในหัวข้อ §9 (ข้อมูลจริงของบริษัท / ข้อมูลลูกค้า) — **ถามก่อน ห้ามเดา**
