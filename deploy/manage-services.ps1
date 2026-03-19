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

    [string]$InstallDir = "C:\PanelWaze"
)

$nginxDir = (Get-ChildItem "C:\tools\nginx*" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1).FullName

function Start-Nginx {
    if (-not $nginxDir) { Write-Host "  nginx no encontrado" -ForegroundColor Red; return }
    Stop-Process -Name nginx -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Start-Process -FilePath "$nginxDir\nginx.exe" -WorkingDirectory $nginxDir
    Start-Sleep -Seconds 1
    $count = (Get-Process nginx -ErrorAction SilentlyContinue).Count
    Write-Host "  nginx: $count procesos activos" -ForegroundColor Green
}

function Stop-Nginx {
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

        $nginxCount = (Get-Process nginx -ErrorAction SilentlyContinue).Count
        $nColor = if ($nginxCount -gt 0) { "Green" } else { "Red" }
        Write-Host "  nginx: $nginxCount procesos" -ForegroundColor $nColor

        Write-Host ""
        Write-Host "Health check:" -ForegroundColor Cyan
        try {
            $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 5
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

        nssm stop PanelWazeBackend 2>$null
        Stop-Nginx

        Push-Location $InstallDir

        Write-Host "  git pull..."
        cmd /c "git pull 2>&1"

        Write-Host "  npm ci..."
        cmd /c "npm ci --include=dev 2>&1" | Out-Null

        Write-Host "  Compilando types..."
        Push-Location "$InstallDir\packages\types"
        cmd /c "npm run build 2>&1"
        Pop-Location

        Write-Host "  Compilando backend..."
        Push-Location "$InstallDir\apps\backend"
        cmd /c "npm run build 2>&1"
        Pop-Location

        Write-Host "  Compilando frontend..."
        Push-Location "$InstallDir\apps\frontend"
        cmd /c "npm run build 2>&1"
        Pop-Location

        Pop-Location

        nssm start PanelWazeBackend
        Start-Sleep -Seconds 3
        Start-Nginx

        Write-Host ""
        Write-Host "Actualizacion completada." -ForegroundColor Green
    }
}
