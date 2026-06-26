@echo off
setlocal

if /I not "%~1"=="__hidden__" (
  wscript.exe //nologo "%~dp0launch-hidden.vbs" "%~f0"
  exit /b 0
)

cd /d "%~dp0"

if not exist "node_modules\" (
  npm install
)

rem Libera a porta 3000 se um servidor antigo ficou preso.
node -e "require('./port-utils').freeTcpPortSync(3000)" >nul 2>&1

rem Node sobe em paralelo enquanto o Python/WebView2 arrancam.
start "" /B node server.js

where pythonw >nul 2>&1
if errorlevel 1 (
  node launch-app.js --external-server
  exit /b %ERRORLEVEL%
)

pythonw "%~dp0native_launcher.py" --external-server
if errorlevel 1 (
  node launch-app.js --external-server
)

exit /b %ERRORLEVEL%
