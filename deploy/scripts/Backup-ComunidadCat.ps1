<#
.SYNOPSIS
    Realiza backup diario de la base de datos y lo sube a almacenamiento remoto opcional.

.DESCRIPTION
    1. pg_dump via docker exec (schemas: public + auth)
    2. Compresion GZip nativa de PowerShell
    3. Upload a almacenamiento remoto via rclone
    4. Limpieza de backups locales (>7 dias) y remotos (>30 dias)

.PARAMETER InstallDir
    Directorio de instalacion. Default: C:\ComunidadCat

.PARAMETER SkipRemote
    Si se especifica, no sube a almacenamiento remoto (solo backup local).

.PARAMETER RcloneRemote
    Nombre del remote de rclone. Vacio por defecto: backup solo local.

.PARAMETER RemoteFolder
    Nombre del container en almacenamiento remoto. Default: comunidadcat-backups
#>

param(
    [string]$InstallDir = "C:\ComunidadCat",
    [switch]$SkipRemote,
    [string]$RcloneRemote = "",
    [string]$RemoteFolder = "comunidadcat-backups"
)

$ErrorActionPreference = "Continue"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
$logDir = "$InstallDir\logs"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = "$logDir\backup-$timestamp.log"

if (!(Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

function Log {
    param([string]$Message, [string]$Level = "INFO")
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$ts] [$Level] $Message"
    Write-Host $line
    $line | Out-File -Append -FilePath $logFile -Encoding UTF8
}

Log "=== ComunidadCat Backup ==="

$backupDir = "$InstallDir\backups"
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

# ---------------------------------------------------------------------------
# 1. Verificar que el contenedor de DB esta corriendo
# ---------------------------------------------------------------------------
Log "Verificando contenedor de base de datos..."

$dbContainer = docker ps --filter "name=supabase_db_ComunidadCat" --format "{{.Names}}" 2>&1
if (!$dbContainer -or $LASTEXITCODE -ne 0) {
    # Try alternative naming patterns
    $dbContainer = docker ps --filter "name=supabase_db" --format "{{.Names}}" 2>&1 | Select-Object -First 1
}

if (!$dbContainer) {
    Log "No se encontro contenedor de base de datos corriendo" "ERROR"
    Log "Asegurese de que Supabase este corriendo (Start-ComunidadCat.ps1)" "ERROR"
    exit 1
}

Log "Contenedor DB encontrado: $dbContainer"

# ---------------------------------------------------------------------------
# 2. pg_dump via docker exec
# ---------------------------------------------------------------------------
Log "Ejecutando pg_dump..."

$dumpFile = "$backupDir\comunidadcat-$timestamp.sql"

$pgDumpCmd = "pg_dump -U postgres -d postgres --clean --if-exists --no-owner --no-privileges --schema=public --schema=auth"
$dumpOutput = docker exec $dbContainer bash -c "$pgDumpCmd" 2>&1

if ($LASTEXITCODE -ne 0) {
    Log "pg_dump fallo (exit code: $LASTEXITCODE)" "ERROR"
    Log "Output: $dumpOutput" "ERROR"
    exit 1
}

# Write dump to file
$dumpOutput | Out-File -FilePath $dumpFile -Encoding UTF8
$dumpSize = (Get-Item $dumpFile).Length
Log "pg_dump completado: $dumpFile ($([math]::Round($dumpSize / 1KB, 1)) KB)"

# ---------------------------------------------------------------------------
# 3. Comprimir con GZip
# ---------------------------------------------------------------------------
Log "Comprimiendo backup..."

$gzFile = "$dumpFile.gz"

try {
    $inputStream = [System.IO.File]::OpenRead($dumpFile)
    $outputStream = [System.IO.File]::Create($gzFile)
    $gzipStream = New-Object System.IO.Compression.GzipStream($outputStream, [System.IO.Compression.CompressionMode]::Compress)

    $inputStream.CopyTo($gzipStream)

    $gzipStream.Close()
    $outputStream.Close()
    $inputStream.Close()

    $gzSize = (Get-Item $gzFile).Length
    Log "Compresion completada: $gzFile ($([math]::Round($gzSize / 1KB, 1)) KB, ratio: $([math]::Round($gzSize / $dumpSize * 100, 1))%)"

    # Eliminar dump sin comprimir
    Remove-Item $dumpFile -Force
} catch {
    Log "Error comprimiendo backup: $_" "ERROR"
    # Keep the uncompressed dump as fallback
    $gzFile = $dumpFile
}

# ---------------------------------------------------------------------------
# 4. Upload a almacenamiento remoto via rclone
# ---------------------------------------------------------------------------
if (!$SkipRemote -and $RcloneRemote) {
    Log "Subiendo backup a almacenamiento remoto opcional..."

    $rclonePath = "$InstallDir\rclone\rclone.exe"
    if (!(Test-Path $rclonePath)) {
        $rclonePath = Get-Command rclone -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
    }

    if (!$rclonePath -or !(Test-Path $rclonePath)) {
        Log "rclone no encontrado. Backup solo local." "WARN"
    } else {
        # Check if remote is configured
        $remotes = & $rclonePath listremotes 2>&1
        if ($remotes -match "$RcloneRemote`:") {
            $remotePath = "${RcloneRemote}:${RemoteFolder}"
            $uploadOutput = & $rclonePath copy $gzFile $remotePath --log-level INFO 2>&1
            if ($LASTEXITCODE -eq 0) {
                Log "Backup subido a $remotePath/$(Split-Path $gzFile -Leaf)"
            } else {
                Log "Error subiendo a almacenamiento remoto: $uploadOutput" "ERROR"
            }
        } else {
            Log "Remote '$RcloneRemote' no configurado en rclone. Ejecute: $rclonePath config" "WARN"
            Log "Remotes disponibles: $remotes" "WARN"
        }
    }
} else {
    Log "Backup solo local (sin remote configurado o con SkipRemote)"
}

# ---------------------------------------------------------------------------
# 5. Limpiar backups locales viejos (>7 dias)
# ---------------------------------------------------------------------------
Log "Limpiando backups locales viejos (>7 dias)..."

$localCutoff = (Get-Date).AddDays(-7)
$removed = 0
Get-ChildItem "$backupDir\comunidadcat-*.sql*" -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -lt $localCutoff } |
    ForEach-Object {
        Remove-Item $_.FullName -Force
        $removed++
    }
Log "Backups locales eliminados: $removed"

# ---------------------------------------------------------------------------
# 6. Limpiar backups remotos viejos (>30 dias)
# ---------------------------------------------------------------------------
if (!$SkipRemote -and $RcloneRemote -and $rclonePath -and (Test-Path $rclonePath)) {
    Log "Limpiando backups remotos viejos (>30 dias)..."

    $remotes = & $rclonePath listremotes 2>&1
    if ($remotes -match "$RcloneRemote`:") {
        $remotePath = "${RcloneRemote}:${RemoteFolder}"
        $deleteOutput = & $rclonePath delete $remotePath --min-age 30d --log-level INFO 2>&1
        if ($LASTEXITCODE -eq 0) {
            Log "Limpieza remota completada"
        } else {
            Log "Error limpiando backups remotos: $deleteOutput" "WARN"
        }
    }
}

# ---------------------------------------------------------------------------
# 7. Limpiar logs de backup viejos (>30 dias)
# ---------------------------------------------------------------------------
Log "Limpiando logs de backup viejos (>30 dias)..."

$logCutoff = (Get-Date).AddDays(-30)
Get-ChildItem "$logDir\backup-*.log" -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -lt $logCutoff } |
    ForEach-Object {
        Remove-Item $_.FullName -Force
    }

# ---------------------------------------------------------------------------
# Resultado
# ---------------------------------------------------------------------------
Log "=== Backup completado ==="
