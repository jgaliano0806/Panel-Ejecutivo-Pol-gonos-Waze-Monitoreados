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

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%.."
set "ROOT=%CD%"
popd

:: Detectar IP de red local
set "LOCAL_IP=localhost"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4"') do (
    set "temp=%%a"
    set "temp=!temp: =!"
    if "!LOCAL_IP!"=="localhost" (
        echo !temp! | findstr /C:"192.168" >nul 2>&1
        if !ERRORLEVEL! EQU 0 set "LOCAL_IP=!temp!"
    )
)

echo [0/5] Limpiando servicios existentes...

echo    Verificando puerto 3002 (Backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3002" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo    Verificando puerto 5180 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5180" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 2 /nobreak >nul
echo.

echo [1/5] Verificando Servicios...
where docker >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    Docker detectado. Iniciando entorno dev...
    cd /d "%ROOT%"
    call docker-compose --profile dev up -d
) else (
    echo    Docker no encontrado. Se asume servicios locales.
)
echo.

echo [2/5] Configurando Backend...
cd /d "%ROOT%\apps\backend"
if not exist ".env" (
    echo    Creando .env del backend...
    (
    echo # Configuracion de PostgreSQL
    echo DB_HOST=localhost
    echo DB_PORT=5432
    echo DB_NAME=panel_waze
    echo DB_USER=postgres
    echo DB_PASSWORD=CASISA
    echo.
    echo # Configuracion del servidor
    echo NODE_ENV=development
    echo PORT=3002
    echo REDIS_HOST=localhost
    echo REDIS_PORT=6379
    echo.
    echo # Configuracion de Clima
    echo WEATHER_PROVIDER=openmeteo
    ) > .env
    echo    OK: Archivo .env del backend creado
) else (
    echo    OK: Archivo .env del backend ya existe
)
echo.

echo [3/5] Configurando Frontend...
cd /d "%ROOT%\apps\frontend"
if not exist ".env" (
    echo    Creando .env del frontend...
    (
    echo # Backend API URL - usa ruta relativa para red local
    echo # Vite proxea /api hacia http://127.0.0.1:3002/api
    echo # Vite proxea /socket.io hacia http://127.0.0.1:3002/socket.io
    echo VITE_API_URL=/api
    ) > .env
    echo    OK: Archivo .env del frontend creado
) else (
    echo    OK: Archivo .env del frontend ya existe
)
echo.

echo [4/5] Iniciando Backend...
start "Backend Panel Waze" /D "%ROOT%" cmd /k "npm run dev:backend"
echo    Backend iniciado.
timeout /t 5 /nobreak >nul
echo.

echo [5/5] Iniciando Frontend...
start "Frontend Panel Waze" /D "%ROOT%" cmd /k "npm run dev"
echo    Frontend iniciado.
echo.

echo ===============================================
echo   LISTO
echo ===============================================
echo.
echo   Frontend (local):    http://localhost:5180
echo   Frontend (red):      http://!LOCAL_IP!:5180
echo   Backend:             http://localhost:3002
echo   API:                 http://localhost:3002/api
echo.
echo   Acceso desde celular/videowall:
echo   http://!LOCAL_IP!:5180
echo.
echo ===============================================
pause
endlocal
