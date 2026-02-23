# Panel Waze - Iniciador Completo (PowerShell)
# Ejecutar con: .\start-all.ps1

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  PANEL EJECUTIVO - WAZE MONITOREADOS" -ForegroundColor Cyan
Write-Host "  Iniciador Completo (PowerShell)" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Navegar al directorio padre (root del proyecto)
$ROOT = Split-Path $PSScriptRoot -Parent

# ============================================
# Detectar IP de red local
# ============================================
$LOCAL_IP = "localhost"
$ips = Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi","Ethernet","Ethernet*","Wi-Fi*" -ErrorAction SilentlyContinue |
       Where-Object { $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" }
if ($ips) {
    $LOCAL_IP = ($ips | Select-Object -First 1).IPAddress
}

# ============================================
# PASO 0: Limpiar servicios existentes
# ============================================
Write-Host "[0/5] Limpiando servicios existentes..." -ForegroundColor Yellow
Write-Host ""

# Detener procesos en puerto 3002 (Backend)
Write-Host "   Verificando puerto 3002 (Backend)..."
$backend = Get-NetTCPConnection -LocalPort 3002 -State Listen -ErrorAction SilentlyContinue
if ($backend) {
    $targetPid = $backend.OwningProcess
    Write-Host "   Puerto 3002 ocupado por PID: $targetPid" -ForegroundColor Yellow
    Write-Host "   Deteniendo proceso..."
    Stop-Process -Id $targetPid -Force -ErrorAction SilentlyContinue
    Write-Host "   OK: Proceso detenido" -ForegroundColor Green
}

# Detener procesos en puerto 5180 (Frontend)
Write-Host "   Verificando puerto 5180 (Frontend)..."
$frontend = Get-NetTCPConnection -LocalPort 5180 -State Listen -ErrorAction SilentlyContinue
if ($frontend) {
    $targetPid = $frontend.OwningProcess
    Write-Host "   Puerto 5180 ocupado por PID: $targetPid" -ForegroundColor Yellow
    Write-Host "   Deteniendo proceso..."
    Stop-Process -Id $targetPid -Force -ErrorAction SilentlyContinue
    Write-Host "   OK: Proceso detenido" -ForegroundColor Green
}

Start-Sleep -Seconds 2
Write-Host ""

# ============================================
# PASO 1: PostgreSQL
# ============================================
Write-Host "[1/5] Verificando PostgreSQL..." -ForegroundColor Yellow
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
# PASO 2: Configurar Backend .env
# ============================================
Write-Host "[2/5] Configurando Backend..." -ForegroundColor Yellow
$envPath = Join-Path $ROOT "apps\backend\.env"

if (-not (Test-Path $envPath)) {
    Write-Host "   Archivo .env del backend no encontrado, creando..."
    @"
# Configuracion de PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=panel_waze
DB_USER=postgres
DB_PASSWORD=CASISA

# Configuracion del servidor
NODE_ENV=development
PORT=3002
REDIS_HOST=localhost
REDIS_PORT=6379

# Configuracion de Clima
WEATHER_PROVIDER=openmeteo
"@ | Out-File -FilePath $envPath -Encoding utf8
    Write-Host "   OK: Archivo .env del backend creado" -ForegroundColor Green
}
else {
    Write-Host "   OK: Archivo .env del backend ya existe" -ForegroundColor Green
}
Write-Host ""

# ============================================
# PASO 3: Configurar Frontend .env
# ============================================
Write-Host "[3/5] Configurando Frontend..." -ForegroundColor Yellow
$frontendEnvPath = Join-Path $ROOT "apps\frontend\.env"

if (-not (Test-Path $frontendEnvPath)) {
    Write-Host "   Archivo .env del frontend no encontrado, creando..."
    @"
# Backend API URL — usa ruta relativa para que funcione
# tanto desde localhost como desde otros dispositivos en la red.
# Vite proxea /api -> http://127.0.0.1:3002/api
# Vite proxea /socket.io -> http://127.0.0.1:3002/socket.io
VITE_API_URL=/api
"@ | Out-File -FilePath $frontendEnvPath -Encoding utf8
    Write-Host "   OK: Archivo .env del frontend creado" -ForegroundColor Green
}
else {
    Write-Host "   OK: Archivo .env del frontend ya existe" -ForegroundColor Green
}
Write-Host ""

# ============================================
# PASO 4: Iniciar Backend
# ============================================
Write-Host "[4/5] Iniciando Backend..." -ForegroundColor Yellow
$backendPath = Join-Path $ROOT "apps\backend"

# Verificar que el puerto esté libre
Start-Sleep -Milliseconds 500
$backendTest = Get-NetTCPConnection -LocalPort 3002 -State Listen -ErrorAction SilentlyContinue
if ($backendTest) {
    Write-Host "   ADVERTENCIA: Puerto 3002 aun ocupado" -ForegroundColor Yellow
}

# Iniciar en nueva ventana CMD
Start-Process cmd -ArgumentList "/k", "cd /d `"$ROOT`" && title Backend - Panel Waze && npm run dev:backend"
Write-Host "   OK: Backend iniciado en nueva ventana" -ForegroundColor Green
Write-Host "   Esperando que este listo..."
Start-Sleep -Seconds 5
Write-Host ""

# ============================================
# PASO 5: Iniciar Frontend
# ============================================
Write-Host "[5/5] Iniciando Frontend..." -ForegroundColor Yellow

# Verificar que el puerto esté libre
Start-Sleep -Milliseconds 500
$frontendTest = Get-NetTCPConnection -LocalPort 5180 -State Listen -ErrorAction SilentlyContinue
if ($frontendTest) {
    Write-Host "   ADVERTENCIA: Puerto 5180 aun ocupado" -ForegroundColor Yellow
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
Write-Host "  Frontend (local):  http://localhost:5180" -ForegroundColor White
Write-Host "  Frontend (red):    http://${LOCAL_IP}:5180" -ForegroundColor Green
Write-Host "  Backend:           http://localhost:3002" -ForegroundColor White
Write-Host "  Health:            http://localhost:3002/health" -ForegroundColor White
Write-Host "  API:               http://localhost:3002/api" -ForegroundColor White
Write-Host ""

if ($POSTGRES_OK) {
    Write-Host "  PostgreSQL: OK - Corriendo" -ForegroundColor Green
}
else {
    Write-Host "  PostgreSQL: ADVERTENCIA - No detectado" -ForegroundColor Red
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  ACCESO DESDE RED LOCAL" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Celular/Videowall: http://${LOCAL_IP}:5180" -ForegroundColor Green
Write-Host "  (El proxy de Vite redirige /api al backend)" -ForegroundColor DarkGray
Write-Host ""
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
