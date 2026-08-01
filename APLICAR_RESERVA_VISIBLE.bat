@echo off
setlocal
cd /d "%~dp0"

if not exist "archivos_actualizacion" (
  echo ERROR: No se encontro la carpeta archivos_actualizacion.
  pause
  exit /b 1
)

robocopy "archivos_actualizacion" "." /E /R:2 /W:1 >nul
if errorlevel 8 (
  echo ERROR: No se pudieron copiar los archivos.
  pause
  exit /b 1
)

rmdir /S /Q "archivos_actualizacion"
echo Actualizacion aplicada correctamente.
echo Este instalador se eliminara automaticamente.
start "" /b cmd /c "timeout /t 1 /nobreak ^>nul ^& del /f /q ""%~f0"""
exit /b 0
