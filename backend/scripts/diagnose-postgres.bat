@echo off
chcp 65001 >nul
title Diagnóstico de PostgreSQL

echo.
echo ===============================================
echo   DIAGNÓSTICO DE CONEXIÓN A POSTGRESQL
echo ===============================================
echo.

cd /d "%~dp0\.."

echo [1/5] Verificando Docker...
where docker >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    ✅ Docker está instalado
    docker ps >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo    ✅ Docker está corriendo
        echo    🔍 Verificando contenedor PostgreSQL...
        docker ps --filter "name=postgres" --format "{{.Names}}" | findstr /C:"postgres" >nul 2>&1
        if %ERRORLEVEL% EQU 0 (
            echo    ✅ Contenedor PostgreSQL encontrado
            docker ps --filter "name=postgres" --format "Estado: {{.Status}}"
        ) else (
            echo    ⚠️  Contenedor PostgreSQL NO encontrado
            echo    💡 Solución: Ejecuta 'docker-compose --profile dev up -d postgres'
        )
    ) else (
        echo    ❌ Docker NO está corriendo
        echo    💡 Solución: Inicia Docker Desktop
    )
) else (
    echo    ❌ Docker NO está instalado
    echo    💡 Solución: Instala Docker Desktop desde https://www.docker.com/products/docker-desktop
)
echo.

echo [2/5] Verificando puerto 5432...
netstat -an | findstr ":5432" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    ✅ Puerto 5432 está en uso
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5432" ^| findstr "LISTENING"') do (
        echo    📊 Proceso PID: %%a
    )
) else (
    echo    ⚠️  Puerto 5432 NO está en uso
    echo    💡 Esto significa que PostgreSQL no está escuchando en este puerto
)
echo.

echo [3/5] Verificando servicios de PostgreSQL locales...
sc query type= service | findstr /I "postgres" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    ✅ Servicios de PostgreSQL encontrados
    sc query type= service | findstr /I "postgres"
) else (
    echo    ⚠️  No se encontraron servicios de PostgreSQL locales
)
echo.

echo [4/5] Verificando configuración .env...
if exist ".env" (
    echo    ✅ Archivo .env encontrado
    findstr /C:"DB_HOST" .env >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        for /f "tokens=2 delims==" %%a in ('findstr /C:"DB_HOST" .env') do echo    📊 DB_HOST: %%a
    )
    findstr /C:"DB_PORT" .env >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        for /f "tokens=2 delims==" %%a in ('findstr /C:"DB_PORT" .env') do echo    📊 DB_PORT: %%a
    )
) else (
    echo    ⚠️  Archivo .env NO encontrado
    echo    💡 Solución: Crea el archivo .env desde .env.example
)
echo.

echo [5/5] Intentando conexión de prueba...
if exist "scripts\test-db-connection.ts" (
    echo    🔍 Ejecutando test de conexión...
    echo.
    npx ts-node scripts/test-db-connection.ts
) else (
    echo    ⚠️  Script de prueba no encontrado
)
echo.

echo ===============================================
echo   RESUMEN Y RECOMENDACIONES
echo ===============================================
echo.

where docker >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ PROBLEMA PRINCIPAL: Docker no está instalado
    echo.
    echo SOLUCIONES:
    echo 1. Instalar Docker Desktop:
    echo    https://www.docker.com/products/docker-desktop
    echo.
    echo 2. O instalar PostgreSQL localmente:
    echo    https://www.postgresql.org/download/windows/
    echo.
) else (
    docker ps >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ PROBLEMA: Docker no está corriendo
        echo.
        echo SOLUCIÓN: Inicia Docker Desktop y espera a que esté listo
        echo.
    ) else (
        docker ps --filter "name=postgres" --format "{{.Names}}" | findstr /C:"postgres" >nul 2>&1
        if %ERRORLEVEL% NEQ 0 (
            echo ❌ PROBLEMA: Contenedor PostgreSQL no está corriendo
            echo.
            echo SOLUCIÓN: Ejecuta desde la raíz del proyecto:
            echo    docker-compose --profile dev up -d postgres
            echo.
        ) else (
            echo ✅ Todo parece estar configurado correctamente
            echo    Si aún tienes problemas, revisa los logs:
            echo    docker logs panel-waze-postgres
            echo.
        )
    )
)

echo ===============================================
echo.
pause

