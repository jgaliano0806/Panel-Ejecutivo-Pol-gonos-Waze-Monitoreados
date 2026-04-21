#Requires -RunAsAdministrator
# =============================================================
# docker-post-install.ps1
# Paso 2/2: Se ejecuta automáticamente después del reboot.
# Instala Docker Desktop, configura WSL2 Ubuntu y verifica
# que Docker funcione correctamente.
#
# También puede ejecutarse manualmente si la tarea programada
# no se disparó:
#   .\scripts\docker-post-install.ps1
# =============================================================

$ErrorActionPreference = "Stop"
$ProgressPreference    = "SilentlyContinue"

$LOG = "C:\tmp\docker-post-install.log"
Start-Transcript -Path $LOG -Append

function info { Write-Host "[INFO]  $args" }
function ok   { Write-Host "[OK]    $args" }
function warn { Write-Host "[WARN]  $args" }
function err  { Write-Host "[ERROR] $args" }
function hdr  { Write-Host "`n=== $args ===" }

hdr "Panel Waze - Post-Install Docker (Paso 2/2)"

$dockerInstaller = "C:\tmp\DockerDesktopInstaller.exe"

# ----------------------------------------------------------
# 1. Configurar WSL2 como versión por defecto
# ----------------------------------------------------------
hdr "Configurando WSL2"
try {
    wsl --set-default-version 2 2>&1
    ok "WSL2 configurado como versión por defecto"
} catch {
    warn "wsl --set-default-version falló: $_"
}

# ----------------------------------------------------------
# 2. Instalar Ubuntu 22.04 en WSL2 (para el backend de Docker)
# ----------------------------------------------------------
hdr "Instalando Ubuntu 22.04 en WSL2"
$wslDistros = wsl --list --quiet 2>&1
if ($wslDistros -match "Ubuntu") {
    ok "Ubuntu ya instalado en WSL2"
} else {
    info "Instalando Ubuntu-22.04 (descarga ~500MB, puede tardar)..."
    wsl --install -d Ubuntu-22.04 --no-launch 2>&1
    ok "Ubuntu-22.04 instalado"
}

# ----------------------------------------------------------
# 3. Instalar Docker Desktop
# ----------------------------------------------------------
hdr "Instalando Docker Desktop"

if (Get-Command docker -ErrorAction SilentlyContinue) {
    $v = docker version --format '{{.Server.Version}}' 2>&1
    ok "Docker ya instalado: v$v"
} elseif (Test-Path $dockerInstaller) {
    info "Ejecutando Docker Desktop Installer (modo silencioso)..."
    $proc = Start-Process $dockerInstaller `
        -ArgumentList "install --quiet --accept-license --backend=wsl-2" `
        -Wait -PassThru
    if ($proc.ExitCode -eq 0) {
        ok "Docker Desktop instalado exitosamente"
    } else {
        err "Docker Desktop installer terminó con código $($proc.ExitCode)"
        err "Revisa el log de instalación de Docker Desktop"
        Stop-Transcript; exit 1
    }
} else {
    err "Instalador no encontrado en $dockerInstaller"
    err "Descárgalo manualmente: https://www.docker.com/products/docker-desktop/"
    Stop-Transcript; exit 1
}

# ----------------------------------------------------------
# 4. Esperar a que el servicio Docker arranque
# ----------------------------------------------------------
hdr "Esperando que Docker Engine arranque"

$maxWait = 120; $waited = 0; $dockerOk = $false
while ($waited -lt $maxWait) {
    try {
        docker info | Out-Null
        $dockerOk = $true
        break
    } catch {
        Start-Sleep -Seconds 5
        $waited += 5
        info "Esperando Docker... ($waited/$maxWait s)"
    }
}

if (-not $dockerOk) {
    err "Docker no arrancó en $maxWait segundos"
    warn "Inicia Docker Desktop manualmente y ejecuta este script de nuevo"
    Stop-Transcript; exit 1
}

ok "Docker Engine activo"
docker version --format "  Client: {{.Client.Version}}  |  Server: {{.Server.Version}}"

# ----------------------------------------------------------
# 5. Configurar Docker para iniciar automáticamente
# ----------------------------------------------------------
hdr "Configurando inicio automático de Docker"
$dockerDesktopPath = "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe"
if (Test-Path $dockerDesktopPath) {
    $startupFolder = [Environment]::GetFolderPath("CommonStartup")
    $shortcut = Join-Path $startupFolder "Docker Desktop.lnk"
    if (-not (Test-Path $shortcut)) {
        $wsh = New-Object -ComObject WScript.Shell
        $lnk = $wsh.CreateShortcut($shortcut)
        $lnk.TargetPath = $dockerDesktopPath
        $lnk.Save()
        ok "Acceso directo creado en Inicio para todos los usuarios"
    } else {
        ok "Docker Desktop ya configurado en inicio automático"
    }
}

# ----------------------------------------------------------
# 6. Verificación final
# ----------------------------------------------------------
hdr "Verificación"
docker run --rm hello-world 2>&1 | Select-String "Hello from Docker"
ok "Docker funciona correctamente con contenedores Linux"

# ----------------------------------------------------------
# 7. Eliminar la tarea programada
# ----------------------------------------------------------
Unregister-ScheduledTask -TaskName "PanelWaze-DockerPostInstall" -Confirm:$false -ErrorAction SilentlyContinue
ok "Tarea programada eliminada"

hdr "Docker listo - Siguiente paso"
Write-Host ""
Write-Host "Ahora ejecuta el script de migración:"
Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\migrate-to-docker.ps1"
Write-Host ""

Stop-Transcript
