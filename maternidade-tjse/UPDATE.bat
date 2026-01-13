@echo off
setlocal

set SCRIPT_DIR=%~dp0
set APP_DIR=%SCRIPT_DIR%

echo Atualizando do GitHub...
cd /d "%APP_DIR%"
set ELECTRON_RUN_AS_NODE=
git pull origin main
if errorlevel 1 exit /b 1

echo Instalando dependencias...
npm install
if errorlevel 1 exit /b 1

echo Reiniciando app...
for /f "tokens=2 delims=," %%A in ('tasklist /fi "imagename eq electron.exe" /fo csv /nh') do (
  for %%B in (%%A) do taskkill /f /pid %%B >nul 2>&1
)

npm start
exit /b 0
