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
#>

param(
    [string]$InstallDir = "C:\PanelWaze",
    [string]$DbPassword = "CASISA_Prod_2026!",
    [int]$BackendPort = 3001,
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

Write-Host "[0/7] Verificando prerrequisitos..." -ForegroundColor Yellow
$os = Get-CimInstance Win32_OperatingSystem
Write-Host "  OS: $($os.Caption) $($os.Version)"

# ─────────────────────────────────────────────────────────
# PASO 1: Instalar dependencias del sistema
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

if (-not (Test-Command "node")) {
    Write-Host "  Instalando Node.js LTS..."
    cmd /c "choco install nodejs-lts -y --force 2>&1"
    $env:Path = "C:\Program Files\nodejs;$env:Path"
} else {
    Write-Host "  OK: Node.js $(node --version) ya instalado" -ForegroundColor Green
}

if (-not (Test-Command "git")) {
    Write-Host "  Instalando Git..."
    cmd /c "choco install git -y --force 2>&1"
    $env:Path = "C:\Program Files\Git\cmd;$env:Path"
} else {
    Write-Host "  OK: Git ya instalado" -ForegroundColor Green
}

if (-not (Test-Command "nssm")) {
    Write-Host "  Instalando NSSM..."
    cmd /c "choco install nssm -y --force 2>&1"
} else {
    Write-Host "  OK: NSSM ya instalado" -ForegroundColor Green
}

# Refrescar PATH
$machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$env:Path = "$machinePath;$userPath"

# ─────────────────────────────────────────────────────────
# PASO 2: Instalar y configurar PostgreSQL
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

# Asegurar que PostgreSQL escuche en TCP (Windows resuelve localhost a IPv6 primero)
$pgConf = "$pgDir\data\postgresql.conf"
$pgHba = "$pgDir\data\pg_hba.conf"
if (Test-Path $pgConf) {
    Write-Host "  Configurando PostgreSQL para TCP..."
    $content = Get-Content $pgConf -Raw
    $content = $content -replace "#?listen_addresses\s*=.*", "listen_addresses = '*'"
    $content = $content -replace "#?port\s*=.*", "port = 5432"
    Set-Content $pgConf $content

    $hbaContent = Get-Content $pgHba -Raw
    if ($hbaContent -notmatch "host\s+all\s+all\s+127\.0\.0\.1") {
        Add-Content $pgHba "`nhost all all 127.0.0.1/32 md5"
        Add-Content $pgHba "host all all ::1/128 md5"
    }

    Restart-Service postgresql-x64-16 -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 5
}

# Probar conexion (usar 127.0.0.1 explicitamente para evitar problema IPv6)
Write-Host "  Verificando conexion..."
$env:PGPASSWORD = $DbPassword
cmd /c "psql -U postgres -h 127.0.0.1 -c `"SELECT 1`" 2>&1" | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  AVISO: PostgreSQL no responde. Esperando 15s..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
    cmd /c "psql -U postgres -h 127.0.0.1 -c `"SELECT 1`" 2>&1" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR: PostgreSQL no responde en 127.0.0.1:5432" -ForegroundColor Red
        Write-Host "  Verificar: Get-Service postgresql*" -ForegroundColor Yellow
        exit 1
    }
}

cmd /c "psql -U postgres -h 127.0.0.1 -c `"CREATE DATABASE panel_waze;`" 2>&1" | Out-Null
Write-Host "  OK: Base de datos lista" -ForegroundColor Green

# ─────────────────────────────────────────────────────────
# PASO 3: Verificar codigo fuente
# ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[3/7] Preparando codigo fuente..." -ForegroundColor Yellow

if (-not (Test-Path "$InstallDir\package.json")) {
    Write-Host "  ERROR: No se encontro package.json en $InstallDir" -ForegroundColor Red
    Write-Host "  Clona el repo primero:" -ForegroundColor Red
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
if ($LASTEXITCODE -ne 0) { Write-Host "  ERROR: Build de types fallo" -ForegroundColor Red; Pop-Location; Pop-Location; exit 1 }
Pop-Location

Write-Host "  Compilando backend (TypeScript)..."
Push-Location "$InstallDir\apps\backend"
cmd /c "npm run build 2>&1"
if ($LASTEXITCODE -ne 0) { Write-Host "  ERROR: Build de backend fallo" -ForegroundColor Red; Pop-Location; Pop-Location; exit 1 }
Pop-Location

Write-Host "  Compilando frontend (React + Vite)..."
Push-Location "$InstallDir\apps\frontend"
cmd /c "npm run build 2>&1"
if ($LASTEXITCODE -ne 0) { Write-Host "  ERROR: Build de frontend fallo" -ForegroundColor Red; Pop-Location; Pop-Location; exit 1 }
Pop-Location

Pop-Location
Write-Host "  OK: Build completado" -ForegroundColor Green

# ─────────────────────────────────────────────────────────
# PASO 5: Aplicar schema de base de datos
# ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[5/7] Aplicando schema de base de datos..." -ForegroundColor Yellow

$env:PGPASSWORD = $DbPassword
cmd /c "psql -U postgres -h 127.0.0.1 -d panel_waze -c `"SET client_encoding TO 'UTF8';`" 2>&1" | Out-Null
cmd /c "psql -U postgres -h 127.0.0.1 -d panel_waze -f `"$InstallDir\apps\backend\src\database\schema.sql`" 2>&1"
Write-Host "  OK: Schema aplicado" -ForegroundColor Green

# ─────────────────────────────────────────────────────────
# PASO 6: Configurar archivos de entorno
# ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[6/7] Configurando entorno de produccion..." -ForegroundColor Yellow

$jwtSecret = "PanelWaze_JWT_$( Get-Random -Maximum 999999 )_Prod"

# DB_HOST=127.0.0.1 (no "localhost") porque Windows resuelve localhost a ::1 (IPv6) primero
$backendEnv = @"
DB_HOST=127.0.0.1
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

Set-Content -Path "$InstallDir\apps\frontend\.env" -Value "VITE_API_URL=/api" -Encoding UTF8

# ─────────────────────────────────────────────────────────
# PASO 7: Servicios Windows
# ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[7/7] Configurando servicios Windows..." -ForegroundColor Yellow

# ── Detener y limpiar servicios/procesos previos ──
Write-Host "  Limpiando servicios y procesos previos..."
cmd /c "nssm stop PanelWazeBackend 2>&1" | Out-Null
cmd /c "nssm remove PanelWazeBackend confirm 2>&1" | Out-Null
cmd /c "nssm stop PanelWazeNginx 2>&1" | Out-Null
cmd /c "nssm remove PanelWazeNginx confirm 2>&1" | Out-Null

# Eliminar tareas programadas de nginx previas
Unregister-ScheduledTask -TaskName "PanelWazeNginx" -Confirm:$false -ErrorAction SilentlyContinue

# Matar todos los procesos nginx residuales
Stop-Process -Name nginx -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Stop-Process -Name nginx -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# ── Instalar nginx ──
$nginxDir = $null
$chocoNginx = Get-ChildItem "C:\tools\nginx*" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
if ($chocoNginx) {
    $nginxDir = $chocoNginx.FullName
    Write-Host "  OK: nginx encontrado en $nginxDir" -ForegroundColor Green
} else {
    Write-Host "  Instalando nginx..."
    cmd /c "choco install nginx -y --force 2>&1"
    $chocoNginx = Get-ChildItem "C:\tools\nginx*" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($chocoNginx) {
        $nginxDir = $chocoNginx.FullName
        Write-Host "  OK: nginx instalado en $nginxDir" -ForegroundColor Green
    } else {
        Write-Host "  ERROR: nginx no se pudo instalar" -ForegroundColor Red
    }
}

# Copiar config personalizada al directorio real de nginx
if ($nginxDir) {
    Copy-Item -Path "$InstallDir\deploy\nginx-prod.conf" -Destination "$nginxDir\conf\nginx.conf" -Force

    # Verificar config
    $testResult = cmd /c "cd /d `"$nginxDir`" && nginx.exe -t 2>&1"
    Write-Host "  $testResult"

    if ($testResult -match "test is successful") {
        Write-Host "  OK: nginx configurado" -ForegroundColor Green
    } else {
        Write-Host "  AVISO: Config de nginx tiene problemas" -ForegroundColor Yellow
    }
}

# Crear directorio de logs
New-Item -ItemType Directory -Path "$InstallDir\logs" -Force | Out-Null

# ── Registrar Backend como servicio NSSM ──
Write-Host "  Registrando servicio: PanelWazeBackend..."
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodePath) { $nodePath = "C:\Program Files\nodejs\node.exe" }

cmd /c "nssm install PanelWazeBackend `"$nodePath`" `"$InstallDir\apps\backend\dist\server.js`" 2>&1"
cmd /c "nssm set PanelWazeBackend AppDirectory `"$InstallDir\apps\backend`" 2>&1"
cmd /c "nssm set PanelWazeBackend AppEnvironmentExtra NODE_ENV=production PORT=$BackendPort 2>&1"
cmd /c "nssm set PanelWazeBackend Description `"Panel Waze - Backend API`" 2>&1"
cmd /c "nssm set PanelWazeBackend Start SERVICE_AUTO_START 2>&1"
cmd /c "nssm set PanelWazeBackend AppStdout `"$InstallDir\logs\backend-stdout.log`" 2>&1"
cmd /c "nssm set PanelWazeBackend AppStderr `"$InstallDir\logs\backend-stderr.log`" 2>&1"
cmd /c "nssm set PanelWazeBackend AppRotateFiles 1 2>&1"
cmd /c "nssm set PanelWazeBackend AppRotateBytes 10485760 2>&1"
Write-Host "  OK: PanelWazeBackend registrado" -ForegroundColor Green

# ── Registrar nginx como Scheduled Task (no NSSM - evita spawn de procesos zombie) ──
if ($nginxDir) {
    Write-Host "  Registrando nginx como tarea programada..."
    $action = New-ScheduledTaskAction -Execute "$nginxDir\nginx.exe" -WorkingDirectory $nginxDir
    $trigger = New-ScheduledTaskTrigger -AtStartup
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero)
    Register-ScheduledTask -TaskName "PanelWazeNginx" -Action $action -Trigger $trigger -Settings $settings -User "SYSTEM" -RunLevel Highest -Force | Out-Null
    Write-Host "  OK: PanelWazeNginx registrado (Scheduled Task)" -ForegroundColor Green
}

# ── Firewall ──
Write-Host "  Configurando firewall..."
cmd /c "netsh advfirewall firewall delete rule name=`"Panel Waze HTTP`" 2>&1" | Out-Null
cmd /c "netsh advfirewall firewall delete rule name=`"Panel Waze Backend`" 2>&1" | Out-Null
cmd /c "netsh advfirewall firewall add rule name=`"Panel Waze HTTP`" dir=in action=allow protocol=tcp localport=$NginxPort 2>&1" | Out-Null
cmd /c "netsh advfirewall firewall add rule name=`"Panel Waze Backend`" dir=in action=allow protocol=tcp localport=$BackendPort 2>&1" | Out-Null
Write-Host "  OK: Firewall configurado" -ForegroundColor Green

# ── Iniciar servicios ──
Write-Host ""
Write-Host "  Iniciando servicios..."

cmd /c "nssm start PanelWazeBackend 2>&1"
Start-Sleep -Seconds 5

if ($nginxDir) {
    Start-Process -FilePath "$nginxDir\nginx.exe" -WorkingDirectory $nginxDir
    Start-Sleep -Seconds 2
    $nginxCount = (Get-Process nginx -ErrorAction SilentlyContinue).Count
    Write-Host "  nginx: $nginxCount procesos activos"
}

# ── Health check ──
Write-Host ""
Write-Host "  Verificando health check..."
Start-Sleep -Seconds 3

try {
    $health = Invoke-RestMethod -Uri "http://localhost:$BackendPort/health" -TimeoutSec 10
    Write-Host "  Backend directo (:$BackendPort): OK - $($health.uptimeFormatted)" -ForegroundColor Green
} catch {
    Write-Host "  Backend directo: aun iniciando" -ForegroundColor Yellow
}

try {
    $proxy = Invoke-WebRequest -Uri "http://localhost/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "  Nginx proxy (:$NginxPort): OK" -ForegroundColor Green
} catch {
    Write-Host "  Nginx proxy: verificar config" -ForegroundColor Yellow
}

try {
    $web = Invoke-WebRequest -Uri "http://localhost/" -UseBasicParsing -TimeoutSec 10
    if ($web.Content -match "Panel|Waze|root") {
        Write-Host "  Frontend: OK (panel cargando)" -ForegroundColor Green
    } elseif ($web.Content -match "Welcome to nginx") {
        Write-Host "  Frontend: AVISO - nginx muestra pagina por defecto" -ForegroundColor Yellow
    } else {
        Write-Host "  Frontend: responde (verificar en navegador)" -ForegroundColor Green
    }
} catch {
    Write-Host "  Frontend: no responde en puerto $NginxPort" -ForegroundColor Yellow
}

# ─────────────────────────────────────────────────────────
# RESULTADO FINAL
# ─────────────────────────────────────────────────────────
$serverIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch "^(127\.|169\.)" } | Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  DESPLIEGUE COMPLETADO" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Panel Web:     http://${serverIP}" -ForegroundColor White
Write-Host "  API Backend:   http://${serverIP}:$BackendPort/api" -ForegroundColor White
Write-Host "  Health Check:  http://${serverIP}:$BackendPort/health" -ForegroundColor White
Write-Host ""
Write-Host "  Servicios:" -ForegroundColor White
Write-Host "    - PanelWazeBackend  (NSSM - auto-start)" -ForegroundColor White
Write-Host "    - PanelWazeNginx    (Scheduled Task - at startup)" -ForegroundColor White
Write-Host ""
Write-Host "  Logs: $InstallDir\logs\" -ForegroundColor White
Write-Host ""
Write-Host "  Comandos utiles:" -ForegroundColor Gray
Write-Host "    nssm restart PanelWazeBackend" -ForegroundColor Gray
Write-Host "    nssm status PanelWazeBackend" -ForegroundColor Gray
Write-Host "    # Reiniciar nginx:" -ForegroundColor Gray
Write-Host "    taskkill /F /IM nginx.exe; Start-Process $nginxDir\nginx.exe -WorkingDirectory $nginxDir" -ForegroundColor Gray
Write-Host ""
