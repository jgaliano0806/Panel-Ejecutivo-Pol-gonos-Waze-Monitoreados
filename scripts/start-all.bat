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

:: Leer variables clave desde apps/backend/.env (evita duplicar secretos en el script)
set "BACKEND_ENV=%ROOT%\apps\backend\.env"
set "DB_PASSWORD_ENV=CASISA"
set "DB_PORT_ENV=5432"
set "DB_NAME_ENV=panel_waze"
set "DB_USER_ENV=postgres"
set "BACKEND_PORT=3002"
set "FRONTEND_PORT=5180"

if exist "!BACKEND_ENV!" (
    for /f "usebackq tokens=1,* delims==" %%k in ("!BACKEND_ENV!") do (
        set "_k=%%k"
        set "_k=!_k: =!"
        if "!_k!"=="PORT"        set "BACKEND_PORT=%%l"
        if "!_k!"=="DB_PASSWORD" set "DB_PASSWORD_ENV=%%l"
        if "!_k!"=="DB_PORT"     set "DB_PORT_ENV=%%l"
        if "!_k!"=="DB_NAME"     set "DB_NAME_ENV=%%l"
        if "!_k!"=="DB_USER"     set "DB_USER_ENV=%%l"
    )
    echo    Variables leidas desde apps/backend/.env
) else (
    echo    ADVERTENCIA: apps/backend/.env no encontrado - usando valores por defecto
)

:: Detectar IP de red (fallback: IP hardcodeada del servidor)
set "LOCAL_IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4"') do (
    set "temp=%%a"
    set "temp=!temp: =!"
    echo !temp! | findstr /C:"10.1.0" >nul 2>&1
    if !ERRORLEVEL! EQU 0 set "LOCAL_IP=!temp!"
)
if "!LOCAL_IP!"=="" (
    set "LOCAL_IP=10.1.0.136"
    echo    AVISO: IP local no detectada automaticamente, usando !LOCAL_IP!
)

echo.
echo ===============================================
echo   PANEL EJECUTIVO WAZE  -  PRODUCCION
echo ===============================================
echo.

:: ============================================================
:: VALIDACIONES PREVIAS
:: ============================================================

:: Validar que npm esta disponible (necesario para modo fallback)
where npm >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo    ADVERTENCIA: npm no encontrado en PATH - el modo fallback no funcionara
)

:: Validar que curl esta disponible (necesario para health check)
where curl >nul 2>&1
set "CURL_OK=!ERRORLEVEL!"

:: Validar que psql / PG_BIN existe (necesario para verificacion de BD)
if not exist "%PG_BIN%\psql.exe" (
    echo    ADVERTENCIA: psql no encontrado en %PG_BIN% - verificacion de BD omitida
    set "PSQL_OK=0"
) else (
    set "PSQL_OK=1"
)

echo.

:: ============================================================
:: PASO 1: PostgreSQL
:: ============================================================
echo [1/4] Verificando PostgreSQL...

:: Autodetectar nombre del servicio PostgreSQL (evita hardcodear la version)
set "PG_SERVICE="
for /f "tokens=1" %%s in ('sc query type^= all state^= all 2^>nul ^| findstr /I "SERVICE_NAME.*postgresql"') do (
    if "!PG_SERVICE!"=="" (
        for /f "tokens=2 delims=: " %%n in ("%%s") do set "PG_SERVICE=%%n"
    )
)
:: Fallback al nombre conocido si la autodeteccion falla
if "!PG_SERVICE!"=="" set "PG_SERVICE=postgresql-x64-18"

echo    Servicio PostgreSQL detectado: !PG_SERVICE!

sc query !PG_SERVICE! | findstr "RUNNING" >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo    OK: PostgreSQL ya esta corriendo
) else (
    echo    Iniciando PostgreSQL ^(!PG_SERVICE!^)...
    net start !PG_SERVICE! >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo    OK: PostgreSQL iniciado
        timeout /t 3 /nobreak >nul
    ) else (
        echo    ADVERTENCIA: No se pudo iniciar PostgreSQL - verificar servicio "!PG_SERVICE!"
    )
)
echo.

:: ============================================================
:: PASO 2: Backend
:: ============================================================
echo [2/4] Iniciando Backend...

:: BUG CORREGIDO: No matar el puerto aqui si NSSM lo gestiona.
:: KILL_PORT se llama solo en el fallback directo (ver :FALLBACK_BACKEND).

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
:: Liberar puerto solo cuando se va a arrancar en modo directo
call :KILL_PORT %BACKEND_PORT%
echo    Iniciando backend en modo directo...
start "Backend Panel Waze" /D "%ROOT%" cmd /k "npm run dev:backend"
timeout /t 10 /nobreak >nul
echo    OK: Backend iniciado (modo directo)

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
:: Liberar puerto y arrancar en modo directo
call :KILL_PORT %FRONTEND_PORT%
echo    Iniciando frontend en modo desarrollo...
start "Frontend Panel Waze" /D "%ROOT%" cmd /k "npm run dev"
timeout /t 8 /nobreak >nul
echo    OK: Frontend iniciado (modo directo)

:FRONTEND_DONE
echo.

:: ============================================================
:: PASO 4: Verificacion
:: ============================================================
echo [4/4] Verificando sistema...

:: Espera adicional: si se uso fallback, los procesos pueden necesitar mas tiempo
timeout /t 8 /nobreak >nul

:: Health check backend
if !CURL_OK! EQU 0 (
    curl -s --max-time 8 http://localhost:%BACKEND_PORT%/health >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo    OK: Backend responde en :%BACKEND_PORT%
    ) else (
        echo    ADVERTENCIA: Backend no responde aun - puede estar iniciando ^(esperar ~30s^)
    )
) else (
    :: Fallback sin curl: verificar que el puerto este escuchando
    netstat -aon | findstr ":%BACKEND_PORT%" | findstr "LISTENING" >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo    OK: Backend escuchando en :%BACKEND_PORT%
    ) else (
        echo    ADVERTENCIA: Backend no responde en :%BACKEND_PORT%
    )
)

:: Verificar frontend
netstat -aon | findstr ":%FRONTEND_PORT%" | findstr "LISTENING" >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo    OK: Frontend escuchando en :%FRONTEND_PORT%
) else (
    echo    ADVERTENCIA: Frontend no responde aun
)

:: Verificar BD (solo si psql existe) - credenciales leidas del .env del backend
if "!PSQL_OK!"=="1" (
    set PGPASSWORD=!DB_PASSWORD_ENV!
    psql -U !DB_USER_ENV! -h localhost -p !DB_PORT_ENV! -d !DB_NAME_ENV! -c "SELECT 1;" >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo    OK: Base de datos !DB_NAME_ENV! accesible
    ) else (
        echo    ADVERTENCIA: Base de datos no accesible ^(verificar PostgreSQL y credenciales en .env^)
    )
    set PGPASSWORD=
) else (
    echo    INFO: Verificacion de BD omitida ^(psql no disponible en %PG_BIN%^)
)

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
set "_PORT="
goto :EOF
