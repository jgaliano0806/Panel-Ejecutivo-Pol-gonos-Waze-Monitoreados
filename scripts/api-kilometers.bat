@echo off
REM ============================================================
REM API Kilómetros - Consulta hitos kilométricos (activos)
REM GET /api/kilometers es público - no requiere autenticación
REM ============================================================

set "API_URL=http://10.1.0.136:3002/api"
set "PARAMS=active=true"

REM Parámetros opcionales: api-kilometers.bat [params]
REM Ej: api-kilometers.bat "active=true&group_id=1"
if not "%~1"=="" set "PARAMS=%~1"

curl -s -X GET "%API_URL%/kilometers?%PARAMS%" -H "Accept: application/json"
echo.
