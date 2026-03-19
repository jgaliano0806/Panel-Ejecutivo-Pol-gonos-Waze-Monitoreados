@echo off
chcp 65001 >nul
title Reiniciar servicios Panel Waze

net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Ejecutando como administrador...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

set NSSM=C:\ProgramData\chocolatey\lib\NSSM\tools\nssm.exe

echo.
echo ================================================
echo  Reiniciando servicios Panel Waze...
echo ================================================
echo.

REM Usar net stop/start en lugar de nssm restart para evitar
REM "SERVICE_START_PENDING" - NSSM tiene timeout corto y falla
REM si el servicio tarda en arrancar (p. ej. serve en frontend).

echo [1/2] Reiniciando PanelWazeBackend...
net stop PanelWazeBackend >nul 2>&1
timeout /t 4 /nobreak >nul
net start PanelWazeBackend
timeout /t 3 /nobreak >nul

echo [2/2] Reiniciando PanelWazeFrontend...
net stop PanelWazeFrontend >nul 2>&1
timeout /t 5 /nobreak >nul
net start PanelWazeFrontend
timeout /t 5 /nobreak >nul

echo.
echo Estado:
%NSSM% status PanelWazeBackend
%NSSM% status PanelWazeFrontend
echo.
echo ================================================
echo  Frontend: http://10.1.0.136:5180
echo  Backend:  http://10.1.0.136:3002/health
echo ================================================
echo.
pause
