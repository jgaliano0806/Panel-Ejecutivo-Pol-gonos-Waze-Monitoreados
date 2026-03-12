# ============================================================
# REQUIERE POWERSHELL COMO ADMINISTRADOR
# Reconfigura el servicio PanelWazeBackend para apuntar a la
# nueva ruta del proyecto.
# ============================================================
#Requires -RunAsAdministrator

$PROJECT = "D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados"
$BACKEND  = "$PROJECT\apps\backend"
$NODE     = "C:\Program Files\nodejs\node.exe"
$NSSM     = "C:\ProgramData\chocolatey\lib\NSSM\tools\nssm.exe"
$SERVICE  = "PanelWazeBackend"
$LOGS     = "$PROJECT\logs"

Write-Host ""
Write-Host "============================================="
Write-Host "  Reconfigurando servicio: $SERVICE"
Write-Host "============================================="
Write-Host ""

# Verificar prerrequisitos
if (-not (Test-Path $NSSM))        { Write-Error "NSSM no encontrado en $NSSM"; exit 1 }
if (-not (Test-Path $NODE))        { Write-Error "Node.exe no encontrado en $NODE"; exit 1 }
if (-not (Test-Path "$BACKEND\dist\server.js")) {
    Write-Error "dist\server.js no encontrado. Ejecutar primero: npm run build --workspace=apps/backend"
    exit 1
}
if (-not (Test-Path "$BACKEND\.env")) {
    Write-Error ".env no encontrado en $BACKEND. Crear desde .env.example"
    exit 1
}

# Crear directorio de logs si no existe
New-Item -ItemType Directory -Force -Path $LOGS | Out-Null

# Detener servicio si está corriendo
$status = & $NSSM status $SERVICE 2>$null
Write-Host "Estado actual: $status"
if ($status -eq "SERVICE_RUNNING") {
    Write-Host "Deteniendo $SERVICE..."
    & $NSSM stop $SERVICE
    Start-Sleep -Seconds 3
}

# Reconfigurar parámetros del servicio
Write-Host "Actualizando configuración NSSM..."

& $NSSM set $SERVICE Application        $NODE
& $NSSM set $SERVICE AppParameters      "dist\server.js"
& $NSSM set $SERVICE AppDirectory       $BACKEND
& $NSSM set $SERVICE AppEnvironmentExtra "NODE_ENV=production" "PORT=3002"
& $NSSM set $SERVICE AppStdout          "$LOGS\backend-stdout.log"
& $NSSM set $SERVICE AppStderr          "$LOGS\backend-stderr.log"
& $NSSM set $SERVICE AppRotateFiles     1
& $NSSM set $SERVICE AppRotateBytes     10485760
& $NSSM set $SERVICE Start              SERVICE_AUTO_START
& $NSSM set $SERVICE AppRestartDelay    5000

# Iniciar el servicio
Write-Host "Iniciando $SERVICE..."
& $NSSM start $SERVICE
Start-Sleep -Seconds 5

$status = & $NSSM status $SERVICE 2>$null
Write-Host ""
Write-Host "Estado final: $status"

# Verificar health
Write-Host ""
Write-Host "Verificando health endpoint..."
Start-Sleep -Seconds 8
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3002/health" -UseBasicParsing -TimeoutSec 10 -ErrorAction SilentlyContinue
    Write-Host "HTTP $($response.StatusCode): $($response.Content)"
} catch {
    $body = $_.ErrorDetails.Message
    if ($body) { Write-Host "Health response: $body" }
    else       { Write-Host "No se pudo conectar al health endpoint. Ver logs en: $LOGS" }
}

Write-Host ""
Write-Host "============================================="
Write-Host "  Logs: $LOGS"
Write-Host "  Frontend: http://10.1.0.136:5180"
Write-Host "  Backend:  http://10.1.0.136:3002/health"
Write-Host "============================================="
