#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""แปลงรูปในเว็บให้พร้อมอัปโหลดขึ้นช่องทางภายนอก — รัน:  python tools/make_gbp_photos.py

ทำไมต้องมีสคริปต์นี้
  เว็บใช้ .webp เพราะไฟล์เล็กและโหลดเร็ว
  แต่ Google Business Profile / LINE / Facebook ไม่รับ .webp
  ต้องแปลงเป็น JPG และปรับขนาดตามที่แต่ละเจ้ากำหนดก่อน

ผลลัพธ์ออกที่โฟลเดอร์ gbp-photos/ (อยู่ใน .gitignore ไม่ขึ้น git และไม่ขึ้นเว็บ)

ต้องมี Pillow:  pip install pillow
"""
import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("ไม่พบไลบรารี Pillow — ติดตั้งด้วย:  pip install pillow")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "img")
OUT = os.path.join(ROOT, "gbp-photos")

# รูปงาน — เพิ่มรูปใหม่ตรงนี้ถ้าอยากให้ขึ้น Google ด้วย
# (ชื่อไฟล์ปลายทางขึ้นต้นด้วยเลข เพื่อให้เรียงลำดับตอนอัปโหลดได้ง่าย)
WORK = [
    ("dashboard-executive.webp",  "03-dashboard-executive.jpg"),
    ("dashboard-cashflow.webp",   "04-dashboard-cashflow.jpg"),
    ("dashboard-scenario.webp",   "05-dashboard-scenario.jpg"),
    ("dashboard-portfolio.webp",  "06-dashboard-portfolio.jpg"),
    ("dashboard-warehouse3d.webp", "07-warehouse-3d.jpg"),
    ("case-manufacturing.webp",   "08-case-manufacturing.jpg"),
    ("case-inventory.webp",       "09-case-inventory.jpg"),
    ("case-rpa.webp",             "10-case-rpa.jpg"),
]


def load(name):
    """เปิดรูปแล้วแปลงเป็น RGB — JPG ไม่รองรับช่องโปร่งใส"""
    return Image.open(os.path.join(SRC, name)).convert("RGB")


def crop_to_ratio(im, ratio):
    """ตัดรูปให้ได้สัดส่วนที่ต้องการ โดยตัดจากตรงกลาง ไม่บีบรูปให้เพี้ยน"""
    w, h = im.size
    if w / h > ratio:
        nw = int(h * ratio)
        return im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    nh = int(w / ratio)
    return im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))


def main():
    if not os.path.isdir(SRC):
        sys.exit("ไม่พบโฟลเดอร์ %s" % SRC)
    os.makedirs(OUT, exist_ok=True)
    made = []

    # 1) โลโก้ — จัตุรัส 720x720 พื้นขาว เว้นขอบรอบไม่ให้โลโก้ชนขอบ
    logo = Image.open(os.path.join(SRC, "logo-knight.png")).convert("RGBA")
    canvas = Image.new("RGB", (720, 720), (255, 255, 255))
    scale = min(560.0 / logo.width, 560.0 / logo.height)
    small = logo.resize((int(logo.width * scale), int(logo.height * scale)), Image.LANCZOS)
    canvas.paste(small, ((720 - small.width) // 2, (720 - small.height) // 2), small)
    canvas.save(os.path.join(OUT, "01-logo-720x720.jpg"), quality=92)
    made.append("01-logo-720x720.jpg")

    # 2) หน้าปก — 16:9 ขนาด 1024x576 ตามที่ Google แนะนำ
    cov = crop_to_ratio(load("og-cover.jpg"), 1024.0 / 576.0)
    cov.resize((1024, 576), Image.LANCZOS).save(
        os.path.join(OUT, "02-cover-1024x576.jpg"), quality=92)
    made.append("02-cover-1024x576.jpg")

    # 3) รูปงาน — คงสัดส่วนเดิม ย่อให้กว้างไม่เกิน 1200
    for src, dst in WORK:
        if not os.path.exists(os.path.join(SRC, src)):
            print("ข้าม (ไม่พบไฟล์): %s" % src)
            continue
        im = load(src)
        if im.width > 1200:
            im = im.resize((1200, int(im.height * 1200.0 / im.width)), Image.LANCZOS)
        im.save(os.path.join(OUT, dst), quality=90)
        made.append(dst)

    # 4) รูปทีม — จัตุรัส 720x720 ตัดจากกลางบน เพื่อไม่ให้ตัดหัวขาด
    md = load("md-veerachai.webp")
    side = min(md.size)
    md = md.crop(((md.width - side) // 2, 0, (md.width - side) // 2 + side, side))
    md.resize((720, 720), Image.LANCZOS).save(
        os.path.join(OUT, "11-team-md.jpg"), quality=92)
    made.append("11-team-md.jpg")

    print("-" * 60)
    for f in made:
        p = os.path.join(OUT, f)
        print("%-32s %-12s %6.0f KB" % (
            f, "%dx%d" % Image.open(p).size, os.path.getsize(p) / 1024.0))
    print("-" * 60)
    print("สร้าง %d ไฟล์ที่: %s" % (len(made), OUT))
    print("อัปโหลดที่ Google Business Profile → รูปภาพ (ดู SKILL.md สถานการณ์ที่ 9.5)")


if __name__ == "__main__":
    main()
