$ErrorActionPreference = "Stop"

Write-Host "Configurando auto-inicio de PanelWazeNginx..."

# Detener los Nginx manuales que arrancamos temporalmente sin el servicio
Get-Process nginx -ErrorAction SilentlyContinue | Stop-Process -Force

# Configurar el servicio PanelWazeNginx a Automatico
Set-Service -Name "PanelWazeNginx" -StartupType Automatic

# Iniciar Nginx oficial, pero antes verificar backend y pg
Start-Service "PanelWazeNginx" -ErrorAction SilentlyContinue

# Asegurarse de que postgresql esté corriendo (figura Stopped a veces por demora)
Start-Service "postgresql-x64-16" -ErrorAction SilentlyContinue

Write-Host "Verificando estados finales..."
Get-Service -Name PanelWazeBackend, PanelWazeNginx, redis, postgresql-x64-16 | Select-Object Name, StartType, Status

Write-Host "¡Todo en Automatico!"
Start-Sleep -Seconds 4
