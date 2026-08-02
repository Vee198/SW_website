-- SW Strategic Solutions Group — โครงสร้างฐานข้อมูล D1
-- รันด้วย:  npx wrangler d1 execute acc_db --remote --file=./schema.sql
--
-- หมายเหตุ: ฐานข้อมูล acc_db ใช้ร่วมกับโปรเจกต์อื่น ตารางของเว็บนี้จึงขึ้นต้นด้วย sw_
-- ทุกคำสั่งในไฟล์นี้แตะเฉพาะตาราง sw_contact_submissions เท่านั้น ไม่กระทบข้อมูลของโปรเจกต์อื่น
--
-- หลัก PDPA ที่ใช้ออกแบบตารางนี้
--   * เก็บเฉพาะข้อมูลที่จำเป็นต่อการติดต่อกลับ
--   * ไม่เก็บ IP จริง เก็บเป็นค่าแฮช (ip_hash) ไว้กันสแปมเท่านั้น
--   * บันทึกการให้ความยินยอม (consent) พร้อมเวลา เพื่อพิสูจน์ฐานทางกฎหมายได้
--   * มีคำสั่งลบข้อมูลเก่าอยู่ท้ายไฟล์ ใช้ตามนโยบายเก็บรักษา 24 เดือน

CREATE TABLE IF NOT EXISTS sw_contact_submissions (
  id          TEXT PRIMARY KEY,                          -- UUID
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),   -- UTC
  name        TEXT NOT NULL,
  company     TEXT,
  email       TEXT NOT NULL,
  phone       TEXT,
  topic       TEXT,                                      -- บริการที่สนใจ
  message     TEXT,
  lang        TEXT DEFAULT 'th',                         -- ภาษาที่ผู้ใช้ดูเว็บตอนส่ง
  consent     INTEGER NOT NULL DEFAULT 0,                -- 1 = ติ๊กยินยอมตามนโยบาย
  ip_hash     TEXT,                                      -- SHA-256 ตัดสั้น ใช้ทำ rate limit
  country     TEXT,                                      -- จาก Cloudflare (cf.country)
  user_agent  TEXT,
  referer     TEXT,
  status      TEXT DEFAULT 'new',                        -- new | contacted | closed
  note        TEXT                                       -- บันทึกภายในของทีม
);

CREATE INDEX IF NOT EXISTS idx_sw_contact_created ON sw_contact_submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sw_contact_iphash  ON sw_contact_submissions (ip_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_sw_contact_status  ON sw_contact_submissions (status);

-- ------------------------------------------------------------------------
-- คำสั่งที่ใช้บ่อย (คัดลอกไปรันเอง ไม่ได้ทำงานอัตโนมัติ)
-- ------------------------------------------------------------------------
-- ดู 20 รายการล่าสุด:
--   npx wrangler d1 execute acc_db --remote \
--     --command "SELECT created_at,name,company,email,phone,topic FROM sw_contact_submissions ORDER BY created_at DESC LIMIT 20"
--
-- ลบข้อมูลเก่ากว่า 24 เดือน (ตามนโยบายเก็บรักษาในหน้า privacy.html):
--   npx wrangler d1 execute acc_db --remote \
--     --command "DELETE FROM sw_contact_submissions WHERE created_at < datetime('now','-24 months')"
--
-- ลบข้อมูลรายบุคคลตามคำขอใช้สิทธิ์ PDPA (สิทธิ์ในการลบข้อมูล):
--   npx wrangler d1 execute acc_db --remote \
--     --command "DELETE FROM sw_contact_submissions WHERE email = 'someone@example.com'"
