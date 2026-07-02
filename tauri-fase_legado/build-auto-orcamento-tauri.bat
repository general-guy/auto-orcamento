@echo off
setlocal

cd /d "%~dp0\.."

if not exist "node_modules\" (
  npm install
)

npm run tauri:build

if exist "%~dp0auto-orcamento.exe" (
  start "" "%~dp0auto-orcamento.exe"
)

exit /b %ERRORLEVEL%
