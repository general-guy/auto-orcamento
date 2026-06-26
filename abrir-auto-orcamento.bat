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

where pythonw >nul 2>&1
if errorlevel 1 (
  echo pythonw nao encontrado. Abrindo pelo Chrome/Edge...
  node launch-app.js
  exit /b %ERRORLEVEL%
)

pythonw "%~dp0native_launcher.py"
if errorlevel 1 (
  echo.
  echo O launcher nativo falhou. Verifique:
  echo python -m pip install -r requirements.txt
  echo.
  echo Para ver o erro no terminal, rode:
  echo python native_launcher.py
  echo.
  echo Tentando Chrome/Edge como alternativa...
  node launch-app.js
)

exit /b %ERRORLEVEL%
