@echo off
chcp 65001 >nul
title Reiniciar Panel Waze - Backend y Frontend

:: Rutas derivadas de la ubicación del script
set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%.."
set "PROJECT=%CD%"
popd

set NSSM=C:\ProgramData\chocolatey\lib\NSSM\tools\nssm.exe
set NODE=C:\Program Files\nodejs\node.exe
set BACKEND=%PROJECT%\apps\backend
set FRONTEND=%PROJECT%\apps\frontend
set LOGS=%PROJECT%\logs
set SERVE_JS=%APPDATA%\npm\node_modules\serve\build\main.js

echo.
echo ================================================
echo  Reiniciando servicios Panel Waze
echo ================================================
echo.

:: --- Backend ---
echo [1/2] Reiniciando PanelWazeBackend...
%NSSM% stop PanelWazeBackend
timeout /t 3 /nobreak >nul

%NSSM% set PanelWazeBackend Application        "C:\Program Files\nodejs\node.exe"
%NSSM% set PanelWazeBackend AppParameters      "dist\server.js"
%NSSM% set PanelWazeBackend AppDirectory       "%BACKEND%"
%NSSM% set PanelWazeBackend AppEnvironmentExtra "NODE_ENV=production" "PORT=3002"
%NSSM% set PanelWazeBackend AppStdout          "%LOGS%\backend-stdout.log"
%NSSM% set PanelWazeBackend AppStderr          "%LOGS%\backend-stderr.log"
%NSSM% set PanelWazeBackend AppRotateFiles     1
%NSSM% set PanelWazeBackend AppRestartDelay    5000

%NSSM% start PanelWazeBackend

:: --- Frontend (escuchar en red 0.0.0.0:5180) ---
echo [2/2] Reiniciando PanelWazeFrontend...
%NSSM% stop PanelWazeFrontend
timeout /t 2 /nobreak >nul

%NSSM% set PanelWazeFrontend Application "%NODE%"
%NSSM% set PanelWazeFrontend AppParameters "%SERVE_JS% -s dist -l tcp://0.0.0.0:5180"
%NSSM% set PanelWazeFrontend AppDirectory "%FRONTEND%"
%NSSM% set PanelWazeFrontend AppStdout "%LOGS%\frontend-stdout.log"
%NSSM% set PanelWazeFrontend AppStderr "%LOGS%\frontend-stderr.log"
%NSSM% start PanelWazeFrontend

echo.
echo Esperando arranque...
timeout /t 10 /nobreak >nul

echo.
echo Verificando health...
curl -s http://localhost:3002/health

echo.
echo ================================================
echo  Listo. Panel:   http://10.1.0.136:5180
echo         API:    http://10.1.0.136:3002/health
echo ================================================
echo.
pause
