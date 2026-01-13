@echo off
setlocal

set SCRIPT_DIR=%~dp0
set APP_DIR=%SCRIPT_DIR%

if /I "%1"=="start" goto start
if /I "%1"=="update" goto update
if /I "%1"=="stop" goto stop

echo Uso: maternidade start^|update^|stop
exit /b 1

:stop
echo Encerrando processos do Electron do Maternidade...
for /f "tokens=2 delims=," %%A in ('tasklist /fi "imagename eq electron.exe" /fo csv /nh') do (
  for %%B in (%%A) do taskkill /f /pid %%B >nul 2>&1
)
exit /b 0

:start
cd /d "%APP_DIR%"
set ELECTRON_RUN_AS_NODE=
npm start
exit /b 0

:update
cd /d "%APP_DIR%"
set ELECTRON_RUN_AS_NODE=
echo Atualizando do GitHub...
git pull origin main
if errorlevel 1 exit /b 1
npm install
if errorlevel 1 exit /b 1
echo Reiniciando...
call "%~f0" stop
call "%~f0" start
exit /b 0
