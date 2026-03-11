#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Script de despliegue - Panel Waze Monitoreados
    Windows Server 2022

.DESCRIPTION
    Instala Node.js, PostgreSQL, nginx, construye la app
    y la registra como servicio de Windows.

.NOTES
    Ejecutar como Administrador en el servidor destino.
    IP destino: 10.1.0.136
#>

param(
    [string]$InstallDir = "C:\PanelWaze",
    [string]$DbPassword = "CASISA_Prod_2026!",
    [int]$BackendPort = 3002,
    [int]$NginxPort = 80
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  PANEL WAZE MONITOREADOS - DESPLIEGUE" -ForegroundColor Cyan
Write-Host "  Windows Server 2022" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

function Test-Command($cmd) {
    return [bool](Get-Command $cmd -ErrorAction SilentlyContinue)
}

function Invoke-Native {
    param([string]$Command)
    $output = cmd /c "$Command 2>&1"
    $exitCode = $LASTEXITCODE
    if ($output) { Write-Host $output }
    return $exitCode
}

Write-Host "[0/7] Verificando prerrequisitos..." -ForegroundColor Yellow

$os = Get-CimInstance Win32_OperatingSystem
Write-Host "  OS: $($os.Caption) $($os.Version)"

# ─────────────────────────────────────────────────────────
# PASO 1: Instalar Chocolatey + dependencias del sistema
# ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[1/7] Instalando dependencias del sistema..." -ForegroundColor Yellow

if (-not (Test-Command "choco")) {
    Write-Host "  Instalando Chocolatey..."
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    $env:Path = "$env:ALLUSERSPROFILE\chocolatey\bin;$env:Path"
    Write-Host "  OK: Chocolatey instalado" -ForegroundColor Green
} else {
    Write-Host "  OK: Chocolatey ya instalado" -ForegroundColor Green
}

# Node.js 20 LTS
if (-not (Test-Command "node")) {
    Write-Host "  Instalando Node.js 20 LTS..."
    cmd /c "choco install nodejs-lts -y --force 2>&1"
    $env:Path = "C:\Program Files\nodejs;$env:Path"
} else {
    $nodeVer = node --version
    Write-Host "  OK: Node.js $nodeVer ya instalado" -ForegroundColor Green
}

# Git
if (-not (Test-Command "git")) {
    Write-Host "  Instalando Git..."
    cmd /c "choco install git -y --force 2>&1"
    $env:Path = "C:\Program Files\Git\cmd;$env:Path"
} else {
    Write-Host "  OK: Git ya instalado" -ForegroundColor Green
}

# NSSM
if (-not (Test-Command "nssm")) {
    Write-Host "  Instalando NSSM..."
    cmd /c "choco install nssm -y --force 2>&1"
} else {
    Write-Host "  OK: NSSM ya instalado" -ForegroundColor Green
}

# Refrescar PATH despues de instalaciones
$machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$env:Path = "$machinePath;$userPath"

# ─────────────────────────────────────────────────────────
# PASO 2: Instalar PostgreSQL
# ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[2/7] Configurando PostgreSQL..." -ForegroundColor Yellow

$pgDir = "C:\Program Files\PostgreSQL\16"
if (-not (Test-Path "$pgDir\bin\psql.exe")) {
    Write-Host "  Instalando PostgreSQL 16..."
    cmd /c "choco install postgresql16 --params `"/Password:$DbPassword`" -y --force 2>&1"
    $env:Path = "$pgDir\bin;$env:Path"
    Start-Sleep -Seconds 10
    Write-Host "  OK: PostgreSQL 16 instalado" -ForegroundColor Green
} else {
    Write-Host "  OK: PostgreSQL 16 ya instalado" -ForegroundColor Green
    $env:Path = "$pgDir\bin;$env:Path"
}

Write-Host "  Creando base de datos panel_waze..."
$env:PGPASSWORD = $DbPassword
cmd /c "psql -U postgres -c `"SELECT 1`" 2>&1" | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  AVISO: PostgreSQL no responde aun. Esperando 15s..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
}
cmd /c "psql -U postgres -c `"CREATE DATABASE panel_waze;`" 2>&1" | Out-Null
Write-Host "  OK: Base de datos lista" -ForegroundColor Green

# ─────────────────────────────────────────────────────────
# PASO 3: Verificar codigo fuente
# ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[3/7] Preparando codigo fuente..." -ForegroundColor Yellow

if (-not (Test-Path "$InstallDir\package.json")) {
    Write-Host "  ERROR: No se encontro package.json en $InstallDir" -ForegroundColor Red
    Write-Host "  Asegurate de haber clonado el repo:" -ForegroundColor Red
    Write-Host "    git clone -b main https://github.com/jgaliano0806/Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados.git $InstallDir" -ForegroundColor Yellow
    exit 1
}

if (Test-Path "$InstallDir\.git") {
    Write-Host "  Actualizando repositorio..."
    Push-Location $InstallDir
    cmd /c "git pull 2>&1"
    Pop-Location
}

Write-Host "  OK: Codigo fuente listo" -ForegroundColor Green

# ─────────────────────────────────────────────────────────
# PASO 4: Instalar dependencias y construir
# ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[4/7] Instalando dependencias y construyendo..." -ForegroundColor Yellow

Push-Location $InstallDir

Write-Host "  npm ci (esto puede tardar unos minutos)..."
cmd /c "npm ci --include=dev 2>&1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: npm ci fallo con codigo $LASTEXITCODE" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "  OK: Dependencias instaladas" -ForegroundColor Green

Write-Host "  Compilando packages/types..."
Push-Location "$InstallDir\packages\types"
cmd /c "npm run build 2>&1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Build de types fallo" -ForegroundColor Red
    Pop-Location; Pop-Location
    exit 1
}
Pop-Location

Write-Host "  Compilando backend (TypeScript)..."
Push-Location "$InstallDir\apps\backend"
cmd /c "npm run build 2>&1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Build de backend fallo" -ForegroundColor Red
    Pop-Location; Pop-Location
    exit 1
}
Pop-Location

Write-Host "  Compilando frontend (React + Vite)..."
Push-Location "$InstallDir\apps\frontend"
cmd /c "npm run build 2>&1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Build de frontend fallo" -ForegroundColor Red
    Pop-Location; Pop-Location
    exit 1
}
Pop-Location

Pop-Location

Write-Host "  OK: Build completado" -ForegroundColor Green

# ─────────────────────────────────────────────────────────
# PASO 5: Aplicar schema de base de datos
# ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[5/7] Aplicando schema de base de datos..." -ForegroundColor Yellow

$env:PGPASSWORD = $DbPassword
cmd /c "psql -U postgres -d panel_waze -f `"$InstallDir\apps\backend\src\database\schema.sql`" 2>&1"
Write-Host "  OK: Schema aplicado" -ForegroundColor Green

# ─────────────────────────────────────────────────────────
# PASO 6: Configurar archivos de entorno
# ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[6/7] Configurando entorno de produccion..." -ForegroundColor Yellow

$jwtSecret = "PanelWaze_JWT_$( Get-Random -Maximum 999999 )_Prod"

$backendEnv = @"
DB_HOST=localhost
DB_PORT=5432
DB_NAME=panel_waze
DB_USER=postgres
DB_PASSWORD=$DbPassword
DB_POOL_MAX=50

NODE_ENV=production
PORT=$BackendPort

WEATHER_PROVIDER=openmeteo

JWT_SECRET=$jwtSecret
"@

Set-Content -Path "$InstallDir\apps\backend\.env" -Value $backendEnv -Encoding UTF8
Write-Host "  OK: backend .env creado" -ForegroundColor Green

$frontendEnv = "VITE_API_URL=/api"
Set-Content -Path "$InstallDir\apps\frontend\.env" -Value $frontendEnv -Encoding UTF8

# ─────────────────────────────────────────────────────────
# PASO 7: Instalar nginx y registrar servicios
# ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[7/7] Configurando servicios Windows..." -ForegroundColor Yellow

# Instalar nginx
$nginxDir = "C:\nginx"
if (-not (Test-Path "$nginxDir\nginx.exe")) {
    Write-Host "  Instalando nginx..."
    cmd /c "choco install nginx -y --force 2>&1"

    $chocoNginx = Get-ChildItem "C:\tools\nginx*" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($chocoNginx) {
        if (-not (Test-Path $nginxDir)) { New-Item -ItemType Directory -Path $nginxDir -Force | Out-Null }
        Copy-Item -Path "$($chocoNginx.FullName)\*" -Destination $nginxDir -Recurse -Force
        Write-Host "  OK: nginx instalado en $nginxDir" -ForegroundColor Green
    } else {
        Write-Host "  AVISO: nginx no se encontro en C:\tools. Verificar manualmente." -ForegroundColor Yellow
    }
} else {
    Write-Host "  OK: nginx ya instalado" -ForegroundColor Green
}

# Copiar config de nginx
if (Test-Path "$nginxDir\nginx.exe") {
    Copy-Item -Path "$InstallDir\deploy\nginx-prod.conf" -Destination "$nginxDir\conf\nginx.conf" -Force
    Write-Host "  OK: nginx configurado" -ForegroundColor Green
}

# Crear directorio de logs
New-Item -ItemType Directory -Path "$InstallDir\logs" -Force | Out-Null

# ── Registrar Backend como servicio ──
Write-Host "  Registrando servicio: PanelWazeBackend..."
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodePath) {
    $nodePath = "C:\Program Files\nodejs\node.exe"
}

cmd /c "nssm stop PanelWazeBackend 2>&1" | Out-Null
cmd /c "nssm remove PanelWazeBackend confirm 2>&1" | Out-Null

cmd /c "nssm install PanelWazeBackend `"$nodePath`" `"$InstallDir\apps\backend\dist\server.js`" 2>&1"
cmd /c "nssm set PanelWazeBackend AppDirectory `"$InstallDir\apps\backend`" 2>&1"
cmd /c "nssm set PanelWazeBackend AppEnvironmentExtra NODE_ENV=production PORT=$BackendPort 2>&1"
cmd /c "nssm set PanelWazeBackend Description `"Panel Waze - Backend API (Fastify + Socket.IO)`" 2>&1"
cmd /c "nssm set PanelWazeBackend Start SERVICE_AUTO_START 2>&1"
cmd /c "nssm set PanelWazeBackend AppStdout `"$InstallDir\logs\backend-stdout.log`" 2>&1"
cmd /c "nssm set PanelWazeBackend AppStderr `"$InstallDir\logs\backend-stderr.log`" 2>&1"
cmd /c "nssm set PanelWazeBackend AppRotateFiles 1 2>&1"
cmd /c "nssm set PanelWazeBackend AppRotateBytes 10485760 2>&1"

Write-Host "  OK: PanelWazeBackend registrado" -ForegroundColor Green

# ── Registrar nginx como servicio ──
if (Test-Path "$nginxDir\nginx.exe") {
    Write-Host "  Registrando servicio: PanelWazeNginx..."
    cmd /c "nssm stop PanelWazeNginx 2>&1" | Out-Null
    cmd /c "nssm remove PanelWazeNginx confirm 2>&1" | Out-Null

    cmd /c "nssm install PanelWazeNginx `"$nginxDir\nginx.exe`" 2>&1"
    cmd /c "nssm set PanelWazeNginx AppDirectory `"$nginxDir`" 2>&1"
    cmd /c "nssm set PanelWazeNginx Description `"Panel Waze - Nginx Reverse Proxy`" 2>&1"
    cmd /c "nssm set PanelWazeNginx Start SERVICE_AUTO_START 2>&1"

    Write-Host "  OK: PanelWazeNginx registrado" -ForegroundColor Green
}

# ── Firewall ──
Write-Host "  Configurando firewall..."
cmd /c "netsh advfirewall firewall delete rule name=`"Panel Waze HTTP`" 2>&1" | Out-Null
cmd /c "netsh advfirewall firewall delete rule name=`"Panel Waze Backend`" 2>&1" | Out-Null
cmd /c "netsh advfirewall firewall add rule name=`"Panel Waze HTTP`" dir=in action=allow protocol=tcp localport=$NginxPort 2>&1"
cmd /c "netsh advfirewall firewall add rule name=`"Panel Waze Backend`" dir=in action=allow protocol=tcp localport=$BackendPort 2>&1"
Write-Host "  OK: Firewall configurado" -ForegroundColor Green

# ── Iniciar servicios ──
Write-Host ""
Write-Host "  Iniciando servicios..."
cmd /c "nssm start PanelWazeBackend 2>&1"
Start-Sleep -Seconds 5

if (Test-Path "$nginxDir\nginx.exe") {
    cmd /c "nssm start PanelWazeNginx 2>&1"
}

Start-Sleep -Seconds 3

# ── Verificar health ──
Write-Host ""
Write-Host "  Verificando health check..."
try {
    $health = Invoke-RestMethod -Uri "http://localhost:$BackendPort/health" -TimeoutSec 10
    Write-Host "  Backend: OK" -ForegroundColor Green
} catch {
    Write-Host "  Backend: aun iniciando (verificar en unos segundos)" -ForegroundColor Yellow
}

# ─────────────────────────────────────────────────────────
# RESULTADO FINAL
# ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  DESPLIEGUE COMPLETADO" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Panel Web:     http://10.1.0.136" -ForegroundColor White
Write-Host "  API Backend:   http://10.1.0.136:$BackendPort/api" -ForegroundColor White
Write-Host "  Health Check:  http://10.1.0.136:$BackendPort/health" -ForegroundColor White
Write-Host ""
Write-Host "  Servicios Windows:" -ForegroundColor White
Write-Host "    - PanelWazeBackend  (Node.js API)" -ForegroundColor White
Write-Host "    - PanelWazeNginx    (Reverse Proxy)" -ForegroundColor White
Write-Host ""
Write-Host "  Logs en: $InstallDir\logs\" -ForegroundColor White
Write-Host ""
Write-Host "  Comandos utiles:" -ForegroundColor Gray
Write-Host "    nssm restart PanelWazeBackend" -ForegroundColor Gray
Write-Host "    nssm restart PanelWazeNginx" -ForegroundColor Gray
Write-Host "    nssm status PanelWazeBackend" -ForegroundColor Gray
Write-Host ""
