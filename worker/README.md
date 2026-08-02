# Contact Worker — ตัวรับฟอร์มติดต่อ

Cloudflare Worker + D1 ที่รับข้อมูลจากฟอร์มหน้า `contact.html`
เก็บลงฐานข้อมูลของบริษัทเอง แล้วส่งอีเมลแจ้งเตือน

**ข้อมูลลูกค้าอยู่ในบัญชี Cloudflare ของคุณทั้งหมด** ไม่ผ่านตัวกลางใด ๆ
(Resend เห็นเฉพาะเนื้อหาอีเมลแจ้งเตือนที่ส่งถึงคุณ ไม่ได้เก็บฐานข้อมูล)

---

## เส้นทางข้อมูล

```
ลูกค้ากรอกฟอร์ม (contact.html)
   ↓ POST /api/contact
Cloudflare Worker  "sw-contact"
   ├─ ตรวจ honeypot / ตรวจข้อมูล / ตรวจการยินยอม PDPA
   ├─ กันสแปม: IP เดียวกันส่งได้ 3 ครั้ง/15 นาที (เก็บ IP เป็นค่าแฮช ไม่ใช่ IP จริง)
   ├─ บันทึกลง D1 ตาราง submissions      ← ข้อมูลตัวจริงอยู่ที่นี่ ในบัญชีคุณ
   └─ ส่งอีเมลแจ้งผ่าน Resend            ← กด Reply ตอบลูกค้าได้ทันที
```

---

## หมายเหตุสำหรับ Windows / PowerShell (อ่านก่อนเริ่ม)

ถ้ารัน `npm` หรือ `npx` ใน PowerShell แล้วขึ้นข้อความนี้

```
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because
running scripts is disabled on this system.
```

**ไม่ได้พังนะครับ** — เป็นค่าความปลอดภัยเริ่มต้นของ Windows ที่ปิดการรันสคริปต์ `.ps1` ไว้
และบน Windows ตัว `npm` / `npx` เป็นไฟล์ `.ps1` พอดี

เลือกวิธีแก้อย่างใดอย่างหนึ่ง

**วิธีที่ 1 — เติม `.cmd` ต่อท้าย (เร็วสุด ไม่ต้องแก้ setting)**

```powershell
npm.cmd install
npx.cmd wrangler login
npx.cmd wrangler d1 create sw-contact
npm.cmd run db:init
npm.cmd run deploy
```

ทุกคำสั่งในคู่มือนี้ใช้ `.cmd` ต่อท้ายได้หมด ผลลัพธ์เหมือนกันทุกอย่าง

**วิธีที่ 2 — เปิดสิทธิ์รันสคริปต์ถาวร (แนะนำถ้าจะใช้ Node บ่อย)**

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

`RemoteSigned` = สคริปต์ที่เขียนเองในเครื่องรันได้ ส่วนที่โหลดมาจากอินเทอร์เน็ตต้องมีลายเซ็นดิจิทัล
เป็นระดับที่ Microsoft แนะนำสำหรับเครื่องนักพัฒนา และเป็นขอบเขต `CurrentUser` จึงไม่ต้องเปิด PowerShell แบบ Administrator

**วิธีที่ 3 — ใช้ Command Prompt (cmd) แทน PowerShell**
พิมพ์ `npm` `npx` ได้ตามปกติ ไม่ติดนโยบายนี้

> ปัญหานี้เกิดเฉพาะบน Windows — บน macOS และ Linux ใช้ `npm` / `npx` ได้เลย

---

## ติดตั้งครั้งแรก (ทำครั้งเดียว ~15 นาที)

### 0. เตรียม

```bash
cd worker
npm install
npx wrangler login
```

### 1. ฐานข้อมูล D1 — ใช้ `acc_db` ร่วมกับโปรเจกต์อื่น

**ตั้งค่าไว้ให้แล้วใน `wrangler.toml`** ไม่ต้องสร้างฐานข้อมูลใหม่

```toml
database_name = "acc_db"
database_id = "086d501b-4eb8-422e-8483-52a0385adb5c"
```

เหตุผล: แผนฟรีของ Cloudflare จำกัด **10 ฐานข้อมูลต่อบัญชี** และโควตาเต็มแล้ว
เว็บนี้จึงไปอาศัยอยู่ใน `acc_db` โดยใช้ตารางชื่อ **`sw_contact_submissions`**
(ขึ้นต้นด้วย `sw_` เพื่อไม่ให้ชนกับตารางของโปรเจกต์อื่นที่อยู่ในฐานเดียวกัน)

> **ปลอดภัยกับข้อมูลเดิม** — `schema.sql` ใช้ `CREATE TABLE IF NOT EXISTS`
> และทุกคำสั่งอ้างถึงตาราง `sw_contact_submissions` เท่านั้น ไม่แตะตารางอื่นใน `acc_db`

ถ้าวันหนึ่งอยากแยกออกมาเป็นฐานข้อมูลของตัวเอง (เช่น ลบฐานเก่าทิ้งจนมีที่ว่าง):
```bash
npx wrangler d1 create sw-contact     # แล้วเอา database_id ใหม่ไปใส่ใน wrangler.toml
npm run db:init                        # สร้างตารางในฐานใหม่
```

### 2. สร้างตาราง

```bash
npm run db:init
```

คำสั่งนี้เพิ่มตาราง `sw_contact_submissions` และ index 3 ตัวเข้าไปใน `acc_db`

### 3. ตั้งค่าอีเมล (Resend)

1. สมัครที่ https://resend.com (ฟรี 3,000 ฉบับ/เดือน)
2. **Domains → Add Domain** → ใส่ `swstrategicsol.com`
3. Resend จะให้ DNS record มา 3 อัน (SPF, DKIM, DMARC) → เพิ่มใน Cloudflare DNS
   *(ถ้าโดเมนอยู่ที่ Cloudflare อยู่แล้ว กด Add record ตามที่เขาบอกได้เลย)*
4. รอ verify ผ่าน แล้วไป **API Keys → Create API Key** → ก๊อปรหัสที่ขึ้นต้นด้วย `re_`

```bash
npx wrangler secret put RESEND_API_KEY
# วางรหัส re_xxxx แล้ว Enter
```

> **ยังไม่อยากตั้ง Resend ตอนนี้ก็ได้** — ข้ามข้อนี้ไปก่อน ฟอร์มยังทำงานปกติ
> ข้อมูลถูกเก็บลง D1 ครบ แค่ไม่มีอีเมลแจ้ง (ดูข้อมูลด้วยคำสั่งในหัวข้อถัดไป)

### 4. ตั้งรหัสสำหรับดึงข้อมูลออก

```bash
npx wrangler secret put EXPORT_TOKEN
# ใส่รหัสสุ่มยาว ๆ เช่นจาก:  openssl rand -hex 24
```

รหัสนี้ใช้ 2 อย่าง: ป้องกัน endpoint ดึงข้อมูล และเป็น salt ของการแฮช IP
**ถ้าเปลี่ยนภายหลัง rate limit ของข้อมูลเก่าจะรีเซ็ต** (ไม่กระทบข้อมูลที่เก็บไว้)

### 5. แก้ค่าใน `wrangler.toml`

ตรวจ `ALLOWED_ORIGIN` ให้ตรงกับโดเมนจริง และ `MAIL_TO` ให้เป็นอีเมลที่จะรับแจ้ง

### 6. Deploy

```bash
npm run deploy
```

จะได้ URL แบบ `https://sw-contact.<ชื่อบัญชี>.workers.dev`

**URL จริงของโปรเจกต์นี้:** `https://sw-contact.veerachai-mitmorn.workers.dev`
(ตั้งไว้ใน `assets/js/site.js` ให้แล้ว)

### 7. ต่อ Worker เข้ากับโดเมนบริษัท (แนะนำ)

Cloudflare Dashboard → **Workers & Pages → sw-contact → Settings → Domains & Routes**
→ **Add** → **Custom domain** → `api.swstrategicsol.com`

แล้วแก้ค่า `SW_CONTACT_ENDPOINT` ใน `../assets/js/site.js` ให้ชี้มาที่
`https://api.swstrategicsol.com/api/contact`

> ถ้าไม่ทำข้อนี้ ให้ใช้ URL `.workers.dev` ที่ได้จากข้อ 6 ใส่ใน `site.js` แทน — ทำงานได้เหมือนกัน

---

## ทดสอบ

```bash
# เช็คว่า Worker ยังมีชีวิต
curl https://sw-contact.veerachai-mitmorn.workers.dev/api/health

# ลองส่งข้อมูลปลอม
curl -X POST https://sw-contact.veerachai-mitmorn.workers.dev/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"ทดสอบ ระบบ","email":"test@example.com","message":"ทดสอบส่งฟอร์ม","consent":true}'
# ควรได้ {"ok":true,"id":"..."}

# ดูว่าเข้า D1 จริงไหม
npm run db:list
```

ดู log สด ๆ ตอนมีคนกรอกจริง: `npm run tail`

---

## ดึงข้อมูลออกมาดู

```bash
# ผ่านคำสั่ง (ง่ายสุด)
npm run db:list

# ผ่าน API เป็น JSON
curl -H "Authorization: Bearer <EXPORT_TOKEN>" \
  https://sw-contact.veerachai-mitmorn.workers.dev/api/submissions

# ดาวน์โหลดเป็น CSV เปิดใน Excel ได้เลย (มี BOM รองรับภาษาไทย)
curl -H "Authorization: Bearer <EXPORT_TOKEN>" \
  "https://sw-contact.veerachai-mitmorn.workers.dev/api/submissions?format=csv&limit=1000" \
  -o submissions.csv
```

---

## หน้าที่ตาม PDPA ที่ต้องทำต่อเนื่อง

| เรื่อง | สิ่งที่ต้องทำ | คำสั่ง |
|---|---|---|
| ลบข้อมูลเกิน 24 เดือน | ทำปีละครั้ง ตามที่ประกาศไว้ใน `privacy.html` | ดูท้ายไฟล์ `schema.sql` |
| ลูกค้าขอลบข้อมูล | ลบภายใน 30 วันนับจากได้รับคำขอ | `DELETE FROM sw_contact_submissions WHERE email = '...'` |
| ลูกค้าขอดูข้อมูลตัวเอง | ส่งข้อมูลที่เก็บไว้ให้เขา | `SELECT * FROM sw_contact_submissions WHERE email = '...'` |
| ข้อมูลรั่วไหล | แจ้ง สคส. ภายใน 72 ชม. | — |

---

## แก้ปัญหาที่เจอบ่อย

| อาการ | สาเหตุที่พบบ่อย |
|---|---|
| ฟอร์มขึ้น "ส่งไม่สำเร็จ" | `ALLOWED_ORIGIN` ไม่ตรงกับโดเมนที่เปิดเว็บอยู่ (ต้องตรงเป๊ะ รวม https:// และ www) |
| ข้อมูลเข้า D1 แต่ไม่มีอีเมล | โดเมนยังไม่ verify ใน Resend หรือ `MAIL_FROM` ไม่ใช่โดเมนที่ verify แล้ว — เช็คด้วย `npm run tail` |
| ขึ้น 429 | โดนกันสแปม (3 ครั้ง/15 นาทีต่อ IP) รอสักครู่ หรือทดสอบด้วยเน็ตมือถือ |
| ขึ้น 422 | ไม่ได้ติ๊กช่องยินยอม หรืออีเมลผิดรูปแบบ |
| `no such table: sw_contact_submissions` | ยังไม่ได้รัน `npm run db:init` |
| `npm.ps1 cannot be loaded` (Windows) | นโยบาย PowerShell — ใช้ `npm.cmd` แทน ดูหัวข้อ "หมายเหตุสำหรับ Windows" ด้านบน |
| `wrangler: command not found` | ยังไม่ได้รัน `npm install` ในโฟลเดอร์ `worker/` |
