@echo off
setlocal

if /I not "%~1"=="__hidden__" (
  wscript.exe //nologo "%~dp0launcher\launch-hidden.vbs" "%~f0"
  exit /b 0
)

cd /d "%~dp0"

if not exist "node_modules\" (
  npm install
)

set AO_KEEP_SERVER=
node -e "process.exit(require('./server/port-utils').isPortInUseSync(3000)?0:1)" >nul 2>&1
if errorlevel 1 (
  rem Node sobe em paralelo enquanto o Python/WebView2 arrancam.
  rem A liberação da porta 3000 ocorre dentro de server/server.js (evita spawn extra de Node aqui).
  start "" /B node server\server.js
) else (
  rem Servidor já ativo (ex.: iniciar-acesso-remoto.bat) — só abre a janela.
  set AO_KEEP_SERVER=1
)

set LAUNCHER_ARGS=--external-server
if defined AO_KEEP_SERVER set LAUNCHER_ARGS=%LAUNCHER_ARGS% --keep-server

where pythonw >nul 2>&1
if errorlevel 1 (
  node launcher\launch-app.js %LAUNCHER_ARGS%
  exit /b %ERRORLEVEL%
)

pythonw "%~dp0launcher\native_launcher.py" %LAUNCHER_ARGS%
if errorlevel 1 (
  node launcher\launch-app.js %LAUNCHER_ARGS%
)

exit /b %ERRORLEVEL%
