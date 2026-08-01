@echo off
setlocal

cd /d "%~dp0"

if not exist "package.json" (
  echo.
  echo ERROR: Extrae este ZIP dentro de la carpeta raiz de tango-reservas.
  echo El instalador debe quedar al lado del package.json del proyecto.
  echo.
  pause
  exit /b 1
)

if not exist "archivos\package.json" (
  echo.
  echo ERROR: No se encontro la carpeta archivos del paquete.
  echo.
  pause
  exit /b 1
)

echo Aplicando actualizacion segura del tracking publico...
xcopy "archivos\*" "." /E /I /Y /Q >nul

if errorlevel 1 (
  echo.
  echo ERROR: No se pudieron copiar todos los archivos.
  echo La carpeta archivos se conserva para evitar perder el paquete.
  echo.
  pause
  exit /b 1
)

rmdir /S /Q "archivos"

echo.
echo Actualizacion aplicada correctamente.
echo Este instalador y la carpeta temporal se eliminaran ahora.
echo.

start "" /B cmd /C "timeout /T 1 /NOBREAK >nul & del /F /Q \"%~f0\""
exit /b 0
