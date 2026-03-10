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

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  PANEL WAZE MONITOREADOS - DESPLIEGUE" -ForegroundColor Cyan
Write-Host "  Windows Server 2022" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# ─────────────────────────────────────────────────────────
# PASO 0: Verificar prerrequisitos
# ─────────────────────────────────────────────────────────
function Test-Command($cmd) {
    return [bool](Get-Command $cmd -ErrorAction SilentlyContinue)
}

Write-Host "[0/7] Verificando prerrequisitos..." -ForegroundColor Yellow

# Verificar que estamos en Windows Server
$os = Get-CimInstance Win32_OperatingSystem
Write-Host "  OS: $($os.Caption) $($os.Version)"

# ─────────────────────────────────────────────────────────
# PASO 1: Instalar Chocolatey (gestor de paquetes)
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
    choco install nodejs-lts -y --force
    refreshenv
    $env:Path = "C:\Program Files\nodejs;$env:Path"
} else {
    $nodeVer = node --version
    Write-Host "  OK: Node.js $nodeVer ya instalado" -ForegroundColor Green
}

# Git
if (-not (Test-Command "git")) {
    Write-Host "  Instalando Git..."
    choco install git -y --force
    refreshenv
    $env:Path = "C:\Program Files\Git\cmd;$env:Path"
} else {
    Write-Host "  OK: Git ya instalado" -ForegroundColor Green
}

# NSSM (para servicios Windows)
if (-not (Test-Command "nssm")) {
    Write-Host "  Instalando NSSM..."
    choco install nssm -y --force
    refreshenv
} else {
    Write-Host "  OK: NSSM ya instalado" -ForegroundColor Green
}

# ─────────────────────────────────────────────────────────
# PASO 2: Instalar PostgreSQL
# ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[2/7] Configurando PostgreSQL..." -ForegroundColor Yellow

$pgDir = "C:\Program Files\PostgreSQL\16"
if (-not (Test-Path "$pgDir\bin\psql.exe")) {
    Write-Host "  Instalando PostgreSQL 16..."
    choco install postgresql16 --params "/Password:$DbPassword" -y --force
    refreshenv
    $env:Path = "$pgDir\bin;$env:Path"
    Start-Sleep -Seconds 5
} else {
    Write-Host "  OK: PostgreSQL 16 ya instalado" -ForegroundColor Green
    $env:Path = "$pgDir\bin;$env:Path"
}

# Crear base de datos
Write-Host "  Creando base de datos panel_waze..."
$env:PGPASSWORD = $DbPassword
try {
    psql -U postgres -c "CREATE DATABASE panel_waze;" 2>$null
    Write-Host "  OK: Base de datos creada" -ForegroundColor Green
} catch {
    Write-Host "  Base de datos ya existe (OK)" -ForegroundColor Green
}

# ─────────────────────────────────────────────────────────
# PASO 3: Clonar / copiar proyecto
# ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[3/7] Preparando codigo fuente..." -ForegroundColor Yellow

if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# Si hay un .git, hacer pull; si no, copiar desde la ubicación actual
$scriptRoot = Split-Path -Parent $PSScriptRoot
if (Test-Path "$InstallDir\.git") {
    Write-Host "  Actualizando repositorio existente..."
    Push-Location $InstallDir
    git pull
    Pop-Location
} elseif (Test-Path "$scriptRoot\package.json") {
    Write-Host "  Copiando proyecto desde $scriptRoot..."
    robocopy $scriptRoot $InstallDir /MIR /XD node_modules dist .git 192.168.49.33 /XF "*.log" /NFL /NDL /NJH /NJS /NC /NS /NP
} else {
    Write-Host "  ERROR: No se encontro el codigo fuente." -ForegroundColor Red
    Write-Host "  Copia manualmente el proyecto a $InstallDir y vuelve a ejecutar."
    exit 1
}

# ─────────────────────────────────────────────────────────
# PASO 4: Instalar dependencias y construir
# ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[4/7] Instalando dependencias y construyendo..." -ForegroundColor Yellow

Push-Location $InstallDir

Write-Host "  npm ci (esto puede tardar unos minutos)..."
npm ci --include=dev 2>&1 | Out-Null

Write-Host "  Compilando packages/types..."
Push-Location "$InstallDir\packages\types"
npm run build
Pop-Location

Write-Host "  Compilando backend (TypeScript)..."
Push-Location "$InstallDir\apps\backend"
npm run build
Pop-Location

Write-Host "  Compilando frontend (React + Vite)..."
Push-Location "$InstallDir\apps\frontend"
npm run build
Pop-Location

Pop-Location

Write-Host "  OK: Build completado" -ForegroundColor Green

# ─────────────────────────────────────────────────────────
# PASO 5: Aplicar schema de base de datos
# ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[5/7] Aplicando schema de base de datos..." -ForegroundColor Yellow

$env:PGPASSWORD = $DbPassword
psql -U postgres -d panel_waze -f "$InstallDir\apps\backend\src\database\schema.sql"
Write-Host "  OK: Schema aplicado" -ForegroundColor Green

# ─────────────────────────────────────────────────────────
# PASO 6: Configurar archivos de entorno
# ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[6/7] Configurando entorno de produccion..." -ForegroundColor Yellow

# Backend .env
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

JWT_SECRET=PanelWaze_JWT_$(Get-Random -Maximum 999999)_Prod
"@

Set-Content -Path "$InstallDir\apps\backend\.env" -Value $backendEnv -Encoding UTF8
Write-Host "  OK: backend .env creado" -ForegroundColor Green

# Frontend .env (ya está embebido en el build, pero por si acaso)
$frontendEnv = @"
VITE_API_URL=/api
"@
Set-Content -Path "$InstallDir\apps\frontend\.env" -Value $frontendEnv -Encoding UTF8

# ─────────────────────────────────────────────────────────
# PASO 7: Instalar nginx y registrar servicios
# ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[7/7] Configurando servicios Windows..." -ForegroundColor Yellow

# Instalar nginx para Windows
$nginxDir = "C:\nginx"
if (-not (Test-Path $nginxDir)) {
    Write-Host "  Instalando nginx..."
    choco install nginx -y --force
    # Chocolatey instala nginx en C:\tools\nginx* normalmente
    $chocoNginx = Get-ChildItem "C:\tools\nginx*" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($chocoNginx) {
        Copy-Item -Path $chocoNginx.FullName -Destination $nginxDir -Recurse -Force
    }
}

# Copiar config de nginx
if (Test-Path $nginxDir) {
    Copy-Item -Path "$InstallDir\deploy\nginx-prod.conf" -Destination "$nginxDir\conf\nginx.conf" -Force
    Write-Host "  OK: nginx configurado" -ForegroundColor Green
}

# ── Registrar Backend como servicio ──
Write-Host "  Registrando servicio: PanelWazeBackend..."
$nodePath = (Get-Command node).Source
try { nssm stop PanelWazeBackend 2>$null } catch {}
try { nssm remove PanelWazeBackend confirm 2>$null } catch {}

nssm install PanelWazeBackend $nodePath "$InstallDir\apps\backend\dist\server.js"
nssm set PanelWazeBackend AppDirectory "$InstallDir\apps\backend"
nssm set PanelWazeBackend AppEnvironmentExtra "NODE_ENV=production" "PORT=$BackendPort"
nssm set PanelWazeBackend Description "Panel Waze - Backend API (Fastify + Socket.IO)"
nssm set PanelWazeBackend Start SERVICE_AUTO_START
nssm set PanelWazeBackend AppStdout "$InstallDir\logs\backend-stdout.log"
nssm set PanelWazeBackend AppStderr "$InstallDir\logs\backend-stderr.log"
nssm set PanelWazeBackend AppRotateFiles 1
nssm set PanelWazeBackend AppRotateBytes 10485760

# Crear directorio de logs
New-Item -ItemType Directory -Path "$InstallDir\logs" -Force | Out-Null

# ── Registrar nginx como servicio ──
if (Test-Path "$nginxDir\nginx.exe") {
    Write-Host "  Registrando servicio: PanelWazeNginx..."
    try { nssm stop PanelWazeNginx 2>$null } catch {}
    try { nssm remove PanelWazeNginx confirm 2>$null } catch {}

    nssm install PanelWazeNginx "$nginxDir\nginx.exe"
    nssm set PanelWazeNginx AppDirectory $nginxDir
    nssm set PanelWazeNginx Description "Panel Waze - Nginx Reverse Proxy"
    nssm set PanelWazeNginx Start SERVICE_AUTO_START
}

# ── Abrir puertos del firewall ──
Write-Host "  Configurando firewall..."
netsh advfirewall firewall add rule name="Panel Waze HTTP" dir=in action=allow protocol=tcp localport=$NginxPort 2>$null
netsh advfirewall firewall add rule name="Panel Waze Backend" dir=in action=allow protocol=tcp localport=$BackendPort 2>$null
netsh advfirewall firewall add rule name="Panel Waze WebSocket" dir=in action=allow protocol=tcp localport=$BackendPort 2>$null

# ── Iniciar servicios ──
Write-Host ""
Write-Host "  Iniciando servicios..."
nssm start PanelWazeBackend
Start-Sleep -Seconds 3

if (Test-Path "$nginxDir\nginx.exe") {
    nssm start PanelWazeNginx
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
