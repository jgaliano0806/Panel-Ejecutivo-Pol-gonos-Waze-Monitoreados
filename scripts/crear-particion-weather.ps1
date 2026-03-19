# Crear partición de polygon_weather_data para marzo 2026
# Ejecutar desde la raíz del proyecto: .\scripts\crear-particion-weather.ps1
$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$sqlPath = Join-Path $projectRoot "apps\backend\src\database\migrations\041_create_weather_partitions.sql"
$env:PGPASSWORD = "CASISA"
& "D:\postgreSQL\bin\psql.exe" -U postgres -h localhost -p 5432 -d panel_waze -f $sqlPath
Write-Host "Particiones creadas."
