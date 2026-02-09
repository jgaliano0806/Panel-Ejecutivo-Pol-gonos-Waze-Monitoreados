@echo off
chcp 65001 >nul
title Configuracion Completa del Proyecto
setlocal enabledelayedexpansion

echo.
echo ===============================================
echo   CONFIGURACION COMPLETA DEL PROYECTO
echo ===============================================
echo.

:: Obtener directorio actual
for %%I in ("%~dp0.") do set "ROOT=%%~fI"

:: ============================================
:: PASO 1: Instalar dependencias del monorepo (todos los workspaces)
:: ============================================
echo [1/6] Instalando dependencias del monorepo...
cd /d "%ROOT%"
if exist "package.json" (
    call npm install
    if !ERRORLEVEL! EQU 0 (
        echo    OK: Dependencias instaladas (frontend, backend, packages)
    ) else (
        echo    ERROR: Error instalando dependencias
    )
) else (
    echo    ADVERTENCIA: package.json no encontrado en la raiz
)
echo.

:: ============================================
:: PASO 2: Verificar workspace backend
:: ============================================
echo [2/6] Verificando backend...
if not exist "%ROOT%\apps\backend\package.json" (
    echo    ADVERTENCIA: apps\backend\package.json no encontrado
) else (
    echo    OK: Backend en apps\backend
)
echo.

:: ============================================
:: PASO 3: Configurar archivo .env del backend
:: ============================================
echo [3/6] Configurando archivo .env del backend...
cd /d "%ROOT%\apps\backend"
if not exist ".env" (
    if exist ".env.example" (
        echo    Copiando .env.example a .env...
        copy .env.example .env >nul
        echo    OK: Archivo .env creado desde .env.example
    ) else (
        echo    Creando archivo .env...
        echo # Configuracion de PostgreSQL> .env
        echo DB_HOST=localhost>> .env
        echo DB_PORT=5432>> .env
        echo DB_NAME=panel_waze>> .env
        echo DB_USER=postgres>> .env
        echo DB_PASSWORD=CASISA>> .env
        echo.>> .env
        echo # Configuracion del servidor>> .env
        echo NODE_ENV=development>> .env
        echo PORT=3002>> .env
        echo REDIS_HOST=localhost>> .env
        echo REDIS_PORT=6379>> .env
        echo    OK: Archivo .env creado
    )
    echo    NOTA: Revisa apps\backend\.env si necesitas cambiar contrasena o puerto
) else (
    echo    OK: Archivo .env ya existe
)
echo.

:: ============================================
:: PASO 4: Verificar e iniciar PostgreSQL
:: ============================================
echo [4/6] Verificando PostgreSQL...
set POSTGRES_READY=0

:: Verificar Docker primero
where docker >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    docker ps >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo    Docker esta disponible
        docker ps --filter "name=postgres" --format "{{.Names}}" | findstr /C:"postgres" >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo    OK: PostgreSQL en Docker ya esta corriendo
            set POSTGRES_READY=1
        ) else (
            echo    Iniciando PostgreSQL con Docker...
            cd /d "%ROOT%"
            docker-compose --profile dev up -d postgres >nul 2>&1
            if !ERRORLEVEL! EQU 0 (
                echo    OK: PostgreSQL iniciado en Docker
                echo    Esperando que PostgreSQL este listo...
                timeout /t 5 /nobreak >nul
                set POSTGRES_READY=1
            ) else (
                echo    ADVERTENCIA: No se pudo iniciar PostgreSQL en Docker
            )
        )
    ) else (
        echo    ADVERTENCIA: Docker no esta corriendo
    )
) else (
    echo    Docker no disponible, verificando PostgreSQL local...
)

:: Si Docker no funciona, verificar PostgreSQL local
if !POSTGRES_READY! EQU 0 (
    where psql >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo    PostgreSQL local detectado
        echo    Verificando conexion...
        :: Leer contraseña del .env si existe, sino usar CASISA por defecto
        set DB_PASSWORD=CASISA
        if exist "%ROOT%\apps\backend\.env" (
            for /f "tokens=2 delims==" %%a in ('findstr /C:"DB_PASSWORD" "%ROOT%\apps\backend\.env" 2^>nul') do (
                set DB_PASSWORD=%%a
            )
        )
        set PGPASSWORD=!DB_PASSWORD!
        psql -U postgres -h localhost -p 5432 -d postgres -c "SELECT 1;" >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo    OK: PostgreSQL local esta corriendo
            set POSTGRES_READY=1
        ) else (
            echo    ADVERTENCIA: PostgreSQL local no responde
            echo    Intentando iniciar el servicio...
            net start postgresql-x64-16 >nul 2>&1
            if !ERRORLEVEL! EQU 0 (
                echo    OK: Servicio de PostgreSQL iniciado
                timeout /t 3 /nobreak >nul
                set POSTGRES_READY=1
            ) else (
                net start postgresql-x64-15 >nul 2>&1
                if !ERRORLEVEL! EQU 0 (
                    echo    OK: Servicio de PostgreSQL iniciado
                    timeout /t 3 /nobreak >nul
                    set POSTGRES_READY=1
                )
            )
        )
    ) else (
        echo    ERROR: PostgreSQL no esta instalado
        echo.
        echo    OPCIONES:
        echo    1. Instalar Docker Desktop: https://www.docker.com/products/docker-desktop
        echo    2. Instalar PostgreSQL local: https://www.postgresql.org/download/windows/
        echo.
        echo    Despues de instalar, ejecuta este script nuevamente
    )
)
echo.

:: ============================================
:: PASO 5: Configurar base de datos
:: ============================================
if !POSTGRES_READY! EQU 1 (
    echo [5/6] Configurando base de datos...

    where psql >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        :: Leer contraseña del .env si existe, sino usar CASISA por defecto
        set DB_PASSWORD=CASISA
        if exist "%ROOT%\apps\backend\.env" (
            for /f "tokens=2 delims==" %%a in ('findstr /C:"DB_PASSWORD" "%ROOT%\apps\backend\.env" 2^>nul') do (
                set DB_PASSWORD=%%a
            )
        )
        set PGPASSWORD=!DB_PASSWORD!
        echo    Verificando base de datos "panel_waze"...
        psql -U postgres -h localhost -p 5432 -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='panel_waze'" 2>nul | findstr /C:"1" >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo    OK: Base de datos "panel_waze" ya existe
        ) else (
            echo    Creando base de datos "panel_waze"...
            psql -U postgres -h localhost -p 5432 -d postgres -c "CREATE DATABASE panel_waze;" >nul 2>&1
            if !ERRORLEVEL! EQU 0 (
                echo    OK: Base de datos creada
            ) else (
                echo    ADVERTENCIA: No se pudo crear la base de datos
            )
        )

        echo    Ejecutando schema inicial...
        cd /d "%ROOT%\apps\backend"
        if exist "src\database\schema.sql" (
            psql -U postgres -h localhost -p 5432 -d panel_waze -f "src\database\schema.sql" >nul 2>&1
            if !ERRORLEVEL! EQU 0 (
                echo    OK: Schema ejecutado
            ) else (
                echo    ADVERTENCIA: Algunos errores al ejecutar el schema
            )
        ) else (
            echo    ADVERTENCIA: Archivo schema.sql no encontrado
        )
        echo    Ejecutando migraciones...
        cd /d "%ROOT%"
        call npm run db:migrate >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo    OK: Migraciones ejecutadas
        ) else (
            echo    ADVERTENCIA: Revisa migraciones manualmente con: npm run db:migrate
        )
    ) else (
        echo    ADVERTENCIA: psql no disponible, saltando configuracion de BD
    )
) else (
    echo [5/6] Saltando configuracion de base de datos - PostgreSQL no disponible
)
echo.

:: ============================================
:: PASO 6: Verificar conexion
:: ============================================
echo [6/6] Verificando conexion a PostgreSQL...
cd /d "%ROOT%\apps\backend"
if exist "scripts\test-db-connection.ts" (
    echo    Ejecutando test de conexion...
    echo.
    call npx ts-node scripts/test-db-connection.ts
    if !ERRORLEVEL! EQU 0 (
        echo.
        echo    OK: Conexion exitosa
    ) else (
        echo.
        echo    ADVERTENCIA: Error en la conexion
    )
) else (
    echo    ADVERTENCIA: Script de prueba no encontrado
)
echo.

:: ============================================
:: RESUMEN FINAL
:: ============================================
echo ===============================================
echo   CONFIGURACION COMPLETADA
echo ===============================================
echo.
echo   Dependencias instaladas
echo   Archivo .env configurado
if !POSTGRES_READY! EQU 1 (
    echo   PostgreSQL configurado y listo
) else (
    echo   PostgreSQL: Requiere instalacion
)
echo.
echo   Proximos pasos:
if !POSTGRES_READY! EQU 1 (
    echo   1. Inicia el proyecto con: start-all.bat
    echo.
    echo   O desde la raiz del proyecto:
    echo   - Todo:     npm run dev:all
    echo   - Backend:  npm run dev:backend
    echo   - Frontend: npm run dev
) else (
    echo   1. Instala PostgreSQL (Docker o local)
    echo   2. Ejecuta este script nuevamente
    echo   3. Luego inicia con: start-all.bat
)
echo.
echo ===============================================
echo.
pause
endlocal
