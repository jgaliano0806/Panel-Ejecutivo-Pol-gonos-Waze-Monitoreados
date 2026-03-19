@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title Panel Waze - Instalación completa NSSM

:: ============================================================
:: REQUIERE EJECUCIÓN COMO ADMINISTRADOR
:: ============================================================
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Solicitando permisos de administrador...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

title Panel Waze - Instalación NSSM [ADMINISTRADOR]

:: Rutas base (derivadas de la ubicación del script)
set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%.."
set "PROJECT=%CD%"
popd

set "BACKEND=%PROJECT%\apps\backend"
set "FRONTEND=%PROJECT%\apps\frontend"
set "LOGS=%PROJECT%\logs"
set "NODE=C:\Program Files\nodejs\node.exe"
set "NSSM=C:\ProgramData\chocolatey\lib\NSSM\tools\nssm.exe"

echo.
echo ===============================================
echo   INSTALACIÓN NSSM - Panel Ejecutivo Waze
echo ===============================================
echo.
echo   Proyecto: %PROJECT%
echo.

:: ============================================================
:: PASO 1: Verificar/Instalar NSSM
:: ============================================================
echo [1/5] Verificando NSSM...
if not exist "%NSSM%" (
    echo    NSSM no encontrado. Instalando via Chocolatey...
    where choco >nul 2>&1
    if !ERRORLEVEL! NEQ 0 (
        echo    ERROR: Chocolatey no instalado. Ejecute: Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        pause
        exit /b 1
    )
    choco install nssm -y --force
    if !ERRORLEVEL! NEQ 0 (
        echo    ERROR: No se pudo instalar NSSM
        pause
        exit /b 1
    )
    set "NSSM=C:\ProgramData\chocolatey\lib\NSSM\tools\nssm.exe"
) else (
    echo    OK: NSSM ya instalado
)
echo.

:: ============================================================
:: PASO 2: Verificar prerrequisitos
:: ============================================================
echo [2/5] Verificando prerrequisitos...
if not exist "%NODE%" (
    echo    ERROR: Node.js no encontrado en %NODE%
    pause
    exit /b 1
)
if not exist "%BACKEND%\dist\server.js" (
    echo    ERROR: Backend no compilado. Ejecute: npm run build --workspace=apps/backend
    pause
    exit /b 1
)
if not exist "%BACKEND%\.env" (
    echo    ERROR: .env no encontrado en apps\backend. Copie desde .env.example
    pause
    exit /b 1
)
if not exist "%FRONTEND%\dist\index.html" (
    echo    ERROR: Frontend no compilado. Ejecute: npm run build --workspace=apps/frontend
    pause
    exit /b 1
)

:: Verificar serve (para frontend estático)
set "SERVE_JS=%APPDATA%\npm\node_modules\serve\build\main.js"
if not exist "%SERVE_JS%" (
    echo    Instalando serve globalmente...
    npm install -g serve
)
echo    OK: Prerrequisitos verificados
echo.

:: Crear directorio de logs
if not exist "%LOGS%" mkdir "%LOGS%"

:: ============================================================
:: PASO 3: Instalar servicio PanelWazeBackend
:: ============================================================
echo [3/5] Instalando servicio PanelWazeBackend...
"%NSSM%" stop PanelWazeBackend 2>nul
"%NSSM%" remove PanelWazeBackend confirm 2>nul
timeout /t 2 /nobreak >nul

"%NSSM%" install PanelWazeBackend "%NODE%" "dist\server.js"
"%NSSM%" set PanelWazeBackend AppDirectory "%BACKEND%"
"%NSSM%" set PanelWazeBackend AppEnvironmentExtra "NODE_ENV=production" "PORT=3002"
"%NSSM%" set PanelWazeBackend AppStdout "%LOGS%\backend-stdout.log"
"%NSSM%" set PanelWazeBackend AppStderr "%LOGS%\backend-stderr.log"
"%NSSM%" set PanelWazeBackend AppRotateFiles 1
"%NSSM%" set PanelWazeBackend AppRotateBytes 10485760
"%NSSM%" set PanelWazeBackend AppRestartDelay 5000
"%NSSM%" set PanelWazeBackend Start SERVICE_AUTO_START
"%NSSM%" set PanelWazeBackend DisplayName "PanelWazeBackend"
"%NSSM%" set PanelWazeBackend Description "Panel Ejecutivo Waze - Backend API"
echo    OK: PanelWazeBackend instalado
echo.

:: ============================================================
:: PASO 4: Instalar servicio PanelWazeFrontend
:: ============================================================
echo [4/5] Instalando servicio PanelWazeFrontend...
"%NSSM%" stop PanelWazeFrontend 2>nul
"%NSSM%" remove PanelWazeFrontend confirm 2>nul
timeout /t 2 /nobreak >nul

"%NSSM%" install PanelWazeFrontend "%NODE%"
"%NSSM%" set PanelWazeFrontend AppParameters "%SERVE_JS% -s dist -l 5180"
"%NSSM%" set PanelWazeFrontend AppDirectory "%FRONTEND%"
"%NSSM%" set PanelWazeFrontend AppStdout "%LOGS%\frontend-stdout.log"
"%NSSM%" set PanelWazeFrontend AppStderr "%LOGS%\frontend-stderr.log"
"%NSSM%" set PanelWazeFrontend AppRotateFiles 1
"%NSSM%" set PanelWazeFrontend AppRotateBytes 10485760
"%NSSM%" set PanelWazeFrontend Start SERVICE_AUTO_START
"%NSSM%" set PanelWazeFrontend DisplayName "PanelWazeFrontend"
"%NSSM%" set PanelWazeFrontend Description "Panel Ejecutivo Waze - Frontend estatico"
echo    OK: PanelWazeFrontend instalado
echo.

:: ============================================================
:: PASO 5: Configurar Firewall
:: ============================================================
echo [5/5] Configurando Firewall...
netsh advfirewall firewall delete rule name="Panel Waze Backend - Puerto 3002" >nul 2>&1
netsh advfirewall firewall add rule name="Panel Waze Backend - Puerto 3002" dir=in action=allow protocol=TCP localport=3002 profile=any description="Panel Ejecutivo Waze - Backend API"
netsh advfirewall firewall delete rule name="Panel Waze Frontend - Puerto 5180" >nul 2>&1
netsh advfirewall firewall add rule name="Panel Waze Frontend - Puerto 5180" dir=in action=allow protocol=TCP localport=5180 profile=any description="Panel Ejecutivo Waze - Frontend estatico"
echo    OK: Puertos 3002 y 5180 habilitados en Firewall
echo.

:: ============================================================
:: Iniciar servicios
:: ============================================================
echo Iniciando servicios...
"%NSSM%" start PanelWazeBackend
timeout /t 3 /nobreak >nul
"%NSSM%" start PanelWazeFrontend
timeout /t 5 /nobreak >nul
echo.

:: ============================================================
:: Verificación
:: ============================================================
echo ===============================================
echo   INSTALACIÓN COMPLETADA
echo ===============================================
echo.
echo   Estado:
"%NSSM%" status PanelWazeBackend
"%NSSM%" status PanelWazeFrontend
echo.
echo   URLs:
echo     Frontend: http://10.1.0.136:5180
echo     Backend:  http://10.1.0.136:3002/health
echo.
echo   Logs: %LOGS%
echo   Servicios: services.msc
echo ===============================================
echo.
pause
endlocal
