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

function Start-Nginx {
    if (Test-NssmService "PanelWazeNginx") {
        Start-Service PanelWazeNginx -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        $state = (Get-Service PanelWazeNginx).Status
        Write-Host "  PanelWazeNginx (NSSM): $state" -ForegroundColor $(if ($state -eq "Running") { "Green" } else { "Red" })
        return
    }
    if (-not $nginxDir) { Write-Host "  nginx no encontrado" -ForegroundColor Red; return }
    Stop-Process -Name nginx -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Start-Process -FilePath "$nginxDir\nginx.exe" -WorkingDirectory $nginxDir
    Start-Sleep -Seconds 1
    $count = (Get-Process nginx -ErrorAction SilentlyContinue).Count
    Write-Host "  nginx: $count procesos activos" -ForegroundColor Green
}

function Stop-Nginx {
    if (Test-NssmService "PanelWazeNginx") {
        Stop-Service PanelWazeNginx -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Write-Host "  PanelWazeNginx detenido" -ForegroundColor Green
        return
    }
    if ($nginxDir) { cmd /c "cd /d `"$nginxDir`" && nginx.exe -s quit 2>&1" | Out-Null }
    Start-Sleep -Seconds 2
    Stop-Process -Name nginx -Force -ErrorAction SilentlyContinue
    Write-Host "  nginx detenido" -ForegroundColor Green
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

        nssm stop PanelWazeBackend 2>$null
        net stop PanelWazeFrontend 2>$null
        Stop-Nginx

        $safeDir = ($InstallDir -replace '\\', '/')
        Write-Host "  git safe.directory..."
        git config --global --add safe.directory $safeDir 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) {
            cmd /c "git config --global --add safe.directory `"$safeDir`"" 2>&1 | Out-Null
        }

        Push-Location $InstallDir
        try {
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
        } finally {
            Pop-Location
        }

        Write-Host "  npm ci..."
        cmd /c "cd /d `"$InstallDir`" && npm ci --include=dev 2>&1"

        if (Test-Path "$InstallDir\packages\types") {
            Write-Host "  Compilando types..."
            cmd /c "cd /d `"$InstallDir\packages\types`" && npm run build 2>&1"
        }

        Write-Host "  Compilando backend..."
        cmd /c "cd /d `"$InstallDir\apps\backend`" && npm run build 2>&1"

        Write-Host "  Compilando frontend..."
        cmd /c "cd /d `"$InstallDir\apps\frontend`" && set NODE_OPTIONS=--max-old-space-size=4096 && npm run build 2>&1"

        # Actualizar config nginx con ruta correcta
        if ($nginxDir -and (Test-Path "$InstallDir\deploy\nginx-prod.conf")) {
            $nginxConf = Get-Content "$InstallDir\deploy\nginx-prod.conf" -Raw
            $nginxRoot = $InstallDir -replace '\\', '/'
            $nginxConf = $nginxConf -replace 'INSTALL_DIR', $nginxRoot
            Set-Content -Path "$nginxDir\conf\nginx.conf" -Value $nginxConf -Encoding UTF8
            Write-Host "  nginx config actualizado" -ForegroundColor Gray
        }

        nssm start PanelWazeBackend
        Start-Sleep -Seconds 3
        net start PanelWazeFrontend 2>$null
        Start-Sleep -Seconds 2
        Start-Nginx

        Write-Host ""
        Write-Host "Actualizacion completada." -ForegroundColor Green
    }
}
