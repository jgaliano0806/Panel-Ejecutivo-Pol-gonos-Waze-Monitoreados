#Requires -RunAsAdministrator
$ErrorActionPreference = "Continue"

Write-Host "Deteniendo procesos de NGINX..." -ForegroundColor Yellow
Stop-Process -Name nginx -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host "Agregando comillas a la ruta root en nginx.conf..." -ForegroundColor Yellow
$path = "C:\tools\nginx-1.29.6\conf\nginx.conf"
if (Test-Path $path) {
    (Get-Content $path) -replace 'root D:/Aplicaciones CASISA/Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados/apps/frontend/dist;', 'root "D:/Aplicaciones CASISA/Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados/apps/frontend/dist";' | Set-Content -Path $path
}

Write-Host "Iniciando NGINX..." -ForegroundColor Cyan
$nginxDir = "C:\tools\nginx-1.29.6"
Start-Process -FilePath "$nginxDir\nginx.exe" -WorkingDirectory $nginxDir

Write-Host "`nEl archivo de configuracion se ha reparado." -ForegroundColor Green
Read-Host "Presiona Enter para cerrar esta consola..."
