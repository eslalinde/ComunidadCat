#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Instala los prerequisitos para ComunidadCat en una maquina Windows standalone.

.DESCRIPTION
    Ejecutar UNA SOLA VEZ como Administrador. Verifica e instala:
    - WSL2, Docker Desktop, Node.js LTS, Supabase CLI, rclone
    - Configura Docker Desktop (log rotation, auto-start)
    - Crea estructura de directorios y copia archivos de Supabase

.NOTES
    Requiere conexion a internet para descargar componentes.
    Reiniciar la maquina si se instala WSL2 por primera vez.
#>

param(
    [string]$InstallDir = "C:\ComunidadCat",
    [string]$SourceDir = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "`n===> $Message" -ForegroundColor Cyan
}

function Write-OK {
    param([string]$Message)
    Write-Host "  [OK] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "  [WARN] $Message" -ForegroundColor Yellow
}

function Write-Fail {
    param([string]$Message)
    Write-Host "  [FAIL] $Message" -ForegroundColor Red
}

# ---------------------------------------------------------------------------
# 1. Crear estructura de directorios
# ---------------------------------------------------------------------------
Write-Step "Creando estructura de directorios en $InstallDir"

$dirs = @(
    $InstallDir,
    "$InstallDir\logs",
    "$InstallDir\backups",
    "$InstallDir\scripts",
    "$InstallDir\supabase",
    "$InstallDir\rclone"
)

foreach ($dir in $dirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-OK "Creado: $dir"
    } else {
        Write-OK "Ya existe: $dir"
    }
}

# ---------------------------------------------------------------------------
# 2. Verificar/Instalar WSL2
# ---------------------------------------------------------------------------
Write-Step "Verificando WSL2"

$wslStatus = wsl --status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Warn "WSL2 no esta instalado. Instalando..."
    wsl --install --no-distribution
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Error instalando WSL2. Puede requerir reinicio."
        Write-Host "  Ejecute 'wsl --install --no-distribution' manualmente y reinicie." -ForegroundColor Yellow
        Write-Host "  Luego vuelva a ejecutar este script." -ForegroundColor Yellow
        exit 1
    }
    Write-Warn "WSL2 instalado. ES NECESARIO REINICIAR la maquina."
    Write-Warn "Despues del reinicio, vuelva a ejecutar este script."
    Read-Host "Presione Enter para continuar o Ctrl+C para cancelar"
} else {
    Write-OK "WSL2 esta instalado"
}

# ---------------------------------------------------------------------------
# 3. Verificar/Instalar Docker Desktop
# ---------------------------------------------------------------------------
Write-Step "Verificando Docker Desktop"

$dockerPath = Get-Command docker -ErrorAction SilentlyContinue
if (!$dockerPath) {
    Write-Warn "Docker no esta instalado. Intentando instalar via winget..."
    $wingetCheck = Get-Command winget -ErrorAction SilentlyContinue
    if ($wingetCheck) {
        winget install --id Docker.DockerDesktop --accept-package-agreements --accept-source-agreements
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "Error instalando Docker Desktop via winget."
            Write-Host "  Descargue manualmente desde: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
            exit 1
        }
        Write-OK "Docker Desktop instalado. Puede requerir reinicio."
    } else {
        Write-Fail "winget no disponible. Instale Docker Desktop manualmente."
        Write-Host "  Descargue desde: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-OK "Docker esta instalado: $($dockerPath.Source)"
}

# ---------------------------------------------------------------------------
# 4. Configurar Docker daemon.json (log rotation)
# ---------------------------------------------------------------------------
Write-Step "Configurando Docker log rotation"

$daemonJsonPath = "$env:USERPROFILE\.docker\daemon.json"
$daemonConfig = @{
    "log-driver" = "json-file"
    "log-opts" = @{
        "max-size" = "10m"
        "max-file" = "3"
    }
}

if (Test-Path $daemonJsonPath) {
    try {
        $existing = Get-Content $daemonJsonPath -Raw | ConvertFrom-Json
        if (!$existing."log-driver") {
            $existing | Add-Member -NotePropertyName "log-driver" -NotePropertyValue "json-file" -Force
            $existing | Add-Member -NotePropertyName "log-opts" -NotePropertyValue @{ "max-size" = "10m"; "max-file" = "3" } -Force
            $existing | ConvertTo-Json -Depth 5 | Set-Content $daemonJsonPath -Encoding UTF8
            Write-OK "Log rotation agregado a daemon.json existente"
        } else {
            Write-OK "daemon.json ya tiene configuracion de log-driver"
        }
    } catch {
        Write-Warn "No se pudo parsear daemon.json existente. Creando backup y reescribiendo."
        Copy-Item $daemonJsonPath "$daemonJsonPath.bak"
        $daemonConfig | ConvertTo-Json -Depth 5 | Set-Content $daemonJsonPath -Encoding UTF8
    }
} else {
    $dockerDir = Split-Path $daemonJsonPath
    if (!(Test-Path $dockerDir)) {
        New-Item -ItemType Directory -Path $dockerDir -Force | Out-Null
    }
    $daemonConfig | ConvertTo-Json -Depth 5 | Set-Content $daemonJsonPath -Encoding UTF8
    Write-OK "daemon.json creado con log rotation"
}

# ---------------------------------------------------------------------------
# 5. Verificar/Instalar Node.js
# ---------------------------------------------------------------------------
Write-Step "Verificando Node.js"

$nodePath = Get-Command node -ErrorAction SilentlyContinue
if (!$nodePath) {
    Write-Warn "Node.js no esta instalado. Instalando via winget..."
    $wingetCheck = Get-Command winget -ErrorAction SilentlyContinue
    if ($wingetCheck) {
        winget install --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "Error instalando Node.js. Instale manualmente desde https://nodejs.org/"
            exit 1
        }
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        Write-OK "Node.js instalado"
    } else {
        Write-Fail "winget no disponible. Instale Node.js LTS manualmente desde https://nodejs.org/"
        exit 1
    }
} else {
    $nodeVersion = node --version
    Write-OK "Node.js esta instalado: $nodeVersion"
}

# ---------------------------------------------------------------------------
# 6. Verificar/Instalar Supabase CLI
# ---------------------------------------------------------------------------
Write-Step "Verificando Supabase CLI"

$supabasePath = Get-Command supabase -ErrorAction SilentlyContinue
if (!$supabasePath) {
    Write-Warn "Supabase CLI no encontrado. Instalando via npm..."
    npm install -g supabase
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Error instalando Supabase CLI"
        exit 1
    }
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    Write-OK "Supabase CLI instalado"
} else {
    $supabaseVersion = supabase --version 2>&1
    Write-OK "Supabase CLI esta instalado: $supabaseVersion"
}

# ---------------------------------------------------------------------------
# 7. Instalar rclone (portable)
# ---------------------------------------------------------------------------
Write-Step "Verificando rclone"

$rclonePath = "$InstallDir\rclone\rclone.exe"
if (!(Test-Path $rclonePath)) {
    Write-Warn "rclone no encontrado. Descargando version portable..."
    $rcloneZip = "$env:TEMP\rclone.zip"
    $rcloneUrl = "https://downloads.rclone.org/rclone-current-windows-amd64.zip"

    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $rcloneUrl -OutFile $rcloneZip -UseBasicParsing
        Expand-Archive -Path $rcloneZip -DestinationPath "$env:TEMP\rclone-extract" -Force

        $extractedDir = Get-ChildItem "$env:TEMP\rclone-extract" -Directory | Select-Object -First 1
        Copy-Item "$($extractedDir.FullName)\rclone.exe" $rclonePath -Force

        Remove-Item $rcloneZip -Force -ErrorAction SilentlyContinue
        Remove-Item "$env:TEMP\rclone-extract" -Recurse -Force -ErrorAction SilentlyContinue

        Write-OK "rclone instalado en $rclonePath"
    } catch {
        Write-Fail "Error descargando rclone: $_"
        Write-Host "  Descargue manualmente desde https://rclone.org/downloads/ y copie rclone.exe a $InstallDir\rclone\" -ForegroundColor Yellow
    }
} else {
    Write-OK "rclone ya esta instalado en $rclonePath"
}

# ---------------------------------------------------------------------------
# 8. Copiar archivos de Supabase
# ---------------------------------------------------------------------------
Write-Step "Copiando archivos de Supabase"

$supabaseSource = Join-Path $SourceDir "supabase"
$supabaseDest = "$InstallDir\supabase"

if (Test-Path $supabaseSource) {
    # Copiar config.toml
    Copy-Item "$supabaseSource\config.toml" "$supabaseDest\config.toml" -Force
    Write-OK "config.toml copiado"

    # Copiar migraciones
    if (Test-Path "$supabaseSource\migrations") {
        Copy-Item "$supabaseSource\migrations" "$supabaseDest\migrations" -Recurse -Force
        Write-OK "Migraciones copiadas"
    }

    # Copiar seed.sql
    if (Test-Path "$supabaseSource\seed.sql") {
        Copy-Item "$supabaseSource\seed.sql" "$supabaseDest\seed.sql" -Force
        Write-OK "seed.sql copiado"
    }
} else {
    Write-Fail "No se encontro directorio supabase en: $supabaseSource"
    Write-Host "  Copie manualmente la carpeta supabase/ al directorio $supabaseDest" -ForegroundColor Yellow
}

# ---------------------------------------------------------------------------
# 9. Copiar scripts de despliegue
# ---------------------------------------------------------------------------
Write-Step "Copiando scripts de despliegue"

$scriptsSource = Join-Path $SourceDir "deploy\scripts"
$scriptsDest = "$InstallDir\scripts"

if (Test-Path $scriptsSource) {
    Get-ChildItem "$scriptsSource\*.ps1" | ForEach-Object {
        Copy-Item $_.FullName "$scriptsDest\$($_.Name)" -Force
        Write-OK "Copiado: $($_.Name)"
    }
} else {
    Write-Warn "No se encontro directorio deploy/scripts en: $scriptsSource"
}

# ---------------------------------------------------------------------------
# 10. Configurar Docker Desktop auto-start
# ---------------------------------------------------------------------------
Write-Step "Configurando Docker Desktop para inicio automatico"

$dockerDesktopSettings = "$env:APPDATA\Docker\settings-store.json"
if (Test-Path $dockerDesktopSettings) {
    try {
        $settings = Get-Content $dockerDesktopSettings -Raw | ConvertFrom-Json
        # Note: Docker Desktop settings format varies by version.
        # The user may need to manually enable "Start Docker Desktop when you sign in"
        # and disable "Automatically check for updates" from Docker Desktop settings.
        Write-OK "Docker Desktop settings encontrado"
        Write-Warn "Verifique manualmente en Docker Desktop Settings:"
        Write-Host "    - General > 'Start Docker Desktop when you sign in' = ON" -ForegroundColor Yellow
        Write-Host "    - Software Updates > 'Automatically check for updates' = OFF" -ForegroundColor Yellow
    } catch {
        Write-Warn "No se pudo leer Docker Desktop settings"
    }
} else {
    Write-Warn "Docker Desktop settings no encontrado. Configure manualmente despues de instalar Docker Desktop:"
    Write-Host "    - General > 'Start Docker Desktop when you sign in' = ON" -ForegroundColor Yellow
    Write-Host "    - Software Updates > 'Automatically check for updates' = OFF" -ForegroundColor Yellow
}

# ---------------------------------------------------------------------------
# Resumen
# ---------------------------------------------------------------------------
Write-Host "`n" -NoNewline
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Instalacion de prerequisitos completada" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Directorio de instalacion: $InstallDir" -ForegroundColor White
Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor Cyan
Write-Host "  1. Reiniciar la maquina si se instalo WSL2 por primera vez" -ForegroundColor White
Write-Host "  2. Abrir Docker Desktop y aceptar los terminos de servicio" -ForegroundColor White
Write-Host "  3. Configurar Docker Desktop:" -ForegroundColor White
Write-Host "     - General > 'Start Docker Desktop when you sign in' = ON" -ForegroundColor White
Write-Host "     - Software Updates > 'Automatically check for updates' = OFF" -ForegroundColor White
Write-Host "  4. Opcional: configurar rclone para su proveedor de backups:" -ForegroundColor White
Write-Host "     $rclonePath config" -ForegroundColor Yellow
Write-Host "     - Remote name: backup" -ForegroundColor White
Write-Host "     - Type: el proveedor de almacenamiento elegido" -ForegroundColor White
Write-Host "     - El backup es local por defecto; use -RcloneRemote backup para subir una copia." -ForegroundColor White
Write-Host "  5. Ejecutar Register-ScheduledTasks.ps1 como Administrador:" -ForegroundColor White
Write-Host "     $InstallDir\scripts\Register-ScheduledTasks.ps1" -ForegroundColor Yellow
Write-Host "  6. Probar el arranque:" -ForegroundColor White
Write-Host "     $InstallDir\scripts\Start-ComunidadCat.ps1" -ForegroundColor Yellow
Write-Host ""
