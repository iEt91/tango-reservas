@echo off
setlocal
cd /d "%~dp0"

if not exist "archivos_actualizacion" (
  echo ERROR: No se encontro la carpeta archivos_actualizacion.
  pause
  exit /b 1
)

echo Aplicando regresiones automaticas de stock...
robocopy "archivos_actualizacion" "." /E /NFL /NDL /NJH /NJS /NC /NS >nul
if errorlevel 8 (
  echo ERROR: No se pudieron copiar los archivos.
  pause
  exit /b 1
)

rmdir /s /q "archivos_actualizacion"
echo Actualizacion aplicada correctamente.
echo Este instalador se eliminara automaticamente.
start "" /b cmd /c "timeout /t 1 /nobreak ^>nul ^& del /f /q ""%~f0"""
exit /b 0
