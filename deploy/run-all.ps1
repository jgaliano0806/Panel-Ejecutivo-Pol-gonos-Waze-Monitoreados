#Requires -RunAsAdministrator
$ErrorActionPreference = "Continue"
Write-Host "Deteniendo procesos previos para liberar archivos..." -ForegroundColor Yellow
Stop-Process -Name node -Force -ErrorAction SilentlyContinue

Write-Host "Corrigiendo configuración de Vite..." -ForegroundColor Yellow
$path = "d:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados\apps\frontend\vite.config.ts"
if (Test-Path $path) {
    (Get-Content -Path $path) -replace "BACKEND_PORT = 3001", "BACKEND_PORT = 3002" | Set-Content -Path $path
}

Write-Host "Iniciando despliegue de Producción..." -ForegroundColor Cyan
Set-Location -Path "d:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados\deploy"
.\deploy-server.ps1

Write-Host "`nEl entorno de producción se ha configurado de forma exitosa." -ForegroundColor Green
Read-Host "Presiona Enter para cerrar esta consola..."
