@echo off
rem Abre a janelinha de rotacao de angulos (Anki aberto). Custo de token: zero.
start "" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0rotacao-gui.ps1"
