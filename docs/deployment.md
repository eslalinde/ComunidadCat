# Ciclo de publicación de ComunidadCat

La web, las ediciones Cloud y Standalone de Windows y las notas de GitHub comparten la versión de `caminomanager/package.json` y el commit aprobado de `main`. La primera versión estable prevista es **1.0.0**.

## Desarrollo e integración

1. Crear la rama de trabajo desde `dev` y dirigir el PR a `dev`. Vercel Git genera previews para los PR y para la integración acumulada. Usar el Supabase de integración en Preview y el productivo en Production.
2. Revisar el preview después de CI, Web Regression y la migración de integración. Las migraciones de un PR se prueban en una base desechable. Un push a `dev` aplica el SHA de integración que pasó CI. La etiqueta `check-migrations` permite inspeccionar ambos proyectos.
3. Elegir la versión de la entrega. Usar PATCH para correcciones compatibles, MINOR para funcionalidad compatible y MAJOR para cambios incompatibles. Actualizar paquete y lockfile juntos desde `caminomanager` con `npm version X.Y.Z --no-git-tag-version`. La etiqueta estable la crea el proceso de publicación.
4. Promover el conjunto de cambios mediante un PR `dev → main`. Conservar las protecciones de ramas, los checks requeridos, CodeQL y la regla `Release Source`. Revisar especialmente cualquier migración que afecte a clientes Windows de versiones anteriores.

## Preparación automática

Un push a `main` inicia **Production Release**. El workflow comprueba la versión estable, las etiquetas remotas y los resultados de CI, Web Regression y Security para ese mismo SHA. A continuación prepara en paralelo:

- **Windows** compila y verifica ambos instaladores con Authenticode. El borrador incluye Cloud, su blockmap, `latest.yml`, el instalador Standalone y su ZIP. La versión, el nombre, el tamaño y SHA-512 del instalador Cloud deben coincidir con el manifiesto del actualizador.
- **Supabase** comprueba el proyecto, el historial y el plan SQL con un dry-run. En Actions, abrir el job `migration-plan` para revisar las migraciones pendientes.
- **Vercel** prepara un build con las variables Production y `--skip-domain`. Su URL aparece en el resumen de `stage-web`. El dominio de los usuarios sigue sirviendo la entrega anterior durante la revisión.

El job `draft` prepara las notas desde los PR y sube las cinco descargas. Guarda las huellas SHA-256 en la misma ejecución. El responsable abre el enlace al borrador del resumen, edita las notas en español para explicar los cambios para los usuarios y revisa web, archivos y SQL. Para el primer arranque, coordinar también el catálogo inicial y la función de contactos según la [guía de Supabase](supabase-deployment.md).

## Aprobación y comprobación

1. Revisar la URL preparada y confirmar que el SHA corresponde a la entrega. Verificar compatibilidad del esquema con la aplicación que está en uso y la disponibilidad de un respaldo si las migraciones lo requieren.
2. Aprobar **Publish approved release** en el environment `production`. La automatización comprueba de nuevo el SHA actual, el proyecto Vercel y el contenido exacto de las cinco descargas. Aplica las migraciones, publica el release con etiqueta `vX.Y.Z` y promueve ese mismo build de Vercel.
3. Actions verifica que el dominio corresponda al despliegue aprobado y comprueba la página de acceso, las notas y la descarga Cloud. El resumen registra SHA, versión y enlaces. Con una cuenta autorizada, iniciar sesión, consultar una comunidad conocida y abrir **Novedades de esta versión** en el menú de usuario. En Windows, comprobar la edición instalada y la firma del instalador. Quienes partan de una instalación sin editor configurado deben instalar manualmente la primera versión firmada y validar el editor por un canal de confianza.

## Configuración de los destinos

- En GitHub, restringir `production` a `main` y mantener al menos un revisor obligatorio. Mantener los permisos de escritura de contenido limitados a los jobs de borrador y publicación.
- En Vercel, proyecto `comunidad-cat`, raíz `caminomanager`, rama productiva `main`. `caminomanager/vercel.json` desactiva la publicación Git de `main`. Mantener los previews protegidos y configurar URL, redirects y credenciales públicas de Supabase por entorno. En Actions, configurar el secreto `VERCEL_TOKEN` y las variables `VERCEL_TEAM_ID` y `VERCEL_PROJECT_ID`.
- Para Windows, configurar en Actions los secretos `WINDOWS_SIGNING_PFX` (PFX en base64), `WINDOWS_SIGNING_PASSWORD`, `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_DEFAULT_KEY`. La variable `WINDOWS_PUBLISHER_DN` contiene el `SignerCertificate.Subject` completo del editor. El job de preparación los lee en el ámbito del repositorio o de la organización.
- Para Supabase, configurar `INTEGRATION_SUPABASE_PROJECT_ID`, `INTEGRATION_SUPABASE_DB_PASSWORD` e `INTEGRATION_SUPABASE_ACCESS_TOKEN` para integración. Para producción, `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD` y `PRODUCTION_SUPABASE_ACCESS_TOKEN`. Usar un token distinto por proyecto y mantener alineadas las variables de repositorio y del environment. El workflow independiente **Supabase Migrations** permite inspeccionar producción manualmente.

Las protecciones de `dev` y `main` incluyen PR obligatorio y bloqueo de borrados y force pushes. Los checks requeridos son Release Source, Lint, Type Check, Test, Build, Database Integration, Playwright Smoke, Dependency Audit y Chromium desktop and mobile. CI también corre para PR de documentación. Dependabot apunta a `dev`.

## Fallos y recuperación

- **Antes de aprobar.** Consultar el primer job fallido y reintentar los jobs fallidos sobre ese SHA tras corregir la configuración. Si cambia el código, llevar el cambio por `dev → main` y revisar el nuevo candidato. Si un borrador abandonado reserva la versión, el responsable comprueba su SHA y retira explícitamente ese borrador antes de preparar el nuevo. Las etiquetas publicadas conservan su commit.
- **Tras aplicar migraciones.** Revisar el historial remoto antes de reintentar. El CLI aplica las pendientes. El seed, los secretos de Vault y las Edge Functions tienen su propio procedimiento. Si cambió la compatibilidad con clientes antiguos, coordinar una migración correctiva y verificar los datos.
- **Release público con promoción web pendiente.** Usar **Re-run failed jobs** en la ejecución original. Se comprueban el release y sus huellas antes de reanudar la promoción. Las descargas publicadas conservan sus bytes y sus firmas.
- **Incidencia después de publicar.** Si el esquema lo permite, restaurar en Vercel el despliegue productivo anterior y verificar el acceso. Registrar el incidente y sacar una nueva versión de parche para corregir los clientes ya distribuidos.

[Notas de GitHub](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes) · [Promoción de despliegues de Vercel](https://vercel.com/docs/deployments/promoting-a-deployment)

## Proveedor anterior

La web usa Vercel. Los backups standalone son locales por defecto y admiten rclone para el proveedor configurado. Los recursos y backups históricos de Azure se administran por separado.
