@echo off
setlocal
cd /d "%~dp0"

if not exist "archivos\src\app\[slug]\page.tsx" (
  echo ERROR: No se encontro el archivo de la solucion.
  pause
  exit /b 1
)

if not exist "src\app\[slug]" mkdir "src\app\[slug]"
copy /Y "archivos\src\app\[slug]\page.tsx" "src\app\[slug]\page.tsx" >nul

if errorlevel 1 (
  echo ERROR: No se pudo aplicar la correccion.
  pause
  exit /b 1
)

rmdir /S /Q "archivos"
echo Correccion aplicada correctamente.
start "" cmd /c "timeout /t 2 /nobreak ^>nul ^& del /f /q \"%~f0\""
endlocal
exit /b 0
