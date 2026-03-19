@echo off
chcp 65001 >nul
title Instalar servicio PanelWazeFrontend

:: Rutas derivadas de la ubicación del script
set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%.."
set "PROJECT=%CD%"
popd

set NSSM=C:\ProgramData\chocolatey\lib\NSSM\tools\nssm.exe
set NODE=C:\Program Files\nodejs\node.exe
set SERVE_JS=%APPDATA%\npm\node_modules\serve\build\main.js
set APP_DIR=%PROJECT%\apps\frontend
set LOGS=%PROJECT%\logs

echo.
echo ================================================
echo  Instalando servicio PanelWazeFrontend...
echo ================================================
echo.

if not exist "%SERVE_JS%" (
    echo Instalando serve globalmente...
    npm install -g serve
)

if not exist "%APP_DIR%\dist\index.html" (
    echo ERROR: Frontend no compilado. Ejecute: npm run build --workspace=apps/frontend
    pause
    exit /b 1
)

:: Detener y eliminar si ya existe
"%NSSM%" stop PanelWazeFrontend 2>nul
"%NSSM%" remove PanelWazeFrontend confirm 2>nul
timeout /t 2 /nobreak >nul

:: Crear el servicio
"%NSSM%" install PanelWazeFrontend "%NODE%"
"%NSSM%" set PanelWazeFrontend AppParameters  "%SERVE_JS% -s dist -l 5180"
"%NSSM%" set PanelWazeFrontend AppDirectory   "%APP_DIR%"
"%NSSM%" set PanelWazeFrontend AppStdout      "%LOGS%\frontend-stdout.log"
"%NSSM%" set PanelWazeFrontend AppStderr      "%LOGS%\frontend-stderr.log"
"%NSSM%" set PanelWazeFrontend AppRotateFiles 1
"%NSSM%" set PanelWazeFrontend AppRotateBytes 10485760
"%NSSM%" set PanelWazeFrontend Start          SERVICE_AUTO_START
"%NSSM%" set PanelWazeFrontend DisplayName    "PanelWazeFrontend"
"%NSSM%" set PanelWazeFrontend Description    "Panel Ejecutivo Waze - Frontend estatico"

:: Abrir puerto 5180 en el Firewall de Windows (necesario para acceso desde la red)
netsh advfirewall firewall delete rule name="Panel Waze Frontend - Puerto 5180" >nul 2>&1
netsh advfirewall firewall add rule name="Panel Waze Frontend - Puerto 5180" dir=in action=allow protocol=TCP localport=5180 profile=any description="Panel Ejecutivo Waze - Frontend estatico"
echo    OK: Puerto 5180 habilitado en Firewall

echo.
echo Iniciando servicio...
"%NSSM%" start PanelWazeFrontend
timeout /t 5 /nobreak >nul

echo.
echo Estado:
"%NSSM%" status PanelWazeFrontend

echo.
echo ================================================
echo  Frontend: http://10.1.0.136:5180
echo  Backend:  http://10.1.0.136:3002/health
echo ================================================
echo.
pause
