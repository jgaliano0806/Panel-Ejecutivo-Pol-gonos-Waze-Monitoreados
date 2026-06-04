#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Gestion de servicios del Panel Waze

.USAGE
    .\manage-services.ps1 -Action start|stop|restart|status|logs|update
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("start", "stop", "restart", "status", "logs", "update")]
    [string]$Action,

    [string]$InstallDir
)

# Auto-detectar directorio del proyecto (raíz del repo = padre de deploy/)
# Producción: D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados
if (-not $InstallDir) {
    $scriptProjectRoot = Split-Path -Parent $PSScriptRoot
    if (Test-Path "$scriptProjectRoot\package.json") {
        $InstallDir = $scriptProjectRoot
    } else {
        $InstallDir = "D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados"
    }
}

$nginxDir = $null
foreach ($candidate in @("C:\nginx", (Get-ChildItem "C:\tools\nginx*" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1).FullName)) {
    if ($candidate -and (Test-Path "$candidate\nginx.exe")) {
        $nginxDir = $candidate
        break
    }
}

function Test-NssmService([string]$Name) {
    return [bool](Get-Service -Name $Name -ErrorAction SilentlyContinue)
}

# True si hay algo escuchando en el puerto 80 (nginx realmente bindeo).
# El estado "Running" de NSSM puede ser fantasma: master vivo sin bind a :80
# cuando un nginx.exe huerfano se quedo tomando el puerto.
function Test-NginxPort {
    $c = Get-NetTCPConnection -LocalPort 80 -State Listen -ErrorAction SilentlyContinue
    return [bool]$c
}

function Start-Nginx {
    if (Test-NssmService "PanelWazeNginx") {
        # Arranque limpio y verificado: en cada intento detenemos servicio,
        # matamos huerfanos que pudieran retener :80, arrancamos y comprobamos
        # que realmente sirve en :80 (no basta con estado Running).
        for ($attempt = 1; $attempt -le 3; $attempt++) {
            Stop-Service PanelWazeNginx -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
            Stop-Process -Name nginx -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2

            Start-Service PanelWazeNginx -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 3

            $bound = $false
            for ($i = 1; $i -le 5; $i++) {
                if (Test-NginxPort) { $bound = $true; break }
                Start-Sleep -Seconds 2
            }
            if ($bound) {
                Write-Host "  PanelWazeNginx OK (sirviendo en :80)" -ForegroundColor Green
                return
            }
            Write-Host "  nginx no bindeo :80 (intento $attempt/3); limpiando y reintentando..." -ForegroundColor Yellow
        }
        throw "PanelWazeNginx no logro escuchar en :80 tras 3 intentos"
    }

    if (-not $nginxDir) { Write-Host "  nginx no encontrado" -ForegroundColor Red; return }
    Stop-Process -Name nginx -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Start-Process -FilePath "$nginxDir\nginx.exe" -WorkingDirectory $nginxDir
    Start-Sleep -Seconds 2
    if (-not (Test-NginxPort)) { throw "nginx no logro escuchar en :80 (modo proceso)" }
    Write-Host "  nginx OK (modo proceso, sirviendo en :80)" -ForegroundColor Green
}

function Stop-Nginx {
    if (Test-NssmService "PanelWazeNginx") {
        Stop-Service PanelWazeNginx -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    } elseif ($nginxDir) {
        cmd /c "cd /d `"$nginxDir`" && nginx.exe -s quit 2>&1" | Out-Null
        Start-Sleep -Seconds 2
    }
    # Siempre matar huerfanos: NSSM no limpia nginx.exe que quedaron tomando :80.
    Stop-Process -Name nginx -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Write-Host "  nginx detenido (servicio + huerfanos)" -ForegroundColor Green
}

# Ejecuta un comando en cmd y aborta si el exit code != 0.
# Evita desplegar dist roto cuando npm ci / build fallan.
function Invoke-Step([string]$Label, [string]$Command) {
    Write-Host "  $Label..."
    cmd /c $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Label fallo (exit $LASTEXITCODE)"
    }
}

# Espera a que el backend responda 200 en /health antes de declarar exito.
# El backend corre migraciones en el arranque, por eso puede tardar.
function Wait-BackendHealthy([int]$TimeoutSec = 120) {
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    $attempt = 0
    while ((Get-Date) -lt $deadline) {
        $attempt++
        try {
            $h = Invoke-RestMethod -Uri "http://localhost:3002/health" -TimeoutSec 5
            Write-Host "  Backend saludable (intento $attempt, uptime: $($h.uptimeFormatted))" -ForegroundColor Green
            return $true
        } catch {
            Start-Sleep -Seconds 4
        }
    }
    throw "Backend no respondio 200 en :3002/health tras $TimeoutSec s"
}

switch ($Action) {
    "start" {
        Write-Host "Iniciando PanelWazeBackend..." -ForegroundColor Yellow
        nssm start PanelWazeBackend
        Start-Sleep -Seconds 3
        Write-Host "Iniciando nginx..." -ForegroundColor Yellow
        Start-Nginx
        Write-Host "Servicios iniciados." -ForegroundColor Green
    }

    "stop" {
        Write-Host "Deteniendo PanelWazeBackend..." -ForegroundColor Yellow
        nssm stop PanelWazeBackend
        Write-Host "Deteniendo nginx..." -ForegroundColor Yellow
        Stop-Nginx
        Write-Host "Servicios detenidos." -ForegroundColor Green
    }

    "restart" {
        Write-Host "Reiniciando PanelWazeBackend..." -ForegroundColor Yellow
        nssm restart PanelWazeBackend
        Start-Sleep -Seconds 3
        Write-Host "Reiniciando nginx..." -ForegroundColor Yellow
        Stop-Nginx
        Start-Sleep -Seconds 1
        Start-Nginx
        Write-Host "Servicios reiniciados." -ForegroundColor Green
    }

    "status" {
        Write-Host ""
        Write-Host "Estado de servicios:" -ForegroundColor Cyan
        $backendState = nssm status PanelWazeBackend 2>$null
        $bColor = if ($backendState -match "Running") { "Green" } else { "Red" }
        Write-Host "  PanelWazeBackend: $backendState" -ForegroundColor $bColor

        if (Test-NssmService "PanelWazeNginx") {
            $nginxState = (Get-Service PanelWazeNginx).Status
            $nColor = if ($nginxState -eq "Running") { "Green" } else { "Red" }
            Write-Host "  PanelWazeNginx:   $nginxState" -ForegroundColor $nColor
        } else {
            $nginxCount = (Get-Process nginx -ErrorAction SilentlyContinue).Count
            $nColor = if ($nginxCount -gt 0) { "Green" } else { "Red" }
            Write-Host "  nginx: $nginxCount procesos" -ForegroundColor $nColor
        }

        if (Test-NssmService "PanelWazeFrontend") {
            $frontendState = (Get-Service PanelWazeFrontend).Status
            $fColor = if ($frontendState -eq "Running") { "Green" } else { "Yellow" }
            Write-Host "  PanelWazeFrontend: $frontendState (preview :5180, no trafico principal)" -ForegroundColor $fColor
        }

        Write-Host ""
        Write-Host "Health check:" -ForegroundColor Cyan
        try {
            $health = Invoke-RestMethod -Uri "http://localhost:3002/health" -TimeoutSec 5
            Write-Host "  Backend: OK ($($health.uptimeFormatted))" -ForegroundColor Green
        } catch {
            Write-Host "  Backend: NO RESPONDE" -ForegroundColor Red
        }
        try {
            $null = Invoke-WebRequest -Uri "http://localhost/health" -UseBasicParsing -TimeoutSec 5
            Write-Host "  Nginx:   OK (proxy funciona)" -ForegroundColor Green
        } catch {
            Write-Host "  Nginx:   NO RESPONDE" -ForegroundColor Yellow
        }
        Write-Host ""
    }

    "logs" {
        Write-Host "Ultimas 50 lineas del log:" -ForegroundColor Cyan
        Write-Host ""
        if (Test-Path "$InstallDir\logs\backend-stderr.log") {
            Get-Content "$InstallDir\logs\backend-stderr.log" -Tail 50
        } else {
            Write-Host "  No hay logs aun." -ForegroundColor Yellow
        }
    }

    "update" {
        Write-Host "Actualizando Panel Waze..." -ForegroundColor Yellow
        Write-Host "  InstallDir: $InstallDir" -ForegroundColor Gray

        $prevErrorPref = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        nssm stop PanelWazeBackend 2>$null | Out-Null
        net stop PanelWazeFrontend 2>$null | Out-Null
        Stop-Nginx
        $ErrorActionPreference = $prevErrorPref

        Push-Location $InstallDir
        try {
            if ($env:SKIP_GIT_SYNC -ne "1") {
                $safeDir = ($InstallDir -replace '\\', '/')
                Write-Host "  git safe.directory..."
                git config --global --add safe.directory $safeDir 2>$null | Out-Null

                $targetRef = if ($env:DEPLOY_SHA) { $env:DEPLOY_SHA.Trim() } else { "origin/main" }
                Write-Host "  git fetch origin main..."
                git fetch origin main 2>&1
                if ($LASTEXITCODE -ne 0) { throw "git fetch fallo (exit $LASTEXITCODE)" }

                Write-Host "  git checkout main + reset -> $targetRef..."
                git checkout -f main 2>&1
                if ($LASTEXITCODE -ne 0) { throw "git checkout main fallo (exit $LASTEXITCODE)" }

                git reset --hard $targetRef 2>&1
                if ($LASTEXITCODE -ne 0) { throw "git reset --hard fallo (exit $LASTEXITCODE)" }

                $head = (git rev-parse --short HEAD 2>&1).Trim()
                Write-Host "  HEAD: $head" -ForegroundColor Gray
            } else {
                Write-Host "  git sync omitido (ya aplicado por CI)" -ForegroundColor Gray
            }
        } finally {
            Pop-Location
        }

        # Build: si algo falla, abortar antes de arrancar (no desplegar dist roto).
        # El bloque catch garantiza que los servicios vuelvan a arrancar igual.
        try {
            Invoke-Step "npm ci" "cd /d `"$InstallDir`" && npm ci --include=dev 2>&1"

            if (Test-Path "$InstallDir\packages\types") {
                Invoke-Step "Compilando types" "cd /d `"$InstallDir\packages\types`" && npm run build 2>&1"
            }

            Invoke-Step "Compilando backend" "cd /d `"$InstallDir\apps\backend`" && npm run build 2>&1"

            Invoke-Step "Compilando frontend" "cd /d `"$InstallDir\apps\frontend`" && set NODE_OPTIONS=--max-old-space-size=4096 && npm run build 2>&1"

            # Actualizar config nginx con ruta correcta (sin BOM; BOM rompe nginx en Windows)
            if ($nginxDir -and (Test-Path "$InstallDir\deploy\nginx-prod.conf")) {
                $nginxConf = Get-Content "$InstallDir\deploy\nginx-prod.conf" -Raw
                $nginxRoot = $InstallDir -replace '\\', '/'
                $nginxConf = $nginxConf -replace 'INSTALL_DIR', $nginxRoot
                $confPath = "$nginxDir\conf\nginx.conf"
                $utf8NoBom = New-Object System.Text.UTF8Encoding($False)
                [System.IO.File]::WriteAllText($confPath, $nginxConf, $utf8NoBom)
                Write-Host "  nginx config actualizado (UTF-8 sin BOM)" -ForegroundColor Gray

                Push-Location $nginxDir
                & .\nginx.exe -t 2>&1
                $nginxTestExit = $LASTEXITCODE
                Pop-Location
                if ($nginxTestExit -ne 0) { throw "nginx.conf invalida tras actualizar" }
            }
        } catch {
            Write-Host "  [ERROR] Build/config fallo: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "  Re-arrancando servicios con el dist previo para no dejar prod caida..." -ForegroundColor Yellow
            nssm start PanelWazeBackend 2>$null | Out-Null
            Start-Nginx
            throw
        }

        # Arranque + verificacion: el backend debe responder antes de declarar exito.
        nssm start PanelWazeBackend
        net start PanelWazeFrontend 2>$null
        Start-Nginx
        Wait-BackendHealthy -TimeoutSec 120

        Write-Host ""
        Write-Host "Actualizacion completada." -ForegroundColor Green
    }
}
