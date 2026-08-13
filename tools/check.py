#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ตรวจสุขภาพเว็บก่อน deploy — รัน:  python tools/check.py

เช็ค 8 อย่าง
  1. ทุกหน้ามีไฟล์ครบและอ่านได้
  2. ลิงก์ภายใน (href="xxx.html") ชี้ไปยังไฟล์ที่มีอยู่จริง
  3. รูปทุกรูป (src="assets/img/...") มีไฟล์อยู่จริง + <img> มี alt
  4. header/footer เหมือนกันทุกหน้า (นอกจาก aria-current ของเมนูที่กำลังเปิด)
  5. ทุกข้อความ lang="th" มีคู่ lang="en" ในบล็อกเดียวกัน (นับจำนวนให้เท่ากัน)
  6. ฟอร์มติดต่อมี checkbox ยินยอม PDPA และลิงก์หน้านโยบาย
  7. ตั้ง endpoint ของ Worker และ database_id ของ D1 แล้ว
  8. ถ้าเปิด pixel โฆษณา หน้านโยบายต้องไม่ประกาศว่าไม่ใช้คุกกี้ติดตาม
ออก exit code 1 ถ้ามี ERROR — ใช้ต่อใน CI ได้
"""
import os, re, sys, io

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = ["index.html", "services.html", "about.html", "vision.html",
         "case-studies.html", "contact.html", "privacy.html",
         "thank-you.html", "404.html",
         # หน้าบทความ (Insights) — เพิ่มชื่อไฟล์ที่นี่ทุกครั้งที่เขียนบทความใหม่
         "insights.html",
         "contribution-margin-layers.html",
         "contribution-margin.html",
         "measurable-results.html",
         "data-quality.html",
         "report-purpose.html",
         "cfo-dashboard.html",
         "profit-vs-cash.html",
         "vertical-horizontal-analysis.html",
         "inventory-dashboard.html",
         "warehouse-cube-utilisation.html"]

errors, warnings = [], []


def read(p):
    with io.open(os.path.join(ROOT, p), encoding="utf-8") as f:
        return f.read()


def block(html, tag):
    m = re.search(r"<%s[^>]*>.*?</%s>" % (tag, tag), html, re.S)
    return m.group(0) if m else ""


# 1) ไฟล์ครบ
docs = {}
for p in PAGES:
    if not os.path.exists(os.path.join(ROOT, p)):
        errors.append("ไม่พบไฟล์: %s" % p)
    else:
        docs[p] = read(p)

# 2-3) ลิงก์และรูป
def target_file(href):
    """แปลง URL สาธารณะเป็นชื่อไฟล์จริง: "/" → index.html, "/services" → services.html"""
    if href == "/":
        return "index.html"
    if href.startswith("/"):
        return href[1:] + ".html"
    return href

for p, html in docs.items():
    for href in re.findall(r'href="(/[^"#?:]*)"', html):
        f = target_file(href)
        if not os.path.exists(os.path.join(ROOT, f)):
            errors.append("%s → ลิงก์เสีย: %s (ควรชี้ไปไฟล์ %s)" % (p, href, f))
    # กันการเผลอกลับไปใช้ลิงก์แบบ .html ซึ่งจะโดน Cloudflare เด้ง 307
    for href in re.findall(r'href="([a-z0-9-]+\.html)"', html):
        errors.append("%s → ใช้ลิงก์ %s ควรเปลี่ยนเป็น /%s (ไม่มี .html)" % (p, href, href[:-5]))
    for src in re.findall(r'src="((?:assets|\./assets)[^"]+)"', html):
        if not os.path.exists(os.path.join(ROOT, src)):
            errors.append("%s → ไม่พบไฟล์: %s" % (p, src))
    for tag in re.findall(r"<img\b[^>]*>", html):
        if "alt=" not in tag:
            errors.append("%s → <img> ไม่มี alt: %s" % (p, tag[:70]))
    for js in re.findall(r'src="(assets/js/[^"]+)"', html):
        if not os.path.exists(os.path.join(ROOT, js)):
            errors.append("%s → ไม่พบ JS: %s" % (p, js))
    for css in re.findall(r'href="(assets/css/[^"]+)"', html):
        if not os.path.exists(os.path.join(ROOT, css)):
            errors.append("%s → ไม่พบ CSS: %s" % (p, css))

# 4) header/footer ตรงกัน
def normalise(s):
    return re.sub(r'\s+aria-current="page"', "", s)

if docs:
    base = PAGES[0]
    ref_h, ref_f = normalise(block(docs[base], "header")), block(docs[base], "footer")
    for p, html in docs.items():
        if normalise(block(html, "header")) != ref_h:
            errors.append("%s → header ไม่ตรงกับ %s (แก้ให้เหมือนกันทุกหน้า)" % (p, base))
        if block(html, "footer") != ref_f:
            errors.append("%s → footer ไม่ตรงกับ %s" % (p, base))

# 5) จำนวนบล็อก th / en เท่ากัน
for p, html in docs.items():
    # (?<![-\w]) กัน data-lang="th" ไม่ให้ถูกนับ
    th = len(re.findall(r'(?<![-\w])lang="th"', html))
    en = len(re.findall(r'(?<![-\w])lang="en"', html))
    th -= 1  # หัก lang="th" ที่แท็ก <html> ออก
    if th != en:
        warnings.append("%s → ข้อความ TH %d ชิ้น แต่ EN %d ชิ้น (ควรเท่ากัน)" % (p, th, en))

# 6) ฟอร์มติดต่อ + endpoint ของ Worker
c = docs.get("contact.html", "")
if 'name="consent"' not in c:
    errors.append("contact.html → ไม่พบ checkbox ยินยอม PDPA (name=\"consent\")")
if 'href="/privacy"' not in c:
    warnings.append("contact.html → ฟอร์มไม่ได้ลิงก์ไปหน้านโยบายความเป็นส่วนตัว")
try:
    js = read("assets/js/site.js")
    m = re.search(r"SW_CONTACT_ENDPOINT\s*=\s*'([^']*)'", js)
    if not m:
        errors.append("site.js → ไม่พบตัวแปร SW_CONTACT_ENDPOINT")
    elif "PUT-YOUR" in m.group(1) or not (m.group(1).startswith("http") or m.group(1).startswith("/")):
        warnings.append("site.js → ยังไม่ได้ตั้ง SW_CONTACT_ENDPOINT ให้ชี้ไปที่ Worker จริง")
except Exception:
    errors.append("ไม่พบไฟล์ assets/js/site.js")

# 7) เตือนถ้า Worker ยังไม่ได้ตั้ง database_id
try:
    wt = read("worker/wrangler.toml")
    if "PUT-YOUR-D1-DATABASE-ID-HERE" in wt:
        warnings.append("worker/wrangler.toml → ยังไม่ได้ใส่ database_id ของ D1")
except Exception:
    pass

# 8) ถ้าเปิดใช้ pixel แล้ว privacy.html ต้องไม่ประกาศว่าไม่ใช้คุกกี้ติดตาม
#    อ่านจากธง PIXELS_ENABLED ใน tracking.js (ชัดเจนกว่าการเดาจากคอมเมนต์)
try:
    trk = read("assets/js/tracking.js")
    m = re.search(r"var PIXELS_ENABLED\s*=\s*(true|false)", trk)
    if not m:
        warnings.append("tracking.js → ไม่พบธง PIXELS_ENABLED")
    elif m.group(1) == "true" and "ไม่ใช้คุกกี้เพื่อการติดตามหรือโฆษณา" in docs.get("privacy.html", ""):
        errors.append("tracking.js เปิด pixel แล้ว (PIXELS_ENABLED = true) "
                      "แต่ privacy.html ยังประกาศว่าไม่ใช้คุกกี้ติดตาม → ประกาศเท็จ ผิด PDPA")
except Exception:
    pass

# 9) LINE ID ต้องตรงกันทุกหน้า และปุ่มลอยต้องมีครบ
LINE_ID = "@160fupme"
for p2, html in docs.items():
    ids = set(re.findall(r'line\.me/R/ti/p/(@[A-Za-z0-9]+)', html))
    if ids and ids != {LINE_ID}:
        errors.append("%s → LINE ID ไม่ตรงกัน: %s (ควรเป็น %s)" % (p2, ", ".join(sorted(ids)), LINE_ID))
    if 'class="line-fab"' not in html:
        warnings.append("%s → ไม่มีปุ่ม LINE ลอย" % p2)

# ---- สรุป ----
for w in warnings:
    print("WARN  " + w)
for e in errors:
    print("ERROR " + e)
print("-" * 60)
print("ตรวจ %d หน้า | ERROR %d | WARN %d" % (len(docs), len(errors), len(warnings)))
sys.exit(1 if errors else 0)
