@echo off
setlocal

cd /d "%~dp0"

if not exist "node_modules\" (
  call npm install
)

node "%~dp0scripts\remote-access-host.js"
exit /b %ERRORLEVEL%
