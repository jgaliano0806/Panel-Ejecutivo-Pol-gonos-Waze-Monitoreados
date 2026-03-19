#Requires -RunAsAdministrator
$ErrorActionPreference = "Continue"

Write-Host "Deteniendo procesos de NGINX..." -ForegroundColor Yellow
Stop-Process -Name nginx -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host "Limpiando BOM encoding de nginx.conf..." -ForegroundColor Yellow
$path = "C:\tools\nginx-1.29.6\conf\nginx.conf"
if (Test-Path $path) {
    $content = Get-Content $path -Raw
    $utf8NoBom = New-Object System.Text.UTF8Encoding($False)
    [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
}

Write-Host "Iniciando NGINX..." -ForegroundColor Cyan
$nginxDir = "C:\tools\nginx-1.29.6"
Start-Process -FilePath "$nginxDir\nginx.exe" -WorkingDirectory $nginxDir

Write-Host "`nEl servicio Web se ha corregido y reiniciado exitosamente." -ForegroundColor Green
Read-Host "Presiona Enter para cerrar esta consola..."
