# Revisión del despliegue de Supabase

Estado revisado el 3 de noviembre de 2026 (Bogotá), sobre `dev` con #231 y #232 incluidos.
El PR #172 no incorpora SQL nuevo: completa el workflow y su diagnóstico.

## Lo comprobado y lo que falta confirmar

- [Inspección remota del 3 de noviembre, 21:18 Bogotá](https://github.com/eslalinde/ComunidadCat/actions/runs/41759849441):
  **integración tiene las 38 versiones del repositorio registradas**, sin versiones
  extra ni pendientes. El dry-run respondió `Remote database is up to date`.
  Pasaron validación de ID/token, enlace, autenticación de base y listado.
  El paso de aplicación quedó omitido; esta revisión no aplicó SQL.
- **Producción está sin inicializar para ComunidadCat**. No hay tablas, vistas,
  secuencias, funciones, enums/dominios, políticas ni triggers de la aplicación en
  `public`; tampoco hay esquemas adicionales de la aplicación ni
  `supabase_migrations`. Los objetos encontrados pertenecen a los servicios de
  Supabase. Los conteos de `auth.users`, `storage.buckets` y `storage.objects`
  son cero. No se detectó un esquema de ComunidadCat que reconciliar.
- Ambos PAT separados, con **Connection Pooling: Read**, permiten enlazar y
  autenticar la conexión PostgreSQL. Producción lista **las 38 migraciones como
  pendientes**, desde `20250516212944_init-schema.sql`; el dry-run no las ejecuta.
  La inspección mostró `transaction_read_only = on` y terminó en `ROLLBACK`.
  El paso de aplicación quedó omitido en ambos entornos.
- La conexión MCP sigue mostrando solo otro proyecto; el resultado de integración
  se obtuvo desde GitHub Actions con los secretos actualizados por el propietario.

- El propietario reemplazó los destinos anteriores por estos proyectos:

  | Entorno | URL vigente | Secreto del ID en GitHub |
  | --- | --- | --- |
  | Integración | `https://azfhawxpdrgrhnpgcwxa.supabase.co` | `INTEGRATION_SUPABASE_PROJECT_ID=azfhawxpdrgrhnpgcwxa` |
  | Producción | `https://fkezcibdjgbqyraxnmha.supabase.co` | `SUPABASE_PROJECT_ID=fkezcibdjgbqyraxnmha` |

  El workflow valida cada secreto contra el ID esperado antes de conectar,
  rechazando destinos antiguos o intercambiados. Los IDs configurados pasaron
  esa comprobación en ambos entornos; el agente no modificó secretos.
  `env.cloud.local` aún referencia el antiguo `zdmwekololwtdluvsxbd`: actualizar
  URL y clave pública juntas, usando las del nuevo proyecto de producción.
  No reutilizar la clave del proyecto anterior. Los valores de GitHub Secrets
  no se pueden recuperar mediante su API.

Las cuatro migraciones identificadas anteriormente como candidatas históricas
ya constan en integración. En producción están pendientes junto con las otras 34.
Corresponde inicializar la base mediante el flujo manual de producción; no usar
`migration repair` para marcar como aplicadas migraciones que todavía no se han
ejecutado. Esta inspección no aplicó SQL de las migraciones ni verificó el frontend.

## Últimas cuatro migraciones revisadas y su impacto

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

## Configurar un token por entorno

| Secreto de repositorio | Proyecto autorizado |
| --- | --- |
| `INTEGRATION_SUPABASE_ACCESS_TOKEN` | `azfhawxpdrgrhnpgcwxa` |
| `PRODUCTION_SUPABASE_ACCESS_TOKEN` | `fkezcibdjgbqyraxnmha` |

El despliegue y el check de cada entorno usan exclusivamente su token. Internamente
el CLI sigue recibiendo la variable estándar `SUPABASE_ACCESS_TOKEN`; eso no implica
compartir el secreto. No existe fallback al secreto anterior: si falta uno de los
nuevos, el validador falla antes de conectar. Si hay secretos del mismo nombre en
GitHub Environments, alinear sus valores: los jobs protegidos usan esos overrides
y los checks de PR usan secretos de repositorio.

1. Entrar en Supabase con una cuenta que tenga acceso al proyecto correspondiente
   a cada token. Pueden pertenecer a cuentas distintas si administran entornos distintos.
   El ID de organización no es un ID de proyecto.
2. Ir a [Account → Access Tokens](https://supabase.com/dashboard/account/tokens)
   y generar dos Personal Access Tokens distintos para GitHub Actions. Comienzan por `sbp_`
   (los tokens con alcance pueden comenzar por `sbp_fc`). No usar claves
   `sb_publishable_`, `sb_secret_` ni el JWT `anon`/`service_role`.
3. Si la cuenta permite tokens con alcance, seleccionar solo el proyecto de cada token y las
   lecturas que requiere este flujo: **Project Settings**, **API Keys**,
   **API Key Secrets** y **Connection Pooling**. Esta última permite descubrir
   el pooler IPv4 del runner. La contraseña de base de datos sigue siendo necesaria;
   los permisos del token no la reemplazan. El CLI documenta permisos adicionales
   para ramas cuando correspondan. No ampliar permisos a otros proyectos.
   Ante el rechazo productivo observado, confirmar específicamente que
   `fkezcibdjgbqyraxnmha` esté incluido. Si el PAT es clásico, comprobar que la
   cuenta que lo creó tenga acceso a ese proyecto; un token no amplía los permisos
   de su propietario. La contraseña de base no corrige este rechazo de la API.
4. En [GitHub → Settings → Secrets and variables → Actions](https://github.com/eslalinde/ComunidadCat/settings/secrets/actions),
   crear o actualizar los dos secretos de la tabla y pegar en cada uno únicamente
   su token, sin comillas, espacios, saltos de línea ni prefijo `Bearer`.
   No guardarlo en archivos del repo, comentarios, logs o conversaciones.
5. Confirmar `SUPABASE_PROJECT_ID` y `SUPABASE_DB_PASSWORD` para producción, y
   `INTEGRATION_SUPABASE_PROJECT_ID` y `INTEGRATION_SUPABASE_DB_PASSWORD` para integración.
   Cada ID debe coincidir con el proyecto esperado y cada contraseña con su base.
   Actualizar también `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_DEFAULT_KEY` del build
   cloud con URL/clave de producción; para integración, sus equivalentes
   `INTEGRATION_SUPABASE_URL` e `INTEGRATION_SUPABASE_PUBLISHABLE_DEFAULT_KEY`.
   Revisar las variables `NEXT_PUBLIC_SUPABASE_URL` y
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` del hosting web y recompilar:
   el export estático incorpora estos valores durante el build.
6. No revocar otros tokens de automatizaciones sin identificar sus consumidores.
   Si se reemplaza un PAT anterior, retirarlo cuando el nuevo pase la comprobación
   y se haya confirmado que ningún otro consumidor lo necesita.

Referencias: [Personal Access Tokens](https://supabase.com/docs/guides/platform/personal-access-tokens),
[entornos y secretos de CI](https://supabase.com/docs/guides/deployment/managing-environments).

## Comprobación antes del merge y aplicación posterior

| Disparador | Entorno | ¿Aplica SQL? |
| --- | --- | --- |
| PR a dev/main sin `check-migrations` | Ninguno; solo tests del validador | No |
| PR con `check-migrations` | Producción e integración | No; historial, inventario y dry-run |
| PR con `run-migrations` | Ninguno por esa etiqueta | No; ya no se admite escritura desde PR |
| CI exitoso de un push a dev del propio repo | Integración, SHA exacto validado | Sí, después del dry-run y respetando el environment |
| CI fallido, de un PR, de otra rama o de otro repo | Ninguno | No |
| Supabase Migrations manual desde main | Producción | Solo inspección y dry-run |
| Push/merge a main | Producción | Production Release prepara el plan SQL |
| Aprobación de Publish approved release | Producción | Aplica las pendientes del SHA revisado |

Después de configurar los dos tokens, quitar y volver a añadir
`check-migrations` al PR #172. Revisar ambos jobs de inspección. Estos usan secretos
de repositorio para lecturas, sin desplegar ni consumir aprobaciones de los jobs
que escriben. No se modifican las protecciones de `integration`/`production`.

El PR apunta a `dev`. Su merge inicia CI y, si pasa, el workflow vigente puede
aplicar pendientes en integración. En la comprobación actual no hay pendientes,
pero debe revisarse cualquier SQL que llegue entretanto a dev. Producción sigue
requiriendo promoción de dev a main y aprobación del release. El acceso a
producción quedó verificado; su inicialización es una operación posterior al PR.

Las comprobaciones sin aplicación incluyen un inventario con `psql`, disponible
en el runner Ubuntu, usando el pooler de sesión descubierto por `supabase link`.
Se valida que corresponda al proyecto esperado. La contraseña se pasa por entorno;
la inspección usa una transacción de solo lectura, timeout y `ROLLBACK`, y muestra
metadatos y conteos, nunca registros de usuarios ni cuerpos de funciones.

Las operaciones por entorno se serializan y no se cancelan durante una migración.
Se fija CLI 2.122.0 y se usa `--skip-vault`; este workflow despliega SQL, no sincroniza
secretos de Vault ni seed. No usa `--include-all` ni resetea bases.

Comprobación local del validador: `node --test .github/scripts/validate-supabase-env.test.mjs`.
Las pruebas usan valores sintéticos y no consultan Supabase ni necesitan secretos.
Las 21 pruebas del validador pasaron localmente y en la comprobación remota
[41759849441](https://github.com/eslalinde/ComunidadCat/actions/runs/41759849441),
que también completó la inspección y el dry-run de ambos proyectos con sus PAT
separados. Repetir la revisión si cambia el esquema o llegan nuevas migraciones.

## Carga inicial del catálogo de producción

Una vez aplicadas las migraciones, ejecutar el archivo completo
[`supabase/seed.production.sql`](../supabase/seed.production.sql) en el editor SQL
del proyecto de producción. Es un paso manual independiente del workflow de migraciones.
El archivo `supabase/seed.sql` se reserva para desarrollo y pruebas con comunidades de ejemplo.

En una base recién migrada, la carga deja Colombia, 32 departamentos, 32 ciudades,
11 pasos del Camino y 20 parroquias vinculadas a la Arquidiócesis de Medellín.
Las migraciones ya aportan las 14 arquidiócesis y las demás jurisdicciones del catálogo.
Los campos de contacto y zona de las parroquias quedan disponibles para completar
con datos confirmados. La carga se puede repetir y conserva las filas preexistentes.

Para comprobar el resultado de la carga inicial, ejecutar con el mismo rol del editor SQL.
Los conteos esperados son 32, 11, 20, 14 y 0, en ese orden.

```sql
select
  (select count(*) from public.cities) as ciudades,
  (select count(*) from public.step_ways) as pasos,
  (select count(*) from public.parishes p
   join public.cities c on c.id = p.city_id
   join public.dioceses d on d.id = p.diocese_id
   where c.name = 'Medellín' and d.name = 'Arquidiócesis de Medellín') as parroquias_medellin,
  (select count(*) from public.dioceses where type = 'arquidiocesis') as arquidiocesis,
  (select count(*) from public.communities) as comunidades;
```

## Activación de teléfonos cifrados

La función `person-contacts` utiliza AES-256-GCM y valida la sesión con Supabase Auth. Su secreto `PERSON_CONTACT_KEY_V1` contiene 32 bytes aleatorios en Base64 estándar. Usa una clave propia por entorno y conserva una copia en el gestor de secretos que se usa para recuperación. Para rotar una clave que ya tenga contactos, conserva la versión anterior durante el recifrado. Sustituir el valor de V1 impediría recuperar esos contactos.

En desarrollo local, guarda la clave de ese entorno en `supabase/functions/.env` como `PERSON_CONTACT_KEY_V1`. Con la base local en marcha, ejecuta `npx supabase functions serve` desde la raíz. Si Docker en Windows rechaza el montaje de la unidad F:, ejecuta el comando con la CLI Linux desde WSL, en el mismo repositorio y conectado al mismo Docker. Los teléfonos preexistentes requieren también el recifrado del paso 3.

1. Configurar el secreto en **Edge Functions → Secrets** del proyecto de destino. Desplegar `supabase/functions/person-contacts` junto con su configuración de autenticación de `supabase/config.toml`.
2. Coordinar la migración `20261119234600_encrypted_person_contacts` con la nueva versión de la aplicación. Desde la migración, las consultas anteriores devuelven ambos campos vacíos y las versiones antiguas que envíen números directamente recibirán un error.
3. Si hay números anteriores, la migración los recoge en `contact_private.legacy`, restringida al servidor. Completar el recifrado inmediato llamando por HTTPS a la función con el cuerpo `{"action":"migrate"}` y la clave secreta de servidor denominada `default` del mismo proyecto en el encabezado `apikey`. Repetir hasta obtener `{"processed":0}`. Cada lote procesa hasta 100 personas. La función comprueba el descifrado antes de retirar cada original y permite reanudar tras un fallo. Durante el proceso, una lectura de un contacto pendiente devuelve un error temporal.
4. Verificar que `select count(*) from contact_private.legacy` da cero, que ambos campos públicos están vacíos y que se recupera un contacto ficticio con un usuario autorizado. Los respaldos históricos anteriores a la activación conservan los datos según su retención original.

El contrato SQL de permisos está en `supabase/tests/database/person_contacts.test.sql`. La comprobación de cifrado y del manejador HTTP se ejecuta desde la raíz con `node --experimental-strip-types --test supabase/tests/functions/person-contacts.test.mjs`. El informe global de presbíteros omite teléfonos. La impresión con teléfonos se solicita desde una comunidad.
