@echo off
setlocal
cd /d "%~dp0"

if not exist "package.json" (
  echo ERROR: Extrae este ZIP en la carpeta raiz de tango-reservas.
  pause
  exit /b 1
)

if not exist "archivos" (
  echo ERROR: No se encontro la carpeta archivos.
  pause
  exit /b 1
)

echo Aplicando correccion de modales e imagenes...
xcopy "archivos\*" "." /E /I /Y >nul
if errorlevel 1 (
  echo ERROR: No se pudieron copiar los archivos.
  pause
  exit /b 1
)

rmdir /S /Q "archivos"
echo Correccion aplicada correctamente.

start "" /b cmd /c "timeout /t 1 /nobreak >nul ^& del /f /q \"%~f0\""
exit /b 0
