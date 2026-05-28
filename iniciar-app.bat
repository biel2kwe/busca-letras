@echo off
cd /d "%~dp0"
echo Iniciando Busca Letras...
echo Acesse http://localhost:4173
echo Feche esta janela para encerrar o app.
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:4173'"
node server.js
