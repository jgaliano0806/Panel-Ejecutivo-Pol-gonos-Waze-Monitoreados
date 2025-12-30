@echo off
chcp 65001 >nul
title Panel Waze - Iniciador Completo
setlocal enabledelayedexpansion

echo.
echo ===============================================
echo   PANEL EJECUTIVO - WAZE MONITOREADOS
echo   Iniciador Completo
echo ===============================================
echo.

:: Obtener directorio actual
set "ROOT=%~dp0"
:: Remover backslash final si existe
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo [0/4] Limpiando servicios existentes...

:: Funcion KillPort in-line para evitar problemas de saltos
echo    Verificando puerto 3001 (Backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo    Verificando puerto 5173 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 2 /nobreak >nul
echo.

echo [1/4] Verificando Servicios...
where docker >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    Docker detectado. Iniciando entorno dev...
    cd /d "%ROOT%"
    call docker-compose --profile dev up -d
) else (
    echo    Docker no encontrado. Se asume servicios locales.
)
echo.

echo [2/4] Configurando Backend...
cd /d "%ROOT%\apps\backend"
if not exist ".env" (
    echo    Creando .env basico...
    (
    echo PORT=3001
    echo NODE_ENV=development
    echo DB_HOST=localhost
    echo DB_PORT=5432
    echo DB_NAME=panel_waze
    echo DB_USER=postgres
    echo DB_PASSWORD=CASISA
    echo REDIS_HOST=localhost
    echo REDIS_PORT=6379
    ) > .env
)
echo.

echo [3/4] Iniciando Backend...
start "Backend Panel Waze" /D "%ROOT%" cmd /k "npm run dev:backend"
echo    Backend iniciado.
timeout /t 5 /nobreak >nul
echo.

echo [4/4] Iniciando Frontend...
start "Frontend Panel Waze" /D "%ROOT%" cmd /k "npm run dev"
echo    Frontend iniciado.
echo.

echo ===============================================
echo   LISTO
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3001
echo ===============================================
pause
endlocal
