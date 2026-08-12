@echo off
if /i not "%~1"=="__KEEP_OPEN__" (
  start "TANGO RESERVAS - DEMO DEMURU" cmd.exe /d /k ""%~f0" __KEEP_OPEN__"
  exit /b
)
setlocal EnableExtensions
cd /d "%~dp0"
title TANGO RESERVAS - DEMO DEMURU

cls
echo ====================================================
echo   TANGO RESERVAS - DEMO PERFECTA DEMURU
echo ====================================================
echo.
echo Verificando consistencia de la demo contra la fecha actual.
echo El servidor se inicia siempre con Data Source local.
echo.
echo No modifica Supabase.
echo No aplica migraciones.
echo No ejecuta staging.
echo No hace commit ni push.
echo.

if not exist "package.json" goto :wrong_root
if not exist "scripts\demuru-demo-doctor.mjs" goto :missing
if not exist "scripts\start-demuru-demo.mjs" goto :missing

echo ----------------------------------------------------
echo Doctor de Demo Demuru
echo ----------------------------------------------------
call npm run demo:doctor
if errorlevel 1 goto :fail

echo.
echo ----------------------------------------------------
echo Iniciando Next.js y abriendo Demuru
echo ----------------------------------------------------
call npm run demo:start
if errorlevel 1 goto :fail

echo.
echo El servidor de demo finalizo.
goto :finish

:wrong_root
echo ERROR: Ejecuta INICIAR_DEMO_DEMURU.bat desde la raiz del repositorio.
goto :fail

:missing
echo ERROR: Faltan los scripts de Demo Perfecta E35C.
goto :fail

:fail
echo.
echo ====================================================
echo   DEMO DEMURU - NO INICIADA
echo ====================================================
echo.
echo Revisa el error anterior antes de presentar la demo.

:finish
echo.
echo Esta ventana NO se cerrara automaticamente.
echo Para cerrarla, usa la X.
echo.
:hold
pause
goto :hold
