# Revisión de pruebas — 26 de octubre de 2026

Estado final tras ambas migraciones: **suite web completa ejecutada, 209 pruebas
aprobadas, cero fallos y 13 omisiones existentes de móvil**. La ejecución final y
sus artefactos se detallan al final; las secciones anteriores conservan el
historial de hallazgos y verificaciones parciales.

## Resultado comprobado

Revisión centrada en la infraestructura de pruebas, sus aserciones, aislamiento,
dependencias y cobertura. No es una auditoría funcional exhaustiva de todas las
páginas ni una auditoría de seguridad.

| Comprobación | Resultado |
| --- | --- |
| Vitest inicial | 14 archivos, 328 pruebas aprobadas |
| Vitest después de sustituir pruebas copiadas | 14 archivos, 318 pruebas aprobadas |
| TypeScript | `npm run type-check` aprobado después de cambiar los tests |
| ESLint de archivos TS modificados | Aprobado |
| Playwright seleccionado | 18 aprobadas: 9 casos por viewport, escritorio y móvil |
| Flujos con Supabase real | Ejecutados tras iniciar Supabase; resultados de la continuación al final |
| Electron | No validado en esta revisión |
| Nuevo job de CI | Configurado; pendiente de ejecución en GitHub |

Los 18 casos ejecutados son los 5 casos nuevos de `e2e/auth/login.spec.ts` y los
4 existentes de `e2e/ui-lab/reui-components.spec.ts`, en ambos proyectos Chromium.
La prueba de credenciales inválidas simula la respuesta de Auth: valida el contrato
de la interfaz, pero no demuestra que el servicio real autentique correctamente.

## Hallazgos y cambios

### P1 — Las pruebas anteriores de useCrud no ejecutaban useCrud

`src/__tests__/hooks/useCrud.test.ts` no importaba el hook. Replicaba funciones de
acentos, cálculos de paginación y construcción de consultas; también comprobaba
objetos locales. Podía pasar aunque el hook de producción estuviera roto.

Se sustituyeron 16 casos por 6 pruebas que importan el hook real y usan un
QueryClient real. Solo se simula la frontera con Supabase. Cubren lectura,
paginación, búsqueda con acentos, error de lectura, creación e invalidación,
rollback de actualización optimista y eliminación sin filas afectadas.
La prueba de rollback bloquea la recarga para que esta no oculte una reversión
faltante. Quedan pendientes joins, búsqueda por relaciones, creación fallida,
actualización exitosa y borrado exitoso.

### P1 — El porcentaje actual no representa toda la aplicación

`caminomanager/vitest.config.ts:13` excluye todos los componentes TSX, contextos,
páginas y utilidades de infraestructura. Los tests de componentes sí se ejecutan,
pero esas fuentes no contribuyen al denominador de cobertura. No debe presentarse
el porcentaje como cobertura total del producto.

| Métrica, con las exclusiones actuales | Antes | Después |
| --- | ---: | ---: |
| Líneas | 18,31 % | 27,63 % |
| Sentencias | 17,09 % | 25,82 % |
| Funciones | 16,83 % | 27,39 % |
| Ramas | 15,18 % | 18,71 % |
| Líneas de useCrud | 0 % | 68,04 % |

Los umbrales globales siguen en 15 % para líneas, funciones y sentencias, y 14 %
para ramas. Recomendación: mantener una métrica explícita para lógica de negocio,
añadir otra para componentes/contextos propios y elevar mínimos por módulo
crítico. No reducir exclusiones y cambiar umbrales a la vez sin medir la nueva
línea base. La cantidad de pruebas por sí sola no mide protección contra fallos.

### P1 — Las pruebas de rutas pueden dar falsos positivos

`e2e/roles/route-access.spec.ts:54` ejecuta solo 5 de las 9 variantes de usuario
definidas en su matriz. Las rutas permitidas solo verifican que la URL contenga
el path; las bloqueadas aceptan cualquier salida de esa URL, incluido un retorno
al login por pérdida de sesión.

Pendiente: comprobar encabezado o contenido funcional en rutas permitidas;
destino exacto y sesión vigente en denegadas. Incluir contributor,
zone_contributor, viewer_zone y viewer_community. Añadir intentos directos a
detalles fuera del alcance con usuarios autenticados; los permisos de interfaz
no sustituyen comprobaciones de RLS usando la sesión del usuario.

### P2 — Playwright mezclaba destinos y no conservaba evidencia del fallo

La configuración web original descubría el smoke de Electron dos veces, una por
viewport. También ejecutaba como prueba una utilidad para generar una galería de
capturas antiguas; esta podía terminar correctamente sin capturas.

Se excluyeron ambos archivos del descubrimiento web. Electron conserva su propia
configuración. La galería continúa en el repositorio como utilidad pendiente de
separar del runner y revisar: no es una comparación visual automatizada.

Se añadieron arranque de Next.js mediante `webServer`, captura y traza en fallos,
y rechazo de `test.only` en CI. Antes, `on-first-retry` junto con cero reintentos
impedía generar trazas. El servidor se reutiliza localmente si ya responde en
localhost:3000; debe corresponder al checkout y entorno que se quieren probar.

### P2 — Los flujos con datos necesitan un contrato de fixtures más completo

Las suites de roles dependen de usuarios sembrados y de IDs concretos para zonas,
parroquias y comunidades. `scripts/seed-test-users.ts` prepara usuarios, no todo
el grafo de negocio. El smoke de Electron también necesita un export estático
reciente; `test:electron` solo compila el proceso principal antes del test.

La suite de acciones en comunidades mejora el aislamiento creando una comunidad
temporal y comprobando persistencia en SQL. Sin embargo, depende de superusuario
y desactiva triggers al limpiar (`community-detail-actions.spec.ts:43`). Ejecutarla
solo sobre una base local de pruebas. Las escrituras de UI deben seguir usando
la sesión del usuario; la conexión privilegiada solo sirve para preparar,
verificar y limpiar fixtures.

`cities-reui.spec.ts:28` usa `isVisible({timeout})` para limpiar; esa llamada no
espera a que aparezca el botón. Puede dejar residuos si el filtro aún no terminó.
Pendiente: esperar un resultado de búsqueda determinado y verificar la ausencia
del registro tras recargar. Evitar esperas fijas y `networkidle` como señal de
que la aplicación terminó; preferir aserciones reintentables del estado esperado.

### P2 — CI no ejecutaba Playwright

Ya existía un job de Vitest con cobertura. Se añadió `Playwright Smoke`, con
Chromium y carga del reporte HTML y artefactos. Usa valores de configuración de
prueba y no necesita usuarios ni base de datos. La suite autenticada completa
sigue pendiente de un job con Supabase y fixtures reproducibles. Cambiar solo
archivos de workflows no activa el filtro actual de CI, que observa
`caminomanager/**`; este cambio también incluye archivos de esa carpeta.

## Alcance recomendado para unitarias e integración

| Prioridad | Módulo | Qué comprobar | Situación medida |
| --- | --- | --- | --- |
| P1 | permissions | Matriz explícita de roles y alcances, null, rutas anidadas y acciones | 40,78 % de líneas; cobertura indirecta desde la página de comunidad |
| P1 | AuthContext y layout protegido | Inicio de sesión, cierre, sesión vencida, carga tardía del scope, redirección y limpieza de caché | Excluidos de cobertura; sin tests directos encontrados |
| P1 | useCrud | Mutaciones, rollback, invalidación, filtros y relaciones | 68,04 % de líneas tras esta revisión; cobertura parcial real |
| P1 | csv-parser y bulk-upload-service | CSV inválido, duplicados, matrimonios, errores parciales y reintentos sin duplicación | Parser 16,5 %; servicio 0 % de líneas |
| P1 | useCommunityData y useCommunityAccess | Composición de datos, alcance, cambios de comunidad, invalidaciones y errores | Ambos 0 % de líneas |
| P2 | Hooks de reportes | Agrupación, orden, filtros y totales de conjuntos conocidos | 0 % de líneas |
| P2 | Formularios y diálogos | Validación, cancelación, bloqueo durante guardado, error y foco | Hay pruebas RTL; componentes excluidos de la métrica |
| P2 | Electron | Contrato preload/IPC y renderer del export actual | Smoke separado; no ejecutado aquí |

Los tests de componentes actuales sí aportan valor: existen casos de formularios,
tabla, diálogo destructivo, componentes ReUI y visibilidad por rol. La página de
comunidad usa mocks de hijos y hooks; sirve para verificar orquestación y
visibilidad, no para acreditar persistencia ni integración real con esos hijos.
El wizard tiene prueba de navegación, pero `executeBulkUpload` está simulado y
no se confirma una carga real en ese test.

## Recorridos para ejecutar con el agente

Desde `caminomanager`, instalar dependencias y Chromium una vez:

```powershell
npm ci
npx playwright install chromium
```

| Recorrido | Comando | Dependencias |
| --- | --- | --- |
| Smoke corto: acceso y laboratorio | `npm run test:e2e:smoke` | Configuración pública Supabase válida; sin seed ni servicio Auth |
| Roles y alcance | `npx playwright test e2e/roles --project=chromium-desktop` | Supabase local y fixtures de negocio/usuarios |
| CRUD de ciudad | `npx playwright test e2e/ui/cities-reui.spec.ts` | Supabase local, usuarios, Colombia y Antioquia |
| Navegación responsive | `npx playwright test e2e/ui/responsive-navigation.spec.ts` | Supabase local y admin sembrado |
| Reportes | `npx playwright test e2e/reports/all-reports-datagrid.spec.ts e2e/reports/catechist-teams-datagrid.spec.ts` | Fixtures con datos conocidos y suficientes para paginar |
| Desktop | `npm run build`, luego `npm run test:electron` | Windows, export reciente y Supabase local |
| Unitarias y cobertura | `npm run test:coverage` | Sin backend |

Para los flujos autenticados: iniciar Docker y Supabase local con
`npm run dev:supabase` desde la raíz, comprobar que el grafo del seed de negocio
existe y ejecutar `npm run seed:e2e` desde `caminomanager`. Alinear el entorno
público de Next.js con ese Supabase local antes de ejecutar las pruebas.
No usar una URL de producción en `DATABASE_URL`. No ejecutar un reset sobre una
base con trabajo que se quiera conservar.

En el agente de esta revisión, Turbopack falló al crear procesos dentro del
sandbox. La ejecución autorizada fuera del sandbox aprobó los 18 casos. La
instalación de Chromium también necesitó salida a red. En PowerShell del entorno
del agente, `npm run test:e2e -- --list` perdió el argumento y arrancó pruebas;
para descubrir casos se utilizó directamente:

```powershell
node node_modules/@playwright/test/cli.js test --list
```

Para depurar: `npm run test:e2e:ui` y `npm run test:e2e:report`.
Las trazas de fallos quedan en `e2e/test-results` y pueden abrirse con
`npx playwright show-trace <ruta-al-trace.zip>`.

Petición reutilizable al agente:

> Ejecuta el smoke de Playwright en escritorio y móvil. Para flujos autenticados,
> comprueba primero que Next.js, Supabase y los fixtures pertenecen al entorno
> local de pruebas. Revisa la traza de cada fallo y distingue un defecto del
> producto de un selector obsoleto o datos incompletos. No cambies expectativas
> ni añadas skips para volver verde la suite sin justificarlo. En las escrituras,
> usa registros temporales, comprueba persistencia tras recargar y verifica la
> limpieza. Reporta casos aprobados, fallidos y no ejecutados por separado.

## Continuación con Supabase local activo

Se verificaron los contenedores saludables, el login real del administrador y los
fixtures existentes: 9 usuarios E2E, 20 parroquias, 15 comunidades y 32 ciudades.
No fue necesario volver a sembrar usuarios ni reiniciar la base.

El archivo de entorno de Next.js apunta a Supabase cloud. Para estas ejecuciones
se sobreescribieron las variables del proceso con la URL y clave pública local,
sin guardar ni mostrar claves. Se usó `CI=1` para que Playwright arrancara su
propio servidor y no reutilizara uno que pudiera apuntar a otro entorno.

La CLI instalada (2.76.10) no admite la clave `local_smtp` del config actual.
La comprobación de servicios y obtención de la clave pública se hicieron mediante
Docker. No se cambió `supabase/config.toml`, que ya tenía modificaciones al
comenzar la revisión.

### Defecto reproducido: la cuenta oculta un error de RPC como ausencia de permisos

La prueba de `viewer_grants` en `account-scope.spec.ts` aceptaba tanto
«Comunidades con acceso otorgado» como «Sin acceso asignado». Se eliminó esa
alternativa: ahora exige el panel, el enlace a comunidad 1 y la ausencia del aviso
de falta de permisos.

La nueva aserción falla de forma reproducible. La traza muestra:

```text
POST /rest/v1/rpc/get_my_community_access → 400
code: 42804
Returned type character varying(50) does not match expected type text in column 2.
```

`supabase/migrations/20260306500000_user_community_access.sql:260` define la
función con `community_number text`, pero selecciona `c.number` sin conversión.
La columna está definida como `varchar(50)` en el esquema inicial.
`useMyCommunitiesAccess` expone el error, pero la página de cuenta solo consume
datos y carga: transforma el fallo en lista vacía y muestra «Sin acceso asignado».

La corrección identificada inicialmente fue añadir una migración que
alinee los tipos devueltos con la firma de la función (revisar también
`par.name`), y presentar el error de consulta en la cuenta en lugar de afirmar que
no hay permisos. La migración de tipos se implementó y verificó en la continuación
descrita al final. Presentar errores de consulta de forma diferenciada en la UI
sigue siendo una mejora pendiente.

### Selectores corregidos y comprobados

- Reporte de equipos: se conserva la verificación de orden, filtro, columnas y
  paginación, usando nombres accesibles sin distinguir mayúsculas. El encabezado
  renderizado es «Arquidiócesis/diócesis».
- Borrado de equipo: el selector usa `alertdialog` con el nombre «¿Eliminar
  equipo?», de acuerdo con el componente actual.

Los cuatro casos de acciones de comunidad se ejecutaron y aprobaron después del
ajuste: edición persistida, creación/borrado de responsables, entrada de bitácora
y creación de catequistas por contributor. La entrada de bitácora se elimina por
SQL al finalizar: ese caso no acredita el borrado de bitácora desde la interfaz.

También pasó el CRUD real de ciudad, la navegación responsive, la navegación del
wizard sin confirmar carga y los formularios de relaciones. ESLint de los tres
specs modificados y TypeScript aprobaron.

### Resultado final de Playwright con backend real

| Plataforma | Aprobados | Fallidos | Omitidos |
| --- | ---: | ---: | ---: |
| Escritorio, resultado acumulado tras las correcciones | 106 | 1 | 0 |
| Móvil, ejecución completa después de las correcciones | 93 | 1 | 13 |

Los dos fallos corresponden al mismo defecto de `viewer_grants` en la cuenta.
Los 13 omitidos de móvil son exclusiones previas de las suites de acciones y
visibilidad de comunidad, diseñadas para escritorio. No se añadieron skips.

La comprobación final de limpieza devolvió 15 comunidades y 32 ciudades, igual
que al inicio, y cero comunidades `E2E-*` o ciudades `E2E Ciudad *` residuales.

El resultado de escritorio combina la pasada inicial de 107 casos, la repetición
del reporte y de las cuentas, y la repetición de los 4 casos de acciones. La
primera pasada tuvo 103 aprobados, 2 fallos de selectores y 2 casos no ejecutados
por dependencia serial; los selectores y esos dos casos quedaron verificados en
las repeticiones. El caso de grants pasó en la prueba original permisiva y falla
con la aserción reforzada: se cuenta como fallo en el resultado final.

Reportes locales (no versionados):

- `caminomanager/e2e/playwright-report/index.html`: pasada inicial de escritorio.
- `caminomanager/e2e/playwright-report/desktop-recheck/index.html`: reporte y
  cuentas con la aserción reforzada.
- `caminomanager/e2e/playwright-report/actions-recheck/index.html`: acciones de
  comunidad corregidas.
- `caminomanager/e2e/playwright-report/mobile/index.html`: suite móvil completa.

La suite smoke de CI sigue siendo independiente del backend y no detectará este
error de RPC. Para convertir esta regresión en un bloqueo de CI hace falta el
job autenticado con Supabase local y el seed completo descrito antes.

## Corrección verificada de get_my_community_access

Se creó con la CLI la migración
`supabase/migrations/20261027011849_fix_get_my_community_access_return_types.sql`.
Reemplaza la función usando `c.number::text` y `par.name::text` para que los tipos
coincidan con su firma. Conserva el filtro por `auth.uid()`, la configuración de
seguridad y los permisos existentes de la función.

Se aplicó solo en Supabase local, sin resetear datos. Se ejecutó dos veces para
comprobar que es repetible y se compararon los permisos antes y después. Bajo
el rol `authenticated`, la RPC devuelve la comunidad 1 al usuario con el grant
y cero comunidades al usuario sin alcance; sin identidad tampoco devuelve datos.
La migración quedó registrada como aplicada en el historial local usando la CLI
2.122.0 desde la caché, sin cambiar la dependencia del proyecto.

Se repitió `e2e/roles/account-scope.spec.ts` completo: **18 aprobadas, cero fallos
y cero omisiones** (9 perfiles en escritorio y 9 en móvil). Para el usuario con
grants se verifica el panel, el enlace `/comunidades/detalle?id=1` y la ausencia
del aviso «Sin acceso asignado». No se relajaron las aserciones.

El reporte está en
`caminomanager/e2e/playwright-report/account-migration/index.html`.
No se volvió a ejecutar toda la suite web; los resultados de escritorio y móvil
de la sección anterior corresponden a la revisión previa a esta migración.
La corrección no se ha desplegado a Supabase cloud.

El chequeo de Advisors de seguridad a nivel `error` no encontró incidencias.
En esa verificación, el lint SQL global ya no reportaba esta RPC, pero fallaba por errores `42804`
en tres funciones ajenas al cambio: `get_community_progression_stats`,
`get_team_stats_by_parish` y `get_priest_workload`. No se modificaron en esta
corrección inicial; se resolvieron en la continuación siguiente.

## Corrección verificada de las tres RPC de reportes

La migración creada con la CLI
`supabase/migrations/20261027020200_fix_report_functions_return_types.sql`
convierte explícitamente a `text` las expresiones de nombres devueltas por
`get_community_progression_stats`, `get_team_stats_by_parish` y
`get_priest_workload`, incluyendo los nombres con `COALESCE`.
Conserva firmas, agregaciones, modo invoker y permisos existentes.

Antes de aplicarla se reprodujo el error `42804` en las tres funciones. Después
se ejecutó dos veces la migración dentro de una transacción y se compararon
`prosecdef`, `proconfig` y `proacl` antes y después: permanecen iguales. Las
consultas ejecutadas como usuario autenticado devolvieron 5 grupos de etapas,
2 tipos de equipos para parroquia 1 y 13 filas de carga de presbíteros. Para una
parroquia inexistente, las estadísticas de equipos devuelven una lista vacía.
Se registró `20261027020200` como aplicada en el historial local. No se reseteó
la base ni se aplicaron cambios en cloud.

Las pantallas actuales de reportes leen tablas directamente y no llaman estas
tres RPC. Para comprobar ambos caminos se añadió
`caminomanager/e2e/reports/statistics-rpc.spec.ts`, con llamadas autenticadas a
PostgREST que verifican nombres, conteos, promedio, total de comunidades y el
caso vacío. Necesita las variables públicas de Supabase en el entorno del runner,
alineadas con las que usa Next.js, y los fixtures E2E locales.

Se ejecutó `playwright test e2e/reports` con variables temporales locales y un
servidor propio: **20 aprobadas, cero fallos y cero omisiones**. Son 12 casos de
interfaz (carga de los 5 reportes, ordenación, filtros, selección de columnas y
paginación) y 8 ejecuciones de los casos de RPC, distribuidos entre escritorio
y móvil. El reporte está en
`caminomanager/e2e/playwright-report/reports-migration/index.html`.

El lint SQL de todo el esquema `public` pasa sin errores. Los Advisors de
seguridad a nivel `error` no reportan incidencias. ESLint del nuevo spec y
TypeScript también pasan. No se repitió la suite completa de la aplicación:
esta ejecución se centró en reportes y sus funciones de estadísticas.

## Ejecución completa después de ambas migraciones

Se verificó en el historial local que estaban aplicadas las migraciones
`20261027011849` y `20261027020200`. Se ejecutaron juntos todos los casos
descubiertos por los proyectos `chromium-desktop` y `chromium-mobile`, con un
servidor propio y variables temporales que apuntan a Supabase local.

```powershell
node node_modules/@playwright/test/cli.js test --project=chromium-desktop --project=chromium-mobile --output=e2e/test-results/full-after-migrations --reporter=html,list,json
```

| Plataforma | Aprobadas | Fallidas | Omitidas | Flaky |
| --- | ---: | ---: | ---: | ---: |
| Escritorio | 111 | 0 | 0 | 0 |
| Móvil | 98 | 0 | 13 | 0 |
| Total | 209 | 0 | 13 | 0 |

La ejecución procesó los 222 casos en aproximadamente 14,5 minutos y terminó con
código de salida 0. El reporte JSON confirma cero fallos inesperados, cero casos
flaky y cero errores del runner. La configuración mantiene un worker y cero
reintentos. No se cambiaron pruebas, aserciones ni exclusiones para esta pasada.

Las 13 omisiones proceden de las condiciones `desktop only` ya existentes en
las suites de acciones y visibilidad del detalle de comunidad. Esos 13 casos
aprobaron en escritorio. Electron y la utilidad de galería de capturas conservan
su exclusión de la configuración web; esta ejecución cubre la suite web completa.

La base comenzó y terminó con 15 comunidades y 32 ciudades. La verificación
posterior encontró cero comunidades `E2E-*` y cero ciudades `E2E Ciudad *`
temporales.

Artefactos locales de esta única ejecución completa:

- HTML: `caminomanager/e2e/playwright-report/full-after-migrations/index.html`.
- JSON: `caminomanager/e2e/test-results/full-after-migrations-results.json`.
- Directorio de resultados: `caminomanager/e2e/test-results/full-after-migrations/`.

## Preparación del PR sobre main actualizado

La rama del PR parte de `origin/main` en `3c64acf`, que ya contiene el rollout
previo y actualizaciones de dependencias. Se trasladaron únicamente los cambios
de esta revisión; se conservaron las versiones y el lockfile de main. Los ajustes
personales de `supabase/config.toml` y los artefactos generados quedan fuera.

En la rama del PR se repitieron las unitarias: **321 aprobadas en 15 archivos**,
con cobertura de líneas de 27,92 % dentro de las exclusiones actuales. El lint
completo pasa con cero errores y 173 warnings existentes. Se añadieron exclusiones
para cobertura y reportes generados, que ESLint estaba procesando como fuentes.

El build y TypeScript completaron correctamente. Next.js 16.4.0 mostró un bloqueo
inicial por vulnerabilidades conocidas; el reintento terminó con aviso. npm audit
confirmó 12 hallazgos heredados de main: 2 críticos (next y @sentry/nextjs), 6 altos
y 4 moderados. La rama mantiene esas dependencias y el PR se abre en borrador.

Se repitieron sobre esta rama los casos de login, laboratorio, cuentas y reportes
en escritorio y móvil: **56 aprobados, cero fallos y cero omisiones**. La pasada
completa de 209 aprobados descrita antes corresponde al checkout previo al
traslado; no se presenta como una ejecución completa del nuevo head.

Se ejecutó satisfactoriamente `supabase db reset` con ambas migraciones y seed
en la instancia temporal `ComunidadCatPrValidation`, con puertos distintos a los
de trabajo. Se desactivó Studio en esa copia temporal para evitar un fallo de
montaje de Docker en Windows. La instancia y sus volúmenes se eliminaron al
terminar; la base Supabase de trabajo no se reseteó.

## Actualización de dependencias y compatibilidad de CI

Se corrigieron las dependencias vulnerables de la aplicación y las herramientas
de raíz. Las versiones elegidas son Next.js y eslint-config-next 16.4.3,
Sentry 10.77.1, Zod 4.6.7, Vitest/coverage 4.1.12 y Electron 43.8.3.
Las dependencias transitivas se actualizaron dentro de los rangos compatibles.
En la raíz se actualizaron shadcn CLI a 4.23.0 y Supabase CLI a 2.122.0. El salto
de versión mayor de shadcn afecta a la herramienta de desarrollo: se comprobó
con `shadcn info` que reconoce Next.js, Tailwind 4, Radix y la configuración
New York; no se regeneraron componentes ni estilos.

`npm ci` y `npm audit --audit-level=moderate` pasan en ambas carpetas, con cero
vulnerabilidades incluyendo las dependencias de desarrollo. El lint completo
mantiene cero errores y las 321 pruebas unitarias pasan. El build de producción,
TypeScript y la compilación del proceso de Electron pasan con los parches.
La importación de Sentry usa ahora `@sentry/nextjs/config`, eliminando el aviso de
la importación obsoleta. No se desactivó el chequeo de seguridad de Next.js.

El fallo real del smoke anterior de GitHub era la instalación de Chromium:
`ubuntu-latest` había pasado a Ubuntu 26.04, no soportado por Playwright 1.58.2.
CI fija Ubuntu 24.04 y Node 22. El requisito mínimo Node 22.12.0 queda declarado
en ambos package.json y .nvmrc, y el workflow de release de Electron también usa
Node 22. La acción de artefactos pasa a v7. El job de auditoría comprueba los dos
lockfiles, y cambios de los manifiestos de raíz o del workflow activan CI.

El smoke local con las mismas variables públicas ficticias de CI pasó sus 18
casos sin requerir un backend activo. Los checks del commit bfc8bcd en GitHub
aprobaron: Lint, Type Check, Test, Build, Playwright Smoke, Dependency Audit
(aplicación y raíz), CodeQL y preview de Vercel. Las migraciones a producción e
integración conservan sus condiciones de ejecución; no se aplicaron en cloud.

La suite web completa de esta actualización utiliza los fixtures locales y
guarda sus artefactos en
`caminomanager/e2e/playwright-report/dependency-full-final/index.html` y
`caminomanager/e2e/test-results/dependency-full-final-results.json`.
El estado consolidado de validación también se documenta en el
[PR #228](https://github.com/eslalinde/ComunidadCat/pull/228).

## Referencias

- [Playwright: servidor web](https://playwright.dev/docs/test-webserver)
- [Playwright: aserciones reintentables](https://playwright.dev/docs/test-assertions)
- [Vitest: alcance y umbrales de cobertura](https://vitest.dev/config/coverage)
