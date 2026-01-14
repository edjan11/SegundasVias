@echo off
setlocal

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo Enviando para o GitHub...
git add -A
git commit -m "atualizacao"
git push
