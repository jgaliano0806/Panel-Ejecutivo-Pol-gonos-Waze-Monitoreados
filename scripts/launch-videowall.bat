@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ============================================
REM  Lanzar Panel Waze en modo Videowall/Kiosk
REM  Audio TTS habilitado sin interaccion
REM ============================================

REM Detectar IP de red local automaticamente
set "LOCAL_IP="
set "PANEL_URL=http://localhost:5180"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4"') do (
    set "temp=%%a"
    set "temp=!temp: =!"
    if "!LOCAL_IP!"=="" (
        echo !temp! | findstr /C:"192.168" >nul 2>&1
        if !ERRORLEVEL! EQU 0 set "LOCAL_IP=!temp!"
    )
)
if not "!LOCAL_IP!"=="" (
    set "PANEL_URL=http://!LOCAL_IP!:5180"
)

REM Buscar Chrome en ubicaciones comunes
set CHROME_PATH=
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
)
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set CHROME_PATH="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)

REM Buscar Edge como alternativa
if "%CHROME_PATH%"=="" (
    if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
        set CHROME_PATH="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
        echo Usando Microsoft Edge como navegador...
    )
)

if "%CHROME_PATH%"=="" (
    echo ERROR: No se encontro Google Chrome ni Microsoft Edge
    pause
    exit /b 1
)

echo ===============================================
echo   PANEL WAZE - MODO VIDEOWALL
echo ===============================================
echo.
echo   URL: %PANEL_URL%
echo.
echo   Flags:
echo   - Audio habilitado sin interaccion del usuario
echo   - Pantalla completa (kiosk)
echo   - Sin barras de info/error
echo.
echo   Para salir: Alt+F4
echo ===============================================
echo.

%CHROME_PATH% ^
    --autoplay-policy=no-user-gesture-required ^
    --start-fullscreen ^
    --disable-infobars ^
    --disable-session-crashed-bubble ^
    --noerrdialogs ^
    --kiosk ^
    %PANEL_URL%

endlocal
