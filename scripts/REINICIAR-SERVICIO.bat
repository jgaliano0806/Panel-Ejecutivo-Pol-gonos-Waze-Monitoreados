@echo off
chcp 65001 >nul
title Reiniciar PanelWazeBackend

:: Rutas derivadas de la ubicación del script
set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%.."
set "PROJECT=%CD%"
popd

set NSSM=C:\ProgramData\chocolatey\lib\NSSM\tools\nssm.exe
set BACKEND=%PROJECT%\apps\backend
set LOGS=%PROJECT%\logs

echo.
echo ================================================
echo  Reiniciando servicio PanelWazeBackend...
echo ================================================
echo.

%NSSM% stop PanelWazeBackend
timeout /t 3 /nobreak >nul

:: Reconfigurar rutas (por si cambió la ubicación del proyecto)
%NSSM% set PanelWazeBackend Application        "C:\Program Files\nodejs\node.exe"
%NSSM% set PanelWazeBackend AppParameters      "dist\server.js"
%NSSM% set PanelWazeBackend AppDirectory       "%BACKEND%"
%NSSM% set PanelWazeBackend AppEnvironmentExtra "NODE_ENV=production" "PORT=3002"
%NSSM% set PanelWazeBackend AppStdout          "%LOGS%\backend-stdout.log"
%NSSM% set PanelWazeBackend AppStderr          "%LOGS%\backend-stderr.log"
%NSSM% set PanelWazeBackend AppRotateFiles     1
%NSSM% set PanelWazeBackend AppRestartDelay    5000

%NSSM% start PanelWazeBackend

echo.
echo Esperando arranque...
timeout /t 10 /nobreak >nul

echo.
echo Verificando health...
curl -s http://localhost:3002/health

echo.
echo ================================================
echo  Listo. Frontend: http://10.1.0.136:5180
echo          Backend: http://10.1.0.136:3002/health
echo ================================================
echo.
pause
