@echo off
setlocal

cd /d "%~dp0"

start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 1; Start-Process 'http://localhost:3000'"
npm start
