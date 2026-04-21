#Requires -RunAsAdministrator
# =============================================================
# docker-install.ps1
# Paso 1/2: Habilita los features de Windows necesarios para
# Docker Desktop (WSL2 + Containers + VirtualMachinePlatform),
# descarga el instalador y reinicia el servidor.
#
# EJECUTAR DESDE PowerShell elevado (Ejecutar como administrador)
# Uso:
#   .\scripts\docker-install.ps1
#
# Después del reboot, ejecutar:
#   .\scripts\docker-post-install.ps1
# =============================================================

$ErrorActionPreference = "Stop"
$ProgressPreference    = "SilentlyContinue"

$CYAN  = "`e[36m"; $GREEN = "`e[32m"; $YELLOW = "`e[33m"
$RED   = "`e[31m"; $BOLD  = "`e[1m";  $RST    = "`e[0m"

function info  { Write-Host "${CYAN}[INFO]${RST}  $args" }
function ok    { Write-Host "${GREEN}[OK]${RST}    $args" }
function warn  { Write-Host "${YELLOW}[WARN]${RST}  $args" }
function err   { Write-Host "${RED}[ERROR]${RST} $args" }
function hdr   { Write-Host "`n${BOLD}${CYAN}=== $args ===${RST}" }

hdr "Panel Waze - Instalación de Docker (Paso 1/2)"

# ----------------------------------------------------------
# 1. Verificar que se ejecuta como admin
# ----------------------------------------------------------
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
    ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { err "Ejecutar como Administrador"; exit 1 }
ok "Ejecutando como Administrador"

# ----------------------------------------------------------
# 2. Habilitar features de Windows
# ----------------------------------------------------------
hdr "Habilitando features de Windows"

$features = @(
    "VirtualMachinePlatform",              # Requerido por WSL2 y Docker
    "Microsoft-Windows-Subsystem-Linux",   # WSL2
    "Containers",                          # Docker engine support
    "HypervisorPlatform"                   # Para WSL2 lightweight VM
)

$needsReboot = $false
foreach ($f in $features) {
    $state = (Get-WindowsOptionalFeature -Online -FeatureName $f -ErrorAction SilentlyContinue).State
    if ($state -eq "Enabled") {
        ok "$f ya estaba habilitado"
    } else {
        info "Habilitando $f ..."
        $result = Enable-WindowsOptionalFeature -Online -FeatureName $f -NoRestart -All
        if ($result.RestartNeeded) { $needsReboot = $true }
        ok "$f habilitado"
    }
}

# ----------------------------------------------------------
# 3. Descargar Docker Desktop Installer
# ----------------------------------------------------------
hdr "Descargando Docker Desktop"

$dockerInstaller = "C:\tmp\DockerDesktopInstaller.exe"
New-Item -ItemType Directory -Force "C:\tmp" | Out-Null

if (Test-Path $dockerInstaller) {
    ok "Instalador ya descargado: $dockerInstaller"
} else {
    info "Descargando Docker Desktop (puede tardar varios minutos)..."
    $url = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
    try {
        Invoke-WebRequest -Uri $url -OutFile $dockerInstaller -UseBasicParsing
        ok "Descargado: $dockerInstaller ($([Math]::Round((Get-Item $dockerInstaller).Length/1MB,1)) MB)"
    } catch {
        err "No se pudo descargar Docker Desktop: $_"
        warn "Descárgalo manualmente desde https://www.docker.com/products/docker-desktop/"
        warn "Guárdalo en: $dockerInstaller"
    }
}

# ----------------------------------------------------------
# 4. Crear tarea programada para ejecutar paso 2 tras el reboot
# ----------------------------------------------------------
hdr "Creando tarea programada post-reboot"

$projectPath = "D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados"
$step2Script = Join-Path $projectPath "scripts\docker-post-install.ps1"

$taskAction = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$step2Script`""

$taskTrigger = New-ScheduledTaskTrigger -AtStartup

$taskSettings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
    -RestartCount 0

$taskPrincipal = New-ScheduledTaskPrincipal `
    -UserId "SYSTEM" `
    -LogonType ServiceAccount `
    -RunLevel Highest

Register-ScheduledTask `
    -TaskName "PanelWaze-DockerPostInstall" `
    -Action $taskAction `
    -Trigger $taskTrigger `
    -Settings $taskSettings `
    -Principal $taskPrincipal `
    -Force | Out-Null

ok "Tarea 'PanelWaze-DockerPostInstall' registrada (se ejecutará al iniciar)"

# ----------------------------------------------------------
# 5. Reboot
# ----------------------------------------------------------
hdr "Preparando reinicio"
warn "El servidor se reiniciará en 30 segundos."
warn "Después del reinicio, el script docker-post-install.ps1"
warn "se ejecutará automáticamente para instalar Docker."
Write-Host ""
info "Presiona Ctrl+C para cancelar el reinicio."

Start-Sleep -Seconds 30
Restart-Computer -Force
