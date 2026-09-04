$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$LogPath = Join-Path $RepoRoot "Z_E42_REINTENTO_V3_CONSOLA.txt"
$TranscriptStarted = $false
$ExitCode = 1

try {
    Start-Transcript -Path $LogPath -Force | Out-Null
    $TranscriptStarted = $true

    $HelperPath = Join-Path $PSScriptRoot "aplicar-e42.mjs"
    $ExpectedHead = "53d3fed31225a4b2eea1585acd7dbfc2f088719a"
    $ReservationsPath = "src/app/local/reservas/v2-reservas-page.tsx"
    $HomePagePath = "src/app/local/v2-local-page.tsx"

    function Run-Native {
        param(
            [string]$Label,
            [string]$Command,
            [string[]]$Arguments
        )

        Write-Host ""
        Write-Host "----------------------------------------------------"
        Write-Host $Label
        Write-Host "----------------------------------------------------"

        & $Command @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "$Label fallo con codigo $LASTEXITCODE."
        }
    }

    function Has-Marker {
        param([string]$Path, [string]$Marker)
        $Text = Get-Content -LiteralPath $Path -Raw -Encoding UTF8
        return $Text.Contains($Marker)
    }

    Write-Host "===================================================="
    Write-Host "  TANGO RESERVAS - E42 REINTENTO V3"
    Write-Host "===================================================="
    Write-Host "Salida en tiempo real + log persistente."
    Write-Host "Sin pausas durante la ejecucion."
    Write-Host ""

    if (-not (Test-Path ".git")) { throw "El BAT no esta en la raiz del repositorio." }
    if (-not (Test-Path $ReservationsPath)) { throw "Falta $ReservationsPath." }
    if (-not (Test-Path $HomePagePath)) { throw "Falta $HomePagePath." }

    $Head = (git rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0) { throw "No se pudo leer HEAD." }

    Write-Host "HEAD actual:   $Head"
    Write-Host "HEAD esperado: $ExpectedHead"

    if ($Head -ne $ExpectedHead) {
        throw "HEAD inesperado. No se modifica nada."
    }

    Run-Native "ACTUALIZANDO origin/main" "git" @("fetch", "origin", "main")

    $Remote = (git rev-parse origin/main).Trim()
    Write-Host "origin/main:   $Remote"

    if ($Remote -ne $ExpectedHead) {
        throw "origin/main cambio. No se modifica nada."
    }

    git diff --cached --quiet --
    if ($LASTEXITCODE -ne 0) {
        git diff --cached --name-status
        throw "Hay archivos staged."
    }
    Write-Host "[OK] Cero staged."

    $HasE41 = Has-Marker $ReservationsPath "/* E41_RESERVAS_VISUAL */"
    $ReservationsHasE42 = Has-Marker $ReservationsPath "/* E42_INICIO_RESERVAS_PULIDO */"
    $HomeHasE42 = Has-Marker $HomePagePath "/* E42_INICIO_RESERVAS_PULIDO */"

    Write-Host "E41 en Reservas: $HasE41"
    Write-Host "E42 en Reservas: $ReservationsHasE42"
    Write-Host "E42 en Inicio:   $HomeHasE42"
    Write-Host ""

    if (-not $HasE41) {
        throw "No se detecta E41 en Reservas."
    }

    if ($ReservationsHasE42 -xor $HomeHasE42) {
        throw "E42 aparece aplicado solo parcialmente. No se continuara automaticamente."
    }

    if (-not $ReservationsHasE42 -and -not $HomeHasE42) {
        $TrackedBefore = @(git diff --name-only)

        if ($TrackedBefore.Count -ne 1 -or $TrackedBefore[0] -ne $ReservationsPath) {
            Write-Host "Cambios tracked actuales:"
            git diff --name-status
            throw "Para aplicar E42 desde cero debe existir solamente el cambio E41 de Reservas."
        }

        if (-not (Test-Path $HelperPath)) {
            throw "Falta el helper E42 para aplicar el cambio."
        }

        Write-Host "[OK] E42 aun no estaba aplicado. Se aplicara ahora."
        Run-Native "APLICANDO E42" "node" @($HelperPath)
    }
    else {
        Write-Host "[OK] E42 ya estaba aplicado completamente. No se vuelve a modificar codigo."
    }

    $TrackedAfter = @(git diff --name-only | Sort-Object)
    $ExpectedAfter = @($HomePagePath, $ReservationsPath) | Sort-Object

    if ($TrackedAfter.Count -ne 2 -or (Compare-Object $TrackedAfter $ExpectedAfter)) {
        Write-Host "Cambios tracked actuales:"
        git diff --name-status
        throw "El alcance tracked no coincide con Inicio + Reservas."
    }

    if (-not (Has-Marker $ReservationsPath "/* E42_INICIO_RESERVAS_PULIDO */")) {
        throw "Falta marca E42 en Reservas."
    }

    if (-not (Has-Marker $HomePagePath "/* E42_INICIO_RESERVAS_PULIDO */")) {
        throw "Falta marca E42 en Inicio."
    }

    Write-Host "[OK] Alcance E42 exacto: Inicio + Reservas."

    if (Test-Path $HelperPath) {
        Remove-Item -LiteralPath $HelperPath -Force
        Write-Host "[OK] Helper JS retirado antes del QA."
    }

    Run-Native "ESLINT ACOTADO" "cmd.exe" @("/c", "npx eslint src/app/local/reservas/v2-reservas-page.tsx src/app/local/v2-local-page.tsx --max-warnings=0")
    Run-Native "TYPESCRIPT" "cmd.exe" @("/c", "npx tsc --noEmit")
    Run-Native "REGRESION E36" "cmd.exe" @("/c", "npm run test:e36-ui-polish")
    Run-Native "REGRESION RESERVAS UI" "cmd.exe" @("/c", "npm run test:reservations-ui-cutover")
    Run-Native "GIT DIFF CHECK" "git" @("diff", "--check")

    Write-Host ""
    Write-Host "----------------------------------------------------"
    Write-Host "DIFF E42"
    Write-Host "----------------------------------------------------"
    git diff -- $ReservationsPath $HomePagePath

    Run-Native "QA COMPLETO" "cmd.exe" @("/c", "npm run qa")

    Write-Host ""
    Write-Host "----------------------------------------------------"
    Write-Host "ESTADO FINAL"
    Write-Host "----------------------------------------------------"
    git status --short --branch

    git diff --cached --quiet --
    if ($LASTEXITCODE -ne 0) {
        throw "Hay staged inesperado al finalizar."
    }

    Write-Host ""
    Write-Host "[OK] Cero staged."
    Write-Host "===================================================="
    Write-Host "  E42 - QA COMPLETO: OK"
    Write-Host "===================================================="

    $ExitCode = 0
}
catch {
    Write-Host ""
    Write-Host "===================================================="
    Write-Host "  E42 DETENIDO"
    Write-Host "===================================================="
    Write-Host "[ERROR] $($_.Exception.Message)"
    Write-Host ""
    Write-Host "Estado actual:"
    git status --short --branch
    $ExitCode = 1
}
finally {
    if ($TranscriptStarted) {
        try { Stop-Transcript | Out-Null } catch {}
    }
}

exit $ExitCode
