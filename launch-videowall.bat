@echo off
REM ============================================
REM  Lanzar Panel Waze en modo Videowall/Kiosk
REM  Audio TTS habilitado sin interaccion
REM ============================================

set PANEL_URL=http://localhost:5180
set CHROME=

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" set CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" set CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe

if not defined CHROME (
    echo ERROR: No se encontro Google Chrome
    pause
    exit /b 1
)

echo Lanzando Panel Waze en modo Videowall...
echo URL: %PANEL_URL%

start "" "%CHROME%" --autoplay-policy=no-user-gesture-required --start-fullscreen --disable-infobars --disable-session-crashed-bubble --noerrdialogs %PANEL_URL%
