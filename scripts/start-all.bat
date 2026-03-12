@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title Panel Waze - Iniciador

:: ============================================================
:: Auto-elevacion: si no es admin, se relanza como admin
:: ============================================================
net session >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo Solicitando permisos de administrador...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

title Panel Waze - Iniciador [ADMINISTRADOR]

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%.."
set "ROOT=%CD%"
popd

set "NSSM=C:\ProgramData\chocolatey\lib\NSSM\tools\nssm.exe"
set "PG_BIN=D:\postgreSQL\bin"
set "PATH=%PG_BIN%;%PATH%"

:: Detectar IP de red
set "LOCAL_IP=10.1.0.136"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4"') do (
    set "temp=%%a"
    set "temp=!temp: =!"
    echo !temp! | findstr /C:"10.1.0" >nul 2>&1
    if !ERRORLEVEL! EQU 0 set "LOCAL_IP=!temp!"
)

echo.
echo ===============================================
echo   PANEL EJECUTIVO WAZE  -  PRODUCCION
echo ===============================================
echo.

:: ============================================================
:: PASO 1: PostgreSQL
:: ============================================================
echo [1/4] Verificando PostgreSQL...
sc query postgresql-x64-18 | findstr "RUNNING" >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo    OK: PostgreSQL ya esta corriendo
) else (
    echo    Iniciando PostgreSQL...
    net start postgresql-x64-18 >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo    OK: PostgreSQL iniciado
        timeout /t 3 /nobreak >nul
    ) else (
        echo    ADVERTENCIA: No se pudo iniciar PostgreSQL - verificar servicio
    )
)
echo.

:: ============================================================
:: PASO 2: Backend (servicio NSSM)
:: ============================================================
echo [2/4] Iniciando Backend (PanelWazeBackend)...
if not exist "%NSSM%" (
    echo    ERROR: NSSM no encontrado en %NSSM%
    goto :FALLBACK_BACKEND
)

"%NSSM%" status PanelWazeBackend 2>nul | findstr "SERVICE_RUNNING" >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo    Reiniciando servicio...
    "%NSSM%" restart PanelWazeBackend >nul 2>&1
) else (
    echo    Iniciando servicio...
    "%NSSM%" start PanelWazeBackend >nul 2>&1
)
timeout /t 6 /nobreak >nul

:: Verificar que arranco
"%NSSM%" status PanelWazeBackend 2>nul | findstr "SERVICE_RUNNING" >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo    OK: Backend corriendo en puerto 3002
) else (
    echo    ADVERTENCIA: El servicio no arranco - intentando fallback...
    goto :FALLBACK_BACKEND
)
goto :BACKEND_DONE

:FALLBACK_BACKEND
echo    Iniciando backend en modo directo (fallback)...
start "Backend Panel Waze" /D "%ROOT%" cmd /k "set PATH=%PG_BIN%;%PATH% && npm run dev:backend"
timeout /t 8 /nobreak >nul
echo    OK: Backend iniciado en modo fallback

:BACKEND_DONE
echo.

:: ============================================================
:: PASO 3: Frontend (servicio NSSM)
:: ============================================================
echo [3/4] Iniciando Frontend (PanelWazeFrontend)...
if not exist "%NSSM%" goto :FALLBACK_FRONTEND

"%NSSM%" status PanelWazeFrontend 2>nul | findstr "SERVICE_RUNNING" >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo    Reiniciando servicio...
    "%NSSM%" restart PanelWazeFrontend >nul 2>&1
) else (
    echo    Iniciando servicio...
    "%NSSM%" start PanelWazeFrontend >nul 2>&1
)
timeout /t 5 /nobreak >nul

"%NSSM%" status PanelWazeFrontend 2>nul | findstr "SERVICE_RUNNING" >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo    OK: Frontend corriendo en puerto 5180
    goto :FRONTEND_DONE
) else (
    echo    ADVERTENCIA: El servicio no arranco - intentando fallback...
)

:FALLBACK_FRONTEND
echo    Iniciando frontend en modo desarrollo (fallback)...
:: Liberar puerto 5180 si esta ocupado
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5180 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
start "Frontend Panel Waze" /D "%ROOT%" cmd /k "npm run dev"
timeout /t 8 /nobreak >nul
echo    OK: Frontend iniciado en modo fallback

:FRONTEND_DONE
echo.

:: ============================================================
:: PASO 4: Verificacion
:: ============================================================
echo [4/4] Verificando sistema...
timeout /t 5 /nobreak >nul

:: Health check backend
curl -s --max-time 5 http://localhost:3002/health >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo    OK: Backend responde en :3002
) else (
    echo    ADVERTENCIA: Backend no responde aun (puede estar iniciando)
)

:: Verificar frontend
netstat -aon | findstr ":5180" | findstr "LISTENING" >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo    OK: Frontend escuchando en :5180
) else (
    echo    ADVERTENCIA: Frontend no responde aun
)

:: Verificar DB
set PGPASSWORD=CASISA
psql -U postgres -h localhost -p 5432 -d panel_waze -c "SELECT 1;" >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo    OK: Base de datos panel_waze accesible
) else (
    echo    ADVERTENCIA: Base de datos no accesible
)
set PGPASSWORD=

echo.
echo ===============================================
echo   SISTEMA LISTO
echo ===============================================
echo.
echo   Panel (red local): http://!LOCAL_IP!:5180
echo   Panel (local):     http://localhost:5180
echo   API health:        http://localhost:3002/health
echo.
echo   Servicios Windows:
echo     - PanelWazeBackend   (backend API)
echo     - PanelWazeFrontend  (frontend estatico)
echo     - postgresql-x64-18  (base de datos)
echo.
echo   Para gestionar: services.msc
echo ===============================================
echo.
pause
endlocal
