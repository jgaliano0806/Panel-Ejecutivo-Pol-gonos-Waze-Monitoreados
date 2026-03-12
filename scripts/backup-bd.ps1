# ============================================================
# Backup diario de la base de datos panel_waze
# Configurar como Tarea Programada en Windows:
#   Acción: powershell.exe -ExecutionPolicy Bypass -File "D:\Aplicaciones CASISA\...\scripts\backup-bd.ps1"
#   Desencadenador: Diario, ej. 03:00 AM
# ============================================================

$PG_BIN    = "D:\postgreSQL\bin"
$DB_NAME   = "panel_waze"
$DB_USER   = "postgres"
$DB_HOST   = "localhost"
$DB_PORT   = "5432"
$BACKUP_DIR = "D:\Backups\panel_waze"
$KEEP_DAYS  = 30  # Días a conservar

# Leer password desde .env
$ENV_FILE = "D:\Aplicaciones CASISA\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados\apps\backend\.env"
$DB_PASSWORD = "CASISA"
if (Test-Path $ENV_FILE) {
    $line = Get-Content $ENV_FILE | Where-Object { $_ -match "^DB_PASSWORD=" }
    if ($line) { $DB_PASSWORD = $line -replace "^DB_PASSWORD=", "" }
}

# Crear directorio de backups
New-Item -ItemType Directory -Force -Path $BACKUP_DIR | Out-Null

# Nombre del archivo
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outFile   = "$BACKUP_DIR\panel_waze_$timestamp.dump"

# Ejecutar pg_dump
$env:PATH      = "$PG_BIN;$env:PATH"
$env:PGPASSWORD = $DB_PASSWORD

Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Iniciando backup -> $outFile"
& "$PG_BIN\pg_dump.exe" -U $DB_USER -h $DB_HOST -p $DB_PORT -Fc $DB_NAME -f $outFile

if ($LASTEXITCODE -eq 0) {
    $size = (Get-Item $outFile).Length / 1MB
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] OK - $([math]::Round($size,2)) MB"
} else {
    Write-Error "pg_dump falló con código $LASTEXITCODE"
    exit 1
}

# Eliminar backups antiguos
$old = Get-ChildItem "$BACKUP_DIR\panel_waze_*.dump" |
       Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$KEEP_DAYS) }
if ($old) {
    $old | Remove-Item -Force
    Write-Host "Eliminados $($old.Count) backups anteriores a $KEEP_DAYS días"
}

$env:PGPASSWORD = ""
