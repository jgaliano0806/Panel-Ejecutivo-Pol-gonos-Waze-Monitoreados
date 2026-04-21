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

:: Puerto del frontend (debe coincidir con Vite / servicio serve)
set "FRONTEND_PORT=5180"

:: BACKEND_PORT se resuelve en :RESOLVE_BACKEND_PORT (apps/backend/.env PORT=, si no existe: 3002 como en NSSM)

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
echo   PANEL EJECUTIVO WAZE  -  DESARROLLO LOCAL
echo ===============================================
echo.

call :RESOLVE_BACKEND_PORT
echo    Puerto API detectado: !BACKEND_PORT! ^(.env o predeterminado 3002^)
echo.

:: ============================================================
:: PASO 1: PostgreSQL (dev local: si ya esta corriendo, NO lo reiniciamos
:: para evitar interrumpir otras apps. Solo se levanta si esta STOPPED.)
:: ============================================================
echo [1/4] Verificando PostgreSQL ^(local^)...
set "PG_SERVICE=postgresql-x64-18"

sc query !PG_SERVICE! >nul 2>&1
if errorlevel 1 (
    echo    ADVERTENCIA: Servicio !PG_SERVICE! no encontrado - revisar nombre en services.msc
    goto :PG_DONE
)

sc query !PG_SERVICE! | findstr "RUNNING" >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo    OK: !PG_SERVICE! ya esta en RUNNING ^(no se reinicia en local^)
    goto :PG_DONE
)

echo    Detectar privilegios de administrador...
net session >nul 2>&1
if errorlevel 1 (
    echo    AVISO: no se detectan privilegios de administrador - net start puede fallar.
    echo    Ejecute la ventana ^(PowerShell/CMD^) como administrador si hace falta.
)

echo    Iniciando !PG_SERVICE!...
net start !PG_SERVICE! >nul 2>&1
sc query !PG_SERVICE! | findstr "RUNNING" >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo    OK: PostgreSQL iniciado
    timeout /t 3 /nobreak >nul
) else (
    echo    ADVERTENCIA: No se pudo iniciar PostgreSQL - revise services.msc
)

:PG_DONE
echo.

:: ============================================================
:: PASO 2: Backend (una sola instancia: NSSM o una ventana dev)
:: ============================================================
echo [2/4] Iniciando Backend...

set "HAS_NSSM_BACKEND=0"
if exist "%NSSM%" (
    sc query PanelWazeBackend >nul 2>&1
    if not errorlevel 1 set "HAS_NSSM_BACKEND=1"
)

if "!HAS_NSSM_BACKEND!"=="1" (
    echo    Servicio PanelWazeBackend instalado: no se mata el puerto antes ^(NSSM reinicia el proceso^).
    "%NSSM%" status PanelWazeBackend 2>nul | findstr "SERVICE_RUNNING" >nul 2>&1
    if not errorlevel 1 (
        echo    Reiniciando servicio...
        "%NSSM%" restart PanelWazeBackend >nul 2>&1
    ) else (
        echo    Iniciando servicio...
        "%NSSM%" start PanelWazeBackend >nul 2>&1
    )
    timeout /t 6 /nobreak >nul

    "%NSSM%" status PanelWazeBackend 2>nul | findstr "SERVICE_RUNNING" >nul 2>&1
    if not errorlevel 1 (
        echo    OK: Backend NSSM en puerto !BACKEND_PORT!
        goto :BACKEND_DONE
    )
    echo    ADVERTENCIA: El servicio no quedo en RUNNING - modo desarrollo sin duplicar NSSM.
    echo    Deteniendo PanelWazeBackend para no competir con npm en el mismo puerto...
    "%NSSM%" stop PanelWazeBackend >nul 2>&1
    timeout /t 3 /nobreak >nul
) else (
    if not exist "%NSSM%" echo    NSSM no encontrado: modo desarrollo si hace falta.
)

call :IS_BACKEND_UP !BACKEND_PORT!
if "!IS_BACKEND_UP!"=="1" (
    echo    Backend ya responde en :!BACKEND_PORT! ^- reiniciando modo desarrollo...
) else (
    echo    Backend no responde en :!BACKEND_PORT! ^- iniciando modo desarrollo...
)

echo    Cerrando ventanas "Backend Panel Waze" previas...
taskkill /F /FI "WINDOWTITLE eq Backend Panel Waze*" >nul 2>&1

echo    Liberando escucha en :!BACKEND_PORT! si hay algun proceso...
call :KILL_PORT_LISTENERS !BACKEND_PORT!

echo    Iniciando backend en modo desarrollo ^(una ventana^)...
start "Backend Panel Waze" /D "%ROOT%" cmd /k "npm run dev:backend"
timeout /t 10 /nobreak >nul
echo    OK: Backend dev (re)iniciado

:BACKEND_DONE
echo.

:: ============================================================
:: PASO 3: Frontend (una sola instancia: NSSM o una ventana dev)
:: ============================================================
echo [3/4] Iniciando Frontend...

set "HAS_NSSM_FRONTEND=0"
if exist "%NSSM%" (
    sc query PanelWazeFrontend >nul 2>&1
    if not errorlevel 1 set "HAS_NSSM_FRONTEND=1"
)

if "!HAS_NSSM_FRONTEND!"=="1" (
    echo    Servicio PanelWazeFrontend: sin liberar el puerto a mano antes del reinicio.
    "%NSSM%" status PanelWazeFrontend 2>nul | findstr "SERVICE_RUNNING" >nul 2>&1
    if not errorlevel 1 (
        echo    Reiniciando servicio...
        "%NSSM%" restart PanelWazeFrontend >nul 2>&1
    ) else (
        echo    Iniciando servicio...
        "%NSSM%" start PanelWazeFrontend >nul 2>&1
    )
    timeout /t 5 /nobreak >nul

    "%NSSM%" status PanelWazeFrontend 2>nul | findstr "SERVICE_RUNNING" >nul 2>&1
    if not errorlevel 1 (
        echo    OK: Frontend NSSM en puerto !FRONTEND_PORT!
        goto :FRONTEND_DONE
    )
    echo    ADVERTENCIA: Frontend NSSM no en RUNNING - modo Vite sin duplicar servicio.
    echo    Deteniendo PanelWazeFrontend...
    "%NSSM%" stop PanelWazeFrontend >nul 2>&1
    timeout /t 2 /nobreak >nul
)

call :IS_FRONTEND_LISTENING !FRONTEND_PORT!
if "!IS_FRONTEND_LISTENING!"=="1" (
    echo    Frontend ya escucha en :!FRONTEND_PORT! ^- reiniciando modo desarrollo...
) else (
    echo    Frontend no escucha en :!FRONTEND_PORT! ^- iniciando modo desarrollo...
)

echo    Cerrando ventanas "Frontend Panel Waze" previas...
taskkill /F /FI "WINDOWTITLE eq Frontend Panel Waze*" >nul 2>&1

echo    Liberando escucha en :!FRONTEND_PORT! si hay algun proceso...
call :KILL_PORT_LISTENERS !FRONTEND_PORT!

echo    Iniciando frontend en modo desarrollo ^(una ventana^)...
start "Frontend Panel Waze" /D "%ROOT%" cmd /k "npm run dev"
timeout /t 8 /nobreak >nul
echo    OK: Frontend dev (re)iniciado

:FRONTEND_DONE
echo.

:: ============================================================
:: PASO 4: Verificacion
:: ============================================================
echo [4/4] Verificando sistema...
timeout /t 5 /nobreak >nul

curl -s --max-time 5 http://127.0.0.1:!BACKEND_PORT!/health >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo    OK: Backend responde en :!BACKEND_PORT!
) else (
    echo    ADVERTENCIA: Backend no responde aun - puede estar iniciando
)

netstat -aon 2>nul | findstr ":!FRONTEND_PORT! " | findstr "LISTENING" >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo    OK: Frontend escuchando en :!FRONTEND_PORT!
) else (
    echo    ADVERTENCIA: Frontend no responde aun
)

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
echo   Panel - red local:  http://!LOCAL_IP!:!FRONTEND_PORT!
echo   Panel - local:      http://localhost:!FRONTEND_PORT!
echo   API health:         http://localhost:!BACKEND_PORT!/health
echo.
echo   Una sola API: no ejecute dev:backend si PanelWazeBackend ^(NSSM^) esta en RUNNING
echo   con el mismo PORT en apps\backend\.env.
echo   Para gestionar servicios: services.msc
echo ===============================================
echo.
pause
goto :EOF

:: ============================================================
:: Lee PORT desde apps\backend\.env (primera linea PORT=)
:: Predeterminado 3002 = instalador NSSM INSTALAR-BACKEND-SERVICIO.bat
:: ============================================================
:RESOLVE_BACKEND_PORT
set "BACKEND_PORT=3002"
if not exist "%ROOT%\apps\backend\.env" goto :EOF
for /f "usebackq eol=# tokens=1* delims==" %%a in ("%ROOT%\apps\backend\.env") do (
    if /i "%%a"=="PORT" (
        set "BACKEND_PORT=%%b"
        for /f "tokens=* delims= " %%t in ("!BACKEND_PORT!") do set "BACKEND_PORT=%%t"
    )
)
if "!BACKEND_PORT!"=="" set "BACKEND_PORT=3002"
goto :EOF

:: ============================================================
:: IS_BACKEND_UP ^<puerto^>  - 1 si /health devuelve healthy
:: ============================================================
:IS_BACKEND_UP
set "IS_BACKEND_UP=0"
curl -s --max-time 4 "http://127.0.0.1:%~1/health" 2>nul | findstr /i "healthy" >nul 2>&1
if not errorlevel 1 set "IS_BACKEND_UP=1"
goto :EOF

:: ============================================================
:: IS_FRONTEND_LISTENING ^<puerto^>
:: ============================================================
:IS_FRONTEND_LISTENING
set "IS_FRONTEND_LISTENING=0"
netstat -aon 2>nul | findstr ":%~1 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 set "IS_FRONTEND_LISTENING=1"
goto :EOF

:: ============================================================
:: Mata procesos en LISTENING para el puerto (huérfanos / dev viejo)
:: Uso: call :KILL_PORT_LISTENERS 3002
:: Un solo delay al final si hubo algún taskkill
:: ============================================================
:KILL_PORT_LISTENERS
set "_PORT=%~1"
set "_DID_KILL=0"
for /f "tokens=5" %%p in ('netstat -aon 2^>nul ^| findstr ":%_PORT% " ^| findstr "LISTENING"') do (
    echo    Liberando puerto %_PORT% - PID %%p
    taskkill /F /PID %%p >nul 2>&1
    if not errorlevel 1 set "_DID_KILL=1"
)
if "!_DID_KILL!"=="1" timeout /t 2 /nobreak >nul
goto :EOF
