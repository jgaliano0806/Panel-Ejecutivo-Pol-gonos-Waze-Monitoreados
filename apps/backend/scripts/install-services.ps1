# =============================================================================
# Instalación de servicios Windows para Panel Waze
# Ejecutar como Administrador
# =============================================================================

param(
    [string]$Action = "install",  # install | uninstall | status
    [string]$BackendPath = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"

# Configuración
$PM2_NAME_API = "panel-waze-api"
$PM2_NAME_WORKER = "panel-waze-worker"
$TASK_NAME_RETENTION = "PanelWaze-RetentionCleanup"

function Write-Step { param($msg) Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-Ok { param($msg) Write-Host "   [OK] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "   [!] $msg" -ForegroundColor Yellow }

# -----------------------------------------------------------------------------
# Verificar PM2
# -----------------------------------------------------------------------------
function Ensure-PM2 {
    if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
        Write-Step "Instalando PM2 globalmente..."
        npm install -g pm2
        npm install -g pm2-windows-startup
    }
    Write-Ok "PM2 disponible"
}

# -----------------------------------------------------------------------------
# Instalar servicios
# -----------------------------------------------------------------------------
function Install-Services {
    Write-Step "Instalando servicios Panel Waze..."

    Set-Location $BackendPath

    # 1. API con polling desactivado
    Write-Step "Configurando API (sin polling Waze)..."
    $env:DISABLE_WAZE_POLLING = "true"
    pm2 delete $PM2_NAME_API 2>&1 | Out-Null
    pm2 start dist/server.js --name $PM2_NAME_API
    Write-Ok "API iniciada como $PM2_NAME_API"

    # 2. Worker Waze separado
    Write-Step "Configurando Worker Waze..."
    pm2 delete $PM2_NAME_WORKER 2>&1 | Out-Null
    pm2 start dist/workers/wazeWorker.js --name $PM2_NAME_WORKER
    Write-Ok "Worker iniciado como $PM2_NAME_WORKER"

    # 3. Guardar configuración PM2
    pm2 save
    Write-Ok "Configuración PM2 guardada"

    # 4. Configurar inicio automático con Windows
    Write-Step "Configurando inicio automático..."
    pm2-startup install
    Write-Ok "PM2 configurado para iniciar con Windows"

    # 5. Tarea programada para retention cleanup (3:00 AM diario)
    Write-Step "Configurando limpieza de retención diaria..."
    Install-RetentionTask
}

# -----------------------------------------------------------------------------
# Tarea programada de retención
# -----------------------------------------------------------------------------
function Install-RetentionTask {
    $taskExists = Get-ScheduledTask -TaskName $TASK_NAME_RETENTION -ErrorAction SilentlyContinue

    if ($taskExists) {
        Unregister-ScheduledTask -TaskName $TASK_NAME_RETENTION -Confirm:$false
    }

    $scriptPath = Join-Path $BackendPath "scripts\run-retention.ps1"

    # Crear script de retención
    $retentionScript = @"
# Ejecuta limpieza de retención en PostgreSQL
`$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
Set-Location "$BackendPath"

# Cargar variables de entorno
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if (`$_ -match "^([^#][^=]+)=(.*)$") {
            [System.Environment]::SetEnvironmentVariable(`$matches[1], `$matches[2], "Process")
        }
    }
}

# Ejecutar limpieza
`$connStr = "host=`$env:DB_HOST port=`$env:DB_PORT dbname=`$env:DB_NAME user=`$env:DB_USER password=`$env:DB_PASSWORD"
psql "`$connStr" -c "SELECT * FROM run_retention_cleanup();" >> logs\retention.log 2>&1
"@

    Set-Content -Path $scriptPath -Value $retentionScript -Encoding UTF8

    # Crear tarea programada
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"$scriptPath`""
    $trigger = New-ScheduledTaskTrigger -Daily -At "03:00AM"
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd
    $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

    Register-ScheduledTask -TaskName $TASK_NAME_RETENTION -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "Limpieza de datos antiguos Panel Waze (polygon_snapshots, tvt_metrics, notifications)"

    Write-Ok "Tarea '$TASK_NAME_RETENTION' programada para las 3:00 AM diariamente"
}

# -----------------------------------------------------------------------------
# Desinstalar servicios
# -----------------------------------------------------------------------------
function Uninstall-Services {
    Write-Step "Desinstalando servicios Panel Waze..."

    pm2 delete $PM2_NAME_API 2>&1 | Out-Null
    pm2 delete $PM2_NAME_WORKER 2>&1 | Out-Null
    pm2 save

    $taskExists = Get-ScheduledTask -TaskName $TASK_NAME_RETENTION -ErrorAction SilentlyContinue
    if ($taskExists) {
        Unregister-ScheduledTask -TaskName $TASK_NAME_RETENTION -Confirm:$false
        Write-Ok "Tarea programada eliminada"
    }

    Write-Ok "Servicios desinstalados"
}

# -----------------------------------------------------------------------------
# Estado de servicios
# -----------------------------------------------------------------------------
function Show-Status {
    Write-Step "Estado de servicios Panel Waze"
    
    Write-Host "`nPM2 Processes:" -ForegroundColor Yellow
    pm2 list

    Write-Host "`nTarea Programada:" -ForegroundColor Yellow
    $task = Get-ScheduledTask -TaskName $TASK_NAME_RETENTION -ErrorAction SilentlyContinue
    if ($task) {
        $info = Get-ScheduledTaskInfo -TaskName $TASK_NAME_RETENTION
        Write-Host "  $TASK_NAME_RETENTION"
        Write-Host "    Estado: $($task.State)"
        Write-Host "    Última ejecución: $($info.LastRunTime)"
        Write-Host "    Próxima ejecución: $($info.NextRunTime)"
    } else {
        Write-Warn "Tarea de retención no instalada"
    }
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------
Ensure-PM2

switch ($Action.ToLower()) {
    "install"   { Install-Services }
    "uninstall" { Uninstall-Services }
    "status"    { Show-Status }
    default     { Write-Host "Uso: .\install-services.ps1 -Action [install|uninstall|status]" }
}
