@echo off
setlocal
cd /d "%~dp0"

if not exist "package.json" (
  echo.
  echo ERROR: Extrae este ZIP en la carpeta raiz de tango-reservas.
  echo Debe quedar junto al archivo package.json.
  echo.
  pause
  exit /b 1
)

if not exist "archivos\src\app\local\reportes\page.tsx" (
  echo.
  echo ERROR: No se encontro el archivo incluido en el paquete.
  echo.
  pause
  exit /b 1
)

if not exist "src\app\local\reportes" mkdir "src\app\local\reportes"
copy /Y "archivos\src\app\local\reportes\page.tsx" "src\app\local\reportes\page.tsx" >nul

echo.
echo Rentabilidad por productos aplicada correctamente.
echo Ahora ejecuta QA_COMPLETO.bat.
echo.
pause
