#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""เตรียมโฟลเดอร์ dist/ สำหรับขึ้น Cloudflare Pages — รัน:  python tools/publish.py

ทำไมต้องมีขั้นนี้
  โฟลเดอร์โปรเจกต์มีของที่ "ไม่ควรเผยแพร่" ปนอยู่ เช่น โค้ด Worker, สคริปต์ภายใน,
  คู่มือ และไฟล์ zip ดีไซน์ต้นฉบับ 2.4MB ถ้า deploy ทั้งโฟลเดอร์ ใครก็โหลดไฟล์พวกนี้ได้
  สคริปต์นี้จึงคัดเฉพาะไฟล์ที่เป็นเว็บจริงไปไว้ใน dist/ แล้วค่อย deploy เฉพาะ dist/

หมายเหตุ: นี่ไม่ใช่ build step ของการแก้เนื้อหา — แก้ .html แล้วเปิดดูได้เลยเหมือนเดิม
สคริปต์นี้ใช้เฉพาะตอนจะ deploy เท่านั้น
"""
import os, shutil, sys, io, hashlib, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")

# ไฟล์/โฟลเดอร์ที่ "เผยแพร่" ได้
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
EXTRAS = ["robots.txt", "sitemap.xml", "_headers"]
# หมายเหตุ: ไม่มี _redirects แล้ว — Cloudflare เสิร์ฟ URL แบบไม่มี .html ให้เองอยู่แล้ว
#           ถ้าใส่ _redirects ที่แมป /services → /services.html จะเกิด redirect วนไม่รู้จบ
DIRS = ["assets"]

# สิ่งที่ตั้งใจไม่เอาขึ้น (มีไว้เพื่ออ่านตอนตรวจสอบ)
EXCLUDED = ["worker/", "tools/", "design-source/", "CLAUDE.md", "SKILL.md", "README.md", ".git/"]


def main():
    if os.path.exists(DIST):
        shutil.rmtree(DIST)
    os.makedirs(DIST)

    n = 0
    for f in PAGES + EXTRAS:
        src = os.path.join(ROOT, f)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(DIST, f))
            n += 1
        elif f in PAGES:
            print("ERROR ไม่พบหน้า %s" % f)
            return 1

    for d in DIRS:
        src = os.path.join(ROOT, d)
        if os.path.isdir(src):
            shutil.copytree(src, os.path.join(DIST, d))
            n += sum(len(files) for _, _, files in os.walk(src))

    # ---- ติดหมายเลขเวอร์ชันให้ CSS/JS (cache busting) --------------------
    # ปัญหาที่เคยเจอ: _headers ตั้งแคช assets ไว้ 1 ปีแบบ immutable
    # พอแก้ดีไซน์แล้ว deploy เบราว์เซอร์ยังใช้ CSS เก่าอยู่ เพราะชื่อไฟล์เหมือนเดิม
    # ทางแก้: ต่อท้าย URL ด้วยแฮชของเนื้อไฟล์ → เนื้อเปลี่ยน URL เปลี่ยน เบราว์เซอร์โหลดใหม่ทันที
    # (แก้เฉพาะสำเนาใน dist/ ไฟล์ต้นทางยังสะอาด เปิดดูบนเครื่องได้เหมือนเดิม)
    assets = ["assets/css/tokens.css", "assets/css/site.css",
              "assets/js/site.js", "assets/js/tracking.js"]
    version = {}
    for a in assets:
        f = os.path.join(DIST, a)
        if os.path.exists(f):
            with open(f, "rb") as fh:
                version[a] = hashlib.md5(fh.read()).hexdigest()[:8]

    for page in PAGES:
        f = os.path.join(DIST, page)
        if not os.path.exists(f):
            continue
        with io.open(f, encoding="utf-8") as fh:
            html = fh.read()
        for a, v in version.items():
            html = html.replace('"%s"' % a, '"%s?v=%s"' % (a, v))
        with io.open(f, "w", encoding="utf-8") as fh:
            fh.write(html)
    print("ติดเวอร์ชันให้ไฟล์: " + ", ".join("%s=%s" % (a.split("/")[-1], v) for a, v in version.items()))

    size = sum(os.path.getsize(os.path.join(dp, f))
               for dp, _, fs in os.walk(DIST) for f in fs)

    print("สร้าง dist/ เรียบร้อย — %d ไฟล์ รวม %.1f MB" % (n, size / 1024 / 1024))
    print("ไม่นำขึ้นเว็บ: " + ", ".join(EXCLUDED))
    print("")
    print("ขั้นต่อไป:  npx wrangler pages deploy dist --project-name=sw-website")
    return 0


if __name__ == "__main__":
    sys.exit(main())
