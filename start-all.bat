@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Panel Waze - Iniciador Completo

echo.
echo ===============================================
echo   PANEL EJECUTIVO - WAZE MONITOREADOS
echo   Iniciador Completo con PostgreSQL
echo ===============================================
echo.

:: Obtener directorio actual usando formato corto (8.3)
for %%I in ("%~dp0.") do set "ROOT=%%~sI"

:: ============================================
:: PASO 0: Limpiar servicios existentes
:: ============================================
echo [0/4] Limpiando servicios existentes...
echo.

:: Detener procesos en puerto 3001 (Backend)
echo    🔍 Verificando puerto 3001 (Backend)...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3001" ^| findstr "LISTENING"') do (
    set PID=%%a
    if defined PID (
        echo    ⚠️  Puerto 3001 ocupado por proceso PID: !PID!
        echo    🛑 Deteniendo proceso...
        taskkill /F /PID !PID! >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo    ✅ Proceso detenido
        ) else (
            echo    ⚠️  No se pudo detener el proceso
        )
    )
)

:: Detener procesos en puerto 5173 (Frontend)
echo    🔍 Verificando puerto 5173 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5173" ^| findstr "LISTENING"') do (
    set PID=%%a
    if defined PID (
        echo    ⚠️  Puerto 5173 ocupado por proceso PID: !PID!
        echo    🛑 Deteniendo proceso...
        taskkill /F /PID !PID! >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo    ✅ Proceso detenido
        ) else (
            echo    ⚠️  No se pudo detener el proceso
        )
    )
)

:: Detener ventanas de comandos con títulos específicos
echo    🔍 Verificando ventanas de servicios...
for /f "tokens=2" %%a in ('tasklist /FI "WINDOWTITLE eq Backend - Panel Waze*" /FO LIST 2^>nul ^| findstr "PID"') do (
    echo    ⚠️  Ventana de Backend encontrada (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo    ✅ Ventana de Backend cerrada
    )
)

for /f "tokens=2" %%a in ('tasklist /FI "WINDOWTITLE eq Frontend - Panel Waze*" /FO LIST 2^>nul ^| findstr "PID"') do (
    echo    ⚠️  Ventana de Frontend encontrada (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo    ✅ Ventana de Frontend cerrada
    )
)

timeout /t 2 /nobreak >nul
echo.

:: ============================================
:: PASO 1: PostgreSQL
:: ============================================
echo [1/4] Configurando PostgreSQL...
where docker >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    docker ps >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo    Docker está disponible
        cd /d "%ROOT%"

        :: Verificar si PostgreSQL ya está corriendo
        docker ps --filter "name=postgres" --format "{{.Names}}" 2>nul | findstr /C:"postgres" >nul 2>&1
        if %ERRORLEVEL% EQU 0 (
            echo    ⚠️  PostgreSQL ya está corriendo
            echo    🔄 Reiniciando PostgreSQL...
            docker-compose --profile dev stop postgres >nul 2>&1
            timeout /t 2 /nobreak >nul
            docker-compose --profile dev rm -f postgres >nul 2>&1
        )

        echo    🚀 Iniciando PostgreSQL con Docker...
        docker-compose --profile dev up -d postgres >nul 2>&1
        if %ERRORLEVEL% EQU 0 (
            echo    ✅ PostgreSQL iniciado/reiniciado
            echo    ⏳ Esperando que PostgreSQL esté listo...
            timeout /t 5 /nobreak >nul
        ) else (
            echo    ⚠️  No se pudo iniciar PostgreSQL con Docker
            echo    Continuando sin PostgreSQL...
        )
    ) else (
        echo    ⚠️  Docker no está corriendo
        echo    Continuando sin PostgreSQL...
    )
) else (
    echo    ⚠️  Docker no encontrado
    echo    PostgreSQL no se iniciará automáticamente
)
echo.

:: ============================================
:: PASO 2: Configurar Backend
:: ============================================
echo [2/4] Configurando Backend...
if not exist "%ROOT%\backend\.env" (
    echo    ⚠️  Archivo .env no encontrado
    echo    Creando desde .env.example...
    if exist "%ROOT%\backend\.env.example" (
        copy "%ROOT%\backend\.env.example" "%ROOT%\backend\.env" >nul 2>&1
        echo    ✅ Archivo .env creado
        echo    ⚠️  IMPORTANTE: Edita backend\.env con tus credenciales
    ) else (
        echo    ❌ .env.example no encontrado
    )
) else (
    echo    ✅ Archivo .env encontrado
)
echo.

:: ============================================
:: PASO 3: Iniciar Backend
:: ============================================
echo [3/4] Iniciando Backend...
echo    🔍 Verificando puerto 3001...
netstat -aon 2>nul | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    ⚠️  Puerto 3001 aún ocupado, intentando liberar...
    for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3001" ^| findstr "LISTENING"') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
)

start "Backend - Panel Waze" cmd /k "cd /d %ROOT%\backend && npm run dev"
echo    ✅ Backend iniciado
echo    ⏳ Esperando que el backend esté listo...
timeout /t 5 /nobreak >nul
echo.

:: ============================================
:: PASO 4: Iniciar Frontend
:: ============================================
echo [4/4] Iniciando Frontend...
echo    🔍 Verificando puerto 5173...
netstat -aon 2>nul | findstr ":5173" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    ⚠️  Puerto 5173 aún ocupado, intentando liberar...
    for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5173" ^| findstr "LISTENING"') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
)

start "Frontend - Panel Waze" cmd /k "cd /d %ROOT% && npm run dev"
echo    ✅ Frontend iniciado
timeout /t 3 /nobreak >nul
echo.

:: ============================================
:: RESUMEN FINAL
:: ============================================
echo ===============================================
echo   SERVICIOS INICIADOS
echo ===============================================
echo.
echo   📊 Frontend:  http://localhost:5173
echo   🔧 Backend:   http://localhost:3001
echo   💚 Health:    http://localhost:3001/health
echo   📈 API:       http://localhost:3001/api
echo.

:: Verificar estado de PostgreSQL
where docker >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    docker ps --filter "name=postgres" --format "{{.Names}}" 2>nul | findstr /C:"postgres" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo   🗄️  PostgreSQL:  ✅ Corriendo (Docker)
        echo   📊 Base de datos: panel_waze
    ) else (
        echo   🗄️  PostgreSQL:  ❌ No detectado
    )
) else (
    echo   🗄️  PostgreSQL:  ⚠️  Verificar manualmente
)

echo.
echo ===============================================
echo   INFORMACIÓN IMPORTANTE
echo ===============================================
echo.
echo   • Para detener los servicios, cierra las ventanas
echo     de Backend y Frontend
echo.
echo   • Si usas Docker, detén PostgreSQL con:
echo     docker-compose --profile dev down
echo.
echo   • Para reiniciar todo, ejecuta este script nuevamente
echo     (detendrá automáticamente los servicios activos)
echo.
echo   • Verifica la conexión a PostgreSQL con:
echo     cd backend
echo     npx ts-node scripts/test-db-connection.ts
echo.
echo ===============================================
echo.

pause
