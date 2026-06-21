@echo off
setlocal

cd /d "%~dp0"

if not exist "node_modules\" (
  npm install
)

npm run tauri:build

if exist "auto-orcamento.exe" (
  start "" "%~dp0auto-orcamento.exe"
)
