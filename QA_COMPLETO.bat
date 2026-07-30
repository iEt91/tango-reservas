@echo off
setlocal
cd /d "%~dp0"

if not exist "package.json" (
  echo.
  echo ERROR: Ejecuta este archivo desde la raiz de tango-reservas.
  echo.
  pause
  exit /b 1
)

call npx tsc --noEmit
if errorlevel 1 goto error

call npm run test:availability
if errorlevel 1 goto error

call npm run build
if errorlevel 1 goto error

echo.
echo ========================================
echo QA TECNICO COMPLETO: TODO CORRECTO
echo ========================================
echo.
pause
exit /b 0

:error
echo.
echo ========================================
echo QA DETENIDO: REVISA EL ERROR ANTERIOR
echo ========================================
echo.
pause
exit /b 1
