$ErrorActionPreference = "Stop"

Write-Host "Descargando Redis para Windows Server..."
$url = "https://github.com/microsoftarchive/redis/releases/download/win-3.2.100/Redis-x64-3.2.100.msi"
$output = "$env:TEMP\Redis-x64-3.2.100.msi"
Invoke-WebRequest -Uri $url -OutFile $output

Write-Host "Instalando Redis como Servicio de Windows (Silencioso)..."
Start-Process -FilePath "msiexec.exe" -ArgumentList "/i `"$output`" /qn /norestart" -Wait -NoNewWindow

Write-Host "Iniciando servicio Redis..."
Start-Service redis -ErrorAction SilentlyContinue

Write-Host "Reiniciando PanelWazeBackend para que conecte a Redis..."
nssm restart PanelWazeBackend

Write-Host "¡Instalación Completada!"
Start-Sleep -Seconds 3
