# ==========================================================================
#  SW Strategic Solutions Group - deploy web + worker
#
#  วิธีใช้:  คลิกขวาที่ไฟล์นี้ -> Run with PowerShell
#            หรือพิมพ์  .\deploy.ps1
#
#  เว็บไซต์และตัวรับฟอร์มอยู่ใน Worker ตัวเดียวกัน URL เดียวกัน
#    https://sw-contact.veerachai-mitmorn.workers.dev/            -> หน้าเว็บ
#    https://sw-contact.veerachai-mitmorn.workers.dev/api/contact -> รับฟอร์ม
#
#  ทำ 4 ขั้นตามลำดับ หยุดทันทีถ้าขั้นไหนล้มเหลว
#    1. ตรวจสุขภาพเว็บ    2. เตรียม dist/
#    3. wrangler deploy   4. git commit + push
#
#  หมายเหตุ: ไฟล์นี้ต้องเป็น UTF-8 with BOM ไม่งั้น PowerShell อ่านภาษาไทยไม่ออก
# ==========================================================================

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$OutputEncoding = [System.Text.Encoding]::UTF8

function Step($n, $text) {
    Write-Host ""
    Write-Host "----------------------------------------------" -ForegroundColor DarkGray
    Write-Host " STEP $n : $text" -ForegroundColor Cyan
    Write-Host "----------------------------------------------" -ForegroundColor DarkGray
}

# ---- หา python ที่ใช้ได้ ------------------------------------------------
$py = $null
foreach ($cmd in @("python", "py", "python3")) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) { $py = $cmd; break }
}
if (-not $py) {
    Write-Host "ไม่พบ Python ในเครื่อง - ติดตั้งจาก https://python.org แล้วรันใหม่" -ForegroundColor Red
    exit 1
}

# ---- 1) ตรวจสุขภาพเว็บ --------------------------------------------------
Step 1 "ตรวจสุขภาพเว็บ"
& $py tools/check.py
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "เจอ ERROR - แก้ให้เรียบร้อยก่อนแล้วรันใหม่ (ยังไม่ deploy อะไรทั้งนั้น)" -ForegroundColor Red
    exit 1
}

# ---- 2) เตรียม dist/ ----------------------------------------------------
Step 2 "เตรียมไฟล์สำหรับเผยแพร่"
& $py tools/publish.py
if ($LASTEXITCODE -ne 0) { exit 1 }

# ---- 3) deploy ----------------------------------------------------------
Step 3 "deploy เว็บไซต์ + Worker ขึ้น Cloudflare"
Push-Location worker
try {
    if (-not (Test-Path "node_modules")) {
        Write-Host "ยังไม่ได้ติดตั้ง dependency - กำลังติดตั้ง (รอสัก 1-2 นาที)..." -ForegroundColor Yellow
        npm.cmd install
        if ($LASTEXITCODE -ne 0) { throw "npm install ไม่สำเร็จ" }
    }
    npx.cmd wrangler deploy
    if ($LASTEXITCODE -ne 0) { throw "wrangler deploy ไม่สำเร็จ" }
}
catch {
    Pop-Location
    Write-Host $_ -ForegroundColor Red
    exit 1
}
Pop-Location

Write-Host ""
Write-Host "เว็บออนไลน์แล้วที่ https://sw-contact.veerachai-mitmorn.workers.dev" -ForegroundColor Green

# ---- 4) Git -------------------------------------------------------------
Step 4 "บันทึกโค้ดขึ้น GitHub"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "ไม่พบ git ในเครื่อง - ข้ามขั้นนี้ (เว็บขึ้นเรียบร้อยแล้ว)" -ForegroundColor Yellow
    Write-Host "ติดตั้งได้จาก https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 0
}

if (-not (Test-Path ".git")) {
    Write-Host "ยังไม่เคยตั้ง git ในโฟลเดอร์นี้ - กำลังตั้งให้..." -ForegroundColor Yellow
    git init
    git branch -M main
}

git add -A
$changes = git status --porcelain
if ($changes) {
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    git commit -m "update website $stamp"
    Write-Host "commit เรียบร้อย" -ForegroundColor Green
} else {
    Write-Host "ไม่มีอะไรเปลี่ยนตั้งแต่ commit ล่าสุด" -ForegroundColor Gray
}

$remote = git remote
if (-not $remote) {
    Write-Host ""
    Write-Host "ยังไม่ได้ผูกกับ GitHub - เว็บขึ้นแล้วแต่โค้ดยังอยู่แค่ในเครื่อง" -ForegroundColor Yellow
    Write-Host "ทำครั้งเดียว: สร้าง repo เปล่าที่ https://github.com/new (ตั้งเป็น Private)" -ForegroundColor Yellow
    Write-Host "แล้วรัน 2 คำสั่งนี้:" -ForegroundColor Yellow
    Write-Host "  git remote add origin https://github.com/<ชื่อคุณ>/sw-website.git" -ForegroundColor White
    Write-Host "  git push -u origin main" -ForegroundColor White
    exit 0
}

git push
Write-Host "push ขึ้น GitHub เรียบร้อย" -ForegroundColor Green

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host " DONE - เปิดดูได้เลย" -ForegroundColor Green
Write-Host " https://sw-contact.veerachai-mitmorn.workers.dev" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
