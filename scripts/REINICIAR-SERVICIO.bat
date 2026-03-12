@echo off
chcp 65001 >nul
title Reiniciar PanelWazeBackend

echo.
echo ================================================
echo  Reiniciando servicio PanelWazeBackend...
echo ================================================
echo.

C:\ProgramData\chocolatey\lib\NSSM\tools\nssm.exe stop PanelWazeBackend
timeout /t 3 /nobreak >nul
C:\ProgramData\chocolatey\lib\NSSM\tools\nssm.exe set PanelWazeBackend Application        "C:\Program Files\nodejs\node.exe"
C:\ProgramData\chocolatey\lib\NSSM\tools\nssm.exe set PanelWazeBackend AppParameters      "dist\server.js"
C:\ProgramData\chocolatey\lib\NSSM\tools\nssm.exe set PanelWazeBackend AppDirectory       "D:\PanelWaze\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados\apps\backend"
C:\ProgramData\chocolatey\lib\NSSM\tools\nssm.exe set PanelWazeBackend AppEnvironmentExtra "NODE_ENV=production" "PORT=3002"
C:\ProgramData\chocolatey\lib\NSSM\tools\nssm.exe set PanelWazeBackend AppStdout          "D:\PanelWaze\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados\logs\backend-stdout.log"
C:\ProgramData\chocolatey\lib\NSSM\tools\nssm.exe set PanelWazeBackend AppStderr          "D:\PanelWaze\Panel-Ejecutivo-Pol-gonos-Waze-Monitoreados\logs\backend-stderr.log"
C:\ProgramData\chocolatey\lib\NSSM\tools\nssm.exe set PanelWazeBackend AppRotateFiles     1
C:\ProgramData\chocolatey\lib\NSSM\tools\nssm.exe set PanelWazeBackend AppRestartDelay    5000
C:\ProgramData\chocolatey\lib\NSSM\tools\nssm.exe start PanelWazeBackend

echo.
echo Esperando arranque...
timeout /t 10 /nobreak >nul

echo.
echo Verificando health...
curl -s http://localhost:3002/health

echo.
echo ================================================
echo  Listo. Frontend: http://10.1.0.136:5180
echo          Backend: http://10.1.0.136:3002/health
echo ================================================
echo.
pause
