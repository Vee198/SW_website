# ==========================================================================
#  SW Strategic Solutions Group - เปิดเว็บดูบนเครื่องก่อน deploy
#
#  วิธีใช้:  คลิกขวาที่ไฟล์นี้ -> Run with PowerShell
#            หรือพิมพ์  .\preview.ps1
#
#  จะเปิดเว็บที่ http://localhost:8787 จำลองสภาพจริงทุกอย่าง
#  ทั้งหน้าเว็บ ลิงก์แบบไม่มี .html หน้า 404 และฟอร์มติดต่อ
#  ข้อมูลที่กรอกตอน preview ลงฐานข้อมูลจำลองในเครื่อง ไม่ปนกับของจริง
#
#  กด Ctrl + C เพื่อหยุด
#
#  หมายเหตุ: ไฟล์นี้ต้องเป็น UTF-8 with BOM ไม่งั้น PowerShell อ่านภาษาไทยไม่ออก
# ==========================================================================

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$OutputEncoding = [System.Text.Encoding]::UTF8

$py = $null
foreach ($cmd in @("python", "py", "python3")) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) { $py = $cmd; break }
}
if (-not $py) {
    Write-Host "ไม่พบ Python ในเครื่อง - ติดตั้งจาก https://python.org" -ForegroundColor Red
    exit 1
}

Write-Host "กำลังเตรียมไฟล์..." -ForegroundColor Cyan
& $py tools/publish.py
if ($LASTEXITCODE -ne 0) { exit 1 }

Set-Location worker
if (-not (Test-Path "node_modules")) {
    Write-Host "ติดตั้ง dependency ครั้งแรก (รอสัก 1-2 นาที)..." -ForegroundColor Yellow
    npm.cmd install
}

# สร้างตารางในฐานข้อมูลจำลอง (ทำซ้ำได้ ไม่พัง)
npx.cmd wrangler d1 execute acc_db --local --file=./schema.sql | Out-Null

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host " เปิดเบราว์เซอร์ไปที่  http://localhost:8787" -ForegroundColor Green
Write-Host " กด Ctrl + C เพื่อหยุด" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""

npx.cmd wrangler dev --port 8787
