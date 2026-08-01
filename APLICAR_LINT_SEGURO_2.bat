@echo off
setlocal
cd /d "%~dp0"

if not exist "archivos" (
  echo ERROR: No se encontro la carpeta archivos.
  pause
  exit /b 1
)

echo Aplicando segunda limpieza segura de lint...
xcopy /E /I /Y "archivos\*" ".\" >nul
if errorlevel 1 (
  echo ERROR: No se pudieron copiar los archivos.
  pause
  exit /b 1
)

if exist "APLICAR_LINT_SEGURO.bat" del /F /Q "APLICAR_LINT_SEGURO.bat"
rmdir /S /Q "archivos"

echo Cambios aplicados correctamente.
echo Este instalador se eliminara al cerrar.
start "" /B cmd /C "ping 127.0.0.1 -n 2 >nul & del /F /Q \"%~f0\""
endlocal
exit /b 0
