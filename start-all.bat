@echo off
chcp 65001 >nul
title Panel Waze - Iniciador

echo.
echo ===============================================
echo   PANEL EJECUTIVO - WAZE MONITOREADOS
echo ===============================================
echo.

:: Obtener directorio actual usando formato corto (8.3)
for %%I in ("%~dp0.") do set "ROOT=%%~sI"

echo [1/2] Iniciando Backend...
start "Backend - Panel Waze" cmd /k "cd /d %ROOT%\backend && npm run dev"

:: Esperar 3 segundos para que el backend inicie
timeout /t 3 /nobreak >nul

echo [2/2] Iniciando Frontend...
start "Frontend - Panel Waze" cmd /k "cd /d %ROOT% && npm run dev"

echo.
echo ===============================================
echo   SERVICIOS INICIADOS
echo.
echo   Backend:  http://localhost:3001
echo   Frontend: http://localhost:5173
echo   Health:   http://localhost:3001/health
echo.
echo   Cierra este terminal para detener todo.
echo ===============================================
echo.

pause



