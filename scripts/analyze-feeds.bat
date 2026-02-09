@echo off
echo ========================================
echo ANALISIS DE FEEDS DE WAZE
echo ========================================
echo.

:: Navegar al directorio del script y luego al root
for %%I in ("%~dp0.") do set "ROOT=%%~fI"
cd /d "%ROOT%\apps\backend"

:: Verificar si existe el script
if exist "scripts\analyze_feeds.js" (
    node scripts\analyze_feeds.js
) else if exist "dist\scripts\analyze_feeds.js" (
    node dist\scripts\analyze_feeds.js
) else (
    echo ERROR: Script analyze_feeds.js no encontrado
    echo Ejecuta primero: npm run build
)

pause
