# === Docker API Test — Using Host Database ===
$base = "http://localhost:8000/api/v1"

# ==============================
# 1. ADMIN (admin / admin123)
# ==============================
Write-Host "`n==================== ADMIN LOGIN ====================" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Method POST -Uri "$base/auth/login" -ContentType "application/x-www-form-urlencoded" -Body "username=admin&password=admin123"
    Write-Host "[OK] Login thanh cong | Role: $($r.role)" -ForegroundColor Green
    $h = @{Authorization="Bearer $($r.access_token)"}

    Write-Host "`n--- Admin: Tai Khoan ---" -ForegroundColor Yellow
    $data = Invoke-RestMethod -Uri "$base/tai-khoan/" -Headers $h
    Write-Host "[OK] $($data.Count) tai khoan" -ForegroundColor Green
    $data | Select-Object -First 5 | ForEach-Object { Write-Host "     $($_.UserName) | $($_.Role)" }

    Write-Host "`n--- Admin: Sinh Vien ---" -ForegroundColor Yellow
    $data = Invoke-RestMethod -Uri "$base/sinh-vien/" -Headers $h
    Write-Host "[OK] $($data.Count) sinh vien" -ForegroundColor Green
    $data | Select-Object -First 5 | ForEach-Object { Write-Host "     $($_.MaSV) | $($_.TenSV) | Lop: $($_.MaLop)" }

    Write-Host "`n--- Admin: Giao Vien ---" -ForegroundColor Yellow
    $data = Invoke-RestMethod -Uri "$base/giao-vien/" -Headers $h
    Write-Host "[OK] $($data.Count) giao vien" -ForegroundColor Green
    $data | Select-Object -First 5 | ForEach-Object { Write-Host "     $($_.MaGV) | $($_.TenGV)" }

    Write-Host "`n--- Admin: Lop Mon Hoc ---" -ForegroundColor Yellow
    $data = Invoke-RestMethod -Uri "$base/lop-mon-hoc/" -Headers $h
    Write-Host "[OK] $($data.Count) lop mon hoc" -ForegroundColor Green
    $data | Select-Object -First 5 | ForEach-Object { Write-Host "     $($_.MaLopMon) | MH: $($_.TenMH) | GV: $($_.TenGV)" }

    Write-Host "`n--- Admin: Diem Mon Hoc ---" -ForegroundColor Yellow
    $data = Invoke-RestMethod -Uri "$base/diem-mon-hoc" -Headers $h
    Write-Host "[OK] $($data.Count) diem" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] $($_.Exception.Message)" -ForegroundColor Red
}

# ==============================
# 2. TEACHER (gv001 / 000000)
# ==============================
Write-Host "`n==================== TEACHER LOGIN (gv001) ====================" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Method POST -Uri "$base/auth/login" -ContentType "application/x-www-form-urlencoded" -Body "username=gv001&password=000000"
    Write-Host "[OK] Login thanh cong | Role: $($r.role)" -ForegroundColor Green
    $h = @{Authorization="Bearer $($r.access_token)"}

    Write-Host "`n--- Teacher: Lop Mon Hoc ---" -ForegroundColor Yellow
    $data = Invoke-RestMethod -Uri "$base/lop-mon-hoc/" -Headers $h
    Write-Host "[OK] $($data.Count) lop mon hoc" -ForegroundColor Green
    $data | Select-Object -First 5 | ForEach-Object { Write-Host "     $($_.MaLopMon) | MH: $($_.TenMH) | GV: $($_.TenGV)" }

    Write-Host "`n--- Teacher: Diem Mon Hoc ---" -ForegroundColor Yellow
    $data = Invoke-RestMethod -Uri "$base/diem-mon-hoc" -Headers $h
    Write-Host "[OK] $($data.Count) diem" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] $($_.Exception.Message)" -ForegroundColor Red
}

# ==============================
# 3. STUDENT (sv26041416422949 / 123456)
# ==============================
Write-Host "`n==================== STUDENT LOGIN (sv26041416422949) ====================" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Method POST -Uri "$base/auth/login" -ContentType "application/x-www-form-urlencoded" -Body "username=sv26041416422949&password=123456"
    Write-Host "[OK] Login thanh cong | Role: $($r.role)" -ForegroundColor Green
    $h = @{Authorization="Bearer $($r.access_token)"}

    Write-Host "`n--- Student: Enrollment (SV-LopMonHoc) ---" -ForegroundColor Yellow
    $data = Invoke-RestMethod -Uri "$base/sv-lop-mon-hoc/by-sv/sv26041416422949" -Headers $h
    Write-Host "[OK] $($data.Count) lop mon" -ForegroundColor Green
    $data | ForEach-Object { Write-Host "     $($_.MaLopMon) | TongKet: $($_.TongKet) | HocGhep: $($_.HocGhep)" }

    Write-Host "`n--- Student: Sync enrollment ---" -ForegroundColor Yellow
    $sync = Invoke-RestMethod -Method POST -Uri "$base/sv-lop-mon-hoc/sync/sv26041416422949" -Headers $h
    Write-Host "[OK] $($sync.message)" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] $($_.Exception.Message)" -ForegroundColor Red
}

# ==============================
# 4. FRONTEND
# ==============================
Write-Host "`n==================== FRONTEND (Nginx) ====================" -ForegroundColor Cyan
try {
    $f = Invoke-WebRequest -Uri "http://localhost" -UseBasicParsing
    Write-Host "[OK] Status: $($f.StatusCode) | Size: $($f.Content.Length) bytes" -ForegroundColor Green
    if ($f.Content -match "<title>(.*?)</title>") { Write-Host "     Title: $($Matches[1])" }
} catch {
    Write-Host "[FAIL] Frontend khong chay" -ForegroundColor Red
}

# ==============================
# SUMMARY
# ==============================
Write-Host "`n==================== TONG KET ====================" -ForegroundColor Magenta
Write-Host "Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "Frontend: http://localhost" -ForegroundColor White
Write-Host "Database: Local MySQL:3308 + MongoDB:27017" -ForegroundColor White
