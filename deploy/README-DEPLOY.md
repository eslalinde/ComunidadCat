# ComunidadCat - Guia de Despliegue Standalone en Windows

Despliegue de ComunidadCat (Next.js + Electron + Supabase) en una sola maquina Windows, sin base de datos en internet. Usa Supabase local via Docker con backups diarios locales y copia remota opcional.

---

## Arquitectura

```
Windows PC
├── Docker Desktop (WSL2 backend)
│   ├── supabase_db (PostgreSQL 17)
│   ├── supabase_kong (API Gateway :54321)
│   ├── supabase_auth (GoTrue)
│   ├── supabase_rest (PostgREST)
│   └── supabase_meta (pg_meta)
├── ComunidadCat.exe (Electron app)
└── Tareas Programadas
    ├── Startup (al iniciar sesion)
    ├── Daily Backup (2:00 AM → backup local)
    └── Health Check (cada 15 min)
```

**RAM estimada**: ~1-1.5 GB (servicios innecesarios deshabilitados en config.toml)

---

## Prerequisitos

| Software | Version | Proposito |
|---|---|---|
| Windows 10/11 Pro o Enterprise | 64-bit | Sistema operativo con soporte WSL2 |
| WSL2 | - | Backend para Docker Desktop |
| Docker Desktop | 4.x+ | Motor de contenedores |
| Node.js | LTS (v20+) | Para Supabase CLI |
| Supabase CLI | Latest | Gestion de contenedores Supabase |
| rclone | Latest | Sincronizacion de backups a almacenamiento remoto |

---

## Instalacion

### Paso 1: Ejecutar script de prerequisitos

Abrir PowerShell **como Administrador** y ejecutar:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
cd F:\repos\playground\VibeCaminoManager
.\deploy\Install-Prerequisites.ps1
```

Si se instala WSL2 por primera vez, **reiniciar la maquina** y volver a ejecutar el script.

### Paso 2: Configurar Docker Desktop

Abrir Docker Desktop y configurar:

1. **General** > "Start Docker Desktop when you sign in" = **ON**
2. **Software Updates** > "Automatically check for updates" = **OFF**
3. Aceptar terminos de servicio si es la primera vez

### Paso 3 (opcional): Configurar rclone para almacenamiento remoto

```powershell
C:\ComunidadCat\rclone\rclone.exe config
```

Configurar:
- **Remote name**: `backup`
- **Type**: el proveedor elegido
- **Credenciales**: Configurar las del proveedor elegido directamente en rclone.
- **Container**: `comunidadcat-backups`

> **Tamano estimado de backups**: ~100-500 KB por backup comprimido. 30 dias ≈ 15 MB.

### Paso 4: Iniciar Supabase por primera vez

```powershell
cd C:\ComunidadCat
supabase start
```

Esto descargara las imagenes Docker (~2 GB la primera vez) e iniciara los servicios. Verificar que la API responda:

```powershell
Invoke-WebRequest http://127.0.0.1:54321/rest/v1/ -Method Head
```

### Paso 5: Instalar la app Electron

Ejecutar el instalador NSIS de ComunidadCat. La app se instalara normalmente en `%LOCALAPPDATA%\ComunidadCat\`.

### Paso 6: Registrar tareas programadas

Abrir PowerShell **como Administrador**:

```powershell
C:\ComunidadCat\scripts\Register-ScheduledTasks.ps1
```

### Paso 7: Probar el backup

```powershell
C:\ComunidadCat\scripts\Backup-ComunidadCat.ps1
```

Verificar que se cree el archivo en `C:\ComunidadCat\backups\` y, si se configura un remote, que se suba una copia.

---

## Arranque Automatico

Al iniciar sesion en Windows:

1. Docker Desktop arranca automaticamente (configurado en paso 2)
2. La tarea programada ejecuta `Start-ComunidadCat.ps1`:
   - Espera a que Docker engine responda (hasta 120s)
   - Si Supabase ya esta corriendo (por restart policy de Docker), lo detecta
   - Si no, ejecuta `supabase start`
   - Espera health checks de API y DB
   - Lanza `ComunidadCat.exe`

**Nota sobre apagados abruptos**: PostgreSQL usa WAL (Write-Ahead Logging) que protege contra corrupcion. Los contenedores tienen restart policy `unless-stopped` que los reinicia automaticamente al arrancar Docker.

---

## Backups

### Automatico

El backup diario se ejecuta a las 2:00 AM via tarea programada:

1. `pg_dump` (schemas: public + auth) via `docker exec`
2. Compresion GZip (PowerShell nativo)
3. Copia remota solo cuando se indica -RcloneRemote; la tarea programada usa backup local
4. Limpieza: locales >7 dias, remotos >30 dias

Si la maquina estaba apagada a las 2 AM, el backup se ejecuta al encender (StartWhenAvailable).

### Manual

```powershell
# Backup local + almacenamiento remoto (opcional)
C:\ComunidadCat\scripts\Backup-ComunidadCat.ps1 -RcloneRemote backup

# Solo backup local (sin almacenamiento remoto)
C:\ComunidadCat\scripts\Backup-ComunidadCat.ps1 -SkipRemote
```

### Restaurar desde backup

```powershell
# 1. Descomprimir backup
$backupFile = "C:\ComunidadCat\backups\comunidadcat-20260301-020000.sql.gz"
$sqlFile = $backupFile -replace '\.gz$', ''

$input = [System.IO.File]::OpenRead($backupFile)
$output = [System.IO.File]::Create($sqlFile)
$gzip = New-Object System.IO.Compression.GzipStream($input, [System.IO.Compression.CompressionMode]::Decompress)
$gzip.CopyTo($output)
$gzip.Close(); $output.Close(); $input.Close()

# 2. Obtener nombre del contenedor de DB
$dbContainer = docker ps --filter "name=supabase_db" --format "{{.Names}}" | Select-Object -First 1

# 3. Copiar SQL al contenedor
docker cp $sqlFile "${dbContainer}:/tmp/restore.sql"

# 4. Restaurar
docker exec $dbContainer psql -U postgres -d postgres -f /tmp/restore.sql

# 5. Limpiar
docker exec $dbContainer rm /tmp/restore.sql
```

### Restaurar desde almacenamiento remoto

```powershell
# Descargar backup mas reciente desde almacenamiento remoto
C:\ComunidadCat\rclone\rclone.exe copy backup:comunidadcat-backups C:\ComunidadCat\backups --include "*.sql.gz" --max-depth 1

# Luego seguir pasos de restauracion anteriores
```

---

## Monitoreo

El health check se ejecuta cada 15 minutos y verifica:

- Docker engine corriendo
- 5 contenedores criticos en estado `running`
- API respondiendo en `:54321`
- Espacio en disco (alerta si <5 GB)
- Tamano disco virtual WSL2 (alerta si >20 GB)
- Edad del ultimo backup (alerta si >36 horas)

Logs en: `C:\ComunidadCat\logs\health-*.log`

### Ejecucion manual

```powershell
C:\ComunidadCat\scripts\Check-Health.ps1
```

---

## Mantenimiento

### Apagado manual (para mantenimiento)

```powershell
# Solo cerrar app y Supabase
C:\ComunidadCat\scripts\Stop-ComunidadCat.ps1

# Cerrar todo incluyendo Docker
C:\ComunidadCat\scripts\Stop-ComunidadCat.ps1 -StopDocker
```

### Compactacion mensual del disco WSL2

El disco virtual de WSL2 crece pero no se encoge automaticamente. Compactar mensualmente:

```powershell
# 1. Detener Docker Desktop y WSL
wsl --shutdown

# 2. Compactar (requiere Hyper-V PowerShell module)
Optimize-VHD -Path "$env:LOCALAPPDATA\Docker\wsl\disk\docker_data.vhdx" -Mode Full

# 3. Reiniciar Docker Desktop
```

Si `Optimize-VHD` no esta disponible (Windows Home), usar `diskpart`:

```
diskpart
select vdisk file="C:\Users\<usuario>\AppData\Local\Docker\wsl\disk\docker_data.vhdx"
compact vdisk
exit
```

### Actualizar la app

1. Cerrar ComunidadCat
2. Ejecutar nuevo instalador NSIS
3. Si hay nuevas migraciones, copiarlas a `C:\ComunidadCat\supabase\migrations\`
4. Ejecutar: `cd C:\ComunidadCat && supabase db push`
5. Reiniciar la app

### Desinstalar tareas programadas

```powershell
C:\ComunidadCat\scripts\Register-ScheduledTasks.ps1 -Unregister
```

---

## Troubleshooting

### Docker Desktop no arranca

1. Verificar que WSL2 este instalado: `wsl --status`
2. Verificar virtualizacion habilitada en BIOS
3. Reiniciar el servicio: `Restart-Service com.docker.service`
4. Si persiste, reinstalar Docker Desktop

### Supabase no arranca

```powershell
cd C:\ComunidadCat
supabase stop    # Limpiar estado
supabase start   # Reiniciar
```

Si falla con error de puertos:
```powershell
# Verificar que los puertos no esten ocupados
netstat -an | findstr "54321 54322"
```

### La app no se conecta a la base de datos

1. Verificar que Supabase este corriendo: `docker ps`
2. Verificar API: `curl http://127.0.0.1:54321/rest/v1/`
3. Verificar variables de entorno de la app (SUPABASE_URL, SUPABASE_ANON_KEY)

### Backup falla

1. Verificar contenedor DB: `docker ps --filter "name=supabase_db"`
2. Probar pg_dump manualmente:
   ```powershell
   $container = docker ps --filter "name=supabase_db" --format "{{.Names}}" | Select-Object -First 1
   docker exec $container pg_dump -U postgres -d postgres --schema=public | Select-Object -First 5
   ```
3. Verificar rclone: `C:\ComunidadCat\rclone\rclone.exe listremotes`

### Espacio en disco bajo

1. Limpiar imagenes Docker no usadas: `docker system prune`
2. Compactar disco WSL2 (ver seccion Mantenimiento)
3. Verificar backups locales: `dir C:\ComunidadCat\backups`

---

## Recuperacion ante Desastre

En caso de falla total del disco o maquina:

### 1. Fresh install

1. Instalar Windows y prerequisitos (`Install-Prerequisites.ps1`)
2. Instalar Docker Desktop
3. Copiar config de Supabase a `C:\ComunidadCat\supabase\`
4. Ejecutar `supabase start` (crea DB limpia con migraciones)

### 2. Restaurar datos desde almacenamiento remoto

```powershell
# Descargar ultimo backup
C:\ComunidadCat\rclone\rclone.exe copy backup:comunidadcat-backups C:\ComunidadCat\backups --include "*.sql.gz" --max-depth 1

# Descomprimir y restaurar (ver seccion Backups > Restaurar)
```

### 3. Reinstalar app y tareas

1. Instalar ComunidadCat.exe
2. Ejecutar `Register-ScheduledTasks.ps1`
3. Verificar con `Check-Health.ps1`

---

## Estructura de Archivos

```
C:\ComunidadCat\
├── supabase/
│   ├── config.toml          # Configuracion de Supabase
│   ├── migrations/           # Migraciones de DB
│   └── seed.sql             # Datos iniciales
├── scripts/
│   ├── Start-ComunidadCat.ps1
│   ├── Stop-ComunidadCat.ps1
│   ├── Backup-ComunidadCat.ps1
│   ├── Check-Health.ps1
│   └── Register-ScheduledTasks.ps1
├── backups/                  # Backups locales (ultimos 7 dias)
├── logs/                     # Logs de startup, backup, health
└── rclone/
    └── rclone.exe           # Herramienta de sync a almacenamiento remoto
```

---

## Seguridad

- Todos los puertos de Supabase estan enlazados a `127.0.0.1` (solo acceso local)
- Las passwords default de Supabase son aceptables para maquina single-user
- El auto-updater de Electron esta deshabilitado (no hay internet)
- Guarde una copia de los backups fuera de la maquina; configure las credenciales de su proveedor en rclone.
- Studio, Inbucket y Analytics estan deshabilitados en produccion

## Riesgo de Apagado sin `supabase stop`

| Escenario | Perdida | Corrupcion | Recuperacion |
|---|---|---|---|
| Apagado normal | Ninguna | Ninguna | Automatica (Docker restart) |
| Corte de luz | Solo tx no guardadas | Ninguna | Automatica (WAL recovery) |
| Docker crash | Solo tx no guardadas | Ninguna | Automatica al reiniciar |
| Corrupcion disco WSL2 | **Total posible** | **Si** | **Restaurar backup** |
