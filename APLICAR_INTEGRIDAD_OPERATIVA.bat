@echo off
setlocal
cd /d "%~dp0"

if not exist "src\app\local\menu" (
  echo.
  echo ERROR: Extrae este ZIP dentro de la carpeta raiz de tango-reservas.
  echo Deben quedar juntos este BAT, la carpeta archivos y la carpeta src del proyecto.
  echo.
  pause
  exit /b 1
)

if not exist "archivos\src" (
  echo.
  echo ERROR: No se encontro la carpeta archivos del paquete.
  echo.
  pause
  exit /b 1
)

echo Aplicando correcciones de integridad operativa...
xcopy /E /I /Y "archivos\src" "src" >nul

if errorlevel 1 (
  echo.
  echo ERROR: No se pudieron copiar los archivos.
  echo.
  pause
  exit /b 1
)

rmdir /S /Q "archivos"

echo.
echo Archivos aplicados correctamente.
echo El instalador y la carpeta temporal se eliminaran al cerrar esta ventana.
echo.
pause

start "" /B cmd /C "ping 127.0.0.1 -n 2 >nul & del /F /Q \"%~f0\""
exit /b 0
