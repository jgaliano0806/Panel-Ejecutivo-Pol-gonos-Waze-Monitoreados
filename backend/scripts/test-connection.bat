@echo off
chcp 65001 >nul
title Test PostgreSQL Connection

echo.
echo ===============================================
echo   PRUEBA DE CONEXION A POSTGRESQL
echo ===============================================
echo.

cd /d "%~dp0\.."

echo [1/3] Verificando dependencias...
if not exist "node_modules\pg" (
    echo ❌ pg no instalado. Instalando...
    call npm install
) else (
    echo ✅ Dependencias OK
)
echo.

echo [2/3] Verificando archivo .env...
if not exist ".env" (
    echo ⚠️  Archivo .env no encontrado
    echo    Creando desde .env.example...
    copy ".env.example" ".env" >nul
    echo    ✅ Archivo .env creado
    echo    ⚠️  IMPORTANTE: Edita .env con tus credenciales de PostgreSQL
    echo.
    pause
) else (
    echo ✅ Archivo .env encontrado
)
echo.

echo [3/3] Ejecutando prueba de conexion...
echo.
npx ts-node scripts/test-db-connection.ts

echo.
echo ===============================================
pause

