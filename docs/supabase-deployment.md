# Revisión del despliegue de Supabase

Estado revisado el 30 de octubre de 2026, sobre `main` con el PR #231 incluido.
El PR #172 no incorpora SQL nuevo: completa el workflow y su diagnóstico.

## Lo comprobado y lo que falta confirmar

- Último despliegue de producción exitoso disponible en Actions:
  [13 de marzo, 22:15 Bogotá](https://github.com/eslalinde/ComunidadCat/actions/runs/23079194733),
  commit `a851311894e7f59adbb30f044f74e28be38dd6cc`.
- [El despliegue del 27 de octubre](https://github.com/eslalinde/ComunidadCat/actions/runs/40515870768)
  falló al enlazar el proyecto: `Invalid access token format`. No llegó al paso
  que aplica migraciones. El secreto del token figura actualizado el 7 de agosto.
- Hay cuatro archivos de migración adicionales respecto del último despliegue
  exitoso. Son **candidatas pendientes**, no un inventario remoto confirmado:
  pudieron aplicarse manualmente o mediante otro sistema.
- La conexión MCP disponible solo muestra otro proyecto y deniega acceso a la
  organización facilitada, `qtdfmxydesepydsvbmak`. No se consultaron ni modificaron
  bases ajenas para inferir el estado de ComunidadCat.
- El propietario confirmó `zdmwekololwtdluvsxbd` como **integración**. El archivo
  `env.cloud.local` apunta a ese mismo proyecto: no asumir que representa producción.
  Falta identificar producción y cotejar los secretos del workflow y del frontend.
  No se modificó ningún destino. Los valores de GitHub Secrets no se pueden
  recuperar mediante su API. El intento de listar migraciones del proyecto de
  integración mediante MCP también fue denegado por falta de permisos.

## Migraciones candidatas y su impacto

| Archivo en `supabase/migrations/` | Cambio | Qué verificar antes/después de aplicar |
| --- | --- | --- |
| `20260503000000_scope_parishes_select_by_zone.sql` | Sustituye la lectura global de parroquias por una política según rol, zona o comunidad; añade `can_access_parish`. | Probar lectura de admin, roles de zona, responsable y viewers con alcances/accesos concedidos. Puede reducir las parroquias visibles. |
| `20260731140000_restore_public_table_grants.sql` | Concede CRUD a `authenticated` sobre todas las tablas de `public`, acceso a secuencias y privilegios a `service_role`; define permisos de futuros objetos de `postgres`. | Revisar todas las tablas y vistas existentes en cloud: los grants son amplios y dependen de RLS/políticas. Los objetos creados fuera de Git también quedan afectados. |
| `20261027011849_fix_get_my_community_access_return_types.sql` | Ajusta a `text` los valores devueltos por `get_my_community_access`. | Comprobar el RPC con un usuario con acceso concedido y otro sin acceso. Mantiene el filtro por `auth.uid()`. |
| `20261027020200_fix_report_functions_return_types.sql` | Ajusta casts de tres RPC: equipos por parroquia, progresión de comunidades y carga de presbíteros. | Probar los tres reportes con datos y sin datos. Conserva firmas, agregaciones y ejecución como invocador. |

Estos cuatro archivos no contienen borrados de filas ni tablas. Sí cambian
autorización y funciones; no equivalen a un cambio puramente documental.
Las 35 aserciones SQL locales de #231 no sustituyen la revisión del estado cloud.

En el SQL Editor de **cada proyecto correcto**, estas consultas solo leen metadatos:

```sql
select version, name
from supabase_migrations.schema_migrations
order by version;

-- Review tables without RLS before applying the broad authenticated grants.
select n.nspname as schema_name, c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p')
order by c.relname;

-- Views need their own permission/security-invoker review.
select c.relname as view_name, c.reloptions
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'v'
order by c.relname;
```

Si el historial remoto contiene versiones ausentes del repositorio, detenerse y
reconciliar su procedencia. No usar `migration repair`, `--include-all` ni un reset
remoto para forzar un resultado verde. El dry-run lista pendientes; no demuestra
que el SQL pueda ejecutarse correctamente con los datos de producción.

## Corregir el token sin compartirlo

1. Entrar en Supabase con la cuenta que tiene acceso a los proyectos de ComunidadCat
   dentro de la organización indicada. Abrir cada proyecto y confirmar cuál es
   producción y cuál integración: el ID de organización no es un ID de proyecto.
2. Ir a [Account → Access Tokens](https://supabase.com/dashboard/account/tokens)
   y generar un Personal Access Token para GitHub Actions. Comienza por `sbp_`
   (los tokens con alcance pueden comenzar por `sbp_fc`). No usar claves
   `sb_publishable_`, `sb_secret_` ni el JWT `anon`/`service_role`.
3. Si la cuenta permite tokens con alcance, seleccionar ambos proyectos y las
   lecturas que requiere `supabase link`: **Project Settings**, **API Keys** y
   **API Key Secrets**. La contraseña de base de datos sigue siendo necesaria;
   los permisos del token no la reemplazan. El CLI documenta permisos adicionales
   para ramas/pooler cuando correspondan. No ampliar permisos a otros proyectos.
4. En [GitHub → Settings → Secrets and variables → Actions](https://github.com/eslalinde/ComunidadCat/settings/secrets/actions),
   editar el secreto de repositorio `SUPABASE_ACCESS_TOKEN` y pegar únicamente
   el token, sin comillas, espacios, saltos de línea ni prefijo `Bearer`.
   No guardarlo en archivos del repo, comentarios, logs o conversaciones.
5. Confirmar `SUPABASE_PROJECT_ID` y `SUPABASE_DB_PASSWORD` para producción, y
   `INTEGRATION_SUPABASE_PROJECT_ID` y `INTEGRATION_SUPABASE_DB_PASSWORD` para integración.
   Cada ID debe coincidir con el proyecto esperado y cada contraseña con su base.
   Confirmar también que URL/clave del frontend cloud correspondan a producción.
6. No revocar otros tokens de automatizaciones sin identificar sus consumidores.
   Si se reemplaza un PAT anterior, retirarlo cuando el nuevo pase la comprobación
   y se haya confirmado que ningún otro consumidor lo necesita.

Referencias: [Personal Access Tokens](https://supabase.com/docs/guides/platform/personal-access-tokens),
[entornos y secretos de CI](https://supabase.com/docs/guides/deployment/managing-environments).

## Comprobación antes del merge y aplicación posterior

| Disparador | Entorno | ¿Aplica SQL? |
| --- | --- | --- |
| PR sin etiquetas | Ninguno; solo tests del validador | No |
| PR con `check-migrations` | Producción e integración | No; listado y dry-run |
| PR con `run-migrations`, sin `check-migrations` | Integración | Sí, después del dry-run |
| Ambas etiquetas | Producción e integración | No; prevalece la comprobación |
| Manual desde `main`, `apply` desmarcado (predeterminado) | Entorno seleccionado | No |
| Manual desde `main`, `apply` marcado | Entorno seleccionado | Sí |
| Push a `main` que cambia archivos SQL de migración | Producción | Sí |
| Merge de #172, que solo cambia infraestructura/docs | Ninguno | No |

Después de actualizar el secreto, añadir `check-migrations` al PR #172. Si ya
está presente, quitarla y añadirla de nuevo. Revisar ambos jobs: validación,
enlace, historial y dry-run deben pasar. No añadir `run-migrations` como prueba
de credenciales: esa etiqueta autoriza escrituras en integración.

Antes de desplegar, confirmar el listado remoto, revisar el impacto de los grants
y probar la aplicación en integración. Mantener #172 como borrador hasta completar
la comprobación remota. Tras el merge, la ejecución manual desde `main` permite
aplicar las pendientes al entorno elegido cuando se autorice el despliegue.

Las operaciones por entorno se serializan y no se cancelan durante una migración.
Se fija CLI 2.122.0 y se usa `--skip-vault`; este workflow despliega SQL, no sincroniza
secretos de Vault ni seed. No usa `--include-all` ni resetea bases.

Comprobación local del validador: `node --test .github/scripts/validate-supabase-env.test.mjs`.
Las pruebas usan valores sintéticos y no consultan Supabase ni necesitan secretos.
Las 19 pruebas también pasaron en [Actions](https://github.com/eslalinde/ComunidadCat/actions/runs/41127656842).
Los jobs remotos quedaron omitidos porque el PR no tiene etiquetas de migración;
ese resultado no valida las credenciales ni el estado de las bases cloud.
