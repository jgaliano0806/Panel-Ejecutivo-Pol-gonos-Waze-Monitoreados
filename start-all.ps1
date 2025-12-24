# Panel Waze - Iniciador Completo (PowerShell)
# Ejecutar con: .\start-all.ps1

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  PANEL EJECUTIVO - WAZE MONITOREADOS" -ForegroundColor Cyan
Write-Host "  Iniciador Completo (PowerShell)" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

$ROOT = $PSScriptRoot

# ============================================
# PASO 0: Limpiar servicios existentes
# ============================================
Write-Host "[0/4] Limpiando servicios existentes..." -ForegroundColor Yellow
Write-Host ""

# Detener procesos en puerto 3001 (Backend)
Write-Host "   Verificando puerto 3001 (Backend)..."
$backend = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
if ($backend) {
    $targetPid = $backend.OwningProcess
    Write-Host "   Puerto 3001 ocupado por PID: $targetPid" -ForegroundColor Yellow
    Write-Host "   Deteniendo proceso..."
    Stop-Process -Id $targetPid -Force -ErrorAction SilentlyContinue
    Write-Host "   OK: Proceso detenido" -ForegroundColor Green
}

# Detener procesos en puerto 5173 (Frontend)
Write-Host "   Verificando puerto 5173 (Frontend)..."
$frontend = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
if ($frontend) {
    $targetPid = $frontend.OwningProcess
    Write-Host "   Puerto 5173 ocupado por PID: $targetPid" -ForegroundColor Yellow
    Write-Host "   Deteniendo proceso..."
    Stop-Process -Id $targetPid -Force -ErrorAction SilentlyContinue
    Write-Host "   OK: Proceso detenido" -ForegroundColor Green
}

Start-Sleep -Seconds 2
Write-Host ""

# ============================================
# PASO 1: PostgreSQL
# ============================================
Write-Host "[1/4] Verificando PostgreSQL..." -ForegroundColor Yellow
$POSTGRES_OK = $false

# Verificar si PostgreSQL está corriendo en puerto 5432
$postgres = Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue
if ($postgres) {
    Write-Host "   OK: PostgreSQL detectado en puerto 5432" -ForegroundColor Green
    $POSTGRES_OK = $true
}
else {
    Write-Host "   ADVERTENCIA: PostgreSQL no detectado en puerto 5432" -ForegroundColor Red
    Write-Host "   Asegurate de que PostgreSQL este corriendo" -ForegroundColor Yellow
}
Write-Host ""

# ============================================
# PASO 2: Configurar Backend
# ============================================
Write-Host "[2/4] Configurando Backend..." -ForegroundColor Yellow
$envPath = Join-Path $ROOT "backend\.env"

if (-not (Test-Path $envPath)) {
    Write-Host "   Archivo .env no encontrado, creando..."
    @"
# Configuracion de PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=panel_waze
DB_USER=postgres
DB_PASSWORD=CASISA

# Configuracion del servidor
NODE_ENV=development
PORT=3001
"@ | Out-File -FilePath $envPath -Encoding utf8
    Write-Host "   OK: Archivo .env creado" -ForegroundColor Green
}
else {
    Write-Host "   OK: Archivo .env ya existe" -ForegroundColor Green
}
Write-Host ""

# ============================================
# PASO 3: Iniciar Backend
# ============================================
Write-Host "[3/4] Iniciando Backend..." -ForegroundColor Yellow
$backendPath = Join-Path $ROOT "backend"

# Verificar que el puerto esté libre
Start-Sleep -Milliseconds 500
$backendTest = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
if ($backendTest) {
    Write-Host "   ADVERTENCIA: Puerto 3001 aun ocupado" -ForegroundColor Yellow
}

# Iniciar en nueva ventana CMD
Start-Process cmd -ArgumentList "/k", "cd /d `"$backendPath`" && title Backend - Panel Waze && npm run dev"
Write-Host "   OK: Backend iniciado en nueva ventana" -ForegroundColor Green
Write-Host "   Esperando que este listo..."
Start-Sleep -Seconds 5
Write-Host ""

# ============================================
# PASO 4: Iniciar Frontend
# ============================================
Write-Host "[4/4] Iniciando Frontend..." -ForegroundColor Yellow

# Verificar que el puerto esté libre
Start-Sleep -Milliseconds 500
$frontendTest = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
if ($frontendTest) {
    Write-Host "   ADVERTENCIA: Puerto 5173 aun ocupado" -ForegroundColor Yellow
}

# Iniciar en nueva ventana CMD
Start-Process cmd -ArgumentList "/k", "cd /d `"$ROOT`" && title Frontend - Panel Waze && npm run dev"
Write-Host "   OK: Frontend iniciado en nueva ventana" -ForegroundColor Green
Start-Sleep -Seconds 3
Write-Host ""

# ============================================
# RESUMEN FINAL
# ============================================
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  SERVICIOS INICIADOS" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Frontend:  http://localhost:5173" -ForegroundColor White
Write-Host "  Backend:   http://localhost:3001" -ForegroundColor White
Write-Host "  Health:    http://localhost:3001/health" -ForegroundColor White
Write-Host "  API:       http://localhost:3001/api" -ForegroundColor White
Write-Host ""

if ($POSTGRES_OK) {
    Write-Host "  PostgreSQL: OK - Corriendo" -ForegroundColor Green
}
else {
    Write-Host "  PostgreSQL: ADVERTENCIA - No detectado" -ForegroundColor Red
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  INFORMACION" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  - Para detener: cierra las ventanas de Backend y Frontend"
Write-Host "  - Para reiniciar: ejecuta este script nuevamente"
Write-Host "  - Para verificar BD: cd backend; npx ts-node scripts/test-db-connection.ts"
Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Presiona cualquier tecla para continuar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
