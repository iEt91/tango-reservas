@echo off
setlocal EnableExtensions DisableDelayedExpansion
title TANGO RESERVAS - E45C CORRECCION
cd /d "%~dp0"

set "GIT_PAGER=cat"
set "PAGER=cat"
set "EXPECTED_HEAD=53d3fed31225a4b2eea1585acd7dbfc2f088719a"
set "LOG=%CD%\Z_E45C_CORRECCION_CONSOLA.txt"
set "HELPER=herramientas_e45c\aplicar-e45c.mjs"

set "TEST=scripts/e36-ui-polish-regression-tests.mjs"
set "ENVIOS=src/app/local/envios/v2-envios-page.tsx"
set "RESERVAS=src/app/local/reservas/v2-reservas-page.tsx"
set "INICIO=src/app/local/v2-local-page.tsx"
set "TABLE=src/components/v2/v2-data-table.tsx"
set "HEADER=src/components/v2/v2-page-header.tsx"

echo ====================================================
echo   TANGO RESERVAS - E45C CORRECCION
echo ====================================================
echo.
echo Corrige SOLO:
echo - Inicio: Caja queda intacta y las otras metricas igualan su altura
echo - Envios: Pedido seleccionado cierra con ESC
echo.
echo La salida completa se guardara en:
echo Z_E45C_CORRECCION_CONSOLA.txt
echo.
echo NO cierres esta ventana. Puede tardar varios minutos.
echo.

call :RUN > "%LOG%" 2>&1
set "RUN_RC=%ERRORLEVEL%"

if exist "herramientas_e45c" rmdir /s /q "herramientas_e45c"

echo.
echo ====================================================
if "%RUN_RC%"=="0" (
    echo   E45C - QA COMPLETO: OK
) else (
    echo   E45C - DETENIDO
)
echo ====================================================
echo.
echo Log: Z_E45C_CORRECCION_CONSOLA.txt
echo.
echo La ventana queda abierta.
echo Adjuntame el TXT y capturas de Inicio y Envios.
echo.
pause >nul
exit /b %RUN_RC%

:RUN
echo ====================================================
echo   E45C - APLICACION Y QA
echo ====================================================
echo Fecha/hora: %DATE% %TIME%
echo Carpeta: %CD%
echo.

if not exist ".git" exit /b 10
if not exist "%HELPER%" exit /b 11

for %%F in ("%TEST%" "%ENVIOS%" "%RESERVAS%" "%INICIO%" "%TABLE%" "%HEADER%") do (
    if not exist "%%~F" exit /b 12
)

for /f "delims=" %%H in ('git rev-parse HEAD 2^>nul') do set "HEAD_NOW=%%H"
echo HEAD actual:   %HEAD_NOW%
echo HEAD esperado: %EXPECTED_HEAD%

if /I not "%HEAD_NOW%"=="%EXPECTED_HEAD%" (
    echo [ERROR] HEAD inesperado.
    exit /b 13
)

git fetch origin main
if errorlevel 1 exit /b 14

for /f "delims=" %%H in ('git rev-parse origin/main 2^>nul') do set "REMOTE_NOW=%%H"
echo origin/main:   %REMOTE_NOW%

if /I not "%REMOTE_NOW%"=="%EXPECTED_HEAD%" (
    echo [ERROR] origin/main cambio.
    exit /b 15
)

git diff --cached --quiet --
if errorlevel 1 (
    echo [ERROR] Hay archivos staged.
    git diff --cached --name-status
    exit /b 16
)
echo [OK] Cero staged.
echo.

powershell -NoProfile -Command ^
  "$expected=@('scripts/e36-ui-polish-regression-tests.mjs','src/app/local/envios/v2-envios-page.tsx','src/app/local/reservas/v2-reservas-page.tsx','src/app/local/v2-local-page.tsx','src/components/v2/v2-data-table.tsx','src/components/v2/v2-page-header.tsx') | Sort-Object;" ^
  "$actual=@(git diff --name-only) | Sort-Object;" ^
  "if (($actual.Count -ne 6) -or (Compare-Object $actual $expected)) { exit 1 }"
if errorlevel 1 (
    echo [ERROR] El estado tracked previo no coincide con E45 V3 aprobado.
    git diff --name-status
    exit /b 17
)
echo [OK] Estado tracked previo exacto: E45 V3.
echo.

node -e "const fs=require('fs');const h=fs.readFileSync(process.argv[1],'utf8');const e=fs.readFileSync(process.argv[2],'utf8');const ok=h.includes('/* E45_PULIDO_VISUAL */')&&e.includes('/* E45_PULIDO_VISUAL */')&&!h.includes('/* E45C_CORRECCION */')&&!e.includes('/* E45C_CORRECCION */');process.exit(ok?0:1);" "%INICIO%" "%ENVIOS%"
if errorlevel 1 (
    echo [ERROR] Base E45 V3 inesperada o E45C ya aplicado.
    exit /b 18
)
echo [OK] Base E45 V3 detectada.
echo.

echo ----------------------------------------------------
echo APLICANDO E45C
echo ----------------------------------------------------
node "%HELPER%"
if errorlevel 1 (
    echo [ERROR] Aplicacion E45C fallo.
    exit /b 20
)
echo.

powershell -NoProfile -Command ^
  "$expected=@('scripts/e36-ui-polish-regression-tests.mjs','src/app/local/envios/v2-envios-page.tsx','src/app/local/reservas/v2-reservas-page.tsx','src/app/local/v2-local-page.tsx','src/components/v2/v2-data-table.tsx','src/components/v2/v2-page-header.tsx') | Sort-Object;" ^
  "$actual=@(git diff --name-only) | Sort-Object;" ^
  "if (($actual.Count -ne 6) -or (Compare-Object $actual $expected)) { exit 1 }"
if errorlevel 1 (
    echo [ERROR] E45C altero el alcance tracked.
    git diff --name-status
    exit /b 21
)
echo [OK] Alcance tracked preservado: 6 archivos.
echo.

echo ----------------------------------------------------
echo ESLINT ACOTADO
echo ----------------------------------------------------
call npx eslint "%INICIO%" "%ENVIOS%" --max-warnings=0
if errorlevel 1 exit /b 22
echo [OK] ESLint.
echo.

echo ----------------------------------------------------
echo TYPESCRIPT
echo ----------------------------------------------------
call npx tsc --noEmit
if errorlevel 1 exit /b 23
echo [OK] TypeScript.
echo.

echo ----------------------------------------------------
echo REGRESION E36
echo ----------------------------------------------------
call npm run test:e36-ui-polish
if errorlevel 1 exit /b 24
echo [OK] E36.
echo.

echo ----------------------------------------------------
echo REGRESION ENVIOS UI
echo ----------------------------------------------------
call npm run test:shipping-ui-cutover
if errorlevel 1 exit /b 25
echo [OK] Envios UI.
echo.

echo ----------------------------------------------------
echo GIT DIFF CHECK
echo ----------------------------------------------------
git diff --check
if errorlevel 1 exit /b 26
echo [OK] git diff --check.
echo.

echo ====================================================
echo   npm run qa COMPLETO
echo ====================================================
call npm run qa
set "QA_RC=%ERRORLEVEL%"
if not "%QA_RC%"=="0" (
    echo [ERROR] npm run qa fallo con codigo %QA_RC%.
    exit /b %QA_RC%
)

echo.
echo ----------------------------------------------------
echo ESTADO FINAL
echo ----------------------------------------------------
git status --short --branch
echo.

git diff --cached --quiet --
if errorlevel 1 exit /b 27

echo [OK] Cero staged.
echo ====================================================
echo   QA COMPLETO: OK
echo ====================================================
exit /b 0
