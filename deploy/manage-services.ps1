#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Gestión de servicios del Panel Waze

.USAGE
    .\manage-services.ps1 -Action start|stop|restart|status|logs
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("start", "stop", "restart", "status", "logs", "update")]
    [string]$Action,

    [string]$InstallDir = "C:\PanelWaze"
)

$services = @("PanelWazeBackend", "PanelWazeNginx")

switch ($Action) {
    "start" {
        foreach ($svc in $services) {
            Write-Host "Iniciando $svc..." -ForegroundColor Yellow
            nssm start $svc
        }
        Write-Host "Servicios iniciados." -ForegroundColor Green
    }

    "stop" {
        foreach ($svc in $services) {
            Write-Host "Deteniendo $svc..." -ForegroundColor Yellow
            nssm stop $svc
        }
        Write-Host "Servicios detenidos." -ForegroundColor Green
    }

    "restart" {
        foreach ($svc in $services) {
            Write-Host "Reiniciando $svc..." -ForegroundColor Yellow
            nssm restart $svc
        }
        Write-Host "Servicios reiniciados." -ForegroundColor Green
    }

    "status" {
        Write-Host ""
        Write-Host "Estado de servicios:" -ForegroundColor Cyan
        foreach ($svc in $services) {
            $state = nssm status $svc 2>$null
            $color = if ($state -match "Running") { "Green" } else { "Red" }
            Write-Host "  $svc : $state" -ForegroundColor $color
        }

        Write-Host ""
        Write-Host "Health check backend:" -ForegroundColor Cyan
        try {
            $health = Invoke-RestMethod -Uri "http://localhost:3002/health" -TimeoutSec 5
            Write-Host "  Status: OK" -ForegroundColor Green
            Write-Host "  $($health | ConvertTo-Json -Compress)" -ForegroundColor Gray
        } catch {
            Write-Host "  Status: NO RESPONDE" -ForegroundColor Red
        }
        Write-Host ""
    }

    "logs" {
        Write-Host "Ultimas 50 lineas del log del backend:" -ForegroundColor Cyan
        Write-Host ""
        if (Test-Path "$InstallDir\logs\backend-stderr.log") {
            Get-Content "$InstallDir\logs\backend-stderr.log" -Tail 50
        } else {
            Write-Host "  No hay logs aun." -ForegroundColor Yellow
        }
    }

    "update" {
        Write-Host "Actualizando Panel Waze..." -ForegroundColor Yellow

        # Detener servicios
        foreach ($svc in $services) { nssm stop $svc 2>$null }

        Push-Location $InstallDir

        # Pull cambios
        Write-Host "  git pull..."
        git pull

        # Reinstalar dependencias
        Write-Host "  npm ci..."
        npm ci --include=dev 2>&1 | Out-Null

        # Rebuild
        Write-Host "  Compilando types..."
        Push-Location "$InstallDir\packages\types"
        npm run build
        Pop-Location

        Write-Host "  Compilando backend..."
        Push-Location "$InstallDir\apps\backend"
        npm run build
        Pop-Location

        Write-Host "  Compilando frontend..."
        Push-Location "$InstallDir\apps\frontend"
        npm run build
        Pop-Location

        Pop-Location

        # Reiniciar servicios
        foreach ($svc in $services) { nssm start $svc }

        Write-Host ""
        Write-Host "Actualizacion completada." -ForegroundColor Green
    }
}
