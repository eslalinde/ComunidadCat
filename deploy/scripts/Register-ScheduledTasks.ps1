#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Registra tareas programadas de Windows para ComunidadCat.

.DESCRIPTION
    Ejecutar UNA SOLA VEZ como Administrador. Registra:
    - Startup: al iniciar sesion del usuario
    - Daily Backup: diario a las 2:00 AM (con StartWhenAvailable y WakeToRun)
    - Health Check: cada 15 minutos

.PARAMETER InstallDir
    Directorio de instalacion. Default: C:\ComunidadCat

.PARAMETER Unregister
    Si se especifica, elimina las tareas en lugar de registrarlas.
#>

param(
    [string]$InstallDir = "C:\ComunidadCat",
    [switch]$Unregister
)

$ErrorActionPreference = "Stop"

$taskFolder = "ComunidadCat"
$scriptsDir = "$InstallDir\scripts"
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

function Write-Step {
    param([string]$Message)
    Write-Host "`n===> $Message" -ForegroundColor Cyan
}

# ---------------------------------------------------------------------------
# Unregister mode
# ---------------------------------------------------------------------------
if ($Unregister) {
    Write-Step "Eliminando tareas programadas..."

    $tasks = @(
        "ComunidadCat - Startup",
        "ComunidadCat - Daily Backup",
        "ComunidadCat - Health Check"
    )

    foreach ($taskName in $tasks) {
        $existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        if ($existing) {
            Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
            Write-Host "  [OK] Eliminada: $taskName" -ForegroundColor Green
        } else {
            Write-Host "  No existe: $taskName" -ForegroundColor Gray
        }
    }

    Write-Host "`n[OK] Tareas eliminadas." -ForegroundColor Green
    exit 0
}

# ---------------------------------------------------------------------------
# Verify scripts exist
# ---------------------------------------------------------------------------
Write-Step "Verificando scripts..."

$requiredScripts = @(
    "Start-ComunidadCat.ps1",
    "Backup-ComunidadCat.ps1",
    "Check-Health.ps1"
)

foreach ($script in $requiredScripts) {
    $path = "$scriptsDir\$script"
    if (!(Test-Path $path)) {
        Write-Host "  [FAIL] No encontrado: $path" -ForegroundColor Red
        Write-Host "  Ejecute Install-Prerequisites.ps1 primero." -ForegroundColor Yellow
        exit 1
    }
    Write-Host "  [OK] $script" -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# 1. Startup task (al iniciar sesion)
# ---------------------------------------------------------------------------
Write-Step "Registrando tarea: ComunidadCat - Startup"

$taskName = "ComunidadCat - Startup"
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "  Tarea existente eliminada, re-registrando..."
}

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $currentUser
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptsDir\Start-ComunidadCat.ps1`"" `
    -WorkingDirectory $InstallDir
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

Register-ScheduledTask `
    -TaskName $taskName `
    -Trigger $trigger `
    -Action $action `
    -Settings $settings `
    -Description "Inicia Docker, Supabase y ComunidadCat al iniciar sesion" `
    -RunLevel Limited | Out-Null

Write-Host "  [OK] Registrada: $taskName" -ForegroundColor Green

# ---------------------------------------------------------------------------
# 2. Daily Backup (2:00 AM)
# ---------------------------------------------------------------------------
Write-Step "Registrando tarea: ComunidadCat - Daily Backup"

$taskName = "ComunidadCat - Daily Backup"
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

$trigger = New-ScheduledTaskTrigger -Daily -At "2:00AM"
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptsDir\Backup-ComunidadCat.ps1`"" `
    -WorkingDirectory $InstallDir
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -WakeToRun `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

Register-ScheduledTask `
    -TaskName $taskName `
    -Trigger $trigger `
    -Action $action `
    -Settings $settings `
    -Description "Backup diario de ComunidadCat a las 2:00 AM con almacenamiento local" `
    -RunLevel Limited | Out-Null

Write-Host "  [OK] Registrada: $taskName" -ForegroundColor Green

# ---------------------------------------------------------------------------
# 3. Health Check (cada 15 minutos)
# ---------------------------------------------------------------------------
Write-Step "Registrando tarea: ComunidadCat - Health Check"

$taskName = "ComunidadCat - Health Check"
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 15)
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptsDir\Check-Health.ps1`"" `
    -WorkingDirectory $InstallDir
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

Register-ScheduledTask `
    -TaskName $taskName `
    -Trigger $trigger `
    -Action $action `
    -Settings $settings `
    -Description "Monitoreo de salud de ComunidadCat cada 15 minutos" `
    -RunLevel Limited | Out-Null

Write-Host "  [OK] Registrada: $taskName" -ForegroundColor Green

# ---------------------------------------------------------------------------
# Resumen
# ---------------------------------------------------------------------------
Write-Host "`n" -NoNewline
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Tareas programadas registradas" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Tareas registradas:" -ForegroundColor White
Write-Host "  1. ComunidadCat - Startup       (al iniciar sesion)" -ForegroundColor White
Write-Host "  2. ComunidadCat - Daily Backup   (2:00 AM diario)" -ForegroundColor White
Write-Host "  3. ComunidadCat - Health Check   (cada 15 minutos)" -ForegroundColor White
Write-Host ""
Write-Host "Para verificar: Get-ScheduledTask | Where-Object TaskName -like 'ComunidadCat*'" -ForegroundColor Yellow
Write-Host "Para eliminar:  .\Register-ScheduledTasks.ps1 -Unregister" -ForegroundColor Yellow
Write-Host ""
