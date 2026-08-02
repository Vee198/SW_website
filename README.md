# เว็บไซต์ SW Strategic Solutions Group

เว็บไซต์บริษัท เอส ดับเบิลยู สแตรทีจิก โซลูชันส์ กรุ๊ป จำกัด
HTML/CSS/JS ธรรมดา — ไม่ต้องติดตั้งอะไร ไม่ต้อง build

---

## เปิดดูบนเครื่องตัวเองก่อน deploy

ใช้สคริปต์ **`preview.ps1`** — คลิกขวา → Run with PowerShell

```powershell
.\preview.ps1
```

จะเปิดเว็บที่ http://localhost:8787 **เหมือนของจริงทุกอย่าง** รวมถึงฟอร์มติดต่อ
(ข้อมูลที่กรอกตอน preview จะลงฐานข้อมูลจำลองในเครื่อง ไม่ปนกับของจริง)

กด `Ctrl + C` เพื่อหยุด

> เปิดไฟล์ `.html` ด้วยการดับเบิลคลิกก็พอดูหน้าตาได้ แต่ลิงก์ระหว่างหน้าและฟอร์มจะไม่ทำงาน
> เพราะเว็บใช้ URL แบบ `/services` ที่ต้องมีเซิร์ฟเวอร์

---

## ระบบทำงานยังไง

**เว็บไซต์กับตัวรับฟอร์มอยู่ใน Cloudflare Worker ตัวเดียวกัน URL เดียวกัน**

```
https://sw-contact.veerachai-mitmorn.workers.dev
   ├─ /              → หน้าแรก          ┐
   ├─ /services      → หน้าบริการ        │ เสิร์ฟไฟล์จากโฟลเดอร์ dist/
   ├─ /contact       → หน้าติดต่อ        │
   ├─ /privacy       → นโยบาย PDPA      ┘
   └─ /api/contact   → รับฟอร์ม → เก็บลง D1 (acc_db) → ส่งอีเมลแจ้ง
```

**ข้อมูลลูกค้าอยู่ในบัญชี Cloudflare ของเราทั้งหมด** ไม่ผ่านบริการรับฟอร์มของใคร

> **URL ไม่มี `.html`** — Cloudflare เสิร์ฟหน้าเว็บที่ `/services` ไม่ใช่ `/services.html`
> ลิงก์ในเว็บจึงเขียนเป็น `href="/services"` ทั้งหมด **อย่าเปลี่ยนกลับไปใส่ `.html`**
> ไม่งั้นทุกครั้งที่คลิกจะโดนเด้ง redirect หนึ่งรอบโดยไม่จำเป็น

---

## 3 อย่างที่ต้องทำก่อนขึ้นเว็บจริง

### 1. ติดตั้ง Worker + D1
เปิดคู่มือ **`worker/README.md`** ทำตามทีละข้อ (~15 นาที)
สรุปสั้น ๆ:

```bash
cd worker
npm install
npx wrangler login
npm run db:init                        # สร้างตารางใน acc_db (ตั้ง database_id ให้แล้ว)
npx wrangler secret put RESEND_API_KEY # รหัสส่งอีเมล (ข้ามไปก่อนก็ได้)
npx wrangler secret put EXPORT_TOKEN   # รหัสดึงข้อมูลออก
npm run deploy
```

> ฐานข้อมูลใช้ `acc_db` ร่วมกับโปรเจกต์อื่น (แผนฟรีจำกัด 10 ฐานต่อบัญชี)
> ตารางของเว็บนี้ชื่อ `sw_contact_submissions` แยกจากตารางอื่นชัดเจน

> **บน Windows ถ้าขึ้น `npm.ps1 cannot be loaded`** ให้เติม `.cmd` ต่อท้ายทุกคำสั่ง
> (`npm.cmd install`, `npx.cmd wrangler login` ...) หรือเปิดสิทธิ์ถาวรด้วย
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`
> รายละเอียดอยู่ต้นไฟล์ `worker/README.md`

URL ของ Worker ตอนนี้คือ `https://sw-contact.veerachai-mitmorn.workers.dev`
ตั้งไว้ในตัวแปร `SW_CONTACT_ENDPOINT` ของ `assets/js/site.js` ให้แล้ว

### 2. ยืนยันชื่อโดเมน
โค้ดตั้งไว้ว่าเว็บคือ `www.swstrategicsol.com` และ API คือ `api.swstrategicsol.com`
ถ้าใช้ชื่ออื่น ต้องแก้ใน `robots.txt`, `sitemap.xml`, ทุกไฟล์ `.html`, `site.js` และ `worker/wrangler.toml`
(บอก Claude ว่า "เปลี่ยนโดเมนเป็น xxx" แล้วมันจะไล่แก้ให้ครบเอง)

### 3. ตรวจข้อมูลก่อน
- เบอร์โทร / อีเมล / ที่อยู่ ถูกต้องไหม
- โลโก้ลูกค้า 3 รายในหน้าแรก ขออนุญาตแล้วหรือยัง
- ตัวเลขในหน้าผลงาน เปิดเผยได้ ไม่ผิดสัญญากับลูกค้า
- เลขทะเบียนนิติบุคคล 13 หลัก — ยังไม่ได้ใส่ ควรเพิ่มใน `privacy.html`

---

## ดูข้อมูลที่ลูกค้ากรอกเข้ามา

```bash
cd worker
npm run db:list        # ดู 20 รายการล่าสุดในหน้าจอ
```

หรือโหลดเป็นไฟล์ Excel:
```bash
curl -H "Authorization: Bearer <EXPORT_TOKEN>" \
  "https://sw-contact.veerachai-mitmorn.workers.dev/api/submissions?format=csv&limit=1000" -o submissions.csv
```

---

## เอาเว็บขึ้นออนไลน์

คลิกขวาที่ไฟล์ **`deploy.ps1`** → **Run with PowerShell**
หรือเปิด PowerShell ที่โฟลเดอร์นี้แล้วพิมพ์

```powershell
.\deploy.ps1
```

สคริปต์ทำ 4 ขั้นตามลำดับ และหยุดทันทีถ้าเจอปัญหา

1. ตรวจสุขภาพเว็บ — เจอ ERROR แล้วหยุด ไม่ deploy ของเสีย
2. เตรียมโฟลเดอร์ `dist/` เฉพาะไฟล์ที่เผยแพร่ได้
3. deploy เว็บ + Worker ขึ้น Cloudflare พร้อมกัน (คำสั่งเดียว)
4. commit + push ขึ้น GitHub

เสร็จแล้วเปิด https://sw-contact.veerachai-mitmorn.workers.dev ได้ทันที

### ถ้ารันสคริปต์ `.ps1` ไม่ได้ (Windows)

ขึ้นข้อความ `cannot be loaded because running scripts is disabled on this system` ?
เป็นค่าความปลอดภัยเริ่มต้นของ Windows ไม่ใช่ไฟล์เสีย เลือกวิธีใดวิธีหนึ่ง

**ครั้งเดียวพอ — รันแบบข้ามนโยบาย**
```powershell
powershell -ExecutionPolicy Bypass -File .\deploy.ps1
powershell -ExecutionPolicy Bypass -File .\preview.ps1
```

**แก้ถาวร — ทำครั้งเดียวจบ**
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
Get-ChildItem *.ps1 | Unblock-File
```
บรรทัดที่ 2 จำเป็น เพราะ Windows ติดป้ายไฟล์ที่ได้รับมาว่า "มาจากอินเทอร์เน็ต"
`RemoteSigned` จึงยังบล็อกอยู่จนกว่าจะ `Unblock-File`

**ไม่อยากใช้สคริปต์เลย — พิมพ์เอง 4 บรรทัด**
```powershell
python tools\publish.py
cd worker
npx.cmd wrangler deploy
cd ..
```

---

### ทำไมต้องมี `dist/`

โฟลเดอร์โปรเจกต์มีของที่ไม่ควรให้คนนอกเห็นปนอยู่ — โค้ด Worker, สคริปต์ภายใน,
คู่มือ และไฟล์ zip ดีไซน์ต้นฉบับ 2.4MB ถ้า deploy ทั้งโฟลเดอร์ ใครก็โหลดไฟล์พวกนี้ได้

`tools/publish.py` จึงคัดเฉพาะไฟล์เว็บจริงไปไว้ใน `dist/` — **เหลือ 0.6 MB จาก 3.1 MB**

> `dist/` ถูกสร้างใหม่ทุกครั้งที่ deploy และอยู่ใน `.gitignore` — ไม่ต้องแก้อะไรในนั้น
> **ถ้าเพิ่มหน้าใหม่ ต้องเพิ่มชื่อไฟล์ในลิสต์ `PAGES` ของ `tools/publish.py` ด้วย**

### เปลี่ยนไปใช้โดเมนบริษัท

Cloudflare Dashboard → **Workers & Pages → sw-contact → Settings → Domains & Routes**
→ **Add → Custom domain** → ใส่ `www.swstrategicsol.com`

ไม่ต้องแก้โค้ดเลย เพราะฟอร์มเรียก `/api/contact` แบบ path สั้น ๆ ย้ายโดเมนก็ยังทำงาน
(แต่ควรแก้ `SITE_URL` ในลิงก์ canonical และ `sitemap.xml` ให้ตรงโดเมนใหม่ — บอก Claude ได้)

### ตั้ง GitHub ครั้งแรก (ทำครั้งเดียว)

1. สร้าง repo เปล่าที่ https://github.com/new — แนะนำตั้งเป็น **Private**
2. รัน 2 คำสั่งนี้ที่โฟลเดอร์โปรเจกต์

```powershell
git remote add origin https://github.com/<ชื่อคุณ>/sw-website.git
git push -u origin main
```

หลังจากนี้ `deploy.ps1` จะ push ให้อัตโนมัติทุกครั้ง

> **`git push` เฉย ๆ เว็บไม่อัปเดตนะครับ** — GitHub เก็บประวัติโค้ดอย่างเดียว
> ต้องรัน `deploy.ps1` เว็บถึงจะเปลี่ยน

---

## ตรวจสุขภาพเว็บก่อน push

```bash
python tools/check.py
```

ตรวจให้ 7 อย่าง: ไฟล์ครบ, ลิงก์ไม่เสีย, รูปไม่หาย, ทุกรูปมี alt,
header/footer ตรงกันทุกหน้า, ข้อความไทย-อังกฤษครบคู่ และการตั้งค่า Worker/PDPA

**หมายเหตุ:** `deploy.ps1` เรียก `check.py` ให้อยู่แล้ว ไม่ต้องรันเองก็ได้

---

## แก้เนื้อหาเอง

| อยากแก้ | เปิดไฟล์ |
|---|---|
| ข้อความหน้าแรก | `index.html` |
| รายละเอียดบริการ | `services.html` |
| ข้อมูลบริษัท / ที่อยู่ | `about.html` |
| วิสัยทัศน์ / ประวัติผู้บริหาร | `vision.html` |
| ผลงาน | `case-studies.html` |
| ช่องทางติดต่อ / ฟอร์ม | `contact.html` |
| นโยบายความเป็นส่วนตัว | `privacy.html` |
| ตัวรับฟอร์ม / ฐานข้อมูล | `worker/` |
| สี ฟอนต์ ขนาดตัวอักษร | `assets/css/tokens.css` |
| รูปภาพ | `assets/img/` |

**ข้อควรระวัง:** ทุกข้อความมี 2 ภาษาเขียนติดกัน แก้ไทยแล้วอย่าลืมแก้อังกฤษด้วย

```html
<p lang="th">ข้อความภาษาไทย</p>
<p lang="en">English text</p>
```

ถ้าแก้ header หรือ footer ต้องแก้ให้เหมือนกันทั้ง 8 ไฟล์ .html

---

## ให้ Claude ช่วยแก้

โฟลเดอร์นี้มี `CLAUDE.md` และ `SKILL.md` อยู่แล้ว
เปิด Claude ในโฟลเดอร์นี้แล้วสั่งเป็นภาษาไทยได้เลย เช่น

- "เพิ่ม case study ใหม่ เรื่องวางระบบบัญชีร้านอาหาร ปิดงบเร็วขึ้น 40%"
- "เปลี่ยนสีทองให้เข้มขึ้นอีกนิด"
- "เพิ่มปุ่ม LINE ที่หน้า contact"
- "ลูกค้าคนนี้ขอให้ลบข้อมูล จัดการให้หน่อย"
- "เพิ่มหน้า Blog"

Claude จะอ่านกติกาในสองไฟล์นั้นแล้วแก้ให้ตรงสไตล์เดิมอัตโนมัติ

---

## โครงสร้างไฟล์

```
index.html  services.html  about.html  vision.html
case-studies.html  contact.html  privacy.html  404.html
assets/css/tokens.css   ← สี ฟอนต์ ระยะ (แก้ที่นี่ที่เดียว ทั้งเว็บเปลี่ยนตาม)
assets/css/site.css     ← หน้าตาของแต่ละส่วน
assets/js/site.js       ← สลับภาษา เมนูมือถือ ส่งฟอร์ม
assets/img/             ← รูปทั้งหมด
worker/                 ← Worker + D1 รับฟอร์มติดต่อ (deploy แยก)
tools/check.py          ← สคริปต์ตรวจก่อน deploy
design-source/          ← ไฟล์ดีไซน์ต้นฉบับจาก Claude Design (อ้างอิงเท่านั้น)
CLAUDE.md  SKILL.md     ← คู่มือสำหรับ Claude
```
