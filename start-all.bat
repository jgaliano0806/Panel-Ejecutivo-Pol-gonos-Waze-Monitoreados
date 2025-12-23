@echo off
chcp 65001 >nul
title Panel Waze - Iniciador Completo
setlocal enabledelayedexpansion

echo.
echo ===============================================
echo   PANEL EJECUTIVO - WAZE MONITOREADOS
echo   Iniciador Completo
echo ===============================================
echo.

:: Obtener directorio actual
for %%I in ("%~dp0.") do set "ROOT=%%~fI"

:: ============================================
:: PASO 0: Limpiar servicios existentes
:: ============================================
echo [0/4] Limpiando servicios existentes...
echo.

:: Detener procesos en puerto 3001 (Backend)
echo    Verificando puerto 3001 (Backend)...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3001" ^| findstr "LISTENING"') do (
    set PID=%%a
    if defined PID (
        echo    Puerto 3001 ocupado por PID: !PID!
        echo    Deteniendo proceso...
        taskkill /F /PID !PID! >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo    OK: Proceso detenido
        )
    )
)

:: Detener procesos en puerto 5173 (Frontend)
echo    Verificando puerto 5173 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5173" ^| findstr "LISTENING"') do (
    set PID=%%a
    if defined PID (
        echo    Puerto 5173 ocupado por PID: !PID!
        echo    Deteniendo proceso...
        taskkill /F /PID !PID! >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo    OK: Proceso detenido
        )
    )
)

timeout /t 2 /nobreak >nul
echo.

:: ============================================
:: PASO 1: PostgreSQL
:: ============================================
echo [1/4] Verificando PostgreSQL...
set POSTGRES_OK=0

:: Verificar Docker primero
where docker >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    docker ps >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo    Docker esta disponible
        cd /d "%ROOT%"

        docker ps --filter "name=postgres" --format "{{.Names}}" 2>nul | findstr /C:"postgres" >nul 2>&1
        if %ERRORLEVEL% EQU 0 (
            echo    OK: PostgreSQL en Docker esta corriendo
            set POSTGRES_OK=1
        ) else (
            echo    Iniciando PostgreSQL con Docker...
            docker-compose --profile dev up -d postgres >nul 2>&1
            if %ERRORLEVEL% EQU 0 (
                echo    OK: PostgreSQL iniciado
                echo    Esperando que este listo...
                timeout /t 5 /nobreak >nul
                set POSTGRES_OK=1
            ) else (
                echo    ADVERTENCIA: No se pudo iniciar PostgreSQL
            )
        )
    ) else (
        echo    Docker no esta corriendo
    )
) else (
    echo    Docker no disponible, verificando PostgreSQL local...
)

:: Si Docker no funciona, verificar PostgreSQL local
if !POSTGRES_OK! EQU 0 (
    where psql >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        set PGPASSWORD=postgres
        psql -U postgres -h localhost -p 5432 -d postgres -c "SELECT 1;" >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo    OK: PostgreSQL local esta corriendo
            set POSTGRES_OK=1
        ) else (
            echo    ADVERTENCIA: PostgreSQL no responde
            echo    Intentando iniciar servicio...
            net start postgresql-x64-16 >nul 2>&1
            if !ERRORLEVEL! EQU 0 (
                echo    OK: Servicio PostgreSQL iniciado
                timeout /t 3 /nobreak >nul
                set POSTGRES_OK=1
            )
        )
    ) else (
        echo    ADVERTENCIA: PostgreSQL no detectado
    )
)
echo.

:: ============================================
:: PASO 2: Configurar Backend
:: ============================================
echo [2/4] Configurando Backend...
if not exist "%ROOT%\backend\.env" (
    echo    Archivo .env no encontrado, creando...
    cd /d "%ROOT%\backend"
    echo # Configuracion de PostgreSQL> .env
    echo DB_HOST=localhost>> .env
    echo DB_PORT=5432>> .env
    echo DB_NAME=panel_waze>> .env
    echo DB_USER=postgres>> .env
    echo DB_PASSWORD=postgres>> .env
    echo.>> .env
    echo # Configuracion del servidor>> .env
    echo NODE_ENV=development>> .env
    echo PORT=3001>> .env
    echo    OK: Archivo .env creado
) else (
    echo    OK: Archivo .env encontrado
)
echo.

:: ============================================
:: PASO 3: Iniciar Backend
:: ============================================
echo [3/4] Iniciando Backend...
echo    Verificando puerto 3001...
netstat -aon 2>nul | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    Puerto 3001 aun ocupado, liberando...
    for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3001" ^| findstr "LISTENING"') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
)

start "Backend - Panel Waze" cmd /k "cd /d "%ROOT%\backend" && npm run dev"
echo    OK: Backend iniciado
echo    Esperando que este listo...
timeout /t 5 /nobreak >nul
echo.

:: ============================================
:: PASO 4: Iniciar Frontend
:: ============================================
echo [4/4] Iniciando Frontend...
echo    Verificando puerto 5173...
netstat -aon 2>nul | findstr ":5173" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    Puerto 5173 aun ocupado, liberando...
    for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5173" ^| findstr "LISTENING"') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
)

start "Frontend - Panel Waze" cmd /k "cd /d "%ROOT%" && npm run dev"
echo    OK: Frontend iniciado
timeout /t 3 /nobreak >nul
echo.

:: ============================================
:: RESUMEN FINAL
:: ============================================
echo ===============================================
echo   SERVICIOS INICIADOS
echo ===============================================
echo.
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:3001
echo   Health:    http://localhost:3001/health
echo   API:       http://localhost:3001/api
echo.
if !POSTGRES_OK! EQU 1 (
    echo   PostgreSQL: OK - Corriendo
) else (
    echo   PostgreSQL: ADVERTENCIA - No detectado
)
echo.
echo ===============================================
echo   INFORMACION
echo ===============================================
echo.
echo   - Para detener: cierra las ventanas de Backend y Frontend
echo   - Para reiniciar: ejecuta este script nuevamente
echo   - Para verificar BD: cd backend ^&^& npx ts-node scripts/test-db-connection.ts
echo.
echo ===============================================
echo.
pause
endlocal
