@echo off
chcp 65001 >nul
title Rotacao de angulos - Anki (PCAL 2.0)
cd /d "%~dp0"
node anki-rotacao.mjs
echo.
pause
