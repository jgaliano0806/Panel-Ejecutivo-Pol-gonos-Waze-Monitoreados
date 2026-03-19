@echo off
chcp 65001 >nul
title Instalar servicio PanelWazeBackend

:: Requiere administrador
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Ejecutando como administrador...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%.."
set "PROJECT=%CD%"
popd

set NSSM=C:\ProgramData\chocolatey\lib\NSSM\tools\nssm.exe
set NODE=C:\Program Files\nodejs\node.exe
set BACKEND=%PROJECT%\apps\backend
set LOGS=%PROJECT%\logs

echo.
echo ================================================
echo  Instalando servicio PanelWazeBackend...
echo ================================================
echo.

if not exist "%NSSM%" (
    echo ERROR: NSSM no encontrado. Ejecute scripts\INSTALAR-NSSM.bat primero.
    pause
    exit /b 1
)

if not exist "%BACKEND%\dist\server.js" (
    echo ERROR: Backend no compilado. Ejecute: npm run build --workspace=apps/backend
    pause
    exit /b 1
)

if not exist "%BACKEND%\.env" (
    echo ERROR: .env no encontrado en apps\backend
    pause
    exit /b 1
)

if not exist "%LOGS%" mkdir "%LOGS%"

:: Detener y eliminar si ya existe
"%NSSM%" stop PanelWazeBackend 2>nul
"%NSSM%" remove PanelWazeBackend confirm 2>nul
timeout /t 2 /nobreak >nul

:: Crear el servicio
"%NSSM%" install PanelWazeBackend "%NODE%" "dist\server.js"
"%NSSM%" set PanelWazeBackend AppDirectory "%BACKEND%"
"%NSSM%" set PanelWazeBackend AppEnvironmentExtra "NODE_ENV=production" "PORT=3001"
"%NSSM%" set PanelWazeBackend AppStdout "%LOGS%\backend-stdout.log"
"%NSSM%" set PanelWazeBackend AppStderr "%LOGS%\backend-stderr.log"
"%NSSM%" set PanelWazeBackend AppRotateFiles 1
"%NSSM%" set PanelWazeBackend AppRotateBytes 10485760
"%NSSM%" set PanelWazeBackend AppRestartDelay 5000
"%NSSM%" set PanelWazeBackend Start SERVICE_AUTO_START
"%NSSM%" set PanelWazeBackend DisplayName "PanelWazeBackend"
"%NSSM%" set PanelWazeBackend Description "Panel Ejecutivo Waze - Backend API"

:: Firewall
netsh advfirewall firewall delete rule name="Panel Waze Backend - Puerto 3001" >nul 2>&1
netsh advfirewall firewall add rule name="Panel Waze Backend - Puerto 3001" dir=in action=allow protocol=TCP localport=3001 profile=any description="Panel Ejecutivo Waze - Backend API"
echo    OK: Puerto 3001 habilitado en Firewall

echo.
echo Iniciando servicio...
"%NSSM%" start PanelWazeBackend
timeout /t 3 /nobreak >nul

echo.
echo Estado:
"%NSSM%" status PanelWazeBackend
echo.
echo ================================================
echo  Backend: http://10.1.0.136:3001/health
echo ================================================
echo.
pause
