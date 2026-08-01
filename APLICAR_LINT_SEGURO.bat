@echo off
setlocal
cd /d "%~dp0"

if not exist "archivos\src\app\local\caja\page.tsx" (
  echo ERROR: No se encontro la carpeta archivos o esta incompleta.
  pause
  exit /b 1
)

echo Aplicando limpieza tecnica segura...
xcopy "archivos\*" "." /E /I /Y >nul
if errorlevel 1 (
  echo ERROR: No se pudieron copiar todos los archivos.
  echo La carpeta archivos se conserva para que nada se pierda.
  pause
  exit /b 1
)

rmdir /S /Q "archivos"
echo Cambios aplicados correctamente.
echo Este instalador se eliminara automaticamente.
start "" /B cmd /C "timeout /t 1 /nobreak ^>nul ^& del /Q ""%~f0"""
endlocal
