# CI/CD: dev, main y Vercel

## Flujo

- Las ramas de trabajo nacen de `dev`; sus PR apuntan a `dev`.
- GitHub ejecuta CI, CodeQL y regresión web en PR y push a `dev` y `main`.
- Vercel Git genera Preview para ramas de trabajo y para cada push/merge a `dev`. El enlace del PR sirve para revisar el cambio; el alias de rama `dev` sirve para revisar la integración acumulada.
- Para preparar producción, abrir PR desde `dev` hacia `main`. El check `Release Source` rechaza otro origen.
- `caminomanager/vercel.json` desactiva despliegues Git automáticos de `main`. Las otras ramas conservan los previews automáticos. No hay workflow de publicación web en GitHub ni token de Vercel en Actions.
- El preview puede estar disponible antes de que termine CI o las migraciones. Revisarlo cuando CI, Web Regression y Migrate Integration hayan terminado correctamente. Un preview de PR con SQL nuevo usa el esquema de integración actual; los contratos SQL se prueban aisladamente en CI antes del merge.

## Configuración del proyecto Vercel

Proyecto: `comunidad-cat`, repositorio `eslalinde/ComunidadCat`.

- Root Directory: `caminomanager` (el vercel.json está dentro de esta carpeta).
- Production Branch: `main`, incluso cuando la rama predeterminada de GitHub sea `dev`.
- Preview deployments habilitados, integración Git conectada.
- Ignored Build Step: `if [ "$VERCEL_ENV" = "production" ]; then exit 0; else exit 1; fi`. Cancela builds productivos automáticos incluso antes de que vercel.json llegue a main.
- Auto-assign Custom Production Domains desactivado: toda publicación productiva requiere promoción manual.
- Variables Production: credenciales públicas del Supabase productivo y URL pública de producción.
- Variables Preview: credenciales públicas del Supabase de integración. No reutilizar las productivas.
- Mantener la protección de previews. Configurar los redirects de Auth para las URLs de cada ambiente.

La configuración versionada entra en vigor al llegar a cada rama remota. El Ignored Build Step del proyecto bloquea builds productivos mientras se incorpora vercel.json a main.

Referencia: [configuración Git de Vercel](https://vercel.com/docs/project-configuration/git-configuration).

## Publicar producción manualmente

1. Completar CI y revisión del PR `dev → main`, y hacer merge.
2. Si hay migraciones, ejecutar `Supabase Migrations` desde Actions, seleccionando `main` y marcando `confirm_production`. Este paso modifica la base de datos y es independiente de Vercel; usar migraciones compatibles con la versión que sigue publicada.
3. En Vercel, abrir el proyecto → Deployments → Create Deployment. Seleccionar `main` (o su SHA revisado) y el entorno Production.
4. Si Vercel cancela el build por Ignored Build Step, usar Redeploy y desmarcar **Use project's Ignore Build Step** para esa ejecución manual. Verificar el SHA de main y el entorno Production.
5. Revisar el build productivo y usar **Promote to Production** manualmente para asignar los dominios. No promover el preview de dev como sustituto de la entrega de main.

El override manual está documentado en [Ignored Build Step](https://vercel.com/docs/project-configuration/project-settings#ignored-build-step).

Referencia: [crear despliegues desde Git](https://vercel.com/docs/git).

## Migraciones

`Supabase Migrations` escucha la finalización exitosa de CI para pushes a `dev` y aplica exactamente ese SHA al backend de integración. No ejecuta SQL de PR contra bases compartidas. La concurrencia evita dos ejecuciones simultáneas sobre el mismo ambiente.

Secretos de GitHub existentes:

- Integración: `INTEGRATION_SUPABASE_PROJECT_ID`, `INTEGRATION_SUPABASE_DB_PASSWORD`.
- Producción: `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD`.
- Autenticación CLI: `SUPABASE_ACCESS_TOKEN`.

Los jobs usan los environments `integration` y `production`. Restringir production a `main` y configurar un revisor para las migraciones productivas. No se ejecutan migraciones productivas al hacer merge. El workflow comprueba que los IDs de ambos proyectos sean distintos.

## Protecciones y validación

Ambas ramas deben requerir PR, impedir borrados y force pushes y conservar CodeQL. Checks requeridos configurados: `Release Source`, `Lint`, `Type Check`, `Test`, `Build`, `Database Integration`, `Playwright Smoke`, `Dependency Audit` y `Chromium desktop and mobile`.

CI no tiene filtros de paths: los checks requeridos se ejecutan también para PR de documentación. Los PR externos no reciben secretos de despliegue. Dependabot apunta a `dev`. Electron mantiene su entrega independiente al publicar un release de GitHub.

## Limpieza del proveedor anterior

No hay workflow de Azure activo ni secretos de Azure registrados en el repositorio al momento de esta revisión. El despliegue web usa Vercel. Los backups standalone son locales por defecto, con rclone opcional para el proveedor que se configure; ya no asumen Azure. La limpieza del repositorio no elimina recursos ni backups de cuentas cloud.
