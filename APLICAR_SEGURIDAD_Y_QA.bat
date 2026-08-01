@echo off
setlocal
cd /d "%~dp0"

if not exist "archivos\package.json" goto :faltan_archivos
if not exist "archivos\package-lock.json" goto :faltan_archivos

copy /Y "archivos\package.json" "package.json" >nul || goto :error
copy /Y "archivos\package-lock.json" "package-lock.json" >nul || goto :error

del /Q "APLICAR_BLOQUES_STOCK_RESERVAS.bat" 2>nul
del /Q "APLICAR_REGRESIONES_STOCK.bat" 2>nul
del /Q "APLICAR_RESERVA_VISIBLE.bat" 2>nul
del /Q "APLICAR_TRACKING_REGRESIONES_V2.bat" 2>nul

rmdir /S /Q "archivos" || goto :error

echo.
echo Actualizacion aplicada correctamente.
echo Ya podes ejecutar: npm ci
echo Luego ejecuta: npm run qa
echo.
start "" /B cmd /C "timeout /t 1 /nobreak ^>nul ^& del /Q \"%~f0\""
exit /B 0

:faltan_archivos
echo ERROR: no se encontro la carpeta archivos completa.
pause
exit /B 1

:error
echo ERROR: no se pudo completar la actualizacion.
echo No hagas push y avisame con una captura de esta ventana.
pause
exit /B 1
