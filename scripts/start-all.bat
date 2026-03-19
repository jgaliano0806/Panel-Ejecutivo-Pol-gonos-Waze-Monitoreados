@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title Panel Waze - Iniciador

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%.."
set "ROOT=%CD%"
popd

set "NSSM=C:\ProgramData\chocolatey\lib\NSSM\tools\nssm.exe"
set "PG_BIN=D:\postgreSQL\bin"
set "PATH=%PG_BIN%;%PATH%"

:: Puerto del backend (debe coincidir con apps/backend/.env)
set "BACKEND_PORT=3002"
set "FRONTEND_PORT=5180"

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
:: PASO 2: Backend
:: ============================================================
echo [2/4] Iniciando Backend...

:: Liberar puerto del backend si esta ocupado por un proceso anterior
call :KILL_PORT %BACKEND_PORT%

if not exist "%NSSM%" (
    echo    NSSM no encontrado, usando modo directo...
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
    echo    OK: Backend corriendo en puerto %BACKEND_PORT%
) else (
    echo    ADVERTENCIA: El servicio no arranco - intentando fallback...
    goto :FALLBACK_BACKEND
)
goto :BACKEND_DONE

:FALLBACK_BACKEND
echo    Iniciando backend en modo directo...
start "Backend Panel Waze" /D "%ROOT%" cmd /k "npm run dev:backend"
timeout /t 10 /nobreak >nul
echo    OK: Backend iniciado

:BACKEND_DONE
echo.

:: ============================================================
:: PASO 3: Frontend
:: ============================================================
echo [3/4] Iniciando Frontend...
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
    echo    OK: Frontend corriendo en puerto %FRONTEND_PORT%
    goto :FRONTEND_DONE
) else (
    echo    ADVERTENCIA: El servicio no arranco - intentando fallback...
)

:FALLBACK_FRONTEND
echo    Iniciando frontend en modo desarrollo...
call :KILL_PORT %FRONTEND_PORT%
start "Frontend Panel Waze" /D "%ROOT%" cmd /k "npm run dev"
timeout /t 8 /nobreak >nul
echo    OK: Frontend iniciado

:FRONTEND_DONE
echo.

:: ============================================================
:: PASO 4: Verificacion
:: ============================================================
echo [4/4] Verificando sistema...
timeout /t 5 /nobreak >nul

:: Health check backend
curl -s --max-time 5 http://localhost:%BACKEND_PORT%/health >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo    OK: Backend responde en :%BACKEND_PORT%
) else (
    echo    ADVERTENCIA: Backend no responde aun - puede estar iniciando
)

:: Verificar frontend
netstat -aon | findstr ":%FRONTEND_PORT%" | findstr "LISTENING" >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo    OK: Frontend escuchando en :%FRONTEND_PORT%
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
echo   Panel - red local:  http://!LOCAL_IP!:%FRONTEND_PORT%
echo   Panel - local:      http://localhost:%FRONTEND_PORT%
echo   API health:         http://localhost:%BACKEND_PORT%/health
echo.
echo   Para gestionar servicios: services.msc
echo ===============================================
echo.
pause
goto :EOF

:: ============================================================
:: Subrutina: Matar proceso que ocupa un puerto
:: Uso: call :KILL_PORT 3002
:: ============================================================
:KILL_PORT
set "_PORT=%~1"
for /f "tokens=5" %%p in ('netstat -aon 2^>nul ^| findstr ":%_PORT% " ^| findstr "LISTENING"') do (
    echo    Liberando puerto %_PORT% - PID %%p
    taskkill /F /PID %%p >nul 2>&1
    timeout /t 2 /nobreak >nul
)
goto :EOF
