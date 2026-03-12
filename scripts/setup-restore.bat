@echo off
chcp 65001 >nul
title Setup Panel Waze - Restaurar desde backup
setlocal enabledelayedexpansion

set "ROOT=%~dp0.."
set "BACKUP=d:\panel_waze_backup.dump"
set "PG_INSTALLER=c:\Users\waze\Downloads\postgresql-18.3-2-windows-x64.exe"

echo.
echo ===============================================
echo   SETUP PANEL WAZE - Restaurar desde backup
echo ===============================================
echo.

:: 1. Verificar PostgreSQL instalado
echo [1/6] Verificando PostgreSQL...
where psql >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    :: Buscar en rutas comunes de instalacion
    if exist "D:\postgreSQL\bin\psql.exe" (
        set "PATH=D:\postgreSQL\bin;%PATH%"
    ) else if exist "C:\Program Files\PostgreSQL\18\bin\psql.exe" (
        set "PATH=C:\Program Files\PostgreSQL\18\bin;%PATH%"
    ) else if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" (
        set "PATH=C:\Program Files\PostgreSQL\16\bin;%PATH%"
    ) else if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" (
        set "PATH=C:\Program Files\PostgreSQL\15\bin;%PATH%"
    )
    where psql >nul 2>&1
)
if !ERRORLEVEL! NEQ 0 (
    echo    PostgreSQL NO encontrado en PATH.
    if exist "%PG_INSTALLER%" (
        echo.
        echo    Ejecutando instalador: %PG_INSTALLER%
        echo    IMPORTANTE: Durante la instalacion:
        echo    - Anota la contrasena del usuario postgres
        echo    - Puerto: 5432
        echo    - Agrega binarios al PATH si se ofrece
        echo.
        start "" "%PG_INSTALLER%"
        echo    Ejecuta este script nuevamente despues de instalar.
    ) else (
        echo    Instalador no encontrado en: %PG_INSTALLER%
        echo    Descarga PostgreSQL: https://www.postgresql.org/download/windows/
    )
    pause
    exit /b 1
)
echo    OK: PostgreSQL detectado
echo.

:: 2. npm install
echo [2/6] Instalando dependencias...
cd /d "%ROOT%"
call npm install
if !ERRORLEVEL! NEQ 0 (
    echo    ERROR en npm install
    pause
    exit /b 1
)
echo    OK: Dependencias instaladas
echo.

:: 3. Configurar .env backend
echo [3/6] Configurando .env...
cd /d "%ROOT%\apps\backend"
if not exist ".env" (
    copy .env.example .env >nul
    echo    OK: .env creado desde .env.example
) else (
    echo    OK: .env ya existe
)

:: Leer DB_PASSWORD del .env (default: CASISA)
set "DB_PASSWORD=CASISA"
for /f "tokens=2 delims==" %%a in ('findstr /B "DB_PASSWORD" "%ROOT%\apps\backend\.env" 2^>nul') do set "DB_PASSWORD=%%a"
echo.

:: 4. Configurar .env frontend
cd /d "%ROOT%\apps\frontend"
if not exist ".env" (
    echo VITE_API_URL=/api> .env
    echo    OK: .env frontend creado
)
echo.

:: 5. Restaurar backup
echo [4/6] Restaurando base de datos...
if not exist "%BACKUP%" (
    echo    ERROR: Backup no encontrado en %BACKUP%
    echo    Usa migraciones en su lugar: npm run db:migrate ^& npm run db:seed
    pause
    exit /b 1
)

set PGPASSWORD=!DB_PASSWORD!
echo    Creando base de datos panel_waze...
psql -U postgres -h localhost -p 5432 -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='panel_waze' AND pid<>pg_backend_pid();" 2>nul
psql -U postgres -h localhost -p 5432 -d postgres -c "DROP DATABASE IF EXISTS panel_waze;" 2>nul
psql -U postgres -h localhost -p 5432 -d postgres -c "CREATE DATABASE panel_waze;" 2>nul
if !ERRORLEVEL! NEQ 0 (
    echo    ERROR: No se pudo crear la base de datos.
    echo    Verifica que PostgreSQL este corriendo y la contrasena en apps\backend\.env
    pause
    exit /b 1
)

echo    Restaurando desde %BACKUP%...
pg_restore -U postgres -h localhost -p 5432 -d panel_waze --no-owner --no-privileges "%BACKUP%" 2>nul
if !ERRORLEVEL! NEQ 0 (
    echo    pg_restore retorno codigo !ERRORLEVEL! - puede ser normal si hay objetos duplicados.
    echo    Verificando conexion...
)
psql -U postgres -h localhost -p 5432 -d panel_waze -c "SELECT 1;" >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo    OK: Base de datos restaurada
) else (
    echo    ADVERTENCIA: Verifica la restauracion manualmente
)
set PGPASSWORD=
echo.

:: 6. Redis opcional
echo [5/6] Redis (opcional)...
echo    Redis no es obligatorio. El backend funciona sin el (cache deshabilitado).
echo    Para cache: instala Memurai o ejecuta Redis con Docker.
echo.

:: Resumen
echo [6/6] Resumen
echo ===============================================
echo   Setup completado
echo ===============================================
echo.
echo   Para iniciar el proyecto:
echo   npm run dev:all
echo.
echo   URLs:
echo   - Frontend: http://localhost:5180
echo   - Backend:  http://localhost:3002
echo.
pause
endlocal
