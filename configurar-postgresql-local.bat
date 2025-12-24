@echo off
chcp 65001 >nul
title Configuracion de PostgreSQL Local
setlocal enabledelayedexpansion

echo.
echo ===============================================
echo   CONFIGURACION DE POSTGRESQL LOCAL
echo ===============================================
echo.

:: Obtener directorio actual
for %%I in ("%~dp0.") do set "ROOT=%%~fI"

:: ============================================
:: PASO 1: Verificar instalacion
:: ============================================
echo [1/4] Verificando instalacion de PostgreSQL...
where psql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo    ERROR: PostgreSQL NO esta instalado
    echo.
    echo    Para instalar PostgreSQL:
    echo    1. Ve a: https://www.postgresql.org/download/windows/
    echo    2. Descarga e instala PostgreSQL
    echo    3. Anota la contrasena del usuario "postgres"
    echo    4. Ejecuta este script nuevamente
    echo.
    set /p ABRIR="Quieres abrir la pagina de descarga ahora? (S/N): "
    if /i "!ABRIR!"=="S" (
        start https://www.postgresql.org/download/windows/
    )
    pause
    exit /b 1
)

echo    OK: PostgreSQL esta instalado
for %%p in (psql) do set "PSQL_PATH=%%~$PATH:p"
echo    Ubicacion: !PSQL_PATH!
echo.

:: ============================================
:: PASO 2: Verificar servicio
:: ============================================
echo [2/4] Verificando servicio de PostgreSQL...
set SERVICE_RUNNING=0

:: Intentar iniciar servicios comunes de PostgreSQL
net start postgresql-x64-16 >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo    OK: Servicio postgresql-x64-16 iniciado
    set SERVICE_RUNNING=1
    goto :service_ok
)

net start postgresql-x64-15 >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo    OK: Servicio postgresql-x64-15 iniciado
    set SERVICE_RUNNING=1
    goto :service_ok
)

net start postgresql-x64-14 >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo    OK: Servicio postgresql-x64-14 iniciado
    set SERVICE_RUNNING=1
    goto :service_ok
)

:: Verificar si ya esta corriendo
:: Leer contraseña del .env si existe, sino usar CASISA por defecto
set DB_PASSWORD=CASISA
if exist "%ROOT%\backend\.env" (
    for /f "tokens=2 delims==" %%a in ('findstr /C:"DB_PASSWORD" "%ROOT%\backend\.env" 2^>nul') do (
        set DB_PASSWORD=%%a
    )
)
set PGPASSWORD=!DB_PASSWORD!
psql -U postgres -h localhost -p 5432 -d postgres -c "SELECT 1;" >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo    OK: PostgreSQL ya esta corriendo
    set SERVICE_RUNNING=1
    goto :service_ok
)

echo    ERROR: No se pudo iniciar el servicio de PostgreSQL
echo    Inicia el servicio manualmente desde "Servicios" de Windows
pause
exit /b 1

:service_ok
echo.

:: ============================================
:: PASO 3: Verificar conexion
:: ============================================
echo [3/4] Verificando conexion...
:: Leer contraseña del .env si existe, sino usar CASISA por defecto
set DB_PASSWORD=CASISA
if exist "%ROOT%\backend\.env" (
    for /f "tokens=2 delims==" %%a in ('findstr /C:"DB_PASSWORD" "%ROOT%\backend\.env" 2^>nul') do (
        set DB_PASSWORD=%%a
    )
)
set PGPASSWORD=!DB_PASSWORD!
psql -U postgres -h localhost -p 5432 -d postgres -c "SELECT version();" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo    ERROR: No se pudo conectar a PostgreSQL
    echo.
    echo    Verifica:
    echo    - Que el servicio este corriendo
    echo    - Que la contrasena sea correcta
    echo    - Que el puerto 5432 este disponible
    echo.
    echo    Si la contrasena es diferente, actualiza backend\.env
    pause
    exit /b 1
)

echo    OK: Conexion exitosa
echo.

:: ============================================
:: PASO 4: Configurar base de datos
:: ============================================
echo [4/4] Configurando base de datos...
cd /d "%ROOT%\backend"

:: Leer contrasena del .env si existe
set DB_PASSWORD=CASISA
if exist ".env" (
    for /f "tokens=2 delims==" %%a in ('findstr /C:"DB_PASSWORD" .env 2^>nul') do (
        set DB_PASSWORD=%%a
    )
)

set PGPASSWORD=!DB_PASSWORD!

:: Crear base de datos
echo    Verificando base de datos "panel_waze"...
psql -U postgres -h localhost -p 5432 -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='panel_waze'" 2>nul | findstr /C:"1" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    OK: Base de datos "panel_waze" ya existe
) else (
    echo    Creando base de datos "panel_waze"...
    psql -U postgres -h localhost -p 5432 -d postgres -c "CREATE DATABASE panel_waze;" >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo    OK: Base de datos creada
    ) else (
        echo    ERROR: No se pudo crear la base de datos
        pause
        exit /b 1
    )
)

:: Ejecutar schema
echo    Ejecutando schema...
if exist "src\database\schema.sql" (
    psql -U postgres -h localhost -p 5432 -d panel_waze -f "src\database\schema.sql" >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo    OK: Schema ejecutado correctamente
    ) else (
        echo    ADVERTENCIA: Algunos errores al ejecutar el schema
        echo    (Puede ser normal si las tablas ya existen)
    )
) else (
    echo    ERROR: Archivo schema.sql no encontrado
    pause
    exit /b 1
)
echo.

:: ============================================
:: Verificar conexion final
:: ============================================
echo Verificando conexion final...
if exist "scripts\test-db-connection.ts" (
    call npx ts-node scripts/test-db-connection.ts
) else (
    echo    ADVERTENCIA: Script de prueba no encontrado
)
echo.

echo ===============================================
echo   CONFIGURACION COMPLETADA
echo ===============================================
echo.
echo   Base de datos: panel_waze
echo   Usuario: postgres
echo   Puerto: 5432
echo.
echo   Ahora puedes iniciar el proyecto con:
echo   start-all.bat
echo.
echo ===============================================
echo.
pause
endlocal
